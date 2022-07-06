package index

import (
	"net/http"

	"github.com/achushu/tpz/app/index"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
	"github.com/achushu/tpz/server/session"
)

const (
	mainRoute     = "/"
	resourcesPath = "/index/{\\w+\\.(css|js)}"
)

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

func init() {
	routes.AddIndexRoute(indexResources)
	routes.AddIndexRoute(indexRoute)
}

func handler(w http.ResponseWriter, r *http.Request) {
	// user does not have to be logged in
	s, _ := session.GetSession(r)
	layout := index.Layout(s)
	if r.URL.Path == "/" {
		// Render the main page
		err := routes.RenderTemplate(w, index.Content(), layout)
		if err != nil {
			log.HttpError("server/index - error rendering template:", err)
		}
	} else {
		// Serve the other resources
		routes.ServeFile(w, r)
	}
}
