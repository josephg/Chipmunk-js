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

// Pivot joints can also be created with (a, b, pivot);
var PivotJoint = cp.PivotJoint = function(a, b, anchr1, anchr2)
{
	Constraint.call(this, a, b);
	
	if(typeof anchr2 === 'undefined') {
		var pivot = anchr1;

		anchr1 = (a ? a.world2Local(pivot) : pivot);
		anchr2 = (b ? b.world2Local(pivot) : pivot);
	}

	this.anchr1 = anchr1;
	this.anchr2 = anchr2;

	this.r1 = this.r2 = vzero;
	
	this.k1 = new Vect(0,0); this.k2 = new Vect(0,0);

	this.jAcc = vzero;

	this.jMaxLen = 0;
	this.bias = vzero;
};

PivotJoint.prototype = Object.create(Constraint.prototype);

PivotJoint.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	this.r1 = vrotate(this.anchr1, a.rot);
	this.r2 = vrotate(this.anchr2, b.rot);
	
	// Calculate mass tensor. Result is stored into this.k1 & this.k2.
	k_tensor(a, b, this.r1, this.r2, this.k1, this.k2);
	
	// compute max impulse
	this.jMaxLen = this.maxForce * dt;
	
	// calculate bias velocity
	var delta = vsub(vadd(b.p, this.r2), vadd(a.p, this.r1));
	this.bias = vclamp(vmult(delta, -bias_coef(this.errorBias, dt)/dt), this.maxBias);
};

PivotJoint.prototype.applyCachedImpulse = function(dt_coef)
{
	apply_impulses(this.a, this.b, this.r1, this.r2, this.jAcc.x * dt_coef, this.jAcc.y * dt_coef);
};

PivotJoint.prototype.applyImpulse = function()
{
	var a = this.a;
	var b = this.b;
	
	var r1 = this.r1;
	var r2 = this.r2;
		
	// compute relative velocity
	var vr = relative_velocity(a, b, r1, r2);
	
	// compute normal impulse
	var j = mult_k(vsub(this.bias, vr), this.k1, this.k2);
	var jOld = this.jAcc;
	this.jAcc = vclamp(vadd(this.jAcc, j), this.jMaxLen);
	
	// apply impulse
	apply_impulses(a, b, this.r1, this.r2, this.jAcc.x - jOld.x, this.jAcc.y - jOld.y);
};

PivotJoint.prototype.getImpulse = function()
{
	return vlength(this.jAcc);
};

