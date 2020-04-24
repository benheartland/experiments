// Outputs a number followed by the appropriate singular/plural noun.
// n: the number
// singular: the singular form of the noun
// plural (optional): the plural form of the noun. If not supplied, defaults to singular + 's'
function plural(n, singular, plural = singular + 's') {
  return n == 1 ? n + ' ' + singular : n + ' ' + plural;
}

const supportedConstraint = navigator.mediaDevices.getSupportedConstraints();

// Set up an array of objects that will be looped over on media device change.
// If an object in the list has a onmediadevicechange() method, it will be called.
let onMediaDeviceChangeList = new Array();
// Event listener that will loop over objects registered in onMediaDeviceChangeList() and call their onmediadevicechange() method, if it exists
navigator.mediaDevices.ondevicechange = function() {
  // DEBUG
  console.log('mediaDevices.ondevicechange called')
  // 
  onMediaDeviceChangeList
    .filter( function(_object) {return typeof(_object.onmediadevicechange) === 'function' } )
    .forEach( function(_object) {_object.onmediadevicechange()} );
}

// Construct the set of constraints we want to ask from the audio streams
let standardAudioConstraints = {};
if(supportedConstraint.autoGainControl) standardAudioConstraints.autoGainControl = {ideal: false};
if(supportedConstraint.echoCancellation) standardAudioConstraints.echoCancellation = {ideal: false};
if(supportedConstraint.noiseSuppression) standardAudioConstraints.noiseSuppression = {ideal: false};
if(supportedConstraint.sampleRate) standardAudioConstraints.sampleRate = {min: 22050, ideal: 48000, max: 96000};
if(supportedConstraint.sampleSize) standardAudioConstraints.sampleSize = {min: 8, ideal: 24, max: 32};
if(supportedConstraint.latency) standardAudioConstraints.latency = {min: 0.0, ideal: 0.0, max: 2.0};

// requests access to all audio input media devices and creates a collection of their media stream audio tracks
class AudioInputDevicesMediaStreamTrackCollection {

  constructor(_successCallbackFunction = null, _failureCallbackFunction = null) {
    this.item = new Array();
    // an array of objects that are dependent on this. If the object has an update() method, it will be called
    // when this object's update() method is called. 
    this.dependents = new Array();
    this.update(_successCallbackFunction, _failureCallbackFunction);
  }

  // the length property
  get length() {
    return this.item.length;
  }

  // METHODS

/*
  // syntactic sugar: emulate the item() method of an HTMLCollection
  item(n) {
    return this.item[n];
  }
*/

  // Add a forEach() method
  forEach(_callback) {
    this.item.forEach(_callback);
  }

  // Register a dependent object
  registerDependent(_object) {
    this.dependents.push(_object);
  }

  // Clear the track list
  clear() {
    this.item.splice(0, this.item.length);
  }

  // update the list with the latest audio input devices
  update(_successCallbackFunction = null, _failureCallbackFunction = null) {
    // backreference to this (needed later in promise handlers)
    var _this = this;
    // local variable
    var _getUserMediaPromiseList = new Array();
    // TODO: Instead of clearing the device list and starting again, only add/remove devices that have changed
    // TODO: This will avoid re-requested access permission that has already been given
    // Clear the device list
    this.clear();
    // List the audio devices
    navigator.mediaDevices.enumerateDevices()
    .then(function(_devices) {
      // Filter to audio inputs
      _audioInputDevicesList = _devices.filter(function(_device) {return _device.kind === 'audioinput'});
      // Cycle through audio input devices
      _audioInputDevicesList.forEach(function(_device) {
        // Request access to the device's audio input stream
        _getUserMediaPromiseList.push(
          navigator.mediaDevices.getUserMedia({audio: {deviceId: _device.deviceId}})
          .then(function(_mediaStream) {
            // Cycle through the stream's audio tracks
            _mediaStream.getAudioTracks().forEach(function(_track) {
              // add the track to the collection
              _this.item.push(_track);
            })
          })
          .catch(function(_err) {
            console.log('Error getting user media for device with id ' + _device.deviceId);
            console.error(_err);
          })
        );
      })
    })
    .catch(function(_err) {
      console.log('Error enumerating media devices.');
      console.error(_err);
      // If _failureCallbackFunction is defined, call it
      if(_failureCallbackFunction) _failureCallbackFunction();
    })
    .finally(function() {
      // Wait until all the getUserMediaPromises have been settled
      Promise.allSettled(_getUserMediaPromiseList)
      .then(function() {
        // If this has returned at least one track and _successCallbackFunction is defined, call it
        if(_this.length > 0 && _successCallbackFunction) _successCallbackFunction()
        // Otherwise, if _failureCallbackFunction is defined, call it
        else if(_failureCallbackFunction) _failureCallbackFunction(); 
        // for each registered dependent that has an update() method, call it 
        _this.dependents
          .filter( function(d) {return typeof(d.update) === 'function'} )
          .forEach( function(d) {d.update()} );
      })
    });

  } // end of update() method

  onmediadevicechange() {
    var _this = this
    this.update(
      // update success callback function
      function() {
        _this.dependents.forEach(function(d) {
          d.onmediadevicechange();
        })
      }
    )
  }

}

class AudioInputDevicesMediaStreamTrackSelector {

  // Constructor
  // _audioInputDevicesMediaStreamTrackCollection : an AudioInputDevicesMediaStreamTrackCollection
  //    array listing the tracks to be included in the selector
  // _inSelectionChangeFunction : a callback function to be called when the selection is changed
  constructor(_audioInputDevicesMediaStreamTrackCollection, _onSelectionChangeFunction) {
    // properties
    this.availableTracks = _audioInputDevicesMediaStreamTrackCollection;
    this.selectedTrack = null;
    this.onSelectionChange = _onSelectionChangeFunction;

    // register this selector as being dependent on the audio track collection
    _audioInputDevicesMediaStreamTrackCollection.registerDependent(this);

    // A container <div>
    this.container = document.body.appendChild(document.createElement('div'));
    this.container.classList.add('audio-track-selector');
    // Set up a table to display the available inputs
    this.table = this.container.appendChild(document.createElement('table'));
    // table header
    this.thead = this.table.createTHead();
    var _hRow = this.thead.appendChild(document.createElement('tr'));
    _hRow.insertHeaderCell().innerText = 'Name';
    _hRow.insertHeaderCell().innerText = 'Channels';
    _hRow.insertHeaderCell().innerText = 'Sample Rate (KHz)';
    _hRow.insertHeaderCell().innerText = 'Sample Size (bits)';
    _hRow.insertHeaderCell().innerText = 'Auto Gain';
    _hRow.insertHeaderCell().innerText = 'Noise Suppression';
    _hRow.insertHeaderCell().innerText = 'Echo Cancellation';

    // table body
    this.tbody = this.table.createTBody();
    // Call the update() method to update the selector
    this.update()

  } // end of constructor

  update() {
    console.log('AudioInputDevicesMediaStreamTrackSelector.update() called');
    // a references required inside the forEach()
    var _thisSelector = this;
    var _selectedTrack = this.selectedTrack;
    // clear the selector table body
    this.tbody.innerHTML = '';
    // loop over the available audio tracks
    this.availableTracks.forEach(
      function(_track) {
        // Get the track's settings
        var _trackSettings = _track.getSettings();
        // Output the settings to a new row in the table
        var _row = _thisSelector.tbody.appendChild(document.createElement('tr'));
        _row.insertHeaderCell().innerText = _track.label;
        _row.insertCell().innerText = _trackSettings.channelCount;
        _row.insertCell().innerText = _trackSettings.sampleRate/1000;
        _row.insertCell().innerText = _trackSettings.sampleSize;
        _row.insertCell().innerText = _trackSettings.autoGainControl;
        _row.insertCell().innerText = _trackSettings.noiseSuppression;
        _row.insertCell().innerText = _trackSettings.echoCancellation;
        if(_track === _selectedTrack) {_row.classList.add('selected')};
        // Set up the onclick handler for the row
        _row.addEventListener(
          'click',
          function(clickEvent) {
            // Here, "this" refers to the table row
            this.parentElement.rows.forEach(function(r) {
              r.classList.remove('selected');
            });
            this.classList.add('selected');
            _thisSelector.selectedTrack = _track;
            _thisSelector.onSelectionChange();
          }
        )
      }
    )
  }

  // what happens to this selector when media devices change
  onmediadevicechange() {
    this.update();
  }

} // end of AudioInputsSelector class declaration

window.onload = function() {

  // Request access to audio input devices and make a collection of available audio input tracks 
  window.audioInputDevicesMediaStreamTrackCollection = new AudioInputDevicesMediaStreamTrackCollection(
    // success callback function
    function() {
      // register the track collection in the onMediaDeviceChangeList
      onMediaDeviceChangeList.push(window.audioInputDevicesMediaStreamTrackCollection);

      // create an AudioContext
      var audioCtx = new AudioContext();

      // initialise a variable for a MediaStreamTrackSourceNode
      var mediaStreamTrackSourceNode;
      // create a track selector
      var selector = new AudioInputDevicesMediaStreamTrackSelector(
        // The AudioInputDevicesMediaStreamTrackCollection to use in the selector
        window.audioInputDevicesMediaStreamTrackCollection
        // The selector's onSelectionChange function
        ,function() {
          // TODO: for now, just log the selection. Eventually do something more meaningful with the selected track
          console.log('Track selected: ' + this.selectedTrack.label);
//          mediaStreamTrackSourceNode = audioCtx.createMediaStreamTrackSource(selector.selectedTrack);
        }
      );
    }
    // failure callback function
    ,function() {
      // TODO: say/do something more useful here
      alert('Something went wrong!')
    }
  );
};
