.PHONY: clean

cp.min.js: cp.js
	uglifyjs $+ > $@

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

constraints = \
		util.js \
		cpConstraint.js


jsfiles = $(addprefix lib/, $(js))
constraintfiles = $(addprefix lib/constraints/, $(constraints))

cp.js: $(jsfiles) cpConstraints.js
	cat $+ > $@

cpConstraints.js: $(constraintfiles)
	cat $(constraintfiles) > $@

clean:
	rm -f cp.js cp.min.js cpConstraints.js
