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
// output gain for oscillator
testOsc.gainNode = audioCtx.createGain();
testOsc.gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
testOsc.gainNode.envelope = new envelopeADSR(testOsc.gainNode.gain);
testOsc.gainNode.connect(audioCtx.masterVolumeNode);
// output filter for oscillator
testOsc.filterNode = audioCtx.createBiquadFilter();
testOsc.filterNode.type = DEFAULT_FILTER_TYPE;
testOsc.filterNode.frequency.setValueAtTime(DEFAULT_FILTER_FREQUENCY, audioCtx.currentTime);
testOsc.filterNode.Q.setValueAtTime(DEFAULT_FILTER_Q, audioCtx.currentTime);
testOsc.filterNode.envelope = new envelopeADSR(testOsc.filterNode.detune, 4800);
testOsc.filterNode.envelope.sustain = 0.8;
testOsc.filterNode.connect(testOsc.gainNode);
// audio source for oscillator
testOsc.sourceNode = audioCtx.createOscillator();
testOsc.sourceNode.type = DEFAULT_OSCILLATOR_WAVEFORM;
testOsc.sourceNode.frequency.setValueAtTime(REFERENCE_FREQUENCY, audioCtx.currentTime);
testOsc.sourceNode.connect(testOsc.filterNode);
testOsc.sourceNode.start(audioCtx.currentTime);


testOsc.playNote = function(noteNumber, startTime = audioCtx.currentTime) {
	this.sourceNode.frequency.setValueAtTime(midiNoteNumberToFrequency(noteNumber), startTime);  // TODO add fine tuning
	this.gainNode.envelope.triggerAttack();
	this.filterNode.envelope.triggerAttack();
}

// stop playing
testOsc.stopNote = function(noteOffTime = audioCtx.currentTime) {
	console.log(testOsc.filterNode.frequency.value);
	this.gainNode.envelope.triggerRelease();
	this.filterNode.envelope.triggerRelease();
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
