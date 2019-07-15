function onLoad() {
  cellularAutomaton = new CellularAutomaton('cellular-automaton', 240, 135, 40, 5, 5);
  cellularAutomaton.appendAsChildOfElementWithId('body');
}

// Adapted from Jon Kantner's function at https://css-tricks.com/converting-color-spaces-in-javascript/#article-header-id-11
// Parameters:
// h = hue (degrees)
// s = saturation [0, 1)
// l = lightness [0, 1)
// Returns an object {r, g, b} containg the converted RGB values
function HSLToRGB(h,s,l) {

  // bring h into the range [0, 360)
  h %= 360.0;
  if (h < 0) {h += 360.0;}

  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0,
      g = 0,
      b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return {r, g, b};
}

// class defining convolution matrices
class ConvolutionMatrix {
  // Takes the "radius" of the matrix in each dimension as parameter, i.e. the number of
  // cells from the centre cell to the edge, including the centre cell
  constructor(_radiusX, _radiusY) {
    this.radiusX = _radiusX;
    this.radiusY = _radiusY;
    // calculate the size of the matrix in each dimension
    this.sizeX = _radiusX * 2 - 1;
    this.sizeY = _radiusY * 2 - 1;
    // create the matrix
    this.matrixElement = new Array(this.sizeX);
    for(var x = 0; x < this.sizeX; x++) {
      this.matrixElement[x] = new Array(this.sizeY);
    }
  }
  
  // method to randomise the matrix values to values in the range [-1, 1)
  randomise() {
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        this.matrixElement[mX][mY] = 2*Math.random() - 1;
      }
    }      
  }

  // returns the sum of all the values in the matrix
  getSum() {
    var sum = 0;
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        sum += this.matrixElement[mX][mY];
      }
    }    
    return sum;
  }

  // returns 1 or -1, depending on the sign of the matrix's sum.
  // If the sum is zero, returns 1
  getSign() {
    return (this.getSum() >= 0) ? 1 : -1;
  }

  // returns the sum of all the *absolute* values in the matrix
  getAbsSum() {
    var absSum = 0;
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        absSum += Math.abs(this.matrixElement[mX][mY]);
      }
    }    
    return absSum;
  }

  // returns the sum of all the values in the matrix
  getRms() {
    var sumOfSquares = 0;
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        sumOfSquares += this.matrixElement[mX][mY] ** 2;
      }
    }
    return Math.sqrt(sumOfSquares / (this.sizeY * this.sizeY));
  }

}

// class defining an option for the post-convolution function
class PostConvolutionFunctionOption {
  constructor(_name, _function, _selectorHtml) {
    // the name of the option (string)
    this.name = _name;
    // the function itself (function with one scalar number input, returns one scalar number)
    this.f = _function;
    // HTML representation of the function
    this.selectorHtml = _selectorHtml
  }
}

// class defining Cellular Automaton
class CellularAutomaton {

  get currentDisplayStep() {
    return this.step[this.currentDisplayStepIndex];
  }

  get currentReferenceStep() {
    return this.step[this.currentReferenceStepIndex];
  }

  get currentWorkingStep() {
    return this.step[this.currentWorkingStepIndex];
  }

  // read the UI value of parameter "coefficient p", used in the post-convolution function
  readCoefficientPInput() {
    this._coefficientP = this.controlPanel.coefficientPInput.value;
  }

  // read the UI value of parameter "offset k", used in the post-convolution function
  readOffsetKInput() {
    this._offsetK = this.controlPanel.offsetKInput.value;
  }
  
  // getter that retrieves the value of the psuedo-private property _coefficientP
  get coefficientP() {return this._coefficientP;}

  // set the value of parameter "coefficient p", used in the post-convolution function, and
  // update its value in the UI
  set coefficientP(p) {
    this.controlPanel.coefficientPInput.value = p;
    this._coefficientP = p;
  }

  // getter that retrieves the value of the psuedo-private property _offsetK
  get offsetK() {return this._offsetK;}

  // set the value of parameter "offset k", used in the post-convolution function, and
  // update its value in the UI
  set offsetK(k) {
    this.controlPanel.offsetKInput.value = k;
    this._offsetK = k;
  }

  get iterationCount() {return this._iterationCount;}

  set iterationCount(n) {
    this._iterationCount = n;
    this.iterationCounter.innerText = n.toString();
  }

  get hueCentre() {return this._hueCentre;}

  set hueCentre(h) {
    this.controlPanel.hueCentreInput.value = h;
    this._hueCentre = h;
  }

  constructor(_id, _gridSizeX, _gridSizeY, _minimumStepDuration = 40, _convolutionMatrixRadiusX = 3, _convolutionMatrixRadiusY = 3, _stepCount = 2) {
    // used to pass this object into child objects.
    var _this = this;

    // create the control panel (not added to the document at this point).
    this.createControlPanel();

    // transfer input variables to object properties
    // ID for the cellularAutomaton object
    this.id = _id
    // width of the automaton's grid
    this.gridSizeX = _gridSizeX;
    // height of the automaton grid
    this.gridSizeY = _gridSizeY;
    // minumum duration of each step, in milliseconds
    this.minimumStepDuration = _minimumStepDuration;
    // number of steps stored by the automaton. Larger numbers allow more
    // history to be considered in the convolution, as well as more buffering.
    this.stepCount = _stepCount;
    // boolean, keeps track of whether the automaton is currently playing
    this.isPlaying = false;


    // psuedo-private properties. Do not access directly, use their getters and setters instead.
    this._coefficientP;
    this._offsetK;
    this._iterationCount;

    // set up the convolution matrix
    this.convolutionMatrix = new ConvolutionMatrix(_convolutionMatrixRadiusX, _convolutionMatrixRadiusY);
    this.convolutionMatrix.randomise();

    // Set the iteration count to zero
    this.iterationCount = 0;

    // ****************************************************************************************************
    // *** PARAMETERS *************************************************************************************
    // ****************************************************************************************************

    // initial values for post-convolution function parameters
    this.coefficientP = 0.5;
    this.offsetK = 0.0;
    // colour variables
    this.hueCentre = 0;
    this.hueSpreadCoefficient = 60; // [0,)
    this.lightnessSpread = 0.2 // [-0.5, 0.5]
    this.saturationSpread = 0.1 // [0, 1]

    // ****************************************************************************************************
    // ****************************************************************************************************
    // ****************************************************************************************************

    // set up a canvas to draw on.
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.gridSizeX;
    this.canvas.height = this.gridSizeY;
    this.canvas.context = this.canvas.getContext('2d');
    // a method we can call to draw image data into the canvas 
    this.canvas.drawNextStep = function() {
      // increment the current display index (returning to zero if needed)
      _this.currentDisplayStepIndex++;
      _this.currentDisplayStepIndex %= _this.stepCount;
      // request to draw the image data anu
      window.requestAnimationFrame(
        function() {
          _this.canvas.context.putImageData(_this.currentDisplayStep.imageData, 0, 0)
          document.body.style.backgroundImage = 'url("' + _this.canvas.toDataURL('image/png') + '")';
        }
      );
    }

    // make each step an item in an array
    this.step = new Array(this.stepCount);
    // for each step, set up a grid of cells
    // a single cell can be accessed with: this.step[n].cell[x][y]
    for(var n = 0; n < this.stepCount; n++) {
      this.step[n] = new Object();
      this.step[n].cell = new Array(this.gridSizeX);
      for(var x = 0; x < this.gridSizeX; x++) {
        this.step[n].cell[x] = new Array(this.gridSizeY);
      }
      // an ImageData object the same size as the canvas, where the output image for the step can be constructed.
      this.step[n].imageData = this.canvas.context.createImageData(this.canvas.width, this.canvas.height);
    }
    // initially set to -1, as it is incremented to 0 the first time the draw function is called.
    this.currentDisplayStepIndex = - 1;
    this.currentReferenceStepIndex = 0;
    this.currentWorkingStepIndex = 1;


/*
    // Sand dunes
    [-0.7 , 0.0 , 0.0 , 0.0 ,-0.4 ],
    [ 0.0 , 0.0 , 0.0 ,-1.0 , 0.0 ],
    [ 0.6 , 0.9 , 0.0 , 0.0 , 0.0 ],
    [ 0.0 , 0.0 , 1.0 , 0.0 , 0.0 ],
    [ 0.0 , 0.0 , 0.5 , 0.0 , 0.5 ]

    [-1.0 , 1.0 ,-1.0 , 0.0 ,-1.0 ],
    [ 1.0 ,-1.0 , 1.0 ,-1.0 , 1.0 ],
    [-1.0 , 1.0 , 0.0 , 1.0 ,-1.0 ],
    [ 1.0 ,-1.0 , 1.0 ,-1.0 , 1.0 ],
    [-1.0 , 1.0 ,-1.0 , 1.0 ,-1.0 ]

    // Cool angular lava lamp kinda thing
    [ -0.750019416777183    ,  0.009474266756965832 , -0.9654057969857419  , -0.12490011253655675 , -0.382166568670975   ],
    [  0.012442289392388783 , -0.9023721786291801   , -0.6564885023370088  , -0.8509354101711124  ,  0.39976776743117526 ],
    [ -0.28377104218030924  , -0.373657054578846    , -0.3470274581705173  ,  0.04544723631143199 , -0.1935234800936052  ],
    [  0.4409330735057848   ,  0.47942838267554455  , -0.16806472901478653 ,  0.7669771211698158  , -0.4852550535434661  ],
    [  0.0681379246217424   , -0.08346468578764377  ,  0.41774494253850936 , -0.7299587999242467  , -0.7044833430730679  ]
*/

    // options for the post-convolution function
    this.postConvolutionFunctionOption = [
      new PostConvolutionFunctionOption('linear', function(x) {return _this.coefficientP*x - _this.offsetK;}, '<span class="function-parameter">p</span>*<span class="function-variable">x</span> + <span class="function-parameter">k</span>'),
      new PostConvolutionFunctionOption('sine', function(x) {return Math.sin(_this.coefficientP*x - _this.offsetK);}, 'sin(<span class="function-parameter">p</span>*<span class="function-variable">x</span>) + <span class="function-parameter">k</span>'),
      new PostConvolutionFunctionOption('cosine', function(x) {return Math.cos(_this.coefficientP*x - _this.offsetK);}, 'cos(<span class="function-parameter">p</span>*<span class="function-variable">x</span>) + <span class="function-parameter">k</span>'),
      // N.B. Theoretically, tan can return undefined values, so we handle these by turning them into zeros.
      new PostConvolutionFunctionOption('tangent', function(x) {var tanResult = Math.tan(_this.coefficientP * x - _this.offsetK); return isNaN(tanResult) ? _this.offsetK : tanResult + _this.offsetK;}, 'tan(<span class="function-parameter">p</span>*<span class="function-variable">x</span>) + <span class="function-parameter">k</span>'),
      new PostConvolutionFunctionOption('s-curve', function(x) {return 2/(1 + Math.exp(-_this.coefficientP * x - _this.offsetK)) - 1}, '2/(1 + e<sup>(<span class="function-parameter">p</span>*<span class="function-variable">x</span> - <span class="function-parameter">k</span>)</sup>) - 1')
    ]
    // pick one as the default
    this.postConvolutionFunction = this.postConvolutionFunctionOption[4].f;

    // randomise the grid
    this.randomiseGrid();

  }

  // randomises the cell values of all steps
  randomiseGrid() {
    for(var n = 0; n < this.stepCount; n++) {
      for(var x = 0; x < this.gridSizeX; x++) {
        for(var y = 0; y < this.gridSizeX; y++) {
          this.step[n].cell[x][y] = 2*Math.random() - 1;
        }
      }
    }
    this.iterationCount = 0;
  }

  createControlPanel() {
    // use the following to pass the parent object to functions etc.
    var _this = this;

    function addControlButton(_buttonHTML, _onclickFunction) {
      var newButton = document.createElement('button')
      newButton.innerHTML = _buttonHTML;
      newButton.onclick = _onclickFunction;
      newButton.className = "cellular-automaton-control-button";
      _this.controlPanel.appendChild(newButton);
      return newButton;
    }

    // Create a div to contain the control panel
    this.controlPanel = document.createElement('div');
    this.controlPanel.id = this.id + '-control-panel';
    this.controlPanel.className = 'cellular-automaton-control-panel';
    // Add control buttons
    // buttonText (string) : the innerText of the button
    // onClickFunction (function) : the onClick function of the button
    this.controlPanel.playButton = addControlButton('Play', function() {_this.play()});
    this.controlPanel.pauseButton = addControlButton('Pause', function() {_this.pause()});
    this.controlPanel.randomiseGridButton = addControlButton('Randomise <u>G</u>rid', function() {_this.randomiseGrid()});
    this.controlPanel.randomiseConvolutionMatrixButton = addControlButton('Randomise Convolution <u>M</u>atrix', function() {_this.convolutionMatrix.randomise()});
    // Add parameter inputs
    var addNumberInput = function(_inputId, _labelText, _onchangeFunction, _step = 0.01) {
      var labelElement;
      labelElement = document.createElement("label");
      labelElement.htmlFor = _inputId;
      labelElement.innerText = _labelText;
      labelElement.className = "cellular-automaton-number-input-label";
      _this.controlPanel.appendChild(labelElement);
      var inputElement = document.createElement("input");
      inputElement.type = "number";
      inputElement.id = _inputId;
      inputElement.step = _step;
      inputElement.onchange = _onchangeFunction;
      inputElement.className = "cellular-automaton-number-input";
      _this.controlPanel.appendChild(inputElement);
      return inputElement;
    }
    _this.controlPanel.coefficientPInput = addNumberInput("coefficient-p", "p =", function() {_this._coefficientP = this.value});
    _this.controlPanel.offsetKInput = addNumberInput("offset-k", "k =", function() {_this._offsetK = this.value});
    // Add the iteration counter
    var iterationCounterParagraph = document.createElement("p");
    iterationCounterParagraph.innerText = "Iterations: ";
    _this.iterationCounter = document.createElement("span");
    _this.iterationCounter.id = "iteration-count";
    iterationCounterParagraph.appendChild(_this.iterationCounter);
    _this.controlPanel.appendChild(iterationCounterParagraph);
    // colour controls
    _this.controlPanel.hueCentreInput = addNumberInput("hue-centre", "Hue", function() {var v = this.value %= 360; v = v < 0 ? v + 360 : v; _this._hueCentre = v; this.value = v; this.style.borderColor = 'hsl(' + v  + ' deg, 100%, 50%)';}, 1)

    // set up keyboard shortcuts
    window.onkeydown = function(e) {
      switch(e.key) {
        case " ": case "Spacebar":
          if (_this.isPlaying) {
            _this.pause();
          } else {
            _this.play();
          }
        break;
        case "m": case "M": _this.convolutionMatrix.randomise(); break;
        case "g": case "G": _this.randomiseGrid(); break;
        case "p": case "P": _this.controlPanel.coefficientPInput.focus(); break;
        case "-": case "_": _this.coefficientP *= -1; break;
        case "k": case "K": _this.controlPanel.offsetKInput.focus(); break;
        case "h": case "H": _this.controlPanel.hueCentreInput.focus(); break;
        case "c": case "C": 
          if(_this.controlPanel.style.visibility == 'hidden') {
            _this.controlPanel.style.visibility = 'visible';
            document.body.style.cursor = 'inherit';
          }
          else {
            _this.controlPanel.style.visibility = 'hidden';
            document.body.style.cursor = 'none';
          }
        break;
      }
    }
  }

  // appends the display to the given element.
  appendAsChildOfElementWithId(elementId) {

    // Create a containing div
    this.containerDiv = document.createElement('div');
    this.containerDiv.id = this.id;
    this.containerDiv.className = 'cellular-automaton';
    
    // Append control panel as child elements of the container div.
    this.containerDiv.appendChild(this.controlPanel);

    // Append canvas as a child elementa of the div.
    this.containerDiv.appendChild(this.canvas);

    // add the container div to the document
    document.getElementById(elementId).appendChild(this.containerDiv);
  }

  // advance to the next step
  advanceStep() {
    // draw the next step's imagedata to the canvas
    this.canvas.drawNextStep();

    // increment the iteration count
    this.iterationCount++;

    // calculate the next step's grid
    var imageDataPointer = 0;
    for(var gridY = 0; gridY < this.gridSizeY; gridY++) {
      for(var gridX = 0; gridX < this.gridSizeX; gridX++) {
        var cumulativeTotal = 0;
        for(var matrixY = 0; matrixY < this.convolutionMatrix.sizeY; matrixY++) {
          for(var matrixX = 0; matrixX < this.convolutionMatrix.sizeX; matrixX++) {
            var x = (gridX - this.convolutionMatrix.radiusX + matrixX + 1 + this.gridSizeX) % this.gridSizeX;
            var y = (gridY - this.convolutionMatrix.radiusY + matrixY + 1 + this.gridSizeY) % this.gridSizeY;
            cumulativeTotal += this.convolutionMatrix.matrixElement[matrixX][matrixY]*this.currentReferenceStep.cell[x][y];
          }
        }
        // pass the result of the matrix convolution through the post-convolution function
        var _value = this.postConvolutionFunction(cumulativeTotal)
        // store the value in the corresponding cell in the next step
        this.currentWorkingStep.cell[gridX][gridY] = _value;
        // set the corresponding pixel in the image data array
        var rgbValues = HSLToRGB( this.hueCentre + (_value*this.hueSpreadCoefficient), 1 - Math.abs(_value*this.saturationSpread), (_value*this.lightnessSpread) + 0.5);
        this.currentWorkingStep.imageData.data[imageDataPointer] = rgbValues.r; //red
        imageDataPointer++;
        this.currentWorkingStep.imageData.data[imageDataPointer] = rgbValues.g; //green
        imageDataPointer++;
        this.currentWorkingStep.imageData.data[imageDataPointer] = rgbValues.b; // blue
        imageDataPointer++;
        this.currentWorkingStep.imageData.data[imageDataPointer] = 255;         // alpha
        imageDataPointer++;
      }
    }

    // move to the next step
    this.currentWorkingStepIndex++;
    this.currentWorkingStepIndex %= this.stepCount;
    this.currentReferenceStepIndex++;
    this.currentReferenceStepIndex %= this.stepCount;
    
  }

  // start the automaton
  play() {
    // a timerInterval drives the process. Check that it does not already exist; if it does not, create it. Otherwise do nothing.
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.controlPanel.playButton.classList.add('active');
      this.controlPanel.pauseButton.classList.remove('active');
      // start the loop at the next animation frame
      var _this = this;
      this.stepTimer = window.setInterval(function(){_this.advanceStep()}, _this.minimumStepDuration);
    }
  }

  // pause the automaton
  pause() {
    // a timerInterval drives the process. Check that it exists; if it does, clear it and make its ID variable undefined. Otherwise do nothing.
    if (this.isPlaying) {
      this.isPlaying = false;
      this.controlPanel.pauseButton.classList.add('active');
      this.controlPanel.playButton.classList.remove('active');
      var _this = this;
      window.clearInterval(_this.stepTimer);
    }
  }

}
