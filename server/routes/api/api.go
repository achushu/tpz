package api

import (
	"encoding/json"
	"net/http"

	"github.com/achushu/libs/out"
	"github.com/achushu/libs/types"
	"github.com/achushu/tpz/config"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
	"github.com/gorilla/mux"
)

const (
	namespace = "/api"
)

func init() {
	competitionNameHandler := routes.Log(http.HandlerFunc(competitionName))
	getRingsHandler := routes.Log(http.HandlerFunc(getRings))
	getEventsHandler := routes.Log(http.HandlerFunc(getEvents))
	currentEventHandler := routes.Log(http.HandlerFunc(currentEvent))
	currentCompetitorHandler := routes.Log(http.HandlerFunc(currentCompetitor))
	competitorsHandler := routes.Log(http.HandlerFunc(competitors))
	eventsByCompetitorHandler := routes.Log(http.HandlerFunc(eventsByCompetitor))
	overallRankingsHandler := routes.Log(http.HandlerFunc(overallRankings))
	eventRanksHandler := routes.Log(http.HandlerFunc(eventRanks))
	allaroundHandler := routes.Log(http.HandlerFunc(allaround))
	rulesetsHandler := routes.Log(http.HandlerFunc(getRulesets))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/competition-name", competitionNameHandler),
		routes.New("/get-rings", getRingsHandler),
		routes.New("/all-events", getEventsHandler),
		routes.New("/get-event/{eventID:\\d+}", getEventsHandler),
		routes.New("/events-in-ring/{ringID:\\d+}", getEventsHandler),
		routes.New("/current-event/{ringID:\\d+}", currentEventHandler),
		routes.New("/current-competitor/{ringID:\\d+}", currentCompetitorHandler),
		routes.New("/all-competitors", competitorsHandler),
		routes.New("/competitors-in-event/{eventID:\\d+}", competitorsHandler),
		routes.New("/events-by-competitor/{competitorID:\\d+}", eventsByCompetitorHandler),
		routes.New("/overall-rankings", overallRankingsHandler),
		routes.New("/event-ranks/{eventID:\\d+}", eventRanksHandler),
		routes.New("/find-all-around", allaroundHandler),
		routes.New("/rulesets", rulesetsHandler),
	})
}

var emptyJson = []byte{123, 125} // {}
func emptyResponse(w http.ResponseWriter) {
	_, err := w.Write(emptyJson)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError("error responding to request:", err)
	}
}

func respond(data []byte, w http.ResponseWriter) {
	_, err := w.Write(data)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError("error responding to request:", err)
	}
}

func jsonResponse(v any, w http.ResponseWriter) {
	res, err := json.Marshal(v)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	respond(res, w)
}

func getRingOrError(ringID int, w http.ResponseWriter) *data.RingState {
	ring := data.GetRing(ringID)
	if ring == nil {
		err := errors.NewRingError(ringID)
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}
	return ring
}

func decodeBodyOrError(v any, w http.ResponseWriter, r *http.Request) bool {
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(v); err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError("error parsing data:", err)
		return false
	}
	return true
}

// values holds key-value pairs that may be submitted in the request
type values struct {
	ID           int `json:"id"`
	EventID      int `json:"event_id"`
	CompetitorID int `json:"competitor_id"`
	RingID       int `json:"ring_id"`
	RoutineID    int `json:"routine_id"`
}

func competitionName(w http.ResponseWriter, r *http.Request) {
	respond([]byte(config.Settings.Competition.Name), w)
}

func getRings(w http.ResponseWriter, r *http.Request) {
	data, err := data.GetRings()
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	jsonResponse(data, w)
}

func getEvents(w http.ResponseWriter, r *http.Request) {
	var (
		event  *data.Event
		events []*data.Event
		err    error
	)
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	eventID := types.Atoi(vars["eventID"])
	if ringID > 0 {
		events, err = data.GetEventsInRing(ringID)
	} else if eventID > 0 {
		event, err = data.GetEventByID(eventID)
	} else {
		events, err = data.GetEvents()
	}
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	if events != nil {
		jsonResponse(events, w)
	} else {
		jsonResponse(event, w)
	}
}

func currentEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	current := data.GetRing(ringID)
	/*
		data, err := data.GetEventByID(current.Event.ID)
		if err != nil {
			routes.RenderError(w,  errors.NewInternalError(err))
		}
		res, err := json.Marshal(data)
	*/
	// Use cached version
	jsonResponse(current.Event, w)
}

func currentCompetitor(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	current := data.GetRing(ringID)
	jsonResponse(current.Competitor, w)
}

func competitors(w http.ResponseWriter, r *http.Request) {
	var (
		comps []*data.Competitor
		err   error
	)
	vars := mux.Vars(r)
	eventID := types.Atoi(vars["eventID"])
	out.Debugln("eventID: ", eventID)
	if eventID > 0 {
		comps, err = data.GetCompetitorsInEvent(eventID)
	} else {
		comps, err = data.GetCompetitors()
	}
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	jsonResponse(comps, w)
}

func eventsByCompetitor(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	competitorID := types.Atoi(vars["competitorID"])
	events, err := data.GetEventsByCompetitor(competitorID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	jsonResponse(events, w)
}

func overallRankings(w http.ResponseWriter, r *http.Request) {
	rankings, err := data.GetAllRankings()
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	for i, v := range rankings {
		routineID := types.AssertInt(v["rid"])
		scores := make([]float64, 0)
		if routineID != 0 {
			scoreMap, err := data.GetScores(routineID)
			if err != nil {
				routes.RenderError(w, errors.NewInternalError(err))
				return
			}
			for _, v := range scoreMap {
				scores = append(scores, v.Score)
			}
		}
		rankings[i]["scores"] = scores
	}
	jsonResponse(rankings, w)
}

func eventRanks(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID := types.Atoi(vars["eventID"])
	ranks, err := data.GetSimpleRanks(eventID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	jsonResponse(ranks, w)
}

func allaround(w http.ResponseWriter, r *http.Request) {
	res, err := data.FindAllAroundWinner()
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	for _, line := range res {
		_, err = w.Write([]byte(line + "\n"))
		if err != nil {
			out.Errorln("error writing all-around results:", errors.NewInternalError(err))
		}
	}
}

func getRulesets(w http.ResponseWriter, r *http.Request) {
	data, err := data.GetRulesets()
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	jsonResponse(data, w)
}
