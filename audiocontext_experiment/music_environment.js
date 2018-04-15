// GLOBALS
const OCTAVE_RATIO = 2;							// frequency ratio of the octave interval - normally 2
const PITCH_DIVISIONS_PER_OCTAVE = 12; 			// normally 12 semitones per octave
const PITCH_DIVISION_RATIO = OCTAVE_RATIO ** (1/PITCH_DIVISIONS_PER_OCTAVE);
const REFERENCE_FREQUENCY = 440;				// Standard A = 440Hz
const REFERENCE_NOTE_NUMBER = 69;				// MIDI A4 = 69
const REFERENCE_OCTAVE_TOP_NOTE_NUMBER = REFERENCE_NOTE_NUMBER + PITCH_DIVISIONS_PER_OCTAVE;
// default envelope settings
const DEFAULT_ATTACK_TIME = 0.1;
const DEFAULT_DECAY_TIME = 0.1;
const DEFAULT_SUSTAIN_RATIO = 0.8;
const DEFAULT_RELEASE_TIME = 1;
// default filter settings
const DEFAULT_FILTER_TYPE = 'lowpass';
const DEFAULT_FILTER_FREQUNCY = 1000;
const DEFAULT_FILTER_Q = 1;
// oscillator constants
const DEFAULT_OSCILLATOR_WAVEFORM = 'sine';
const DEFAULT_OSCILLATOR_COUNT = 2;
const DEFAULT_OSCILLATOR_GAIN = 1;

// global musical variables
var tempo = 120;				// BPM
var beatDuration = 60/tempo;	// duration of 1 beat in seconds
// computer keyboard input
var baseOctave = 4;				// C4 = middle C
// ADSR envelope constructor
function envelopeADSR(a = DEFAULT_ATTACK_TIME, d = DEFAULT_DECAY_TIME, s = DEFAULT_SUSTAIN_RATIO, r = DEFAULT_RELEASE_TIME) {
	this.attack = a;	// attack time in seconds
	this.delay = d;		// decay time in seconds
	this.sustain = s;	// sustain ratio [0-1]
	this.release = r;	// release time in seconds
};
// synth voice constructor
function classicSynthVoice(oscillatorCount = DEFAULT_OSCILLATOR_COUNT, waveform = DEFAULT_OSCILLATOR_WAVEFORM) {
	var callTime = audioCtx.currentTime;
	// set up voice amplitube
	this.voiceGainNode = audioCtx.createGain();
	this.voiceGainNode.gain.value = 0;
	this.voiceGainNode.envelope = new envelopeADSR();
	// set up voice filter
	this.voiceFilterNode = audioCtx.createBiquadFilter();
	this.voiceFilterNode.type = DEFAULT_FILTER_TYPE;
	this.voiceFilterNode.startFrequency = DEFAULT_FILTER_FREQUNCY;
	this.voiceFilterNode.frequency.value = DEFAULT_FILTER_FREQUNCY;
	this.voiceFilterNode.Q.value = DEFAULT_FILTER_Q;
	this.voiceFilterNode.envelope = new envelopeADSR();
	this.voiceFilterNode.connect(this.voiceGainNode);
	// set up oscillators
	this.oscillator = new Array(oscillatorCount);
	this.oscillator.forEach(function(value, index, array) {
		array[index].tune = index * PITCH_DIVISIONS_PER_OCTAVE;
		array[index].fineTune = 0;
		// create the oscillator source node
		array[index].oscillatorSourceNode = audioCtx.createOscillator();
		array[index].oscillatorSourceNode.type = waveform;
		array[index].oscillatorSourceNode.frequency = midiNoteNumberToFrequency(REFERENCE_NOTE_NUMBER);
		// create the oscillator gain node
		array[index].oscillatorGainNode = audioCtx.createGain();
		array[index].oscillatorGainNode.gain.value = DEFAULT_OSCILLATOR_GAIN;
		// connect the nodes
		array[index].oscillatorSourceNode.connect(array[index].oscillatorGainNode);
		array[index].oscillatorGainNode.connect(this.voiceFilterNode);
		// start the oscillator (which runs continuously)
		array[index].oscillatorSourceNode.startAtTime(callTime);
	}, this);
	// play a note
	this.play = function(noteNumber) {
//		console.log(this.voiceGainNode);
		var callTime = audioCtx.currentTime;
		var peakTime = callTime + this.voiceGainNode.envelope.attack;
		var settleTime = peakTime + this.voiceGainNode.envelope.delay;
		this.oscillator.forEach(function(value, index, array) {
			array[index].oscillatorSourceNode.frequency.exponentialRampToValueAtTime(callTime, midiNoteNumberToFrequency(noteNumber + array[index].tune));  // TODO add fine tuning
		}, this);
		this.voiceGainNode.gain.exponentialRampToValueAtTime(1, peakTime);
		this.voiceGainNode.gain.exponentialRampToValueAtTime(this.voiceGainNode.envelope.sustain, settleTime);
	}
	// stop playing
	this.stop = function() {
		var callTime = audioCtx.currentTime;
		this.voiceGainNode.gain.exponentialRampToValueAtTime(0, callTime + this.voiceGainNode.envelope.release);
	}
	// is a note currently playing i.e. is the voice gain greater than zero?
	this.isPlaying = function() {
		return (this.voiceGainNode.gain.value > 0);
	}
}
// instrument constructor
function instrument() {
	this.voice = new Array();
	this.outputGainNode = audioCtx.createGain();
	this.outputGainNode.connect(audioCtx.masterVolumeNode);
}
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
// 
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
