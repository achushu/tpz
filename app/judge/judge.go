package judge

import (
	"net/http"

	"github.com/achushu/libs/out"
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/app/auth"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
	"github.com/achushu/tpz/server/sockets"
)

const (
	namespace = "/judge"
)

func init() {
	mainRoute := routes.LoginRequired(http.HandlerFunc(main))
	socketRoute := routes.LoginRequired(http.HandlerFunc(createWebSocket))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/server", socketRoute),
		routes.New("/{\\w+\\.[css|js]}", mainRoute),
		routes.New("/", mainRoute),
		routes.New("", mainRoute)},
	)
}

func Content() string {
	return "/judge/judge.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.NewLayout(session)
}

func main(w http.ResponseWriter, r *http.Request) {
	// user must be logged in
	s, err := auth.MustGetSession(r)
	if err != nil {
		routes.RenderError(w, errors.NewForbiddenError())
		return
	}
	if r.URL.Path == namespace+"/" {
		// Serve the main page
		layout := Layout(s)
		err := routes.RenderTemplate(w, Content(), layout)
		if err != nil {
			log.HttpError("server/judge - error rendering template: ", err)
		}
	} else {
		// Serve the other resources
		out.Debugf("server/judge - serving file: %s\n", r.URL.Path)
		routes.ServeFile(w, r)
	}
}

func createWebSocket(w http.ResponseWriter, r *http.Request) {
	sockets.WSServer(w, r, handleMessage)
}

func handleMessage(conn *sockets.Connection, msg sockets.Message) {
	log.Ws("server/judge - ", "received message: ", msg.Action)
	action, err := sockets.ToAction(msg.Action)
	if err != nil {
		log.WsError("server/judge - ", "received invalid action: ", msg.Action)
		return
	}

	switch action {
	case sockets.RegisterJudge:
		handleRegisterJudge(conn, msg)
	default:
		// should already be taken care of in resolving the action
		out.Debugln("server/judge - ", "handler for ", action.String(), " not implemented!")
	}
}
