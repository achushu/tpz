package generate

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/achushu/tpz/data"
)

var inputFiles = []string{
	"input/pwc-2023-blue.csv",
	"input/pwc-2023-green.csv",
}

const (
	resultFilename     = "output/competition.sql"
	ringFilename       = "output/rings.sql"
	eventFilename      = "output/events.sql"
	competitorFilename = "output/competitors.sql"
	routineFilename    = "output/routines.sql"
	nanduFilename      = "output/nandu.sql"
)

type EventDetails struct {
	ID         int
	Age        int
	Experience int
	Style      int
	Rules      int
	Gender     int
}

var (
	// intermediary files
	intFilenames = []string{
		ringFilename, eventFilename, competitorFilename, routineFilename, nanduFilename,
	}
	ringFile       *os.File
	competitorFile *os.File
	routineFile    *os.File
	eventFile      *os.File
	nanduFile      *os.File

	ringID     = 1
	eventID    = 1
	eventOrder = 1
	compID     = 1
	compOrder  = 1

	currentEvent  EventDetails
	lastRoutineID = 0

	competitorMap = map[string]int{}
)

func styleMap(styleName string) int {
	switch styleName {
	case "NQ":
		fallthrough
	case "ND":
		fallthrough
	case "NG":
		return 1
	}
	if strings.Contains(styleName, "Taiji") {
		return 2
	}
	if styleName[0] == 'S' {
		return 1
	}
	return 0
}

func main() {
	// remove previous output
	os.Remove(resultFilename)

	// uwgFormat()
	err := pwcFormat()
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println("done")
}

func pwcFormat() (err error) {
	var ok bool

	ringFile, err = os.OpenFile(ringFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	ringFile.WriteString("INSERT INTO rings (id, name) VALUES\n")

	eventFile, err = os.OpenFile(eventFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	eventFile.WriteString("INSERT INTO events (ring_id, name, ruleset_id, event_order, style, experience_id) VALUES\n")

	competitorFile, err = os.OpenFile(competitorFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	competitorFile.WriteString("INSERT INTO competitors (last_name, first_name, gender_id, experience_id) VALUES\n")

	routineFile, err = os.OpenFile(routineFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	routineFile.WriteString("INSERT INTO routines (event_id, event_order, competitor_id) VALUES\n")

	for i, input := range inputFiles {
		var f *os.File
		eventOrder = 1
		ringID = i + 1
		f, err = os.Open(input)
		if err != nil {
			fmt.Println(err)
			return
		}
		csvFile := csv.NewReader(f)
		ringID := 1
		records, err := csvFile.ReadAll()
		if err != nil {
			fmt.Println(err)
			return err
		}
		header := records[0]
		fnIdx := indexOf("First Name", header)
		lnIdx := indexOf("Last Name", header)
		expIdx := indexOf("Experience", header)
		genderIdx := indexOf("Gender", header)
		// eventIdx := indexOf("Event", header)
		eidIdx := indexOf("eID", header)

		eID := 0
		cID := 0
		lastEID := 0

		for _, v := range records[1:] {
			fName := v[fnIdx]
			lName := v[lnIdx]
			fullName := fName + " " + lName
			gender := data.ToGender(v[genderIdx])
			exp := data.ToExperience(v[expIdx])

			eventName := fmt.Sprintf("%s %s %s", exp.StringShort(), gender.StringShort)
			eID, err = strconv.Atoi(v[eidIdx])
			if err != nil {
				fmt.Println("error converting event ID")
				return err
			}
			if eID != lastEID {
				// new event
				lastEID = eID
				eventFile.WriteString(fmt.Sprintf("  (%d, '%s', %d, %d),\n", ringID, eventName, eventOrder, exp))
			}

			if cID, ok = competitorMap[fullName]; !ok {
				competitorFile.WriteString(fmt.Sprintf("  ('%s', '%s', %d, %d),\n", lName, fName, gender, exp))
			}

			routineFile.WriteString(fmt.Sprintf("  (%d, %d, %d),\n", eID, compOrder, cID))
		}
	}
	return
}

func indexOf(value string, slice []string) int {
	for i, v := range slice {
		if value == v {
			return i
		}
	}
	return -1
}

func uwgFormat() {
	// do the thing
	if err := processInput(); err != nil {
		fmt.Println(err)
		return
	}
	if err := combineFiles(); err != nil {
		fmt.Println(err)
	}
}

func combineFiles() error {
	for _, f := range intFilenames {
		if err := cat(f, resultFilename); err != nil {
			return err
		}
		os.Remove(f)
	}
	return nil
}

func cat(src, dst string) error {
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		return err
	}
	defer out.Close()
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	scanner := bufio.NewScanner(in)
	for scanner.Scan() {
		if _, err = out.WriteString(scanner.Text() + "\n"); err != nil {
			return err
		}
	}
	out.WriteString("\n")
	return nil
}

func processInput() (err error) {
	ringFile, err = os.OpenFile(ringFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	ringFile.WriteString("INSERT INTO rings (id, name) VALUES\n")

	eventFile, err = os.OpenFile(eventFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	eventFile.WriteString("INSERT INTO events (ring_id, name, ruleset_id, event_order, style, experience_id) VALUES\n")

	competitorFile, err = os.OpenFile(competitorFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	competitorFile.WriteString("INSERT INTO competitors (last_name, first_name, gender_id, experience_id) VALUES\n")

	routineFile, err = os.OpenFile(routineFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	routineFile.WriteString("INSERT INTO routines (event_id, event_order, competitor_id) VALUES\n")

	nanduFile, err = os.OpenFile(nanduFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	nanduFile.WriteString("INSERT INTO nandu_sheets (routine_id, segment1, segment2, segment3, segment4) VALUES\n")

	for i, input := range inputFiles {
		var f *os.File
		eventOrder = 1
		ringID = i + 1
		f, err = os.Open(input)
		if err != nil {
			fmt.Println(err)
			return
		}
		b := bufio.NewScanner(f)
		line := 0
		for b.Scan() {
			if line == 0 {
				ringFile.WriteString(fmt.Sprintf("  (%d, '%s'),\n", ringID, b.Text()))
			} else {
				processLine(b.Text())
			}
			line++
		}
		f.Close()
	}

	intFiles := []*os.File{
		ringFile, competitorFile, routineFile, eventFile, nanduFile,
	}

	// replace last commas with a semi-colon
	for _, f := range intFiles {
		if _, err = f.Seek(-2, 2); err != nil {
			fmt.Println("error seeking file:", err)
		}
		if _, err = f.WriteString(";"); err != nil {
			fmt.Println("error finishing SQL file:", err)
		}
		f.Close()
	}

	return
}

func processLine(line string) {
	if strings.HasPrefix(line, "\t") || strings.HasPrefix(line, "    ") {
		name := strings.TrimSpace(line)
		if name[0] == '*' {
			seq := strings.Split(strings.TrimSpace(name[1:]), ";")
			if len(seq) < 4 {
				fmt.Printf("nandu sequence %s is incomplete!", seq)
			}
			// nandu sequence
			nanduFile.WriteString(
				fmt.Sprintf("  (%d, '%s', '%s', '%s', '%s'),\n",
					lastRoutineID,
					seq[0], seq[1], seq[2], seq[3],
				))
			return
		}
		// competitor
		cID, ok := competitorMap[name]
		if !ok {
			cID = compID
			competitorMap[name] = cID
			lNameIdx := strings.LastIndex(name, " ")
			lName := name[lNameIdx+1:]
			fName := name[:lNameIdx]
			competitorFile.WriteString(fmt.Sprintf("  ('%s', '%s', %d, %d),\n", lName, fName, currentEvent.Gender, currentEvent.Experience))
			compID++
		}
		routineFile.WriteString(fmt.Sprintf("  (%d, %d, %d),\n", currentEvent.ID, compOrder, cID))
		lastRoutineID++
		compOrder++
		return
	}
	// event
	line = strings.TrimSpace(line)
	currentEvent = parseEvent(line)
	eventName := expandEvent(line)
	eventFile.WriteString(fmt.Sprintf("  (%d, '%s', %d, %d, %d, %d),\n", ringID, eventName, currentEvent.Rules, eventOrder, currentEvent.Style, currentEvent.Experience))
	eventID++
	eventOrder++
	compOrder = 1
}

func expandEvent(name string) string {
	/*
		exp = strings.Replace(name, "Beg", "Beginner", 1)
		exp = strings.Replace(exp, "Int", "Intermediate", 1)
		exp = strings.Replace(exp, "Adv", "Advanced", 1)
	*/
	/*
		name = strings.Replace(name, "CQ", "Changquan", 1)
		name = strings.Replace(name, "NQ", "Nanquan", 1)
		name = strings.Replace(name, "TJ", "Taiji", 1)
		name = strings.Replace(name, "GS", "Gunshu", 1)
		name = strings.Replace(name, "DS", "Daoshu", 1)
		name = strings.Replace(name, "JS", "Jianshu", 1)
		name = strings.Replace(name, "QS", "Qiangshu", 1)
		name = strings.Replace(name, "NG", "Nangun", 1)
		name = strings.Replace(name, "ND", "Nandao", 1)
	*/
	return name
}

func intSliceContains(slice []int, a int) bool {
	for _, v := range slice {
		if a == v {
			return true
		}
	}
	return false
}

func parseEvent(eventName string) EventDetails {
	var (
		exp data.Experience
	)
	// ex: Group A Adv CQ Comp M
	tokens := strings.Split(strings.TrimSpace(eventName), " ")
	idx := 0

	// find the exp
	for ; idx < len(tokens); idx++ {
		t := tokens[idx]
		if e := data.ToExperience(t); e != data.InvalidExperience {
			exp = e
			break
		}
	}

	/*
		ageName := strings.Join(tokens[:idx], " ")
		age := data.ToAgeGroup(ageName)
		idx++ // idx is past age group
	*/

	styleEndIdx := len(tokens) - 1

	rules := data.USWU
	if strings.Contains(eventName, "Nandu") {
		rules = data.IWUF
		styleEndIdx-- // "Nandu" occurs before gender
	} else if strings.Contains(eventName, "Comp") {
		rules = data.IWUFAB
		styleEndIdx-- // "Comp" occurs before gender
	}

	gender := data.ToGender(tokens[len(tokens)-1])

	fmt.Println("idx:", idx)
	fmt.Println("style:", styleEndIdx)
	styleName := strings.Join(tokens[idx:2], " ")

	return EventDetails{
		ID: eventID,
		//		Age:        int(age),
		Experience: int(exp),
		Style:      styleMap(styleName),
		Rules:      int(rules),
		Gender:     int(gender),
	}
}
