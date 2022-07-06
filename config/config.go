package config

import (
	"github.com/achushu/libs/out"
	"github.com/achushu/tpz/data"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
)

var (
	Settings *Config
)

// Config contains all the user configurable settings for the Server
type Config struct {
	Port        int
	HomeDir     string
	StaticDir   string
	Database    *data.Config
	Competition Competition
}

type Competition struct {
	Name string
}

func LoadConfigFile(filename string) (*Config, error) {
	viper.SetConfigFile(filename)
	err := viper.ReadInConfig()
	if err != nil {
		return nil, err
	}
	v := viper.GetViper()

	viper.SetDefault("server.port", 8000)

	cfg := &Config{
		Port:      viper.GetInt("server.port"),
		HomeDir:   viper.GetString("server.home"),
		StaticDir: viper.GetString("server.static"),
		Database:  data.MustGetConfigFromMap(v.Sub("database").AllSettings()),
		Competition: Competition{
			Name: viper.GetString("competition.name"),
		},
	}

	// Keep an eye on the configuration file
	viper.WatchConfig()
	viper.OnConfigChange(func(e fsnotify.Event) {
		out.Println("Config file changed:", e.Name)
	})

	Settings = cfg

	return cfg, nil
}
