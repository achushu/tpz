package data_test

import (
	"reflect"
	"testing"

	"github.com/achushu/tpz/data"
)

var (
	ringID = 1
	rData  = &data.Ring{
		ID:   ringID,
		Name: "FOP1",
	}
	eventData = &data.Event{
		ID:      1,
		Ring:    ringID,
		Ruleset: data.USWU,
		Style:   data.Changquan,
	}
	compData = &data.Competitor{
		ID:        1,
		FirstName: "First",
		LastName:  "Last",
	}
)

func TestRings(t *testing.T) {
	data.ClearState()

	data.AddRing(rData)
	ring := data.GetRing(ringID)
	if ring.ID != rData.ID {
		t.Errorf("unexpected ring ID -- want: %d; got: %d\n", rData.ID, ring.ID)
	}
	if ring.Name != rData.Name {
		t.Errorf("unexpected ring name -- want: %s; got: %s\n", rData.Name, ring.Name)
	}
}

func TestScore(t *testing.T) {
	data.ClearState()
	judgeTag := "12345"
	score := float64(10.0)
	expectedScores := []float64{score}
	data.AddRing(rData)
	r := data.GetRing(rData.ID)
	r.SetPerformanceScore(judgeTag, score)
	actualScores := r.PerformanceScores()
	if !reflect.DeepEqual(expectedScores, actualScores) {
		t.Errorf("unexpected scores -- want: %v; got: %v\n", expectedScores, actualScores)
	}
}

func TestAdjustments(t *testing.T) {
	data.ClearState()
	data.AddRing(rData)
	r := data.GetRing(rData.ID)
	r.SetAdjustment("abc", 0.1, "test")
	r.SetAdjustment("abc", 0.5, "big test")
	adjs := r.Adjustments()
	req := 2
	max := 2
	count := 0
	if len(adjs) > max {
		t.Errorf("too many items returned -- want: %d; got: %d\n", max, len(adjs))
	}
	for _, v := range adjs {
		if v.Reason == "test" && v.Amount == 0.1 {
			count += 1
		} else if v.Reason == "big test" && v.Amount == 0.5 {
			count += 1
		} else {
			t.Errorf("unexpected adjustment -- got: %s for %f\n", v.Reason, v.Amount)
		}
	}
	if count < req {
		t.Errorf("did not match enough items -- want: %d; got: %d\n", req, count)
	}
}
