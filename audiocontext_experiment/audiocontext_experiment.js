// global variables for on-page logging
var isPageLoaded = false;
var preLoadLog = '';

// function to log into page rather than console
function writeLog(str) {
	var logBox = document.getElementById('logBox');
	if (isPageLoaded) {
		if (preLoadLog != '') {
			logBox.innerText += preLoadLog;
			preLoadLog = '';
		}
		logBox.innerText += str + '\r\n';
	} else {
		preLoadLog += str + '\r\n';
	}
}

// get audio input stream
// window.audioInputStream = getAudioInputStream();

// TODO replace the bit below with instrument & synth voice objects

// set up oscillator
var testOsc = new Object();
testOsc.gainNode = audioCtx.createGain();
testOsc.gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
testOsc.gainNode.connect(audioCtx.masterVolumeNode);
testOsc.sourceNode = audioCtx.createOscillator();
testOsc.sourceNode.frequency.setValueAtTime(REFERENCE_FREQUENCY, audioCtx.currentTime);
testOsc.sourceNode.connect(testOsc.gainNode);
testOsc.sourceNode.start(audioCtx.currentTime);
testOsc.envelope = new envelopeADSR();

testOsc.playNote = function(noteNumber, startTime = audioCtx.currentTime) {
	this.sourceNode.frequency.setValueAtTime(midiNoteNumberToFrequency(noteNumber), startTime);  // TODO add fine tuning
	var peakTime = startTime + this.envelope.attack;
	var settleTime = peakTime + this.envelope.delay;
	this.gainNode.gain.exponentialRampToValueAtTime(1, peakTime);
	this.gainNode.gain.exponentialRampToValueAtTime(this.envelope.sustain, settleTime);
}

// stop playing
testOsc.stopNote = function(noteOffTime = audioCtx.currentTime) {
	var stopTime = noteOffTime + this.envelope.release;
	this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, noteOffTime);
	this.gainNode.gain.exponentialRampToValueAtTime(this.gainNode.gain.minValue, stopTime);
	this.gainNode.gain.setValueAtTime(0, stopTime);
}

//var monoSynth = new classicSynthVoice(3, 'triangle');
//monoSynth.voiceGainNode.connect(audioCtx.masterVolumeNode);

// is a note currently playing i.e. is the voice gain greater than zero?
testOsc.isPlaying = function() {
	return (this.gainNode.gain.value > 0);
}

document.onkeydown = function(event) {
	if(!event.repeat) {
		var noteNumber = keyCodeToMidiNoteNoteNumber[event.code];
		if (noteNumber) {
			noteNumber += baseOctave * PITCH_DIVISIONS_PER_OCTAVE;
			console.log('note on : ' + noteNumber);
			testOsc.playNote(noteNumber);		
		}
	}
}

document.onkeyup = function(event) {
	var noteNumber = keyCodeToMidiNoteNoteNumber[event.code];
	if (noteNumber) {
		noteNumber += baseOctave * PITCH_DIVISIONS_PER_OCTAVE;
		console.log('note off: ' + noteNumber)
		testOsc.stopNote();
	}
}

// when document body has loaded
function onLoad() {
	isPageLoaded = true;
	writeLog('onLoad called');
	// set master volume
	document.getElementById('masterVolume').value = DEFAULT_MASTER_VOLUME;
}
