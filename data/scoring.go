package data

import (
	"fmt"

	"github.com/achushu/libs/out"
	"github.com/achushu/libs/types"
	"github.com/achushu/tpz/errors"
)

// CalculateScore returns the final score and the score components as a map[string]float64
func (r *RingState) CalculateScore() (result float64, components map[string]float64) {
	if r.Event == nil {
		out.Errorln("state/scoring - ", "no event set in ring ", r.ID)
		return
	}
	rules := r.Event.Ruleset
	switch rules {
	case USWU:
		scores := r.PerformanceScores()
		result = AdjustedAverage(scores)
	}
	adjs := r.Adjustments()
	for _, a := range adjs {
		result -= a.Amount
	}
	return result, components
}

func (r *RingState) FinalizeScore() error {
	cID := r.Competitor.ID
	eID := r.Event.ID

	calculatedScore, _ := r.CalculateScore()
	finalScore := FormatScore(calculatedScore)
	adjs := r.Adjustments()
	scores := r.PerformanceScores()
	scoreTotal := 0.0
	for _, s := range scores {
		scoreTotal += s
	}
	for _, a := range adjs {
		scoreTotal -= a.Amount

	}

	duration := r.Duration()
	mins := int(duration.Minutes())
	secs := int(duration.Seconds()) - (mins * 60)
	elapsed := fmt.Sprintf("%d:%02d", mins, secs)
	return SaveFinalScore(finalScore, FormatScore(scoreTotal), elapsed, eID, cID)
}

func AdjustedAverage(scores []float64) float64 {
	count := len(scores)
	if count == 0 {
		return 0
	}
	var (
		sum float64
		min = scores[0]
		max = scores[0]
	)
	for _, v := range scores {
		sum += v
		if v < min {
			min = v
		} else if v > max {
			max = v
		}
	}
	if count < 4 {
		return types.RoundFloat(sum/float64(count), 0.001)
	} else {
		return types.RoundFloat((sum-min-max)/float64(count-2), 0.001)
	}
}

func SaveScore(score float64, ringID int, judgeID string) error {
	ring := GetRing(ringID)
	if ring == nil {
		return errors.NewRingError(ringID)
	}

	if err := saveScore(FormatScore(score), ring.Routine.ID, judgeID); err != nil {
		return err
	}

	// cache the score
	ring.SetPerformanceScore(judgeID, score)
	return nil
}
func FormatScore(score float64) string {
	format := "%.2f"
	return fmt.Sprintf(format, score)
}

func SaveAdjustment(amount float64, reason string, ringID int, judgeTag string) error {
	ring := GetRing(ringID)
	if ring == nil {
		return errors.NewRingError(ringID)
	}

	if err := saveAdjustment(amount, reason, ring.Routine.ID, judgeTag); err != nil {
		return err
	}

	// cache the adjustment
	ring.SetAdjustment(judgeTag, amount, reason)
	return nil
}
