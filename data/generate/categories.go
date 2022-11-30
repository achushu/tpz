package generate

import (
	"fmt"
	"os"
	"strings"

	"github.com/achushu/tpz/data"
)

const (
	EndItem = ","
	EndStmt = ";\n\n"
)

func WriteCategoriesFile(filename string) error {
	f, err := os.OpenFile(filename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return err
	}
	defer f.Close()

	f.WriteString(EventTypes())
	f.WriteString(Rulesets())
	f.WriteString(Experiences())
	f.WriteString(AgeGroups())
	f.WriteString(Genders())
	return nil
}

func Rulesets() string {
	var s strings.Builder

	s.WriteString("INSERT INTO rulesets (name) VALUES\n")
	eol := ","
	count := len(data.AllRulesets)
	for i, v := range data.AllRulesets {
		if i == count-1 {
			eol = EndStmt
		}
		s.WriteString(fmt.Sprintf("\t('%s')%s\n", v.String(), eol))
	}

	return s.String()
}

func EventTypes() string {
	var s strings.Builder

	s.WriteString("INSERT INTO event_types (name) VALUES\n")
	eol := ","
	count := len(data.AllStyles)
	for i, v := range data.AllStyles {
		if i == count-1 {
			eol = EndStmt
		}
		s.WriteString(fmt.Sprintf("\t('%s')%s\n", v.String(), eol))
	}

	return s.String()
}

func Experiences() string {
	var s strings.Builder

	s.WriteString("INSERT INTO experience (name, abbreviation) VALUES\n")
	eol := ","
	count := len(data.AllExperiences)
	for i, v := range data.AllExperiences {
		if i == count-1 {
			eol = EndStmt
		}
		s.WriteString(fmt.Sprintf("\t('%s', '%s')%s\n", v.String(), v.StringShort(), eol))
	}

	return s.String()
}

func AgeGroups() string {
	var s strings.Builder

	s.WriteString("INSERT INTO age_group (name) VALUES\n")
	eol := ","
	count := len(data.AllAgeGroups)
	for i, v := range data.AllAgeGroups {
		if i == count-1 {
			eol = EndStmt
		}
		s.WriteString(fmt.Sprintf("\t('%s')%s\n", v.String(), eol))
	}

	return s.String()
}

func Genders() string {
	var s strings.Builder

	s.WriteString("INSERT INTO gender (name, abbreviation) VALUES\n")
	eol := ","
	count := len(data.AllGenders)
	for i, v := range data.AllGenders {
		if i == count-1 {
			eol = EndStmt
		}
		s.WriteString(fmt.Sprintf("\t('%s', '%s')%s\n", v.String(), v.StringShort(), eol))
	}

	return s.String()
}
