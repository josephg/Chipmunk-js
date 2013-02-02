var space;
var bench_list = [];
var add_benchmark = function(name, initfn) {
	var bench = typeof(name) === 'string' ? {name: name} : name;
	bench.init = initfn;
	bench.dt = bench.dt || 1/60;
	bench_list.push(bench);
}

function v(x, y) {
	return new Vect(x, y);
}

var simple_terrain_verts = [
	v(350.00, 425.07), v(336.00, 436.55), v(272.00, 435.39), v(258.00, 427.63), v(225.28, 420.00), v(202.82, 396.00),
	v(191.81, 388.00), v(189.00, 381.89), v(173.00, 380.39), v(162.59, 368.00), v(150.47, 319.00), v(128.00, 311.55),
	v(119.14, 286.00), v(126.84, 263.00), v(120.56, 227.00), v(141.14, 178.00), v(137.52, 162.00), v(146.51, 142.00),
	v(156.23, 136.00), v(158.00, 118.27), v(170.00, 100.77), v(208.43,  84.00), v(224.00,  69.65), v(249.30,  68.00),
	v(257.00,  54.77), v(363.00,  45.94), v(374.15,  54.00), v(386.00,  69.60), v(413.00,  70.73), v(456.00,  84.89),
	v(468.09,  99.00), v(467.09, 123.00), v(464.92, 135.00), v(469.00, 141.03), v(497.00, 148.67), v(513.85, 180.00),
	v(509.56, 223.00), v(523.51, 247.00), v(523.00, 277.00), v(497.79, 311.00), v(478.67, 348.00), v(467.90, 360.00),
	v(456.76, 382.00), v(432.95, 389.00), v(417.00, 411.32), v(373.00, 433.19), v(361.00, 430.02), v(350.00, 425.07)
];

var frand_unit_circle = function(){
	var vv = new Vect(mersenne.rand_real()*2 - 1, mersenne.rand_real()*2 - 1);
	return (vlengthsq(vv) < 1 ? vv : frand_unit_circle());
};

var add_circle = function(i, radius){
	var mass = radius*radius/25;
	var body = space.addBody(new Body(mass, momentForCircle(mass, 0, radius, vzero)));
//	cpBody *body = cpSpaceAddBody(space, cpBodyInit(&bodies[i], mass, cpMomentForCircle(mass, 0, radius, vzero)));
	body.p = vmult(frand_unit_circle(), 180);
	
	
	var shape = space.addShape(new CircleShape(body, radius, vzero));
//	cpShape *shape = cpSpaceAddShape(space, cpCircleShapeInit(&circles[i], body, radius, vzero));
	shape.e = 0; shape.u = 0.9;
};

var add_box = function(i, size){
	var mass = size*size/100;
	var body = space.addBody(new Body(mass, momentForBox(mass, size, size)));
//	cpBody *body = cpSpaceAddBody(space, cpBodyInit(&bodies[i], mass, cpMomentForBox(mass, size, size)));
	body.p = vmult(frand_unit_circle(), 180);
	
	
	var shape = space.addShape(new BoxShape(body, size, size));
	shape.e = 0; shape.u = 0.9;
};

var add_hexagon = function(i, radius){
	var hexagon = new Array(12);
	for(var i=0; i<12; i+=2){
		var angle = -Math.PI*i/6;
		var p = vmult(v(Math.cos(angle), Math.sin(angle)), radius);
		hexagon[i] = p.x;
		hexagon[i+1] = p.y;
	}
	
	var mass = radius*radius;
	var body = space.addBody(new Body(mass, momentForPoly(mass, hexagon, vzero)));
	body.p = vmult(frand_unit_circle(), 180);
	
	var shape = space.addShape(new PolyShape(body, hexagon, vzero));
	shape.e = 0; shape.u = 0.9;
};

var setupSpace_simpleTerrain = function(){
	space = new Space();
	space.iterations = 10;
	space.gravity = v(0, -100);
	space.collisionSlop = 0.5;
	
	var offset = v(-320, -240);
	for(var i=0; i<(simple_terrain_verts.length - 1); i++){
		var a = simple_terrain_verts[i], b = simple_terrain_verts[i+1];
		space.addShape(new SegmentShape(space.staticBody, vadd(a, offset), vadd(b, offset), 0));
	}
};


// SimpleTerrain constant sized objects
var init_SimpleTerrain = function(num, fn){
	return function(){
		setupSpace_simpleTerrain();
		for(var i=0; i<num; i++) fn(i);
		
		return space;
	};
};

add_benchmark({name:'SimpleTerrainCircles 1000', ticks:100}, init_SimpleTerrain(1000, function(i) { add_circle(i, 5); }));
add_benchmark('SimpleTerrainCircles 500', init_SimpleTerrain(500, function(i) { add_circle(i, 5); }));
add_benchmark({name:'SimpleTerrainCircles 100', ticks:1000}, init_SimpleTerrain(100, function(i) { add_circle(i, 5); }));

add_benchmark({name:'SimpleTerrainBoxes 1000', ticks:50}, init_SimpleTerrain(1000, function(i) { add_box(i, 10); }));
add_benchmark('SimpleTerrainBoxes 500', init_SimpleTerrain(500, function(i) { add_box(i, 10); }));
add_benchmark({name:'SimpleTerrainBoxes 100', ticks:1000}, init_SimpleTerrain(100, function(i) { add_box(i, 10); }));

add_benchmark({name:'SimpleTerrainHexagons 1000', ticks:100}, init_SimpleTerrain(1000, function(i) { add_hexagon(i, 5); }));
add_benchmark('SimpleTerrainHexagons 500', init_SimpleTerrain(500, function(i) { add_hexagon(i, 5); }));
add_benchmark({name:'SimpleTerrainHexagons 100', ticks:1000}, init_SimpleTerrain(100, function(i) { add_hexagon(i, 5); }));


// SimpleTerrain variable sized objects
var rand_size = function(){
	return Math.pow(1.5, lerp(-1.5, 3.5, mersenne.rand_real()));
};

add_benchmark({name:'SimpleTerrainVCircles 200', ticks:500}, function(){
	setupSpace_simpleTerrain();
	for(var i=0; i<200; i++) add_circle(i, 5*rand_size());
	
	return space;
});

add_benchmark({name:'SimpleTerrainVBoxes 200', ticks:500}, function(){
	setupSpace_simpleTerrain();
	for(var i=0; i<200; i++) add_box(i, 8*rand_size());
	
	return space;
});

add_benchmark({name:'SimpleTerrainVHexagons 200', ticks:500}, function(){
	setupSpace_simpleTerrain();
	for(var i=0; i<200; i++) add_hexagon(i, 5*rand_size());
	
	return space;
});


// ComplexTerrain
var complex_terrain_verts = [
	v( 46.78, 479.00), v( 35.00, 475.63), v( 27.52, 469.00), v( 23.52, 455.00), v( 23.78, 441.00), v( 28.41, 428.00), v( 49.61, 394.00), v( 59.00, 381.56), v( 80.00, 366.03), v( 81.46, 358.00), v( 86.31, 350.00), v( 77.74, 320.00),
	v( 70.26, 278.00), v( 67.51, 270.00), v( 58.86, 260.00), v( 57.19, 247.00), v( 38.00, 235.60), v( 25.76, 221.00), v( 24.58, 209.00), v( 27.63, 202.00), v( 31.28, 198.00), v( 40.00, 193.72), v( 48.00, 193.73), v( 55.00, 196.70),
	v( 62.10, 204.00), v( 71.00, 209.04), v( 79.00, 206.55), v( 88.00, 206.81), v( 95.88, 211.00), v(103.00, 220.49), v(131.00, 220.51), v(137.00, 222.66), v(143.08, 228.00), v(146.22, 234.00), v(147.08, 241.00), v(145.45, 248.00),
	v(142.31, 253.00), v(132.00, 259.30), v(115.00, 259.70), v(109.28, 270.00), v(112.91, 296.00), v(119.69, 324.00), v(129.00, 336.26), v(141.00, 337.59), v(153.00, 331.57), v(175.00, 325.74), v(188.00, 325.19), v(235.00, 317.46),
	v(250.00, 317.19), v(255.00, 309.12), v(262.62, 302.00), v(262.21, 295.00), v(248.00, 273.59), v(229.00, 257.93), v(221.00, 255.48), v(215.00, 251.59), v(210.79, 246.00), v(207.47, 234.00), v(203.25, 227.00), v(179.00, 205.90),
	v(148.00, 189.54), v(136.00, 181.45), v(120.00, 180.31), v(110.00, 181.65), v( 95.00, 179.31), v( 63.00, 166.96), v( 50.00, 164.23), v( 31.00, 154.49), v( 19.76, 145.00), v( 15.96, 136.00), v( 16.65, 127.00), v( 20.57, 120.00),
	v( 28.00, 114.63), v( 40.00, 113.67), v( 65.00, 127.22), v( 73.00, 128.69), v( 81.96, 120.00), v( 77.58, 103.00), v( 78.18,  92.00), v( 59.11,  77.00), v( 52.00,  67.29), v( 31.29,  55.00), v( 25.67,  47.00), v( 24.65,  37.00),
	v( 27.82,  29.00), v( 35.00,  22.55), v( 44.00,  20.35), v( 49.00,  20.81), v( 61.00,  25.69), v( 79.00,  37.81), v( 88.00,  49.64), v( 97.00,  56.65), v(109.00,  49.61), v(143.00,  38.96), v(197.00,  37.27), v(215.00,  35.30),
	v(222.00,  36.65), v(228.42,  41.00), v(233.30,  49.00), v(234.14,  57.00), v(231.00,  65.80), v(224.00,  72.38), v(218.00,  74.50), v(197.00,  76.62), v(145.00,  78.81), v(123.00,  87.41), v(117.59,  98.00), v(117.79, 104.00),
	v(119.00, 106.23), v(138.73, 120.00), v(148.00, 129.50), v(158.50, 149.00), v(203.93, 175.00), v(229.00, 196.60), v(238.16, 208.00), v(245.20, 221.00), v(275.45, 245.00), v(289.00, 263.24), v(303.60, 287.00), v(312.00, 291.57),
	v(339.25, 266.00), v(366.33, 226.00), v(363.43, 216.00), v(364.13, 206.00), v(353.00, 196.72), v(324.00, 181.05), v(307.00, 169.63), v(274.93, 156.00), v(256.00, 152.48), v(228.00, 145.13), v(221.09, 142.00), v(214.87, 135.00),
	v(212.67, 127.00), v(213.81, 119.00), v(219.32, 111.00), v(228.00, 106.52), v(236.00, 106.39), v(290.00, 119.40), v(299.33, 114.00), v(300.52, 109.00), v(300.30,  53.00), v(301.46,  47.00), v(305.00,  41.12), v(311.00,  36.37),
	v(317.00,  34.43), v(325.00,  34.81), v(334.90,  41.00), v(339.45,  50.00), v(339.82, 132.00), v(346.09, 139.00), v(350.00, 150.26), v(380.00, 167.38), v(393.00, 166.48), v(407.00, 155.54), v(430.00, 147.30), v(437.78, 135.00),
	v(433.13, 122.00), v(410.23,  78.00), v(401.59,  69.00), v(393.48,  56.00), v(392.80,  44.00), v(395.50,  38.00), v(401.00,  32.49), v(409.00,  29.41), v(420.00,  30.84), v(426.92,  36.00), v(432.32,  44.00), v(439.49,  51.00),
	v(470.13, 108.00), v(475.71, 124.00), v(483.00, 130.11), v(488.00, 139.43), v(529.00, 139.40), v(536.00, 132.52), v(543.73, 129.00), v(540.47, 115.00), v(541.11, 100.00), v(552.18,  68.00), v(553.78,  47.00), v(559.00,  39.76),
	v(567.00,  35.52), v(577.00,  35.45), v(585.00,  39.58), v(591.38,  50.00), v(591.67,  66.00), v(590.31,  79.00), v(579.76, 109.00), v(582.25, 119.00), v(583.66, 136.00), v(586.45, 143.00), v(586.44, 151.00), v(580.42, 168.00),
	v(577.15, 173.00), v(572.00, 177.13), v(564.00, 179.49), v(478.00, 178.81), v(443.00, 184.76), v(427.10, 190.00), v(424.00, 192.11), v(415.94, 209.00), v(408.82, 228.00), v(405.82, 241.00), v(411.00, 250.82), v(415.00, 251.50),
	v(428.00, 248.89), v(469.00, 246.29), v(505.00, 246.49), v(533.00, 243.60), v(541.87, 248.00), v(547.55, 256.00), v(548.48, 267.00), v(544.00, 276.00), v(534.00, 282.24), v(513.00, 285.46), v(468.00, 285.76), v(402.00, 291.70),
	v(392.00, 290.29), v(377.00, 294.46), v(367.00, 294.43), v(356.44, 304.00), v(354.22, 311.00), v(362.00, 321.36), v(390.00, 322.44), v(433.00, 330.16), v(467.00, 332.76), v(508.00, 347.64), v(522.00, 357.67), v(528.00, 354.46),
	v(536.00, 352.96), v(546.06, 336.00), v(553.47, 306.00), v(564.19, 282.00), v(567.84, 268.00), v(578.72, 246.00), v(585.00, 240.97), v(592.00, 238.91), v(600.00, 239.72), v(606.00, 242.82), v(612.36, 251.00), v(613.35, 263.00),
	v(588.75, 324.00), v(583.25, 350.00), v(572.12, 370.00), v(575.45, 378.00), v(575.20, 388.00), v(589.00, 393.81), v(599.20, 404.00), v(607.14, 416.00), v(609.96, 430.00), v(615.45, 441.00), v(613.44, 462.00), v(610.48, 469.00),
	v(603.00, 475.63), v(590.96, 479.00)
];

add_benchmark({name:'ComplexTerrainCircles 1000', ticks:100}, function(){
	space = new Space();
	space.iterations = 10;
	space.gravity = v(0, -100);
	space.collisionSlop = 0.5;
	
	var offset = v(-320, -240);
	for(var i=0; i<(complex_terrain_verts.length - 1); i++){
		var a = complex_terrain_verts[i], b = complex_terrain_verts[i+1];
		space.addShape(new SegmentShape(space.staticBody, vadd(a, offset), vadd(b, offset), 0));
	}
	
	for(var i=0; i<1000; i++){
		var radius = 5;
		var mass = radius*radius;
		var body = space.addBody(new Body(mass, momentForCircle(mass, 0, radius, vzero)));
		body.p = vadd(vmult(frand_unit_circle(), 180), v(0, 300));
		
		var shape = space.addShape(new CircleShape(body, radius, vzero));
		shape.e = 0; shape.u = 0;
	}
	
	return space;
});

add_benchmark({name:'ComplexTerrainHexagons 1000', ticks:50}, function(){
	space = new Space();
	space.iterations = 10;
	space.gravity = v(0, -100);
	space.collisionSlop = 0.5;
	
	var offset = v(-320, -240);
	for(var i=0; i<(complex_terrain_verts.length - 1); i++){
		var a = complex_terrain_verts[i], b = complex_terrain_verts[i+1];
		space.addShape(new SegmentShape(space.staticBody, vadd(a, offset), vadd(b, offset), 0));
	}
	
	var radius = 5;
	var hexagon = new Array(12);
	for(var i=0; i<12; i+=2){
		var angle = -Math.PI*i/6;
		var p = vmult(v(Math.cos(angle), Math.sin(angle)), radius);
		hexagon[i] = p.x;
		hexagon[i+1] = p.y;
	}
	
	for(var i=0; i<1000; i++){
		var mass = radius*radius;
		var body = space.addBody(new Body(mass, momentForPoly(mass, hexagon, vzero)));
		body.p = vadd(vmult(frand_unit_circle(), 180), v(0, 300));
		
		var shape = space.addShape(new PolyShape(body, hexagon, vzero));
		shape.e = 0; shape.u = 0;
	}
	
	return space;
});

// BouncyTerrain
var bouncy_terrain_verts = [
	v(537.18,  23.00), v(520.50,  36.00), v(501.53,  63.00), v(496.14,  76.00), v(498.86,  86.00), v(504.00,  90.51), v(508.00,  91.36), v(508.77,  84.00), v(513.00,  77.73), v(519.00,  74.48), v(530.00,  74.67), v(545.00,  54.65),
	v(554.00,  48.77), v(562.00,  46.39), v(568.00,  45.94), v(568.61,  47.00), v(567.94,  55.00), v(571.27,  64.00), v(572.92,  80.00), v(572.00,  81.39), v(563.00,  79.93), v(556.00,  82.69), v(551.49,  88.00), v(549.00,  95.76),
	v(538.00,  93.40), v(530.00, 102.38), v(523.00, 104.00), v(517.00, 103.02), v(516.22, 109.00), v(518.96, 116.00), v(526.00, 121.15), v(534.00, 116.48), v(543.00, 116.77), v(549.28, 121.00), v(554.00, 130.17), v(564.00, 125.67),
	v(575.60, 129.00), v(573.31, 121.00), v(567.77, 111.00), v(575.00, 106.47), v(578.51, 102.00), v(580.25,  95.00), v(577.98,  87.00), v(582.00,  85.71), v(597.00,  89.46), v(604.80,  95.00), v(609.28, 104.00), v(610.55, 116.00),
	v(609.30, 125.00), v(600.80, 142.00), v(597.31, 155.00), v(584.00, 167.23), v(577.86, 175.00), v(583.52, 184.00), v(582.64, 195.00), v(591.00, 196.56), v(597.81, 201.00), v(607.45, 219.00), v(607.51, 246.00), v(600.00, 275.46),
	v(588.00, 267.81), v(579.00, 264.91), v(557.00, 264.41), v(552.98, 259.00), v(548.00, 246.18), v(558.00, 247.12), v(565.98, 244.00), v(571.10, 237.00), v(571.61, 229.00), v(568.25, 222.00), v(562.00, 217.67), v(544.00, 213.93),
	v(536.73, 214.00), v(535.60, 204.00), v(539.69, 181.00), v(542.84, 171.00), v(550.43, 161.00), v(540.00, 156.27), v(536.62, 152.00), v(534.70, 146.00), v(527.00, 141.88), v(518.59, 152.00), v(514.51, 160.00), v(510.33, 175.00),
	v(519.38, 183.00), v(520.52, 194.00), v(516.00, 201.27), v(505.25, 206.00), v(507.57, 223.00), v(519.90, 260.00), v(529.00, 260.48), v(534.00, 262.94), v(538.38, 268.00), v(540.00, 275.00), v(537.06, 284.00), v(530.00, 289.23),
	v(520.00, 289.23), v(513.00, 284.18), v(509.71, 286.00), v(501.69, 298.00), v(501.56, 305.00), v(504.30, 311.00), v(512.00, 316.43), v(521.00, 316.42), v(525.67, 314.00), v(535.00, 304.98), v(562.00, 294.80), v(573.00, 294.81),
	v(587.52, 304.00), v(600.89, 310.00), v(596.96, 322.00), v(603.28, 327.00), v(606.52, 333.00), v(605.38, 344.00), v(597.65, 352.00), v(606.36, 375.00), v(607.16, 384.00), v(603.40, 393.00), v(597.00, 398.14), v(577.00, 386.15),
	v(564.35, 373.00), v(565.21, 364.00), v(562.81, 350.00), v(553.00, 346.06), v(547.48, 338.00), v(547.48, 330.00), v(550.00, 323.30), v(544.00, 321.53), v(537.00, 322.70), v(532.00, 326.23), v(528.89, 331.00), v(527.83, 338.00),
	v(533.02, 356.00), v(542.00, 360.73), v(546.68, 369.00), v(545.38, 379.00), v(537.58, 386.00), v(537.63, 388.00), v(555.00, 407.47), v(563.00, 413.52), v(572.57, 418.00), v(582.72, 426.00), v(578.00, 431.12), v(563.21, 440.00),
	v(558.00, 449.27), v(549.00, 452.94), v(541.00, 451.38), v(536.73, 448.00), v(533.00, 441.87), v(520.00, 437.96), v(514.00, 429.69), v(490.00, 415.15), v(472.89, 399.00), v(472.03, 398.00), v(474.00, 396.71), v(486.00, 393.61),
	v(492.00, 385.85), v(492.00, 376.15), v(489.04, 371.00), v(485.00, 368.11), v(480.00, 376.27), v(472.00, 379.82), v(463.00, 378.38), v(455.08, 372.00), v(446.00, 377.69), v(439.00, 385.24), v(436.61, 391.00), v(437.52, 404.00),
	v(440.00, 409.53), v(463.53, 433.00), v(473.80, 441.00), v(455.00, 440.30), v(443.00, 436.18), v(436.00, 431.98), v(412.00, 440.92), v(397.00, 442.46), v(393.59, 431.00), v(393.71, 412.00), v(400.00, 395.10), v(407.32, 387.00),
	v(408.54, 380.00), v(407.42, 375.00), v(403.97, 370.00), v(399.00, 366.74), v(393.00, 365.68), v(391.23, 374.00), v(387.00, 380.27), v(381.00, 383.52), v(371.56, 384.00), v(364.98, 401.00), v(362.96, 412.00), v(363.63, 435.00),
	v(345.00, 433.55), v(344.52, 442.00), v(342.06, 447.00), v(337.00, 451.38), v(330.00, 453.00), v(325.00, 452.23), v(318.00, 448.17), v(298.00, 453.70), v(284.00, 451.49), v(278.62, 449.00), v(291.47, 408.00), v(291.77, 398.00),
	v(301.00, 393.83), v(305.00, 393.84), v(305.60, 403.00), v(310.00, 409.47), v(318.00, 413.07), v(325.00, 412.40), v(332.31, 407.00), v(335.07, 400.00), v(334.40, 393.00), v(329.00, 385.69), v(319.00, 382.79), v(301.00, 389.23),
	v(289.00, 389.97), v(265.00, 389.82), v(251.00, 385.85), v(245.00, 389.23), v(239.00, 389.94), v(233.00, 388.38), v(226.00, 382.04), v(206.00, 374.75), v(206.00, 394.00), v(204.27, 402.00), v(197.00, 401.79), v(191.00, 403.49),
	v(186.53, 407.00), v(183.60, 412.00), v(183.60, 422.00), v(189.00, 429.31), v(196.00, 432.07), v(203.00, 431.40), v(209.47, 427.00), v(213.00, 419.72), v(220.00, 420.21), v(227.00, 418.32), v(242.00, 408.41), v(258.98, 409.00),
	v(250.00, 435.43), v(239.00, 438.78), v(223.00, 448.19), v(209.00, 449.70), v(205.28, 456.00), v(199.00, 460.23), v(190.00, 460.52), v(182.73, 456.00), v(178.00, 446.27), v(160.00, 441.42), v(148.35, 435.00), v(149.79, 418.00),
	v(157.72, 401.00), v(161.00, 396.53), v(177.00, 385.00), v(180.14, 380.00), v(181.11, 374.00), v(180.00, 370.52), v(170.00, 371.68), v(162.72, 368.00), v(158.48, 361.00), v(159.56, 349.00), v(154.00, 342.53), v(146.00, 339.85),
	v(136.09, 343.00), v(130.64, 351.00), v(131.74, 362.00), v(140.61, 374.00), v(130.68, 387.00), v(120.75, 409.00), v(118.09, 421.00), v(117.92, 434.00), v(100.00, 432.40), v( 87.00, 427.48), v( 81.59, 423.00), v( 73.64, 409.00),
	v( 72.57, 398.00), v( 74.62, 386.00), v( 78.80, 378.00), v( 88.00, 373.43), v( 92.49, 367.00), v( 93.32, 360.00), v( 91.30, 353.00), v(103.00, 342.67), v(109.00, 343.10), v(116.00, 340.44), v(127.33, 330.00), v(143.00, 327.24),
	v(154.30, 322.00), v(145.00, 318.06), v(139.77, 311.00), v(139.48, 302.00), v(144.95, 293.00), v(143.00, 291.56), v(134.00, 298.21), v(118.00, 300.75), v(109.40, 305.00), v( 94.67, 319.00), v( 88.00, 318.93), v( 81.00, 321.69),
	v( 67.24, 333.00), v( 56.68, 345.00), v( 53.00, 351.40), v( 47.34, 333.00), v( 50.71, 314.00), v( 56.57, 302.00), v( 68.00, 287.96), v( 91.00, 287.24), v(110.00, 282.36), v(133.80, 271.00), v(147.34, 256.00), v(156.47, 251.00),
	v(157.26, 250.00), v(154.18, 242.00), v(154.48, 236.00), v(158.72, 229.00), v(166.71, 224.00), v(170.15, 206.00), v(170.19, 196.00), v(167.24, 188.00), v(160.00, 182.67), v(150.00, 182.66), v(143.60, 187.00), v(139.96, 195.00),
	v(139.50, 207.00), v(136.45, 221.00), v(136.52, 232.00), v(133.28, 238.00), v(129.00, 241.38), v(119.00, 243.07), v(115.00, 246.55), v(101.00, 253.16), v( 86.00, 257.32), v( 63.00, 259.24), v( 57.00, 257.31), v( 50.54, 252.00),
	v( 47.59, 247.00), v( 46.30, 240.00), v( 47.58, 226.00), v( 50.00, 220.57), v( 58.00, 226.41), v( 69.00, 229.17), v( 79.00, 229.08), v( 94.50, 225.00), v(100.21, 231.00), v(107.00, 233.47), v(107.48, 224.00), v(109.94, 219.00),
	v(115.00, 214.62), v(122.57, 212.00), v(116.00, 201.49), v(104.00, 194.57), v( 90.00, 194.04), v( 79.00, 198.21), v( 73.00, 198.87), v( 62.68, 191.00), v( 62.58, 184.00), v( 64.42, 179.00), v( 75.00, 167.70), v( 80.39, 157.00),
	v( 68.79, 140.00), v( 61.67, 126.00), v( 61.47, 117.00), v( 64.43, 109.00), v( 63.10,  96.00), v( 56.48,  82.00), v( 48.00,  73.88), v( 43.81,  66.00), v( 43.81,  56.00), v( 50.11,  46.00), v( 59.00,  41.55), v( 71.00,  42.64),
	v( 78.00,  36.77), v( 83.00,  34.75), v( 99.00,  34.32), v(117.00,  38.92), v(133.00,  55.15), v(142.00,  50.70), v(149.74,  51.00), v(143.55,  68.00), v(153.28,  74.00), v(156.23,  79.00), v(157.00,  84.00), v(156.23,  89.00),
	v(153.28,  94.00), v(144.58,  99.00), v(151.52, 112.00), v(151.51, 124.00), v(150.00, 126.36), v(133.00, 130.25), v(126.71, 125.00), v(122.00, 117.25), v(114.00, 116.23), v(107.73, 112.00), v(104.48, 106.00), v(104.32,  99.00),
	v(106.94,  93.00), v(111.24,  89.00), v(111.60,  85.00), v(107.24,  73.00), v(102.00,  67.57), v( 99.79,  67.00), v( 99.23,  76.00), v( 95.00,  82.27), v( 89.00,  85.52), v( 79.84,  86.00), v( 86.73, 114.00), v( 98.00, 136.73),
	v( 99.00, 137.61), v(109.00, 135.06), v(117.00, 137.94), v(122.52, 146.00), v(122.94, 151.00), v(121.00, 158.58), v(134.00, 160.97), v(153.00, 157.45), v(171.30, 150.00), v(169.06, 142.00), v(169.77, 136.00), v(174.00, 129.73),
	v(181.46, 126.00), v(182.22, 120.00), v(182.20, 111.00), v(180.06, 101.00), v(171.28,  85.00), v(171.75,  80.00), v(182.30,  53.00), v(189.47,  50.00), v(190.62,  38.00), v(194.00,  33.73), v(199.00,  30.77), v(208.00,  30.48),
	v(216.00,  34.94), v(224.00,  31.47), v(240.00,  30.37), v(247.00,  32.51), v(249.77,  35.00), v(234.75,  53.00), v(213.81,  93.00), v(212.08,  99.00), v(213.00, 101.77), v(220.00,  96.77), v(229.00,  96.48), v(236.28, 101.00),
	v(240.00, 107.96), v(245.08, 101.00), v(263.00,  65.32), v(277.47,  48.00), v(284.00,  47.03), v(286.94,  41.00), v(292.00,  36.62), v(298.00,  35.06), v(304.00,  35.77), v(314.00,  43.81), v(342.00,  32.56), v(359.00,  31.32),
	v(365.00,  32.57), v(371.00,  36.38), v(379.53,  48.00), v(379.70,  51.00), v(356.00,  52.19), v(347.00,  54.74), v(344.38,  66.00), v(341.00,  70.27), v(335.00,  73.52), v(324.00,  72.38), v(317.00,  65.75), v(313.00,  67.79),
	v(307.57,  76.00), v(315.00,  78.62), v(319.28,  82.00), v(322.23,  87.00), v(323.00,  94.41), v(334.00,  92.49), v(347.00,  87.47), v(349.62,  80.00), v(353.00,  75.73), v(359.00,  72.48), v(366.00,  72.32), v(372.00,  74.94),
	v(377.00,  81.34), v(382.00,  83.41), v(392.00,  83.40), v(399.00,  79.15), v(404.00,  85.74), v(411.00,  85.06), v(417.00,  86.62), v(423.38,  93.00), v(425.05, 104.00), v(438.00, 110.35), v(450.00, 112.17), v(452.62, 103.00),
	v(456.00,  98.73), v(462.00,  95.48), v(472.00,  95.79), v(471.28,  92.00), v(464.00,  84.62), v(445.00,  80.39), v(436.00,  75.33), v(428.00,  68.46), v(419.00,  68.52), v(413.00,  65.27), v(408.48,  58.00), v(409.87,  46.00),
	v(404.42,  39.00), v(408.00,  33.88), v(415.00,  29.31), v(429.00,  26.45), v(455.00,  28.77), v(470.00,  33.81), v(482.00,  42.16), v(494.00,  46.85), v(499.65,  36.00), v(513.00,  25.95), v(529.00,  22.42), v(537.18,  23.00), 
];

add_benchmark('BouncyTerrainCircles 500', function(){
	space = new Space();
	space.iterations = 10;
	
	var offset = v(-320, -240);
	for(var i=0; i<(bouncy_terrain_verts.length - 1); i++){
		var a = bouncy_terrain_verts[i], b = bouncy_terrain_verts[i+1];
		var shape = space.addShape(new SegmentShape(space.staticBody, vadd(a, offset), vadd(b, offset), 0));
		shape.e = 1;
	}
	
	for(var i=0; i<500; i++){
		var radius = 5;
		var mass = radius*radius;
		var body = space.addBody(new Body(mass, momentForCircle(mass, 0, radius, vzero)));
		body.p = vadd(vmult(frand_unit_circle(), 130), vzero);
		var vv = vmult(frand_unit_circle(), 50);
		body.vx = vv.x; body.vy = vv.y;
		
		var shape = space.addShape(new CircleShape(body, radius, vzero));
		shape.e = 1;
	}
	
	return space;
});

add_benchmark('BouncyTerrainHexagons 500', function(){
	space = new Space();
	space.iterations = 10;
	
	var offset = v(-320, -240);
	for(var i=0; i<(bouncy_terrain_verts.length - 1); i++){
		var a = bouncy_terrain_verts[i], b = bouncy_terrain_verts[i+1];
		var shape = space.addShape(new SegmentShape(space.staticBody, vadd(a, offset), vadd(b, offset), 0));
		shape.e = 1;
	}
	
	var radius = 5;
	var hexagon = new Array(12);
	for(var i=0; i<12; i+=2){
		var angle = -Math.PI*i/6;
		var p = vmult(v(Math.cos(angle), Math.sin(angle)), radius);
		hexagon[i] = p.x;
		hexagon[i+1] = p.y;
	}
	
	for(var i=0; i<500; i++){
		var mass = radius*radius;
		var body = space.addBody(new Body(mass, momentForPoly(mass, hexagon, vzero)));
		body.p = vadd(vmult(frand_unit_circle(), 130), vzero);
		var vv = vmult(frand_unit_circle(), 50);
		body.vx = vv.x; body.vy = vv.y;
		
		var shape = space.addShape(new PolyShape(body, hexagon, vzero));
		shape.e = 1;
	}
	
	return space;
});


// No collisions should happen here. This test is failing for some reason, so its been disabled.
// See https://github.com/josephg/Chipmunk-js/issues/4

/*
var noCollide_begin = function(arb, space){
	throw new Error('Should not get here');
};

add_benchmark({name:'NoCollide', ticks:2000}, function(){
	space = new Space();
	space.iterations = 10;
	
	space.addCollisionHandler(2, 2, noCollide_begin, null, null, null, null);
	
	var radius = 4.5;
	
	space.addShape(new SegmentShape(space.staticBody, v(-330-radius, -250-radius), v( 330+radius, -250-radius), 0)).e = 1;
	space.addShape(new SegmentShape(space.staticBody, v( 330+radius,  250+radius), v( 330+radius, -250-radius), 0)).e = 1;
	space.addShape(new SegmentShape(space.staticBody, v( 330+radius,  250+radius), v(-330-radius,  250+radius), 0)).e = 1;
	space.addShape(new SegmentShape(space.staticBody, v(-330-radius, -250-radius), v(-330-radius,  250+radius), 0)).e = 1;
	
	for(var x=-320; x<=320; x+=20){
		for(var y=-240; y<=240; y+=20){
			space.addShape(new CircleShape(space.staticBody, radius, v(x, y)));
		}
	}
	
	for(var y=10-240; y<=240; y+=40){
		var mass = 7;
		var body = space.addBody(new Body(mass, momentForCircle(mass, 0, radius, vzero)));
		body.p = v(-320, y);
		body.vx = 100;
		
		var shape = space.addShape(new CircleShape(body, radius, vzero));
		shape.e = 1;
		shape.collision_type = 2;
	}
	
	for(var x=30-320; x<=320; x+=40){
		var mass = 7;
		var body = space.addBody(new Body(mass, momentForCircle(mass, 0, radius, vzero)));
		body.p = v(x, -240);
		body.vy = 100;
		
		var shape = space.addShape(new CircleShape(body, radius, vzero));
		shape.e = 1;
		shape.collision_type = 2;
	}
	
	return space;
});
*/

add_benchmark({name:'PyramidTopple', dt:1/180, ticks:400}, function(){
	var WIDTH = 4;
	var HEIGHT = 30;

	space = new Space();
	
	var add_domino = function(pos, flipped)
	{
		var mass = 1;
		var moment = momentForBox(mass, WIDTH, HEIGHT);
		
		var body = space.addBody(new Body(mass, moment));
		body.setPos(pos);

		var shape = (flipped ? new BoxShape(body, HEIGHT, WIDTH) : new BoxShape(body, WIDTH, HEIGHT));
		space.addShape(shape);
		shape.setElasticity(0);
		shape.setFriction(0.6);
	};

	space.iterations = 30;
	space.gravity = v(0, -300);
	space.sleepTimeThreshold = 0.5;
	space.collisionSlop = 0.5;
	
	var floor = space.addShape(new SegmentShape(space.staticBody, v(0, 0), v(640, 0), 0));
	floor.setElasticity(1);
	floor.setFriction(1);
	
	// Add the dominoes.
	var n = 12;
	for(var i=0; i<n; i++){
		for(var j=0; j<(n - i); j++){
			var offset = v(320 + (j - (n - 1 - i)*0.5)*1.5*HEIGHT, (i + 0.5)*(HEIGHT + 2*WIDTH) - WIDTH);
			add_domino(offset, false);
			add_domino(vadd(offset, v(0, (HEIGHT + WIDTH)/2)), true);
			
			if(j === 0){
				add_domino(vadd(offset, v(0.5*(WIDTH - HEIGHT), HEIGHT + WIDTH)), false);
			}
			
			if(j != n - i - 1){
				add_domino(vadd(offset, v(HEIGHT*0.75, (HEIGHT + 3*WIDTH)/2)), true);
			} else {
				add_domino(vadd(offset, v(0.5*(HEIGHT - WIDTH), HEIGHT + WIDTH)), false);
			}
		}
	}

	// Add a circle to knock the dominoes down
	var body = space.addBody(new Body(2, momentForCircle(2, 0, 5, v(0,0))));
	body.setPos(v(65, 100));
	var shape = space.addShape(new CircleShape(body, 5, v(0,0)));
	shape.setElasticity(0);
});

// TODO ideas:
// addition/removal
// Memory usage? (too small to matter?)
// http://forums.tigsource.com/index.php?topic=18077.msg518578#msg518578

var SEED = 123124;

var reset_stats = function() {
	traces = {};
	numVects = 0;
	numContacts = 0;
	numNodes = 0;
	numLeaves = 0;
	numBB = 0;
};

var run_bench = function(bench) {
	var DEFAULT_TICKS = 200;
	mersenne.seed(SEED);

	var ticks = bench.ticks || DEFAULT_TICKS;

	bench.init();

	//reset_stats();

	var start = Date.now();
	for (var s = 0; s < ticks; s++) {
		space.step(bench.dt);
	}
	var end = Date.now();

	return end - start;
};

if(typeof(print) === 'undefined') {
	var print = console.warn;
}

var bench = function(){
	for(var i = 0; i < bench_list.length; i++){
	//var i = bench_list.length - 1; {
		var bench = bench_list[i];

		print(bench.name);

		sample = new Array(9);
		for(var run = 0; run < sample.length; run++) {
			sample[run] = run_bench(bench);
			print("Run " + (run+1) + ": " + sample[run])
		}

		sample.sort();
		bench.time = (sample[3] + sample[4] + sample[5]) / 3;

		print(bench.name + " in " + bench.time + " ms");
		print();
	}


	for(var i = 0; i < bench_list.length; i++){
		var bench = bench_list[i];
		print(bench.time);
	}
};

var profile = function(){
	var time = run_bench(bench_list[bench_list.length - 1]);
	//var time = run_bench(bench_list[7], 1);

	print(time + "ms");
};

bench();
//profile();


print('vects: ' + numVects);
print('contacts: ' + numContacts);
print('node: ' + numNodes);
print('leaf: ' + numLeaves);
print('bb: ' + numBB);
print('pairs: ' + numPairs);
print('applyImpulse: ' + numApplyImpulse);
print('applyContact: ' + numApplyContact);

print(numVects);
print(numContacts);
print(numNodes);
print(numLeaves);
print(numBB);
print(numPairs);
print(numApplyImpulse);
print(numApplyContact);


var tracesArr = [];
for(trace in traces) {
	tracesArr.push(trace);
}
tracesArr.sort(function(a, b){
	return traces[b] - traces[a];
});
for(var i = 0; i < min(10, tracesArr.length); i++){
	var t = tracesArr[i];
	print(traces[t] + ': ' + t);
}
