package log

import (
	"github.com/achushu/libs/out"
)

var (
	httpLogName   = "http.log"
	socketLogName = "ws.log"

	httpLog *out.Log
	wsLog   *out.Log
)

func Start() (err error) {
	// start logs
	httpCfg := out.Config{
		Enabled:  true,
		Filename: httpLogName,
		Async:    true,
		Rotate: &out.RotateConfig{
			Enabled:        true,
			RotateExisting: true,
			Compress:       false,
		},
	}
	httpLog, err = out.New(&httpCfg)
	if err != nil {
		return err
	}

	wsCfg := out.Config{
		Enabled:  true,
		Filename: socketLogName,
		Async:    true,
		Rotate: &out.RotateConfig{
			Enabled:        true,
			RotateExisting: true,
			Compress:       false,
		},
	}
	wsLog, err = out.New(&wsCfg)
	return err
}

func Http(args ...interface{}) {
	httpLog.Logln(out.PriorityInfo, args...)
}

func HttpError(args ...interface{}) {
	httpLog.Logln(out.PriorityError, args...)
}

func Ws(args ...interface{}) {
	wsLog.Logln(out.PriorityInfo, args...)
}

func WsError(args ...interface{}) {
	wsLog.Logln(out.PriorityError, args...)
}
