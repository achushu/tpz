package routes

import (
	"encoding/json"
	"net/http"

	"github.com/achushu/libs/out"
	"github.com/achushu/libs/types"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"
	"github.com/gorilla/mux"
)

const (
	namespace = "/api"
)

type body struct {
	ID           int `json:"id"`
	EventID      int `json:"event_id"`
	CompetitorID int `json:"competitor_id"`
	RingID       int `json:"ring_id"`
}

func init() {
	competitorHandler := Log(http.HandlerFunc(competitorMux))
	eventHandler := Log(http.HandlerFunc(eventMux))

	AddSubroute(namespace, []Route{
		New("/competitors", competitorHandler),
		New("/competitor/{id:\\d+}", competitorHandler),
		New("/events", eventHandler),
		New("/event/{id:\\d+}", eventHandler),
	})
}

func competitorMux(w http.ResponseWriter, r *http.Request) {
	var (
		values body
		cID    int
		resp   []byte
		err    error
	)
	vars := mux.Vars(r)
	if id, ok := vars["id"]; ok {
		cID = types.Atoi(id)
	} else if r.Body != nil {
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&values); err != nil {
			RenderError(w, errors.NewInternalError(err))
			log.HttpError("error parsing data:", err)
			return
		}
		defer r.Body.Close()
		if values.CompetitorID != 0 {
			cID = values.CompetitorID
		} else if values.ID != 0 {
			cID = values.ID
		}
	}

	switch r.Method {
	case http.MethodGet:
		var res interface{}
		if cID == 0 {
			res, err = data.GetCompetitors()
		} else {
			res, err = data.GetCompetitorByID(cID)
		}
		if err != nil {
			RenderError(w, errors.NewInternalError(err))
			return
		}
		if resp, err = json.Marshal(res); err != nil {
			RenderError(w, errors.NewInternalError(err))
			return
		}
		if _, err = w.Write(resp); err != nil {
			log.HttpError("error responding to request:", err)
		}
	case http.MethodPost:
		// create a new competitor
		// or edit existing competitor
	case http.MethodDelete:
		// deleting competitor should cascade to routines
	}
}

func eventMux(w http.ResponseWriter, r *http.Request) {
	var (
		values  body
		eventID int
		resp    []byte
		err     error
	)
	vars := mux.Vars(r)
	if id, ok := vars["id"]; ok {
		eventID = types.Atoi(id)
	} else if r.Body != nil {
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&values); err != nil {
			RenderError(w, errors.NewInternalError(err))
			log.HttpError("error parsing data:", err)
			return
		}
		defer r.Body.Close()
		if values.EventID != 0 {
			eventID = values.EventID
		} else if values.ID != 0 {
			eventID = values.ID
		}
	}

	switch r.Method {
	case http.MethodGet:
		var res interface{}
		if eventID == 0 {
			res, err = data.GetEvents()
		} else {
			res, err = data.GetEventByID(eventID)
		}
		if err != nil {
			RenderError(w, errors.NewInternalError(err))
			return
		}
		if resp, err = json.Marshal(res); err != nil {
			RenderError(w, errors.NewInternalError(err))
			return
		}
		if _, err = w.Write(resp); err != nil {
			log.HttpError("error responding to request:", err)
		}
	case http.MethodPost:
		ringID := values.RingID
		if ringID != 0 {
			// move event
			out.Printf("server/control - move event %d to ring ID %d\n", eventID, ringID)
			err := data.ChangeEventRing(ringID, eventID)
			if err != nil {
				RenderError(w, errors.NewInternalError(err))
				log.HttpError(err)
			}
		}
	case http.MethodDelete:
		// deleting event should cascade to routines
	}
}
