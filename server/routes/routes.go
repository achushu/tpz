package routes

import (
	"html/template"
	"net/http"
	"strings"

	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/errors"

	"github.com/gorilla/mux"
)

// Route defines the URL pattern that it will handle and provides the function to do so
type Route struct {
	Path    string
	Handler http.Handler
}

var (
	debug       bool
	staticDir   string
	indexRoutes = make([]Route, 0, 2)
	router      = mux.NewRouter()
)

// EnableDebugMode allows for detailed output and full error messages
// to be sent to clients.
// NOTE: do not use in production!
func EnableDebugMode(enable bool) {
	debug = enable
}

// New creates a new Route
func New(path string, handler http.Handler) Route {
	return Route{Path: path, Handler: handler}
}

// AddRoute registers a new route to the main router.
// Routes should register themselves on init.
func AddRoute(rt Route) {
	router.Handle(rt.Path, rt.Handler)
}

// AddIndexRoute ensures that the general path is added last for matching order
func AddIndexRoute(r Route) {
	indexRoutes = append(indexRoutes, r)
}

// AddSubroute adds a subroute with the given namespace and paths to handle
// to the main router.
// Subroutes should be added on init.
func AddSubroute(namespace string, rts []Route) {
	sub := router.PathPrefix(namespace).Subrouter()
	for _, rt := range rts {
		sub.Handle(rt.Path, rt.Handler)
	}
}

// GetRouter returns the main Router
func GetRouter() http.Handler {
	for _, rt := range indexRoutes {
		router.Handle(rt.Path, rt.Handler)
	}
	return router
}

// SetAppHome sets the location of the home directory
func SetAppHome(dir string) {
	app.Home = dir
}

// AppHome returns the location of the home directory
func AppHome() string {
	return app.Home
}

// SetStaticDir adds a file server to handle static files in the specified directory
func SetStaticDir(dir string) {
	staticDir = dir

	// Deny access to the root static directory
	router.HandleFunc("/static/", HandleForbidden)
	// Add static file server
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir(staticDir))))
}

// HandleForbidden serves a HTTP 403 Forbidden page to the user, denying access to the resource
func HandleForbidden(w http.ResponseWriter, r *http.Request) {
	RenderError(w, errors.NewForbiddenError())
}

// RenderError writes out user errors
// and genericized server errors to the client
func RenderError(w http.ResponseWriter, err errors.HttpError) {
	switch err.Code {
	case http.StatusForbidden:
		http.Error(w, err.Error(), err.Code)
	case http.StatusNotFound:
		http.NotFound(w, nil)
	default:
		if debug {
			http.Error(w, err.Error(), err.Code)
		} else {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
	}
}

// RenderPage writes the page contents to the response body
func RenderPage(w http.ResponseWriter, url string) error {
	body, err := app.LoadPage(url)
	if err != nil {
		// Any error loading a page is a Not Found error
		// surpress details about why it failed
		RenderError(w, errors.NewNotFoundError())
		return err
	}
	// Set the appropriate content-type header if necessary
	// (prefer to use ServeFile() for the file if possible)
	if strings.HasSuffix(url, ".css") {
		w.Header().Set("Content-type", "text/css")
	}
	if strings.HasSuffix(url, ".js") {
		w.Header().Set("Content-type", "application/json")
	}
	w.Write(body)
	return nil
}

// RenderTemplate executes the given template body
func RenderTemplate(w http.ResponseWriter, contentTemplate string, data interface{}) error {
	t, err := template.ParseFiles(AppHome()+"/tpz.html", AppHome()+contentTemplate)
	if err != nil {
		return err
	}
	t.ExecuteTemplate(w, "layout", data)
	return nil
}

// ServeFile writes the requested file to the response
func ServeFile(w http.ResponseWriter, r *http.Request) {
	http.FileServer(http.Dir(AppHome())).ServeHTTP(w, r)
}
