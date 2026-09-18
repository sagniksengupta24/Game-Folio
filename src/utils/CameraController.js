import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Modes: 'isometric', 'chase', 'topdown'
    this.mode = 'isometric';
    this.zoom = 1.0;
    this.minZoom = 0.6;
    this.maxZoom = 1.8;

    this.currentPosition = new THREE.Vector3(0, 25, 25);
    this.currentTarget = new THREE.Vector3(0, 0, 0);

    this.setupZoomListener();
  }

  setupZoomListener() {
    window.addEventListener(
      'wheel',
      (e) => {
        const delta = e.deltaY * 0.001;
        this.zoom = THREE.MathUtils.clamp(
          this.zoom + delta,
          this.minZoom,
          this.maxZoom
        );
      },
      { passive: true }
    );
  }

  toggleMode() {
    if (this.mode === 'isometric') {
      this.mode = 'chase';
    } else if (this.mode === 'chase') {
      this.mode = 'topdown';
    } else {
      this.mode = 'isometric';
    }
    return this.mode;
  }

  update(dt, vehicle) {
    const carPos = vehicle.carGroup.position;
    const carQuat = vehicle.carGroup.quaternion;

    const targetPos = carPos.clone();
    // Look slightly ahead of car forward vector (-Z)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(carQuat);
    targetPos.addScaledVector(forward, 2.5);

    let desiredCamPos = new THREE.Vector3();

    if (this.mode === 'isometric') {
      // Classic Bruno Simon angled isometric perspective
      const isoOffset = new THREE.Vector3(-16, 20, 16).multiplyScalar(this.zoom);
      desiredCamPos.copy(carPos).add(isoOffset);
    } else if (this.mode === 'chase') {
      // Dynamic action chase cam behind the car (+Z in car frame)
      const chaseOffset = new THREE.Vector3(0, 3.2, 7.2).multiplyScalar(this.zoom);
      chaseOffset.applyQuaternion(carQuat);
      desiredCamPos.copy(carPos).add(chaseOffset);
    } else if (this.mode === 'topdown') {
      // Strategic top-down radar view
      const topOffset = new THREE.Vector3(0, 42 * this.zoom, 0.1);
      desiredCamPos.copy(carPos).add(topOffset);
    }

    // Smooth lerp damping
    const lerpSpeed = this.mode === 'chase' ? 8.0 : 4.5;
    this.currentPosition.lerp(desiredCamPos, lerpSpeed * dt);
    this.currentTarget.lerp(targetPos, lerpSpeed * dt);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }
}
