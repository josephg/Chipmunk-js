// This file contains extra functions not found in normal chipmunk. Include this
// file after you include cp.js.
//
// Particularly, this lets you call draw() on any shape or joint.

// This is the utility code to drive the chipmunk demos. The demos are rendered using
// a single canvas on the page.

(function() {
  var v = cp.v;

  var drawCircle = function(ctx, c, radius) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.stroke();
  };

  var drawLine = function(ctx, a, b) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  var springPoints = [
    v(0.00, 0.0),
    v(0.20, 0.0),
    v(0.25, 0.5),
    v(0.30,-1.0),
    v(0.35, 1.0),
    v(0.40,-1.0),
    v(0.45, 1.0),
    v(0.50,-1.0),
    v(0.55, 1.0),
    v(0.60,-1.0),
    v(0.65, 1.0),
    v(0.70,-1.0),
    v(0.75, 0.5),
    v(0.80, 0.0),
    v(1.00, 0.0)
  ];

  var drawSpring = function(ctx, a, b, width) {
    if (width == null) width = 6;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);

    var delta = v.sub(b, a);
    var len = v.len(delta);
    var rot = v.mult(delta, 1/len);

    for(var i = 1; i < springPoints.length; i++) {

      var p = v.add(a, v.rotate(v(springPoints[i].x * len, springPoints[i].y * width), rot));

      //var p = v.add(a, v.rotate(springPoints[i], delta));
      
      ctx.lineTo(p.x, p.y);
    }

    ctx.stroke();
  };


  // **** Draw methods for Shapes

  cp.PolyShape.prototype.draw = function(ctx)
  {
    ctx.beginPath();

    var verts = this.tVerts;
    var len = verts.length;
    var lastPoint = new cp.Vect(verts[len - 2], verts[len - 1]);
    ctx.moveTo(lastPoint.x, lastPoint.y);

    for(var i = 0; i < len; i+=2){
      var p = new cp.Vect(verts[i], verts[i+1]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.fill();
    ctx.stroke();
  };

  cp.SegmentShape.prototype.draw = function(ctx) {
    var oldLineWidth = ctx.lineWidth;
    ctx.lineWidth = Math.max(1, this.r * 2);
    drawLine(ctx, this.ta, this.tb);
    ctx.lineWidth = oldLineWidth;
  };

  cp.CircleShape.prototype.draw = function(ctx) {
    drawCircle(ctx, this.tc, this.r);

    // And draw a little radian so you can see the circle roll.
    drawLine(ctx, this.tc, cp.v.mult(this.body.rot, this.r).add(this.tc));
  };


  // Draw methods for constraints

  cp.PinJoint.prototype.draw = function(ctx) {
    var a = this.a.local2World(this.anchr1);
    var b = this.b.local2World(this.anchr2);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = "grey";
    drawLine(ctx, a, b);
  };

  cp.SlideJoint.prototype.draw = function(ctx) {
    var a = this.a.local2World(this.anchr1);
    var b = this.b.local2World(this.anchr2);
    var midpoint = v.add(a, v.clamp(v.sub(b, a), this.min));

    ctx.lineWidth = 2;
    ctx.strokeStyle = "grey";
    drawLine(ctx, a, b);
    ctx.strokeStyle = "red";
    drawLine(ctx, a, midpoint);
  };

  cp.PivotJoint.prototype.draw = function(ctx) {
    var a = this.a.local2World(this.anchr1);
    var b = this.b.local2World(this.anchr2);
    ctx.strokeStyle = "grey";
    ctx.fillStyle = "grey";
    drawCircle(ctx, a, 2);
    drawCircle(ctx, b, 2);
  };

  cp.GrooveJoint.prototype.draw = function(ctx) {
    var a = this.a.local2World(this.grv_a);
    var b = this.a.local2World(this.grv_b);
    var c = this.b.local2World(this.anchr2);
    
    ctx.strokeStyle = "grey";
    drawLine(ctx, a, b);
    drawCircle(ctx, c, 3);
  };

  cp.DampedSpring.prototype.draw = function(ctx) {
    var a = this.a.local2World(this.anchr1);
    var b = this.b.local2World(this.anchr2);

    ctx.strokeStyle = "grey";
    drawSpring(ctx, a, b);
  };

  var randColor = function() {
    return Math.floor(Math.random() * 256);
  };

  var styles = [];
  for (var i = 0; i < 100; i++) {
    styles.push("rgb(" + randColor() + ", " + randColor() + ", " + randColor() + ")");
  }

  //styles = ['rgba(255,0,0,0.5)', 'rgba(0,255,0,0.5)', 'rgba(0,0,255,0.5)'];

  cp.Shape.prototype.style = function() {
    var body;
    if (this.sensor) {
      return "rgba(255,255,255,0)";
    } else {
      body = this.body;
      if (body.isSleeping()) {
        return "rgb(50,50,50)";
      } else if (body.nodeIdleTime > this.space.sleepTimeThreshold) {
        return "rgb(170,170,170)";
      } else {
        return styles[this.hashid % styles.length];
      }
    }
  };
})();
