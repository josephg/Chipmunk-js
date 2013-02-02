/* Copyright (c) 2007 Scott Lembcke
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var numContacts = 0;

var Contact = function(p, n, dist, hash)
{
	this.p = p;
	this.n = n;
	this.dist = dist;
	
	this.r1 = this.r2 = vzero;
	this.nMass = this.tMass = this.bounce = this.bias = 0;

	this.jnAcc = this.jtAcc = this.jBias = 0;
	
	this.hash = hash;
	numContacts++;
};

var NONE = [];

// Add contact points for circle to circle collisions.
// Used by several collision tests.
var circle2circleQuery = function(p1, p2, r1, r2)
{
	var mindist = r1 + r2;
	var delta = vsub(p2, p1);
	var distsq = vlengthsq(delta);
	if(distsq >= mindist*mindist) return;
	
	var dist = Math.sqrt(distsq);

	// Allocate and initialize the contact.
	return new Contact(
		vadd(p1, vmult(delta, 0.5 + (r1 - 0.5*mindist)/(dist ? dist : Infinity))),
		(dist ? vmult(delta, 1/dist) : new Vect(1, 0)),
		dist - mindist,
		0
	);
};

// Collide circle shapes.
var circle2circle = function(circ1, circ2)
{
	var contact = circle2circleQuery(circ1.tc, circ2.tc, circ1.r, circ2.r);
	return contact ? [contact] : NONE;
};

var circle2segment = function(circleShape, segmentShape)
{
	var seg_a = segmentShape.ta;
	var seg_b = segmentShape.tb;
	var center = circleShape.tc;
	
	var seg_delta = vsub(seg_b, seg_a);
	var closest_t = clamp01(vdot(seg_delta, vsub(center, seg_a))/vlengthsq(seg_delta));
	var closest = vadd(seg_a, vmult(seg_delta, closest_t));
	
	var contact = circle2circleQuery(center, closest, circleShape.r, segmentShape.r);
	if(contact){
		var n = contact.n;
		
		// Reject endcap collisions if tangents are provided.
		return (
			(closest_t === 0 && vdot(n, segmentShape.a_tangent) < 0) ||
			(closest_t === 1 && vdot(n, segmentShape.b_tangent) < 0)
		) ? NONE : [contact];
	} else {
		return NONE;
	}
}

// Find the minimum separating axis for the given poly and axis list.
//
// This function needs to return two values - the index of the min. separating axis and
// the value itself. Short of inlining MSA, returning values through a global like this
// is the fastest implementation.
//
// See: http://jsperf.com/return-two-values-from-function/2
var last_MSA_min = 0;
var findMSA = function(poly, planes)
{
	var min_index = 0;
	var min = poly.valueOnAxis(planes[0].n, planes[0].d);
	if(min > 0) return -1;
	
	for(var i=1; i<planes.length; i++){
		var dist = poly.valueOnAxis(planes[i].n, planes[i].d);
		if(dist > 0) {
			return -1;
		} else if(dist > min){
			min = dist;
			min_index = i;
		}
	}
	
	last_MSA_min = min;
	return min_index;
};

// Add contacts for probably penetrating vertexes.
// This handles the degenerate case where an overlap was detected, but no vertexes fall inside
// the opposing polygon. (like a star of david)
var findVertsFallback = function(poly1, poly2, n, dist)
{
	var arr = [];

	var verts1 = poly1.tVerts;
	for(var i=0; i<verts1.length; i+=2){
		var vx = verts1[i];
		var vy = verts1[i+1];
		if(poly2.containsVertPartial(vx, vy, vneg(n))){
			arr.push(new Contact(new Vect(vx, vy), n, dist, hashPair(poly1.hashid, i)));
		}
	}
	
	var verts2 = poly2.tVerts;
	for(var i=0; i<verts2.length; i+=2){
		var vx = verts2[i];
		var vy = verts2[i+1];
		if(poly1.containsVertPartial(vx, vy, n)){
			arr.push(new Contact(new Vect(vx, vy), n, dist, hashPair(poly2.hashid, i)));
		}
	}
	
	return arr;
};

// Add contacts for penetrating vertexes.
var findVerts = function(poly1, poly2, n, dist)
{
	var arr = [];

	var verts1 = poly1.tVerts;
	for(var i=0; i<verts1.length; i+=2){
		var vx = verts1[i];
		var vy = verts1[i+1];
		if(poly2.containsVert(vx, vy)){
			arr.push(new Contact(new Vect(vx, vy), n, dist, hashPair(poly1.hashid, i>>1)));
		}
	}
	
	var verts2 = poly2.tVerts;
	for(var i=0; i<verts2.length; i+=2){
		var vx = verts2[i];
		var vy = verts2[i+1];
		if(poly1.containsVert(vx, vy)){
			arr.push(new Contact(new Vect(vx, vy), n, dist, hashPair(poly2.hashid, i>>1)));
		}
	}
	
	return (arr.length ? arr : findVertsFallback(poly1, poly2, n, dist));
};

// Collide poly shapes together.
var poly2poly = function(poly1, poly2)
{
	var mini1 = findMSA(poly2, poly1.tPlanes);
	if(mini1 == -1) return NONE;
	var min1 = last_MSA_min;
	
	var mini2 = findMSA(poly1, poly2.tPlanes);
	if(mini2 == -1) return NONE;
	var min2 = last_MSA_min;
	
	// There is overlap, find the penetrating verts
	if(min1 > min2)
		return findVerts(poly1, poly2, poly1.tPlanes[mini1].n, min1);
	else
		return findVerts(poly1, poly2, vneg(poly2.tPlanes[mini2].n), min2);
};

// Like cpPolyValueOnAxis(), but for segments.
var segValueOnAxis = function(seg, n, d)
{
	var a = vdot(n, seg.ta) - seg.r;
	var b = vdot(n, seg.tb) - seg.r;
	return min(a, b) - d;
};

// Identify vertexes that have penetrated the segment.
var findPointsBehindSeg = function(arr, seg, poly, pDist, coef) 
{
	var dta = vcross(seg.tn, seg.ta);
	var dtb = vcross(seg.tn, seg.tb);
	var n = vmult(seg.tn, coef);
	
	var verts = poly.tVerts;
	for(var i=0; i<verts.length; i+=2){
		var vx = verts[i];
		var vy = verts[i+1];
		if(vdot2(vx, vy, n.x, n.y) < vdot(seg.tn, seg.ta)*coef + seg.r){
			var dt = vcross2(seg.tn.x, seg.tn.y, vx, vy);
			if(dta >= dt && dt >= dtb){
				arr.push(new Contact(new Vect(vx, vy), n, pDist, hashPair(poly.hashid, i)));
			}
		}
	}
};

// This one is complicated and gross. Just don't go there...
// TODO: Comment me!
var seg2poly = function(seg, poly)
{
	var arr = [];

	var planes = poly.tPlanes;
	var numVerts = planes.length;
	
	var segD = vdot(seg.tn, seg.ta);
	var minNorm = poly.valueOnAxis(seg.tn, segD) - seg.r;
	var minNeg = poly.valueOnAxis(vneg(seg.tn), -segD) - seg.r;
	if(minNeg > 0 || minNorm > 0) return NONE;
	
	var mini = 0;
	var poly_min = segValueOnAxis(seg, planes[0].n, planes[0].d);
	if(poly_min > 0) return NONE;
	for(var i=0; i<numVerts; i++){
		var dist = segValueOnAxis(seg, planes[i].n, planes[i].d);
		if(dist > 0){
			return NONE;
		} else if(dist > poly_min){
			poly_min = dist;
			mini = i;
		}
	}
	
	var poly_n = vneg(planes[mini].n);
	
	var va = vadd(seg.ta, vmult(poly_n, seg.r));
	var vb = vadd(seg.tb, vmult(poly_n, seg.r));
	if(poly.containsVert(va.x, va.y))
		arr.push(new Contact(va, poly_n, poly_min, hashPair(seg.hashid, 0)));
	if(poly.containsVert(vb.x, vb.y))
		arr.push(new Contact(vb, poly_n, poly_min, hashPair(seg.hashid, 1)));
	
	// Floating point precision problems here.
	// This will have to do for now.
//	poly_min -= cp_collision_slop; // TODO is this needed anymore?
	
	if(minNorm >= poly_min || minNeg >= poly_min) {
		if(minNorm > minNeg)
			findPointsBehindSeg(arr, seg, poly, minNorm, 1);
		else
			findPointsBehindSeg(arr, seg, poly, minNeg, -1);
	}
	
	// If no other collision points are found, try colliding endpoints.
	if(arr.length === 0){
		var mini2 = mini * 2;
		var verts = poly.tVerts;

		var poly_a = new Vect(verts[mini2], verts[mini2+1]);
		
		var con;
		if((con = circle2circleQuery(seg.ta, poly_a, seg.r, 0, arr))) return [con];
		if((con = circle2circleQuery(seg.tb, poly_a, seg.r, 0, arr))) return [con];

		var len = numVerts * 2;
		var poly_b = new Vect(verts[(mini2+2)%len], verts[(mini2+3)%len]);
		if((con = circle2circleQuery(seg.ta, poly_b, seg.r, 0, arr))) return [con];
		if((con = circle2circleQuery(seg.tb, poly_b, seg.r, 0, arr))) return [con];
	}

//	console.log(poly.tVerts, poly.tPlanes);
//	console.log('seg2poly', arr);
	return arr;
};

// This one is less gross, but still gross.
// TODO: Comment me!
var circle2poly = function(circ, poly)
{
	var planes = poly.tPlanes;
	
	var mini = 0;
	var min = vdot(planes[0].n, circ.tc) - planes[0].d - circ.r;
	for(var i=0; i<planes.length; i++){
		var dist = vdot(planes[i].n, circ.tc) - planes[i].d - circ.r;
		if(dist > 0){
			return NONE;
		} else if(dist > min) {
			min = dist;
			mini = i;
		}
	}
	
	var n = planes[mini].n;

	var verts = poly.tVerts;
	var len = verts.length;
	var mini2 = mini<<1;

	//var a = poly.tVerts[mini];
	//var b = poly.tVerts[(mini + 1)%poly.tVerts.length];
	var ax = verts[mini2];
	var ay = verts[mini2+1];
	var bx = verts[(mini2+2)%len];
	var by = verts[(mini2+3)%len];

	var dta = vcross2(n.x, n.y, ax, ay);
	var dtb = vcross2(n.x, n.y, bx, by);
	var dt = vcross(n, circ.tc);
		
	if(dt < dtb){
		var con = circle2circleQuery(circ.tc, new Vect(bx, by), circ.r, 0, con);
		return con ? [con] : NONE;
	} else if(dt < dta) {
		return [new Contact(
			vsub(circ.tc, vmult(n, circ.r + min/2)),
			vneg(n),
			min,
			0
		)];
	} else {
		var con = circle2circleQuery(circ.tc, new Vect(ax, ay), circ.r, 0, con);
		return con ? [con] : NONE;
	}
};

// The javascripty way to do this would be either nested object or methods on the prototypes.
// 
// However, the *fastest* way is the method below.
// See: http://jsperf.com/dispatch

// These are copied from the prototypes into the actual objects in the Shape constructor.
CircleShape.prototype.collisionCode = 0;
SegmentShape.prototype.collisionCode = 1;
PolyShape.prototype.collisionCode = 2;

CircleShape.prototype.collisionTable = [
	circle2circle,
	circle2segment,
	circle2poly
];

SegmentShape.prototype.collisionTable = [
	null,
	function(segA, segB) { return NONE; }, // seg2seg
	seg2poly
];

PolyShape.prototype.collisionTable = [
	null,
	null,
	poly2poly
];

var collideShapes = cp.collideShapes = function(a, b)
{
	assert(a.collisionCode <= b.collisionCode, 'Collided shapes must be sorted by type');
	return a.collisionTable[b.collisionCode](a, b);
};

