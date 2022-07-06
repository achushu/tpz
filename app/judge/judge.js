function listRings() {
    TPZ.httpGetJson("/api/get-rings", function (data) {
        for (let i in data) {
            let ring = data[i];
            let link = TPZ.renderHtml(
                '<p><a id="' + ring.id + '" href="#">' + ring.name + "</a></p>"
            );
            link.addEventListener("click", function () {
                joinRing(ring.id);
            });
            TPZ.appendToPanel(link);
        }
    });
}

function joinRing(id) {
    displayJudgeSelection(id);
}

function displayJudgeSelection(ringId) {
    TPZ.clearPanel();
    let typeList = document.createElement("UL");
    TPZ.appendToPanel(typeList);
    let judge = TPZ.renderHtml(
        '<li><a href="' + ringId + '/uswu">USWU Judge</a></li>'
    );
    typeList.appendChild(judge);
    judge = TPZ.renderHtml(
        '<li><a href="' + ringId + '/uswu-head">USWU Head Judge</a></li>'
    );
    typeList.appendChild(judge);
    // judge = TPZ.renderHtml('<li><a href="#">Timekeeper</a></li>');
    // typeList.appendChild(judge);
}

function renderJudgeSelection(elementHtml, ringId, value) {
    let e = TPZ.renderHtml(elementHtml);
    e.addEventListener("click", function () {
        loadJudge(ringId, value);
    });
}

function loadJudge(ringId, judgeType) {
    alert("joining " + ringId + " as " + judgeType);
    /*
    Notify.connect()
    Notify.setOnMessage(function () {
        console.log("connected");
    });
    Notify.connect();
    */
}

$(document).ready(function () {
    TPZ.init();
    listRings();
});
