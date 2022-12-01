package data

import (
	"testing"
	"time"

	"github.com/achushu/libs/types"
)

func TestAdjustedAverage3Scores(t *testing.T) {
	scores := []*Score{
		{Score: 7.35},
		{Score: 7.45},
		{Score: 7.70},
	}
	exp := types.RoundFloat((7.35+7.45+7.70)/float64(3), 0.001)
	res := AdjustedAverage(scores)
	if res != exp {
		t.Errorf("want: %f; got: %f\n", exp, res)
	}
}

func TestAdjustedAverage4Scores(t *testing.T) {
	scores := []*Score{
		{Score: 7.35},
		{Score: 7.45},
		{Score: 7.70},
		{Score: 7.95},
	}
	exp := types.RoundFloat((7.45+7.70)/float64(2), 0.001)
	res := AdjustedAverage(scores)
	if res != exp {
		t.Errorf("want: %f; got: %f\n", exp, res)
	}
}

func TestAdjustedAverage5Scores(t *testing.T) {
	scores := []*Score{
		{Score: 7.95},
		{Score: 7.35},
		{Score: 7.45},
		{Score: 7.55},
		{Score: 7.70},
	}
	exp := types.RoundFloat((7.45+7.55+7.70)/float64(3), 0.001)
	res := AdjustedAverage(scores)
	if res != exp {
		t.Errorf("want: %f; got: %f\n", exp, res)
	}
}

func TestFormatScore(t *testing.T) {
	var (
		exp string
		res string
	)
	exp = "5.55"
	res = FormatScore(5.555)
	if res != exp {
		t.Errorf("want: %s; got: %s", exp, res)
	}

	exp = "8.65"
	res = FormatScore(8.6514)
	if res != exp {
		t.Errorf("want: %s; got: %s", exp, res)
	}
}

func checkDeductionResults(got, want map[string][]DeductionResult, t *testing.T) {
	for jID, res := range want {
		gotRes := got[jID]
		if len(res) != len(gotRes) {
			if jID == "result" {
				t.Fatalf("incorrect number of matches found -- got: %d; want: %d", len(gotRes), len(res))
			} else {
				t.Fatalf("incorrect number of deductions returned for %s -- got: %d; want: %d", jID, len(gotRes), len(res))
			}
		}
		if jID == "result" {
			for i, r := range res {
				g := gotRes[i]
				if r.Code != g.Code {
					t.Errorf("incorrect code match -- got: %s; want: %s", g.Code, r.Code)
				}
			}
		} else {
			for i, r := range res {
				g := gotRes[i]
				if r.Code != g.Code {
					t.Errorf("incorrect code match -- got: %s; want: %s", g.Code, r.Code)
				}
				if r.Applied != g.Applied {
					t.Errorf("%s deduction code %s was not marked correctly -- got: %t; want: %t", jID, r.Code, g.Applied, r.Applied)
				}
			}
		}
	}
}

func TestDetermineDeductions(t *testing.T) {
	rID := 1
	now := time.Now()
	t1 := now.UnixMilli()
	judgeA := "Judge A"
	judgeAMarks := []*DeductionMark{
		NewDeductionMark(rID, judgeA, "21", t1),
	}
	judgeB := "Judge B"
	judgeBMarks := []*DeductionMark{
		NewDeductionMark(rID, judgeB, "21", t1),
	}
	marks := map[string][]*DeductionMark{
		judgeA: judgeAMarks,
		judgeB: judgeBMarks,
	}
	want := map[string][]DeductionResult{
		"result": {
			{&DeductionMark{Code: "21"}, true},
		},
		judgeA: {
			{judgeAMarks[0], true},
		},
		judgeB: {
			{judgeBMarks[0], true},
		},
	}
	got := DetermineDeductions(marks)
	checkDeductionResults(got, want, t)

	judgeBMarks = append(judgeBMarks, NewDeductionMark(rID, judgeB, "70", now.Add(10*time.Second).UnixMilli()))
	marks[judgeB] = judgeBMarks
	want[judgeB] = append(want[judgeB], DeductionResult{judgeBMarks[1], false})
	got = DetermineDeductions(marks)
	checkDeductionResults(got, want, t)

	judgeAMarks = append(judgeAMarks, NewDeductionMark(rID, judgeA, "70", now.Add(15*time.Second).UnixMilli()))
	judgeBMarks = append(judgeBMarks, NewDeductionMark(rID, judgeB, "70", now.Add(15*time.Second).UnixMilli()))
	marks[judgeA] = judgeAMarks
	marks[judgeB] = judgeBMarks
	want["result"] = append(want["result"], DeductionResult{&DeductionMark{Code: "70"}, true})
	want[judgeA] = append(want[judgeA], DeductionResult{judgeAMarks[1], true})
	want[judgeB] = append(want[judgeB], DeductionResult{judgeBMarks[2], true})
	got = DetermineDeductions(marks)
	checkDeductionResults(got, want, t)
}
