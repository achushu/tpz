var Scratchpad = (() => {
    var id = "scratchpad";

    function clear() {
        let sp = $("#scratchpad");
        TPZ.confirm("Clear all text from notes?", () => {
            sp.val("");
        });
    }

    function setDefaultStyle() {
        let sp = $("#scratchpad");
        sp.css("border-width", "")
            .css("border-color", "")
            .css("border-style", "");
    }

    function init() {
        let sp = $("#scratchpad");
        setDefaultStyle();
        sp.focus(() => {
            $(this)
                .css("border-width", "3px")
                .css("border-style", "solid")
                .css("border-color", "firebrick");
        })
            .focusout(() => {
                setDefaultStyle();
            })
            .keydown((event) => {
                if (event.which === 32) {
                    // Prevent SPACEBAR from triggering other events
                    event.stopPropagation();
                }
            })
            .keyup((event) => {
                if (event.which === 32) {
                    // Prevent SPACEBAR from triggering other events
                    event.stopPropagation();
                }
            });
        $("#clear-scratchpad-button").click(() => {
            clear();
        });
    }

    function setupHtml() {
        return `<div class="container">
        <textarea id="scratchpad" placeholder="Scratch pad"></textarea><br/>
        <button id="clear-scratchpad-button" class="btn btn-outline-secondary">Clear Notes</button>
    </div>`;
    }

    function getText() {
        let sp = document.getElementById(id);
        if (sp) return sp.value;
    }

    function setText(text) {
        let sp = document.getElementById(id);
        sp.value = text;
    }

    return {
        clear: clear,
        init: init,
        html: setupHtml,
        text: getText,
        setText: setText,
    };
})();
