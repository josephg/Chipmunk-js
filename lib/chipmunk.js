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

Object.create = Object.create || function(o) {
	function F() {}
	F.prototype = o;
	return new F();
};
 
//var VERSION = CP_VERSION_MAJOR + "." + CP_VERSION_MINOR + "." + CP_VERSION_RELEASE;

/**
 * @namespace
 */
var cp;
if(typeof exports === 'undefined'){
	cp = {};

	if(typeof window === 'object'){
		window.cp = cp;
	}
} else {
	cp = exports;
}

/**
 * Evaluate assertion.
 *
 * @function 
 * @param	{boolean}	value	To test for truthiness.
 * @param	{string}	message	To display on Error.
 */
var assert = function(value, message)
{
	if (!value) {
		throw new Error('Assertion failed: ' + message);
	}
};

/**
 * @function
 * @param	{boolean}	value	To test for truthiness.
 * @param	{string}	message	To display on Error.
 */
var assertSoft = function(value, message)
{
	if(!value && console && console.warn) {
		console.warn("ASSERTION FAILED: " + message);
		if(console.trace) {
			console.trace();
		}
	}
};

/**
 * Return the smaller one between parameter a and b.
 *
 * @function
 * @param	{number}	a
 * @param	{number}	b
 * @return	{number}
 */
var mymin = function(a, b)
{
	return a < b ? a : b;
};

/**
 * Return the bigger one between parameter a and b.
 *
 * @function
 * @param	{number}	a
 * @param	{number}	b
 * @return	{number}
 */
var mymax = function(a, b)
{
	return a > b ? a : b;
};

var min, max;
if (typeof window === 'object' && window.navigator.userAgent.indexOf('Firefox') > -1){
	// On firefox, Math.min and Math.max are really fast:
	// http://jsperf.com/math-vs-greater-than/8
	min = Math.min;
	max = Math.max;
} else {
	// On chrome and safari, Math.min / max are slooow. The ternery operator above is faster
	// than the builtins because we only have to deal with 2 arguments that are always numbers.
	min = mymin;
	max = mymax;
}

/**
 * The hashpair function takes two numbers and returns a hash code for them.
 * Required that hashPair(a, b) === hashPair(b, a).
 * Chipmunk's hashPair function is defined as:
 *   #define CP_HASH_COEF (3344921057ul)
 *   #define CP_HASH_PAIR(A, B) ((cpHashValue)(A)*CP_HASH_COEF ^ (cpHashValue)(B)*CP_HASH_COEF)
 * But thats not suitable in javascript because multiplying by a large number will make the number
 * a large float.
 *
 * The result of hashPair is used as the key in objects, so it returns a string.
 * 
 * @param	{number}	a
 * @param	{number}	b
 * @return	{string}		Hash code.
 */
var hashPair = function(a, b)
{
	//assert(typeof(a) === 'number', "HashPair used on something not a number");
	return a < b ? a + ' ' + b : b + ' ' + a;
};

/**
 * Delete an object from a List(array type).
 *
 * @function
 * @param	{array}		arr	Source list(array).
 * @param	{object}	obj	Target object that to be delete.
 */
var deleteObjFromList = function(arr, obj)
{
	for(var i=0; i<arr.length; i++){
		if(arr[i] === obj){
			arr[i] = arr[arr.length - 1];
			arr.length--;
			
			return;
		}
	}
};

/**
 * Returns the closest point on the line segment ab, to the point p.
 *
 * @function
 * @param	{cp.Vect}	p	Target point.
 * @param	{cp.Vect}	a	One endpoint of segment.
 * @param	{cp.Vect}	b	Another endpoint of segment.
 * @return	{cp.Vect}		Closest point.
 */
var closestPointOnSegment = function(p, a, b)
{
	var delta = vsub(a, b);
	var t = clamp01(vdot(delta, vsub(p, b))/vlengthsq(delta));
	return vadd(b, vmult(delta, t));
};

/**
 * Returns the closest point on the line segment ab, to the point p.
 *
 * @function
 * @param	{number}	px	X coordinate of target point.
 * @param	{number}	py	Y coordinate of target point.
 * @param	{number}	ax	X coordinate of one endpoint of segment.
 * @param	{number}	ay	Y coordinate of one endpoint of segment.
 * @param	{number}	bx	X coordinate of another endpoint of segment.
 * @param	{number}	by	Y coordinate of another endpoint of segment.
 * @return	{cp.Vect}		Closeset point.
 */	
var closestPointOnSegment2 = function(px, py, ax, ay, bx, by)
{
	var deltax = ax - bx;
	var deltay = ay - by;
	var t = clamp01(vdot2(deltax, deltay, px - bx, py - by)/vlengthsq2(deltax, deltay));
	return new Vect(bx + deltax * t, by + deltay * t);
};

/**
 * Calculate the moment of inertia for a circle.
 *
 * @function
 * @memberof	cp
 * @param	{number}	m
 * @param	{number}	r1	Inner diameter. A solid circle has an inner diameter of 0.
 * @param	{number}	r2	Outer diameter.
 * @param	{cp.Vect}	offset
 * @return	{number}		Moment.
 */
cp.momentForCircle = function(m, r1, r2, offset)
{
	return m*(0.5*(r1*r1 + r2*r2) + vlengthsq(offset));
};

/**
 * Calculate area of a hollow circle.
 *
 * @function
 * @memberof	cp
 * @param	{number}	r1	Inner diameter. A solid circle has an inner diameter of 0.
 * @param	{number}	r2	Outer diameter.
 * @return	{number}		Area.
 */
cp.areaForCircle = function(r1, r2)
{
	return Math.PI*Math.abs(r1*r1 - r2*r2);
};

/**
 * Calculate the moment of inertia for a line segment.
 *
 * @function
 * @memberof	cp
 * @param	{number}	m
 * @param	{cp.Vect}	a	One endpoint of segment.
 * @param	{cp.Vect}	b	Another endpoint of segment.
 * @return	{number}	
 */
cp.momentForSegment = function(m, a, b)
{
	var offset = vmult(vadd(a, b), 0.5);
	return m*(vdistsq(b, a)/12 + vlengthsq(offset));
};

/**
 * Calculate the area of a fattened (capsule shaped) line segment.
 *
 * @function
 * @memberof	cp
 * @param	{number}	a	One endpoint of segment.
 * @param	{number}	b	Another endpoint of segment.
 * @param	{number}	r
 * @return	{number}	
 */
cp.areaForSegment = function(a, b, r)
{
	return r*(Math.PI*r + 2*vdist(a, b));
};

/**
 * Calculate the moment of inertia for a solid polygon shape assuming it's center of gravity is at it's centroid.
 *
 * @function
 * @memberof	cp
 * @param	{number}	m
 * @param	{number[]}	verts	Array of vertices.
 * @param	{cp.Vect}	offset	The offset is added to each vertex.
 * @return	{number}		Moment.
 */
cp.momentForPoly = function(m, verts, offset)
{
	var sum1 = 0;
	var sum2 = 0;
	var len = verts.length;
	for(var i=0; i<len; i+=2){
		var v1x = verts[i] + offset.x;
	 	var v1y = verts[i+1] + offset.y;
		var v2x = verts[(i+2)%len] + offset.x;
		var v2y = verts[(i+3)%len] + offset.y;

		var a = vcross2(v2x, v2y, v1x, v1y);
		var b = vdot2(v1x, v1y, v1x, v1y) + vdot2(v1x, v1y, v2x, v2y) + vdot2(v2x, v2y, v2x, v2y);
		
		sum1 += a*b;
		sum2 += a;
	}
	
	return (m*sum1)/(6*sum2);
};

/**
 * Calculate the signed area of a polygon.
 * A Clockwise winding gives positive area.
 * This is probably backwards from what you expect, but matches Chipmunk's the winding for poly shapes.
 *
 * @function
 * @memberof	cp
 * @param	{number[]}	verts	Array of vertices.
 * @return	{number}		Area.
 */
cp.areaForPoly = function(verts)
{
	var area = 0;
	for(var i=0, len=verts.length; i<len; i+=2){
		area += vcross(new Vect(verts[i], verts[i+1]), new Vect(verts[(i+2)%len], verts[(i+3)%len]));
	}
	
	return -area/2;
};

/**
 * Calculate the natural centroid of a polygon.
 *
 * @function
 * @memberof	cp
 * @param	{number[]}	verts	Array of vertices.
 * @return	{cp.Vect}		Centroid point.
 */
cp.centroidForPoly = function(verts)
{
	var sum = 0;
	var vsum = new Vect(0,0);
	
	for(var i=0, len=verts.length; i<len; i+=2){
		var v1 = new Vect(verts[i], verts[i+1]);
		var v2 = new Vect(verts[(i+2)%len], verts[(i+3)%len]);
		var cross = vcross(v1, v2);
		
		sum += cross;
		vsum = vadd(vsum, vmult(vadd(v1, v2), cross));
	}
	
	return vmult(vsum, 1/(3*sum));
};

/**
 * @function
 * @memberof	cp
 * @param	{number[]}	verts	Array of vertices.
 */
cp.recenterPoly = function(verts)
{
	var centroid = cp.centroidForPoly(verts);
	
	for(var i=0; i<verts.length; i+=2){
		verts[i] -= centroid.x;
		verts[i+1] -= centroid.y;
	}
};

/**
 * Calculate the moment of inertia for a solid box.
 *
 * @function
 * @memberof	cp
 * @param	{number}	m	Mass of the box.
 * @param	{number}	width	Box width.
 * @param	{number}	height	Box height.
 * @return	{number}
 */
cp.momentForBox = function(m, width, height)
{
	return m*(width*width + height*height)/12;
};

/**
 * Calculate the moment of inertia for a solid box.
 *
 * @function
 * @memberof	cp
 * @param	{number}	m	Mass of the box.
 * @param	{cp.PolyShape}	box	Target box.
 * @return	{number}
 */
cp.momentForBox2 = function(m, box)
{
	var width = box.r - box.l;
	var height = box.t - box.b;
	var offset = vmult([box.l + box.r, box.b + box.t], 0.5);
	
	// TODO NaN when offset is 0 and m is INFINITY	
	return cp.momentForBox(m, width, height) + m*vlengthsq(offset);
};

// Quick hull

/**
 * @function
 * @memberof	cp
 * @param	{number[]}	verts
 * @return	{number[]}	
 */
var loopIndexes = cp.loopIndexes = function(verts)
{
	var start = 0, end = 0;
	var minx, miny, maxx, maxy;
	minx = maxx = verts[0];
	miny = maxy = verts[1];
	
	var count = verts.length >> 1;
	for(var i=1; i<count; i++){
		var x = verts[i*2];
		var y = verts[i*2 + 1];
		
		if(x < minx || (x == minx && y < miny)){
			minx = x;
			miny = y;
			start = i;
		} else if(x > maxx || (x == maxx && y > maxy)){
			maxx = x;
			maxy = y;
			end = i;
		}
	}
	return [start, end];
};

/**
 * Swap two elements in an array.
 *
 * @function
 * @param	{array}		arr	Source array.
 * @param	{number}	idx1	Index of target element.
 * @param	{number}	idx2	Index of another target element.
 */
var SWAP = function(arr, idx1, idx2)
{
	var tmp = arr[idx1*2];
	arr[idx1*2] = arr[idx2*2];
	arr[idx2*2] = tmp;

	tmp = arr[idx1*2+1];
	arr[idx1*2+1] = arr[idx2*2+1];
	arr[idx2*2+1] = tmp;
};

/**
 * @function
 * @param	{number[]}	verts
 * @param	{number}	offs
 * @param	{number}	count
 * @param	{cp.Vect}	a
 * @param	{cp.Vect}	b
 * @param	{number}	tol
 * @retrun	{number}
 */
var QHullPartition = function(verts, offs, count, a, b, tol)
{
	if(count === 0) return 0;
	
	var max = 0;
	var pivot = offs;
	
	var delta = vsub(b, a);
	var valueTol = tol * vlength(delta);
	
	var head = offs;
	for(var tail = offs+count-1; head <= tail;){
		var v = new Vect(verts[head * 2], verts[head * 2 + 1]);
		var value = vcross(delta, vsub(v, a));
		if(value > valueTol){
			if(value > max){
				max = value;
				pivot = head;
			}
			
			head++;
		} else {
			SWAP(verts, head, tail);
			tail--;
		}
	}
	
	// move the new pivot to the front if it's not already there.
	if(pivot != offs) SWAP(verts, offs, pivot);
	return head - offs;
};

/**
 * @function
 * @param	{number}	tol
 * @param	{number[]}	verts
 * @param	{number}	offs
 * @param	{number}	count
 * @param	{cp.Vect}	a
 * @param	{cp.Vect}	pivot
 * @param	{cp.Vect}	b
 * @param	{number}	retultPos
 * @return	{number}
 */
var QHullReduce = function(tol, verts, offs, count, a, pivot, b, resultPos)
{
	if(count < 0){
		return 0;
	} else if(count == 0) {
		verts[resultPos*2] = pivot.x;
		verts[resultPos*2+1] = pivot.y;
		return 1;
	} else {
		var left_count = QHullPartition(verts, offs, count, a, pivot, tol);
		var left = new Vect(verts[offs*2], verts[offs*2+1]);
		var index = QHullReduce(tol, verts, offs + 1, left_count - 1, a, left, pivot, resultPos);
		
		var pivotPos = resultPos + index++;
		verts[pivotPos*2] = pivot.x;
		verts[pivotPos*2+1] = pivot.y;
		
		var right_count = QHullPartition(verts, offs + left_count, count - left_count, pivot, b, tol);
		var right = new Vect(verts[(offs+left_count)*2], verts[(offs+left_count)*2+1]);
		return index + QHullReduce(tol, verts, offs + left_count + 1, right_count - 1, pivot, right, b, resultPos + index);
	}
};

// QuickHull seemed like a neat algorithm, and efficient-ish for large input sets.
// My implementation performs an in place reduction using the result array as scratch space.
//
// Pass an Array into result to put the result of the calculation there. Otherwise, pass null
// and the verts list will be edited in-place.
//
// Expects the verts to be described in the same way as cpPolyShape - which is to say, it should
// be a list of [x1,y1,x2,y2,x3,y3,...].
//
// tolerance is in world coordinates. Eg, 2.
/**
 * Calculate the convex hull of a given set of points.
 *
 * @function
 * @memberof	cp
 * @param	{number[]}	verts
 * @param	{array}		result
 * @param	{number}	tolerance	The allowed amount to shrink the hull when simplifying it. A tolerance of 0.0 creates an exact hull.
 * @return	{array}
 */
cp.convexHull = function(verts, result, tolerance)
{
	if(result){
		// Copy the line vertexes into the empty part of the result polyline to use as a scratch buffer.
		for (var i = 0; i < verts.length; i++){
			result[i] = verts[i];
		}
	} else {
		// If a result array was not specified, reduce the input instead.
		result = verts;
	}
	
	// Degenerate case, all points are the same.
	var indexes = loopIndexes(verts);
	var start = indexes[0], end = indexes[1];
	if(start == end){
		//if(first) (*first) = 0;
		result.length = 2;
		return result;
	}
	
	SWAP(result, 0, start);
	SWAP(result, 1, end == 0 ? start : end);
	
	var a = new Vect(result[0], result[1]);
	var b = new Vect(result[2], result[3]);
	
	var count = verts.length >> 1;
	//if(first) (*first) = start;
	var resultCount = QHullReduce(tolerance, result, 2, count - 2, a, b, a, 1) + 1;
	result.length = resultCount*2;

	assertSoft(polyValidate(result),
		"Internal error: cpConvexHull() and cpPolyValidate() did not agree." +
		"Please report this error with as much info as you can.");
	return result;
};

/// Clamp @c f to be between @c min and @c max.
/**
 * Clamp f to be between min and max.
 *
 * @function
 * @param	{number}	f
 * @param	{number}	minv	Min value.
 * @param	{number}	maxv	Max value.
 * @return	{number}
 */
var clamp = function(f, minv, maxv)
{
	return min(max(f, minv), maxv);
};

/// Clamp @c f to be between 0 and 1.
/**
 * Clamp f to be between 0 and 1.
 *
 * @function
 * @param	{number}	f
 * @return	{number}
 */
var clamp01 = function(f)
{
	return max(0, min(f, 1));
};

/// Linearly interpolate (or extrapolate) between @c f1 and @c f2 by @c t percent.
/**
 * Linearly interpolate (or extrapolate) between f1 and f2 by t percent.
 *
 * @function
 * @param	{number}	f1
 * @param	{number}	f2
 * @param	{number}	t	percentage
 * @return	{number}
 */
var lerp = function(f1, f2, t)
{
	return f1*(1 - t) + f2*t;
};

/// Linearly interpolate from @c f1 to @c f2 by no more than @c d.
/**
 * Linearly interpolate from f1 to f2 by no more than d.
 * @function
 * @param	{number}	f1
 * @param	{number}	f2
 * @param	{number}	d
 * @return	{number}
 */
var lerpconst = function(f1, f2, d)
{
	return f1 + clamp(f2 - f1, -d, d);
};
