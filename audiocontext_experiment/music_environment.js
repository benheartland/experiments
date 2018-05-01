// GLOBALS
const OCTAVE_RATIO = 2;							// frequency ratio of the octave interval - normally 2
const PITCH_DIVISIONS_PER_OCTAVE = 12; 			// normally 12 semitones per octave
const PITCH_DIVISION_RATIO = OCTAVE_RATIO ** (1/PITCH_DIVISIONS_PER_OCTAVE);
const REFERENCE_FREQUENCY = 440;				// Standard A = 440Hz
const REFERENCE_NOTE_NUMBER = 69;				// MIDI A4 = 69
const REFERENCE_OCTAVE_TOP_NOTE_NUMBER = REFERENCE_NOTE_NUMBER + PITCH_DIVISIONS_PER_OCTAVE;
// default envelope settings
const DEFAULT_ATTACK_TIME = 0.4;
const DEFAULT_DECAY_TIME = 0.7;
const DEFAULT_SUSTAIN_RATIO = 0.2;
const DEFAULT_RELEASE_TIME = 0.7;
// default filter settings
const DEFAULT_FILTER_TYPE = 'lowpass';
const DEFAULT_FILTER_FREQUENCY = 1000;
const DEFAULT_FILTER_Q = 1;
// oscillator constants
const DEFAULT_OSCILLATOR_WAVEFORM = 'square';
const DEFAULT_OSCILLATOR_COUNT = 2;
const DEFAULT_OSCILLATOR_GAIN = 1;

// global musical variables
var tempo = 120;				// BPM
var beatDuration = 60/tempo;	// duration of 1 beat in seconds
// computer keyboard input
var baseOctave = 4;				// C4 = middle C

// ADSR envelope constructor
// t is an AudioParam
function envelopeADSR(t, p = 1, a = DEFAULT_ATTACK_TIME, d = DEFAULT_DECAY_TIME, s = DEFAULT_SUSTAIN_RATIO, r = DEFAULT_RELEASE_TIME) {
	this.target = t;
	this.peak = p;
	this.attack = a;	// attack time in seconds
	this.delay = d;		// decay time in seconds
	this.sustain = s;	// sustain ratio [0-1]
	this.release = r;	// release time in seconds

	this.triggerAttack = function(triggerTime = audioCtx.currentTime) {
		this.target.cancelScheduledValues(triggerTime);
		var peakTime = triggerTime + this.attack;
		var settleTime = peakTime + this.delay;
		this.target.linearRampToValueAtTime(this.peak, peakTime);
		this.target.linearRampToValueAtTime(this.sustain * this.peak, settleTime);
	}

	this.triggerRelease = function(triggerTime = audioCtx.currentTime) {
		this.target.cancelScheduledValues(triggerTime);
		var stopTime = triggerTime + this.release;
		this.target.linearRampToValueAtTime(0, stopTime);
	}

};

// oscillator constructor
// tune = coarse tuning in semitones (or pitch divisions in non-standard scales)
// waveform = 'sine' | 'square' | 'sawtooth' | 'triangle" | 'custom'
// fineTune = fine tuning in cents
// f = frequncy in Hz
// g = gain [0,1]
function oscillator(tune = 0, waveform = DEFAULT_OSCILLATOR_WAVEFORM, fineTune = 0, f = REFERENCE_FREQUENCY, g = DEFAULT_OSCILLATOR_GAIN) {

	// tuning value
	this.tune = tune;
	this.glideTime = 0.1 + this.tune/120;				// TODO set this more elegantly

	// audio source for oscillator
	this.source = audioCtx.createOscillator();
	this.source.type = waveform;
	this.frequency = this.source.frequency;
	this.frequency.detune = fineTune;
	this.frequency.setValueAtTime(f * (PITCH_DIVISION_RATIO ** tune), audioCtx.currentTime);
	this.source.start(audioCtx.currentTime);

	// output gain for oscillator
	this.gainNode = audioCtx.createGain();
	this.gain = this.gainNode.gain;						// quick access to oscillator gain
	this.gain.setValueAtTime(g, audioCtx.currentTime);

	// connect nodes together
	this.source.connect(this.gainNode);

	// METHODS

	// connect the output to an audio node
	this.connect = function(audioNode) {this.gainNode.connect(audioNode)};

	// set the note instantly at time t, as measured by the Audio Context 
	this.setNoteAtTime = function(noteNumber, t) {
		this.frequency.setValueAtTime(midiNoteNumberToFrequency(noteNumber + this.tune), t);
	}

	// gilde to note, starting at time t, as measured by the Audio Context
	this.exponentialRampToNoteAtTime = function(noteNumber, t) {
		this.frequency.setValueAtTime(this.frequency.value, t);	// needed to give the starting point of the ramp - TODO get f at ramp starting time, not funtion call time
		this.frequency.exponentialRampToValueAtTime(midiNoteNumberToFrequency(noteNumber + this.tune), t + this.glideTime);
	}
}

// classic synth voice constructor
// set up {oscillatorCount} oscillators mixed together and routed through envelope-controlled filter and amplitude
function classicSynthVoice(oscillatorCount = DEFAULT_OSCILLATOR_COUNT, waveform = DEFAULT_OSCILLATOR_WAVEFORM) {

	this.isPlaying = false;
	this.oscillatorCount = oscillatorCount;
	this.retrigger = true;

	// output gain for the voice
	this.gainNode = audioCtx.createGain();
	this.gain = this.gainNode.gain;						// quick access to voice gain
	this.gain.setValueAtTime(0, audioCtx.currentTime);
	this.gain.envelope = new envelopeADSR(this.gain);
	this.connect = function(audioNode) {this.gainNode.connect(audioNode)};

	// output filter for the voice
	this.filter = audioCtx.createBiquadFilter();
	this.filter.type = DEFAULT_FILTER_TYPE;
	this.filter.frequency.setValueAtTime(DEFAULT_FILTER_FREQUENCY, audioCtx.currentTime);
	this.filter.Q.setValueAtTime(DEFAULT_FILTER_Q, audioCtx.currentTime);
	this.filter.gain.setValueAtTime(0, audioCtx.currentTime);				// TODO replace literal number
	this.filter.envelope = new envelopeADSR(this.filter.detune, 4800);		// TODO replace literal number
	this.filter.envelope.sustain = 0.8;										// TODO replace literal number
	this.filter.connect(this.gainNode);

	// set up oscillators
	this.oscillator = new Array(this.oscillatorCount);
	for(var i = 0; i < this.oscillatorCount; i++) {
		this.oscillator[i] = new oscillator(12 * i, waveform);				// TODO add the ability to pass in an array of tune values
		this.oscillator[i].connect(this.filter);
	}

	// METHODS

	// change the note immediately at time t, as measured by the Audio Context
	this.setNoteAtTime = function(noteNumber, t) {
		this.currentNoteNumber = noteNumber;
		for(var i = 0; i < this.oscillatorCount; i++) {
			this.oscillator[i].setNoteAtTime(noteNumber, t);
		}
	}

	// gilde to note starting at time t, as measured by the Audio Context
	this.exponentialRampToNoteAtTime = function(noteNumber, t) {
		this.currentNoteNumber = noteNumber;
		for(var i = 0; i < this.oscillatorCount; i++) {
			this.oscillator[i].exponentialRampToNoteAtTime(noteNumber, t);
		}
	}

	this.setNoteAtTime(REFERENCE_NOTE_NUMBER, audioCtx.currentTime);

	// start a note
	this.noteOn = function(noteNumber, noteOnTime = audioCtx.currentTime) {
		console.log('Note On : ' + noteNumber + ' : isPlaying = ' + this.isPlaying);
		if (this.isPlaying == true) {
			this.exponentialRampToNoteAtTime(noteNumber, noteOnTime)
		} else{
			this.setNoteAtTime(noteNumber, noteOnTime)
		}
		if(this.retrigger || this.isPlaying == false) {
			this.gain.envelope.triggerAttack(noteOnTime);
			this.filter.envelope.triggerAttack(noteOnTime);	
		}
		this.isPlaying = true;
	}

	// stop playing a note
	this.noteOff = function(noteNumber, noteOffTime = audioCtx.currentTime) {
		if (this.isPlaying && this.currentNoteNumber == noteNumber) {
			this.isPlaying = false;
			console.log('Note Off: ' + noteNumber);		
			this.gain.envelope.triggerRelease(noteOffTime);
			this.filter.envelope.triggerRelease(noteOffTime);	
		}
	}

	// is the voice currently playing i.e. is the voice gain greater than zero?
	this.isSilent = function() {
		return (this.gain.value = 0);
	}

}

// instrument constructor
AudioContext.prototype.createInstrument = function(voiceCount) {
	var newInstrument = new Object();
	// array to hold instrumnet voices
	newInstrument.voice = new Array(voiceCount);
	// output volume
	newInstrument.outputGainNode = this.createGain();
	newInstrument.volume = newInstrument.outputGainNode.gain;
	// method to connect instrument
	newInstrument.connect = function(destinationNode, output, input) {
		newInstrument.outputGainNode.connect(destinationNode, output, input);
	};
	// return the new instrument
	return newInstrument;
}

// convert a (possibly fractional) MIDI note number to a frequency in Hz
function midiNoteNumberToFrequency(noteNumber) {
	var octaveShift = 0;
	var noteClass = noteNumber;
	while(noteClass < REFERENCE_NOTE_NUMBER) {
		noteClass += PITCH_DIVISIONS_PER_OCTAVE;
		octaveShift --;
	}
	while(noteClass >= REFERENCE_OCTAVE_TOP_NOTE_NUMBER) {
		noteClass -= PITCH_DIVISIONS_PER_OCTAVE;
		octaveShift ++;
	}
	return REFERENCE_FREQUENCY * (OCTAVE_RATIO ** octaveShift) * (PITCH_DIVISION_RATIO ** (noteClass - REFERENCE_NOTE_NUMBER)); // using octave limits rounding errors
}
// dictionary of computer keyboard keys to a MIDI note number
// based on octave 0
var keyCodeToMidiNoteNoteNumber = {
	//bottome row
	'IntlBackslash' : 12,	// C0
	'KeyA' : 13,	// C#
	'KeyZ' : 14,	// D
	'KeyS' : 15,	// D#
	'KeyX' : 16,	// E
	'KeyC' : 17,	// F
	'KeyF' : 18,	// F#
	'KeyV' : 19,	// G
	'KeyG' : 20,	// G#
	'KeyB' : 21,	// A 440
	'KeyH' : 22,	// A#
	'KeyN' : 23,	// B
	'KeyM' : 24,	// C1
	'KeyK' : 25,	// C#
	'Comma' : 26,	// D
	'KeyL' : 27,	// D#
	'Period' : 28,	// E
	'Slash' : 29,	// F
	'Quote' : 30,	// F#
	// top row
	'KeyQ' : 24,	// C1
	'Digit2' : 25,	// C#
	'KeyW' : 26,	// D
	'Digit3' : 27,	// D#
	'KeyE' : 28,	// E
	'KeyR' : 29,	// F
	'Digit5' : 30,	// F#
	'KeyT' : 31,	// G
	'Digit6' : 32,	// G#
	'KeyY' : 33,	// A
	'Digit7' : 34,	// A#
	'KeyU' : 35,	// B
	'KeyI' : 36,	// C3
	'Digit9' : 37,	// C#
	'KeyO' : 38,	// D
	'Digit0' : 39,	// D#
	'KeyP' : 40,	// E
	'BracketLeft' : 41,	// F
	'Equal' : 42,	// F#
	'BracketRight' : 43	// G	
}
