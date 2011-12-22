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

// These are utility routines to use when creating custom constraints.
// I'm not sure if this should be part of the private API or not.
// I should probably clean up the naming conventions if it is...

//#define J_MAX(constraint, dt) (((cpConstraint *)constraint)->maxForce*(dt))

// a and b are bodies.
var relative_velocity = function(a, b, r1, r2){
	var v1_sum = vadd(a.v, vmult(vperp(r1), a.w));
	var v2_sum = vadd(b.v, vmult(vperp(r2), b.w));
	
	return vsub(v2_sum, v1_sum);
};

var normal_relative_velocity = function(a, b, r1, r2, n){
	return vdot(relative_velocity(a, b, r1, r2), n);
};

var apply_impulse = function(body, j, r){
	body.v = vadd(body.v, vmult(j, body.m_inv));
	body.w += body.i_inv*vcross(r, j);
};

var apply_impulses = function(a, b, r1, r2, j)
{
	apply_impulse(a, vneg(j), r1);
	apply_impulse(b, j, r2);
};

var apply_bias_impulse = function(body, j, r)
{
	body.v_bias = vadd(body.v_bias, vmult(j, body.m_inv));
	body.w_bias += body.i_inv*vcross(r, j);
};

var apply_bias_impulses = function(a, b, r1, r2, j)
{
	apply_bias_impulse(a, vneg(j), r1);
	apply_bias_impulse(b, j, r2);
};

var k_scalar_body = function(body, r, n)
{
	var rcn = vcross(r, n);
	return body.m_inv + body.i_inv*rcn*rcn;
};

var k_scalar = function(a, b, r1, r2, n)
{
	var value = k_scalar_body(a, r1, n) + k_scalar_body(b, r2, n);
	assertSoft(value !== 0, "Unsolvable collision or constraint.");
	
	return value;
};

// Returns [k1, k2].
var k_tensor = function(a, b, r1, r2)
{
	// calculate mass matrix
	// If I wasn't lazy and wrote a proper matrix class, this wouldn't be so gross...
	var k11, k12, k21, k22;
	var m_sum = a.m_inv + b.m_inv;
	
	// start with I*m_sum
	k11 = m_sum; k12 = 0;
	k21 = 0;  k22 = m_sum;
	
	// add the influence from r1
	var a_i_inv = a.i_inv;
	var r1xsq =  r1.x * r1.x * a_i_inv;
	var r1ysq =  r1.y * r1.y * a_i_inv;
	var r1nxy = -r1.x * r1.y * a_i_inv;
	k11 += r1ysq; k12 += r1nxy;
	k21 += r1nxy; k22 += r1xsq;
	
	// add the influnce from r2
	var b_i_inv = b.i_inv;
	var r2xsq =  r2.x * r2.x * b_i_inv;
	var r2ysq =  r2.y * r2.y * b_i_inv;
	var r2nxy = -r2.x * r2.y * b_i_inv;
	k11 += r2ysq; k12 += r2nxy;
	k21 += r2nxy; k22 += r2xsq;
	
	// invert
	var determinant = k11*k22 - k12*k21;
	assertSoft(determinant !== 0, "Unsolvable constraint.");
	
	var det_inv = 1/determinant;
  return [new Vect(k22*det_inv, -k12*det_inv), new Vect(-k21*det_inv,  k11*det_inv)];
};

var mult_k = function(vr, k1, k2)
{
	return new Vect(vdot(vr, k1), vdot(vr, k2));
};

var bias_coef = function(errorBias, dt)
{
	return 1 - Math.pow(errorBias, dt);
};

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

// TODO: Comment me!

// a and b are bodies that the constraint applies to.
var Constraint = exports.Constraint = function(a, b)
{
	/// The first body connected to this constraint.
	this.a = a;
	/// The second body connected to this constraint.
	this.b = b;
	
  this.space = null;

	this.next_a = null;
	this.next_b = null;
	
	/// The maximum force that this constraint is allowed to use.
	this.maxForce = Infinity;
	/// The rate at which joint error is corrected.
	/// Defaults to pow(1 - 0.1, 60) meaning that it will
	/// correct 10% of the error every 1/60th of a second.
	this.errorBias = fpow(1 - 0.1, 60);
	/// The maximum rate at which joint error is corrected.
	this.maxBias = Infinity;
};

Constraint.prototype.activateBodies = function()
{
	if(this.a) this.a.activate();
	if(this.b) this.b.activate();
};

/// These methods are overridden by the constraint itself.
Constraint.prototype.preStep = function(dt) {};
Constraint.prototype.applyCachedImpulse = function(dt_coef) {};
Constraint.prototype.applyImpulse = function() {};
Constraint.prototype.getImpulse = function() { return 0; };

/// Function called before the solver runs. This can be overridden by the user
/// to customize the constraint.
/// Animate your joint anchors, update your motor torque, etc.
Constraint.prototype.preSolve = function(space) {};

/// Function called after the solver runs. This can be overridden by the user
/// to customize the constraint.
/// Use the applied impulse to perform effects like breakable joints.
Constraint.prototype.postSolve = function(space) {};
