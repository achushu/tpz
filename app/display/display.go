package display

import (
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/data"
)

func Content() string {
	return "/display/display.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.NewLayout(session)
}
