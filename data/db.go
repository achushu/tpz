package data

import (
	"database/sql"

	"github.com/achushu/libs/out"
	yaml "gopkg.in/yaml.v2"
)

// Config holds the database's connection parameters
type Config struct {
	Enabled  bool   `yaml:"enabled"`
	Host     string `yaml:"host"`
	Database string `yaml:"dbname"`
	Username string `yaml:"user"`
	Password string `yaml:"password"`
}

var (
	db *sql.DB
)

// MustGetConfigFromMap attempts to read yaml values into the Config.
// Errors parsing the configuration will result in a panic.
func MustGetConfigFromMap(v map[string]interface{}) *Config {
	if _, err := yaml.Marshal(v); err != nil {
		panic(err)
	}
	cfg := &Config{}
	if v == nil {
		return cfg
	}

	m, err := yaml.Marshal(v)
	if err != nil {
		panic(err)
	}
	if err := yaml.Unmarshal(m, cfg); err != nil {
		out.Errorln("error reading database config: ", err)
		panic(err)
	}

	return cfg
}
