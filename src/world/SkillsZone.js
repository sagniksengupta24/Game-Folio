import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class SkillsZone {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.dominoes = [];
    this.skillBlocks = [];

    // Center of skills zone: x ~ -35, z ~ -25
    this.origin = { x: -35, z: -25 };

    this.initDominoRun();
    this.initSkillBlocks();
  }

  createDominoTexture(index, total) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Domino face gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Dark border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 500);

    // Center dividing line
    ctx.beginPath();
    ctx.moveTo(20, 256);
    ctx.lineTo(236, 256);
    ctx.stroke();

    // Domino dots
    ctx.fillStyle = index === 0 ? '#ff5e3a' : '#0ea5e9';
    const drawDot = (cx, cy) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
    };

    drawDot(128, 128);
    drawDot(80, 380);
    drawDot(176, 380);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  initDominoRun() {
    // 16 Dominoes arranged in a dynamic S-curve track
    const count = 16;
    const dominoWidth = 0.8;
    const dominoHeight = 1.8;
    const dominoDepth = 0.26;

    const geo = new THREE.BoxGeometry(dominoWidth, dominoHeight, dominoDepth);
    this.dominoSideMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });

    this.dominoTriggerMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30, // Bright red for first trigger domino
      roughness: 0.25,
    });

    this.dominoInitialTransforms = [];

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      // S-curve trajectory
      const angle = progress * Math.PI * 1.3;
      const radius = 9.0;
      const x = this.origin.x - 6.0 + Math.sin(angle) * radius;
      const z = this.origin.z - 8.0 + progress * 16.0;

      // Rotation tangent to the curve
      const rotY = angle + Math.PI * 0.5;

      const mat = i === 0 ? this.dominoTriggerMat : this.dominoSideMat;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const shape = new CANNON.Box(
        new CANNON.Vec3(dominoWidth * 0.5, dominoHeight * 0.5, dominoDepth * 0.5)
      );

      const body = new CANNON.Body({
        mass: 4.0,
        position: new CANNON.Vec3(x, dominoHeight * 0.5 + 0.02, z),
        shape: shape,
        material: this.physicsWorld.propMaterial,
        linearDamping: 0.2,
        angularDamping: 0.3,
      });

      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotY);

      this.physicsWorld.addSyncObject(mesh, body);
      this.physicsWorld.registerCollisionSound(body, 1.2);

      this.dominoes.push({ mesh, body });
      this.dominoInitialTransforms.push({
        pos: new CANNON.Vec3(x, dominoHeight * 0.5 + 0.02, z),
        rotY: rotY,
      });
    }
  }

  createSkillTexture(skillName, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 512, 512);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 496, 496);

    // Inner panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(32, 32, 448, 448);

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = skillName.split(' ');
    if (words.length === 1) {
      ctx.fillText(words[0], 256, 256);
    } else {
      ctx.fillText(words[0], 256, 220);
      ctx.fillText(words.slice(1).join(' '), 256, 290);
    }

    // Corner tech dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(60, 60, 12, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  initSkillBlocks() {
    this.blockMaterials = [];

    // 8 Stackable tech cubes in a 2-tier pyramid
    const skills = [
      { name: 'Three.js', color: '#000000' },
      { name: 'WebGL', color: '#990000' },
      { name: 'GLSL', color: '#558b2f' },
      { name: 'TypeScript', color: '#007acc' },
      { name: 'Cannon-es', color: '#d84315' },
      { name: 'React', color: '#00838f' },
      { name: 'Web Audio', color: '#6a1b9a' },
      { name: 'Next.js', color: '#111827' },
    ];

    const blockSize = 1.5;
    const boxGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

    const pyramidPos = [
      // Base row 1 (4 blocks)
      { x: -1.8, y: 0, z: 0, idx: 0 },
      { x: -0.6, y: 0, z: 0, idx: 1 },
      { x: 0.6, y: 0, z: 0, idx: 2 },
      { x: 1.8, y: 0, z: 3, idx: 3 },
      // Base row 2 (3 blocks)
      { x: -1.2, y: 0, z: 1.6, idx: 4 },
      { x: 0.2, y: 0, z: 1.6, idx: 5 },
      // Top row (2 blocks)
      { x: -0.6, y: 1, z: 0.8, idx: 6 },
      { x: 0.6, y: 1, z: 0.8, idx: 7 },
    ];

    this.blockInitialTransforms = [];

    pyramidPos.forEach((p, i) => {
      const skill = skills[i % skills.length];
      const mat = new THREE.MeshStandardMaterial({
        map: this.createSkillTexture(skill.name, skill.color),
        roughness: 0.4,
        metalness: 0.1,
      });
      this.blockMaterials.push({ mat, color: skill.color });

      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const posX = this.origin.x + 8.0 + p.x * 1.6;
      const posY = blockSize * 0.5 + p.y * (blockSize + 0.05);
      const posZ = this.origin.z + p.z * 1.6;

      const shape = new CANNON.Box(
        new CANNON.Vec3(blockSize * 0.5, blockSize * 0.5, blockSize * 0.5)
      );
      const body = new CANNON.Body({
        mass: 6.0,
        position: new CANNON.Vec3(posX, posY, posZ),
        shape: shape,
        material: this.physicsWorld.propMaterial,
        linearDamping: 0.25,
        angularDamping: 0.35,
      });

      this.physicsWorld.addSyncObject(mesh, body);
      this.physicsWorld.registerCollisionSound(body, 1.8);

      this.skillBlocks.push({ mesh, body });
      this.blockInitialTransforms.push({
        pos: new CANNON.Vec3(posX, posY, posZ),
      });
    });
  }

  setNightMode(isNight) {
    if (this.dominoTriggerMat) {
      this.dominoTriggerMat.emissive.setHex(isNight ? 0xff3b30 : 0x000000);
      this.dominoTriggerMat.emissiveIntensity = isNight ? 1.6 : 0;
      this.dominoTriggerMat.needsUpdate = true;
    }

    if (this.dominoSideMat) {
      this.dominoSideMat.emissive.setHex(isNight ? 0x0ea5e9 : 0x000000);
      this.dominoSideMat.emissiveIntensity = isNight ? 0.35 : 0;
      this.dominoSideMat.needsUpdate = true;
    }

    if (this.blockMaterials) {
      this.blockMaterials.forEach(({ mat, color }) => {
        mat.emissive.set(isNight ? color : 0x000000);
        mat.emissiveIntensity = isNight ? 0.7 : 0;
        mat.needsUpdate = true;
      });
    }
  }

  resetAll() {
    // Reset dominoes
    this.dominoes.forEach((item, idx) => {
      const t = this.dominoInitialTransforms[idx];
      item.body.position.copy(t.pos);
      item.body.velocity.set(0, 0, 0);
      item.body.angularVelocity.set(0, 0, 0);
      item.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), t.rotY);
    });

    // Reset skill blocks
    this.skillBlocks.forEach((item, idx) => {
      const t = this.blockInitialTransforms[idx];
      item.body.position.copy(t.pos);
      item.body.velocity.set(0, 0, 0);
      item.body.angularVelocity.set(0, 0, 0);
      item.body.quaternion.set(0, 0, 0, 1);
    });
  }
}
