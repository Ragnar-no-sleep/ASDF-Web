/**
 * Build V2 - Post Processing Effects
 * Bloom, vignette, and other visual enhancements
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// POST PROCESSING CONFIGURATION
// ============================================

const PP_CONFIG = {
  bloom: {
    strength: 0.8,
    radius: 0.5,
    threshold: 0.6
  },
  vignette: {
    offset: 0.5,
    darkness: 0.6
  },
  chromatic: {
    offset: 0.002
  }
};

// ============================================
// POST PROCESSING CLASS
// ============================================

class PostProcessing {
  /**
   * @param {Object} THREE - Three.js library reference
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {Object} options
   */
  constructor(THREE, renderer, scene, camera, options = {}) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.options = { ...PP_CONFIG, ...options };

    this.composer = null;
    this.passes = {};
    this.enabled = true;
  }

  /**
   * Initialize post processing
   * @returns {Promise<void>}
   */
  async init() {
    const THREE = this.THREE;

    // Create render targets
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    // Create effect composer manually (without imports)
    this.composer = this.createComposer(renderTarget);

    // Add passes
    this.addRenderPass();
    this.addBloomPass();
    this.addVignettePass();

    // Handle resize
    this.bindResize();

    console.log('[PostProcessing] Initialized');
  }

  /**
   * Create simple effect composer
   * @param {THREE.WebGLRenderTarget} renderTarget
   * @returns {Object}
   */
  createComposer(renderTarget) {
    const THREE = this.THREE;

    return {
      renderTarget1: renderTarget,
      renderTarget2: renderTarget.clone(),
      writeBuffer: renderTarget,
      readBuffer: renderTarget.clone(),
      passes: [],

      addPass(pass) {
        this.passes.push(pass);
      },

      render: (deltaTime) => {
        // Simple multi-pass rendering
        let inputBuffer = this.composer.readBuffer;
        let outputBuffer = this.composer.writeBuffer;

        for (let i = 0; i < this.composer.passes.length; i++) {
          const pass = this.composer.passes[i];
          if (!pass.enabled) continue;

          pass.render(this.renderer, outputBuffer, inputBuffer, deltaTime);

          // Swap buffers
          const temp = inputBuffer;
          inputBuffer = outputBuffer;
          outputBuffer = temp;
        }
      },

      setSize: (width, height) => {
        this.composer.renderTarget1.setSize(width, height);
        this.composer.renderTarget2.setSize(width, height);
      }
    };
  }

  /**
   * Add render pass
   */
  addRenderPass() {
    const THREE = this.THREE;
    const scene = this.scene;
    const camera = this.camera;

    const renderPass = {
      enabled: true,
      needsSwap: true,

      render: (renderer, writeBuffer, readBuffer) => {
        renderer.setRenderTarget(writeBuffer);
        renderer.render(scene, camera);
      }
    };

    this.composer.addPass(renderPass);
    this.passes.render = renderPass;
  }

  /**
   * Add bloom pass using custom shader
   */
  addBloomPass() {
    const THREE = this.THREE;
    const { strength, radius, threshold } = this.options.bloom;

    // Bloom shader material
    const bloomMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uStrength: { value: strength },
        uRadius: { value: radius },
        uThreshold: { value: threshold },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: this.getBloomFragmentShader()
    });

    const bloomPass = {
      enabled: true,
      needsSwap: true,
      material: bloomMaterial,
      fsQuad: this.createFullscreenQuad(bloomMaterial),

      render: (renderer, writeBuffer, readBuffer) => {
        bloomMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        renderer.setRenderTarget(writeBuffer);
        this.renderFullscreenQuad(renderer, bloomPass.fsQuad);
      }
    };

    this.composer.addPass(bloomPass);
    this.passes.bloom = bloomPass;
  }

  /**
   * Add vignette pass
   */
  addVignettePass() {
    const THREE = this.THREE;
    const { offset, darkness } = this.options.vignette;

    // Vignette shader material
    const vignetteMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uOffset: { value: offset },
        uDarkness: { value: darkness }
      },
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: this.getVignetteFragmentShader()
    });

    const vignettePass = {
      enabled: true,
      needsSwap: true,
      renderToScreen: true,
      material: vignetteMaterial,
      fsQuad: this.createFullscreenQuad(vignetteMaterial),

      render: (renderer, writeBuffer, readBuffer) => {
        vignetteMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        renderer.setRenderTarget(null); // Render to screen
        this.renderFullscreenQuad(renderer, vignettePass.fsQuad);
      }
    };

    this.composer.addPass(vignettePass);
    this.passes.vignette = vignettePass;
  }

  /**
   * Create fullscreen quad for shader passes
   * @param {THREE.ShaderMaterial} material
   * @returns {Object}
   */
  createFullscreenQuad(material) {
    const THREE = this.THREE;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);

    return {
      geometry,
      material,
      mesh,
      camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    };
  }

  /**
   * Render fullscreen quad
   * @param {THREE.WebGLRenderer} renderer
   * @param {Object} fsQuad
   */
  renderFullscreenQuad(renderer, fsQuad) {
    renderer.render(fsQuad.mesh, fsQuad.camera);
  }

  /**
   * Fullscreen vertex shader
   * @returns {string}
   */
  getFullscreenVertexShader() {
    return `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;
  }

  /**
   * Bloom fragment shader (simplified)
   * @returns {string}
   */
  getBloomFragmentShader() {
    return `
      uniform sampler2D tDiffuse;
      uniform float uStrength;
      uniform float uRadius;
      uniform float uThreshold;
      uniform vec2 uResolution;

      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);

        // Extract bright areas
        float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 brightColor = step(uThreshold, brightness) * color.rgb;

        // Simple blur for bloom (5-tap)
        vec2 texelSize = 1.0 / uResolution;
        vec3 bloom = vec3(0.0);

        bloom += texture2D(tDiffuse, vUv + vec2(-uRadius, -uRadius) * texelSize).rgb * 0.0625;
        bloom += texture2D(tDiffuse, vUv + vec2(0.0, -uRadius) * texelSize).rgb * 0.125;
        bloom += texture2D(tDiffuse, vUv + vec2(uRadius, -uRadius) * texelSize).rgb * 0.0625;
        bloom += texture2D(tDiffuse, vUv + vec2(-uRadius, 0.0) * texelSize).rgb * 0.125;
        bloom += texture2D(tDiffuse, vUv).rgb * 0.25;
        bloom += texture2D(tDiffuse, vUv + vec2(uRadius, 0.0) * texelSize).rgb * 0.125;
        bloom += texture2D(tDiffuse, vUv + vec2(-uRadius, uRadius) * texelSize).rgb * 0.0625;
        bloom += texture2D(tDiffuse, vUv + vec2(0.0, uRadius) * texelSize).rgb * 0.125;
        bloom += texture2D(tDiffuse, vUv + vec2(uRadius, uRadius) * texelSize).rgb * 0.0625;

        // Combine original with bloom
        vec3 result = color.rgb + bloom * uStrength * step(uThreshold, brightness);

        gl_FragColor = vec4(result, color.a);
      }
    `;
  }

  /**
   * Vignette fragment shader
   * @returns {string}
   */
  getVignetteFragmentShader() {
    return `
      uniform sampler2D tDiffuse;
      uniform float uOffset;
      uniform float uDarkness;

      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);

        // Calculate vignette
        vec2 uv = (vUv - vec2(0.5)) * vec2(uOffset);
        float vignette = 1.0 - dot(uv, uv);
        vignette = clamp(pow(vignette, uDarkness), 0.0, 1.0);

        gl_FragColor = vec4(color.rgb * vignette, color.a);
      }
    `;
  }

  /**
   * Bind resize handler
   */
  bindResize() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.composer.setSize(width, height);

      // Update bloom resolution uniform
      if (this.passes.bloom) {
        this.passes.bloom.material.uniforms.uResolution.value.set(width, height);
      }
    });
  }

  /**
   * Render with post processing
   * @param {number} deltaTime
   */
  render(deltaTime = 0.016) {
    if (!this.enabled || !this.composer) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.composer.render(deltaTime);
  }

  /**
   * Set bloom strength
   * @param {number} strength
   */
  setBloomStrength(strength) {
    if (this.passes.bloom) {
      this.passes.bloom.material.uniforms.uStrength.value = strength;
    }
  }

  /**
   * Set vignette darkness
   * @param {number} darkness
   */
  setVignetteDarkness(darkness) {
    if (this.passes.vignette) {
      this.passes.vignette.material.uniforms.uDarkness.value = darkness;
    }
  }

  /**
   * Enable/disable post processing
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Enable/disable specific pass
   * @param {string} passName
   * @param {boolean} enabled
   */
  setPassEnabled(passName, enabled) {
    if (this.passes[passName]) {
      this.passes[passName].enabled = enabled;
    }
  }

  /**
   * Get current settings
   * @returns {Object}
   */
  getSettings() {
    return {
      enabled: this.enabled,
      bloom: {
        enabled: this.passes.bloom?.enabled,
        strength: this.passes.bloom?.material.uniforms.uStrength.value,
        threshold: this.passes.bloom?.material.uniforms.uThreshold.value
      },
      vignette: {
        enabled: this.passes.vignette?.enabled,
        offset: this.passes.vignette?.material.uniforms.uOffset.value,
        darkness: this.passes.vignette?.material.uniforms.uDarkness.value
      }
    };
  }

  /**
   * Dispose
   */
  dispose() {
    // Dispose render targets
    if (this.composer) {
      this.composer.renderTarget1?.dispose();
      this.composer.renderTarget2?.dispose();
      this.composer.readBuffer?.dispose();
      this.composer.writeBuffer?.dispose();
    }

    // Dispose pass materials
    Object.values(this.passes).forEach(pass => {
      pass.material?.dispose();
      pass.fsQuad?.geometry?.dispose();
    });

    this.composer = null;
    this.passes = {};
  }
}

// ============================================
// EXPORTS
// ============================================

export { PostProcessing };
export default PostProcessing;
