let maxScore = 10;
let currentExp;
let pollId = 0;
let pollMode = false;
let ccId = 0;

let notifyArgs = {
    onopen: function () {
        console.log("connected");
        registerJudge(ringId, "uswu-head");
    },
    onmessage: function (serverMsg) {
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
    }
};

$(document).ready(function () {
    TPZ.init();
    setClientId();
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
            getScores();
        }
    }, 3000);

    prepareView();
});

function setNextCompetitorButton() {
    let publishBtn = TPZ.getElementById("head-publish-score");

    if (publishBtn.dataset.published != "true") {
        // this score hasn't been published yet
        // confirm we want to move on
        TPZ.confirm("Results not finalized! Continue?", function () {
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
    setupTimerPanel();
    setupScorePanel(maxScore);
    setupUSWUHeadScorePanel();
    initScratchPad();

    onEventChange = function () {
        TPZ.httpGetJson("/api/" + ringId + "/event", function (data) {
            currentExp = data.event_exp;
        });
    };

    onCompetitorChange = function () {
        renderUSWUHeadScorePanel();
        renderTimerPanel();
        renderScorePanel(maxScore, currentExp);
        // get previously saved state (if any)
        getScores();
    };

    // get the current event / competitor
    // or select the first event
    TPZ.httpGetJson("/api/" + ringId + "/current", function (data) {
        if (data.event_name != undefined) {
            displayCurrentEventInfo(
                data.event_name,
                formatName(data.fname, data.lname)
            );
            let ruleBase = getRuleBase(data.rules.split(" ")[0]);
            if (ruleBase === "USWU") {
                renderScorePanel(maxScore, data.event_exp);
            } else {
                TPZ.getElementById("score-panel").text("Not a USWU event");
            }
        }
        if (data.event_id != undefined) {
            renderEventControlPanel(ringId, data.event_id, data.competitor_id);
        } else {
            renderEventControlPanel(ringId);
        }

        document.getElementById("next-competitor-button").onclick =
            setNextCompetitorButton;
    });
}

function setupUSWUHeadScorePanel() {
    content.append('<div id="head-event-panel" class="panel"></div>');
    renderUSWUHeadScorePanel();
}

function renderUSWUHeadScorePanel() {
    TPZ.getElementById("head-event-panel").innerHTML =
        'Scores submitted (<span id="score-count">0</span>): <ul id="score-list"></ul>' +
        '<div id="adjustment-panel">' +
        '<p id="adjustment-label"></p><ul id="adjustment-list"></ul>' +
        'Add adjustment: <span id="adjust-minus">&nbsp;-&nbsp;</span><input id="score-adjustment" type="text" class="score-input"/> ' +
        'Reason: <input id="adjustment-reason" type="text" /> ' +
        '<button id="add-adj-button" class="btn btn-secondary">Add</button></div><br/>' +
        '<div id="final-score-container">' +
        '<span id="final-score-label"></span><span id="final-score"></span></div>' +
        '<button id="head-publish-score" class="btn btn-theme">Publish Score</button>';
    TPZ.getElementById("add-adj-button").onclick = function () {
        let adj = TPZ.getElementById("score-adjustment");
        let adjValue = parseFloat(adj.value);
        if (validateAdjustment(adjValue)) {
            let reason = TPZ.getElementById("adjustment-reason");
            adjustScore(adjValue, reason.value);
            adj.value = "";
            reason.value = "";
        } else {
            TPZ.alert("Please check the adjustment entered.");
        }
    };
    TPZ.getElementById("head-publish-score").onclick = function () {
        let adj = TPZ.getElementById("score-adjustment");
        let reason = TPZ.getElementById("adjustment-reason");
        if (adj.value != "" || reason.value != "") {
            TPZ.alert("Please submit or clear the adjustment!");
        } else {
            TPZ.confirm("Publish results?", finalizeScore);
        }
    };
}
