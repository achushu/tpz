package api

import (
	"encoding/json"
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
	getScoresHandler := routes.Log(http.HandlerFunc(getScores))
	submitScoreHandler := routes.LoginRequired(http.HandlerFunc(submitScore))
	submitAdjustmentHandler := routes.LoginRequired(http.HandlerFunc(submitAdjustment))
	finalizeScoreHandler := routes.LoginRequired(http.HandlerFunc(finalizeScore))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/{ringID:\\d+}/get-scores", getScoresHandler),
		routes.New("/submit-score", submitScoreHandler),
		routes.New("/submit-adjustment", submitAdjustmentHandler),
		routes.New("/finalize-score", finalizeScoreHandler),
	})
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

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&s); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError("error parsing data:", err)
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
	Amount  float64 `json:"amount"`
	Reason  string  `json:"reason"`
	JudgeID string  `json:"judgeID"`
	RingID  int     `json:"ringID"`
}

func submitAdjustment(w http.ResponseWriter, r *http.Request) {
	var (
		adj adjustment
		err error
	)

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&adj); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		out.Errorln("error parsing data:", err)
		return
	}
	defer r.Body.Close()

	if err = data.SaveAdjustment(adj.Amount, adj.Reason, adj.RingID, adj.JudgeID); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		out.Errorln("error saving adjustment:", err, "\n", adj)
		return
	}

	w.Write(emptyJson)
}

func getScores(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	ring := data.GetRing(ringID)
	if ring == nil {
		err := errors.NewRingError(ringID)
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}
	info := map[string]interface{}{
		"scores":      ring.Scores,
		"adjustments": ring.Adjustments(),
	}
	if len(ring.Scores) != 0 {
		calc, _ := ring.CalculateScore()
		info["calc"] = data.FormatScore(calc)
		var total float64
		for _, v := range ring.Scores {
			total += v
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
	res, err := json.Marshal(info)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	_, err = w.Write(res)
	if err != nil {
		log.HttpError("error responding to request:", errors.NewInternalError(err))
	}
}

func finalizeScore(w http.ResponseWriter, r *http.Request) {
	var (
		s   scorecard
		err error
	)

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&s); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		out.Errorln("error parsing data:", err)
		return
	}
	defer r.Body.Close()

	ring := data.GetRing(s.RingID)
	if ring == nil {
		err = errors.NewRingError(s.RingID)
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}

	err = ring.FinalizeScore()
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		out.Errorln("server/judge -", "error saving final score:", err)
	}

	toSend, err := sockets.ConstructMessage(sockets.NotifyFinalScore, nil)
	if err != nil {
		log.WsError("server/judge -", "error constructing response", err)
	}

	errs := sockets.Broadcast(toSend, s.RingID)
	if errs != nil {
		log.WsError("server/judge -", "error broadcasting websockets message:", errs)
	}

	w.Write(emptyJson)
}
