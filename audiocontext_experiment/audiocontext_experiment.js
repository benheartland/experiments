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

var testSynthVoice = new classicSynthVoice(5);
testSynthVoice.connect(audioCtx.masterVolumeNode);
var keyboardTarget = testSynthVoice;

//var monoSynth = new classicSynthVoice(3, 'triangle');
//monoSynth.voiceGainNode.connect(audioCtx.masterVolumeNode);

document.onkeydown = function(event) {
	// console.log(event.code);		// Useful for finding key codes
	// Check for a Note On keydown
	var noteNumber = keyCodeToMidiNoteNoteNumber[event.code];
	if (noteNumber && !event.repeat) {
		noteNumber += baseOctave * PITCH_DIVISIONS_PER_OCTAVE;
		keyboardTarget.noteOn(noteNumber);		
	} else {
		switch (event.code) {
			case 'NumpadAdd':
			// increase master volume
			document.getElementById('masterVolume').value++;
			onMasterVolumeChange();
			break;
			case 'NumpadSubtract':
			// decrease master volume
			document.getElementById('masterVolume').value--;
			onMasterVolumeChange();
			break;
		}
	}
}

document.onkeyup = function(event) {
	// Check for a Note Off keyup
	var noteNumber = keyCodeToMidiNoteNoteNumber[event.code];
	if (noteNumber) {
		noteNumber += baseOctave * PITCH_DIVISIONS_PER_OCTAVE;
		keyboardTarget.noteOff(noteNumber);
	}
}

// when document body has loaded
function onLoad() {
	isPageLoaded = true;
	writeLog('onLoad called');
	// set master volume
	document.getElementById('masterVolume').value = DEFAULT_MASTER_VOLUME;
}
