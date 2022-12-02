let pollId = 0;
let pollMode = false;
let ccId = 0;

let deductionCount = 0;

judgeRuleset = "IWUF";

let deductionsList;

let notifyArgs = {
    onopen: () => {
        console.log("connected");
        registerJudge(ringId, "iwuf-a");
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
    setupDeductionsPanel();
    initScratchPad();
    onCompetitorChange = updateEventPanel;
    onCompetitorChange();
}

function updateEventPanel() {
    updateEventInfo(() => {
        if (currentEventRules === "IWUF" || currentEventRules === "IWUF-AB") {
            renderDeductionsPanel();
        } else {
            TPZ.getElementById("deductions-panel").textContent =
                "Not an IWUF event";
        }
    });
}

function renderDeductionsPanel() {
    TPZ.getElementById("deductions-panel").innerHTML =
        "<p>Deductions are submitted live!</p>" +
        "<p id=\"deduction-intro\">Hit the 'SPACEBAR' key or " +
        "press the 'Add Deduction' button to mark a deduction</p>" +
        '<p>Deductions:</p><ul id="deductions-list"></ul>' +
        '<div><button id="deduct-button" class="btn btn-info">Add Deduction</button></div>';

    deductionCount = 0;
    deductionsList = TPZ.getElementById("deductions-list");

    TPZ.getElementById("deduct-button").onclick = () => {
        markDeduction();
    };
}

function getDeductionId(index) {
    return "deduct-" + index;
}

// distinctKeypress signals whether or not the user has released the key
// (prevent multiple hits from holding down the key)
let distinctKeypress = true;
let typingMode = false;
function setupDeductionsPanel() {
    let panel = TPZ.renderHtml(
        '<div id="deductions-panel" class="panel"></div>'
    );
    content.appendChild(panel);
    renderDeductionsPanel();
    let body = document.getElementsByTagName("body")[0];
    body.addEventListener("keydown", (event) => {
        if (event.key == " " && distinctKeypress) {
            markDeduction();
            distinctKeypress = false;
        } else if ("0" <= event.key && event.key <= "9" && !typingMode) {
            // if user starts typing a number, jump to first unfilled box
            typingMode = true;
            let next = getFirstUnfilledDeduction();
            next.focus();
        }
    });
    body.addEventListener("keyup", (event) => {
        if (event.key == " ") {
            // user has released the spacebar
            distinctKeypress = true;
        }
    });
}

function getFirstUnfilledDeduction() {
    let deductions = document.getElementsByClassName("deduction-code");
    for (let i = 0; i < deductions.length; i += 1) {
        let code = deductions[i];
        if (code.value == "") {
            return code;
        }
    }
    return null;
}

function markDeduction() {
    typingMode = false;
    let timestamp = new Date();
    let deductId = getDeductionId(deductionCount);
    let row = TPZ.renderHtml(
        '<li id="' +
            deductId +
            '" class="deduction-entry" data-ts="' +
            timestamp.getTime() +
            '">' +
            '<button class="deduction-remove btn btn-outline-secondary">x</button>' +
            '<span class="deduction-label">' +
            (deductionCount + 1) +
            "</span> - " +
            'Code: <input class="deduction-code" type="text" />' +
            '<span class="deduction-submitted"></span>' +
            '<span class="deduction-name"></span></li>'
    );
    deductionsList.appendChild(row);

    // set all the events
    row.querySelector(".deduction-remove").onclick = () => {
        removeDeduction(deductId);
    };
    // Add event handling to the deduction box
    let dbox = TPZ.getElementById(deductId);
    codebox = dbox.querySelector(".deduction-code");
    codebox.addEventListener("input", () => {
        dbox.dataset.changed = true;
        dbox.querySelector(".deduction-submitted").innerHTML = "";
    });
    codebox.addEventListener("keydown", (event) => {
        if (event.key == "Tab" || event.key == "Enter") {
            // user has pressed <TAB> or <ENTER>
            event.preventDefault();
            //gotoNextDeductionBox(dbox);
            // submit this deduction
            //submitDeduction(dbox);
        } else if (event.which === 32) {
            event.preventDefault();
        }
    });
    codebox.addEventListener("keyup", (event) => {
        // When a valid deduction is entered, move on to the next (if possible)
        let deductionCode = dbox.querySelector(".deduction-code").value;
        if (deductionCode.length >= 2) {
            if (validateDeduction(deductionCode)) {
                dbox.classList.remove("deduction-invalid");
                submitDeduction(dbox);
                gotoNextDeductionBox(dbox);
                // add deduction name
                let dName = getDeductionName(deductionCode);
                dbox.querySelector(".deduction-name").textContent = dName;
            } else {
                dbox.classList.add("deduction-invalid");
            }
        }
    });
    codebox.addEventListener("focus", () => {
        dbox.classList.add("deduction-focus");
    });
    codebox.addEventListener("focusout", () => {
        dbox.classList.remove("deduction-focus");
    });
    deductionCount += 1;
}

function submitDeduction(deductElement) {
    if (deductElement.dataset.changed == "false") {
        return;
    }
    let label = deductElement.querySelector(".deduction-label").textContent;
    let code = deductElement.querySelector(".deduction-code").value;
    if (code === "") {
        alert("Deduction #" + label + " is missing its code!");
        return;
    }
    if (!validateDeduction(code)) {
        alert("Deduction #" + label + ": " + code + " is not a valid code");
        return;
    }
    let timestamp = parseInt(deductElement.dataset.ts);
    let ded = {
        timestamp: timestamp,
        code: code,
        judgeID: clientId,
        routineID: currentRoutineId,
        ringID: parseInt(ringId),
    };
    let method = "POST";
    if (deductElement.dataset.submitted == "true") {
        // this deduction has been submitted before
        // send an update
        method = "UPDATE";
    }
    TPZ.httpSendJson("/api/submit-deduction", method, ded, () => {
        deductElement.querySelector(".deduction-submitted").innerHTML =
            "&#x2705;";
        deductElement.dataset.changed = false;
        deductElement.dataset.submitted = true;
    });
}

function removeDeduction(deductId) {
    let dbox = TPZ.getElementById(deductId);
    let label = dbox.querySelector(".deduction-label").textContent;
    if (confirm("Remove deduction #" + label + "?")) {
        if (dbox.dataset.submitted == "true") {
            let ded = {
                timestamp: parseInt(dbox.dataset.ts),
                judgeID: clientId,
                routineID: currentRoutineId,
                ringID: parseInt(ringId),
            };
            TPZ.httpSendJson("/api/submit-deduction", "DELETE", ded, () => {});
        }
        dbox.remove();
    }
}

function gotoNextDeductionBox(deductElement) {
    let nextElement = deductElement.nextElementSibling;
    if (nextElement != undefined) {
        nextElement.querySelector(".deduction-code").focus();
    }
}

function getDeductionName(code) {
    // check if server copy exists (preferred)
    if (deduction_codes && currentEvent.style) {
        // check style specific deductions
        let d = deduction_codes[currentEvent.style][code];
        if (d != undefined) {
            return d.name;
        }
        // check general deductions
        d = deduction_codes["general"][code];
        if (d != undefined) {
            return d.name;
        }
        // invalid code for this event
    } else {
        // use the local backup
        let d = deduction_codes_backup[code];
        if (d != undefined) {
            return d.name;
        }
    }
    return "invalid";
}

function validateDeduction(code) {
    // check if server copy exists (preferred)
    if (deduction_codes && currentEvent.style) {
        // check style specific deductions
        if (deduction_codes[currentEvent.style][code] != undefined) {
            return true;
        }
        // check general deductions
        if (deduction_codes["general"][code] != undefined) {
            return true;
        }
        // invalid code for this event
    } else {
        // use the local backup
        if (deduction_codes_backup[code] != undefined) {
            return true;
        }
    }
    return false;
}

let deduction_codes;
// TODO: validate against server instead
let deduction_codes_backup = {
    10: { name: "standing w/ leg to head (侧朝天蹬直立)", value: 0.1 },
    11: { name: "standing back kick (后踢抱脚直立)", value: 0.1 },
    12: { name: "backward balance (仰身平衡)", value: 0.1 },
    13: { name: "sideways balance (十字平衡)", value: 0.1 },
    14: { name: "cross-leg balance (扣腿平衡)", value: 0.1 },
    15: { name: "low balance w/ leg forward (前举腿低势平衡)", value: 0.1 },
    16: { name: "low balance w/ leg behind (后插腿低势平衡)", value: 0.1 },
    17: { name: "stamp in low body position (低势前蹬踩脚)", value: 0.1 },
    18: { name: "sidekick balance (侧踹平衡)", value: 0.1 },
    20: { name: "front sweep (前扫踢)", value: 0.1 },
    21: { name: "back sweep (后扫踢)", value: 0.1 },
    22: { name: "front split (跌叉)", value: 0.1 },
    23: { name: "snap kick (弹腿) / side kick (踹腿)", value: 0.1 },
    24: { name: "parting kick (分脚) / heel kick (蹬脚)", value: 0.1 },
    25: { name: "lotus kick (摆莲脚)", value: 0.1 },
    26: { name: "pat leg (拍脚)", value: 0.1 },
    27: { name: "dragon's dive (雀地龙)", value: 0.1 },
    28: { name: "horizontal nail kick (横钉腿)", value: 0.1 },
    30: {
        name: "jump kick (腾空飞脚) / tornado kick (旋风脚) / lotus kick (腾空摆莲) / jump outside kick (腾空外摆腿)",
        value: 0.1,
    },
    31: { name: "jump front straight kick (腾空正踢腿)", value: 0.1 },
    32: { name: "aerial cartwheel [360] (侧空翻 [360])", value: 0.1 },
    33: { name: "butterfly kick (旋子)", value: 0.1 },
    34: { name: "jump front snap kick (腾空箭弹)", value: 0.1 },
    40: { name: "tornado 360 fall (腾空盘腿 360 度侧扑)", value: 0.1 },
    41: { name: "kip-up (鲤鱼打挺直立)", value: 0.1 },
    42: { name: "double flying side kick (腾空双侧踹)", value: 0.1 },
    50: { name: "bow stance (弓步)", value: 0.1 },
    51: { name: "horse stance (马步)", value: 0.1 },
    52: { name: "empty [cat] stance (虚步)", value: 0.1 },
    53: { name: "crouch [drop] stance (仆步)", value: 0.1 },
    54: {
        name: "step [forward, back, side] (上步, 退步, 进步, 跟步, 侧行步)",
        value: 0.1,
    },
    55: { name: "butterfly stance (蝶步)", value: 0.1 },
    56: { name: "kneeling stance (跪步)", value: 0.1 },
    57: { name: "dragon-riding stance (骑龙步)", value: 0.1 },
    60: { name: "upward parry (挂剑) / uppercut (撩剑)", value: 0.1 },
    61: { name: "sword grip (握剑)", value: 0.1 },
    62: { name: "sword wrapping (缠头裹脑 )", value: 0.1 },
    63: { name: "spear parry (拦枪, 拿枪)", value: 0.1 },
    64: { name: "spear thrust (扎枪)", value: 0.1 },
    65: {
        name: "figure-8 (立舞花枪, 立舞花棍) / uppercut (双手提撩花棍)",
        value: 0.1,
    },
    66: { name: "throw and catch (器械抛接 )", value: 0.1 },
    67: { name: "pushing the cudgel (顶棍)", value: 0.1 },
    70: {
        name: "body sway / shuffle / skip in balance (上体晃动、脚移动或跳动)",
        value: 0.1,
    },
    71: { name: "extra support (附加支撑)", value: 0.2 },
    72: { name: "body fall (倒地)", value: 0.3 },
    73: {
        name: "blade off handle (器械触地) / apparatus touches body or carpet, or is deformed (脱把、碰身、变形)",
        value: 0.1,
    },
    74: { name: "breaking apparatus (器械折断)", value: 0.2 },
    75: { name: "dropping apparatus (器械掉地)", value: 0.3 },
    76: {
        name: "ornament drops from apparatus / body is tangled with apparatus / loose buttons, or torn costume / shoes off (刀彩、剑穗、枪缨、服饰、头饰掉地；刀彩、剑穗、软器械缠手（缠身）；服装开纽或撕裂；鞋脱落)",
        value: 0.1,
    },
    77: {
        name: "longtime balance for less than two seconds (持久平衡静止时间不足 2 秒)",
        value: 0.1,
    },
    78: {
        name: "body touches outside carpet (身体任何一部分触及线外地面)",
        value: 0.1,
    },
    79: { name: "movement forgotten (遗忘)", value: 0.1 },
    "00": { name: "deduction", value: 0.1 },
};
