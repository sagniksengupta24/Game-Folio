import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class ProjectsZone {
  constructor(scene, physicsWorld, onSelectProject) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.onSelectProject = onSelectProject;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.interactiveObjects = [];
    this.projectKiosks = [];

    this.projectsData = [
      {
        id: 'hyperdrive',
        title: 'HyperDrive 3D',
        category: 'Simulation / WebGL',
        year: '2025',
        description:
          'High-performance browser vehicle physics engine and racing playground built with Three.js and Cannon-es. Features realistic suspension telemetry, dynamic tire decals, and procedural audio synthesis.',
        tags: ['Three.js', 'Cannon-es', 'GLSL', 'Web Audio API'],
        demoUrl: 'https://github.com',
        githubUrl: 'https://github.com',
        color: '#ff5e3a',
        pos: { x: 24, z: -18 },
        rotY: Math.PI * 0.25,
      },
      {
        id: 'neuralcanvas',
        title: 'Neural Canvas',
        category: 'Generative AI / Shaders',
        year: '2025',
        description:
          'Node-based generative visual synthesis workbench. Combines real-time GLSL post-processing pipelines with diffusion latent vector manipulation, running at a smooth 60fps in the browser.',
        tags: ['WebGL', 'GLSL Shaders', 'TypeScript', 'WebGPU'],
        demoUrl: 'https://github.com',
        githubUrl: 'https://github.com',
        color: '#00c6ff',
        pos: { x: 44, z: -18 },
        rotY: -Math.PI * 0.25,
      },
      {
        id: 'solaria',
        title: 'Solaria Engine',
        category: 'Astrophysics Simulation',
        year: '2024',
        description:
          'High-precision gravitational N-body solar system simulator. Simulates thousands of asteroids and planetary bodies simultaneously using Web Workers and compute shaders.',
        tags: ['Three.js', 'Web Workers', 'Compute', 'Math'],
        demoUrl: 'https://github.com',
        githubUrl: 'https://github.com',
        color: '#ab47bc',
        pos: { x: 24, z: -34 },
        rotY: Math.PI * 0.35,
      },
      {
        id: 'aetheria',
        title: 'Aetheria OS',
        category: 'Spatial UI / Web Platform',
        year: '2024',
        description:
          'Futuristic spatial desktop environment featuring glassmorphism surfaces, physics-driven window physics, live system monitors, and custom micro-audio feedback.',
        tags: ['Vanilla JS', 'Modern CSS', 'Audio Synth', 'WebSockets'],
        demoUrl: 'https://github.com',
        githubUrl: 'https://github.com',
        color: '#00e676',
        pos: { x: 44, z: -34 },
        rotY: -Math.PI * 0.35,
      },
    ];

    this.initKiosks();
  }

  createScreenTexture(project) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    // Cyber screen gradient
    const grad = ctx.createLinearGradient(0, 0, 1024, 640);
    grad.addColorStop(0, '#0a0e17');
    grad.addColorStop(1, '#161f30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 640);

    // Glowing border
    ctx.strokeStyle = project.color;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 1004, 620);

    // Tech Grid pattern inside screen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    for (let x = 40; x < 1000; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 40; y < 600; y += 60) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(984, y);
      ctx.stroke();
    }

    // Header badge
    ctx.fillStyle = project.color;
    ctx.fillRect(50, 50, 220, 48);
    ctx.fillStyle = '#0a0e17';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`PROJECT // ${project.year}`, 65, 82);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(project.title, 50, 180);

    // Category
    ctx.fillStyle = project.color;
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(project.category.toUpperCase(), 50, 235);

    // Description lines
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 24px sans-serif';
    const words = project.description.split(' ');
    let line = '';
    let curY = 300;
    for (let i = 0; i < words.length && curY < 480; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > 880) {
        ctx.fillText(line, 50, curY);
        line = words[i] + ' ';
        curY += 36;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, 50, curY);

    // Tags list pills at bottom
    let tagX = 50;
    project.tags.forEach((tag) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      const w = ctx.measureText(tag).width + 36;
      ctx.fillRect(tagX, 520, w, 44);
      ctx.strokeStyle = project.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(tagX, 520, w, 44);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(tag, tagX + 18, 550);
      tagX += w + 20;
    });

    // Inspect prompt
    ctx.fillStyle = project.color;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[ CLICK OR ENTER TO EXPAND ]', 960, 82);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  initKiosks() {
    this.kioskLights = [];
    this.screenMaterials = [];
    this.ringMaterials = [];

    const kioskStandMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.5,
    });

    this.projectsData.forEach((project) => {
      const kioskGroup = new THREE.Group();
      kioskGroup.position.set(project.pos.x, 0, project.pos.z);
      kioskGroup.rotation.y = project.rotY;

      // 1. Pedestal Base
      const baseGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.5, 32);
      const base = new THREE.Mesh(baseGeo, kioskStandMat);
      base.position.y = 0.25;
      base.castShadow = true;
      base.receiveShadow = true;
      kioskGroup.add(base);

      // Glowing accent ring on base
      const ringGeo = new THREE.TorusGeometry(2.5, 0.06, 12, 32);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(project.color),
        emissive: new THREE.Color(project.color),
        emissiveIntensity: 2.0,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.51;
      kioskGroup.add(ring);
      this.ringMaterials.push(ringMat);

      // 2. Vertical Column Pillar
      const pillarGeo = new THREE.BoxGeometry(0.6, 2.6, 0.4);
      const pillar = new THREE.Mesh(pillarGeo, kioskStandMat);
      pillar.position.y = 1.6;
      pillar.castShadow = true;
      kioskGroup.add(pillar);

      // 3. Screen Bezel & Screen
      const screenWidth = 4.8;
      const screenHeight = 3.0;

      const bezelGeo = new THREE.BoxGeometry(screenWidth + 0.3, screenHeight + 0.3, 0.25);
      const bezel = new THREE.Mesh(bezelGeo, kioskStandMat);
      bezel.position.y = 4.0;
      bezel.castShadow = true;
      kioskGroup.add(bezel);

      const screenGeo = new THREE.PlaneGeometry(screenWidth, screenHeight);
      const screenMat = new THREE.MeshStandardMaterial({
        map: this.createScreenTexture(project),
        roughness: 0.2,
        emissive: 0x111827,
        emissiveIntensity: 0.3,
      });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 4.0, 0.13);
      kioskGroup.add(screen);
      this.screenMaterials.push({ mat: screenMat, colorHex: project.color });

      // Local atmospheric kiosk spot glow (illuminates parking bay at night)
      const kioskLight = new THREE.PointLight(new THREE.Color(project.color), 0, 18, 1.4);
      kioskLight.position.set(0, 3.5, 2.5);
      kioskGroup.add(kioskLight);
      this.kioskLights.push(kioskLight);

      // 4. Floating Hologram Badge above screen
      const badgeGeo = new THREE.BoxGeometry(2.4, 0.4, 0.08);
      const badge = new THREE.Mesh(badgeGeo, ringMat);
      badge.position.set(0, 5.8, 0);
      kioskGroup.add(badge);

      // 5. Parking Bay Outline on the floor
      const bayOutlineGeo = new THREE.BufferGeometry();
      const bayPoints = [
        new THREE.Vector3(-3.0, 0.03, 1.0),
        new THREE.Vector3(-3.0, 0.03, 6.0),
        new THREE.Vector3(3.0, 0.03, 6.0),
        new THREE.Vector3(3.0, 0.03, 1.0),
      ];
      bayOutlineGeo.setFromPoints(bayPoints);
      const bayLineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(project.color),
        linewidth: 3,
      });
      const bayLine = new THREE.Line(bayOutlineGeo, bayLineMat);
      kioskGroup.add(bayLine);

      // Attach metadata for click raycasting
      kioskGroup.userData = {
        isProject: true,
        project: project,
        kiosk: kioskGroup,
      };
      screen.userData = kioskGroup.userData;
      bezel.userData = kioskGroup.userData;

      this.interactiveObjects.push(screen, bezel);
      this.projectKiosks.push({
        project,
        group: kioskGroup,
        pos: new THREE.Vector3(project.pos.x, 0, project.pos.z),
        ring,
        badge,
      });

      this.scene.add(kioskGroup);

      // Physics body for pedestal
      const baseShape = new CANNON.Cylinder(2.5, 2.7, 0.8, 16);
      const kioskBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(project.pos.x, 0.4, project.pos.z),
        shape: baseShape,
        material: this.physicsWorld.propMaterial,
      });
      this.physicsWorld.world.addBody(kioskBody);
    });
  }

  update(dt, carPos) {
    let nearestProject = null;
    let nearestDist = Infinity;

    for (const item of this.projectKiosks) {
      const dist = item.pos.distanceTo(carPos);
      if (dist < 7.5 && dist < nearestDist) {
        nearestDist = dist;
        nearestProject = item.project;
      }

      // Gentle floating animation on top hologram badge
      const time = performance.now() * 0.003;
      item.badge.position.y = 5.8 + Math.sin(time + item.pos.x) * 0.12;
    }

    return nearestProject;
  }

  setNightMode(isNight) {
    if (this.kioskLights) {
      this.kioskLights.forEach((light) => {
        light.intensity = isNight ? 2.8 : 0;
      });
    }

    if (this.screenMaterials) {
      this.screenMaterials.forEach(({ mat, colorHex }) => {
        mat.emissive.set(isNight ? colorHex : 0x111827);
        mat.emissiveIntensity = isNight ? 1.1 : 0.3;
        mat.needsUpdate = true;
      });
    }

    if (this.ringMaterials) {
      this.ringMaterials.forEach((mat) => {
        mat.emissiveIntensity = isNight ? 3.5 : 2.0;
        mat.needsUpdate = true;
      });
    }
  }
}
