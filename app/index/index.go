package index

import (
	"net/http"

	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/app/auth"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
)

const (
	mainRoute     = "/"
	resourcesPath = "/index/{\\w+\\.(css|js)}"
)

func init() {
	routes.AddIndexRoute(indexResources)
	routes.AddIndexRoute(indexRoute)
}

func Content() string {
	return "/index/index.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.NewLayout(session)
}

var (
	indexHandler = routes.Log(http.HandlerFunc(handler))
	indexRoute   = routes.Route{
		Path:    mainRoute,
		Handler: indexHandler,
	}
	indexResources = routes.Route{
		Path:    resourcesPath,
		Handler: indexHandler,
	}
)

func handler(w http.ResponseWriter, r *http.Request) {
	// user does not have to be logged in
	s, _ := auth.GetSession(r)
	layout := Layout(s)
	if r.URL.Path == "/" {
		// Render the main page
		err := routes.RenderTemplate(w, Content(), layout)
		if err != nil {
			log.HttpError("server/index - error rendering template:", err)
		}
	} else {
		// Serve the other resources
		routes.ServeFile(w, r)
	}
}
