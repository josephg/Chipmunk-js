# Chipmunk for Javascript!

This is a port of the [Chipmunk Physics](http://chipmunk-physics.net/) library to Javascript!

Check out the sexy [demos](http://dl.dropbox.com/u/2494815/demo/index.html)! (Surprisingly, works best in Safari)

## Caveats

- It is slower than the C version (duh, its in javascript). Specifically, physics simulations using chipmunk-js runs about 3 times slower than the C equivalent.
- I haven't implemented chipmunk's spatial hash, and I have no intention to do so.
- The feature set is lagged a little from the real Chipmunk library. Chipmunk-js currently corresponds to Chipmunk *6.1.1* published in August 2012.

# Usage

The API for Chipmunk-js is almost identical to chipmunk-physics. Except:

- The `cp` prefix has gone
- Most functions are wrapped by their containing objects
- Some functions took an array-and-length. Arrays are now all simply javascript arrays, and the length argument has been removed. Eg:

    ```c
cpMomentForPoly(mass, numVerts, *verts, offset);
    ```

    becomes:

    ```javascript
cp.momentForPoly(mass, verts, offset);
    ```

- Lots of trivial getters and setters have been removed.
- Lists of verticies are described using a flattened JS array of [*x1*,*y1*,*x2*,*y2*,...] instead of an array of objects. Ie, `[0,0, 0,1, 1,1, 1,0]` instead of `[cp.v(0,0), cp.v(0,1), cp.v(1,1), cp.v(1,0)]`.

## On a website

```html
<script src="cp.min.js"></script>

<script>
var space = new cp.Space();
space.addBody(new cp.Body(...))
// ...
</script>
```

If any exceptions are thrown or anything, use `cp.js` instead of cp.min.js and post the stack trace you get to the issue page.

## From nodejs

`npm install chipmunk`

```javascript
cp = require('chipmunk');

var space = new cp.Space();
space.addBody(new cp.Body(...))
// ...
```

# Example

This code creates a new space, sets 10 physics iterations per update (these increase simulation stability). Then it adds a bunch of line segments to the space.

In C, this code looked like:

```C
  cpSpace *space = cpSpaceNew();
  space->iterations = 10;
  
  cpVect offset = cpv(-320, -240);
  for(int i=0; i<(bouncy_terrain_count - 1); i++){
    cpVect a = bouncy_terrain_verts[i], b = bouncy_terrain_verts[i+1];
    cpShape *shape = cpSpaceAddShape(space, cpSegmentShapeNew(cpSpaceGetStaticBody(space), cpvadd(a, offset), cpvadd(b, offset), 0.0f));
    cpShapeSetElasticity(shape, 1.0f);
  }
```

In javascript, the equivalent code is:

```javascript
  var space = new cp.Space();
  space.iterations = 10;
  
  var offset = cp.v(-320, -240);
  for(var i=0; i<(bouncy_terrain_verts.length - 1); i++){
    var a = bouncy_terrain_verts[i], b = bouncy_terrain_verts[i+1];
    var shape = space.addShape(new cp.SegmentShape(space.staticBody, cp.vadd(a, offset), cp.vadd(b, offset), 0));
    shape.setElasticity(1);
  }
```

# License

Like Chipmunk, chipmunk-js is MIT licensed.

```
Copyright (c) 2007 Scott Lembcke and Joseph Gentle

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
