export class HUD {
  constructor(callbacks) {
    this.callbacks = callbacks;

    this.speedText = document.getElementById('speed-value');
    this.speedNeedle = document.getElementById('speed-needle');
    this.gearBadge = document.getElementById('gear-badge');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.promptToast = document.getElementById('interaction-prompt');
    this.scoreToast = document.getElementById('score-toast');

    this.setupButtons();
  }

  setupButtons() {
    // Sound toggle
    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleSound) {
          const enabled = this.callbacks.onToggleSound();
          soundBtn.classList.toggle('muted', !enabled);
          soundBtn.title = enabled ? 'Mute Sound' : 'Unmute Sound';
        }
      });
    }

    // Camera toggle
    const camBtn = document.getElementById('btn-camera');
    if (camBtn) {
      camBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleCamera) {
          const mode = this.callbacks.onToggleCamera();
          camBtn.title = `Camera: ${mode.toUpperCase()}`;
        }
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleTheme) {
          this.callbacks.onToggleTheme();
        }
      });
    }

    // Reset car
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.callbacks.onResetCar) this.callbacks.onResetCar();
      });
    }

    // Horn button
    const hornBtn = document.getElementById('btn-horn');
    if (hornBtn) {
      hornBtn.addEventListener('pointerdown', () => {
        if (this.callbacks.onHornDown) this.callbacks.onHornDown();
      });
      hornBtn.addEventListener('pointerup', () => {
        if (this.callbacks.onHornUp) this.callbacks.onHornUp();
      });
      hornBtn.addEventListener('pointerleave', () => {
        if (this.callbacks.onHornUp) this.callbacks.onHornUp();
      });
    }

    // Top Navigation Teleport links
    const navLinks = document.querySelectorAll('.nav-pill');
    navLinks.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const target = pill.getAttribute('data-target');
        if (this.callbacks.onTeleport) {
          this.callbacks.onTeleport(target);
        }
      });
    });
  }

  showInteractionPrompt(text, action = null) {
    if (!this.promptToast) return;
    if (text) {
      this.promptToast.textContent = text;
      this.promptToast.classList.add('visible');
    } else {
      this.promptToast.classList.remove('visible');
    }
  }

  showScoreNotification(msg, isStrike = false) {
    if (!this.scoreToast) return;
    this.scoreToast.textContent = msg;
    this.scoreToast.classList.toggle('strike', isStrike);
    this.scoreToast.classList.add('visible');

    clearTimeout(this.scoreTimeout);
    this.scoreTimeout = setTimeout(() => {
      this.scoreToast.classList.remove('visible');
    }, 2800);
  }

  update(speedKmh, isReversing, isBraking, carPos, carHeading) {
    // 1. Update Digital Speedometer & Needle
    const displaySpeed = Math.round(speedKmh);
    if (this.speedText) {
      this.speedText.textContent = displaySpeed.toString().padStart(2, '0');
    }

    // Needle rotates from -120deg to +120deg
    if (this.speedNeedle) {
      const maxDisplaySpeed = 120;
      const angle = -120 + Math.min(1, displaySpeed / maxDisplaySpeed) * 240;
      this.speedNeedle.style.transform = `rotate(${angle}deg)`;
    }

    // Gear indicator
    if (this.gearBadge) {
      if (isReversing) {
        this.gearBadge.textContent = 'R';
        this.gearBadge.className = 'gear-badge reverse';
      } else if (displaySpeed < 1) {
        this.gearBadge.textContent = 'N';
        this.gearBadge.className = 'gear-badge neutral';
      } else {
        this.gearBadge.textContent = 'D';
        this.gearBadge.className = 'gear-badge drive';
      }
    }

    // 2. Render Radar Mini-Map
    this.renderRadar(carPos, carHeading);
  }

  renderRadar(carPos, carHeading) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Radar background with subtle glow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, w, h);

    // Radar coordinate mapping (Arena size: 140 units -> w x h)
    const mapSize = 140;
    const toMapX = (x) => (w * 0.5) + (x / mapSize) * (w * 0.9);
    const toMapY = (z) => (h * 0.5) + (z / mapSize) * (h * 0.9);

    // Outer grid rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, w * 0.42, 0, Math.PI * 2);
    ctx.arc(w * 0.5, h * 0.5, w * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    // Zone icons/dots
    const zones = [
      { name: 'Paddock', x: 0, z: 0, color: '#ff5e3a' },
      { name: 'Projects', x: 35, z: -25, color: '#00c6ff' },
      { name: 'Skills', x: -35, z: -25, color: '#ab47bc' },
      { name: 'Stunt', x: -35, z: 35, color: '#ffab00' },
      { name: 'Contact', x: 35, z: 35, color: '#00e676' },
    ];

    zones.forEach((zone) => {
      const zx = toMapX(zone.x);
      const zy = toMapY(zone.z);
      ctx.fillStyle = zone.color;
      ctx.beginPath();
      ctx.arc(zx, zy, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Car blip with directional heading needle
    const cx = toMapX(carPos.x);
    const cy = toMapY(carPos.z);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-carHeading);

    // Triangle car blip
    ctx.fillStyle = '#ff5e3a';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();

    // Radar pulse ring
    ctx.strokeStyle = 'rgba(255, 94, 58, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  updateThemeUI(isNight) {
    const themeBtn = document.getElementById('btn-theme');
    if (!themeBtn) return;
    themeBtn.title = isNight ? 'Day Mode (T)' : 'Night Mode (T)';
    themeBtn.innerHTML = isNight
      ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>`;
  }
}
