// Define a class of "worlds" in which the model will take place
class World {
  constructor(_width, _height) {
    this.width = _width;
    this.height = _height;
    // The number of turns (time units) that have passed in the world
    this.turn = 0;
    // This will hold the individuals who populate the world
    this.individual = new Array();
  }

  // METHODS
  addIndividual() {
    this.individual.push(new Individual(this, this.individual.length));
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

  constructor(_label, _minSpeed, _maxSpeed, _sociability) {
    this.label = _label;
    this.minSpeed = _minSpeed;
    this.maxSpeed = _maxSpeed;
    this.sociability = _sociability;
  }

  // get a random speed between minSpeed and maxSpeed
  get randomSpeed() {
    return (this.maxSpeed - this.minSpeed)*Math.random() + this.minSpeed;
  }

}

// Enumerate the different behaviours
const BEHAVIOURS = {
  stayPut: new Behaviour('P',0,0,0),
  wanderer: new Behaviour('W',2,3,0),
  distancer: new Behaviour('D',2,3,-1),
  socialiser: new Behaviour('S',2,3,1)
}

// Define a class of "individual"
class Individual {

  // constructor function
  constructor(_world, _id) {
    //backreference to the world to which this individual belongs
    this.world = _world;
    this.id = _id;
    // start with the individual alive and unifected
    this.alive = true;
    this.immune = false;
    this.diedOnTurn = null;
    this.infected = false;
    this.infectedOnTurn = null;
    this.infectedBy = null;
    // pick a random position within the world
    this.positionX = Math.random() * this.world.width;
    this.positionY = Math.random() * this.world.height;
    // what kind of behaviour will it have?
    this.behaviour = Behaviour.getRandomBehaviour();
    // speed and (initial) direction
    this.speed = this.behaviour.randomSpeed;
    this.direction = Math.random() * 2*Math.PI;
  }

  get icon() {
    // dead => skull and crossbones
    if(!this.alive) return '\u2620';
    // infected => face with thermometer
    if(this.infected) return '\u{1F912}';
    // otherwise smiley face
    return '\u{1F642}'
  }

  get svg() {
    var _svg = document.createElement('svg');
    _svg.classList.add('individual');
    _svg.id = this.id;
    // positioning
    _svg.style.position = 'absolute';
    _svg.style.left = this.position.x/this.world.width + '%';
    _svg.style.right = this.position.y/this.world.height + '%';
    // content
    var _text = document.createElement('text');
    _text.innerText = this.icon;
    _svg.appendChild(_text);
  }

  // METHODS

  // Infect another individual
  infect(otherIndividual) {otherIndividual.infected = true}

  // Die
  die() {
    this.alive = false;
    this.diedOnTurn = world.turn;
    this.speed = 0;
    // dead individuals can't infect others
    this.infected = false;
  }

}

// create an instance of a world
var world = new World();
