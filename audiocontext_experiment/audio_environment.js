// GLOBALS
const SAMPLERATE = 44100;
const MAX_MASTER_VOLUME = 100;
const DEFAULT_MASTER_VOLUME = 2;
const MASTER_VOLUME_CHANGE_TIME = 0.1;	// how long should it take master volume to track its control?

function setUpAudioContext() {
	// create an audio context for the window
	var AudioContext = window.AudioContext || window.webkitAudioContext; 	// cross-browser constructor function
	var audioCtx = new AudioContext({			// create a new AudioContext object
		latencyHint: 'interactive',
		sampleRate: SAMPLERATE
	});

	// set up Master Volume
	audioCtx.masterVolumeNode = audioCtx.createGain();
	audioCtx.masterVolumeNode.gain.setValueAtTime(DEFAULT_MASTER_VOLUME/MAX_MASTER_VOLUME, audioCtx.currentTime);
	audioCtx.masterVolumeNode.connect(audioCtx.destination);

	return audioCtx;
}

function getAudioInputStream() {
	navigator.mediaDevices.getUserMedia({ audio: true, video: false })
	.then(function(audioInputStream) {
		// create a new audio stream source node connected to the input
		return audioCtx.createMediaStreamSource(audioInputStream);
	})
	// deal with refusal or exception
	.catch(function(exception) {
		console.log('navigator.mediaDevices.getUserMedia() failed');
	});	
}

function onMasterVolumeChange() {
	var inputElement = document.getElementById('masterVolume');
	var oldValue = masterVolumeNode.gain;
	var newValue = inputElement.value;
	// validate input and change as appropriate
	if(!Number.isNaN(newValue) && newValue >= 0 && newValue <= MAX_MASTER_VOLUME) {
		masterVolumeNode.gain.setTargetAtTime(newValue/MAX_MASTER_VOLUME, audioCtx.currentTime, MASTER_VOLUME_CHANGE_TIME);
	} else {
		inputElement.value = oldValue * MAX_MASTER_VOLUME;
	}
}

function listAudioTracks() {
	// list the available audio tracks
	var audioTrackListBody = document.querySelector('#audioTrackList>tbody');
	audioInputStream.getTracks().forEach(function(track) {
		// create a new row for the table
		var newRow = document.createElement('tr');
		// add a new cell containing the track's ID
		var newCell1 = document.createElement('td');
		newCell1.textContent = track.id;
		newRow.appendChild(newCell1);
		// add a new cell containing the tracks's Kind
		var newCell2 = document.createElement('td');
		newCell2.textContent = track.kind;
		newRow.appendChild(newCell2);
		// add a new cell containing the track's Label
		var newCell3 = document.createElement('td');
		newCell3.textContent = track.label;
		newRow.appendChild(newCell3);
		// add a new cell containing the track's Ready State
		var newCell4 = document.createElement('td');
		newCell4.textContent = track.readyState;
		newRow.appendChild(newCell4);
		// add a new cell containing the track's Enabled value
		var newCell5 = document.createElement('td');
		newCell5.textContent = track.enabled;
		newRow.appendChild(newCell5);
		// write the new row to the table
		audioTrackListBody.appendChild(newRow);
	})
}
