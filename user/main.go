package main

import (
	"github.com/achushu/libs/out"
	"github.com/achushu/tpz/app"
	"github.com/achushu/tpz/config"
	"github.com/achushu/tpz/data"
)

func main() {
	// Get server configurations
	cfg, err := config.LoadConfigFile("config.yml")
	if err != nil {
		out.Errorln(err)
		return
	}
	dbCfg := cfg.Database
	if err = data.Connect(dbCfg); err != nil {
		out.Errorln(err)
		return
	}
	err = app.CreateUser("tpz", "password")
	if err != nil {
		out.Errorln(err)
	}
}
