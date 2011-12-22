var cp = require('./cp')
var v = function(x, y) { return new cp.Vect(x, y); }
 
var poly1 = new cp.PolyShape(null, [v(0,0), v(0, 1), v(1, 0)], v(0,0));
poly1.update(v(0,0), v(1,0));

var poly2 = new cp.PolyShape(null, [v(0,0), v(0, 1), v(1, 0)], v(0,0));
poly2.update(v(0.49,0.49), v(1,0));

var circle1 = new cp.CircleShape(null, 1, v(0, 0));
circle1.update(v(0,0), v(1,0));

var circle2 = new cp.CircleShape(null, 1, v(0, 0));
circle2.update(v(1,1), v(1,0));

//console.log(cp.collideShapes(circle2, poly1));
//console.log(cp.collideShapes(poly2, poly1));

var seg = new cp.SegmentShape(null, v(-1, 0), v(1, 0), 0.5);
seg.update(v(0, 1.98), v(1,0));

console.log(cp.collideShapes(poly2, seg));

