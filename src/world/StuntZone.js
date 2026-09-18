import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import confetti from 'canvas-confetti';

export class StuntZone {
  constructor(scene, physicsWorld, soundManager, onScoreUpdate) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.soundManager = soundManager;
    this.onScoreUpdate = onScoreUpdate;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Stunt zone center: x ~ -35, z ~ 35
    this.origin = { x: -35, z: 35 };

    this.bowlingPins = [];
    this.crates = [];
    this.boostPads = [];
    this.strikeAwarded = false;

    this.initBowlingAlley();
    this.initCratePyramid();
    this.initStuntRampAndBoost();
  }

  createPinMesh() {
    const pinGroup = new THREE.Group();

    // Bowling pin body lathe/cylinder
    const points = [];
    points.push(new THREE.Vector2(0.25, 0));
    points.push(new THREE.Vector2(0.28, 0.2));
    points.push(new THREE.Vector2(0.38, 0.5));
    points.push(new THREE.Vector2(0.32, 0.9));
    points.push(new THREE.Vector2(0.18, 1.2));
    points.push(new THREE.Vector2(0.22, 1.45));
    points.push(new THREE.Vector2(0.16, 1.6));
    points.push(new THREE.Vector2(0, 1.65));

    const latheGeo = new THREE.LatheGeometry(points, 16);
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
    });

    const pinMesh = new THREE.Mesh(latheGeo, whiteMat);
    pinMesh.castShadow = true;
    pinMesh.receiveShadow = true;
    pinGroup.add(pinMesh);

    // Red neck stripes
    const redStripeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
    });
    const stripeGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.08, 16);
    stripeGeo.translate(0, 1.32, 0);
    const stripe = new THREE.Mesh(stripeGeo, redStripeMat);
    pinGroup.add(stripe);

    return pinGroup;
  }

  initBowlingAlley() {
    // 10 bowling pins in standard triangle formation
    // Row 1: 1 pin
    // Row 2: 2 pins
    // Row 3: 3 pins
    // Row 4: 4 pins
    const startX = this.origin.x - 12;
    const startZ = this.origin.z + 8;
    const spacingX = 0.9;
    const spacingZ = 1.0;

    let pinIdx = 0;
    const rows = 4;
    this.pinInitialTransforms = [];

    for (let r = 0; r < rows; r++) {
      const pinsInRow = r + 1;
      const rowOffset = -(pinsInRow - 1) * spacingX * 0.5;

      for (let c = 0; c < pinsInRow; c++) {
        const x = startX + rowOffset + c * spacingX;
        const z = startZ + r * spacingZ;

        const mesh = this.createPinMesh();
        mesh.position.set(x, 0, z);
        this.scene.add(mesh);

        // Physics body for pin
        const shape = new CANNON.Cylinder(0.24, 0.28, 1.65, 8);
        const body = new CANNON.Body({
          mass: 3.0,
          position: new CANNON.Vec3(x, 0.83, z),
          shape: shape,
          material: this.physicsWorld.propMaterial,
          linearDamping: 0.15,
          angularDamping: 0.2,
        });

        this.physicsWorld.addSyncObject(mesh, body);
        this.physicsWorld.registerCollisionSound(body, 1.5);

        this.bowlingPins.push({ mesh, body, knocked: false });
        this.pinInitialTransforms.push(new CANNON.Vec3(x, 0.83, z));
        pinIdx++;
      }
    }

    // Heavy bowling ball placed right in front of the pins
    const ballRadius = 0.65;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.8,
    });
    this.bowlingBallMesh = new THREE.Mesh(ballGeo, ballMat);
    this.bowlingBallMesh.castShadow = true;
    this.scene.add(this.bowlingBallMesh);

    const ballShape = new CANNON.Sphere(ballRadius);
    this.bowlingBallBody = new CANNON.Body({
      mass: 35.0, // Heavy ball to smash through pins
      position: new CANNON.Vec3(startX, ballRadius, startZ - 6.0),
      shape: ballShape,
      material: this.physicsWorld.propMaterial,
      linearDamping: 0.1,
      angularDamping: 0.1,
    });

    this.physicsWorld.addSyncObject(this.bowlingBallMesh, this.bowlingBallBody);
    this.physicsWorld.registerCollisionSound(this.bowlingBallBody, 1.0);
    this.ballInitialPos = new CANNON.Vec3(startX, ballRadius, startZ - 6.0);
  }

  createCrateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Wood plank background
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 256, 256);

    // Diagonal brace
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, 238, 238);
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(246, 246);
    ctx.stroke();

    // Stencil text "CAUTION / FRAGILE"
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FRAGILE', 128, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  initCratePyramid() {
    // 15 crates stacked in 5-4-3-2-1 pyramid
    const crateSize = 1.3;
    const crateGeo = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
    const crateMat = new THREE.MeshStandardMaterial({
      map: this.createCrateTexture(),
      roughness: 0.7,
      metalness: 0.1,
    });

    const startX = this.origin.x + 8.0;
    const startZ = this.origin.z + 2.0;

    this.crateInitialTransforms = [];
    const layers = [5, 4, 3, 2, 1];

    let currentY = crateSize * 0.5;
    for (let l = 0; l < layers.length; l++) {
      const count = layers[l];
      const rowOffset = -(count - 1) * crateSize * 0.5;

      for (let i = 0; i < count; i++) {
        const x = startX + rowOffset + i * crateSize;
        const y = currentY;
        const z = startZ;

        const mesh = new THREE.Mesh(crateGeo, crateMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const shape = new CANNON.Box(
          new CANNON.Vec3(crateSize * 0.5, crateSize * 0.5, crateSize * 0.5)
        );
        const body = new CANNON.Body({
          mass: 3.5,
          position: new CANNON.Vec3(x, y, z),
          shape: shape,
          material: this.physicsWorld.propMaterial,
          linearDamping: 0.2,
          angularDamping: 0.3,
        });

        this.physicsWorld.addSyncObject(mesh, body);
        this.physicsWorld.registerCollisionSound(body, 1.2);

        this.crates.push({ mesh, body });
        this.crateInitialTransforms.push(new CANNON.Vec3(x, y, z));
      }
      currentY += crateSize + 0.02;
    }
  }

  initStuntRampAndBoost() {
    // 1. Giant Stunt Jump Ramp
    const rampWidth = 6.0;
    const rampLength = 9.0;
    const rampHeight = 3.2;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    // Smooth curved curve up to lip
    shape.quadraticCurveTo(rampLength * 0.6, 0.4, rampLength, rampHeight);
    shape.lineTo(rampLength, 0);
    shape.closePath();

    const rampGeo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: rampWidth,
      bevelEnabled: false,
    });
    rampGeo.translate(-rampLength * 0.5, 0, -rampWidth * 0.5);

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.3,
    });

    this.stuntRampMesh = new THREE.Mesh(rampGeo, rampMat);
    const rampX = this.origin.x - 2.0;
    const rampZ = this.origin.z - 14.0;
    this.stuntRampMesh.position.set(rampX, 0, rampZ);
    this.stuntRampMesh.rotation.y = Math.PI * 0.5; // facing +X or +Z
    this.stuntRampMesh.castShadow = true;
    this.stuntRampMesh.receiveShadow = true;
    this.scene.add(this.stuntRampMesh);

    // Glowing runway edge guides on jump ramp
    this.rampEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const edgeGeo = new THREE.BoxGeometry(0.12, 0.12, rampLength);
    const edgeL = new THREE.Mesh(edgeGeo, this.rampEdgeMat);
    edgeL.position.set(rampWidth * 0.48, rampHeight * 0.4, 0);
    edgeL.rotation.x = Math.atan2(rampHeight, rampLength);
    this.stuntRampMesh.add(edgeL);
    const edgeR = edgeL.clone();
    edgeR.position.x = -rampWidth * 0.48;
    this.stuntRampMesh.add(edgeR);

    // Physics collider for stunt ramp
    const boxLength = Math.hypot(rampLength, rampHeight);
    const angle = Math.atan2(rampHeight, rampLength);
    const rampBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(rampX, rampHeight * 0.45, rampZ),
      shape: new CANNON.Box(
        new CANNON.Vec3(boxLength * 0.5, 0.2, rampWidth * 0.5)
      ),
      material: this.physicsWorld.groundMaterial,
    });
    rampBody.quaternion.setFromEuler(0, Math.PI * 0.5, angle);
    this.physicsWorld.world.addBody(rampBody);

    // 2. Speed Boost Strip on the approach runway
    const boostPadGeo = new THREE.PlaneGeometry(3.6, 6.0);
    boostPadGeo.rotateX(-Math.PI / 2);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 512);

    // Glowing arrows pointing forward
    ctx.strokeStyle = '#00f2fe';
    ctx.fillStyle = '#00f2fe';
    ctx.lineWidth = 14;

    for (let y = 100; y < 500; y += 130) {
      ctx.beginPath();
      ctx.moveTo(40, y + 40);
      ctx.lineTo(128, y - 30);
      ctx.lineTo(216, y + 40);
      ctx.stroke();
    }

    const boostTex = new THREE.CanvasTexture(canvas);
    boostTex.colorSpace = THREE.SRGBColorSpace;
    this.boostMat = new THREE.MeshStandardMaterial({
      map: boostTex,
      emissive: 0x00f2fe,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });

    const boostMesh = new THREE.Mesh(boostPadGeo, this.boostMat);
    const boostX = rampX;
    const boostZ = rampZ - 9.0;
    boostMesh.position.set(boostX, 0.04, boostZ);
    this.scene.add(boostMesh);

    this.boostPads.push({
      pos: new THREE.Vector3(boostX, 0, boostZ),
      radius: 3.5,
      lastTrigger: 0,
    });

    // 3. Floating Neon Stunt Ring in the air to jump through
    const ringGeo = new THREE.TorusGeometry(3.2, 0.25, 16, 32);
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 2.5,
    });
    this.stuntRing = new THREE.Mesh(ringGeo, this.ringMat);
    this.stuntRing.position.set(rampX, 5.8, rampZ + 10.0);
    this.scene.add(this.stuntRing);
  }

  update(dt, vehicle) {
    const carPos = vehicle.carGroup.position;

    // 1. Check Speed Boost Triggers
    const now = performance.now();
    for (const pad of this.boostPads) {
      if (now - pad.lastTrigger > 1200) {
        if (pad.pos.distanceTo(carPos) < pad.radius) {
          pad.lastTrigger = now;
          vehicle.applySpeedBoost(32);
          // Small camera shake or visual boost
        }
      }
    }

    // 2. Animate Stunt Ring
    if (this.stuntRing) {
      this.stuntRing.rotation.z += 0.8 * dt;
    }

    // 3. Monitor Bowling Pins Status
    let knockedCount = 0;
    for (const pin of this.bowlingPins) {
      // Check if pin is tilted > 35 degrees or knocked away
      const up = new CANNON.Vec3(0, 1, 0);
      const pinUp = new CANNON.Vec3(0, 1, 0);
      pin.body.quaternion.vmult(up, pinUp);
      const dot = up.dot(pinUp);

      if (dot < 0.75 || pin.body.position.y < 0.4 || pin.body.velocity.length() > 0.5) {
        pin.knocked = true;
        knockedCount++;
      }
    }

    // Check for STRIKE!
    if (knockedCount === 10 && !this.strikeAwarded) {
      this.strikeAwarded = true;
      this.soundManager.playStrike();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
      if (this.onScoreUpdate) {
        this.onScoreUpdate({ strike: true, score: 10 });
      }
    } else if (knockedCount > 0 && !this.strikeAwarded) {
      if (this.onScoreUpdate) {
        this.onScoreUpdate({ strike: false, score: knockedCount });
      }
    }
  }

  resetAll() {
    this.strikeAwarded = false;

    // Reset pins
    this.bowlingPins.forEach((item, idx) => {
      const pos = this.pinInitialTransforms[idx];
      item.body.position.copy(pos);
      item.body.velocity.set(0, 0, 0);
      item.body.angularVelocity.set(0, 0, 0);
      item.body.quaternion.set(0, 0, 0, 1);
      item.knocked = false;
    });

    // Reset bowling ball
    this.bowlingBallBody.position.copy(this.ballInitialPos);
    this.bowlingBallBody.velocity.set(0, 0, 0);
    this.bowlingBallBody.angularVelocity.set(0, 0, 0);
    this.bowlingBallBody.quaternion.set(0, 0, 0, 1);

    // Reset crates
    this.crates.forEach((item, idx) => {
      const pos = this.crateInitialTransforms[idx];
      item.body.position.copy(pos);
      item.body.velocity.set(0, 0, 0);
      item.body.angularVelocity.set(0, 0, 0);
      item.body.quaternion.set(0, 0, 0, 1);
    });

    if (this.onScoreUpdate) {
      this.onScoreUpdate({ strike: false, score: 0 });
    }
  }

  setNightMode(isNight) {
    if (this.boostMat) {
      this.boostMat.emissiveIntensity = isNight ? 2.6 : 1.2;
      this.boostMat.needsUpdate = true;
    }
    if (this.ringMat) {
      this.ringMat.emissiveIntensity = isNight ? 3.8 : 2.5;
      this.ringMat.needsUpdate = true;
    }
    if (this.rampEdgeMat) {
      this.rampEdgeMat.emissiveIntensity = isNight ? 3.2 : 1.5;
      this.rampEdgeMat.needsUpdate = true;
    }
  }
}
