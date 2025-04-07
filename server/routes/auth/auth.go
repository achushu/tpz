package auth

import (
	"net/http"

	"github.com/achushu/tpz/config"
	"github.com/achushu/tpz/server/routes"
)

const (
	namespace = "/auth"
)

func init() {
	judgesLoginHandler := routes.Log(http.HandlerFunc(judgesLogin))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/judge-login-required", judgesLoginHandler),
	})
}

func judgesLogin(w http.ResponseWriter, r *http.Request) {
	yn := "0"
	if config.Settings.JudgeLogin {
		yn = "1"
	}
	routes.Respond([]byte(yn), w)
}
