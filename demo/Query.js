// This code demonstrates making point and segment queries in a space.
//
// Take a look at update(), below for the calls to space.*Query.

var Query = function() {
	Demo.call(this);

	var space = this.space;

	space.iterations = 5;
	
	{ // add a fat segment
		var mass = 1;
		var length = 100;
		var a = v(-length/2, 0), b = v(length/2, 0);
		
		var body = space.addBody(new cp.Body(mass, cp.momentForSegment(mass, a, b)));
		body.setPos(v(320, 340));
		
		space.addShape(new cp.SegmentShape(body, a, b, 20));
	}
	
	{ // add a static segment
		space.addShape(new cp.SegmentShape(space.staticBody, v(320, 540), v(620, 240), 0));
	}
	
	{ // add a pentagon
		var mass = 1;
		var NUM_VERTS = 5;
		
		var verts = new Array(NUM_VERTS * 2);
		for(var i=0; i<NUM_VERTS*2; i+=2){
			var angle = -Math.PI*i/NUM_VERTS;
			verts[i]   = 30*Math.cos(angle);
			verts[i+1] = 30*Math.sin(angle);
		}
		
		var body = space.addBody(new cp.Body(mass, cp.momentForPoly(mass, verts, v(0,0))));
		body.setPos(v(350+60, 220+60));

		space.addShape(new cp.PolyShape(body, verts, v(0,0)));
	}
	
	{ // add a circle
		var mass = 1;
		var r = 20;
		
		var body = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, r, v(0,0))));
		body.setPos(v(320+100, 240+120));
		
		space.addShape(new cp.CircleShape(body, r, v(0,0)));
	}
	

	this.drawSegment = function(start, end, style) {
		var ctx = this.ctx;
		ctx.beginPath();
		var startT = this.point2canvas(start);
		var endT = this.point2canvas(end);
		ctx.moveTo(startT.x, startT.y);
		ctx.lineTo(endT.x, endT.y);
		ctx.lineWidth = 1;
		ctx.strokeStyle = style;
		ctx.stroke();
	};

	this.drawBB = function(bb, fillStyle, strokeStyle) {
		var ctx = this.ctx;
		var p = this.point2canvas(v(bb.l, bb.t));
		var width = this.scale * (bb.r - bb.l);
		var height = this.scale * (bb.t - bb.b);
		if(fillStyle) {
			ctx.fillStyle = fillStyle;
			ctx.fillRect(p.x, p.y, width, height);
		}
		if(strokeStyle) {
			ctx.strokeStyle = strokeStyle;
			ctx.strokeRect(p.x, p.y, width, height);
		}
	};
};
Query.prototype = Object.create(Demo.prototype);

Query.prototype.draw = function() {
	Demo.prototype.draw.apply(this);
	
	var ctx = this.ctx;

	var start = v(320, 240);
	var end = this.mouse;
	
	// Draw a green line from start to end.
	this.drawSegment(start, end, 'green');

	this.message = "Query: Dist(" + Math.floor(v.dist(start, end)) + ") Point " + v.str(end) + ", ";

	var info = this.space.segmentQueryFirst(start, end, cp.ALL_LAYERS, cp.NO_GROUP);
	if(info) {
		var point = info.hitPoint(start, end);

		// Draw red over the occluded part of the query
		this.drawSegment(point, end, 'red');
		
		// Draw a little blue surface normal
		this.drawSegment(point, v.add(point, v.mult(info.n, 16)), 'blue');
		
		// Draw a little red dot on the hit point.
		//ChipmunkDebugDrawPoints(3, 1, &point, RGBAColor(1,0,0,1));

		this.message += "Segment Query: Dist(" + Math.floor(info.hitDist(start, end)) + ") Normal " + v.str(info.n);
		//messageCursor += sprintf(messageCursor, "Segment Query: Dist(%f) Normal%s", cpSegmentQueryHitDist(start, end, info), cpvstr(info.n));
	} else {
		this.message += "Segment Query: (None)";
	}

	var nearestInfo = this.space.nearestPointQueryNearest(this.mouse, 100, cp.ALL_LAYERS, cp.NO_GROUP);
	if (nearestInfo) {
		this.drawSegment(this.mouse, nearestInfo.p, "grey");

		// Draw a red bounding box around the shape under the mouse.
		if(nearestInfo.d < 0) this.drawBB(nearestInfo.shape.getBB(), null, 'red');
	}
};

Query.prototype.update = function(){};

addDemo('Query', Query);


