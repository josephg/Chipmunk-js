.PHONY: clean, all

all: cp.min.js cp.extra.min.js bench.js demos.js

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
		cpConstraint.js \
		cpPinJoint.js \
		cpSlideJoint.js \
		cpPivotJoint.js \
		cpGrooveJoint.js \
		cpDampedSpring.js \
		cpDampedRotarySpring.js \
		cpRotaryLimitJoint.js \
		cpRatchetJoint.js \
		cpGearJoint.js \
		cpSimpleMotor.js 

demos = demo.js \
		ball.js \
		PyramidStack.js \
		PyramidTopple.js

jsfiles = $(addprefix lib/, $(js))
constraintfiles = $(addprefix lib/constraints/, $(constraints))
demofiles = $(addprefix demo/, $(demos))

cp.js: $(jsfiles) $(constraintfiles)
	echo '(function(){' > $@
	cat $+ >> $@
	echo "})();" >> $@

%.min.js: %.js
	uglifyjs $+ -m -c > $@

bench.js: $(jsfiles) $(constraintfiles) benchmark/mersenne.js benchmark/bench.js
	cat $+ > $@

demos.js: $(demofiles)
	cat $+ > $@

clean:
	rm -f cp.js cp.min.js cp.extra.min.js bench.js demos.js
