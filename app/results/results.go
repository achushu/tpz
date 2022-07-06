package results

import (
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/data"
)

func Content() string {
	return "/results/results.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.NewLayout(session)
}
