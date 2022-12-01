// Enforce strict Javascript rules
"use strict";

let clientId = "00000000";
let ringId;
let currentEventId;
let currentCompetitorId;
let ruleset;
let pollId = 0;
let pollMode = false;
let ccId = 0;

let notifyArgs = {
    onopen: function () {
        console.log("connected");
        notify({ action: "register-display", params: [ringId] });
    },
    onmessage: function (serverMsg) {
        let msg = parseMessage(serverMsg.data);
        switch (msg.action) {
            case "init":
                clientId = msg.params[0];
                break;
            case "notify-competitor":
                // Only change the event name when the competitor has been selected
                setInfo();
                break;
            case "notify-final-score":
                setInfo();
                break;
            default:
                break;
        }
    },
};

// TODO: Unify with judge/common.js

function formatName(first, last) {
    return first + " " + last;
}

function getRuleBase(name) {
    let base = name.toUpperCase();
    let idx = base.indexOf("-2");
    if (idx > 0) {
        base = base.substring(0, idx);
    }
    return base;
}

$(document).ready(function () {
    TPZ.init();

    let tag = TPZ.getAuthId();
    if (tag != undefined) {
        clientId = tag;
    }

    let urlParams = new URLSearchParams(window.location.search);
    let ringParam = urlParams.get("ringID");
    if (ringParam != undefined) {
        ringId = parseInt(ringParam);
    }
    if (ringId == undefined) {
        listRings();
    } else {
        init();
        prepareView();
        Notify.connect("/display/server", notifyArgs);

        // phone home for settings changes
        phoneHome();
        ccId = setInterval(function () {
            phoneHome();
        }, 15000);

        // allow for polling as fallback
        pollId = setInterval(function () {
            if (pollMode) {
                console.log("polling...");
                setInfo();
            }
        }, 3000);
    }
});

function phoneHome() {
    TPZ.httpGetJson("/api/get-settings", function (settings) {
        if (settings.poll === "true") {
            pollMode = true;
        } else {
            pollMode = false;
        }
    });
}

function listRings() {
    TPZ.httpGetJson("/api/get-rings", function (data) {
        for (let i in data) {
            let ring = data[i];
            let link = TPZ.renderHtml(
                '<p><a href="?ringID=' +
                    ring.id +
                    '" id="' +
                    ring.id +
                    '" href="#">' +
                    ring.name +
                    "</a></p>"
            );
            TPZ.appendToPanel(link);
        }
    });
}

// TODO: Refactor notify to a shared library (maybe an object with ringId)
function notify(msg) {
    msg.client = clientId;
    msg.ring = ringId;
    msg.timestamp = Date.now();
    Notify.send(msg);
}

function parseMessage(message) {
    console.log("recv: " + JSON.stringify(message));
    try {
        return JSON.parse(message);
    } catch (err) {
        return null;
    }
}

let footer;
let rankDisplay;
let finalScoreDisplay;
let AScore;
let AScoreBreakdown;
let BScore;
let BScoreBreakdown;
let CScore;
let CScoreBreakdown;
let Adjs;
let AdjsBreakdown;

function clearScores() {
    finalScoreDisplay.textContent = "";
    rankDisplay.textContent = "";
    AScore.textContent = "";
    BScore.textContent = "";
    CScore.textContent = "";
    Adjs.textContent = "";
    AScoreBreakdown.textContent = "";
    BScoreBreakdown.textContent = "";
    CScoreBreakdown.textContent = "";
    AdjsBreakdown.textContent = "";
}

function prepareView() {
    // Remove extraneous elements
    TPZ.getElementById("header").textContent = "";
    $("#user-panel").css("opacity", "0%");
    $(".navbar-brand").css("opacity", "0.3");
    TPZ.httpGet("/api/competition-name", function (data) {
        TPZ.getElementById("competition-name").textContent = data;
    });
    setInfo();
}

function init() {
    // Setup the view
    TPZ.getElementById("content").innerHTML =
        '<div class="row align-items-start justify-content-start">' +
        '<span id="event-name" class="display-4"></span></div>' +
        '<div class="row align-items-center justify-content-center">' +
        '<span id="competitor-name" class="display-2">-</span></div>' +
        '<div class="row align-items-center justify-content-center">' +
        '<p><span id="score"></span></p></div>' +
        '<div class="row align-items-center justify-content-start">' +
        '<div class="col-1"></div>' +
        '<div id="a-score" class="col-3 display-smaller"></div>' +
        '<div id="deductions" class="col-5 display-smaller"></div></div>' +
        '<div class="row align-items-center justify-content-start">' +
        '<div class="col-1"></div>' +
        '<div id="b-score" class="col-3 display-smaller"></div>' +
        '<span id="score-breakdown" class="col-5 display-smaller"></span></div>' +
        '<div class="row align-items-center justify-content-start">' +
        '<div class="col-1"></div>' +
        '<div id="c-score" class="col-3 display-smaller"></div>' +
        '<span id="nandu-breakdown" class="col-5 display-smaller"></span></div>' +
        '<div class="row align-items-center justify-content-start">' +
        '<div class="col-1"></div>' +
        '<div id="adjs" class="col-3 display-smaller"></div>' +
        '<span id="adj-breakdown" class="col-5 display-smaller"></span></div>' +
        '<footer class="row footer justify-content-between">' +
        '<span id="ondeck-label" class="col-6 display-smaller">ON DECK: <span id="ondeck-name">-</span></span>' +
        '<span id="prepare-label" class="col-6 display-smaller">PREPARE: <span id="prepare-name">-</span></span>' +
        "</footer>" +
        '<div id="rank-container" class="float-center-container"><span id="rank" class="float-center display-smaller"></span></div>';

    finalScoreDisplay = TPZ.getElementById("score");
    AScore = TPZ.getElementById("a-score");
    AScoreBreakdown = TPZ.getElementById("deductions");
    BScore = TPZ.getElementById("b-score");
    BScoreBreakdown = TPZ.getElementById("score-breakdown");
    CScore = TPZ.getElementById("c-score");
    CScoreBreakdown = TPZ.getElementById("nandu-breakdown");
    Adjs = TPZ.getElementById("adjs");
    AdjsBreakdown = TPZ.getElementById("adj-breakdown");
    footer = $(".footer");
    rankDisplay = TPZ.getElementById("rank");
}

function setInfo() {
    TPZ.httpGetJson("/api/" + ringId + "/display-info", function (data) {
        // check if names should be changed
        if (
            currentEventId != data.event_id ||
            currentCompetitorId != data.competitor_id
        ) {
            currentEventId = data.event_id;
            currentCompetitorId = data.competitor_id;
            // clear names
            TPZ.getElementById("event-name").textContent = "";
            TPZ.getElementById("competitor-name").textContent = "";
            TPZ.getElementById("ondeck-name").textContent = "";
            TPZ.getElementById("prepare-name").textContent = "";

            if (data.event_id == undefined) return;
            TPZ.getElementById("event-name").textContent = data.event_name;
            TPZ.getElementById("competitor-name").textContent = formatName(
                data.current.fname,
                data.current.lname
            );
            ruleset = data.rules;
            var next, prepare;
            if (data.next != undefined) {
                next = formatName(data.next.fname, data.next.lname);
            }
            if (data.prepare != undefined) {
                prepare = formatName(data.prepare.fname, data.prepare.lname);
            }
        }
        // set scores
        TPZ.httpGetJson("/api/" + ringId + "/get-scores", function (scoreInfo) {
            if (scoreInfo.final != undefined && scoreInfo.final != "0.00") {
                // we have a final score, go to score mode
                displayScoresMode(scoreInfo);
            } else {
                clearScores();
                displayNamesMode(next, prepare);
            }
        });
    });
}

function displayNamesMode(next, prepare) {
    if (next != undefined) {
        TPZ.getElementById("ondeck-name").textContent = next;
    }
    if (prepare != undefined) {
        TPZ.getElementById("prepare-name").textContent = prepare;
    }
    footer.css("opacity", "100%");
}

function displayScoresMode(scoreInfo) {
    footer.css("opacity", "0%");
    let ruleBase = getRuleBase(ruleset.split(" ")[0]);
    let finalScore = scoreInfo.final;
    finalScoreDisplay.textContent = finalScore;
    let scoreBreakdown = scoreInfo.scores;
    let bDisplay = [];
    for (let i in scoreBreakdown) {
        bDisplay.push(scoreBreakdown[i].score.toFixed(2));
    }
    BScoreBreakdown.textContent = bDisplay.join(", ");
    if (ruleBase != "USWU") {
        AScore.textContent = "A: " + scoreInfo.components["a"].toFixed(2);
        BScore.textContent = "B: " + scoreInfo.components["b"].toFixed(2);

        // get deductions
        displayDeductions();
        if (ruleBase == "IWUF") {
            CScore.textContent = "C: " + scoreInfo.components["c"].toFixed(2);
            // get nandu
            displayNandu();
        }
    }

    // get adjustments
    displayAdjustments(scoreInfo.adjustments);

    // get current rank
    displayRank(finalScore);
}

function displayAdjustments(adjustments) {
    if (adjustments && adjustments.length > 0) {
        Adjs.textContent = "Adjustments: ";
        let adjDisplay = [];
        for (let i = 0; i < adjustments.length; i += 1) {
            let a = adjustments[i];
            adjDisplay.push(a.amount + " (" + a.reason + ")");
        }
        AdjsBreakdown.innerHTML = adjDisplay.join(", ");
    }
}

function displayDeductions() {
    TPZ.httpGetJson("/api/" + ringId + "/get-deductions", function (data) {
        let deductions = data.deductions.result;
        let list = [];
        for (let i in deductions) {
            list.push(deductions[i]["code"]);
        }
        AScoreBreakdown.textContent = list.join(", ");
    });
}

function displayNandu() {
    TPZ.httpGetJson("/api/" + ringId + "/get-nandu-scores", function (data) {
        CScoreBreakdown.textContent = data.result
            .replace(/o/gi, "o ")
            .replace(/x/gi, "x ");
    });
}

function displayRank(finalScore) {
    TPZ.httpGetJson("/api/event-ranks/" + currentEventId, function (rows) {
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (row.final_score == finalScore) {
                // display rank
                let rank = row.rank;
                rankDisplay.textContent = "Rank: " + rank;
                break;
            }
        }
    });
}
