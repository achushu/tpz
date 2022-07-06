/* global WebSocket */
"use strict";
var Notify = (function () {
    /* ======== private methods ======== */
    let maxHeartbeat = 10000; // 10 seconds
    let host = window.document.location.host.replace(/:.*/, "");
    // Use Mozilla's WebSocket if available
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    let ws;
    let uri;
    let kaId = 0;
    let replyId = 0;

    // cache for restoration
    let onopen;
    let onmessage;

    /* ======== public methods ======== */
    function connect(socketURI, kwargs) {
        uri = socketURI;
        console.log("connecting to " + "ws://" + host + ":8000" + uri);
        ws = new WebSocket("ws://" + host + ":8000" + uri);
        ws.onerror = function (err) {
            console.log("websocket conn error to " + err.target.url);
        };
        ws.onclose = function (event) {
            console.log("websocket closed: code " + event.code);
        };
        if (kaId == 0) {
            // only set one keep-alive routine
            kaId = setInterval(keepAlive, maxHeartbeat);
        }

        if (kwargs != undefined && kwargs.onopen != undefined) {
            onopen = kwargs.onopen;
            ws.onopen = onopen
        } else if (onopen != undefined) {
            // add event handlers back in (on reconnect)
            ws.onopen = onopen;
        }
        if (kwargs != undefined && kwargs.onmessage != undefined) {
            onmessage = function (data) {
                if (replyId != 0) {
                    clearTimeout(replyId);
                }
                kwargs.onmessage(data);
            };
            ws.onmessage = onmessage;
        } else if (onmessage != undefined) {
            ws.onmessage = onmessage;
        } else {
            ws.onmessage = function (data) {
                console.log(data);
            };
        }
    }

    function close() {
        if (kaId != 0) {
            clearInterval(kaId);
        }
        ws.close();
    }

    function keepAlive() {
        if (!ws || ws.readyState == 3) {
            console.log("reconnecting...");
            connect(uri);
        }
    }

    async function send(msg) {
        let encoded = JSON.stringify(msg);
        console.log("send: " + encoded);
        /*
        // check if the connection is ready
        while (ws.readyState != 1) {
            await sleep(250);
        }
        */
        try {
            ws.send(encoded);
            replyId = setTimeout(function () {
                console.log("no reply...");
            }, 3000);
        } catch (err) {
            console.log("error sending message: " + err);
        }
    }

    /* ======== export public methods ======== */
    return {
        close: close,
        connect: connect,
        send: send
    };
})();
