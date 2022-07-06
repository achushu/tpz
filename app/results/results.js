function sum(l) {
    let sum = 0;
    for (let i = 0; i < l.length; i += 1) {
        sum += l[i];
    }
    return sum;
}

function generateRankingsCSV(results) {
    let csv = window.open("", "_blank");
    let file = "<div>Event Name, Competitor Name, Final Score, Rank<div>";
    let currentEvent = 0;
    let currentRank = 1;
    for (let i = 0; i < results.length; i += 1) {
        let r = results[i];

        if (r.eid !== currentEvent) {
            currentEvent = r.eid;
            currentRank = 1;
        }

        file +=
            "<div>" +
            r.name +
            "," +
            r.first_name +
            " " +
            r.last_name +
            "," +
            atob(r.final_score) +
            "," +
            currentRank +
            "</div>";

        currentRank += 1;
    }

    csv.document.write("<div>" + file + "</div>");
}

function renderRankingsPanel(results) {
    $("#content").html('<ul id="results-list"></ul>');
    let rList = $("#results-list");
    let currentEvent = 0;
    let eventRankings;
    for (let i = 0; i < results.length; i += 1) {
        let r = results[i];
        if (r.eid !== currentEvent) {
            currentEvent = r.eid;
            let rankingListId = "event-" + r.eid;
            rList.append(
                "<li>" + r.name + '<ol id="' + rankingListId + '"></ol></li>'
            );
            eventRankings = $("#" + rankingListId);
        }
        let deductionsDisplay = "";
        if (r.deductions && r.deductions.length > 0) {
            deductionsDisplay =
                '<span class="col-3">' +
                JSON.stringify(r.deductions) +
                "</span>";
        }
        eventRankings.append(
            '<li><b class="col-2">' +
                r.first_name +
                " " +
                r.last_name +
                '</b><em class="col-1">' +
                atob(r.final_score) +
                '</em><span class="col-3">' +
                JSON.stringify(r.scores) +
                "</span>" +
                deductionsDisplay +
                '<em class="col-1">' +
                sum(r.scores) +
                "</em></li>"
        );
    }
}

$(document).ready(function() {
    $("#get-rankings-html-button").click(function() {
        $.get("/api/overall-rankings", function(data) {
            renderRankingsPanel(JSON.parse(data));
        });
    });
    $("#get-rankings-csv-button").click(function() {
        $.get("/api/overall-rankings", function(data) {
            generateRankingsCSV(JSON.parse(data));
        });
    });
});
