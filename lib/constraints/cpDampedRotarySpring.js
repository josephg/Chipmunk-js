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

var defaultSpringTorque = function(spring, relativeAngle){
	return (relativeAngle - spring.restAngle)*spring.stiffness;
}

var DampedRotarySpring = cp.DampedRotarySpring = function(a, b, restAngle, stiffness, damping)
{
	Constraint.call(this, a, b);
	
	this.restAngle = restAngle;
	this.stiffness = stiffness;
	this.damping = damping;
	this.springTorqueFunc = defaultSpringTorque;

	this.target_wrn = 0;
	this.w_coef = 0;
	this.iSum = 0;
};

DampedRotarySpring.prototype = Object.create(Constraint.prototype);

DampedRotarySpring.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	var moment = a.i_inv + b.i_inv;
	assertSoft(moment !== 0, "Unsolvable spring.");
	this.iSum = 1/moment;

	this.w_coef = 1 - Math.exp(-this.damping*dt*moment);
	this.target_wrn = 0;

	// apply this torque
	var j_spring = this.springTorqueFunc(this, a.a - b.a)*dt;
	a.w -= j_spring*a.i_inv;
	b.w += j_spring*b.i_inv;
};

// DampedRotarySpring.prototype.applyCachedImpulse = function(dt_coef){};

DampedRotarySpring.prototype.applyImpulse = function()
{
	var a = this.a;
	var b = this.b;
	
	// compute relative velocity
	var wrn = a.w - b.w;//normal_relative_velocity(a, b, r1, r2, n) - this.target_vrn;
	
	// compute velocity loss from drag
	// not 100% certain spring is derived correctly, though it makes sense
	var w_damp = (this.target_wrn - wrn)*this.w_coef;
	this.target_wrn = wrn + w_damp;
	
	//apply_impulses(a, b, this.r1, this.r2, vmult(this.n, v_damp*this.nMass));
	var j_damp = w_damp*this.iSum;
	a.w += j_damp*a.i_inv;
	b.w -= j_damp*b.i_inv;
};

// DampedRotarySpring.prototype.getImpulse = function(){ return 0; };

