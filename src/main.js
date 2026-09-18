import * as THREE from 'three';
import { SoundManager } from './audio/SoundManager.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { Vehicle } from './physics/Vehicle.js';
import { World } from './world/World.js';
import { CameraController } from './utils/CameraController.js';
import { Input } from './utils/Input.js';
import { HUD } from './ui/HUD.js';
import { Modals } from './ui/Modals.js';
import { ControlsOverlay } from './ui/ControlsOverlay.js';
import { PostProcessing } from './postprocessing/PostProcessing.js';

class App {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');

    this.initRenderer();
    this.initScene();
    this.initManagers();
    this.setupResize();

    this.lastTime = performance.now();
    this.activeInteractable = null;

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f3f5);
    this.scene.fog = new THREE.FogExp2(0xf1f3f5, 0.0045);

    // Low FOV for authentic miniature tilt-shift macro perspective
    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.5,
      320
    );
    this.camera.position.set(-16, 20, 16);
  }

  initManagers() {
    // 1. Audio Synthesizer
    this.soundManager = new SoundManager();

    // 2. Physics Engine
    this.physicsWorld = new PhysicsWorld(this.soundManager);

    // 3. Modals
    this.modals = new Modals();

    // 4. World, Environment Props & Shadow Decals
    this.world = new World(this.scene, this.physicsWorld, this.soundManager, {
      onSelectProject: (project) => this.modals.openProject(project),
      onOpenContact: () => this.modals.openContact(),
      onScoreUpdate: (data) => {
        if (data.strike) {
          this.hud.showScoreNotification('⚡ STRIKE! 10 / 10 PINS! ⚡', true);
        } else if (data.score > 0) {
          this.hud.showScoreNotification(`PIN HIT: ${data.score} / 10`, false);
        }
      },
    });

    // 5. Vehicle with dynamic contact shadow updates
    this.vehicle = new Vehicle(
      this.scene,
      this.physicsWorld,
      this.soundManager,
      this.world.shadowDecals
    );

    // 6. Camera Controller
    this.cameraController = new CameraController(this.camera, this.canvas);

    // 7. Input
    this.input = new Input(
      this.camera,
      this.scene,
      () => this.world.interactiveObjects,
      (type, data) => this.handleInteraction(type, data)
    );

    // 8. Post-Processing Pipeline (Tilt-shift, UnrealBloom, Vignette)
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.camera
    );

    // 9. HUD & UI
    this.hud = new HUD({
      onToggleSound: () => this.soundManager.toggleSound(),
      onToggleCamera: () => this.cameraController.toggleMode(),
      onToggleTheme: () => this.toggleTheme(),
      onResetCar: () => this.resetVehicle(),
      onHornDown: () => this.soundManager.startHorn(),
      onHornUp: () => this.soundManager.stopHorn(),
      onTeleport: (target) => this.teleportTo(target),
    });

    // 10. Mobile Touch Overlay
    this.controlsOverlay = new ControlsOverlay(this.input, this.soundManager);

    // Initialize theme based on stored preference or OS dark mode
    const savedTheme = localStorage.getItem('studio_nova_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'night' || (!savedTheme && prefersDark)) {
      this.toggleTheme(true);
    }
  }

  toggleTheme(explicitState = null) {
    const isNight = this.world.toggleTheme(explicitState);
    this.vehicle.setNightMode(isNight);
    this.postProcessing.setNightMode(isNight);
    document.body.classList.toggle('night-mode', isNight);
    if (this.hud && this.hud.updateThemeUI) {
      this.hud.updateThemeUI(isNight);
    }
    localStorage.setItem('studio_nova_theme', isNight ? 'night' : 'day');
    return isNight;
  }

  handleInteraction(type, data) {
    if (type === 'reset') {
      this.resetVehicle();
    } else if (type === 'horn-down') {
      this.soundManager.startHorn();
    } else if (type === 'horn-up') {
      this.soundManager.stopHorn();
    } else if (type === 'camera') {
      const mode = this.cameraController.toggleMode();
      const camBtn = document.getElementById('btn-camera');
      if (camBtn) camBtn.title = `Camera: ${mode.toUpperCase()}`;
    } else if (type === 'theme') {
      this.toggleTheme();
    } else if (type === 'inspect') {
      if (this.activeInteractable) {
        if (this.activeInteractable.isProject) {
          this.modals.openProject(this.activeInteractable.project);
        } else if (this.activeInteractable.isContact || this.activeInteractable.isMailbox) {
          this.modals.openContact();
        }
      }
    } else if (type === 'object-click' && data) {
      if (data.isProject) {
        this.modals.openProject(data.project);
        this.soundManager.playUiClick();
      } else if (data.isSocial) {
        if (data.social.action === 'modal') {
          this.modals.openContact();
        } else if (data.social.url) {
          window.open(data.social.url, '_blank');
        }
        this.soundManager.playUiClick();
      } else if (data.isContact) {
        this.modals.openContact();
        this.soundManager.playUiClick();
      }
    }
  }

  resetVehicle() {
    this.vehicle.reset(0, 1.2, 0, 0);
    this.soundManager.playUiClick();
    this.world.resetInteractiveZones();
  }

  teleportTo(zoneKey) {
    this.soundManager.playUiClick();
    const destinations = {
      paddock: { x: 0, z: 0, rotY: 0 },
      projects: { x: 34, z: -16, rotY: Math.PI * 0.25 },
      skills: { x: -32, z: -18, rotY: -Math.PI * 0.25 },
      stunt: { x: -35, z: 22, rotY: 0 },
      contact: { x: 35, z: 30, rotY: 0 },
    };

    const dest = destinations[zoneKey];
    if (dest) {
      this.vehicle.reset(dest.x, 1.2, dest.z, dest.rotY);
    }

    document.querySelectorAll('.nav-pill').forEach((pill) => {
      pill.classList.toggle(
        'active',
        pill.getAttribute('data-target') === zoneKey
      );
    });
  }

  setupResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      if (this.postProcessing) {
        this.postProcessing.resize(w, h);
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) * 0.001, 0.05);
    this.lastTime = now;

    // 1. Process Input
    this.input.update(
      dt,
      this.vehicle.carGroup.position,
      this.vehicle.carGroup.quaternion
    );

    // 2. Physics Simulation Step
    this.physicsWorld.step(dt);

    // 3. Vehicle Update
    this.vehicle.update(dt, this.input);

    // 4. World and Interactive Zones Update
    const worldStatus = this.world.update(dt, this.vehicle);

    // 5. Proximity Interaction Prompts
    if (worldStatus.activeProject) {
      this.activeInteractable = {
        isProject: true,
        project: worldStatus.activeProject,
      };
      this.hud.showInteractionPrompt(
        `PARKED AT [${worldStatus.activeProject.title.toUpperCase()}] • PRESS ENTER OR CLICK TO INSPECT`
      );
    } else if (worldStatus.activeContact) {
      this.activeInteractable = {
        isContact: true,
        isMailbox: true,
      };
      this.hud.showInteractionPrompt(
        'TRANSMISSION OUTPOST • PRESS ENTER OR CLICK TO MESSAGE'
      );
    } else {
      this.activeInteractable = null;
      this.hud.showInteractionPrompt(null);
    }

    // 6. Camera Follow
    this.cameraController.update(dt, this.vehicle);

    // 7. HUD Update
    const speedKmh = this.vehicle.speed * 3.6;
    const euler = new THREE.Euler().setFromQuaternion(
      this.vehicle.carGroup.quaternion,
      'YXZ'
    );
    this.hud.update(
      speedKmh,
      this.vehicle.isReversing,
      this.vehicle.isBraking,
      this.vehicle.carGroup.position,
      euler.y
    );

    // 8. Render with Post-Processing Pipeline
    this.postProcessing.render();
  }
}

// Bootstrap application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
