.PHONY: clean, all

all: cp.min.js bench.js demos.js

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

demos = demo.js \
		ball.js \
		PyramidStack.js \
		PyramidTopple.js

jsfiles = $(addprefix lib/, $(js))
constraintfiles = $(addprefix lib/constraints/, $(constraints))
demofiles = $(addprefix demo/, $(demos))

cp.js: $(jsfiles) cpConstraints.js
	echo '(function(){' > $@
	cat $+ >> $@
	echo "})();" >> $@

cpConstraints.js: $(constraintfiles)
	cat $+ > $@

bench.js: $(jsfiles) cpConstraints.js benchmark/mersenne.js benchmark/bench.js
	cat $+ > $@

demos.js: $(demofiles)
	cat $+ > $@

clean:
	rm -f cp.js cp.min.js cpConstraints.js bench.js demos.js
