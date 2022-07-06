package routes

import (
	"errors"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/achushu/tpz/app/test"
	tpzErrors "github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/routes/routetesting"
)

func TestError(t *testing.T) {
	w := httptest.NewRecorder()
	RenderError(w, tpzErrors.NewBadRequest(errors.New("test")))
	resp := w.Result()
	_, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("error reading result: %s", err)
	}
	if resp.StatusCode == http.StatusOK {
		t.Errorf("unexpected HTTP status in response -- want: %d; got: %d", http.StatusBadRequest, resp.StatusCode)
	}
}

type PageTemplate struct {
	Title string
}

func TestTemplate(t *testing.T) {
	routetesting.SetupTestEnv(t)
	w := httptest.NewRecorder()
	data := PageTemplate{}
	RenderTemplate(w, test.Content(), data)
	resp := w.Result()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("error reading result: %s", err)
	}
	if strings.Index(string(body), "<body>") < 0 {
		t.Errorf("template rendering failed -- got: %s", body)
	}
}
