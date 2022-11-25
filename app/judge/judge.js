function listRings() {
    TPZ.httpGetJson("/api/get-rings", (data) => {
        for (let i in data) {
            let ring = data[i];
            let link = TPZ.renderHtml(
                '<p><a id="' + ring.id + '" href="#">' + ring.name + "</a></p>"
            );
            link.addEventListener("click", () => {
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
    let judgeOptions = [
        '<li><a href="' + ringId + '/uswu">USWU Judge</a></li>',
        '<li><a href="' + ringId + '/iwuf-a">IWUF A Judge</a></li>',
        '<li><a href="' + ringId + '/iwuf-b">IWUF B Judge</a></li>',
        '<li><a href="' + ringId + '/iwuf-c">IWUF C Judge</a></li>',
        '<li><a href="' + ringId + '/uswu-head">USWU Head Judge</a></li>',
        '<li><a href="' + ringId + '/iwuf-head">IWUF Head Judge</a></li>',
        '<li><a href="' + ringId + '/score-entry">Direct Score Entry</a></li>',
        //'<li><a href="#">Timekeeper</a></li>',
    ];

    TPZ.clearPanel();
    let typeList = document.createElement("UL");
    TPZ.appendToPanel(typeList);

    for (let i in judgeOptions) {
        typeList.appendChild(TPZ.renderHtml(judgeOptions[i]));
    }
}

function renderJudgeSelection(elementHtml, ringId, value) {
    let e = TPZ.renderHtml(elementHtml);
    e.addEventListener("click", () => {
        loadJudge(ringId, value);
    });
}

function loadJudge(ringId, judgeType) {
    alert("joining " + ringId + " as " + judgeType);
    /*
    Notify.connect()
    Notify.setOnMessage(() => {
        console.log("connected");
    });
    Notify.connect();
    */
}

window.onload = () => {
    TPZ.init();
    listRings();
};
