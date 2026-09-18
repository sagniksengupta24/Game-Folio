export class ControlsOverlay {
  constructor(input, soundManager) {
    this.input = input;
    this.soundManager = soundManager;

    this.joystickBase = document.getElementById('touch-joystick');
    this.joystickKnob = document.getElementById('touch-knob');

    this.isTouchActive = false;
    this.touchId = null;
    this.baseCenter = { x: 0, y: 0 };
    this.maxRadius = 45;

    this.initTouchControls();
  }

  initTouchControls() {
    // Only activate if touch is supported or screen width <= 1024
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 1024;

    const overlay = document.getElementById('touch-controls');
    if (overlay && isTouchDevice) {
      overlay.classList.remove('hidden');
    }

    if (!this.joystickBase || !this.joystickKnob) return;

    const onTouchStart = (e) => {
      const touch = e.changedTouches[0];
      this.isTouchActive = true;
      this.touchId = touch.identifier;

      const rect = this.joystickBase.getBoundingClientRect();
      this.baseCenter = {
        x: rect.left + rect.width * 0.5,
        y: rect.top + rect.height * 0.5,
      };

      this.handleTouchMove(touch.clientX, touch.clientY);
      e.preventDefault();
    };

    const onTouchMove = (e) => {
      if (!this.isTouchActive) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchId) {
          this.handleTouchMove(touch.clientX, touch.clientY);
          break;
        }
      }
      e.preventDefault();
    };

    const onTouchEnd = (e) => {
      if (!this.isTouchActive) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchId) {
          this.isTouchActive = false;
          this.touchId = null;
          this.joystickKnob.style.transform = 'translate(0px, 0px)';
          this.input.keys.left = false;
          this.input.keys.right = false;
          break;
        }
      }
    };

    this.joystickBase.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    // Touch Action Buttons
    const btnGas = document.getElementById('touch-gas');
    const btnBrake = document.getElementById('touch-brake');
    const btnHorn = document.getElementById('touch-horn');

    if (btnGas) {
      btnGas.addEventListener('touchstart', (e) => {
        this.input.keys.forward = true;
        e.preventDefault();
      });
      btnGas.addEventListener('touchend', () => {
        this.input.keys.forward = false;
      });
    }

    if (btnBrake) {
      btnBrake.addEventListener('touchstart', (e) => {
        this.input.keys.backward = true;
        e.preventDefault();
      });
      btnBrake.addEventListener('touchend', () => {
        this.input.keys.backward = false;
      });
    }

    if (btnHorn) {
      btnHorn.addEventListener('touchstart', (e) => {
        this.soundManager.startHorn();
        e.preventDefault();
      });
      btnHorn.addEventListener('touchend', () => {
        this.soundManager.stopHorn();
      });
    }
  }

  handleTouchMove(clientX, clientY) {
    const dx = clientX - this.baseCenter.x;
    const dy = clientY - this.baseCenter.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    this.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

    // X axis drives steering
    const normX = knobX / this.maxRadius;
    if (normX < -0.2) {
      this.input.keys.left = true;
      this.input.keys.right = false;
    } else if (normX > 0.2) {
      this.input.keys.right = true;
      this.input.keys.left = false;
    } else {
      this.input.keys.left = false;
      this.input.keys.right = false;
    }
  }
}
