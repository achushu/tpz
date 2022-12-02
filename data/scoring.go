package data

import (
	"fmt"
	"sort"
	"strings"

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
	case IWUFAB:
		fallthrough
	case IWUF:
		scores := r.PerformanceScores()
		perfScore := AdjustedAverage(scores)
		result += perfScore
		deductions := DetermineDeductions(r.Deductions)["result"]
		techScore := ToTechnicalScore(deductions, r.Event.Style)
		result += techScore
		components = map[string]float64{
			"a": techScore,
			"b": perfScore,
		}
		if rules == IWUF {
			r.NanduResult = DetermineNandu(r.NanduScores)
			difficulty := CalculateDifficulty(r.NanduResult)
			result += difficulty
			components["c"] = difficulty
		}
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
	Applied bool `json:"applied"`
}

// DeductionSheet implements the Sort interface
type DeductionSheet []*DeductionMark

func (t DeductionSheet) Len() int {
	return len(t)
}

func (t DeductionSheet) Less(i, j int) bool {
	a := t[i]
	b := t[j]
	return a.Timestamp < b.Timestamp
}

func (t DeductionSheet) Swap(i, j int) {
	tmp := t[i]
	t[i] = t[j]
	t[j] = tmp
}

var deductionWindow = int64(1000 * 3) // 3 second window
func DetermineDeductions(deductions map[string][]*DeductionMark) map[string][]DeductionResult {
	var (
		res = make(map[string][]DeductionResult)
	)
	res["result"] = make([]DeductionResult, 0)

	// Need to clone the values here so that the original objects aren't destroyed
	allDeductions := make([][]*DeductionMark, 0, 3)
	for k, d := range deductions {
		dList := make([]*DeductionMark, len(d))
		copy(dList, d)
		// sort the deductions by timestamp
		sort.Sort(DeductionSheet(dList))
		allDeductions = append(allDeductions, dList)

		// also copy to results
		res[k] = make([]DeductionResult, 0)
		for _, v := range dList {
			res[k] = append(res[k], DeductionResult{v, false})
		}
	}

	count := deductionsRemaining(allDeductions)
	for count > 0 {
		matches, foundMatch := matchEarliestDeduction(allDeductions)
		if foundMatch {
			match := matches[0]
			res["result"] = append(res["result"], DeductionResult{match, true})

			// mark each judge's deduction as applied
			for _, m := range matches {
				for i, v := range res[m.Judge] {
					if v.ID == m.ID {
						res[m.Judge][i].Applied = true
					}
				}
			}
		}
		count = deductionsRemaining(allDeductions)
	}

	return res
}

func ToTechnicalScore(deductions []DeductionResult, style Style) float64 {
	techScore := 5.0
	for _, v := range deductions {
		d := ToDeduction(v.Code, style)
		techScore -= d.Value
	}
	return techScore
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
				res = append(res, dList[j])
				deductions[i] = append(dList[:j], dList[j+1:]...)
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

func (r *RingState) ParseNanduScores(judgeTag string, results []bool) {
	nandu := make([]Nandu, 0)
	seq := GetNanduSequence(r.Nandusheet, r.Event.Style)
	for i, v := range results {
		n := Nandu{
			Index:   i,
			Success: v,
			Code:    seq[i],
		}
		nandu = append(nandu, n)
	}
	r.NanduScores[judgeTag] = nandu
}

func CalculateDifficulty(nandu []Nandu) float64 {
	const (
		moveCap       = 1.4
		connectionCap = 0.6
	)
	var (
		result         = 0.0
		moveUsed       = 0.0
		connectionUsed = 0.0
	)
	if nandu == nil {
		return 0
	}

	for _, v := range nandu {
		isConn := IsConnection(v.Code.Code)
		value := v.Code.Value
		potential := value
		overlimit := 0.0
		if isConn {
			connectionUsed += value
			overlimit = connectionUsed - connectionCap
		} else {
			moveUsed += value
			overlimit = moveUsed - moveCap
		}
		if overlimit > 0 {
			potential -= overlimit
			if potential < 0 {
				potential = 0
			}
		}
		if v.Success {
			result += potential
		}
		out.Debugf("nandu: %s - success: %t - potential: %f\n", v.Code.Code, v.Success, potential)
	}
	return types.RoundFloat(result, 0.01)
}

func GetNanduSequence(sheet *Nandusheet, style Style) []NanduCode {
	sequence := make([]NanduCode, 0, 16)

	sections := []string{
		sheet.Segment1,
		sheet.Segment2,
		sheet.Segment3,
		sheet.Segment4,
	}
	for _, section := range sections {
		combos := parseNanduString(section)
		for _, combo := range combos {
			sequence = append(sequence, parseNanduCombo(combo, style)...)
		}
	}
	return sequence
}

func parseNanduString(s string) []string {
	return strings.Split(s, ",")
}

func parseNanduCombo(s string, style Style) []NanduCode {
	// Possible formats: 312A+335A(B), 323A+4A, 415A, 323A+312A(A)+3A
	// ex1: base: 323A, conn: (A); base: 312A, conn: 3A
	// ex2: base: 312A, conn: (B); base: 335A, conn: none
	if s == "" {
		return []NanduCode{}
	}
	components := strings.Split(s, "+")
	base := ToNanduCode(components[0], style)
	if base == InvalidNanduCode {
		out.Errorln("data/state - ", "could not find nandu code ", components[0])
	}
	connections := make([]NanduCode, 0, 2)
	if len(components) > 1 {
		for i := 1; i < len(components); i++ {
			component := components[i]
			dynIdx := strings.Index(component, "(") // Index of a dynamic connection -- eg: (A)
			if dynIdx > -1 {
				// get both parts
				c := ToNanduCode(component[dynIdx:], style)
				if c == InvalidNanduCode {
					out.Errorln("data/state - ", "could not find nandu code ", component[dynIdx:])
				}
				connections = append(connections, c)
				c = ToNanduCode(component[:dynIdx], style)
				if c == InvalidNanduCode {
					out.Errorln("data/state - ", "could not find nandu code ", component[:dynIdx])
				}
				connections = append(connections, c)
			} else {
				c := ToNanduCode(component, style)
				if c == InvalidNanduCode {
					out.Errorln("data/state - ", "could not find nandu code ", component[:dynIdx])
				}
				connections = append(connections, c)
			}
		}
	}
	return append([]NanduCode{base}, connections...)
}

func DetermineNandu(judgeScores map[string][]Nandu) []Nandu {
	var numCJudges = len(judgeScores)
	if numCJudges == 0 {
		return nil
	}
	nanduResults := make([][]Nandu, 0)
	for _, v := range judgeScores {
		nanduResults = append(nanduResults, v)
	}

	// Determine the final result for successful nandu
	finalResult := make([]Nandu, len(nanduResults[0]))
	for i, v := range nanduResults[0] {
		finalResult[i].Index = i
		finalResult[i].Code = v.Code
	}
	j1 := nanduResults[0]
	if numCJudges >= 3 {
		j2 := nanduResults[1]
		j3 := nanduResults[2]
		for i, j1i := range j1 {
			finalResult[i].Success = (j1i.Success && j2[i].Success) ||
				(j1i.Success && j3[i].Success) ||
				(j2[i].Success && j3[i].Success)
		}
	} else if numCJudges == 2 {
		j2 := nanduResults[1]
		for i, j1i := range j1 {
			finalResult[i].Success = j1i.Success || j2[i].Success
		}
	} else {
		for i, j1i := range j1 {
			finalResult[i].Success = j1i.Success
		}
	}

	out.Debugf("finalResult: %v\n", finalResult)
	return finalResult
}
