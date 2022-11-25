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
	case "uswu-head":
		return "/judge/uswu-head.html", layout
	case "uswu":
		return "/judge/uswu.html", layout
	case "iwuf-head":
		return "/judge/iwuf-head.html", layout
	case "iwuf-a":
		return "/judge/iwuf-a.html", layout
	case "iwuf-b":
		return "/judge/iwuf-b.html", layout
	case "iwuf-c":
		return "/judge/iwuf-c.html", layout
	case "score-entry":
		return "/judge/score-entry.html", layout
	}
	return "", layout
}
