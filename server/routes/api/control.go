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
	getSettingsHandler := routes.Log(http.HandlerFunc(getSettings))
	setSettingsHandler := routes.LoginRequired(http.HandlerFunc(setSettings))
	addToEventHandler := routes.LoginRequired(http.HandlerFunc(addToEvent))
	removeFromEventHandler := routes.LoginRequired(http.HandlerFunc(removeFromEvent))
	changeEventHandler := routes.LoginRequired(http.HandlerFunc(changeEvent))
	changeCompetitorHandler := routes.LoginRequired(http.HandlerFunc(changeCompetitor))
	moveEventHandler := routes.LoginRequired(http.HandlerFunc(moveEvent))

	routes.AddSubroute(namespace, []routes.Route{
		routes.New("/get-settings", getSettingsHandler),
		routes.New("/set-settings", setSettingsHandler),
		routes.New("/add-to-event", addToEventHandler),
		routes.New("/remove-from-event", removeFromEventHandler),
		routes.New("/move-event", moveEventHandler),
		routes.New("/{ringID:\\d+}/change-event", changeEventHandler),
		routes.New("/{ringID:\\d+}/change-competitor", changeCompetitorHandler),
	})
}

func getSettings(w http.ResponseWriter, r *http.Request) {
	res, err := json.Marshal(data.ClientSettings)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		return
	}

	_, err = w.Write(res)
	if err != nil {
		log.HttpError("error responding to request:", err)
	}
}

type settingsChange struct {
	Settings map[string]string `json:"settings"`
}

func setSettings(w http.ResponseWriter, r *http.Request) {
	var s settingsChange

	if !decodeBodyOrError(&s, w, r) {
		return
	}
	defer r.Body.Close()

	for k, v := range s.Settings {
		data.ClientSettings[k] = v
	}

	w.Write(emptyJson)
}

func addToEvent(w http.ResponseWriter, r *http.Request) {
	var c changer

	if !decodeBodyOrError(&c, w, r) {
		return
	}
	defer r.Body.Close()

	out.Println("server/control - add competitor", c.CompetitorID, "to event", c.EventID)
	err := data.AddCompetitorToEvent(c.CompetitorID, c.EventID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}

	w.Write(emptyJson)
}

func removeFromEvent(w http.ResponseWriter, r *http.Request) {
	var c changer

	if !decodeBodyOrError(&c, w, r) {
		return
	}
	defer r.Body.Close()

	out.Println("server/control - remove competitor", c.CompetitorID, "from event", c.EventID)
	err := data.RemoveCompetitorFromEvent(c.CompetitorID, c.EventID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}

	w.Write(emptyJson)
}

func changeEvent(w http.ResponseWriter, r *http.Request) {
	var (
		ring *data.RingState
		c    changer
		msg  []byte
	)

	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	if ring = getRingOrError(ringID, w); ring == nil {
		return
	}
	if !decodeBodyOrError(&c, w, r) {
		return
	}
	defer r.Body.Close()

	eventID := c.ID
	event, err := data.GetEventByID(eventID)
	if err != nil {
		err = errors.NewEventError(eventID)
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
		return
	}
	ring.SetEvent(event)

	msg, err = sockets.ConstructMessage(sockets.NotifyEvent, nil)
	if err != nil {
		log.HttpError("could not construct notify-event notification", err)
	}
	errs := sockets.Broadcast(msg, ringID)
	if errs != nil {
		log.HttpError(errs)
	}

	comp, err := data.GetNthCompetitorInEvent(1, eventID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}
	if comp == nil {
		err = errors.ErrNotFound
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}
	ring.SetCompetitor(comp, event)
	err = sockets.NotifyCompetitorChange(ringID)
	if err != nil {
		log.HttpError("could not construct notify-competitor notification", err)
	}

	w.Write(emptyJson)
}

func changeCompetitor(w http.ResponseWriter, r *http.Request) {
	var (
		ring *data.RingState
		c    changer
	)

	vars := mux.Vars(r)
	ringID := types.Atoi(vars["ringID"])
	if ring = getRingOrError(ringID, w); ring == nil {
		return
	}
	if !decodeBodyOrError(&c, w, r) {
		return
	}
	defer r.Body.Close()

	eventID := c.EventID
	if ring.Event == nil || ring.Event.ID != eventID {
		event, err := data.GetEventByID(eventID)
		if err != nil {
			err = errors.NewEventError(eventID)
			routes.RenderError(w, errors.NewInternalError(err))
			log.HttpError(err)
			return
		}
		ring.SetEvent(event)
	}

	comp, err := data.GetCompetitorByID(c.CompetitorID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
		w.Write(emptyJson)
		return
	}
	ring.SetCompetitor(comp, ring.Event)

	err = sockets.NotifyCompetitorChange(ringID)
	if err != nil {
		log.HttpError("could not construct notify-competitor notification", err)
	}

	w.Write(emptyJson)
}

func moveEvent(w http.ResponseWriter, r *http.Request) {
	var c changer

	if !decodeBodyOrError(&c, w, r) {
		return
	}
	defer r.Body.Close()

	out.Printf("server/control - move event %d to ring ID %d\n", c.EventID, c.RingID)
	err := data.ChangeEventRing(c.RingID, c.EventID)
	if err != nil {
		routes.RenderError(w, errors.NewInternalError(err))
		log.HttpError(err)
	}

	w.Write(emptyJson)
}
