// extend the Math object with a factorial method
Math.factorial = function(n) {
  var result = 1;
  for(var i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}


// Define a class of "worlds" in which the model will take place
class World {
  constructor(_id, _width, _height, _individualCount) {
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

    // draw the diplay for the world
    this.display = World.templateDisplay.cloneNode(true);
    this.display.viewBox.baseVal.x = 0;
    this.display.viewBox.baseVal.y = 0;
    this.display.viewBox.baseVal.width = this.width;
    this.display.viewBox.baseVal.height = this.height;
    this.display.id = this.id;
    // add the display SVG
    document.body.appendChild(this.display);

    // populate the world with individuals
    this.individual = new Array();
    for(var i=0; i<_individualCount; i++) {
      this.addIndividual();
    }
  }

  // TODO: a getter find the maximum transmissionRadius for viruses present in the world
  // get maxTransmissionRadius() {}

  // METHODS
  addIndividual() {
    this.individual.push( new Individual( this, this.individual.length, false ) );
  }

  advanceOneTurn() {
    // calculate the next state of the world (and things in it)
    // only update individuals who are alive
    this.individual.filter(i => i.alive).forEach(function(i) {
      i.advanceOneTurn();
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

  // Pick a random behaviour from those available in the enumeration
  static getRandomBehaviour() {
    return Object.values(BEHAVIOURS)[Math.floor( Math.random() * Object.keys(BEHAVIOURS).length )];
  }

  constructor(_name, _label, _minMaxSpeed, _maxMaxSpeed, _sociability, _movementFunction) {
    this.name = _name;
    this.label = _label;
    this.minMaxSpeed = _minMaxSpeed;
    this.maxMaxSpeed = _maxMaxSpeed;
    this.sociability = _sociability;
    this.movementFunction = _movementFunction;
  }

  // get a random speed between minSpeed and maxSpeed
  get randomMaxSpeed() {
    return (this.maxMaxSpeed - this.minMaxSpeed)*Math.random() + this.minMaxSpeed;
  }

}

function sociabilityBasedMovementFunction(_object) {
  // 
  var _cumulativeX = 0;
  var _cumulativeY = 0;
  var _sociability = _object.behaviour.sociability;
  // Cycle through the array of the individuals in the parent world. Exclude dead individuals and
  // ignore _object among the individuals; we are only interested in *other* individuals
  _object.parentWorld.individual.filter(i => i.alive && i != _object).forEach(function(_individual) {
    // work out the vector and absolute distance between the two objects
    var _dx = _individual.position.x - _object.position.x;
    var _dy = _individual.position.y - _object.position.y;
    var _d = Math.hypot(_dx, _dy);
    // _d scaled to sum of the radii of the two objects
    var _dr = _d/(_object.radius + _individual.radius);
    // _d scaled to width of the world
    var _dw = _d/(_object.parentWorld.width);
    // we need to handle the case when z == 0
    if(_d == 0) {
      // move away in a random direction
      var _randomDir = Math.random() * 2 * Math.PI;
      _cumulativeX += Math.cos(_randomDir);
      _cumulativeY += Math.sin(_randomDir);
    }
    // use an inverse distance law to work out how much each individual influences the object.
    // social individuals should stop attracting once they are next to each other.
    else if( _sociability >= 0 ) {
      var _z = _sociability*_dw - 5/(_dr*_dr*_dr*_dr);;
      _cumulativeX += _dx * _z;
      _cumulativeY += _dy * _z;
    }
    // anti-social individuals should always move strongly away from others.
    else if( _sociability < 0) {
      // TODO work out what the function should be here.
      var _z = _sociability*_dw - Math.factorial(_object.parentWorld.individual.length)/(_dr*_dr*_dr);
      _cumulativeX += _dx * _z;
      _cumulativeY += _dy * _z;
    }
  });
  // scale by the object's radius and multiply by the object's sociability factor
  // N.B. negative values are anti-social
//  _cumulativeX *= _object.radius * _sociability;
//  _cumulativeY *= _object.radius * _sociability;
  // set the object's new direction
  if(_cumulativeX == 0) {
    _object.direction = Math.PI/2* Math.sign(_cumulativeY);
  }
  else {
    _object.direction = Math.atan(_cumulativeY/_cumulativeX) + (Math.sign(_cumulativeX) < 0 ? Math.PI : 0);
  }
  var _speed = Math.min(_object.maxSpeed, Math.hypot(_cumulativeX, _cumulativeY));
  // return the new position
  return [Math.cos(_object.direction)*_speed + _object.position.x, Math.sin(_object.direction)*_speed + _object.position.y];
}

// Enumerate the different behaviours
const BEHAVIOURS = {
/*
  // StayPut: doesn't move
  stayPut: new Behaviour('StayPut', 'P', 0, 0, 0, function(_object) {
    // just return the current position unchanged
    return [_object.position.x, _object.position.y];
  }),

  // Wanderer: wanders around uninfluenced by other individuals
  wanderer: new Behaviour('Wanderer', 'W', 0.1, 0.2, 0, function(_object) {
    // wanderers travel in a straight line at max speed until they hit the edge of the world
    var _x = _object.position.x;
    var _y = _object.position.y;
    var _direction = _object.direction;
    // if the next move would take the object off the edge of the world, we need to
    // choose a new direction that points back into the world
    if (_x == 0) {
      // if the object is in a corner we can simply point it back inside
      if (_y == 0) {_direction = Math.random()*Math.PI/2}
      else if (_y == _object.maxY) {_direction = Math.random()*Math.PI/2 - Math.PI/2}
      // otherwise we must check the direction
      else if (Math.cos(_direction) < 0) {_direction = Math.random()*Math.PI - Math.PI/2}
    }
    else if (_x == _object.maxX) {
      // if the object is in a corner we can simply point it back inside
      if (_y == 0) {_direction = Math.random()*Math.PI/2 + Math.PI/2}
      else if (_y == _object.maxY) {_direction = Math.random()*Math.PI/2 - Math.PI}
      // otherwise we must check the direction
      else if (Math.cos(_direction) > 0) {_direction = Math.random()*Math.PI + Math.PI/2}
    }
    // we have already checked corners, so it is sufficient to check top and bottom edges
    else if (_y == 0 && Math.sin(_direction) < 0) {_direction = Math.random()*Math.PI}
    else if (_y == _object.maxY && Math.sin(_direction) > 0) {_direction = Math.random()*Math.PI - Math.PI}
    // set the object's new direction
    _object.direction = _direction;
    // return the result
    return [Math.cos(_direction)*_object.maxSpeed + _x, Math.sin(_direction)*_object.maxSpeed + _y];
  }),
*/
  // Distancer: gets as far away as possible from others
  distancer: new Behaviour('Distancer', 'D', 0.05, 0.1, -1, sociabilityBasedMovementFunction),

  // Socialiser: goes towards others
  socialiser: new Behaviour('Socialiser', 'S', 0.05, 0.1, 1, sociabilityBasedMovementFunction)

}

class Position {
  constructor(_object) {
    // backreference to the object to which the Position instance belongs
    this.parent = _object;
    // we need to sets of position coordinates, one to store the current state and
    // one for position on the next turn
    this.coordinate = new Array(2);
    this.coordinate.fill([0,0]);
    // set a random starting position within the world. Uses the setters below.
    this.x = Math.random() * (_object.maxX);
    this.y = Math.random() * (_object.maxY);
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
  calculateNext() {
    // work out the object's next position based on current state
    var _newCoordinate = this.parent.behaviour.movementFunction(this.parent);

    // avoid two objects occupying the same space
    this.parent.parentWorld.individual.forEach(function(that) {
      var _d = this.parent.getDistanceFrom(that);
      if(_d < this.parent.radius + that.radius) {
        // TODO take evasive action
        console.log('Collision! ' + _d + ' < ' + this.parent.radius + ' + ' + that.radius);
      }
    }, this);

    // check for positions outside the bounds of the world and bring them back inside
    this.nextX = Math.max(0, Math.min(this.parent.maxX, _newCoordinate[0]));
    this.nextY = Math.max(0, Math.min(this.parent.maxY, _newCoordinate[1]));

  }

}

// Define a class of "individual"
class Individual {

  // constructor function
  constructor(_world, _id) {
    //backreference to the world to which this individual belongs
    this.parentWorld = _world;
    this.id = _world.id + '-individual-' + _id;
    // start with the individual alive and uninfected
    this.alive = true;
    this.immune = false;
    this.diedOnTurn = null;
    this.infection = new Array(); // array of the infection this individual currently has (initially empty)
    // they also have infected or killed any others
    this.infectedCount = 0;
    this.deathCount = 0;
    // what kind of behaviour will it have?
    // TODO: allow this to be influenced by user input to create
    // different balances of behaviours in a world

    this.behaviour = Behaviour.getRandomBehaviour();

    // speed and (initial) direction
    this.maxSpeed = this.behaviour.randomMaxSpeed;
    this.direction = Math.random() * 2*Math.PI;
    // clone the class's template SVG to this individual
    this.glyph = Individual.templateGlyph.cloneNode(true);
    this.width = this.glyph.width.baseVal.valueInSpecifiedUnits;
    this.height = this.glyph.height.baseVal.valueInSpecifiedUnits;
    // take half width as the radius for purposes of collision detection
    this.radius = this.width/2;
    this.glyph.id = this.id;
    // set up some accessors for the bits we'll need to change
    this.glyph.backgroundCircle = this.glyph.getElementsByClassName('individual-background-circle').item(0);
    this.glyph.iconTextElement = this.glyph.getElementsByClassName('individual-icon').item(0);
    this.glyph.labelTextElement = this.glyph.getElementsByClassName('individual-label').item(0);
    this.glyph.infectedCountTextElement = this.glyph.getElementsByClassName('individual-infected-count').item(0);
    this.glyph.deathCountTextElement = this.glyph.getElementsByClassName('individual-death-count').item(0);
    this.glyph.title = this.glyph.getElementsByTagName('title').item(0);
    // pick a random position within the world
    this.position = new Position(this);
    // add the individual to the world display
    this.parentWorld.display.appendChild(this.glyph);
    this.redraw();
  }

  // is the individual currently infected with anything?
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

  // the maximum allowed value of position.x for this object
  get maxX() {
    return this.parentWorld.width - this.width;
  }

  // the maximum allowed value of position.y for this object
  get maxY() {
    return this.parentWorld.height - this.height;
  }

  // METHODS

  redraw() {
    var _bgColor = this.alive ? this.isInfected ? 'red' : 'green' : 'black';
    this.glyph.backgroundCircle.setAttribute('stroke', _bgColor);
    this.glyph.backgroundCircle.setAttribute('fill', _bgColor);
    this.glyph.iconTextElement.innerHTML = this.icon;
    this.glyph.labelTextElement.innerHTML = this.behaviour.label;
    this.glyph.infectedCountTextElement.innerHTML = this.infectedCount;
    this.glyph.deathCountTextElement.innerHTML = this.deathCount;
    this.glyph.setAttribute('x', this.position.x);
    this.glyph.setAttribute('y', this.position.y);
    var statusText = this.alive ? this.isInfected ? ' (infected)' : '' : ' (dead)';
    this.glyph.title.innerHTML = `${this.behaviour.name}${statusText}
Caused ${this.infectedCount} infections, of which ${this.deathCount} ended in death.`;
  }

  // Die
  die() {
    this.alive = false;
    this.maxSpeed = 0;
    this.diedOnTurn = this.parentWorld.turn;
  }

  getDistanceFrom(that) {
    var _dx = that.position.x - this.position.x;
    var _dy = that.position.y - this.position.y;
    return Math.hypot(_dx, _dy);
  }

  advanceOneTurn() {
    // for each active infection on this individual, work out what will happen.
    this.infection.filter(i => i.active).forEach(function(_infection) {

      // will any other individuals get infected? Filter out those who are already infected or outside the transmission radius
      this.parentWorld.individual.filter( that => (!_infection.virus.isInfected(that)) && (this.getDistanceFrom(that) < _infection.virus.transmissionRadius) ).forEach(function(that) {
        if(Math.random() < _infection.virus.transmissionProbability) {
          _infection.virus.infect(this, that);
        }
      }, this);

      // what will be action of the infection on this individual on this turn (e.g. death, recovery, nothing)
      _infection.act();

    }, this);
    // calculate this individual's position on next turn
    this.position.calculateNext();
  }

}

// create an instance of a world
window.onload = function() {
  // Clone the template of the SVG for a from the initial document, and add it as
  // a static property of the World class.
  World.templateDisplay = document.getElementById('template-world').cloneNode(true);
  // Do similar for the 'individual' template 
  Individual.templateGlyph = document.getElementById('template-individual').cloneNode(true);
  // Remove templates from the document. Not strictly necessary because the templates are not
  // displayed but it keeps the DOM clean
  document.getElementById('templates').remove();

  // create a virus (name, recoveryProbabilityPerTurn, deathProbabilityPerTurn, transmissionRadius, transmissionProbabilityPerTurn)
  var virus = new Virus('Virus1', 0.01, 0.005, 3, 0.15);

  // create a new world with individuals populating it
  document.world = new World('1', 15, 15, 50);

  // infect patient zero
  virus.infect(null, document.world.individual[0]);
  document.world.individual[0].redraw();

  // set up a space keypress to advance one turn
  document.addEventListener("keydown", event => {
    if (event.key == ' ') {
      document.world.advanceOneTurn();
    }
  });

}
