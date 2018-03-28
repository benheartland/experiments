// constants
var pitchClass = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// user variables (pseudo-constant)
var barsPerCycle = 4;
var beatsPerBar = 4;
var ticksPerBeat = 4;
var bpm = 180;

// variables derived from pseudo-constants
var tickDuration = Math.round(60000/bpm/ticksPerBeat);	// duration of a single tick in milliseconds
var stepCount = ticksPerBeat*beatsPerBar*barsPerCycle;
var stepDisplayWidth = (100/stepCount) + "%";

// state variables
var running = false;
var cycle, bar, beat, tick, previousStep;
var currentStep = stepCount;	// on loading, pretend that a cycle has just completed
var interval;					// timer interval needs to be available in global scope
var ensemble = new Array();		// global array to hold all instruments
var step = new Array();			// global array to hold all step instuctions & info
for (i=1; i<= stepCount; i++) {
	// create the step object for each step
	step[i] = new Object();
	// create the actionList array for each step
	step[i].actionList = new Array();
}

function noteNumberToNoteName(noteNumber) {
	var octaveNumber = Math.floor(noteNumber / 12);
	var noteName = pitchClass[noteNumber % 12];
	return noteName + octaveNumber.toString();
}

function init() {
	// initialise drum kit
	ensemble[0] = new instrument('Drums')
	ensemble[0].addNote(51,'instruments/drumkit/ride1.wav', 'Ride');
	ensemble[0].addNote(38,'instruments/drumkit/snare01.wav', 'Snare');
	ensemble[0].addNote(36,'instruments/drumkit/kick.wav', 'Kick');
	// draw the UI
	drawGrid();
	resetClock();
	// set input validation for inputVelocity
	document.getElementById('inputVelocity').previousValue = document.getElementById('inputVelocity').value;
	document.getElementById('inputVelocity').onchange = function() {
		var parsedInt = Number.parseInt(this.value);
		if (Number.isInteger(parsedInt)) {
			this.value = Math.min(Math.max(parsedInt, 0), 127);
			this.previousValue = this.value;
		} else {
			this.value = this.previousValue;
		}
	}
}

function startClock() {
	if (!running) {
		interval = window.setInterval(playStep,tickDuration);
		running = true;
		document.getElementById('stopButton').value = "Stop";
		document.getElementById('stopButton').onclick = stopClock;
	}
}

function stopClock() {
	if(running) {
		clearInterval(interval);
		document.getElementById('stopButton').value = "Reset";
		document.getElementById('stopButton').onclick = resetClock;
		running = false;
	}
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

function playNote(instrumentInstance, noteNumber, velocity) {
	// set the volume using a simple linear velocity curve.
	instrumentInstance.note[noteNumber].volume = velocity/127;
	// if the sample is not playing, start it...
	if (instrumentInstance.note[noteNumber].ended || instrumentInstance.note[noteNumber].paused) {
		instrumentInstance.note[noteNumber].play();
	// ...otherwise return it to it's start position.
	} else {
		instrumentInstance.note[noteNumber].currentTime = 0;
	}
}

function stopNote(instrumentInstance, noteNumber) {
		if (!instrumentInstance.note[noteNumber].paused) {
			instrumentInstance.note[noteNumber].pause();
			instrumentInstance.note[noteNumber].currentTime = 0;
		}
}

function playStep() {
	step[currentStep].actionList.forEach(function(action) {
		switch (action.type) {
			case 'noteOn':
				playNote(ensemble[action.instrumentIndex], action.noteNumber, action.value);
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

function updateClock() {
	// update the clock display
	document.getElementById('clock_cycle').textContent = cycle;
	document.getElementById('clock_bar').textContent = bar;
	document.getElementById('clock_beat').textContent = beat;
	document.getElementById('clock_tick').textContent = tick;
	// move the current step indicator in the time ruler (by setting background color)
	if (document.body.classList) {			// most browsers
		document.getElementById('step_' + currentStep).classList.add('currentStep');
		document.getElementById('step_' + previousStep).classList.remove('currentStep');
	} else if (document.body.className) {	// IE<=9 
		document.getElementById('step_' + currentStep).className += ' currentStep';
		document.getElementById('step_' + previousStep).className.replace(' currentStep', '');
	}
}

// use this to construct the ids for each body table cell in the sequencer grid
function constructGridId(stepNumber, instrumentIndex, noteNumber) {
	return 'step_' + stepNumber + '_instrument_' + instrumentIndex + '_note_' + noteNumber;
}

function getInputVelocity() {
	return document.getElementById('inputVelocity').value;
}

// Build the sequencer grid
function drawGrid() {
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
				gridBodyNoteStep.onclick = function() {
					toggleNoteOnEvent(stepIndex, instrumentIndex, noteNumber, getInputVelocity());
				}
				gridBodyNoteRow.appendChild(gridBodyNoteStep);
			});
			gridBody.appendChild(gridBodyNoteRow);
		});
	});

	// insert the grid into the document
	document.getElementById('grid_container').appendChild(gridTable);
}

// Instrument prototype
function instrument(name) {
	this.name = name;
	this.note = new Array();
	this.addNote = function(noteNumber, path, noteDisplayName) {
		this.note[noteNumber] = new Audio(path);
		if (typeof noteDisplayName === 'undefined') {			// noteDisplayName is optional; defaults to C5 for middle C etc.
			noteDisplayName = noteNumberToNoteName(noteNumber);
		}
		this.note[noteNumber].noteDisplayName = noteDisplayName;
		this.note[noteNumber].preload = true;
		this.note[noteNumber].autoplay = false;
		this.note[noteNumber].controls = false;
	}
}

// toggles a given noteOnEvent on and off
function toggleNoteOnEvent(stepNumber, instrumentIndex, noteNumber, velocity) {
	if (!unsetNoteOnEvent(stepNumber, instrumentIndex, noteNumber)) {
		setNoteOnEvent(stepNumber, instrumentIndex, noteNumber, velocity);
	}
}

// requires input value of between 0 and 127 inclusive.
function getBackgroundColor(value) {
	value++;
	value *= 2;
	return 'rgb(' + value + ',' + (256 - value) + ', 0)';
//	return 2*value + 512*(128-value);		// scales from green to red
}

// adds a Note On event to a given step's actionList
function setNoteOnEvent(stepNumber, instrumentIndex, noteNumber, velocity) {
	var action = new Object();
	action.type = 'noteOn';
	action.instrumentIndex = instrumentIndex;
	action.noteNumber = noteNumber;
//	action.value = velocity;
	action.value = Math.min(Math.max(Math.round(velocity), 0),127);	// forces to integer between 0 and 127 inclusive, in line with MIDI standard. Safety step in case input validation is missed somehow.
	step[stepNumber].actionList.push(action);
	// update sequencer grid to reflect the change
	document.getElementById(constructGridId(stepNumber, instrumentIndex, noteNumber)).style.backgroundColor = getBackgroundColor(action.value);
}

// looks for an given Note On event in a given step's action list and removes it if present.
// returns true if Note On event is found and removed, otherwise false.
function unsetNoteOnEvent(stepNumber, instrumentIndex, noteNumber) {
	// search for the Note On event
	var searchAction = new Object();
	searchAction.type = 'noteOn';
	searchAction.instrumentIndex = instrumentIndex;
	searchAction.noteNumber = noteNumber;
	var searchResult = -1;
	step[stepNumber].actionList.some(function(action, actionIndex) {
		if (action.type == searchAction.type && action.instrumentIndex == searchAction.instrumentIndex && action.noteNumber == searchAction.noteNumber) {
			searchResult = actionIndex;
			return true;
		}
	});
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