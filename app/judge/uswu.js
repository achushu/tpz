let maxScore = 10;
let pollId = 0;
let pollMode = false;
let ccId = 0;

let notifyArgs = {
    onopen: function () {
        console.log("connected");
        registerJudge(ringId, "uwsu");
    },
    onmessage: function (serverMsg) {
        console.log(serverMsg);
        let msg = parseMessage(serverMsg.data);
        switch (msg.action) {
            default:
                handleCommonActions(msg);
                break;
        }
    }
};

$(document).ready(function () {
    TPZ.init();
    setClientId();
    prepareView();
    Notify.connect("/judge/server", notifyArgs);

    // phone home for settings changes
    phoneHome();
    ccId = setInterval(function () {
        phoneHome();
    }, 15000);

    // allow for polling as fallback
    pollId = setInterval(function () {
        if (pollMode) {
            console.log("polling...");
            updateEventPanel();
        }
    }, 3000);
});

function prepareView() {
    clearView();
    setupEventPanel();
    setupScorePanel(maxScore);
    initScratchPad();
    onCompetitorChange = updateEventPanel;
    onCompetitorChange();
}

function updateEventPanel() {
    TPZ.httpGetJson("/api/" + ringId + "/current", function (data) {
        if (
            currentEventId == data.event_id &&
            currentCompetitorId == data.competitor_id
        )
            return;
        currentEventId = data.event_id;
        currentCompetitorId = data.competitor_id;
        displayCurrentEventInfo(
            data.event_name,
            formatName(data.fname, data.lname)
        );
        let ruleBase = getRuleBase(data.rules.split(" ")[0]);
        if (ruleBase === "USWU") {
            renderScorePanel(maxScore, data.event_exp);
            if (data.scores != undefined) {
                let saved = data.scores[clientId];
                if (saved != undefined) {
                    TPZ.getElementById("score-entry").value = saved;
                    disableScorePanel();
                }
            }
        } else {
            TPZ.getElementById("score-panel").textContent = "Not a USWU event";
        }
    });
}
