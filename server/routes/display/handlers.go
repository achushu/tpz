package display

import (
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/sockets"
)

func handleRegisterDisplay(conn *sockets.Connection, msg sockets.Message) bool {
	ringID := msg.RingID
	ring := data.GetRing(ringID)
	if ring == nil {
		log.HttpError("server/display -", "could not find ring", ringID)
		return false
	}
	ring.AddListener(conn.ID, msg.Client)
	return true
}
