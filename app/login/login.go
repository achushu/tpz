package login

import (
	"net/http"
	"net/url"

	"github.com/achushu/libs/out"

	"github.com/achushu/tpz/app/auth"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
)

const (
	namespace = "/auth"
)

var (
	loginHandler  = routes.Log(http.HandlerFunc(login))
	logoutHandler = routes.Log(http.HandlerFunc(logout))
)

func init() {
	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/login", loginHandler),
		routes.New("/logout", logoutHandler),
	})
}
func login(w http.ResponseWriter, r *http.Request) {
	username := r.PostFormValue("user")
	password := r.PostFormValue("pass")
	log.Http("server/auth - LOGIN -", username)
	u, err := auth.UserLogin(username, password)
	if err != nil {
		log.Http("server/auth - LOGIN -", username, "FAILED")
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	err = auth.SetSessionCookie(w, r, u, false)
	if err != nil {
		out.Debugf("server/auth - error creating login session for %s: %s\n", username, err)
	}
	tag := auth.GetOrSetTag(w, r)
	log.Http("user", username, "logging in from device", tag)
	// attempt to send them back from whence they came
	redirect := "/"
	ref, err := url.Parse(r.Referer())
	if err == nil {
		redirect = ref.Path
	}

	http.Redirect(w, r, redirect, http.StatusFound)
}

func logout(w http.ResponseWriter, r *http.Request) {
	s, err := auth.GetSession(r)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	log.Http("server/auth - LOGOUT", s.Username)
	auth.Logout(w, r, s)

	http.Redirect(w, r, "/", http.StatusFound)
}
