const NOTE_COUNT = PITCH_DIVISIONS_PER_OCTAVE * 2 + 1;	// development only

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

// set up audio context
window.audioCtx = setUpAudioContext();
// get audio input stream
// window.audioInput = getAudioInputStream();

// TODO replace the bit below with instrument & synth voice objects

// set up oscillator
var monoSynth = new classicSynthVoice(3, 'triangle');
monoSynth.voiceGainNode.connect(window.audioCtx.masterVolumeNode);

document.onkeydown = function(event) {
	console.log(keyCodeToMidiNoteNoteNumber[event.code]);
	monoSynth.play(keyCodeToMidiNoteNoteNumber[event.code]);
}

document.onkeyup = function(event) {
//	monoSynth.stop();
}


// when document body has loaded
function onLoad() {
	isPageLoaded = true;
	writeLog('onLoad called');
	// set master volume
	document.getElementById('masterVolume').value = DEFAULT_MASTER_VOLUME;
}
