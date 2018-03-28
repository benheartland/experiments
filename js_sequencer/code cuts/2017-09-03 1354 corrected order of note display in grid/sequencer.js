// constants
var pitchClass = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function noteNumberToNoteName(noteNumber) {
	var octaveNumber = Math.floor(noteNumber / 12);
	var noteName = pitchClass[noteNumber % 12];
	return noteName + octaveNumber.toString();
}

// forces a number to an integer between 0 and 127 inclusive, in line with MIDI standard.
function clipInt0to127(x) {
	return Math.min(Math.max(Math.round(x), 0), 127);
}

// parameters (pseudo-constant) with default values
var barsPerCycle = 4;
var beatsPerBar = 4;
var ticksPerBeat = 4;
var bpm = 180;
var inputVelocity = 64;

// variables derived from pseudo-constants
var tickDuration;	// duration of a single tick in milliseconds
function setTickDuration() {
	tickDuration = Math.round(60000/bpm/ticksPerBeat)
};
setTickDuration();

var step = new Array();
var stepCount, previousStep, currentStep, stepDisplayWidth;			// step will be a global array to hold all step instuctions & info

// state variables
var running = false;
var cycle, bar, beat, tick;
var interval;					// timer interval needs to be available in global scope
var ensemble = new Array();		// global array to hold all instruments

// INITIALISATION

function init() {

	// This function adds a 'validate' method to input elements
	// that allows only integer input within a given range. The
	// validate() method can then be called as part of an onchange()
	// event handler. The function also sets a default value.
	function addIntegerInputValidation(inputElement, defaultInteger, minInteger, maxInteger) {
		document.getElementById(inputElement).previousValue = defaultInteger;
		document.getElementById(inputElement).value = defaultInteger;
		document.getElementById(inputElement).validate = function() {
			var parsedInt = Number.parseInt(this.value.trim());
			if (Number.isInteger(parsedInt)) {
				this.value = Math.min(Math.max(parsedInt, minInteger), maxInteger);
				this.previousValue = this.value;
			} else {
				this.value = this.previousValue;
			}
		}
	}
	// set input validation for parameter inputs
	addIntegerInputValidation('inputVelocity', 64, 0, 127);
	addIntegerInputValidation('bpm', bpm, 40, 400);
	addIntegerInputValidation('barsPerCycle', barsPerCycle, 1, Number.POSITIVE_INFINITY);
	addIntegerInputValidation('beatsPerBar', beatsPerBar, 1, Number.POSITIVE_INFINITY);
	addIntegerInputValidation('ticksPerBeat', ticksPerBeat, 1, Number.POSITIVE_INFINITY);
	// set onchange functions for parameters
	document.getElementById('bpm').onchange = function() {bpm = this.value; setTickDuration();};
	document.getElementById('barsPerCycle').onchange = function() {this.validate(); barsPerCycle = this.value; drawGrid(); resetClock();};
	document.getElementById('beatsPerBar').onchange = function() {this.validate(); beatsPerBar = this.value; drawGrid(); resetClock();};
	document.getElementById('ticksPerBeat').onchange = function() {this.validate(); ticksPerBeat = this.value; drawGrid(); resetClock();};

	// initialise drum kit
	ensemble[0] = new instrument('Drums')
	ensemble[0].addNote(51, 'Ride');
	ensemble[0].note[51].addSample('instruments/drumkit/ride1.wav');
	ensemble[0].note[51].addSample('instruments/drumkit/ride2.wav');

	ensemble[0].addNote(38, 'Snare');
	ensemble[0].note[38].addSample('instruments/drumkit/snare01.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare02.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare03.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare04.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare05.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare06.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare07.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare08.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare09.wav');
	ensemble[0].note[38].addSample('instruments/drumkit/snare10.wav');

	ensemble[0].addNote(36, 'Kick');
	ensemble[0].note[36].addSample('instruments/drumkit/kick.wav');

	// set spacebar as shortcut to toggle start/stop
	window.onkeypress = function(keypress) {
		var nodeId = (document.activeElement.parentNode.id || 'undefined');
		// do nothing if focus is on one of the parameter inputs
		if (nodeId != 'parameters' && (keypress.key == ' ' || keypress.code == 'Space' || keypress.charCode == 32)) {
			toggleStartStopClock();
		}
	}

	// remove default keypress actions from start and stop buttons
	document.getElementById('startButton').onkeypress = void(0);
	document.getElementById('stopButton').onkeypress = void(0);

	// draw the UI
	drawGrid();
	resetClock();
}

// CLOCK FUNCTIONS

// TODO: integrate clock functions and propertied into a clock object

function startClock() {
	if (!running) {
		interval = window.setInterval(playStep,tickDuration);
		running = true;
		document.getElementById('stopButton').value = "Stop";
		document.getElementById('stopButton').onclick = stopClock;
		document.getElementById('startButton').blur();
	}
}

function stopClock() {
	if(running) {
		clearInterval(interval);
		running = false;
		document.getElementById('stopButton').value = "Reset";
		document.getElementById('stopButton').onclick = resetClock;
		document.getElementById('stopButton').blur();
	}
}

function toggleStartStopClock() {
	if(running) {stopClock(); return;}
	else {startClock()};
}

function resetClock() {
	if(!running) {
		cycle = 1;
		bar = 1;
		beat = 1;
		tick = 1;
		previousStep = currentStep;
		currentStep = 1;
		updateClock();
	}
}

// update clock display
function updateClock() {
	// update the clock display
	document.getElementById('clock_cycle').textContent = cycle;
	document.getElementById('clock_bar').textContent = bar;
	document.getElementById('clock_beat').textContent = beat;
	document.getElementById('clock_tick').textContent = tick;
	// move the current step indicator in the time ruler (by setting background color)
	if (document.body.classList) {			// most browsers
		document.getElementById('step_' + previousStep).classList.remove('currentStep');
		document.getElementById('step_' + currentStep).classList.add('currentStep');
	} else if (document.body.className) {	// IE<=9 
		document.getElementById('step_' + previousStep).className.replace(' currentStep', '');
		document.getElementById('step_' + currentStep).className += ' currentStep';
	}
}

function playStep() {
	step[currentStep].actionList.forEach(function(action) {
		switch (action.type) {
			case 'noteOn':
				ensemble[action.instrumentIndex].note[action.noteNumber].noteOn(action.value);
			break;
		}
	});

	// advance to next step in the sequence
	nextStep();
}

// advance to the next step
function nextStep() {
	previousStep = currentStep;
	currentStep++;
	tick++;
	if (tick > ticksPerBeat) {
		tick = 1;
		beat++;
		if (beat > beatsPerBar) {
			beat = 1;
			bar++;
			if (bar > barsPerCycle) {
				bar = 1;
				currentStep = 1;
				cycle++;
			}
		}
	}
	updateClock();
}

// INSTRUMENT PROTOTYPE

function instrument(name) {
	this.name = name;
	this.note = new Array();
	this.addNote = function(noteNumber, noteDisplayName) {
		if (typeof noteDisplayName === 'undefined') {			// noteDisplayName is optional; defaults to C5 for middle C etc.
			noteDisplayName = noteNumberToNoteName(noteNumber);
		}
		this.note[noteNumber] = new Object();
		this.note[noteNumber].displayName = noteDisplayName;
		this.note[noteNumber].sample = new Array();				// the array the holds the round robin samples
		this.note[noteNumber].samplePointer = 0;
		this.note[noteNumber].addSample = function(path) {
			var sampleIndex = this.sample.push(new Audio(path)) - 1;
			this.sample[sampleIndex].autoplay = false;
			this.sample[sampleIndex].controls = false;
			this.sample[sampleIndex].preload = true;
		}
		// method to play the note on a Note On event
		this.note[noteNumber].noteOn = function(velocity) {
			var sp = this.samplePointer;
			// set the volume using a simple linear velocity curve.
			this.sample[sp].volume = velocity/127;
			// if the sample is not playing, start it...
			if (this.sample[sp].ended || this.sample[sp].paused) {
				this.sample[sp].play();
			// ...otherwise return it to it's start position.
			} else {
				this.sample[sp].currentTime = 0;
			}
			// advance the note's samplePointer to the next sample in the round robin, returning to zero if the end of the array is reached
			this.samplePointer++;
			if (this.samplePointer >= this.sample.length) {
				this.samplePointer = 0;
			}
		}
		this.note[noteNumber].noteOff = function() {
			for (var i = 0; i++; i < this.sample.length) {
				if (!this.sample[i].paused) {
					this.sample[i].pause();
				}
			this.sample[i].currentTime = 0;
			}
		}
	}
}

// SEQUENCER GRID

// use this to construct the ids for each body table cell in the sequencer grid
function constructGridId(stepNumber, instrumentIndex, noteNumber) {
	return 'step_' + stepNumber + '_instrument_' + instrumentIndex + '_note_' + noteNumber;
}

// Build the sequencer grid
function drawGrid() {

	// stop the clock (if it is running)
	stopClock();

	// recalculate stepCount, .
	stepCount = ticksPerBeat*beatsPerBar*barsPerCycle;
	currentStep = stepCount;								// pretend that a cycle just completed
	stepDisplayWidth = (100/stepCount) + "%";
	// refresh the step Array
	step = new Array();
	for (i=1; i<= stepCount; i++) {
		// create the step object for each step
		step[i] = new Object();
		// create the actionList array for each step
		step[i].actionList = new Array();
	}

	// destroy any existing grid display
	document.getElementById('grid_container').innerHTML = '';

	// create the grid table object
	var gridTable = document.createElement('table');
	gridTable.id = 'grid_table';

	// build the grid header
	var gridHead = document.createElement('thead');
	gridTable.appendChild(gridHead);

	// build the time ruler header row
	var gridHeadRulerRow = document.createElement('tr');
	var stepPointer = 1;
	for (var i = 1; i <= barsPerCycle; i++) {
		for (var j = 1; j <= beatsPerBar; j++) {
			for (var k = 1; k <= ticksPerBeat; k++) {
				var gridHeadRulerStep = document.createElement('th');
				gridHeadRulerStep.id = 'step_' + stepPointer;
				gridHeadRulerStep.className = 'step';
				gridHeadRulerStep.style.width = stepDisplayWidth;
				if (k == 1) {
					gridHeadRulerStep.textContent = i + "." + j;
				}
				gridHeadRulerRow.appendChild(gridHeadRulerStep);
				// advance step pointer
				stepPointer++;
			}
		}
	}
	gridHead.appendChild(gridHeadRulerRow);

	// build the grid body
	var gridBody = document.createElement('tbody');
	gridTable.appendChild(gridBody);

	// cycle through each instrument...
	ensemble.forEach(function(instrumentInstance, instrumentIndex) {
		// ... and each note of each instrument...
		instrumentInstance.note.forEach(function(noteInstance, noteNumber) {
			// ...building one row of the sequencer grid each time.
			var gridBodyNoteRow = document.createElement('tr');
			// construct each row by cycling through the steps.
			step.forEach(function(stepInstance,stepIndex) {
				var gridBodyNoteStep = document.createElement('td');
				gridBodyNoteStep.id = constructGridId(stepIndex, instrumentIndex, noteNumber);
				gridBodyNoteStep.className = 'step';
				gridBodyNoteStep.style.width = stepDisplayWidth;


				// set mousedown event handler for each grid table cell.
				gridBodyNoteStep.onmousedown = function(mouseDownEvent) {
					if (mouseDownEvent.button == 0) {			// left mouse button
						var initialX = mouseDownEvent.clientX;
						var initialY = mouseDownEvent.clientY;
						var initialVelocity = getNoteOnVelocity(stepIndex, instrumentIndex, noteNumber);
						// display an empty div in front of the whole body to prevent anything being selected
						document.getElementById('full-body-overlay').style.display = 'block';
						// if no Note On event already exists, create one and enter dragging state immediately
						if (initialVelocity < 0) {			// i.e. no Note On event exists
							initialVelocity = getInputVelocity();
							window.dragState = 'on';
							setNoteOnEvent(stepIndex, instrumentIndex, noteNumber, getInputVelocity());
						// else enter pre-drag state. If still in this state when the mouse button is released, the Note On event will be deleted.
						} else {
							window.dragState = 'pre';
						}
						// set the handler for mousemove events across the whole window (as may drag beyond the grid table cell)
						window.onmousemove = function(mouseMoveEvent) {
							window.dragState = 'on';
							var newVelocity = initialVelocity - mouseMoveEvent.clientY + initialY;
							setNoteOnVelocity(stepIndex, instrumentIndex, noteNumber, newVelocity);
						};

						// set the handler for mouseup events across the document body (as may drag beyond the grid table cell)
						window.onmouseup = function(mouseUpEvent) {
							if (mouseUpEvent.button == 0) {
								// if still in pre-drag state, delete the note. 
								if (window.dragState == 'pre') {
									unsetNoteOnEvent(stepIndex, instrumentIndex, noteNumber);
								}
								// exit dragging state
								window.dragState = 'off';
								// unset mousemove and mouseup handlers.
								window.onmousemove = null;
								window.onmouseup = null;
								document.getElementById('full-body-overlay').style.display = 'none';

							}
						}
					}
				}

				gridBodyNoteRow.appendChild(gridBodyNoteStep);
			});
			gridBody.insertBefore(gridBodyNoteRow, gridBody.firstChild);
		});
	});

	// insert the grid into the document
	document.getElementById('grid_container').appendChild(gridTable);
}

// NOTE ON EVENT FUNCTIONS

function getInputVelocity() {
	return document.getElementById('inputVelocity').value;
}

// requires input value of between 0 and 127 inclusive.
function convertVelocityToBackgroundColor(x) {
	x++;
	var blue = 196-x;
	var red = 2*x;
	var output = '#' + (red*65536 + blue).toString(16);
	return output;
}

// adds a Note On event to a given step's actionList
function setNoteOnEvent(stepNumber, instrumentIndex, noteNumber, velocity) {
	var action = new Object();
	action.type = 'noteOn';
	action.instrumentIndex = instrumentIndex;
	action.noteNumber = noteNumber;
	action.value = clipInt0to127(velocity);			// Safety step in case input validation is somehow missed.
	step[stepNumber].actionList.push(action);
	// update sequencer grid to reflect the change
	document.getElementById(constructGridId(stepNumber, instrumentIndex, noteNumber)).style.backgroundColor = convertVelocityToBackgroundColor(action.value);
}

// looks for an given Note On event in a given step's action list and removes it if present.
// returns true if Note On event is found and removed, otherwise false.
function unsetNoteOnEvent(stepNumber, instrumentIndex, noteNumber) {
	var searchResult = findNoteOnEvent(stepNumber, instrumentIndex, noteNumber);
	if (searchResult >= 0) {
		// remove the action found by the search
		step[stepNumber].actionList.splice(searchResult, 1);
		// update sequencer grid to reflect the change
		document.getElementById(constructGridId(stepNumber, instrumentIndex, noteNumber)).style.backgroundColor = '';
		return true;
	} else {
		return false;
	}
}

// toggles a given noteOnEvent on and off
function toggleNoteOnEvent(stepNumber, instrumentIndex, noteNumber, velocity) {
	if (!unsetNoteOnEvent(stepNumber, instrumentIndex, noteNumber)) {
		setNoteOnEvent(stepNumber, instrumentIndex, noteNumber, velocity);
	}
}

// looks for a given Note On event and returns its index in the step's action list if found, -1 if not
function findNoteOnEvent(stepNumber, instrumentIndex, noteNumber) {
	// search for the Note On event
	var searchAction = new Object();
	searchAction.type = 'noteOn';
	searchAction.instrumentIndex = instrumentIndex;
	searchAction.noteNumber = noteNumber;
	var searchResult = -1;
	step[stepNumber].actionList.some(function(action, actionIndex) {
		if (action.type == searchAction.type && action.instrumentIndex == searchAction.instrumentIndex && action.noteNumber == searchAction.noteNumber) {
			searchResult = actionIndex;
		}
	});
	return searchResult;
}

// looks for a given Note On event and returns its velocity if found, -1 if not
function getNoteOnVelocity(stepNumber, instrumentIndex, noteNumber) {
	var searchResult = findNoteOnEvent(stepNumber, instrumentIndex, noteNumber);
	if (searchResult >= 0) {
		return step[stepNumber].actionList[searchResult].value;
	} else {
		return -1;
	}
}

// looks for a given Note On event and sets its velocity.
// Returns true if succesful, false if not (i.e. Note On event does not exist).
function setNoteOnVelocity(stepNumber, instrumentIndex, noteNumber, velocity) {
	// restrict velocity to valid range
	velocity = clipInt0to127(velocity);				// Safety step in case input validation is somehow missed.
	var searchResult = findNoteOnEvent(stepNumber, instrumentIndex, noteNumber);
	if (searchResult >= 0) {
		step[stepNumber].actionList[searchResult].value = velocity;
		document.getElementById(constructGridId(stepNumber, instrumentIndex, noteNumber)).style.backgroundColor = convertVelocityToBackgroundColor(velocity);
		return true;
	} else {
		return false;
	}
}
