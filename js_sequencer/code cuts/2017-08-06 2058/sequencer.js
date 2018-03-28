// constants
var pitchClass = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// basic variables (pseudo-constant)
var barsPerCycle = 4;
var beatsPerBar = 4;
var ticksPerBeat = 2;
var bpm = 180;
// derived variables
var tickDuration = Math.round(60000/bpm/ticksPerBeat);	// duration of a single tick in milliseconds
var stepCount = ticksPerBeat*beatsPerBar*barsPerCycle
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
	return noteName + octaveNumber;
}

function init() {
	// initialise drum kit
	ensemble[0] = new instrument('Drums')
	ensemble[0].addNote(51,'instruments/drumkit/ride1.wav', 'Ride');
	ensemble[0].addNote(38,'instruments/drumkit/snare01.wav', 'Snare');
	ensemble[0].addNote(36,'instruments/drumkit/kick.wav', 'Kick');
	drawGrid();
	resetClock();
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

function playNote(instrumentInstance, noteNumber) {
		if (instrumentInstance.note[noteNumber].ended || instrumentInstance.note[noteNumber].paused) {
			instrumentInstance.note[noteNumber].play();
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
		playNote(ensemble[action.instrumentIndex], action.noteNumber);
	});

/* simple hard-coded beat for testing
	if (tick == 1) {
		if (beat == 1 || beat == 3) {
			playNote(ensemble[0], 36);
		}
		if (beat == 2 || beat == 4) {
			playNote(ensemble[0], 38);
		}
	}
	playNote(ensemble[0], 51);
*/

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
	document.getElementById('clock_cycle').textContent = cycle;
	document.getElementById('clock_bar').textContent = bar;
	document.getElementById('clock_beat').textContent = beat;
	document.getElementById('clock_tick').textContent = tick;
	if (document.body.classList) {	// most browsers
		document.getElementById('step_' + currentStep).classList.add('currentStep');
		document.getElementById('step_' + previousStep).classList.remove('currentStep');
	} else if (document.body.className) {	// IE<=9 
		document.getElementById('step_' + currentStep).className = 'step currentStep';
		document.getElementById('step_' + previousStep).className = 'currentStep';
	}
}

// use this to construct the ids for each body table cell in the sequencer grid
function constructGridId(stepNumber, instrumentIndex, noteNumber) {
	return 'step_' + stepNumber + '_instrument_' + instrumentIndex + '_note_' + noteNumber;
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

	// build one row for each note of each instrument
	ensemble.forEach(function(instrumentInstance, instrumentIndex) {
		instrumentInstance.note.forEach(function(noteInstance, noteNumber) {
			var gridBodyNoteRow = document.createElement('tr');
			step.forEach(function(stepInstance,stepIndex) {
				var gridBodyNoteStep = document.createElement('td');
				gridBodyNoteStep.id = constructGridId(stepIndex, instrumentIndex, noteNumber);
				gridBodyNoteStep.className = 'step';
				gridBodyNoteStep.style.width = stepDisplayWidth;
				gridBodyNoteStep.onclick = function() {
					setNoteOn(stepIndex, instrumentIndex, noteNumber);
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

// adds a Note On event to a given step's actionList
function setNoteOn(stepNumber, instrumentIndex, noteNumber) {
	var action = new Object();
	action.type = 'noteOn';
	action.instrumentIndex = instrumentIndex;
	action.noteNumber = noteNumber;
	step[stepNumber].actionList.push(action);
	// update sequencer grid to reflect the change
	document.getElementById(constructGridId(stepNumber, instrumentIndex, noteNumber)).style.backgroundColor = '#FF0000';
}

