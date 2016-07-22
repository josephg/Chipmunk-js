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

// I'm using an array tuple here because (at time of writing) its about 3x faster
// than an object on firefox, and the same speed on chrome.

//var numVects = 0;

/**
 *
 * @class
 * @memberof	cp
 * @param	{number}	x
 * @param	{number}	y
 */
var Vect = cp.Vect = function(x, y)
{
	this.x = x;
	this.y = y;
	//numVects++;

//	var s = new Error().stack;
//	traces[s] = traces[s] ? traces[s]+1 : 1;
};

/**
 * @function
 * @memberof	cp
 * @param	{number}	x
 * @param	{number}	y
 * @return	{cp.Vect}
 */
cp.v = function (x,y) { return new Vect(x, y) };

/**
 * @constant	{cp.Vect}
 * @readonly
 */
var vzero = cp.vzero = new Vect(0,0);

// The functions below *could* be rewritten to be instance methods on Vect. I don't
// know how that would effect performance. For now, I'm keeping the JS similar to
// the original C code.

/// Vector dot product.
/**
 * Vector dot product.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{number}
 */
var vdot = cp.v.dot = function(v1, v2)
{
	return v1.x*v2.x + v1.y*v2.y;
};

/**
 * @function
 * @param	{number}	x1
 * @param	{number}	y1
 * @param	{number}	x2
 * @param	{number}	y2
 * @return	{number}
 */
var vdot2 = function(x1, y1, x2, y2)
{
	return x1*x2 + y1*y2;
};

/// Returns the length of v.
/**
 * Returns the length of v.
 * 
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{number}	Returns the lenght of v.
 */
var vlength = cp.v.len = function(v)
{
	return Math.sqrt(vdot(v, v));
};

/**
 * @function
 * @memberof	cp.v
 * @param	{number}	x
 * @param	{number}	y
 * @return	{number}
 */
var vlength2 = cp.v.len2 = function(x, y)
{
	return Math.sqrt(x*x + y*y);
};

/// Check if two vectors are equal. (Be careful when comparing floating point numbers!)
/**
 * Check if two vectors are equal. (Be careful when comparing floating point numbers!)
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{boolean}
 */
var veql = cp.v.eql = function(v1, v2)
{
	return (v1.x === v2.x && v1.y === v2.y);
};

/// Add two vectors
/**
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
var vadd = cp.v.add = function(v1, v2)
{
	return new Vect(v1.x + v2.x, v1.y + v2.y);
};

/**
 * @function
 * @param	{cp.Vect}	v2
 * @retrun	{cp.Vect}
 */
Vect.prototype.add = function(v2)
{
	this.x += v2.x;
	this.y += v2.y;
	return this;
};

/// Subtract two vectors.
/**
 * Subtract two vectors.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
var vsub = cp.v.sub = function(v1, v2)
{
	return new Vect(v1.x - v2.x, v1.y - v2.y);
};

/**
 * @function
 * @param	{cp.Vect}
 * @return	{cp.Vect}
 */
Vect.prototype.sub = function(v2)
{
	this.x -= v2.x;
	this.y -= v2.y;
	return this;
};

/// Negate a vector.
/**
 * Negate a vector.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{cp.Vect}
 */
var vneg = cp.v.neg = function(v)
{
	return new Vect(-v.x, -v.y);
};

/**
 * @function
 * @return	{cp.Vect}
 */
Vect.prototype.neg = function()
{
	this.x = -this.x;
	this.y = -this.y;
	return this;
};

/// Scalar multiplication
/**
 * Scalar multiplication
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @param	{number}	s
 */
var vmult = cp.v.mult = function(v, s)
{
	return new Vect(v.x*s, v.y*s);
};

/**
 * @function
 * @param	{number}
 * @return	{cp.Vect}
 */
Vect.prototype.mult = function(s)
{
	this.x *= s;
	this.y *= s;
	return this;
};

/// 2D vector cross product analog.
/// The cross product of 2D vectors results in a 3D vector with only a z component.
/// This function returns the magnitude of the z value.
/**
 * 2D vector cross product analog.
 * The cross product of 2D vectors results in a 3D vector with only a z component.
 * This function returns the magnitude of the z value.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
var vcross = cp.v.cross = function(v1, v2)
{
	return v1.x*v2.y - v1.y*v2.x;
};

/**
 * @function
 * @param	{number}	x1
 * @param	{number}	y1
 * @param	{number}	x2
 * @param	{number}	y2
 * @return	{cp.Vect}
 */
var vcross2 = function(x1, y1, x2, y2)
{
	return x1*y2 - y1*x2;
};

/// Returns a perpendicular vector. (90 degree rotation)
/**
 * Returns a perpendicular vector. (90 degree rotation)
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{cp.Vect}
 */
var vperp = cp.v.perp = function(v)
{
	return new Vect(-v.y, v.x);
};

/// Returns a perpendicular vector. (-90 degree rotation)
/**
 * Returns a perpendicular vector. (-90 degree rotation)
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{cp.Vect}
 */
var vpvrperp = cp.v.pvrperp = function(v)
{
	return new Vect(v.y, -v.x);
};

/// Returns the vector projection of v1 onto v2.
/**
 * Returns the vector projection of v1 onto v2.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
var vproject = cp.v.project = function(v1, v2)
{
	return vmult(v2, vdot(v1, v2)/vlengthsq(v2));
};

/**
 * @function
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
Vect.prototype.project = function(v2)
{
	this.mult(vdot(this, v2) / vlengthsq(v2));
	return this;
};

/// Uses complex number multiplication to rotate v1 by v2. Scaling will occur if v1 is not a unit vector.
/**
 * Uses complex number multiplication to rotate v1 by v2. Scaling will occur if v1 is not a unit vector.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
var vrotate = cp.v.rotate = function(v1, v2)
{
	return new Vect(v1.x*v2.x - v1.y*v2.y, v1.x*v2.y + v1.y*v2.x);
};

/**
 * @function
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
Vect.prototype.rotate = function(v2)
{
	this.x = this.x * v2.x - this.y * v2.y;
	this.y = this.x * v2.y + this.y * v2.x;
	return this;
};

/// Inverse of vrotate().
/**
 * Inverse of vrotate().
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{cp.Vect}
 */
var vunrotate = cp.v.unrotate = function(v1, v2)
{
	return new Vect(v1.x*v2.x + v1.y*v2.y, v1.y*v2.x - v1.x*v2.y);
};

/// Returns the squared length of v. Faster than vlength() when you only need to compare lengths.
/**
 * Returns the squared length of v. Faster than vlength() when you only need to compare lengths.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{number}
 */
var lengthsq = cp.v.lengthsq = function(v)
{
	return vdot(v, v);
};

/**
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	x
 * @param	{cp.Vect}	y
 * @return	{number}
 */
var vlengthsq2 = cp.v.lengthsq2 = function(x, y)
{
	return x*x + y*y;
};

/// Linearly interpolate between v1 and v2.
/**
 * Linearly interpolate between v1 and v2.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @param	{number}	t
 * @return	{cp.Vect}
 */
var vlerp = cp.v.lerp = function(v1, v2, t)
{
	return vadd(vmult(v1, 1 - t), vmult(v2, t));
};

/// Returns a normalized copy of v.
/**
 * Returns a normalized copy of v.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{cp.Vect}
 */
var vnormalize = cp.v.normalize = function(v)
{
	return vmult(v, 1/vlength(v));
};

/// Returns a normalized copy of v or vzero if v was already vzero. Protects against divide by zero errors.
/**
 * Returns a normalized copy of v or vzero if v was already vzero. Protects against divide by zero errors.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{cp.Vect}
 */
var vnormalize_safe = cp.v.normalize_safe = function(v)
{
	return (v.x === 0 && v.y === 0 ? vzero : vnormalize(v));
};

/// Clamp v to length len.
/**
 * Clamp v to length len.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{number}	len
 * @return	{cp.Vect}
 */
var vclamp = cp.v.clamp = function(v, len)
{
	return (vdot(v,v) > len*len) ? vmult(vnormalize(v), len) : v;
};

/// Linearly interpolate between v1 towards v2 by distance d.
/**
 * Linearly interpolate between v1 towards v2 by distance d.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @param	{number}	d
 * @return	{cp.Vect}
 */
var vlerpconst = cp.v.lerpconst = function(v1, v2, d)
{
	return vadd(v1, vclamp(vsub(v2, v1), d));
};

/// Returns the distance between v1 and v2.
/**
 * Returns the distance between v1 and v2.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{number}
 */
var vdist = cp.v.dist = function(v1, v2)
{
	return vlength(vsub(v1, v2));
};

/// Returns the squared distance between v1 and v2. Faster than vdist() when you only need to compare distances.
/**
 * Returns the squared distance between v1 and v2. Faster than vdist() when you only need to compare distances.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @return	{number}
 */
var vdistsq = cp.v.distsq = function(v1, v2)
{
	return vlengthsq(vsub(v1, v2));
};

/// Returns true if the distance between v1 and v2 is less than dist.
/**
 * Returns true if the distance between v1 and v2 is less than dist.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @param	{number}	dist
 * @return	{cp.Vect}
 */
var vnear = cp.v.near = function(v1, v2, dist)
{
	return vdistsq(v1, v2) < dist*dist;
};

/// Spherical linearly interpolate between v1 and v2.
/**
 * Spherical linearly interpolate between v1 and v2.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @param	{number}	t
 * @return	{cp.Vect}
 */
var vslerp = cp.v.slerp = function(v1, v2, t)
{
	var omega = Math.acos(vdot(v1, v2));
	
	if(omega) {
		var denom = 1/Math.sin(omega);
		return vadd(vmult(v1, Math.sin((1 - t)*omega)*denom), vmult(v2, Math.sin(t*omega)*denom));
	} else {
		return v1;
	}
};

/// Spherical linearly interpolate between v1 towards v2 by no more than angle a radians
/**
 * Spherical linearly interpolate between v1 towards v2 by no more than angle a radians
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @param	{cp.Vect}	v2
 * @param	{number}	a
 * @return	{cp.Vect}
 */
var vslerpconst = cp.v.slerpconst = function(v1, v2, a)
{
	var angle = Math.acos(vdot(v1, v2));
	return vslerp(v1, v2, min(a, angle)/angle);
};

/// Returns the unit length vector for the given angle (in radians).
/**
* Returns the unit length vector for the given angle (in radians).
 *
 * @function
 * @memberof	cp.v
 * @param	{number}	a
 * @return	{cp.Vect}
 */
var vforangle = cp.v.forangle = function(a)
{
	return new Vect(Math.cos(a), Math.sin(a));
};

/// Returns the angular direction v is pointing in (in radians).
/**
 * Returns the angular direction v is pointing in (in radians).
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v
 * @return	{number}
 */
var vtoangle = cp.v.toangle = function(v)
{
	return Math.atan2(v.y, v.x);
};

///	Returns a string representation of v. Intended mostly for debugging purposes and not production use.
/**
 * Returns a string representation of v. Intended mostly for debugging purposes and not production use.
 *
 * @function
 * @memberof	cp.v
 * @param	{cp.Vect}	v1
 * @return	{string}
 */
var vstr = cp.v.str = function(v)
{
	return "(" + v.x.toFixed(3) + ", " + v.y.toFixed(3) + ")";
};

