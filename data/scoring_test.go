package data

import (
	"testing"

	"github.com/achushu/libs/types"
)

func TestAdjustedAverage3Scores(t *testing.T) {
	scores := []float64{7.35, 7.45, 7.70}
	exp := types.RoundFloat((7.35+7.45+7.70)/float64(3), 0.001)
	res := AdjustedAverage(scores)
	if res != exp {
		t.Errorf("want: %f; got: %f\n", exp, res)
	}
}

func TestAdjustedAverage4Scores(t *testing.T) {
	scores := []float64{7.35, 7.45, 7.70, 7.95}
	exp := types.RoundFloat((7.45+7.70)/float64(2), 0.001)
	res := AdjustedAverage(scores)
	if res != exp {
		t.Errorf("want: %f; got: %f\n", exp, res)
	}
}

func TestAdjustedAverage5Scores(t *testing.T) {
	scores := []float64{7.95, 7.35, 7.45, 7.55, 7.70}
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
