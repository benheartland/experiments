// GLOBALS
const PITCH_DIVISIONS_PER_OCTAVE = 12; 			// normally 12 semitones per octave
const PITCH_DIVISION_RATIO = 2 ** (1/PITCH_DIVISIONS_PER_OCTAVE);
const REFERENCE_FREQUENCY = 440;				// Standard A = 440Hz
const REFERENCE_NOTE_NUMBER = 69;				// MIDI A4 = 69
const REFERENCE_OCTAVE_TOP_NOTE_NUMBER = REFERENCE_NOTE_NUMBER + PITCH_DIVISIONS_PER_OCTAVE;
// default envelope settings
const DEFAULT_ATTACK_TIME = 0.02;
const DEFAULT_DECAY_TIME = 0.2;
const DEFAULT_SUSTAIN_RATIO = 0.75;
const DEFAULT_RELEASE_TIME = 0.02;
// oscillator constants
const OSCILLATOR_COUNT = PITCH_DIVISIONS_PER_OCTAVE * 2 + 1;	// development only
const DEFAULT_OSCILLATOR_WAVEFORM = 'sine';
const DEFAULT_OSCILLATOR_COUNT = 2;

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

// instrument constructor
function instrument() {
	this.voice = new Array();
}

// synth voice constructor
function synthVoice(oscillatorCount = DEFAULT_OSCILLATOR_COUNT, waveform = DEFAULT_OSCILLATOR_WAVEFORM) {
	this.gain = audioCtx.createGain();
	this.gain.envelope = new envelopeADSR();
	this.filter = audioCtx.createBiquadFilter();
	this.filter.type = 'lowpass';
	this.filter.frequency = 1000;
	this.filterQ = 1;
	this.filter.envelope = new envelopeADSR();
	this.filter.connect(this.gain, 0, 0);
	this.oscillator = new Array(oscillatorCount);
	this.oscillator.forEach(function(value, index, array) {
		this.oscillatorNode = audioCtx.createOscillator();
		this.gainNode = audioCtx.createGain();
		this.oscillatorNode.connect(gainNode);
		this.type = waveform;
		this.frequency = midiNoteNumberToFrequency(REFERENCE_NOTE_NUMBER);
		this.gainNode.connect(filter, 0, 0);
	}, array[index]);
}

function midiNoteNumberToFrequency(n) {
	var octave = 0;
	var noteClass = n;
	while(noteClass < REFERENCE_NOTE_NUMBER) {
		noteClass += PITCH_DIVISIONS_PER_OCTAVE;
		octave --;
	}
	while(noteClass >= REFERENCE_OCTAVE_TOP_NOTE_NUMBER) {
		noteClass -= PITCH_DIVISIONS_PER_OCTAVE;
		octave ++;
	}
	console.log(octave + ' : ' + noteClass);
	return REFERENCE_FREQUENCY * (2 ** octave) * (PITCH_DIVISION_RATIO ** (noteClass - REFERENCE_NOTE_NUMBER)); // using octave limits rounding errors
}

