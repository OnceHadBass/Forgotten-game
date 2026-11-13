// What the camera's picture goes through before it reaches the screen:
// bloom, so that anything alive or Warden-made bleeds light into the dark,
// then tone mapping, then a grade (cool shadows, grain, vignette, and the
// screen's reaction to being hurt).

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

/**
 * One bad pixel (not-a-number, or absurdly bright) would be smeared over the whole
 * picture by the bloom and black it out. Nothing gets past this without being a sane colour.
 */
const Sane = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; if (!(c.r >= 0.0 && c.r < 1e4)) c.r = 0.0; if (!(c.g >= 0.0 && c.g < 1e4)) c.g = 0.0; if (!(c.b >= 0.0 && c.b < 1e4)) c.b = 0.0; gl_FragColor = vec4(min(c, vec3(24.0)), 1.0); }',
};

const Grade = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, hurt: { value: 0 }, dark: { value: 0 }, still: { value: 0 }, low: { value: 0 }, aspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, hurt, dark, still, low, aspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r = length(c * vec2(aspect, 1.0));
      // being hurt pulls the colours apart at the edges
      float split = (hurt * 0.012 + still * 0.004) * r;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * split).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * split).b);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      // the world is near-colourless stone: only what is bright keeps its colour
      float keep = smoothstep(0.03, 0.4, l);
      col = mix(mix(vec3(l), col, 0.55 + 0.45 * keep), col, 1.0 - 0.6 * low);
      col = mix(vec3(l) * vec3(0.92, 1.0, 1.06), col, 0.82 + 0.18 * keep);
      col = mix(col, vec3(l), low * 0.55);
      col *= 1.06;
      float v = smoothstep(0.45 - dark * 0.16, 1.1, r);
      col *= 1.0 - v * (0.5 + dark * 0.3);
      col += vec3(0.75, 0.1, 0.05) * smoothstep(0.35, 0.95, r) * max(hurt, low * (0.45 + 0.2 * sin(time * 6.5)));
      col += vec3(0.5, 0.56, 0.6) * still * smoothstep(0.5, 1.0, r) * 0.25;
      col += (hash(vUv * vec2(1280.0, 720.0) + fract(time) * 91.7) - 0.5) * 0.035;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export class Post {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private fxaa: ShaderPass | null = null;

  /** `low` drops the bloom and the multisampling: the grade stays. */
  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, low = false) {
    const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: low ? 0 : 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(new ShaderPass(Sane));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.5, 0.7, 1.0);
    this.bloom.enabled = !low;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(Grade);
    this.composer.addPass(this.grade);
    // without multisampling, edges need smoothing some other way or everything looks stepped
    if (low) { this.fxaa = new ShaderPass(FXAAShader); this.composer.addPass(this.fxaa); }
  }

  resize(w: number, h: number): void {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.grade.uniforms.aspect.value = w / h;
    const pr = this.renderer.getPixelRatio();
    if (this.fxaa) (this.fxaa.uniforms.resolution.value as THREE.Vector2).set(1 / (w * pr), 1 / (h * pr));
  }

  render(time: number, hurt: number, dark: number, still: number, low: number): void {
    const u = this.grade.uniforms;
    u.time.value = time; u.hurt.value = hurt; u.dark.value = dark; u.still.value = still; u.low.value = low;
    this.composer.render();
  }
}
