// extend the Math global object with a factorial method
Math.factorial = function(n) {
  var result = 1;
  for(var i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Extend the Array prototype with some handy methods
Array.prototype.distinct = function() {
  var _distinct = new Array();
  this.forEach(function(_value) {
    if(!_distinct.includes(_value)) _distinct.push(_value);
  });
  return _distinct;
}

Array.prototype.max = function() {
  return this.reduce((a, b) => Math.max(a, b), 0);
}

// We'll need 2pi and pi/2 a lot, so save a few cycles by adding them to the Math global object
Math.TWO_PI = Math.PI * 2;
Math.HALF_PI = Math.PI / 2;

// Define a class of "worlds" in which the model will take place
class World {
  constructor(_id, _width, _height, _callbackFunction = null) {
    // basic properties 
    this.id = 'world-' + _id;
    this.width = _width;
    this.height = _height;
    // The number of turns (time units) that have passed in the world
    this.turn = 0;
    // flipper alternates 0,1 on each turn. Used to keep track of which
    // element of the position array is current.
    this.flipperOn = 0;
    this.flipperOff = 1;

    // array of individuals populating the world (initially empty)
    this.individual = new Array();

    // build a user dialog
    var _dialog = document.createElement('dialog');
    _dialog.classList.add('populate-world-dialog');
    _dialog.toptext = document.createElement('p');
    _dialog.toptext.innerText = 'Number of individuals with each behaviour:';
    _dialog.appendChild(_dialog.toptext);
    _dialog.table = document.createElement('table');
    _dialog.table.tbody = document.createElement('tbody');
    var _isFirst = true;
    BEHAVIOUR.forEach(_behaviour => {
      var _inputId = _behaviour.id + '-number-input';
      var _row = document.createElement('tr');
      // table cell containing the input label
      var _labelCell = document.createElement('td');
      var _label = document.createElement('label');
      _label.innerText = _behaviour.displayName + ':';
      _label.for = _inputId;
      _labelCell.appendChild(_label);
      _row.appendChild(_labelCell);
      // table cell containing the input
      var _inputCell = document.createElement('td');
      var _input = document.createElement('input');
      _input.id = _inputId;
      _input.name = _inputId;
      _input.classList.add('population-per-behaviour-input')
      _input.type = 'number';
      _input.value = '0';
      _input.min = '0';
      _input.step ='1';
      // Start with focus on the first input element
      if(_isFirst) {
        _input.autofocus = 'true';
        _isFirst = false;
      }
      _inputCell.appendChild(_input);
      _row.appendChild(_inputCell);
      // add the row to the table
      _dialog.table.tbody.appendChild(_row);
    });
    _dialog.table.appendChild(_dialog.table.tbody);
    _dialog.appendChild(_dialog.table);
    // Buttons
    var _buttonsContainer = document.createElement('div');
    _buttonsContainer.classList.add('button-container');
    _buttonsContainer.style.textAlign = 'right';
    // A button to randomise the population-per-behaviour inputs
    var _randomiseButton = document.createElement('button');
    _randomiseButton.type = 'button';
    _randomiseButton.innerText = 'Randomise';
    _randomiseButton.classList.add('float-left');
    _randomiseButton.addEventListener('click', event => {
      var _inputHtmlCollection = _dialog.getElementsByClassName('population-per-behaviour-input');
      for(var i = 0; i < _inputHtmlCollection.length; i++) {
        _inputHtmlCollection.item(i).value = Math.floor(Math.random() * 31);
      }
    });
    _buttonsContainer.appendChild(_randomiseButton);
    // The "Go!" button
    var _goButton = document.createElement('button');
    _goButton.type = 'submit';
    _goButton.innerText = 'Go!';
    _buttonsContainer.appendChild(_goButton);
    _dialog.appendChild(_buttonsContainer);

    // Append the dialog to the document body
    document.body.appendChild(_dialog);
    // Open the dialog
    _dialog.setAttribute('open', 'true');

    // Set up the Go! button's onclick handler
    _goButton.addEventListener('click',  event => {

      BEHAVIOUR.forEach(_behaviour => {
        var n = document.getElementById(_behaviour.id + '-number-input').value;
        // populate the world with individuals
        for(var i = 0; i < n; i++) {
          this.addIndividual(_behaviour);
        }
      });

      // close the dialog
      _dialog.close();

      // execute the callback function if one was passed
      if(_callbackFunction) {_callbackFunction()}

    })

    // draw the diplay for the world
    this.display = World.templateDisplay.cloneNode(true);
    this.display.viewBox.baseVal.x = 0;
    this.display.viewBox.baseVal.y = 0;
    this.display.viewBox.baseVal.width = this.width;
    this.display.viewBox.baseVal.height = this.height;
    this.display.id = this.id;
    // add the display SVG
    document.body.appendChild(this.display);

  }

  get diagonalLength() {return Math.hypot(this.width, this.height);}

  // An array of viruses currently active in the world
  get activeVirus() {
    var _activeVirus = new Array();
    // Cycle through infected individuals
    this.individual.filter(_individual => _individual.isInfected).forEach(function(_individual) {
      // For each infected individual, cycle through active infections
      _individual.infection.filter(_infection => _infection.active).forEach(function(_infection) {
        // We want the set of distinct viruses that are active in the world. Therefore we only add
        // a virus to the return output if it is not already present.
        if(!_activeVirus.includes(_infection.virus)) {_activeVirus.push(_infection.virus)};
      });
    });
    return _activeVirus;
  }

  // A getter to find the maximum transmissionRadius for viruses active in the world
  get maxTransmissionRadius() {
    var _result = this.activeVirus.map(_virus => _virus.transmissionRadius).max();
    return _result < 1 ? 1 : _result;
  }

  // METHODS
  addIndividual(_behaviour = null) {
    this.individual.push( new Individual(this, this.individual.length, _behaviour) );
  }

  advanceOneTurn(timeDiff) {
    // calculate the next state of the world (and things in it)
    // only update individuals who are alive
    this.individual.filter(i => i.alive).forEach(function(i) {
      i.advanceOneTurn(timeDiff);
    });
    // increment the turn count
    this.turn++;
    // flip the flipper
    this.flipperOn = this.flipperOff;
    this.flipperOff = 1 - this.flipperOff;
    // redraw things in the world
    this.individual.forEach(function(i) {
      i.redraw();
    });
  }

}

// Class for describing a virus
class Virus {
  constructor(_name, _recoveryProbabilityPerTurn, _deathProbabilityPerTurn, _transmissionRadius, _transmissionProbabilityPerTurn) {
    this.name = _name;
    this.recoveryProbabilityPerTurn = _recoveryProbabilityPerTurn;
    this.deathProbabilityPerTurn = _deathProbabilityPerTurn;
    this.transmissionRadius = _transmissionRadius;
    this.transmissionProbability = _transmissionProbabilityPerTurn;
  }

  // METHODS

  // is the given individual infected with this virus?
  isInfected(_individual) {
    return _individual.infection.some(i => i.virus == this);
  }

  // infect an indidual
  infect(_sourceIndividual, _targetIndividual) {
    _targetIndividual.infection.push(new Infection(_sourceIndividual, _targetIndividual, this));
    // increment the count of infections that the source individual has caused. The 'if' guards against
    // _sourceIndividual being null (e.g. in the case of patient zero)
    if(_sourceIndividual) _sourceIndividual.infectedCount++;
  }

}

// an infection of one individual by one virus
class Infection {
  constructor(_sourceIndividual, _targetIndividual, _virus) {
    this.sourceIndividual = _sourceIndividual;
    this.targetIndividual = _targetIndividual;
    this.virus = _virus;
    // the infection is active when it starts
    this.active = true;
    this.startedOnTurn = _targetIndividual.parentWorld.turn;
    this.endedOnTurn = null;
  }

  // METHODS

  // kill the infected individual
  killTarget() {
    this.targetIndividual.die();
    // increment the death count of the source individual (if it exists)
    if(this.sourceIndividual) this.sourceIndividual.deathCount++;
  }

  // action the infection outcome for this turn: recovery, death or continued infection
  act() {
    if(this.active) {
      // get a random number [0,1)
      var p = Math.random();
      // recovery
      if(p < this.virus.recoveryProbabilityPerTurn) {
        this.active = false;
        this.endedOnTurn = this.targetIndividual.parentWorld.turn;
      }
      // death
      else if(1 - p < this.virus.deathProbabilityPerTurn) {
        this.killTarget();
      }
    }
  }

}

// Class for describing the behaviour of an individual
class Behaviour {

  constructor(_id, _displayName, _label, _minMaxSpeed, _maxMaxSpeed, _sociability, _movementFunction) {
    this.id = _id;
    this.displayName = _displayName;
    this.label = _label;
    this.minMaxSpeed = _minMaxSpeed;
    this.maxMaxSpeed = _maxMaxSpeed;
    this.sociability = _sociability;
    // a movement function calculates the position of an object on the next turn.
    // Input: an object with a "position" property (e.g. an Individual)
    // Returns: a Coordinate
    this.movementFunction = _movementFunction;
  }

  // Pick a random behaviour from those available in the enumeration
  static getRandomBehaviour() {
    return Object.values(BEHAVIOUR)[Math.floor( Math.random() * Object.keys(BEHAVIOUR).length )];
  }
  
  // get a random speed between minSpeed and maxSpeed
  get randomMaxSpeed() {
    return (this.maxMaxSpeed - this.minMaxSpeed)*Math.random() + this.minMaxSpeed;
  }

}

function sociabilityBasedMovementFunction(_object, _timeDiff) {
  // 
  var _cumulativeX = 0;
  var _cumulativeY = 0;
  var _sociability = _object.behaviour.sociability;

  var _worldSize = _object.parentWorld.diagonalLength;

  // Cycle through the array of the individuals in the parent world. Ignore _object; we are
  // only interested in *other* individuals
  _object.parentWorld.individual.filter(i => i != _object).forEach(function(_individual) {
    // Work out the vector and absolute distance between the two objects
    var _dx = _individual.position.x - _object.position.x;
    var _dy = _individual.position.y - _object.position.y;
    // Absolute distance between the two objects
    var _d = Math.hypot(_dx, _dy);
    // Sum of their radii
    var _sumOfRadii = _object.radius + _individual.radius;
    // The edge-to-edge distance between them
    var _diff = _d - _sumOfRadii;
    var _diffSquared = _diff * _diff;
    // Normalised vector components
    var _normalisedDx = _d == 0 ? 0 : _dx/_d;
    var _normalisedDy = _d == 0 ? 0 : _dy/_d;
    // Work out how much each individual influences the object.
    // Handle collisions.
    // N.B. there may be very small non-zero values of _diff for which _diffSquared is rounded to zero. We
    // treat the case where _diffSquared == 0 as a collision, since it it crashes the not-collision case 
    // with a divide-by-zero error.
    if(_diff <= 0 || _diffSquared == 0) {
      // Handle the case when _d == 0
      if(_d == 0) {
        // Move away in a random direction
        var _randomDir = Math.TWOPI * Math.random();
        _cumulativeX += Math.cos(_randomDir) * _worldSize;
        _cumulativeY += Math.sin(_randomDir) * _worldSize;
      }
      // Avoid the other individual (living or dead)
      else {
        _cumulativeX += -_normalisedDx * _worldSize;
        _cumulativeY += -_normalisedDy * _worldSize;
      }
    }
    // Handle not-collisions. Consider only living individuals.
    else if(_individual.alive) {
      var _z = 0;
      // Social individuals move towards others.
      if(_sociability > 0) {
        _z = _sociability * 5 * _object.radius / _d;
      }
      // Anti-social individuals move away from others.
      else if (_sociability < 0) {
        var _z = _sociability * _object.parentWorld.maxTransmissionRadius / _diffSquared;
      }
      _cumulativeX += _normalisedDx * _z;
      _cumulativeY += _normalisedDy * _z;
    }
  });

  // set the object's new direction
  if(_cumulativeX == 0) {
    _object.direction = Math.HALF_PI* Math.sign(_cumulativeY);
  }
  else {
    _object.direction = Math.atan(_cumulativeY/_cumulativeX) + (Math.sign(_cumulativeX) < 0 ? Math.PI : 0);
  }
  var _speed = Math.min(_object.maxSpeed, Math.hypot(_cumulativeX, _cumulativeY));
  var _distance = _speed*_timeDiff;
  // return the new position
  return new Coordinate(Math.cos(_object.direction)*_distance + _object.position.x, Math.sin(_object.direction)*_distance + _object.position.y);
}

// Enumerate the different behaviours
const BEHAVIOUR = [

  // Distancer: gets as far away as possible from others
  new Behaviour('distancer', 'Distancer', 'D', 3, 5, -1, sociabilityBasedMovementFunction),

  // StayPut: doesn't move
  new Behaviour('stayput', 'StayPut', 'P', 0, 0, 0, function(_object) {
    // just return the current position unchanged
    return new Coordinate(_object.position.x, _object.position.y);
  }),

  // Wanderer: wanders around uninfluenced by other individuals
  new Behaviour('wanderer', 'Wanderer', 'W', 3, 5, 0, function(_object, _timeDiff) {
    // wanderers travel in a straight line at max speed until they hit the edge of the world
    var _x = _object.position.x;
    var _y = _object.position.y;
    var _direction = _object.direction;

    // if the next move would take the object off the edge of the world, we need to
    // choose a new direction that points back into the world
    if (_x == 0) {
      // if the object is in a corner we can simply point it back inside
      if (_y == 0) {_direction = Math.random()*Math.HALF_PI}
      else if (_y == _object.maxY) {_direction = Math.random()*Math.HALF_PI - Math.HALF_PI}
      // otherwise we must check the direction
      else if (Math.cos(_direction) < 0) {_direction = Math.random()*Math.PI - Math.HALF_PI}
    }
    else if (_x == _object.maxX) {
      // if the object is in a corner we can simply point it back inside
      if (_y == 0) {_direction = Math.random()*Math.HALF_PI + Math.HALF_PI}
      else if (_y == _object.maxY) {_direction = Math.random()*Math.HALF_PI - Math.PI}
      // otherwise we must check the direction
      else if (Math.cos(_direction) > 0) {_direction = Math.random()*Math.PI + Math.HALF_PI}
    }
    // we have already checked corners, so it is sufficient to check top and bottom edges
    else if (_y == 0 && Math.sin(_direction) < 0) {_direction = Math.random()*Math.PI}
    else if (_y == _object.maxY && Math.sin(_direction) > 0) {_direction = Math.random()*Math.PI - Math.PI}

    // Cycle through the array of the individuals in the parent world. Filter out _object;
    // we are only interested in *other* individuals
    var _cumulativeX = 0;
    var _cumulativeY = 0;
    _object.parentWorld.individual.filter(i => i != _object).forEach(function(_individual) {
      // work out the vector and absolute distance between the two objects
      var _dx = _individual.position.x - _object.position.x;
      var _dy = _individual.position.y - _object.position.y;
      // absolute distance between the two objects
      var _d = Math.hypot(_dx, _dy);
      // Sum of their radii
      var _sumOfRadii = _object.radius + _individual.radius;
      // 
      var _diff = _d - _sumOfRadii;
      // 
      var _normalisedDx = _d == 0 ? 0 : _dx/_d;
      var _normalisedDy = _d == 0 ? 0 : _dy/_d;
      // work out how much each individual influences the object.
      // only change direction if colliding
      if(_diff <= 0) {
        // handle the case when _d == 0
        if(_d == 0) {
          // move away in a random direction
          var _randomDir = Math.TWOPI * Math.random();
          _cumulativeX += Math.cos(_randomDir) * _sumOfRadii;
          _cumulativeY += Math.sin(_randomDir) * _sumOfRadii;
        }
        // avoid the other individual (living or dead)
        else {
          var _z = -_sumOfRadii;
          _cumulativeX += _normalisedDx * _z;
          _cumulativeY += _normalisedDy * _z;
        }
      }
    });

    //
    var _speed = _object.maxSpeed
    if(_cumulativeX != 0 || _cumulativeY != 0 ) {
      // set the object's new direction
      if(_cumulativeX == 0) {
        _direction = Math.HALF_PI* Math.sign(_cumulativeY);
      }
      else {
        _direction = Math.atan(_cumulativeY/_cumulativeX) + (Math.sign(_cumulativeX) < 0 ? Math.PI : 0);
      }
      _speed = Math.min(_object.maxSpeed, Math.hypot(_cumulativeX, _cumulativeY));
    }

    // set the object's new direction (which may not have changed)
    _object.direction = _direction;

    var _distance = _speed*_timeDiff;
    // return the new position
    return new Coordinate(Math.cos(_object.direction)*_distance + _object.position.x, Math.sin(_object.direction)*_distance + _object.position.y);

  }),

  // Socialiser: goes towards others
  new Behaviour('socialiser', 'Socialiser', 'S', 3, 5, 1, sociabilityBasedMovementFunction)

];

class Coordinate {
  constructor(x = 0, y = 0) {
    this[0] = x;
    this[1] = y;
  }

  get x() {return this[0];}
  set x(_value) {this[0] = _value;}
  get y() {return this[1];}
  set y(_value) {this[1] = _value;}

  static randomDisplacement(_maxRadius) {
    var _radius = _maxRadius * Math.random();
    var _direction = Math.TWO_PI * Math.random();
    return [_radius * Math.cos(_direction), _radius * Math.sin(_direction)];
  }
  
  randomise(_minX, _minY, _maxX, _maxY) {
    this[0] = (_maxX - _minX) * Math.random() + _minX;
    this[1] = (_maxY - _minY) * Math.random() + _minY;
  }

  add(_vector) {
    this[0] += _vector[0];
    this[1] += _vector[1];
  }

}

class Position {
  constructor(_object) {
    // backreference to the object to which the Position instance belongs
    this.parent = _object;
    // we need two sets of position coordinates, one to store the current state and
    // one for position on the next turn
    this.coordinate = new Array(2);
    this.coordinate.fill(new Coordinate());
    // set a random starting position within the world. Uses the setters below.
    this.coordinate[this.parent.parentWorld.flipperOn].randomise(0, 0, _object.maxX, _object.maxY);
    /*
     = Math.random() * (_object.maxX);
    this.y = Math.random() * (_object.maxY);
    */
  }

  // getters and setters so we can just refer to an individual's "position" withour worrying
  // about which side the flipper is on.
  get x() {
    return this.coordinate[this.parent.parentWorld.flipperOn][0];
  }
  get y() {
    return this.coordinate[this.parent.parentWorld.flipperOn][1];
  }
  set x(_value) {
    this.coordinate[this.parent.parentWorld.flipperOn][0] = _value;
  }
  set y(_value) {
    this.coordinate[this.parent.parentWorld.flipperOn][1] = _value;
  }
  // when [gs]etting next x and y, we put the values into the "off" side of the
  // coordinate array
  get nextX() {
    return this.coordinate[this.parent.parentWorld.flipperOff][0];
  }
  get nextY() {
    return this.coordinate[this.parent.parentWorld.flipperOff][1];
  }
  set nextX(_value) {
    this.coordinate[this.parent.parentWorld.flipperOff][0] = _value;
  }
  set nextY(_value) {
    this.coordinate[this.parent.parentWorld.flipperOff][1] = _value;
  }

  // METHODS

  // calculate the parent object's position on the next turn
  calculateNext(timeDiff) {
    // work out the object's next position based on current state
    var _newCoordinate = this.parent.behaviour.movementFunction(this.parent, timeDiff);
    // add a small random displacement to every move to avoid things getting stuck
    _newCoordinate.add(Coordinate.randomDisplacement(this.parent.radius*0.01));

    // check for positions outside the bounds of the world and bring them back inside
    this.nextX = Math.max(0, Math.min(this.parent.maxX, _newCoordinate[0]));
    this.nextY = Math.max(0, Math.min(this.parent.maxY, _newCoordinate[1]));

  }

}

// Define a class of "individual"
class Individual {

  // Constructor function
  constructor(_world, _id, _behaviour = null) {
    // Backreference to the world to which this individual belongs
    this.parentWorld = _world;
    this.id = _world.id + '-individual-' + _id;
    // Start with the individual alive and uninfected
    this.alive = true;
    this.immune = false;
    this.diedOnTurn = null;
    this.infection = new Array(); // Array of the infection this individual currently has (initially empty)
    // They also have infected or killed any others
    this.infectedCount = 0;
    this.deathCount = 0;

    // What kind of behaviour will it have? Defaults to a random choice
    this.behaviour = _behaviour ? _behaviour : Behaviour.getRandomBehaviour();

    // Speed and (initial) direction
    this.maxSpeed = this.behaviour.randomMaxSpeed;
    this.direction = Math.random() * Math.TWO_PI;
    // Clone the class's template SVG to this individual
    this.glyph = Individual.templateGlyph.cloneNode(true);
    this.width = this.glyph.width.baseVal.valueInSpecifiedUnits;
    this.height = this.glyph.height.baseVal.valueInSpecifiedUnits;
    // Take half width as the radius for purposes of collision detection
    this.radius = this.width/2;
    this.glyph.id = this.id;
    // Set up some accessors for the bits we'll need to change
    this.glyph.backgroundCircle = this.glyph.getElementsByClassName('individual-background-circle').item(0);
    this.glyph.iconTextElement = this.glyph.getElementsByClassName('individual-icon').item(0);
    this.glyph.labelTextElement = this.glyph.getElementsByClassName('individual-label').item(0);
    this.glyph.infectedCountTextElement = this.glyph.getElementsByClassName('individual-infected-count').item(0);
    this.glyph.deathCountTextElement = this.glyph.getElementsByClassName('individual-death-count').item(0);
    this.glyph.title = this.glyph.getElementsByTagName('title').item(0);
    // Pick a random position within the world
    this.position = new Position(this);
    // Add the individual to the world display
    this.parentWorld.display.appendChild(this.glyph);
    this.redraw();
  }

  // Is the individual currently infected with anything?
  get isInfected() {
    return this.infection.filter(i => i.active).length > 0 ? true : false;
  }

  get icon() {
    // dead => skull and crossbones
    if(!this.alive) return '\u2620';
    // infected => face with thermometer
    if(this.isInfected) return '\u{1F912}';
    // otherwise smiley face
    return '\u{1F642}'
  }

  // The maximum allowed value of position.x for this object
  get maxX() {
    return this.parentWorld.width - this.width;
  }

  // The maximum allowed value of position.y for this object
  get maxY() {
    return this.parentWorld.height - this.height;
  }

  // METHODS

  redraw() {
    var _bgColor = this.alive ? this.isInfected ? 'red' : 'green' : 'grey';
    this.glyph.backgroundCircle.setAttribute('stroke', _bgColor);
    this.glyph.backgroundCircle.setAttribute('fill', _bgColor);
    this.glyph.iconTextElement.innerHTML = this.icon;
    this.glyph.labelTextElement.innerHTML = this.behaviour.label;
    this.glyph.infectedCountTextElement.innerHTML = this.infectedCount;
    this.glyph.deathCountTextElement.innerHTML = this.deathCount;
    this.glyph.setAttribute('x', this.position.x);
    this.glyph.setAttribute('y', this.position.y);
    var statusText = this.alive ? this.isInfected ? ' (infected)' : '' : ' (dead)';
    this.glyph.title.innerHTML = `${this.behaviour.displayName}${statusText}
Infected ${this.infection.length} times.
Caused ${this.infectedCount} infections, of which ${this.deathCount} ended in death.`;
  }

  // Die
  die() {
    this.alive = false;
    this.maxSpeed = 0;
    this.diedOnTurn = this.parentWorld.turn;
  }

  // Get the distance from another individual.
  getDistanceFrom(that) {
    var _dx = that.position.x - this.position.x;
    var _dy = that.position.y - this.position.y;
    return Math.hypot(_dx, _dy);
  }

  advanceOneTurn(timeDiff) {
    // For each active infection on this individual, work out what will happen.
    this.infection.filter(i => i.active).forEach(function(_infection) {

      // Will any other individuals get infected? Filter out those who are already infected or outside the transmission radius
      this.parentWorld.individual.filter( that => (!_infection.virus.isInfected(that)) && (this.getDistanceFrom(that) < _infection.virus.transmissionRadius) ).forEach(function(that) {
        if(Math.random() < _infection.virus.transmissionProbability) {
          _infection.virus.infect(this, that);
        }
      }, this);

      // What will be the action of the infection on this individual on this turn (e.g. death, recovery, nothing)
      _infection.act();

    }, this);
    // Calculate this individual's position on next turn
    this.position.calculateNext(timeDiff);
  }

}

// Create an instance of a world
window.onload = function() {
  // Clone the template of the SVG for a from the initial document, and add it as
  // a static property of the World class.
  World.templateDisplay = document.getElementById('template-world').cloneNode(true);
  // Do similar for the 'individual' template 
  Individual.templateGlyph = document.getElementById('template-individual').cloneNode(true);
  // Remove templates from the document. Not strictly necessary because the templates are not
  // displayed but it keeps the DOM clean.
  document.getElementById('templates').remove();

  var isAnimating = false;
  var lastAnimationFrameTimestamp;
  // Callback function for requestAnimationFrame(). animationFrameTimestamp is the timestamp passed 
  // in by requestAnimationFrame(), in milliseconds.
  function animate(animationFrameTimestamp) {
    // work out the time since the last frame (in seconds)
    var animationFrameTimeDiff = (animationFrameTimestamp - lastAnimationFrameTimestamp) * 0.001;
    lastAnimationFrameTimestamp = animationFrameTimestamp;
    // Advance the world one turn. The "if" guards against against long time diffs due to the user
    // clicking away from the page and returning some time later. Progress will be paused while
    // the window is not visible.
    if(animationFrameTimeDiff < 0.1) document.world.advanceOneTurn(animationFrameTimeDiff);
    if(isAnimating) window.requestAnimationFrame(animate);
  }
  // Callback function to kick off animation
  function startAnimation(animationFrameTimestamp) {
    isAnimating = true;
    lastAnimationFrameTimestamp = animationFrameTimestamp;
    window.requestAnimationFrame(animate);
  }
  // Stop the animation after the next frame
  function stopAnimation() {
    isAnimating = false;
  }

  // Create a new world
  document.world = new World('1', 25, 25, function() {
    // Create a virus (name, recoveryProbabilityPerTurn, deathProbabilityPerTurn, transmissionRadius, transmissionProbabilityPerTurn)
    var virus = new Virus('Virus1', 0.002, 0.002, 4, 0.01);
    // Infect patient zero
    var _randomIndex = Math.floor(Math.random() * document.world.individual.length);
    virus.infect(null, document.world.individual[_randomIndex]);
    document.world.individual[_randomIndex].redraw();
    // start the animation.
    window.requestAnimationFrame(startAnimation);
  });

  // set up space bar to start/stop animation
  window.addEventListener('keydown', event => {
    if(event.key == ' ') {
      if(isAnimating) stopAnimation()
      else startAnimation();  
    }
  });

}
