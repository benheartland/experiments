var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext({
  latencyHint: 'interactive',
  sampleRate: 48000,
});

function onLoad() {
//	check for property/method existence
//	console.log(navigator.mediaDevices.enumerateDevices ? 'exists' : 'does not exist');

	var mediaDeviceList = navigator.mediaDevices.enumerateDevices();
	console.log(mediaDeviceList.length + 'media devices detected');

	for(var i = 0; i < mediaDeviceList.length; i++) {
		var device = mediaDeviceList[i];
		console.log(device.kind + ": " + device.groupId + ' ' + device.label + " id: " + device.deviceId);
		};
	// ask for audio input access
	var constraints = {audio:true, video: false};
	
	console.log('loaded');
}