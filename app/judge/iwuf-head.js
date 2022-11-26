let maxScore = 3;
let pollId = 0;
let pollMode = false;
let ccId = 0;

judgeRuleset = "IWUF";

let notifyArgs = {
    onopen: () => {
        console.log("connected");
        registerJudge(ringId, "iwuf-head");
    },
    onmessage: (serverMsg) => {
        console.log(serverMsg);
        // Notify.send(event.data);
        // let msg = parseMessage(event.data);
        // handleCommonActions(msg);
    },
};

function getDeductions() {
    TPZ.httpGetJson("/api/" + ringId + "/get-deductions", displayDeductions);
}

function displayDeductions(data) {
    let dmap = data["deductions"];
    let dResults = dmap["result"];
    if (dResults != undefined) {
        let dList = TPZ.getElementById("deduction-results");
        dList.innerHTML = "";
        for (let i in dResults) {
            dList.innerHTML += dResults[i].code + "&nbsp;";
        }
    }
    for (let key in dmap) {
        if (key == "result") {
            continue;
        }
        let deductions = dmap[key];
        let dRow = TPZ.getElementById(key);
        if (dRow == undefined) {
            dRow = TPZ.renderHtml('<tr id="' + key + '"></tr>');
            let table = TPZ.getElementById("deduction-table");
            table.appendChild(dRow);
        }
        dRow.innerHTML = "";
        for (let i in deductions) {
            let d = deductions[i];
            let applied = "";
            if (d.applied) {
                applied = ' class="applied"';
            }
            let cell = TPZ.renderHtml("<td" + applied + ">" + d.code + "</td>");
            dRow.appendChild(cell);
        }
    }
}

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
    getDeductionId = setInterval(() => {
        getDeductions();
    }, 1000);

    prepareView();
};

function prepareView() {
    clearView();
    setupEventControlPanel();
    setupEventPanel();
    setupTimerPanel();
    setupScorePanel();
    setupIWUFHeadScorePanel();
    initScratchPad();

    onEventChange = () => {
        //TPZ.httpGetJson("/api/" + ringId + "/event", (data) => {});
    };

    onCompetitorChange = () => {
        renderIWUFHeadScorePanel();
        renderTimerPanel();
        renderScorePanel(currentEventRules);
        // get previously saved data (if any)
        getScores();
    };

    // get the current event / competitor
    // or select the first event
    updateEventInfo((data) => {
        if (data.event_id != undefined) {
            renderScorePanel(currentEventRules);
            if (data.scores != undefined) {
                let saved = data.scores[clientId];
                if (saved != undefined) {
                    TPZ.getElementById("score-entry").value = saved;
                    disableScorePanel();
                }
            }
            renderEventControlPanel(ringId, data.event_id, data.competitor_id);
        } else {
            renderEventControlPanel(ringId);
        }

        document.getElementById("next-competitor-button").onclick =
            setNextCompetitorButton;
    });
}

function setupIWUFHeadScorePanel() {
    setupHeadJudgePanel();
    renderIWUFHeadScorePanel();
}

function renderIWUFHeadScorePanel() {
    let headPanel = TPZ.getElementById("head-event-panel");
    headPanel.innerHTML = "";
    let acPanel = TPZ.renderHtml(
        'Deductions: <span id="deduction-results"></span>' +
            '<table id="deduction-table"><caption>Timeline</caption></table>' +
            '<p id="nandu-label">Nandu: </p><ul id="nandu-list"></ul>'
    );
    while (acPanel.length > 0) {
        headPanel.appendChild(acPanel[0]);
    }
    addScoreList();
    addAdjustmentPanel();
    addFinalScoreContainer();
    addPublishScoreButton();
}
