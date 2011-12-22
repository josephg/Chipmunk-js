.PHONY: clean

cp.min.js: cp.js
	uglifyjs cp.js > cp.min.js

js = chipmunk.js \
		 cpVect.js \
		 cpBB.js \
		 cpShape.js \
		 cpPolyShape.js \
		 cpBody.js \
		 cpSpatialIndex.js \
		 cpBBTree.js \
		 cpArbiter.js \
		 cpCollision.js \
		 cpSpace.js \
		 cpSpaceComponent.js \
		 cpSpaceQuery.js \
		 cpSpaceStep.js

cp.js: cpConstraints.js $(js)
	cat $(js) cpConstraints.js > cp.js

cpConstraints.js:
	cat constraints/util.js constraints/cpConstraint.js > cpConstraints.js

clean:
	rm -f cp.js cp.min.js cpConstraints.js
