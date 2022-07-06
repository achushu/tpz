package server

import (
	// Load these routes
	_ "github.com/achushu/tpz/server/routes/admin"
	_ "github.com/achushu/tpz/server/routes/api"
	_ "github.com/achushu/tpz/server/routes/auth"
	_ "github.com/achushu/tpz/server/routes/display"
	_ "github.com/achushu/tpz/server/routes/index"
	_ "github.com/achushu/tpz/server/routes/judge"
	_ "github.com/achushu/tpz/server/routes/results"
)
