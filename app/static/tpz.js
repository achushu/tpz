var TPZ = (function () {
    "use strict";

    // if JS blocked, the warning will remain
    clearJSWarning();

    // cached DOM elements
    var DOM = {
        mainContent: document.getElementById("main-content"),
    };

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

    function appendToPanel(element) {
        let content = DOM["mainContent"];
        content.appendChild(element);
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
        return template.content.childNodes;
    }

    function httpGet(url, onReady, async = true) {
        var r = new XMLHttpRequest();
        r.open("GET", url, async);
        r.onreadystatechange = function () {
            if (r.readyState != 4 || r.status != 200) return;
            onReady(r.responseText);
        };
        r.send();
    }

    function httpGetJson(url, onReady, async = true) {
        var r = new XMLHttpRequest();
        r.open("GET", url, async);
        r.onreadystatechange = function () {
            if (r.readyState != 4 || r.status != 200) return;
            onReady(JSON.parse(r.responseText));
        };
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

    function alert(text) {
        renderAlertModal(text);
        let modal = $("#alert-modal");
        // destroy the modal on any dismiss
        modal.on("hidden.bs.modal", function () {
            removeAlertModal();
        });
        $(modal).modal();
    }

    function confirm(text, ok) {
        renderConfirmModal(text);
        let modal = $("#confirm-modal");
        let okBtn = modal.find(".btn-primary");
        okBtn.on("click", function () {
            ok();
            modal.modal("hide");
        });
        // destroy the modal on any dismiss
        modal.on("hidden.bs.modal", function () {
            removeConfirmModal();
        });
        $(modal).modal();
    }

    function renderAlertModal(bodyText) {
        let modal = renderHtml(
            '<div class="modal fade" id="alert-modal" tabindex="-1" aria-labelledby="#alert-modal-label" aria-hidden="true">' +
                '<div class="modal-dialog modal-dialog-centered modal-sm">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title" id="alert-modal-label">Warning!</h5>' +
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
                '<span aria-hidden="true">&times;</span></button></div>' +
                '<div class="modal-body">' +
                bodyText +
                "</div>" +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-dismiss="modal">OK</button>' +
                "</div></div></div></div>"
        );
        appendToPanel(modal);
    }

    function removeAlertModal() {
        let modal = getElementById("alert-modal");
        modal.remove();
    }

    function renderConfirmModal(bodyText) {
        let modal = renderHtml(
            '<div class="modal fade" id="confirm-modal" tabindex="-1" aria-labelledby="#confirm-modal-label" aria-hidden="true">' +
                '<div class="modal-dialog modal-dialog-centered modal-sm">' +
                '<div class="modal-content"><div class="modal-header">' +
                '<h5 class="modal-title" id="confirm-modal-label">Confirm</h5>' +
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
                '<span aria-hidden="true">&times;</span></button></div>' +
                '<div class="modal-body">' +
                bodyText +
                "</div>" +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>' +
                '<button type="button" class="btn btn-primary" data-dismiss="modal">OK</button>' +
                "</div></div></div></div>"
        );
        appendToPanel(modal);
    }

    function removeConfirmModal() {
        let modal = getElementById("confirm-modal");
        modal.remove();
    }

    function addBreak(node) {
        node.appendChild(renderHtml("<br/>"));
    }

    /* =============== export public methods =============== */
    return {
        addBreak: addBreak,
        alert: alert,
        confirm: confirm,
        appendToPanel: appendToPanel,
        clearPanel: clearPanel,
        getAuthId: getAuthId,
        getElementById: getElementById,
        getElementByClass: getElementByClass,
        httpGet: httpGet,
        httpGetJson: httpGetJson,
        httpPostJson: httpPostJson,
        httpSendJson: httpSendJson,
        loginRequired: loginRequired,
        renderHtml: renderHtml,
        init: init,
    };
})();
