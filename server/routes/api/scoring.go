package api

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/achushu/libs/out"
	"github.com/achushu/libs/types"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
	"github.com/achushu/tpz/server/sockets"
)

func init() {
	getScoresRoute := routes.Log(http.HandlerFunc(getScores))
	getDeductionsRoute := routes.Log(http.HandlerFunc(getDeductions))
	submitScoreRoute := routes.LoginRequired(http.HandlerFunc(submitScore))
	deleteScoreRoute := routes.LoginRequired(http.HandlerFunc(deleteScore))
	submitAdjustmentRoute := routes.LoginRequired(http.HandlerFunc(submitAdjustment))
	submitDeductionRoute := routes.LoginRequired(http.HandlerFunc(submitDeduction))
	finalizeScoreRoute := routes.LoginRequired(http.HandlerFunc(finalizeScore))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/{ringID:\\d+}/get-scores", getScoresRoute),
		routes.New("/{ringID:\\d+}/get-deductions", getDeductionsRoute),
		routes.New("/submit-score", submitScoreRoute),
		routes.New("/delete-score/{id:\\d+}", deleteScoreRoute),
		routes.New("/submit-adjustment", submitAdjustmentRoute),
		routes.New("/submit-deduction", submitDeductionRoute),
		routes.New("/finalize-score", finalizeScoreRoute),
	})
}

// delete score requires (score) ID and RingID
func deleteScore(w http.ResponseWriter, r *http.Request) {
	var (
		c   changer
		msg []byte
		err error
	)

	if !decodeBodyOrError(&c, w, r) {
		return
	}
	defer r.Body.Close()

	if err := data.DeleteScore(c.ID); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(fmt.Sprintf("error deleting score [%d]:", c.ID), err)
		return
	}
	msg, err = sockets.ConstructMessage(sockets.SubmitScore, nil)
	if err != nil {
		log.WsError("could not construct submit-score notification", err)
	}
	err = sockets.NotifyHeadJudge(msg, c.RingID)
	if err != nil {
		log.WsError("could not notify head judge", err)
	}

	w.Write(emptyJson)
}

type scorecard struct {
	Score   float64 `json:"score"`
	JudgeID string  `json:"judgeID"`
	RingID  int     `json:"ringID"`
}

func submitScore(w http.ResponseWriter, r *http.Request) {
	var (
		s   scorecard
		msg []byte
		err error
	)

	if !decodeBodyOrError(&s, w, r) {
		return
	}
	defer r.Body.Close()

	if err := data.SaveScore(s.Score, s.RingID, s.JudgeID); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError("error saving score:", err, "\n", s)
		return
	}
	msg, err = sockets.ConstructMessage(sockets.SubmitScore, nil)
	if err != nil {
		log.WsError("could not construct submit-score notification", err)
	}
	err = sockets.NotifyHeadJudge(msg, s.RingID)
	if err != nil {
		log.WsError("could not notify head judge", err)
	}

	w.Write(emptyJson)
}

type adjustment struct {
	Amount    float64 `json:"amount"`
	Reason    string  `json:"reason"`
	JudgeID   string  `json:"judgeID"`
	RoutineID int     `json:"routineID"`
	RingID    int     `json:"ringID"`
}

func submitAdjustment(w http.ResponseWriter, r *http.Request) {
	var (
		ring *data.RingState
		adj  adjustment
	)

	if !decodeBodyOrError(&adj, w, r) {
		return
	}
	defer r.Body.Close()

	if ring = getRingOrError(adj.RingID, w); ring == nil {
		return
	}

	if err := data.SaveAdjustment(adj.Amount, adj.Reason, adj.RoutineID, adj.JudgeID); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		out.Errorln("error saving adjustment:", err, "\n", adj)
		return
	}

	ring.SetAdjustment(adj.JudgeID, adj.Amount, adj.Reason)

	w.Write(emptyJson)
}

type deduction struct {
	Timestamp int    `json:"timestamp"`
	RoutineID int    `json:"routineID"`
	JudgeID   string `json:"judgeID"`
	Code      string `json:"code"`
	RingID    int    `json:"ringID"`
}

func submitDeduction(w http.ResponseWriter, r *http.Request) {
	var (
		ring *data.RingState
		ded  deduction
	)

	if !decodeBodyOrError(&ded, w, r) {
		return
	}
	defer r.Body.Close()

	if ring = getRingOrError(ded.RingID, w); ring == nil {
		return
	}

	if err := data.SaveDeductionMark(ded.RoutineID, ded.Timestamp, ded.Code, ded.JudgeID); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		out.Errorln("error saving deduction:", err, "\n", ded)
		return
	}

	ring.SetDeduction(ded.JudgeID, ded.Code, int64(ded.Timestamp))

	w.Write(emptyJson)
}

func getScores(w http.ResponseWriter, r *http.Request) {
	var ring *data.RingState

	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])

	if ring = getRingOrError(ringID, w); ring == nil {
		return
	}
	info := map[string]interface{}{
		"scores":      ring.Scores,
		"adjustments": ring.Adjustments,
	}
	if len(ring.Scores) != 0 {
		calc, _ := ring.CalculateScore()
		info["calc"] = data.FormatScore(calc)
		var total float64
		for _, v := range ring.Scores {
			total += v.Score
		}
		info["total"] = total
		final, err := data.GetFinalScore(ring.Event.ID, ring.Competitor.ID)
		if err != nil && err != errors.ErrNotFound {
			out.Errorln("error retrieving final score: ", err)
		}
		if final != "" {
			info["final"] = final
		}
	}
	jsonResponse(info, w)
}

func getDeductions(w http.ResponseWriter, r *http.Request) {
	var ring *data.RingState

	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])

	if ring = getRingOrError(ringID, w); ring == nil {
		return
	}
	info := map[string]interface{}{
		"deductions": data.DetermineDeductions(ring.Deductions),
	}
	jsonResponse(info, w)
}

func finalizeScore(w http.ResponseWriter, r *http.Request) {
	var (
		ring *data.RingState
		s    scorecard
		err  error
	)

	if !decodeBodyOrError(&s, w, r) {
		return
	}
	defer r.Body.Close()

	if ring = getRingOrError(s.RingID, w); ring == nil {
		return
	}

	err = ring.FinalizeScore()
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		out.Errorln("server/judge - ", "error saving final score: ", err)
	}

	toSend, err := sockets.ConstructMessage(sockets.NotifyFinalScore, nil)
	if err != nil {
		log.WsError("server/judge - ", "error constructing response: ", err)
	}

	errs := sockets.Broadcast(toSend, s.RingID)
	if errs != nil {
		log.WsError("server/judge - ", "error broadcasting websockets message: ", errs)
	}

	w.Write(emptyJson)
}
