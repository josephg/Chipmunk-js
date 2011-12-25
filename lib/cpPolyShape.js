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
 
/// Check that a set of vertexes is convex and has a clockwise winding.
var polyValidate = function(verts)
{
	var numVerts = verts.length;
	for(var i=0; i<numVerts; i++){
		var a = verts[i];
		var b = verts[(i+1)%numVerts];
		var c = verts[(i+2)%numVerts];
		
		if(vcross(vsub(b, a), vsub(c, b)) > 0){
			return false;
		}
	}
	
	return true;
};

/// Initialize a polygon shape.
/// The vertexes must be convex and have a clockwise winding.
var PolyShape = exports.PolyShape = function(body, verts, offset)
{
	// Fail if the user attempts to pass a concave poly, or a bad winding.
	assert(polyValidate(verts), "Polygon is concave or has a reversed winding.");
	
	this.setVerts(verts, offset);
	this.type = 'poly';
	Shape.call(this, body);
};

PolyShape.prototype = Object.create(Shape.prototype);

var Axis = function(n, d) {
	this.n = n;
	this.d = d;
};

PolyShape.prototype.setVerts = function(verts, offset)
{
	var numVerts = verts.length;

	// This a pretty bad way to do this in javascript. As a first pass, I want to keep
	// the code similar to the C.
	this.verts = new Array(numVerts);
	this.tVerts = new Array(numVerts);

	this.axes = new Array(numVerts);
	this.tAxes = new Array(numVerts);
	
	for(var i=0; i<numVerts; i++){
		var a = vadd(offset, verts[i]);
		var b = vadd(offset, verts[(i+1)%numVerts]);
		var n = vnormalize(vperp(vsub(b, a)));

		this.verts[i] = a;
		this.axes[i] = new Axis(n, vdot(n, a));
		this.tAxes[i] = new Axis(vzero, 0);
	}
};

/// Initialize a box shaped polygon shape.
var BoxShape = exports.BoxShape = function(body, width, height)
{
	var hw = width/2;
	var hh = height/2;
	
	return BoxShape2(body, new BB(-hw, -hh, hw, hh));
};

/// Initialize an offset box shaped polygon shape.
var BoxShape2 = exports.BoxShape2 = function(body, box)
{
	var verts = [
		new Vect(box.l, box.b),
		new Vect(box.l, box.t),
		new Vect(box.r, box.t),
		new Vect(box.r, box.b),
	];
	
	return new PolyShape(body, verts, vzero);
};

PolyShape.prototype.transformVerts = function(p, rot)
{
	var src = this.verts;
	var dst = this.tVerts;
	
	var l = Infinity, r = -Infinity;
	var b = Infinity, t = -Infinity;
	
	for(var i=0; i<src.length; i++){
		var v = vadd(p, vrotate(src[i], rot));
		
		dst[i] = v;
		l = min(l, v.x);
		r = max(r, v.x);
		b = min(b, v.y);
		t = max(t, v.y);
	}
	
	this.bb_l = l;
	this.bb_b = b;
	this.bb_r = r;
	this.bb_t = t;
};

PolyShape.prototype.transformAxes = function(p, rot)
{
	var src = this.axes;
	var dst = this.tAxes;
	
	for(var i=0; i<src.length; i++){
		var n = vrotate(src[i].n, rot);
		dst[i].n = n;
		dst[i].d = vdot(p, n) + src[i].d;
	}
};

PolyShape.prototype.cacheData = function(p, rot)
{
	this.transformAxes(p, rot);
	this.transformVerts(p, rot);
};

PolyShape.prototype.pointQuery = function(p)
{
//	if(!bbContainsVect(this.shape.bb, p)) return;
	if(!bbContainsVect2(this.bb_l, this.bb_b, this.bb_r, this.bb_t, p)) return;
	
	var info = new PointQueryExtendedInfo(this);
	
	var axes = this.tAxes;
	for(var i=0; i<axes.length; i++){
		var n = axes[i].n;
		var dist = axes[i].d - vdot(n, p);
		
		if(dist < 0){
			return;
		} else if(dist < info.d){
			info.d = dist;
			info.n = n;
		}
	}
	
	return info;
};

PolyShape.prototype.segmentQuery = function(a, b)
{
	var axes = this.tAxes;
	var verts = this.tVerts;
	var numVerts = this.verts.length;
	
	for(var i=0; i<numVerts; i++){
		var n = axes[i].n;
		var an = vdot(a, n);
		if(axes[i].d > an) continue;
		
		var bn = vdot(b, n);
		var t = (axes[i].d - an)/(bn - an);
		if(t < 0 || 1 < t) continue;
		
		var point = vlerp(a, b, t);
		var dt = -vcross(n, point);
		var dtMin = -vcross(n, verts[i]);
		var dtMax = -vcross(n, verts[(i+1)%numVerts]);
		
		if(dtMin <= dt && dt <= dtMax){
			// josephg: In the original C code, this function keeps
			// looping through axes after finding a match. I *think*
			// this code is equivalent...
			return new SegmentQueryInfo(this, t, n);
		}
	}
};

/*
PolyShape.getNumVerts = function()
{
	return this.verts.length;
};*/

PolyShape.prototype.getVert = function(idx)
{
	return this.verts[idx];
};

PolyShape.prototype.valueOnAxis = function(n, d)
{
	var verts = this.tVerts;
	var m = vdot(n, verts[0]);
	
	for(var i=1; i<verts.length; i++){
		m = min(m, vdot(n, verts[i]));
	}
	
	return m - d;
};

PolyShape.prototype.containsVert = function(v)
{
	var axes = this.tAxes;
	
	for(var i=0; i<axes.length; i++){
		var dist = vdot(axes[i].n, v) - axes[i].d;
		if(dist > 0) return false;
	}
	
	return true;
};

PolyShape.prototype.containsVertPartial = function(v, n)
{
	var axes = this.tAxes;
	
	for(var i=0; i<axes.length; i++){
		if(vdot(axes[i].n, n) < 0) continue;
		var dist = vdot(axes[i].n, v) - axes[i].d;
		if(dist > 0) return false;
	}
	
	return true;
};


