import * as THREE from 'three';

export class ShadowDecals {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.shadowTexture = this.createSoftRadialTexture();
    this.rectShadowTexture = this.createSoftRectTexture();

    this.initDynamicCarShadow();
    this.decalMaterials = [];
  }

  createSoftRadialTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 126);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createSoftRectTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 128, 20, 256, 128, 240);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  addRadialDecal(x, z, radiusX, radiusZ, opacity = 0.55) {
    const geo = new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
    });
    this.decalMaterials.push({ mat, baseOpacity: opacity });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.015, z);
    this.group.add(mesh);
    return mesh;
  }

  addRectDecal(x, z, width, length, rotY = 0, opacity = 0.55) {
    const geo = new THREE.PlaneGeometry(width, length);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: this.rectShadowTexture,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
    });
    this.decalMaterials.push({ mat, baseOpacity: opacity });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.015, z);
    mesh.rotation.y = rotY;
    this.group.add(mesh);
    return mesh;
  }

  initDynamicCarShadow() {
    // Dynamic soft contact shadow that stays underneath the car
    const geo = new THREE.PlaneGeometry(2.4, 3.8);
    geo.rotateX(-Math.PI / 2);

    this.carShadowMat = new THREE.MeshBasicMaterial({
      map: this.rectShadowTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.carShadowMesh = new THREE.Mesh(geo, this.carShadowMat);
    this.carShadowMesh.position.set(0, 0.02, 0);
    this.scene.add(this.carShadowMesh);
  }

  setNightMode(isNight) {
    const factor = isNight ? 0.7 : 1.0;
    this.decalMaterials.forEach(({ mat, baseOpacity }) => {
      mat.opacity = baseOpacity * factor;
    });
    if (this.carShadowMat) {
      this.carShadowMat.opacity = 0.65 * factor;
    }
  }

  updateCarShadow(carPos, carHeading, chassisHeightAboveGround) {
    if (!this.carShadowMesh) return;

    // Follow car in X and Z
    this.carShadowMesh.position.x = carPos.x;
    this.carShadowMesh.position.z = carPos.z;
    this.carShadowMesh.rotation.y = carHeading;

    // Scale and fade shadow based on altitude
    const height = Math.max(0, chassisHeightAboveGround - 0.4);
    const heightFactor = Math.min(1.0, height / 4.0);

    // Expands slightly and softens when jumping
    const scale = 1.0 + heightFactor * 0.45;
    this.carShadowMesh.scale.set(scale, 1.0, scale);

    // Fades smoothly when airborne
    const baseOpacity = 0.65;
    this.carShadowMat.opacity = Math.max(0.1, baseOpacity * (1.0 - heightFactor * 0.75));
  }
}
