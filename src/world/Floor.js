import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Floor {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.size = 140; // 140x140 tabletop arena
    this.initVisuals();
    this.initPhysics();
  }

  generateFloorTexture(isNight = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    if (!isNight) {
      // Base background: Soft warm sand / architectural drafting matte
      ctx.fillStyle = '#f3f0e6';
      ctx.fillRect(0, 0, 2048, 2048);

      // Subtle fine grid pattern
      ctx.strokeStyle = 'rgba(215, 210, 198, 0.45)';
      ctx.lineWidth = 2;
      const step = 64;
      for (let x = 0; x <= 2048; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2048);
        ctx.stroke();
      }
      for (let y = 0; y <= 2048; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
      }

      // Coarse accent grid
      ctx.strokeStyle = 'rgba(195, 190, 175, 0.6)';
      ctx.lineWidth = 4;
      for (let x = 0; x <= 2048; x += step * 4) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2048);
        ctx.stroke();
      }
      for (let y = 0; y <= 2048; y += step * 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
      }
    } else {
      // Dark Mode: Cyberpunk Midnight Grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 2048, 2048);

      // Fine cyan grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 2;
      const step = 64;
      for (let x = 0; x <= 2048; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2048);
        ctx.stroke();
      }
      for (let y = 0; y <= 2048; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
      }

      // Glowing violet coarse grid
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.lineWidth = 3.5;
      for (let x = 0; x <= 2048; x += step * 4) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2048);
        ctx.stroke();
      }
      for (let y = 0; y <= 2048; y += step * 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
      }
    }

    // Map coordinates helper
    const toPxX = (x) => 1024 + x * 14.6;
    const toPxY = (z) => 1024 + z * 14.6;

    // --- ZONE 1: SPAWN / START GRID ---
    const cx = toPxX(0);
    const cy = toPxY(0);

    ctx.strokeStyle = isNight ? '#ff5e3a' : '#ff5e3a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isNight ? '#ff7a59' : '#ff5e3a';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START / PADDOCK', cx, cy - 115);

    ctx.strokeStyle = isNight ? 'rgba(255, 94, 58, 0.5)' : 'rgba(255, 94, 58, 0.4)';
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- ZONE 2: PROJECTS ZONE (Top-Right: x ~ 35, z ~ -25) ---
    const projX = toPxX(35);
    const projY = toPxY(-25);
    ctx.fillStyle = isNight ? 'rgba(0, 242, 254, 0.12)' : 'rgba(0, 168, 255, 0.06)';
    ctx.fillRect(projX - 320, projY - 260, 640, 520);

    ctx.strokeStyle = isNight ? '#00f2fe' : '#00a8ff';
    ctx.lineWidth = 5;
    ctx.strokeRect(projX - 320, projY - 260, 640, 520);

    ctx.fillStyle = isNight ? '#38bdf8' : '#00a8ff';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('PROJECTS SHOWCASE // ARCHIVE', projX, projY - 225);

    // --- ZONE 3: SKILLS LAB (Top-Left: x ~ -35, z ~ -25) ---
    const skillX = toPxX(-35);
    const skillY = toPxY(-25);
    ctx.fillStyle = isNight ? 'rgba(224, 86, 253, 0.12)' : 'rgba(156, 39, 176, 0.06)';
    ctx.fillRect(skillX - 280, skillY - 260, 560, 520);

    ctx.strokeStyle = isNight ? '#e056fd' : '#ab47bc';
    ctx.lineWidth = 5;
    ctx.strokeRect(skillX - 280, skillY - 260, 560, 520);

    ctx.fillStyle = isNight ? '#f472b6' : '#ab47bc';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('SKILLS LAB // DOMINO RUN', skillX, skillY - 225);

    // --- ZONE 4: STUNT ARENA (Bottom-Left: x ~ -35, z ~ 35) ---
    const stuntX = toPxX(-35);
    const stuntY = toPxY(35);
    ctx.fillStyle = isNight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 171, 0, 0.06)';
    ctx.fillRect(stuntX - 300, stuntY - 250, 600, 500);

    ctx.strokeStyle = isNight ? '#fbbf24' : '#ffab00';
    ctx.lineWidth = 5;
    ctx.strokeRect(stuntX - 300, stuntY - 250, 600, 500);

    ctx.fillStyle = isNight ? '#fbbf24' : '#ffab00';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('STUNT ARENA // BOWLING & SPEEDWAY', stuntX, stuntY - 215);

    const chkW = 24;
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 === 0 ? (isNight ? '#f59e0b' : '#ffab00') : (isNight ? '#0b1120' : '#222');
      ctx.fillRect(stuntX - 192 + i * chkW, stuntY + 120, chkW, 20);
    }

    // --- ZONE 5: CONTACT OUTPOST (Bottom-Right: x ~ 35, z ~ 35) ---
    const contX = toPxX(35);
    const contY = toPxY(35);
    ctx.fillStyle = isNight ? 'rgba(52, 211, 153, 0.12)' : 'rgba(0, 230, 118, 0.06)';
    ctx.fillRect(contX - 280, contY - 250, 560, 500);

    ctx.strokeStyle = isNight ? '#34d399' : '#00e676';
    ctx.lineWidth = 5;
    ctx.strokeRect(contX - 280, contY - 250, 560, 500);

    ctx.fillStyle = isNight ? '#34d399' : '#00e676';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('CONTACT OUTPOST // CONNECT', contX, contY - 215);

    // Compass indicator at center
    ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.4)' : 'rgba(100, 110, 120, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 70);
    ctx.lineTo(cx, cy + 70);
    ctx.moveTo(cx - 70, cy);
    ctx.lineTo(cx + 70, cy);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }

  initVisuals() {
    // 1. Floor Ground Plane
    const floorGeo = new THREE.PlaneGeometry(this.size, this.size);
    floorGeo.rotateX(-Math.PI / 2);

    this.dayFloorTexture = this.generateFloorTexture(false);
    this.nightFloorTexture = this.generateFloorTexture(true);

    this.floorMat = new THREE.MeshStandardMaterial({
      map: this.dayFloorTexture,
      roughness: 0.8,
      metalness: 0.05,
    });

    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // 2. Tabletop Wooden Beveled Borders
    const borderThickness = 3.5;
    const borderHeight = 1.6;
    this.borderMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d35,
      roughness: 0.5,
      metalness: 0.2,
    });

    const createBorder = (w, h, d, x, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, this.borderMat);
      mesh.position.set(x, h * 0.5 - 0.2, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);
    };

    const half = this.size * 0.5;
    createBorder(this.size + borderThickness * 2, borderHeight, borderThickness, 0, -half - borderThickness * 0.5);
    createBorder(this.size + borderThickness * 2, borderHeight, borderThickness, 0, half + borderThickness * 0.5);
    createBorder(borderThickness, borderHeight, this.size, -half - borderThickness * 0.5, 0);
    createBorder(borderThickness, borderHeight, this.size, half + borderThickness * 0.5, 0);
  }

  initPhysics() {
    // 1. Static Ground Box (Solid top surface at y = 0 for accurate wheel raycasting)
    const groundShape = new CANNON.Box(
      new CANNON.Vec3(this.size * 0.5, 1.0, this.size * 0.5)
    );
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(0, -1.0, 0),
      shape: groundShape,
      material: this.physicsWorld.groundMaterial,
    });
    this.physicsWorld.world.addBody(groundBody);

    // 2. Perimeter Boundary Walls
    const wallHeight = 8;
    const wallThickness = 2;
    const half = this.size * 0.5;

    const createWall = (halfX, halfZ, posX, posZ) => {
      const shape = new CANNON.Box(new CANNON.Vec3(halfX, wallHeight * 0.5, halfZ));
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(posX, wallHeight * 0.5, posZ),
        shape: shape,
        material: this.physicsWorld.propMaterial,
      });
      this.physicsWorld.world.addBody(body);
    };

    createWall(half, wallThickness * 0.5, 0, -half);
    createWall(half, wallThickness * 0.5, 0, half);
    createWall(wallThickness * 0.5, half, -half, 0);
    createWall(wallThickness * 0.5, half, half, 0);
  }

  setNightMode(isNight) {
    this.floorMat.map = isNight ? this.nightFloorTexture : this.dayFloorTexture;
    this.floorMat.color.setHex(0xffffff);
    this.floorMat.roughness = isNight ? 0.35 : 0.8;
    this.floorMat.metalness = isNight ? 0.25 : 0.05;
    this.floorMat.needsUpdate = true;

    if (this.borderMat) {
      this.borderMat.color.setHex(isNight ? 0x111622 : 0x2b2d35);
      this.borderMat.needsUpdate = true;
    }
  }
}
