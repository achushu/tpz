package judge

import (
	"strings"

	"github.com/achushu/libs/types"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/sockets"
)

func handleRegisterJudge(conn *sockets.Connection, msg sockets.Message) bool {
	ringID := msg.RingID
	ring := data.GetRing(ringID)
	if ring == nil {
		log.WsError("server/judge -", "could not find ring", ringID)
		return false
	}
	role := types.AssertString(msg.Params[0])
	if strings.Contains(role, "head") {
		ring.SetHeadJudge(conn.ID, msg.Client)
	} else {
		ring.AddJudge(conn.ID, msg.Client)
	}
	return true
}
