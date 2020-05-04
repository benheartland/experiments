/* TODO:
// Extend MediaDeviceInfo
// Has the user been asked to for permission to access the device?
MediaDeviceInfo.prototype.hasAccessBeenRequested = false;
// Has access been given?
MediaDeviceInfo.prototype.hasAccessBeenGranted = false;
*/

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

// Get the mediaDevices constraints supported by the browser
const supportedConstraint = navigator.mediaDevices.getSupportedConstraints();
// Construct the set of constraints we want to ask from the audio streams
let standardAudioConstraints = {};
if(supportedConstraint.autoGainControl) standardAudioConstraints.autoGainControl = {ideal: false};
if(supportedConstraint.echoCancellation) standardAudioConstraints.echoCancellation = {ideal: false};
if(supportedConstraint.noiseSuppression) standardAudioConstraints.noiseSuppression = {ideal: false};
if(supportedConstraint.sampleRate) standardAudioConstraints.sampleRate = {min: 22050, ideal: 48000, max: 96000};
if(supportedConstraint.sampleSize) standardAudioConstraints.sampleSize = {min: 8, ideal: 24, max: 32};
if(supportedConstraint.latency) standardAudioConstraints.latency = {min: 0.0, ideal: 0.0, max: 2.0};

// A list of media devices of the specified kind (or all media devices if kind is not specified).
class MediaDeviceList {

  static allowedKindValues = ['videoinput', 'audioinput', 'audiooutput'];
  static excludeDeviceIds = ['default', 'communications'];

  constructor(_kind) {
    // What kind of media devices does this list contain (videoinput, audioinput, audiooutput, null => all devices)
    this.kind = _kind;
    this.item = new Array();
    // An array of dependent objects. Any with an update() method will have it called when the update() method of this object is called
    this.dependents = new Array();
  }

  // length property
  get length() {
    return this.item.length;
  }

  set kind(_value) {
    if(_value == null || MediaDeviceList.allowedKindValues.includes(_value)) {this._kind = _value;}
    else {throw new Error(`Invalid value "${_value}" passed for MediaDeviceList.kind. Allowed values are "${MediaDeviceList.allowedKindValues.join('", "')}" or null.`);}
  }

  get kind() {return this._kind;}

  // Return a single array containing all tracks from all devices
  get trackList() {
    var _trackList = new Array();
    this.item.filter(_device => _device.hasAccessBeenGranted).forEach(function(_device) {
      _device.trackList.forEach(function(_track) {
        _trackList.push(_track);
      })
    });
    return _trackList;
  }

  // METHODS

  // Add a forEach() method
  forEach(_callback) {
    this.item.forEach(_callback);
  }

  // Clear the list
  clear() {
    this.item.splice(0, this.item.length);
  }

  // Register a dependent object
  registerDependent(_object) {
    this.dependents.push(_object);
  }

  // Clear all dependents
  clearDependents() {
    this.dependents.splice(0, this.dependents.length);
  }

  // Update the media device list
  update() {
    console.log('MediaDeviceList.update() called');
    var _thisMediaDeviceList = this;
    var _getUserMediaPromiseList = new Array();
    // enumerateDevices promise
    navigator.mediaDevices.enumerateDevices()
    .then(function(_devices) {
      // restrict the enumerated devices to the specified kind (if any is specified). Exclude default and communications devices (these will be listed as physical devices anyway)
      _devices = _devices.filter( _device => !(MediaDeviceList.excludeDeviceIds.includes(_device.deviceId)) && (!_thisMediaDeviceList.kind || _device.kind === _thisMediaDeviceList.kind) );
      // Remove existing devices that are not in the new array
      _thisMediaDeviceList.item.filter( _item => !(_devices.map(d => d.deviceId).includes(_item.deviceId)) ).forEach( function(_item, _index) {_thisMediaDeviceList.item.splice(_index, 1)} );
      // Add new devices that are not already in the existing array
      _devices.filter( _device => !(_thisMediaDeviceList.item.map(i => i.deviceId).includes(_device.deviceId)) ).forEach( function(_device) {
        // Add an array to the device; this will be used to access the tracks associated with it
        _device.trackList = new Array();
        // request access to the media device
        _getUserMediaPromiseList.push(
          // TODO: Generalise this to include video tracks, according to the "kind" property
          navigator.mediaDevices.getUserMedia( {audio: {deviceId: _device.deviceId}} )
          // if access is granted, the getUserMedia() promise resolves to a mediaStream object
          .then(function(_mediaStream) {
            // Flag that access has been granted to the device
            _device.hasAccessBeenGranted = true;
            // Cycle through the stream's audio tracks
            _mediaStream.getAudioTracks().forEach(function(_track) {
              // add the track to the list
              _device.trackList.push(_track);
            })
          })
          .catch(function(_err) {
            console.log('Error getting user media for device with id ' + _device.deviceId);
            console.error(_err);
          })
          .finally(function() {
            // Flag that access has been requested (whether or not it was granted)
            _device.hasAccessBeenRequested = true;
            // Push the device to the device list
            _thisMediaDeviceList.item.push(_device);
          })
        );
        // once all getUserMedia promises have been settled, call the update() method of any dependants.
        Promise.allSettled(_getUserMediaPromiseList)
        .then(function() {
          // Call the update() method of any dependent objects that have one
          _thisMediaDeviceList.dependents.filter( _object => typeof(_object.update) === 'function' ).forEach( function(_object) {_object.update()} );
        });
      });

    })
    .catch(function(_err) {
        console.log('Error enumerating media devices.');
        throw _err;
    })
  }

  // the onmediadevicechange method for this object
  onmediadevicechange() {
    this.update();
  }

}

class AudioInputDevicesMediaStreamTrackSelector {

  // Constructor
  // _audioInputDeviceList : a MediaDevicesList constisting solely of audioinput devices
  // _inSelectionChangeFunction : a callback function to be called when the selection is changed
  constructor(_audioInputDeviceList, _onSelectionChangeFunction) {
    // properties
    this.audioInputDeviceList = _audioInputDeviceList;
    // register this selector as being dependent on the devices list
    this.audioInputDeviceList.registerDependent(this);
    // Start with no track selected
    this.selectedTrack = null;
    this.onSelectionChange = _onSelectionChangeFunction;

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

  } // end of constructor

  update() {
    console.log('AudioInputDevicesMediaStreamTrackSelector.update() called');
    // a references required inside the forEach()
    var _thisSelector = this;
    var _selectedTrack = this.selectedTrack;
    // clear the selector table body
    this.tbody.innerHTML = '';
    // loop over the available audio tracks
    this.audioInputDeviceList.trackList.forEach(
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
            this.parentElement.rows.forEach(function(_row) {
              _row.classList.remove('selected');
            });
            this.classList.add('selected');
            _thisSelector.selectedTrack = _track;
            _thisSelector.onSelectionChange();
          }
        )
      }
    )
  }

} // end of AudioInputsSelector class declaration

window.onload = function() {

  // Create an audio input device list object (not yet populated)
  window.audioInputMediaDeviceList = new MediaDeviceList('audioinput');
  // register the device list in the onMediaDeviceChangeList
  window.onMediaDeviceChangeList.push(window.audioInputMediaDeviceList);
  // update the audio input device list
  window.audioInputMediaDeviceList.update();

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

  // Populate the audio input device list
//  window.audioInputMediaDeviceList.update();

/*

  .then(

    // success callback function
      function() {

        // create an AudioContext
        var audioCtx = new AudioContext();

        // initialise a variable for a MediaStreamTrackSourceNode
        var mediaStreamTrackSourceNode;
      }
      // failure callback function
      ,function() {
        // TODO: say/do something more useful here
        alert('Something went wrong!')
      }
    )
  )

*/

};
