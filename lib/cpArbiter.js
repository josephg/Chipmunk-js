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

/// @defgroup cpArbiter cpArbiter
/// The cpArbiter struct controls pairs of colliding shapes.
/// They are also used in conjuction with collision handler callbacks
/// allowing you to retrieve information on the collision and control it.


// **** Collision Handlers
//
// Collision handlers are user-defined objects to describe the behaviour of colliding
// objects.
/**
 * Collision handlers are user-defined objects to describe the behaviour of colliding objects.
 * 
 * @class
 * @memberof	cp
 */
var CollisionHandler = cp.CollisionHandler = function()
{
	// The collision type
	this.a = this.b = 0;
};

/// Collision begin event callback
/// Returning false from a begin callback causes the collision to be ignored until
/// the the separate callback is called when the objects stop colliding.
/**
 * Collision begin event callback
 * Returning false from a begin callback causes the collision to be ignored until
 * the the separate callback is called when the objects stop colliding.
 *
 * @function
 * @memberof	CollisionHandler
 * @param	{Arbiter}	arb
 * @param	{}	space
 * @return	{boolean}
 */
CollisionHandler.prototype.begin = function(arb, space){return true;};

/// Collision pre-solve event callback
/// Returning false from a pre-step callback causes the collision to be ignored until the next step.
/**
 * Collision pre-solve event callback
 * Returning false from a pre-step callback causes the collision to be ignored until the next step.
 * 
 * @function
 * @memberof	CollisionHandler
 * @param	{Arbiter}	arb
 * @param	{}	space
 * @return	{boolean}
 */
CollisionHandler.prototype.preSolve = function(arb, space){return true;};

/// Collision post-solve event function callback type.
/**
 * Collision post-solve event function callback type.
 * 
 * @function
 * @memberof	CollisionHandler
 * @param	{Arbiter}	arb
 * @param	{}	space
 */
CollisionHandler.prototype.postSolve = function(arb, space){};

///`Collision separate event function callback type.
/**
 * Collision separate event function callback type.
 *
 * @function
 * @memberof	CollisionHandler
 * @param	{Arbiter}	arb
 * @param	{}	space
 */
CollisionHandler.prototype.separate = function(arb, space){};

/**
 * @memberof	cp
 * @constant	{number}
 * @readonly
 */
var CP_MAX_CONTACTS_PER_ARBITER = 4;

// Arbiter states
//
// Arbiter is active and its the first collision.
//	'first coll'
// Arbiter is active and its not the first collision.
//	'normal',
// Collision has been explicitly ignored.
// Either by returning false from a begin collision handler or calling cpArbiterIgnore().
//	'ignore',
// Collison is no longer active. A space will cache an arbiter for up to cpSpace.collisionPersistence more steps.
//	'cached'

/// A colliding pair of shapes.
/**
 * A colliding pair of shapes.
 *
 * @class
 * @param	{cp.Shape}	a
 * @param	{cp.Shape}	b
 * @property	{cp.Shape}	a
 * @property	{cp.Shape}	b
 */
var Arbiter = function(a, b) {
	/// Calculated value to use for the elasticity coefficient.
	/// Override in a pre-solve collision handler for custom behavior.
	/**
	 * Calculated value to use for the elasticity coefficient.
	 * Override in a pre-solve collision handler for custom behavior.
	 *
	 * @member	{number}
	 */
	this.e = 0;
	/// Calculated value to use for the friction coefficient.
	/// Override in a pre-solve collision handler for custom behavior.
	/**
	 * Calculated value to use for the friction coefficient.
	 * Override in a pre-solve collision handler for custom behavior.
	 *
	 * @member	{number}
	 */
	this.u = 0;
	/// Calculated value to use for applying surface velocities.
	/// Override in a pre-solve collision handler for custom behavior.
	/**
	 * Calculated value to use for applying surface velocities.
	 * Override in a pre-solve collision handler for custom behavior.
	 *
	 * @member	{cp.Vect}
	 * @default	vzero
	 */
	this.surface_vr = vzero;
	
	this.a = a; this.body_a = a.body;
	this.b = b; this.body_b = b.body;
	
	this.thread_a_next = this.thread_a_prev = null;
	this.thread_b_next = this.thread_b_prev = null;
	
	this.contacts = null;
	
	this.stamp = 0;
	this.handler = null;
	this.swappedColl = false;
	this.state = 'first coll';
};

/**
 * Return the colliding shapes involved for this arbiter. 
 *
 * @function
 * @memberof	Arbiter
 * @return	{cp.Shape[]}
 */
Arbiter.prototype.getShapes = function()
{
	if (this.swappedColl){
		return [this.b, this.a];
	}else{
		return [this.a, this.b];
	}
}

/// Calculate the total impulse that was applied by this arbiter.
/// This function should only be called from a post-solve, post-step or cpBodyEachArbiter callback.
/**
 * Calculate the total impulse that was applied by this arbiter.
 * This function should only be called from a post-solve, post-step or cpBodyEachArbiter callback.
 *
 * @function
 * @memberof	Arbiter
 * @return	{cp.Vect}
 */
Arbiter.prototype.totalImpulse = function()
{
	var contacts = this.contacts;
	var sum = new Vect(0,0);
	
	for(var i=0, count=contacts.length; i<count; i++){
		var con = contacts[i];
		sum.add(vmult(con.n, con.jnAcc));
	}
	
	return this.swappedColl ? sum : sum.neg();
};

/// Calculate the total impulse including the friction that was applied by this arbiter.
/// This function should only be called from a post-solve, post-step or cpBodyEachArbiter callback.
/**
 * Calculate the total impulse including the friction that was applied by this arbiter.
 * This function should only be called from a post-solve, post-step or cpBodyEachArbiter callback.
 * 
 * @function
 * @memberof	Arbiter
 * @return	{cp.Vect}
 */
Arbiter.prototype.totalImpulseWithFriction = function()
{
	var contacts = this.contacts;
	var sum = new Vect(0,0);
	
	for(var i=0, count=contacts.length; i<count; i++){
		var con = contacts[i];
		sum.add(new Vect(con.jnAcc, con.jtAcc).rotate(con.n));
	}

	return this.swappedColl ? sum : sum.neg();
};

/// Calculate the amount of energy lost in a collision including static, but not dynamic friction.
/// This function should only be called from a post-solve, post-step or cpBodyEachArbiter callback.
/**
 * Calculate the amount of energy lost in a collision including static, but not dynamic friction.
 * This function should only be called from a post-solve, post-step or cpBodyEachArbiter callback.
 * 
 * @function
 * @memberof	Arbiter
 * @return	{number}
 */
Arbiter.prototype.totalKE = function()
{
	var eCoef = (1 - this.e)/(1 + this.e);
	var sum = 0;
	
	var contacts = this.contacts;
	for(var i=0, count=contacts.length; i<count; i++){
		var con = contacts[i];
		var jnAcc = con.jnAcc;
		var jtAcc = con.jtAcc;
		
		sum += eCoef*jnAcc*jnAcc/con.nMass + jtAcc*jtAcc/con.tMass;
	}
	
	return sum;
};

/// Causes a collision pair to be ignored as if you returned false from a begin callback.
/// If called from a pre-step callback, you will still need to return false
/// if you want it to be ignored in the current step.
/**
 * Causes a collision pair to be ignored as if you returned false from a begin callback.
 * If called from a pre-step callback, you will still need to return false
 * if you want it to be ignored in the current step.
 *
 * @function
 * @memberof	Arbiter
 */
Arbiter.prototype.ignore = function()
{
	this.state = 'ignore';
};

/// Return the colliding shapes involved for this arbiter.
/// The order of their cpSpace.collision_type values will match
/// the order set when the collision handler was registered.
/**
 * Return the colliding shapes involved for this arbiter.
 * The order of their cpSpace.collision_type values will match
 * the order set when the collision handler was registered.
 *
 * @function
 * @memberof	Arbiter
 * @return	{cp.Shape}
 */
Arbiter.prototype.getA = function()
{
	return this.swappedColl ? this.b : this.a;
};

/**
 * @function
 * @memberof	Arbiter
 * @return	{cp.Shape}
 */
Arbiter.prototype.getB = function()
{
	return this.swappedColl ? this.a : this.b;
};

/// Returns true if this is the first step a pair of objects started colliding.
/**
 * Returns true if this is the first step a pair of objects started colliding.
 *
 * @function
 * @memberof	Arbiter
 * @return	{boolean}
 */
Arbiter.prototype.isFirstContact = function()
{
	return this.state === 'first coll';
};

/// A struct that wraps up the important collision data for an arbiter.
/**
 * A struct that wraps up the important collision data for an arbiter.
 *
 * @class
 * @param	{}	point
 * @param	{}	normal
 * @param	{}	dist
 */
var ContactPoint = function(point, normal, dist)
{
	/**
	 * @member	{}
	 */
	this.point = point;

	/**
	 * @member	{}
	 */
	this.normal = normal;

	/**
	 * @member	{}
	 */
	this.dist = dist;
};

/// Return a contact set from an arbiter.
/**
 * Return a contact set from an arbiter.
 *
 * @function
 * @memberof	Arbiter
 * @return	{ContactPoint[]}
 */
Arbiter.prototype.getContactPointSet = function()
{
	var set = new Array(this.contacts.length);
	
	var i;
	for(i=0; i<set.length; i++){
		set[i] = new ContactPoint(this.contacts[i].p, this.contacts[i].n, this.contacts[i].dist);
	}
	
	return set;
};

/// Get the normal of the @c ith contact point.
/**
 * Get the normal of the ith contact point.
 *
 * @function
 * @memberof	Arbiter
 * @param	{number}	i
 * @return	{cp.Vect}
 */
Arbiter.prototype.getNormal = function(i)
{
	var n = this.contacts[i].n;
	return this.swappedColl ? vneg(n) : n;
};

/// Get the position of the @c ith contact point.
/**
 * Get the position of the ith contact point.
 *
 * @function
 * @memberof	Arbiter
 * @param	{number}	i
 * @retrun	{cp.Vect}
 */
Arbiter.prototype.getPoint = function(i)
{
	return this.contacts[i].p;
};

/// Get the depth of the @c ith contact point.
/**
 * Get the depth of the ith contact point.
 *
 * @function
 * @memberof	Arbiter
 * @param	{number}	i
 * @return	{number}
 */
Arbiter.prototype.getDepth = function(i)
{
	return this.contacts[i].dist;
};

/*
Arbiter.prototype.threadForBody = function(body)
{
	return (this.body_a === body ? this.thread_a : this.thread_b);
};*/

/**
 * @function
 * @param	{}	arb
 * @param	{}	body
 * @param	{}	prev
 * @param	{}	next
 */
var unthreadHelper = function(arb, body, prev, next)
{
	// thread_x_y is quite ugly, but it avoids making unnecessary js objects per arbiter.
	if(prev){
		// cpArbiterThreadForBody(prev, body)->next = next;
		if(prev.body_a === body) {
			prev.thread_a_next = next;
		} else {
			prev.thread_b_next = next;
		}
	} else if(body.arbiterList === arb){
		body.arbiterList = next;
	}
	
	if(next){
		// cpArbiterThreadForBody(next, body)->prev = prev;
		if(next.body_a === body){
			next.thread_a_prev = prev;
		} else {
			next.thread_b_prev = prev;
		}
	}
};

/**
 * @function
 * @memberof	Arbiter
 */
Arbiter.prototype.unthread = function()
{
	unthreadHelper(this, this.body_a, this.thread_a_prev, this.thread_a_next);
	unthreadHelper(this, this.body_b, this.thread_b_prev, this.thread_b_next);
	this.thread_a_prev = this.thread_a_next = null;
	this.thread_b_prev = this.thread_b_next = null;
};

//cpFloat
//cpContactsEstimateCrushingImpulse(cpContact *contacts, int numContacts)
//{
//	cpFloat fsum = 0;
//	cpVect vsum = vzero;
//	
//	for(int i=0; i<numContacts; i++){
//		cpContact *con = &contacts[i];
//		cpVect j = vrotate(con.n, v(con.jnAcc, con.jtAcc));
//		
//		fsum += vlength(j);
//		vsum = vadd(vsum, j);
//	}
//	
//	cpFloat vmag = vlength(vsum);
//	return (1 - vmag/fsum);
//}

/**
 * @function
 * @memberof	Arbiter
 * @param	{}	contacts
 * @param	{}	handler
 * @param	{}	a
 * @param	{}	b
 */
Arbiter.prototype.update = function(contacts, handler, a, b)
{
	// Arbiters without contact data may exist if a collision function rejected the collision.
	if(this.contacts){
		// Iterate over the possible pairs to look for hash value matches.
		for(var i=0; i<this.contacts.length; i++){
			var old = this.contacts[i];
			
			for(var j=0; j<contacts.length; j++){
				var new_contact = contacts[j];
				
				// This could trigger false positives, but is fairly unlikely nor serious if it does.
				if(new_contact.hash === old.hash){
					// Copy the persistant contact information.
					new_contact.jnAcc = old.jnAcc;
					new_contact.jtAcc = old.jtAcc;
				}
			}
		}
	}
	
	this.contacts = contacts;
	
	this.handler = handler;
	this.swappedColl = (a.collision_type !== handler.a);
	
	this.e = a.e * b.e;
	this.u = a.u * b.u;
	this.surface_vr = vsub(a.surface_v, b.surface_v);
	
	// For collisions between two similar primitive types, the order could have been swapped.
	this.a = a; this.body_a = a.body;
	this.b = b; this.body_b = b.body;
	
	// mark it as new if it's been cached
	if(this.state == 'cached') this.state = 'first coll';
};

/**
 * @function
 * @memberof	Arbiter
 * @param	{}	dt
 * @param	{}	slop
 * @param	{}	bias
 */
Arbiter.prototype.preStep = function(dt, slop, bias)
{
	var a = this.body_a;
	var b = this.body_b;
	
	for(var i=0; i<this.contacts.length; i++){
		var con = this.contacts[i];
		
		// Calculate the offsets.
		con.r1 = vsub(con.p, a.p);
		con.r2 = vsub(con.p, b.p);
		
		// Calculate the mass normal and mass tangent.
		con.nMass = 1/k_scalar(a, b, con.r1, con.r2, con.n);
		con.tMass = 1/k_scalar(a, b, con.r1, con.r2, vperp(con.n));
	
		// Calculate the target bias velocity.
		con.bias = -bias*min(0, con.dist + slop)/dt;
		con.jBias = 0;
		
		// Calculate the target bounce velocity.
		con.bounce = normal_relative_velocity(a, b, con.r1, con.r2, con.n)*this.e;
	}
};

/**
 * @function
 * @memberof	Arbiter
 * @param	{}	dt_coef
 */
Arbiter.prototype.applyCachedImpulse = function(dt_coef)
{
	if(this.isFirstContact()) return;
	
	var a = this.body_a;
	var b = this.body_b;
	
	for(var i=0; i<this.contacts.length; i++){
		var con = this.contacts[i];
		//var j = vrotate(con.n, new Vect(con.jnAcc, con.jtAcc));
		var nx = con.n.x;
		var ny = con.n.y;
		var jx = nx*con.jnAcc - ny*con.jtAcc;
		var jy = nx*con.jtAcc + ny*con.jnAcc;
		//apply_impulses(a, b, con.r1, con.r2, vmult(j, dt_coef));
		apply_impulses(a, b, con.r1, con.r2, jx * dt_coef, jy * dt_coef);
	}
};

// TODO is it worth splitting velocity/position correction?

var numApplyImpulse = 0;
var numApplyContact = 0;

/**
 * @function
 * @memberof	Arbiter
 */
Arbiter.prototype.applyImpulse = function()
{
	numApplyImpulse++;
	//if (!this.contacts) { throw new Error('contacts is undefined'); }
	var a = this.body_a;
	var b = this.body_b;
	var surface_vr = this.surface_vr;
	var friction = this.u;

	for(var i=0; i<this.contacts.length; i++){
		numApplyContact++;
		var con = this.contacts[i];
		var nMass = con.nMass;
		var n = con.n;
		var r1 = con.r1;
		var r2 = con.r2;
		
		//var vr = relative_velocity(a, b, r1, r2);
		var vrx = b.vx - r2.y * b.w - (a.vx - r1.y * a.w);
		var vry = b.vy + r2.x * b.w - (a.vy + r1.x * a.w);
		
		//var vb1 = vadd(vmult(vperp(r1), a.w_bias), a.v_bias);
		//var vb2 = vadd(vmult(vperp(r2), b.w_bias), b.v_bias);
		//var vbn = vdot(vsub(vb2, vb1), n);

		var vbn = n.x*(b.v_biasx - r2.y * b.w_bias - a.v_biasx + r1.y * a.w_bias) +
				n.y*(r2.x*b.w_bias + b.v_biasy - r1.x * a.w_bias - a.v_biasy);

		var vrn = vdot2(vrx, vry, n.x, n.y);
		//var vrt = vdot(vadd(vr, surface_vr), vperp(n));
		var vrt = vdot2(vrx + surface_vr.x, vry + surface_vr.y, -n.y, n.x);
		
		var jbn = (con.bias - vbn)*nMass;
		var jbnOld = con.jBias;
		con.jBias = max(jbnOld + jbn, 0);
		
		var jn = -(con.bounce + vrn)*nMass;
		var jnOld = con.jnAcc;
		con.jnAcc = max(jnOld + jn, 0);
		
		var jtMax = friction*con.jnAcc;
		var jt = -vrt*con.tMass;
		var jtOld = con.jtAcc;
		con.jtAcc = clamp(jtOld + jt, -jtMax, jtMax);
		
		//apply_bias_impulses(a, b, r1, r2, vmult(n, con.jBias - jbnOld));
		var bias_x = n.x * (con.jBias - jbnOld);
		var bias_y = n.y * (con.jBias - jbnOld);
		apply_bias_impulse(a, -bias_x, -bias_y, r1);
		apply_bias_impulse(b, bias_x, bias_y, r2);

		//apply_impulses(a, b, r1, r2, vrotate(n, new Vect(con.jnAcc - jnOld, con.jtAcc - jtOld)));
		var rot_x = con.jnAcc - jnOld;
		var rot_y = con.jtAcc - jtOld;

		// Inlining apply_impulses decreases speed for some reason :/
		apply_impulses(a, b, r1, r2, n.x*rot_x - n.y*rot_y, n.x*rot_y + n.y*rot_x);
	}
};

/**
 * @function
 * @memberof	Arbiter
 * @param	{cp.Space}	space
 */
Arbiter.prototype.callSeparate = function(space)
{
	// The handler needs to be looked up again as the handler cached on the arbiter may have been deleted since the last step.
	var handler = space.lookupHandler(this.a.collision_type, this.b.collision_type);
	handler.separate(this, space);
};

// From chipmunk_private.h
/**
 * From chipmunk_private.h
 *
 * @function
 * @memberof	Arbiter
 * @param	{}	body
 * @return	{}
 */
Arbiter.prototype.next = function(body)
{
	return (this.body_a == body ? this.thread_a_next : this.thread_b_next);
};
