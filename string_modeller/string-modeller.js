const stopAfterNIterations = 10000;
const dt = 0.00001;
const verticalZoom = 0.1;
var pluckPoint = 0.5; // set within the range (0, 1)
var pluckDisplacement = 0.001;

// styling
var centerlineColor = "#ff8888";
var waveColor = "#000000";

// initialise performance measurement variables in global scope
var startTime,
    elapsedRealTime = 0,
    elapsedVirtualTime = 0,
    loopCount = 0,
    loopRate
;

// how long the model should run for, in milliseconds
var runDuration = 40;

// target samplerate (samples per second)
var targetSampleRate = 48000;

// number of segments to divide a string into
var stringSegmentCount = 2**6 * 3**2 * 5;
console.log('# segments: ' + stringSegmentCount);
// the point at which the string will be plicked
var pluckSegment = Math.round(pluckPoint * stringSegmentCount);
console.log('Pluck at segment #:' + pluckSegment);

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

// Constructor for an object describing a string with uniform density along its length.
// Use SI units: 
//  length in m
//  mass per unit length in kg/m
//  stiffness in N/m (see Hooke's Law https://en.wikipedia.org/wiki/Hooke%27s_law)
//  frequency in Hz
var uniformString = function(segmentCount, length, massPerUnitLength, stiffness, frequency) {
    // state alternates between 0 and 1 to indicate which set of variables is current
    this.state = 0;
    // We model the string as n = segmentCount point masses
    this.segmentCount = segmentCount;
    this.length = length;
    this.massPerUnitLength = massPerUnitLength;
    this.stiffness = stiffness;
    this.tension = Math.pow(2 * length * frequency, 2) * massPerUnitLength;
    // the point masses are joined by n-1 weightless springs.
    var lengthPerSegment = length / (segmentCount - 1);
    var massPerSegment = massPerUnitLength * length / segmentCount;
    this.segment = new Array(segmentCount);
    for (i = 0; i < segmentCount; i++) {
        this.segment[i] = new stringSegment(lengthPerSegment, massPerSegment);
    }
    // the first and last segments are always nodes
    this.segment[0].isNode = true;
    this.segment[this.segmentCount - 1].isNode = true;

    // DEBUG
    console.log('Tension: ' + this.tension + ' N');
    console.log('Point mass: ' + this.segment[pluckSegment].mass + ' kg');

    // method to advance to next iteration
    // dt is the time difference between the two iterations, in seconds
    this.advanceToNextIteration = function(dt) {
        var currentState = this.state;
        var nextState = (currentState + 1) % 2;
        // calculate the next iteration
        for (var i = 0; i < this.segmentCount; i++) {
            if (this.segment[i].isNode) {
                // if the segment is a node, clamp it to zero
                this.segment[i].displacement[nextState] = 0;
                this.segment[i].velocity[nextState] = 0;
                this.segment[i].acceleration = 0;
            } else {
                // calculate acceleration
                var k = this.stiffness;
                var dx1 = this.segment[i-1].length;
                var dy1 = this.segment[i-1].displacement[currentState] - this.segment[i].displacement[currentState];
                var l1 = Math.sqrt(dx1*dx1 + dy1*dy1);
                var dx2 = this.segment[i].length;
                var dy2 = this.segment[i+1].displacement[currentState] - this.segment[i].displacement[currentState];
                var l2 = Math.sqrt(dx2*dx2 + dy2*dy2);
                // account for increase in tension due to stretching, resolve forces vertically and divide by mass
                this.segment[i].acceleration = (((l1 - dx1)/k + this.tension)*dy1/l1 + ((l2 - dx2)/k + this.tension)*dy2/l2) / this.segment[i].mass;
                // calculate velocity
                this.segment[i].velocity[nextState] = this.segment[i].velocity[currentState] + dt * this.segment[i].acceleration;
                // calculate displacement
                this.segment[i].displacement[nextState] = this.segment[i].displacement[currentState] + dt*this.segment[i].velocity[currentState] + 0.5*dt*dt*this.segment[i].acceleration;
            }
        }
        // flip to the other state (0 <=> 1)
        this.state = nextState;
    }
}

// creates the canvas element that string(s) will be drawn in
function createStringCanvas(id, title = '') {
    var canvasElement = document.createElement("canvas");
    canvasElement.id = id;
    canvasElement.title = title;
    canvasElement.xZoom = 1;
    canvasElement.yZoom = 1;
    canvasElement.classList.add("string-canvas");
    if (title == '') {
        canvasElement.textContent = "HTML5 canvas for drawing a string.";
    } else {
        canvasElement.textContent = ("HTML5 canvas for drawing the " + title);
    }

    // make the canvas have one pixel width for each stringSegment
    // FUTURE: fix canvas width and draw segmants based on length
    canvasElement.width = stringSegmentCount * canvasElement.xZoom;
    // all canvases shall have the same height
    canvasElement.height = stringCanvasHeight;
    // get the canvas 2D context
    canvasElement.ctx = canvasElement.getContext("2d");
    // move the y-origin to the middle of the canvas 
    canvasElement.ctx.translate(0, Math.round(stringCanvasHeight / 2));
    // add the canvas to the document
    document.getElementById("canvas-container").appendChild(canvasElement);
    // draw the centerline
    canvasElement.ctx.beginPath();
    canvasElement.ctx.moveTo(0,0);
    canvasElement.ctx.lineTo(canvasElement.width, 0);
    canvasElement.ctx.strokeStyle = centerlineColor;
    canvasElement.ctx.stroke();
    canvasElement.ctx.strokeStyle = waveColor;
    // return the created canvas element
    return canvasElement;
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
        canvasElement.ctx.lineTo(i * canvasElement.xZoom, stringObject.segment[i].displacement[currentState] * canvasElement.yZoom);
    }
    canvasElement.ctx.stroke();
}

function main() {

    // get display elements for performance and convenience
    var elapsedRealTimeDisplay = document.getElementById("elapsed-real-time");
    var elapsedVirtualTimeDisplay = document.getElementById("elapsed-virtual-time");
    var loopCountDisplay = document.getElementById("loop-count");
    var loopRateDisplay = document.getElementById("loop-rate");

    // set up the string(s)
    var guitarGString = new uniformString(stringSegmentCount, 0.640, 0.00114, 1000, 196);
    // create the canvas element(s) that the string(s) will be drawn in
    var guitarGStringCanvas = createStringCanvas("guitar-g-string-canvas", "Guitar G string");
    guitarGStringCanvas.yZoom = verticalZoom;

    var bassAString = new uniformString(stringSegmentCount, 0.864, 0.01723, 1000, 55);
    var bassAStringCanvas = createStringCanvas("bass-a-string-canvas", "Bass A String");
    bassAStringCanvas.yZoom = verticalZoom;

    // TESTING: naively displace part of the string a little
    guitarGString.segment[pluckSegment].displacement[0] = pluckDisplacement;
    bassAString.segment[pluckSegment].displacement[0] = pluckDisplacement;

    // draw the string(s)
//    drawString(guitarGString, guitarGStringCanvas);

    console.log("Main loop started");
    // initialise perfomance measurement variables
    loopCount = 0;
    startTime = Date.now();

    // The main loop
    do {
        // calculate next iteration
        guitarGString.advanceToNextIteration(dt);
        bassAString.advanceToNextIteration(dt);

        // redraw canvas
//        guitarGStringCanvas.ctx.clearRect(0, 0, guitarGStringCanvas.width, guitarGStringCanvas.height);
//        drawString(guitarGString, guitarGStringCanvas);

        // performance measurement
        // increment loop counter
        loopCount++;
        // recalculate elapsed time
        elapsedRealTime = Date.now() - startTime;
        elapsedVirtualTime += dt;
        // recalculate loopRate
        loopRate = loopCount / elapsedRealTime;
        // show the performance variables
        elapsedRealTimeDisplay.textContent = elapsedRealTime / 1000;
        elapsedVirtualTimeDisplay.textContent = elapsedVirtualTime;
        loopCountDisplay.textContent = loopCount;
        loopRateDisplay.textContent = Math.round(loopRate * 1000);

        console.log('Loop #: ' + loopCount); // DEBUG
        console.log('State: ' + bassAString.state); // DEBUG
        console.log('a = ' + bassAString.segment[pluckSegment].acceleration) // DEBUG
        console.log('v = ' + bassAString.segment[pluckSegment].velocity[bassAString.state]); // DEBUG
        console.log('d = ' + bassAString.segment[pluckSegment].displacement[bassAString.state]); // DEBUG

    // stop after runDuration has elapsed
//    } while (elapsedTime < runDuration);
    } while (loopCount < stopAfterNIterations); // DEBUG

    console.log("Main loop stopped");
    drawString(guitarGString, guitarGStringCanvas);
    drawString(bassAString, bassAStringCanvas);
}

window.onload = function() {
    // start the main loop
    main();
}