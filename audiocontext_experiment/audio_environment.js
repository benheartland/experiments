// GLOBALS
const SAMPLERATE = 44100;
const MAX_MASTER_VOLUME = 100;
const DEFAULT_MASTER_VOLUME = 5;
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

// get audio input stream
var audioInput;				// TODO - tidy this up 
function askForAudioAccess() {
	navigator.mediaDevices.getUserMedia({ audio: true, video: false })
	.then(function(audioInputStream) {
		// create a new audio stream source node connected to the input
		audioInput = audioCtx.createMediaStreamSource(audioInputStream);
		// list media devices
		var deviceListBody = document.querySelector('#deviceList>tbody');
		navigator.mediaDevices.enumerateDevices()
		.then(function(mediaDeviceList) {
			// how many devices?
			console.log(mediaDeviceList.length + ' media devices detected');
			// sort devices
			
			mediaDeviceList.sort(function(deviceA,deviceB) {
				if (deviceA.groupId < deviceB.groupId) {
					return -1;
				} else if (deviceA.groupId > deviceB.groupId) {
					return 1;
				} else {
					return 0;
				}
			});
			
			// list media devices
			mediaDeviceList.forEach(function(mediaDevice) {
				// create a new row for the table
				var newRow = document.createElement('tr');
				// add a new cell containing the device's Group ID
				var newCell1 = document.createElement('td');
				newCell1.textContent = mediaDevice.groupId;
				newRow.appendChild(newCell1);
				// add a new cell containing the device's Kind
				var newCell2 = document.createElement('td');
				newCell2.textContent = mediaDevice.kind;
				newRow.appendChild(newCell2);
				// add a new cell containing the device's Label
				var newCell3 = document.createElement('td');
				newCell3.textContent = mediaDevice.label;
				newRow.appendChild(newCell3);
				// add a new cell containing the device's Device ID
				var newCell4 = document.createElement('td');
				newCell4.textContent = mediaDevice.deviceId;
				newRow.appendChild(newCell4);
				// write the new row to the table
				deviceListBody.appendChild(newRow);
			});
	
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
			});
		})
		.catch(function(exception) {
			console.log('navigator.mediaDevices.enumerateDevices() failed');
		});
	})
	// deal with refusal or exception
	.catch(function(exception) {
		console.log('navigator.mediaDevices.getUserMedia() failed');
	});	
}

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