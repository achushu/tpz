//go:build pg || !nodb
// +build pg !nodb

package data

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/achushu/libs/out"
	"github.com/achushu/libs/types"
	"github.com/achushu/tpz/errors"

	// Import the PostgreSQL drivers
	_ "github.com/lib/pq"
)

const pqTimeFormat = "2006-01-02 15:04:05"

// Connect establishes a new PostgreSQL connection
func Connect(cfg *Config) error {
	var err error

	if !cfg.Enabled {
		return errors.ErrNotEnabled
	}

	url := fmt.Sprintf(
		"postgres://%s:%s@%s/%s",
		cfg.Username,
		cfg.Password,
		cfg.Host,
		cfg.Database,
	)
	db, err = sql.Open("postgres", url)
	if err != nil {
		return errors.AuthenticationError(err)
	}
	err = db.Ping()
	if err != nil {
		out.Debugln("connection params: ", url)
		return errors.ConnectionError(err)
	}
	out.Debugln("connected to database")
	return nil
}

// GetUser queries the database for the user with the given username
func GetUser(username string) (*User, error) {
	stmt := "SELECT * FROM users WHERE name = $1"
	values := []interface{}{username}
	if res, err := Query(stmt, values); err == nil {
		if len(res) > 0 {
			user := res[0]
			return &User{
				ID:       types.AssertInt(user["id"]),
				Name:     types.AssertString(user["name"]),
				Password: []byte(types.AssertString(user["password"])),
			}, nil
		}
	}
	return nil, errors.ErrNotFound
}

// CreateUser saves the given credentials in the database
func CreateUser(username string, password []byte) error {
	// TODO: Check for existing username
	stmt := "INSERT INTO users (name, password) VALUES ($1, $2)"
	values := []interface{}{username, password}
	_, err := Query(stmt, values)
	return err
}

func CreateWebSession(key string, username string, created, expires time.Time) error {
	stmt := "INSERT INTO sessions (key, username, created, expires) VALUES ($1, $2, $3, $4)"
	values := []interface{}{key, username, created, expires}
	_, err := Query(stmt, values)
	return err
}

func GetWebSession(key string) (*Session, error) {
	stmt := "SELECT * FROM sessions WHERE key = $1"
	values := []interface{}{key}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, errors.ErrNotFound
	}
	created, ok := res[0]["created"].(time.Time)
	if !ok {
		return nil, errors.NewTypeCastError("created", "time")
	}
	expires, ok := res[0]["expires"].(time.Time)
	if !ok {
		return nil, errors.NewTypeCastError("expires", "time")
	}
	return &Session{
		Key:      key,
		Username: types.AssertString(res[0]["username"]),
		When:     created,
		Expires:  expires,
	}, nil
}

// GetRings returns a list of all the available rings
func GetRings() ([]*Ring, error) {
	stmt := "SELECT * FROM rings"
	values := []interface{}{}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	list := make([]*Ring, len(res))
	for i, v := range res {
		list[i] = &Ring{
			ID:   types.AssertInt(v["id"]),
			Name: types.AssertString(v["name"]),
		}
	}
	return list, nil
}

func GetRulesets() ([]map[string]interface{}, error) {
	stmt := "SELECT * FROM rulesets"
	values := []interface{}{}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	list := make([]map[string]interface{}, len(res))
	for i, v := range res {
		list[i] = map[string]interface{}{
			"id":   types.AssertInt(v["id"]),
			"name": types.AssertString(v["name"]),
		}
	}
	return list, nil
}

func constructCompetitor(v map[string]interface{}) *Competitor {
	return &Competitor{
		ID:         types.AssertInt(v["id"]),
		Bib:        types.AssertString(v["bib"]),
		FirstName:  types.AssertString(v["first_name"]),
		LastName:   types.AssertString(v["last_name"]),
		Gender:     MapToGender(types.AssertInt(v["gender_id"])),
		Experience: MapToExperience(types.AssertInt(v["experience_id"])),
		AgeGroup:   MapToAgeGroup(types.AssertInt(v["age_group_id"])),
		Team:       types.AssertString(v["team"]),
	}
}

func GetCompetitors() ([]*Competitor, error) {
	stmt := "SELECT * FROM competitors ORDER BY first_name"
	values := []interface{}{}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	list := make([]*Competitor, len(res))
	for i, v := range res {
		list[i] = constructCompetitor(v)
	}
	return list, nil
}

func GetCompetitorByID(id int) (*Competitor, error) {
	stmt := "SELECT * FROM competitors WHERE id = $1 LIMIT 1"
	values := []interface{}{id}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, errors.ErrNotFound
	}
	return constructCompetitor(res[0]), nil
}

// GetCompetitorsInEvent returns the athletes competing in this event
// *sorted by turn order*
func GetCompetitorsInEvent(eventID int) ([]*Competitor, error) {
	stmt := "SELECT c.*, ec.competitor_id FROM competitors AS c INNER JOIN " +
		"routines AS ec ON c.id = ec.competitor_id " +
		"WHERE ec.event_id = $1 ORDER BY ec.event_order"
	values := []interface{}{eventID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	list := make([]*Competitor, len(res))
	for i, v := range res {
		list[i] = constructCompetitor(v)
	}
	return list, nil
}

func GetNthCompetitorInEvent(n, eventID int) (*Competitor, error) {
	stmt := "SELECT c.*, ec.competitor_id FROM competitors AS c INNER JOIN " +
		"routines AS ec ON c.id = ec.competitor_id " +
		"WHERE ec.event_order = $1 AND ec.event_id = $2"
	values := []interface{}{n, eventID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, errors.ErrNotFound
	}
	return constructCompetitor(res[0]), nil
}

func constructEvent(v map[string]interface{}) *Event {
	return &Event{
		ID:         types.AssertInt(v["id"]),
		Ring:       types.AssertInt(v["ring_id"]),
		Name:       types.AssertString(v["name"]),
		Order:      types.AssertInt(v["event_order"]),
		Gender:     MapToGender(types.AssertInt(v["gender_id"])),
		Experience: MapToExperience(types.AssertInt(v["experience_id"])),
		AgeGroup:   MapToAgeGroup(types.AssertInt(v["age_group_id"])),
		Ruleset:    MapToRuleset(types.AssertInt(v["ruleset_id"])),
		Style:      Style(types.AssertInt(v["style"])),
	}
}

func queryEvents(stmt string, values []interface{}) ([]*Event, error) {
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	list := make([]*Event, len(res))
	for i, v := range res {
		list[i] = constructEvent(v)
	}
	return list, nil
}

func GetEvents() ([]*Event, error) {
	stmt := "SELECT * FROM events ORDER BY name"
	values := []interface{}{}
	return queryEvents(stmt, values)
}

func GetEventByID(id int) (*Event, error) {
	stmt := "SELECT e.*, r.name AS rules FROM events AS e INNER JOIN " +
		"rulesets AS r ON e.ruleset_id = r.id WHERE e.id = $1"
	values := []interface{}{id}
	res, err := queryEvents(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, errors.ErrNotFound
	}
	return res[0], nil
}

func GetEventsByCompetitor(competitorID int) ([]*Event, error) {
	stmt := "SELECT ev.* FROM routines AS ec INNER JOIN " +
		"events AS ev ON ec.event_id = ev.id WHERE competitor_id = $1"
	values := []interface{}{competitorID}
	return queryEvents(stmt, values)
}

func GetEventsInRing(ringID int) ([]*Event, error) {
	stmt := "SELECT * FROM events WHERE ring_id = $1 ORDER BY event_order"
	values := []interface{}{ringID}
	return queryEvents(stmt, values)
}

func GetNthEventInRing(n, ringID int) (*Event, error) {
	stmt := "SELECT * FROM events WHERE event_order = $1 AND ring_id = $2"
	values := []interface{}{n, ringID}
	res, err := queryEvents(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, errors.ErrNotFound
	}
	return res[0], nil
}

func constructRoutine(v map[string]interface{}) *Routine {
	return &Routine{
		ID:         types.AssertInt(v["id"]),
		Event:      types.AssertInt(v["event_id"]),
		Competitor: types.AssertInt(v["competitor_id"]),
		Order:      types.AssertInt(v["event_order"]),
	}
}

func GetRoutine(eventID, competitorID int) (*Routine, error) {
	stmt := "SELECT * FROM routines WHERE event_id = $1 AND competitor_id = $2"
	values := []interface{}{eventID, competitorID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, errors.ErrNotFound
	}
	return constructRoutine(res[0]), nil
}

func saveScore(score float64, routineID int, judgeTag string) (err error) {
	stmt := "INSERT INTO scores (routine_id, judge_tag, score) VALUES ($1, $2, $3)"
	values := []interface{}{routineID, judgeTag, score}
	_, err = Query(stmt, values)
	return err
}

func SaveFinalScore(score, total string, elapsed string, eventID, competitorID int) (err error) {
	stmt := "UPDATE routines SET final_score = $1, total_score = $2, duration = $3 WHERE event_id = $4 AND competitor_id = $5"
	values := []interface{}{score, total, elapsed, eventID, competitorID}
	_, err = Query(stmt, values)
	return err
}

func GetFinalScore(eventID, competitorID int) (string, error) {
	stmt := "SELECT final_score FROM routines WHERE event_id = $1 AND competitor_id = $2"
	values := []interface{}{eventID, competitorID}
	res, err := Query(stmt, values)
	if err != nil {
		return "", err
	}
	if len(res) == 0 {
		return "", errors.ErrNotFound
	}
	sBytes := types.AssertByteSlice(res[0]["final_score"])
	return string(sBytes), nil
}

func SaveAdjustment(amount float64, reason string, routineID int, judgeTag string) (err error) {
	stmt := "INSERT INTO adjustments (routine_id, judge_tag, amount, reason) VALUES ($1, $2, $3, $4)"
	values := []interface{}{routineID, judgeTag, amount, reason}
	_, err = Query(stmt, values)
	return err
}

func constructDeductionMark(v map[string]interface{}) *DeductionMark {
	return &DeductionMark{
		ID:        types.AssertInt(v["id"]),
		Routine:   types.AssertInt(v["routine_id"]),
		Judge:     types.AssertString(v["judge_tag"]),
		Code:      types.AssertString(v["code"]),
		Timestamp: int64(types.AssertInt(v["ts"])),
	}
}

func SaveDeductionMark(dm *DeductionMark) (err error) {
	stmt := "INSERT INTO deductions (id, routine_id, code, judge_tag, ts) VALUES ($1, $2, $3, $4, $5)"
	values := []interface{}{dm.ID, dm.Routine, dm.Code, dm.Judge, dm.Timestamp}
	_, err = Query(stmt, values)
	return err
}

func UpdateDeductionMark(id int, code string) (err error) {
	stmt := "UPDATE deductions SET code = $2 WHERE id = $1"
	values := []interface{}{id, code}
	_, err = Query(stmt, values)
	return err
}

func RemoveDeductionMark(id int) (err error) {
	stmt := "DELETE FROM deductions WHERE id = $1"
	values := []interface{}{id}
	_, err = Query(stmt, values)
	return err
}

func GetDeductions(routineID int) ([]*DeductionMark, error) {
	stmt := "SELECT * FROM deductions WHERE routine_id = $1"
	values := []interface{}{routineID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	list := make([]*DeductionMark, len(res))
	for i, v := range res {
		list[i] = constructDeductionMark(v)
	}
	return list, nil
}

func GetNandusheet(routineID int) (*Nandusheet, error) {
	stmt := "SELECT * FROM nandu_sheets WHERE routine_id = $1"
	values := []interface{}{routineID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, errors.ErrNotFound
	}
	v := res[0]
	return &Nandusheet{
		Segment1: types.AssertString(v["segment1"]),
		Segment2: types.AssertString(v["segment2"]),
		Segment3: types.AssertString(v["segment3"]),
		Segment4: types.AssertString(v["segment4"]),
	}, nil
}

func SaveNanduScore(routineID int, judgeID string, result string) (err error) {
	stmt := "INSERT INTO nandu_results (routine_id, judge_tag, result) VALUES ($1, $2, $3)"
	values := []interface{}{routineID, judgeID, result}
	_, err = Query(stmt, values)
	return err
}

func GetNanduResults(routineID int) (map[string]string, error) {
	stmt := "SELECT * FROM nandu_results WHERE routine_id = $1"
	values := []interface{}{routineID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, nil
	}
	nandu := make(map[string]string)
	for _, v := range res {
		judge := types.AssertString(v["judge_tag"])
		scores := types.AssertString(v["result"])
		nandu[judge] = scores
	}
	return nandu, nil
}

func constructScore(v map[string]interface{}) (*Score, error) {
	scoreStr := string(types.AssertByteSlice(v["score"]))
	score, err := types.ParseFloat64(scoreStr)
	if err != nil {
		return nil, err
	}
	return &Score{
		ID:      types.AssertInt(v["id"]),
		Routine: types.AssertInt(v["routine_id"]),
		Judge:   types.AssertString(v["judge_tag"]),
		Score:   score,
	}, nil
}

func GetScores(routineID int) (map[string]*Score, error) {
	stmt := "SELECT * FROM scores WHERE routine_id = $1"
	values := []interface{}{routineID}
	scores := make(map[string]*Score)
	res, err := Query(stmt, values)
	for _, row := range res {
		score, err := constructScore(row)
		if err != nil {
			return nil, err
		}
		scores[score.Judge] = score
	}

	return scores, err
}

func DeleteScore(id int) (err error) {
	stmt := "DELETE FROM score WHERE id = $1"
	values := []interface{}{id}
	_, err = Query(stmt, values)
	return err
}

func GetAdjustments(routineID int) ([]*Adjustment, error) {
	stmt := "SELECT * FROM adjustments WHERE routine_id = $1"
	values := []interface{}{routineID}
	adjs := make([]*Adjustment, 0)
	res, err := Query(stmt, values)
	for _, row := range res {
		aBytes := types.AssertByteSlice(row["amount"])
		amt, err := types.ParseFloat64(string(aBytes))
		if err != nil {
			return adjs, err
		}
		adj := &Adjustment{
			ID:      types.AssertInt(row["id"]),
			Routine: types.AssertInt(row["routine_id"]),
			Judge:   types.AssertString(row["judge_tag"]),
			Amount:  amt,
			Reason:  types.AssertString(row["reason"]),
		}
		adjs = append(adjs, adj)
	}
	return adjs, err
}

func GetAllRankings() ([]map[string]interface{}, error) {
	stmt := "SELECT e.id AS eid, c.id AS cid, ec.id AS rid, e.name, c.first_name, c.last_name, ec.final_score, ec.total_score " +
		"FROM routines AS ec INNER JOIN events AS e ON e.id=ec.event_id " +
		"INNER JOIN competitors AS c ON c.id=ec.competitor_id " +
		"ORDER BY e.id ASC, final_score DESC, total_score DESC"
	values := []interface{}{}
	return Query(stmt, values)
}

// GetEventRanks returns rows of distinct final_score, total_score combinations
// and the placement (rank) for those scores
func GetEventRanks(eventID int) ([]map[string]interface{}, error) {
	stmt := "WITH scores AS " +
		"(SELECT DISTINCT final_score, total_score FROM routines WHERE event_id = $1 " +
		"ORDER BY final_score DESC, total_score DESC) " +
		"SELECT final_score, total_score, ROW_NUMBER () OVER " +
		"(ORDER BY final_score DESC) AS rank FROM scores"
	values := []interface{}{eventID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	ranks := make([]map[string]interface{}, len(res))
	for i, row := range res {
		r := map[string]interface{}{
			"final_score": string(types.AssertByteSlice(row["final_score"])),
			"total_score": string(types.AssertByteSlice(row["total_score"])),
			"rank":        row["rank"],
		}
		ranks[i] = r
	}
	return ranks, nil
}

// GetSimpleRanks gets the final score and placement without the total score as a tiebreaker
func GetSimpleRanks(eventID int) ([]map[string]interface{}, error) {
	stmt := "WITH scores AS " +
		"(SELECT DISTINCT final_score FROM routines WHERE event_id = $1 " +
		"ORDER BY final_score DESC) " +
		"SELECT final_score, ROW_NUMBER () OVER " +
		"(ORDER BY final_score DESC) AS rank FROM scores"
	values := []interface{}{eventID}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	ranks := make([]map[string]interface{}, len(res))
	for i, row := range res {
		r := map[string]interface{}{
			"final_score": string(types.AssertByteSlice(row["final_score"])),
			"rank":        row["rank"],
		}
		ranks[i] = r
	}
	return ranks, nil
}

func FindAllAroundWinner() ([]string, error) {
	// Get the counts of events competitors signed up for
	stmt := "SELECT competitor_id, COUNT(event_id) AS ecount " +
		"FROM routines GROUP BY competitor_id ORDER BY COUNT(event_id) DESC"
	values := []interface{}{}
	res, err := Query(stmt, values)
	if err != nil {
		return nil, err
	}
	eligible := make([]string, 0, 55)
	for _, comp := range res {
		if types.AssertInt(comp["ecount"]) >= 3 {
			id := types.AssertInt(comp["competitor_id"])
			// Get their name
			nquery := "SELECT first_name, last_name FROM competitors WHERE id = $1"
			nvalues := []interface{}{id}
			name, err := Query(nquery, nvalues)
			if err != nil {
				return nil, err
			}
			fname := types.AssertString(name[0]["first_name"])
			lname := types.AssertString(name[0]["last_name"])
			total, err := GetTopScores(id)
			if err != nil {
				return nil, err
			}
			entry := fmt.Sprintf("%d,%s,%s,%f", id, fname, lname, total)
			eligible = append(eligible, entry)
		} else {
			break
		}
	}
	return eligible, nil
}

func GetTopScores(competitorID int) (float64, error) {
	stmt := "SELECT final_score FROM routines WHERE competitor_id = $1 ORDER BY final_score LIMIT 3"
	values := []interface{}{competitorID}
	scores := make([]float64, 0, 3)
	err := QueryWithRowScan(stmt, values, func(rows *sql.Rows) error {
		var err error
		for rows.Next() {
			var x float64
			err = rows.Scan(&x)
			scores = append(scores, x)
		}
		return err
	})
	if err != nil {
		return 0, err
	}
	sum := 0.00
	for _, v := range scores {
		sum += v
	}
	return sum, nil
}

func AddCompetitorToEvent(competitorID, eventID int) (err error) {
	// Figure out how many competitors are already in the event
	orderStmt := "SELECT event_order FROM routines WHERE event_id = $1 ORDER BY event_order DESC LIMIT 1"
	orderValues := []interface{}{eventID}
	orderResults, err := Query(orderStmt, orderValues)
	if err != nil {
		return err
	}
	newOrder := 1
	if len(orderResults) > 0 {
		newOrder = types.AssertInt(orderResults[0]["event_order"]) + 1
	}
	stmt := "INSERT INTO routines (event_id, event_order, competitor_id) VALUES ($1, $2, $3)"
	values := []interface{}{eventID, newOrder, competitorID}
	_, err = Query(stmt, values)
	return err
}

func RemoveCompetitorFromEvent(competitorID, eventID int) (err error) {
	stmt := "DELETE FROM routines WHERE competitor_id = $1 AND event_id = $2"
	values := []interface{}{competitorID, eventID}
	_, err = Query(stmt, values)
	return err
}

func ChangeEventRing(ringID, eventID int) (err error) {
	stmt := "UPDATE events SET ring_id = $1 WHERE id = $2"
	values := []interface{}{ringID, eventID}
	_, err = Query(stmt, values)
	return err
}

func ChangeEventRules(eventID, rulesetID int) (err error) {
	stmt := "UPDATE events SET ruleset_id = $1 WHERE id = $2"
	values := []interface{}{rulesetID, eventID}
	_, err = Query(stmt, values)
	return err
}

// Query executes the given statement with the values and returns a slice of values per row
func Query(query string, values []interface{}) ([]map[string]interface{}, error) {
	var (
		rows *sql.Rows
		err  error
	)
	rows, err = db.Query(query, values...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	results := make([]map[string]interface{}, 0)
	colNames, err := rows.Columns()
	numColumns := len(colNames)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		rowResults := make([]interface{}, numColumns)
		resultPtrs := make([]interface{}, numColumns)
		for i := range rowResults {
			resultPtrs[i] = &rowResults[i]
		}
		err = rows.Scan(resultPtrs...)
		if err != nil {
			return nil, err
		}
		m := make(map[string]interface{})
		for i, col := range colNames {
			m[col] = rowResults[i]
		}
		results = append(results, m)
	}
	return results, nil
}

// QueryWithRowScan executes the given statement with the values
// and calls the provided rowScanner to process the results
func QueryWithRowScan(query string, values []interface{}, rowScanner func(*sql.Rows) error) error {
	var (
		rows *sql.Rows
		err  error
	)
	rows, err = db.Query(query, values...)
	if err != nil {
		return err
	}
	defer rows.Close()
	return rowScanner(rows)
}

// Delete executes a delete statement
func Delete(query string, values []interface{}) error {
	_, err := db.Exec(query, values...)
	return err
}

// FormatTimestamp takes a Time object and returns a datetime string formatted for PostgreSQL
func FormatTimestamp(timestamp time.Time) string {
	return timestamp.Format(pqTimeFormat)
}

func MapToGender(dbID int) Gender {
	// pg is 1-indexed
	x := dbID - 1
	return Gender(x)
}

func MapToExperience(dbID int) Experience {
	// pg is 1-indexed
	x := dbID - 1
	return Experience(x)
}

func MapToAgeGroup(dbID int) AgeGroup {
	// pg is 1-indexed
	x := dbID - 1
	return AgeGroup(x)
}

func MapToRuleset(dbID int) Ruleset {
	// pg is 1-indexed
	x := dbID - 1
	return Ruleset(x)
}
