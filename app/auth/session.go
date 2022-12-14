package auth

import (
	"net/http"
	"time"

	"github.com/achushu/libs/random"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
)

var (
	cookieName = "tpzlogin"
	isSSL      = false
)

// NewSession generates a new session for the user
func NewSession(user *data.User, expires time.Time, ipAddress, userAgent string) (*data.Session, error) {
	if expires.IsZero() {
		expires = time.Now().AddDate(0, 0, 3) // default expiration
	}
	s := &data.Session{
		Username:  user.Name,
		SessionID: random.String(128),
		CSRFToken: random.String(256),
		Valid:     true,
		Expires:   expires,
		When:      time.Now(),
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	s.Key = s.Username + "_" + s.SessionID

	err := saveSession(s)
	return s, err
}

// SetSessionCookie saves the session cookie to the user's browser
func SetSessionCookie(w http.ResponseWriter, r *http.Request, u *data.User, rememberMe bool) error {
	expires := time.Time{}
	if rememberMe {
		expires = time.Now().AddDate(0, 0, 15)
	}
	s, err := NewSession(u, expires, r.RemoteAddr, r.UserAgent())
	if err != nil {
		return err
	}
	cookie := &http.Cookie{
		Name:     cookieName,
		Value:    s.Key,
		HttpOnly: true,
		Path:     "/",
		Secure:   isSSL, // global var set if running ssl
		Expires:  expires,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, cookie)
	return nil
}

// GetSession searches the request's cookies for the user's session
func GetSession(r *http.Request) (*data.Session, error) {
	// must iter through all cookies because you can have
	// multiple cookies with the same name
	// the cookie is valid only if the name matches AND it has a value
	cValue := ""
	for _, c := range r.Cookies() {
		if c.Name == cookieName {
			if c.Value != "" {
				cValue = c.Value
			}
		}
	}
	if cValue == "" {
		return nil, nil
	}
	s, err := GetSavedSession(cValue)
	if err == errors.ErrSessionInvalid {
		return nil, nil
	}
	return s, err
}

// GetSavedSession retrieves a session from the database
func GetSavedSession(sessionKey string) (s *data.Session, err error) {
	s = sessionCache[sessionKey]
	if s == nil {
		s, err = data.GetWebSession(sessionKey)
		if s != nil {
			s.Valid = true
			sessionCache[sessionKey] = s
		}
	}
	if err == errors.ErrNotFound {
		return nil, errors.ErrSessionInvalid
	}
	if err != nil {
		return nil, err
	}
	if !s.Valid || s.Expires.Before(time.Now()) {
		return nil, errors.ErrSessionInvalid
	}
	s.CSRFToken = random.String(256)
	return s, nil
}

// MustGetSession returns an error if GetSession does not find a user session
func MustGetSession(r *http.Request) (*data.Session, error) {
	s, err := GetSession(r)
	if err != nil {
		return nil, err
	}
	if s == nil {
		return nil, errors.NewForbiddenError()
	}
	return s, nil
}

// Logout clears the user's session cookie from the browser
func Logout(w http.ResponseWriter, r *http.Request, s *data.Session) {
	cookie, err := r.Cookie(cookieName)
	if err != http.ErrNoCookie {
		if cookie.Value == s.Key {
			// clear value, and set maxAge: 0
			cookie := &http.Cookie{
				Name:     cookieName,
				Value:    "",
				HttpOnly: true,
				Path:     "/",
				Secure:   isSSL,
				MaxAge:   0,
			}
			http.SetCookie(w, cookie)
		}
	}

	logoutSession(s)
}

// logout logs out of a session and clears the cache entry
func logoutSession(s *data.Session) error {
	s.Valid = false
	err := saveSession(s)
	sessionCache[s.Key] = nil
	return err
}

func saveSession(s *data.Session) error {
	sessionCache[s.Key] = s
	return data.CreateWebSession(s.Key, s.Username, s.When, s.Expires)
}

func GenerateTag() string {
	return random.String(64)
}
