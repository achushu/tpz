package routetesting

import (
	"os"
	"strings"
	"testing"
)

// SetupTestEnv adjusts the running environment so that file searches
// behave as they would in normal operation.
func SetupTestEnv(t *testing.T) {
	apphome := "tpz-lite"
	pwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("error setting up test: %s", err)
	}
	i := strings.Index(pwd, apphome)
	err = os.Chdir(pwd[:i+len(apphome)])
	if err != nil {
		t.Fatalf("error setting up test: %s", err)
	}
}
