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

var GrooveJoint = cp.GrooveJoint = function(a, b, groove_a, groove_b, anchr2)
{
	Constraint.call(this, a, b);
	
	this.grv_a = groove_a;
	this.grv_b = groove_b;
	this.grv_n = vperp(vnormalize(vsub(groove_b, groove_a)));
	this.anchr2 = anchr2;
	
	this.grv_tn = null;
	this.clamp = 0;
	this.r1 = this.r2 = null;

	this.k1 = new Vect(0,0);
	this.k2 = new Vect(0,0);

	this.jAcc = vzero;
	this.jMaxLen = 0;
	this.bias = null;
};

GrooveJoint.prototype = Object.create(Constraint.prototype);

GrooveJoint.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	// calculate endpoints in worldspace
	var ta = a.local2World(this.grv_a);
	var tb = a.local2World(this.grv_b);

	// calculate axis
	var n = vrotate(this.grv_n, a.rot);
	var d = vdot(ta, n);
	
	this.grv_tn = n;
	this.r2 = vrotate(this.anchr2, b.rot);
	
	// calculate tangential distance along the axis of r2
	var td = vcross(vadd(b.p, this.r2), n);
	// calculate clamping factor and r2
	if(td <= vcross(ta, n)){
		this.clamp = 1;
		this.r1 = vsub(ta, a.p);
	} else if(td >= vcross(tb, n)){
		this.clamp = -1;
		this.r1 = vsub(tb, a.p);
	} else {
		this.clamp = 0;
		this.r1 = vsub(vadd(vmult(vperp(n), -td), vmult(n, d)), a.p);
	}
	
	// Calculate mass tensor
	k_tensor(a, b, this.r1, this.r2, this.k1, this.k2);	
	
	// compute max impulse
	this.jMaxLen = this.maxForce * dt;
	
	// calculate bias velocity
	var delta = vsub(vadd(b.p, this.r2), vadd(a.p, this.r1));
	this.bias = vclamp(vmult(delta, -bias_coef(this.errorBias, dt)/dt), this.maxBias);
};

GrooveJoint.prototype.applyCachedImpulse = function(dt_coef)
{
	apply_impulses(this.a, this.b, this.r1, this.r2, this.jAcc.x * dt_coef, this.jAcc.y * dt_coef);
};

GrooveJoint.prototype.grooveConstrain = function(j){
	var n = this.grv_tn;
	var jClamp = (this.clamp*vcross(j, n) > 0) ? j : vproject(j, n);
	return vclamp(jClamp, this.jMaxLen);
};

GrooveJoint.prototype.applyImpulse = function()
{
	var a = this.a;
	var b = this.b;
	
	var r1 = this.r1;
	var r2 = this.r2;
	
	// compute impulse
	var vr = relative_velocity(a, b, r1, r2);

	var j = mult_k(vsub(this.bias, vr), this.k1, this.k2);
	var jOld = this.jAcc;
	this.jAcc = this.grooveConstrain(vadd(jOld, j));
	
	// apply impulse
	apply_impulses(a, b, this.r1, this.r2, this.jAcc.x - jOld.x, this.jAcc.y - jOld.y);
};

GrooveJoint.prototype.getImpulse = function()
{
	return vlength(this.jAcc);
};

GrooveJoint.prototype.setGrooveA = function(value)
{
	this.grv_a = value;
	this.grv_n = vperp(vnormalize(vsub(this.grv_b, value)));
	
	this.activateBodies();
};

GrooveJoint.prototype.setGrooveB = function(value)
{
	this.grv_b = value;
	this.grv_n = vperp(vnormalize(vsub(value, this.grv_a)));
	
	this.activateBodies();
};

