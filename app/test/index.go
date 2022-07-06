package test

import (
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/data"
)

func Content() string {
	return "/index/index.html"
}

func Layout(session *data.Session) app.TPZPageLayout {
	return app.TPZPageLayout{
		Title:   "Test",
		Header:  "Test Page",
		Session: session,
	}
}
