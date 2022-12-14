var Scratchpad = (() => {
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

    return {
        clear: clear,
        init: init,
    };
})();
