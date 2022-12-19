var TPZJudge = (() => {
    var cfg = {
        clientId: "0000",
        role: "",
        api: {
            current: () => {
                return `/api/${cache.ringId}/current`;
            },
            changeCompetitor: () => {
                return `/api/${cache.ringId}/change-competitor`;
            },
            changeEvent: () => {
                return `/api/${cache.ringId}/change-event`;
            },
            eventCompetitors: () => {
                return `/api/${cache.ringId}/event-competitors`;
            },
            ringEvents: () => {
                return `/api/events-in-ring/${cache.ringId}`;
            },
            scores: () => {
                return `/api/${cache.ringId}/get-scores`;
            },
            listRings: "/api/get-rings",
            publishScore: "/api/finalize-score",
            settings: "/api/get-settings",
            submitAdj: "/api/submit-adjustment",
            submitScore: "/api/submit-score",
        },
        cb: {
            onCompetitorChange: () => {},
        },
        id: {
            adj: "score-adjustment",
            adjAdd: "add-adj-button",
            adjList: "adjustment-list",
            adjReason: "adjustment-reason",
            eventDisplay: "event-display",
            competitorSelect: "competitor-select",
            currentCompetitor: "current-competitor",
            currentEvent: "current-event",
            eventSelect: "event-select",
            finalScore: "final-score",
            finalScoreLabel: "final-score-label",
            headJudgePanel: "head-judge-panel",
            nextCompBtn: "next-competitor-button",
            panelSelect: "panel-select",
            pingDisplay: "ping",
            publishButton: "publish-button",
            ringSelect: "ring-select",
            scoreEntry: "score-entry",
            scoreHint: "score-hint",
            scorePanel: "score-panel",
            scoreSubmit: "score-submit",
            selectionContainer: "selection-container",
            eventTimer: "timer",
            timerButton: "timer-button",
            timerPanel: "timer-panel",
        },
        Notify: {
            args: {
                onopen: () => {
                    console.log("connected");
                    registerJudge();
                },
                onmessage: (raw) => {
                    console.log(raw);
                    let msg = parseMessage(raw.data);
                    switch (msg.action) {
                        case "notify-competitor":
                            cfg.cb.onCompetitorChange();
                            break;
                    }
                },
            },
            URI: "/judge/server",
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
            server: 0,
            offset: 0,
        },
        txt: {
            add: "Add",
            adjAdd: "Add adjustment",
            adjLabel: "Adjustments",
            adjReason: "Reason",
            adjWarn: "Please submit or clear the adjustment!",
            calculatedScore: "Calculated",
            continueNext: "Results not finalized! Continue?",
            currentLabel: "Now",
            invalidAdj: "Please check the adjustment entered.",
            invalidScore: "Please check the score entered.",
            nextCompetitor: "&#x2B9E;",
            publishScore: "Publish Score",
            publishWarn: "Publish results?",
            ringFinished: "Finished!",
            scoreLabel: "Score",
            scoresLabel: "Scores submitted",
            selectLabel: "Select",
            startTimer: "Start Timer",
            stopTimer: "Stop Timer",
            submit: "Submit",
            timeLabel: "Time",
        },
    };

    var cache = {
        ringId: 0,
        exp: "",
        eventStart: 0,
        competitorId: 0,
        eventId: 0,
        routineId: 0,
        ruleset: {
            name: "",
            maxScore: 10,
            limitHundredths: true,
        },
        scratch: "",
        timerInterval: 0,
    };

    function init() {
        TPZ.init();
        setClientId();
        phoneHome();
        cfg.ping.id = setInterval(phoneHome, cfg.ping.interval);
        cfg.poll.id = setInterval(() => {
            if (cfg.poll.enabled) {
                console.log("polling...");
                cfg.poll.action();
            }
        });
        setupJudgeSelection();
    }

    /* server comms */

    function setClientId() {
        let tag = TPZ.getAuthId();
        if (tag !== undefined) {
            cfg.clientId = tag;
            TPZ.getElementById("judgeId").textContent = tag;
        }
    }

    function phoneHome() {
        let start = performance.now();
        TPZ.httpGetJson(cfg.api.settings, (settings) => {
            setPing(performance.now() - start);
            settings.poll === "true"
                ? (cfg.poll.enabled = true)
                : (cfg.poll.enabled = false);
        });
    }

    function setPing(rtt) {
        let pingSym = cfg.ping.icon.high;
        if (rtt < cfg.ping.threshold.low) {
            pingSym = cfg.ping.icon.low;
        } else if (rtt < cfg.ping.threshold.med) {
            pingSym = cfg.ping.icon.med;
        }
        let pingEle = TPZ.getElementById(cfg.id.pingDisplay);
        pingEle.innerHTML = pingSym;
        pingEle.title = `${rtt} ms`;
        cfg.ping.lastRtt = rtt;
    }

    function notify(msg) {
        msg.client = cfg.clientId;
        msg.ring = cache.ringId;
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

    function registerJudge() {
        notify({ action: "register-judge", params: [cfg.role] });
    }

    /* queries */

    function getScores() {
        // get latest score list
        TPZ.httpGetJson(cfg.api.scores(), (data) => {
            let scoreList = TPZ.getElementById("score-list");
            // Clear the list
            scoreList.innerHTML = "";
            let scoreCount = 0;
            if (data.scores !== undefined) {
                let eles = [];
                for (let k in data.scores) {
                    let score = data.scores[k].score;
                    let item = TPZ.renderHtml(`<li>${score}</li>`);
                    eles.push(item);
                    scoreCount++;
                    // check for own submission
                    if (k == cfg.clientId) {
                        TPZ.getElementById(cfg.id.scoreEntry).value = score;
                        disableScorePanel();
                    }
                }
                TPZ.appendElements(scoreList, eles);
            }
            TPZ.getElementById("score-count").textContent = scoreCount;
            let adjs = data.adjustments;
            if (adjs && adjs.length > 0) {
                // Reset the list
                let adjTotal = 0;
                let adjList = TPZ.getElementById(cfg.id.adjList);
                adjList.innerHTML = "";
                let eles = [];
                for (let i = 0, numAdjs = adjs.length; i < numAdjs; i++) {
                    let adj = adjs[i];
                    let item = TPZ.renderHtml(
                        `<li>${adj.amount} (${adj.reason})</li>`
                    );
                    adjTotal -= adj.amount;
                    eles.push(item);
                }
                TPZ.appendElements(adjList, eles);
                TPZ.getElementById(
                    "adjustment-label"
                ).textContent = `${cfg.txt.adjLabel}: ${adjTotal}`;
            }
            let final = data.final;
            let calc = data.calc;
            if (final != undefined && final != "0.00") {
                TPZ.getElementById(cfg.id.finalScore).textContent = final;
                setPublishedStatus();
            } else if (calc != undefined) {
                TPZ.getElementById(
                    cfg.id.finalScoreLabel
                ).textContent = `${cfg.txt.calculatedScore}: `;
                TPZ.getElementById(cfg.id.finalScore).textContent = calc;
            }
        });
    }

    function adjustScore(amount, reason) {
        let adj = {
            amount: amount,
            reason: reason,
            judgeID: cfg.clientId,
            routineID: cache.routineId,
            ringID: cache.ringId,
        };
        TPZ.httpPostJson(cfg.api.submitAdj, adj, () => {
            getScores();
        });
    }

    function finalizeScore() {
        let data = { ringID: cache.ringId };
        TPZ.httpPostJson(cfg.api.publishScore, data, () => {
            setPublishedStatus();
        });
    }

    function updateEventInfo(onReady, async = true) {
        TPZ.httpGetJson(
            cfg.api.current(),
            (data) => {
                onGetCurrentStatusReady(data);
                if (onReady) onReady(data);
            },
            async
        );
    }

    function getRuleBase(name) {
        let base = name.split(" ")[0].toUpperCase();
        let idx = base.indexOf("-2");
        if (idx > 0) {
            base = base.substring(0, idx);
        }
        return base;
    }

    function onGetCurrentStatusReady(data) {
        if (cache.routineId == data.routine_id) return;
        if (data.event_id != undefined) {
            cache.eventId = data.event_id;
            cache.exp = data.event_exp;
            cache.competitorId = data.competitor_id;
            cache.routineId = data.routine_id;
            TPZ.getElementById(cfg.id.currentEvent).textContent =
                data.event_name;
            TPZ.getElementById(cfg.id.currentCompetitor).textContent =
                formatName(data.fname, data.lname);
            cache.ruleset.name = getRuleBase(data.rules);
        }
    }

    function formatName(first, last) {
        if (first && last) return first + " " + last;
        if (first) return first;
        if (last) return last;
        return undefined;
    }

    /* app elements */

    function clearView() {
        if (Scratchpad !== undefined) {
            cache.scratch = Scratchpad.text();
        }
        TPZ.clearPanel();
    }

    function setupJudgeSelection() {
        let selectionContainer = TPZ.renderHtml(html.judgeSelection);
        TPZ.appendToPanel(selectionContainer);
        let joinBtn = TPZ.renderHtml(html.joinBtn);
        joinBtn.addEventListener("click", loadJudge);
        listJudgePanels();
        listRings();
        TPZ.appendElements(selectionContainer, TPZ.renderHtml("<br/><br/>"));
        selectionContainer.appendChild(joinBtn);
    }

    function listJudgePanels() {
        let panels = [
            TPZ.createRadioItem("10-pt Judge", { panel: "10pt" }),
            TPZ.createRadioItem("10-pt Head Judge", { panel: "10pt-head" }),
            TPZ.createRadioItem("International A Judge", { panel: "int-a" }),
            TPZ.createRadioItem("International B Judge", { panel: "int-b" }),
            TPZ.createRadioItem("International C Judge", { panel: "int-c" }),
            TPZ.createRadioItem("International Head Judge", {
                panel: "int-head",
            }),
            TPZ.createRadioItem("Direct Score Entry", { panel: "direct" }),
        ];
        let panelGroup = TPZ.createRadioGroup(cfg.id.panelSelect);
        TPZ.appendElements(panelGroup, panels);
        TPZ.getElementById(cfg.id.selectionContainer).appendChild(panelGroup);
    }

    function setupEventControlPanel() {
        TPZ.appendToPanel(
            TPZ.renderHtml(
                `<div id="event-control-panel" class="row justify-content-between panel">
                    <div class="col-8">${cfg.txt.selectLabel}: <select id="${cfg.id.eventSelect}" class="col-5 custom-select"></select>
                    <span class="event-panel-spacing"/>
                    <select id="${cfg.id.competitorSelect}" class="col-4 custom-select"></select></div>
                    <div class="col-3"><button id="${cfg.id.nextCompBtn}" class="btn btn-theme">${cfg.txt.nextCompetitor}</button></div></div>`
            )
        );
    }

    function lPadNum(number, digits) {
        return ("0".repeat(digits) + number).slice(-1 * digits);
    }

    function formatTime(t) {
        let m = t.getMinutes();
        let s = lPadNum(t.getSeconds(), 2);
        let ms = lPadNum(Math.trunc(t.getMilliseconds() / 10), 2);
        return `${m}:${s}:${ms}`;
    }

    function setupTimerPanel() {
        TPZ.appendToPanel(
            TPZ.renderHtml(
                `<div id="${cfg.id.timerPanel}" class="row panel"></div>`
            )
        );
    }

    function renderTimerPanel() {
        TPZ.getElementById(
            cfg.id.timerPanel
        ).innerHTML = `<div class="col-2"><button id="${cfg.id.timerButton}" class="btn btn-info">${cfg.txt.startTimer}</button></div>
            <div class="col-2">${cfg.txt.timeLabel}: <span id="${cfg.id.eventTimer}">0:00:00</span></div></div>`;
        cache.eventStart = null;
        timerButton = TPZ.getElementById(cfg.id.timerButton);
        timerButton.addEventListener("click", startEventTimer);
    }

    function startEventTimer() {
        // TODO: Take latency into account (iff a Timekeeper is managing the clock)
        // Head judge's clock should always start immediately on click
        cache.eventStart = performance.now();
        let timerElement = TPZ.getElementById(cfg.id.eventTimer);
        if (cfg.timerInterval) {
            clearInterval(cfg.timerInterval);
        }
        cfg.timerInterval = setInterval(() => {
            let elapsed = new Date(performance.now() - cache.eventStart);
            timerElement.textContent = formatTime(elapsed);
        }, 50);
        timerButton.removeEventListener("click", startEventTimer);
        timerButton.textContent = cfg.txt.stopTimer;
        timerButton.addEventListener("click", stopEventTimer);
    }

    function stopEventTimer() {
        // TODO: Make each click add the latest time to the display
        clearInterval(cfg.timerInterval);
        let elapsed = new Date(performance.now() - cache.eventStart);
        TPZ.getElementById(cfg.id.eventTimer).textContent = formatTime(elapsed);
    }

    function setupEventDisplay() {
        TPZ.appendToPanel(
            TPZ.renderHtml(
                `<div id="${cfg.id.eventDisplay}" class="panel">${cfg.txt.currentLabel}: <b id="current-event"></b> - <b id="current-competitor"></b></div>`
            )
        );
    }

    function setupScorePanel() {
        TPZ.appendToPanel(
            TPZ.renderHtml(
                `<div id="${cfg.id.scorePanel}" class="panel"></div>`
            )
        );
    }

    function renderScorePanel() {
        TPZ.getElementById(cfg.id.scorePanel).innerHTML = html.scorePanel();

        let hint = "";
        switch (cache.exp) {
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
        TPZ.getElementById(cfg.id.scoreHint).textContent = hint;
        TPZ.getElementById(cfg.id.scoreSubmit).addEventListener("click", () => {
            let score = TPZ.getElementById(cfg.id.scoreEntry).value;
            if (validateScore(score)) {
                let scorecard = {
                    score: parseFloat(score),
                    judgeID: cfg.clientId,
                    ringID: cache.ringId,
                };
                TPZ.httpPostJson(cfg.api.submitScore, scorecard);
                disableScorePanel();
            } else {
                TPZ.alert(cfg.txt.invalidScore);
            }
        });
    }

    function disableScorePanel() {
        TPZ.getElementById(cfg.id.scoreEntry).disabled = true;
        TPZ.getElementById(cfg.id.scoreSubmit).disabled = true;
    }

    function validateScore(scoreInput) {
        if (isNaN(scoreInput) || scoreInput == null) return false;
        let fScore = parseFloat(scoreInput);
        if (fScore < 0 || fScore >= cache.ruleset.maxScore) return false;
        if (fScore % 1 === 0) return true;
        let decimals = fScore.toString().split(".")[1];
        let digits = decimals.length;
        if (digits == 1) return true;
        if (digits > 2) return false;
        if (cache.ruleset.limitHundredths && decimals[1] !== "5") return false;
        return true;
    }

    function setupHeadJudgePanel(intl = false) {
        let ep = TPZ.renderHtml(
            `<div id="${cfg.id.headJudgePanel}" class="panel"></div>`
        );
        TPZ.appendToPanel(ep);
        renderHeadJudgePanel(intl);
    }

    function addScoreList() {
        let headPanel = TPZ.getElementById(cfg.id.headJudgePanel);
        let scoreList = TPZ.renderHtml(
            `${cfg.txt.scoresLabel} (<span id="score-count">0</span>): <ul id="score-list"></ul>`
        );
        TPZ.appendElements(headPanel, scoreList);
    }

    function addAdjustmentPanel() {
        let eventPanel = TPZ.getElementById(cfg.id.headJudgePanel);
        let adjPanel = TPZ.renderHtml(html.adjPanel);
        eventPanel.appendChild(adjPanel);
        eventPanel.appendChild(TPZ.renderHtml("<br/>"));
        TPZ.getElementById(cfg.id.adjAdd).onclick = () => {
            let adj = TPZ.getElementById(cfg.id.adj);
            let adjValue = parseFloat(adj.value);
            if (validateAdjustment(adjValue)) {
                let reason = TPZ.getElementById(cfg.id.adjReason);
                adjustScore(adjValue, reason.value);
                adj.value = "";
                reason.value = "";
            } else {
                TPZ.alert(cfg.txt.invalidAdj);
            }
        };
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

    function addFinalScoreContainer() {
        let eventPanel = TPZ.getElementById(cfg.id.headJudgePanel);
        let finalScoreContainer = TPZ.renderHtml(html.finalScoreContainer);
        eventPanel.appendChild(finalScoreContainer);
    }

    function addPublishScoreButton() {
        let eventPanel = TPZ.getElementById(cfg.id.headJudgePanel);
        let publishScoreBtn = TPZ.renderHtml(
            `<button id="${cfg.id.publishButton}" class="btn btn-theme">${cfg.txt.publishScore}</button>`
        );
        eventPanel.append(publishScoreBtn);
        TPZ.getElementById(cfg.id.publishButton).onclick = () => {
            let adj = TPZ.getElementById(cfg.id.adj);
            let reason = TPZ.getElementById(cfg.id.adjReason);
            if (adj != undefined && (adj.value != "" || reason.value != "")) {
                TPZ.alert(cfg.txt.adjWarn);
            } else {
                TPZ.confirm(cfg.txt.publishWarn, finalizeScore);
            }
        };
    }

    function setPublishedStatus() {
        TPZ.getElementById("final-score-label").textContent = "Final: ";
        let publishBtn = TPZ.getElementById(cfg.id.publishButton);
        publishBtn.dataset.published = "true";
        publishBtn.disabled = true;
    }

    function renderHeadJudgePanel(intl = false) {
        TPZ.getElementById(cfg.id.headJudgePanel).innerHTML = "";
        addScoreList();
        if (intl) {
            // addDeductionsPanel()
            // addDeductionEntry()
            // addNanduPanel()
        }
        addAdjustmentPanel();
        addFinalScoreContainer();
        addPublishScoreButton();
    }

    function setCompetitorList() {
        let compSelect = TPZ.getElementById(cfg.id.competitorSelect);

        // get a new list of competitors
        TPZ.httpGetJson(cfg.api.eventCompetitors(), (compList) => {
            for (let i = compSelect.length - 1; i >= 0; i--) {
                compSelect.remove(i);
            }
            for (let i = 0, numComps = compList.length; i < numComps; i++) {
                let competitor = compList[i];
                let name = `${i + 1}. ${formatName(
                    competitor.first_name,
                    competitor.last_name
                )}`;
                let option = TPZ.renderHtml(
                    `<option value="${competitor.id}">${name}</option>`
                );
                compSelect.append(option);
            }
            if (cache.competitorId > 0) {
                // resume
                compSelect.value = cache.competitorId;
            } else {
                // select first competitor
                compSelect.selectedIndex = 0;
            }
            compSelect.dispatchEvent(new Event("change"));
        });
    }

    function renderEventControlPanel() {
        let eventSelect = TPZ.getElementById(cfg.id.eventSelect);
        let compSelect = TPZ.getElementById(cfg.id.competitorSelect);

        // get events in this ring
        TPZ.httpGetJson(cfg.api.ringEvents(), (eventList) => {
            let eles = [];
            for (let i = 0, numEvents = eventList.length; i < numEvents; i++) {
                let event = eventList[i];
                let name = `${i + 1}. ${event.name}`;
                let option = TPZ.renderHtml(
                    `<option value="${event.id}">${name}</option>`
                );
                eles.push(option);
            }
            TPZ.appendElements(eventSelect, eles);
            if (cache.eventId >= 0) {
                // resume event
                eventSelect.value = cache.eventId;
                setCompetitorList();
            } else {
                // select first event
                eventSelect.selectedIndex = 0;
                eventSelect.dispatchEvent(new Event("change"));
            }
        });

        eventSelect.addEventListener("change", () => {
            let eventId = eventSelect.value;
            if (eventId === cache.eventId) return;
            let change = { id: parseInt(eventId) };
            TPZ.httpPostJson(cfg.api.changeEvent(), change, () => {
                cache.competitorId = 0; // unset competitor ID
                setCompetitorList();
            });
        });
        compSelect.addEventListener("change", () => {
            let competitorId = parseInt(compSelect.value);
            // if (competitorId === cache.competitorId) return;
            let eventId = parseInt(eventSelect.value);
            let change = { event_id: eventId, competitor_id: competitorId };
            TPZ.httpPostJson(
                cfg.api.changeCompetitor(),
                change,
                cfg.cb.onCompetitorChange
            );
        });
    }

    function setNextCompetitorButton() {
        let publishBtn = TPZ.getElementById(cfg.id.publishButton);
        if (publishBtn.dataset.published != "true") {
            // this score hasn't been published yet
            // confirm we want to move on
            TPZ.confirm(cfg.txt.continueNext, () => {
                selectNextCompetitor();
            });
        } else {
            selectNextCompetitor();
        }
    }

    function selectNextCompetitor() {
        let compSelect = document.getElementById(cfg.id.competitorSelect);
        let compIndex = compSelect.selectedIndex;
        if (compIndex < compSelect.length - 1) {
            compSelect.selectedIndex = compIndex + 1;
            compSelect.dispatchEvent(new Event("change"));
            return;
        }
        let eventSelect = document.getElementById(cfg.id.eventSelect);
        let eventIndex = eventSelect.selectedIndex;
        // move onto next event
        if (eventIndex < eventSelect.length - 1) {
            eventSelect.selectedIndex = eventIndex + 1;
            eventSelect.dispatchEvent(new Event("change"));
            return;
        }
        TPZ.alert(cfg.txt.ringFinished);
    }

    function listRings() {
        let ringGroup = TPZ.createRadioGroup(cfg.id.ringSelect);
        TPZ.getElementById(cfg.id.selectionContainer).appendChild(ringGroup);
        TPZ.httpGetJson(cfg.api.listRings, (data) => {
            var eles = [];
            for (let i in data) {
                let ring = data[i];
                let ringItem = TPZ.createRadioItem(ring.name, {
                    ring: ring.id,
                });
                eles.push(ringItem);
            }
            TPZ.appendElements(ringGroup, eles);
        });
    }

    function loadJudge() {
        let activePanelItem = TPZ.getElementById(
            cfg.id.panelSelect
        ).getElementsByClassName("active")[0];
        if (activePanelItem === undefined) {
            TPZ.alert("Select a judge role!");
            return;
        }

        let activeRingItem = TPZ.getElementById(
            cfg.id.ringSelect
        ).getElementsByClassName("active")[0];
        if (activeRingItem === undefined) {
            TPZ.alert("Select a ring!");
            return;
        }

        let judgeType = activePanelItem.dataset.panel;
        cache.ringId = parseInt(activeRingItem.dataset.ring);

        switch (judgeType) {
            case "10pt-head":
                cfg.role = "uswu-head";
                cache.ruleset.maxScore = 10;
                headJudge();
                break;
            case "10pt":
                cfg.role = "uswu";
                cache.ruleset.maxScore = 10;
                scoringJudge("USWU");
                break;
            case "int-b":
                cfg.role = "iwuf-b";
                cache.ruleset.maxScore = 5;
                scoringJudge("IWUF");
                break;
        }
    }

    /* judges */

    function headJudge() {
        cfg.poll.action = getScores;
        cfg.Notify.args.onmessage = (raw) => {
            console.log(raw);
            let msg = parseMessage(raw.data);
            switch (msg.action) {
                case "submit-score":
                    getScores();
                    break;
            }
        };
        Notify.connect(cfg.Notify.URI, cfg.Notify.args);

        // setup interface
        clearView();
        let title = "Scoring Head Judge";
        TPZ.setHeader(title);
        TPZ.setTitle(title);
        setupEventControlPanel();
        setupEventDisplay();
        setupTimerPanel();
        setupScorePanel();
        setupHeadJudgePanel();
        TPZ.addScratchpad(cache.scratch);
        cfg.cb.onCompetitorChange = () => {
            updateEventInfo(() => {
                renderHeadJudgePanel();
                renderTimerPanel();
                renderScorePanel();
                // get previously saved data (if any)
                getScores();
            }, false);
        };

        // get the current event / competitor
        // or select the first event
        updateEventInfo((data) => {
            if (data.event_id !== undefined) {
                cache.eventId = data.event_id;
                cache.competitorId = data.competitor_id;
                renderScorePanel();
            }
            renderEventControlPanel();
            document.getElementById(cfg.id.nextCompBtn).onclick =
                setNextCompetitorButton;
        });
    }

    function scoringJudge() {
        cfg.poll.action = cfg.cb.onCompetitorChange;
        Notify.connect(cfg.Notify.URI, cfg.Notify.args);

        // setup interface
        clearView();
        let title = "Scoring Judge";
        TPZ.setHeader(title);
        TPZ.setTitle(title);
        setupEventDisplay();
        setupScorePanel();
        cfg.cb.onCompetitorChange = () => {
            updateEventInfo((data) => {
                renderScorePanel();
                if (data.scores === undefined) return;
                let saved = data.scores[cfg.clientId];
                if (saved === undefined) return;
                TPZ.getElementById(cfg.id.scoreEntry).value = saved.score;
                disableScorePanel();
            });
        };
        cfg.cb.onCompetitorChange();
        TPZ.addScratchpad(cache.scratch);
    }

    var html = {
        adjPanel: `
<div id="adjustment-panel">
    <p id="adjustment-label"></p><ul id="${cfg.id.adjList}"></ul>
    ${cfg.txt.adjAdd}: <span id="adjust-minus">&nbsp;-&nbsp;</span><input id="${cfg.id.adj}" type="text" class="score-input"/>
    ${cfg.txt.adjReason}: <input id="${cfg.id.adjReason}" type="text" />
    <button id="${cfg.id.adjAdd}" class="btn btn-secondary">${cfg.txt.add}</button></div>`,

        finalScoreContainer: `
<div id="final-score-container">
    <span id="${cfg.id.finalScoreLabel}"></span>
    <span id="${cfg.id.finalScore}"></span></div>`,

        joinBtn: '<button class="btn btn-theme" type="submit">Join</button>',

        judgeSelection: `<div id="${cfg.id.selectionContainer}"></div>`,

        scorePanel: () => {
            return `
${cfg.txt.scoreLabel}: <div>
    <input id="${cfg.id.scoreEntry}" type="text" class="score-input" /> / ${cache.ruleset.maxScore}
    <button id="${cfg.id.scoreSubmit}" class="btn btn-theme">${cfg.txt.submit}</div>
<div><p id="${cfg.id.scoreHint}"></p></div>`;
        },
    };

    return { init: init };
})();
TPZJudge.init();
