
var DENSITY = 1/10000;


var Convex = function() {
	Demo.call(this);

	this.message = "Right click and drag to change the block's shape.";
	
	var space = this.space;
	space.iterations = 30;
	space.gravity = v(0, -500);
	space.sleepTimeThreshold = 0.5;
	space.collisionSlop = 0.5;
	
	var body, staticBody = space.staticBody;
	
	// Create segments around the edge of the screen.
	this.addFloor();

	var width = 50;
	var height = 70;
	var mass = width*height*DENSITY;
	var moment = cp.momentForBox(mass, width, height);
	
	body = space.addBody(new cp.Body(mass, moment));
	body.setPos(v(320, height / 2));
	
	this.shape = space.addShape(new cp.BoxShape(body, width, height));
	this.shape.setFriction(0.6);
};

Convex.prototype = Object.create(Demo.prototype);

Convex.prototype.update = function(dt) {
	var tolerance = 2;
	
	info = this.shape.nearestPointQuery(this.mouse);
	if(this.rightClick && info.d > tolerance){
		var shape = this.shape;
		var body = shape.getBody();
		var count = shape.getNumVerts();
		
		// Allocate the space for the new vertexes on the stack.
		var verts = new Array((count + 1)*2);
		
		for(var i=0; i<count; i++){
			verts[i*2] = shape.verts[i*2];
			verts[i*2+1] = shape.verts[i*2+1];
		}
		
		var end = body.world2Local(this.mouse);
		verts[count*2] = end.x;
		verts[count*2+1] = end.y;
		
		// This function builds a convex hull for the vertexes.
		// Because the result array is NULL, it will reduce the input array instead.
		cp.convexHull(verts, null, tolerance);
		
		// Figure out how much to shift the body by.
		var centroid = cp.centroidForPoly(verts);
		
		// Recalculate the body properties to match the updated shape.
		var mass = cp.areaForPoly(verts)*DENSITY;
		body.setMass(mass);
		body.setMoment(cp.momentForPoly(mass, verts, cp.v.neg(centroid)));
		body.setPos(body.local2World(centroid));
		
		// Use the setter function from chipmunk_unsafe.h.
		// You could also remove and recreate the shape if you wanted.
		shape.setVerts(verts, cp.v.neg(centroid));
	}
	
	var steps = 1;
	dt = dt/steps;
	
	for(var i=0; i<steps; i++){
		this.space.step(dt);
	}
};

addDemo('Convex', Convex);

