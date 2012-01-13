var Balls = function() {
	Demo.call(this);

	var space = this.space;
	space.iterations = 60;
	space.gravity = v(0, -500);
	space.sleepTimeThreshold = 0.5;
	space.collisionSlop = 0.5;
	space.sleepTimeThreshold = 0.5;

	this.addFloor();
	this.addWalls();

	var width = 50;
	var height = 60;
	var mass = width * height * 1/1000;
	var rock = space.addBody(new cp.Body(mass, cp.momentForBox(mass, width, height)));
	rock.setPos(v(500, 100));
	rock.setAngle(1);
	shape = space.addShape(new cp.BoxShape(rock, width, height));
	shape.setFriction(0.3);
	shape.setElasticity(0.3);

	for (var i = 1; i <= 10; i++) {
		var radius = 20;
		mass = 3;
		var body = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, v(0, 0))));
		body.setPos(v(200 + i, (2 * radius + 5) * i));
		var circle = space.addShape(new cp.CircleShape(body, radius, v(0, 0)));
		circle.setElasticity(0.8);
		circle.setFriction(1);
	}
/*
 * atom.canvas.onmousedown = function(e) {
      radius = 10;
      mass = 3;
      body = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, v(0, 0))));
      body.setPos(v(e.clientX, e.clientY));
      circle = space.addShape(new cp.CircleShape(body, radius, v(0, 0)));
      circle.setElasticity(0.5);
      return circle.setFriction(1);
    };
*/

	this.ctx.strokeStyle = "black";

	var ramp = space.addShape(new cp.SegmentShape(space.staticBody, v(100, 100), v(300, 200), 10));
	ramp.setElasticity(1);
	ramp.setFriction(1);
	ramp.setLayers(NOT_GRABABLE_MASK);
};

Balls.prototype = Object.create(Demo.prototype);

addDemo('Balls', Balls);

