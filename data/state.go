package data

import (
	"sync"
	"time"

	"github.com/achushu/libs/out"
)

// Competition state
type State struct {
	Rings []*RingState
}

type Judge struct {
	UserID int
	ConnID string
	Tag    string
}

type Listener struct {
	ID     int
	ConnID string
	Tag    string
}

type RingState struct {
	*Ring
	Event       *Event
	Competitor  *Competitor
	Routine     *Routine
	StartTime   time.Time
	StopTime    time.Time
	Scores      map[string]float64
	adjustments []Adjustment
	RuleName    string

	headJudge *Judge
	judges    []*Judge
	listeners []*Listener
	mu        sync.RWMutex
}

var (
	state          State
	ClientSettings = make(map[string]string)
)

func init() {
	state = NewState()
}

func NewState() State {
	return State{
		Rings: make([]*RingState, 0, 3),
	}
}

func ClearState() {
	state = NewState()
}

func AddRing(ring *Ring) {
	state.Rings = append(state.Rings, &RingState{
		Ring:      ring,
		judges:    make([]*Judge, 0, 10),
		listeners: make([]*Listener, 0, 2),
		Scores:    make(map[string]float64),
	})
}

func GetRing(ringID int) *RingState {
	for _, v := range state.Rings {
		if v.ID == ringID {
			return v
		}
	}
	return nil
}

// ReadDone signifies that the caller has finished reading the connections.
// Must be called after EACH call of ring.Judges(), ring.Listeners()
func (r *RingState) ReadDone() {
	r.mu.RUnlock()
}

func (r *RingState) AddJudge(connID, tag string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.judges = append(r.judges, &Judge{
		ConnID: connID,
		Tag:    tag,
	})
	return true
}

func (r *RingState) RemoveJudge(connID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, j := range r.judges {
		if j.ConnID == connID {
			r.judges = append(r.judges[:i], r.judges[i+1:]...)
			return true
		}
	}
	return false
}

// Judges returns a list of connected judges. NOTE: CALLER MUST CALL ring.ReadDone() WHEN FINISHED!
func (r *RingState) Judges() []*Judge {
	r.mu.RLock()
	return r.judges
}

func (r *RingState) AddListener(connID, tag string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.listeners = append(r.listeners, &Listener{
		ConnID: connID,
		Tag:    tag,
	})
	return true
}

func (r *RingState) RemoveListener(connID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, l := range r.listeners {
		if l.ConnID == connID {
			r.listeners = append(r.listeners[:i], r.listeners[i+1:]...)
			return true
		}
	}
	return false
}

// Listeners returns a list of connected listeners. NOTE: CALLER MUST CALL ring.ReadDone() WHEN FINISHED!
func (r *RingState) Listeners() []*Listener {
	r.mu.RLock()
	return r.listeners
}

func (r *RingState) SetHeadJudge(connID, tag string) bool {
	out.Println("data/state - ", connID, " is the head judge of ", r.Name)
	r.headJudge = &Judge{
		ConnID: connID,
		Tag:    tag,
	}
	return true
}

func (r *RingState) HeadJudge() *Judge {
	return r.headJudge
}

func (r *RingState) SetEvent(newEvent *Event) {
	r.Event = newEvent
	r.RuleName = newEvent.Ruleset.String()
	out.Printf("data/state - "+"ring %d set event %s\n", r.ID, r.Event.Name)
}

func (r *RingState) SetCompetitor(newComp *Competitor, event *Event) {
	r.Competitor = newComp
	out.Printf("data/state - "+"ring %d set competitor %s %s\n", r.ID, r.Competitor.FirstName, r.Competitor.LastName)
	if r.Event == nil {
		r.SetEvent(event)
	}
	routine, err := GetRoutine(r.Event.ID, r.Competitor.ID)
	if err != nil {
		out.Errorf("data/state - could not find routine for competitor %d\n", r.Competitor.ID)
		return
	}
	// Reset the state
	r.Scores = make(map[string]float64)
	r.adjustments = make([]Adjustment, 0)
	r.Routine = routine

	// get any saved state
	if scores, err := GetScores(routine.ID); err == nil {
		r.Scores = scores
	} else {
		out.Errorf("error retrieving scores for competitor %d: %s\n", r.Competitor.ID, err)
	}
	if adjs, err := GetAdjustments(routine.ID); err == nil {
		r.adjustments = adjs
	} else {
		out.Errorf("error retrieving adjustments for competitor %d: %s\n", r.Competitor.ID, err)
	}
}

func (r *RingState) SetEventStart(startTime time.Time) {
	r.StartTime = startTime
	out.Debugln("data/state - ", "ring ", r.ID, " starting event")
}

func (r *RingState) SetEventStop(stopTime time.Time) {
	r.StopTime = stopTime
	out.Debugln("data/state - ", "ring ", r.ID, " event stopped")
}

func (r *RingState) SetPerformanceScore(judgeTag string, score float64) {
	r.Scores[judgeTag] = score
}

func (r *RingState) PerformanceScores() []float64 {
	scores := make([]float64, 0, len(r.Scores))
	for _, v := range r.Scores {
		scores = append(scores, v)
	}
	return scores
}

func (r *RingState) SetAdjustment(judgeTag string, amount float64, reason string) {
	adj := Adjustment{
		Judge:  judgeTag,
		Amount: amount,
		Reason: reason,
	}
	r.adjustments = append(r.adjustments, adj)
}

func (r *RingState) Adjustments() []Adjustment {
	return r.adjustments
}

func (r *RingState) Duration() time.Duration {
	if r.StartTime.IsZero() {
		return 0
	}
	if r.StopTime.IsZero() {
		return time.Since(r.StartTime)
	}
	return r.StopTime.Sub(r.StartTime)
}
