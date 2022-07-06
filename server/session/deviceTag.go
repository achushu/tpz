package session

import (
	"net/http"
	"time"

	"github.com/achushu/tpz/app"
)

const (
	tagCookieName = "tpzTag"
)

// SetTagCookie assigns the browser a unique ID that persists across connections
func SetTagCookie(w http.ResponseWriter, r *http.Request) string {
	tag := app.GenerateTag()
	expires := time.Now().AddDate(0, 0, 15) // tag ID will be good for 15 days
	cookie := &http.Cookie{
		Name:     tagCookieName,
		Value:    tag,
		HttpOnly: false,
		Path:     "/",
		Secure:   isSSL,
		Expires:  expires,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, cookie)
	return tag
}

// GetOrSetTag will get an existing tag or create a new one
func GetOrSetTag(w http.ResponseWriter, r *http.Request) string {
	value := GetTag(r)
	if value == "" {
		value = SetTagCookie(w, r)
	}
	return value
}

// GetTag will get an existing tag
func GetTag(r *http.Request) string {
	for _, c := range r.Cookies() {
		if c.Name == tagCookieName {
			if c.Value != "" {
				return c.Value
			}
		}
	}
	return ""
}
