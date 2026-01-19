/**
 * Build V2 - Custom Shaders
 * Flame, frost, and other visual effect shaders
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// FLAME SHADER
// ============================================

/**
 * Animated flame shader for fire effects
 */
const FlameShader = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
    uBaseColor: { value: null }, // vec3
    uTipColor: { value: null },  // vec3
    uNoiseScale: { value: 3.0 },
    uSpeed: { value: 1.5 }
  },

  vertexShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform float uNoiseScale;
    uniform float uSpeed;

    varying vec2 vUv;
    varying float vDisplacement;

    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;

      // Animated noise displacement
      float noise = snoise(vec3(
        position.x * uNoiseScale,
        position.y * uNoiseScale + uTime * uSpeed,
        position.z * uNoiseScale
      ));

      vDisplacement = noise * uIntensity * (1.0 - uv.y);

      vec3 newPosition = position;
      newPosition.x += noise * 0.1 * uIntensity;
      newPosition.z += noise * 0.1 * uIntensity;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uBaseColor;
    uniform vec3 uTipColor;

    varying vec2 vUv;
    varying float vDisplacement;

    void main() {
      // Gradient from base to tip
      float gradient = pow(1.0 - vUv.y, 1.5);

      // Mix colors based on height
      vec3 color = mix(uTipColor, uBaseColor, gradient);

      // Add flickering
      float flicker = sin(uTime * 10.0 + vUv.x * 20.0) * 0.1 + 0.9;
      color *= flicker;

      // Alpha falloff at edges
      float alpha = gradient * uIntensity;
      alpha *= smoothstep(0.0, 0.3, vUv.y);
      alpha *= smoothstep(1.0, 0.7, abs(vUv.x - 0.5) * 2.0);

      gl_FragColor = vec4(color, alpha);
    }
  `
};

// ============================================
// FROST SHADER
// ============================================

/**
 * Frost/ice crystal shader effect
 */
const FrostShader = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
    uColor: { value: null }, // vec3
    uCrystalScale: { value: 2.0 },
    uSparkle: { value: 0.5 }
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor;
    uniform float uCrystalScale;
    uniform float uSparkle;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    // Hash function for randomness
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // Voronoi for crystal pattern
    float voronoi(vec2 x) {
      vec2 n = floor(x);
      vec2 f = fract(x);

      float md = 8.0;
      for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = vec2(hash(n + g), hash(n + g + vec2(13.0, 7.0)));

          vec2 r = g + o - f;
          float d = dot(r, r);

          md = min(d, md);
        }
      }
      return sqrt(md);
    }

    void main() {
      // Crystal pattern
      float crystals = voronoi(vUv * uCrystalScale * 10.0);

      // Edge glow
      float fresnel = 1.0 - dot(normalize(vViewPosition), vNormal);
      fresnel = pow(fresnel, 2.0);

      // Sparkle effect
      float sparkle = 0.0;
      if (uSparkle > 0.0) {
        vec2 sparkleUv = vUv * 50.0;
        float sparkleNoise = hash(floor(sparkleUv) + floor(uTime * 2.0));
        sparkle = step(0.98, sparkleNoise) * uSparkle;
      }

      // Combine effects
      vec3 color = uColor;
      color += fresnel * 0.3;
      color += crystals * 0.1;
      color += sparkle;

      float alpha = uIntensity * (0.6 + fresnel * 0.4);

      gl_FragColor = vec4(color, alpha);
    }
  `
};

// ============================================
// ENERGY SHADER
// ============================================

/**
 * Energy field shader for magical effects
 */
const EnergyShader = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
    uColor1: { value: null }, // vec3
    uColor2: { value: null }, // vec3
    uFlowSpeed: { value: 1.0 },
    uPulse: { value: 0.5 }
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uFlowSpeed;
    uniform float uPulse;

    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Flow pattern
      float flow = sin(vUv.y * 10.0 - uTime * uFlowSpeed) * 0.5 + 0.5;
      flow += sin(vUv.x * 8.0 + uTime * uFlowSpeed * 0.7) * 0.25;

      // Pulse
      float pulse = sin(uTime * 3.0) * uPulse + (1.0 - uPulse);

      // Color mix
      vec3 color = mix(uColor1, uColor2, flow);
      color *= pulse;

      // Edge glow
      float edge = abs(vUv.x - 0.5) * 2.0;
      edge = 1.0 - smoothstep(0.4, 1.0, edge);

      float alpha = flow * edge * uIntensity;

      gl_FragColor = vec4(color, alpha);
    }
  `
};

// ============================================
// SHADER MATERIAL FACTORY
// ============================================

/**
 * Create shader material from shader definition
 * @param {Object} THREE - Three.js reference
 * @param {Object} shaderDef - Shader definition object
 * @param {Object} uniformValues - Uniform values to set
 * @returns {THREE.ShaderMaterial}
 */
function createShaderMaterial(THREE, shaderDef, uniformValues = {}) {
  const uniforms = {};

  // Clone uniforms
  for (const [key, uniform] of Object.entries(shaderDef.uniforms)) {
    uniforms[key] = { value: uniform.value };
  }

  // Apply custom values
  for (const [key, value] of Object.entries(uniformValues)) {
    if (uniforms[key]) {
      if (value instanceof THREE.Vector3 || value instanceof THREE.Color) {
        uniforms[key].value = value;
      } else if (Array.isArray(value) && value.length === 3) {
        uniforms[key].value = new THREE.Vector3(...value);
      } else {
        uniforms[key].value = value;
      }
    }
  }

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: shaderDef.vertexShader,
    fragmentShader: shaderDef.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });
}

/**
 * Create flame material
 * @param {Object} THREE
 * @param {Object} options
 * @returns {THREE.ShaderMaterial}
 */
function createFlameMaterial(THREE, options = {}) {
  const defaults = {
    uBaseColor: new THREE.Vector3(1.0, 0.3, 0.0),  // Orange
    uTipColor: new THREE.Vector3(1.0, 0.8, 0.2),   // Yellow
    uIntensity: 1.0,
    uNoiseScale: 3.0,
    uSpeed: 1.5
  };

  return createShaderMaterial(THREE, FlameShader, { ...defaults, ...options });
}

/**
 * Create frost material
 * @param {Object} THREE
 * @param {Object} options
 * @returns {THREE.ShaderMaterial}
 */
function createFrostMaterial(THREE, options = {}) {
  const defaults = {
    uColor: new THREE.Vector3(0.7, 0.9, 1.0),  // Ice blue
    uIntensity: 0.8,
    uCrystalScale: 2.0,
    uSparkle: 0.5
  };

  return createShaderMaterial(THREE, FrostShader, { ...defaults, ...options });
}

/**
 * Create energy material
 * @param {Object} THREE
 * @param {Object} options
 * @returns {THREE.ShaderMaterial}
 */
function createEnergyMaterial(THREE, options = {}) {
  const defaults = {
    uColor1: new THREE.Vector3(0.0, 1.0, 0.5),   // Cyan-green
    uColor2: new THREE.Vector3(0.0, 0.5, 1.0),   // Blue
    uIntensity: 1.0,
    uFlowSpeed: 1.0,
    uPulse: 0.5
  };

  return createShaderMaterial(THREE, EnergyShader, { ...defaults, ...options });
}

// ============================================
// EXPORTS
// ============================================

export {
  FlameShader,
  FrostShader,
  EnergyShader,
  createShaderMaterial,
  createFlameMaterial,
  createFrostMaterial,
  createEnergyMaterial
};

export default {
  FlameShader,
  FrostShader,
  EnergyShader,
  createFlameMaterial,
  createFrostMaterial,
  createEnergyMaterial
};
