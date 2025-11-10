package generate

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"os"
	"strings"

	"github.com/achushu/tpz/data"
)

var inputFiles = []string{
	//	"input/pwc-2025-blue.csv",
	//	"input/pwc-2025-green.csv",
	//	"input/pwc-2025-iwuf-blue.csv",
	//	"input/pwc-2025-iwuf-green.csv",
	"input/uwg-2025-ring1-AM.txt",
}

const (
	tablesFilename     = "create_tables.sql"
	categoriesFilename = "output/categories.sql"
	resultFilename     = "output/competition.sql"
	ringFilename       = "output/rings.sql"
	eventFilename      = "output/events.sql"
	competitorFilename = "output/competitors.sql"
	routineFilename    = "output/routines.sql"
	nanduFilename      = "output/nandu.sql"
	tenPtTestFilename  = "test-ring.txt"
	nanduTestFilename  = "test-ring-intl.txt"
)

const (
	UWG int = iota
	PWC
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
	ringFile       *os.File
	competitorFile *os.File
	routineFile    *os.File
	eventFile      *os.File
	nanduFile      *os.File

	testFilenames = []string{tenPtTestFilename, nanduTestFilename}

	// cache of intermediary files
	intFiles []*os.File

	ringID     = 0
	eventID    = 0
	eventOrder = 1
	compID     = 0
	compOrder  = 1

	currentEvent  EventDetails
	lastRoutineID = 0

	competitorMap = map[string]int{}
)

func styleMap(styleName string) int {
	if len(styleName) == 0 {
		return 0
	}
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

func main() error {
	fileType := UWG
	var fmtFn func([]string) error

	// remove previous output
	os.Remove(resultFilename)

	if err := CreateIntermediateFiles(); err != nil {
		fmt.Println(err)
		return err
	}
	intFiles = []*os.File{
		ringFile, competitorFile, eventFile, routineFile, nanduFile,
	}

	switch fileType {
	case UWG:
		fmtFn = uwgFormat
	case PWC:
		fmtFn = pwcFormat
	}
	if err := fmtFn(inputFiles); err != nil {
		fmt.Println(err)
		return err
	}
	// add test rings
	if err := uwgFormat(testFilenames); err != nil {
		fmt.Println(err)
		return err
	}

	finishFiles()

	if err := GenerateCombinedFile(resultFilename); err != nil {
		fmt.Println(err)
		return err
	}
	fmt.Println("done")
	return nil
}

func CreateIntermediateFiles() (err error) {
	if ringFile, err = os.OpenFile(ringFilename, os.O_CREATE|os.O_TRUNC, 0666); err != nil {
		return
	}
	ringFile.WriteString("INSERT INTO rings (id, name) VALUES\n")

	if eventFile, err = os.OpenFile(eventFilename, os.O_CREATE|os.O_TRUNC, 0666); err != nil {
		return
	}
	eventFile.WriteString("INSERT INTO events (ring_id, name, event_order, experience_id, ruleset_id) VALUES\n")

	if competitorFile, err = os.OpenFile(competitorFilename, os.O_CREATE|os.O_TRUNC, 0666); err != nil {
		return
	}
	competitorFile.WriteString("INSERT INTO competitors (last_name, first_name, gender_id, experience_id) VALUES\n")

	if routineFile, err = os.OpenFile(routineFilename, os.O_CREATE|os.O_TRUNC, 0666); err != nil {
		return
	}
	routineFile.WriteString("INSERT INTO routines (event_id, event_order, competitor_id) VALUES\n")

	if nanduFile, err = os.OpenFile(nanduFilename, os.O_CREATE|os.O_TRUNC, 0666); err != nil {
		return
	}
	nanduFile.WriteString("INSERT INTO nandu_sheets (routine_id, segment1, segment2, segment3, segment4) VALUES\n")
	return
}

func pwcFormat(files []string) (err error) {
	var ok bool

	for _, input := range files {
		var f *os.File
		eventOrder = 1
		f, err = os.Open(input)
		if err != nil {
			fmt.Println(err)
			return
		}
		csvFile := csv.NewReader(f)

		ringID += 1
		ringFile.WriteString(fmt.Sprintf("  (%d, '%s'),\n", ringID, f.Name()))
		records, err := csvFile.ReadAll()
		if err != nil {
			fmt.Println(err)
			return err
		}
		header := records[0]
		for i, title := range header {
			// strip whitespace
			header[i] = strings.TrimSpace(title)
		}
		fnIdx := indexOf("First Name", header)
		lnIdx := indexOf("Last Name", header)
		expIdx := indexOf("Experience", header)
		genderIdx := indexOf("Gender", header)
		eventIdx := indexOf("Event", header)

		rulesetID := 1 // all 10-pt scoring
		cID := 0
		lastEvent := ""

		for _, v := range records[1:] {
			fName := strings.TrimSpace(v[fnIdx])
			lName := strings.TrimSpace(v[lnIdx])
			event := v[eventIdx]
			if event == "" || (fName == "" && lName == "") {
				continue
			}
			if fName[:2] == "XX" {
				continue
			}
			fullName := strings.ToTitle(fName + " " + lName)
			gender := data.ToGender(v[genderIdx])
			exp := data.ToExperience(v[expIdx])

			eventName := fmt.Sprintf("%s %s %s", exp.StringShort(), event, gender.StringShort())
			eventName = strings.ToTitle(eventName)
			if eventName != lastEvent {
				// new event
				eventID += 1
				eventFile.WriteString(fmt.Sprintf("  (%d, '%s', %d, %d, %d),\n", ringID, eventName, eventOrder, exp, rulesetID))
				compOrder = 1
				lastEvent = eventName
			}

			if cID, ok = competitorMap[fullName]; !ok {
				compID += 1
				competitorFile.WriteString(fmt.Sprintf("  ('%s', '%s', %d, %d),\n", lName, fName, gender, exp))
				cID = compID
				competitorMap[fullName] = cID
			}

			routineFile.WriteString(fmt.Sprintf("  (%d, %d, %d),\n", eventID, compOrder, cID))
			compOrder += 1
		}
	}
	return
}

func uwgFormat(files []string) (err error) {
	var f *os.File
	for _, input := range files {
		eventOrder = 1
		f, err = os.Open(input)
		if err != nil {
			fmt.Println(err)
			return
		}
		b := bufio.NewScanner(f)
		line := 0
		for b.Scan() {
			if line == 0 {
				ringID += 1
				ringFile.WriteString(fmt.Sprintf("  (%d, '%s'),\n", ringID, b.Text()))
			} else {
				processLine(b.Text())
			}
			line++
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
			compID += 1
			cID = compID
			competitorMap[name] = cID
			lNameIdx := strings.LastIndex(name, " ")
			lName := name[lNameIdx+1:]
			fName := name[:lNameIdx]
			competitorFile.WriteString(fmt.Sprintf("  ('%s', '%s', %d, %d),\n", lName, fName, currentEvent.Gender, currentEvent.Experience))
		}
		routineFile.WriteString(fmt.Sprintf("  (%d, %d, %d),\n", currentEvent.ID, compOrder, cID))
		lastRoutineID++
		compOrder++
		return
	}
	// event
	eventID++
	line = strings.TrimSpace(line)
	currentEvent = parseEvent(line)
	eventName := expandEvent(line)
	eventFile.WriteString(fmt.Sprintf("  (%d, '%s', %d, %d, %d),\n", ringID, eventName, eventOrder, currentEvent.Experience, currentEvent.Rules))
	eventOrder++
	compOrder = 1
}

func finishFiles() (err error) {
	// replace last commas with a semi-colon
	for _, f := range intFiles {
		if _, err = f.Seek(-2, 2); err != nil {
			fmt.Println("error seeking file:", err)
			return
		}
		if _, err = f.WriteString(";"); err != nil {
			fmt.Println("error finishing SQL file:", err)
			return
		}
	}
	return
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

	genderIdx := len(tokens) - 1
	gender := data.ToGender(tokens[genderIdx])

	styleName := strings.Join(tokens[idx:genderIdx], " ")

	return EventDetails{
		ID: eventID,
		//		Age:        int(age),
		Experience: int(exp),
		Style:      styleMap(styleName),
		Rules:      int(rules),
		Gender:     int(gender),
	}
}

func GenerateCombinedFile(filename string) (err error) {
	var (
		tablesFile     *os.File
		categoriesFile *os.File
	)
	if tablesFile, err = os.Open(tablesFilename); err != nil {
		return
	} else if err = cat(tablesFile, filename); err != nil {
		return
	}
	WriteCategoriesFile(categoriesFilename)
	if categoriesFile, err = os.Open(categoriesFilename); err != nil {
		return
	} else if err = cat(categoriesFile, filename); err != nil {
		return
	}
	categoriesFile.Close()
	if err = os.Remove(categoriesFilename); err != nil {
		return
	}
	for _, f := range intFiles {
		if err = cat(f, filename); err != nil {
			return
		}
		f.Close()
		os.Remove(f.Name())
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

func cat(src *os.File, dst string) error {
	src.Seek(0, 0)
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		return err
	}
	defer out.Close()
	scanner := bufio.NewScanner(src)
	for scanner.Scan() {
		if _, err = out.WriteString(scanner.Text() + "\n"); err != nil {
			return err
		}
	}
	out.WriteString("\n")
	return nil
}
