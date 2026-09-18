import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class EnvironmentProps {
  constructor(scene, physicsWorld, shadowDecals) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.shadowDecals = shadowDecals;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initWoodenRulerBridge();
    this.initCoffeeMug();
    this.initDraftingPencils();
    this.initNotebookTerraces();
    this.initPottedPlants();
    this.initDeskLamps();
  }

  createRulerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Natural birch wood grain background
    ctx.fillStyle = '#e8caa4';
    ctx.fillRect(0, 0, 1024, 128);

    // Fine wood grain streaks
    ctx.fillStyle = 'rgba(180, 130, 85, 0.15)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(0, Math.random() * 128, 1024, Math.random() * 4 + 1);
    }

    // Ruler measurement markings
    ctx.fillStyle = '#261b11';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';

    for (let x = 30; x <= 1000; x += 15) {
      const isMajor = (x - 30) % 60 === 0;
      const tickH = isMajor ? 36 : 18;
      ctx.fillRect(x, 0, 2.5, tickH);

      if (isMajor) {
        const num = Math.round((x - 30) / 60);
        ctx.fillText(num.toString(), x, 62);
      }
    }

    // Metallic center inset strip
    ctx.fillStyle = 'rgba(210, 220, 230, 0.5)';
    ctx.fillRect(0, 100, 1024, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  initWoodenRulerBridge() {
    // A giant architect's ruler (length 22, width 3.6, height 0.3)
    // Positioned as an elevated ramp connecting the central area to the northern terrace
    const rulerLength = 22.0;
    const rulerWidth = 3.6;
    const rulerThickness = 0.32;

    const rulerGeo = new THREE.BoxGeometry(rulerWidth, rulerThickness, rulerLength);
    const rulerMat = new THREE.MeshStandardMaterial({
      map: this.createRulerTexture(),
      roughness: 0.45,
      metalness: 0.1,
    });

    const rulerMesh = new THREE.Mesh(rulerGeo, rulerMat);
    const posX = 0;
    const posZ = -22;
    const posY = 1.4;
    const tiltAngle = 0.08; // Gentle incline

    rulerMesh.position.set(posX, posY, posZ);
    rulerMesh.rotation.x = tiltAngle;
    rulerMesh.castShadow = true;
    rulerMesh.receiveShadow = true;
    this.group.add(rulerMesh);

    // Support blocks underneath
    const supportMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
    });
    const supGeo = new THREE.BoxGeometry(rulerWidth * 1.05, 1.2, 1.2);
    const support = new THREE.Mesh(supGeo, supportMat);
    support.position.set(posX, 0.6, posZ - 8);
    support.castShadow = true;
    this.group.add(support);

    // Contact shadow
    if (this.shadowDecals) {
      this.shadowDecals.addRectDecal(posX, posZ, rulerWidth * 1.3, rulerLength * 1.1, 0, 0.45);
    }

    // Physics body for ruler
    const rulerShape = new CANNON.Box(
      new CANNON.Vec3(rulerWidth * 0.5, rulerThickness * 0.5, rulerLength * 0.5)
    );
    const rulerBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(posX, posY, posZ),
      shape: rulerShape,
      material: this.physicsWorld.groundMaterial,
    });
    rulerBody.quaternion.setFromEuler(tiltAngle, 0, 0);
    this.physicsWorld.world.addBody(rulerBody);
  }

  initCoffeeMug() {
    // Ceramic coffee mug obstacle at x ~ 8, z ~ 22
    const mugGroup = new THREE.Group();
    const mugX = 12;
    const mugZ = 20;
    mugGroup.position.set(mugX, 0, mugZ);

    const outerRadius = 2.4;
    const mugHeight = 3.6;

    // Ceramic body
    const bodyGeo = new THREE.CylinderGeometry(outerRadius, outerRadius * 0.95, mugHeight, 32);
    bodyGeo.translate(0, mugHeight * 0.5, 0);
    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xfdfdfd,
      roughness: 0.15,
      metalness: 0.05,
    });
    const mugMesh = new THREE.Mesh(bodyGeo, ceramicMat);
    mugMesh.castShadow = true;
    mugMesh.receiveShadow = true;
    mugGroup.add(mugMesh);

    // Dark espresso liquid surface
    const coffeeGeo = new THREE.CylinderGeometry(outerRadius * 0.88, outerRadius * 0.88, 0.1, 24);
    coffeeGeo.translate(0, mugHeight - 0.4, 0);
    const coffeeMat = new THREE.MeshStandardMaterial({
      color: 0x1c1008,
      roughness: 0.1,
      metalness: 0.2,
    });
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
    mugGroup.add(coffee);

    // Handle (torus curve)
    const handleGeo = new THREE.TorusGeometry(1.2, 0.3, 16, 24, Math.PI);
    handleGeo.rotateY(Math.PI / 2);
    handleGeo.rotateZ(Math.PI / 2);
    const handle = new THREE.Mesh(handleGeo, ceramicMat);
    handle.position.set(outerRadius + 0.6, mugHeight * 0.5, 0);
    handle.castShadow = true;
    mugGroup.add(handle);

    this.group.add(mugGroup);

    // Contact shadow
    if (this.shadowDecals) {
      this.shadowDecals.addRadialDecal(mugX, mugZ, outerRadius * 1.5, outerRadius * 1.5, 0.6);
    }

    // Physics body
    const shape = new CANNON.Cylinder(outerRadius, outerRadius, mugHeight, 16);
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(mugX, mugHeight * 0.5, mugZ),
      shape: shape,
      material: this.physicsWorld.propMaterial,
    });
    this.physicsWorld.world.addBody(body);
  }

  initDraftingPencils() {
    // Drafting pencils and highlighters scattered as roadside chicane barriers
    const pencils = [
      { x: -14, z: 8, rotY: 0.45, color: '#f59e0b', length: 10, isHex: true },
      { x: -18, z: 12, rotY: -0.3, color: '#06b6d4', length: 9, isHex: true },
      { x: 18, z: -8, rotY: 1.1, color: '#10b981', length: 8, isHex: false },
      { x: 22, z: 6, rotY: -0.85, color: '#ec4899', length: 9, isHex: false },
    ];

    pencils.forEach((p) => {
      const radius = 0.38;
      const pencilGroup = new THREE.Group();
      pencilGroup.position.set(p.x, radius, p.z);
      pencilGroup.rotation.y = p.rotY;

      // Pencil shaft
      const shaftGeo = new THREE.CylinderGeometry(radius, radius, p.length, p.isHex ? 6 : 16);
      shaftGeo.rotateX(Math.PI / 2);
      const shaftMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color),
        roughness: 0.35,
      });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.castShadow = true;
      pencilGroup.add(shaft);

      // Pink eraser with gold ferrule on one end
      const ferruleGeo = new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.7, 16);
      ferruleGeo.rotateX(Math.PI / 2);
      const ferruleMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // gold
        metalness: 0.8,
        roughness: 0.2,
      });
      const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
      ferrule.position.z = -p.length * 0.5 - 0.35;
      pencilGroup.add(ferrule);

      const eraserGeo = new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, 0.8, 16);
      eraserGeo.rotateX(Math.PI / 2);
      const eraserMat = new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        roughness: 0.8,
      });
      const eraser = new THREE.Mesh(eraserGeo, eraserMat);
      eraser.position.z = -p.length * 0.5 - 1.0;
      pencilGroup.add(eraser);

      // Sharpened cone tip on other end
      const tipGeo = new THREE.ConeGeometry(radius, 1.2, 16);
      tipGeo.rotateX(-Math.PI / 2);
      const woodTipMat = new THREE.MeshStandardMaterial({
        color: 0xecd9b9,
        roughness: 0.6,
      });
      const tip = new THREE.Mesh(tipGeo, woodTipMat);
      tip.position.z = p.length * 0.5 + 0.6;
      pencilGroup.add(tip);

      this.group.add(pencilGroup);

      // Contact shadow
      if (this.shadowDecals) {
        this.shadowDecals.addRectDecal(p.x, p.z, radius * 3, p.length + 2, p.rotY, 0.45);
      }

      // Physics body
      const shape = new CANNON.Box(
        new CANNON.Vec3(radius, radius, (p.length + 2) * 0.5)
      );
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(p.x, radius, p.z),
        shape: shape,
        material: this.physicsWorld.propMaterial,
      });
      body.quaternion.setFromEuler(0, p.rotY, 0);
      this.physicsWorld.world.addBody(body);
    });
  }

  initNotebookTerraces() {
    // Hardcover sketchbooks forming elevated drivable plateaus
    const books = [
      { x: -28, z: -6, w: 10, l: 14, h: 1.0, color: '#1e293b', rotY: 0.15 },
      { x: -26, z: -5, w: 8.5, l: 12, h: 1.8, color: '#991b1b', rotY: 0.05 },
    ];

    books.forEach((b) => {
      const bookGeo = new THREE.BoxGeometry(b.w, b.h, b.l);
      const coverMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.color),
        roughness: 0.5,
      });
      const pagesMat = new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        roughness: 0.8,
      });

      // Simple multi-material or box with cover color
      const bookMesh = new THREE.Mesh(bookGeo, coverMat);
      bookMesh.position.set(b.x, b.h * 0.5, b.z);
      bookMesh.rotation.y = b.rotY;
      bookMesh.castShadow = true;
      bookMesh.receiveShadow = true;
      this.group.add(bookMesh);

      // Bookmark ribbon
      const ribbonGeo = new THREE.BoxGeometry(0.5, 0.04, b.l * 0.7);
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.3,
      });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.position.set(b.x, b.h + 0.02, b.z);
      ribbon.rotation.y = b.rotY;
      this.group.add(ribbon);

      // Contact shadow
      if (this.shadowDecals) {
        this.shadowDecals.addRectDecal(b.x, b.z, b.w * 1.15, b.l * 1.15, b.rotY, 0.5);
      }

      // Physics platform
      const shape = new CANNON.Box(
        new CANNON.Vec3(b.w * 0.5, b.h * 0.5, b.l * 0.5)
      );
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(b.x, b.h * 0.5, b.z),
        shape: shape,
        material: this.physicsWorld.groundMaterial,
      });
      body.quaternion.setFromEuler(0, b.rotY, 0);
      this.physicsWorld.world.addBody(body);
    });
  }

  initPottedPlants() {
    // Stylized low-poly faceted succulent plants in terra-cotta clay pots
    const plantLocations = [
      { x: -50, z: -45, scale: 1.3 },
      { x: 50, z: -45, scale: 1.4 },
      { x: -50, z: 45, scale: 1.2 },
      { x: 50, z: 45, scale: 1.3 },
      { x: 0, z: -52, scale: 1.5 },
    ];

    const potMat = new THREE.MeshStandardMaterial({
      color: 0xc25e36, // Terra cotta
      roughness: 0.6,
    });
    const plantMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Fresh succulent green
      roughness: 0.35,
      flatShading: true,
    });

    plantLocations.forEach((loc) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(loc.x, 0, loc.z);
      plantGroup.scale.setScalar(loc.scale);

      // Pot
      const potGeo = new THREE.CylinderGeometry(1.6, 1.1, 2.2, 14);
      potGeo.translate(0, 1.1, 0);
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.castShadow = true;
      pot.receiveShadow = true;
      plantGroup.add(pot);

      // Low poly succulent rosettes (leaves)
      const leavesCount = 8;
      for (let i = 0; i < leavesCount; i++) {
        const angle = (i / leavesCount) * Math.PI * 2;
        const leafGeo = new THREE.ConeGeometry(0.55, 2.0, 5);
        leafGeo.translate(0, 1.0, 0);
        leafGeo.rotateX(0.5);
        const leaf = new THREE.Mesh(leafGeo, plantMat);
        leaf.position.set(Math.sin(angle) * 0.5, 2.0, Math.cos(angle) * 0.5);
        leaf.rotation.y = angle;
        leaf.castShadow = true;
        plantGroup.add(leaf);
      }

      this.group.add(plantGroup);

      // Contact shadow
      if (this.shadowDecals) {
        this.shadowDecals.addRadialDecal(loc.x, loc.z, 2.4 * loc.scale, 2.4 * loc.scale, 0.5);
      }

      // Physics body
      const shape = new CANNON.Cylinder(1.6 * loc.scale, 1.2 * loc.scale, 2.2 * loc.scale, 8);
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(loc.x, 1.1 * loc.scale, loc.z),
        shape: shape,
        material: this.physicsWorld.propMaterial,
      });
      this.physicsWorld.world.addBody(body);
    });
  }

  initDeskLamps() {
    // 2 Architectural gooseneck task lamps casting warm pools of light
    const lamps = [
      { x: -18, z: -40, rotY: 0.6 },
      { x: 20, z: 42, rotY: -2.4 },
    ];

    this.lampLights = [];

    lamps.forEach((lamp) => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(lamp.x, 0, lamp.z);
      lampGroup.rotation.y = lamp.rotY;

      const metalMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.3,
        metalness: 0.7,
      });

      // Heavy base
      const baseGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.4, 24);
      baseGeo.translate(0, 0.2, 0);
      const base = new THREE.Mesh(baseGeo, metalMat);
      base.castShadow = true;
      lampGroup.add(base);

      // Stem (curved segments)
      const stem1Geo = new THREE.CylinderGeometry(0.12, 0.12, 6.0, 12);
      stem1Geo.translate(0, 3.0, 0);
      stem1Geo.rotateZ(0.2);
      const stem1 = new THREE.Mesh(stem1Geo, metalMat);
      stem1.castShadow = true;
      lampGroup.add(stem1);

      // Shade / Cone
      const shadeGeo = new THREE.ConeGeometry(1.4, 2.2, 16, 1, true);
      shadeGeo.rotateX(Math.PI * 0.75);
      const shadeMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
        metalness: 0.8,
        side: THREE.DoubleSide,
      });
      const shade = new THREE.Mesh(shadeGeo, shadeMat);
      shade.position.set(1.5, 6.2, 0);
      shade.castShadow = true;
      lampGroup.add(shade);

      // Bulb (emissive)
      const bulbGeo = new THREE.SphereGeometry(0.4, 12, 12);
      this.bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff1aa,
        emissive: 0xffd56b,
        emissiveIntensity: 2.5,
      });
      const bulb = new THREE.Mesh(bulbGeo, this.bulbMat);
      bulb.position.set(1.5, 5.8, 0);
      lampGroup.add(bulb);

      // Warm local PointLight
      const light = new THREE.PointLight(0xffe8ad, 1.8, 28, 1.2);
      light.position.set(1.5, 5.5, 0);
      lampGroup.add(light);
      this.lampLights.push(light);

      this.group.add(lampGroup);

      // Contact shadow
      if (this.shadowDecals) {
        this.shadowDecals.addRadialDecal(lamp.x, lamp.z, 2.6, 2.6, 0.55);
      }

      // Physics
      const shape = new CANNON.Cylinder(1.8, 2.0, 1.0, 12);
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(lamp.x, 0.5, lamp.z),
        shape: shape,
        material: this.physicsWorld.propMaterial,
      });
      this.physicsWorld.world.addBody(body);
    });
  }

  setNightMode(isNight) {
    this.lampLights.forEach((light) => {
      light.intensity = isNight ? 4.2 : 1.8;
      light.distance = isNight ? 40 : 28;
    });
    if (this.bulbMat) {
      this.bulbMat.emissiveIntensity = isNight ? 5.2 : 2.5;
    }
  }
}
