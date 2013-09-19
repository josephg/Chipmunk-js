// This is the utility code to drive the chipmunk demos. The demos are rendered using
// a single canvas on the page.
window.COLLISIONGROUP_NONE = (1 << 0);
window.COLLISIONGROUP_BALL = (1 << 2);
window.COLLISIONGROUP_FLOOR = (1 << 3);

var v = cp.v;

var ctx;

var GRABABLE_MASK_BIT = 1<<31;
var NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;

var Demo = function() {
	this.space = new cp.Space();
	this.remainder = 0;
	this.fps = 0;
	this.mouse = v(0,0);
	this.simulationTime = 0;
	this.drawTime = 0;

	// HACK HACK HACK - its awful having this here, and its going to break when we
	// have multiple demos open at the same time.
  // Fixed?
  this.canvas.onmouseup = this.onMouseUp.bind(this);
  this.canvas.onmousemove = this.onMouseMove.bind(this);
  this.canvas.onmousedown = this.onMouseDown.bind(this);
  this.mouseBody = new cp.Body(Infinity, Infinity);

	this.canvas.oncontextmenu = function(e) { return false; }

  // Listen for lost focus and pause the demo
  window.addEventListener("focus", this.run.bind(this), false);
  window.addEventListener("blur", this.stop.bind(this), false);
};

var canvas = Demo.prototype.canvas = document.getElementsByTagName('canvas')[0];

var ctx = Demo.prototype.ctx = canvas.getContext('2d');

// The physics space size is 640x480, with the origin in the bottom left.
// Its really an arbitrary number except for the ratio - everything is done
// in floating point maths anyway.

window.onresize = function(e) {
	var width = Demo.prototype.width = canvas.width = 800; window.innerWidth;
	var height = Demo.prototype.height = canvas.height = 500;//window.innerHeight;
	if (width/height > 800/500) {
		Demo.prototype.scale = height / 500;
	} else {
		Demo.prototype.scale = width / 800;
	}

	Demo.resized = true;
};
window.onresize();

var raf = window.requestAnimationFrame
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

Demo.prototype.onMouseDown = function(e) {
  e.preventDefault();
  var rightclick = e.which === 3; // or e.button === 2;
  this.mouse = this.canvas2point( e.clientX, e.clientY );

  if ( !rightclick && !this.mouseJoint ) {
    var point = this.canvas2point( e.clientX, e.clientY );

    var shape = this.space.pointQueryFirst( point, GRABABLE_MASK_BIT, cp.NO_GROUP );
    if ( shape ) {
      var body = shape.body;
      var mouseJoint = this.mouseJoint = new cp.PivotJoint( this.mouseBody, body, v( 0, 0 ), body.world2Local( point ) );

      mouseJoint.maxForce = 50000;
      mouseJoint.errorBias = Math.pow( 1 - 0.15, 60 );
      this.space.addConstraint( mouseJoint );
    }
  }

  if ( rightclick ) {
    this.rightClick = true;
  }
};

Demo.prototype.onMouseMove = function(e) {
  this.mouse = this.canvas2point(e.clientX, e.clientY);
};

Demo.prototype.onMouseUp= function(e) {
  var rightclick = e.which === 3; // or e.button === 2;
  this.mouse = this.canvas2point( e.clientX, e.clientY );

  if ( !rightclick ) {
    if ( this.mouseJoint ) {
      this.space.removeConstraint( this.mouseJoint );
      this.mouseJoint = null;
    }
  }
  if ( rightclick ) {
    this.rightClick = false;
  }
};

Demo.prototype.canvas2point = function(x,y) {
  return v(x / this.scale, this.height - y / this.scale);
};

Demo.prototype.point2canvas = function(point) {
  return v(point.x * this.scale, (this.height - point.y) * this.scale);
};

Demo.prototype.drawInfo = function() {
	var space = this.space;

	var maxWidth = this.width - 20;

	this.ctx.textAlign = 'start';
	this.ctx.textBaseline = 'alphabetic';
	this.ctx.fillStyle = "black";
	//this.ctx.fillText(this.ctx.font, 100, 100);
	var fpsStr = Math.floor(this.fps * 10) / 10;
	if (space.activeShapes.count === 0) {
		fpsStr = '--';
	}
	this.ctx.fillText("FPS: " + fpsStr, 10, 50, maxWidth);
	this.ctx.fillText("Step: " + space.stamp, 10, 70, maxWidth);

	var arbiters = space.arbiters.length;
	this.maxArbiters = this.maxArbiters ? Math.max(this.maxArbiters, arbiters) : arbiters;
	this.ctx.fillText("Arbiters: " + arbiters + " (Max: " + this.maxArbiters + ")", 10, 90, maxWidth);

	var contacts = 0;
	for(var i = 0; i < arbiters; i++) {
		contacts += space.arbiters[i].contacts.length;
	}
	this.maxContacts = this.maxContacts ? Math.max(this.maxContacts, contacts) : contacts;
	this.ctx.fillText("Contact points: " + contacts + " (Max: " + this.maxContacts + ")", 10, 110, maxWidth);
	this.ctx.fillText("Simulation time: " + this.simulationTime + " ms", 10, 130, maxWidth);
	this.ctx.fillText("Draw time: " + this.drawTime + " ms", 10, 150, maxWidth);

	if (this.message) {
		this.ctx.fillText(this.message, 10, this.height - 50, maxWidth);
	}
};

Demo.prototype.draw = function() {
	var ctx = this.ctx;

	var self = this;

	// Draw shapes
	ctx.strokeStyle = 'black';
	ctx.clearRect(0, 0, this.width, this.height);

	this.ctx.font = "16px sans-serif";
	this.ctx.lineCap = 'round';

	this.space.eachShape(function(shape) {
		ctx.fillStyle = shape.style();
		shape.draw(ctx, self.scale, self);
	});

	// Draw collisions
  /*
	ctx.strokeStyle = "red";
	ctx.lineWidth = 2;

	var arbiters = this.space.arbiters;
	for (var i = 0; i < arbiters.length; i++) {
		var contacts = arbiters[i].contacts;
		for (var j = 0; j < contacts.length; j++) {
			var p = this.point2canvas(contacts[j].p);

			ctx.beginPath()
			ctx.moveTo(p.x - 2, p.y - 2);
			ctx.lineTo(p.x + 2, p.y + 2);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(p.x + 2, p.y - 2);
			ctx.lineTo(p.x - 2, p.y + 2);
			ctx.stroke();
		}
	}*/

	if (this.mouseJoint) {
		ctx.beginPath();
		var c = this.point2canvas(this.mouseBody.p);
		ctx.arc(c.x, c.y, this.scale * 5, 0, 2*Math.PI, false);
		ctx.fill();
		ctx.stroke();
	}

	this.space.eachConstraint(function(c) {
		if(c.draw) {
			c.draw(ctx, self.scale, self);
		}
	});

	this.drawInfo();
};

Demo.prototype.run = function() {
	this.running = true;

	var self = this;

	var lastTime = 0;
	var step = function(time) {
		self.step(time - lastTime);
		lastTime = time;

		if (self.running) {
			raf(step);
		}
	};

	step(0);
};

var soon = function(fn) { setTimeout(fn, 1); };

Demo.prototype.benchmark = function() {
	this.draw();

	var self = this;
	soon(function() {
		console.log("Benchmarking... waiting for the space to come to rest");
		var start = Date.now();
		while (self.space.activeShapes.count !== 0) {
			self.update(1/60);
		}
		var end = Date.now();

		console.log('took ' + (end - start) + 'ms');
		self.draw();
	});
};

Demo.prototype.stop = function() {
	this.running = false;
};

Demo.prototype.step = function(dt) {
	// Update FPS
	if(dt > 0) {
		this.fps = 0.9*this.fps + 0.1*(1000/dt);
	}

	// Move mouse body toward the mouse
	var newPoint = v.lerp(this.mouseBody.p, this.mouse, 0.25);
	this.mouseBody.v = v.mult(v.sub(newPoint, this.mouseBody.p), 60);
	this.mouseBody.p = newPoint;

	var lastNumActiveShapes = this.space.activeShapes.count;

	var now = Date.now();
	this.update(1/60);
	this.simulationTime += Date.now() - now;

	// Only redraw if the simulation isn't asleep.
	if (lastNumActiveShapes > 0 || Demo.resized) {
		now = Date.now();
		this.draw();
		this.drawTime += Date.now() - now;
		Demo.resized = false;
	}
};

Demo.prototype.addFloor = function() {
	var space = this.space;
	var floor = space.addShape(new cp.SegmentShape(space.staticBody, v(0, 0), v(this.width, 0), 0));
	floor.setElasticity(1);
	floor.setFriction(1);
  floor.group = window.COLLISIONGROUP_FLOOR;
	floor.setLayers(NOT_GRABABLE_MASK);
};

Demo.prototype.addWalls = function() {
	var space = this.space;
	var wall1 = space.addShape(new cp.SegmentShape(space.staticBody, v(0, 0), v(0, this.height), 0));
  wall1.group = window.COLLISIONGROUP_FLOOR;
	wall1.setElasticity(1);
	wall1.setFriction(1);
	wall1.setLayers(NOT_GRABABLE_MASK);

	var wall2 = space.addShape(new cp.SegmentShape(space.staticBody, v(this.width, 0), v(this.width, this.height), 0));
  wall2.group = window.COLLISIONGROUP_FLOOR;
	wall2.setElasticity(1);
	wall2.setFriction(1);
	wall2.setLayers(NOT_GRABABLE_MASK);
};

// Drawing helper methods

var drawCircle = function(ctx, scale, demo, c, radius) {
	var c = demo.point2canvas(c);
	ctx.beginPath();
	ctx.arc(c.x, c.y, scale * radius, 0, 2*Math.PI, false);
	ctx.fill();
	ctx.stroke();
};

var drawLine = function(ctx, demo, a, b) {
	a = demo.point2canvas(a); b = demo.point2canvas(b);

	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();
};

var drawRect = function(ctx, demo, pos, size) {
	var pos_ = demo.point2canvas(pos);
	var size_ = cp.v.sub(demo.point2canvas(cp.v.add(pos, size)), pos_);
	ctx.fillRect(pos_.x, pos_.y, size_.x, size_.y);
};

var springPoints = [
	v(0.00, 0.0),
	v(0.20, 0.0),
	v(0.25, 3.0),
	v(0.30,-6.0),
	v(0.35, 6.0),
	v(0.40,-6.0),
	v(0.45, 6.0),
	v(0.50,-6.0),
	v(0.55, 6.0),
	v(0.60,-6.0),
	v(0.65, 6.0),
	v(0.70,-3.0),
	v(0.75, 6.0),
	v(0.80, 0.0),
	v(1.00, 0.0)
];

var drawSpring = function(ctx, scale, demo, a, b) {
	a = demo.point2canvas(a); b = demo.point2canvas(b);
	
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);

	var delta = v.sub(b, a);
	var len = v.len(delta);
	var rot = v.mult(delta, 1/len);

	for(var i = 1; i < springPoints.length; i++) {

		var p = v.add(a, v.rotate(v(springPoints[i].x * len, springPoints[i].y * scale), rot));

		//var p = v.add(a, v.rotate(springPoints[i], delta));
		
		ctx.lineTo(p.x, p.y);
	}

	ctx.stroke();
};


// **** Draw methods for Shapes

cp.PolyShape.prototype.draw = function(ctx, scale, demo)
{
	ctx.beginPath();

	var verts = this.tVerts;
	var len = verts.length;
	var lastPoint = demo.point2canvas(new cp.Vect(verts[len - 2], verts[len - 1]));
	ctx.moveTo(lastPoint.x, lastPoint.y);

	for(var i = 0; i < len; i+=2){
		var p = demo.point2canvas(new cp.Vect(verts[i], verts[i+1]));
		ctx.lineTo(p.x, p.y);
	}
	ctx.fill();
	ctx.stroke();
};

cp.SegmentShape.prototype.draw = function(ctx, scale, demo) {
	var oldLineWidth = ctx.lineWidth;
	ctx.lineWidth = Math.max(1, this.r * scale * 2);
	drawLine(ctx, demo, this.ta, this.tb);
	ctx.lineWidth = oldLineWidth;
};

cp.CircleShape.prototype.draw = function(ctx, scale, demo) {
	drawCircle(ctx, scale, demo, this.tc, this.r);

	// And draw a little radian so you can see the circle roll.
	drawLine(ctx, demo, this.tc, cp.v.mult(this.body.rot, this.r).add(this.tc));
};


// Draw methods for constraints

cp.PinJoint.prototype.draw = function(ctx, scale, demo) {
	var a = this.a.local2World(this.anchr1);
	var b = this.b.local2World(this.anchr2);
	
	ctx.lineWidth = 2;
	ctx.strokeStyle = "grey";
	drawLine(ctx, demo, a, b);
};

cp.SlideJoint.prototype.draw = function(ctx, scale, demo) {
	var a = this.a.local2World(this.anchr1);
	var b = this.b.local2World(this.anchr2);
	var midpoint = v.add(a, v.clamp(v.sub(b, a), this.min));

	ctx.lineWidth = 2;
	ctx.strokeStyle = "grey";
	drawLine(ctx, demo, a, b);
	ctx.strokeStyle = "red";
	drawLine(ctx, demo, a, midpoint);
};

cp.PivotJoint.prototype.draw = function(ctx, scale, demo) {
	var a = this.a.local2World(this.anchr1);
	var b = this.b.local2World(this.anchr2);
	ctx.strokeStyle = "grey";
	ctx.fillStyle = "grey";
	drawCircle(ctx, scale, demo, a, 2);
	drawCircle(ctx, scale, demo, b, 2);
};

cp.GrooveJoint.prototype.draw = function(ctx, scale, demo) {
	var a = this.a.local2World(this.grv_a);
	var b = this.a.local2World(this.grv_b);
	var c = this.b.local2World(this.anchr2);
	
	ctx.strokeStyle = "grey";
	drawLine(ctx, demo, a, b);
	drawCircle(ctx, scale, demo, c, 3);
};

cp.DampedSpring.prototype.draw = function(ctx, scale, demo) {
	var a = this.a.local2World(this.anchr1);
	var b = this.b.local2World(this.anchr2);

	ctx.strokeStyle = "grey";
	drawSpring(ctx, scale, demo, a, b);
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

