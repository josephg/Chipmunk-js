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

/// Chipmunk's axis-aligned 2D bounding box type along with a few handy routines.

var numBB = 0;

// Bounding boxes are JS objects with {l, b, r, t} = left, bottom, right, top, respectively.
/**
 * Bounding boxes are JS objects with {l, b, r, t} = left, bottom, right, top, respectively.
 *
 * @class
 * @memberof	cp
 * @param	{number}	l	Left.
 * @param	{number}	b	Bottom.
 * @param	{number}	r	Right.
 * @param	{number}	t	Top.
 */
var BB = cp.BB = function(l, b, r, t)
{
	this.l = l;
	this.b = b;
	this.r = r;
	this.t = t;

	numBB++;
};

/**
 * @function
 * @memberof	cp
 * @param	{number}	l	Left.
 * @param	{number}	b	Bottom.
 * @param	{number}	r	Right.
 * @param	{number}	t	Top.
 * @return	{cp.BB}
 */
cp.bb = function(l, b, r, t) { return new BB(l, b, r, t); };

/**
 * Constructs a cpBB for a circle with the given position and radius.
 *
 * @function
 * @param	{cp.Vect}	p	Target position.
 * @param	{number}	r	Redius.
 * @return	{cp.BB}
 */
var bbNewForCircle = function(p, r)
{
	return new BB(
			p.x - r,
			p.y - r,
			p.x + r,
			p.y + r
		);
};

/// Returns true if @c a and @c b intersect.
/**
 * Returns true if a and b intersect.
 *
 * @function
 * @param	{cp.BB}		a	Bounding box A.
 * @param	{cp.BB}		b	Bounding box B.
 * @return	{boolean}
 */
var bbIntersects = function(a, b)
{
	return (a.l <= b.r && b.l <= a.r && a.b <= b.t && b.b <= a.t);
};

/**
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @param	{number}	l	Left.
 * @param	{number}	b	Bottom.
 * @param	{number}	r	Right.
 * @param	{number}	t	Top.
 * @return	{boolean}
 */
var bbIntersects2 = function(bb, l, b, r, t)
{
	return (bb.l <= r && l <= bb.r && bb.b <= t && b <= bb.t);
};

/// Returns true if @c other lies completely within @c bb.
/**
 * Returns true if other lies completely within bb.
 *
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @param	{cp.BB}		other	Another bounding box.
 * @return	{boolean}
 */
var bbContainsBB = function(bb, other)
{
	return (bb.l <= other.l && bb.r >= other.r && bb.b <= other.b && bb.t >= other.t);
};

/// Returns true if @c bb contains @c v.
/**
 * Returns true if bb contains v.
 *
 * @function
 * @param	{cp.BB}		a	Source bounding box.
 * @param	{cp.Vect}	b	Target point.
 * @return	{boolean}
 */
var bbContainsVect = function(bb, v)
{
	return (bb.l <= v.x && bb.r >= v.x && bb.b <= v.y && bb.t >= v.y);
};

/**
 * Returns true if bounding box in l, b, r, t contains v.
 *
 * @function
 * @param	{number}	l	Left.
 * @param	{number}	b	Bottom.
 * @param	{number}	r	Right.
 * @param	{number}	t	Top.
 * @param	{cp.Vect}	v	Target point.
 * @return	{boolean}
 */
var bbContainsVect2 = function(l, b, r, t, v)
{
	return (l <= v.x && r >= v.x && b <= v.y && t >= v.y);
};

/// Returns a bounding box that holds both bounding boxes.
/**
 * Returns a bounding box that holds both bounding boxes.
 *
 * @function
 * @param	{cp.BB}	a	Bounding box A.
 * @param	{cp.BB}	b	Bounding box B.
 * @return	{cp.BB}		New bounding box which holds box A and B.
 */
var bbMerge = function(a, b){
	return new BB(
			min(a.l, b.l),
			min(a.b, b.b),
			max(a.r, b.r),
			max(a.t, b.t)
		);
};

/// Returns a bounding box that holds both @c bb and @c v.
/**
 * Returns a bounding box that holds both bb and v.
 *
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @param	{cp.Vect}	v	Point.
 * @return	{cp.BB}			New bounding box which holds box bb and point v.
 */
var bbExpand = function(bb, v){
	return new BB(
			min(bb.l, v.x),
			min(bb.b, v.y),
			max(bb.r, v.x),
			max(bb.t, v.y)
		);
};

/// Returns the area of the bounding box.
/**
 * Returns the area of the bounding box.
 *
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @return	{number}		Area of bounding box.
 */
var bbArea = function(bb)
{
	return (bb.r - bb.l)*(bb.t - bb.b);
};

/// Merges @c a and @c b and returns the area of the merged bounding box.
/**
 * Merges a and b and returns the area of the merged bounding box.
 *
 * @function
 * @param	{cp.BB}		a	Bounding box A.
 * @param	{cp.BB}		b	Bounding box B.
 * @return	{number}		Area of merged bounding box (box A and B).
 */
var bbMergedArea = function(a, b)
{
	return (max(a.r, b.r) - min(a.l, b.l))*(max(a.t, b.t) - min(a.b, b.b));
};

/**
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @param	{number}	l	Left.
 * @param	{number}	b	Bottom.
 * @param	{number}	r	Right.
 * @param	{number}	t	Top.
 * @return	{number}		Area of merged bounding box.
 */
var bbMergedArea2 = function(bb, l, b, r, t)
{
	return (max(bb.r, r) - min(bb.l, l))*(max(bb.t, t) - min(bb.b, b));
};

/// Return true if the bounding box intersects the line segment with ends @c a and @c b.
/**
 * Return true if the bounding box intersects the line segment with ends a and b.
 *
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @param	{cp.Vect}	a	One endpoint of the segment.
 * @param	{cp.Vect}	b	Another endpoint of the segment.
 * @return	{boolean}
 */
var bbIntersectsSegment = function(bb, a, b)
{
	return (bbSegmentQuery(bb, a, b) != Infinity);
};

/// Clamp a vector to a bounding box.
/**
 * Clamp a vector to a bounding box.
 *
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @param	{cp.Vect}	v	
 * @return	{cp.Vect}
 */
var bbClampVect = function(bb, v)
{
	var x = min(max(bb.l, v.x), bb.r);
	var y = min(max(bb.b, v.y), bb.t);
	return new Vect(x, y);
};

// TODO edge case issue
/// Wrap a vector to a bounding box.
/**
 * Wrap a vector to a bounding box.
 * @TODO edge case issue
 *
 * @function
 * @param	{cp.BB}		bb	Bounding box.
 * @param	{cp.Vect}	v
 * @return	{cp.Vect}
 */
var bbWrapVect = function(bb, v)
{
	var ix = Math.abs(bb.r - bb.l);
	var modx = (v.x - bb.l) % ix;
	var x = (modx > 0) ? modx : modx + ix;
	
	var iy = Math.abs(bb.t - bb.b);
	var mody = (v.y - bb.b) % iy;
	var y = (mody > 0) ? mody : mody + iy;
	
	return new Vect(x + bb.l, y + bb.b);
};
