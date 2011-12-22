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

var Vect = exports.Vect = function(x, y)
{
  this.x = x;
  this.y = y;
};

var vzero = new Vect(0,0);

// The functions below *could* be rewritten to be instance methods on Vect. I don't
// know how that would effect performance. For now, I'm keeping the JS similar to
// the original C code.

/// Vector dot product.
var vdot = function(v1, v2)
{
	return v1.x*v2.x + v1.y*v2.y;
};

/// Returns the length of v.
var vlength = function(v)
{
	return Math.sqrt(vdot(v, v));
};

/// Check if two vectors are equal. (Be careful when comparing floating point numbers!)
var veql = function(v1, v2)
{
	return (v1.x === v2.x && v1.y === v2.y);
};

/// Add two vectors
var vadd = function(v1, v2)
{
	return new Vect(v1.x + v2.x, v1.y + v2.y);
};

Vect.prototype.add = function(v2)
{
  this.x += v2.x;
  this.y += v2.y;
  return this;
};

/// Subtract two vectors.
var vsub = function(v1, v2)
{
	return new Vect(v1.x - v2.x, v1.y - v2.y);
};

Vect.prototype.sub = function(v2)
{
  this.x -= v2.x;
  this.y -= v2.y;
  return this;
};

/// Negate a vector.
var vneg = function(v)
{
	return new Vect(-v.x, -v.y);
};

Vect.prototype.neg = function()
{
  this.x = -this.x;
  this.y = -this.y;
  return this;
};

/// Scalar multiplication.
var vmult = function(v, s)
{
	return new Vect(v.x*s, v.y*s);
};

Vect.prototype.mult = function(s)
{
  this.x *= s;
  this.y *= s;
  return this;
};

/// 2D vector cross product analog.
/// The cross product of 2D vectors results in a 3D vector with only a z component.
/// This function returns the magnitude of the z value.
var vcross = function(v1, v2)
{
	return v1.x*v2.y - v1.y*v2.x;
};

/// Returns a perpendicular vector. (90 degree rotation)
var vperp = function(v)
{
	return new Vect(-v.y, v.x);
};

/// Returns a perpendicular vector. (-90 degree rotation)
var vpvrperp = function(v)
{
	return new Vect(v.y, -v.x);
};

/// Returns the vector projection of v1 onto v2.
var vproject = function(v1, v2)
{
	return vmult(v2, vdot(v1, v2)/v2.lengthsq());
};

Vect.prototype.project = function(v2)
{
  this.mult(vdot(this, v2) / v2.lengthsq());
  return this;
};

/// Uses complex number multiplication to rotate v1 by v2. Scaling will occur if v1 is not a unit vector.
var vrotate = function(v1, v2)
{
	return new Vect(v1.x*v2.x - v1.y*v2.y, v1.x*v2.y + v1.y*v2.x);
};

Vect.prototype.rotate = function(v2)
{
  this.x = this.x * v2.x - this.y * v2.y;
  this.y = this.x * v2.y + this.y * v2.x;
  return this;
};

/// Inverse of vrotate().
var vunrotate = function(v1, v2)
{
	return new Vect(v1.x*v2.x + v1.y*v2.y, v1.y*v2.x - v1.x*v2.y);
};

/// Returns the squared length of v. Faster than vlength() when you only need to compare lengths.
var vlengthsq = function(v)
{
	return vdot(v, v);
};

/// Linearly interpolate between v1 and v2.
var vlerp = function(v1, v2, t)
{
	return vadd(vmult(v1, 1 - t), vmult(v2, t));
};

/// Returns a normalized copy of v.
var vnormalize = function(v)
{
	return vmult(v, 1/vlength(v));
};

/// Returns a normalized copy of v or vzero if v was already vzero. Protects against divide by zero errors.
var vnormalize_safe = function(v)
{
	return (v.x === 0 && v.y === 0 ? vzero : vnormalize(v));
};

/// Clamp v to length len.
var vclamp = function(v, len)
{
	return (vdot(v,v) > len*len) ? vmult(vnormalize(v), len) : v;
};

/// Linearly interpolate between v1 towards v2 by distance d.
var vlerpconst = function(v1, v2, d)
{
	return vadd(v1, vclamp(vsub(v2, v1), d));
};

/// Returns the distance between v1 and v2.
var vdist = function(v1, v2)
{
	return vlength(vsub(v1, v2));
};

/// Returns the squared distance between v1 and v2. Faster than vdist() when you only need to compare distances.
var vdistsq = function(v1, v2)
{
	return vlengthsq(vsub(v1, v2));
};

/// Returns true if the distance between v1 and v2 is less than dist.
var vnear = function(v1, v2, dist)
{
	return vdistsq(v1, v2) < dist*dist;
};

/// Spherical linearly interpolate between v1 and v2.
var vslerp = function(v1, v2, t)
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
var vslerpconst = function(v1, v2, a)
{
	var angle = Math.acos(vdot(v1, v2));
	return vslerp(v1, v2, Math.min(a, angle)/angle);
};

/// Returns the unit length vector for the given angle (in radians).
var vforangle = function(a)
{
  return new Vect(Math.cos(a), Math.sin(a));
};

/// Returns the angular direction v is pointing in (in radians).
var vtoangle = function(v)
{
  return Math.atan2(v.y, v.x);
};

///	Returns a string representation of v. Intended mostly for debugging purposes and not production use.
var vstr = function(v)
{
  return "(" + v.x.toFixed(3) + ", " + v.y.toFixed(3) + ")";
};

