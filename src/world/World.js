import * as THREE from 'three';
import { Floor } from './Floor.js';
import { IntroZone } from './IntroZone.js';
import { ProjectsZone } from './ProjectsZone.js';
import { SkillsZone } from './SkillsZone.js';
import { StuntZone } from './StuntZone.js';
import { ContactZone } from './ContactZone.js';
import { ShadowDecals } from './ShadowDecals.js';
import { EnvironmentProps } from './EnvironmentProps.js';

export class World {
  constructor(scene, physicsWorld, soundManager, callbacks) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.soundManager = soundManager;
    this.callbacks = callbacks;

    this.isNightMode = false;

    this.initLighting();
    this.initDecalsAndEnvironment();
    this.initZones();
  }

  initLighting() {
    // 1. Ambient & Hemisphere bounce
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.60);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0d5dd, 0.40);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 2. Main Sun Directional Light with soft PCF shadows
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
    this.sunLight.position.set(45, 60, 40);
    this.sunLight.castShadow = true;

    // High fidelity shadow camera covering arena
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 180;

    const d = 75;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.04;

    this.scene.add(this.sunLight);

    // Secondary fill light for soft contrast
    this.fillLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    this.fillLight.position.set(-40, 30, -40);
    this.scene.add(this.fillLight);
  }

  initDecalsAndEnvironment() {
    // 1. Contact shadow system
    this.shadowDecals = new ShadowDecals(this.scene);

    // 2. Workbench diorama props (ruler bridge, coffee mug, pencils, desk lamps)
    this.environmentProps = new EnvironmentProps(
      this.scene,
      this.physicsWorld,
      this.shadowDecals
    );
  }

  initZones() {
    this.floor = new Floor(this.scene, this.physicsWorld);
    this.introZone = new IntroZone(this.scene, this.physicsWorld);

    this.projectsZone = new ProjectsZone(
      this.scene,
      this.physicsWorld,
      this.callbacks.onSelectProject
    );

    this.skillsZone = new SkillsZone(this.scene, this.physicsWorld);

    this.stuntZone = new StuntZone(
      this.scene,
      this.physicsWorld,
      this.soundManager,
      this.callbacks.onScoreUpdate
    );

    this.contactZone = new ContactZone(
      this.scene,
      this.physicsWorld,
      this.callbacks.onOpenContact
    );

    // Add contact shadow decals under static zone installations
    if (this.shadowDecals) {
      // Welcome letter shadow
      this.shadowDecals.addRectDecal(0, -14, 26, 6, 0, 0.45);
      // Start ramp shadow
      this.shadowDecals.addRectDecal(0, -5.5, 5.5, 7.0, 0, 0.5);

      // Project kiosks contact shadows
      this.projectsZone.projectsData.forEach((p) => {
        this.shadowDecals.addRadialDecal(p.pos.x, p.pos.z, 3.2, 3.2, 0.55);
      });

      // Bowling alley pins rack shadow
      this.shadowDecals.addRectDecal(-47, 43, 6, 8, 0, 0.45);
      // Crate pyramid shadow
      this.shadowDecals.addRectDecal(-27, 37, 8, 4, 0, 0.45);

      // Contact mailbox and pedestals shadows
      this.shadowDecals.addRadialDecal(29, 31, 2.0, 2.0, 0.5);
      this.shadowDecals.addRadialDecal(31, 39, 2.2, 2.2, 0.5);
      this.shadowDecals.addRadialDecal(39, 39, 2.2, 2.2, 0.5);
      this.shadowDecals.addRadialDecal(31, 47, 2.2, 2.2, 0.5);
      this.shadowDecals.addRadialDecal(39, 47, 2.2, 2.2, 0.5);
    }

    // Collect all raycast interactive objects for click detection
    this.interactiveObjects = [
      ...this.projectsZone.interactiveObjects,
      ...this.contactZone.interactiveObjects,
    ];
  }

  toggleTheme(explicitNight = null) {
    if (typeof explicitNight === 'boolean') {
      this.isNightMode = explicitNight;
    } else {
      this.isNightMode = !this.isNightMode;
    }

    if (this.isNightMode) {
      // Night theme: atmospheric midnight with moonlight and neon accents
      this.ambientLight.color.setHex(0x38bdf8);
      this.ambientLight.intensity = 0.5;

      this.hemiLight.color.setHex(0x334155);
      this.hemiLight.groundColor.setHex(0x020617);
      this.hemiLight.intensity = 0.6;

      this.sunLight.color.setHex(0xbfdbfe); // Radiant moonlight
      this.sunLight.intensity = 1.1;

      this.fillLight.color.setHex(0xc084fc); // Radiant neon rim
      this.fillLight.intensity = 0.6;

      this.scene.background = new THREE.Color(0x0a0e1a);
      this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.0035);
    } else {
      // Day theme: warm sunlit drafting table
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.60;

      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0xd0d5dd);
      this.hemiLight.intensity = 0.40;

      this.sunLight.color.setHex(0xfff7ed);
      this.sunLight.intensity = 1.15;

      this.fillLight.color.setHex(0x93c5fd);
      this.fillLight.intensity = 0.40;

      this.scene.background = new THREE.Color(0xf1f3f5);
      this.scene.fog = new THREE.FogExp2(0xf1f3f5, 0.0045);
    }

    this.floor.setNightMode(this.isNightMode);
    if (this.introZone) this.introZone.setNightMode(this.isNightMode);
    if (this.projectsZone) this.projectsZone.setNightMode(this.isNightMode);
    if (this.skillsZone) this.skillsZone.setNightMode(this.isNightMode);
    if (this.stuntZone) this.stuntZone.setNightMode(this.isNightMode);
    if (this.contactZone) this.contactZone.setNightMode(this.isNightMode);
    if (this.environmentProps) this.environmentProps.setNightMode(this.isNightMode);
    if (this.shadowDecals) this.shadowDecals.setNightMode(this.isNightMode);

    return this.isNightMode;
  }

  update(dt, vehicle) {
    const carPos = vehicle.carGroup.position;

    // Follow car with sun light target for uniform shadow coverage
    this.sunLight.position.x = carPos.x + 45;
    this.sunLight.position.z = carPos.z + 40;
    this.sunLight.target.position.copy(carPos);
    this.sunLight.target.updateMatrixWorld();

    const activeProject = this.projectsZone.update(dt, carPos);
    this.stuntZone.update(dt, vehicle);
    const activeContact = this.contactZone.update(dt, carPos);

    return {
      activeProject,
      activeContact,
    };
  }

  resetInteractiveZones() {
    this.skillsZone.resetAll();
    this.stuntZone.resetAll();
  }
}
