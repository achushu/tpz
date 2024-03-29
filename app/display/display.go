package display

import (
	"net/http"

	"github.com/achushu/libs/out"
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/app/auth"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
	"github.com/achushu/tpz/server/sockets"
)

const (
	namespace = "/display"
)

func init() {
	mainHandler := http.HandlerFunc(main)
	socketHandler := http.HandlerFunc(createWebSocket)
	displayPanelHandler := http.HandlerFunc(displayPanel)

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/server", socketHandler),
		routes.New("/{\\w+\\.[css|js]}", mainHandler),
		routes.New("/.+", displayPanelHandler),
		//		routes.New("/{ringID:\\d+}/", displayPanelHandler),
		routes.New("/", mainHandler),
		routes.New("", mainHandler)},
	)
}

func Content() string {
	return "/display/display.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.NewLayout(session)
}

func main(w http.ResponseWriter, r *http.Request) {
	s, _ := auth.GetSession(r)
	if r.URL.Path == namespace+"/" {
		// Serve the main page
		layout := Layout(s)
		err := routes.RenderTemplate(w, Content(), layout)
		if err != nil {
			log.HttpError("server/display - error rendering template:", err)
		}
	} else {
		// Serve the other resources
		out.Debugf("server/display - serving file: %s\n", r.URL.Path)
		routes.ServeFile(w, r)
	}
}

func displayPanel(w http.ResponseWriter, r *http.Request) {
	s, _ := auth.GetSession(r)
	l := Layout(s)
	//	vars := mux.Vars(r)
	//	ringID := vars["ringID"]
	//	l.Data = ringID
	err := routes.RenderTemplate(w, Content(), l)
	if err != nil {
		log.HttpError("server/display - error rendering template:", err)
	}
}

func createWebSocket(w http.ResponseWriter, r *http.Request) {
	sockets.WSServer(w, r, handleMessage)
}

func handleMessage(conn *sockets.Connection, msg sockets.Message) {
	log.Ws("server/display -", "received message:", msg.Action)
	//return handleAction(conn, msg)
	action, err := sockets.ToAction(msg.Action)
	if err != nil {
		log.WsError("server/display -", "received invalid action:", msg.Action)
		return
	}

	switch action {
	case sockets.RegisterDisplay:
		handleRegisterDisplay(conn, msg)
	default:
	}
}
