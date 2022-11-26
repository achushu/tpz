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
	Scores      map[string]*Score
	Adjustments []*Adjustment
	Deductions  map[string][]*DeductionMark
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
		Scores:    make(map[string]*Score),
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
	r.Scores = make(map[string]*Score)
	r.Adjustments = make([]*Adjustment, 0)
	r.Deductions = make(map[string][]*DeductionMark)
	r.Routine = routine

	// get any saved state
	if scores, err := GetScores(routine.ID); err == nil {
		r.Scores = scores
	} else {
		out.Errorf("error retrieving scores for competitor %d: %s\n", r.Competitor.ID, err)
	}
	if adjs, err := GetAdjustments(routine.ID); err == nil {
		r.Adjustments = adjs
	} else {
		out.Errorf("error retrieving adjustments for competitor %d: %s\n", r.Competitor.ID, err)
	}
	if deds, err := GetDeductions(routine.ID); err == nil {
		for _, d := range deds {
			j := d.Judge
			jd := r.Deductions[j]
			if jd == nil {
				jd = make([]*DeductionMark, 0)
			}
			jd = append(jd, d)
			r.Deductions[j] = jd
		}
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
	r.Scores[judgeTag] = &Score{
		Routine: r.Routine.ID,
		Judge:   judgeTag,
		Score:   score,
	}
}

func (r *RingState) PerformanceScores() []*Score {
	scores := make([]*Score, 0, len(r.Scores))
	for _, v := range r.Scores {
		scores = append(scores, v)
	}
	return scores
}

func (r *RingState) SetAdjustment(judgeTag string, amount float64, reason string) {
	adj := &Adjustment{
		Routine: r.Routine.ID,
		Judge:   judgeTag,
		Amount:  amount,
		Reason:  reason,
	}
	r.Adjustments = append(r.Adjustments, adj)
}

func (r *RingState) SetDeduction(dm *DeductionMark) {
	judgeTag := dm.Judge
	judgeDeductions := r.Deductions[judgeTag]
	if judgeDeductions == nil {
		judgeDeductions = make([]*DeductionMark, 0)
	}
	judgeDeductions = append(judgeDeductions, dm)
	r.Deductions[judgeTag] = judgeDeductions
}

func (r *RingState) UpdateDeduction(judgeTag string, id int, code string) {
	jd := r.Deductions[judgeTag]
	if jd == nil {
		return
	}
	for _, d := range jd {
		if d.ID == id {
			d.Code = code
		}
	}
}

func (r *RingState) DeleteDeduction(judgeTag string, id int) {
	var idx = -1
	jd := r.Deductions[judgeTag]
	if jd == nil {
		return
	}
	for i, d := range jd {
		if d.ID == id {
			idx = i
			break
		}
	}
	if idx != -1 {
		jd = append(jd[:idx], jd[idx+1:]...)
	}
	r.Deductions[judgeTag] = jd
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
