// GLOBALS
const OCTAVE_RATIO = 2;							// frequency ratio of the octave interval - normally 2
const PITCH_DIVISIONS_PER_OCTAVE = 12; 			// normally 12 semitones per octave
const PITCH_DIVISION_RATIO = OCTAVE_RATIO ** (1/PITCH_DIVISIONS_PER_OCTAVE);
const REFERENCE_FREQUENCY = 440;				// Standard A = 440Hz
const REFERENCE_NOTE_NUMBER = 69;				// MIDI A4 = 69
const REFERENCE_OCTAVE_TOP_NOTE_NUMBER = REFERENCE_NOTE_NUMBER + PITCH_DIVISIONS_PER_OCTAVE;
// default envelope settings
const DEFAULT_ATTACK_TIME = 0.02;
const DEFAULT_DECAY_TIME = 0.2;
const DEFAULT_SUSTAIN_RATIO = 0.75;
const DEFAULT_RELEASE_TIME = 0.02;
// default filter settings
const DEFAULT_FILTER_TYPE = 'lowpass';
const DEFAULT_FILTER_FREQUNCY = 1000;
const DEFAULT_FILTER_Q = 1;
// oscillator constants
const DEFAULT_OSCILLATOR_WAVEFORM = 'sine';
const DEFAULT_OSCILLATOR_COUNT = 2;
const DEFAULT_OSCILLATOR_GAIN = 1;

// global musical variables
var tempo = 360;				// BPM
var beatDuration = 60/tempo;	// duration of 1 beat in seconds

// ADSR envelope constructor
function envelopeADSR(a = DEFAULT_ATTACK_TIME, d = DEFAULT_DECAY_TIME, s = DEFAULT_SUSTAIN_RATIO, r = DEFAULT_RELEASE_TIME) {
	this.attack = a;	// attack time in seconds
	this.delay = d;		// decay time in seconds
	this.sustain = s;	// sustain ratio [0-1]
	this.release = r;	// release time in seconds
};

// synth voice constructor
function classicSynthVoice(oscillatorCount = DEFAULT_OSCILLATOR_COUNT, waveform = DEFAULT_OSCILLATOR_WAVEFORM) {
	var callTime = window.audioCtx.currentTime;
	// set up voice amplitube
	this.voiceGainNode = window.audioCtx.createGain();
	this.voiceGainNode.gain.value = 0;
	this.voiceGainNode.envelope = new envelopeADSR();
	// set up voice filter
	this.voiceFilterNode = window.audioCtx.createBiquadFilter();
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
		array[index].oscillatorSourceNode = window.audioCtx.createOscillator();
		array[index].oscillatorSourceNode.type = waveform;
		array[index].oscillatorSourceNode.frequency = midiNoteNumberToFrequency(REFERENCE_NOTE_NUMBER);
		// create the oscillator gain node
		array[index].oscillatorGainNode = window.audioCtx.createGain();
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
		var callTime = window.audioCtx.currentTime;
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
		var callTime = window.audioCtx.currentTime;
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
	this.outputGainNode = window.audioCtx.createGain();
	this.outputGainNode.connect(window.audioCtx.masterVolumeNode);
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
	'IntlBackslash' : 60,	// C4
	'KeyA' : 61,	// C#
	'KeyZ' : 62,	// D
	'KeyS' : 63,	// D#
	'KeyX' : 64,	// E
	'KeyC' : 65,	// F
	'KeyF' : 66,	// F#
	'KeyV' : 67,	// G
	'KeyG' : 68,	// G#
	'KeyB' : 69,	// A 440
	'KeyH' : 70,	// A#
	'KeyN' : 71,	// B
	'KeyM' : 72,	// C5
	'KeyK' : 73,	// C#
	'Comma' : 74,	// D
	'KeyL' : 75,	// D#
	'Period' : 76,	// E
	'Slash' : 77,	// F
	'Quote' : 78,	// F#
	// top row
	'KeyQ' : 72,	// C5
	'Digit2' : 73,	// C#
	'KeyW' : 74,	// D
	'Digit3' : 75,	// D#
	'KeyE' : 76,	// E
	'KeyR' : 77,	// F
	'Digit5' : 78,	// F#
	'KeyT' : 79,	// G
	'Digit6' : 80,	// G#
	'KeyY' : 81,	// A
	'Digit7' : 82,	// A#
	'KeyU' : 83,	// B
	'KeyI' : 84,	// C6
	'Digit9' : 85,	// C#
	'KeyO' : 86,	// D
	'Digit0' : 87,	// D#
	'KeyP' : 88,	// E
	'BracketLeft' : 89,	// F
	'Equal' : 90,	// F#
	'BracketRight' : 90,	// G	
}
