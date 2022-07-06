package generate

import (
	"testing"
)

// generate the files without needing to build lol
func TestGenerateFiles(t *testing.T) {
	var err error

	if err = WriteCategoriesFile("output/categories.sql"); err != nil {
		t.Fatal("error writing categories file:", err)
	}
}

func TestMain(t *testing.T) {
	main()
}
