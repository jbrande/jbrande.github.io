/*
	CFI 3D Orbit Viewer
	Yoni Brande, Fall 2017
	UMD Astronomy
	Three.js r87, jQuery v3.2.1
*/

$(document).ready(function(){
	//console.log("test");

	var WIDTH = 500;//window.innerWidth;
	var HEIGHT = 500;//window.innerHeight;// * 0.8;
	var URL = window.location.origin;
	//console.log(URL);

	var sunGeom;
	var sunMaterial;
	var sunSphere;

	var pointLight;

	var origin = new THREE.Vector3(0, 0, 0);
	var	scene,
		camera,
		renderer,
		raycaster, 
		mouse,
		satellite,
		container;

	var initialRotation, initialMatrix;

	var a, b, q, ecc, nu, mAnom, long_asc_node, arg_of_peri, long_of_peri, incl;
	var offset;

	var scale = 1;//50;

	init();

	function init(){
		//check file functionality
		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
		  // Great success! All the File APIs are supported.
		} else {
		  alert('The File APIs are not fully supported in this browser.');
		}

		// create scene
		scene = new THREE.Scene();

		//set up renderer and orbit view
		renderer = new THREE.WebGLRenderer();
		renderer.setSize(WIDTH, HEIGHT);
		renderer.autoClear = false;
		document.getElementById("orbit_view").appendChild( renderer.domElement );

		//$.get(URL + "/orbits/orbview/elements.txt", function(data){
            $.get(static_location, function(data){
		  ////console.log(data);
			lines = data.split("\n");
			
			//semimajor axis
			a = lines[12].split(/\s+/);
			a = parseFloat(a[5]) * scale;
			//console.log(a);

			//pericenter
			q = lines[12].split(/\s+/);
			q = parseFloat(q[5]);
			//console.log(q);

			//eccentricity
			ecc = lines[14].split(/\s+/);
			ecc = parseFloat(ecc[4]);
			//console.log(ecc);

			offset = a*ecc;
			b = a*Math.sqrt(1 - ecc*ecc);

			// inclination
			incl = lines[15].split(/\s+/);
			incl = (parseFloat(incl[4]) / 360) * 2 * Math.PI;
			//console.log(incl);
			
			// longitude of ascending node
			long_asc_node = lines[16].split(/\s+/);
			long_asc_node = (parseFloat(long_asc_node[7]) / 360) * 2 * Math.PI;
			//console.log(long_asc_node);

			// argument of pericenter
			arg_of_peri = lines[17].split(/\s+/);
			arg_of_peri = (parseFloat(arg_of_peri[6]) / 360) * 2 * Math.PI;
			//console.log(arg_of_peri);

			long_of_peri = lines[18].split(/\s+/);
			long_of_peri = (parseFloat(long_of_peri[5]) / 360) * 2 * Math.PI;
			//console.log(long_of_peri);

			// true anomaly
			nu = lines[19].split(/\s+/);
			nu = (parseFloat(nu[5]) / 360) * 2 * Math.PI;
			//console.log(nu);
			
			// mean anomaly
			mAnom = lines[21].split(/\s+/);
			mAnom = (parseFloat(mAnom[4]) / 360) * 2 * Math.PI;
			//console.log(mAnom);

			makeOrbit();
		}, "text");
	}

	function makeOrbit(){

		var orb_vel = new THREE.Vector3();
		var ang_mom = new THREE.Vector3();
		var r_vec = new THREE.Vector3();

		camera = new THREE.PerspectiveCamera( 90, WIDTH/HEIGHT, 0.1, 1500 );
		camera.position.set(1.5*a, 1.5*a, 1.5*a);//30,25,30);		
		scene.add(camera);

		container = new THREE.Group();

		//handle dynamic window resizing
		window.addEventListener('resize', function(){
			WIDTH = window.innerWidth;
			HEIGHT = window.innerHeight * 0.8;
			renderer.setSize(WIDTH, HEIGHT);
			camera.aspect = WIDTH/HEIGHT;
			camera.updateProjectionMatrix();
		}, false);


		// create a point light for the sun
		pointLight = new THREE.PointLight(0xFFFFFF);
		pointLight.decay = 0;

		// set its position
		pointLight.position.x = 0;
		pointLight.position.y = 0;
		pointLight.position.z = 0;

		// add to the scene
		scene.add(pointLight);
		container.add(pointLight);

		var ambLight = new THREE.AmbientLight(new THREE.Color("rgb(40%, 40%, 40%)"));
		scene.add(ambLight);

		sunGeom = new THREE.SphereGeometry(.3,20,20);
		sunMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
		sunSphere = new THREE.Mesh(sunGeom, sunMaterial);
		scene.add(sunSphere);
		container.add(sunSphere);

		planetGeom = new THREE.SphereGeometry(.1,20,20);
		planetMaterial = new THREE.MeshBasicMaterial({color:0x00ff00});
		planet = new THREE.Mesh(planetGeom, planetMaterial);
		var orbitpath = new THREE.Path();

		//console.log(offset + " " + a + " " + b + " ");

		orbitpath.absellipse(
				-offset, 0, // center of ellipse
				a,b, // a, b 
				0, 2*Math.PI, // start, end angles
				false, // clockwise?
				0 // rotation/precession 
			);
		var pts = orbitpath.getPoints(50);
		var geom = new THREE.Geometry();
		for (var i = 0; i < pts.length; i++) {
			geom.vertices.push(new THREE.Vector3(pts[i].x, pts[i].y, 0));
		}
		var material = new THREE.LineBasicMaterial({color:0x00ff00});
		var line = new THREE.Line(geom, material);

		var r = a*(1-(ecc*ecc)) / (1 + ecc*Math.cos(nu));
		//console.log(r + " current radius");

		planet.translateX(r*Math.cos(nu));
		planet.translateY(r*Math.sin(nu));


		var orbit = new THREE.Group();
		orbit.add(planet);
		orbit.add(line);

		var h = Math.sqrt(1*a*(1-(ecc*ecc)));

		var vr = ecc*Math.sin(nu) / h;
		var vth = h / r;

		if (incl == 0) {
			// use longitude of periapse
			orbit.rotateZ(long_of_peri);
		} else {

			//draw intersection btw reference plane and orbit
			var r_asc = a*(1-(ecc*ecc)) / (1 + ecc*Math.cos(arg_of_peri));
			var asc_node = new THREE.Vector3(r_asc*Math.cos(-arg_of_peri), r_asc*Math.sin(-arg_of_peri), 0);
			var r_desc = a*(1-(ecc*ecc)) / (1 + ecc*Math.cos(arg_of_peri + Math.PI));
			var desc_node = new THREE.Vector3(r_desc*Math.cos(-(arg_of_peri + Math.PI)), r_desc*Math.sin(-(arg_of_peri + Math.PI)), 0);

			var line_geom = new THREE.Geometry();
			line_geom.vertices.push(asc_node);
			line_geom.vertices.push(desc_node);
			var line_mat = new THREE.LineBasicMaterial({color:0x00ffff});
			var line = new THREE.Line(line_geom, line_mat);
			orbit.add(line);


			// incline orbit, use argument of periapse
			orbit.rotateZ(long_asc_node);
			orbit.rotateX(incl);			
			
			//calc L axis
			r_vec = planet.getWorldPosition();
			//console.log("r: " + r_vec.x + " " + r_vec.y + " " + r_vec.z);
			orb_vel = new THREE.Vector3(vr*Math.cos(vth), vth, 0);
			//console.log("v: " + orb_vel.x + " " + orb_vel.y + " " + orb_vel.z);
			ang_mom.crossVectors(r_vec, orb_vel);
			//console.log("L: " + ang_mom.x + " " + ang_mom.y + " " + ang_mom.z);

			orbit.rotateOnAxis(ang_mom.normalize(), -arg_of_peri);
			
		}
		
		scene.add(orbit);
		container.add(orbit);

		//initialize camera orbit controls
		controls = new THREE.OrbitControls(camera, renderer.domElement);

		// calculate grid size
		var grid;
		switch(a) {
			case a < 1:
				grid = new THREE.GridHelper(2, 2);
				break;
			case (1 < a && a < 5):
				grid = new THREE.GridHelper(10, 10);
				break;
			case (5 < a && a < 10):
				grid = new THREE.GridHelper(20, 20);
				break;
			default:
				grid = new THREE.GridHelper(10, 10);
				break;
		}
		grid.rotateX(Math.PI/2);
		scene.add(grid);
		container.add(grid);

		//create axes to show with model, X,Y,Z = R,G,B
		var axes = new THREE.AxisHelper(4*a);
		scene.add(axes);
		container.add(axes);


		container.rotateX(-Math.PI/2);
		scene.add(container);

		render();
	}

	function render(){
		try{
			controls.update();
			renderer.render(scene,camera);
			requestAnimationFrame(render);			
		} catch (e){
			requestAnimationFrame(render);
		}
	}
});
