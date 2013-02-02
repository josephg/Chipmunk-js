/* Copyright (c) 2009 Scott Lembcke
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

// This file implements a modified AABB tree for collision detection.

var BBTree = cp.BBTree = function(staticIndex)
{
	SpatialIndex.call(this, staticIndex);
	
	this.velocityFunc = null;

	// This is a hash from object ID -> object for the objects stored in the BBTree.
	this.leaves = {};
	// A count of the number of leaves in the BBTree.
	this.count = 0;

	this.root = null;
	
	// A linked list containing an object pool of tree nodes and pairs.
	this.pooledNodes = null;
	this.pooledPairs = null;
	
	this.stamp = 0;
};

BBTree.prototype = Object.create(SpatialIndex.prototype);

var numNodes = 0;

var Node = function(tree, a, b)
{
	this.obj = null;
	this.bb_l = min(a.bb_l, b.bb_l);
	this.bb_b = min(a.bb_b, b.bb_b);
	this.bb_r = max(a.bb_r, b.bb_r);
	this.bb_t = max(a.bb_t, b.bb_t);
	this.parent = null;
	
	this.setA(a);
	this.setB(b);
};

BBTree.prototype.makeNode = function(a, b)
{
	var node = this.pooledNodes;
	if(node){
		this.pooledNodes = node.parent;
		node.constructor(this, a, b);
		return node;
	} else {
		numNodes++;
		return new Node(this, a, b);
	}
};

var numLeaves = 0;
var Leaf = function(tree, obj)
{
	this.obj = obj;
	tree.getBB(obj, this);

	this.parent = null;

	this.stamp = 1;
	this.pairs = null;
	numLeaves++;
};

// **** Misc Functions

BBTree.prototype.getBB = function(obj, dest)
{
	var velocityFunc = this.velocityFunc;
	if(velocityFunc){
		var coef = 0.1;
		var x = (obj.bb_r - obj.bb_l)*coef;
		var y = (obj.bb_t - obj.bb_b)*coef;
		
		var v = vmult(velocityFunc(obj), 0.1);

		dest.bb_l = obj.bb_l + min(-x, v.x);
		dest.bb_b = obj.bb_b + min(-y, v.y);
		dest.bb_r = obj.bb_r + max( x, v.x);
		dest.bb_t = obj.bb_t + max( y, v.y);
	} else {
		dest.bb_l = obj.bb_l;
		dest.bb_b = obj.bb_b;
		dest.bb_r = obj.bb_r;
		dest.bb_t = obj.bb_t;
	}
};

BBTree.prototype.getStamp = function()
{
	var dynamic = this.dynamicIndex;
	return (dynamic && dynamic.stamp ? dynamic.stamp : this.stamp);
};

BBTree.prototype.incrementStamp = function()
{
	if(this.dynamicIndex && this.dynamicIndex.stamp){
		this.dynamicIndex.stamp++;
	} else {
		this.stamp++;
	}
}

// **** Pair/Thread Functions

var numPairs = 0;
// Objects created with constructors are faster than object literals. :(
var Pair = function(leafA, nextA, leafB, nextB)
{
	this.prevA = null;
	this.leafA = leafA;
	this.nextA = nextA;

	this.prevB = null;
	this.leafB = leafB;
	this.nextB = nextB;
};

BBTree.prototype.makePair = function(leafA, nextA, leafB, nextB)
{
	//return new Pair(leafA, nextA, leafB, nextB);
	var pair = this.pooledPairs;
	if (pair)
	{
		this.pooledPairs = pair.prevA;

		pair.prevA = null;
		pair.leafA = leafA;
		pair.nextA = nextA;

		pair.prevB = null;
		pair.leafB = leafB;
		pair.nextB = nextB;

		//pair.constructor(leafA, nextA, leafB, nextB);
		return pair;
	} else {
		numPairs++;
		return new Pair(leafA, nextA, leafB, nextB);
	}
};

Pair.prototype.recycle = function(tree)
{
	this.prevA = tree.pooledPairs;
	tree.pooledPairs = this;
};

var unlinkThread = function(prev, leaf, next)
{
	if(next){
		if(next.leafA === leaf) next.prevA = prev; else next.prevB = prev;
	}
	
	if(prev){
		if(prev.leafA === leaf) prev.nextA = next; else prev.nextB = next;
	} else {
		leaf.pairs = next;
	}
};

Leaf.prototype.clearPairs = function(tree)
{
	var pair = this.pairs,
		next;

	this.pairs = null;
	
	while(pair){
		if(pair.leafA === this){
			next = pair.nextA;
			unlinkThread(pair.prevB, pair.leafB, pair.nextB);
		} else {
			next = pair.nextB;
			unlinkThread(pair.prevA, pair.leafA, pair.nextA);
		}
		pair.recycle(tree);
		pair = next;
	}
};

var pairInsert = function(a, b, tree)
{
	var nextA = a.pairs, nextB = b.pairs;
	var pair = tree.makePair(a, nextA, b, nextB);
	a.pairs = b.pairs = pair;

	if(nextA){
		if(nextA.leafA === a) nextA.prevA = pair; else nextA.prevB = pair;
	}
	
	if(nextB){
		if(nextB.leafA === b) nextB.prevA = pair; else nextB.prevB = pair;
	}
};

// **** Node Functions

Node.prototype.recycle = function(tree)
{
	this.parent = tree.pooledNodes;
	tree.pooledNodes = this;
};

Leaf.prototype.recycle = function(tree)
{
	// Its not worth the overhead to recycle leaves.
};

Node.prototype.setA = function(value)
{
	this.A = value;
	value.parent = this;
};

Node.prototype.setB = function(value)
{
	this.B = value;
	value.parent = this;
};

Leaf.prototype.isLeaf = true;
Node.prototype.isLeaf = false;

Node.prototype.otherChild = function(child)
{
	return (this.A == child ? this.B : this.A);
};

Node.prototype.replaceChild = function(child, value, tree)
{
	assertSoft(child == this.A || child == this.B, "Node is not a child of parent.");
	
	if(this.A == child){
		this.A.recycle(tree);
		this.setA(value);
	} else {
		this.B.recycle(tree);
		this.setB(value);
	}
	
	for(var node=this; node; node = node.parent){
		//node.bb = bbMerge(node.A.bb, node.B.bb);
		var a = node.A;
		var b = node.B;
		node.bb_l = min(a.bb_l, b.bb_l);
		node.bb_b = min(a.bb_b, b.bb_b);
		node.bb_r = max(a.bb_r, b.bb_r);
		node.bb_t = max(a.bb_t, b.bb_t);
	}
};

Node.prototype.bbArea = Leaf.prototype.bbArea = function()
{
	return (this.bb_r - this.bb_l)*(this.bb_t - this.bb_b);
};

var bbTreeMergedArea = function(a, b)
{
	return (max(a.bb_r, b.bb_r) - min(a.bb_l, b.bb_l))*(max(a.bb_t, b.bb_t) - min(a.bb_b, b.bb_b));
};

// **** Subtree Functions

// Would it be better to make these functions instance methods on Node and Leaf?

var bbProximity = function(a, b)
{
	return Math.abs(a.bb_l + a.bb_r - b.bb_l - b.bb_r) + Math.abs(a.bb_b + a.bb_t - b.bb_b - b.bb_t);
};

var subtreeInsert = function(subtree, leaf, tree)
{
//	var s = new Error().stack;
//	traces[s] = traces[s] ? traces[s]+1 : 1;

	if(subtree == null){
		return leaf;
	} else if(subtree.isLeaf){
		return tree.makeNode(leaf, subtree);
	} else {
		var cost_a = subtree.B.bbArea() + bbTreeMergedArea(subtree.A, leaf);
		var cost_b = subtree.A.bbArea() + bbTreeMergedArea(subtree.B, leaf);
		
		if(cost_a === cost_b){
			cost_a = bbProximity(subtree.A, leaf);
			cost_b = bbProximity(subtree.B, leaf);
		}	

		if(cost_b < cost_a){
			subtree.setB(subtreeInsert(subtree.B, leaf, tree));
		} else {
			subtree.setA(subtreeInsert(subtree.A, leaf, tree));
		}
		
//		subtree.bb = bbMerge(subtree.bb, leaf.bb);
		subtree.bb_l = min(subtree.bb_l, leaf.bb_l);
		subtree.bb_b = min(subtree.bb_b, leaf.bb_b);
		subtree.bb_r = max(subtree.bb_r, leaf.bb_r);
		subtree.bb_t = max(subtree.bb_t, leaf.bb_t);

		return subtree;
	}
};

Node.prototype.intersectsBB = Leaf.prototype.intersectsBB = function(bb)
{
	return (this.bb_l <= bb.r && bb.l <= this.bb_r && this.bb_b <= bb.t && bb.b <= this.bb_t);
};

var subtreeQuery = function(subtree, bb, func)
{
	//if(bbIntersectsBB(subtree.bb, bb)){
	if(subtree.intersectsBB(bb)){
		if(subtree.isLeaf){
			func(subtree.obj);
		} else {
			subtreeQuery(subtree.A, bb, func);
			subtreeQuery(subtree.B, bb, func);
		}
	}
};

/// Returns the fraction along the segment query the node hits. Returns Infinity if it doesn't hit.
var nodeSegmentQuery = function(node, a, b)
{
	var idx = 1/(b.x - a.x);
	var tx1 = (node.bb_l == a.x ? -Infinity : (node.bb_l - a.x)*idx);
	var tx2 = (node.bb_r == a.x ?  Infinity : (node.bb_r - a.x)*idx);
	var txmin = min(tx1, tx2);
	var txmax = max(tx1, tx2);
	
	var idy = 1/(b.y - a.y);
	var ty1 = (node.bb_b == a.y ? -Infinity : (node.bb_b - a.y)*idy);
	var ty2 = (node.bb_t == a.y ?  Infinity : (node.bb_t - a.y)*idy);
	var tymin = min(ty1, ty2);
	var tymax = max(ty1, ty2);
	
	if(tymin <= txmax && txmin <= tymax){
		var min_ = max(txmin, tymin);
		var max_ = min(txmax, tymax);
		
		if(0.0 <= max_ && min_ <= 1.0) return max(min_, 0.0);
	}
	
	return Infinity;
};

var subtreeSegmentQuery = function(subtree, a, b, t_exit, func)
{
	if(subtree.isLeaf){
		return func(subtree.obj);
	} else {
		var t_a = nodeSegmentQuery(subtree.A, a, b);
		var t_b = nodeSegmentQuery(subtree.B, a, b);
		
		if(t_a < t_b){
			if(t_a < t_exit) t_exit = min(t_exit, subtreeSegmentQuery(subtree.A, a, b, t_exit, func));
			if(t_b < t_exit) t_exit = min(t_exit, subtreeSegmentQuery(subtree.B, a, b, t_exit, func));
		} else {
			if(t_b < t_exit) t_exit = min(t_exit, subtreeSegmentQuery(subtree.B, a, b, t_exit, func));
			if(t_a < t_exit) t_exit = min(t_exit, subtreeSegmentQuery(subtree.A, a, b, t_exit, func));
		}
		
		return t_exit;
	}
};

BBTree.prototype.subtreeRecycle = function(node)
{
	if(node.isLeaf){
		this.subtreeRecycle(node.A);
		this.subtreeRecycle(node.B);
		node.recycle(this);
	}
};

var subtreeRemove = function(subtree, leaf, tree)
{
	if(leaf == subtree){
		return null;
	} else {
		var parent = leaf.parent;
		if(parent == subtree){
			var other = subtree.otherChild(leaf);
			other.parent = subtree.parent;
			subtree.recycle(tree);
			return other;
		} else {
			parent.parent.replaceChild(parent, parent.otherChild(leaf), tree);
			return subtree;
		}
	}
};

// **** Marking Functions

/*
typedef struct MarkContext {
	bbTree *tree;
	Node *staticRoot;
	cpSpatialIndexQueryFunc func;
} MarkContext;
*/

var bbTreeIntersectsNode = function(a, b)
{
	return (a.bb_l <= b.bb_r && b.bb_l <= a.bb_r && a.bb_b <= b.bb_t && b.bb_b <= a.bb_t);
};

Leaf.prototype.markLeafQuery = function(leaf, left, tree, func)
{
	if(bbTreeIntersectsNode(leaf, this)){
    if(left){
      pairInsert(leaf, this, tree);
    } else {
      if(this.stamp < leaf.stamp) pairInsert(this, leaf, tree);
      if(func) func(leaf.obj, this.obj);
    }
  }
};

Node.prototype.markLeafQuery = function(leaf, left, tree, func)
{
	if(bbTreeIntersectsNode(leaf, this)){
    this.A.markLeafQuery(leaf, left, tree, func);
    this.B.markLeafQuery(leaf, left, tree, func);
	}
};

Leaf.prototype.markSubtree = function(tree, staticRoot, func)
{
	if(this.stamp == tree.getStamp()){
		if(staticRoot) staticRoot.markLeafQuery(this, false, tree, func);
		
		for(var node = this; node.parent; node = node.parent){
			if(node == node.parent.A){
				node.parent.B.markLeafQuery(this, true, tree, func);
			} else {
				node.parent.A.markLeafQuery(this, false, tree, func);
			}
		}
	} else {
		var pair = this.pairs;
		while(pair){
			if(this === pair.leafB){
				if(func) func(pair.leafA.obj, this.obj);
				pair = pair.nextB;
			} else {
				pair = pair.nextA;
			}
		}
	}
};

Node.prototype.markSubtree = function(tree, staticRoot, func)
{
  this.A.markSubtree(tree, staticRoot, func);
  this.B.markSubtree(tree, staticRoot, func);
};

// **** Leaf Functions

Leaf.prototype.containsObj = function(obj)
{
	return (this.bb_l <= obj.bb_l && this.bb_r >= obj.bb_r && this.bb_b <= obj.bb_b && this.bb_t >= obj.bb_t);
};

Leaf.prototype.update = function(tree)
{
	var root = tree.root;
	var obj = this.obj;

	//if(!bbContainsBB(this.bb, bb)){
	if(!this.containsObj(obj)){
		tree.getBB(this.obj, this);
		
		root = subtreeRemove(root, this, tree);
		tree.root = subtreeInsert(root, this, tree);
		
		this.clearPairs(tree);
		this.stamp = tree.getStamp();
		
		return true;
	}
	
	return false;
};

Leaf.prototype.addPairs = function(tree)
{
	var dynamicIndex = tree.dynamicIndex;
	if(dynamicIndex){
		var dynamicRoot = dynamicIndex.root;
		if(dynamicRoot){
			dynamicRoot.markLeafQuery(this, true, dynamicIndex, null);
		}
	} else {
		var staticRoot = tree.staticIndex.root;
		this.markSubtree(tree, staticRoot, null);
	}
};

// **** Insert/Remove

BBTree.prototype.insert = function(obj, hashid)
{
	var leaf = new Leaf(this, obj);

	this.leaves[hashid] = leaf;
	this.root = subtreeInsert(this.root, leaf, this);
	this.count++;
	
	leaf.stamp = this.getStamp();
	leaf.addPairs(this);
	this.incrementStamp();
};

BBTree.prototype.remove = function(obj, hashid)
{
	var leaf = this.leaves[hashid];

	delete this.leaves[hashid];
	this.root = subtreeRemove(this.root, leaf, this);
	this.count--;

	leaf.clearPairs(this);
	leaf.recycle(this);
};

BBTree.prototype.contains = function(obj, hashid)
{
	return this.leaves[hashid] != null;
};

// **** Reindex
var voidQueryFunc = function(obj1, obj2){};

BBTree.prototype.reindexQuery = function(func)
{
	if(!this.root) return;
	
	// LeafUpdate() may modify this.root. Don't cache it.
	var hashid,
		leaves = this.leaves;
	for (hashid in leaves)
	{
		leaves[hashid].update(this);
	}
	
	var staticIndex = this.staticIndex;
	var staticRoot = staticIndex && staticIndex.root;
	
	this.root.markSubtree(this, staticRoot, func);
	if(staticIndex && !staticRoot) this.collideStatic(this, staticIndex, func);
	
	this.incrementStamp();
};

BBTree.prototype.reindex = function()
{
	this.reindexQuery(voidQueryFunc);
};

BBTree.prototype.reindexObject = function(obj, hashid)
{
	var leaf = this.leaves[hashid];
	if(leaf){
		if(leaf.update(this)) leaf.addPairs(this);
		this.incrementStamp();
	}
};

// **** Query

// This has since been removed from upstream Chipmunk - which recommends you just use query() below
// directly.
BBTree.prototype.pointQuery = function(point, func)
{
	this.query(new BB(point.x, point.y, point.x, point.y), func);
};

BBTree.prototype.segmentQuery = function(a, b, t_exit, func)
{
	if(this.root) subtreeSegmentQuery(this.root, a, b, t_exit, func);
};

BBTree.prototype.query = function(bb, func)
{
	if(this.root) subtreeQuery(this.root, bb, func);
};

// **** Misc

BBTree.prototype.count = function()
{
	return this.count;
};

BBTree.prototype.each = function(func)
{
	var hashid;
	for(hashid in this.leaves)
	{
		func(this.leaves[hashid].obj);
	}
};

// **** Tree Optimization

var bbTreeMergedArea2 = function(node, l, b, r, t)
{
	return (max(node.bb_r, r) - min(node.bb_l, l))*(max(node.bb_t, t) - min(node.bb_b, b));
};

var partitionNodes = function(tree, nodes, offset, count)
{
	if(count == 1){
		return nodes[offset];
	} else if(count == 2) {
		return tree.makeNode(nodes[offset], nodes[offset + 1]);
	}
	
	// Find the AABB for these nodes
	//var bb = nodes[offset].bb;
	var node = nodes[offset];
	var bb_l = node.bb_l,
		bb_b = node.bb_b,
		bb_r = node.bb_r,
		bb_t = node.bb_t;

	var end = offset + count;
	for(var i=offset + 1; i<end; i++){
		//bb = bbMerge(bb, nodes[i].bb);
		node = nodes[i];
		bb_l = min(bb_l, node.bb_l);
		bb_b = min(bb_b, node.bb_b);
		bb_r = max(bb_r, node.bb_r);
		bb_t = max(bb_t, node.bb_t);
	}
	
	// Split it on it's longest axis
	var splitWidth = (bb_r - bb_l > bb_t - bb_b);
	
	// Sort the bounds and use the median as the splitting point
	var bounds = new Array(count*2);
	if(splitWidth){
		for(var i=offset; i<end; i++){
			bounds[2*i + 0] = nodes[i].bb_l;
			bounds[2*i + 1] = nodes[i].bb_r;
		}
	} else {
		for(var i=offset; i<end; i++){
			bounds[2*i + 0] = nodes[i].bb_b;
			bounds[2*i + 1] = nodes[i].bb_t;
		}
	}
	
	bounds.sort(function(a, b) {
		// This might run faster if the function was moved out into the global scope.
		return a - b;
	});
	var split = (bounds[count - 1] + bounds[count])*0.5; // use the median as the split

	// Generate the child BBs
	//var a = bb, b = bb;
	var a_l = bb_l, a_b = bb_b, a_r = bb_r, a_t = bb_t;
	var b_l = bb_l, b_b = bb_b, b_r = bb_r, b_t = bb_t;

	if(splitWidth) a_r = b_l = split; else a_t = b_b = split;
	
	// Partition the nodes
	var right = end;
	for(var left=offset; left < right;){
		var node = nodes[left];
//	if(bbMergedArea(node.bb, b) < bbMergedArea(node.bb, a)){
		if(bbTreeMergedArea2(node, b_l, b_b, b_r, b_t) < bbTreeMergedArea2(node, a_l, a_b, a_r, a_t)){
			right--;
			nodes[left] = nodes[right];
			nodes[right] = node;
		} else {
			left++;
		}
	}
	
	if(right == count){
		var node = null;
		for(var i=offset; i<end; i++) node = subtreeInsert(node, nodes[i], tree);
		return node;
	}
	
	// Recurse and build the node!
	return NodeNew(tree,
		partitionNodes(tree, nodes, offset, right - offset),
		partitionNodes(tree, nodes, right, end - right)
	);
};

//static void
//bbTreeOptimizeIncremental(bbTree *tree, int passes)
//{
//	for(int i=0; i<passes; i++){
//		Node *root = tree.root;
//		Node *node = root;
//		int bit = 0;
//		unsigned int path = tree.opath;
//		
//		while(!NodeIsLeaf(node)){
//			node = (path&(1<<bit) ? node.a : node.b);
//			bit = (bit + 1)&(sizeof(unsigned int)*8 - 1);
//		}
//		
//		root = subtreeRemove(root, node, tree);
//		tree.root = subtreeInsert(root, node, tree);
//	}
//}

BBTree.prototype.optimize = function()
{
	var nodes = new Array(this.count);
	var i = 0;

	for (var hashid in this.leaves)
	{
		nodes[i++] = this.nodes[hashid];
	}
	
	tree.subtreeRecycle(root);
	this.root = partitionNodes(tree, nodes, nodes.length);
};

// **** Debug Draw

var nodeRender = function(node, depth)
{
	if(!node.isLeaf && depth <= 10){
		nodeRender(node.A, depth + 1);
		nodeRender(node.B, depth + 1);
	}
	
	var str = '';
	for(var i = 0; i < depth; i++) {
		str += ' ';
	}

	console.log(str + node.bb_b + ' ' + node.bb_t);
};

BBTree.prototype.log = function(){
	if(this.root) nodeRender(this.root, 0);
};

/*
static void
NodeRender(Node *node, int depth)
{
	if(!NodeIsLeaf(node) && depth <= 10){
		NodeRender(node.a, depth + 1);
		NodeRender(node.b, depth + 1);
	}
	
	bb bb = node.bb;
	
//	GLfloat v = depth/2.0f;	
//	glColor3f(1.0f - v, v, 0.0f);
	glLineWidth(max(5.0f - depth, 1.0f));
	glBegin(GL_LINES); {
		glVertex2f(bb.l, bb.b);
		glVertex2f(bb.l, bb.t);
		
		glVertex2f(bb.l, bb.t);
		glVertex2f(bb.r, bb.t);
		
		glVertex2f(bb.r, bb.t);
		glVertex2f(bb.r, bb.b);
		
		glVertex2f(bb.r, bb.b);
		glVertex2f(bb.l, bb.b);
	}; glEnd();
}

void
bbTreeRenderDebug(cpSpatialIndex *index){
	if(index.klass != &klass){
		cpAssertWarn(false, "Ignoring bbTreeRenderDebug() call to non-tree spatial index.");
		return;
	}
	
	bbTree *tree = (bbTree *)index;
	if(tree.root) NodeRender(tree.root, 0);
}
*/
