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

/**
 * @var
 * @type	CollisionHandler
 * @default	CollisionHandler
 */
var defaultCollisionHandler = new CollisionHandler();

/// Basic Unit of Simulation in Chipmunk
/**
 * Basic Unit of Simulation in Chipmunk
 *
 * @class
 * @memberof	cp
 */
var Space = cp.Space = function() {
	this.stamp = 0;
	this.curr_dt = 0;

	this.bodies = [];
	this.rousedBodies = [];
	this.sleepingComponents = [];
	
	this.staticShapes = new BBTree(null);
	this.activeShapes = new BBTree(this.staticShapes);
	
	this.arbiters = [];
	this.contactBuffersHead = null;
	this.cachedArbiters = {};
	//this.pooledArbiters = [];
	
	this.constraints = [];
	
	this.locked = 0;
	
	this.collisionHandlers = {};
	this.defaultHandler = defaultCollisionHandler;

	this.postStepCallbacks = [];
	
	/// Number of iterations to use in the impulse solver to solve contacts.
	this.iterations = 10;
	
	/// Gravity to pass to rigid bodies when integrating velocity.
	this.gravity = vzero;
	
	/// Damping rate expressed as the fraction of velocity bodies retain each second.
	/// A value of 0.9 would mean that each body's velocity will drop 10% per second.
	/// The default value is 1.0, meaning no damping is applied.
	/// @note This damping value is different than those of cpDampedSpring and cpDampedRotarySpring.
	this.damping = 1;
	
	/// Speed threshold for a body to be considered idle.
	/// The default value of 0 means to let the space guess a good threshold based on gravity.
	this.idleSpeedThreshold = 0;
	
	/// Time a group of bodies must remain idle in order to fall asleep.
	/// Enabling sleeping also implicitly enables the the contact graph.
	/// The default value of Infinity disables the sleeping algorithm.
	this.sleepTimeThreshold = Infinity;
	
	/// Amount of encouraged penetration between colliding shapes..
	/// Used to reduce oscillating contacts and keep the collision cache warm.
	/// Defaults to 0.1. If you have poor simulation quality,
	/// increase this number as much as possible without allowing visible amounts of overlap.
	this.collisionSlop = 0.1;
	
	/// Determines how fast overlapping shapes are pushed apart.
	/// Expressed as a fraction of the error remaining after each second.
	/// Defaults to pow(1.0 - 0.1, 60.0) meaning that Chipmunk fixes 10% of overlap each frame at 60Hz.
	this.collisionBias = Math.pow(1 - 0.1, 60);
	
	/// Number of frames that contact information should persist.
	/// Defaults to 3. There is probably never a reason to change this value.
	this.collisionPersistence = 3;
	
	/// Rebuild the contact graph during each step. Must be enabled to use the cpBodyEachArbiter() function.
	/// Disabled by default for a small performance boost. Enabled implicitly when the sleeping feature is enabled.
	this.enableContactGraph = false;
	
	/// The designated static body for this space.
	/// You can modify this body, or replace it with your own static body.
	/// By default it points to a statically allocated cpBody in the cpSpace struct.
	this.staticBody = new Body(Infinity, Infinity);
	this.staticBody.nodeIdleTime = Infinity;

	// Cache the collideShapes callback function for the space.
	this.collideShapes = this.makeCollideShapes();
};

/**
 * @function
 * @memberof	cp.Space
 * @return	{number}
 */
Space.prototype.getCurrentTimeStep = function() { return this.curr_dt; };

/**
 * @function
 * @memberof	cp.Space
 * @param	{number}	iter
 */
Space.prototype.setIterations = function(iter) { this.iterations = iter; };

/// returns true from inside a callback and objects cannot be added/removed.
/**
 * returns true from inside a callback and objects cannot be added/removed.
 *
 * @function
 * @memberof	cp.Space
 * @param	{number}
 */
Space.prototype.isLocked = function()
{
	return this.locked;
};
	
/**
 * @function
 * @param	{cp.Space}	space
 */
var assertSpaceUnlocked = function(space)
{
	assert(!space.locked, "This addition/removal cannot be done safely during a call to cpSpaceStep() \
 or during a query. Put these calls into a post-step callback.");
};

// **** Collision handler function management

/// Set a collision handler to be used whenever the two shapes with the given collision types collide.
/// You can pass null for any function you don't want to implement.
/**
 * Set a collision handler to be used whenever the two shapes with the given collision types collide.
 * You can pass null for any function you don't want to implement.
 *
 * @function
 * @param	{number}	a		Collision Type.
 * @param	{number}	b		Collision Type.
 * @param	{function|null}	begin		Two shapes just started touching for the first time this step.
 *						Return true from the callback to process the collision normally or false to cause Chipmunk to ignore the collision entirely.
 *						If you return false, the preSolve() and postSolve() callbacks will never be run, but you will still recieve a separate event when the shapes stop overlapping.
 * @param	{function|null}	preSolve	Two shapes are touching during this step.
 *						Return false from the callback to make Chipmunk ignore the collision this step or true to process it normally.
 *						Additionally, you may override collision values using cpArbiterSetFriction(), cpArbiterSetElasticity() or cpArbiterSetSurfaceVelocity() to provide custom friction, elasticity, or surface velocity values.
 * @param	{function|null}	postSolve	Two shapes are touching and their collision response has been processed.
 *						You can retrieve the collision impulse or kinetic energy at this time if you want to use it to calculate sound volumes or damage amounts.
 * @param	{function|null}	separate	Two shapes have just stopped touching for the first time this step.
 *						To ensure that begin()/separate() are always called in balanced pairs, it will also be called when removing a shape while its in contact with something or when deallocating the space.
 */
Space.prototype.addCollisionHandler = function(a, b, begin, preSolve, postSolve, separate)
{
	assertSpaceUnlocked(this);
		
	// Remove any old function so the new one will get added.
	this.removeCollisionHandler(a, b);
	
	var handler = new CollisionHandler();
	handler.a = a;
	handler.b = b;
	if(begin) handler.begin = begin;
	if(preSolve) handler.preSolve = preSolve;
	if(postSolve) handler.postSolve = postSolve;
	if(separate) handler.separate = separate;

	this.collisionHandlers[hashPair(a, b)] = handler;
};

/// Unset a collision handler.
/**
 * Unset a collision handler.
 *
 * @function
 * @memberof	cp.Space
 * @param	{number}	a	Collision Type.
 * @param	{number}	b	Collision Typel
 */
Space.prototype.removeCollisionHandler = function(a, b)
{
	assertSpaceUnlocked(this);
	
	delete this.collisionHandlers[hashPair(a, b)];
};

/// Set a default collision handler for this space.
/// The default collision handler is invoked for each colliding pair of shapes
/// that isn't explicitly handled by a specific collision handler.
/// You can pass null for any function you don't want to implement.
/**
 * Set a default collision handler for this space.
 * The default collision handler is invoked for each colliding pair of shapes
 * that isn't explicitly handled by a specific collision handler.
 * You can pass null for any function you don't want to implement.
 *
 * @function
 * @memberof	cp.Space
 * @param	{function|null}	begin
 * @param	{function|null}	preSolve
 * @param	{function|null}	postSolve
 * @param	{function|null}	separate
 */
Space.prototype.setDefaultCollisionHandler = function(begin, preSolve, postSolve, separate)
{
	assertSpaceUnlocked(this);

	var handler = new CollisionHandler();
	if(begin) handler.begin = begin;
	if(preSolve) handler.preSolve = preSolve;
	if(postSolve) handler.postSolve = postSolve;
	if(separate) handler.separate = separate;

	this.defaultHandler = handler;
};

/**
 * @function
 * @memberof	cp.Space
 * @param	{number}	a
 * @param	{number}	b
 * @return	{CollisionHandler}
 */
Space.prototype.lookupHandler = function(a, b)
{
	return this.collisionHandlers[hashPair(a, b)] || this.defaultHandler;
};

// **** Body, Shape, and Joint Management

/// Add a collision shape to the simulation.
/// If the shape is attached to a static body, it will be added as a static shape.
/**
 * Add a collision shape to the simulation.
 * If the shape is attached to a static body, it will be added as a static shape.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Shape}	shape
 * @return	{cp.Shape}
 */
Space.prototype.addShape = function(shape)
{
	var body = shape.body;
	if(body.isStatic()) return this.addStaticShape(shape);
	
	assert(!shape.space, "This shape is already added to a space and cannot be added to another.");
	assertSpaceUnlocked(this);
	
	body.activate();
	body.addShape(shape);
	
	shape.update(body.p, body.rot);
	this.activeShapes.insert(shape, shape.hashid);
	shape.space = this;
		
	return shape;
};

/// Explicity add a shape as a static shape to the simulation.
/**
 * Explicity add a shape as a static shape to the simulation.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Shape}	shape
 * @return	{cp.Shape}
 */
Space.prototype.addStaticShape = function(shape)
{
	assert(!shape.space, "This shape is already added to a space and cannot be added to another.");
	assertSpaceUnlocked(this);
	
	var body = shape.body;
	body.addShape(shape);

	shape.update(body.p, body.rot);
	this.staticShapes.insert(shape, shape.hashid);
	shape.space = this;
	
	return shape;
};

/// Add a rigid body to the simulation.
/**
 * Add a rigid body to the simulation.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Body}	body
 * @return	{cp.Body}
 */
Space.prototype.addBody = function(body)
{
	assert(!body.isStatic(), "Static bodies cannot be added to a space as they are not meant to be simulated.");
	assert(!body.space, "This body is already added to a space and cannot be added to another.");
	assertSpaceUnlocked(this);
	
	this.bodies.push(body);
	body.space = this;
	
	return body;
};

/// Add a constraint to the simulation.
/**
 * Add a constraint to the simulation.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Constraint}	constraint
 * @return	{cp.Constraint}
 */
Space.prototype.addConstraint = function(constraint)
{
	assert(!constraint.space, "This shape is already added to a space and cannot be added to another.");
	assertSpaceUnlocked(this);
	
	var a = constraint.a, b = constraint.b;

	a.activate();
	b.activate();
	this.constraints.push(constraint);
	
	// Push onto the heads of the bodies' constraint lists
	constraint.next_a = a.constraintList; a.constraintList = constraint;
	constraint.next_b = b.constraintList; b.constraintList = constraint;
	constraint.space = this;
	
	return constraint;
};

/**
 * @function
 * @memberof	cp.Space
 * @param	{cp.Body}	body
 * @param	{cp.Shape}	filter
 * @return	{Arbiter}
 */
Space.prototype.filterArbiters = function(body, filter)
{
	for (var hash in this.cachedArbiters)
	{
		var arb = this.cachedArbiters[hash];

		// Match on the filter shape, or if it's null the filter body
		if(
			(body === arb.body_a && (filter === arb.a || filter === null)) ||
			(body === arb.body_b && (filter === arb.b || filter === null))
		){
			// Call separate when removing shapes.
			if(filter && arb.state !== 'cached') arb.callSeparate(this);
			
			arb.unthread();

			deleteObjFromList(this.arbiters, arb);
			//this.pooledArbiters.push(arb);
			
			delete this.cachedArbiters[hash];
		}
	}
};

/// Remove a collision shape from the simulation.
/**
 * Remove a collision shape from the simulation.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Shape}	shape
 */
Space.prototype.removeShape = function(shape)
{
	var body = shape.body;
	if(body.isStatic()){
		this.removeStaticShape(shape);
	} else {
		assert(this.containsShape(shape),
			"Cannot remove a shape that was not added to the space. (Removed twice maybe?)");
		assertSpaceUnlocked(this);
		
		body.activate();
		body.removeShape(shape);
		this.filterArbiters(body, shape);
		this.activeShapes.remove(shape, shape.hashid);
		shape.space = null;
	}
};

/// Remove a collision shape added using addStaticShape() from the simulation.
/**
 * Remove a collision shape added using addStaticShape() from the simulation.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Shape}	shape
 */
Space.prototype.removeStaticShape = function(shape)
{
	assert(this.containsShape(shape),
		"Cannot remove a static or sleeping shape that was not added to the space. (Removed twice maybe?)");
	assertSpaceUnlocked(this);
	
	var body = shape.body;
	if(body.isStatic()) body.activateStatic(shape);
	body.removeShape(shape);
	this.filterArbiters(body, shape);
	this.staticShapes.remove(shape, shape.hashid);
	shape.space = null;
};

/// Remove a rigid body from the simulation.
/**
 * Remove a rigid body from the simulation.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Body}	body
 */
Space.prototype.removeBody = function(body)
{
	assert(this.containsBody(body),
		"Cannot remove a body that was not added to the space. (Removed twice maybe?)");
	assertSpaceUnlocked(this);
	
	body.activate();
//	this.filterArbiters(body, null);
	deleteObjFromList(this.bodies, body);
	body.space = null;
};

/// Remove a constraint from the simulation.
/**
 * Remove a constraint from the simulation.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Constraint}	constraint
 */
Space.prototype.removeConstraint = function(constraint)
{
	assert(this.containsConstraint(constraint),
		"Cannot remove a constraint that was not added to the space. (Removed twice maybe?)");
	assertSpaceUnlocked(this);
	
	constraint.a.activate();
	constraint.b.activate();
	deleteObjFromList(this.constraints, constraint);
	
	constraint.a.removeConstraint(constraint);
	constraint.b.removeConstraint(constraint);
	constraint.space = null;
};

/// Test if a collision shape has been added to the space.
/**
 * Test if a collision shape has been added to the space.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Shape}	shape
 * @return	{boolean}
 */
Space.prototype.containsShape = function(shape)
{
	return (shape.space === this);
};

/// Test if a rigid body has been added to the space.
/**
 * Test if a rigid body has been added to the space.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Body}	body
 * @return	{boolean}
 */
Space.prototype.containsBody = function(body)
{
	return (body.space == this);
};

/// Test if a constraint has been added to the space.
/**
 * Test if a constraint has been added to the space.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Constraint}	constraint
 * @return	{bool}
 */
Space.prototype.containsConstraint = function(constraint)
{
	return (constraint.space == this);
};

/**
 * @function
 * @memberof	cp.Space
 * @param	{Arbiter}	arb
 */
Space.prototype.uncacheArbiter = function(arb)
{
	delete this.cachedArbiters[hashPair(arb.a.hashid, arb.b.hashid)];
	deleteObjFromList(this.arbiters, arb);
};


// **** Iteration

/// Call @c func for each body in the space.
/**
 * Call func for each body in the space.
 *
 * @function
 * @memberof	cp.Space
 * @param	{function}	func
 */
Space.prototype.eachBody = function(func)
{
	this.lock(); {
		var bodies = this.bodies;
		
		for(var i=0; i<bodies.length; i++){
			func(bodies[i]);
		}
		
		var components = this.sleepingComponents;
		for(var i=0; i<components.length; i++){
			var root = components[i];
			
			var body = root;
			while(body){
				var next = body.nodeNext;
				func(body);
				body = next;
			}
		}
	} this.unlock(true);
};

/// Call @c func for each shape in the space.
/**
 * Call func for each shape in the space.
 *
 * @function
 * @memberof	cp.Space
 * @param	{function}	func
 */
Space.prototype.eachShape = function(func)
{
	this.lock(); {
		this.activeShapes.each(func);
		this.staticShapes.each(func);
	} this.unlock(true);
};

/// Call @c func for each shape in the space.
/**
 * Call func for each shape in the space.
 *
 * @function
 * @memberof	cp.Space
 * @param	{function}	func
 */
Space.prototype.eachConstraint = function(func)
{
	this.lock(); {
		var constraints = this.constraints;
		
		for(var i=0; i<constraints.length; i++){
			func(constraints[i]);
		}
	} this.unlock(true);
};

// **** Spatial Index Management

/// Update the collision detection info for the static shapes in the space.
/**
 * Update the collision detection info for the static shapes in the space.
 *
 * @function
 * @memberof	cp.Space
 */
Space.prototype.reindexStatic = function()
{
	assert(!this.locked, "You cannot manually reindex objects while the space is locked. Wait until the current query or step is complete.");
	
	this.staticShapes.each(function(shape){
		var body = shape.body;
		shape.update(body.p, body.rot);
	});
	this.staticShapes.reindex();
};

/// Update the collision detection data for a specific shape in the space.
/**
 * Update the collision detection data for a specific shape in the space.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Shape}	shape
 */
Space.prototype.reindexShape = function(shape)
{
	assert(!this.locked, "You cannot manually reindex objects while the space is locked. Wait until the current query or step is complete.");
	
	var body = shape.body;
	shape.update(body.p, body.rot);
	
	// attempt to rehash the shape in both hashes
	this.activeShapes.reindexObject(shape, shape.hashid);
	this.staticShapes.reindexObject(shape, shape.hashid);
};

/// Update the collision detection data for all shapes attached to a body.
/**
 * Update the collision detection data for all shapes attached to a body.
 *
 * @function
 * @memberof	cp.Space
 * @param	{cp.Body}	body
 */
Space.prototype.reindexShapesForBody = function(body)
{
	for(var shape = body.shapeList; shape; shape = shape.next){
		this.reindexShape(shape);
	}
};

/// Switch the space to use a spatial has as it's spatial index.
/**
 * Switch the space to use a spatial has as it's spatial index.
 *
 * @function
 * @memberof	cp.Space
 * @param	{}	dim
 * @param	{}	count
 */
Space.prototype.useSpatialHash = function(dim, count)
{
	throw new Error('Spatial Hash not implemented.');
	
	var staticShapes = new SpaceHash(dim, count, null);
	var activeShapes = new SpaceHash(dim, count, staticShapes);
	
	this.staticShapes.each(function(shape){
		staticShapes.insert(shape, shape.hashid);
	});
	this.activeShapes.each(function(shape){
		activeShapes.insert(shape, shape.hashid);
	});
		
	this.staticShapes = staticShapes;
	this.activeShapes = activeShapes;
};

