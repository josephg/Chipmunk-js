(function(){


  var itr = 0;

  var DeterministicTest = function() {
    Demo.call(this);

    /**
     *
     * @type {cp.Space}
     */
    var space = this.space;
    space.iterations = 60;
    space.gravity = v(0, -500);
    space.sleepTimeThreshold = 0.5;
    space.collisionSlop = 0.5;
    space.sleepTimeThreshold = Infinity;

    space.addCollisionHandler(0,0, this.contactBegin.bind(this), null, null, null);


    this.addFloor();
    this.addWalls();

    var width = 50;
    var height = 60;
    var mass = width * height * 1/1000;

    var self = this;
//    this.canvas.onmousedown = function(e) {
//      e.preventDefault();
//      var rightclick = e.which === 3; // or e.button === 2;
//      self.mouse = self.canvas2point(e.clientX, e.clientY);
////      if(!rightclick && !self.mouseJoint) {
//        var point = self.canvas2point(e.clientX, e.clientY);
//        var shape = space.pointQueryFirst(point, GRABABLE_MASK_BIT, cp.NO_GROUP);
//        if(shape){
//          var body = shape.body;
//          self.dragBody = body;
//        }
//    };
//
//    this.canvas.onmousemove = function(e) {
//      e.preventDefault();
//
//      self.mouse = self.canvas2point(e.clientX, e.clientY);
//    };
//    this.canvas.onmouseup = function(e) {
//      e.preventDefault();
//
//      self.dragBody = null;
//    };

    var hSpacing = 108.55357670085505;//;
    for(var i = 0; i <= 40; i++ ) {
      this.createTriangleBody( this.width*0.1 + (i*61) % (this.width*0.8), (i*hSpacing)  % this.height, 30, hSpacing * i );
//      this.createTriangleBody( this.width*0.92 - (i*61) % (this.width*0.86), (i*100)  % this.height - i, 30, i*7 % -360);
    }
    window.mySpace = space;
    this.ctx.strokeStyle = "black";
  };

  DeterministicTest.prototype = Object.create(Demo.prototype);
  DeterministicTest.prototype.postStepRemove = function(space, shape) {
    if( shape.isFlaggedForRemoval ) return;
    shape.isFlaggedForRemoval = true;
    var body = shape.body;
    body.data = null;
    space.removeShape( shape );
    space.removeBody( body );
  };
  DeterministicTest.prototype.contactBegin = function( arbiter, space, userData) {
    var shapeA = arbiter.getA();
    var shapeB = arbiter.getB();

    // ball and floor
    if( (shapeA.group | shapeB.group) == (window.COLLISIONGROUP_BALL | window.COLLISIONGROUP_FLOOR) ) {
      var ball = shapeA.group == window.COLLISIONGROUP_BALL ? shapeA : shapeB ;
      this.space.addPostStepCallback(this.postStepRemove.bind(this, this.space, ball))
    }
    return true;
  };
  DeterministicTest.prototype.createTriangleBody = function(x,y,size,rotation) {
    var w = size * 0.5;
    var verts = [
      -w, -w, // BottomLeft
      0,  w/2, // Top
      w, -w // BottomRight
    ];

    var mass = 1.0;
    var moment = cp.momentForPoly(Number.MAX_VALUE * 0.001, verts, v(0, 0));
    var body = this.space.addBody(new cp.Body(Number.MAX_VALUE * 0.001, moment));
    body.nodeIdleTime = 0;

    body.setAngle( rotation * Math.PI / 180);
    body.setPos(v(x,y));
    body.velocity_func = this.antiGravityUpdate.bind(this, body);

    var shape = new cp.PolyShape(body, verts, v(0, 0));
    shape.setLayers(GRABABLE_MASK_BIT);
    shape.setFriction(0);
    shape.setElasticity(1);
    this.space.addShape(shape);
  };

  DeterministicTest.prototype.antiGravityUpdate = function(body, gravity, damping, dt ) {
//    body.activate();
   // space.activateBody(body);
    cp.Body.prototype.velocity_func.call(body, cp.vzero, damping, dt);
//    debugger;
  };
  DeterministicTest.prototype.createCircle = function(x, y) {
    var radius = 5;
    var mass = 3;
    var body = this.space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, v(0, 0))));
    body.setPos(v(x,y));
    var circle = this.space.addShape(new cp.CircleShape(body, radius, v(0, 0)));
    circle.setElasticity(1);
    circle.setFriction(0);
    circle.group = window.COLLISIONGROUP_BALL;
  };

  DeterministicTest.prototype.update = function(dt) {
    if( this.dragBody ) {
      this.dragBody.setPos(this.mouse);
    }
    Demo.prototype.update.call(this, dt);


    if( ++itr % 3  == 0 ) {
      this.createCircle(this.width*0.5, this.height);
    }
  };



//  window.DeterministicTest = DeterministicTest;
  addDemo('DeterministicTest', DeterministicTest);

})();

