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

// set up the audio context in global scope
var audioCtx = new AudioContext({			// create a new AudioContext object
	latencyHint: 'interactive',
	sampleRate: SAMPLERATE
});

// get audio input stream
// window.audioInputStream = getAudioInputStream();

// TODO replace the bit below with instrument & synth voice objects

// set key event listeners for using computer keyboard as music keyboard/control surface
document.onkeydown = function(event) {
	// console.log(event.code);		// Useful for finding key codes
	// Check for a Note On keydown
	var noteNumber = keyCodeToMidiNoteNoteNumber[event.code];
	if (noteNumber && !event.repeat) {
		noteNumber += baseOctave * PITCH_DIVISIONS_PER_OCTAVE;
		window.keyboardTarget.noteOn(noteNumber);		
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
		window.keyboardTarget.noteOff(noteNumber);
	}
}

// when document body has loaded
function onLoad() {
	isPageLoaded = true;
	writeLog('onLoad called');
	getAudioInputStream();

	// set up master volume
	audioCtx.createMasterVolume();
	var masterVolumeInputElement = document.getElementById('masterVolume');
	masterVolumeInputElement.value = DEFAULT_MASTER_VOLUME;
	masterVolumeInputElement.onchange = function() {
		var oldValue = audioCtx.masterVolume.value;
		var newValue = this.value;
		// validate input and change as appropriate
		if(!Number.isNaN(newValue) && newValue >= 0 && newValue <= MAX_MASTER_VOLUME) {
			this.masterVolume.setValueAtTime(newValue/MAX_MASTER_VOLUME, audioCtx.currentTime);
		} else {
			this.value = oldValue * MAX_MASTER_VOLUME;
		}
	}

	// set up a synth voice
	var testSynthVoice = new ClassicSynthVoice(5);
	testSynthVoice.connect(audioCtx.masterVolumeNode);
	window.keyboardTarget = testSynthVoice;

}
