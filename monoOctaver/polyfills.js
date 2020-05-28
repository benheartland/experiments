// Polyfill for the AudioContext class in case only webkitAudioContext is available.
if(typeof(AudioContext) === 'undefined') {
  if(typeof(webkitAudioContext) === 'undefined') {
    throw new Error('Browser does not support AudioContext or webkitAudioContext');
  }
  else {
    AudioContext = webkitAudioContext;
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

// HTML Table polyfills

// HTMLTableElement.createTBody() - this is an HTML5 recommendation.
if(typeof(HTMLTableElement.prototype.createTBody) === 'undefined') {
  HTMLTableElement.prototype.createTBody = function() {
    return this.appendChild(document.createElement('tbody'));
  }
}
