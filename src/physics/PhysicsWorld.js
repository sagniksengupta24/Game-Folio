import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  constructor(soundManager) {
    this.soundManager = soundManager;
    this.world = new CANNON.World();

    // Responsive, arcade gravity
    this.world.gravity.set(0, -28, 0);

    // High performance Sweep and Prune broadphase
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = 0.4;
    this.world.defaultContactMaterial.restitution = 0.2;

    // Materials
    this.groundMaterial = new CANNON.Material('ground');
    this.wheelMaterial = new CANNON.Material('wheel');
    this.chassisMaterial = new CANNON.Material('chassis');
    this.propMaterial = new CANNON.Material('prop');

    // Contact material configurations
    const wheelGroundContact = new CANNON.ContactMaterial(
      this.wheelMaterial,
      this.groundMaterial,
      {
        friction: 1.3,
        restitution: 0.05,
        contactEquationStiffness: 1000,
      }
    );
    this.world.addContactMaterial(wheelGroundContact);

    const chassisPropContact = new CANNON.ContactMaterial(
      this.chassisMaterial,
      this.propMaterial,
      {
        friction: 0.3,
        restitution: 0.3,
      }
    );
    this.world.addContactMaterial(chassisPropContact);

    const propGroundContact = new CANNON.ContactMaterial(
      this.propMaterial,
      this.groundMaterial,
      {
        friction: 0.5,
        restitution: 0.3,
      }
    );
    this.world.addContactMaterial(propGroundContact);

    // Sync list for automatic mesh-body updates
    this.syncObjects = [];

    // Collision audio rate limiter
    this.lastSoundTime = 0;
  }

  addSyncObject(mesh, body, offset = null) {
    this.world.addBody(body);
    this.syncObjects.push({ mesh, body, offset });
    return body;
  }

  removeSyncObject(body) {
    this.world.removeBody(body);
    const idx = this.syncObjects.findIndex((item) => item.body === body);
    if (idx !== -1) {
      this.syncObjects.splice(idx, 1);
    }
  }

  registerCollisionSound(body, minVelocity = 2) {
    body.addEventListener('collide', (event) => {
      const now = performance.now();
      if (now - this.lastSoundTime < 60) return; // throttle

      const contact = event.contact;
      let impact = 0;
      if (contact && typeof contact.getImpactVelocityAlongNormal === 'function') {
        impact = Math.abs(contact.getImpactVelocityAlongNormal());
      } else {
        impact = body.velocity.length();
      }

      if (impact > minVelocity && this.soundManager) {
        this.lastSoundTime = now;
        this.soundManager.playCollision(impact);
      }
    });
  }

  step(dt) {
    // Fixed timestep 1/60 with max 3 substeps
    this.world.step(1 / 60, Math.min(dt, 0.1), 3);

    // Synchronize Three.js visual meshes with Cannon.js physics bodies
    for (let i = 0; i < this.syncObjects.length; i++) {
      const { mesh, body, offset } = this.syncObjects[i];
      if (!mesh || !body) continue;

      if (offset) {
        mesh.position.copy(body.position).add(offset);
      } else {
        mesh.position.copy(body.position);
      }
      mesh.quaternion.copy(body.quaternion);
    }
  }
}
