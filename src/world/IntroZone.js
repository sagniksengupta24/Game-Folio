import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class IntroZone {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initWelcomeLetters();
    this.initStartRamp();
    this.initTrafficCones();
    this.initBannerArch();
  }

  initWelcomeLetters() {
    // Large stylized 3D letters spelling "STUDIO NOVA"
    // Using procedural geometry for instant loading and crisp bevels
    this.letterMaterial = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.35,
      metalness: 0.2,
    });

    const subLetterMat = new THREE.MeshStandardMaterial({
      color: 0xff5e3a,
      roughness: 0.4,
    });

    // Simple pixel-based / block-based letter generator for 3D letters
    const font5x5 = {
      S: [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
      T: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
      U: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
      D: [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
      I: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
      O: [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
      N: [[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1],[1,0,0,1]],
      V: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
      A: [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    };

    const makeWord = (word, startX, startZ, scale, mat, isStaticPhysics = true) => {
      let curX = startX;
      for (const char of word) {
        if (char === ' ') {
          curX += scale * 3.5;
          continue;
        }
        const grid = font5x5[char];
        if (!grid) {
          curX += scale * 3.5;
          continue;
        }
        const rows = grid.length;
        const cols = grid[0].length;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1) {
              const geo = new THREE.BoxGeometry(scale, scale * 0.8, scale);
              const mesh = new THREE.Mesh(geo, mat);
              const posX = curX + c * scale;
              const posZ = startZ + r * scale;
              const posY = scale * 0.4;
              mesh.position.set(posX, posY, posZ);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              this.group.add(mesh);

              if (isStaticPhysics) {
                const shape = new CANNON.Box(
                  new CANNON.Vec3(scale * 0.5, scale * 0.4, scale * 0.5)
                );
                const body = new CANNON.Body({
                  type: CANNON.Body.STATIC,
                  position: new CANNON.Vec3(posX, posY, posZ),
                  shape: shape,
                  material: this.physicsWorld.propMaterial,
                });
                this.physicsWorld.world.addBody(body);
              }
            }
          }
        }
        curX += (cols + 1) * scale;
      }
    };

    // Position "STUDIO NOVA" in front of spawn pad
    makeWord('STUDIO NOVA', -12, -14, 0.6, this.letterMaterial, true);
  }

  initStartRamp() {
    // Jump ramp leading towards the center
    const rampWidth = 4.5;
    const rampLength = 6.0;
    const rampHeight = 1.6;

    const rampShape = new THREE.Shape();
    rampShape.moveTo(0, 0);
    rampShape.lineTo(rampLength, rampHeight);
    rampShape.lineTo(rampLength, 0);
    rampShape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: rampWidth,
      bevelEnabled: false,
    };

    const rampGeo = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
    // Center geometry
    rampGeo.translate(-rampLength * 0.5, 0, -rampWidth * 0.5);

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x3d424d,
      roughness: 0.6,
      metalness: 0.2,
    });

    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    rampMesh.position.set(0, 0, -5.5);
    rampMesh.rotation.y = -Math.PI / 2; // Facing towards -Z
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    this.group.add(rampMesh);

    // Neon edge trims on ramp
    const trimGeo = new THREE.BoxGeometry(0.12, 0.1, rampLength);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00c6ff,
      emissiveIntensity: 1.1,
    });
    const trimL = new THREE.Mesh(trimGeo, trimMat);
    trimL.position.set(rampWidth * 0.5, rampHeight * 0.5, 0);
    trimL.rotation.x = Math.atan2(rampHeight, rampLength);
    rampMesh.add(trimL);
    const trimR = trimL.clone();
    trimR.position.x = -rampWidth * 0.5;
    rampMesh.add(trimR);

    // Physics for ramp (inclined plane box)
    const angle = Math.atan2(rampHeight, rampLength);
    const boxLength = Math.hypot(rampLength, rampHeight);
    const rampBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(0, rampHeight * 0.45, -5.5),
      shape: new CANNON.Box(
        new CANNON.Vec3(rampWidth * 0.5, 0.15, boxLength * 0.5)
      ),
      material: this.physicsWorld.groundMaterial,
    });
    rampBody.quaternion.setFromEuler(-angle, 0, 0);
    this.physicsWorld.world.addBody(rampBody);
  }

  initTrafficCones() {
    // 8 Knockable traffic cones around starting area
    const conePositions = [
      { x: -3.5, z: 2.5 },
      { x: 3.5, z: 2.5 },
      { x: -4.5, z: -1.0 },
      { x: 4.5, z: -1.0 },
      { x: -5.0, z: -8.0 },
      { x: 5.0, z: -8.0 },
      { x: -2.0, z: 6.0 },
      { x: 2.0, z: 6.0 },
    ];

    const coneGeo = new THREE.ConeGeometry(0.24, 0.65, 14);
    coneGeo.translate(0, 0.35, 0);

    const baseGeo = new THREE.BoxGeometry(0.48, 0.06, 0.48);
    baseGeo.translate(0, 0.03, 0);

    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      roughness: 0.4,
    });

    this.coneStripeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });

    conePositions.forEach((pos) => {
      const coneGroup = new THREE.Group();

      const coneMesh = new THREE.Mesh(coneGeo, orangeMat);
      coneMesh.castShadow = true;
      const baseMesh = new THREE.Mesh(baseGeo, orangeMat);
      baseMesh.castShadow = true;

      // Reflective white stripe cylinder
      const stripeGeo = new THREE.CylinderGeometry(0.14, 0.19, 0.16, 14);
      stripeGeo.translate(0, 0.32, 0);
      const stripeMesh = new THREE.Mesh(stripeGeo, this.coneStripeMat);

      coneGroup.add(baseMesh, coneMesh, stripeMesh);
      this.scene.add(coneGroup);

      // Physics body
      const shape = new CANNON.Cylinder(0.05, 0.26, 0.7, 8);
      const body = new CANNON.Body({
        mass: 3.5, // light and easily knockable
        position: new CANNON.Vec3(pos.x, 0.35, pos.z),
        shape: shape,
        material: this.physicsWorld.propMaterial,
        linearDamping: 0.3,
        angularDamping: 0.4,
      });

      this.physicsWorld.addSyncObject(coneGroup, body);
      this.physicsWorld.registerCollisionSound(body, 1.5);
    });
  }

  initBannerArch() {
    // Start Archway with glowing welcome sign
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, 11.5);

    const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 4.2, 12);
    postGeo.translate(0, 2.1, 0);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x22262a,
      roughness: 0.5,
    });

    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.x = -4.0;
    postL.castShadow = true;
    const postR = postL.clone();
    postR.position.x = 4.0;
    archGroup.add(postL, postR);

    // Cross beam
    const beamGeo = new THREE.BoxGeometry(8.6, 0.35, 0.35);
    beamGeo.translate(0, 4.1, 0);
    const beam = new THREE.Mesh(beamGeo, postMat);
    beam.castShadow = true;
    archGroup.add(beam);

    // Banner Canvas with Instructions
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = '#ff5e3a';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 1014, 246);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WELCOME TO THE PLAYGROUND', 512, 80);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('WASD / ARROWS TO DRIVE  •  SPACE TO BRAKE', 512, 160);

    const bannerTexture = new THREE.CanvasTexture(canvas);
    bannerTexture.colorSpace = THREE.SRGBColorSpace;
    this.bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTexture,
      roughness: 0.3,
      emissive: 0x1e293b,
      emissiveIntensity: 0.4,
    });

    const bannerGeo = new THREE.PlaneGeometry(7.2, 1.8);
    bannerGeo.translate(0, 3.2, 0);
    const banner = new THREE.Mesh(bannerGeo, this.bannerMat);
    banner.castShadow = true;
    archGroup.add(banner);

    // Double sided for reverse view
    const bannerBack = banner.clone();
    bannerBack.rotation.y = Math.PI;
    archGroup.add(bannerBack);

    this.scene.add(archGroup);

    // Physics posts colliders
    const postShape = new CANNON.Cylinder(0.2, 0.2, 4.2, 8);
    const bodyL = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(-4.0, 2.1, 11.5),
      shape: postShape,
      material: this.physicsWorld.propMaterial,
    });
    const bodyR = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(4.0, 2.1, 11.5),
      shape: postShape,
      material: this.physicsWorld.propMaterial,
    });
    this.physicsWorld.world.addBody(bodyL);
    this.physicsWorld.world.addBody(bodyR);
  }

  setNightMode(isNight) {
    if (this.letterMaterial) {
      if (isNight) {
        this.letterMaterial.color.setHex(0x00f2fe);
        this.letterMaterial.emissive.setHex(0x00c6ff);
        this.letterMaterial.emissiveIntensity = 1.1;
      } else {
        this.letterMaterial.color.setHex(0x22262e);
        this.letterMaterial.emissive.setHex(0x000000);
        this.letterMaterial.emissiveIntensity = 0.0;
      }
      this.letterMaterial.needsUpdate = true;
    }

    if (this.coneStripeMat) {
      if (isNight) {
        this.coneStripeMat.emissive.setHex(0xffffff);
        this.coneStripeMat.emissiveIntensity = 1.4;
      } else {
        this.coneStripeMat.emissive.setHex(0x000000);
        this.coneStripeMat.emissiveIntensity = 0.0;
      }
      this.coneStripeMat.needsUpdate = true;
    }

    if (this.bannerMat) {
      this.bannerMat.emissiveIntensity = isNight ? 1.2 : 0.4;
      this.bannerMat.needsUpdate = true;
    }
  }
}
