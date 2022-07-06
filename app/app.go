package app

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	"github.com/achushu/tpz/data"
)

var (
	// Home is the root directory of the webpages
	Home = "app"
)

// TPZPage defines how a webpage of the UI should be structured
type TPZPage interface {
	// Content points to the HTML resource
	Content() string
	// Layout fills in template values for the page
	Layout(*data.Session) TPZPageLayout
}

// TPZPageLayout defines variables to set in the main layout
type TPZPageLayout struct {
	Title   string
	Header  string
	Session *data.Session
	Data    string
}

func NewLayout(session *data.Session) TPZPageLayout {
	return TPZPageLayout{
		Session: session,
	}
}

// LoadPage attempts to find the correct file and return its contents.
func LoadPage(name string) ([]byte, error) {
	var (
		body     []byte
		err      error
		attempts []string
		tried    string
	)

	attempts = make([]string, 0, 3)

	// Default to html extension if no suffix is specified
	if strings.Contains(name, ".") {
		name += ".html"
	}

	if body, tried, err = loadUsingBasePath(name); err == nil {
		return body, err
	}
	attempts = append(attempts, tried)

	err = fmt.Errorf("could not find file %s -- tried looking for:\n%s", name, strings.Join(attempts, "\n"))
	return nil, err
}

func loadUsingBasePath(name string) ([]byte, string, error) {
	var err error

	path := Home + name
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		return nil, path, err
	}
	body, err := ioutil.ReadFile(path)
	return body, path, err
}
