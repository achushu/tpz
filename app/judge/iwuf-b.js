let maxScore = 10;
let pollId = 0;
let pollMode = false;
let ccId = 0;

judgeRuleset = "IWUF";

let notifyArgs = {
    onopen: () => {
        console.log("connected");
        registerJudge(ringId, "iwuf-b");
    },
    onmessage: (serverMsg) => {
        console.log(serverMsg);
        let msg = parseMessage(serverMsg.data);
        switch (msg.action) {
            default:
                handleCommonActions(msg);
                break;
        }
    },
};

window.onload = () => {
    TPZ.init();
    setClientId();
    prepareView();
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
            updateEventPanel();
        }
    }, 3000);
};

function prepareView() {
    clearView();
    setupEventPanel();
    setupScorePanel();
    initScratchPad();
    onCompetitorChange = updateEventPanel;
    onCompetitorChange();
}

function updateEventPanel() {
    updateEventInfo((data) => {
        renderScorePanel(currentEventRules);
        if (data.scores != undefined) {
            let saved = data.scores[clientId];
            if (saved != undefined) {
                TPZ.getElementById("score-entry").value = saved.score;
                disableScorePanel();
            }
        }
    });
}
