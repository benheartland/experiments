// Extend JSON with an object deep clone static method.
JSON.deepCloneObject = function(_object) {
  return JSON.parse(JSON.stringify(_object));
}

// Polyfill for the AudioContext class in case only webkitAudioContext is available.
if(typeof(AudioContext) === 'undefined') {
  if(typeof(webkitAudioContext) === 'undefined') {
    throw new Error('Browser does not support AudioContext or webkitAudioContext');
  }
  else {
    AudioContext = webkitAudioContext;
  }
}

// Extend AudioContext with a resumeIfSuspended() method.
AudioContext.prototype.resumeIfSuspended = function() {
  if (this.state === 'suspended') {
    // Return the resume() promise, which resolves when the AudioContext resumes.
    return this.resume()
  } 
  else if (this.state === 'running') {
    // Return an already-resolved promise, since the AudioContext is already running.
    return Promise.resolve();
  } 
  else {
    throw new Error(`AudioContext ${this} has unrecognised state '${this.state}'`);
  }
}

// Polyfill for the MediaStreamTrackAudioSourceNode class.
if(typeof(MediaStreamTrackAudioSourceNode) === 'undefined') {
  function MediaStreamTrackAudioSourceNode(context, options) {
    console.log(options.mediaStreamTrack);
    return context.createMediaStreamSource(new MediaStream([options.mediaStreamTrack]));
  }
}

// Polyfill for the AudioContext.createMediaStreamTrackSource() method.
if(typeof(AudioContext.prototype.createMediaStreamTrackSource) === 'undefined') {
  AudioContext.prototype.createMediaStreamTrackSource = function(_mediaStreamTrack) {
    var _options = {mediaStreamTrack: _mediaStreamTrack};
    return new MediaStreamTrackAudioSourceNode(this, _options);
  }
}

// Polyfill for the HTMLCollection.forEach() method.
if(typeof(HTMLCollection.prototype.forEach) === 'undefined') {
  HTMLCollection.prototype.forEach = function(_callback) {
    for(var i = 0; i < this.length; i++) {
      _callback(this.item(i));
    }
  }
}

// HTML Table polyfills and extensions

// HTMLTableElement.createTBody() - this is an HTML5 recommendation.
if(typeof(HTMLTableElement.prototype.createTBody) === 'undefined') {
  HTMLTableElement.prototype.createTBody = function() {
    return this.appendChild(document.createElement('tbody'));
  }
}

// HTMLTableRowElement.insertHeaderCell() - an extension, not a polyfill. This method
// does for <th> header cells what insertCell() does for <td> data cells.
if(typeof(HTMLTableRowElement.prototype.insertHeaderCell) === 'undefined') {  
  HTMLTableRowElement.prototype.insertHeaderCell = function(_index = -1) {
    // Piggyback on the insertCell() method to first create a <td> cell.
    // Doing this ensures that any an invalid index value will cause an
    // IndexSizeError, as with insertCell().
    _tdElement = this.insertCell(_index);
    // Create a <th> cell
    _thElement = document.createElement('th');
    // Replace the <td> cell with the <th> cell
    this.replaceChild(_thElement, _tdElement);
    // Return the <th> cell
    return _thElement; 
  }
}
