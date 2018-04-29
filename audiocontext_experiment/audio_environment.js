// GLOBALS
const SAMPLERATE = 44100;
const MAX_MASTER_VOLUME = 100;
const DEFAULT_MASTER_VOLUME = 10;

// add createMasterVolume method to the AudioContext prototype
AudioContext.prototype.createMasterVolume = function() {
	this.masterVolumeNode = audioCtx.createGain();
	this.masterVolume = this.masterVolumeNode.gain;
	this.masterVolume.setValueAtTime(DEFAULT_MASTER_VOLUME/MAX_MASTER_VOLUME, this.currentTime);
	this.masterVolumeNode.connect(this.destination);
}

// asks the user for permission to access audio inputs
// input: none
// returns: a MediaStream object
function getAudioInputStream() {
	navigator.mediaDevices.getUserMedia({ audio: true, video: false })
	.then(function(audioInputStream) {
		// list the available audio tracks in a table
		listAudioInputTracks(audioInputStream);
		// create a new audio stream source node connected to the input
		return audioCtx.createMediaStreamSource(audioInputStream);
	})
	// deal with refusal or exception
	.catch(function(exception) {
		console.log('navigator.mediaDevices.getUserMedia() failed');
	});
}

// list the available audio tracks
// input: a MediaStream object
// output: creates a new table in the document body listing the audio tracks
function listAudioInputTracks(audioInputStream) {
	var audioTrackListTable = document.createElement('table');
	// create table header
	var audioTrackListHeader = audioTrackListTable.createTHead();
	var audioTrackListHeaderRow = audioTrackListHeader.insertRow();
	audioTrackListHeaderRow.insertCell().innerText = 'Track ID';
	audioTrackListHeaderRow.insertCell().innerText = 'Kind';
	audioTrackListHeaderRow.insertCell().innerText = 'Label';
	audioTrackListHeaderRow.insertCell().innerText = 'Ready State';
	audioTrackListHeaderRow.insertCell().innerText = 'Enabled?';
	// create table body
	var audioTrackListBody = audioTrackListTable.createTBody();
	audioInputStream.getAudioTracks().forEach(function(track) {
		// create a new row for the table
		var newRow = audioTrackListBody.insertRow();
		// add a new cell containing the track's ID
		newRow.insertCell().innerText = track.id;
		// add a new cell containing the tracks's Kind
		newRow.insertCell().innerText = track.kind;
		// add a new cell containing the track's Label
		newRow.insertCell().innerText = track.label;
		// add a new cell containing the track's Ready State
		newRow.insertCell().innerText = track.readyState;
		// add a new cell containing the track's Enabled value
		newRow.insertCell().innerText = track.enabled;
		// write the new row to the table
	})
	document.body.appendChild(audioTrackListTable);
}
