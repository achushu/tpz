package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/achushu/libs/types"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/routes"
	"github.com/gorilla/mux"
)

func init() {
	ringStatusHandler := routes.Log(http.HandlerFunc(ringStatus))
	ringEventHandler := routes.Log(http.HandlerFunc(ringEvent))
	ringCurrentHandler := routes.Log(http.HandlerFunc(ringStatus))
	displayInfoHandler := routes.Log(http.HandlerFunc(displayInfo))
	eventCompetitorsHandler := routes.Log(http.HandlerFunc(getEventCompetitors))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/{ringID:\\d+}/status", ringStatusHandler),
		routes.New("/{ringID:\\d+}/event", ringEventHandler),
		routes.New("/{ringID:\\d+}/current", ringCurrentHandler),
		routes.New("/{ringID:\\d+}/display-info", displayInfoHandler),
		routes.New("/{ringID:\\d+}/event-competitors", eventCompetitorsHandler),
	})
}

func ringEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	current := data.GetRing(ringID)
	if current == nil {
		err := errors.NewRingError(ringID)
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}
	event := current.Event

	info := map[string]interface{}{
		"time": time.Now().UnixMilli(),
	}
	if event != nil {
		info["event_name"] = event.Name
		info["event_id"] = event.ID
		info["event_exp"] = event.Experience.StringShort()
		info["rules"] = event.Ruleset.String()
	}
	res, err := json.Marshal(info)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	_, err = w.Write(res)
	if err != nil {
		log.HttpError("error responding to request:", err)
	}
}

func ringStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	current := data.GetRing(ringID)
	if current == nil {
		err := errors.NewRingError(ringID)
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}

	event := current.Event
	comp := current.Competitor

	info := map[string]interface{}{
		"time": time.Now().UnixMilli(),
	}
	if event != nil {
		info["event_name"] = event.Name
		info["event_id"] = event.ID
		info["event_exp"] = event.Experience.StringShort()
		info["rules"] = event.Ruleset.String()
	}
	if comp != nil {
		info["competitor_id"] = comp.ID
		info["fname"] = comp.FirstName
		info["lname"] = comp.LastName
		info["routine"] = current.Routine.ID
		if len(current.Scores) > 0 {
			info["scores"] = current.Scores
			total, _ := current.CalculateScore()
			info["total"] = data.FormatScore(total)
		}
	}
	res, err := json.Marshal(info)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	_, err = w.Write(res)
	if err != nil {
		log.HttpError("error responding to request:", err)
	}
}

func displayInfo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	current := data.GetRing(ringID)
	event := current.Event
	comp := current.Competitor

	info := map[string]interface{}{
		"time": time.Now().UnixMilli(),
	}
	if event != nil {
		info["event_id"] = event.ID
		info["event_name"] = event.Name
		info["rules"] = event.Ruleset.String()
	}
	if comp != nil {
		info["competitor_id"] = comp.ID
		info["current"] = map[string]string{
			"fname": comp.FirstName,
			"lname": comp.LastName,
		}
		nextValues := make(map[string]string)
		prepareValues := make(map[string]string)
		next, prepare, _ := findNextTwoCompetitors(current)
		if next != nil {
			nextValues["fname"] = next.FirstName
			nextValues["lname"] = next.LastName
			info["next"] = nextValues
			if prepare != nil {
				prepareValues["fname"] = prepare.FirstName
				prepareValues["lname"] = prepare.LastName
				info["prepare"] = prepareValues
			}
		}
	}

	res, err := json.Marshal(info)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}

	_, err = w.Write(res)
	if err != nil {
		log.HttpError("error responding to request:", err)
	}
}

func findNextTwoCompetitors(current *data.RingState) (next, prepare *data.Competitor, err error) {
	var (
		lineup []*data.Competitor
	)

	event := current.Event
	lineup, err = data.GetCompetitorsInEvent(current.Event.ID)
	if err != nil {
		return
	}
	idx := current.Routine.Order - 1
	nextIdx := idx + 1
	if nextIdx >= len(lineup) {
		// at the end of this event, get the next one
		event, err = data.GetNthEventInRing(event.Order+1, current.Ring.ID)
		if err != nil {
			return
		}
		lineup, err = data.GetCompetitorsInEvent(event.ID)
		if err != nil {
			return
		}
		nextIdx = 0
	}
	next = lineup[nextIdx]

	prepareIdx := nextIdx + 1
	if prepareIdx >= len(lineup) {
		// at the end of this event, get the next one
		event, err = data.GetNthEventInRing(event.Order+1, current.Ring.ID)
		if err != nil {
			return
		}
		lineup, err = data.GetCompetitorsInEvent(event.ID)
		if err != nil {
			return
		}
		prepareIdx = 0
	}
	prepare = lineup[prepareIdx]
	return
}

func getEventCompetitors(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	ring := data.GetRing(ringID)
	if ring.Event == nil {

	}
	eventID := ring.Event.ID
	comps, err := data.GetCompetitorsInEvent(eventID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	res, err := json.Marshal(comps)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	_, err = w.Write(res)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
	}
}
