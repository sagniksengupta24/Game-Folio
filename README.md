# 🏎️ Game-Folio

> An interactive 3D physics portfolio experience built with **Three.js** and **Cannon-es**, inspired by Bruno Simon. Explore interactive project kiosks, trigger domino physics runs, drift through bowling stunts, and connect via an interactive 3D mailbox in a diorama workshop.

### [Preview :- Live Link ](https://sagniksengupta24.github.io/Game-Folio/)

[![Deploy to GitHub Pages](https://github.com/sagniksengupta24/Game-Folio/actions/workflows/deploy.yaml/badge.svg)](https://github.com/sagniksengupta24/Game-Folio/actions/workflows/deploy.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite)](https://vitejs.dev/)

---

## 🎮 Interactive Controls

| Control | Key / Action | Description |
| :--- | :---: | :--- |
| **Drive / Reverse** | <kbd>W</kbd> / <kbd>S</kbd> or <kbd>↑</kbd> / <kbd>↓</kbd> | Accelerate forward and reverse gear |
| **Steer** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Turn left and right |
| **Drift & Handbrake** | <kbd>Space</kbd> | Lock rear wheels to drift around corners |
| **Reset / Unflip** | <kbd>R</kbd> | Reset vehicle upright onto the nearest pad |
| **Horn** | <kbd>H</kbd> | Play synthesized retro RC beep horn |
| **Camera View** | <kbd>C</kbd> | Cycle camera angles (Isometric, Chase, Top-Down) |
| **Day / Night Mode** | <kbd>T</kbd> | Toggle between drafting table daylight and cyberpunk midnight neon |
| **Inspect** | <kbd>Click</kbd> | Click directly on 3D project kiosks, pedestals, or mailbox |

---

## ✨ Features

- **Miniature RC Car Physics:** Realistic wheel suspensions, raycast chassis ray physics, contact skidmarks, and dynamic tire decals powered by `cannon-es`.
- **Procedural Sound Engine:** Real-time synthesized engine revs, gear shifts, tire screeches, horns, and ambient audio synthesized natively using the **Web Audio API** (zero external audio file dependencies).
- **Tilt-Shift & Post-Processing:** Macro tilt-shift lens shader and calibrated selective UnrealBloom for radiant neon in night mode and crisp shadows in day mode.
- **Interactive Zones:**
  - 🏁 **Starting Paddock:** Starting ramp, 3D typography, and knockable traffic cones.
  - 💻 **Projects Showcase:** Interactive rotating kiosk terminals displaying live project cards, tech stacks, and links.
  - 🧩 **Skills Lab:** Knockable domino sequence chains and skill stack blocks.
  - 🎳 **Stunt Arena:** Cardboard stunt ramp, breakable crate pyramid, and 10-pin bowling alley with live score tracking.
  - 📬 **Contact Outpost:** 3D classic mailbox and social pedestals linking to GitHub, LinkedIn, Twitter, and email.
- **Glassmorphic HUD:** Live telemetry speedometer gauge, radar minimap with zone markers, and quick navigation teleport pills.

---

## 🚀 Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` (v9 or higher)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/sagniksengupta24/Game-Folio.git
cd Game-Folio

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
npm run preview
```

---

## 🌐 Deploying to GitHub Pages

This project is pre-configured with a GitHub Actions workflow in [`.github/workflows/deploy.yaml`](.github/workflows/deploy.yaml).

To deploy automatically:
1. Push code to the `main` branch.
2. In your GitHub repository:
   - Go to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. The workflow will build and publish your site automatically to `https://<username>.github.io/Game-Folio/`.

---

## 🛠️ Built With

- [Three.js](https://threejs.org/) — 3D graphics rendering & post-processing shaders
- [Cannon-es](https://github.com/pmndrs/cannon-es) — Rigid-body physics engine
- [Vite](https://vitejs.dev/) — Next-generation frontend build tooling
- [Canvas Confetti](https://github.com/catdad/canvas-confetti) — Celebration FX

---

## 📄 License

MIT © [Sagnik Sengupta](https://github.com/sagniksengupta24)
