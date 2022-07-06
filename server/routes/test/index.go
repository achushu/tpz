package test

import (
	"log"
	"net/http"

	"github.com/achushu/tpz/app/test"
	"github.com/achushu/tpz/server/routes"
	"github.com/achushu/tpz/server/session"
)

const (
	namespace = "/test"
)

var (
	mainHandler = http.HandlerFunc(main)
)

func init() {
	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/{[a-z]+\\.(css|js)}", mainHandler),
		routes.New("/", mainHandler),
		routes.New("", mainHandler)},
	)
}

func main(w http.ResponseWriter, r *http.Request) {
	s, _ := session.GetSession(r)
	url := r.URL.Path
	log.Printf("[server/test] request %s\n", url)
	if url == namespace+"/" {
		// Serve the main page
		err := routes.RenderTemplate(w, test.Content(), test.Layout(s))
		if err != nil {
			log.Printf("[server/test] error rendering template: %s", err)
		}
	} else {
		// Serve the other resources
		routes.ServeFile(w, r)
	}
}
