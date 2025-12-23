// TPZJudge builds the judging interfaces for all judging roles
var TPZJudge = (() => {
    // TODO: add Chinese translation
    // English text
    var txtEN = {
        add: "Add",
        adjAdd: "Add adjustment (or deduction)",
        adjLabel: "Adjustments",
        adjReason: "Reason",
        adjWarn: "Please submit or clear the adjustment!",
        calculatedScore: "Calculated",
        continueNext: "Results not finalized! Continue?",
        currentLabel: "Now",
        deductAdd: "Add Deduction",
        deductAttn: "Deductions are submitted live!",
        deductInstr:
            "Hit &lt;SPACEBAR&gt; or click 'Add Deduction' to mark a deduction",
        deductLabel: "Deductions",
        finalScore: "Final",
        inactiveJudge: "Not a judge for this event",
        invalidAdj: "Please check the adjustment entered.",
        invalidScore: "Please check the score entered.",
        joinButton: "Join",
        nanduFail: "&#x274C;",
        nanduSuccess: "&#x2705;",
        nanduToggle: "Click skill to toggle success / failure",
        nextCompetitor: "&#x2B9E;",
        publishScore: "Publish Score",
        publishWarn: "Publish results?",
        rescoreBtn: "Rescore",
        ringFinished: "Finished!",
        scoreLabel: "Score",
        scoresLabel: "Judge's scores",
        selectJudge: "Select a judge role!",
        selectLabel: "Event",
        selectRing: "Select a ring!",
        spread: "Spread",
        startTimer: "Start Timer",
        stopTimer: "Stop Timer",
        submit: "Submit",
        submitQ: "Submit?",
        timeLabel: "Time",
        titleIntAJudge: "International A Judge",
        titleIntBJudge: "International B Judge",
        titleIntCJudge: "International C Judge",
        titleScoreEntry: "Direct Score Entry",
        titleHeadJudge: "Head Judge",
        titleTPJudge: "Score Judge",
    };

    var cfg = {
        clientId: "0000",
        ringId: 0,
        api: {
            status: () => {
                return `/api/${cfg.ringId}/status`;
            },
            changeCompetitor: () => {
                return `/api/${cfg.ringId}/change-competitor`;
            },
            changeEvent: () => {
                return `/api/${cfg.ringId}/change-event`;
            },
            eventCompetitors: (ringId) => {
                return `/api/${ringId}/event-competitors`;
            },
            ringEvents: () => {
                return `/api/events-in-ring/${cfg.ringId}`;
            },
            scores: () => {
                return `/api/${cfg.ringId}/get-scores`;
            },
            listRings: "/api/get-rings",
            markDeduction: "/api/mark-blank-deduction",
            publishScore: "/api/finalize-score",
            rescore: "/api/rescore",
            settings: "/api/get-settings",
            submitAdj: "/api/submit-adjustment",
            submitDeduction: "/api/submit-deduction",
            submitScore: "/api/submit-score",
        },
        ws: "/judge/server",
        cb: {
            onCompetitorChange: () => {},
        },
        ping: {
            id: 0,
            lastRtt: 0,
            interval: 10000, // ms
            threshold: {
                low: 100, // ms
                med: 500,
            },
            icon: {
                low: "&#x1F7E2", // green circle
                med: "&#x1F7E1", // yellow circle
                high: "&#x1F534", // red circle
            },
        },
        poll: {
            id: 0,
            action: () => {},
            enabled: false,
            interval: 3000, // ms
        },
        time: {
            offset: 0, // ms the client time is behind the server time
        },
        txt: {},
    };

    var id = {
        judgeGroup: "judge-group",
        judgeId: "judge-id",
        pingDisplay: "ping",
        ringGroup: "ring-group",
        select: "selection-container",
    };

    var classes = {
        judgeSelect: "judge-select",
        ringSelect: "ring-select",
    };

    var pingDisplay;

    function init() {
        cfg.txt = txtEN;

        TPZ.init();
        setClientId();
        pingDisplay = TPZ.getElementById(id.pingDisplay);
        phoneHome();
        cfg.ping.id = setInterval(phoneHome, cfg.ping.interval);
        cfg.poll.id = setInterval(() => {
            if (cfg.poll.enabled) {
                console.log("polling...");
                cfg.poll.action();
            }
        });
        pingDisplay.addEventListener("click", () => {
            TPZ.getElementById(id.judgeId).textContent = cfg.clientId;
        });

        setupJudgeSelection();
    }

    function setClientId() {
        let tag = TPZ.getAuthId();
        if (tag !== undefined) {
            cfg.clientId = tag;
        } else {
            // generate a temporary ID
            cfg.clientId = Math.random().toString().substring(2, 10);
        }
    }

    function phoneHome() {
        let start = performance.now();
        TPZ.httpGetJson(cfg.api.settings, (settings) => {
            let rtt = performance.now() - start;
            setPing(rtt);
            // determine time difference between client and server clocks
            let now = Date.now();
            let serverTime = parseInt(settings.timestamp);
            serverTime -= rtt / 2;
            TPZ.setTimeOffset(serverTime - now);
            settings.poll === "true"
                ? (cfg.poll.enabled = true)
                : (cfg.poll.enabled = false);
        });
    }

    // getTimestamp returns the current time in milliseconds
    // adjusted for the difference between client and server clocks
    function getTimestamp() {
        return TPZ.time();
    }

    function setPing(rtt) {
        let pingSym = cfg.ping.icon.high;
        if (rtt < cfg.ping.threshold.low) {
            pingSym = cfg.ping.icon.low;
        } else if (rtt < cfg.ping.threshold.med) {
            pingSym = cfg.ping.icon.med;
        }
        pingDisplay.innerHTML = pingSym;
        let now = new Date(TPZ.time());
        pingDisplay.title = `${rtt.toFixed(1)} ms - ${now.toLocaleString()}`;
        cfg.ping.lastRtt = rtt;
    }

    function setupJudgeSelection() {
        let container = TPZ.renderHtml(`<div id="${id.select}"></div>`);
        TPZ.appendToPanel(container);
        listJudgePanels();
        listRings();
        TPZ.appendElements(container, TPZ.renderHtml("<br/><br/>"));
        let joinBtn = TPZ.renderHtml(
            `<button class="btn btn-theme" type="submit">${cfg.txt.joinButton}</button>`
        );
        joinBtn.addEventListener("click", loadJudge);
        container.appendChild(joinBtn);
    }

    function listRings() {
        let ringGroup = TPZ.createRadioGroup(id.ringGroup);
        TPZ.getElementById(id.select).appendChild(ringGroup);
        TPZ.httpGetJson(cfg.api.listRings, (data) => {
            var eles = [];
            for (let ring of data) {
                let ringItem = TPZ.createRadioItem(ring.name, {
                    ring: ring.id,
                });
                ringItem.className += " " + classes.ringSelect;
                eles.push(ringItem);
            }
            TPZ.appendElements(ringGroup, eles);
        });
    }

    function listJudgePanels() {
        let panels = [
            TPZ.createRadioItem(cfg.txt.titleTPJudge, { panel: "10pt" }),
            TPZ.createRadioItem(cfg.txt.titleIntAJudge, { panel: "int-a" }),
            TPZ.createRadioItem(cfg.txt.titleIntBJudge, { panel: "int-b" }),
            TPZ.createRadioItem(cfg.txt.titleIntCJudge, { panel: "int-c" }),
            TPZ.createRadioItem(cfg.txt.titleHeadJudge, { panel: "head" }),
        ];
        let panelGroup = TPZ.createRadioGroup(id.judgeGroup);
        for (let item of panels) {
            item.className += " " + classes.judgeSelect;
        }
        TPZ.appendElements(panelGroup, panels);
        TPZ.getElementById(id.select).appendChild(panelGroup);
    }

    function loadJudge() {
        let activePanelItem = TPZ.getElementById(
            id.judgeGroup
        ).getElementsByClassName("active")[0];
        if (activePanelItem === undefined) {
            TPZ.alert(cfg.txt.selectJudge);
            return;
        }

        let activeRingItem = TPZ.getElementById(
            id.ringGroup
        ).getElementsByClassName("active")[0];
        if (activeRingItem === undefined) {
            TPZ.alert(cfg.txt.selectRing);
            return;
        }

        let judgeType = activePanelItem.dataset.panel;
        cfg.ringId = parseInt(activeRingItem.dataset.ring);

        let view;
        switch (judgeType) {
            case "10pt":
                view = new ScoreJudgeView(cfg, 10);
                break;
            case "int-a":
                view = new TechnicalJudgeView(cfg);
                break;
            case "int-b":
                view = new ScoreJudgeView(cfg, 3);
                break;
            case "int-c":
                view = new DifficultyJudgeView(cfg);
                break;
            case "head":
                view = new HeadJudgeView(cfg);
                break;
        }
        view.render();
    }

    return {
        init: init,
        time: getTimestamp,
    };
})();

// JudgeView provides common functionality for all judging roles
class JudgeView {
    cache = {
        exp: "",
        eventStart: 0,
        competitorId: 0,
        eventId: 0,
        published: false,
        routineId: 0,
        ruleset: {
            name: "",
            maxScore: 10,
            limitHundredths: false,
        },
        scratch: "",
        timerInterval: 0,
    };

    constructor(cfg, title, role = "") {
        this.cfg = cfg;
        this.txt = cfg.txt;
        this.cfg.Notify = {
            args: {
                onopen: () => {
                    console.log("connected");
                    // role only matters for head judges
                    this.register(role);
                },
                onmessage: (raw) => {
                    console.log(raw);
                    let msg = this.parseMessage(raw.data);
                    switch (msg.action) {
                        case "notify-competitor":
                            cfg.cb.onCompetitorChange();
                            break;
                    }
                },
            },
            URI: cfg.ws,
        };
        this.clear();
        this.eventDisplay = new EventDisplay(this.cfg);
        TPZ.setHeader(title);
        TPZ.setTitle(title);
        this.eventDisplay.add();
    }

    connect() {
        Notify.connect(this.cfg.Notify.URI, this.cfg.Notify.args);
    }

    notify(msg) {
        msg.client = this.cfg.clientId;
        msg.ring = this.cfg.ringId;
        msg.timestamp = Date.now();
        Notify.send(msg);
    }

    parseMessage(message) {
        console.log("recv: " + JSON.stringify(message));
        try {
            return JSON.parse(message);
        } catch (err) {
            return null;
        }
    }

    register(role) {
        this.notify({ action: "register-judge", params: [role] });
    }

    clear() {
        if (Scratchpad !== undefined) {
            this.cache.scratch = Scratchpad.text();
        }
        TPZ.clearPanel();
    }

    setTitle(title) {
        TPZ.setHeader(title);
        TPZ.setTitle(title);
    }

    updateEventInfo(onReady, async = true) {
        TPZ.httpGetJson(
            this.cfg.api.status(),
            (data) => {
                this.onGetCurrentStatusReady(data);
                if (onReady) onReady(data);
            },
            async
        );
    }

    onGetCurrentStatusReady(data) {
        if (this.cache.routineId == data.routine_id) return;
        if (data.event_id != undefined) {
            this.cache.eventName = data.event_name;
            this.cache.eventId = data.event_id;
            this.cache.exp = data.event_exp;
            this.cache.competitorName = data.fname + " " + data.lname;
            this.cache.competitorId = data.competitor_id;
            this.cache.routineId = data.routine_id;
            this.eventDisplay.update(
                data.event_name,
                TPZ.formatName(data.fname, data.lname)
            );
            let ruleset = this.getRuleBase(data.rules);
            this.cache.ruleset.name = ruleset;
            switch (ruleset) {
                case "IWUF":
                    this.cache.ruleset.maxScore = 3;
                    break;
                case "IWUF-AB":
                    this.cache.ruleset.maxScore = 3; // new to 2024
                    break;
                default:
                    this.cache.ruleset.maxScore = 10;
                    break;
            }
        }
    }

    getRuleBase(name) {
        let base = name.split(" ")[0].toUpperCase();
        let idx = base.indexOf("-2");
        if (idx > 0) {
            base = base.substring(0, idx);
        }
        return base;
    }
}

// HeadJudgeView creates an interface for the head judge
// with the controls and information displays necessary.
// Extends the JudgeView class.
class HeadJudgeView extends JudgeView {
    constructor(cfg) {
        super(cfg, cfg.txt.titleHeadJudge, "head");
        this.eventControl = new EventControlPanel(this.cfg, this.cache);
        this.eventTimer = new EventTimer(this.cfg, this.cache);
        this.scoringPanel = new ScoringPanel(this.cfg, this.cache, true);
        this.adjustments = new AdjustmentPanel(this.cfg, this.cache);
        this.deductionResult = new DeductionResultPanel(this.cfg);
        this.nanduResult = new NanduResultPanel(this.cfg);
        this.scoreList = new ScoreList(this.cfg, this.cache);
        this.scoreDisplay = new ScoreDisplay(this.cfg, this.cache);
        this.scoreManager = new ScoreManager(this.cfg);

        this.cache.scoresExpected = 0;
        this.cache.scoresSubmitted = 0;
        this.eventTimer.register(this.deductionResult.handleTimer);
        this.scoreManager.registerHandler((data) => {
            this.scoreList.onUpdate(data);
            this.scoreDisplay.onUpdate(data);
            // check for own submission
            let submitted = Object.keys(data.scores);
            this.cache.scoresSubmitted = submitted.length;
            if (submitted.length > 0) {
                for (let k of submitted) {
                    let score = data.scores[k].score;
                    if (k == this.cfg.clientId) {
                        this.scoringPanel.setScore(score);
                        this.scoringPanel.disable();
                    }
                }
            }
            this.adjustments.update(data.adjustments);
            if (data.final != undefined && data.final != "0.00") {
                this.setPublished();
            }
        });
        this.pub = new ScorePublisher(
            this.cfg,
            this.cache,
            () => {
                return this.pubWarn();
            },
            () => {
                this.publish();
            }
        );
        this.eventControl.add();
        this.eventTimer.add();

        this.headScorePanel = TPZ.renderHtml(
            `<div id="head-score-panel"></div>`
        );
        TPZ.appendToPanel(this.headScorePanel);
        this.scoringPanel.add(this.headScorePanel);
        this.scoreList.add(this.headScorePanel);
        this.adjustments.add(this.headScorePanel);

        this.panel = TPZ.renderHtml(`<div class="panel"></div>`);
        TPZ.appendToPanel(this.panel);
        TPZ.addScratchpad(this.cache.scratch);

        this.cfg.poll.action = () => {
            this.scoreManager.update();
        };
        this.cfg.Notify.args.onmessage = (raw) => {
            console.log(raw);
            let msg = this.parseMessage(raw.data);
            switch (msg.action) {
                case "submit-score":
                    this.scoreManager.update();
                    break;
                case "rescore":
                    this.scoringPanel.clear();
                    this.scoreManager.update();
                    break;
                case "adjust-score":
                    this.cache.scoresSubmitted++;
                    this.scoreManager.update();
                    break;
                case "submit-deductions":
                    this.scoreManager.update();
                    if (this.deductionResult != undefined) {
                        this.deductionResult.update();
                    }
                    break;
                case "submit-nandu":
                    this.scoreManager.update();
                    if (this.nanduResult != undefined) {
                        this.nanduResult.update();
                    }
                    break;
            }
        };
        this.connect();

        this.cfg.cb.onCompetitorChange = () => {
            window.scrollTo(0, 0);
            this.cache.published = false;
            this.updateEventInfo((data) => {
                this.render();
                this.scoreManager.update();
                if (data.nandusheet != undefined) {
                    this.nanduResult.render([
                        data.nandusheet["segment1"],
                        data.nandusheet["segment2"],
                        data.nandusheet["segment3"],
                        data.nandusheet["segment4"],
                    ]);
                }
                this.nanduResult.update();
            }, false);
        };

        // get the current event / competitor
        // or select the first event
        this.updateEventInfo(() => {
            this.scoringPanel.render();
            this.eventControl.render();
        });
    }

    render() {
        this.panel.innerHTML = "";
        this.eventTimer.reset();
        this.scoringPanel.render();
        // get previously saved data (if any)
        this.scoreManager.update();
        switch (this.cache.ruleset.name) {
            case "IWUF":
                this.deductionResult.add(this.panel);
                this.nanduResult.add(this.panel);
                break;
            case "IWUF-AB":
                this.deductionResult.add(this.panel);
                break;
        }
        this.scoreDisplay.add(this.panel);
        this.pub.add(this.panel);
    }

    pubWarn() {
        if (this.cache.scoresSubmitted < this.cache.scoresExpected) {
            TPZ.customConfirm(
                "Missing scores",
                `<div>Only <b>${this.cache.scoresSubmitted}</b> scores submitted</div>
                <div>Expected <b>${this.cache.scoresExpected}</b> scores</div>
                <div>Continue?</div>`,
                () => {
                    return true;
                },
                () => {
                    return false;
                }
            );
        }
        if (this.adjustments.hasUnsubmitted()) {
            TPZ.alert(this.txt.adjWarn);
            return true;
        }
        return false;
    }

    publish() {
        let data = { ringID: parseInt(this.cfg.ringId) };
        this.cache.scoresExpected = this.cache.scoresSubmitted;
        TPZ.httpPostJson(this.cfg.api.publishScore, data, () => {
            this.setPublished();
            // automatically move onto the next competitor
            setTimeout(() => {
                this.eventControl.selectNextCompetitor();
            }, 2000);
        });
    }

    setPublished() {
        this.scoreDisplay.final();
        this.pub.disable();
        this.cache.published = true;
    }
}

class ScoreJudgeView extends JudgeView {
    constructor(cfg, maxScore) {
        super(cfg, "");
        if (maxScore == 10) {
            this.setTitle(cfg.txt.titleTPJudge);
        } else {
            this.setTitle(cfg.txt.titleIntBJudge);
        }
        this.scoringPanel = new ScoringPanel(this.cfg, this.cache);
        this.cfg.Notify.args.onmessage = (raw) => {
            console.log(raw);
            let msg = this.parseMessage(raw.data);
            switch (msg.action) {
                case "notify-competitor":
                    cfg.cb.onCompetitorChange();
                    break;
                case "rescore":
                    this.scoringPanel.clear();
                    break;
            }
        };
        this.connect();

        this.panel = TPZ.renderHtml(`<div class="panel"></div>`);
        TPZ.appendToPanel(this.panel);
        this.scoringPanel.add(this.panel);
    }

    render() {
        TPZ.addScratchpad(this.cache.scratch);
        this.cfg.cb.onCompetitorChange = () => {
            this.update();
        };
        this.cfg.poll.action = () => {
            this.cfg.cb.onCompetitorChange();
        };
        this.update();
    }

    update() {
        this.updateEventInfo((data) => {
            this.scoringPanel.render(this.cache);
            if (data.scores === undefined) return;
            let saved = data.scores[this.cfg.clientId];
            if (saved === undefined) return;
            this.scoringPanel.setScore(saved.score);
            this.scoringPanel.disable();
        });
    }
}

class TechnicalJudgeView extends JudgeView {
    constructor(cfg) {
        super(cfg, cfg.txt.titleIntAJudge);
        this.connect();
    }

    render() {
        this.deductionPanel = new DeductionPanel(this.cfg, this.cache);
        this.deductionPanel.add();
        // TPZ.addScratchpad(this.cache.scratch);
        this.cfg.cb.onCompetitorChange = () => {
            this.update();
        };
        this.update();
    }

    update() {
        this.updateEventInfo((data) => {
            this.deductionPanel.clear();
            let ruleset = this.cache.ruleset.name;
            if (ruleset == "IWUF" || ruleset == "IWUF-AB") {
                this.deductionPanel.render();
            } else {
                this.deductionPanel.disable();
            }
        });
    }
}

class DifficultyJudgeView extends JudgeView {
    constructor(cfg) {
        super(cfg, cfg.txt.titleIntCJudge);
        this.connect();
    }

    render() {
        (this.nanduPanel = new NanduPanel(this.cfg, this.cache)),
            this.nanduPanel.add();
        TPZ.addScratchpad(this.cache.scratch);
        this.cfg.cb.onCompetitorChange = () => {
            this.update();
        };
        this.update();
    }

    update() {
        this.updateEventInfo((data) => {
            this.nanduPanel.clear();
            if (this.cache.ruleset.name !== "IWUF") {
                this.nanduPanel.disable();
            } else {
                this.nanduPanel.render([
                    data.nandusheet["segment1"],
                    data.nandusheet["segment2"],
                    data.nandusheet["segment3"],
                    data.nandusheet["segment4"],
                ]);
            }
        });
    }
}

class ScoreManager {
    cbs = [];

    constructor(cfg) {
        this.cfg = cfg;
    }

    registerHandler(cb) {
        this.cbs.push(cb);
    }

    unregisterHandler(cb) {
        let index = this.cbs.indexOf(cb);
        if (index >= 0) this.cbs.splice(index, 1);
    }

    update() {
        TPZ.httpGetJson(this.cfg.api.scores(), (data) => {
            for (let cb of this.cbs) {
                cb(data);
            }
        });
    }
}

class ViewObject {
    constructor(cfg) {
        this.cfg = cfg;
        this.txt = cfg.txt;
    }
}

// ScoreList displays a list of submitted scores, the score spread,
// and a button to call for a re-score.
class ScoreList extends ViewObject {
    id = {
        ct: "score-count",
        list: "score-list",
        spread: "spread",
        btn: "rescore-btn",
    };

    constructor(cfg, state) {
        super(cfg);
        this.state = state;
    }

    add(target) {
        let p = TPZ.renderHtml(
            `<div id="scores-submitted">${this.txt.spread}: <span id="${this.id.spread}"></span>` +
                `<button id="${this.id.btn}" class="btn btn-secondary">${this.txt.rescoreBtn}</button>` +
                `<div>${this.txt.scoresLabel} (<span id="${this.id.ct}">0</span>):` +
                `<ul id="${this.id.list}"></ul></div></div>`
        );
        TPZ.appendElements(target, p);
        this.counter = TPZ.getElementById(this.id.ct);
        this.spread = TPZ.getElementById(this.id.spread);
        TPZ.getElementById(this.id.btn).addEventListener("click", () => {
            TPZ.confirm("Rescore event?", () => {
                let info = {
                    routine_id: this.state.routineId,
                    ring_id: this.cfg.ringId,
                };
                TPZ.httpPostJson(this.cfg.api.rescore, info);
            });
        });
    }

    onUpdate(data) {
        let scoreList = TPZ.getElementById(this.id.list);
        // Clear the list
        scoreList.innerHTML = "";
        let scoreCount = 0;
        let submitted = Object.keys(data.scores);
        if (submitted.length > 0) {
            let eles = [];
            let scores = [];
            for (let k of submitted) {
                let score = data.scores[k].score;
                let item = TPZ.renderHtml(`<li>${score}</li>`);
                eles.push(item);
                scores.push(score);
                scoreCount++;
            }
            TPZ.appendElements(scoreList, eles);
            // update spread
            let diff = Math.max(...scores) - Math.min(...scores);
            this.spread.textContent = diff.toFixed(2);
        } else {
            this.spread.textContent = "0";
        }
        this.counter.textContent = scoreCount;
    }
}

class ScorePublisher extends ViewObject {
    id = {
        pub: "publish-button",
    };

    constructor(cfg, cache, warn, cb) {
        super(cfg);
        this.cache = cache;
        this.warn = warn;
        this.cb = cb;
    }

    add(target) {
        this.btn = TPZ.renderHtml(
            `<button id="${this.id.pub}" class="btn btn-theme">${this.txt.publishScore}</button>`
        );
        target.append(this.btn);
        TPZ.getElementById(this.id.pub).onclick = () => {
            this.publish();
        };
    }

    publish() {
        if (this.warn != undefined && this.warn()) return;
        let text =
            `<b style="font-size:48px;">` + this.cache.calculatedScore + "</b>";
        TPZ.customConfirm(this.cache.competitorName, text, this.cb);
    }

    disable() {
        this.btn.dataset.published = "true";
        this.btn.disabled = true;
    }
}

class AdjustmentPanel extends ViewObject {
    id = {
        adj: "score-adjustment",
        btn: "add-adj-button",
        list: "adjustment-list",
        listLabel: "adjustment-label",
        reason: "adjustment-reason",
    };

    constructor(cfg, state) {
        super(cfg);
        this.state = state;
    }

    add(target) {
        let adjPanel = TPZ.renderHtml(`
        <div id="adjustment-panel">
            ${this.txt.adjAdd}:<div><span id="adjust-minus">&nbsp;-&nbsp;</span><input id="${this.id.adj}" type="text" class="score-input"/>
            ${this.txt.adjReason}: <input id="${this.id.reason}" type="text" />
            <button id="${this.id.btn}" class="btn btn-secondary">${this.txt.add}</button></div>
            <p id="${this.id.listLabel}"></p><ul id="${this.id.list}"></ul></div>`);
        target.appendChild(adjPanel);
        this.adj = TPZ.getElementById(this.id.adj);
        this.reason = TPZ.getElementById(this.id.reason);
        this.adj.addEventListener("keyup", (event) => {
            let value = this.adj.value.toUpperCase();
            let code = DEDUCTION_CODES[value];
            if (code != undefined) {
                this.reason.value = value;
            }
        });
        target.appendChild(TPZ.renderHtml("<br/>"));
        TPZ.getElementById(this.id.btn).onclick = () => {
            let adjStr = this.adj.value.toUpperCase();
            let adjFloat = parseFloat(this.adj.value);
            if (adjStr in DEDUCTION_CODES) {
                this.submit(DEDUCTION_CODES[adjStr].value, this.reason.value);
                this.adj.value = "";
                this.reason.value = "";
            } else if (this.validate(adjFloat)) {
                this.submit(adjFloat, this.reason.value);
                this.adj.value = "";
                this.reason.value = "";
            } else {
                TPZ.alert(this.txt.invalidAdj);
            }
        };
        this.list = TPZ.getElementById(this.id.list);
    }

    validate(value) {
        // Make sure the score is positive and below the max possible
        if (value > -1 && value < 1) {
            if (Math.trunc(value * 10) % 1 === 0) {
                // Check that the score uses at most the tenths digit
                return true;
            } else if (Math.trunc(value * 100) % 5 === 0) {
                // Allow for five-hundredths of a point (special cases)
                return true;
            }
        } else {
            // Allow deduction codes
            if (value.toString().toUpperCase() in DEDUCTION_CODES) {
                return true;
            }
        }
        return false;
    }

    submit(amount, reason) {
        let adj = {
            amount: amount,
            reason: reason,
            judgeID: this.cfg.clientId,
            routineID: this.state.routineId,
            ringID: this.cfg.ringId,
        };
        // TODO: spin loading icon until POST is complete
        TPZ.httpPostJson(this.cfg.api.submitAdj, adj, () => {});
    }

    hasUnsubmitted() {
        return this.adj.value != "" || this.reason.value != "";
    }

    update(adjs) {
        // update adjustments list
        if (adjs != undefined) {
            // Reset the list
            let total = 0;
            this.list.innerHTML = "";
            for (let adj of adjs) {
                let item = TPZ.renderHtml(
                    `<li>${adj.amount} (${adj.reason})</li>`
                );
                total -= adj.amount;
                this.list.appendChild(item);
            }
            TPZ.getElementById(this.id.listLabel).textContent = `${
                this.txt.adjLabel
            }: ${total.toFixed(2)}`;
        }
    }
}

class ScoreDisplay extends ViewObject {
    id = {
        container: "final-score-container",
        label: "final-score-label",
        score: "final-score",
    };

    constructor(cfg, cache) {
        super(cfg);
        this.cache = cache;
    }

    add(target) {
        target.appendChild(
            TPZ.renderHtml(`<div id="${this.id.container}">
            <span id="${this.id.label}"></span>
            <span id="${this.id.score}"></span></div>`)
        );
        this.label = TPZ.getElementById(this.id.label);
        this.display = TPZ.getElementById(this.id.score);
    }

    onUpdate(data) {
        let final = data.final;
        let calc = data.calc;
        this.display.textContent = "";
        if (final != undefined && final != "0.00") {
            this.final();
            this.display.textContent = final;
        } else if (calc != undefined) {
            this.label.textContent = `${this.txt.calculatedScore}: `;
            this.display.textContent = calc;
            this.cache.calculatedScore = calc;
        }
    }

    final() {
        this.label.textContent = `${this.txt.finalScore}: `;
    }
}

class EventControlPanel extends ViewObject {
    id = {
        cSelect: "competitor-select",
        eSelect: "event-select",
        nextBtn: "next-competitor-button",
    };

    constructor(cfg, state) {
        super(cfg);
        this.state = state;
    }

    add() {
        // event control should be placed at the top
        TPZ.prependToPanel(
            TPZ.renderHtml(
                `<div id="event-control-panel" class="row justify-content-between panel">
                    <div class="col-8">${this.txt.selectLabel}: <select id="${this.id.eSelect}" class="col-5 custom-select"></select>
                    <span class="event-panel-spacing"/>
                    <select id="${this.id.cSelect}" class="col-4 custom-select"></select></div>
                    <div class="col-3"><button id="${this.id.nextBtn}" class="btn btn-theme">${this.txt.nextCompetitor}</button></div></div>`
            )
        );
        this.eventSelect = TPZ.getElementById(this.id.eSelect);
        this.compSelect = TPZ.getElementById(this.id.cSelect);
    }

    render() {
        // set up listeners
        this.eventSelect.addEventListener("change", () => {
            let eventId = this.eventSelect.value;
            if (eventId === this.state.eventId) return;
            let change = { id: parseInt(eventId) };
            TPZ.httpPostJson(this.cfg.api.changeEvent(), change, () => {
                this.state.competitorId = 0; // unset competitor ID
                this.setCompetitorList();
            });
        });
        this.compSelect.addEventListener("change", () => {
            let competitorId = parseInt(this.compSelect.value);
            let eventId = parseInt(this.eventSelect.value);
            let change = { event_id: eventId, competitor_id: competitorId };
            TPZ.httpPostJson(
                this.cfg.api.changeCompetitor(),
                change,
                this.cfg.cb.onCompetitorChange
            );
        });

        // get events in this ring
        TPZ.httpGetJson(this.cfg.api.ringEvents(), (eventList) => {
            let eles = [];
            for (let i = 0, numEvents = eventList.length; i < numEvents; i++) {
                let event = eventList[i];
                let name = `${i + 1}. ${event.name}`;
                let option = TPZ.renderHtml(
                    `<option value="${event.id}">${name}</option>`
                );
                eles.push(option);
            }
            TPZ.appendElements(this.eventSelect, eles);
            if (this.state.eventId > 0) {
                // resume event
                this.eventSelect.value = this.state.eventId;
                this.setCompetitorList();
            } else {
                // select first event
                this.eventSelect.selectedIndex = 0;
                this.eventSelect.dispatchEvent(new Event("change"));
            }
            TPZ.getElementById(this.id.nextBtn).onclick = () => {
                this.setNextButton();
            };
        });
    }

    setCompetitorList() {
        // get a new list of competitors
        TPZ.httpGetJson(
            this.cfg.api.eventCompetitors(this.cfg.ringId),
            (compList) => {
                for (let i = this.compSelect.length - 1; i >= 0; i--) {
                    this.compSelect.remove(i);
                }
                let i = 1;
                for (let competitor of compList) {
                    let name = `${i}. ${TPZ.formatName(
                        competitor.first_name,
                        competitor.last_name
                    )}`;
                    let option = TPZ.renderHtml(
                        `<option value="${competitor.id}">${name}</option>`
                    );
                    this.compSelect.append(option);
                    i++;
                }
                if (this.state.competitorId > 0) {
                    // resume
                    this.compSelect.value = this.state.competitorId;
                } else {
                    // select first competitor
                    this.compSelect.selectedIndex = 0;
                }
                this.compSelect.dispatchEvent(new Event("change"));
            }
        );
    }

    setNextButton() {
        if (!this.state.published) {
            // this score hasn't been published yet
            // confirm we want to move on
            TPZ.confirm(this.txt.continueNext, () => {
                this.selectNextCompetitor();
            });
        } else {
            this.selectNextCompetitor();
        }
    }

    selectNextCompetitor() {
        let compIndex = this.compSelect.selectedIndex;
        if (compIndex < this.compSelect.length - 1) {
            this.compSelect.selectedIndex = compIndex + 1;
            this.compSelect.dispatchEvent(new Event("change"));
            return;
        }
        let eventIndex = this.eventSelect.selectedIndex;
        // move onto next event
        if (eventIndex < this.eventSelect.length - 1) {
            this.eventSelect.selectedIndex = eventIndex + 1;
            this.eventSelect.dispatchEvent(new Event("change"));
            return;
        }
        TPZ.alert(this.txt.ringFinished);
    }
}

class EventDisplay extends ViewObject {
    id = {
        currentCompetitor: "current-competitor",
        currentEvent: "current-event",
        eventDisplay: "event-display",
    };

    constructor(cfg) {
        super(cfg);
    }

    add() {
        TPZ.appendToPanel(
            TPZ.renderHtml(
                `<div id="${this.id.eventDisplay}" class="panel">${this.txt.currentLabel}: <b id="${this.id.currentEvent}"></b> - <b id="${this.id.currentCompetitor}"></b></div>`
            )
        );
    }

    update(event_name, competitor_name) {
        TPZ.getElementById(this.id.currentEvent).textContent = event_name;
        TPZ.getElementById(this.id.currentCompetitor).textContent =
            competitor_name;
    }
}

class ScoringPanel extends ViewObject {
    id = {
        scoreEntry: "score-entry",
        scoreHint: "score-hint",
        scorePanel: "score-panel",
        scoreSubmit: "score-submit",
    };

    constructor(cfg, state, compact) {
        super(cfg);
        this.state = state;
        this.compact = compact;
    }

    add(target) {
        TPZ.appendElements(
            target,
            TPZ.renderHtml(
                `<div id="${this.id.scorePanel}" class="panel"></div>`
            )
        );
    }

    render() {
        TPZ.getElementById(
            this.id.scorePanel
        ).innerHTML = `${this.txt.scoreLabel}: <div>
            <input id="${this.id.scoreEntry}" type="text" class="score-input" autofocus /> 
            <span id="max-score-label">/ ${this.state.ruleset.maxScore}</span>
            <button id="${this.id.scoreSubmit}" class="btn btn-theme">${this.txt.submit}</div>
        <div><p id="${this.id.scoreHint}"></p></div>`;
        let hint = "";
        if (this.state.ruleset.maxScore == 10) {
            switch (this.state.exp) {
                case "beg":
                    hint = "(6.0 - 7.0)";
                    break;
                case "int":
                    hint = "(7.0 - 8.0)";
                    break;
                case "adv":
                    hint = "(8.0 - 10.0)";
                    break;
            }
        }
        TPZ.getElementById(this.id.scoreHint).textContent = hint;
        this.box = TPZ.getElementById(this.id.scoreEntry);
        this.submit = TPZ.getElementById(this.id.scoreSubmit);
        this.submit.addEventListener("click", () => {
            let score = this.box.value;
            if (this.validate(score)) {
                let scorecard = {
                    score: parseFloat(score),
                    judgeID: this.cfg.clientId,
                    ringID: this.cfg.ringId,
                };
                TPZ.httpPostJson(this.cfg.api.submitScore, scorecard);
                this.disable();
            } else {
                TPZ.alert(this.txt.invalidScore);
            }
        });
        // configure 'enter' to submit
        this.box.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
                this.submit.click();
            }
        });
        this.box.focus();
    }

    clear() {
        this.box.value = "";
        this.box.disabled = false;
        this.submit.disabled = false;
        this.box.focus();
    }

    setScore(score) {
        this.box.value = score;
    }

    disable() {
        this.box.disabled = true;
        this.submit.disabled = true;
    }

    validate(input) {
        if (isNaN(input) || input == null) return false;
        let fScore = parseFloat(input);
        if (fScore < 0 || fScore >= this.state.ruleset.maxScore) return false;
        if (fScore % 1 === 0) return true;
        let decimals = fScore.toString().split(".")[1];
        let digits = decimals.length;
        if (digits == 1) return true;
        if (digits > 2) return false;
        if (this.state.ruleset.limitHundredths && decimals[1] !== "5")
            return false;
        return true;
    }
}

class EventTimer extends ViewObject {
    id = {
        eventTimer: "timer",
        timerButton: "timer-button",
        timerPanel: "timer-panel",
    };

    timerStart;
    registeredCBs = [];

    constructor(cfg, state) {
        super(cfg);
        this.state = state;
    }

    add() {
        TPZ.appendToPanel(
            TPZ.renderHtml(
                `<div id="${this.id.timerPanel}" class="row panel"><div class="col-2">` +
                    `<button id="${this.id.timerButton}" class="btn btn-info">${this.txt.startTimer}</button></div>` +
                    `<div class="col-2">${this.txt.timeLabel}: <span id="${this.id.eventTimer}">0:00:00</span></div></div></div>`
            )
        );
        this.timerButton = TPZ.getElementById(this.id.timerButton);
        this.timerButton.addEventListener("click", () => {
            this.toggle();
        });
        this.timeDisplay = TPZ.getElementById(this.id.eventTimer);
    }

    render() {
        if (this.state.eventStart) {
            this.stop();
            this.state.eventStart = null;
        }
        this.timerButton.textContent = this.txt.startTimer;
        this.timeDisplay.textContent = "0:00:00";
    }

    toggle() {
        if (!this.state.eventStart) {
            this.start();
        } else {
            this.stop();
        }
    }

    start() {
        // TODO: Take latency into account (iff a Timekeeper is managing the clock)
        // Head judge's clock should always start immediately on click
        this.state.eventStart = TPZ.time();
        this.timerStart = performance.now();
        if (this.cfg.timerInterval) {
            clearInterval(this.cfg.timerInterval);
        }
        this.cfg.timerInterval = setInterval(() => {
            let elapsed = new Date(performance.now() - this.timerStart);
            this.timeDisplay.textContent = this.formatTime(elapsed);
        }, 50);
        this.timerButton.textContent = this.txt.stopTimer;
        this.registeredCBs.forEach((cb) => {
            cb("start");
        });
    }

    stop() {
        clearInterval(this.cfg.timerInterval);
        let stop = performance.now();
        let elapsed = new Date(stop - this.timerStart);
        this.timeDisplay.textContent = this.formatTime(elapsed);
        this.registeredCBs.forEach((cb) => {
            cb("stop");
        });
    }

    reset() {
        this.render();
    }

    // register a handler for timer events
    // the callback function should handle "start" and "stop" events.
    register(cb) {
        this.registeredCBs.push(cb);
    }

    formatTime(t) {
        let m = t.getMinutes();
        let s = this.lPadNum(t.getSeconds(), 2);
        let ms = this.lPadNum(Math.trunc(t.getMilliseconds() / 10), 2);
        return `${m}:${s}:${ms}`;
    }

    lPadNum(number, digits) {
        return ("0".repeat(digits) + number).slice(-1 * digits);
    }
}

class DeductionPanel extends ViewObject {
    distinctKeypress = true;
    typingMode = false;

    id = {
        deductionPanel: "deduction-panel",
        deductBtn: "deduct-btn",
        deductList: "deduct-list",
    };

    constructor(cfg, state) {
        super(cfg);
        this.cfg = cfg;
        this.state = state;
    }

    add() {
        this.panel = TPZ.renderHtml(
            `<div id="${this.id.deductionPanel}" class="panel"></div>`
        );
        TPZ.appendToPanel(this.panel);
    }

    clear() {
        this.deductionCount = 0;
        this.panel.innerHTML = "";
    }

    disable() {
        this.panel.innerHTML = this.txt.inactiveJudge;
    }

    render() {
        this.panel.innerHTML =
            `<p>${this.txt.deductAttn}</p><p>${this.txt.deductInstr}</p>` +
            `<p>${this.txt.deductLabel}:</p><ul id="${this.id.deductList}"></ul>` +
            `<div><button id="${this.id.deductBtn}" class="btn btn-info">${this.txt.deductAdd}</button></div>`;
        /*
            `<div id="ded-cheatsheet"><table>` +
            `<thead><tr><th>Deduction Cheatsheet (2005)</th></tr></thead><tbody>` +
            `<tr><td><b>14</b></td><td>cross-leg balance</td></tr>` +
            `<tr><td><b>15</b></td><td>low balance w/ leg forward</td></tr>` +
            `<tr><td><b>16</b></td><td>low balance w/ leg behind</td></tr>` +
            `<tr><td><b>20</b></td><td>front sweep</td></tr>` +
            `<tr><td><b>21</b></td><td>back sweep</td></tr>` +
            `<tr><td><b>22</b></td><td>front split</td></tr>` +
            `<tr><td><b>23</b></td><td>snap kick / side kick</td></tr>` +
            `<tr><td><b>30</b></td><td>jump kick [flying, tornado, lotus, outside]</td></tr>` +
            `<tr><td><b>32</b></td><td>aerial cartwheel</td></tr>` +
            `<tr><td><b>33</b></td><td>butterfly kick</td></tr>` +
            `<tr><td><b>34</b></td><td>jump snap kick</td></tr>` +
            //`<tr><td><b>50</b></td><td>bow stance (弓步)</td></tr>` +
            //`<tr><td><b>51</b></td><td>horse stance (马步)</td></tr>` +
            //`<tr><td><b>52</b></td><td>empty [cat] stance (虚步)</td></tr>` +
            //`<tr><td><b>53</b></td><td>crouch [drop] stance (仆步)</td></tr>` +
            //`<tr><td><b>55</b></td><td>butterfly stance (蝶步)</td></tr>` +
            `<tr><td><b>62</b></td><td>sword wrapping</td></tr>` +
            `<tr><td><b>63</b></td><td>spear parry</td></tr>` +
            `<tr><td><b>70</b></td><td>body sway / loss of balance</td></tr>` +
            `<tr><td><b>71</b></td><td>extra support</td></tr>` +
            `<tr><td><b>72</b></td><td>body fall</td></tr>` +
            `<tr><td><b>73</b></td><td>weapon touches ground, handle falls, hits body, deforms</td></tr>` +
            `<tr><td><b>76</b></td><td>weapon ornament dropped or tangled, loose buttons, torn costume, shoes off</td></tr>` +
            `<tr><td><b>77</b></td><td>longtime balance less than two seconds</td></tr>` +
            `<tr><td><b>78</b></td><td>body touches outside carpet</td></tr>` +
            `<tr><td><b>79</b></td><td>movement forgotten</td></tr>` +
            `</tbody></table>`</div>`;*/

        this.deductionCount = 0;
        this.deductionsList = TPZ.getElementById(this.id.deductList);

        TPZ.getElementById(this.id.deductBtn).onclick = () => {
            this.mark();
        };

        // setup keyboard actions in the body
        document.body.addEventListener("keydown", (e) => {
            if (e.key == " " && this.distinctKeypress) {
                this.mark();
                this.distinctKeypress = false;
            } else if ("0" <= e.key && e.key <= "9" && !this.typingMode) {
                // if user starts typing a number, jump to first unfilled box
                this.typingMode = true;
                //let next = this.firstEmpty();
                //next.focus();
            }
        });
        document.body.addEventListener("keyup", (e) => {
            if (e.key == " " && !this.distinctKeypress) {
                this.distinctKeypress = true;
            }
        });
    }

    mark() {
        this.typingMode = false;
        let timestamp = TPZJudge.time();
        let deductId = `deduct-${this.deductionCount}`;
        let row = TPZ.renderHtml(
            `<li id="${deductId}" class="deduction-entry" data-ts="${timestamp}">` +
                '<button class="deduction-remove btn btn-outline-secondary">x</button>' +
                `<span class="deduction-label">${
                    this.deductionCount + 1
                }</span> - Code: <input class="deduction-code" type="text" />` +
                '<span class="deduction-submitted"></span>' +
                '<span class="deduction-name"></span></li>'
        );
        this.deductionsList.appendChild(row);

        // set all the events
        row.querySelector(".deduction-remove").onclick = () => {
            this.remove(deductId);
        };
        // Add event handling to the deduction box
        let dbox = TPZ.getElementById(deductId);
        let codebox = dbox.querySelector(".deduction-code");
        codebox.addEventListener("input", () => {
            dbox.dataset.changed = true;
            dbox.querySelector(".deduction-submitted").innerHTML = "";
        });
        codebox.addEventListener("keydown", (event) => {
            if (event.key == "Tab" || event.key == "Enter") {
                // user has pressed <TAB> or <ENTER>
                event.preventDefault();
                this.next(dbox);
                // submit this deduction
                //this.submit(dbox);
            } else if (event.which === 32) {
                event.preventDefault();
            }
        });
        codebox.addEventListener("keyup", (event) => {
            if (event.key == "Tab" || event.key == "Enter") {
                return;
            }
            // When a valid deduction is entered, move on to the next (if possible)
            let deductionText = dbox.querySelector(".deduction-code").value;
            if (deductionText.length > 1) {
                let deductionCode = deductionText;
                if (this.validate(deductionCode)) {
                    dbox.classList.remove("deduction-invalid");
                    this.submit(dbox);
                    // add deduction name
                    let dName = this.toName(deductionCode);
                    dbox.querySelector(".deduction-name").textContent = dName;
                    if (deductionText.length > 1) {
                        // automatically move to the next box
                        this.next(dbox);
                    }
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
        this.deductionCount += 1;
        // submit the blank deduction
        let ded = {
            timestamp: parseInt(timestamp),
            judgeID: this.cfg.clientId,
            routineID: this.state.routineId,
            ringID: parseInt(this.cfg.ringId),
        };
        TPZ.httpSendJson(this.cfg.api.markDeduction, "POST", ded);
    }

    validate(code) {
        // TODO: check if server copy exists (preferred)
        /*
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
        }
        */
        // use the local copy
        if (code.toUpperCase() in DEDUCTION_CODES) {
            return true;
        }
        return false;
    }

    toName(code) {
        // TODO: check if server copy exists
        // use the local copy
        code = code.toUpperCase();
        let c = DEDUCTION_CODES[code];
        if (c != undefined) {
            return c.en;
        }
        return "invalid";
    }

    submit(deductElement) {
        if (deductElement.dataset.changed == "false") {
            return;
        }
        let label = deductElement.querySelector(".deduction-label").textContent;
        let code = deductElement.querySelector(".deduction-code").value;
        if (code === "") {
            alert(`Deduction #${label} is missing its code!`);
            return;
        }
        if (code.length == 1) {
            code = "0" + code;
        }
        code = code.toUpperCase();
        if (!this.validate(code)) {
            alert(`Deduction #${label}: ${code} is not a valid code`);
            return;
        }
        let ded = {
            timestamp: parseInt(deductElement.dataset.ts),
            code: code,
            judgeID: this.cfg.clientId,
            routineID: this.state.routineId,
            ringID: parseInt(this.cfg.ringId),
        };
        //let method = "POST";
        let method = "UPDATE"; // all submissions are now "updates"
        if (deductElement.dataset.submitted == "true") {
            // this deduction has been submitted before
            // send an update
            method = "UPDATE";
        }
        TPZ.httpSendJson(this.cfg.api.submitDeduction, method, ded, () => {
            deductElement.querySelector(".deduction-submitted").innerHTML =
                "&#x2705;";
            deductElement.dataset.changed = false;
            deductElement.dataset.submitted = true;
        });
    }

    remove(deductId) {
        let dbox = TPZ.getElementById(deductId);
        let label = dbox.querySelector(".deduction-label").textContent;
        if (confirm(`Remove deduction #${label}?`)) {
            let ded = {
                timestamp: parseInt(dbox.dataset.ts),
                judgeID: this.cfg.clientId,
                routineID: this.state.routineId,
                ringID: parseInt(this.cfg.ringId),
            };
            TPZ.httpSendJson("/api/submit-deduction", "DELETE", ded);
            dbox.remove();
        }
    }

    next(deductElement) {
        console.log("NEXT");
        let nextElement = deductElement.nextElementSibling;
        if (nextElement != undefined) {
            nextElement.querySelector(".deduction-code").focus();
        } else {
            nextElement = this.firstEmpty();
            if (nextElement != undefined) {
                nextElement.focus();
            } else {
                // back to the top
                document.getElementsByClassName("deduction-code")[0].focus();
            }
        }
    }

    firstEmpty() {
        let deductions = document.getElementsByClassName("deduction-code");
        for (let i = 0; i < deductions.length; i += 1) {
            let code = deductions[i];
            if (code.value == "") {
                return code;
            }
        }
        return null;
    }
}

DEDUCTION_CODES = {
    99: { en: "deduction", value: 0.1 },
    "01": {
        en: "Fist",
        value: 0.1,
    },
    "02": {
        en: "Palm; Tiger's Claw",
        value: 0.1,
    },
    "03": {
        en: "Hook; Crane's Beak",
        value: 0.1,
    },
    "04": {
        en: "Sword Fingers; Single Finger Palm",
        value: 0.1,
    },
    "05": {
        en: "Hand Techniques",
        value: 0.1,
    },
    "06": {
        en: "Body Posture",
        value: 0.1,
    },
    10: {
        en: "Grasp the foot and bring it to head level; Side kick up to catch the foot at head level",
        value: 0.1,
    },
    12: {
        en: "Backward Leaning Balance",
        value: 0.1,
    },
    13: {
        en: "Forward Leaning Balance with Arms Outspread",
        value: 0.1,
    },
    14: {
        en: "[Front / Rear] Cross-legged Balance",
        value: 0.1,
    },
    15: {
        en: "Sidewards Leaning Balance; Exploring the Ocean Balance",
        value: 0.1,
    },
    16: {
        en: "Gazing at the Moon Balance",
        value: 0.1,
    },
    17: {
        en: "Forward Sole Kick with Low Step Balance",
        value: 0.1,
    },
    18: {
        en: "Low Balance with Leg Stretched Forward",
        value: 0.1,
    },
    19: {
        en: "Low Balance with Leg Crossed Behind",
        value: 0.1,
    },
    20: {
        en: "Front Sweep",
        value: 0.1,
    },
    21: {
        en: "Back Sweep",
        value: 0.1,
    },
    22: {
        en: "Falling Front Split; Hurdler's Split Position",
        value: 0.1,
    },
    23: {
        en: "[Snap / Spring / Heel Push / Side / Horizontal Stamping / Tiger Tail / Parting] Kick",
        value: 0.1,
    },
    24: {
        en: "[Front / Side] Stretch Kick",
        value: 0.1,
    },
    25: {
        en: "[Inward / Lotus / Front Slap] Kick; Turning Back Crescent Kick",
        value: 0.1,
    },
    26: {
        en: "Single Knee Raised Position",
        value: 0.1,
    },
    27: {
        en: "Horizontal Nail Kick",
        value: 0.1,
    },
    30: {
        en: "Jumping [Front / Slant / Double Front Slap / Tornado / Lotus / Outer Crescent] Kick",
        value: 0.1,
    },
    31: {
        en: "Jumping Front Straight Kick",
        value: 0.1,
    },
    32: {
        en: "Aerial Cartwheel [Twist]",
        value: 0.1,
    },
    33: {
        en: "Butterfly Kick [Twist]",
        value: 0.1,
    },
    34: {
        en: "Jumping [Snap / Spring / Heel Push] Kick",
        value: 0.1,
    },
    40: {
        en: "Flying Cross Legged Kick 360° to Landing on Side",
        value: 0.1,
    },
    42: {
        en: "Jumping Double Side Kick",
        value: 0.1,
    },
    50: {
        en: "Bow Stance",
        value: 0.1,
    },
    51: {
        en: "Horse Stance",
        value: 0.1,
    },
    52: {
        en: "Empty Stance",
        value: 0.1,
    },
    53: {
        en: "Crouching Stance",
        value: 0.1,
    },
    54: {
        en: "Cross-Legged Crouching Stance",
        value: 0.1,
    },
    55: {
        en: "Butterfly Stance",
        value: 0.1,
    },
    56: {
        en: "Single Kneeling Stance",
        value: 0.1,
    },
    57: {
        en: "Dragon Riding Stance",
        value: 0.1,
    },
    58: {
        en: "Cross-Legged Sitting",
        value: 0.1,
    },
    59: {
        en: "[Advancing / Retreating / Forward / Follow-Up / Sideways] Step",
        value: 0.1,
    },
    60: {
        en: "Straight Sword [Hooking Parry / Uppercut]; Fan [Hooking Parry / Uppercut]",
        value: 0.1,
    },
    61: {
        en: "Gripping the Straight Sword; Fan [Opening / Closing]",
        value: 0.1,
    },
    62: {
        en: "Broadsword Twining; Wrapping with the Broadsword",
        value: 0.1,
    },
    63: {
        en: "[Outward / Inward] Blocking with the Spear; Spear Thrust; Fan [Thrust / Chop]",
        value: 0.1,
    },
    64: {
        en: "Horizontal Cudgel Windmill Waving",
        value: 0.1,
    },
    65: {
        en: "Vertical Figure '8' with the [Spear / Cudgel]; Vertical Uppercutting Cudgel",
        value: 0.1,
    },
    66: {
        en: "Weapon Throwing & Catching Techniques",
        value: 0.1,
    },
    67: {
        en: "Cudgel Handle Planting",
        value: 0.1,
    },
    68: {
        en: "Straight Sword Enveloping",
        value: 0.1,
    },
    69: {
        en: "Fan Pointing",
        value: 0.1,
    },
    "70A": {
        en: "Torso sways",
        value: 0.05,
    },
    "70B": {
        en: "Foot shuffles or skips",
        value: 0.1,
    },
    71: {
        en: "Additional Support",
        value: 0.2,
    },
    72: {
        en: "Fall",
        value: 0.3,
    },
    73: {
        en: "Weapon unintentionally makes contact with the floor; Loss of grip; Weapon strikes the body; Weapon deforms; Fan surface is detached from fan's ribs",
        value: 0.1,
    },
    74: {
        en: "Weapon Broken; Main or minor ribs of the fan breaks, nails on the ribs falls off/detached",
        value: 0.2,
    },
    75: {
        en: "Weapon dropped on the floor",
        value: 0.3,
    },
    76: {
        en: "Broad Sword Ribbon; Straight sword Tassel; Spear Tassel; Garment Item; Headwear dropped on the floor; Broad Sword Ribbon; Straight sword Tassel; Soft Weapon entangles hand or body; Costume torn or button opened up; Shoes dropped off",
        value: 0.1,
    },
    77: {
        en: "Balance technique not completed rhythmically and quickly according to the characteristics of the event; Balance technique not maintained for at least 2 seconds",
        value: 0.1,
    },
    78: {
        en: "Out-of-bounds",
        value: 0.1,
    },
    79: {
        en: "Forgetting (Movement Forgotten)",
        value: 0.1,
    },
    80: {
        en: "For each missing/altering compulsory/mandatory technique in [compulsory / optional] routines;",
        value: 0.2,
    },
    81: {
        en: "Compulsory Routines: Missing or additional step",
        value: 0.1,
    },
    82: {
        en: "Nanquan, Nandao, Nangun Compulsory Routines: For each missing or additional vocalization or did not vocalize in accordance with the requirement",
        value: 0.2,
    },
    83: {
        en: "A static state (excluding balance techniques) which is held for longer than 2 seconds; During Taijiquan or Taijijian there is an obvious unmethodical pause prior to the execution of Degree of Difficulty technique; Performing non-offensive or non-defensive actions that disrupts the routine's rhythm before executing the Degree of Difficulty techniques",
        value: 0.1,
    },
    84: {
        en: "For Changquan type and Nanquan Type events (including weapon routines), movements done in averted directions exceeding 90 degrees; For Taijiquan and Taijijian events, movements done in averted directions exceeding 45 degrees",
        value: 0.1,
    },
    85: {
        en: "Between 2 groups of Degree of Difficulty techniques, there are less than 2 complete technique movements",
        value: 0.1,
    },
    86: {
        en: "Events Requiring Musical Accompaniment: No music or music which includes vocals/lyrics",
        value: 0.5,
    },
    90: {
        en: "Attack goes wide or off target area; Footwork/Stance, Leg Technique not meeting the requirements; Jumping technique, Tumbling Technique not meeting the requirements; Weapon Technique not meeting the requirements",
        value: 0.1,
    },
    91: {
        en: "Motionless state held for more than 3 seconds; Jumping technique, Tumbling Technique not meeting the requirements",
        value: 0.1,
    },
    92: {
        en: "Duration without attack and defense exceeds 3 seconds; Weapon Technique not meeting the requirements",
        value: 0.1,
    },
    93: {
        en: "Misses in attack or defense; Misses in attack or defense during sparring content",
        value: 0.1,
    },
    94: {
        en: "Waiting for partner to attack; Waiting for partner to attack during sparring content",
        value: 0.1,
    },
    95: {
        en: "Mishit on Partner/s; Mishit on Partner/s during sparring content",
        value: 0.1,
    },
    96: {
        en: "Single technique not executed uniformly",
        value: 0.1,
    },
    97: {
        en: "Group formation not uniform",
        value: 0.1,
    },
};
// TODO: Allow user to press [z | x] to mark next skill
class NanduPanel extends ViewObject {
    lineMax = 4;
    id = {
        nanduPanel: "nandu-panel",
        nanduSheet: "nandu-sheet",
        scoreSubmit: "score-submit",
    };

    class = {
        success: "nandu-success",
        failure: "nandu-fail",
        mark: "nandu-mark",
    };

    constructor(cfg, state) {
        super(cfg);
        this.state = state;
    }

    add() {
        this.panel = TPZ.renderHtml(
            `<div id="${this.id.nanduPanel}" class="panel"></div>`
        );
        TPZ.appendToPanel(this.panel);
    }

    clear() {
        this.panel.innerHTML = "";
        this.nanduCount = 0;
    }

    disable() {
        this.panel.innerHTML = this.txt.inactiveJudge;
    }

    set(sheet) {
        this.sheet = sheet;
    }

    newRow(section, row) {
        let rowId = `s${section}-r${row}`;
        let html = `<tr id=${rowId}>`;
        for (let i = 0; i < this.lineMax; i++) {
            let cellId = `${rowId}-${i}`;
            html += `<td id="${cellId}"></td>`;
        }
        html += "</td>";
        return TPZ.renderHtml(html);
    }

    addNanduComponent(section, row, cell, code, name) {
        let cellId = `s${section}-r${row}-${cell}`;
        let n = TPZ.getElementById(cellId);
        n.classList.add("nandu-component");
        n.innerText = code;
        n.appendChild(TPZ.renderHtml(`<span class="nandu-mark"></span>`));

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
                n.classList.remove(this.class.failure);
                n.classList.add(this.class.success);
                n.querySelector(".nandu-mark").innerHTML = "&#x2705";
            } else {
                n.classList.add(this.class.failure);
                n.classList.remove(this.class.success);
                n.querySelector(".nandu-mark").innerHTML = "&#x274C";
            }
        });
        return n;
    }

    render(nandusheet) {
        this.panel.innerHTML =
            `<p>${this.txt.nanduToggle}</p><div id="${this.id.nanduSheet}"></div>` +
            `<button type="button" class="btn btn-primary" id="${this.id.scoreSubmit}">${this.txt.submit}</button>`;

        for (let i in nandusheet) {
            // Create the table describing the form section
            let sectionLabel = parseInt(i) + 1;
            let rowCount = 0;
            let sectionTable = TPZ.renderHtml(
                `<table class="table nandu" id="s${sectionLabel}">` +
                    `<caption>Section ${sectionLabel}</caption></table>`
            );
            TPZ.getElementById(this.id.nanduSheet).append(sectionTable);
            let sectionBody = TPZ.renderHtml("<tbody></tbody>");
            sectionTable.append(sectionBody);

            // Add the nandu for this section
            let combos = this.parseNanduString(nandusheet[i]);
            combos.forEach((val) => {
                if (val === undefined || val === "") {
                    return;
                }
                let combo = this.parseNanduCombo(val);
                for (let nandu of combo) {
                    // start a new row
                    rowCount++;
                    let rowItemCount = 0;
                    let row = this.newRow(sectionLabel, rowCount);
                    sectionBody.append(row);
                    this.addNanduComponent(
                        sectionLabel,
                        rowCount,
                        rowItemCount,
                        nandu.base.code,
                        nandu.base.name
                    );
                    rowItemCount++;
                    for (let n of nandu.connections) {
                        this.addNanduComponent(
                            sectionLabel,
                            rowCount,
                            rowItemCount,
                            n.code,
                            n.name
                        );
                        rowItemCount++;
                    }
                }
            });
        }

        TPZ.getElementById(this.id.scoreSubmit).addEventListener(
            "click",
            () => {
                TPZ.confirm(this.txt.submitQ, () => {
                    // tally the results
                    let results = [];
                    let components =
                        document.getElementsByClassName("nandu-component");
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
                        routineID: this.state.routineId,
                        judgeID: this.cfg.clientId,
                        result: results,
                        ringID: parseInt(this.cfg.ringId),
                    };
                    TPZ.httpPostJson("/api/submit-nandu", scorecard, () => {
                        TPZ.getElementByClass(this.class.mark).disabled = true;
                        TPZ.getElementById(this.id.scoreSubmit).disabled = true;
                    });
                });
            }
        );
    }

    codes = {
        general: {
            "111A": {
                en: "Grasp the foot and bring it to head level with the leg held vertically while remaining standing",
                value: 0.2,
            },
            "133B": {
                en: "Forward Leaning Balance with Arms Outspread",
                value: 0.3,
            },
            "112A": {
                en: "Side kick up to catch the foot at head level with the leg held vertically while remaining standing",
                value: 0.2,
            },
            "123A": { en: "Backward Leaning Balance", value: 0.2 },
            "153A": { en: "Exploring the Ocean Balance", value: 0.2 },
            "163A": { en: "Gazing at the Moon Balance", value: 0.2 },
            "244A": { en: "Front Sweep 540°", value: 0.2 },
            "244B": { en: "Front Sweep 900°", value: 0.3 },
            "312A": { en: "Jumping Front Slap Kick", value: 0.2 },
            "312B": { en: "Jumping Front Straight Kick", value: 0.3 },
            "323A": { en: "Tornado Kick 360°", value: 0.2 },
            "323B": { en: "Tornado Kick 540°", value: 0.3 },
            "323C": { en: "Tornado Kick 630° (F)/720°", value: 0.4 },
            "324A": { en: "Jumping Lotus Kick 360°", value: 0.2 },
            "324B": { en: "Jumping Lotus Kick 540°", value: 0.3 },
            "324C": { en: "Jumping Lotus Kick 630° (F)/720°", value: 0.4 },
            "333A": { en: "Butterfly Kick", value: 0.2 },
            "353B": { en: "Butterfly Twist 360°", value: 0.3 },
            "353C": { en: "Butterfly Twist 720°", value: 0.4 },
            "335A": { en: "Aerial Cartwheel", value: 0.2 },
            "355B": { en: "Aerial Cartwheel Twist 360°", value: 0.3 },
            "346A": { en: "No-Step Back Flip", value: 0.2 },
            "346B": { en: "Single Step Back Flip", value: 0.3 },
            "415A": { en: "Jumping Double Side Kick", value: 0.2 },
            "423A": {
                en: "Flying Cross Legged 360° Kick to Falling on Side",
                value: 0.2,
            },
            "447A": { en: "Carp Kip-Up", value: 0.2 },
        },
        taijiquan: {
            "142A": {
                en: "Forward Stepping Kick with Low Step Balance",
                value: 0.2,
            },
            "143A": {
                en: "Low Balance with Leg Stretched Forward",
                value: 0.2,
            },
            "143B": { en: "Low Balance with Leg Crossed Behind", value: 0.3 },
            "212A": { en: "Parting Kick / Heel Kick", value: 0.2 },
            "312A": { en: "Jumping Front Slap Kick", value: 0.2 },
            "312B": { en: "Jumping Front Straight Kick", value: 0.3 },
            "323A": { en: "Tornado Kick 180°", value: 0.2 },
            "323B": { en: "Tornado Kick 360°", value: 0.3 },
            "323C": { en: "Tornado Kick 450° (F)/540°", value: 0.4 },
            "324B": { en: "Jumping Lotus Kick 360°", value: 0.3 },
            "324C": { en: "Jumping Lotus Kick 450° (F)/540°", value: 0.4 },
        },
    };

    connections = {
        changquan: {
            "244A+6": { value: 0.1 },
            "312A+6": { value: 0.1 },
            "312A+323A": { value: 0.1 },
            "312A+324A": { value: 0.1 },
            "312A+353B": { value: 0.1 },
            "323A+1": { value: 0.1 },
            "323A+4": { value: 0.1 },
            "323A+6": { value: 0.1 },
            "323A+324A": { value: 0.1 },
            "323A+353B": { value: 0.1 },
            "324A+1": { value: 0.1 },
            "324A+4": { value: 0.1 },
            "324A+6": { value: 0.1 },
            "324A+7": { value: 0.1 },
            "333A+353B": { value: 0.1 },
            "333A+6": { value: 0.1 },
            "335A+4": { value: 0.1 },
            "335A+353B": { value: 0.1 },
            "312A+9": { value: 0.1 },
            "445A+9": { value: 0.1 },
            "312A+335A": { value: 0.15 },
            "312A+323B": { value: 0.15 },
            "312A+324B": { value: 0.15 },
            "323A+3": { value: 0.15 },
            "323A+324B": { value: 0.15 },
            "323B+1": { value: 0.15 },
            "323B+4": { value: 0.15 },
            "323B+6": { value: 0.15 },
            "324A+3": { value: 0.15 },
            "324B+1": { value: 0.15 },
            "324B+6": { value: 0.15 },
            "333A+244A": { value: 0.15 },
            "353B+4": { value: 0.15 },
            "353B+323B": { value: 0.15 },
            "335A+323B": { value: 0.15 },
            "323A+9": { value: 0.15 },
            "324A+9": { value: 0.15 },
            "312A+323C": { value: 0.2 },
            "312A+324C": { value: 0.2 },
            "312A+353C": { value: 0.2 },
            "323A+353C": { value: 0.2 },
            "323B+3": { value: 0.2 },
            "323B+324B": { value: 0.2 },
            "323C+1": { value: 0.2 },
            "323C+6": { value: 0.2 },
            "324B+0": { value: 0.2 },
            "324B+3": { value: 0.2 },
            "324C+6": { value: 0.2 },
            "333A+353C": { value: 0.2 },
            "353B+323C": { value: 0.2 },
            "335A+323C": { value: 0.2 },
            "335A+353C": { value: 0.2 },
            "323B+324C": { value: 0.25 },
            "323C+4": { value: 0.25 },
            "324C+1": { value: 0.25 },
            "353C+4": { value: 0.25 },
        },
        nanquan: {
            "312A+3": { value: 0.1 },
            "323A+1": { value: 0.1 },
            "323A+2": { value: 0.1 },
            "323A+312A": { value: 0.1 },
            "323A+324A": { value: 0.1 },
            "324A+1": { value: 0.1 },
            "324A+346A": { value: 0.1 },
            "335A+10": { value: 0.1 },
            "346A+2": { value: 0.1 },
            "312A+346B": { value: 0.15 },
            "323A+324B": { value: 0.15 },
            "323B+1": { value: 0.15 },
            "323B+2": { value: 0.15 },
            "324A+346B": { value: 0.15 },
            "324B+1": { value: 0.15 },
            "346B+2": { value: 0.15 },
            "447A+2": { value: 0.15 },
            "323A+3": { value: 0.2 },
            "323A+346B": { value: 0.2 },
            "323B+324B": { value: 0.2 },
            "324A+3": { value: 0.2 },
            "324B+0": { value: 0.2 },
            "324B+346B": { value: 0.2 },
            "346B+11": { value: 0.2 },
            "323C+1": { value: 0.25 },
            "324C+1": { value: 0.25 },
            "323B+324C": { value: 0.2 },
        },
        taijiquan: {
            "142A+3": { value: 0.1 },
            "143A+3": { value: 0.1 },
            "143A+212A": { value: 0.1 },
            "312A+3": { value: 0.1 },
            "312A+324B": { value: 0.1 },
            "323A+3": { value: 0.1 },
            "323B+8": { value: 0.1 },
            "324B+8": { value: 0.1 },
            "143B+3": { value: 0.15 },
            "143B+212A": { value: 0.15 },
            "312A+324C": { value: 0.15 },
            "312B+8": { value: 0.15 },
            "324B+5": { value: 0.15 },
            "323B+3": { value: 0.2 },
            "324B+3": { value: 0.2 },
            "324C+5": { value: 0.2 },
            "323C+3": { value: 0.25 },
            "324C+3": { value: 0.25 },
        },
    };

    parseNanduString(s) {
        return s.split(",");
    }

    parseNanduCombo(s) {
        // Possible formats: 312B+8,312A+324B+5;312A+3,323A+3;143B;
        // ex1: base: 312B, conn: 312B+8
        // ex2: base: 312A, conn: 312A+324B; base: 324B, conn: 324B+5
        let component_codes = s.split("+");
        let bases = [];
        if (component_codes.length == 1) {
            bases.push(new Nandu(this.getNanduBase(component_codes[0]), []));
            return bases;
        }
        for (let i = 0; i + 1 < component_codes.length; i++) {
            let base = this.getNanduBase(component_codes[i]);
            let combo = component_codes[i] + "+" + component_codes[i + 1];
            let connection = this.getNanduConnection(combo);
            bases.push(new Nandu(base, [connection]));
        }
        return bases;
    }

    getNanduBase(code) {
        let isTaiji = this.state.eventName.toLowerCase().indexOf("taiji") > -1;
        if (isTaiji) {
            // Check for taiji specific nandu codes first
            let t = this.codes.taijiquan[code];
            if (t) {
                return new NanduComponent(code, t.name, t.value);
            }
        }
        let v = this.codes.general[code];
        return new NanduComponent(code, v.name, v.value);
    }
    getNanduConnection(combo) {
        let isTaiji = this.state.eventName.toLowerCase().indexOf("taiji") > -1;
        if (isTaiji) {
            let value = this.connections.taijiquan[combo];
            return new NanduComponent(combo, "connection", value);
        }
        let isNanquan =
            this.state.eventName.toLowerCase(" nq ") > -1 ||
            this.state.eventName.toLowerCase(" ng ") > -1 ||
            this.state.eventName.toLowerCase(" nd ") > -1;
        if (isNanquan) {
            let value = this.connections.nanquan[combo];
            return new NanduComponent(combo, "connection", value);
        }
        let value = this.connections.changquan[combo];
        return new NanduComponent(combo, "connection", value);
    }
}

class Nandu {
    constructor(base, connections) {
        this.base = base;
        this.connections = connections;
    }
}

class NanduComponent {
    constructor(code, name, value) {
        this.code = code;
        this.name = name;
        this.value = value;
    }
}

class DeductionResultPanel extends ViewObject {
    constructor(cfg) {
        super(cfg);
    }

    add(target) {
        let deductionsPanel = TPZ.renderHtml(
            "Deductions:" +
                '<span id="deduction-results"></span>' +
                '<table id="deduction-table"><caption>Codes</caption></table>' +
                '<div id="ded-time"></div>'
        );
        TPZ.appendElements(target, deductionsPanel);
        DeductionTimeline.init("ded-time");
    }

    handleTimer(e) {
        if (e == "start") {
            DeductionTimeline.start();
        } else if (e == "stop") {
            DeductionTimeline.stop();
        }
    }

    update() {
        TPZ.httpGetJson(`/api/${this.cfg.ringId}/get-deductions`, (data) => {
            this.display(data);
        });
    }

    display(data) {
        let dmap = data["deductions"];
        let dResults = dmap["result"];
        if (dResults != undefined) {
            let dList = TPZ.getElementById("deduction-results");
            dList.innerHTML = "";
            for (let i in dResults) {
                dList.innerHTML += dResults[i].code + "&nbsp;";
            }
        }
        let judgeNum = 1;
        for (let key in dmap) {
            let times = [];
            let codes = [];

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
                times.push(d.timestamp);
                let code = d.code;
                if (code === "") {
                    code = "&nbsp;&nbsp;";
                }
                codes.push(d.code);
                let cell = TPZ.renderHtml("<td>" + code + "</td>");
                dRow.appendChild(cell);
                if (d.applied) {
                    cell.classList.add("applied");
                }
            }
            DeductionTimeline.set(judgeNum, times, codes);
            judgeNum++;
        }
    }
}

class NanduResultPanel extends ViewObject {
    constructor(cfg) {
        super(cfg);
    }

    add(target) {
        let nanduPanel = TPZ.renderHtml(
            '<p id="nandu-label">Nandu: </p><ul id="nandu-list"></ul>' +
                '<table id="nandu-table"><thead><tr id="nandu-codes"></tr></thead>' +
                '<tbody id="nandu-results"></tbody></table>'
        );
        TPZ.appendElements(target, nanduPanel);
    }

    render(nandusheet) {
        let header = TPZ.getElementById("nandu-codes");
        for (let section of nandusheet) {
            let combos = section.split(",");
            for (let combo of combos) {
                let components = combo.split("+");
                for (let i in components) {
                    let name = components[i];
                    let cell = TPZ.renderHtml(`<th>${name}</th>`);
                    header.append(cell);
                    if (i == 0 && components.length > 2) {
                        cell = TPZ.renderHtml(`<th>&nbsp;</th>`);
                        header.append(cell);
                    }
                }
            }
        }
    }

    update() {
        TPZ.httpGetJson(`/api/${this.cfg.ringId}/get-nandu-scores`, (data) => {
            this.display(data);
        });
    }

    display(data) {
        let marks = data["marks"];
        let table = TPZ.getElementById("nandu-results");
        table.innerHTML = "";
        for (let judge in marks) {
            let row = TPZ.renderHtml("<tr></tr>");
            let submittedNandu = marks[judge];
            for (let i in submittedNandu) {
                if (submittedNandu[i]) {
                    row.appendChild(
                        TPZ.renderHtml(
                            `<td class="nandu-success">${this.txt.nanduSuccess}</td>`
                        )
                    );
                } else {
                    row.appendChild(
                        TPZ.renderHtml(
                            `<td class="nandu-fail">${this.txt.nanduFail}</td>`
                        )
                    );
                }
            }
            table.appendChild(row);
        }
    }
}

TPZJudge.init();
