// Enforce strict Javascript rules
"use strict";

let itemId;

function renderPage() {
    let menuContainer = TPZ.renderHtml('<div class="row"></div>');
    let listContainer = TPZ.renderHtml('<div class="list-group col-2"></div>');
    let panelContainer = TPZ.renderHtml(
        '<div class="tab-content col-10"></div>'
    );
    TPZ.appendToPanel(menuContainer);
    menuContainer.appendChild(listContainer);
    menuContainer.appendChild(panelContainer);

    let [item, panel] = setupEditCompetitor();
    listContainer.appendChild(item);
    panelContainer.appendChild(panel);

    [item, panel] = setupEditEvent();
    listContainer.appendChild(item);
    panelContainer.appendChild(panel);

    [item, panel] = setupCommandCenter();
    listContainer.appendChild(item);
    panelContainer.appendChild(panel);
}

function setupCommandCenter() {
    let item = TPZ.renderHtml(
        '<a class="list-group-item list-group-item-action" data-toggle="list" href="#command-center">Command Center</a>'
    );
    let panel = TPZ.renderHtml(
        '<div class="tab-pane" id="command-center"></div>'
    );
    item.addEventListener("click", function () {
        let children = panel.childNodes;
        for (let i = 0; i < children.length; i++) {
            panel.removeChild(children[i]);
        }
        TPZ.httpGetJson("/api/get-settings", function (settings) {
            renderClientPolling(settings.poll);
        });
    });
    return [item, panel];
}

function renderClientPolling(active) {
    let html =
        "<div><span>Client polling: </span>" +
        '<div class="btn-group btn-group-toggle" data-toggle="buttons">';
    if (active === "true") {
        html +=
            '<label id="cc-poll-off" class="btn btn-secondary">' +
            '<input type="radio" name="cc-poll"> Off' +
            "</label>" +
            '<label id="cc-poll-on" class="btn btn-secondary active">' +
            '<input type="radio" name="cc-poll" checked> On' +
            "</label>";
    } else {
        html +=
            '<label id="cc-poll-off" class="btn btn-secondary active">' +
            '<input type="radio" name="cc-poll" checked> Off' +
            "</label>" +
            '<label id="cc-poll-on" class="btn btn-secondary">' +
            '<input type="radio" name="cc-poll"> On' +
            "</label>";
    }
    html += "</div></div>";
    let toggle = TPZ.renderHtml(html);
    let panel = TPZ.getElementById("command-center");
    panel.appendChild(toggle);
    let pollOn = TPZ.getElementById("cc-poll-on");
    pollOn.addEventListener("click", function () {
        let setting = { settings: { poll: "true" } };
        TPZ.httpPostJson("/api/set-settings", setting);
    });
    let pollOff = TPZ.getElementById("cc-poll-off");
    pollOff.addEventListener("click", function () {
        let setting = { settings: { poll: "false" } };
        TPZ.httpPostJson("/api/set-settings", setting);
    });
}

function setupEditCompetitor() {
    let item = TPZ.renderHtml(
        '<a class="list-group-item list-group-item-action" data-toggle="list" href="#edit-comp">Edit competitor</a>'
    );
    let panel = TPZ.renderHtml('<div class="tab-pane" id="edit-comp"></div>');
    item.addEventListener("click", function () {
        TPZ.httpGetJson("/api/all-competitors", function (list) {
            panel.innerHTML = "";
            let select = document.createElement("select");
            select.className = "custom-select col-4";
            select.appendChild(TPZ.renderHtml("<option>--</option>"));
            for (let i = 0; i < list.length; i += 1) {
                let comp = list[i];
                let option = document.createElement("option");
                option.text = comp.first_name + " " + comp.last_name;
                option.value = comp.id;
                select.appendChild(option);
            }
            select.addEventListener("change", function () {
                itemId = this.value;
                renderCompetitorOptions();
            });
            panel.appendChild(select);
        });
    });
    return [item, panel];
}

function renderCompetitorOptions() {
    let main = TPZ.getElementById("edit-comp");
    let panelContainer = TPZ.getElementById("panel-container");
    if (panelContainer != undefined) {
        panelContainer.remove();
    }
    panelContainer = TPZ.renderHtml(
        '<div id="panel-container" class="row" style="margin: 10px;"></div>'
    );
    main.appendChild(panelContainer);
    let buttonContainer = TPZ.renderHtml(
        '<div class="list-group col-3"></div>'
    );
    let contentContainer = TPZ.renderHtml(
        '<div class="tab-content col-8"></div>'
    );
    panelContainer.appendChild(buttonContainer);
    panelContainer.appendChild(contentContainer);

    let [item, panel] = setupAddToEvent();
    buttonContainer.appendChild(item);
    contentContainer.appendChild(panel);

    [item, panel] = setupRemoveFromEvent();
    buttonContainer.appendChild(item);
    contentContainer.appendChild(panel);
}

function setupAddToEvent() {
    let item = TPZ.renderHtml(
        '<a class="list-group-item list-group-item-action" data-toggle="list" href="#comp-add-event">Add to event</a>'
    );
    let panel = TPZ.renderHtml(
        '<div class="tab-pane row" id="comp-add-event"></div>'
    );
    item.addEventListener("click", function () {
        TPZ.httpGetJson("/api/all-events", function (list) {
            panel.innerHTML = "";
            let select = document.createElement("select");
            select.className = "custom-select col-4";
            select.appendChild(TPZ.renderHtml("<option>--</option>"));
            for (let i = 0; i < list.length; i += 1) {
                let event = list[i];
                let option = document.createElement("option");
                option.text = event.name;
                option.value = event.id;
                select.appendChild(option);
            }
            panel.appendChild(select);
            let btn = TPZ.renderHtml(
                '<button class="btn btn-primary">Add</button>'
            );
            btn.addEventListener("click", function () {
                let change = {
                    competitor_id: parseInt(itemId),
                    event_id: parseInt(select.value),
                };
                TPZ.httpPostJson("/api/add-to-event", change, function () {
                    alert("done");
                });
            });
            panel.appendChild(btn);
        });
    });
    return [item, panel];
}

function setupRemoveFromEvent() {
    let item = TPZ.renderHtml(
        '<a class="list-group-item list-group-item-action" data-toggle="list" href="#comp-remove-event">Remove from event</a>'
    );
    let panel = TPZ.renderHtml(
        '<div class="tab-pane row" id="comp-remove-event"></div>'
    );
    item.addEventListener("click", function () {
        TPZ.httpGetJson("/api/events-by-competitor/" + itemId, function (list) {
            panel.innerHTML = "";
            if (list.length == 0) {
                return;
            }
            let select = document.createElement("select");
            select.className = "custom-select col-4";
            select.appendChild(TPZ.renderHtml("<option>--</option>"));
            for (let i = 0; i < list.length; i += 1) {
                let event = list[i];
                let option = document.createElement("option");
                option.text = event.name;
                option.value = event.id;
                select.appendChild(option);
            }
            panel.appendChild(select);
            let btn = TPZ.renderHtml(
                '<button class="btn btn-primary">Drop</button>'
            );
            btn.addEventListener("click", function () {
                let change = {
                    competitor_id: parseInt(itemId),
                    event_id: parseInt(select.value),
                };
                TPZ.httpPostJson("/api/remove-from-event", change, function () {
                    alert("done");
                    setupRemoveFromEvent();
                });
            });
            panel.appendChild(btn);
        });
    });
    return [item, panel];
}

function setupEditEvent() {
    let item = TPZ.renderHtml(
        '<a class="list-group-item list-group-item-action" data-toggle="list" href="#edit-event">Edit event</a>'
    );
    let panel = TPZ.renderHtml(
        '<div class="tab-pane" id="edit-event">Edit events here</div>'
    );
    item.addEventListener("click", function () {
        TPZ.httpGetJson("/api/all-events", function (list) {
            panel.innerHTML = "";
            let select = document.createElement("select");
            select.className = "custom-select col-4";
            select.appendChild(TPZ.renderHtml("<option>--</option>"));
            for (let i = 0; i < list.length; i += 1) {
                let event = list[i];
                let option = document.createElement("option");
                option.text = event.name;
                option.value = event.id;
                select.appendChild(option);
            }
            select.addEventListener("change", function () {
                itemId = this.value;
                renderEventOptions();
            });
            panel.appendChild(select);
        });
    });
    return [item, panel];
}

function renderEventOptions() {
    let main = TPZ.getElementById("edit-event");
    let panelContainer = TPZ.getElementById("panel-container");
    if (panelContainer != undefined) {
        panelContainer.remove();
    }
    panelContainer = TPZ.renderHtml(
        '<div id="panel-container" class="row" style="margin: 10px;"></div>'
    );
    main.appendChild(panelContainer);
    let buttonContainer = TPZ.renderHtml(
        '<div class="list-group col-3"></div>'
    );
    let contentContainer = TPZ.renderHtml(
        '<div class="tab-content col-8"></div>'
    );
    panelContainer.appendChild(buttonContainer);
    panelContainer.appendChild(contentContainer);

    let [item, panel] = setupMoveEvent();
    buttonContainer.appendChild(item);
    contentContainer.appendChild(panel);
}

function setupMoveEvent() {
    let item = TPZ.renderHtml(
        '<a class="list-group-item list-group-item-action" data-toggle="list" href="#move-event">Move event</a>'
    );
    let panel = TPZ.renderHtml(
        '<div class="tab-pane row" id="move-event"></div>'
    );
    item.addEventListener("click", function () {
        TPZ.httpGetJson("/api/get-rings", function (list) {
            panel.innerHTML = "";
            if (list.length == 0) {
                return;
            }
            let select = document.createElement("select");
            select.className = "custom-select col-4";
            select.appendChild(TPZ.renderHtml("<option>--</option>"));
            for (let i = 0; i < list.length; i += 1) {
                let ring = list[i];
                let option = document.createElement("option");
                option.text = ring.name;
                option.value = ring.id;
                select.appendChild(option);
            }
            panel.appendChild(select);
            let btn = TPZ.renderHtml(
                '<button class="btn btn-primary">Move</button>'
            );
            btn.addEventListener("click", function () {
                let change = {
                    event_id: parseInt(itemId),
                    ring_id: parseInt(select.value),
                };
                TPZ.httpPostJson("/api/move-event", change, function () {
                    setupMoveEvent();
                });
            });
            panel.appendChild(btn);
        });
    });
    return [item, panel];
}
