import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Vehicle {
  constructor(scene, physicsWorld, soundManager, shadowDecals) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.soundManager = soundManager;
    this.shadowDecals = shadowDecals;

    // Vehicle dimensions
    this.chassisWidth = 1.65;
    this.chassisHeight = 0.65;
    this.chassisLength = 2.85;
    this.wheelRadius = 0.38;

    // Control parameters
    this.maxSteerVal = 0.55;
    this.maxEngineForce = 1400;
    this.maxBrakeForce = 70;
    this.currentSteer = 0;

    // State & Telemetry
    this.speed = 0;
    this.isDrifting = false;
    this.isBraking = false;
    this.isReversing = false;
    this.lastSpeed = 0;
    this.pitchTilt = 0;
    this.rollTilt = 0;

    // Visual Groups
    this.carGroup = new THREE.Group();
    this.bodyVisualGroup = new THREE.Group();
    this.carGroup.add(this.bodyVisualGroup);
    this.scene.add(this.carGroup);

    this.wheelMeshes = [];
    this.skidmarks = [];

    this.initPhysics();
    this.initVisuals();
    this.initSkidmarkSystem();
    this.initParticles();
  }

  initPhysics() {
    const shape = new CANNON.Box(
      new CANNON.Vec3(
        this.chassisWidth * 0.5,
        this.chassisHeight * 0.5,
        this.chassisLength * 0.5
      )
    );

    this.chassisBody = new CANNON.Body({
      mass: 190,
      material: this.physicsWorld.chassisMaterial,
      linearDamping: 0.15,
      angularDamping: 0.45,
    });

    this.chassisBody.addShape(shape, new CANNON.Vec3(0, 0, 0));
    this.chassisBody.position.set(0, 1.2, 0);

    this.physicsWorld.world.addBody(this.chassisBody);
    this.physicsWorld.registerCollisionSound(this.chassisBody, 2.5);

    // Raycast Vehicle (Forward axis: 2 -> -Z in Cannon)
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    const wheelOptions = {
      radius: this.wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 45,
      suspensionRestLength: 0.38,
      frictionSlip: 3.4,
      dampingRelaxation: 2.8,
      dampingCompression: 3.5,
      maxSuspensionForce: 16000,
      rollInfluence: 0.08,
      axleLocal: new CANNON.Vec3(1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(0, 0, 0),
      maxSuspensionTravel: 0.32,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    const halfW = this.chassisWidth * 0.5 + 0.08;
    const halfL = this.chassisLength * 0.5 - 0.35;
    const downY = -this.chassisHeight * 0.25;

    // Front wheels (steered) placed at -halfL (-Z is front):
    // Wheel 0: Front Right
    wheelOptions.chassisConnectionPointLocal.set(-halfW, downY, -halfL);
    this.vehicle.addWheel(wheelOptions);

    // Wheel 1: Front Left
    wheelOptions.chassisConnectionPointLocal.set(halfW, downY, -halfL);
    this.vehicle.addWheel(wheelOptions);

    // Rear wheels placed at +halfL (+Z is rear):
    // Wheel 2: Rear Right
    wheelOptions.chassisConnectionPointLocal.set(-halfW, downY, halfL);
    this.vehicle.addWheel(wheelOptions);

    // Wheel 3: Rear Left
    wheelOptions.chassisConnectionPointLocal.set(halfW, downY, halfL);
    this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(this.physicsWorld.world);
  }

  createTireTreadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#22262a';
    ctx.fillRect(0, 0, 128, 256);

    ctx.fillStyle = '#0f1114';
    for (let y = 0; y < 256; y += 16) {
      ctx.fillRect(10, y, 48, 6);
      ctx.fillRect(70, y + 8, 48, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }

  initVisuals() {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4d29, // Radiant Crimson Tangerine
      roughness: 0.3,
      metalness: 0.15,
    });

    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });

    const darkTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.4,
    });

    const caliperMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00c6ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    // 1. Lower Body
    const lowerBodyGeo = new THREE.BoxGeometry(
      this.chassisWidth,
      this.chassisHeight * 0.52,
      this.chassisLength
    );
    const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyMaterial);
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.bodyVisualGroup.add(lowerBody);

    // Racing stripe
    const stripeGeo = new THREE.BoxGeometry(0.38, 0.02, this.chassisLength + 0.04);
    const stripe = new THREE.Mesh(stripeGeo, stripeMaterial);
    stripe.position.y = this.chassisHeight * 0.27;
    this.bodyVisualGroup.add(stripe);

    // Hood Air Scoop (at front, -Z)
    const scoopGeo = new THREE.BoxGeometry(0.65, 0.14, 0.8);
    const scoop = new THREE.Mesh(scoopGeo, bodyMaterial);
    scoop.position.set(0, this.chassisHeight * 0.32, -0.6);
    scoop.castShadow = true;
    this.bodyVisualGroup.add(scoop);

    const scoopGrilleGeo = new THREE.BoxGeometry(0.55, 0.08, 0.04);
    const scoopGrille = new THREE.Mesh(scoopGrilleGeo, darkTrimMaterial);
    scoopGrille.position.set(0, this.chassisHeight * 0.32, -0.6 - 0.41);
    this.bodyVisualGroup.add(scoopGrille);

    // 2. Cabin / Windshield
    const cabinGeo = new THREE.BoxGeometry(
      this.chassisWidth * 0.82,
      this.chassisHeight * 0.62,
      this.chassisLength * 0.54
    );
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, this.chassisHeight * 0.46, 0.1);
    cabin.castShadow = true;
    this.bodyVisualGroup.add(cabin);

    // Roof Cap
    const roofGeo = new THREE.BoxGeometry(
      this.chassisWidth * 0.8,
      0.08,
      this.chassisLength * 0.5
    );
    const roof = new THREE.Mesh(roofGeo, bodyMaterial);
    roof.position.set(0, this.chassisHeight * 0.78, 0.1);
    this.bodyVisualGroup.add(roof);

    // 3. Front Bumper Splitter (-Z) & Rear Diffuser (+Z)
    const splitterGeo = new THREE.BoxGeometry(this.chassisWidth * 1.04, 0.12, 0.32);
    const splitter = new THREE.Mesh(splitterGeo, darkTrimMaterial);
    splitter.position.set(0, -0.18, -this.chassisLength * 0.5 - 0.1);
    splitter.castShadow = true;
    this.bodyVisualGroup.add(splitter);

    const diffuserGeo = new THREE.BoxGeometry(this.chassisWidth * 0.96, 0.22, 0.28);
    const diffuser = new THREE.Mesh(diffuserGeo, darkTrimMaterial);
    diffuser.position.set(0, -0.12, this.chassisLength * 0.5 + 0.08);
    diffuser.castShadow = true;
    this.bodyVisualGroup.add(diffuser);

    // 4. Rear Spoiler Wing (+Z)
    const wingStandGeo = new THREE.BoxGeometry(0.08, 0.36, 0.08);
    const standL = new THREE.Mesh(wingStandGeo, darkTrimMaterial);
    standL.position.set(0.46, this.chassisHeight * 0.36, this.chassisLength * 0.48);
    const standR = standL.clone();
    standR.position.x = -0.46;
    this.bodyVisualGroup.add(standL, standR);

    const wingGeo = new THREE.BoxGeometry(this.chassisWidth * 1.08, 0.08, 0.34);
    const wing = new THREE.Mesh(wingGeo, bodyMaterial);
    wing.position.set(0, this.chassisHeight * 0.54, this.chassisLength * 0.48);
    wing.castShadow = true;
    this.bodyVisualGroup.add(wing);

    // 5. LED Headlights (-Z) & Real Spotlights (pointing forward towards -Z)
    const headlightGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16);
    headlightGeo.rotateX(Math.PI / 2);
    this.headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    const hlR = new THREE.Mesh(headlightGeo, this.headlightMaterial);
    hlR.position.set(-0.52, 0.08, -this.chassisLength * 0.5 - 0.02);
    const hlL = hlR.clone();
    hlL.position.x = 0.52;
    this.bodyVisualGroup.add(hlR, hlL);

    this.spotlightL = new THREE.SpotLight(0xfff8ea, 0, 26, Math.PI / 5.5, 0.45, 1.2);
    this.spotlightL.position.set(0.52, 0.35, -this.chassisLength * 0.5 - 0.1);
    this.spotlightL.target = new THREE.Object3D();
    this.spotlightL.target.position.set(0.52, -0.1, -this.chassisLength * 0.5 - 12);
    this.carGroup.add(this.spotlightL);
    this.carGroup.add(this.spotlightL.target);

    this.spotlightR = new THREE.SpotLight(0xfff8ea, 0, 26, Math.PI / 5.5, 0.45, 1.2);
    this.spotlightR.position.set(-0.52, 0.35, -this.chassisLength * 0.5 - 0.1);
    this.spotlightR.target = new THREE.Object3D();
    this.spotlightR.target.position.set(-0.52, -0.1, -this.chassisLength * 0.5 - 12);
    this.carGroup.add(this.spotlightR);
    this.carGroup.add(this.spotlightR.target);

    // Forward ground illumination pool
    this.headlightPoolLight = new THREE.PointLight(0xfff8ea, 0, 18, 1.2);
    this.headlightPoolLight.position.set(0, 0.4, -this.chassisLength * 0.5 - 3.5);
    this.carGroup.add(this.headlightPoolLight);

    // Cyber Neon Underglow Light
    this.underglowLight = new THREE.PointLight(0x00f2fe, 0, 7.5, 1.8);
    this.underglowLight.position.set(0, 0.2, 0);
    this.carGroup.add(this.underglowLight);

    // Rear Taillight illumination pool
    this.taillightPoolLight = new THREE.PointLight(0xff1122, 0, 8.0, 1.8);
    this.taillightPoolLight.position.set(0, 0.3, this.chassisLength * 0.5 + 1.2);
    this.carGroup.add(this.taillightPoolLight);

    // 6. Taillights (+Z)
    const taillightGeo = new THREE.BoxGeometry(0.3, 0.1, 0.06);
    this.taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1122,
      emissive: 0x990000,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    });
    const tlR = new THREE.Mesh(taillightGeo, this.taillightMaterial);
    tlR.position.set(-0.52, 0.08, this.chassisLength * 0.5 + 0.01);
    const tlL = tlR.clone();
    tlL.position.x = 0.52;
    this.bodyVisualGroup.add(tlR, tlL);

    // 7. Wobbly RC Antenna (+Z)
    this.antennaGroup = new THREE.Group();
    this.antennaGroup.position.set(0.48, this.chassisHeight * 0.25, this.chassisLength * 0.42);

    const antennaRodGeo = new THREE.CylinderGeometry(0.016, 0.024, 0.95, 8);
    antennaRodGeo.translate(0, 0.47, 0);
    const antennaRod = new THREE.Mesh(antennaRodGeo, darkTrimMaterial);
    this.antennaGroup.add(antennaRod);

    const tipGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00c6ff,
      emissiveIntensity: 2.8,
    });
    const antennaTip = new THREE.Mesh(tipGeo, tipMat);
    antennaTip.position.y = 0.96;
    this.antennaGroup.add(antennaTip);

    this.bodyVisualGroup.add(this.antennaGroup);

    // 8. 4 Alloy Wheels with Calipers
    const tireGeo = new THREE.CylinderGeometry(
      this.wheelRadius,
      this.wheelRadius,
      0.34,
      24
    );
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(
      this.wheelRadius * 0.58,
      this.wheelRadius * 0.58,
      0.35,
      14
    );
    rimGeo.rotateZ(Math.PI / 2);

    const caliperGeo = new THREE.BoxGeometry(0.12, 0.2, 0.18);

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e2024,
      roughness: 0.85,
      bumpMap: this.createTireTreadTexture(),
      bumpScale: 0.04,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.85,
    });

    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group();
      const tireMesh = new THREE.Mesh(tireGeo, tireMat);
      tireMesh.castShadow = true;
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);

      const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
      caliper.position.set(i % 2 === 0 ? 0.08 : -0.08, 0.15, 0);

      wheelGroup.add(tireMesh, rimMesh, caliper);
      this.scene.add(wheelGroup);
      this.wheelMeshes.push(wheelGroup);
    }
  }

  initSkidmarkSystem() {
    this.maxSkidSegments = 200;
    this.skidIndex = 0;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxSkidSegments * 6 * 3);
    const opacities = new Float32Array(this.maxSkidSegments * 6);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        void main() {
          vOpacity = opacity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          gl_FragColor = vec4(0.12, 0.12, 0.14, vOpacity * 0.7);
        }
      `,
    });

    this.skidmarkMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.skidmarkMesh);

    this.lastRearLeftPos = null;
    this.lastRearRightPos = null;
  }

  initParticles() {
    this.maxDust = 80;
    this.dustParticles = [];
    const dustGeo = new THREE.SphereGeometry(0.18, 6, 6);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.5,
    });

    this.dustGroup = new THREE.Group();
    for (let i = 0; i < this.maxDust; i++) {
      const p = new THREE.Mesh(dustGeo, dustMat.clone());
      p.visible = false;
      p.userData = { life: 0, maxLife: 1.0, vel: new THREE.Vector3() };
      this.dustGroup.add(p);
      this.dustParticles.push(p);
    }
    this.scene.add(this.dustGroup);
    this.dustIndex = 0;
  }

  spawnDust(pos, vel) {
    const p = this.dustParticles[this.dustIndex % this.maxDust];
    this.dustIndex++;

    p.visible = true;
    p.position.copy(pos);
    p.scale.setScalar(THREE.MathUtils.randFloat(0.5, 1.2));
    p.userData.life = 0;
    p.userData.maxLife = THREE.MathUtils.randFloat(0.4, 0.75);
    p.userData.vel.set(
      vel.x * 0.2 + (Math.random() - 0.5) * 1.5,
      THREE.MathUtils.randFloat(0.8, 2.2),
      vel.z * 0.2 + (Math.random() - 0.5) * 1.5
    );
  }

  updateParticles(dt) {
    for (const p of this.dustParticles) {
      if (!p.visible) continue;
      p.userData.life += dt;
      if (p.userData.life >= p.userData.maxLife) {
        p.visible = false;
        continue;
      }

      const prog = p.userData.life / p.userData.maxLife;
      p.position.addScaledVector(p.userData.vel, dt);
      p.scale.multiplyScalar(1.0 + 1.2 * dt);
      p.material.opacity = (1.0 - prog) * 0.45;
    }
  }

  addSkidSegment(p1, p2, p3, p4, alpha = 0.8) {
    const posAttr = this.skidmarkMesh.geometry.attributes.position;
    const opAttr = this.skidmarkMesh.geometry.attributes.opacity;
    const idx = (this.skidIndex % this.maxSkidSegments) * 6;

    const yOffset = 0.02;
    posAttr.setXYZ(idx + 0, p1.x, yOffset, p1.z);
    posAttr.setXYZ(idx + 1, p2.x, yOffset, p2.z);
    posAttr.setXYZ(idx + 2, p3.x, yOffset, p3.z);

    posAttr.setXYZ(idx + 3, p2.x, yOffset, p2.z);
    posAttr.setXYZ(idx + 4, p4.x, yOffset, p4.z);
    posAttr.setXYZ(idx + 5, p3.x, yOffset, p3.z);

    for (let k = 0; k < 6; k++) {
      opAttr.setX(idx + k, alpha);
    }

    posAttr.needsUpdate = true;
    opAttr.needsUpdate = true;
    this.skidIndex++;
  }

  update(dt, input) {
    // In Cannon forward is -Z
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.carGroup.quaternion
    );
    const currentVel = new THREE.Vector3(
      this.chassisBody.velocity.x,
      this.chassisBody.velocity.y,
      this.chassisBody.velocity.z
    );
    const forwardSpeed = currentVel.dot(forwardVector);
    this.speed = currentVel.length();

    // 1. Steering front wheels (wheels 0 and 1)
    const targetSteer = -input.steer * this.maxSteerVal;
    const steerSpeed = 6.0;
    this.currentSteer = THREE.MathUtils.lerp(
      this.currentSteer,
      targetSteer,
      steerSpeed * dt
    );

    this.vehicle.setSteeringValue(this.currentSteer, 0);
    this.vehicle.setSteeringValue(this.currentSteer, 1);

    // 2. Throttle & Brakes (Positive engine force pushes in -Z, moving forward)
    let engineForce = 0;
    let brakeForce = 0;

    if (input.throttle > 0) {
      engineForce = input.throttle * this.maxEngineForce;
      this.isReversing = false;
      this.isBraking = false;
    } else if (input.throttle < 0) {
      if (forwardSpeed > 1.0) {
        brakeForce = Math.abs(input.throttle) * this.maxBrakeForce;
        this.isBraking = true;
        this.isReversing = false;
      } else {
        engineForce = input.throttle * (this.maxEngineForce * 0.7);
        this.isReversing = true;
        this.isBraking = false;
      }
    } else {
      this.isBraking = false;
      this.isReversing = false;
    }

    if (input.handbrake) {
      brakeForce = this.maxBrakeForce * 1.8;
      this.isBraking = true;
    }

    // Apply engine force & brake to all 4 wheels for maximum AWD responsiveness
    for (let i = 0; i < 4; i++) {
      this.vehicle.applyEngineForce(engineForce, i);
      this.vehicle.setBrake(brakeForce, i);
    }

    // Handbrake drift assist on rear wheels (indices 2 and 3)
    const rearFriction = input.handbrake ? 1.0 : 3.4;
    this.vehicle.wheelInfos[2].frictionSlip = rearFriction;
    this.vehicle.wheelInfos[3].frictionSlip = rearFriction;

    // Lateral slide for drift detection
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(
      this.carGroup.quaternion
    );
    const lateralSpeed = Math.abs(currentVel.dot(rightVector));
    this.isDrifting = lateralSpeed > 2.8 && this.speed > 3.0;

    // 3. Taillight Glow & Night Illumination Pool
    if (this.isBraking) {
      this.taillightMaterial.emissive.setHex(0xff0022);
      this.taillightMaterial.emissiveIntensity = this.isNightMode ? 6.0 : 3.5;
      if (this.taillightPoolLight) {
        this.taillightPoolLight.color.setHex(0xff0022);
        this.taillightPoolLight.intensity = this.isNightMode ? 4.5 : 0;
      }
    } else if (this.isReversing) {
      this.taillightMaterial.emissive.setHex(0xffffff);
      this.taillightMaterial.emissiveIntensity = this.isNightMode ? 5.0 : 2.5;
      if (this.taillightPoolLight) {
        this.taillightPoolLight.color.setHex(0xfff8ea);
        this.taillightPoolLight.intensity = this.isNightMode ? 3.8 : 0;
      }
    } else {
      this.taillightMaterial.emissive.setHex(0x990000);
      this.taillightMaterial.emissiveIntensity = this.isNightMode ? 2.8 : 1.2;
      if (this.taillightPoolLight) {
        this.taillightPoolLight.color.setHex(0xff1122);
        this.taillightPoolLight.intensity = this.isNightMode ? 1.5 : 0;
      }
    }

    // 4. Sound Updates
    const speedRatio = Math.min(1.0, this.speed / 24);
    this.soundManager.updateEngine(
      speedRatio,
      input.throttle !== 0,
      this.isBraking
    );
    this.soundManager.setSkid(this.isDrifting ? lateralSpeed / 8 : 0);

    // 5. Dynamic Suspension Telemetry (Squat, Dip, and Roll)
    const accel = (this.speed - this.lastSpeed) / Math.max(dt, 0.001);
    this.lastSpeed = this.speed;

    const targetPitch = THREE.MathUtils.clamp(-accel * 0.004, -0.12, 0.12);
    const targetRoll = THREE.MathUtils.clamp(-this.currentSteer * (this.speed / 15) * 0.15, -0.16, 0.16);

    this.pitchTilt = THREE.MathUtils.lerp(this.pitchTilt, targetPitch, 8 * dt);
    this.rollTilt = THREE.MathUtils.lerp(this.rollTilt, targetRoll, 8 * dt);

    this.bodyVisualGroup.rotation.x = this.pitchTilt;
    this.bodyVisualGroup.rotation.z = this.rollTilt;

    // 6. Synchronize Visuals
    this.carGroup.position.copy(this.chassisBody.position);
    this.carGroup.quaternion.copy(this.chassisBody.quaternion);

    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i);
      const t = this.vehicle.wheelInfos[i].worldTransform;
      const mesh = this.wheelMeshes[i];
      mesh.position.copy(t.position);
      mesh.quaternion.copy(t.quaternion);
    }

    // 7. Dynamic Antenna Wobble
    const localAccel = currentVel.clone().applyQuaternion(
      this.carGroup.quaternion.clone().invert()
    );
    const wobblePitch = THREE.MathUtils.clamp(localAccel.z * 0.04, -0.4, 0.4);
    const wobbleRoll = THREE.MathUtils.clamp(localAccel.x * 0.05, -0.4, 0.4);
    this.antennaGroup.rotation.x = THREE.MathUtils.lerp(
      this.antennaGroup.rotation.x,
      wobblePitch,
      10 * dt
    );
    this.antennaGroup.rotation.z = THREE.MathUtils.lerp(
      this.antennaGroup.rotation.z,
      wobbleRoll,
      10 * dt
    );

    // 8. Skidmarks & Tire Dust (rear wheels are 2 and 3)
    if ((this.isDrifting || (this.isBraking && this.speed > 5)) && this.wheelMeshes[2]) {
      const rl = this.wheelMeshes[3].position.clone();
      const rr = this.wheelMeshes[2].position.clone();

      if (Math.random() < 0.6) {
        this.spawnDust(rl, currentVel);
        this.spawnDust(rr, currentVel);
      }

      if (this.lastRearLeftPos && this.lastRearRightPos) {
        const d = rl.distanceTo(this.lastRearLeftPos);
        if (d > 0.35 && d < 3.0) {
          const wHalf = 0.12;
          const leftNormal = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(this.carGroup.quaternion)
            .multiplyScalar(wHalf);

          this.addSkidSegment(
            this.lastRearLeftPos.clone().sub(leftNormal),
            this.lastRearLeftPos.clone().add(leftNormal),
            rl.clone().sub(leftNormal),
            rl.clone().add(leftNormal),
            0.65
          );

          this.addSkidSegment(
            this.lastRearRightPos.clone().sub(leftNormal),
            this.lastRearRightPos.clone().add(leftNormal),
            rr.clone().sub(leftNormal),
            rr.clone().add(leftNormal),
            0.65
          );
        }
      }
      this.lastRearLeftPos = rl;
      this.lastRearRightPos = rr;
    } else {
      this.lastRearLeftPos = null;
      this.lastRearRightPos = null;
    }

    this.updateParticles(dt);

    // 9. Update Dynamic Contact Shadow underneath car
    if (this.shadowDecals) {
      const euler = new THREE.Euler().setFromQuaternion(this.carGroup.quaternion, 'YXZ');
      this.shadowDecals.updateCarShadow(
        this.carGroup.position,
        euler.y,
        this.chassisBody.position.y
      );
    }

    if (this.chassisBody.position.y < -5) {
      this.reset();
    }
  }

  applySpeedBoost(boostStrength = 38) {
    const forwardVector = new CANNON.Vec3(0, 0, -1);
    this.chassisBody.quaternion.vmult(forwardVector, forwardVector);
    forwardVector.scale(boostStrength, forwardVector);
    this.chassisBody.velocity.vadd(forwardVector, this.chassisBody.velocity);
    this.soundManager.playBoost();
  }

  setNightMode(isNight) {
    this.isNightMode = isNight;
    const spotIntensity = isNight ? 15.0 : 0.0;
    this.spotlightL.intensity = spotIntensity;
    this.spotlightR.intensity = spotIntensity;
    if (this.headlightPoolLight) {
      this.headlightPoolLight.intensity = isNight ? 5.5 : 0.0;
    }
    if (this.underglowLight) {
      this.underglowLight.intensity = isNight ? 4.5 : 0.0;
    }
    if (this.taillightPoolLight) {
      this.taillightPoolLight.intensity = isNight ? 1.5 : 0.0;
    }
    this.headlightMaterial.emissiveIntensity = isNight ? 6.0 : 1.5;
    this.taillightMaterial.emissiveIntensity = isNight ? 2.8 : 1.5;
  }

  reset(x = 0, y = 1.2, z = 0, rotY = 0) {
    this.chassisBody.position.set(x, y, z);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);

    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotY);
    this.chassisBody.quaternion.copy(q);

    this.carGroup.position.copy(this.chassisBody.position);
    this.carGroup.quaternion.copy(this.chassisBody.quaternion);
    this.bodyVisualGroup.rotation.set(0, 0, 0);

    this.currentSteer = 0;
    this.pitchTilt = 0;
    this.rollTilt = 0;
  }
}
