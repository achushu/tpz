package sockets

import (
	json "encoding/json"
	"net/http"
	"time"

	gorilla "github.com/gorilla/websocket"

	"github.com/achushu/tpz/server/log"
	"github.com/achushu/tpz/server/session"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 3 * time.Second

	// Maximum message size allowed from peer.
	maxMessageSize = 16384

	// Time allowed to read the next pong message from the peer.
	pongWait = 10 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
)

type OnMessage func(*Connection, Message)

func WSServer(w http.ResponseWriter, r *http.Request, msgCB OnMessage) {
	wsUpgrader := gorilla.Upgrader{}
	ws, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.WsError("error upgrading connection:", err)
		return
	}
	// manage this connection
	done := make(chan struct{})
	conn := NewConnection(ws)
	wsID := conn.ID
	defer func() {
		CloseConnection(wsID)
		close(done)
	}()
	log.Ws(r.RemoteAddr, "connected as", wsID)

	// configure this connection
	ws.SetReadLimit(maxMessageSize)
	ws.SetPongHandler(func(string) error {
		err := ws.SetReadDeadline(time.Now().Add(pongWait))
		return err
	})
	clientInit(w, r, wsID)
	go ping(ws, wsID, done)

	closed := false
	for !closed {
		_, data, err := ws.ReadMessage()
		if err == nil {
			// Do things
			go handleMessage(conn, data, msgCB)
		} else {
			// Log this error
			if _, ok := err.(*gorilla.CloseError); ok {
				log.Ws(wsID, "connection closed")
			} else {
				log.WsError(wsID, "connection failed:", err)
			}
			closed = true
		}
	}
}

func clientInit(w http.ResponseWriter, r *http.Request, connID string) bool {
	// check for device tag and send it as the client ID
	// create one for the client if they do not have one
	tag := session.GetTag(r)
	log.Ws("connection", connID, "belongs to client", tag)
	toSend, err := ConstructMessage(ClientInit, []interface{}{tag})
	if err != nil {
		log.WsError("error initializing client", err)
		return false
	}
	err = Notify(toSend, connID)
	if err != nil {
		log.WsError("error sending websockets message:", err)
		return false
	}
	return true
}

func handleMessage(conn *Connection, data []byte, msgCB OnMessage) {
	var msg Message

	log.Ws(conn.ID, "recv:", string(data))
	err := json.Unmarshal(data, &msg)
	if err != nil {
		log.WsError("error parsing message: ", err, "\nmsg: ", string(data))
		return
	}

	// call the OnMessage callback if provided
	if msgCB != nil {
		msgCB(conn, msg)
	}
}

func ping(ws *gorilla.Conn, id string, done chan struct{}) {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			if err := ws.WriteControl(gorilla.PingMessage, []byte{}, time.Now().Add(writeWait)); err != nil {
				log.WsError("ping:", err)
				// error occurred trying to ping the client, close connection
				CloseConnection(id)
				return
			}
		case <-done:
			return
		}
	}
}
