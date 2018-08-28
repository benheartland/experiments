// initialise performance measurement variables in global scope
var startTime, expiredTime, loopCount, loopRate;

// how long the model should run for, in milliseconds
var runDuration = 5000;

// target samplerate (samples per second)
var targetSampleRate = 48000;

// number of segments to divide a string into
var stringSegmentCount = 1024;

// string canvas height in canvas pixels
var stringCanvasHeight = 256;

// constructor for an object describing a segment of a string
var stringSegment = function(length, mass) {
    this.length = length;
    this.mass = mass;
    this.displacement = [0, 0];
    this.velocity = [0, 0];
    this.acceleration = 0;
    // whether or not the segment is a node and should have displacement clamped to zero
    this.isNode = false;
}

// constructor for an object describing a string with uniform density along its length
// Use SI units: m, kg/m, Hz
var uniformString = function(segmentCount, length, massPerUnitLength, frequency) {
    // state alternates between 0 and 1 to indicate which set of variables is current
    this.state = 0;
    this.segmentCount = segmentCount;
    this.length = length;
    this.massPerUnitLength = massPerUnitLength;
    this.tension = Math.pow(2 * length * frequency, 2) * massPerUnitLength;
    var lengthPerSegment = length / segmentCount;
    var massPerSegment = massPerUnitLength * lengthPerSegment;
    this.segment = new Array(segmentCount);
    this.segment.fill(new stringSegment(lengthPerSegment, massPerSegment));
    // the first an last segments are always nodes
    this.segment[0].isNode = true;
    this.segment[this.segmentCount - 1].isNode = true;

    // method to advance to next iteration
    // dt is the time difference between the two iterations
    this.advanceToNextIteration = function(dt) {
        var currentState = this.state;
        var nextState = this.state++ % 2;
        // calculate the next iteration
        for (var i = 0; i < this.segmentCount; i++) {
            if (this.segment[i].isNode) {
                // if the segment is a node, clamp it to zero
                this.segment[i].displacement[nextState] = 0;
                this.segment[i].velocity[nextState] = 0;
                this.segment[i].acceleration = 0;
            } else {
                // calculate acceleration
                this.segment[i].acceleration = this.tension / this.segment[i].mass *
                (   // resolve vertical forces
                    (this.segment[i-1].displacement[currentState] - this.segment[i].displacement[currentState])/this.segment[i-1].length
                    + (this.segment[i+1].displacement[currentState] - this.segment[i].displacement[currentState])/this.segment[i].length
                );
                // calculate velocity
                this.segment[i].velocity[nextState] = this.segment[i].velocity[currentState] + dt * this.segment[i].acceleration;
                // calculate displacement
                this.segment[i].displacement[nextState] = this.segment[i].displacement[currentState] + dt * this.segment[i].velocity[nextState];
            }
        }
        // flip to the other state (0 <=> 1)
        this.state = nextState;
    }
}

window.onload = function() {
    // start the main loop
    main();
}

// creates the canvas element that string(s) will be drawn in
function createStringCanvas(id, title = '') {
    var canvasElement = document.createElement("canvas");
    canvasElement.id = id;
    canvasElement.title = title;
    canvasElement.yZoom = 1;
    canvasElement.classList.add("string-canvas");
    if (title == '') {
        canvasElement.textContent = "HTML5 canvas for drawing a string.";
    } else {
        canvasElement.textContent = ("HTML5 canvas for drawing the " + title);
    }

    // make the canvas have one pixel width for each stringSegment
    // FUTURE: fix canvas width and draw segmants based on length
    canvasElement.width = stringSegmentCount;
    // all canvases shall have the same height
    canvasElement.height = stringCanvasHeight;
    // get the canvas 2D context
    canvasElement.ctx = canvasElement.getContext("2d");
    // move the y-origin to the middle of the canvas 
    canvasElement.ctx.translate(0, Math.round(stringCanvasHeight / 2));
    // add the canvas to the document
    document.getElementById("canvas-container").appendChild(canvasElement);
    // return the created canvas element
    return canvasElement;
}

function main() {

    // get display elements for performance and convenience
    var expiredTimeDisplay = document.getElementById("expired-time");
    var loopCountDisplay = document.getElementById("loop-count");
    var loopRateDisplay = document.getElementById("loop-rate");

    // set up the string(s)
    var gString = new uniformString(stringSegmentCount, 0.640, 0.00114, 196);
    // create the canvas element(s) that the string(s) will be drawn in
    var gStringCanvas = createStringCanvas("g-string-canvas", "G string");

    // draw the string(s)
    drawString(gString, gStringCanvas);

    console.log("Main loop started");
    // initialise perfomance measurement variables
    loopCount = 0;
    startTime = Date.now();

    // The main loop
    do {
        // calculate next iteration
        gString.advanceToNextIteration();

        // redraw canvas
        drawString(gString, gStringCanvas);

        // performance measurement
        // increment loop counter
        loopCount++;
        // recalculate expiredTime
        expiredTime = Date.now() - startTime;
        // recalculate loopRate
        loopRate = loopCount / expiredTime;
        // show the performance variables
        expiredTimeDisplay.textContent = expiredTime / 1000;
        loopCountDisplay.textContent = loopCount;
        loopRateDisplay.textContent = Math.round(loopRate * 1000);

    // stop after runDuration has elapsed
    } while (expiredTime < runDuration);
    console.log("Main loop stopped");
}

// draw a the current state of a string into a canvas
function drawString(stringObject, canvasElement) {
    // which is the current state (0 or 1)?
    var currentState = stringObject.state;
    var segmentCount = stringObject.segment.length;
    // draw the string using a path with lines
    canvasElement.ctx.beginPath();
    canvasElement.ctx.moveTo(0, stringObject.segment[0].displacement[currentState] * canvasElement.yZoom);
    for (var i = 1; i < segmentCount; i++) {
        canvasElement.ctx.lineTo(i, stringObject.segment[i].displacement[currentState] * canvasElement.yZoom);
    }
    canvasElement.ctx.stroke();
}
