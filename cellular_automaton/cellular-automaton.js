function onLoad() {
  cellularAutomaton = new CellularAutomaton('cellular-automaton', 200, 200, 200, 9, 9);
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
  if (h < 0) {
    h = 360 + (h % 360);
  } else {
    h = h % 360;
  }

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

  get currentDrawingStep() {
    return this.step[this.currentDrawingStepIndex];
  }

  // read the UI value of parameter "coefficient p", used in the post-convolution function
  readCoefficientPInput() {
    this._coefficientP = this.controlPanel.coefficentPInput.value;
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
    this.controlPanel.coefficentPInput.value = p;
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

  constructor(_id, _gridSizeX, _gridSizeY, _minimumStepDuration = 40, _convolutionMatrixRadiusX = 3, _convolutionMatrixRadiusY = 3, _stepCount = 2) {
    // used to pass this object into child objects.
    var cellularAutomaton = this;

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


    // psuedo-private properties. Do not access directly, use their getters and setters instead.
    this._coefficientP;
    this._offsetK;
    this._iterationCount;

    // set up the convolution matrix
    this.convolutionMatrix = new ConvolutionMatrix(_convolutionMatrixRadiusX, _convolutionMatrixRadiusY);
    this.convolutionMatrix.randomise();

    // create the control panel (not added to the document at this point).
    this.createControlPanel();

    // Set initial values for post-convolution function parameters
    this.coefficientP = 0.2;
    this.offsetK = 0.0;
    // Set the iteration count to zero
    this.iterationCount = 0;

    // make each step an item in an array
    this.currentDrawingStepIndex = 0;
    this.step = new Array(this.stepCount);
    // for each step, set up a grid of cells
    // a single cell can be accessed with: this.step[n].cell[x][y]
    for(var n = 0; n < this.stepCount; n++) {
      this.step[n] = new Object();
      this.step[n].cell = new Array(this.gridSizeX);
      for(var x = 0; x < this.gridSizeX; x++) {
        this.step[n].cell[x] = new Array(this.gridSizeY);
//        this.step[n].cell[x].fill(0);
      }
    }

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
      new PostConvolutionFunctionOption('linear', function(x) {return cellularAutomaton.coefficientP*x + cellularAutomaton.offsetK;}, '<span class="function-parameter">p</span>*<span class="function-variable">x</span> + <span class="function-parameter">k</span>'),
      new PostConvolutionFunctionOption('sin', function(x) {return Math.sin(cellularAutomaton.coefficientP*x) + cellularAutomaton.offsetK;}, 'sin(<span class="function-parameter">p</span>*<span class="function-variable">x</span>) + <span class="function-parameter">k</span>'),
      new PostConvolutionFunctionOption('cos', function(x) {return Math.cos(cellularAutomaton.coefficientP*x) + cellularAutomaton.offsetK;}, 'cos(<span class="function-parameter">p</span>*<span class="function-variable">x</span>) + <span class="function-parameter">k</span>'),
      // N.B. Theoretically, tan can return undefined values, so we handle these by turning them into zeros.
      new PostConvolutionFunctionOption('tan', function(x) {var tanResult = Math.tan(cellularAutomaton.coefficientP * x); return isNaN(result) ? cellularAutomaton.offsetK : tanResult + cellularAutomaton.offsetK;}, 'tan(<span class="function-parameter">p</span>*<span class="function-variable">x</span>) + <span class="function-parameter">k</span>')
    ]
    // pick one as the default
    this.postConvolutionFunction = this.postConvolutionFunctionOption[1].f;

    // set up a canvas to draw on.
    this.zoom = 4;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.gridSizeX;
    this.canvas.height = this.gridSizeY;
    this.canvas.context = this.canvas.getContext('2d');
    // an ImageData object the same size as the canvas, where the output image can be constructed.
    this.canvas.imageData = this.canvas.context.createImageData(this.canvas.width, this.canvas.height);
    // a method we can call to draw the image data into the canvas 
    this.canvas.drawImageData = function() {
      this.context.putImageData(this.imageData, 0, 0);
    }

    // using CSS zoom gives nicely interpolated zooming, at least in Chrome
    this.canvas.style.transformOrigin = 'top left';
    this.canvas.style.transform = 'scale(' + this.zoom + ')';

    // hue (colour) variables
    this.hueCentre = 30; // [0, 360)
    this.hueSpreadCoefficient = 30; // [0,)

    // draw the current state
    this.canvas.drawImageData();

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
    this.canvas.drawImageData();
    this.iterationCount = 0;
  }

  createControlPanel() {
    // use the following to pass the parent object to functions etc.
    var _cellularAutomaton = this;
    // Create a div to contain the control panel
    this.controlPanel = document.createElement('div');
    this.controlPanel.id = this.id + '-control-panel';
    this.controlPanel.className = 'cellular-automaton-control-panel';
    // Add control buttons
    // buttonText (string) : the innerText of the button
    // onClickFunction (function) : the onClick function of the button
    var addControlButton = function(_buttonHTML, _onclickFunction) {
      var newButton = document.createElement('button')
      newButton.innerHTML = _buttonHTML;
      newButton.onclick = _onclickFunction;
      newButton.className = "cellular-automaton-control-button";
      _cellularAutomaton.controlPanel.appendChild(newButton);
      return newButton;
    }
    this.controlPanel.playButton = addControlButton('Play', function() {_cellularAutomaton.play()});
    this.controlPanel.pauseButton = addControlButton('Pause', function() {_cellularAutomaton.pause()});
    this.controlPanel.randomiseGridButton = addControlButton('Randomise <u>G</u>rid', function() {_cellularAutomaton.randomiseGrid()});
    this.controlPanel.randomiseConvolutionMatrixButton = addControlButton('Randomise Convolution <u>M</u>atrix', function() {_cellularAutomaton.convolutionMatrix.randomise()});
    // Add parameter inputs
    var addNumberInput = function(_inputId, _labelText, _onchangeFunction, _step = 0.01) {
      var labelElement;
      labelElement = document.createElement("label");
      labelElement.htmlFor = _inputId;
      labelElement.innerText = _labelText;
      labelElement.className = "cellular-automaton-number-input-label";
      _cellularAutomaton.controlPanel.appendChild(labelElement);
      var inputElement = document.createElement("input");
      inputElement.type = "number";
      inputElement.id = _inputId;
      inputElement.step = _step;
      inputElement.onchange = _onchangeFunction;
      inputElement.className = "cellular-automaton-number-input";
      _cellularAutomaton.controlPanel.appendChild(inputElement);
      return inputElement;
    }
    _cellularAutomaton.controlPanel.coefficentPInput = addNumberInput("coefficient-p", "p =", function() {_cellularAutomaton._coefficientP = this.value});
    _cellularAutomaton.controlPanel.offsetKInput = addNumberInput("offset-k", "k =", function() {_cellularAutomaton._offsetK = this.value});
    // Add the iteration counter
    var iterationCounterParagraph = document.createElement("p");
    iterationCounterParagraph.innerText = "Iterations: ";
    _cellularAutomaton.iterationCounter = document.createElement("span");
    _cellularAutomaton.iterationCounter.id = "iteration-count";
    iterationCounterParagraph.appendChild(_cellularAutomaton.iterationCounter);
    _cellularAutomaton.controlPanel.appendChild(iterationCounterParagraph);

    // set up keyboard shortcuts
    _cellularAutomaton.controlPanel.onkeydown = function(e) {
      switch(e.key) {
        case " ": case "Spacebar":
          if (_cellularAutomaton.stepTimer) {
            _cellularAutomaton.pause();
          } else {
            _cellularAutomaton.play();
          }
        break;
        case "m": case "M": _cellularAutomaton.convolutionMatrix.randomise(); break;
        case "g": case "G": _cellularAutomaton.randomiseGrid(); break;
        case "p": case "P": _cellularAutomaton.controlPanel.coefficentPInput.focus(); break;
        case "k": case "K": _cellularAutomaton.controlPanel.offsetKInput.focus(); break;
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

  draw

  // advance to the next step
  advanceStep() {

    // draw the current image data to the canvas
    this.canvas.drawImageData();

    // move to the next step
    this.currentDrawingStepIndex++;
    this.currentDrawingStepIndex %= this.stepCount;

    // increment the iteration count
    this.iterationCount++;

    // calculate the next step's grid
    var imageDataPointer = 0;
    for(var y = 0; y < this.gridSizeY; y++) {
      for(var x = 0; x < this.gridSizeX; x++) {
        var cumulativeTotal = 0;
        for(var mY = 0; mY < this.convolutionMatrix.sizeY; mY++) {
          for(var mX = 0; mX < this.convolutionMatrix.sizeX; mX++) {
            var dX = (x - this.convolutionMatrix.radiusX + mX + this.gridSizeX) % this.gridSizeX;
            var dY = (y - this.convolutionMatrix.radiusY + mY + this.gridSizeY) % this.gridSizeY;
            cumulativeTotal += this.convolutionMatrix.matrixElement[mX][mY]*this.currentDrawingStep.cell[dX][dY];
          }
        }
        // pass the result of the matrix convolution through the post-convolution function
        var _value = this.postConvolutionFunction(cumulativeTotal)
        // store the value in the corresponding cell in the next step
        this.currentDrawingStep.cell[x][y] = _value;
        // set the corresponding pixel in the image data array
        var rgbValues = HSLToRGB(_value * this.hueSpreadCoefficient + this.hueCentre, 1, 0.5);
        this.canvas.imageData.data[imageDataPointer] = rgbValues.r; //red
        imageDataPointer++;
        this.canvas.imageData.data[imageDataPointer] = rgbValues.g; //green
        imageDataPointer++;
        this.canvas.imageData.data[imageDataPointer] = rgbValues.b; // blue
        imageDataPointer++;
        this.canvas.imageData.data[imageDataPointer] = 255;         // alpha
        imageDataPointer++;
      }
    }

  }

  // start the automaton
  play() {
    // a timerInterval drives the process. Check that it does not already exist; if it does not, create it. Otherwise do nothing.
    if (!this.stepTimer) this.stepTimer = window.setInterval(function() {cellularAutomaton.advanceStep()}, cellularAutomaton.minimumStepDuration);
  }

  // pause the automaton
  pause() {
    // a timerInterval drives the process. Check that it exists; if it does, clear it and make its ID variable undefined. Otherwise do nothing.
    if (this.stepTimer) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = undefined;
    }
  }

}
