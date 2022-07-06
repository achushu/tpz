package judge

import (
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/data"
)

func Content() string {
	return "/judge/judge.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.NewLayout(session)
}

func Directory(path string, session *data.Session) (string, app.TPZPageLayout) {
	layout := app.NewLayout(session)
	switch path {
	case "uswu":
		return "/judge/uswu.html", layout
	case "uswu-head":
		return "/judge/uswu-head.html", layout
	}
	return "", layout
}
