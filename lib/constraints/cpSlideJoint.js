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

var SlideJoint = cp.SlideJoint = function(a, b, anchr1, anchr2, min, max)
{
	Constraint.call(this, a, b);
	
	this.anchr1 = anchr1;
	this.anchr2 = anchr2;
	this.min = min;
	this.max = max;

	this.r1 = this.r2 = this.n = null;
	this.nMass = 0;
	
	this.jnAcc = this.jnMax = 0;
	this.bias = 0;
};

SlideJoint.prototype = Object.create(Constraint.prototype);

SlideJoint.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	this.r1 = vrotate(this.anchr1, a.rot);
	this.r2 = vrotate(this.anchr2, b.rot);
	
	var delta = vsub(vadd(b.p, this.r2), vadd(a.p, this.r1));
	var dist = vlength(delta);
	var pdist = 0;
	if(dist > this.max) {
		pdist = dist - this.max;
		this.n = vnormalize_safe(delta);
	} else if(dist < this.min) {
		pdist = this.min - dist;
		this.n = vneg(vnormalize_safe(delta));
	} else {
		this.n = vzero;
		this.jnAcc = 0;
	}
	
	// calculate mass normal
	this.nMass = 1/k_scalar(a, b, this.r1, this.r2, this.n);
	
	// calculate bias velocity
	var maxBias = this.maxBias;
	this.bias = clamp(-bias_coef(this.errorBias, dt)*pdist/dt, -maxBias, maxBias);
	
	// compute max impulse
	this.jnMax = this.maxForce * dt;
};

SlideJoint.prototype.applyCachedImpulse = function(dt_coef)
{
	var jn = this.jnAcc * dt_coef;
	apply_impulses(this.a, this.b, this.r1, this.r2, this.n.x * jn, this.n.y * jn);
};

SlideJoint.prototype.applyImpulse = function()
{
	if(this.n.x === 0 && this.n.y === 0) return;  // early exit

	var a = this.a;
	var b = this.b;
	
	var n = this.n;
	var r1 = this.r1;
	var r2 = this.r2;
		
	// compute relative velocity
	var vr = relative_velocity(a, b, r1, r2);
	var vrn = vdot(vr, n);
	
	// compute normal impulse
	var jn = (this.bias - vrn)*this.nMass;
	var jnOld = this.jnAcc;
	this.jnAcc = clamp(jnOld + jn, -this.jnMax, 0);
	jn = this.jnAcc - jnOld;
	
	// apply impulse
	apply_impulses(a, b, this.r1, this.r2, n.x * jn, n.y * jn);
};

SlideJoint.prototype.getImpulse = function()
{
	return Math.abs(this.jnAcc);
};

