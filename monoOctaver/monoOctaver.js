// Generates an octave-down signal by playing sampling the input signal and playing it 
// back at half speed.
class MonoOctaver extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      {
        name: 'comparisonWindowLength',
        defaultValue: 32,
        minValue: 8,
        maxValue: 1024,
        automationRate: 'k-rate'
      },
      {
        name: 'skipThreshold',
        defaultValue: 0.005,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate'
      }
    ]
  }

  static hysteresisSampleLength = 48;

  constructor() {
    super();
    console.log('MonoOctaver constructor() called.')

    // 'speaker' channel interpretation upmixes mono input to stereo output
    this.channelInterpretation = 'speakers';

    // A buffer to sample input
    this.buffer = new Float32Array(96000);
    // Record and play heads. Numbers indicating position within the buffer array.
    // Record head runs from zero to (buffer.length * 2). It will 
    this.recordHead = 0;
    // Play head runs from zero to buffer.length
    this.playHead = 0;

    // hysteresis protects against skipping too often. When this property is greater
    // than zero, skipping will not occur. The property decrements by one per sample
    // until it reaches zero.
    this.hysteresisSamplesRemaining = 0;

  }

  // Provide accessors for parameters
  get comparisonWindowLength() {
    return this.parameters.get('comparisonWindowLength');
  }

  get skipThreshold() {
    return this.parameters.get('skipThreshold');
  }

  rmsDifference(_position1, _position2, _comparisonWindowLength) {
    _position1 = Math.floor(_position1);
    _position2 = Math.floor(_position2);
    var total = 0;
    for(let i = 0; i < _comparisonWindowLength; i++) {
      total += Math.pow(this.buffer[_position1] - this.buffer[_position2], 2);
      _position1--;
      if(_position1 < 0) _position1 = this.buffer.length;
      _position2--;
      if(_position2 < 0) _position2 = this.buffer.length;
    }
    return Math.sqrt(total/_comparisonWindowLength);
  }

  process (inputs, outputs, parameters) {
    console.log('MonoOctaver.process() called.');

    // Use only the first channel of the first input
    const inputChannel = inputs[0][0];
    const outputChannel = outputs[0][0];

    // process each input sample
    for (var i = 0; i < inputChannel.length; i++) {
      // write to the record head
      this.buffer[this.recordHead] = inputChannel[i];
      this.recordHead = (this.recordHead + 1) % this.buffer.length;

      // play from the play head, which is running at half speed.
      // TODO: improve interpolation
      outputChannel[i] = (this.buffer[Math.floor(this.playHead)] + this.buffer[Math.ceil(this.playHead)])*0.5;
      this.playHead = (this.playHead + 0.5) % this.buffer.length;

      // If in hysteresis, just decrement hysteresisSamplesRemaining
      if (this.hysteresisSamplesRemaining > 0) {
        this.hysteresisSamplesRemaining--;
      }
      // otherwise, check for phase alignment between record and play heads
      else {
        // check for a positive zero crossing at the play head
        var oneBeforePlayHead = (this.playHead == 0) ? this.buffer.length : this.playHead;
        if (true || this.buffer[this.playHead] >= 0 && this.buffer[oneBeforePlayHead] < 0) {

          // Jump the play head to catch up with the record head when they are (approximately) in phase
          var rmsDiff = this.rmsDifference(this.recordHead, this.playHead, parameters['comparisonWindowLength'][0]);
          if (rmsDiff < parameters['skipThreshold'][0]) {
            // TODO: do a short crossfade rather than a straight skip
            this.playHead = this.recordHead;
            console.log('Skip: ' + rmsDiff);
            // Go into hysteresis
            this.hysteresisSamplesRemaining = MonoOctaver.hysteresisSampleLength;
          }
        }
      }
    }

    // Returning true prevents garbage collection from ever cleaning up the processor
    // In the event that we ever want to release it from memory this should be false.
    return true;
  }

}

registerProcessor('monoOctaver', MonoOctaver);
