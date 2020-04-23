// Outputs a number followed by the appropriate singular/plural noun.
// n: the number
// singular: the singular form of the noun
// plural (optional): the plural form of the noun. If not supplied, defaults to singular + 's'
function plural(n, singular, plural = singular + 's') {
  return n == 1 ? n + ' ' + singular : n + ' ' + plural;
}

const supportedConstraint = navigator.mediaDevices.getSupportedConstraints();

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
    var _audioInputDevicesList = null;
    var _getUserMediaPromiseList = new Array();

    var _thisAudioInputDevicesMediaStreamTrackCollection = this;
    // List the audio devices
    navigator.mediaDevices.enumerateDevices()
    .then(function(_devices) {
      // Filter to audio inputs
      _audioInputDevicesList = _devices.filter(function(_device) {return _device.kind == 'audioinput'});
      // Cycle through audio input devices
      _audioInputDevicesList.forEach(function(_device) {
        // Request access to the device's audio input stream
        _getUserMediaPromiseList.push(
          navigator.mediaDevices.getUserMedia({audio: {deviceId: _device.deviceId}})
          .then(function(_mediaStream) {
            // Cycle through the stream's audio tracks
            _mediaStream.getAudioTracks().forEach(function(_track) {
              _thisAudioInputDevicesMediaStreamTrackCollection.item.push(_track);
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
        if(_thisAudioInputDevicesMediaStreamTrackCollection.length > 0 && _successCallbackFunction) _successCallbackFunction()
        // Otherwise, if _failureCallbackFunction is defined, call it
        else if(_failureCallbackFunction) _failureCallbackFunction(); 
      })
    });

  }
  // TODO: handle change of mediaDevices

  // syntactic sugar: emulate the item() method of an HTMLCollection
  /*
  item(n) {
    return this.item[n];
  }
  */

  // the length property
  get length() {
    return this.item.length;
  }

  // add a forEach() method
  forEach(_callback) {
    this.item.forEach(_callback);
  }

}

class AudioInputDevicesMediaStreamTrackSelector {
  // _audioInputDevicesMediaStreamTrackCollection : an AudioInputDevicesMediaStreamTrackCollection
  //    array listing the tracks to be included in the selector
  // _inSelectionChangeFunction : a callback function to be called when the selection is changed
  constructor(_audioInputDevicesMediaStreamTrackCollection, _onSelectionChangeFunction) {
    // a reference to this selector object, required later on.
    var _thisSelector = this;

    // properties
    this.selectedTrack = null;
    this.onSelectionChange = _onSelectionChangeFunction;
    // A container <div>
    var _container = document.body.appendChild(document.createElement('div'));
    _container.classList.add('audio-track-selector');
    // Set up a table to display the available inputs
    var _table = _container.appendChild(document.createElement('table'));
    // table header
    var _thead = _table.createTHead();
    var _hRow = _thead.appendChild(document.createElement('tr'));
    _hRow.insertHeaderCell().innerText = 'Name';
    _hRow.insertHeaderCell().innerText = 'Channels';
    _hRow.insertHeaderCell().innerText = 'Sample Rate (KHz)';
    _hRow.insertHeaderCell().innerText = 'Sample Size (bits)';
    _hRow.insertHeaderCell().innerText = 'Auto Gain';
    _hRow.insertHeaderCell().innerText = 'Noise Suppression';
    _hRow.insertHeaderCell().innerText = 'Echo Cancellation';

    // table body
    var _tbody = _table.createTBody();
    console.log(_audioInputDevicesMediaStreamTrackCollection);
    console.log(_audioInputDevicesMediaStreamTrackCollection.length);
    _audioInputDevicesMediaStreamTrackCollection.forEach(function(_track) {
      // Get the track's settings
      var _trackSettings = _track.getSettings();
      // Output the settings to a new row in the table
      var _row = _tbody.appendChild(document.createElement('tr'));
      _row.insertHeaderCell().innerText = _track.label;
      _row.insertCell().innerText = _trackSettings.channelCount;
      _row.insertCell().innerText = _trackSettings.sampleRate/1000;
      _row.insertCell().innerText = _trackSettings.sampleSize;
      _row.insertCell().innerText = _trackSettings.autoGainControl;
      _row.insertCell().innerText = _trackSettings.noiseSuppression;
      _row.insertCell().innerText = _trackSettings.echoCancellation;
      // Set up the onclick handler for the row
      _row.addEventListener('click', function(clickEvent) {
        this.parentElement.rows.forEach(function(r) {
          r.classList.remove('selected');
        });
        this.classList.add('selected');
        _thisSelector.selectedTrack = _track;
        _thisSelector.onSelectionChange();
      });
    })
  }

} // end of AudioInputsSelector class declaration


/*
// Request access to audio devices

navigator.mediaDevices.getUserMedia({audio: standardAudioConstraints})
.then (function(_mediaStream) {
  // if the audio context does not exist, create it
  if(audioCtx === null) audioCtx = new AudioContext();
  // List audio tracks
  document.body.appendChild(document.createElement('p')).innerText = 'Select input:';
  var _form = document.body.appendChild(document.createElement('form'));
  _form.id = 'audioTrackSelectorForm_stream_' + _mediaStream.id;
  var _trackSelectList = _form.appendChild(document.createElement('select'));
  _mediaStream.getAudioTracks().forEach((_track, _index) => {
    // Disable the track and apply constraints
    _track.enabled = false;
    _track.applyConstraints(standardAudioConstraints);
    // Radio button to select the track
    var _trackChoiceInput = _trackSelectList.appendChild(document.createElement('option'));
    _trackChoiceInput.value = _track.id;
    var _trackSettings = _track.getSettings();
    _trackChoiceInput.innerText = _track.label + ' (' + plural(_trackSettings.channelCount, 'channel') + ', ' + (_trackSettings.sampleRate/1000) + ' kHz, ' + plural(_trackSettings.sampleSize, 'bit') + ')';
  });
  // Add the select button
  var _selectButton = _form.appendChild(document.createElement('button'));
  _selectButton.type = 'button';
  _selectButton.id = _form.id + '_selectButton';
  _selectButton.innerText = 'Select';
  _selectButton.value = 'Select';
  _selectButton.onclick = function(event) {
    audioCtx.source = audioCtx.createMediaStreamTrackSource(_mediaStream.getTrackById(_trackSelectList.value));
  }

})
.catch (function(err) {console.log(err.name + ': ' + err.message)});
*/

window.onload = function() {
  // Request access to audio input devices and make a collection of available audio input tracks 
  window.audioInputDevicesMediaStreamTrackCollection = new AudioInputDevicesMediaStreamTrackCollection(function() {
    // create an audio context
    var audioCtx = new AudioContext();
    var mediaStreamTrackSourceNode;
    // create a track selector.
    var selector = new AudioInputDevicesMediaStreamTrackSelector(window.audioInputDevicesMediaStreamTrackCollection, function() {
      mediaStreamTrackSourceNode = audioCtx.createMediaStreamTrackSource(selector.selectedTrack);
      console.log('Track selected: ' + this.selectedTrack.label);
    });
  });
};
