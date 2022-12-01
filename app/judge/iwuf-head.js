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
        let msg = parseMessage(serverMsg.data);
        // take role specific actions
        switch (msg.action) {
            case "submit-score":
                getScores();
                break;
            case "submit-deductions":
                getDeductions();
                break;
            case "submit-nandu":
                getNanduScores();
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

function getDeductions() {
    TPZ.httpGetJson("/api/" + ringId + "/get-deductions", displayDeductions);
}

function getNanduScores() {
    TPZ.httpGetJson("/api/" + ringId + "/get-nandu-scores", displayNandu);
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
        // sort the deductions by time
        deductions.sort((a, b) => {
            return a.timestamp < b.timestamp ? -1 : 1;
        });
        for (let i in deductions) {
            let d = deductions[i];
            let cell = TPZ.renderHtml("<td>" + d.code + "</td>");
            dRow.appendChild(cell);
            if (d.applied) {
                cell.classList.add("applied");
            }
        }
    }
}

function displayNandu(data) {
    let marks = data["marks"];
    let table = TPZ.getElementById("nandu-results");
    table.innerHTML = "";
    for (let judge in marks) {
        let row = TPZ.renderHtml("<tr></tr>");
        let submittedNandu = marks[judge];
        for (let i in submittedNandu) {
            if (submittedNandu[i]) {
                row.appendChild(
                    TPZ.renderHtml('<td class="nandu-success">&#x2705;</td>')
                );
            } else {
                row.appendChild(
                    TPZ.renderHtml('<td class="nandu-fail">&#x274C;</td>')
                );
            }
        }
        table.appendChild(row);
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
            getDeductions();
            getNanduScores();
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
    setupIWUFHeadScorePanel();
    initScratchPad();

    onEventChange = () => {
        //TPZ.httpGetJson("/api/" + ringId + "/event", (data) => {});
    };

    onCompetitorChange = (data) => {
        renderIWUFHeadScorePanel();
        renderTimerPanel();
        renderScorePanel(currentEventRules);
        // get previously saved data (if any)
        getScores();
        if (data != undefined) {
            let ns = data.nandusheet;
            if (ns != undefined) {
                let codes = [];
                codes.push(...splitNanduSegment(ns.segment1));
                codes.push(...splitNanduSegment(ns.segment2));
                codes.push(...splitNanduSegment(ns.segment3));
                codes.push(...splitNanduSegment(ns.segment4));

                let nanduCodes = TPZ.getElementById("nandu-codes");
                for (i in codes) {
                    let cell = TPZ.renderHtml("<th>" + codes[i] + "</th>");
                    nanduCodes.appendChild(cell);
                }
            }
        }
        getDeductions();
        getNanduScores();
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

function splitNanduSegment(seg) {
    if (seg == "") {
        return [];
    }
    // break down a section of nandu codes into individual components
    // replace all separators with commas and split on the commas
    // (String.replaceAll() may be a bit too new for some clients...)
    seg = seg.replace(/\+/gi, ",");
    seg = seg.replace(/\(/gi, ",(");
    return seg.split(",");
}

function setupIWUFHeadScorePanel() {
    setupHeadJudgePanel();
    renderIWUFHeadScorePanel();
}

function renderIWUFHeadScorePanel() {
    let headPanel = TPZ.getElementById("head-event-panel");
    headPanel.innerHTML = "";
    let deductionsPanel = TPZ.renderHtml(
        'Deductions: <span id="deduction-results"></span>' +
            '<table id="deduction-table"><caption>Timeline</caption></table>'
    );
    while (deductionsPanel.length > 0) {
        headPanel.appendChild(deductionsPanel[0]);
    }
    if (currentEventRules == "IWUF") {
        let nanduPanel = TPZ.renderHtml(
            '<p id="nandu-label">Nandu: </p><ul id="nandu-list"></ul>' +
                '<table id="nandu-table"><thead><tr id="nandu-codes"></tr></thead>' +
                '<tbody id="nandu-results"></tbody></table>'
        );
        while (nanduPanel.length > 0) {
            headPanel.appendChild(nanduPanel[0]);
        }
    }
    addScoreList();
    addAdjustmentPanel();
    addFinalScoreContainer();
    addPublishScoreButton();
}
