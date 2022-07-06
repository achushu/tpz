let sp = $("#scratchpad");

function clearScratchPad() {
    TPZ.confirm("Clear all text from notes?", function () {
        sp.val("");
    });
}

function setScratchPadDefaultStyle() {
    sp.css("border-width", "").css("border-color", "").css("border-style", "");
}

function initScratchPad() {
    setScratchPadDefaultStyle();
    sp.focus(function () {
        $(this)
            .css("border-width", "3px")
            .css("border-style", "solid")
            .css("border-color", "firebrick");
    })
        .focusout(function () {
            setScratchPadDefaultStyle();
        })
        .keydown(function (event) {
            if (event.which === 32) {
                // Prevent SPACEBAR from triggering other events
                event.stopPropagation();
            }
        })
        .keyup(function (event) {
            if (event.which === 32) {
                // Prevent SPACEBAR from triggering other events
                event.stopPropagation();
            }
        });
    $("#clear-scratchpad-button").click(function () {
        clearScratchPad();
    });
}
