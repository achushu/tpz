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
	adjs := r.Adjustments
	for _, a := range adjs {
		result -= a.Amount
	}
	return result, components
}

func (r *RingState) FinalizeScore() error {
	cID := r.Competitor.ID
	eID := r.Event.ID
	rID := r.Routine.ID

	calculatedScore, _ := r.CalculateScore()
	finalScore := FormatScore(calculatedScore)
	adjs, err := GetAdjustments(rID)
	if err != nil {
		return err
	}
	scores := r.PerformanceScores()
	scoreTotal := 0.0
	for _, s := range scores {
		scoreTotal += s.Score
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

func AdjustedAverage(scores []*Score) float64 {
	count := len(scores)
	if count == 0 {
		return 0
	}
	var (
		sum float64
		min = scores[0].Score
		max = scores[0].Score
	)
	for _, v := range scores {
		s := v.Score
		sum += s
		if s < min {
			min = s
		} else if s > max {
			max = s
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

	if err := saveScore(score, ring.Routine.ID, judgeID); err != nil {
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

type DeductionResult struct {
	*DeductionMark
	Applied bool
}

var deductionWindow = int64(1000 * 3) // 3 second window
func DetermineDeductions(deductions map[string][]*DeductionMark) map[string][]DeductionResult {
	var (
		res = make(map[string][]DeductionResult)
	)
	// Need to clone the values here so that the original objects aren't destroyed
	allDeductions := make([][]*DeductionMark, 0, 3)
	for _, d := range deductions {
		dList := make([]*DeductionMark, len(d))
		copy(dList, d)
		allDeductions = append(allDeductions, dList)
	}
	// TODO: Sort the deduction arrays by timestamp first
	// (should already be chronological but can't be too safe)
	count := deductionsRemaining(allDeductions)
	for count > 0 {
		matches, match := matchEarliestDeduction(allDeductions)
		dres := false
		if match {
			dres = true
			d := matches[0]
			if res["result"] == nil {
				res["result"] = make([]DeductionResult, 0, 1)
			}
			res["result"] = append(res["result"], DeductionResult{d, dres})
			out.Debugf("match found: %s\n", d.Code)
		}
		for _, d := range matches {
			res[d.Judge] = append(res[d.Judge], DeductionResult{d, dres})
		}
		count = deductionsRemaining(allDeductions)
	}

	return res
}

func deductionsRemaining(deductions [][]*DeductionMark) int {
	count := 0
	for _, dl := range deductions {
		count += len(dl)
	}
	return count
}

// Finds matches for the deduction with the earliest timestamp. Returns the matched deductions
// and whether a match was found. It and all deductions matched are
// removed from the given list.
func matchEarliestDeduction(deductions [][]*DeductionMark) ([]*DeductionMark, bool) {
	var (
		matched  = false
		earliest *DeductionMark
		judgeIdx = -1
		res      = make([]*DeductionMark, 0, 3)
	)
	// this assumes the deductions are sorted in ascending time order
	// find the earliest remaining deduction
	for i, dList := range deductions {
		if len(dList) == 0 {
			continue
		}
		if judgeIdx == -1 {
			earliest = dList[0]
			judgeIdx = i
		} else {
			if dList[0].Timestamp < earliest.Timestamp {
				earliest = dList[0]
				judgeIdx = i
			}
		}
	}
	// remove that deduction
	if len(deductions[judgeIdx]) > 0 {
		res = append(res, deductions[judgeIdx][0])
		deductions[judgeIdx] = deductions[judgeIdx][1:]
	}

	cutoffTime := earliest.Timestamp + deductionWindow
	// compare the deduction to the other judges' lists
	for i, dList := range deductions {
		if i == judgeIdx {
			// skip our benchmark judge
			continue
		}
		for j, d := range dList {
			// check that the timestamp is within range
			if (d.Timestamp < cutoffTime) &&
				d.Code == earliest.Code {
				// we have a match
				matched = true
				// remove it
				deductions[i] = append(dList[:j], dList[j+1:]...)
				res = append(res, dList[j])
				// move on to the next judge
				break
			} else if d.Timestamp > cutoffTime {
				// no matches, move on to the next judge
				break
			}
		}
	}
	return res, matched
}
