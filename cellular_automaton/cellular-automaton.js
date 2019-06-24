function onLoad() {
  cellularAutomaton = new CellularAutomaton('cellular-automaton', 200, 200, 500);
  cellularAutomaton.appendAsChildOfElementWithId('body');
  cellularAutomaton.drawStepToCanvas();
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

  get currentDrawingStep() {
    return this.step[this.currentDrawingStepIndex];
  }

  get currentDisplayCanvas() {
    return this.canvas[this.currentDisplayCanvasIndex];
  }

  get currentDrawingCanvas() {
    return this.canvas[this.currentDrawingCanvasIndex];
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

  constructor(_id, _gridSizeX, _gridSizeY, _minimumStepDuration = 40, _convolutionMatrixSizeX = 5, _convolutionMatrixSizeY = 5, _stepCount = 2) {
    // used to pass this object into child objects.
    var cellularAutomaton = this;

    // create the control panel (not added to the document at this point).
    this.createControlPanel();

    // psuedo-private properties
    this._coefficientP;
    this._offsetK;
    this._iterationCount;

    this.id = _id                     // ID for the cellularAutomaton object
    this.gridSizeX = _gridSizeX;      // width of the automaton's grid
    this.gridSizeY = _gridSizeY;      // height of the automaton grid

    this.minimumStepDuration = _minimumStepDuration; // minumum duration of each step, in milliseconds
    this.iterationCount = 0;      // Set the iteration count to zero

    // number of steps stored by the automaton. Larger numbers allow history to be considered in the convolution, as well as
    // more buffering.
    this.stepCount = _stepCount;
    // make each step an item in an array
    this.currentDisplayStepIndex = 0;
    this.currentDrawingStepIndex = 1;
    this.step = new Array(this.stepCount);
    // for each step, set up a grid of cells
    // a single cell can be accessed with: this.step[n].cell[x][y]
    for(var n = 0; n < this.stepCount; n++) {
      this.step[n] = new Object();
      this.step[n].cell = new Array(this.gridSizeX);
      for(var x = 0; x < this.gridSizeX; x++) {
        this.step[n].cell[x] = new Array(this.gridSizeY);
        this.step[n].cell[x].fill(0);
      }
    }

    // set up the convolution matrix
    this.convolutionMatrixSizeX = _convolutionMatrixSizeX;  // width of the convolution matrix
    this.convolutionMatrixSizeY = _convolutionMatrixSizeY;  // height of the convolution matrix
    // work out the "radius" of the matrix in each dimension, i.e. the offset that should be applied to put
    // the current working cell in the centre.
    this.convolutionMatrixRadiusX = (this.convolutionMatrixSizeX - 1)/2;
    this.convolutionMatrixRadiusY = (this.convolutionMatrixSizeY - 1)/2;
    this.convolutionMatrix = new Array(this.convolutionMatrixSizeX);
    for(var x = 0; x < this.convolutionMatrixSizeX; x++) {
      this.convolutionMatrix[x] = new Array(this.convolutionMatrixSizeY);
    }
    // Fill the matrix with random values
    this.randomiseConvolutionMatrix();

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
    // Set initial values for post-convolution function parameters
    this.coefficientP = 0.2;
    this.offsetK = 0.0;
//    this.setAndUpdateCoefficientP(-0.21);
//    this.setAndUpdateOffsetK(0.0);
    this.postConvolutionFunction = this.postConvolutionFunctionOption[1].f;

    // set up canvasses to draw on.
    this.zoom = 4; 
    this.canvasCount = 2;
    this.currentDisplayCanvasIndex = 0;
    this.currentDrawingCanvasIndex = 1;
    this.canvas = new Array(this.canvasCount);
    // Create canvases. One will be visible while the others are hidden for drawing on.
    for(var i = 0; i < this.canvasCount; i++) {
      this.canvas[i] = document.createElement('canvas');
      this.canvas[i].style.display = i == this.currentDisplayCanvasIndex ? 'initial' : 'none';
      // using CSS zoom gives nicely interpolated zooming, at least in Chrome
      this.canvas[i].style.transformOrigin = 'top left';
      this.canvas[i].style.transform = 'scale(' + this.zoom + ')';
      this.canvas[i].width = this.gridSizeX;
      this.canvas[i].height = this.gridSizeY;
      this.canvas[i].context = this.canvas[i].getContext('2d');
    }

    // hue (colour) variables
    this.hueCentre = 30; // [0, 360)
    this.hueSpreadCoefficient = 30; // [0,)

    // draw the current state
    this.drawStepToCanvas();

  }

  randomiseConvolutionMatrix() {
    for(var mY = 0; mY < this.convolutionMatrixSizeY; mY++) {
      for(var mX = 0; mX < this.convolutionMatrixSizeX; mX++) {
        this.convolutionMatrix[mY][mX] = 2*Math.random() - 1;
      }
    }
  }

  getconvolutionMatrixSum() {
    var sum = 0;
    for(var mY = 0; mY < this.convolutionMatrixSizeY; mY++) {
      for(var mX = 0; mX < this.convolutionMatrixSizeX; mX++) {
        sum += this.convolutionMatrix[mY][mX];
      }
    }    
    return sum;
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
    this.drawStepToCanvas();
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
    this.controlPanel.randomiseConvolutionMatrixButton = addControlButton('Randomise Convolution <u>M</u>atrix', function() {_cellularAutomaton.randomiseConvolutionMatrix()});
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
      console.log(e.key);
      switch(e.key) {
        case " ": case "Spacebar":
          if (_cellularAutomaton.stepTimer) {
            _cellularAutomaton.pause();
          } else {
            _cellularAutomaton.play();
          }
        break;
        case "m": case "M": _cellularAutomaton.randomiseConvolutionMatrix(); break;
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

    // Append canvases as child elements of the div.
    for(var i = 0; i < this.canvasCount; i++) {
      this.containerDiv.appendChild(this.canvas[i]);
    }
    // add the container div to the document
    document.getElementById(elementId).appendChild(this.containerDiv);
  }

  // draws a single pixel on the specified canvas. Usages:
  //    hue only (saturated):      drawDot(canvas, h)
  //    hue, saturation:           drawDot(canvas, h, s)
  //    hue, saturation, lighness: drawDot(canvas, h, s, l)
  drawDot(canvas, x, y, h, s = 1, l = 0.5) {
    canvas.context.fillStyle = "hsl("+ (this.hueSpreadCoefficient*h + this.hueCentre) +","+ 100*s +"%,"+ 100*l +"%)";
    canvas.context.fillRect(x, y, 1, 1);
  }

  // draws the specified step's grid to the specified canvas
  // Defaults to using the current drawing step and canvas
  drawStepToCanvas(_step = this.currentDrawingStep, _canvas = this.currentDrawingCanvas) {
    for(var y = 0; y < this.gridSizeY; y++) {
      for(var x = 0; x < this.gridSizeX; x++) {
        var hue = _step.cell[x][y];
        var saturation = Math.max(Math.min((_step.cell[x][y] + 1.0)/2.0, 1), 0);
        this.drawDot(_canvas, x, y, hue);
      }
    }
  }

  // advance to the next step
  advanceStep() {

    // calculate the next step and canvas indexes
    this.currentDrawingStepIndex = (this.currentDisplayStepIndex + 1) % this.stepCount;
    this.currentDrawingCanvasIndex = (this.currentDisplayCanvasIndex + 1) % this.canvasCount;

    // calculate the next step's grid
    for(var y = 0; y < this.gridSizeY; y++) {
      for(var x = 0; x < this.gridSizeX; x++) {
        var cumulativeTotal = 0;
        for(var mY = 0; mY < this.convolutionMatrixSizeY; mY++) {
          for(var mX = 0; mX < this.convolutionMatrixSizeX; mX++) {
            var dX = (x - this.convolutionMatrixRadiusX + mX + this.gridSizeX) % this.gridSizeX;
            var dY = (y - this.convolutionMatrixRadiusY + mY + this.gridSizeY) % this.gridSizeY;
            cumulativeTotal += this.convolutionMatrix[mX][mY]*this.currentDisplayStep.cell[dX][dY];
          }
        }
        this.currentDrawingStep.cell[x][y] = this.postConvolutionFunction(cumulativeTotal);
      }
    }

    // draw the next step's grid to the next canvas
    this.drawStepToCanvas(this.currentDrawingStep, this.currentDrawingCanvas);

    // switch the display canvas
    this.currentDrawingCanvas.style.display = 'initial';
    this.currentDisplayCanvas.style.display = 'none';

    // move on to the next step and canvas
    this.currentDisplayStepIndex = this.currentDrawingStepIndex;
    this.currentDisplayCanvasIndex = this.currentDrawingCanvasIndex;

    this.iterationCount++;
  }

  play() {
    if (!this.stepTimer) this.stepTimer = window.setInterval(function() {cellularAutomaton.advanceStep()}, cellularAutomaton.minimumStepDuration);
  }

  pause() {
    if (this.stepTimer) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = undefined;
    }
  }

}
