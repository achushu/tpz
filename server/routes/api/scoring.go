package api

import (
	"fmt"
	"hash/fnv"
	"net/http"
	"strconv"

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
	getNanduScoresRoute := routes.Log(http.HandlerFunc(getNanduScores))
	submitScoreRoute := routes.LoginRequired(http.HandlerFunc(submitScore))
	deleteScoreRoute := routes.LoginRequired(http.HandlerFunc(deleteScore))
	submitAdjustmentRoute := routes.LoginRequired(http.HandlerFunc(submitAdjustment))
	submitDeductionRoute := routes.LoginRequired(http.HandlerFunc(submitDeduction))
	submitNanduRoute := routes.LoginRequired(http.HandlerFunc(submitNandu))
	finalizeScoreRoute := routes.LoginRequired(http.HandlerFunc(finalizeScore))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/{ringID:\\d+}/get-scores", getScoresRoute),
		routes.New("/{ringID:\\d+}/get-deductions", getDeductionsRoute),
		routes.New("/{ringID:\\d+}/get-nandu-scores", getNanduScoresRoute),
		routes.New("/submit-score", submitScoreRoute),
		routes.New("/delete-score/{id:\\d+}", deleteScoreRoute),
		routes.New("/submit-adjustment", submitAdjustmentRoute),
		routes.New("/submit-deduction", submitDeductionRoute),
		routes.New("/submit-nandu", submitNanduRoute),
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

func generateDeductionID(judgeID string, timestamp int64) int {
	hash := fnv.New32a()
	hash.Write([]byte(judgeID))
	hash.Write([]byte(strconv.FormatInt(timestamp, 10)))
	return int(hash.Sum32())
}

func submitDeduction(w http.ResponseWriter, r *http.Request) {
	var (
		ring *data.RingState
		ded  deduction
		msg  []byte
		err  error
	)

	if !decodeBodyOrError(&ded, w, r) {
		return
	}
	defer r.Body.Close()

	if ring = getRingOrError(ded.RingID, w); ring == nil {
		return
	}

	id := generateDeductionID(ded.JudgeID, int64(ded.Timestamp))
	dm := &data.DeductionMark{
		ID:        id,
		Routine:   ded.RoutineID,
		Judge:     ded.JudgeID,
		Code:      ded.Code,
		Timestamp: int64(ded.Timestamp),
	}
	switch r.Method {
	case "POST":
		out.Debugf("%s save deduction %d - code %s", dm.Judge, id, dm.Code)
		if err := data.SaveDeductionMark(dm); err != nil {
			routes.RenderError(w, errors.NewInternalError(err))
			out.Errorln("error saving deduction:", err, "\n", ded)
			return
		}
		ring.SetDeduction(dm)
	case "UPDATE":
		out.Debugf("%s update deduction %d to code %s", dm.Judge, id, dm.Code)
		if err := data.UpdateDeductionMark(id, ded.Code); err != nil {
			routes.RenderError(w, errors.NewInternalError(err))
			out.Errorln("error updating deduction:", err, "\n", ded)
			return
		}
		ring.UpdateDeduction(dm.Judge, id, ded.Code)
	case "DELETE":
		out.Debugf("%s delete deduction %d", dm.Judge, id)
		if err := data.RemoveDeductionMark(id); err != nil {
			routes.RenderError(w, errors.NewInternalError(err))
			out.Errorln("error deleting deduction:", err, "\n", ded)
			return
		}
		ring.DeleteDeduction(dm.Judge, dm.ID)
	}
	msg, err = sockets.ConstructMessage(sockets.SubmitDeductions, nil)
	if err != nil {
		log.WsError("could not construct submit-deduction notification", err)
	}
	err = sockets.NotifyHeadJudge(msg, ded.RingID)
	if err != nil {
		log.WsError("could not notify head judge", err)
	}

	w.Write(emptyJson)
}

type nanduResult struct {
	Routine int    `json:"routineID"`
	Judge   string `json:"judgeID"`
	Result  []bool `json:"result"`
	RingID  int    `json:"ringID"`
}

func submitNandu(w http.ResponseWriter, r *http.Request) {
	var (
		ring *data.RingState
		nan  nanduResult
		msg  []byte
		err  error
	)

	if !decodeBodyOrError(&nan, w, r) {
		return
	}
	defer r.Body.Close()

	if ring = getRingOrError(nan.RingID, w); ring == nil {
		return
	}

	switch r.Method {
	case "POST":
		out.Debugf("%s save nandu results %s", nan.Judge, nan.Result)
		ring.ParseNanduScores(nan.Judge, nan.Result)
		marks := data.SliceToNanduMarks(nan.Result)
		if err := data.SaveNanduScore(nan.Routine, nan.Judge, marks); err != nil {
			routes.RenderError(w, errors.NewInternalError(err))
			out.Errorln("error saving nandu result:", err, "\n", nan)
			return
		}
	}
	msg, err = sockets.ConstructMessage(sockets.SubmitNandu, nil)
	if err != nil {
		log.WsError("could not construct submit-nandu notification", err)
	}
	err = sockets.NotifyHeadJudge(msg, nan.RingID)
	if err != nil {
		log.WsError("could not notify head judge", err)
	}

	w.Write(emptyJson)
}

func getNanduScores(w http.ResponseWriter, r *http.Request) {
	var ring *data.RingState

	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])

	if ring = getRingOrError(ringID, w); ring == nil {
		return
	}
	marks := make(map[string][]bool)
	for judge, scores := range ring.NanduScores {
		judgeMarks := make([]bool, 0)
		for _, v := range scores {
			judgeMarks = append(judgeMarks, v.Success)
		}
		marks[judge] = judgeMarks
	}
	info := map[string]interface{}{
		"marks":  marks,
		"result": ring.NanduResult,
	}
	jsonResponse(info, w)
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
