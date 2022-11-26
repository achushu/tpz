//go:build nodb
// +build nodb

package data

import (
	"time"

	"github.com/achushu/tpz/errors"

	"github.com/achushu/libs/out"
)

const (
	tpzUser = "tpz"
)

var (
	// the encoded form of the password: "password"
	tpzPassword = []byte("$2a$10$Wxx9Z8sySTJ4SPFKD4HoE.c63SapugQHMVPOO/xzHAcryYD.knNaK")
)

func init() {
	out.Println("!!! BUILD USES TEST DATABASE !!!")
}

// Connect is a no-op without a database
func Connect(cfg *Config) error {
	// no-op
	return nil
}

// GetUser queries the database for the user with the given username
func GetUser(username string) (*User, error) {
	for _, v := range allUsers {
		if v.Name == username {
			return v, nil
		}
	}
	return nil, errors.ErrNotFound
}

// CreateUser saves the given credentials in the database
func CreateUser(username string, password []byte) error {
	// no-op
	return nil
}

func CreateWebSession(key string, username string, created, expires time.Time) error {
	return nil
}

func GetWebSession(key string) (*Session, error) {
	return nil, errors.ErrNotFound
}

// GetRings returns a list of all the available rings
func GetRings() ([]*Ring, error) {
	return allRings, nil
}

func GetRulesets() ([]map[string]interface{}, error) {
	return nil, errors.ErrNotImplemented
}

func GetCompetitors() ([]*Competitor, error) {
	return allCompetitors, nil
}

func GetCompetitorByID(id int) (*Competitor, error) {
	for _, v := range allCompetitors {
		if v.ID == id {
			return v, nil
		}
	}
	return nil, errors.ErrNotFound
}

// GetCompetitorsInEvent returns the athletes competing in this event
// *sorted by turn order*
func GetCompetitorsInEvent(eventID int) ([]*Competitor, error) {
	eventList := make([]*Routine, 0)
	for _, r := range routines {
		if r.Event == eventID {
			eventList = append(eventList, r)
		}
	}
	res := make([]*Competitor, len(eventList))
	for _, r := range eventList {
		c, err := GetCompetitorByID(r.Competitor)
		if err != nil {
			return nil, err
		}
		res[r.Order-1] = c
	}
	return res, nil
}

func GetNthCompetitorInEvent(n, eventID int) (*Competitor, error) {
	competitorID := -1
	for _, v := range routines {
		if v.Order == n && v.Event == eventID {
			competitorID = v.Competitor
		}
	}
	if competitorID == -1 {
		return nil, errors.ErrNotFound
	}
	return GetCompetitorByID(competitorID)
}

func GetEvents() ([]*Event, error) {
	return allEvents, nil
}

func GetEventByID(id int) (*Event, error) {
	for _, v := range allEvents {
		if v.ID == id {
			return v, nil
		}
	}
	return nil, errors.ErrNotFound
}

func GetEventsByCompetitor(competitorID int) ([]*Event, error) {
	res := make([]*Event, 0, 4)
	for _, v := range routines {
		if v.Competitor == competitorID {
			event, err := GetEventByID(v.Event)
			if err != nil {
				return nil, err
			}
			res = append(res, event)
		}
	}
	return res, nil
}

func GetEventsInRing(ringID int) ([]*Event, error) {
	res := make([]*Event, 0, len(allEvents))
	for _, v := range allEvents {
		if v.Ring == ringID {
			res = append(res, v)
		}
	}
	return res, nil
}

func GetNthEventInRing(n, ringID int) (*Event, error) {
	for _, v := range allEvents {
		if v.Order == n && v.Ring == ringID {
			return v, nil
		}
	}
	return nil, errors.ErrNotFound
}

func GetRoutine(eventID, competitorID int) (*Routine, error) {
	for _, v := range routines {
		if v.Event == eventID && v.Competitor == competitorID {
			return v, nil
		}
	}
	return nil, errors.ErrNotFound
}

func SaveDeductionMark(dm *DeductionMark) error {
	deductions = append(deductions, dm)
	return nil
}

func UpdateDeductionMark(id int, code string) error {
	for _, d := range deductions {
		if d.ID == id {
			d.Code = code
		}
	}
	return nil
}

func RemoveDeductionMark(id int) error {
	var idx = -1
	for i, d := range deductions {
		if d.ID == id {
			idx = i
			break
		}
	}
	if idx != -1 {
		deductions = append(deductions[:idx], deductions[idx+1:]...)
	}
	return nil
}

func GetDeductions(routineID int) ([]*DeductionMark, error) {
	res := make([]*DeductionMark, 0)
	for _, v := range deductions {
		if v.Routine == routineID {
			res = append(res, v)
		}
	}
	return res, nil
}

func GetScores(routineID int) (map[string]*Score, error) {
	res := make(map[string]*Score)
	for _, v := range scores {
		if v.Routine == routineID {
			res[v.Judge] = v
		}
	}
	return res, nil
}

func GetAdjustments(routineID int) ([]*Adjustment, error) {
	res := make([]*Adjustment, 0)
	for _, v := range adjustments {
		if v.Routine == routineID {
			res = append(res, v)
		}
	}
	return res, nil
}

func saveScore(score float64, routineID int, judgeTag string) error {
	id := len(scores)
	s := &Score{
		ID:      id,
		Routine: routineID,
		Judge:   judgeTag,
		Score:   score,
	}
	scores = append(scores, s)
	return nil
}

func DeleteScore(id int) error {
	return nil
}

func SaveFinalScore(score, total string, elapsed string, eventID, competitorID int) error {
	e, err := GetRoutine(eventID, competitorID)
	if err != nil {
		return err
	}
	e.FinalScore = score
	e.TotalScore = total
	e.Duration = elapsed
	return nil
}

func GetFinalScore(eventID, competitorID int) (string, error) {
	e, err := GetRoutine(eventID, competitorID)
	if err != nil {
		return "", err
	}
	return e.FinalScore, nil
}

func SaveAdjustment(amount float64, reason string, routineID int, judgeTag string) error {
	id := len(adjustments)
	a := &Adjustment{
		ID:      id,
		Routine: routineID,
		Judge:   judgeTag,
		Amount:  amount,
		Reason:  reason,
	}
	adjustments = append(adjustments, a)
	return nil
}

func GetAllRankings() ([]map[string]interface{}, error) {
	return nil, errors.ErrNotImplemented
}

func GetEventRanks(eventID int) ([]map[string]interface{}, error) {
	return nil, errors.ErrNotImplemented
}

func GetSimpleRanks(eventID int) ([]map[string]interface{}, error) {
	return nil, errors.ErrNotImplemented
}

func FindAllAroundWinner() ([]string, error) {
	return nil, errors.ErrNotImplemented
}

func GetTopScores(competitorID int) (float64, error) {
	return 0, nil
}

func AddCompetitorToEvent(competitorID, eventID int) (err error) {
	return errors.ErrNotImplemented
}

func RemoveCompetitorFromEvent(competitorID, eventID int) (err error) {
	return errors.ErrNotImplemented
}

func ChangeEventRing(ringID, eventID int) error {
	return errors.ErrNotImplemented
}

func ChangeEventRules(eventID, rulesetID int) error {
	return errors.ErrNotImplemented
}

/*
 * Mocked database
 */
var (
	Alice = &Competitor{
		ID:         1,
		FirstName:  "Alice",
		LastName:   "A.",
		Gender:     Female,
		Experience: Advanced,
		AgeGroup:   Adult,
	}
	Becky = &Competitor{
		ID:         2,
		FirstName:  "Becky",
		LastName:   "B.",
		Gender:     Female,
		Experience: Advanced,
		AgeGroup:   Adult,
	}
	Chelsea = &Competitor{
		ID:         3,
		FirstName:  "Chelsea",
		LastName:   "C.",
		Gender:     Female,
		Experience: Advanced,
		AgeGroup:   Adult,
	}
	Avery = &Competitor{
		ID:         4,
		FirstName:  "Avery",
		LastName:   "A.",
		Gender:     Male,
		Experience: Beginner,
		AgeGroup:   Adult,
	}

	AdvCQF = &Event{
		ID:         2,
		Ring:       1,
		Name:       "Changquan F (USWU)",
		Order:      0,
		Ruleset:    USWU,
		Style:      Changquan,
		Experience: Advanced,
	}
	BegCQM = &Event{
		ID:         1,
		Ring:       1,
		Name:       "Changquan M (USWU)",
		Order:      1,
		Ruleset:    USWU,
		Style:      Changquan,
		Experience: Beginner,
	}
	IWUFCQF = &Event{
		ID:         3,
		Ring:       2,
		Name:       "Changquan F (IWUF)",
		Order:      0,
		Ruleset:    IWUF,
		Style:      Changquan,
		Experience: Advanced,
	}
	IWUFABNQM = &Event{
		ID:         4,
		Ring:       2,
		Name:       "Nanquan M (IWUF-AB)",
		Order:      1,
		Ruleset:    IWUFAB,
		Style:      Nanquan,
		Experience: Advanced,
	}
)
var (
	allUsers = []*User{
		{
			ID:       1,
			Name:     tpzUser,
			Password: tpzPassword,
		},
	}

	allRings = []*Ring{
		{1, "FOP1"},
		{2, "FOP2"},
	}

	allCompetitors = []*Competitor{
		Alice, Becky, Chelsea, Avery,
	}
	allEvents = []*Event{
		AdvCQF,
		BegCQM,
		IWUFCQF,
		IWUFABNQM,
	}
	routines = []*Routine{
		// Changquan F
		{
			ID:         2,
			Event:      AdvCQF.ID,
			Competitor: Becky.ID,
			Order:      1,
		},
		{
			ID:         3,
			Event:      AdvCQF.ID,
			Competitor: Chelsea.ID,
			Order:      2,
		},
		{
			ID:         1,
			Event:      AdvCQF.ID,
			Competitor: Alice.ID,
			Order:      3,
		},
		// Changquan M
		{
			ID:         4,
			Event:      BegCQM.ID,
			Competitor: Avery.ID,
			Order:      1,
		},
		// Changquan F IWUF
		{
			ID:         5,
			Event:      IWUFCQF.ID,
			Competitor: Alice.ID,
			Order:      1,
		},
		// Nanquan M IWUF-AB
		{
			ID:         6,
			Event:      IWUFABNQM.ID,
			Competitor: Avery.ID,
			Order:      1,
		},
	}
	scores      = make([]*Score, 0)
	adjustments = make([]*Adjustment, 0)
	deductions  = make([]*DeductionMark, 0)
)
