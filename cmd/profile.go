// +build profile

package cmd

import (
	"net/http"
	_ "net/http/pprof"

	"github.com/achushu/libs/out"
)

const (
	profileAddr = "localhost:8411"
	profileURI  = "/debug/pprof/"
)

func init() {
	profileFunc = EnableCPUProfiler
}

func EnableCPUProfiler() {
	go func() {
		out.Println("Enabling CPU profiling -- go to http://", profileAddr, profileURI)
		out.Println(http.ListenAndServe(profileAddr, nil))
	}()
}
