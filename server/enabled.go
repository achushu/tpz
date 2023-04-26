package server

import (
	// Load these routes
	_ "github.com/achushu/tpz/app/admin"
	_ "github.com/achushu/tpz/app/auth"
	_ "github.com/achushu/tpz/app/display"
	_ "github.com/achushu/tpz/app/index"
	_ "github.com/achushu/tpz/app/judge"
	_ "github.com/achushu/tpz/app/login"
	_ "github.com/achushu/tpz/app/results"
	_ "github.com/achushu/tpz/server/routes/api"
)
