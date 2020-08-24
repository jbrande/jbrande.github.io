/*
   * Gravitational n-body algorithm 
  */

  class nBodyProblem {
    constructor(params) {
      this.g = params.g;
      this.dt = params.dt;
      this.softeningConstant = params.softeningConstant;
  
      this.masses = params.masses;
      this.paused = false;
    }
  
    updatePositionVectors() {
      const massesLen = this.masses.length;
  
      for (let i = 0; i < massesLen; i++) {
        const massI = this.masses[i];
  
        massI.x += massI.vx * this.dt;
        massI.y += massI.vy * this.dt;
        massI.z += massI.vz * this.dt;
      }
  
      return this;
    }
  
    updateVelocityVectors() {
      const massesLen = this.masses.length;
  
      for (let i = 0; i < massesLen; i++) {
        const massI = this.masses[i];
  
        massI.vx += massI.ax * this.dt;
        massI.vy += massI.ay * this.dt;
        massI.vz += massI.az * this.dt;
      }
    }
  
    updateAccelerationVectors() {
      const massesLen = this.masses.length;
  
      for (let i = 0; i < massesLen; i++) {
        let ax = 0;
        let ay = 0;
        let az = 0;
  
        const massI = this.masses[i];
  
        for (let j = 0; j < massesLen; j++) {
          if (i !== j) {
            const massJ = this.masses[j];
  
            const dx = massJ.x - massI.x;
            const dy = massJ.y - massI.y;
            const dz = massJ.z - massI.z;
  
            const distSq = dx * dx + dy * dy + dz * dz;
  
            const f =
              (this.g * massJ.m) /
              (distSq * Math.sqrt(distSq + this.softeningConstant));
  
            ax += dx * f;
            ay += dy * f;
            az += dz * f;
          }
        }
  
        massI.ax = ax;
        massI.ay = ay;
        massI.az = az;
      }
  
      return this;
    }
  }
  

  // Standard Normal variate using Box-Muller transform.
  function randn_bm() {
      var u = 0, v = 0;
      while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
      while(v === 0) v = Math.random();
      num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
      return num;
  }


  /*
   * Inputs for our nBodyProblem
   */
  
  const g = 39.5; // AU, yr, solar masses
  const dt = 0.008; //0.005 years is equal to 1.825 days
  const softeningConstant = 0.15;

  const masses = [
      /*{
        name: "Sun", //We use solar masses as the unit of mass, so the mass of the Sun is exactly 1
        m: 1,
        x: -1.50324727873647e-6,
        y: -3.93762725944737e-6,
        z: -4.86567877183925e-8,
        vx: 3.1669325898331e-5,
        vy: -6.85489559263319e-6,
        vz: -7.90076642683254e-7
      },*/
      {
        name: "Sun", //We use solar masses as the unit of mass, so the mass of the Sun is exactly 1
        m: 1,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0
      },
      {
        name: "Earth",
        m: 3.0024584e-6,
        x: -9.051926231556208E-01,
        y: -4.357809584563914E-01,
        z: 7.171988139119006E-05,
        vx: 365.25*7.299728965315843E-03,
        vy: 365.25*-1.550943326828365E-02,
        vz: 365.25*1.434870704149275E-06
      },
      /*{
        m: 3.694e-8,
        name: "Moon",
        x: -9.035591935787990E-01,
        y: -4.378567418590332E-01,
        z: -6.878623310418610E-05,
        vx: 365.25*7.764641165912587E-03,
        vy: 365.25*-1.518027599665743E-02,
        vz: 365.25*-4.050720177569951E-05
      }*/
  ];


  /*
   * Create an instance of the nBodyProblem with the inputs above
   * We clone the masses array by parsing a stringified version of it so that we can reset the simulator with a minimum amount of fuss
   */ 
  
  const innerSolarSystem = new nBodyProblem({
    g,
    dt,
    masses: JSON.parse(JSON.stringify(masses)),   
    softeningConstant
  });
  
  /*
   * Motion trails
   */
  
  class Manifestation {
    constructor(ctx, trailLength, radius) {
      this.ctx = ctx;
    
      this.trailLength = trailLength;
  
      this.radius = radius;
  
      this.positions = [];
    }
  
    storePosition(x, y) {
      this.positions.push({
        x,
        y
      });
  
      if (this.positions.length > this.trailLength) this.positions.shift();
    }
  
    draw(x, y) {
      this.storePosition(x, y);
  
      const positionsLen = this.positions.length;
  
      for (let i = 0; i < positionsLen; i++) {
        let transparency;
        let circleScaleFactor;
  
        const scaleFactor = i / positionsLen;
  
        if (i === positionsLen - 1) {
          transparency = 1;
          circleScaleFactor = 1;
        } else {
          transparency = scaleFactor / 2;      
          circleScaleFactor = scaleFactor;
        }
  
        this.ctx.beginPath();
        this.ctx.arc(
          this.positions[i].x,
          this.positions[i].y,
          circleScaleFactor * this.radius,
          0,
          2 * Math.PI
        );
        this.ctx.fillStyle = `rgb(255, 255, 255, ${transparency})`;
  
        this.ctx.fill();
      }
    }
  }
  
  /*
   * Get the canvas element and its context from the DOM
   */
  
  const canvas = document.querySelector("#canvas");
  const ctx = canvas.getContext("2d");
  
  /*
   * Full screen action
   */
  
  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);
  
  /*
   * Animation constants
   *
   * scale is the number of pixels per astronomical units
   *
   * radius is the radius of the circle that represents the current position of a mass
   *
   * trailLength is the number of previous positions that we should draw in the motion trail
   */
  
  const scale = 300;
  const radius = 2;
  const trailLength = 1000;//35;
  
  /*
   * Iterate over the masses being simulated and add a visual manifestation for each of them
   */
  
  const populateManifestations = masses => {
    masses.forEach(
      mass =>
      (mass["manifestation"] = new Manifestation(
        ctx,
        trailLength,
        radius
      ))
    );
  };
  
  populateManifestations(innerSolarSystem.masses);

  /*
   * Click the reset button to reset the simulation
  */
  document.querySelector('#reset-button').addEventListener('click', () => {
    innerSolarSystem.masses = JSON.parse(JSON.stringify(masses));
    populateManifestations(innerSolarSystem.masses);       
  }, false);
  
  document.querySelector('#pause-button').addEventListener('click', () => {
    console.log(innerSolarSystem.paused)
    if (innerSolarSystem.paused) {innerSolarSystem.paused = false} else {innerSolarSystem.paused = true;}
  }, false);

  /*
   * Code for adding masses with you mouse
   */
  
  //Step 1.
  
  let mousePressX = 0;
  let mousePressY = 0;
  
  //Step 2.
  
  let currentMouseX = 0;
  let currentMouseY = 0;
  
  //Step 3.
  
  let dragging = false;
  
  //Step 4.
  
  canvas.addEventListener(
    "mousedown",
    e => {
      mousePressX = e.clientX;
      mousePressY = e.clientY;
      dragging = true;
    },
    false
  );
  
  //Step 5
  
  canvas.addEventListener(
    "mousemove",
    e => {
      currentMouseX = e.clientX;
      currentMouseY = e.clientY;
    },
    false
  );
  
  //Step 6
  
  //const massesList = document.querySelector("#masses-list");
  
  canvas.addEventListener(
    "mouseup",
    e => {
      const x = (mousePressX - width / 2) / scale;
      const y = (mousePressY - height / 2) / scale;
      const z = 0;
      const vx = (e.clientX - mousePressX) / 35;
      const vy = (e.clientY - mousePressY) / 35;
      const vz = 0;
  
      innerSolarSystem.masses.push({
        m: 1,//parseFloat(massesList.value),
        x,
        y,
        z,
        vx,
        vy,
        vz,
        manifestation: new Manifestation(ctx, trailLength, radius)
      });
  
      dragging = false;
    },
    false
  );
  
  /*
   * The animate function that sets everything in motion.
   * We run it 60 times a second with the help of requestAnimationFrame
   */
  
  const animate = () => {
    /*
     * Advance our simulation by one step
     */
  if (innerSolarSystem.paused) {
    requestAnimationFrame(animate);
  }
  else {
    innerSolarSystem
      .updatePositionVectors()
      .updateAccelerationVectors()
      .updateVelocityVectors();
  
    /*
     * Clear the canvas in preparation for the next drawing cycle
     */
  
    ctx.clearRect(0, 0, width, height);
  
    const massesLen = innerSolarSystem.masses.length;
  
    /*
     * Let us draw some masses!
     */
  
    for (let i = 0; i < massesLen; i++) {
      const massI = innerSolarSystem.masses[i];
  
      /*
       * The origin (x = 0, y = 0) of the canvas coordinate system is in the top left corner
       * To prevent our simulation from being centered on the top left corner, include the x and y offsets
       * So that it is centered smack in the middle of the canvas
       */
  
      const x = width / 2 + massI.x * scale;
      const y = height / 2 + massI.y * scale;
  
      /*
       * Draw our motion trail
       */
  
      massI.manifestation.draw(x, y);
  
      /*
       * If the mass has a name, draw it onto the canvas next to the leading circle of the motion trail
       */
      
      /*
      if (massI.name) {
        ctx.font = "14px Arial";
        ctx.fillText(massI.name, x + 12, y + 4);
        ctx.fill();
      }*/
      
      /*
       * Stop masses from escaping the bounds of the viewport
       * If either condition is met, the velocity of the mass will be reversed
       * And the mass will bounce back into the inner solar system
       */


       /*
  
      if (x < radius || x > width - radius) massI.vx = -massI.vx;
  
      if (y < radius || y > height - radius) massI.vy = -massI.vy;


      */
    }
  
    /*
     * Draw the line which indicates direction and velocity of a mass that is about to be added when the mouse is being dragged
     */
  
    if (dragging) {
      ctx.beginPath();
      ctx.moveTo(mousePressX, mousePressY);
      ctx.lineTo(currentMouseX, currentMouseY);
      ctx.strokeStyle = "red";
      ctx.stroke();
    }
  

    requestAnimationFrame(animate);
  }
  };
  
  animate();