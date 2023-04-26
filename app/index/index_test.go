package index

import (
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/achushu/tpz/server/routes/routetesting"
)

func TestLoadPage(t *testing.T) {
	routetesting.SetupTestEnv(t)
	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	handler(w, r)
	resp := w.Result()
	_, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("error reading result: %s", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("unexpected HTTP status in response -- want: %d; got: %d", http.StatusOK, resp.StatusCode)
	}
}
