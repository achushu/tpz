let maxScore = 10;
let pollId = 0;
let pollMode = false;
let ccId = 0;

judgeRuleset = "USWU";

let notifyArgs = {
    onopen: () => {
        console.log("connected");
        registerJudge(ringId, "uswu-head");
    },
    onmessage: (serverMsg) => {
        console.log(serverMsg);
        let msg = parseMessage(serverMsg.data);
        // take role specific actions
        switch (msg.action) {
            case "submit-score":
                getScores();
                break;
            case "notify-competitor":
                // do nothing
                // XHR reaction to response takes care of it
                break;
            default:
                handleCommonActions(msg);
                break;
        }
    },
};

window.onload = () => {
    TPZ.init();
    setClientId();
    Notify.connect("/judge/server", notifyArgs);

    // phone home for settings changes
    phoneHome();
    ccId = setInterval(() => {
        phoneHome();
    }, 15000);

    // allow for polling as fallback
    pollId = setInterval(() => {
        if (pollMode) {
            console.log("polling...");
            getScores();
        }
    }, 3000);

    prepareView();
};

function prepareView() {
    clearView();
    setupEventControlPanel();
    setupEventPanel();
    setupTimerPanel();
    setupScorePanel();
    setupUSWUHeadScorePanel();
    initScratchPad();

    onEventChange = () => {
        //TPZ.httpGetJson("/api/" + ringId + "/event", (data) => {});
    };

    onCompetitorChange = () => {
        renderUSWUHeadScorePanel();
        renderTimerPanel();
        renderScorePanel(currentEventRules, currentExp);
        // get previously saved data (if any)
        getScores();
    };

    // get the current event / competitor
    // or select the first event
    updateEventInfo((data) => {
        if (data.event_id != undefined) {
            renderScorePanel(currentEventRules, currentExp);
            renderEventControlPanel(ringId, data.event_id, data.competitor_id);
        } else {
            renderEventControlPanel(ringId);
        }
        document.getElementById("next-competitor-button").onclick =
            setNextCompetitorButton;
    });
}

function setupUSWUHeadScorePanel() {
    setupHeadJudgePanel();
    renderUSWUHeadScorePanel();
}

function renderUSWUHeadScorePanel() {
    TPZ.getElementById("head-event-panel").innerHTML = "";
    addScoreList();
    addAdjustmentPanel();
    addFinalScoreContainer();
    addPublishScoreButton();
}
