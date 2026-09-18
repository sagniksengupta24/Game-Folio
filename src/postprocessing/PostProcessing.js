import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Custom Tilt-Shift Macro Lens & Subtle Vignette Shader
// Creates the iconic miniature tabletop toy look by blurring top and bottom planes
// while maintaining razor-sharp focus along the car's horizontal viewing band
export const TiltShiftVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    focusPos: { value: 0.52 }, // Center focal plane
    focusRange: { value: 0.22 }, // Crisp zone width
    blurStrength: { value: 0.0035 }, // Subtle cream bokeh blur
    vignetteOffset: { value: 1.05 },
    vignetteDarkness: { value: 0.35 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float focusPos;
    uniform float focusRange;
    uniform float blurStrength;
    uniform float vignetteOffset;
    uniform float vignetteDarkness;
    varying vec2 vUv;

    void main() {
      // Calculate distance from horizontal focal line
      float distFromFocus = abs(vUv.y - focusPos);
      float blurFactor = smoothstep(focusRange * 0.5, focusRange * 1.8, distFromFocus);
      float blur = blurFactor * blurStrength;

      // 9-sample Poisson/Gaussian disk blur
      vec4 sum = vec4(0.0);
      sum += texture2D(tDiffuse, vUv) * 0.20;
      sum += texture2D(tDiffuse, vUv + vec2(0.0, blur * 1.0)) * 0.12;
      sum += texture2D(tDiffuse, vUv - vec2(0.0, blur * 1.0)) * 0.12;
      sum += texture2D(tDiffuse, vUv + vec2(blur * 1.0, 0.0)) * 0.12;
      sum += texture2D(tDiffuse, vUv - vec2(blur * 1.0, 0.0)) * 0.12;
      sum += texture2D(tDiffuse, vUv + vec2(blur * 0.707, blur * 0.707)) * 0.085;
      sum += texture2D(tDiffuse, vUv - vec2(blur * 0.707, blur * 0.707)) * 0.085;
      sum += texture2D(tDiffuse, vUv + vec2(-blur * 0.707, blur * 0.707)) * 0.085;
      sum += texture2D(tDiffuse, vUv + vec2(blur * 0.707, -blur * 0.707)) * 0.085;

      // Subtle warm vignette for cinematic framing
      vec2 uvCentered = (vUv - 0.5) * 2.0;
      float dist = length(uvCentered);
      float vignette = smoothstep(vignetteOffset, vignetteOffset - 0.65, dist);
      sum.rgb = mix(sum.rgb * (1.0 - vignetteDarkness), sum.rgb, vignette);

      gl_FragColor = sum;
    }
  `,
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.initComposer();
  }

  initComposer() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // High precision render target for HDR bloom
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
      samples: 4, // 4x MSAA
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // 1. Base Scene Render Pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 2. Selective UnrealBloomPass (calibrated so only high-intensity emissives bloom)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.45, // strength
      0.35, // radius
      1.08  // threshold (prevents standard drafting table floor and fog from blooming)
    );
    this.composer.addPass(this.bloomPass);

    // 3. Tilt-Shift Macro & Vignette Pass
    this.tiltShiftPass = new ShaderPass(TiltShiftVignetteShader);
    this.composer.addPass(this.tiltShiftPass);
  }

  setNightMode(isNight) {
    if (isNight) {
      // In night mode, crisp radiant bloom on emissive elements without foggy washout
      this.bloomPass.strength = 0.70;
      this.bloomPass.threshold = 0.92;
      this.bloomPass.radius = 0.45;
      this.tiltShiftPass.uniforms.vignetteDarkness.value = 0.45;
    } else {
      // Warm sunlit day mode: subtle bloom only on direct highlights
      this.bloomPass.strength = 0.45;
      this.bloomPass.threshold = 1.08;
      this.bloomPass.radius = 0.35;
      this.tiltShiftPass.uniforms.vignetteDarkness.value = 0.35;
    }
  }

  resize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  render() {
    this.composer.render();
  }
}
