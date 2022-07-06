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
func GetScores(routineID int) (map[string]float64, error) {
	return nil, errors.ErrNotImplemented
}

func GetAdjustments(routineID int) ([]Adjustment, error) {
	return nil, errors.ErrNotImplemented
}

func saveScore(score string, routineID int, judgeTag string) error {
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

func saveAdjustment(amount float64, reason string, routineID int, judgeTag string) error {
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
		{
			ID:         1,
			FirstName:  "Alice",
			LastName:   "A.",
			Gender:     Female,
			Experience: Advanced,
			AgeGroup:   Adult,
			Team:       "TPZ",
			Email:      "aaf@tpz.com",
		},
		{
			ID:         2,
			FirstName:  "Becky",
			LastName:   "B.",
			Gender:     Female,
			Experience: Advanced,
			AgeGroup:   Adult,
			Team:       "TPZ",
			Email:      "bbf@tpz.com",
		},
		{
			ID:         3,
			FirstName:  "Chelsea",
			LastName:   "C.",
			Gender:     Female,
			Experience: Advanced,
			AgeGroup:   Adult,
			Team:       "TPZ",
			Email:      "ccf@tpz.com",
		},
		{
			ID:         4,
			FirstName:  "Avery",
			LastName:   "A.",
			Gender:     Male,
			Experience: Beginner,
			AgeGroup:   Adult,
			Team:       "TPZ",
			Email:      "aam@tpz.com",
		},
	}
	allEvents = []*Event{
		{
			ID:         2,
			Ring:       1,
			Name:       "Changquan F (USWU)",
			Order:      0,
			Ruleset:    USWU,
			Style:      Changquan,
			Experience: Advanced,
		},
		{
			ID:         1,
			Ring:       1,
			Name:       "Changquan M (USWU)",
			Order:      1,
			Ruleset:    USWU,
			Style:      Changquan,
			Experience: Beginner,
		},
	}
	routines = []*Routine{
		// Changquan F
		{
			ID:         2,
			Event:      2,
			Order:      1,
			Competitor: 2,
			FinalScore: "",
			Duration:   "",
		},
		{
			ID:         3,
			Event:      2,
			Order:      2,
			Competitor: 3,
			FinalScore: "",
			Duration:   "",
		},
		{
			ID:         1,
			Event:      2,
			Order:      3,
			Competitor: 1,
			FinalScore: "",
			Duration:   "",
		},
		// Changquan M
		{
			ID:         4,
			Event:      1,
			Order:      1,
			Competitor: 4,
			FinalScore: "",
			Duration:   "",
		},
	}
	scores      = make([]*Score, 0, 10)
	adjustments = make([]*Adjustment, 0, 10)
)
