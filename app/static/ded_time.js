/*
    Deduction Timeline
    Renders a timeline of the deductions marked by the technical judges.
    Requires: plotly
*/
var DeductionTimeline = (() => {
    let plotObj;
    let marks;
    let timeMarkers;
    let timerId;
    let startTime;
    let layout = {
        title: "Deductions",
        margin: {
            t: 40,
        },
        height: 270,
        showlegend: false,
        xaxis: {
            title: "Seconds",
        },
        yaxis: {
            range: [0, 3.5],
            nticks: 4,
            zeroline: false,
        },
    };

    function init(id) {
        if (id === undefined) {
            id = "dedtime";
        }
        plotObj = document.getElementById(id);
        clear();
    }

    function clear() {
        stopTimeGraph();
        marks = [
            { trace: createTrace("Judge 1") },
            { trace: createTrace("Judge 2") },
            { trace: createTrace("Judge 3") },
        ];
        timeMarkers = {
            name: "",
            mode: "markers",
            type: "scatter",
            marker: { size: 0, color: "white" },
            x: [],
            y: [],
        };
        update();
    }

    function startTimeGraph() {
        if (timerId) return;
        this.startTime = TPZ.time();
        let elapsed = 0;
        addTimeMarker(elapsed);
        timerId = setInterval(() => {
            elapsed += 10;
            addTimeMarker(elapsed);
        }, 10000);
    }

    function stopTimeGraph() {
        if (timerId !== undefined) {
            started = undefined;
            clearInterval(timerId);
            timerId = undefined;
        }
    }

    function addTimeMarker(time) {
        timeMarkers.x.push(time);
        timeMarkers.y.push(0);
        layout.xaxis["autorangeoptions"] = {
            include: time + 5,
        };
        update();
    }

    // addMarker adds a marker to the judge's timeline at the given time
    // in seconds
    function addJudgeMarker(judge, time, code) {
        if (judge < 1 || judge > 3) return;
        if (!started) {
            startTimeGraph();
        }
        let idx = judge - 1;
        marks[idx].trace.x.append(time - this.startTime);
        marks[idx].trace.y.append(judge);
        marks[idx].trace.text.append(code);
        update();
    }

    function setJudgeMarkers(judge, times, codes) {
        if (judge < 1 || judge > 3) return;
        let idx = judge - 1;
        for (let i = 0; i < times.length; i++) {
            times[i] = (times[i] - this.startTime) / 1000;
        }
        marks[idx].trace.x = times;
        marks[idx].trace.y = Array(times.length).fill(judge);
        marks[idx].trace.text = codes;
        update();
    }

    function update() {
        let data = [
            timeMarkers,
            marks[0].trace,
            marks[1].trace,
            marks[2].trace,
        ];
        Plotly.react(plotObj, data, layout);
    }

    function createTrace(name) {
        return {
            mode: "markers+text",
            type: "scatter",
            marker: { size: 12 },
            textposition: "bottom center",
            name: name,
            x: [],
            y: [],
            text: [],
        };
    }

    return {
        start: startTimeGraph,
        stop: stopTimeGraph,
        add: addJudgeMarker,
        set: setJudgeMarkers,
        clear: clear,
        init: init,
    };
})();

/*

var trace1 = {
  x: [10, 40, 60, 62],
  y: [1, 1, 1, 1],
  mode: 'markers+text',
  type: 'scatter',
  marker: { size: 12 },
  textposition: 'bottom center',
  name: 'Judge 1',
  text: ['54', '70', '21', '54']
};

var trace2 = {
  x: [12, 40, 61, 62],
  y: [2, 2, 2, 2],
  mode: 'markers+text',
  type: 'scatter',
  marker: { size: 12 },
  textposition: 'bottom center',
  name: 'Judge 2',
  text: ['54', '52', '21', '54']
};

var trace3 = {
  x: [12, 43, 62],
  y: [3, 3, 3],
  mode: 'markers+text',
  type: 'scatter',
  marker: { size: 12 },
  textposition: 'bottom center',
  name: 'Judge 3',
  text: ['54', '52', '54']
};
var layout = {
  title: "Deductions",
  margin: {
    t: 40
  },
  height: 300,
  showlegend: false,
  xaxis: {
    title: "time",
  },
  yaxis: {
    title: "judge",
    range: [ 0.5, 3.5 ],
    nticks: 4,
    zeroline: false,
  }
};
var data = [trace1, trace2, trace3];

Plotly.newPlot('myDiv', data, layout);
*/
