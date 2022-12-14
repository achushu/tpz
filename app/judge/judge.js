var TPZJudge = (() => {
    var cfg = {
        api: {
            listRings: "/api/get-rings",
            settings: "/api/get-settings",
        },
        id: {
            pingDisplay: "ping",
            selectionContainer: "selection-container",
            panelSelect: "panel-select",
            ringSelect: "ring-select",
        },
        Notify: {
            args: {
                onopen: () => {},
                onmessage: (raw) => {
                    console.log(raw);
                },
            },
            URI: "/judge/server",
        },
        ping: {
            id: 0,
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
    };

    var clientId = "00000000";
    var ringId = -1;

    function init() {
        TPZ.init();
        setClientId();
        phoneHome();
        cfg.ping.id = setInterval(phoneHome, cfg.ping.interval);
        cfg.poll.id = setInterval(() => {
            if (cfg.poll.enabled) {
                cfg.poll.action();
            }
        });
        let selectionContainer = TPZ.renderHtml(
            `<div id="${cfg.id.selectionContainer}"></div>`
        );
        TPZ.appendToPanel(selectionContainer);
        let joinBtn = TPZ.renderHtml(
            '<button class="btn btn-theme" type="submit">Join</button>'
        );
        joinBtn.addEventListener("click", loadJudge);
        listJudgePanels();
        listRings();
        TPZ.appendElements(selectionContainer, TPZ.renderHtml("<br/><br/>"));
        selectionContainer.appendChild(joinBtn);
    }

    function setClientId() {
        let tag = TPZ.getAuthId();
        if (tag !== undefined) clientId = tag;
    }

    function phoneHome() {
        let start = performance.now();
        TPZ.httpGetJson(cfg.api.settings, function (settings) {
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
    }

    function listJudgePanels() {
        let panels = [
            TPZ.createRadioItem("10-pt Judge", { panel: "10pt" }),
            TPZ.createRadioItem("10-pt Head Judge", { panel: "10pt-h" }),
            TPZ.createRadioItem("International A Judge", { panel: "int-a" }),
            TPZ.createRadioItem("International B Judge", { panel: "int-b" }),
            TPZ.createRadioItem("International C Judge", { panel: "int-c" }),
            TPZ.createRadioItem("International Head Judge", { panel: "int-h" }),
            TPZ.createRadioItem("Direct Score Entry", { panel: "direct" }),
        ];

        let panelGroup = TPZ.createRadioGroup(cfg.id.panelSelect);
        TPZ.getElementById(cfg.id.selectionContainer).appendChild(panelGroup);

        for (let i in panels) {
            let panel = panels[i];
            panelGroup.appendChild(panel);
        }
    }

    function listRings() {
        let ringGroup = TPZ.createRadioGroup(cfg.id.ringSelect);
        TPZ.getElementById(cfg.id.selectionContainer).appendChild(ringGroup);
        TPZ.httpGetJson(cfg.api.listRings, (data) => {
            for (let i in data) {
                let ring = data[i];
                let ringItem = TPZ.createRadioItem(ring.name, {
                    ring: ring.id,
                });
                ringGroup.appendChild(ringItem);
            }
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
        ringId = parseInt(activeRingItem.dataset.ring);

        switch (judgeType) {
            case "10pt":
                scoringJudge("USWU");
            case "int-b":
                scoringJudge("IWUF");
        }
    }

    function scoringJudge() {
        cfg.poll.action = updateEventPanel;
        cfg.Notify.args = {
            onopen: () => {
                console.log("connected");
                registerJudge(ringId, "uswu");
            },
            onmessage: (raw) => {
                console.log(raw);
                let msg = parseMessage(raw.data);
                switch (msg.action) {
                    default:
                        handleCommonActions(msg);
                        break;
                }
            },
        };
        Notify.connect(cfg.Notify.URI, cfg.Notify.args);
        prepareView();
    }

    function prepareView() {
        TPZ.setHeader("Scoring Judge");
        TPZ.setTitle("Scoring Judge");
        TPZ.getElementById(cfg.id.selectionContainer).remove();
        TPZ.addScratchpad();
        clearView();
        setupEventPanel();
        setupScorePanel();
        initScratchPad();
        onCompetitorChange = updateEventPanel;
        onCompetitorChange();
    }

    function updateEventPanel() {
        updateEventInfo((data) => {
            renderScorePanel(currentEventRules, currentExp);
            if (data.scores != undefined) {
                let saved = data.scores[clientId];
                if (saved != undefined) {
                    TPZ.getElementById("score-entry").value = saved.score;
                    disableScorePanel();
                }
            }
        });
    }

    return {
        init: init,
    };
})();

TPZJudge.init();
