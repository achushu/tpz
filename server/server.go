package server

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/achushu/libs/out"
	"github.com/achushu/tpz/config"
	"github.com/achushu/tpz/data"
	slog "github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
)

// Server represents the competition scoring platform
type Server struct {
	cfg *config.Config
}

// New returns a new Server object with configuration file cfg loaded
func New(configFile string) (*Server, error) {
	// Get server configurations
	cfg, err := config.LoadConfigFile(configFile)
	if err != nil {
		return nil, err
	}

	return &Server{
		cfg: cfg,
	}, nil
}

// Start binds the Server to the configured port for listening to HTTP requests.
// Also connects to the database
func (s *Server) Start() error {
	dbCfg := s.cfg.Database
	if err := data.Connect(dbCfg); err != nil {
		return err
	}

	// Initialize competition state
	rings, err := data.GetRings()
	if err != nil {
		return err
	}
	for _, v := range rings {
		data.AddRing(v)
	}

	if err = slog.Start(); err != nil {
		return err
	}

	return s.listenHTTP()
}

func (s *Server) listenHTTP() error {
	// Enable debug mode
	routes.EnableDebugMode(true)

	// Set the home directory
	routes.SetAppHome(s.cfg.HomeDir)
	// Set the static directory
	routes.SetStaticDir(s.cfg.StaticDir)

	// start the HTTP server
	srv := &http.Server{
		Addr:           ":" + strconv.Itoa(s.cfg.Port),
		WriteTimeout:   time.Second * 15,
		ReadTimeout:    time.Second * 15,
		IdleTimeout:    time.Second * 60,
		MaxHeaderBytes: 1 << 20,
	}
	srv.Handler = routes.GetRouter()

	out.Printf("starting Ten.Zero on port %d\n", s.cfg.Port)
	log.Fatal(srv.ListenAndServe())
	return nil
}
