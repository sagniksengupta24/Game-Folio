import * as THREE from 'three';

export class Input {
  constructor(camera, scene, getInteractiveObjects, onInteract) {
    this.camera = camera;
    this.scene = scene;
    this.getInteractiveObjects = getInteractiveObjects;
    this.onInteract = onInteract;

    // Vehicle control state
    this.throttle = 0; // -1 to 1
    this.steer = 0;    // -1 (left) to 1 (right)
    this.handbrake = false;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
    };

    // Click to drive waypoint
    this.targetWaypoint = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupKeyboard();
    this.setupPointer();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Ignore keystrokes when a modal or input is active
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = true;
      if (code === 'Space') {
        this.keys.space = true;
        e.preventDefault();
      }

      // Event triggers
      if (code === 'KeyR' && this.onInteract) this.onInteract('reset');
      if (code === 'KeyH' && this.onInteract) this.onInteract('horn-down');
      if (code === 'KeyC' && this.onInteract) this.onInteract('camera');
      if (code === 'KeyT' && this.onInteract) this.onInteract('theme');
      if (code === 'Enter' && this.onInteract) this.onInteract('inspect');

      this.targetWaypoint = null; // Keyboard overrides click-to-drive
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
      if (code === 'Space') this.keys.space = false;
      if (code === 'KeyH' && this.onInteract) this.onInteract('horn-up');
    });
  }

  setupPointer() {
    window.addEventListener('pointerdown', (e) => {
      // Only process canvas clicks, not HUD button clicks
      if (e.target.closest('#hud, #modals, dialog, button, a')) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Check interactive objects first
      const interactive = this.getInteractiveObjects ? this.getInteractiveObjects() : [];
      const hits = this.raycaster.intersectObjects(interactive, true);

      if (hits.length > 0) {
        let hitObj = hits[0].object;
        while (hitObj && !hitObj.userData?.isProject && !hitObj.userData?.isSocial && !hitObj.userData?.isContact && hitObj.parent) {
          hitObj = hitObj.parent;
        }

        if (hitObj?.userData) {
          if (this.onInteract) this.onInteract('object-click', hitObj.userData);
          return;
        }
      }

      // If clicked on ground, set waypoint for click-to-drive
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(floorPlane, target)) {
        this.targetWaypoint = target;
      }
    });
  }

  update(dt, carPos, carQuat) {
    let t = 0;
    let s = 0;

    // 1. Keyboard Input
    if (this.keys.forward) t += 1;
    if (this.keys.backward) t -= 1;
    if (this.keys.left) s -= 1;
    if (this.keys.right) s += 1;

    // 2. Click-to-drive waypoint navigation
    if (this.targetWaypoint && t === 0 && s === 0) {
      const dist = carPos.distanceTo(this.targetWaypoint);
      if (dist < 2.0) {
        this.targetWaypoint = null;
      } else {
        const toTarget = this.targetWaypoint.clone().sub(carPos);
        toTarget.y = 0;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(carQuat);
        forward.y = 0;
        forward.normalize();
        toTarget.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(carQuat);
        right.y = 0;
        right.normalize();

        const dotForward = forward.dot(toTarget);
        const dotRight = right.dot(toTarget);

        t = THREE.MathUtils.clamp(dotForward * 1.5, 0.4, 1.0);
        s = THREE.MathUtils.clamp(dotRight * 2.0, -1.0, 1.0);
      }
    }

    this.throttle = t;
    this.steer = s;
    this.handbrake = this.keys.space;
  }
}
