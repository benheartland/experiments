var canvas, context;
var freq = 1;

function onLoad() {
	canvas = document.getElementById('canvas');
	twoD = canvas.getContext('2d');
	window.requestAnimationFrame(drawFrame);
}

function drawFrame() {
	var time = new Date();
	var colorOffset = Math.round(time.getTime()*0.360*freq) % 360;
//	alert(colorOffset);
	for (var i = 0; i < 360; i++) {
		twoD.beginPath();
		twoD.strokeStyle = 'hsl(' + (i + colorOffset).toString() + ', 100%, 50%)';
		twoD.arc(250, 250, i, 0, Math.PI*2)
		twoD.stroke();
	}
	window.requestAnimationFrame(drawFrame);
}