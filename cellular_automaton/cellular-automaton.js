function onLoad() {
  cellularAutomaton = new CellularAutomaton('cellular-automaton', 180, 180, 50, 5, 5);
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

// Class defining control panels (for both the main object and sub-panels for sub-objects)
// N.B. Uses a 'function' declaration rather than a 'class' notation so that the new object 
// can be the containing div element itself rather than a containing object.
function ControlPanel(_id = null, _title = null) {

  // Create a containing div
  var controlPanel = document.createElement('div');
  if (_id) controlPanel.id = _id;
  if (_title) controlPanel.title = _title;

  controlPanel.addButton = function(_buttonHTML, _onclickFunction, _parentElement = this) {
    var buttonElement = document.createElement('button');
    buttonElement.innerHTML = _buttonHTML;
    buttonElement.onclick = _onclickFunction;
    buttonElement.className = "cellular-automaton-control-button";
    _parentElement.appendChild(buttonElement);
    return buttonElement;
  }

  // Add parameter inputs
  controlPanel.addNumberInput = function(_inputId, _labelHTML, _onchangeFunction, _step = 0.01, _parentElement = this) {
    // if label innerHTML is supplied, add the label
    if (_labelHTML) {
      var labelElement;
      labelElement = document.createElement("label");
      labelElement.htmlFor = _inputId; // value of the "for" attribute
      labelElement.innerHTML = _labelHTML;
      labelElement.className = "cellular-automaton-number-input-label";
      _parentElement.appendChild(labelElement);
    }
    var inputElement = document.createElement("input");
    inputElement.type = "number";
    inputElement.id = _inputId;
    inputElement.step = _step;
    inputElement.onchange = _onchangeFunction;
    inputElement.className = "cellular-automaton-number-input";
    _parentElement.appendChild(inputElement);
    return inputElement;
  }

  return controlPanel;
}

class ConvolutionMatrixElement {

  get value() {return this._value;}
  set value(v) {
    // input validation
    if (v.isNaN) return;
    if (v > 1) v = 1;
    if (v < -1) v = -1;
    // set the display
    this._value = v;
    // set the display
    this.displayCell.innerInput.value = v;
    // set the background colour of the cell - green +ve, red -ve
    var bgLightness = Math.round(Math.abs(v*255)).toString();
    var bgColor = v < 0 ? `rgb(${bgLightness}, 0, 0)` : `rgb(0, ${bgLightness}, 0)`;
    this.displayCell.style.backgroundColor = bgColor;
    // update the metrics display of the parent matrix
    this._parentMatrix.controlPanel.sumDisplayCell.innerText = this._parentMatrix.sum.toFixed(5);
    this._parentMatrix.controlPanel.rmsDisplayCell.innerText = this._parentMatrix.rms.toFixed(5);
  }

  constructor(parentMatrix) {
    // Used to pass this down to inner functions etc.
    var _convolutionMatrixElement = this;
    this._parentMatrix = parentMatrix;
    // pseudo-private property; the value of the matrix element
    this._value;
    // the table cell in which the value is displayed and can be edited
    this.displayCell = document.createElement('td');
    this.displayCell.innerInput = this.displayCell.appendChild(document.createElement('input'));
    this.displayCell.innerInput.type = 'number';
    this.displayCell.innerInput.step = '0.01';
    this.displayCell.innerInput.onchange = function() {
      if (this.value == null || this.value == undefined || this.value == '') this.value = _convolutionMatrixElement.value
      else _convolutionMatrixElement.value = Number(this.value);
    };
    this.displayCell.innerInput.style.width = '12em';
    this.displayCell.innerInput.style.visibility = 'hidden';
    this.displayCell.onmouseover = function() {
      this.innerInput.style.visibility = 'visible';
      this.innerInput.select();
    };
    this.displayCell.onmouseout = function() {this.innerInput.style.visibility = 'hidden'};
  }

}

// class defining convolution matrices
class ConvolutionMatrix {
  // Takes the "radius" of the matrix in each dimension as parameter, i.e. the number of
  // cells from the centre cell to the edge, including the centre cell
  constructor(_radiusX, _radiusY, _parentCellularAutomaton) {

    // Use this to pass the convolutionMatrix object to inner functions etc.
    var _convolutionMatrix = this;
    // a utility variable used when constructing the HTML DOM
    var workingHTMLElement;

    this.radiusX = _radiusX;
    this.radiusY = _radiusY;
    // calculate the size of the matrix in each dimension
    this.sizeX = _radiusX * 2 - 1;
    this.sizeY = _radiusY * 2 - 1;
    // create the matrix
    this.matrixElement = new Array(this.sizeX);
    for(var x = 0; x < this.sizeX; x++) {
      this.matrixElement[x] = new Array(this.sizeY);
      for(var y = 0; y < this.sizeY; y++) {
        this.matrixElement[x][y] = new ConvolutionMatrixElement(_convolutionMatrix);
      }
    }

    // Convolution Matrix control sub-panel
    // ------------------------------------
    // Create the control sub-panel
    this.controlPanel = new ControlPanel(null, 'Convolution Matrix control panel');
    this.controlPanel.className = 'convolution-matrix';
    // Create the matrix display table
    this.controlPanel.displayTable = document.createElement('table');
    this.controlPanel.displayTable.className = 'convolution-matrix-display-table';
    // table body
    this.controlPanel.displayTable.body = document.createElement('tbody');
    this.controlPanel.displayTable.body.row = new Array(this.sizeY);
    for(var y = 0; y < this.sizeY; y++) {
      this.controlPanel.displayTable.body.row[y] = document.createElement('tr');
      this.controlPanel.displayTable.body.row[y].cell = new Array(this.sizeX);
      for(var x = 0; x < this.sizeX; x++) {
        this.controlPanel.displayTable.body.row[y].cell[x] = this.matrixElement[x][y].displayCell;
        this.controlPanel.displayTable.body.row[y].appendChild(this.controlPanel.displayTable.body.row[y].cell[x]);
      }
      this.controlPanel.displayTable.body.appendChild(this.controlPanel.displayTable.body.row[y]);
    }
    // append the body to the table
    this.controlPanel.displayTable.appendChild(this.controlPanel.displayTable.body);
    // append the table to the sub-panel div
    this.controlPanel.appendChild(this.controlPanel.displayTable);
    // Add the Randomise button
    this.controlPanel.randomiseConvolutionMatrixButton = this.controlPanel.addButton('<u>R</u>andomise', function() {_convolutionMatrix.randomise();});
    // Add the Zero button
    this.controlPanel.zeroConvolutionMatrixButton = this.controlPanel.addButton('<u>Z</u>ero', function() {_convolutionMatrix.zero();});
    var metricTable = document.createElement('table');
    metricTable.className = 'convolution-matrix-metric-table';
    // table header
    workingHTMLElement = metricTable.appendChild(document.createElement('thead'));
    workingHTMLElement = workingHTMLElement.appendChild(document.createElement('tr'));
    workingHTMLElement.appendChild(document.createElement('th')).innerText = 'Sum';
    workingHTMLElement.appendChild(document.createElement('th')).innerText = 'RMS';
    // table body
    workingHTMLElement = metricTable.appendChild(document.createElement('tbody'));
    workingHTMLElement = workingHTMLElement.appendChild(document.createElement('tr'));
    this.controlPanel.sumDisplayCell = workingHTMLElement.appendChild(document.createElement('td'));
    this.controlPanel.sumDisplayCell.onclick = function() {
      _parentCellularAutomaton.coefficientP = 1/_convolutionMatrix.sum;
    };
    this.controlPanel.rmsDisplayCell = workingHTMLElement.appendChild(document.createElement('td'));
    this.controlPanel.rmsDisplayCell.onclick = function() {
      _parentCellularAutomaton.coefficientP = 1/_convolutionMatrix.rms;
    };
    this.controlPanel.appendChild(metricTable);

  } // end of ConvolutionMatrix constructor function

  // Method: randomises the matrix values to values in the range [-1, 1)
  randomise() {
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        this.matrixElement[mX][mY].value = 2*Math.random() - 1;
      }
    }
  }

  // Method: sets all matrix values to zero
  zero() {
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        this.matrixElement[mX][mY].value = 0;
      }
    }
  }

  // getter: returns the sum of all the values in the matrix
  get sum() {
    var _sum = 0;
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        _sum += this.matrixElement[mX][mY].value;
      }
    }
    return _sum;
  }

  // Method: returns 1 or -1, depending on the sign of the matrix's sum.
  // If the sum is zero, returns 1
  get sign() {
    return (this.sum >= 0) ? 1 : -1;
  }

  // Method: returns the sum of all the *absolute* values in the matrix
  get absSum() {
    var _absSum = 0;
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        _absSum += Math.abs(this.matrixElement[mX][mY].value);
      }
    }    
    return _absSum;
  }

  // Method: returns the sum of all the values in the matrix
  get rms() {
    var _sumOfSquares = 0;
    for(var mY = 0; mY < this.sizeY; mY++) {
      for(var mX = 0; mX < this.sizeX; mX++) {
        _sumOfSquares += this.matrixElement[mX][mY].value ** 2;
      }
    }
    return Math.sqrt(_sumOfSquares / (this.sizeY * this.sizeY));
  }

} // End of ConvolutionMatrix class definition

// Class defining an option for the post-convolution function
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

// an object for controlling colour
class colorModule {

  constructor() {

    // used to pass this object down to other functions
    var _colorModule = this;

    // pseudo-private properties
    this._hueAtZero = 0;
    this._hueSpread = 0;
    this._saturationAtZero = 0;
    this._saturationAtPlusOne = 0;
    this._saturationAtMinusOne = 0;
    this._lightnessAtZero = 0;
    this._lightnessAtPlusOne = 0;
    this._lightnessAtMinusOne = 0;
    this.controlPanel = new ControlPanel();

    // The colour controls go in a table
    var colorControlTable = document.createElement('table');
    colorControlTable.id = this.id + '-color-control-table';
    colorControlTable.className = 'color-control-table';
    // header
    colorControlTable.header = document.createElement('thead');
    colorControlTable.header.row = document.createElement('tr');
    colorControlTable.header.row.appendChild(document.createElement('th'));
    colorControlTable.header.row.appendChild(document.createElement('th')).innerText = 'Hue';
    colorControlTable.header.row.appendChild(document.createElement('th')).innerText = 'Saturation';
    colorControlTable.header.row.appendChild(document.createElement('th')).innerText = 'Lightness';
    colorControlTable.header.appendChild(colorControlTable.header.row);
    colorControlTable.appendChild(colorControlTable.header);
    //body
    colorControlTable.body = document.createElement('tbody');
    colorControlTable.body.row = new Array(3);
    // "At +1" controls
    colorControlTable.body.row[0] = document.createElement('tr');
    colorControlTable.body.row[0].appendChild(document.createElement('th')).innerText = 'at +1';
    colorControlTable.body.row[0].appendChild(document.createElement('td'));
    this.controlPanel.saturationAtPlusOneInput = this.controlPanel.addNumberInput("saturation-at-plus-1", null, function() {this.value = Math.min(1, Math.max(0, this.value)); _colorModule._saturationAtPlusOne = parseFloat(this.value);}, 0.01, colorControlTable.body.row[0].appendChild(document.createElement('td')) );
    this.controlPanel.lightnessAtPlusOneInput = this.controlPanel.addNumberInput("lightness-at-plus-1", null, function() {this.value = Math.min(1, Math.max(0, this.value)); _colorModule._lightnessAtPlusOne = parseFloat(this.value);}, 0.01, colorControlTable.body.row[0].appendChild(document.createElement('td')) );
    colorControlTable.body.appendChild(colorControlTable.body.row[0]);
    // "At 0" controls
    colorControlTable.body.row[1] = document.createElement('tr');
    colorControlTable.body.row[1].appendChild(document.createElement('th')).innerText = 'at \xa00';
    this.controlPanel.hueAtZeroInput = this.controlPanel.addNumberInput("hue-at-zero", null, function() {var v = this.value %= 360; v = v < 0 ? v + 360 : v; _colorModule._hueAtZero = v; this.value = v; this.style.borderColor = 'hsl(' + v  + ' deg, 100%, 50%)';}, 1, colorControlTable.body.row[1].appendChild(document.createElement('td')) );
    this.controlPanel.saturationAtZeroInput = this.controlPanel.addNumberInput("saturation-at-zero", null, function() {this.value = Math.min(1, Math.max(0, this.value)); _colorModule._saturationAtZero = parseFloat(this.value);}, 0.01, colorControlTable.body.row[1].appendChild(document.createElement('td')) );
    this.controlPanel.lightnessAtZeroInput = this.controlPanel.addNumberInput("lightness-at-zero", null, function() {this.value = Math.min(1, Math.max(0, this.value)); _colorModule._lightnessAtZero = parseFloat(this.value);}, 0.01, colorControlTable.body.row[1].appendChild(document.createElement('td')) );
    colorControlTable.body.appendChild(colorControlTable.body.row[1]);
    // "At -1" controls
    colorControlTable.body.row[2] = document.createElement('tr');
    colorControlTable.body.row[2].appendChild(document.createElement('th')).innerText = 'at -1';
    this.controlPanel.hueSpreadInput = this.controlPanel.addNumberInput("hue-spread", null, function() {_colorModule._hueSpread = parseFloat(this.value);}, 1, colorControlTable.body.row[2].appendChild(document.createElement('td')) );
    this.controlPanel.saturationAtMinusOneInput = this.controlPanel.addNumberInput("saturation-at-minus-1", null, function() {this.value = Math.min(1, Math.max(0, this.value)); _colorModule._saturationAtMinusOne = parseFloat(this.value);}, 0.01, colorControlTable.body.row[2].appendChild(document.createElement('td')) );
    this.controlPanel.lightnessAtMinusOneInput = this.controlPanel.addNumberInput("lightness-at-minus-1", null, function() {this.value = Math.min(1, Math.max(0, this.value)); _colorModule._lightnessAtMinusOne = parseFloat(this.value);}, 0.01, colorControlTable.body.row[2].appendChild(document.createElement('td')) );
    colorControlTable.body.appendChild(colorControlTable.body.row[2]);
    // Add the table body to the table, and the table to the control panel div
    colorControlTable.appendChild(colorControlTable.body);
    this.controlPanel.appendChild(colorControlTable);

  }

  // getters and setters

  // Hue
  get hueAtZero() {
    return _hueAtZero;
  }
  set hueAtZero(hue) {
    this.controlPanel.hueAtZeroInput.value = hue;
    this._hueAtZero = hue;
  }
  get hueSpread() {
    return this._hueSpread;
  }
  set hueSpread(spread) {
    this.controlPanel.hueSpreadInput.value = spread;
    this._hueSpread = spread;
  }

  // Saturation
  get saturationAtPlusOne() {
    return this._saturationAtPlusOne;
  }
  set saturationAtPlusOne(s) {
    this.controlPanel.saturationAtPlusOneInput.value = s;
    this._saturationAtPlusOne = s;
  }
  get saturationAtZero() {
    return _saturationAtZero;
  }
  set saturationAtZero(s) {
    this.controlPanel.saturationAtZeroInput.value = s;
    this._saturationAtZero = s;
  }
  get saturationAtMinusOne() {
    return this._saturationAtMinusOne;
  }
  set saturationAtMinusOne(s) {
    this.controlPanel.saturationAtMinusOneInput.value = s;
    this._saturationAtMinusOne = s;
  }

  // Lightness
  get lightnessAtPlusOne() {
    return this._lightnessAtPlussOne;
  }
  set lightnessAtPlusOne(l) {
    this.controlPanel.lightnessAtPlusOneInput.value = l;
    this._lightnessAtPlusOne = l;
  }
  get lightnessAtZero() {
    return _lightnessAtZero;
  }
  set lightnessAtZero(l) {
    this.controlPanel.lightnessAtZeroInput.value = l;
    this._lightnessAtZero = l;
  }
  get lightnessAtMinusOne() {
    return this._lightnessAtMinusOne;
  }
  set lightnessAtMinusOne(l) {
    this.controlPanel.lightnessAtMinusOneInput.value = l;
    this._lightnessAtMinusOne = l;
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
    this._coefficientP = this.controlPanel.postConvolutionFunction.coefficientPInput.value;
  }

  // read the UI value of parameter "offset k", used in the post-convolution function
  readOffsetKInput() {
    this._offsetK = this.controlPanel.postConvolutionFunction.offsetKInput.value;
  }
  
  // getter that retrieves the value of the psuedo-private property _coefficientP
  get coefficientP() {
    return this._coefficientP;
  }

  // set the value of parameter "coefficient p", used in the post-convolution function, and
  // update its value in the UI
  set coefficientP(p) {
    this.controlPanel.postConvolutionFunction.coefficientPInput.value = p;
    this._coefficientP = p;
  }

  // getter that retrieves the value of the psuedo-private property _offsetK
  get offsetK() {return this._offsetK;}

  // set the value of parameter "offset k", used in the post-convolution function, and
  // update its value in the UI
  set offsetK(k) {
    this.controlPanel.postConvolutionFunction.offsetKInput.value = k;
    this._offsetK = k;
  }

  get iterationCount() {return this._iterationCount;}

  set iterationCount(n) {
    this._iterationCount = n;
    this.iterationCounter.innerText = n.toString();
  }

  constructor(_id, _gridSizeX, _gridSizeY, _minimumStepDuration = 40, _convolutionMatrixRadiusX = 3, _convolutionMatrixRadiusY = 3, _stepCount = 2) {
    // used to pass this object into child objects.
    var _cellularAutomaton = this;

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

    // Set up the colour module
    this.color = new colorModule();

    // Set up the convolution matrix
    this.convolutionMatrix = new ConvolutionMatrix(_convolutionMatrixRadiusX, _convolutionMatrixRadiusY, this);

    // options for the post-convolution function
    this.postConvolutionFunctionOption = [
      new PostConvolutionFunctionOption('linear', function(x) {return _cellularAutomaton.coefficientP*x - _cellularAutomaton.offsetK;}, 'p*x - k'),
      new PostConvolutionFunctionOption('sine', function(x) {return Math.sin(_cellularAutomaton.coefficientP*x - _cellularAutomaton.offsetK);}, 'sin(p*x - k)'),
      new PostConvolutionFunctionOption('cosine', function(x) {return Math.cos(_cellularAutomaton.coefficientP*x - _cellularAutomaton.offsetK);}, 'cos(p*x - k)'),
      // N.B. Theoretically, tan can return undefined values, so we handle these by turning them into zeros.
      new PostConvolutionFunctionOption('tangent', function(x) {var tanResult = Math.tan(_cellularAutomaton.coefficientP * x - _cellularAutomaton.offsetK); return isNaN(tanResult) ? _cellularAutomaton.offsetK : tanResult + _cellularAutomaton.offsetK;}, 'tan(p*x - k)'),
      new PostConvolutionFunctionOption('s-curve', function(x) {return 2/(1 + Math.exp(-_cellularAutomaton.coefficientP * x - _cellularAutomaton.offsetK)) - 1}, '2/(1 + e^(p*x - k)) - 1')
    ];
    // pick one as the default
    this.selectedPostConvolutionFunction = this.postConvolutionFunctionOption[4].f;

    // Create the control panel (not added to the document at this point).
    this.createControlPanel();

    // Set the iteration count to zero
    this.iterationCount = 0;

    // randomise the convolution matrix
    this.convolutionMatrix.randomise();

    // ****************************************************************************************************
    // *** PARAMETERS *************************************************************************************
    // ****************************************************************************************************

    // initial values for post-convolution function parameters
    this.coefficientP = 1.0;
    this.offsetK = 0.0;
    // initial values for colour variables
    this.color.hueAtZero = 0;
    this.color.hueSpread = 60; // [0,)
    this.color.saturationAtPlusOne = 1.0 // [0, 1]
    this.color.saturationAtZero = 0.5 // [0, 1]
    this.color.saturationAtMinusOne = 1.0 // [0, 1]
    this.color.lightnessAtPlusOne = 0.5 // [0, 1]
    this.color.lightnessAtZero = 0.0 // [0, 1]
    this.color.lightnessAtMinusOne = 0.5 // [0, 1]

    // ****************************************************************************************************
    // ****************************************************************************************************
    // ****************************************************************************************************

    // Calculate P normalised for the current matrix.
    // TODO make the normalisation method selectable (and optional)
    this.coefficientP = this.coefficientP;

    // set up a canvas to draw on.
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.gridSizeX;
    this.canvas.height = this.gridSizeY;
    this.canvas.context = this.canvas.getContext('2d');
    // a method we can call to draw image data into the canvas 
    this.canvas.drawNextStep = function() {
      // increment the current display index (returning to zero if needed)
      _cellularAutomaton.currentDisplayStepIndex++;
      _cellularAutomaton.currentDisplayStepIndex %= _cellularAutomaton.stepCount;
      // request to draw the image data anu
      window.requestAnimationFrame(
        function() {
          _cellularAutomaton.canvas.context.putImageData(_cellularAutomaton.currentDisplayStep.imageData, 0, 0)
          document.body.style.backgroundImage = 'url("' + _cellularAutomaton.canvas.toDataURL('image/png') + '")';
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

  // Method: create the main control panel for the cellular automaton
  createControlPanel() {

    this.controlPanel = new ControlPanel(this.id + '-control-panel', this.id + ' control panel');
    this.controlPanel.className = 'cellular-automaton-control-panel';

    // use the following to pass the parent object to functions etc.
    var _cellularAutomaton = this;
    // a utility variable used when constructing the HTML DOM
    var workingHTMLElement;

    // addButton() method
    // buttonHTML (string) : the innerHTML of the button
    // onClickFunction (function) : the onClick function of the button
    // parentElement (HTMLElement) : the Element to which the new button will be appended. Defaults to 'this'

    // Create the transport section of the control panel
    this.controlPanel.transport = document.createElement('div');
    this.controlPanel.transport.playButton = this.controlPanel.addButton('Play', function() {_cellularAutomaton.play()}, this.controlPanel.transport);
    this.controlPanel.transport.pauseButton = this.controlPanel.addButton('Pause', function() {_cellularAutomaton.pause()}, this.controlPanel.transport);
    // Add the iteration counter
    var iterationCounterOuterSpan = document.createElement("span");
    iterationCounterOuterSpan.innerText = "Iterations: ";
    this.iterationCounter = document.createElement("span");
    this.iterationCounter.id = "iteration-count";
    iterationCounterOuterSpan.appendChild(_cellularAutomaton.iterationCounter);
    this.controlPanel.transport.appendChild(iterationCounterOuterSpan);
    // Add the transport div
    this.controlPanel.appendChild(this.controlPanel.transport);

    // Create the parameter entry section of the control panel
    this.controlPanel.parameters = document.createElement('div');
    this.controlPanel.randomiseGridButton = this.controlPanel.addButton('Randomise <u>G</u>rid', function() {_cellularAutomaton.randomiseGrid()}, this.controlPanel.parameters);
    this.controlPanel.appendChild(this.controlPanel.parameters);

    // Add the colour control panel
    this.controlPanel.color = this.controlPanel.appendChild(this.color.controlPanel);

    // Add the convolution matrix control panel
    this.controlPanel.convolutionMatrix = this.controlPanel.appendChild(this.convolutionMatrix.controlPanel);

    // Add the post-convolution function selector
    this.controlPanel.postConvolutionFunction = document.createElement('div');
    // Label for the selector input
    workingHTMLElement = this.controlPanel.postConvolutionFunction.appendChild(document.createElement('p'));
    var selectorLabel = document.createElement('label');
    selectorLabel.htmlFor = 'post-convolution-function-selector';
    selectorLabel.innerText = 'Post-convolution function';
    workingHTMLElement.appendChild(selectorLabel);
    this.controlPanel.postConvolutionFunction.appendChild(workingHTMLElement);
    // The selector dropdown input
    workingHTMLElement = this.controlPanel.postConvolutionFunction.appendChild(document.createElement('p'));
    var selector = this.controlPanel.postConvolutionFunction.appendChild(document.createElement('select'));
    selector.id = 'post-convolution-function-selector';
    this.postConvolutionFunctionOption.forEach(function(option) {
      var HTMLOption = document.createElement('option');
      HTMLOption.text = option.selectorHtml;
      HTMLOption.value = option.name;
      // TODO: HTMLOption.onselect = function() { change selectedPostConvolutionFunction to selection }
      selector.add(HTMLOption);
    })
    workingHTMLElement.appendChild(selector);
    this.controlPanel.postConvolutionFunction.appendChild(workingHTMLElement);
    // postConvolutionFunction parameter inputs
    workingHTMLElement = this.controlPanel.postConvolutionFunction.appendChild(document.createElement('p'));
    this.controlPanel.postConvolutionFunction.coefficientPInput = this.controlPanel.addNumberInput("coefficient-p", "p =", function() {_cellularAutomaton._coefficientP = this.value;}, 0.01, workingHTMLElement);
    this.controlPanel.postConvolutionFunction.offsetKInput = this.controlPanel.addNumberInput("offset-k", "k =", function() {_cellularAutomaton._offsetK = this.value;}, 0.01, workingHTMLElement);
    this.controlPanel.postConvolutionFunction.appendChild(workingHTMLElement);
    // Add the postConvolutionFunction control panel to the main control panel    
    this.controlPanel.appendChild(this.controlPanel.postConvolutionFunction);

    // set up keyboard shortcuts
    window.onkeydown = function(e) {
      // ignore keyboard events when the ctrl key is pressed
      if (!e.ctrlKey) {
        switch(e.key) {
          case " ": case "Spacebar":
            if (_cellularAutomaton.isPlaying) {
              _cellularAutomaton.pause();
            } else {
              _cellularAutomaton.play();
            }
          break;
          case "r": case "R": _cellularAutomaton.convolutionMatrix.randomise(); break;
          case "z": case "Z": _cellularAutomaton.convolutionMatrix.zero(); break;
          case "g": case "G": _cellularAutomaton.randomiseGrid(); break;
          case "p": case "P": _cellularAutomaton.controlPanel.postConvolutionFunction.coefficientPInput.focus(); break;
          case "i": case "I": _cellularAutomaton.coefficientP *= -1; break;
          case "k": case "K": _cellularAutomaton.controlPanel.postConvolutionFunction.offsetKInput.focus(); break;
          case "h": case "H": _cellularAutomaton.color.controlPanel.hueAtZeroInput.focus(); break;
          case "s": case "S": _cellularAutomaton.color.controlPanel.saturationAtZeroInput.focus(); break;
          case "l": case "L": _cellularAutomaton.color.controlPanel.lightnessAtZeroInput.focus(); break;
          // Hide the control panel
          case "c": case "C": 
            if(_cellularAutomaton.controlPanel.style.opacity == 1 || !_cellularAutomaton.controlPanel.style.opacity) {
              _cellularAutomaton.controlPanel.style.opacity = 0;
              document.body.style.cursor = 'none';
            }
            else {
              _cellularAutomaton.controlPanel.style.opacity = 1;
              document.body.style.cursor = 'inherit';
            }
          break;
        }
      }
    }

  } // End of createControlPanel()

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

    // helper values for calculating colours
    var H_at0 = this.color._hueAtZero;
    var H_Sprd = this.color._hueSpread;
    // coefficients for the quadrilateral equation to govern saturation
    var s_k0 = this.color._saturationAtZero;
    var s_k1 = (this.color._saturationAtPlusOne - this.color._saturationAtMinusOne)/2;
    var s_k2 = this.color._saturationAtPlusOne - s_k0 - s_k1;
    // coefficients for the quadrilateral equation to govern lightness
    var l_k0 = this.color._lightnessAtZero;
    var l_k1 = (this.color._lightnessAtPlusOne - this.color._lightnessAtMinusOne)/2;
    var l_k2 = this.color._lightnessAtPlusOne - l_k0 - l_k1;

    // calculate the next step's grid
    var imageDataPointer = 0;
    for(var gridY = 0; gridY < this.gridSizeY; gridY++) {
      for(var gridX = 0; gridX < this.gridSizeX; gridX++) {
        var cumulativeTotal = 0;
        for(var matrixY = 0; matrixY < this.convolutionMatrix.sizeY; matrixY++) {
          for(var matrixX = 0; matrixX < this.convolutionMatrix.sizeX; matrixX++) {
            var x = (gridX - this.convolutionMatrix.radiusX + matrixX + 1 + this.gridSizeX) % this.gridSizeX;
            var y = (gridY - this.convolutionMatrix.radiusY + matrixY + 1 + this.gridSizeY) % this.gridSizeY;
            cumulativeTotal += this.convolutionMatrix.matrixElement[matrixX][matrixY].value*this.currentReferenceStep.cell[x][y];
          }
        }
        // pass the result of the matrix convolution through the post-convolution function
        var _value = this.selectedPostConvolutionFunction(cumulativeTotal);
        // store the value in the corresponding cell in the next step
        this.currentWorkingStep.cell[gridX][gridY] = _value;
        // set the corresponding pixel in the image data array
        var rgbValues = HSLToRGB(H_at0 + (_value*H_Sprd), s_k2*_value*_value + s_k1*_value + s_k0,  l_k2*_value*_value + l_k1*_value + l_k0);
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
      this.controlPanel.transport.playButton.classList.add('active');
      this.controlPanel.transport.pauseButton.classList.remove('active');
      // start the loop at the next animation frame
      var _cellularAutomaton = this;
      this.stepTimer = window.setInterval(function(){_cellularAutomaton.advanceStep()}, _cellularAutomaton.minimumStepDuration);
    }
  }

  // pause the automaton
  pause() {
    // a timerInterval drives the process. Check that it exists; if it does, clear it and make its ID variable undefined. Otherwise do nothing.
    if (this.isPlaying) {
      this.isPlaying = false;
      this.controlPanel.transport.pauseButton.classList.add('active');
      this.controlPanel.transport.playButton.classList.remove('active');
      var _cellularAutomaton = this;
      window.clearInterval(_cellularAutomaton.stepTimer);
    }
  }

}
