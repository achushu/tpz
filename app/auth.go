package app

import (
	"crypto/sha512"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/achushu/libs/random"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
)

var (
	// TEMPORARY
	// TODO: Implement session saving and caching on data component
	sessionCache = make(map[string]*data.Session)
)

// hashPassword provides a middle step to guarantee entropy
// while preventing DoS from excessively long strings.
// Every plaintext password must be hashed first.
func hashPassword(password string) []byte {
	hash := sha512.Sum512([]byte(password))
	return hash[:]
}

// CreateUser saves a new user with the given password.
// The user's password is processed by SHA-512 then bcrypt.
func CreateUser(username, password string) error {
	storedPass, err := bcrypt.GenerateFromPassword(hashPassword(password), 10)
	if err != nil {
		return err
	}
	return data.CreateUser(username, storedPass)
}

// UserLogin validates user credentials
func UserLogin(username, password string) (*data.User, error) {
	// login with username
	u, err := data.GetUser(username)
	if err == errors.ErrNotFound {
		// don't expose that user doesn't exist
		// a bad password and an incorrect username should look the same
		return nil, errors.ErrUserLogonFailure
	}
	if err != nil {
		return nil, err
	}
	err = login(u, password)
	if err != nil {
		return nil, err
	}
	return u, nil
}

// Validate provided password against user's stored hash
func login(u *data.User, password string) error {
	// hash password and compare
	hashPass := hashPassword(password)

	err := bcrypt.CompareHashAndPassword(u.Password, hashPass)
	if err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return errors.ErrUserLogonFailure
		}
		return err
	}
	return nil
}

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

	err := save(s)
	return s, err
}

// GetSession retrieves a session
func GetSession(sessionKey string) (s *data.Session, err error) {
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

// Logout logs out of a session
func Logout(s *data.Session) error {
	s.Valid = false
	err := save(s)
	sessionCache[s.Key] = nil
	return err
}

func save(s *data.Session) error {
	sessionCache[s.Key] = s
	return data.CreateWebSession(s.Key, s.Username, s.When, s.Expires)
}

func GenerateTag() string {
	return random.String(64)
}
