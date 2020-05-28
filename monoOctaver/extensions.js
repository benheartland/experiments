// 
function generateID() {
  var id = '';
  for(let i = 0; i < 32; i++) {
    var n = Math.floor(Math.random()*36);
    if(n < 10) {n += 48;}
    else {n += 87;}
    id += String.fromCharCode(n);
  }
  return id;
}

// Extend JSON with an object deep clone static method.
JSON.deepCloneObject = function(_object) {
  return JSON.parse(JSON.stringify(_object));
}

// Extend AudioContext with a getter to report output latency (or base latency if outputLatency
// is not supported)
Object.defineProperty(AudioContext.prototype, 'outputOrBaseLatencyString', {get: function() {
  if (typeof(this.outputLatency) === 'number') {
    return 'Output latency: ' + (this.outputLatency*1000) + 'ms';
  } 
  if (typeof(this.baseLatency) === 'number') {
    return 'Base latency: ' + (this.baseLatency*1000) + 'ms';
  }
  return 'Output/Base latency not available';

}})

// Extend AudioContext with a resumeIfSuspended() method.
AudioContext.prototype.resumeIfSuspended = function() {
  switch (this.state) {
    // Return the resume() promise, which resolves when the AudioContext resumes.
    case 'suspended': 
      return this.resume();
      break;
    // Return an already-resolved promise, since the AudioContext is already running.
    case 'running': 
      return Promise.resolve();
      break;
    // Return an already-rejected promise, since the AudioContext is closed and cannot be resumed.
    case 'closed': 
      return Promise.reject(); 
      break;
    // If it's anything else somthing has gone really wrong.
    default: 
      throw new Error(`AudioContext ${this} has unrecognised state '${this.state}'`);
  }
}

// HTMLTableRowElement.insertHeaderCell() - an extension, not a polyfill. This method
// does for <th> header cells what insertCell() does for <td> data cells.
if(typeof(HTMLTableRowElement.prototype.insertHeaderCell) === 'undefined') {  
  HTMLTableRowElement.prototype.insertHeaderCell = function(_index = -1) {
    // Piggyback on the insertCell() method to first create a <td> cell.
    // Doing this ensures that any an invalid index value will cause an
    // IndexSizeError, as with insertCell().
    _tdElement = this.insertCell(_index);
    // Create a <th> cell
    _thElement = document.createElement('th');
    // Replace the <td> cell with the <th> cell
    this.replaceChild(_thElement, _tdElement);
    // Return the <th> cell
    return _thElement; 
  }
}
