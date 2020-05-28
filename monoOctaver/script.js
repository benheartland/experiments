window.onload = function() {

  // create an audio context
  window.audioCtx = new AudioContext();
  window.audioCtx.UI = new AudioContextUI(window.audioCtx);

  window.audioCtx.audioWorklet.addModule('monoOctaver.js')
  .then(function() {

    // Get access to an input stream
    navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: 'default',
        channelCount: {min: 1, ideal: 1},
        sampleRate: {min: 44100, ideal: 48000, max: 96000},
        sampleSize: {min: 16, ideal: 24, max: 32},
        autoGainControl: {ideal: false},
        echoCancellation: {ideal: false},
        noiseSuppression: {ideal: false},
        latency: {ideal: 0}
      },
      video: false
    })
    .then(stream => {
      // take the first audio track from the returned mediaStream
      window.sourceNode = window.audioCtx.createMediaStreamTrackSource(stream.getAudioTracks()[0]);
      // create the MonoOctaver node
      window.monoOctaverNode = window.audioCtx.createMonoOctaverNode();
      // Add the new node's UI to the document
      document.body.appendChild(window.monoOctaverNode.UI);

//      var stereoPannerNode = window.audioCtx.createStereoPanner();
//      stereoPannerNode.pan.setValueAtTime(0, window.audioCtx.currentTime);

      // connect the nodes: source -> monoOctaver -> destination
      window.sourceNode.connect(window.monoOctaverNode);
      window.monoOctaverNode.connect(window.audioCtx.destination);
    })

  })

}
