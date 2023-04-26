package routes

import (
	"net/http"

	"github.com/achushu/tpz/app/auth"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"
)

// LoginRequired is a shortcut to call both Log and Auth middlewares.
func LoginRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		Log(Auth(next)).ServeHTTP(w, r)
	})
}

// Log records the resource requested and the origin of the request.
// All routes should call Log (directly or indirectly)
func Log(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Http(r.RemoteAddr, "-", r.Method, "-", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// Auth ensures that the requester is authenticated and authorized to access the resource.
// Failures are logged as well.
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := auth.MustGetSession(r)
		if err != nil {
			log.Http(r.RemoteAddr, "-", r.Method, "-", r.URL.Path, "DENIED")
			RenderError(w, errors.NewForbiddenError())
		} else {
			next.ServeHTTP(w, r)
		}
	})
}
