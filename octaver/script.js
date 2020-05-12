// Outputs a number followed by the appropriate singular/plural noun.
// n: the number
// singular: the singular form of the noun
// plural (optional): the plural form of the noun. If not supplied, defaults to singular + 's'
function plural(n, singular, plural = singular + 's') {
  return n == 1 ? n + ' ' + singular : n + ' ' + plural;
}

// Set up an array of objects that will be looped over on media device change.
// If an object in the list has a onmediadevicechange() method, it will be called.
window.onMediaDeviceChangeList = new Array();
// Event listener that will loop over objects registered in onMediaDeviceChangeList() and call their onmediadevicechange() method, if it exists
navigator.mediaDevices.ondevicechange = function() {
  // DEBUG
  console.log('mediaDevices.ondevicechange called')
  // loop through the objects in onMediaDeviceChangeList
  window.onMediaDeviceChangeList
    // For each object, check that onmediadevicechange exists and is a function, then execute it
    .filter( function(_object) {return typeof(_object.onmediadevicechange) === 'function' } )
    .forEach( function(_object) {_object.onmediadevicechange()} );
}

window.onload = function() {

  // create an audio context
  window.audioCtx = new window.AudioContext();

  // Create an audio input device list object (not yet populated)
  window.audioInputMediaDeviceList = new MediaDeviceList('audioinput');
  // Register the device list in the onMediaDeviceChangeList
  window.onMediaDeviceChangeList.push(window.audioInputMediaDeviceList);
  // Update the audio input device list
  window.audioInputMediaDeviceList.update()
  audioCtx.resumeIfSuspended();

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
