let maxScore = 10;
let pollId = 0;
let pollMode = false;
let ccId = 0;

let notifyArgs = {
    onopen: () => {
        console.log("connected");
        registerJudge(ringId, "scorer");
    },
    onmessage: (serverMsg) => {
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

function setNextCompetitorButton() {
    let publishBtn = TPZ.getElementById("head-publish-score");

    if (publishBtn.dataset.published != "true") {
        // this score hasn't been published yet
        // confirm we want to move on
        TPZ.confirm("Results not finalized! Continue?", () => {
            selectNextCompetitor();
        });
    } else {
        selectNextCompetitor();
    }
}

function selectNextCompetitor() {
    let compSelect = document.getElementById("competitor-select");
    let compIndex = compSelect.selectedIndex;
    let eventSelect = document.getElementById("event-select");
    let eventIndex = eventSelect.selectedIndex;

    if (compIndex < compSelect.length - 1) {
        compSelect.selectedIndex = compIndex + 1;
        compSelect.dispatchEvent(new Event("change"));
        if (
            compIndex == compSelect.length - 1 &&
            eventIndex == eventSelect.length - 1
        ) {
            nextButton.disabled = true;
        }
        return;
    }

    // move onto next event
    if (eventIndex < eventSelect.length - 1) {
        eventSelect.selectedIndex = eventIndex + 1;
        eventSelect.dispatchEvent(new Event("change"));
    } else {
        TPZ.alert("Finished!");
    }
}

function prepareView() {
    clearView();
    setupEventControlPanel();
    setupEventPanel();
    setupScorePanel();
    setupUSWUHeadScorePanel();
    initScratchPad();

    onEventChange = () => {
        TPZ.httpGetJson("/api/" + ringId + "/event", (data) => {
            // currentExp = data.event_exp;
        });
    };

    onCompetitorChange = () => {
        renderUSWUHeadScorePanel();
        renderScorePanel();
        // get previously saved state (if any)
        getScores();
    };

    // get the current event / competitor
    // or select the first event
    updateEventInfo((data) => {
        if (data.event_id != undefined) {
            renderScorePanel();
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
    addFinalScoreContainer();
    addPublishScoreButton();
}
