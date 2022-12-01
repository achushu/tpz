judgeRuleset = "IWUF";

let currentEventName;

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
    Notify.connect("/judge/server", notifyArgs);
    prepareView();
};

function prepareView() {
    clearView();
    setupEventPanel();
    setupNanduPanel();
    initScratchPad();
    onCompetitorChange = () => {
        updateEventInfo((data) => {
            currentEventName = data.event_name;
            if (currentEventRules === "IWUF-AB") {
                $("#nandu-panel").text("No C judge for this event");
            } else if (currentEventRules !== "IWUF") {
                $("#nandu-panel").text("Not an IWUF event");
            } else {
                let ns = [
                    data.nandusheet["segment1"],
                    data.nandusheet["segment2"],
                    data.nandusheet["segment3"],
                    data.nandusheet["segment4"],
                ];
                renderNanduPanel(ns);
            }
        });
    };
    onCompetitorChange();
}

let nanduNum = 0;
function renderNanduPanel(nandusheet) {
    TPZ.getElementById("nandu-panel").innerHTML =
        "<p>Click skill to toggle success / failure</p>" +
        '<div id="nandu-sheet"></div>' +
        '<button type="button" class="btn btn-primary" id="score-submit">Submit</button>';
    for (let i in nandusheet) {
        // Create the table describing the form section
        let sId = parseInt(i) + 1;
        let sectionTable = TPZ.renderHtml(
            '<table class="table nandu" id="' +
                sId +
                '"><thead><tr><td class="nandu-code"/><td>S' +
                sId +
                '</td><td class="nandu-mark"/></tr></thead><tbody></tbody></table>'
        );
        TPZ.getElementById("nandu-sheet").append(sectionTable);

        // Add the nandu for this section
        let combos = parseNanduString(nandusheet[i]);
        combos.forEach((val) => {
            if (val === undefined || val === "") {
                return;
            }
            let combo = parseNanduCombo(val);
            let nanduId = "n" + nanduNum;
            nanduNum += 1;
            let baseNandu = createNanduComponent(
                nanduId,
                combo.base.code,
                combo.base.name
            );
            sectionTable.appendChild(baseNandu);
            // Add in any connections
            for (let j in combo.connections) {
                nanduId = "n" + nanduNum;
                nanduNum += 1;
                let nanduConn = createNanduComponent(
                    nanduId,
                    combo.connections[j].code,
                    combo.connections[j].name
                );
                sectionTable.appendChild(nanduConn);
            }
        });
    }

    $("#score-submit").click(() => {
        TPZ.confirm("Submit results?", () => {
            // tally the results
            let results = [];
            let components = document.getElementsByClassName("nandu-component");
            for (let i = 0; i < components.length; i++) {
                let c = components[i];
                if (
                    c.dataset.success === undefined ||
                    c.dataset.success === "true"
                ) {
                    // consider an unmarked skill to be a success
                    results.push(true);
                } else {
                    results.push(false);
                }
            }
            let scorecard = {
                routineID: currentRoutineId,
                judgeID: clientId,
                result: results,
                ringID: parseInt(ringId),
            };
            TPZ.httpPostJson("/api/submit-nandu", scorecard, () => {
                $(".nandu-mark").attr("disabled", true);
                $("#score-submit").attr("disabled", true);
            });
        });
    });
}

function createNanduComponent(id, code, name) {
    let n = TPZ.renderHtml(
        '<tr id="' +
            id +
            '" class="nandu-component"><th scope="row" class="nandu-code">' +
            code +
            '</th><td class="nandu-name">' +
            name +
            '</td><td class="nandu-mark"></td></tr>'
    );
    n.addEventListener("click", () => {
        // Store completion success as a data value
        let success = n.dataset.success;
        if (success === undefined) {
            success = true;
        } else {
            success = !(success === "true");
        }
        n.dataset.success = success;
        if (success) {
            n.classList.remove("nandu-fail");
            n.classList.add("nandu-success");
            n.querySelector(".nandu-mark").innerHTML = "&#x2705";
        } else {
            n.classList.add("nandu-fail");
            n.classList.remove("nandu-success");
            n.querySelector(".nandu-mark").innerHTML = "&#x274C";
        }
    });
    return n;
}

function setupNanduPanel() {
    let panel = TPZ.renderHtml('<div id="nandu-panel" class="panel"></div>');
    content.appendChild(panel);
    renderNanduPanel();
}

let nandu_codes = {
    "111A": { name: "standing leg to head", value: 0.2 },
    "112A": { name: "side kick and hold leg", value: 0.2 },
    "113A": { name: "backward balance", value: 0.2 },
    "143A": { name: "low balance with leg forward", value: 0.2 },
    "142A": { name: "low stepping on kick forward", value: 0.2 },
    "132A": { name: "balance with sideward sole kick", value: 0.2 },
    "133B": { name: "balance with arms spread", value: 0.3 },
    "143B": { name: "low balance with leg behind support leg", value: 0.3 },
    "112C": { name: "back kick and hold leg", value: 0.4 },
    "113C": { name: "raise leg sideways with heel up", value: 0.4 },
    "244A": { name: "540 front sweep", value: 0.2 },
    "212A": { name: "parting kick and heel kick", value: 0.2 },
    "244B": { name: "900 front sweep", value: 0.3 },
    "323A": { name: "360 tornado kick", value: 0.2 },
    "333A": { name: "butterfly", value: 0.2 },
    "324A": { name: "360 lotus kick", value: 0.2 },
    "335A": { name: "aerial cartwheel", value: 0.2 },
    "312A": { name: "kick in flight", value: 0.2 },
    "346A": { name: "backflip", value: 0.2 },
    "323B": { name: "540 tornado kick", value: 0.3 },
    "353B": { name: "360 butterfly", value: 0.3 },
    "324B": { name: "540 lotus kick", value: 0.3 },
    "355B": { name: "360 aerial cartwheel", value: 0.3 },
    "312B": { name: "front kick in flight", value: 0.3 },
    "322B": { name: "180 kick in flight", value: 0.3 },
    "346B": { name: "single-step backflip (gainer)", value: 0.3 },
    "355C": { name: "720 aerial cartwheel", value: 0.4 },
    "323C": { name: "720 tornado kick", value: 0.4 },
    "353C": { name: "720 butterfly", value: 0.4 },
    "324C": { name: "720 lotus kick", value: 0.4 },
    "324C": { name: "540 lotus kick", value: 0.4 },
    "366C": { name: "360 single-step back butterfly", value: 0.4 },
    "415A": { name: "double sidekick in flight", value: 0.2 },
    "423A": { name: "360 tornado land on side", value: 0.2 },
    "447C": { name: "kip-up", value: 0.4 },
    "(A)": { name: "(connect difficult movement)", value: 0.1 },
    "1A": { name: "horse stance", value: 0.1 },
    "2A": { name: "butterfly stance", value: 0.1 },
    "3A": { name: "180 to standing with knee raised", value: 0.1 },
    "4A": { name: "front split", value: 0.1 },
    "6A": { name: "sitting position", value: 0.1 },
    "7A": { name: "bow stance", value: 0.1 },
    "8A": { name: "throw and catch", value: 0.1 },
    "9A": { name: "land on takeoff foot", value: 0.1 },
    "(B)": { name: "(connect difficult movement)", value: 0.15 },
    "1B": { name: "horse stance", value: 0.15 },
    "2B": { name: "butterfly stance", value: 0.15 },
    "3B": { name: "stand with knee raised", value: 0.15 },
    "4B": { name: "front split", value: 0.15 },
    "5B": { name: "dragons dive", value: 0.15 },
    "8B": { name: "throw and catch", value: 0.15 },
    "(C)": { name: "(connect difficult movement)", value: 0.2 },
    "1C": { name: "horse stance", value: 0.2 },
    "2C": { name: "butterfly stance", value: 0.2 },
    "3C": { name: "stand with knee raised", value: 0.2 },
    "5C": { name: "dragons dive", value: 0.2 },
    "1D": { name: "horse stance", value: 0.25 },
    "3D": { name: "stand with knee raised", value: 0.25 },
    "4D": { name: "front split", value: 0.25 },
};

let taiji_codes = {
    "323B": { name: "360 tornado kick", value: 0.3 },
    "324B": { name: "360 lotus kick", value: 0.3 },
    "323C": { name: "540 tornado kick", value: 0.4 },
};

// Nandu object
function Nandu(base, connections) {
    this.base = base;
    this.connections = connections;
}

function NanduComponent(code, name, value) {
    this.code = code;
    this.value = value;
    this.name = name;
}

function parseNanduString(s) {
    return s.split(",");
}

function parseNanduCombo(s) {
    // Possible formats: 312A+335A(B), 323A+4A, 415A, 323A+312A(A)+3A
    // ex1: base: 323A, conn: (A); base: 312A, conn: 3A
    // ex2: base: 312A, conn: (B); base: 335A, conn: none
    let component_codes = s.split("+");
    let base = getNanduComponent(component_codes[0].trim());
    let connections = [];
    if (component_codes.length > 1) {
        for (let i = 1; i < component_codes.length; i++) {
            let component = component_codes[i];
            let dynIdx = component.indexOf("("); // Index of a dynamic connection -- eg: (A)
            if (dynIdx != -1) {
                // get both parts
                connections.push(
                    getNanduComponent(component.substring(dynIdx).trim())
                );
                connections.push(
                    getNanduComponent(component.substring(0, dynIdx).trim())
                );
            } else {
                connections.push(getNanduComponent(component.trim()));
            }
        }
    }
    return new Nandu(base, connections);
}

function getNanduComponent(code) {
    let isTaiji = currentEventName.toLowerCase().indexOf("taiji") > 0;
    if (isTaiji) {
        // Check for taiji specific nandu codes first
        let t = taiji_codes[code];
        if (t) {
            return new NanduComponent(code, t.name, t.value);
        }
    }
    let v = nandu_codes[code];
    return new NanduComponent(code, v.name, v.value);
}
