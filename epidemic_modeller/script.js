// Define the "world" in which the model will take place
var world = new Object();
world.width = 1000.0;
world.height = 1000.0;
world.turn = 0;

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
  constructor() {
    // start with the individual alive and unifected
    this.alive = true;
    this.diedOnTurn = -1;
    this.infected = false;
    this.infectedOnTurn = -1;
    // pick a random position within the world
    this.position.x = Math.random() * world.width;
    this.position.y = Math.random() * world.height;
    // 
    this.behaviour = Behaviour.getRandomBehaviour();
    this.label = this.behaviour.label;
    this.speed = this.behaviour.randomSpeed;
    this.direction = Math.random() * 2*Math.PI;
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
    // set label to a skull and crossbones
    this.label = '\u2620';
  }

}
