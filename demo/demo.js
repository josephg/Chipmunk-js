
var v = function(x, y) {
  return new cp.Vect(x, y);
};

var Demo = function() {
	var space = this.space = new cp.Space();
	this.remainder = 0;
	

	// HACK HACK HACK - this shouldn't be here.
	var self = this;
	var canvas2point = function(x, y) {
		return v(x / self.scale, 480 - y / self.scale);
	};

	this.canvas.onmousedown = function(e) {
		radius = 10;
		mass = 3;
		body = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, v(0, 0))));
		body.setPos(canvas2point(e.clientX, e.clientY));
		circle = space.addShape(new cp.CircleShape(body, radius, v(0, 0)));
		circle.setElasticity(0.5);
		return circle.setFriction(1);
	};
};

var canvas = Demo.prototype.canvas = document.getElementsByTagName('canvas')[0];

canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";

var ctx = Demo.prototype.ctx = canvas.getContext('2d');
ctx.lineCap = 'round';

// The physics space size is 640x480, with the origin in the bottom left.
// Its really an arbitrary number except for the ratio - everything is done
// in floating point maths anyway.

window.onresize = function(e) {
	var width = Demo.prototype.width = canvas.width = window.innerWidth;
	var height = Demo.prototype.height = canvas.height = window.innerHeight;
	if (width/height > 640/480) {
		Demo.prototype.scale = height / 480;
	} else {
		Demo.prototype.scale = width / 640;
	}

	Demo.resized = true;
};
window.onresize();

var requestAnimationFrame = window.requestAnimationFrame
	|| window.webkitRequestAnimationFrame
	|| window.mozRequestAnimationFrame
	|| window.oRequestAnimationFrame
	|| window.msRequestAnimationFrame
	|| function(callback) {
		return window.setTimeout(callback, 1000 / 60);
	};

// These should be overridden by the demo itself.
Demo.prototype.update = function(dt) {
	this.space.step(dt);
};

Demo.prototype.draw = function() {
	var ctx = this.ctx;

	var self = this;
	var point2canvas = function(point) {
			return v(point.x * self.scale, (480 - point.y) * self.scale);
	};

	// Draw shapes
	ctx.strokeStyle = 'black';
	ctx.clearRect(0, 0, this.width, this.height);
	this.space.eachShape(function(shape) {
		ctx.fillStyle = shape.style();
		shape.draw(ctx, self.scale, point2canvas);
	});

	// Draw collisions
	ctx.strokeStyle = "red";
	ctx.lineWidth = 2;

	var arbiters = this.space.arbiters;
	for (var i = 0; i < arbiters.length; i++) {
		var contacts = arbiters[i].contacts;
		for (var j = 0; j < contacts.length; j++) {
			var p = point2canvas(contacts[j].p);

			ctx.beginPath()
			ctx.moveTo(p.x - 2, p.y - 2);
			ctx.lineTo(p.x + 2, p.y + 2);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(p.x + 2, p.y - 2);
			ctx.lineTo(p.x - 2, p.y + 2);
			ctx.stroke();
		}
	}

};


Demo.prototype.run = function() {
	this.running = true;

	var self = this;
	var step = function() {
		self.step();
		if (self.running) {
			requestAnimationFrame(step);
		}
	};

	this.lastStep = Date.now();
	step();
};

Demo.prototype.stop = function() {
	this.running = false;
};

Demo.prototype.step = function() {
	var now = Date.now();
	var dt = (now - this.lastStep) / 1000;
	this.lastStep = now;

	// Limit the amount of time thats passed to 0.1 - if the user switches tabs or
	// has a slow computer, we'll just slow the simulation down.
	dt = Math.min(dt, 1/25);

	this.remainder += dt;

	var lastNumActiveShapes = this.space.activeShapes.count;
	while(this.remainder > 1/60) {
		// Chipmunk works better with a constant framerate, because it can cache some results.
		this.remainder -= 1/60;
		this.update(1/60);
	}

	// Only redraw if the simulation isn't asleep.
	if (lastNumActiveShapes > 0 || Demo.resized) {
		this.draw();
		Demo.resized = false;
	}
};

Demo.prototype.addFloor = function() {
	var space = this.space;
	var floor = space.addShape(new cp.SegmentShape(space.staticBody, v(0, 0), v(640, 0), 0));
	floor.setElasticity(1);
	floor.setFriction(1);
};

Demo.prototype.addWalls = function() {
	var space = this.space;
	var wall1 = space.addShape(new cp.SegmentShape(space.staticBody, v(0, 0), v(0, 480), 0));
	wall1.setElasticity(1);
	wall1.setFriction(1);
	var wall2 = space.addShape(new cp.SegmentShape(space.staticBody, v(640, 0), v(640, 480), 0));
	wall2.setElasticity(1);
	wall2.setFriction(1);
};

// **** Extras for Shapes

cp.PolyShape.prototype.draw = function(ctx, scale, point2canvas)
{
	ctx.beginPath();

	var verts = this.tVerts;
	var len = verts.length;
	var lastPoint = point2canvas(new cp.Vect(verts[len - 2], verts[len - 1]));
	ctx.moveTo(lastPoint.x, lastPoint.y);

	for(var i = 0; i < len; i+=2){
		var p = point2canvas(new cp.Vect(verts[i], verts[i+1]));
		ctx.lineTo(p.x, p.y);
	}
	ctx.fill();
	ctx.stroke();
};

cp.SegmentShape.prototype.draw = function(ctx, scale, point2canvas) {
	ctx.beginPath();
	var a = point2canvas(this.ta);
	var b = point2canvas(this.tb);
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);

	var oldLineWidth = ctx.lineWidth;
	ctx.lineWidth = Math.max(1, this.r * scale * 2);
	ctx.stroke();
	ctx.lineWidth = oldLineWidth;
};

cp.CircleShape.prototype.draw = function(ctx, scale, point2canvas) {
	ctx.beginPath();
	var c = point2canvas(this.tc);
	ctx.arc(c.x, c.y, scale * this.r, 0, 2*Math.PI, false);
	ctx.fill();
	ctx.stroke();

	// And draw a little radian so you can see the circle roll.
	ctx.beginPath();
	var rad = point2canvas(cp.v.mult(this.body.rot, this.r).add(this.tc));
	ctx.moveTo(c.x, c.y);
	ctx.lineTo(rad.x, rad.y);
	ctx.stroke();
};

var randColor = function() {
  return Math.floor(Math.random() * 256);
};

var styles = [];
for (var i = 0; i < 100; i++) {
	styles.push("rgb(" + randColor() + ", " + randColor() + ", " + randColor() + ")");
}

//styles = ['rgba(255,0,0,0.5)', 'rgba(0,255,0,0.5)', 'rgba(0,0,255,0.5)'];

cp.Shape.prototype.style = function() {
  var body;
  if (this.sensor) {
    return "rgba(255,255,255,0)";
  } else {
    body = this.body;
    if (body.isSleeping()) {
      return "rgb(50,50,50)";
    } else if (body.nodeIdleTime > this.space.sleepTimeThreshold) {
      return "rgb(170,170,170)";
    } else {
      return styles[this.hashid % styles.length];
    }
  }
};

var demos = [];
var addDemo = function(name, demo) {
	demos.push({name:name, demo:demo});
};

