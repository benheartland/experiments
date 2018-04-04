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

var audioCtx = setUpAudioContext();

// TODO replace the bit below with instrument & synth voice objects

// set up oscillator mixer
var oscillatorMergerNode = audioCtx.createChannelMerger(OSCILLATOR_COUNT);
oscillatorMergerNode.connect(audioCtx.masterVolumeNode);

// set up oscillators
var oscillator = new Array(OSCILLATOR_COUNT);
for (var i = 0; i < OSCILLATOR_COUNT; i++) {
	oscillator[i] = audioCtx.createOscillator();
	oscillator[i].type = 'sine';
	var f = midiNoteNumberToFrequency(i + 57);
	oscillator[i].frequency.setValueAtTime(f, audioCtx.currentTime);
	writeLog(i + ' : ' + f);
	// connect to both channels of the mixer
	oscillator[i].connect(oscillatorMergerNode, 0, 0);
	oscillator[i].connect(oscillatorMergerNode, 0, 1);
};

function onLoad() {
	isPageLoaded = true;
	writeLog('onLoad called');
	// set master volume
	document.getElementById('masterVolume').value = DEFAULT_MASTER_VOLUME;


	// play some stuff
	var loadTime = audioCtx.currentTime;
	writeLog('loadTime = ' + loadTime);
	for (var i = 0; i < OSCILLATOR_COUNT ; i++) {
		var startTime = loadTime + beatDuration * i;
		var stopTime = loadTime + beatDuration * (i + 1);
		oscillator[i].start(startTime);
		oscillator[i].stop(stopTime);
	}
}
