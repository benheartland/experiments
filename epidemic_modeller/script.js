// Define a class of "worlds" in which the model will take place
class World {
  constructor(_id, _width, _height, _individualCount) {
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
    this.display.id = this.id;
    // add the display SVG
    document.body.appendChild(this.display);
 
    // populate the world with individuals
    this.individual = new Array();
    for(var i=0; i<_individualCount; i++) {
      this.addIndividual(i);
    }
  }

  advanceOneTurn() {
    // calculate the next state of the world (and things in it)
    this.individual.forEach(function(i) {
      i.position.calculateNextPosition();
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

  // METHODS
  addIndividual(i) {
    this.individual.push( new Individual( this, this.individual.length, (i==0) ? true : false ) );
  }

}

// Class for describing a virus
class Virus {
  constructor(_transmissionRadius, _transmissionProbability, _infectionTime, _mortalityRate) {
    this.transmissionRadius = _transmissionRadius;
    this.transmissionProbability = _transmissionProbability;
    this.infectionTime = _infectionTime;
    this.mortalityRate = _mortalityRate;
  }
}

// Class for describing the behaviour of an individual
class Behaviour {

  // Pick a random behaviour from those available in the enumeration
  static getRandomBehaviour() {
    return Object.values(BEHAVIOURS)[Math.floor( Math.random() * Object.keys(BEHAVIOURS).length )];
  }

  constructor(_label, _minSpeed, _maxSpeed, _sociability, _directionFunction) {
    this.label = _label;
    this.minSpeed = _minSpeed;
    this.maxSpeed = _maxSpeed;
    this.sociability = _sociability;
    this.directionFunction = _directionFunction;
  }

  // get a random speed between minSpeed and maxSpeed
  get randomSpeed() {
    return (this.maxSpeed - this.minSpeed)*Math.random() + this.minSpeed;
  }

}

function socialBasedDirectionFunction(_object) {
  // 
  var _cumulativeX = 0;
  var _cumulativeY = 0;
  // Cycle through the array of the individuals in the parent world
  _object.parentWorld.individual.forEach(function(i) {
    // ignore _object among the individuals; we are only interested in *other* individuals
    if(i != _object) {
      // work out the vector and squared absolute distance between the objects
      var _dx = i.position.x - _object.position.x;
      var _dy = i.position.y - _object.position.y;
      var _d2 = _dx*_dx + _dy*_dy;
      // use an inverse square distance law to work out how much each individual influences the object
      if(_d2 > 0) {
        _cumulativeX += _dx / _d2;
        _cumulativeY += _dy / _d2;  
      }
    }
  });
  // multiply by the object's sociability factor: negative values are anti-social
  _cumulativeX *= _object.behaviour.sociability;
  _cumulativeY *= _object.behaviour.sociability;
  if (_cumulativeX == 0) {
    return Math.PI/2* Math.sign(_cumulativeY);
  }
  else {
    return Math.atan(_cumulativeY/_cumulativeX) + (Math.sign(_cumulativeX) < 0 ? Math.PI : 0);
  }
}

// Enumerate the different behaviours
const BEHAVIOURS = {
  // StayPut: doesn't move
  stayPut: new Behaviour('P',0,0,0, function(_object) {
    // direction is irrelevant for a stayPut, so just return the current value unchanged
    return _object.direction;
  }),

  // Wanderer: wanders around uninfluenced by other individuals
  wanderer: new Behaviour('W',2,3,0, function(_object) {
    // wanderers travel in a straight line until they hit the edge of the world
    var _direction = _object.direction;
    // if the next move would take the object off the edge of the world, we need to
    // choose a new direction that points back into the world
    var _x = _object.position.x;
    var _y = _object.position.y;
    if (_x == 0) {
      // if the object is in a corner we can simply point it back inside
      if (_y == 0) {_direction = Math.random()*Math.PI/2}
      else if (_y == _object.parentWorld.height) {_direction = Math.random()*Math.PI/2 - Math.PI/2}
      // otherwise we must check the direction
      else if (Math.cos(_direction) < 0) {_direction = Math.random()*Math.PI - Math.PI/2}
    }
    else if (_x == _object.parentWorld.width) {
      // if the object is in a corner we can simply point it back inside
      if (_y == 0) {_direction = Math.random()*Math.PI/2 + Math.PI/2}
      else if (_y == _object.parentWorld.height) {_direction = Math.random()*Math.PI/2 - Math.PI}
      // otherwise we must check the direction
      else if (Math.cos(_direction) > 0) {_direction = Math.random()*Math.PI + Math.PI/2}
    }
    // we have already checked corners, so it is sufficient to check top and bottom edges
    else if (_y == 0 && Math.sin(_direction) < 0) {_direction = Math.random()*Math.PI}
    else if (_y == _object.parentWorld.height && Math.sin(_direction) > 0) {_direction = Math.random()*Math.PI - Math.PI}
    // return the result
    return _direction;
  }),

  // Distancer: gets as far away as possible from others
  distancer: new Behaviour('D',2,3,-1, socialBasedDirectionFunction),

  // Socialiser: goes towards others
  socialiser: new Behaviour('S',2,3,1, socialBasedDirectionFunction)
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
    this.x = Math.random() * this.parent.parentWorld.width;
    this.y = Math.random() * this.parent.parentWorld.height;
  }

  // getters and setters so we can just refer to an individual's "position"
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
  // when setting next x and y, we put the values into the "off" side of the
  // coordinate array
  set nextX(_value) {
    this.coordinate[this.parent.parentWorld.flipperOff][0] = _value;
  }
  set nextY(_value) {
    this.coordinate[this.parent.parentWorld.flipperOff][1] = _value;
  }

  // METHODS

  // calculate the parent object's position on the next turn
  calculateNextPosition() {
    // work out the  parent object's direction based on current state
    this.parent.direction = this.parent.behaviour.directionFunction(this.parent);

    // calculate the next position based on the parent object's current speed and direction
    var _x = this.x + this.parent.speed * Math.cos(this.parent.direction);
    var _y = this.y + this.parent.speed * Math.sin(this.parent.direction);

    // check for positions outside the bounds of the world and bring them back inside
    this.nextX = Math.max(0, Math.min(this.parent.parentWorld.width, _x));
    this.nextY = Math.max(0, Math.min(this.parent.parentWorld.width, _y));

  }

}

// Define a class of "individual"
class Individual {

  // constructor function
  constructor(_world, _id, _infected = false) {
    //backreference to the world to which this individual belongs
    this.parentWorld = _world;
    this.id = _world.id + '-individual-' + _id;
    // start with the individual alive and uninfected
    this.alive = true;
    this.immune = false;
    this.diedOnTurn = null;
    this.infected = _infected; // default: false
    this.infectedOnTurn = null;
    this.infectedBy = null;
    // they also have infected or killed any others
    this.infectedCount = 0;
    this.deathCount = 0;
    // pick a random position within the world
    this.position = new Position(this);
    // what kind of behaviour will it have?
    // TODO: allow this to be influenced by user input to create
    // different balances of behaviours in a world
    this.behaviour = Behaviour.getRandomBehaviour();
    // speed and (initial) direction
    this.speed = this.behaviour.randomSpeed;
    this.direction = Math.random() * 2*Math.PI;
    // clone the class's template SVG to this individual
    this.glyph = Individual.templateGlyph.cloneNode(true);
    this.glyph.id = this.id;
    // set up some accessors for the bits we'll need to change
    this.glyph.backgroundCircle = this.glyph.getElementsByClassName('individual-background-circle').item(0);
    this.glyph.iconTextElement = this.glyph.getElementsByClassName('individual-icon').item(0);
    this.glyph.labelTextElement = this.glyph.getElementsByClassName('individual-label').item(0);
    this.glyph.infectedCountTextElement = this.glyph.getElementsByClassName('individual-infected-count').item(0);
    this.glyph.deathCountTextElement = this.glyph.getElementsByClassName('individual-death-count').item(0);
    // add the individual to the world display
    this.parentWorld.display.appendChild(this.glyph);
    this.redraw();
  }

  get icon() {
    // dead => skull and crossbones
    if(!this.alive) return '\u2620';
    // infected => face with thermometer
    if(this.infected) return '\u{1F912}';
    // otherwise smiley face
    return '\u{1F642}'
  }

  // METHODS

  redraw() {
    var _bgColor = this.infected ? 'red' : 'green';
    this.glyph.backgroundCircle.setAttribute('stroke', _bgColor);
    this.glyph.backgroundCircle.setAttribute('fill', _bgColor);
    this.glyph.iconTextElement.innerHTML = this.icon;
    this.glyph.labelTextElement.innerHTML = this.behaviour.label;
    this.glyph.infectedCountTextElement.innerHTML = this.infectedCount;
    this.glyph.deathCountTextElement.innerHTML = this.deathCount;
    this.glyph.setAttribute('x', this.position.x);
    this.glyph.setAttribute('y', this.position.y);
  }

  // Infect another individual
  infect(otherIndividual) {otherIndividual.infected = true}

  // Die
  die() {
    this.alive = false;
    this.diedOnTurn = parentWorld.turn;
    this.speed = 0;
    // dead individuals can't infect others
    this.infected = false;
  }

  getDistanceFrom(other) {
    var dx = other.position.x - this.position.x;
    var dy = other.position.y - this.position.y;
    return Math.sqrt(dx^2 + dy^2);
  }

}

// Globals
var world1;

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

  // create a new world with individuals populating it
  document.world1 = new World('1', 100, 100, 10);

  // set up a space keypress to advance one turn
  document.addEventListener("keydown", event => {
    if (event.key == ' ') {
      document.world1.advanceOneTurn();
    }
  });

}
