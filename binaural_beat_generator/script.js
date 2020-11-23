////////////////////////
// Class declarations //
////////////////////////

/*

+-----------------------------------------+
|          BinauralOscillatorNode         |
+-----------------------------------------+
|                                         |
|                frequency                |
|                    |                    |
|          +---------+---------+          |
|          |                   |          |
|  -beat_frequency/2   +beat_frequency/2  |
|          |                   |          |
|        Left                Right        |
|    OscillatorNode     OscillatorNode    |
|          |                   |          |
|          +---------+---------+          |
|                    |                    |
|            ChannelMergerNode            |
|                    |                    |
|                  Filter                 |
|                    |                    |
+--------------------|--------------------+
                  Output                  
               (2 channels)               

*/

class BinauralOscillatorNode {

  // Mimic standard AudioNode properties. These are not settable - they
  // are fixed at values which make sense for a binaural sound generator
  get numberOfInputs() {return 0}
  set numberOfInputs(n) {throw 'Attempted to set BinauralOscillatorNode.numberOfInputs. Value is fixed at ' + this.numberOfInputs + '.'}

  get numberOfOutputs() {return 1}
  set numberOfOutputs(n) {throw 'Attempted to set BinauralOscillatorNode.numberOfOutputs. Value is fixed at ' + this.numberOfOutputs + '.'}

  // Set channel count to 2, since binaural sounds fundamentally need exactly two channels
  get channelCount() {return 2}
  set channelCount(x) {throw 'Attempted to set BinauralOscillatorNode.channelCount. Value is fixed at ' + this.channelCount + '.'}

  get channelCountMode() {return 'explicit'}
  set channelCountMode(x) {throw 'Attempted to set BinauralOscillatorNode.channelCountMode. Value is fixed at "' + this.channelCountMode + '".'}

  get channelInterpretation() {return 'speakers'}
  set channelInterpretation(x) {throw 'Attempted to set BinauralOscillatorNode.channelInterpretation. Value is fixed at "' + this.channelInterpretation + '".'}

  // Mimic OscillatorNode properties
  get type() {return this.oscillatorLeft.type}
  set type(newType) {
    var allowedValue = ["sine", "square", "sawtooth", "triangle"];
    if(allowedValue.includes(newType)) {
      this.oscillatorLeft.type = newType;
      this.oscillatorRight.type = newType;
    }
    else {throw 'Attempted to set unsupported value for BinauralOscillatorNode.type. Allowed values are ' + allowedValue.join(', ') + '.'}
  }

  // Detune: not currently used, included for possible future support
  get detune() {return 0}
  set detune(d) {throw 'Attempted to set BinauralOscillatorNode.detune. Value is fixed at ' + this.detune + '.'}

  // The constructor function
  constructor(audioCtx) {

    // Used to pass the object down to child objects
    var _binauralOscillatorNode = this;

    // AudioParam-like property for the frequency of the binaural beat
    this.binauralBeatFrequency = {
      defaultValue: 0,
      minValue: 0,
      maxValue: 42,
      _value: 0,
      get value() {return this._value},
      set value(newBeatFrequency) {
        // TODO: enforce min and max values
        _binauralOscillatorNode.oscillatorRight.frequency.value = _binauralOscillatorNode.frequency.value + newBeatFrequency/2;
        _binauralOscillatorNode.oscillatorLeft.frequency.value = _binauralOscillatorNode.frequency.value - newBeatFrequency/2;
        this._value = newBeatFrequency;
      }
    };

    // Frequency
    this.frequency = {
      defaultValue: 440,
      minValue: 20,
      maxValue: 20000,
      get value() {return _binauralOscillatorNode.oscillatorLeft.frequency.value + _binauralOscillatorNode.binauralBeatFrequency.value/2},
      set value(f) {
        _binauralOscillatorNode.oscillatorLeft.frequency.value = f - _binauralOscillatorNode.binauralBeatFrequency.value/2;
        _binauralOscillatorNode.oscillatorRight.frequency.value = f + _binauralOscillatorNode.binauralBeatFrequency.value/2;
      },
      // Mimic AudioParam methods
      setValueAtTime: function(f, time) {
        _binauralOscillatorNode.oscillatorLeft.frequency.setValueAtTime(f - _binauralOscillatorNode.binauralBeatFrequency.value/2, time);
        _binauralOscillatorNode.oscillatorRight.frequency.setValueAtTime(f + _binauralOscillatorNode.binauralBeatFrequency.value/2, time);
      }
    };

    // Create the OscillatorNodes that will generate the sound
    var oscillatorOptions = {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: 'explicit',
      channelInterpretation: 'discrete',
    };
    this.oscillatorLeft = new OscillatorNode(audioCtx, oscillatorOptions);
    this.oscillatorRight = new OscillatorNode(audioCtx, oscillatorOptions);
    // The oscillators will have been created using the OscillatorNode default frequency.
    // Use the frequency.value setter to set them correctly
    this.frequency.value = this.frequency.defaultValue;

    // Create a ChannelMergerNode to mix the two oscillator signals together 
    this.mixer = new ChannelMergerNode(audioCtx, {numberOfInputs: 2, numberOfOutputs: 1, channelInterpretation: 'speakers'} );
    // Connect the nodes
    this.oscillatorLeft.connect(this.mixer, 0, 0);
    this.oscillatorRight.connect(this.mixer, 0, 1);

  }

  // METHODS

  // Mimic the setPeriodicWave() method of a OscillatorNode by passing it through to the two underlying OscillatorNodes
  setPeriodicWave(periodicWave) {
    this.oscillatorLeft.setPeriodicWave(periodicWave);
    this.oscillatorRight.setPeriodicWave(periodicWave);
  }

  // connect() method to connect this to other nodes
  connect(destination, input = null, output = null) {
    if(input === null && output === null) {this.mixer.connect(destination)}
    else if( output === null) {this.mixer.connect(destination, input)}
    else {this.mixer.connect(destination, input, output)}
  }

  start() {
    var startTime = audioCtx.currentTime + 0.01;
    this.oscillatorLeft.start(startTime);
    this.oscillatorRight.start(startTime);
  }

  stop() {
    var stopTime = audioCtx.currentTime + 0.01;
    this.oscillatorLeft.stop(stopTime);
    this.oscillatorRight.stop(stopTime);
  }

}

// Slider class
// Slider.targetParameter : the AudioParam or AudioParam-like object that the slider controls
// Slider.options : various options which govern the slider's behaviour
// Slider.UI : the HTML <div> element created by the constructor which represents the slider in the UI
class Slider {

  // Constructor function
  constructor(targetParameter, options = {}, nDivisions = 3) {

    this.UI = document.createElement('div');
    this.UI.classList.add('slider');
    // create the slider innards
    // Add the slider-inner div
    var sliderInnerDiv = document.createElement('div');
    sliderInnerDiv.classList.add('slider-inner');
    this.UI.appendChild(sliderInnerDiv);
    // Add the slide-track div
    this.UI.track = document.createElement('div');
    this.UI.track.classList.add('slider-track');
    sliderInnerDiv.appendChild(this.UI.track);
    // Create the slide-handle div but don't add it yet
    this.UI.handle = document.createElement('div');
    this.UI.handle.classList.add('slider-handle');

    // TODO: Add a centre line to the handle

    // Circular references needed in UI event handlers
    this.UI.theSlider = this;
    this.UI.handle.theSlider = this;

    // Set the slider's target parameter
    this.setTargetParameter(targetParameter);

    // Set the slider's options
    this.setOptions(options);

    // Draw the slider's scale
    this.drawScale(nDivisions);

    // Add the slide-handle div. We do this last so that it is drawn last.
    this.UI.track.appendChild(this.UI.handle);

    this.syncUIToTargetParameter();

    // Add the mouse down event listener to the slider handle
    this.UI.handle.addEventListener('mousedown', this.sliderHandleMouseDown);

  }
  // End of constructor

  setTargetParameter(targetParameter) {
    if(targetParameter === undefined || targetParameter === null) {throw 'Slider.setTargetParameter() requires a targetParameter.'}
    this.targetParameter = targetParameter;
  }

  setOptions(options = {}) {
    /* The options object:
        minValue (Optional. Defaults to targetParameter.minValue)
        maxValue (Optional. Defaults to targetParameter.maxValue)
        rule (Optional. Defaults to 'linear')
        responseFunction, inverseResponseFunction (Optional. If both supplied, sets rule to 'custom'. 
            Any value for 'rule' included in options is ignored. If only one is supplied, it is ignored).
    */
    // responseFunction converts the normalised slider value [0,1] into the actual value needed by the targetParameter
    // If responseFunction AND inverseResponseFunction are explicitly supplied, use them and set options.rule = 'custom'
    if(options.minValue === undefined || options.minValue === null) {options.minValue = this.targetParameter.minValue};
    if(options.maxValue === undefined || options.maxValue === null) {options.maxValue = this.targetParameter.maxValue};
    if(options.responseFunction && options.inverseResponseFunction) {
      options.rule = 'custom';
    }
    // Otherwise, set them using options.rule
    else {
      switch (options.rule) {
        // The default response is linear
        case 'linear', null, undefined:
          options.rule = 'linear';
          options.responseFunction = function(normalisedValue) {return (this.maxValue - this.minValue) * normalisedValue + this.minValue};
          options.inverseResponseFunction = function(parameterValue) {return (parameterValue - this.minValue)/(this.maxValue - this.minValue)};
          break;
        case 'log':
          options.responseFunction = function(normalisedValue) {return this.minValue * Math.pow(2, normalisedValue*Math.log2(this.maxValue/this.minValue))};
          options.responseFunction = function(normalisedValue) {return this.minValue * Math.pow(this.maxValue/this.minValue, normalisedValue)};
          options.inverseResponseFunction = function(parameterValue) {return Math.log2(parameterValue/this.minValue)/Math.log2(this.maxValue/this.minValue)};
          break;
        default:
          throw 'Unknown rule "' + options.rule + '" specified in setSliderOptions() options.';
      }
    }
    // attach the options object to the slider object
    this.options = options;
  }

  // Draw a numeric calibrations on the slider. Number of labels drawn will be (nDivisions + 1)
  // (one per division plus one on the end).
  drawScale(nDivisions = 3) {
    // TODO: check for slider.options and all required properties. Throw an error if not defined.

    // Handy reference used below
    var theSlider = this;

    // TODO: remove any existing 'slider-scale-label' elements

    // Set up labels (calibrations) on the slider track
    function drawScaleLabel(x) {
      var label = document.createElement('div');
      label.classList.add('slider-scale-label');
      // position the label
      label.style.left = (x*100) + '%';
      // Decimal precision of the label text adapts to maxValue
      var precision = Math.max(0, -Math.floor(Math.log10(theSlider.options.maxValue))+1);
      label.innerText = (theSlider.options.responseFunction(x)).toFixed(precision);
      // add the label
      theSlider.UI.track.appendChild(label);
    }

    // Draw labels 1 to nDivisions
    for(var i = 0; i < nDivisions; i++) {
      drawScaleLabel(i*1.0/nDivisions);
    }
    // Draw the final label
    drawScaleLabel(1.0);

  }

  syncUIToTargetParameter() {
    this.UI.handle.style.left = (this.options.inverseResponseFunction(this.targetParameter.value) * 100) + '%';
    // TODO: handle out-of-range results
  }

  syncTargetParameterToUI() {
    this.targetParameter.value = (this.options.responseFunction((this.UI.handle.getBoundingClientRect().x - this.UI.track.getBoundingClientRect().x)/this.UI.track.clientWidth) * 100) + '%';
    // TODO: handle out-of-range results
  }

  // Handler for a mousedown event on the "slider-handle" HTML div element.
  // (Note: It is ambiguous whether 'Handle' in the function name is the noun or the verb)
  sliderHandleMouseDown(mouseDownEvent) {
    // Only respond to the main button (see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button)
    if(mouseDownEvent.button === 0) {

      // A reference needed below
      // N.B. In UI event handlers, 'this' refers to the event target; in this case, the "slider-handle"
      // HTML div element, NOT the slider object, hence the need for this reference.
      var theSlider = this.theSlider;

      // A function to handle mouse moves while grabbing the slider
      function sliderMouseMove(mouseMoveEvent) {
        // normalisedValue is the slider position on a linear scale from 0 to 1
        var normalisedValue = (mouseMoveEvent.clientX - mouseDownEvent.offsetX - mouseDownEvent.target.parentNode.getBoundingClientRect().x)/mouseDownEvent.target.parentNode.clientWidth;
        normalisedValue = Math.min(Math.max(normalisedValue, 0), 1);
        mouseDownEvent.target.style.left = (normalisedValue * 100) + '%';
        // set the target parameter using the options object  defined on the great-grandparent slider div
        theSlider.targetParameter.value = theSlider.options.responseFunction(normalisedValue);
        // Prevent any default action of the mouse move event (e.g. text selection)
        mouseMoveEvent.preventDefault();
      }
    
      // A function to handle the mouse up event
      function sliderMouseUp(mouseUpEvent) {
        if(mouseDownEvent.button === 0) {
          // Remove all 'while grabbing' styling
          mouseDownEvent.target.classList.remove('sliding');
          document.body.style.cursor = '';
          // Remove the event mouse move and mouse up listeners from the window
          window.removeEventListener('mousemove', sliderMouseMove)
          window.removeEventListener('mouseup', sliderMouseUp)
          // Prevent any default action of the mouse up event
          mouseUpEvent.preventDefault();
        }
      }

      // change the slider's style to indicate that it is active
      mouseDownEvent.target.classList.add('sliding');
      // set the cursor to grabbing for the window also
      document.body.style.cursor = 'grabbing';

      // Add the event listeners for moving the mouse and releasing the main button.
      // These events may happen outside the slider, so we add the listeners to the
      // whole window.
      window.addEventListener('mousemove', sliderMouseMove);
      window.addEventListener('mouseup', sliderMouseUp);
      // Prevent the default effect of the mouse down event to stop e.g. text being selected while the use drags.
      mouseDownEvent.preventDefault();
    }
  
  }

}
// End of Slider class declaration

/////////////////////
// Event functions //
/////////////////////

// DO STUFF!

//////////////////////////////////
// Set up the audio environment //
//////////////////////////////////

// create an audio context
let audioCtx = new AudioContext()
// Create an instance of a BinauralOscillatorNode
var binauralOscillator = new BinauralOscillatorNode(audioCtx);
// connect the BinauralOscillatorNode to a GainNode for volume control
var volumeNode = new GainNode(audioCtx);
// Lowpass filter for anti-aliasing
var antialiasingFilterNode = new BiquadFilterNode(audioCtx);
antialiasingFilterNode.type = 'lowpass';
antialiasingFilterNode.frequency.value = Math.min(antialiasingFilterNode.frequency.maxValue, audioCtx.sampleRate/2);

// Set some starting values
volumeNode.gain.value = 0.05;
binauralOscillator.frequency.value = 110;
binauralOscillator.binauralBeatFrequency.value = 4;

// Connect up the nodes
binauralOscillator.connect(volumeNode);
volumeNode.connect(antialiasingFilterNode);
antialiasingFilterNode.connect(audioCtx.destination);

///////////////////
// Set up the UI //
///////////////////

// TODO: delete this if not needed
var transparentPixel = new Image(1,1);
transparentPixel.src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

// Set up sliders
function createSliderInElementById(elementId, targetParameter, options, nDivisions) {
  var newSlider = new Slider(targetParameter, options, nDivisions);
  document.getElementById(elementId).appendChild(newSlider.UI);
  return newSlider;
}

var volumeSlider = createSliderInElementById('volume', volumeNode.gain, {minValue: 0, maxValue: 1}, 5);
var frequencySlider = createSliderInElementById('frequency', binauralOscillator.frequency, {minValue: 55, maxValue: 3520, rule: 'log'}, 6);
var binauralBeatFrequencySlider = createSliderInElementById('binaural-beat-frequency', binauralOscillator.binauralBeatFrequency, {}, 7);

// Add a special background div for the binaural beat frequency slider
var binauralBeatFrequencySliderBackground = document.createElement('div');
binauralBeatFrequencySliderBackground.id = 'binaural-beat-frequency-slider-background';
// left
var binauralBeatFrequencySliderBackgroundLeft = document.createElement('div');
binauralBeatFrequencySliderBackgroundLeft.id = 'binaural-beat-frequency-slider-background-left';
binauralBeatFrequencySliderBackground.appendChild(binauralBeatFrequencySliderBackgroundLeft);
// right
var binauralBeatFrequencySliderBackgroundRight = document.createElement('div');
binauralBeatFrequencySliderBackgroundRight.id = 'binaural-beat-frequency-slider-background-right';
binauralBeatFrequencySliderBackground.appendChild(binauralBeatFrequencySliderBackgroundRight);
// centre
var binauralBeatFrequencySliderBackgroundCentre = document.createElement('div');
binauralBeatFrequencySliderBackgroundCentre.id = 'binaural-beat-frequency-slider-background-centre';
binauralBeatFrequencySliderBackground.appendChild(binauralBeatFrequencySliderBackgroundCentre);
// Add the background div as the first element of the slider, so that others are drawn over it.
binauralBeatFrequencySlider.UI.prepend(binauralBeatFrequencySliderBackground);



// Set up Start and Stop buttons

// The start button starts the audio context and the binaural oscillator
let startButton = document.getElementById('start-button');
startButton.addEventListener('click', event => {
  // The browser may have prevented the audio context from starting 
  // without any user interaction on the page. Check for this and start
  // it if not running.
  if(audioCtx.state != 'running') {audioCtx.resume()};
  // Start the binaural oscillator
  window.binauralOscillator.start();
  // Disable the start button
  startButton.disabled = true;
});

// The Stop button stops the entire audio context
let stopButton = document.getElementById('stop-button');
stopButton.addEventListener('click', event => {
  window.binauralOscillator.stop();
  audioCtx.close();
  // Disable the stop button
  stopButton.disabled = true;
});

