var TPZ = (function () {
    "use strict";

    // if JS blocked, the warning will remain
    clearJSWarning();

    loadTheme();

    // cached DOM elements
    var DOM = {
        mainContent: document.getElementById("main-content"),
    };

    var timeoffset = 0;

    /* =================== private methods ================= */
    /*
    // cache DOM elements
    function cacheDom() {
      DOM.$someElement = $('#some-element');
    }
  
    // bind events
    function bindEvents() {
      DOM.$someElement.click(handleClick);
    }
  
    // handle click events
    function handleClick(e) {
      render(); // etc
    }
  
    // render DOM
    function render() {
      DOM.$someElement
        .html('<p>Yeah!</p>');
    }
    */

    /* =================== public methods ================== */
    // main init method
    function init() {
        //cacheDom();
        //bindEvents();
    }

    function clearJSWarning() {
        getElementById("js-warn").remove();
    }

    function loginRequired() {
        $("#user-panel").dropdown("show");
    }

    function getAuthId() {
        let cookies = decodeURIComponent(document.cookie).split(";");
        for (let i = 0; i < cookies.length; i += 1) {
            let c = cookies[i];
            let [k, v] = c.split("=");
            if (k == "tpzTag") {
                return v;
            }
        }
        return undefined;
    }

    // getTimestamp syncs times across the app with the server
    // by adjusting the system time with an offset
    function getTimestamp() {
        return Date.now() + this.timeoffset;
    }

    function setTimeOffset(offset) {
        this.timeoffset = offset;
    }

    function loadTheme() {
        httpGet("/api/get-theme", function (data) {
            var themeRef = document.createElement("link");
            themeRef.rel = "stylesheet";
            themeRef.type = "text/css";
            themeRef.href = data;
            document.getElementsByTagName("head")[0].appendChild(themeRef);
        });
    }

    /* DOM manipulation */

    function getElementById(id) {
        /* no caching for now
        var ele = DOM[id];
        if (ele !== undefined) {
            return ele;
        }
        */
        var ele = document.getElementById(id);
        //DOM[id] = ele;
        return ele;
    }

    // get the first element with the given class
    function getElementByClass(c) {
        var ele = document.getElementsByClassName(c)[0];
        return ele;
    }

    function appendToPanel(element) {
        let content = DOM["mainContent"];
        content.appendChild(element);
    }

    function prependToPanel(element) {
        let content = DOM["mainContent"];
        if (content.childNodes.length == 0) {
            return appendToPanel(element);
        }
        let first = content.childNodes[0];
        content.insertBefore(element, first);
    }

    function clearPanel() {
        let content = DOM["mainContent"];
        while (content.hasChildNodes()) {
            content.removeChild(content.firstChild);
        }
    }

    function renderHtml(html) {
        var template = document.createElement("template");
        template.innerHTML = html;
        if (template.content.childNodes.length == 1) {
            return template.content.childNodes[0];
        }
        let children = template.content.childNodes;
        let frag = document.createDocumentFragment();
        while (children.length > 0) {
            frag.appendChild(children[0]);
        }
        return frag;
    }

    function appendElements(dst, children) {
        if (children.length === undefined) {
            dst.appendChild(children);
            return;
        }
        let frag = document.createDocumentFragment();
        for (let i in children) {
            frag.appendChild(children[i]);
        }
        dst.appendChild(frag);
    }

    function setHeader(text) {
        getElementById("header").textContent = text;
    }

    function setTitle(text) {
        document.getElementsByTagName(
            "title"
        )[0].textContent = `${text} | Ten.Zero`;
    }

    function createRadioGroup(id) {
        return TPZ.renderHtml(
            `<div id="${id}" class="btn-group btn-group-toggle btn-group-vertical" data-toggle="buttons"></div>`
        );
    }

    function createRadioItem(name, data) {
        let item = TPZ.renderHtml(
            `<label class="btn btn-theme"><input type="radio">${name}</label>`
        );
        for (let k in data) {
            item.dataset[k] = data[k];
        }
        return item;
    }

    function formatName(first, last) {
        if (first && last) return first + " " + last;
        if (first) return first;
        if (last) return last;
        return undefined;
    }

    function alert(text, ok) {
        renderModal("Warning!", text, "alert", ok);
    }

    function confirm(text, ok, cancel) {
        renderModal("Confirm", text, "confirm", ok, cancel);
    }

    function customConfirm(title, text, ok, cancel) {
        renderModal(title, text, "confirm", ok, cancel);
    }

    function renderModal(title, body, style, okCB, cancelCB) {
        let btnHtml = "";
        switch (style) {
            case "alert":
                btnHtml =
                    '<button id="modal-ok-btn" type="button" class="btn btn-secondary" data-dismiss="modal">OK</button>';
                break;
            case "confirm":
                btnHtml =
                    '<button id="modal-cancel-btn" type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>' +
                    '<button id="modal-ok-btn" type="button" class="btn btn-primary" data-dismiss="modal">OK</button>';
                break;
        }
        let modalBox = renderHtml(
            '<div class="modal fade" id="tpz-modal" tabindex="-1" aria-labelledby="#tpz-modal-label" aria-hidden="true">' +
                '<div class="modal-dialog modal-dialog-centered modal-sm">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title" id="tpz-modal-label">' +
                title +
                "</h5>" +
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
                '<span aria-hidden="true">&times;</span></button></div>' +
                '<div class="modal-body">' +
                body +
                "</div>" +
                '<div class="modal-footer">' +
                btnHtml +
                "</div></div></div></div>"
        );
        appendToPanel(modalBox);

        let modal = $("#tpz-modal");
        let okBtn = modal.find("#modal-ok-btn");
        okBtn.on("click", () => {
            modal.modal("hide");
            if (okCB) {
                okCB();
            }
        });
        let cancelBtn = modal.find("#modal-cancel-btn");
        if (cancelBtn.length > 0 && cancelBtn !== undefined) {
            cancelBtn.on("click", () => {
                modal.modal("hide");
                if (cancelCB) {
                    cancelCB();
                }
            });
        }
        // destroy the modal on any dismiss
        modal.on("hidden.bs.modal", () => {
            removeModal();
        });
        $(modal).modal();
    }

    function removeModal() {
        let modal = getElementById("tpz-modal");
        modal.remove();
    }

    /* AJAX queries */

    function httpGet(url, onReady, async = true) {
        var r = new XMLHttpRequest();
        r.open("GET", url, async);
        if (onReady) {
            r.onreadystatechange = function () {
                if (r.readyState != 4 || r.status != 200) return;
                onReady(r.responseText);
            };
        }
        r.send();
    }

    function httpGetJson(url, onReady, async = true) {
        var r = new XMLHttpRequest();
        r.open("GET", url, async);
        if (onReady) {
            r.onreadystatechange = function () {
                if (r.readyState != 4 || r.status != 200) return;
                onReady(JSON.parse(r.responseText));
            };
        }
        r.send();
    }

    function httpPostJson(url, data, onReady, async = true) {
        httpSendJson(url, "POST", data, onReady, async);
    }

    function httpSendJson(url, method, data, onReady, async = true) {
        var r = new XMLHttpRequest();
        r.open(method, url, async);
        if (onReady) {
            r.onreadystatechange = function () {
                if (r.readyState != 4 || r.status != 200) return;
                onReady(JSON.parse(r.responseText));
            };
        }
        r.setRequestHeader("Content-Type", "application/json");
        r.send(JSON.stringify(data));
    }

    /* Scratchpad methods */

    function addScratchpad(text) {
        let content = DOM["mainContent"];
        appendElements(content, renderHtml(Scratchpad.html()));
        Scratchpad.init();
        if (text !== undefined) {
            Scratchpad.setText(text);
        }
    }

    /* =============== export public methods =============== */
    return {
        addScratchpad: addScratchpad,
        appendElements: appendElements,
        alert: alert,
        confirm: confirm,
        customConfirm: customConfirm,
        appendToPanel: appendToPanel,
        clearPanel: clearPanel,
        createRadioGroup: createRadioGroup,
        createRadioItem: createRadioItem,
        formatName: formatName,
        getAuthId: getAuthId,
        getElementById: getElementById,
        getElementByClass: getElementByClass,
        httpGet: httpGet,
        httpGetJson: httpGetJson,
        httpPostJson: httpPostJson,
        httpSendJson: httpSendJson,
        loginRequired: loginRequired,
        prependToPanel: prependToPanel,
        renderHtml: renderHtml,
        setHeader: setHeader,
        setTitle: setTitle,
        setTimeOffset: setTimeOffset,
        time: getTimestamp,
        init: init,
    };
})();
