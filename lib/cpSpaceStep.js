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

// **** Post Step Callback Functions

/// Schedule a post-step callback to be called when cpSpaceStep() finishes.
Space.prototype.addPostStepCallback = function(func)
{
	assertSoft(this.locked,
		"Adding a post-step callback when the space is not locked is unnecessary. " +
		"Post-step callbacks will not called until the end of the next call to cpSpaceStep() or the next query.");

	this.postStepCallbacks.push(func);
};

Space.prototype.runPostStepCallbacks = function()
{
	// Don't cache length because post step callbacks may add more post step callbacks
	// directly or indirectly.
	for(var i = 0; i < this.postStepCallbacks.length; i++){
		this.postStepCallbacks[i]();
	}
	this.postStepCallbacks = [];
};

// **** Locking Functions

Space.prototype.lock = function()
{
	this.locked++;
};

Space.prototype.unlock = function(runPostStep)
{
	this.locked--;
	assert(this.locked >= 0, "Internal Error: Space lock underflow.");

	if(this.locked === 0 && runPostStep){
		var waking = this.rousedBodies;
		for(var i=0; i<waking.length; i++){
			this.activateBody(waking[i]);
		}

		waking.length = 0;

		this.runPostStepCallbacks();
	}
};

// **** Contact Buffer Functions

/* josephg:
 *
 * This code might be faster in JS than just allocating objects each time - I'm
 * really not sure. If the contact buffer solution is used, there will also
 * need to be changes in cpCollision.js to fill a passed array instead of creating
 * new arrays each time.
 *
 * TODO: Benchmark me once chipmunk is working.
 */

/*
var ContactBuffer = function(stamp, splice)
{
	this.stamp = stamp;
	// Contact buffers are a circular linked list.
	this.next = splice ? splice.next : this;
	this.contacts = [];
};

Space.prototype.pushFreshContactBuffer = function()
{
	var stamp = this.stamp;

	var head = this.contactBuffersHead;

	if(!head){
		// No buffers have been allocated, make one
		this.contactBuffersHead = new ContactBuffer(stamp, null);
	} else if(stamp - head.next.stamp > this.collisionPersistence){
		// The tail buffer is available, rotate the ring
		var tail = head.next;
		tail.stamp = stamp;
		tail.contacts.length = 0;
		this.contactBuffersHead = tail;
	} else {
		// Allocate a new buffer and push it into the ring
		var buffer = new ContactBuffer(stamp, head);
		this.contactBuffersHead = head.next = buffer;
	}
};

cpContact *
cpContactBufferGetArray(cpSpace *space)
{
	if(space.contactBuffersHead.numContacts + CP_MAX_CONTACTS_PER_ARBITER > CP_CONTACTS_BUFFER_SIZE){
		// contact buffer could overflow on the next collision, push a fresh one.
		space.pushFreshContactBuffer();
	}

	cpContactBufferHeader *head = space.contactBuffersHead;
	return ((cpContactBuffer *)head)->contacts + head.numContacts;
}

void
cpSpacePushContacts(cpSpace *space, int count)
{
	cpAssertHard(count <= CP_MAX_CONTACTS_PER_ARBITER, "Internal Error: Contact buffer overflow!");
	space.contactBuffersHead.numContacts += count;
}

static void
cpSpacePopContacts(cpSpace *space, int count){
	space.contactBuffersHead.numContacts -= count;
}
*/

// **** Collision Detection Functions

/* Use this to re-enable object pools.
static void *
cpSpaceArbiterSetTrans(cpShape **shapes, cpSpace *space)
{
	if(space.pooledArbiters.num == 0){
		// arbiter pool is exhausted, make more
		int count = CP_BUFFER_BYTES/sizeof(cpArbiter);
		cpAssertHard(count, "Internal Error: Buffer size too small.");

		cpArbiter *buffer = (cpArbiter *)cpcalloc(1, CP_BUFFER_BYTES);
		cpArrayPush(space.allocatedBuffers, buffer);

		for(int i=0; i<count; i++) cpArrayPush(space.pooledArbiters, buffer + i);
	}

	return cpArbiterInit((cpArbiter *)cpArrayPop(space.pooledArbiters), shapes[0], shapes[1]);
}*/

// Callback from the spatial hash.
Space.prototype.makeCollideShapes = function()
{
	// It would be nicer to use .bind() or something, but this is faster.
	var space_ = this;
	return function(a, b){
		var space = space_;

		// Reject any of the simple cases
		if(
			// BBoxes must overlap
			//!bbIntersects(a.bb, b.bb)
			!(a.bb_l <= b.bb_r && b.bb_l <= a.bb_r && a.bb_b <= b.bb_t && b.bb_b <= a.bb_t)
			// Don't collide shapes attached to the same body.
			|| a.body === b.body
			// Don't collide objects in the same non-zero group
			|| (a.group && a.group === b.group)
			// Don't collide objects that don't share at least on layer.
			|| !(a.layers & b.layers)
		) return;

		var handler = space.lookupHandler(a.collision_type, b.collision_type);

		var sensor = a.sensor || b.sensor;
		if(sensor && handler === defaultCollisionHandler) return;

		// Shape 'a' should have the lower shape type. (required by cpCollideShapes() )
		if(a.collisionCode > b.collisionCode){
			var temp = a;
			a = b;
			b = temp;
		}

		// Narrow-phase collision detection.
		//cpContact *contacts = cpContactBufferGetArray(space);
		//int numContacts = cpCollideShapes(a, b, contacts);
		var contacts = collideShapes(a, b);
		if(contacts.length === 0) return; // Shapes are not colliding.
		//cpSpacePushContacts(space, numContacts);

		// Get an arbiter from space.arbiterSet for the two shapes.
		// This is where the persistant contact magic comes from.
		var arbHash = hashPair(a.hashid, b.hashid);
		var arb = space.cachedArbiters[arbHash];
		if (!arb){
			arb = space.cachedArbiters[arbHash] = new Arbiter(a, b);
		}

		arb.update(contacts, handler, a, b);

		// Call the begin function first if it's the first step
		if(arb.state == 'first coll' && !handler.begin(arb, space)){
			arb.ignore(); // permanently ignore the collision until separation
		}

		if(
			// Ignore the arbiter if it has been flagged
			(arb.state !== 'ignore') &&
			// Call preSolve
			handler.preSolve(arb, space) &&
			// Process, but don't add collisions for sensors.
			!sensor
		){
			space.arbiters.push(arb);
		} else {
			//cpSpacePopContacts(space, numContacts);

			arb.contacts = null;

			// Normally arbiters are set as used after calling the post-solve callback.
			// However, post-solve callbacks are not called for sensors or arbiters rejected from pre-solve.
			if(arb.state !== 'ignore') arb.state = 'normal';
		}

		// Time stamp the arbiter so we know it was used recently.
		arb.stamp = space.stamp;
	};
};

// Hashset filter func to throw away old arbiters.
Space.prototype.arbiterSetFilter = function(arb)
{
	var ticks = this.stamp - arb.stamp;

	var a = arb.body_a, b = arb.body_b;

	// TODO should make an arbiter state for this so it doesn't require filtering arbiters for
	// dangling body pointers on body removal.
	// Preserve arbiters on sensors and rejected arbiters for sleeping objects.
	// This prevents errant separate callbacks from happenening.
	if(
		(a.isStatic() || a.isSleeping()) &&
		(b.isStatic() || b.isSleeping())
	){
		return true;
	}

	// Arbiter was used last frame, but not this one
	if(ticks >= 1 && arb.state != 'cached'){
		arb.callSeparate(this);
		arb.state = 'cached';
	}

	if(ticks >= this.collisionPersistence){
		arb.contacts = null;

		//cpArrayPush(this.pooledArbiters, arb);
		return false;
	}

	return true;
};

// **** All Important cpSpaceStep() Function

var updateFunc = function(shape)
{
	var body = shape.body;
	shape.update(body.p, body.rot);
};

/// Step the space forward in time by @c dt.
Space.prototype.step = function(dt)
{
	// don't step if the timestep is 0!
	if(dt === 0) return;

	assert(vzero.x === 0 && vzero.y === 0, "vzero is invalid");

	this.stamp++;

	var prev_dt = this.curr_dt;
	this.curr_dt = dt;

    var i;
    var j;
    var hash;
	var bodies = this.bodies;
	var constraints = this.constraints;
	var arbiters = this.arbiters;

	// Reset and empty the arbiter lists.
	for(i=0; i<arbiters.length; i++){
		var arb = arbiters[i];
		arb.state = 'normal';

		// If both bodies are awake, unthread the arbiter from the contact graph.
		if(!arb.body_a.isSleeping() && !arb.body_b.isSleeping()){
			arb.unthread();
		}
	}
	arbiters.length = 0;

	this.lock(); {
		// Integrate positions
		for(i=0; i<bodies.length; i++){
			bodies[i].position_func(dt);
		}

		// Find colliding pairs.
		//this.pushFreshContactBuffer();
		this.activeShapes.each(updateFunc);
		this.activeShapes.reindexQuery(this.collideShapes);
	} this.unlock(false);

	// Rebuild the contact graph (and detect sleeping components if sleeping is enabled)
	this.processComponents(dt);

	this.lock(); {
		// Clear out old cached arbiters and call separate callbacks
		for(hash in this.cachedArbiters) {
			if(!this.arbiterSetFilter(this.cachedArbiters[hash])) {
				delete this.cachedArbiters[hash];
			}
		}

		// Prestep the arbiters and constraints.
		var slop = this.collisionSlop;
		var biasCoef = 1 - Math.pow(this.collisionBias, dt);
		for(i=0; i<arbiters.length; i++){
			arbiters[i].preStep(dt, slop, biasCoef);
		}

		for(i=0; i<constraints.length; i++){
			var constraint = constraints[i];

			constraint.preSolve(this);
			constraint.preStep(dt);
		}

		// Integrate velocities.
		var damping = Math.pow(this.damping, dt);
		var gravity = this.gravity;
		for(i=0; i<bodies.length; i++){
			bodies[i].velocity_func(gravity, damping, dt);
		}

		// Apply cached impulses
		var dt_coef = (prev_dt === 0 ? 0 : dt/prev_dt);
		for(i=0; i<arbiters.length; i++){
			arbiters[i].applyCachedImpulse(dt_coef);
		}

		for(i=0; i<constraints.length; i++){
			constraints[i].applyCachedImpulse(dt_coef);
		}

		// Run the impulse solver.
		for(i=0; i<this.iterations; i++){
			for(j=0; j<arbiters.length; j++){
				arbiters[j].applyImpulse();
			}

			for(j=0; j<constraints.length; j++){
				constraints[j].applyImpulse();
			}
		}

		// Run the constraint post-solve callbacks
		for(i=0; i<constraints.length; i++){
			constraints[i].postSolve(this);
		}

		// run the post-solve callbacks
		for(i=0; i<arbiters.length; i++){
			arbiters[i].handler.postSolve(arbiters[i], this);
		}
	} this.unlock(true);
};

