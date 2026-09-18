import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class ContactZone {
  constructor(scene, physicsWorld, onOpenContact) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.onOpenContact = onOpenContact;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Contact outpost center: x ~ 35, z ~ 35
    this.origin = { x: 35, z: 35 };

    this.interactiveObjects = [];
    this.socialPlatforms = [];

    this.initMailbox();
    this.initSocialPedestals();
    this.initContactSign();
  }

  initMailbox() {
    // 3D Classic Mailbox on a wooden post
    const mailboxGroup = new THREE.Group();
    mailboxGroup.position.set(this.origin.x - 6, 0, this.origin.z - 4);

    // Wooden post
    const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.2, 12);
    postGeo.translate(0, 1.1, 0);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.7,
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.castShadow = true;
    mailboxGroup.add(post);

    // Mailbox body: semi-cylinder + box
    const boxGeo = new THREE.BoxGeometry(1.2, 0.8, 1.8);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Cobalt Blue
      roughness: 0.3,
      metalness: 0.4,
    });
    const bodyMesh = new THREE.Mesh(boxGeo, boxMat);
    bodyMesh.position.y = 2.4;
    bodyMesh.castShadow = true;
    mailboxGroup.add(bodyMesh);

    // Curved roof
    const roofGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.8, 16, 1, false, 0, Math.PI);
    roofGeo.rotateZ(-Math.PI / 2);
    roofGeo.rotateY(Math.PI / 2);
    const roof = new THREE.Mesh(roofGeo, boxMat);
    roof.position.y = 2.8;
    roof.castShadow = true;
    mailboxGroup.add(roof);

    // Animated Red Flag
    this.flagPivot = new THREE.Group();
    this.flagPivot.position.set(0.65, 2.4, 0.4);

    const flagArmGeo = new THREE.BoxGeometry(0.04, 0.8, 0.08);
    flagArmGeo.translate(0, 0.4, 0);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
    });
    const flagArm = new THREE.Mesh(flagArmGeo, flagMat);

    const flagFinGeo = new THREE.BoxGeometry(0.05, 0.35, 0.45);
    flagFinGeo.translate(0, 0.7, 0.2);
    const flagFin = new THREE.Mesh(flagFinGeo, flagMat);

    this.flagPivot.add(flagArm, flagFin);
    mailboxGroup.add(this.flagPivot);

    // Click data
    mailboxGroup.userData = {
      isContact: true,
      action: 'modal',
    };
    bodyMesh.userData = mailboxGroup.userData;
    roof.userData = mailboxGroup.userData;

    this.interactiveObjects.push(bodyMesh, roof);
    this.mailboxGroup = mailboxGroup;
    this.scene.add(mailboxGroup);

    // Physics collider for post
    const colShape = new CANNON.Cylinder(0.4, 0.4, 3.2, 8);
    const colBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(this.origin.x - 6, 1.6, this.origin.z - 4),
      shape: colShape,
      material: this.physicsWorld.propMaterial,
    });
    this.physicsWorld.world.addBody(colBody);
  }

  createPedestalTexture(name, iconChar, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    // Outer neon ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.stroke();

    // Icon glyph
    ctx.fillStyle = color;
    ctx.font = '900 160px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconChar, 256, 220);

    // Name label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(name, 256, 360);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  initSocialPedestals() {
    this.pedestalRings = [];

    const socials = [
      {
        name: 'GITHUB',
        icon: '⌥',
        color: '#f8fafc',
        url: 'https://github.com',
        offset: { x: -4, z: 4 },
      },
      {
        name: 'TWITTER / X',
        icon: '𝕏',
        color: '#38bdf8',
        url: 'https://x.com',
        offset: { x: 4, z: 4 },
      },
      {
        name: 'LINKEDIN',
        icon: 'in',
        color: '#0284c7',
        url: 'https://linkedin.com',
        offset: { x: -4, z: 12 },
      },
      {
        name: 'EMAIL ME',
        icon: '✉',
        color: '#10b981',
        url: 'mailto:contact@example.com',
        action: 'modal',
        offset: { x: 4, z: 12 },
      },
    ];

    socials.forEach((item) => {
      const px = this.origin.x + item.offset.x;
      const pz = this.origin.z + item.offset.z;

      const group = new THREE.Group();
      group.position.set(px, 0, pz);

      // Pedestal column
      const colGeo = new THREE.CylinderGeometry(1.6, 1.8, 1.2, 24);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.3,
      });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.y = 0.6;
      col.castShadow = true;
      col.receiveShadow = true;
      group.add(col);

      // Top badge disc
      const discGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 24);
      const discMat = new THREE.MeshStandardMaterial({
        map: this.createPedestalTexture(item.name, item.icon, item.color),
        roughness: 0.2,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.y = 1.25;
      group.add(disc);

      // Floating ring
      const ringGeo = new THREE.TorusGeometry(1.9, 0.08, 12, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        emissive: new THREE.Color(item.color),
        emissiveIntensity: 1.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.8;
      group.add(ring);
      this.pedestalRings.push(ringMat);

      group.userData = {
        isSocial: true,
        social: item,
      };
      col.userData = group.userData;
      disc.userData = group.userData;

      this.interactiveObjects.push(col, disc);
      this.socialPlatforms.push({
        item,
        group,
        pos: new THREE.Vector3(px, 0, pz),
        ring,
      });

      this.scene.add(group);

      // Physics
      const shape = new CANNON.Cylinder(1.6, 1.8, 1.2, 12);
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(px, 0.6, pz),
        shape: shape,
        material: this.physicsWorld.propMaterial,
      });
      this.physicsWorld.world.addBody(body);
    });
  }

  initContactSign() {
    // 3D Billboard with "SAY HELLO // GET IN TOUCH"
    const signGroup = new THREE.Group();
    signGroup.position.set(this.origin.x, 0, this.origin.z - 10);

    const postGeo = new THREE.BoxGeometry(0.3, 4.0, 0.3);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
    });
    const p1 = new THREE.Mesh(postGeo, postMat);
    p1.position.set(-3.5, 2.0, 0);
    p1.castShadow = true;
    const p2 = p1.clone();
    p2.position.x = 3.5;
    signGroup.add(p1, p2);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 384);

    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 1012, 372);

    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STATION // TRANSMIT', 512, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 60px sans-serif';
    ctx.fillText("LET'S BUILD TOGETHER", 512, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 30px sans-serif';
    ctx.fillText('DRIVE UP TO THE MAILBOX OR CLICK TO MESSAGE', 512, 270);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.boardMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.2,
      emissive: 0x064e3b,
      emissiveIntensity: 0.3,
    });

    const boardGeo = new THREE.BoxGeometry(7.8, 2.8, 0.2);
    const board = new THREE.Mesh(boardGeo, this.boardMat);
    board.position.set(0, 3.2, 0);
    board.castShadow = true;
    signGroup.add(board);

    this.scene.add(signGroup);

    // Physics
    const boardShape = new CANNON.Box(new CANNON.Vec3(4.0, 2.0, 0.2));
    const boardBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(this.origin.x, 3.2, this.origin.z - 10),
      shape: boardShape,
      material: this.physicsWorld.propMaterial,
    });
    this.physicsWorld.world.addBody(boardBody);
  }

  setNightMode(isNight) {
    if (this.pedestalRings) {
      this.pedestalRings.forEach((mat) => {
        mat.emissiveIntensity = isNight ? 3.4 : 1.8;
        mat.needsUpdate = true;
      });
    }
    if (this.boardMat) {
      this.boardMat.emissiveIntensity = isNight ? 0.95 : 0.3;
      this.boardMat.needsUpdate = true;
    }
  }

  update(dt, carPos) {
    // Animate mailbox flag if car is nearby
    const mailboxPos = new THREE.Vector3(this.origin.x - 6, 0, this.origin.z - 4);
    const distToMailbox = carPos.distanceTo(mailboxPos);

    if (distToMailbox < 6.5) {
      // Raise flag
      this.flagPivot.rotation.z = THREE.MathUtils.lerp(
        this.flagPivot.rotation.z,
        Math.PI * 0.5,
        6 * dt
      );
    } else {
      // Lower flag
      this.flagPivot.rotation.z = THREE.MathUtils.lerp(
        this.flagPivot.rotation.z,
        0,
        4 * dt
      );
    }

    // Animate floating rings on social pedestals
    const time = performance.now() * 0.003;
    this.socialPlatforms.forEach((p, idx) => {
      p.ring.position.y = 0.8 + Math.sin(time + idx) * 0.15;
    });

    // Check proximity to social platforms
    for (const p of this.socialPlatforms) {
      if (carPos.distanceTo(p.pos) < 3.2) {
        return p.item;
      }
    }

    if (distToMailbox < 4.5) {
      return { isMailbox: true, name: 'Contact Mailbox' };
    }

    return null;
  }
}
