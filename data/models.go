package data

import "time"

/*
 * DATABASE MODELS
 */
type User struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password []byte `json:"password"`
}

// Session is an authenticated web session
type Session struct {
	Key       string //username+sessionID
	Username  string
	SessionID string
	CSRFToken string
	Valid     bool
	Expires   time.Time
	When      time.Time
	IPAddress string
	UserAgent string

	User *User // cached user struct, to prevent repeated DB lookups
}

// Ring represents a competition field of play
type Ring struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Competitor struct {
	ID         int        `json:"id"`
	Bib        string     `json:"bib"`
	FirstName  string     `json:"first_name"`
	LastName   string     `json:"last_name"`
	Gender     Gender     `json:"gender_id"`
	Experience Experience `json:"experience_id"`
	AgeGroup   AgeGroup   `json:"age_group_id"`
	Team       string     `json:"team"`
	Email      string     `json:"email"`
}

type Event struct {
	ID         int        `json:"id"`
	Ring       int        `json:"ring_id"`
	Name       string     `json:"name"`
	Order      int        `json:"event_order"`
	Gender     Gender     `json:"gender_id"`
	Experience Experience `json:"experience_id"`
	AgeGroup   AgeGroup   `json:"age_group_id"`
	Ruleset    Ruleset    `json:"ruleset_id"`
	Style      Style      `json:"style"` // TODO: Consider enumerating all event types
}

// Routine describes the performance of a competitor in a event
type Routine struct {
	ID         int       `json:"id"`
	Event      int       `json:"event_id"`
	Competitor int       `json:"competitor_id"`
	Order      int       `json:"event_order"`
	StartTime  time.Time `json:"start_time"`
	Duration   string    `json:"duration"`
	FinalScore string    `json:"final_score"`
	TotalScore string    `json:"total_score"`

	Scores      []*Score      `json:"scores"`
	Adjustments []*Adjustment `json:"adjustments"`
}

// Score is a single score given by a judge for an event
type Score struct {
	ID      int     `json:"id"`
	Routine int     `json:"routine_id"`
	Judge   string  `json:"judge_tag"`
	Score   float64 `json:"score"`
}

// Adjustment is a score change (typically a deduction)
// at the direction of the head judge
type Adjustment struct {
	ID      int     `json:"id"`
	Routine int     `json:"routine_id"`
	Judge   string  `json:"judge_tag"`
	Amount  float64 `json:"amount"`
	Reason  string  `json:"reason"`
}

type DeductionCode struct {
	Code  string  `json:"code"`
	Value float64 `json:"value"`
	Name  string  `json:"name"`
	//	ShortName string  `json:"short"`
}

type NanduCode struct {
	Code  string  `json:"code"`
	Value float64 `json:"value"`
	Name  string  `json:"name"`
	//	ShortName string  `json:"short"`
}

// DeductionMark is a single deduction given by a judge for an event
type DeductionMark struct {
	ID        int    `json:"id"`
	Routine   int    `json:"routine_id"`
	Judge     string `json:"judge_tag"`
	Code      string `json:"code"`
	Timestamp int64  `json:"timestamp"`
}

// Nandu is a single mark given by a judge for an event
type Nandu struct {
	ID      int       `json:"id"`
	Judge   string    `json:"judge_tag"`
	Code    NanduCode `json:"code"`
	Index   int       `json:"index"`
	Success bool      `json:"success"`
}
