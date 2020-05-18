// Outputs a number followed by the appropriate singular/plural noun.
// n: the number
// singular: the singular form of the noun
// plural (optional): the plural form of the noun. If not supplied, defaults to singular + 's'
function plural(n, singular, plural = singular + 's') {
  return n == 1 ? n + ' ' + singular : n + ' ' + plural;
}

navigator.mediaDevices.addEventListener('devicechange', function() {console.log('** Media devices changed ***');})

window.onload = function() {

  // create an audio context
  window.audioCtx = new window.AudioContext();

  // Create an audio input device list object (not yet populated)
  window.audioInputMediaDeviceList = new MediaDeviceList('audioinput');
  // Update the audio input device list
  window.audioInputMediaDeviceList.update();

  // resume the audio context if it is suspended, e.g. because of a no-autoplay client policy.
//  window.audioCtx.resumeIfSuspended();

  // Make a selector for the audio input track collection.
  // create a track selector
  window.audioInputTrackSelector = new AudioInputDevicesMediaStreamTrackSelector(
    // The MediaDeviceList to use in the selector
    window.audioInputMediaDeviceList,
    // The selector's onSelectionChange callback function
    function() {
      // TODO: for now, just log the selection. Eventually do something more meaningful with the selected track
      console.log('Track selected: ' + this.selectedTrack.label);
//      mediaStreamTrackSourceNode = audioCtx.createMediaStreamTrackSource(selector.selectedTrack);
    }
  );
  
};
