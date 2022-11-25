// Enforce strict Javascript rules
"use strict";

let content = TPZ.getElementById("content");
let host;
let ws;
let clientId = "00000000";
let ringId;
let judgeRole;
let judgeRuleset;

let timerButton;
let timerInterval;
let currentEventId = 0;
let currentEventRules;
let currentExp;
let currentCompetitorId = 0;
let currentRoutineId = 0;
let eventStartTime;

let onEventChange;
let onCompetitorChange;

function setClientId() {
    let tag = TPZ.getAuthId();
    if (tag != undefined) {
        clientId = tag;
    }
}

function parseMessage(message) {
    console.log("recv: " + JSON.stringify(message));
    try {
        return JSON.parse(message);
    } catch (err) {
        return null;
    }
}

function notify(msg) {
    msg.client = clientId;
    msg.ring = parseInt(ringId);
    msg.timestamp = Date.now();
    Notify.send(msg);
}

let extractNumber = /^-?[0-9]+\.?[0-9]*$/;
function isNum(value) {
    let result = extractNumber.exec(value);
    if (result && result.length === 1) {
        return true;
    }
    return false;
}

function registerJudge(ringID, role) {
    notify({ action: "register-judge", params: [role] });
}

function phoneHome() {
    TPZ.httpGetJson("/api/get-settings", function (settings) {
        if (settings.poll === "true") {
            pollMode = true;
        } else {
            pollMode = false;
        }
    });
}

function getRuleBase(name) {
    let base = name.split(" ")[0].toUpperCase();
    let idx = base.indexOf("-2");
    if (idx > 0) {
        base = base.substring(0, idx);
    }
    return base;
}

function validateAdjustment(adj) {
    // Make sure the score is positive and below the max possible
    if (adj > -10 && adj < 10) {
        if (Math.trunc(adj * 10) % 1 === 0) {
            // Check that the score uses at most the tenths digit
            return true;
        } else if (Math.trunc(adj * 100) % 5 === 0) {
            // Allow for five-hundredths of a point (special cases)
            return true;
        }
    }
    return false;
}

function validateScore(scoreInput, maxScore) {
    let score = parseFloat(scoreInput);
    // Make sure the score is positive and below the max possible
    if (score && score > 0 && score < maxScore) {
        // Check that it at most only uses the tenths digit or five hundredths
        let scoreString = String(score);
        let decIdx = scoreString.indexOf(".");
        if (decIdx > 0) {
            let decimals = scoreString.substr(decIdx + 1);
            let decimalPlaces = decimals.length;
            if (decimalPlaces > 2) {
                return false;
            } else if (decimalPlaces == 2) {
                if (decimals.substr(-1) != "5") {
                    return false;
                }
            }
        }
        return true;
    }
    return false;
}

function adjustScore(amount, reason) {
    let adj = {
        amount: amount,
        reason: reason,
        judgeID: clientId,
        routineID: currentRoutineId,
        ringID: parseInt(ringId),
    };
    TPZ.httpPostJson("/api/submit-adjustment", adj, function () {
        getScores();
    });
}

function getScores() {
    // get latest score list
    TPZ.httpGetJson("/api/" + ringId + "/get-scores", function (data) {
        let scoreList = TPZ.getElementById("score-list");
        // Clear the list
        scoreList.innerHTML = "";
        let scoreCount = 0;
        for (let k in data.scores) {
            let score = data.scores[k];
            let item = TPZ.renderHtml("<li>" + score + "</li>");
            scoreList.appendChild(item);
            scoreCount += 1;
            // check for own submission
            if (k == clientId) {
                TPZ.getElementById("score-entry").value = score;
                disableScorePanel();
            }
        }
        TPZ.getElementById("score-count").textContent = scoreCount;
        let adjs = data.adjustments;
        if (adjs && adjs.length > 0) {
            // Reset the list
            let adjTotal = 0;
            TPZ.getElementById("adjustment-list").innerHTML = "";
            for (let i = 0; i < adjs.length; i += 1) {
                let adj = adjs[i];
                let item = TPZ.renderHtml(
                    "<li>" + adj.amount + " (" + adj.reason + ")</li>"
                );
                adjTotal -= adj.amount;
                TPZ.getElementById("adjustment-list").appendChild(item);
            }
            TPZ.getElementById("adjustment-label").textContent =
                "Adjustments: " + adjTotal;
        }
        let final = data.final;
        let calc = data.calc;
        if (final != undefined && final != "0.00") {
            TPZ.getElementById("final-score").textContent = final;
            setPublishedStatus();
        } else if (calc != undefined) {
            TPZ.getElementById("final-score-label").textContent =
                "Calculated: ";
            TPZ.getElementById("final-score").textContent = calc;
        }
    });
}

function finalizeScore() {
    let data = { ringID: parseInt(ringId) };
    TPZ.httpPostJson("/api/finalize-score", data, function () {
        setPublishedStatus();
    });
}

function setPublishedStatus() {
    TPZ.getElementById("final-score-label").textContent = "Final: ";
    let publishBtn = TPZ.getElementById("head-publish-score");
    publishBtn.dataset.published = "true";
    publishBtn.disabled = true;
}

function clearView() {
    content.innerHTML = "";
}

function setupEventControlPanel() {
    let panel = TPZ.renderHtml(
        '<div id="event-control-panel" class="row justify-content-between panel">' +
            '<div class="col-8">Select: <select id="event-select" class="col-5 custom-select"></select>' +
            '<span class="event-panel-spacing"/>' +
            '<select id="competitor-select" class="col-4 custom-select"></select></div>' +
            '<div class="col-3"><button id="next-competitor-button" class="btn btn-theme">Next Competitor</button></div></div>'
    );
    content.appendChild(panel);
}

function renderEventControlPanel(ringId, initEventId, initCompetitorId) {
    let eventSelect = TPZ.getElementById("event-select");
    let compSelect = TPZ.getElementById("competitor-select");
    compSelect.dataset.init = initCompetitorId;

    eventSelect.addEventListener("change", function () {
        let eventId = this.value;
        if (eventId === currentEventId) {
            return;
        }
        let change = { id: parseInt(eventId) };
        TPZ.httpPostJson("/api/" + ringId + "/change-event", change, () => {
            if (onEventChange != undefined) {
                onEventChange();
            }
            setCompetitorList();
            // event change means competitor change
            competitorChanged();
        });
    });
    compSelect.addEventListener("change", function () {
        let competitorId = parseInt(this.value);
        if (competitorId == currentCompetitorId) return;
        let eventId = parseInt(eventSelect.value);
        let change = { event_id: eventId, competitor_id: competitorId };
        TPZ.httpPostJson(
            "/api/" + ringId + "/change-competitor",
            change,
            function () {
                competitorChanged();
            }
        );
    });

    // get events in this ring
    TPZ.httpGetJson("/api/events-in-ring/" + ringId, function (eventList) {
        for (let i = 0; i < eventList.length; i += 1) {
            let event = eventList[i];
            let option = document.createElement("option");
            option.text = i + 1 + ". " + event.name;
            option.value = event.id;
            eventSelect.append(option);
        }

        if (initEventId != undefined && initEventId >= 0) {
            // resume event
            eventSelect.value = initEventId;
        } else {
            // select first event
            eventSelect.selectedIndex = 0;
        }
        eventSelect.dispatchEvent(new Event("change"));
    });
}

function setCompetitorList() {
    let compSelect = TPZ.getElementById("competitor-select");

    // get a new list of competitors
    TPZ.httpGetJson(
        "/api/" + ringId + "/event-competitors",
        function (compList) {
            for (let i = compSelect.length - 1; i >= 0; i -= 1) {
                compSelect.remove(i);
            }
            for (let i = 0; i < compList.length; i += 1) {
                let competitor = compList[i];
                let name =
                    i +
                    1 +
                    ". " +
                    formatName(competitor.first_name, competitor.last_name);
                let option = document.createElement("option");
                option.text = name;
                option.value = competitor.id;
                compSelect.append(option);
            }
            let initCompetitorId = parseInt(compSelect.dataset.init);
            if (initCompetitorId != undefined && initCompetitorId >= 0) {
                // resume
                compSelect.value = initCompetitorId;
                compSelect.dataset.init = "-1";
                compSelect.dispatchEvent(new Event("change"));
            } else {
                // select first competitor
                compSelect.selectedIndex = 0;
            }
        }
    );
}

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

function leftPadNumber(number, digits) {
    return ("0".repeat(digits) + number).slice(-1 * digits);
}

function formatTime(elapsed) {
    return (
        elapsed.getMinutes() +
        ":" +
        leftPadNumber(elapsed.getSeconds(), 2) +
        ":" +
        leftPadNumber(Math.trunc(elapsed.getMilliseconds() / 10), 2)
    );
}

function renderTimerPanel() {
    TPZ.getElementById("timer-panel").innerHTML =
        '<div class="col-2"><button id="timer-button" class="btn btn-info">Start Timer</button></div>' +
        '<div class="col-2">Time: <span id="timer">0:00:00</span></div>' +
        "</div>";
    timerButton = TPZ.getElementById("timer-button");
    timerButton.addEventListener("click", startEventTimer);
}

function startEventTimer() {
    // TODO: Take latency into account (iff a Timekeeper is managing the clock)
    // Head judge's clock should always start immediately on click
    eventStartTime = new Date();
    let timerElement = TPZ.getElementById("timer");
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(function () {
        let elapsed = new Date(Date.now() - eventStartTime);
        timerElement.textContent = formatTime(elapsed);
    }, 50);
    timerButton.removeEventListener("click", startEventTimer);
    timerButton.textContent = "Stop Timer";
    timerButton.addEventListener("click", stopEventTimer);
}

function stopEventTimer() {
    // TODO: Make each click add the latest time to the display
    clearInterval(timerInterval);
    let elapsed = new Date(Date.now() - eventStartTime);
    TPZ.getElementById("timer").textContent = formatTime(new Date(elapsed));
}

function setupTimerPanel() {
    let panel = TPZ.renderHtml(
        '<div id="timer-panel" class="row panel"></div>'
    );
    content.appendChild(panel);
    renderTimerPanel();
}

function setupHeadJudgePanel() {
    let panel = TPZ.renderHtml(
        '<div id="head-event-panel" class="panel"></div>'
    );
    content.appendChild(panel);
}

function setupEventPanel() {
    let panel = TPZ.renderHtml(
        '<div id="event-panel" class="panel">Now: <b id="current-event"></b> - <b id="current-competitor"></b></div>'
    );
    content.append(panel);
}

function setupScorePanel() {
    let panel = TPZ.renderHtml('<div id="score-panel" class="panel"></div>');
    content.append(panel);
    renderScorePanel();
}

function renderScorePanel(ruleset, exp) {
    let maxScore = 10;

    // if the event's ruleset matches the judge's scoring type
    let correctRuleset = false;

    if (judgeRuleset != undefined && ruleset != undefined) {
        switch (judgeRuleset) {
            case "IWUF":
                // IWUF includes A-B compulsory scoring
                maxScore = 5;
                if (ruleset.startsWith("IWUF")) {
                    correctRuleset = true;
                    if (ruleset === "IWUF") {
                        // strictly IWUF with difficulty scoring
                        maxScore = 3;
                    }
                }
                break;
            case "USWU":
                if (ruleset === "USWU") {
                    correctRuleset = true;
                }
                break;
        }
    }

    TPZ.getElementById("score-panel").innerHTML =
        '<p id="scoring-warning"></p>' +
        'Score: <div><input id="score-entry" type="text" class="score-input" />' +
        " / " +
        maxScore +
        ' <button id="score-submit" class="btn btn-theme">Submit</div>' +
        '<div><p id="score-hint"></p></div>';

    if (!correctRuleset) {
        TPZ.getElementById("scoring-warning").textContent =
            "Not a " + judgeRuleset + " event!";
    }

    if (exp != undefined) {
        let hint = "";
        if (exp == "beg") {
            hint = "(6.0 - 7.0)";
        } else if (exp == "int") {
            hint = "(7.0 - 8.0)";
        } else if (exp == "adv") {
            hint = "(8.0 - 10.0)";
        }
        TPZ.getElementById("score-hint").textContent = hint;
    }

    TPZ.getElementById("score-submit").addEventListener("click", function () {
        let score = TPZ.getElementById("score-entry").value;
        if (validateScore(score, maxScore)) {
            TPZ.confirm("Submit " + score + "?", function () {
                let scorecard = {
                    score: parseFloat(score),
                    judgeID: clientId,
                    ringID: parseInt(ringId),
                };
                TPZ.httpPostJson("/api/submit-score", scorecard);
                disableScorePanel();
            });
        } else {
            TPZ.alert("Please check the score entered.");
        }
    });
}

function addScoreList() {
    let headPanel = TPZ.getElementById("head-event-panel");
    let scoreList = TPZ.renderHtml(
        'Scores submitted (<span id="score-count">0</span>): <ul id="score-list"></ul>'
    );
    while (scoreList.length > 0) {
        headPanel.appendChild(scoreList[0]);
    }
}

function addAdjustmentPanel() {
    let eventPanel = TPZ.getElementById("head-event-panel");
    let adjPanel = TPZ.renderHtml(
        '<div id="adjustment-panel">' +
            '<p id="adjustment-label"></p><ul id="adjustment-list"></ul>' +
            'Add adjustment: <span id="adjust-minus">&nbsp;-&nbsp;</span><input id="score-adjustment" type="text" class="score-input"/> ' +
            'Reason: <input id="adjustment-reason" type="text" /> ' +
            '<button id="add-adj-button" class="btn btn-secondary">Add</button></div>'
    );
    eventPanel.appendChild(adjPanel);
    TPZ.addBreak(eventPanel);
    TPZ.getElementById("add-adj-button").onclick = () => {
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
}

function addFinalScoreContainer() {
    let eventPanel = TPZ.getElementById("head-event-panel");
    let finalScoreContainer = TPZ.renderHtml(
        '<div id="final-score-container">' +
            '<span id="final-score-label"></span><span id="final-score"></span></div>'
    );
    eventPanel.appendChild(finalScoreContainer);
}

function addPublishScoreButton() {
    let eventPanel = TPZ.getElementById("head-event-panel");
    let publishScoreBtn = TPZ.renderHtml(
        '<button id="head-publish-score" class="btn btn-theme">Publish Score</button>'
    );
    eventPanel.append(publishScoreBtn);
    TPZ.getElementById("head-publish-score").onclick = () => {
        let adj = TPZ.getElementById("score-adjustment");
        let reason = TPZ.getElementById("adjustment-reason");
        if (adj.value != "" || reason.value != "") {
            TPZ.alert("Please submit or clear the adjustment!");
        } else {
            TPZ.confirm("Publish results?", finalizeScore);
        }
    };
}

function disableScorePanel() {
    TPZ.getElementById("score-entry").disabled = true;
    TPZ.getElementById("score-submit").disabled = true;
}

function formatName(first, last) {
    if (first == undefined || last == undefined) {
        return undefined;
    }
    return first + " " + last;
}

function onGetCurrentStatusReady(data) {
    if (currentRoutineId == data.routine_id) return;
    if (data.event_id != undefined) {
        currentEventId = data.event_id;
        currentExp = data.event_exp;
        currentCompetitorId = data.competitor_id;
        currentRoutineId = data.routine_id;
        TPZ.getElementById("current-event").textContent = data.event_name;
        TPZ.getElementById("current-competitor").textContent = formatName(
            data.fname,
            data.lname
        );
        currentEventRules = getRuleBase(data.rules);
    }
}

function updateEventInfo(onReady, async = true) {
    TPZ.httpGetJson(
        "/api/" + ringId + "/current",
        (data) => {
            onGetCurrentStatusReady(data);
            if (onReady) {
                onReady(data);
            }
        },
        async
    );
}

function handleCommonActions(msg) {
    switch (msg.action) {
        case "init":
            clientId = msg.params[0];
            break;
        case "notify-competitor":
            competitorChanged();
            break;
        default:
            break;
    }
}

function competitorChanged() {
    // clear out the start time
    eventStartTime = undefined;
    updateEventInfo(undefined, false);
    if (onCompetitorChange) {
        onCompetitorChange();
    }
}
