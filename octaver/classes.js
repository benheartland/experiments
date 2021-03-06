// A list of media devices of the specified kind (or all media devices if kind is not specified).
class MediaDeviceList {

  static allowedKindValues = ['videoinput', 'audioinput', 'audiooutput'];
  static excludeDeviceIds = ['default', 'communications'];

  // Get the Media Track Constraints that are supported by the client.
  static supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
  // Make a set of standard audio constraints, taking into account which constraints are supported by the client.
  static standardAudioConstraints = {
    autoGainControl: MediaDeviceList.supportedConstraints.autoGainControl ? {ideal: false} : undefined,
    echoCancellation: MediaDeviceList.supportedConstraints.echoCancellation ? {ideal: false} : undefined,
    noiseSuppression: MediaDeviceList.supportedConstraints.noiseSuppression ? {ideal: false} : undefined,
    sampleRate: MediaDeviceList.supportedConstraints.sampleRate ? {min: 22050, ideal: 48000, max: 96000} : undefined,
    sampleSize: MediaDeviceList.supportedConstraints.sampleSize ? {min: 8, ideal: 24, max: 32} : undefined,
    latency: MediaDeviceList.supportedConstraints.latency ? {min: 0.0, ideal: 0.0, max: 2.0} : undefined,
    channelCount: MediaDeviceList.supportedConstraints.channelCount ? {min: 1, ideal: 8} : undefined
  };
  // TODO: Possibly add some standard video constraints

  constructor(_kind) {
    // What kind of media devices will this list contain? [ 'videoinput' | 'audioinput' | 'audiooutput' | null ] (null => all devices)
    this.kind = _kind;
    this.item = new Array();
    // An array of dependent objects. Any with an update() method will have it called when the update() method of this object is called
    this.dependents = new Array();
    // register a MediaDevices event listener to update the list when media devices change.
    var _thisMediaDeviceList = this;
    navigator.mediaDevices.addEventListener('devicechange', function() {_thisMediaDeviceList.onmediadevicechange()});
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
  // TODO: this has stopped working on media device change - fix it
  update() {

    var _returnPromise;
    var _thisMediaDeviceList = this;
    var _getUserMediaPromiseList = new Array();

    // enumerateDevices promise
    navigator.mediaDevices.enumerateDevices()
    .then(function(_devices) {

      // restrict the enumerated devices to the specified kind (if any is specified). Exclude default and communications devices (these will be listed as physical devices anyway)
      _devices = _devices.filter( _device => !(MediaDeviceList.excludeDeviceIds.includes(_device.deviceId)) && (!_thisMediaDeviceList.kind || _device.kind === _thisMediaDeviceList.kind) );

      // Remove existing devices that are not in the new array. Iterate backwards over the array so that removed items do not affect counting.
      var i = _thisMediaDeviceList.length;
      while(i > 0) {
        i--;
        if(!( _devices.map(d => d.deviceId).includes(_thisMediaDeviceList.item[i].deviceId))) {
          _thisMediaDeviceList.item.splice(i, 1);
        }
      }
      // Add new devices that are not already in the existing array
      _devices
        .filter( _device => !(_thisMediaDeviceList.item.map(d => d.deviceId).includes(_device.deviceId)) )
        .forEach( function(_device) {

        // Add an array to the device; this will be used to access the tracks associated with it
        _device.trackList = new Array();
        // Construct the constraints object to use when requesting user media access. This will vary 
        // according to the 'kind' property of the MediaDeviceList
        var _constraints = new Object();
        if(_thisMediaDeviceList.kind.startsWith('audio') || _thisMediaDeviceList.kind === null) {
          // Uses the deepCloneObject() JSON method extension
          _constraints.audio = JSON.deepCloneObject(MediaDeviceList.standardAudioConstraints);
          if (_device.deviceId) _constraints.audio.deviceId = _device.deviceId;
          if (_device.groupId) _constraints.audio.groupId = _device.groupId;
        } else {
          _constraints.audio = false;
        }
        if(_thisMediaDeviceList.kind.startsWith('video') || _thisMediaDeviceList.kind === null) {
          // TODO: Possibly add some standard video constraints
          if (_device.deviceId) _constraints.video.deviceId = _device.deviceId;
          if (_device.groupId) _constraints.video.groupId = _device.groupId;
        } else {
          _constraints.video = false;
        }

        // request access to the media device
        _getUserMediaPromiseList.push(
          navigator.mediaDevices.getUserMedia(_constraints)
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
      });

    })
    .catch(function(_err) {
        console.log('Error enumerating media devices.');
        throw _err;
    })
    .finally(function() {
      // Once all getUserMedia promises have been settled, call the update() method of any dependants. Return the
      // aggregrated promise so that further actions can be taken off it.
      _returnPromise = Promise.allSettled(_getUserMediaPromiseList)
      .then(function() {
        // Call the update() method of any dependent objects that have one
        _thisMediaDeviceList.dependents.filter( _object => typeof(_object.update) === 'function' ).forEach( function(_object) {_object.update()} );
      })
    });
  }

  // the onmediadevicechange method for this object
  onmediadevicechange() {
    this.update();
  }

} // end of MediaDeviceList class declaration

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

} // end of AudioInputDevicesMediaStreamTrackSelector class declaration
