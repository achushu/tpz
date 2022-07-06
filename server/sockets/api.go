package sockets

import "fmt"

//go:generate stringer -type=Action -linecomment
type Action int

const (
	// Client actions
	AdjustScore      Action = iota // adjust-score
	CalculateScore                 // calculate-score
	ChangeCompetitor               // change-competitor
	ChangeEvent                    // change-event
	FinalizeScore                  // finalize-score
	RegisterDisplay                // register-display
	RegisterJudge                  // register-judge
	StartTimer                     // start-timer
	StopTimer                      // stop-timer
	SubmitDeductions               // submit-deductions
	SubmitNandu                    // submit-nandu
	SubmitScore                    // submit-score

	// Server actions
	ClientInit       // init
	ListCompetitors  // list-competitors
	ListEvents       // list-events
	NotifyCompetitor // notify-competitor
	NotifyEvent      // notify-event
	NotifyFinalScore // notify-final-score
	RingStatus       // ring-status
	RingUpdate       // ring-update
	Score            // score
	StartEvent       // start-event
	StopEvent        // stop-event

	// Error
	InvalidAction // invalid
)

var ErrInvalidAction = fmt.Errorf("invalid API action")

func ToAction(s string) (Action, error) {
	// takes advantage of the auto-generated stringer code
	sLen := len(s)
	for i := 0; i < len(_Action_index)-1; i++ {
		xA := int(_Action_index[i])
		xB := int(_Action_index[i+1])
		if xB-xA == sLen && _Action_name[xA:xB] == s {
			return Action(i), nil
		}
	}
	return InvalidAction, ErrInvalidAction
}
