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

var GearJoint = cp.GearJoint = function(a, b, phase, ratio)
{
	Constraint.call(this, a, b);
	
	this.phase = phase;
	this.ratio = ratio;
	this.ratio_inv = 1/ratio;
	
	this.jAcc = 0;

	this.iSum = this.bias = this.jMax = 0;
};

GearJoint.prototype = Object.create(Constraint.prototype);

GearJoint.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	// calculate moment of inertia coefficient.
	this.iSum = 1/(a.i_inv*this.ratio_inv + this.ratio*b.i_inv);
	
	// calculate bias velocity
	var maxBias = this.maxBias;
	this.bias = clamp(-bias_coef(this.errorBias, dt)*(b.a*this.ratio - a.a - this.phase)/dt, -maxBias, maxBias);
	
	// compute max impulse
	this.jMax = this.maxForce * dt;
};

GearJoint.prototype.applyCachedImpulse = function(dt_coef)
{
	var a = this.a;
	var b = this.b;
	
	var j = this.jAcc*dt_coef;
	a.w -= j*a.i_inv*this.ratio_inv;
	b.w += j*b.i_inv;
};

GearJoint.prototype.applyImpulse = function()
{
	var a = this.a;
	var b = this.b;
	
	// compute relative rotational velocity
	var wr = b.w*this.ratio - a.w;
	
	// compute normal impulse	
	var j = (this.bias - wr)*this.iSum;
	var jOld = this.jAcc;
	this.jAcc = clamp(jOld + j, -this.jMax, this.jMax);
	j = this.jAcc - jOld;
	
	// apply impulse
	a.w -= j*a.i_inv*this.ratio_inv;
	b.w += j*b.i_inv;
};

GearJoint.prototype.getImpulse = function()
{
	return Math.abs(this.jAcc);
};

GearJoint.prototype.setRatio = function(value)
{
	this.ratio = value;
	this.ratio_inv = 1/value;
	this.activateBodies();
};

