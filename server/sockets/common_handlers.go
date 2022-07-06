package sockets

import (
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/server/log"
)

func NotifyCompetitorChange(ringID int) error {
	ring := data.GetRing(ringID)
	if ring.Event == nil {
		return nil
	}
	toSend, err := ConstructMessage(NotifyCompetitor, nil)
	if err != nil {
		return err
	}
	errs := Broadcast(toSend, ringID)
	if errs != nil {
		log.WsError("error sending websockets message:", errs)
	}
	return nil
}
