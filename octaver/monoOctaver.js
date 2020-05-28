// Generates an octave-down signal by playing sampling the input signal and playing it 
// back at half speed.
class MonoOctaver extends AudioWorkletProcessor {

  // A 4800 sample buffer will let us sample down to 20Hz at 96 kHz
  buffer = new Float32Array(4800);
  // Record and play heads. Numbers indicating position within the buffer array.
  // Record head runs from zero to (buffer.length * 2). It will 
  recordHead = 0;
  // Play head runs from zero to buffer.length
  playHead = 0;

  process (inputs, outputs, parameters) {

    // Use only the first channel of the first input
    const inputChannel = inputs[0][0];
    const outputChannel = outputs[0][0];

    // process each input sample
    for (let i = 0; i < inputChannel.length; i++) {
      // write to the record head
      buffer[recordHead] = inputChannel[i];
      this.recordHead = (this.recordHead + 1) % this.buffer.length;

      // play from the play head, which is running at half speed.
      // TODO: improve interpolation
      outputChannel[i] = this.buffer[Math.floor(playHead/2)];
      this.playHead = (this.playHead + 0.5) % this.buffer.length;

      // TODO: detect when play and record heads are at (approximately) in-phase points
      // TODO: Jump the play head to catch up with the record head when they are in phase

    }

    // Returning true prevents garbage collection from ever cleaning up the processor
    // In the event that we ever want to release it from memory this should be false.
    return true;
  }

}

registerProcessor('monoOctaver', MonoOctaver);