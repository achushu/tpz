package results

import (
	"net/http"

	"github.com/achushu/libs/out"
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/app/auth"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
)

const (
	namespace = "/results"
)

func init() {
	mainHandler := routes.LoginRequired(http.HandlerFunc(main))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/{\\w+\\.[css|js]}", mainHandler),
		routes.New("/", mainHandler),
		routes.New("", mainHandler),
	})
}

func Content() string {
	return "/results/results.html"
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
			log.HttpError("server/results - error rendering template:", err)
		}
	} else {
		// Serve the other resources
		out.Debugf("server/results - serving file: %s\n", r.URL.Path)
		routes.ServeFile(w, r)
	}
}
