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

var defaultSpringForce = function(spring, dist){
	return (spring.restLength - dist)*spring.stiffness;
};

var DampedSpring = cp.DampedSpring = function(a, b, anchr1, anchr2, restLength, stiffness, damping)
{
	Constraint.call(this, a, b);
	
	this.anchr1 = anchr1;
	this.anchr2 = anchr2;
	
	this.restLength = restLength;
	this.stiffness = stiffness;
	this.damping = damping;
	this.springForceFunc = defaultSpringForce;

	this.target_vrn = this.v_coef = 0;

	this.r1 = this.r2 = null;
	this.nMass = 0;
	this.n = null;
};

DampedSpring.prototype = Object.create(Constraint.prototype);

DampedSpring.prototype.preStep = function(dt)
{
	var a = this.a;
	var b = this.b;
	
	this.r1 = vrotate(this.anchr1, a.rot);
	this.r2 = vrotate(this.anchr2, b.rot);
	
	var delta = vsub(vadd(b.p, this.r2), vadd(a.p, this.r1));
	var dist = vlength(delta);
	this.n = vmult(delta, 1/(dist ? dist : Infinity));
	
	var k = k_scalar(a, b, this.r1, this.r2, this.n);
	assertSoft(k !== 0, "Unsolvable this.");
	this.nMass = 1/k;
	
	this.target_vrn = 0;
	this.v_coef = 1 - Math.exp(-this.damping*dt*k);

	// apply this force
	var f_spring = this.springForceFunc(this, dist);
	apply_impulses(a, b, this.r1, this.r2, this.n.x * f_spring * dt, this.n.y * f_spring * dt);
};

DampedSpring.prototype.applyCachedImpulse = function(dt_coef){};

DampedSpring.prototype.applyImpulse = function()
{
	var a = this.a;
	var b = this.b;
	
	var n = this.n;
	var r1 = this.r1;
	var r2 = this.r2;

	// compute relative velocity
	var vrn = normal_relative_velocity(a, b, r1, r2, n);
	
	// compute velocity loss from drag
	var v_damp = (this.target_vrn - vrn)*this.v_coef;
	this.target_vrn = vrn + v_damp;
	
	v_damp *= this.nMass;
	apply_impulses(a, b, this.r1, this.r2, this.n.x * v_damp, this.n.y * v_damp);
};

DampedSpring.prototype.getImpulse = function()
{
	return 0;
};

