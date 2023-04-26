package admin

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
	namespace = "/admin"
)

func init() {
	mainHandler := routes.LoginRequired(http.HandlerFunc(main))
	socketHandler := http.HandlerFunc(createWebSocket)

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/server", socketHandler),
		routes.New("/{\\w+\\.[css|js]}", mainHandler),
		routes.New("/", mainHandler),
		routes.New("", mainHandler),
	})
}

func Content() string {
	return "/admin/admin.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.NewLayout(session)
}

func main(w http.ResponseWriter, r *http.Request) {
	// user must be logged in
	s, err := auth.MustGetSession(r)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	if r.URL.Path == namespace+"/" {
		// Serve the main page
		layout := Layout(s)
		err = routes.RenderTemplate(w, Content(), layout)
		if err != nil {
			log.HttpError("server/admin - error rendering template:", err)
		}
	} else {
		// Serve the other resources
		out.Debugf("server/admin - serving file: %s\n", r.URL.Path)
		routes.ServeFile(w, r)
	}
}

func createWebSocket(w http.ResponseWriter, r *http.Request) {
	sockets.WSServer(w, r, handleMessage)
}

func handleMessage(conn *sockets.Connection, msg sockets.Message) {
	log.Ws("server/admin -", "received message:", msg.Action)
	//return handleAction(conn, msg)
	action, err := sockets.ToAction(msg.Action)
	if err != nil {
		log.WsError("server/admin -", "received invalid action:", msg.Action)
		return
	}

	switch action {
	case sockets.LiveDisplay:
		fallthrough
	case sockets.LastDisplay:
		passthroughMessage(conn, msg)
	default:
	}
}

func passthroughMessage(conn *sockets.Connection, msg sockets.Message) bool {
	action, err := sockets.ToAction(msg.Action)
	if err != nil {
		return false
	}
	toSend, err := sockets.ConstructMessage(action, nil)
	if err != nil {
		return false
	}
	if err = sockets.Broadcast(toSend, msg.RingID); err != nil {
		return false
	}
	return true
}
