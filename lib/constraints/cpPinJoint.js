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

var PinJoint = cp.PinJoint = function(a, b, anchr1, anchr2)
{
	Constraint.call(this, a, b);
	
	this.anchr1 = anchr1;
	this.anchr2 = anchr2;
	
	// STATIC_BODY_CHECK
	var p1 = (a ? vadd(a.p, vrotate(anchr1, a.rot)) : anchr1);
	var p2 = (b ? vadd(b.p, vrotate(anchr2, b.rot)) : anchr2);
	this.dist = vlength(vsub(p2, p1));
	
	assertSoft(this.dist > 0, "You created a 0 length pin joint. A pivot joint will be much more stable.");

	this.r1 = this.r2 = null;
	this.n = null;
	this.nMass = 0;

	this.jnAcc = this.jnMax = 0;
	this.bias = 0;
};

PinJoint.prototype = Object.create(Constraint.prototype);

PinJoint.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	this.r1 = vrotate(this.anchr1, a.rot);
	this.r2 = vrotate(this.anchr2, b.rot);
	
	var delta = vsub(vadd(b.p, this.r2), vadd(a.p, this.r1));
	var dist = vlength(delta);
	this.n = vmult(delta, 1/(dist ? dist : Infinity));
	
	// calculate mass normal
	this.nMass = 1/k_scalar(a, b, this.r1, this.r2, this.n);
	
	// calculate bias velocity
	var maxBias = this.maxBias;
	this.bias = clamp(-bias_coef(this.errorBias, dt)*(dist - this.dist)/dt, -maxBias, maxBias);
	
	// compute max impulse
	this.jnMax = this.maxForce * dt;
};

PinJoint.prototype.applyCachedImpulse = function(dt_coef)
{
	var j = vmult(this.n, this.jnAcc*dt_coef);
	apply_impulses(this.a, this.b, this.r1, this.r2, j.x, j.y);
};

PinJoint.prototype.applyImpulse = function()
{
	var a = this.a;
	var b = this.b;
	var n = this.n;

	// compute relative velocity
	var vrn = normal_relative_velocity(a, b, this.r1, this.r2, n);
	
	// compute normal impulse
	var jn = (this.bias - vrn)*this.nMass;
	var jnOld = this.jnAcc;
	this.jnAcc = clamp(jnOld + jn, -this.jnMax, this.jnMax);
	jn = this.jnAcc - jnOld;
	
	// apply impulse
	apply_impulses(a, b, this.r1, this.r2, n.x*jn, n.y*jn);
};

PinJoint.prototype.getImpulse = function()
{
	return Math.abs(this.jnAcc);
};

