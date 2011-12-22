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

var BBTree = exports.BBTree = function(bbfunc, staticIndex)
{
  SpatialIndex.call(this, bbfunc, staticIndex);
	
	this.velocityFunc = null;

  // This is a hash from object ID -> object for the objects stored in the BBTree.
	this.leaves = {};
  // A count of the number of leaves in the BBTree.
  this.count = 0;

	this.root = null;
	
  // An object pool of tree nodes and pairs.
	//this.pooledNodes = [];
	//this.pooledPairs = [];
	
	this.stamp = 0;
};

BBTree.prototype = Object.create(SpatialIndex.prototype);

var Node = function(tree, a, b)
{
	//Node *node = NodeFromPool(tree);
	this.obj = null;
	this.bb = bbMerge(a.bb, b.bb);
	this.parent = null;
	
  this.setA(a);
  this.setB(b);
};

var Leaf = function(tree, obj)
{
	//Node *node = NodeFromPool(tree);

	this.obj = obj;
	this.bb = tree.getBB(obj);
  this.parent = null;

  this.stamp = 1;
  this.pairs = null;
};

// **** Misc Functions

BBTree.prototype.getBB = function(obj)
{
	var bb = this.bbfunc(obj);
	
	var velocityFunc = this.velocityFunc;
	if(velocityFunc){
		var coef = 0.1;
		var x = (bb.r - bb.l)*coef;
		var y = (bb.t - bb.b)*coef;
		
		var v = vmult(velocityFunc(obj), 0.1);
		return bbNew(
        bb.l + Math.min(-x, v.x),
        bb.b + Math.min(-y, v.y),
        bb.r + Math.max(x, v.x),
        bb.t + Math.max(y, v.y)
      );
	} else {
		return bb;
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

// Objects created with constructors are faster than object literals. :(
var Pair = function(a, b)
{
  this.a = a; this.b = b;
};

var Thread = function(leaf, next)
{
  this.prev = null;
  this.next = next;
  this.leaf = leaf;
};

// Benchmark this code with object pools on & off.
/*
BBTree.prototype.pairRecycle = function(pair)
{
  this.pooledPairs.push(pair);
};

BBTree.prototype.pairFromPool = function()
{
  return this.pooledPairs.pop() || new Pair(null, null);
};
*/

Thread.prototype.unlink = function()
{
	var next = this.next;
	var prev = this.prev;
	
	if(next){
		if(next.a.leaf == this.leaf) next.a.prev = prev; else next.b.prev = prev;
	}
	
	if(prev){
		if(prev.a.leaf == this.leaf) prev.a.next = next; else prev.b.next = next;
	} else {
		this.leaf.pairs = next;
	}
};

Leaf.prototype.clearPairs = function(tree)
{
	var pair = leaf.pairs,
    next;

	this.pairs = null;
	
	while(pair){
		if(pair.a.leaf == this){
			next = pair.a.next;
			pair.b.unlink();
			//tree.pairRecycle(pair);
			pair = next;
		} else {
			next = pair.b.next;
			pair.a.unlink();
			//tree.pairRecycle(pair);
			pair = next;
		}
	}
}

var pairInsert = function(a, b, tree)
{
	var nextA = a.pairs, nextB = b.pairs;
  var pair = new Pair(new Thread(a, nextA), new Thread(b, nextB));
	a.pairs = b.pairs = pair;

	//var pair = tree.pairFromPool();
	//Pair temp = {{null, a, nextA},{null, b, nextB}};
	//*pair = temp;
	
	if(nextA){
		if(nextA.a.leaf == a) nextA.a.prev = pair; else nextA.b.prev = pair;
	}
	
	if(nextB){
		if(nextB.a.leaf == b) nextB.a.prev = pair; else nextB.b.prev = pair;
	}
};

// **** Node Functions

/*
static void
NodeRecycle(bbTree *tree, Node *node)
{
	node.parent = tree.pooledNodes;
	tree.pooledNodes = node;
}

static Node *
NodeFromPool(bbTree *tree)
{
	Node *node = tree.pooledNodes;
	
	if(node){
		tree.pooledNodes = node.parent;
		return node;
	} else {
		// Pool is exhausted, make more
	}
}*/

Node.prototype.setA = function(value)
{
	this.A = value;
	value.parent = node;
};

Node.prototype.setB = function(value)
{
	this.B = value;
	value.parent = node;
};

/*
static inline cpBool
NodeIsLeaf(Node *node)
{
	return (node.obj != null);
}*/
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
		//NodeRecycle(tree, parent.A);
		this.setA(value);
	} else {
		//NodeRecycle(tree, parent.B);
		this.setB(value);
	}
	
	for(var node=parent; node; node = node.parent){
		node.bb = bbMerge(node.A.bb, node.B.bb);
	}
};

// **** Subtree Functions

// Would it be better to make these functions instance methods on Node and Leaf?

var bbProximity = function(a, b)
{
  return fabs(a.l + a.r - b.l - b.r) + fabs(a.b + b.t - b.b - b.t);
}

var subtreeInsert = function(subtree, leaf, tree)
{
	if(subtree == null){
		return leaf;
	} else if(subtree.isLeaf){
		return new Node(tree, leaf, subtree);
	} else {
		var cost_a = bbArea(subtree.B.bb) + bbMergedArea(subtree.A.bb, leaf.bb);
		var cost_b = bbArea(subtree.A.bb) + bbMergedArea(subtree.B.bb, leaf.bb);
		
    if(cost_a === cost_b){
      cost_a = bbProximity(subtree.A.bb, leaf.bb);
      cost_b = bbProximity(subtree.B.bb, leaf.bb);
    }	

		if(cost_b < cost_a){
			subtree.setB(subtreeInsert(subtree.B, leaf, tree));
		} else {
			subtree.setA(subtreeInsert(subtree.A, leaf, tree));
		}
		
		subtree.bb = bbMerge(subtree.bb, leaf.bb);
		return subtree;
	}
};

var subtreeQuery = function(subtree, bb, func)
{
	if(bbIntersects(subtree.bb, bb)){
		if(subtree.isLeaf){
			func(subtree.obj);
		} else {
			subtreeQuery(subtree.A, bb, func);
			subtreeQuery(subtree.B, bb, func);
		}
	}
};

var subtreeSegmentQuery = function(subtree, a, b, t_exit, func)
{
	if(subtree.isLeaf){
		return func(subtree.obj);
	} else {
		var t_a = bbSegmentQuery(subtree.A.bb, a, b);
		var t_b = bbSegmentQuery(subtree.B.bb, a, b);
		
		if(t_a < t_b){
			if(t_a < t_exit) t_exit = Math.min(t_exit, subtreeSegmentQuery(subtree.A, a, b, t_exit, func, data));
			if(t_b < t_exit) t_exit = Math.min(t_exit, subtreeSegmentQuery(subtree.B, a, b, t_exit, func, data));
		} else {
			if(t_b < t_exit) t_exit = Math.min(t_exit, subtreeSegmentQuery(subtree.B, a, b, t_exit, func, data));
			if(t_a < t_exit) t_exit = Math.min(t_exit, subtreeSegmentQuery(subtree.A, a, b, t_exit, func, data));
		}
		
		return t_exit;
	}
};

/*
static void
SubtreeRecycle(bbTree *tree, Node *node)
{
	if(!NodeIsLeaf(node)){
		SubtreeRecycle(tree, node.A);
		SubtreeRecycle(tree, node.B);
		NodeRecycle(tree, node);
	}
}*/

var subtreeRemove = function(subtree, leaf, tree)
{
	if(leaf == subtree){
		return null;
	} else {
		var parent = leaf.parent;
		if(parent == subtree){
			var other = subtree.otherChild(leaf);
			other.parent = subtree.parent;
			//NodeRecycle(tree, subtree);
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

var markLeafQuery = function(subtree, leaf, left, tree, func)
{
	if(bbIntersects(leaf.bb, subtree.bb)){
		if(subtree.isLeaf){
			if(left){
				pairInsert(leaf, subtree, tree);
			} else {
				if(subtree.stamp < leaf.stamp) pairInsert(subtree, leaf, tree);
				if(func) func(leaf.obj, subtree.obj);
			}
		} else {
			markLeafQuery(subtree.A, leaf, left, tree, func);
			markLeafQuery(subtree.B, leaf, left, tree, func);
		}
	}
};

var markLeaf = function(leaf, tree, staticRoot, func)
{
	if(leaf.stamp == tree.getStamp()){
		if(staticRoot) markLeafQuery(staticRoot, leaf, false, context);
		
		for(var node = leaf; node.parent; node = node.parent){
			if(node == node.parent.A){
				markLeafQuery(node.parent.B, leaf, true, tree, func);
			} else {
				markLeafQuery(node.parent.A, leaf, false, tree, func);
			}
		}
	} else {
		var pair = leaf.pairs;
		while(pair){
			if(leaf == pair.b.leaf){
        if(func) func(pair.a.leaf.obj, leaf.obj);
				pair = pair.b.next;
			} else {
				pair = pair.a.next;
			}
		}
	}
};

var markSubtree = function(subtree, tree, staticRoot, func)
{
	if(subtree.isLeaf){
		markLeaf(subtree, tree, staticRoot, func);
	} else {
		markSubtree(subtree.A, tree, staticRoot, func);
		markSubtree(subtree.B, tree, staticRoot, func);
	}
};

// **** Leaf Functions

Leaf.prototype.update = function(tree)
{
	var root = tree.root;
	var bb = tree.bbfunc(this.obj);
	
	if(!bbContainsBB(this.bb, bb)){
		this.bb = tree.getBB(this.obj);
		
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
			markLeafQuery(dynamicRoot, this, true, dynamicIndex, null);
		}
	} else {
		var staticRoot = tree.staticIndex.root;
		markLeaf(this, tree, staticRoot, null);
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
	//NodeRecycle(tree, leaf);
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
	
	markSubtree(this.root, this, staticRoot, func);
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

BBTree.prototype.pointQuery = function(point, func)
{
  // The base collision object is the provided point.
	if(this.root) subtreeQuery(this.root, new BB(point.x, point.y, point.x, point.y), func);
};

BBTree.prototype.segmentQuery = function(a, b, t_exit, func)
{
	if(this.root) subtreeSegmentQuery(this, a, b, t_exit, func);
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
    func(this.leaves[hashid]);
  }
};

// **** Tree Optimization

var partitionNodes = function(tree, nodes, offset, count)
{
	if(count == 1){
		return nodes[offset];
	} else if(count == 2) {
		return new Node(tree, nodes[offset], nodes[offset + 1]);
	}
	
	// Find the AABB for these nodes
	var bb = nodes[offset].bb;
  var end = offset + count;
	for(var i=offset + 1; i<end; i++) bb = bbMerge(bb, nodes[i].bb);
	
	// Split it on it's longest axis
	var splitWidth = (bb.r - bb.l > bb.t - bb.b);
	
	// Sort the bounds and use the median as the splitting point
	var bounds = new Array(count*2);
	if(splitWidth){
		for(var i=offset; i<end; i++){
			bounds[2*i + 0] = nodes[i].bb.l;
			bounds[2*i + 1] = nodes[i].bb.r;
		}
	} else {
		for(var i=offset; i<end; i++){
			bounds[2*i + 0] = nodes[i].bb.b;
			bounds[2*i + 1] = nodes[i].bb.t;
		}
	}
	
  bounds.sort(function(a, b) {
    // This might run faster if the function was moved out into the global scope.
    return a - b;
  });
	var split = (bounds[count - 1] + bounds[count])*0.5; // use the median as the split

	// Generate the child BBs
	var a = bb, b = bb;
	if(splitWidth) a.r = b.l = split; else a.t = b.b = split;
	
	// Partition the nodes
	var right = end;
	for(var left=offset; left < right;){
		var node = nodes[left];
		if(bbMergedArea(node.bb, b) < bbMergedArea(node.bb, a)){
//		if(bbProximity(node.bb, b) < bbProximity(node.bb, a)){
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
	
	//SubtreeRecycle(tree, root);
	this.root = partitionNodes(tree, nodes, nodes.length);
};

// **** Debug Draw

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
	glLineWidth(Math.max(5.0f - depth, 1.0f));
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
