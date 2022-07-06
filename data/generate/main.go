package generate

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

const (
	ring1Filename = "input/iwg-2022_ring1.txt"
	ring2Filename = "input/iwg-2022_ring2.txt"

	resultFilename     = "output/competition.sql"
	eventFilename      = "output/events.sql"
	competitorFilename = "output/competitors.sql"
	routineFilename    = "output/routines.sql"
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
	competitorFile *os.File
	routineFile    *os.File
	eventFile      *os.File

	ringID     = 1
	eventID    = 1
	eventOrder = 1
	compID     = 1
	compOrder  = 1

	currentEvent EventDetails

	competitorMap = map[string]int{}

	expMap = map[string]int{
		"Beg": 1,
		"Int": 2,
		"Adv": 3,
	}

	genderMap = map[string]int{
		"F": 1,
		"M": 2,
	}

	ruleMap = map[string]int{
		"USWU": 1,
	}
)

func styleMap(styleName string) int {
	if strings.HasPrefix(styleName, "N.") {
		return 0
	}
	if strings.HasPrefix(styleName, "S.") {
		return 1
	}
	if strings.HasPrefix(styleName, "N") {
		return 1
	}
	if strings.Contains(styleName, "Taiji") {
		return 2
	}
	return 0
}

func main() {
	// remove previous output
	os.Remove(resultFilename)

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
	if err := cat(eventFilename, resultFilename); err != nil {
		return err
	}
	if err := cat(competitorFilename, resultFilename); err != nil {
		return err
	}
	if err := cat(routineFilename, resultFilename); err != nil {
		return err
	}

	os.Remove(eventFilename)
	os.Remove(competitorFilename)
	os.Remove(routineFilename)

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
	eventFile, err = os.OpenFile(eventFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	defer eventFile.Close()
	eventFile.WriteString("INSERT INTO events (ring_id, name, ruleset_id, event_order, style, experience_id) VALUES\n")

	competitorFile, err = os.OpenFile(competitorFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	defer competitorFile.Close()
	competitorFile.WriteString("INSERT INTO competitors (last_name, first_name, gender_id, experience_id) VALUES\n")

	routineFile, err = os.OpenFile(routineFilename, os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return
	}
	defer routineFile.Close()
	routineFile.WriteString("INSERT INTO routines (event_id, event_order, competitor_id) VALUES\n")

	r1file, err := os.Open(ring1Filename)
	if err != nil {
		fmt.Println(err)
		return
	}
	b := bufio.NewScanner(r1file)
	for b.Scan() {
		processLine(b.Text())
	}
	r1file.Close()

	r2file, err := os.Open(ring2Filename)
	if err != nil {
		fmt.Println(err)
		return
	}
	eventOrder = 1
	ringID = 2
	b = bufio.NewScanner(r2file)
	for b.Scan() {
		processLine(b.Text())
	}
	r2file.Close()

	// replace last commas with a semi-colon
	eventFile.Seek(-2, 2)
	eventFile.WriteString(";")
	competitorFile.Seek(-2, 2)
	competitorFile.WriteString(";")
	routineFile.Seek(-2, 2)
	routineFile.WriteString(";")

	return
}

func processLine(line string) {
	if strings.HasPrefix(line, "\t") || strings.HasPrefix(line, "    ") {
		// competitor
		name := strings.TrimSpace(line)
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
		compOrder++
	} else {
		// event
		line = strings.TrimSpace(line)
		currentEvent = parseEvent(line)
		eventName := expandEvent(line)
		eventFile.WriteString(fmt.Sprintf("  (%d, '%s', %d, %d, %d, %d),\n", ringID, eventName, currentEvent.Rules, eventOrder, currentEvent.Style, currentEvent.Experience))
		eventID++
		eventOrder++
		compOrder = 1
	}
}

func expandEvent(name string) string {
	//exp = strings.Replace(name, "Beg", "Beginner", 1)
	//exp = strings.Replace(exp, "Int", "Intermediate", 1)
	//exp = strings.Replace(exp, "Adv", "Advanced", 1)

	name = strings.Replace(name, "CQ", "Changquan", 1)
	name = strings.Replace(name, "NQ", "Nanquan", 1)
	name = strings.Replace(name, "TJ", "Taiji", 1)
	name = strings.Replace(name, "GS", "Gunshu", 1)
	name = strings.Replace(name, "DS", "Daoshu", 1)
	name = strings.Replace(name, "JS", "Jianshu", 1)
	name = strings.Replace(name, "QS", "Qiangshu", 1)
	name = strings.Replace(name, "NG", "Nangun", 1)
	name = strings.Replace(name, "ND", "Nandao", 1)

	return name
}

func parseEvent(eventName string) EventDetails {
	tokens := strings.Split(strings.TrimSpace(eventName), " ")
	i := 0

	exp := tokens[i]
	i++

	style := tokens[i]
	if style == "Other" || style == "Taiji" || style == "TJ" {
		i++
		style += " " + tokens[i]
	} else if style == "N" || style == "S" {
		i++
		style += " " + tokens[i] + " " + tokens[i+1]
		i++
	}
	i++

	rules := "USWU"
	gender := tokens[i]

	return EventDetails{
		ID:         eventID,
		Experience: expMap[exp],
		Style:      styleMap(style),
		Rules:      ruleMap[rules],
		Gender:     genderMap[gender],
	}
}
