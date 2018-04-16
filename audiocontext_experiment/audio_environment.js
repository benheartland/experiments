// GLOBALS
const SAMPLERATE = 44100;
const MAX_MASTER_VOLUME = 100;
const DEFAULT_MASTER_VOLUME = 10;
const MASTER_VOLUME_CHANGE_TIME = 0.1;	// how long should it take master volume to track its control?

// set up the audio context in global scope
var AudioContext = window.AudioContext || window.webkitAudioContext; 	// cross-browser constructor function
var audioCtx = new AudioContext({			// create a new AudioContext object
	latencyHint: 'interactive',
	sampleRate: SAMPLERATE
});
// set up Master Volume node
audioCtx.masterVolumeNode = audioCtx.createGain();
audioCtx.masterVolumeNode.gain.setValueAtTime(DEFAULT_MASTER_VOLUME/MAX_MASTER_VOLUME, audioCtx.currentTime);
audioCtx.masterVolumeNode.connect(audioCtx.destination);

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
	var oldValue = audioCtx.masterVolumeNode.gain.value;
	var newValue = inputElement.value;
	// validate input and change as appropriate
	if(!Number.isNaN(newValue) && newValue >= 0 && newValue <= MAX_MASTER_VOLUME) {
		audioCtx.masterVolumeNode.gain.setTargetAtTime(newValue/MAX_MASTER_VOLUME, audioCtx.currentTime, MASTER_VOLUME_CHANGE_TIME);
	} else {
		inputElement.value = oldValue * MAX_MASTER_VOLUME;
	}
}

function appendTableCell(tableRowElement, cellTextContent, headerCell = false) {
	var tagName = headerCell ? 'th' : 'td';
	var newCell = document.createElement('tagName');
	newCell.textContent = cellTextContent;
	tableRowElement.appendChild(newCell);
}

function listAudioInputTracks(audioInputStream) {
	// list the available audio tracks
	var audioTrackListTable = document.createElement('table');
	var audioTrackListHeader = document.createElement('thead');
	audioTrackListTable.appendChild(audioTrackListHeader);
	var audioTrackListHeaderRow = document.createElement('tr');
	audioTrackListHeader.appendChild(audioTrackListHeaderRow);
	appendTableCell(audioTrackListHeaderRow, 'Track ID', true);
	appendTableCell(audioTrackListHeaderRow, 'Kind', true);
	appendTableCell(audioTrackListHeaderRow, 'Label', true);
	appendTableCell(audioTrackListHeaderRow, 'Ready State', true);
	appendTableCell(audioTrackListHeaderRow, 'Enabled?', true);
	var audioTrackListBody = document.createElement('tbody');
	audioTrackListTable.appendChild(audioTrackListBody);
	audioInputStream.getTracks().forEach(function(track) {
		// create a new row for the table
		var newRow = document.createElement('tr');
		audioTrackListBody.appendChild(newRow);
		// add a new cell containing the track's ID
		appendTableCell(newRow, track.id);
		// add a new cell containing the tracks's Kind
		appendTableCell(newRow, track.kind);
		// add a new cell containing the track's Label
		appendTableCell(newRow, track.label);
		// add a new cell containing the track's Ready State
		appendTableCell(newRow, track.readyState);
		// add a new cell containing the track's Enabled value
		appendTableCell(newRow, track.enabled);
		// write the new row to the table
	})
	document.body.appendChild(audioTrackListTable);
}
