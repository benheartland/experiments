// Polyfill for the MediaStreamTrackAudioSourceNode class
if(typeof(MediaStreamTrackAudioSourceNode) == 'undefined') {
  function MediaStreamTrackAudioSourceNode(context, options) {
    console.log(options.mediaStreamTrack);
    return context.createMediaStreamSource(new MediaStream([options.mediaStreamTrack]));
  }
}

// Polyfill for the AudioContext.createMediaStreamTrackSource() method.
if(typeof(AudioContext.prototype.createMediaStreamTrackSource) == 'undefined') {
  AudioContext.prototype.createMediaStreamTrackSource = function(_mediaStreamTrack) {
    var _options = {mediaStreamTrack: _mediaStreamTrack};
    return new MediaStreamTrackAudioSourceNode(this, _options);
  }
}

// Polyfill for the HTMLCollection.forEach() method.
if(typeof(HTMLCollection.prototype.forEach) == 'undefined') {
  HTMLCollection.prototype.forEach = function(_callback) {
    for(var i = 0; i < this.length; i++) {
      _callback(this.item(i));
    }
  }
}

// HTML Table polyfills

// HTMLTableElement.createTBody() - this is an HTML5 recommendation
if(typeof(HTMLTableElement.prototype.createTBody) == 'undefined') {
  HTMLTableElement.prototype.createTBody = function() {
    return this.appendChild(document.createElement('tbody'));
  }
}

// HTMLTableRowElement.insertHeaderCell() - not really a polyfill. This method
// does for <th> header cells what insertCell() does for <td> data cells.
if(typeof(HTMLTableRowElement.prototype.insertHeaderCell) == 'undefined') {  
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
