package sockets

import (
	"encoding/json"
	"sync"

	"github.com/achushu/libs/websocket"
	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
	"github.com/achushu/tpz/server/log"

	gorilla "github.com/gorilla/websocket"
)

type Connection struct {
	ID   string
	conn *gorilla.Conn
}

type Message struct {
	Timestamp int64         `json:"timestamp"`
	Client    string        `json:"client"`
	RingID    int           `json:"ring"`
	Action    string        `json:"action"`
	Params    []interface{} `json:"params"`
}

var (
	Manager *websocket.Manager
)

func init() {
	Manager = websocket.NewManager()
}

func NewConnection(ws *gorilla.Conn) *Connection {
	id := Manager.Add(ws)
	return &Connection{
		ID:   id,
		conn: ws,
	}
}

func CloseConnection(id string) {
	Manager.CloseConn(id)
}

func ConstructMessage(action Action, params []interface{}) ([]byte, error) {
	if params == nil {
		params = make([]interface{}, 0)
	}
	msg := Message{
		Action: action.String(),
		Client: "tpzserver",
		Params: params,
	}
	return json.Marshal(&msg)
}

func Notify(msg []byte, id string) (err error) {
	log.Ws(id, "send:", string(msg))
	go func() {
		err = Manager.Send(msg, id)
	}()
	return err
}

func NotifyHeadJudge(msg []byte, ringID int) error {
	ring := data.GetRing(ringID)
	if ring == nil {
		return errors.NewRingError(ringID)
	}
	if ring.HeadJudge() != nil {
		id := ring.HeadJudge().ConnID
		log.Ws(id, "send:", string(msg))
		go func() {
			err := Manager.Send(msg, id)
			if err != nil {
				log.WsError(ring.Name, " - could not message head judge")
			}
		}()
	} else {
		log.Ws("no head judge in", ring.Name)
	}
	return nil
}

func Broadcast(msg []byte, ringID int) error {
	log.Ws("broadcast to ring", ringID, ":", string(msg))
	ring := data.GetRing(ringID)
	if ring == nil {
		return errors.NewRingError(ringID)
	}
	go func() {
		var err error
		errs := errors.NewBroadcastError(ringID)
		var allSent sync.WaitGroup
		if ring.HeadJudge() != nil {
			allSent.Add(1)
			go func() {
				err = Manager.Send(msg, ring.HeadJudge().ConnID)
				if err != nil {
					log.WsError(ring.Name, " - could not broadcast to head judge")
					errs.AddError(err)
				}
				allSent.Done()
			}()
		}
		judges := ring.Judges()
		staleJudges := []string{}
		allSent.Add(len(judges))
		for _, j := range judges {
			go func(id string) {
				err = Manager.Send(msg, id)
				if err != nil {
					staleJudges = append(staleJudges, id)
					errs.AddError(err)
				}
				allSent.Done()
			}(j.ConnID)
		}
		ring.ReadDone()
		listeners := ring.Listeners()
		staleListeners := []string{}
		allSent.Add(len(listeners))
		for _, l := range listeners {
			go func(id string) {
				err = Manager.Send(msg, id)
				if err != nil {
					staleListeners = append(staleListeners, id)
					errs.AddError(err)
				}
				allSent.Done()
			}(l.ConnID)
		}
		ring.ReadDone()
		allSent.Wait()
		for _, v := range staleJudges {
			ring.RemoveJudge(v)
		}
		for _, v := range staleListeners {
			ring.RemoveListener(v)
		}
		if errs.Errors() > 0 {
			log.WsError(errs.Error())
		} else {
			log.Ws("broadcast complete")
		}
	}()
	return nil
}
