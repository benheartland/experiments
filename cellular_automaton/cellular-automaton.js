function onLoad() {
  cellularAutomaton = new CellularAutomaton('ca', 200, 200, 500);
  cellularAutomaton.appendAsChildOfElementWithId('body');
}

class CellularAutomaton {

  get activeStep() {
    return this.step[this.activeStepIndex];
  }

  get nextStep() {
    return this.step[this.nextStepIndex];
  }

  get activeCanvas() {
    return this.canvas[this.activeCanvasIndex];
  }

  get nextCanvas() {
    return this.canvas[this.nextCanvasIndex];
  }

  constructor(id, gridSizeX, gridSizeY, matrixSizeX = 5, matrixSizeY = 5, minimumStepDuration = 40, stepCount = 2) {
    this.id = id                     // ID for the cellularAutomaton object
    this.gridSizeX = gridSizeX;      // width of the automaton's grid
    this.gridSizeY = gridSizeY;      // height of the automaton grid
    this.matrixSizeX = matrixSizeX;  // width of the convolution matrix
    this.matrixSizeY = matrixSizeY;  // height of the convolution matrix
    this.minimumStepDuration = minimumStepDuration; // minumum duration of each step, in milliseconds
    this.resetIterationCount();
    // this must be a matrix with odd dimensions
    this.advancementMatrix = [
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
*/

      // Cool angular lava lamp kinda thing
      [ -0.750019416777183    ,  0.009474266756965832 , -0.9654057969857419  , -0.12490011253655675 , -0.382166568670975   ],
      [  0.012442289392388783 , -0.9023721786291801   , -0.6564885023370088  , -0.8509354101711124  ,  0.39976776743117526 ],
      [ -0.28377104218030924  , -0.373657054578846    , -0.3470274581705173  ,  0.04544723631143199 , -0.1935234800936052  ],
      [  0.4409330735057848   ,  0.47942838267554455  , -0.16806472901478653 ,  0.7669771211698158  , -0.4852550535434661  ],
      [  0.0681379246217424   , -0.08346468578764377  ,  0.41774494253850936 , -0.7299587999242467  , -0.7044833430730679  ]

    ];


    // get various dimensions of the matrix
    this.advancementMatrixWidth = this.advancementMatrix.length;
    this.advancementMatrixHeight = this.advancementMatrix[0].length;
    this.advancementMatrixRadiusX = (this.advancementMatrixWidth - 1)/2;
    this.advancementMatrixRadiusY = (this.advancementMatrixHeight - 1)/2;

    this.advancementFunction = this.sin;
    this.setAndUpdateAdvancementParameterP(-0.21);
    this.setAndUpdateAdvancementOffsetK(0);


    // make each step an item in an array
    this.stepCount = stepCount;    // number of steps stored by the automaton. Larger numbers allow more history to be considered in the advancement function.
    this.activeStepIndex = 0;
    this.nextStepIndex = 1;
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

    // set up canvasses to draw on.
    this.zoom = 4; 
    this.canvasCount = 2;
    this.activeCanvasIndex = 0;
    this.nextCanvasIndex = 1;
    this.canvas = new Array(this.canvasCount);
    // Create canvases. One will be visible while the others are hidden for drawing on.
    for(var i = 0; i < this.canvasCount; i++) {
      this.canvas[i] = document.createElement('canvas');
      this.canvas[i].style.display = i == this.activeCanvasIndex ? 'initial' : 'none';
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

  readAdvancementParameterP() {
    this.advancementParameterP = document.getElementById('advancement-parameter-p').value;
  }

  setAndUpdateAdvancementParameterP(p) {
    this.advancementParameterP =p;
    document.getElementById('advancement-parameter-p').value = p;
  }

  readAdvancementOffsetK() {
    this.advancementoffsetK = document.getElementById('advancement-offset-k').value;
  }

  setAndUpdateAdvancementOffsetK(k) {
    this.advancementOffsetK = k;
    document.getElementById('advancement-offset-k').value = k;
  }

  // possible functions for the advancement function
  linear(x) {
    return this.advancementParameterP * x;
  }

  sin(x) {
    return Math.sin(this.advancementParameterP * x);
  }

  cos(x) {
    return Math.cos(this.advancementParameterP * x);
  }

  tan(x) {
    // tan is undefined at x=0, so treat this as a special case
    return x == 0 ? 0 : Math.tan(this.advancementParameterP * x);
  }

  randomiseAdvancementMatrix() {
    for(var mY = 0; mY < this.advancementMatrixHeight; mY++) {
      for(var mX = 0; mX < this.advancementMatrixWidth; mX++) {
        this.advancementMatrix[mY][mX] = 2*Math.random() - 1;
      }
    }
  }

  getAdvancementMatrixSum() {
    var sum = 0;
    for(var mY = 0; mY < this.advancementMatrixHeight; mY++) {
      for(var mX = 0; mX < this.advancementMatrixWidth; mX++) {
        sum += this.advancementMatrix[mY][mX];
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
    this.resetIterationCount();
  }

  // call within html body - draws the display at the current point in the page.
  appendAsChildOfElementWithId(elementId) {
    // Create a containing div
    var containerDiv = document.createElement('div');
    containerDiv.id = this.id;
    containerDiv.className = 'cellular-automaton';
    // Append canvases as child elements of the div.
    for(var i = 0; i < this.canvasCount; i++) {
      containerDiv.appendChild(this.canvas[i]);
    }
    // add the container div to the document
    document.getElementById(elementId).appendChild(containerDiv);
  }

  // draws a single pixel on the specified canvas. Usages:
  //    grayscale:                drawDot(canvas, x, y, v)
  //    colour:                   drawDot(canvas, x, y, r, g, b)
  //    colour with transparency: drawDot(canvas, x, y, r, g, b, a)
  drawDot(canvas, x, y, h, s = 1, l = 0.5) {
    canvas.context.fillStyle = "hsl("+ (this.hueSpreadCoefficient*h + this.hueCentre) +","+ 100*s +"%,"+ 100*l +"%)";
    canvas.context.fillRect(x, y, 1, 1);
  }

  // draws the current step's grid to the specified canvas
  // If no canvas is passed in, uses the active canvas
  drawStepToCanvas(_step = this.activeStep, _canvas = this.activeCanvas) {
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
    this.nextStepIndex = (this.activeStepIndex + 1) % this.stepCount;
    this.nextCanvasIndex = (this.activeCanvasIndex + 1) % this.canvasCount;

    // calculate the next step's grid
    for(var y = 0; y < this.gridSizeY; y++) {
      for(var x = 0; x < this.gridSizeX; x++) {
        var cumulativeTotal = 0;
        for(var mY = 0; mY < this.advancementMatrixHeight; mY++) {
          for(var mX = 0; mX < this.advancementMatrixWidth; mX++) {
            var dX = (x - this.advancementMatrixRadiusX + mX + this.gridSizeX) % this.gridSizeX;
            var dY = (y - this.advancementMatrixRadiusY + mY + this.gridSizeY) % this.gridSizeY;
            cumulativeTotal += this.advancementMatrix[mY][mX]*this.activeStep.cell[dX][dY];
          }
        }
        this.nextStep.cell[x][y] = this.advancementFunction(cumulativeTotal) + this.advancementOffsetK;
      }
    }

    // draw the next step's grid to the next canvas
    this.drawStepToCanvas(this.nextStep, this.nextCanvas);

    // switch the display canvas
    this.nextCanvas.style.display = 'initial';
    this.activeCanvas.style.display = 'none';

    // move on to the next step and canvas
    this.activeStepIndex = this.nextStepIndex;
    this.activeCanvasIndex = this.nextCanvasIndex;

    this.incrementIterationCount();
  }

  resetIterationCount() {
    this.iterationCount = 0;
    document.getElementById('iteration-count').innerText = '0';
  }

  incrementIterationCount() {
    document.getElementById('iteration-count').innerText = ++this.iterationCount;
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
