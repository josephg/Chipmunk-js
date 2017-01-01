(function(){

  var a_x = {};
  var a_y = {};
  var a_r = {};

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
    space.sleepTimeThreshold = 0.5;

    space.addCollisionHandler(0,0, this.contactBegin.bind(this), null, null, null);


    this.addFloor();
    this.addWalls();

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
//    }; '

    var x = [263,324,568,629,690,233,416,477,142,203,447,569,691,295,356,600];
    var y = [325.660731,434.214308,368.42861600000003,476.98219300000005,85.53576999999996,411.1965010000001,236.85723200000007,345.410809,388.1786940000002,496.7322710000003,430.94657899999993,148.0537330000002,365.160887,299.3751950000001,407.9287720000002,342.1430799999998];
    var r = [325.660731,434.214308,868.428616,976.982193,1085.53577,1411.1965010000001,1736.857232,1845.410809,2388.178694,2496.7322710000003,2930.946579,3148.053733,3365.160887,3799.375195,3907.928772,4342.14308];
    for( var i = 0; i < x.length; i++) {
      this.createTriangleBody(x[i],y[i], 30, r[i]);
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
    if( (shapeA.group | shapeB.group) == (Demo.COLLISIONGROUP_BALL | Demo.COLLISIONGROUP_FLOOR) ) {
      var ball = shapeA.group == Demo.COLLISIONGROUP_BALL ? shapeA : shapeB ;
      this.space.addPostStepCallback(this.postStepRemove.bind(this, this.space, ball))
    }
//
//    if( (shapeA.group | shapeB.group) == (Demo.COLLISIONGROUP_BALL | Demo.COLLISIONGROUP_NONE) ) {
//
//    }


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
    var moment = cp.momentForPoly(Number.MAX_VALUE * 0.01, verts, v(0, 0));
    var body = this.space.addBody(new cp.Body(Number.MAX_VALUE * 0.01, moment));
    body.nodeIdleTime = 0;

    body.setAngle( rotation * Math.PI / 180);
    body.setPos(v(x,y));
    body.velocity_func = this.antiGravityUpdate.bind(this, body);

    var shape = new cp.PolyShape(body, verts, v(0, 0));
    shape.setLayers(GRABABLE_MASK_BIT);
    shape.setFriction(0);
    shape.setElasticity(1);
    this.space.addShape(shape);
    return body;
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
    circle.group = Demo.COLLISIONGROUP_BALL;
  };

  DeterministicTest.prototype.update = function(dt) {
    if( this.dragBody ) {
      this.dragBody.setPos(this.mouse);
    }
    Demo.prototype.update.call(this, dt);


    if( ++itr % 5  == 0 ) {
      this.createCircle(this.width*0.5, this.height);
    }
  };



//  window.DeterministicTest = DeterministicTest;
  addDemo('DeterministicTest', DeterministicTest);

})();

