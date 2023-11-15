// TPZJudge builds the judging interfaces for all judging roles
var TPZJudge = (() => {
    // TODO: add Chinese translation
    // English text
    var txtEN = {
        add: "Add",
        adjAdd: "Add adjustment",
        adjLabel: "Adjustments",
        adjReason: "Reason",
        adjWarn: "Please submit or clear the adjustment!",
        calculatedScore: "Calculated",
        continueNext: "Results not finalized! Continue?",
        currentLabel: "Now",
        deductAdd: "Add Deduction",
        deductAttn: "Deductions are submitted live!",
        deductInstr:
            "Hit the 'SPACEBAR' key or press the 'Add Deduction' button to mark a deduction",
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
        scoresLabel: "Scores submitted",
        selectJudge: "Select a judge role!",
        selectLabel: "Select",
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
            current: () => {
                return `/api/${cfg.ringId}/current`;
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
            publishScore: "/api/finalize-score",
            rescore: "/api/rescore",
            settings: "/api/get-settings",
            submitAdj: "/api/submit-adjustment",
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
        }
    }

    function phoneHome() {
        let start = performance.now();
        TPZ.httpGetJson(cfg.api.settings, (settings) => {
            let rtt = performance.now() - start;
            setPing(rtt);
            if (cfg.time.offset == 0) {
                // determine time difference between client and server clocks
                let now = Date.now();
                let serverTime = parseInt(settings.timestamp);
                serverTime -= rtt / 2;
                TPZ.setTimeOffset(serverTime - now);
                cfg.time.offset = serverTime - now;
            }
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
        pingDisplay.title = `${rtt.toFixed(1)} ms`;
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
            limitHundredths: true,
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
            this.cfg.api.current(),
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
                    this.cache.ruleset.maxScore = 5;
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
        this.scoringPanel = new ScoringPanel(this.cfg, this.cache);
        this.adjustments = new AdjustmentPanel(this.cfg, this.cache);
        this.deductionResult = new DeductionResultPanel(this.cfg);
        this.nanduResult = new NanduResultPanel(this.cfg);
        this.scoreList = new ScoreList(this.cfg, this.cache);
        this.scoreDisplay = new ScoreDisplay(this.cfg);
        this.scoreManager = new ScoreManager(this.cfg);

        this.eventTimer.register(this.deductionResult.handleTimer);
        this.scoreManager.registerHandler((data) => {
            this.scoreList.onUpdate(data);
            this.scoreDisplay.onUpdate(data);
            // check for own submission
            let submitted = Object.keys(data.scores);
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
            () => {
                return this.pubWarn();
            },
            () => {
                this.publish();
            }
        );
        this.eventControl.add();
        this.eventTimer.add();
        this.scoringPanel.add();

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
            this.cache.published = false;
            this.updateEventInfo(() => {
                this.render();
                this.scoreManager.update();
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
        this.scoreList.add(this.panel);
        switch (this.cache.ruleset.name) {
            case "IWUF":
                this.deductionResult.add(this.panel);
                this.nanduResult.add(this.panel);
                break;
            case "IWUF-AB":
                this.deductionResult.add(this.panel);
                break;
        }
        this.adjustments.add(this.panel);
        this.scoreDisplay.add(this.panel);
        this.pub.add(this.panel);
    }

    pubWarn() {
        if (this.adjustments.hasUnsubmitted()) {
            TPZ.alert(this.txt.adjWarn);
            return true;
        }
        return false;
    }

    publish() {
        let data = { ringID: parseInt(this.cfg.ringId) };
        TPZ.httpPostJson(this.cfg.api.publishScore, data, () => {
            this.setPublished();
            // automatically move onto the next competitor
            this.eventControl.selectNextCompetitor();
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
                    TPZ.alert("Please re-enter a score");
                    this.scoringPanel.clear();
                    break;
            }
        };
        this.connect();
    }

    render() {
        this.scoringPanel.add();
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
        TPZ.addScratchpad(this.cache.scratch);
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
            `<div>${this.txt.scoresLabel} (<span id="${this.id.ct}">0</span>):` +
                `<ul id="${this.id.list}"></ul>` +
                `<div>${this.txt.spread}: <span id="${this.id.spread}"></span>` +
                `<button id="${this.id.btn}" class="btn btn-secondary">${this.txt.rescoreBtn}</button></div></div>`
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

    constructor(cfg, warn, cb) {
        super(cfg);
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
        TPZ.confirm(this.txt.publishWarn, this.cb);
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
            ${this.txt.adjAdd}: <span id="adjust-minus">&nbsp;-&nbsp;</span><input id="${this.id.adj}" type="text" class="score-input"/>
            ${this.txt.adjReason}: <input id="${this.id.reason}" type="text" />
            <button id="${this.id.btn}" class="btn btn-secondary">${this.txt.add}</button></div>
            <p id="${this.id.listLabel}"></p><ul id="${this.id.list}"></ul>`);
        target.appendChild(adjPanel);
        this.adj = TPZ.getElementById(this.id.adj);
        this.reason = TPZ.getElementById(this.id.reason);
        target.appendChild(TPZ.renderHtml("<br/>"));
        TPZ.getElementById(this.id.btn).onclick = () => {
            let adjValue = parseFloat(this.adj.value);
            if (this.validate(adjValue)) {
                this.submit(adjValue, reason.value);
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
        if (value > -10 && value < 10) {
            if (Math.trunc(value * 10) % 1 === 0) {
                // Check that the score uses at most the tenths digit
                return true;
            } else if (Math.trunc(value * 100) % 5 === 0) {
                // Allow for five-hundredths of a point (special cases)
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
        if (adjs && adjs.length > 0) {
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
            TPZ.getElementById(
                this.id.listLabel
            ).textContent = `${this.txt.adjLabel}: ${total}`;
        }
    }
}

class ScoreDisplay extends ViewObject {
    id = {
        container: "final-score-container",
        label: "final-score-label",
        score: "final-score",
    };

    constructor(cfg) {
        super(cfg);
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

    constructor(cfg, state) {
        super(cfg);
        this.state = state;
    }

    add() {
        TPZ.appendToPanel(
            TPZ.renderHtml(
                `<div id="${this.id.scorePanel}" class="panel"></div>`
            )
        );
    }

    render() {
        TPZ.getElementById(
            this.id.scorePanel
        ).innerHTML = `${this.txt.scoreLabel}: <div>
            <input id="${this.id.scoreEntry}" type="text" class="score-input" /> / ${this.state.ruleset.maxScore}
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
    }

    clear() {
        this.box.value = "";
        this.box.disabled = false;
        this.submit.disabled = false;
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
        this.state.eventStart = getTimestamp();
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
                let next = this.firstEmpty();
                next.focus();
            }
        });
        document.body.addEventListener("keyup", (e) => {
            if (e.key == " " && this.distinctKeypress) {
                this.distinctKeypress = false;
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
                //gotoNextDeductionBox(dbox);
                // submit this deduction
                //this.submit(dbox);
            } else if (event.which === 32) {
                event.preventDefault();
            }
        });
        codebox.addEventListener("keyup", (event) => {
            // When a valid deduction is entered, move on to the next (if possible)
            let deductionCode = dbox.querySelector(".deduction-code").value;
            if (deductionCode.length >= 2) {
                if (this.validate(deductionCode)) {
                    dbox.classList.remove("deduction-invalid");
                    this.submit(dbox);
                    this.next(dbox);
                    // add deduction name
                    let dName = this.toName(deductionCode);
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
        this.deductionCount += 1;
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
        if (this.codes[code] != undefined) {
            return true;
        }
        return false;
    }

    toName(code) {
        // TODO: check if server copy exists
        // use the local copy
        let c = this.codes[code];
        if (c != undefined) {
            return c.name;
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
        if (!this.validate(code)) {
            alert(`Deduction #${label}: ${code} is not a valid code`);
            return;
        }
        let timestamp = parseInt(deductElement.dataset.ts);
        let ded = {
            timestamp: timestamp,
            code: code,
            judgeID: this.cfg.clientId,
            routineID: this.state.currentRoutineId,
            ringID: parseInt(this.cfg.ringId),
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

    remove(deductId) {
        let dbox = TPZ.getElementById(deductId);
        let label = dbox.querySelector(".deduction-label").textContent;
        if (confirm(`Remove deduction #${label}?`)) {
            if (dbox.dataset.submitted == "true") {
                let ded = {
                    timestamp: parseInt(dbox.dataset.ts),
                    judgeID: this.cfg.clientId,
                    routineID: this.state.currentRoutineId,
                    ringID: parseInt(this.cfg.ringId),
                };
                TPZ.httpSendJson(
                    "/api/submit-deduction",
                    "DELETE",
                    ded,
                    () => {}
                );
            }
            dbox.remove();
        }
    }

    next(deductElement) {
        let nextElement = deductElement.nextElementSibling;
        if (nextElement != undefined) {
            nextElement.querySelector(".deduction-code").focus();
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

    codes = {
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
}

// TODO: Allow user to press [z | x] to mark next skill
class NanduPanel extends ViewObject {
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

    render(nandusheet) {
        this.panel.innerHTML =
            `<p>${this.txt.nanduToggle}</p><div id="${this.id.nanduSheet}"></div>` +
            `<button type="button" class="btn btn-primary" id="${this.id.scoreSubmit}">${this.txt.submit}</button>`;

        for (let i in nandusheet) {
            // Create the table describing the form section
            let sId = parseInt(i) + 1;
            let sectionTable = TPZ.renderHtml(
                `<table class="table nandu" id="${sId}"><thead><tr><td class="nandu-code"/>` +
                    `<td>S${sId}</td><td class="nandu-mark"/></tr></thead><tbody></tbody></table>`
            );
            TPZ.getElementById(this.id.nanduSheet).append(sectionTable);

            // Add the nandu for this section
            let combos = this.parseNanduString(nandusheet[i]);
            combos.forEach((val) => {
                if (val === undefined || val === "") {
                    return;
                }
                let combo = this.parseNanduCombo(val);
                let nanduId = "n" + this.nanduCount;
                this.nanduCount += 1;
                let baseNandu = this.createNanduComponent(
                    nanduId,
                    combo.base.code,
                    combo.base.name
                );
                sectionTable.appendChild(baseNandu);
                // Add in any connections
                for (let j in combo.connections) {
                    nanduId = "n" + this.nanduCount;
                    this.nanduCount += 1;
                    let nanduConn = this.createNanduComponent(
                        nanduId,
                        combo.connections[j].code,
                        combo.connections[j].name
                    );
                    sectionTable.appendChild(nanduConn);
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
                        routineID: currentRoutineId,
                        judgeID: clientId,
                        result: results,
                        ringID: parseInt(ringId),
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

    taiji_codes = {
        "323B": { name: "360 tornado kick", value: 0.3 },
        "324B": { name: "360 lotus kick", value: 0.3 },
        "323C": { name: "540 tornado kick", value: 0.4 },
    };

    createNanduComponent(id, code, name) {
        let n = TPZ.renderHtml(
            `<tr id="${id}" class="nandu-component"><th scope="row" class="nandu-code">${code}</th>` +
                `<td class="nandu-name">${name}</td><td class="nandu-mark"></td></tr>`
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

    parseNanduString(s) {
        return s.split(",");
    }

    parseNanduCombo(s) {
        // Possible formats: 312A+335A(B), 323A+4A, 415A, 323A+312A(A)+3A
        // ex1: base: 323A, conn: (A); base: 312A, conn: 3A
        // ex2: base: 312A, conn: (B); base: 335A, conn: none
        let component_codes = s.split("+");
        let base = this.getNanduComponent(component_codes[0].trim());
        let connections = [];
        if (component_codes.length > 1) {
            for (let i = 1; i < component_codes.length; i++) {
                let component = component_codes[i];
                let dynIdx = component.indexOf("("); // Index of a dynamic connection -- eg: (A)
                if (dynIdx != -1) {
                    // get both parts
                    connections.push(
                        this.getNanduComponent(
                            component.substring(dynIdx).trim()
                        )
                    );
                    connections.push(
                        this.getNanduComponent(
                            component.substring(0, dynIdx).trim()
                        )
                    );
                } else {
                    connections.push(this.getNanduComponent(component.trim()));
                }
            }
        }
        return new Nandu(base, connections);
    }

    getNanduComponent(code) {
        let isTaiji = this.state.eventName.toLowerCase().indexOf("taiji") > 0;
        if (isTaiji) {
            // Check for taiji specific nandu codes first
            let t = this.taiji_codes[code];
            if (t) {
                return new NanduComponent(code, t.name, t.value);
            }
        }
        let v = this.codes[code];
        return new NanduComponent(code, v.name, v.value);
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
            'Deductions: <div id="ded-time"></div>' +
                '<span id="deduction-results"></span>' +
                '<table id="deduction-table"><caption>Timeline</caption></table>'
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
                codes.push(d.code);
                let cell = TPZ.renderHtml("<td>" + d.code + "</td>");
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
