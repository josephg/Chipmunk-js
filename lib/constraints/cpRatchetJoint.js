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

var RatchetJoint = cp.RatchetJoint = function(a, b, phase, ratchet)
{
	Constraint.call(this, a, b);

	this.angle = 0;
	this.phase = phase;
	this.ratchet = ratchet;
	
	// STATIC_BODY_CHECK
	this.angle = (b ? b.a : 0) - (a ? a.a : 0);
	
	this.iSum = this.bias = this.jAcc = this.jMax = 0;
};

RatchetJoint.prototype = Object.create(Constraint.prototype);

RatchetJoint.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	var angle = this.angle;
	var phase = this.phase;
	var ratchet = this.ratchet;
	
	var delta = b.a - a.a;
	var diff = angle - delta;
	var pdist = 0;
	
	if(diff*ratchet > 0){
		pdist = diff;
	} else {
		this.angle = Math.floor((delta - phase)/ratchet)*ratchet + phase;
	}
	
	// calculate moment of inertia coefficient.
	this.iSum = 1/(a.i_inv + b.i_inv);
	
	// calculate bias velocity
	var maxBias = this.maxBias;
	this.bias = clamp(-bias_coef(this.errorBias, dt)*pdist/dt, -maxBias, maxBias);
	
	// compute max impulse
	this.jMax = this.maxForce * dt;

	// If the bias is 0, the joint is not at a limit. Reset the impulse.
	if(!this.bias) this.jAcc = 0;
};

RatchetJoint.prototype.applyCachedImpulse = function(dt_coef)
{
	var a = this.a;
	var b = this.b;
	
	var j = this.jAcc*dt_coef;
	a.w -= j*a.i_inv;
	b.w += j*b.i_inv;
};

RatchetJoint.prototype.applyImpulse = function()
{
	if(!this.bias) return; // early exit

	var a = this.a;
	var b = this.b;
	
	// compute relative rotational velocity
	var wr = b.w - a.w;
	var ratchet = this.ratchet;
	
	// compute normal impulse	
	var j = -(this.bias + wr)*this.iSum;
	var jOld = this.jAcc;
	this.jAcc = clamp((jOld + j)*ratchet, 0, this.jMax*Math.abs(ratchet))/ratchet;
	j = this.jAcc - jOld;
	
	// apply impulse
	a.w -= j*a.i_inv;
	b.w += j*b.i_inv;
};

RatchetJoint.prototype.getImpulse = function(joint)
{
	return Math.abs(joint.jAcc);
};

