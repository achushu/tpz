package api

import (
	"fmt"
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
	ringStatusRoute := routes.Log(http.HandlerFunc(ringStatus))
	ringEventRoute := routes.Log(http.HandlerFunc(ringEvent))
	ringCurrentRoute := routes.Log(http.HandlerFunc(ringStatus))
	displayInfoRoute := routes.Log(http.HandlerFunc(displayInfo))
	eventCompetitorsRoute := routes.Log(http.HandlerFunc(getEventCompetitors))
	getRoutineRoute := routes.Log(http.HandlerFunc(getRoutine))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/{ringID:\\d+}/status", ringStatusRoute),
		routes.New("/{ringID:\\d+}/event", ringEventRoute),
		routes.New("/{ringID:\\d+}/current", ringCurrentRoute),
		routes.New("/{ringID:\\d+}/display-info", displayInfoRoute),
		routes.New("/{ringID:\\d+}/event-competitors", eventCompetitorsRoute),
		routes.New("/get-routine", getRoutineRoute),
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
	jsonResponse(info, w)
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
		info["routine_id"] = current.Routine.ID
		if len(current.Scores) > 0 {
			info["scores"] = current.Scores
			total, _ := current.CalculateScore()
			info["total"] = data.FormatScore(total)
		}
		ns, err := data.GetNandusheet(current.Routine.ID)
		if err == nil && ns != nil {
			info["nandusheet"] = ns
		}
	}
	jsonResponse(info, w)
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
		info["routine_id"] = current.Routine.ID
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
	jsonResponse(info, w)
}

func getRoutine(w http.ResponseWriter, r *http.Request) {
	var v values

	if !decodeBodyOrError(&v, w, r) {
		return
	}
	defer r.Body.Close()

	rID := v.RoutineID
	if rID == 0 {
		err := fmt.Errorf("invalid routine: %d", v.RoutineID)
		routes.RenderError(w, errors.NewBadRequest(err))
		log.HttpError(err)
		return
	}
	rInfo, err := data.GetRoutineByID(rID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
		return
	}
	event, err := data.GetEventByID(rInfo.Event)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
		return
	}
	competitor, err := data.GetCompetitorByID(rInfo.Competitor)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
		return
	}
	info, err := getScorecard(rID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
		return
	}
	info["event_id"] = rInfo.Event
	info["event_name"] = event.Name
	info["competitor_id"] = rInfo.Competitor
	info["fname"] = competitor.FirstName
	info["lname"] = competitor.LastName
	jsonResponse(info, w)
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
		emptyResponse(w)
		return
	}
	eventID := ring.Event.ID
	comps, err := data.GetCompetitorsInEvent(eventID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}
	jsonResponse(comps, w)
}
