/* Interactive Three.js 3D Aerodynamic Flight Engine for Enchanted Dragons
   (ridden by Wizards) and Military Fighter Jets (with long-runway takeoff).
   Features custom GLSL Atmospheric Sky Dome, Animated Ocean Shader, Sculpted
   Continuous Terrain & Distant Landmarks, Volumetric Additive Dragonfire,
   PBR Scale/Wing/Robe/Masonry Procedural Textures, Multi-Segment Animated
   Dragon & Wizard Anatomy, Procedural Web Audio, and Unrestricted Free Flight. */
import { createCanvasFlightRenderer } from './flight-canvas.mjs?v=173369c7aae9';
import * as THREE from './vendor/three-flight-r187.mjs?v=2cbcae6acc05';

let Physics = window.EarthFlightPhysics;

// Reusable scratch objects (zero GC allocations inside the render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _col = new THREE.Color();

function detectSoftwareGl(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return /SwiftShader|llvmpipe|softpipe|Software|Mesa|Microsoft Basic/i.test(String(rendererStr || ''));
  } catch {
    return false;
  }
}

/* ── Procedural PBR Texture Suite (100% offline, zero 404s) ──────────── */

function createProceduralTextures(maxAniso = 4) {
  const disposeList = [];
  const register = (canvas, isColor = true, repeatX = 1, repeatY = 1) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, Math.max(1, maxAniso));
    disposeList.push(tex);
    return tex;
  };

  // 1. Overlapping Dragon Scales (albedo sheen + grayscale bump)
  const scaleC = document.createElement('canvas');
  const scaleB = document.createElement('canvas');
  scaleC.width = scaleB.width = 256;
  scaleC.height = scaleB.height = 256;
  const gsc = scaleC.getContext('2d');
  const gsb = scaleB.getContext('2d');
  gsc.fillStyle = '#c8cfd6';
  gsc.fillRect(0, 0, 256, 256);
  gsb.fillStyle = '#404040';
  gsb.fillRect(0, 0, 256, 256);
  const cols = 8, rows = 10, sw = 256 / cols, sh = 256 / rows;
  for (let r = -1; r <= rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const cx = (c + (r % 2) * 0.5) * sw;
      const cy = r * sh;
      const gradC = gsc.createRadialGradient(cx, cy - sh * 0.15, 2, cx, cy, sw * 0.72);
      gradC.addColorStop(0, '#ffffff');
      gradC.addColorStop(0.55, '#d6dce2');
      gradC.addColorStop(0.88, '#8d97a4');
      gradC.addColorStop(1, '#4f5866');
      gsc.fillStyle = gradC;
      gsc.beginPath();
      gsc.moveTo(cx, cy - sh * 0.62);
      gsc.quadraticCurveTo(cx + sw * 0.56, cy - sh * 0.12, cx, cy + sh * 0.66);
      gsc.quadraticCurveTo(cx - sw * 0.56, cy - sh * 0.12, cx, cy - sh * 0.62);
      gsc.fill();
      gsc.strokeStyle = 'rgba(40,48,58,0.45)';
      gsc.lineWidth = 1.4;
      gsc.stroke();

      const gradB = gsb.createRadialGradient(cx, cy - sh * 0.12, 2, cx, cy, sw * 0.68);
      gradB.addColorStop(0, '#f5f5f5');
      gradB.addColorStop(0.7, '#999999');
      gradB.addColorStop(1, '#181818');
      gsb.fillStyle = gradB;
      gsb.beginPath();
      gsb.moveTo(cx, cy - sh * 0.62);
      gsb.quadraticCurveTo(cx + sw * 0.56, cy - sh * 0.12, cx, cy + sh * 0.66);
      gsb.quadraticCurveTo(cx - sw * 0.56, cy - sh * 0.12, cx, cy - sh * 0.62);
      gsb.fill();
    }
  }
  const scaleMap = register(scaleC, true, 3, 4);
  const scaleBump = register(scaleB, false, 3, 4);

  // 2. Translucent Veined Wing Membrane Texture
  const wingC = document.createElement('canvas');
  wingC.width = 256; wingC.height = 256;
  const gw = wingC.getContext('2d');
  const wGrad = gw.createLinearGradient(0, 0, 256, 256);
  wGrad.addColorStop(0, '#c8d2dc');
  wGrad.addColorStop(0.55, '#eef5fa');
  wGrad.addColorStop(1, '#ffffff');
  gw.fillStyle = wGrad;
  gw.fillRect(0, 0, 256, 256);
  // Subtle organic leather fibers & luminous arcane vein tracery
  for (let i = 0; i < 18; i++) {
    gw.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(65,78,92,0.18)';
    gw.lineWidth = i % 3 === 0 ? 2.2 : 1.1;
    gw.beginPath();
    gw.moveTo(0, (i / 18) * 256);
    gw.bezierCurveTo(80, (i / 18) * 240 + 25, 165, (i / 18) * 270 - 18, 256, (i / 18) * 256 + 10);
    gw.stroke();
  }
  const wingMap = register(wingC, true, 1, 1);

  // 3. Celestial Embroidered Wizard Robe Texture
  const robeC = document.createElement('canvas');
  robeC.width = 256; robeC.height = 256;
  const gr = robeC.getContext('2d');
  const rGrad = gr.createLinearGradient(0, 0, 0, 256);
  rGrad.addColorStop(0, '#2a2368');
  rGrad.addColorStop(0.65, '#3b2f88');
  rGrad.addColorStop(1, '#1f184d');
  gr.fillStyle = rGrad;
  gr.fillRect(0, 0, 256, 256);
  // Gold embroidered hem & star motifs
  gr.fillStyle = '#e8c064';
  gr.fillRect(0, 232, 256, 10);
  gr.fillStyle = '#fff0b2';
  gr.fillRect(0, 224, 256, 3);
  for (let i = 0; i < 28; i++) {
    const sx = (i * 53 + 17) % 244 + 6;
    const sy = (i * 71 + 19) % 208 + 8;
    const sr = 2 + (i % 3);
    gr.fillStyle = i % 2 ? '#f7d87c' : '#a8f4ff';
    gr.beginPath();
    gr.moveTo(sx, sy - sr * 1.6);
    gr.lineTo(sx + sr * 0.5, sy - sr * 0.5);
    gr.lineTo(sx + sr * 1.6, sy);
    gr.lineTo(sx + sr * 0.5, sy + sr * 0.5);
    gr.lineTo(sx, sy + sr * 1.6);
    gr.lineTo(sx - sr * 0.5, sy + sr * 0.5);
    gr.lineTo(sx - sr * 1.6, sy);
    gr.lineTo(sx - sr * 0.5, sy - sr * 0.5);
    gr.closePath();
    gr.fill();
  }
  const robeMap = register(robeC, true, 1, 1);

  // 4. Warm Ashlar Limestone Masonry & Bump
  const stoneC = document.createElement('canvas');
  stoneC.width = 256; stoneC.height = 256;
  const gst = stoneC.getContext('2d');
  gst.fillStyle = '#ddd2be';
  gst.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    const y = r * 32;
    for (let c = 0; c < 4; c++) {
      const x = ((c * 64) + (r % 2) * 32) % 256;
      const shade = 210 + ((r * 13 + c * 29) % 28);
      gst.fillStyle = `rgb(${shade}, ${shade - 10}, ${shade - 26})`;
      gst.fillRect(x + 2, y + 2, 60, 28);
    }
    gst.fillStyle = 'rgba(92,76,56,0.34)';
    gst.fillRect(0, y, 256, 2);
  }
  const stoneMap = register(stoneC, true, 2, 2);

  // 5. Terracotta / Oxidized Roof Shingle Texture
  const roofC = document.createElement('canvas');
  roofC.width = 128; roofC.height = 128;
  const gro = roofC.getContext('2d');
  gro.fillStyle = '#d4d4d4';
  gro.fillRect(0, 0, 128, 128);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const v = 185 + ((r * 19 + c * 31) % 45);
      gro.fillStyle = `rgb(${v},${v},${v})`;
      gro.fillRect(c * 16 + 1, r * 16 + 1, 14, 14);
    }
    gro.fillStyle = 'rgba(40,40,40,0.35)';
    gro.fillRect(0, r * 16, 128, 2);
  }
  const roofMap = register(roofC, true, 3, 3);

  // 6. Runway Asphalt Texture with Piano Keys & Centerline
  const rwC = document.createElement('canvas');
  rwC.width = 256; rwC.height = 512;
  const grw = rwC.getContext('2d');
  grw.fillStyle = '#2d3438';
  grw.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 600; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 512;
    grw.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    grw.fillRect(x, y, 3, 5);
  }
  // Edge stripes
  grw.fillStyle = '#e7e2d4';
  grw.fillRect(14, 0, 6, 512);
  grw.fillRect(236, 0, 6, 512);
  // Center dashes
  for (let y = 44; y < 468; y += 46) {
    grw.fillRect(123, y, 10, 26);
  }
  // Piano-key threshold markings at both ends
  for (const endY of [10, 474]) {
    for (let k = 0; k < 6; k++) {
      grw.fillRect(32 + k * 34, endY, 18, 26);
    }
  }
  const runwayMap = register(rwC, true, 1, 1);

  // 7. Volumetric Soft Fire Plume Sprite (radial turbulent cloud)
  const fireC = document.createElement('canvas');
  fireC.width = 128; fireC.height = 128;
  const gf = fireC.getContext('2d');
  const fg = gf.createRadialGradient(64, 64, 4, 64, 64, 62);
  fg.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
  fg.addColorStop(0.22, 'rgba(255, 232, 130, 0.96)');
  fg.addColorStop(0.52, 'rgba(255, 132, 34, 0.72)');
  fg.addColorStop(0.8, 'rgba(210, 38, 12, 0.28)');
  fg.addColorStop(1, 'rgba(120, 10, 0, 0.0)');
  gf.fillStyle = fg;
  gf.fillRect(0, 0, 128, 128);
  // Wispy inner flame licks for organic fire feel
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lx = 64 + Math.cos(a) * 18;
    const ly = 64 + Math.sin(a) * 18;
    const lg = gf.createRadialGradient(lx, ly, 2, lx, ly, 28);
    lg.addColorStop(0, 'rgba(255, 244, 175, 0.45)');
    lg.addColorStop(1, 'rgba(255, 90, 15, 0)');
    gf.fillStyle = lg;
    gf.beginPath(); gf.arc(lx, ly, 28, 0, Math.PI * 2); gf.fill();
  }
  const fireSpriteMap = register(fireC, true, 1, 1);

  // 8. Soft Billowing Smoke / Cloud Puff Sprite
  const smokeC = document.createElement('canvas');
  smokeC.width = 128; smokeC.height = 128;
  const gsm = smokeC.getContext('2d');
  const smg = gsm.createRadialGradient(64, 64, 8, 64, 64, 60);
  smg.addColorStop(0, 'rgba(255,255,255,0.85)');
  smg.addColorStop(0.45, 'rgba(235,235,240,0.48)');
  smg.addColorStop(1, 'rgba(200,200,210,0)');
  gsm.fillStyle = smg;
  gsm.fillRect(0, 0, 128, 128);
  const smokeSpriteMap = register(smokeC, true, 1, 1);

  // 9. Incandescent Ember / Spark Glint Sprite
  const sparkC = document.createElement('canvas');
  sparkC.width = 64; sparkC.height = 64;
  const gsp = sparkC.getContext('2d');
  const spg = gsp.createRadialGradient(32, 32, 1, 32, 32, 30);
  spg.addColorStop(0, 'rgba(255,255,255,1)');
  spg.addColorStop(0.3, 'rgba(255,230,130,0.92)');
  spg.addColorStop(0.65, 'rgba(255,120,30,0.4)');
  spg.addColorStop(1, 'rgba(255,60,10,0)');
  gsp.fillStyle = spg;
  gsp.fillRect(0, 0, 64, 64);
  const sparkSpriteMap = register(sparkC, true, 1, 1);

  // 10. Painterly Tiled Terrain Detail Texture (grass tufts, soil grain & coastal rock strata)
  const terrC = document.createElement('canvas');
  terrC.width = 256; terrC.height = 256;
  const gt = terrC.getContext('2d');
  gt.fillStyle = '#e5e8e2';
  gt.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 480; i++) {
    const x = (i * 67 + 19) % 256;
    const y = (i * 113 + 31) % 256;
    const r = 4 + (i % 9);
    gt.fillStyle = i % 3 === 0 ? 'rgba(255,252,238,0.16)' : i % 3 === 1 ? 'rgba(72,96,68,0.14)' : 'rgba(116,104,84,0.12)';
    gt.beginPath();
    gt.arc(x, y, r, 0, Math.PI * 2);
    gt.fill();
  }
  for (let i = 0; i < 140; i++) {
    const x = (i * 97 + 7) % 256;
    const y = (i * 59 + 13) % 256;
    gt.strokeStyle = i % 2 ? 'rgba(64,88,58,0.18)' : 'rgba(248,244,226,0.16)';
    gt.lineWidth = 1.5;
    gt.beginPath();
    gt.moveTo(x, y);
    gt.lineTo(x + ((i % 7) - 3) * 3, y - 5 - (i % 5));
    gt.stroke();
  }
  const terrainDetailMap = register(terrC, true, 26, 26);

  return {
    scaleMap,
    scaleBump,
    wingMap,
    robeMap,
    stoneMap,
    roofMap,
    runwayMap,
    fireSpriteMap,
    smokeSpriteMap,
    sparkSpriteMap,
    terrainDetailMap,
    dispose() { disposeList.forEach(t => t.dispose()); }
  };
}

/* ── Time-of-Day Atmosphere Presets (Live Switchable with T) ─────────── */

const SKY_PRESETS = [
  {
    id: 'day',
    label: 'Sunlit Day',
    zenith: 0x1a5f9e,
    horizon: 0x9cd4ea,
    ground: 0x5c8068,
    fog: 0x98cfe4,
    fogDensity: 0.00058,
    sunColor: 0xfff5db,
    sunIntensity: 2.35,
    sunDir: [0.46, 0.62, 0.63],
    hemiSky: 0xcbeeff,
    hemiGround: 0x546e4c,
    hemiIntensity: 1.15,
    oceanDeep: 0x0c4b68,
    oceanShallow: 0x2ca2a8,
    cloudColor: 0xfefaf2,
    starAlpha: 0.0,
    auroraAlpha: 0.0,
    windowGlow: 0.12,
    exposure: 1.1
  },
  {
    id: 'sunset',
    label: 'Golden Sunset',
    zenith: 0x1f2b5c,
    horizon: 0xf2935c,
    ground: 0x3b2c38,
    fog: 0xd98a62,
    fogDensity: 0.00066,
    sunColor: 0xffa654,
    sunIntensity: 2.65,
    sunDir: [-0.72, 0.22, -0.66],
    hemiSky: 0xffb380,
    hemiGround: 0x3d3340,
    hemiIntensity: 0.95,
    oceanDeep: 0x18324d,
    oceanShallow: 0x3f6b7d,
    cloudColor: 0xffcaa2,
    starAlpha: 0.18,
    auroraAlpha: 0.05,
    windowGlow: 1.0,
    exposure: 1.05
  },
  {
    id: 'night',
    label: 'Starlit Aurora',
    zenith: 0x060c1f,
    horizon: 0x193152,
    ground: 0x0c1724,
    fog: 0x152740,
    fogDensity: 0.00068,
    sunColor: 0xaad4ff,
    sunIntensity: 1.25,
    sunDir: [0.35, 0.56, -0.75],
    hemiSky: 0x5477b0,
    hemiGround: 0x142228,
    hemiIntensity: 0.72,
    oceanDeep: 0x071a2d,
    oceanShallow: 0x123e54,
    cloudColor: 0x4b5c7a,
    starAlpha: 1.0,
    auroraAlpha: 0.82,
    windowGlow: 1.65,
    exposure: 1.02
  },
  {
    id: 'dawn',
    label: 'Rose Dawn',
    zenith: 0x2f538c,
    horizon: 0xf7b99b,
    ground: 0x485c54,
    fog: 0xe6b5a0,
    fogDensity: 0.00062,
    sunColor: 0xffd2a1,
    sunIntensity: 2.1,
    sunDir: [0.78, 0.28, 0.56],
    hemiSky: 0xffd6c2,
    hemiGround: 0x4c6352,
    hemiIntensity: 1.05,
    oceanDeep: 0x174566,
    oceanShallow: 0x3f919c,
    cloudColor: 0xffe4d6,
    starAlpha: 0.06,
    auroraAlpha: 0.0,
    windowGlow: 0.45,
    exposure: 1.08
  }
];

/* ── Custom GLSL Atmospheric Sky Dome (Rayleigh + Sun/Moon + Stars + Aurora) ── */

function createAtmosphericSkyDome() {
  const geo = new THREE.SphereGeometry(1900, 32, 20);
  const uniforms = {
    uTime: { value: 0 },
    uZenith: { value: new THREE.Color(SKY_PRESETS[0].zenith) },
    uHorizon: { value: new THREE.Color(SKY_PRESETS[0].horizon) },
    uGround: { value: new THREE.Color(SKY_PRESETS[0].ground) },
    uSunColor: { value: new THREE.Color(SKY_PRESETS[0].sunColor) },
    uSunDir: { value: new THREE.Vector3(...SKY_PRESETS[0].sunDir).normalize() },
    uStarAlpha: { value: 0.0 },
    uAuroraAlpha: { value: 0.0 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uStarAlpha;
      uniform float uAuroraAlpha;
      varying vec3 vDir;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;

        // Smooth Rayleigh sky gradient with warm horizon band
        float upMix = pow(clamp(h, 0.0, 1.0), 0.56);
        vec3 sky = mix(uHorizon, uZenith, upMix);
        float belowMix = smoothstep(0.0, -0.25, h);
        sky = mix(sky, uGround, belowMix);

        // Sun / Moon disc & Mie atmospheric scattering halo
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float mieWide = pow(sunDot, 5.0) * 0.34;
        float mieTight = pow(sunDot, 42.0) * 0.55;
        float disc = smoothstep(0.9982, 0.9994, sunDot) * 2.2;
        sky += uSunColor * (mieWide + mieTight + disc);

        // Twinkling procedural starfield in upper sky (Sunset / Night)
        if (uStarAlpha > 0.01 && h > 0.02) {
          vec3 grid = floor(dir * 210.0);
          float n = hash31(grid);
          if (n > 0.9935) {
            float twinkle = 0.65 + 0.35 * sin(uTime * 2.6 + n * 420.0);
            float starVis = smoothstep(0.02, 0.25, h) * uStarAlpha * twinkle;
            sky += vec3(0.88, 0.94, 1.0) * starVis * (n - 0.9935) * 185.0;
          }
        }

        // Shimmering polar aurora ribbons at Starlit Night
        if (uAuroraAlpha > 0.01 && h > 0.08 && h < 0.72) {
          float band = sin(dir.x * 7.5 + uTime * 0.28) * 0.5 + sin(dir.z * 5.2 - uTime * 0.19) * 0.5;
          float wave = smoothstep(0.15, 0.85, sin(dir.x * 14.0 + dir.z * 9.0 + band * 2.6 + uTime * 0.35) * 0.5 + 0.5);
          float vert = smoothstep(0.08, 0.26, h) * (1.0 - smoothstep(0.32, 0.68, h));
          vec3 aurCol = mix(vec3(0.12, 0.95, 0.68), vec3(0.45, 0.38, 0.98), clamp(band * 0.5 + 0.5, 0.0, 1.0));
          sky += aurCol * wave * vert * uAuroraAlpha * 0.48;
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

/* ── Custom GLSL Animated Endless Ocean Shader ───────────────────────── */

function createOceanShaderMesh(shoreZ, hasWaterfront, isIsland) {
  const geo = new THREE.PlaneGeometry(3600, 3600, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: { value: 0 },
    uDeepColor: { value: new THREE.Color(SKY_PRESETS[0].oceanDeep) },
    uShallowColor: { value: new THREE.Color(SKY_PRESETS[0].oceanShallow) },
    uSkyHorizon: { value: new THREE.Color(SKY_PRESETS[0].horizon) },
    uSunColor: { value: new THREE.Color(SKY_PRESETS[0].sunColor) },
    uSunDir: { value: new THREE.Vector3(...SKY_PRESETS[0].sunDir).normalize() },
    uFogColor: { value: new THREE.Color(SKY_PRESETS[0].fog) },
    uFogDensity: { value: SKY_PRESETS[0].fogDensity },
    uShoreZ: { value: shoreZ },
    uHasCoast: { value: hasWaterfront && !isIsland ? 1.0 : 0.0 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSkyHorizon;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uShoreZ;
      uniform float uHasCoast;
      varying vec3 vWorldPos;

      float waveH(vec2 p, float t) {
        float w = 0.0;
        w += sin(p.x * 0.11 + t * 1.15 + cos(p.y * 0.07)) * 0.42;
        w += sin(p.y * 0.16 - t * 0.92 + p.x * 0.05) * 0.30;
        w += sin((p.x - p.y) * 0.27 + t * 1.65) * 0.16;
        w += cos((p.x + p.y) * 0.48 - t * 2.15) * 0.08;
        return w;
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float e = 0.65;
        float h0 = waveH(p, uTime);
        float hx = waveH(p + vec2(e, 0.0), uTime);
        float hz = waveH(p + vec2(0.0, e), uTime);
        vec3 N = normalize(vec3((h0 - hx) * 0.28, 1.0, (h0 - hz) * 0.28));

        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uSunDir);

        // Depth transition: turquoise near shore/islands, rich sapphire in deep ocean
        float coastDist = uHasCoast > 0.5 ? max(0.0, vWorldPos.z - uShoreZ) : length(p) * 0.45;
        float shallowMask = 1.0 - smoothstep(0.0, 155.0, coastDist);
        vec3 waterCol = mix(uDeepColor, uShallowColor, shallowMask * 0.85 + 0.12 * clamp(h0 * 0.5 + 0.5, 0.0, 1.0));

        // Fresnel sky reflection
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.6);
        waterCol = mix(waterCol, uSkyHorizon * 0.96, clamp(fresnel * 0.78, 0.0, 0.82));

        // Sparkling sun glitter path across wave facets
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 110.0) * 1.65;
        float broadSpec = pow(max(dot(N, H), 0.0), 18.0) * 0.22;
        waterCol += uSunColor * (spec + broadSpec);

        // Coastal surf foam bands gently lapping the shoreline
        if (uHasCoast > 0.5 && coastDist < 22.0) {
          float surfWave = sin(coastDist * 1.15 - uTime * 2.3 + h0 * 2.0);
          float foam = smoothstep(0.45, 0.92, surfWave) * (1.0 - coastDist / 22.0);
          float shoreLine = smoothstep(3.2, 0.0, coastDist) * 0.85;
          waterCol = mix(waterCol, vec3(0.92, 0.97, 0.98), clamp(foam * 0.55 + shoreLine, 0.0, 0.9));
        }

        // Subtle whitecap crest sparkles far out at sea
        float crest = smoothstep(0.66, 0.92, h0);
        waterCol = mix(waterCol, vec3(0.86, 0.94, 0.97), crest * 0.22);

        // Seamless exponential distance fog matching scene horizon
        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        waterCol = mix(waterCol, uFogColor, clamp(fogFactor, 0.0, 1.0));

        gl_FragColor = vec4(waterCol, 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.35;
  mesh.renderOrder = -4;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

/* ── Continuous Sculpted Terrain Heightfield (Town Flatland → Mountains & Islands) ── */

function createTerrainHeightFn(shoreZ, hasWater, isIsland, distantIslands) {
  return function terrainHeightAt(x, z) {
    // Check distant ocean islands first (always raised above sea level!)
    for (let i = 0; i < distantIslands.length; i++) {
      const isl = distantIslands[i];
      const d = Math.hypot(x - isl.x, z - isl.z);
      if (d < isl.radius) {
        const t = 1 - d / isl.radius;
        const smooth = t * t * (3 - 2 * t);
        if (isl.crater) {
          // Volcano peak with dramatic caldera rim & glowing crater bowl
          const rim = Math.sin(t * Math.PI * 0.88);
          return Math.max(0.2, rim * isl.height + (t > 0.72 ? -(t - 0.72) * isl.height * 1.4 : 0));
        }
        return Math.max(0.2, smooth * isl.height + Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.5 * smooth);
      }
    }

    if (isIsland) {
      const d = Math.max(Math.abs(x), Math.abs(z));
      return d < 58 ? 0 : -4;
    }

    // Coastal sea drop-off south of the quay
    if (hasWater && z > shoreZ + 2) {
      return -3.2;
    }

    // Keep the entire town district, expanded perimeter, and Military Airbase + runway flat & crisp
    const townClear = Math.max(Math.abs(x - 18) / 145, Math.abs(z + 8) / 96);
    if (townClear <= 1.0) return 0;

    // Smooth blend from flat town plains into lush rolling foothills and majestic layered alpine massifs!
    const blend = Math.min(1, Math.max(0, (townClear - 1.0) / 1.05));
    const smoothBlend = blend * blend * (3 - 2 * blend);

    // Coastal taper so mountains rise majestically inland while tapering cleanly into sandy coves near the shore
    const coastFactor = hasWater ? Math.min(1, Math.max(0, (shoreZ - 18 - z) / 190)) : 1;

    // Smooth multi-octave alpine ridge noise (broad sweeping valleys & sculpted summits — zero spiky cones!)
    const n1 = Math.sin(x * 0.0042 + 0.5) * Math.cos(z * 0.0044 - 0.35);
    const n2 = Math.sin(x * 0.0095 - z * 0.0072 + 1.1) * 0.48;
    const n3 = Math.cos((x + z) * 0.0155) * 0.22;
    const ridgeA = 1.0 - Math.abs(Math.sin(x * 0.0048 - z * 0.0038 + 0.6));
    const ridgeB = 1.0 - Math.abs(Math.cos(x * 0.0036 + z * 0.0052 - 0.4));
    const massif = Math.pow(Math.max(0, ridgeA * 0.65 + ridgeB * 0.35), 1.85) * 98;
    const rolling = (n1 * 0.5 + 0.5) * 34 + (n2 * 0.5 + 0.5) * 16 + (n3 * 0.5 + 0.5) * 7;

    const h = (massif + rolling) * smoothBlend * (0.18 + 0.82 * coastFactor);
    return Math.max(0, h);
  };
}

/* ── Ultra-Detailed Composite 3D Enchanted Dragon + Wizard Rider ─────── */

function buildEnchantedDragon(palette = {}, rider = {}, textures = null) {
  const root = new THREE.Group();
  const scaleCol = new THREE.Color(palette.scale || '#e2a63b');
  const accentCol = new THREE.Color(palette.accent || '#fff0b2');
  const wingCol = new THREE.Color(palette.wing || '#9e4422');
  const auraCol = new THREE.Color(palette.aura || '#ffcf66');
  const fireCol = new THREE.Color(palette.fire || '#ff8828');

  // Rich PBR Materials with varied roughness/metalness & procedural maps
  const scaleMat = new THREE.MeshPhysicalMaterial({
    color: scaleCol,
    map: textures?.scaleMap || null,
    bumpMap: textures?.scaleBump || null,
    bumpScale: 0.06,
    roughness: 0.32,
    metalness: 0.42,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
    emissive: scaleCol.clone().multiplyScalar(0.12)
  });

  const bellyMat = new THREE.MeshStandardMaterial({
    color: accentCol.clone().lerp(new THREE.Color('#f7e4b0'), 0.62),
    roughness: 0.48,
    metalness: 0.22
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: auraCol,
    emissiveIntensity: 1.15,
    roughness: 0.14,
    metalness: 0.35
  });

  const wingMembraneMat = new THREE.MeshPhysicalMaterial({
    color: wingCol,
    map: textures?.wingMap || null,
    emissive: auraCol.clone().multiplyScalar(0.24),
    roughness: 0.42,
    metalness: 0.12,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.93
  });

  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xf4dca0,
    roughness: 0.28,
    metalness: 0.55
  });

  const boneSparMat = new THREE.MeshStandardMaterial({
    color: scaleCol.clone().lerp(new THREE.Color('#5c4632'), 0.48),
    roughness: 0.45,
    metalness: 0.32
  });

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff8be });
  const magmaMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.0 });

  // 1. Sculpted Muscular Torso via LatheGeometry (broad chest tapering to powerful waist & hips)
  const torsoPts = [
    new THREE.Vector2(0.05, -2.05),
    new THREE.Vector2(0.36, -1.85),
    new THREE.Vector2(0.68, -1.30),
    new THREE.Vector2(0.86, -0.55),
    new THREE.Vector2(0.76, 0.25),
    new THREE.Vector2(0.58, 1.05),
    new THREE.Vector2(0.40, 1.65),
    new THREE.Vector2(0.14, 1.95)
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoPts, 14);
  torsoGeo.rotateX(Math.PI / 2);
  torsoGeo.scale(0.95, 0.86, 1.0);
  const torso = new THREE.Mesh(torsoGeo, scaleMat);
  root.add(torso);

  // Overlapping Armored Ventral Belly Scutes along underside
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const z = -1.25 + t * 2.55;
    const r = 0.68 - Math.abs(t - 0.32) * 0.45;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.64, 0.34, 8, 1, false, -Math.PI * 0.45, Math.PI * 0.9), bellyMat);
    plate.rotation.x = Math.PI / 2;
    plate.rotation.z = Math.PI;
    plate.position.set(0, -0.22 - (1 - Math.abs(t - 0.3)) * 0.14, z);
    root.add(plate);
  }

  // Sculpted Dorsal Spine Crest Blades along back
  for (let i = 0; i < 9; i++) {
    const z = -1.35 + i * 0.38;
    const scaleH = 0.38 - Math.abs(i - 2.5) * 0.032;
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.11, Math.max(0.18, scaleH), 4), i % 2 === 0 ? crystalMat : hornMat);
    fin.position.set(0, 0.68 - Math.abs(i - 2) * 0.035, z);
    fin.rotation.x = -0.45;
    fin.scale.set(0.55, 1.0, 1.65);
    root.add(fin);
  }

  // 2. Sculpted Organic S-Curved Muscular Neck (seamless rounded joints — ZERO exposed cylinder endcaps!)
  const neckBase = new THREE.Group();
  neckBase.position.set(0, 0.22, -1.52);

  // Seamless shoulder-to-lower-neck muscular loft
  const neckLoft1Pts = [
    new THREE.Vector2(0.18, 0.0),
    new THREE.Vector2(0.56, 0.16),
    new THREE.Vector2(0.50, 0.55),
    new THREE.Vector2(0.41, 1.02),
    new THREE.Vector2(0.35, 1.28),
    new THREE.Vector2(0.14, 1.40)
  ];
  const neckLoft1Geo = new THREE.LatheGeometry(neckLoft1Pts, 12);
  neckLoft1Geo.rotateX(-Math.PI / 2);
  neckLoft1Geo.scale(0.95, 0.88, 1.0);
  const neckSeg1 = new THREE.Mesh(neckLoft1Geo, scaleMat);
  neckSeg1.rotation.x = 0.36;
  neckSeg1.position.set(0, -0.04, 0.12);
  neckBase.add(neckSeg1);

  // Ventral armored neck scutes along lower neck
  for (let i = 0; i < 3; i++) {
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.36 - i * 0.04, 10, 8), bellyMat);
    sc.scale.set(0.88, 0.55, 0.92);
    sc.position.set(0, 0.04 + i * 0.14, -0.22 - i * 0.30);
    neckBase.add(sc);
  }

  const neckUpper = new THREE.Group();
  neckUpper.position.set(0, 0.42, -0.96);

  // Seamless upper-neck muscular loft curving gracefully into cranium
  const neckLoft2Pts = [
    new THREE.Vector2(0.14, 0.0),
    new THREE.Vector2(0.39, 0.14),
    new THREE.Vector2(0.35, 0.52),
    new THREE.Vector2(0.30, 0.96),
    new THREE.Vector2(0.25, 1.18),
    new THREE.Vector2(0.10, 1.28)
  ];
  const neckLoft2Geo = new THREE.LatheGeometry(neckLoft2Pts, 12);
  neckLoft2Geo.rotateX(-Math.PI / 2);
  neckLoft2Geo.scale(0.92, 0.88, 1.0);
  const neckSeg2 = new THREE.Mesh(neckLoft2Geo, scaleMat);
  neckSeg2.rotation.x = 0.12;
  neckSeg2.position.set(0, -0.02, 0.10);
  neckUpper.add(neckSeg2);

  // Neck dorsal crystal spines & ornate gilded dragon collar
  for (let i = 0; i < 4; i++) {
    const ns = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.30 - i * 0.02, 4), i % 2 === 0 ? crystalMat : hornMat);
    ns.position.set(0, 0.34 + i * 0.02, -0.10 - i * 0.25);
    ns.rotation.x = -0.58;
    ns.scale.set(0.5, 1, 1.55);
    neckUpper.add(ns);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.048, 8, 16), hornMat);
  collar.position.set(0, 0.08, -0.34);
  neckUpper.add(collar);

  // 3. Sculpted Horned Draconic Head & Articulated Fire-Lit Jaw
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.16, -1.02);

  // Upper cranium & tapered armored snout
  const cranium = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), scaleMat);
  cranium.scale.set(0.95, 0.72, 1.45);
  cranium.position.set(0, 0.10, -0.25);
  headGroup.add(cranium);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.33, 1.12, 8), scaleMat);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(1.0, 1.0, 0.68);
  snout.position.set(0, 0.04, -0.98);
  headGroup.add(snout);

  // Snout ridge & flared nostrils
  const noseTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), hornMat);
  noseTip.scale.set(1.0, 0.75, 1.15);
  noseTip.position.set(0, 0.12, -1.48);
  headGroup.add(noseTip);

  // Articulated Lower Jaw with Fangs & Glowing Inner Magma Throat
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.10, -0.20);

  const lowerJaw = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.25, 1.02, 7), bellyMat);
  lowerJaw.rotation.x = Math.PI / 2;
  lowerJaw.scale.set(0.95, 1.0, 0.52);
  lowerJaw.position.set(0, -0.06, -0.62);
  jawPivot.add(lowerJaw);

  const throatGlow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), magmaMat);
  throatGlow.scale.set(0.85, 0.65, 1.85);
  throatGlow.position.set(0, 0.04, -0.48);
  jawPivot.add(throatGlow);

  // Upper & lower ivory fangs
  for (const side of [-1, 1]) {
    const fangU = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), hornMat);
    fangU.rotation.x = Math.PI;
    fangU.position.set(side * 0.14, -0.06, -1.16);
    headGroup.add(fangU);

    const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.14, 5), hornMat);
    fangL.position.set(side * 0.11, 0.03, -0.96);
    jawPivot.add(fangL);

    // Swept Curved Crown Horns via TubeGeometry!
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.22, 0.26, -0.12),
      new THREE.Vector3(side * 0.42, 0.56, 0.36),
      new THREE.Vector3(side * 0.54, 0.78, 0.96),
      new THREE.Vector3(side * 0.46, 0.94, 1.38)
    ]);
    const mainHorn = new THREE.Mesh(new THREE.TubeGeometry(hornCurve, 10, 0.065, 6, false), hornMat);
    headGroup.add(mainHorn);

    // Secondary cheek/frill horn
    const subHorn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.62, 6), hornMat);
    subHorn.position.set(side * 0.34, 0.06, 0.12);
    subHorn.rotation.set(1.22, 0, side * -0.45);
    headGroup.add(subHorn);

    // Brow ridge & fierce glowing draconic eye
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.34), hornMat);
    brow.position.set(side * 0.28, 0.22, -0.58);
    brow.rotation.z = side * -0.25;
    headGroup.add(brow);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), eyeMat);
    eye.scale.set(0.8, 0.72, 1.15);
    eye.position.set(side * 0.29, 0.12, -0.62);
    headGroup.add(eye);
  }

  headGroup.add(jawPivot);
  neckUpper.add(headGroup);
  neckBase.add(neckUpper);
  root.add(neckBase);

  // 4. Sculpted 8-Segment Smoothly Undulating Tail with Crystalline Spade Fin
  const tailSegments = [];
  let tailParent = root;
  for (let i = 0; i < 8; i++) {
    const segGroup = new THREE.Group();
    segGroup.position.set(0, i === 0 ? 0.0 : 0, i === 0 ? 1.72 : 0.78);
    const rTop = Math.max(0.075, 0.38 - i * 0.042);
    const rBot = Math.max(0.055, rTop - 0.045);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rBot, rTop, 0.84, 8), scaleMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = 0.38;
    segGroup.add(mesh);

    const tSpike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24 - i * 0.018, 4), i % 2 ? hornMat : crystalMat);
    tSpike.position.set(0, rTop + 0.08, 0.38);
    tSpike.rotation.x = -0.55;
    segGroup.add(tSpike);

    if (i === 7) {
      // Sculpted beveled spade tail fin
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.quadraticCurveTo(0.68, 0.32, 0.56, 0.92);
      finShape.lineTo(0, 1.48);
      finShape.lineTo(-0.56, 0.92);
      finShape.quadraticCurveTo(-0.68, 0.32, 0, 0);
      const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
      finGeo.rotateX(Math.PI / 2);
      const finMesh = new THREE.Mesh(finGeo, crystalMat);
      finMesh.position.set(0, 0.02, 0.58);
      segGroup.add(finMesh);
    }

    tailParent.add(segGroup);
    tailSegments.push(segGroup);
    tailParent = segGroup;
  }

  // 5. Sweeping Anatomical Arched Wings (Shoulder -> Elbow -> 4 Radiating Wing Fingers + Cambered Scalloped Membranes!)
  const ribMat = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: auraCol,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.48
  });

  function makeWing(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.62, 0.40, -0.45);

    // Muscular wing arm (humerus)
    const humerusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 1.4, 0.32, -0.35),
      new THREE.Vector3(side * 2.85, 0.22, -0.52)
    ]);
    const humerus = new THREE.Mesh(new THREE.TubeGeometry(humerusCurve, 8, 0.14, 7, false), boneSparMat);
    shoulder.add(humerus);

    // Inner patagium membrane (mirrored cleanly in 2D shape coordinates — NEVER negative scale so normals stay sunlit!)
    const innerShape = new THREE.Shape();
    if (side > 0) {
      innerShape.moveTo(0, 0.05);
      innerShape.quadraticCurveTo(1.4, 0.42, 2.85, 0.52);
      innerShape.lineTo(2.65, -2.55);
      innerShape.quadraticCurveTo(1.65, -1.92, 0.95, -2.25);
      innerShape.quadraticCurveTo(0.35, -1.85, 0.0, -2.15);
    } else {
      innerShape.moveTo(0, 0.05);
      innerShape.lineTo(0.0, -2.15);
      innerShape.quadraticCurveTo(-0.35, -1.85, -0.95, -2.25);
      innerShape.quadraticCurveTo(-1.65, -1.92, -2.65, -2.55);
      innerShape.lineTo(-2.85, 0.52);
      innerShape.quadraticCurveTo(-1.4, 0.42, 0, 0.05);
    }
    innerShape.closePath();
    const innerGeo = new THREE.ExtrudeGeometry(innerShape, { depth: 0.05, bevelEnabled: false });
    innerGeo.rotateX(-Math.PI / 2);
    innerGeo.computeVertexNormals();
    const innerMesh = new THREE.Mesh(innerGeo, wingMembraneMat);
    innerMesh.position.y = 0.12;
    innerMesh.rotation.z = side * 0.08;
    shoulder.add(innerMesh);

    // Outer Wing Group (Elbow / Wrist + Wing Thumb Claw + 4 Radiating Fingers + Wide Scalloped Sail!)
    const elbow = new THREE.Group();
    elbow.position.set(side * 2.85, 0.22, -0.52);

    // Wing thumb claw & arcane crest crystal at wrist joint
    const thumbClaw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.58, 6), hornMat);
    thumbClaw.position.set(side * 0.12, 0.18, -0.26);
    thumbClaw.rotation.set(-0.75, 0, side * -0.25);
    elbow.add(thumbClaw);

    const elbowCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), crystalMat);
    elbowCrystal.position.set(0, 0.16, -0.05);
    elbow.add(elbowCrystal);

    // Leading-edge wing finger (swept majestic 4.6m span!)
    const leadCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 2.2, 0.24, 0.15),
      new THREE.Vector3(side * 4.55, -0.08, 0.92)
    ]);
    const leadSpar = new THREE.Mesh(new THREE.TubeGeometry(leadCurve, 10, 0.095, 7, false), boneSparMat);
    elbow.add(leadSpar);

    // Wide sweeping scalloped outer wing sail (positive winding on both sides for unified sunlit sheen!)
    const outerShape = new THREE.Shape();
    if (side > 0) {
      outerShape.moveTo(0, 0);
      outerShape.quadraticCurveTo(2.2, 0.08, 4.55, -0.92);
      outerShape.quadraticCurveTo(3.75, -1.75, 3.35, -2.95);
      outerShape.quadraticCurveTo(2.55, -2.18, 2.05, -3.15);
      outerShape.quadraticCurveTo(1.30, -2.28, 0.78, -2.95);
      outerShape.quadraticCurveTo(0.25, -2.25, -0.25, -2.62);
    } else {
      outerShape.moveTo(0, 0);
      outerShape.lineTo(0.25, -2.62);
      outerShape.quadraticCurveTo(-0.25, -2.25, -0.78, -2.95);
      outerShape.quadraticCurveTo(-1.30, -2.28, -2.05, -3.15);
      outerShape.quadraticCurveTo(-2.55, -2.18, -3.35, -2.95);
      outerShape.quadraticCurveTo(-3.75, -1.75, -4.55, -0.92);
      outerShape.quadraticCurveTo(-2.2, 0.08, 0, 0);
    }
    outerShape.closePath();
    const outerGeo = new THREE.ExtrudeGeometry(outerShape, { depth: 0.045, bevelEnabled: false });
    outerGeo.rotateX(-Math.PI / 2);
    outerGeo.computeVertexNormals();
    const outerMesh = new THREE.Mesh(outerGeo, wingMembraneMat);
    outerMesh.position.y = 0.04;
    outerMesh.rotation.z = side * -0.04;
    elbow.add(outerMesh);

    // 4 Radiating Curved Wing-Finger Bones fanning through the scalloped sail
    const fingers = [
      [side * 3.35, -0.06, 2.95],
      [side * 2.05, -0.04, 3.15],
      [side * 0.78, -0.02, 2.95],
      [side * -0.22, 0.0, 2.55]
    ];
    for (const [fx, fy, fz] of fingers) {
      const fc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.06, 0),
        new THREE.Vector3(fx * 0.55, fy + 0.12, fz * 0.48),
        new THREE.Vector3(fx, fy, fz)
      ]);
      const fMesh = new THREE.Mesh(new THREE.TubeGeometry(fc, 6, 0.036, 5, false), ribMat);
      elbow.add(fMesh);
    }

    // Wingtip glowing anchor for arcane flight ribbons
    const tipAnchor = new THREE.Object3D();
    tipAnchor.position.set(side * 4.55, -0.08, 0.92);
    elbow.add(tipAnchor);

    const tipCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.20, 0), crystalMat);
    tipCrystal.scale.set(0.75, 1.35, 1.35);
    tipCrystal.position.copy(tipAnchor.position);
    elbow.add(tipCrystal);

    shoulder.add(elbow);
    return { shoulder, elbow, tipAnchor };
  }

  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  root.add(leftWing.shoulder, rightWing.shoulder);

  // 6. Articulated Four Muscular Clawed Limbs (tuck in fast flight, extend when hovering/perched!)
  const legs = [];
  for (const side of [-1, 1]) {
    for (const [isFront, zOff] of [[true, -0.82], [false, 0.88]]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.52, -0.35, zOff);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.76, 7), scaleMat);
      thigh.position.set(0, -0.34, 0.08);
      thigh.rotation.x = 0.25;
      legGroup.add(thigh);

      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.72, 6), scaleMat);
      shin.position.set(0, -0.86, -0.06);
      shin.rotation.x = -0.35;
      legGroup.add(shin);

      // Three golden talons on each foot
      for (const tc of [-0.09, 0, 0.09]) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.26, 5), hornMat);
        claw.position.set(tc, -1.20, -0.22);
        claw.rotation.x = -0.8;
        legGroup.add(claw);
      }

      root.add(legGroup);
      legs.push({ group: legGroup, isFront });
    }
  }

  // 7. Ultra-Detailed 3D Wizard Rider on Ornate Dragon Saddle
  const wizardGroup = new THREE.Group();
  wizardGroup.position.set(0, 0.68, -0.32);

  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3620, roughness: 0.62, metalness: 0.18 });
  const robeMat = new THREE.MeshStandardMaterial({
    color: rider.robeColor ? new THREE.Color(rider.robeColor) : new THREE.Color(0xffffff),
    map: textures?.robeMap || null,
    roughness: 0.58,
    metalness: 0.14
  });
  const mantleMat = new THREE.MeshStandardMaterial({ color: 0x1e2b58, roughness: 0.52, metalness: 0.22 });
  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x4b3896,
    map: textures?.robeMap || null,
    roughness: 0.55,
    metalness: 0.16,
    side: THREE.DoubleSide
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdba984, roughness: 0.68 });
  const beardMat = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.78 });

  // Sculpted Dragon Saddle with high gilded cantle, pommel & side saddlebags
  const saddleBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 1.05), leatherMat);
  saddleBase.position.set(0, 0.06, 0);
  const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.36, 7), hornMat);
  pommel.position.set(0, 0.26, -0.45);
  pommel.rotation.x = -0.32;
  const cantle = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.34, 0.14), leatherMat);
  cantle.position.set(0, 0.26, 0.46);
  cantle.rotation.x = 0.22;
  wizardGroup.add(saddleBase, pommel, cantle);

  for (const side of [-1, 1]) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.42), leatherMat);
    bag.position.set(side * 0.46, -0.04, 0.14);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.12), hornMat);
    buckle.position.set(side * 0.46, 0.02, 0.14);
    wizardGroup.add(bag, buckle);
  }

  // Draped Wizard Lower Robes + Gold Sash Belt + Upper Tunic & Shoulder Mantle
  const lowerRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.40, 0.68, 12), robeMat);
  lowerRobe.position.set(0, 0.42, 0.02);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 14), hornMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.set(0, 0.66, 0.0);
  const torsoWiz = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.44, 10), robeMat);
  torsoWiz.position.set(0, 0.86, -0.02);
  const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 12), mantleMat);
  mantle.position.set(0, 1.02, 0.0);
  wizardGroup.add(lowerRobe, belt, torsoWiz, mantle);

  // Expressive Wizard Head + Flowing Silver Beard + Detailed Star-Banded Pointed Hat
  const wizHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skinMat);
  wizHead.position.set(0, 1.22, -0.05);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 7), beardMat);
  beard.rotation.x = Math.PI - 0.18;
  beard.position.set(0, 1.05, -0.17);
  wizardGroup.add(wizHead, beard);

  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 1.34, -0.04);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.045, 16), robeMat);
  const hatCrown = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 12), robeMat);
  hatCrown.position.set(0, 0.26, 0.04);
  hatCrown.rotation.x = 0.22;
  const hatTip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.36, 8), robeMat);
  hatTip.position.set(0, 0.56, 0.18);
  hatTip.rotation.x = 0.68;
  const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.032, 6, 16), hornMat);
  hatBand.rotation.x = Math.PI / 2;
  hatBand.position.set(0, 0.06, 0.0);
  hatGroup.add(hatBrim, hatCrown, hatTip, hatBand);
  wizardGroup.add(hatGroup);

  // Articulated Wizard Arms (Left holding glowing reins, Right wielding Ornate Arcane Staff!)
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.56, 7), robeMat);
  leftArm.position.set(-0.28, 0.86, -0.22);
  leftArm.rotation.set(0.95, 0, -0.22);
  wizardGroup.add(leftArm);

  // Glowing Arcane Reins curving from Wizard's left hand to Dragon's neck collar
  for (const rSide of [-1, 1]) {
    const reinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rSide * 0.22, 0.68, -0.45),
      new THREE.Vector3(rSide * 0.34, 0.46, -1.25),
      new THREE.Vector3(rSide * 0.32, 0.22, -2.15)
    ]);
    const rein = new THREE.Mesh(new THREE.TubeGeometry(reinCurve, 8, 0.022, 5, false), hornMat);
    wizardGroup.add(rein);
  }

  const staffArm = new THREE.Group();
  staffArm.position.set(0.28, 0.96, -0.08);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.56, 7), robeMat);
  rightArm.position.set(0.08, -0.10, -0.22);
  rightArm.rotation.set(1.05, 0, 0.28);
  staffArm.add(rightArm);

  // Carved Gnarled & Gold Arcane Staff + Rotating Levitating Crystal + Counter-Rotating Spell Rings!
  const staffCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, -0.78, -0.18),
    new THREE.Vector3(0.16, -0.12, -0.38),
    new THREE.Vector3(0.14, 0.42, -0.52),
    new THREE.Vector3(0.18, 0.74, -0.62)
  ]);
  const staffShaft = new THREE.Mesh(new THREE.TubeGeometry(staffCurve, 10, 0.032, 6, false), hornMat);
  staffArm.add(staffShaft);

  const staffHead = new THREE.Group();
  staffHead.position.set(0.18, 0.88, -0.66);
  const staffCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), crystalMat);
  staffCrystal.scale.set(0.85, 1.35, 0.85);
  const staffRingA = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 6, 18), crystalMat);
  const staffRingB = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.014, 6, 18), hornMat);
  staffRingB.rotation.x = Math.PI / 2;
  staffHead.add(staffCrystal, staffRingA, staffRingB);
  staffArm.add(staffHead);
  wizardGroup.add(staffArm);

  // Continuous Subdivided Velvet Wizard Cape (organic cloth vertex-rippling in rushing sky wind!)
  const capeGeo = new THREE.PlaneGeometry(0.92, 2.15, 6, 10);
  const capeBasePos = new Float32Array(capeGeo.attributes.position.array);
  const capeMesh = new THREE.Mesh(capeGeo, capeMat);
  capeMesh.position.set(0, 1.02, 0.18);
  wizardGroup.add(capeMesh);
  root.add(wizardGroup);

  // 8. Dual-Layer Roaring Volumetric Dragonfire Stream shooting 32m FORWARD along -Z from the Dragon's Jaws!
  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.position.set(0, -0.02, -1.52);
  headGroup.add(mouthAnchor);

  const fireConeUniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColorCore: { value: new THREE.Color(0xfffde6) },
    uColorMid: { value: fireCol.clone() },
    uColorEdge: { value: new THREE.Color(0xd61e08) }
  };

  // NOTE: ConeGeometry tip is at +height/2 and base at -height/2.
  // Translating by (0, -height/2, 0) puts tip at y=0 and wide mouth at y=-height.
  // Rotating by +Math.PI/2 around X maps (0, -height, 0) -> (0, 0, -height) = STRAIGHT FORWARD out of jaws!
  function makeFlameStreamMesh(radius, length, opacityBoost, twistFreq) {
    const geo = new THREE.ConeGeometry(radius, length, 16, 14, true);
    geo.translate(0, -length * 0.5, 0);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...fireConeUniforms,
        uLength: { value: length },
        uOpacityBoost: { value: opacityBoost },
        uTwist: { value: twistFreq }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform float uLength;
        uniform float uTwist;
        varying vec2 vUv;
        varying float vAlong;
        void main() {
          vUv = uv;
          float along = clamp(-position.z / uLength, 0.0, 1.0);
          vAlong = along;
          vec3 pos = position;
          // Roaring turbulent helical fire billows expanding forward from the jaws
          float swell = 0.25 + pow(along, 0.72) * 1.15;
          pos.xy *= swell;
          float waveX = sin(along * uTwist - uTime * 28.0 + position.y * 2.2) * 0.65 * along;
          float waveY = cos(along * (uTwist * 0.85) - uTime * 24.0 + position.x * 2.2) * 0.65 * along;
          pos.x += waveX;
          pos.y += waveY + along * along * 0.9;
          pos.z *= (0.35 + 0.65 * uIntensity);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform float uOpacityBoost;
        uniform vec3 uColorCore;
        uniform vec3 uColorMid;
        uniform vec3 uColorEdge;
        varying vec2 vUv;
        varying float vAlong;
        void main() {
          float tongues = sin(vUv.x * 32.0 + vAlong * 10.0 - uTime * 18.0) * 0.5
                        + cos(vUv.x * 19.0 - vAlong * 24.0 + uTime * 32.0) * 0.5;
          float flicker = clamp(0.55 + tongues * 0.45, 0.0, 1.0);
          // Incandescent white-gold core near jaws transitioning to roaring fiery orange & crimson licks
          vec3 col = mix(uColorCore, uColorMid, smoothstep(0.05, 0.36, vAlong));
          col = mix(col, uColorEdge, smoothstep(0.38, 0.88, vAlong));
          float rootFade = smoothstep(0.0, 0.04, vAlong);
          float tipFade = 1.0 - smoothstep(0.45 + flicker * 0.28, 1.0, vAlong);
          float alpha = rootFade * tipFade * (0.38 + 0.62 * flicker) * uIntensity * uOpacityBoost;
          gl_FragColor = vec4(col * (1.35 + 0.6 * (1.0 - vAlong)), alpha);
        }
      `
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(mouthAnchor.position);
    m.visible = false;
    return m;
  }

  const fireConeOuter = makeFlameStreamMesh(3.2, 32.0, 0.72, 15.0);
  const fireConeInner = makeFlameStreamMesh(1.35, 22.0, 0.95, 22.0);
  const fireCone = new THREE.Group();
  fireCone.add(fireConeOuter, fireConeInner);
  fireCone.visible = false;
  headGroup.add(fireCone);

  // Orbiting enchanted celestial motes
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.10, 0), crystalMat);
    root.add(mote);
    motes.push(mote);
  }

  return {
    root,
    neckBase,
    neckUpper,
    headGroup,
    jawPivot,
    magmaMat,
    fireCone,
    fireConeOuter,
    fireConeInner,
    fireConeUniforms,
    leftWing,
    rightWing,
    tailSegments,
    legs,
    wizardGroup,
    capeMesh,
    capeBasePos,
    staffArm,
    staffHead,
    staffCrystal,
    staffRingA,
    staffRingB,
    motes,
    mouthAnchor
  };
}

/* ── Sleek Composite 3D Fighter Jet (Preserved & Polished!) ──────────── */

function buildFighterJet() {
  const root = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6b7f8c, roughness: 0.30, metalness: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x35434d, roughness: 0.42, metalness: 0.65 });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x8be2ff,
    emissive: 0x164a66,
    roughness: 0.08,
    metalness: 0.5,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.86
  });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe6b85c, roughness: 0.35, metalness: 0.4 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.58, 4.9, 14), hullMat);
  body.rotation.x = Math.PI / 2;
  root.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.9, 14), darkMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.38;
  root.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), canopyMat);
  canopy.scale.set(0.85, 0.65, 2.35);
  canopy.position.set(0, 0.34, -1.25);
  root.add(canopy);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -0.95);
  wingShape.lineTo(3.6, 1.35);
  wingShape.lineTo(3.6, 1.98);
  wingShape.lineTo(0, 1.48);
  wingShape.lineTo(-3.6, 1.98);
  wingShape.lineTo(-3.6, 1.35);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, hullMat);
  wings.position.set(0, 0.04, 0.1);
  root.add(wings);

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.08, 1.28), darkMat);
    fin.position.set(side * 0.72, 0.55, 1.78);
    fin.rotation.z = side * -0.28;
    root.add(fin);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.96), stripeMat);
    stripe.position.set(side * 0.74, 0.78, 1.85);
    stripe.rotation.z = side * -0.28;
    root.add(stripe);

    const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.45, 8), stripeMat);
    missile.rotation.x = Math.PI / 2;
    missile.position.set(side * 1.82, -0.14, 0.55);
    root.add(missile);
  }

  const burnerGroup = new THREE.Group();
  burnerGroup.position.set(0, 0, 2.55);
  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 2.6, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7b29, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flameOuter.rotation.x = Math.PI / 2;
  flameOuter.position.z = 1.25;
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.20, 1.7, 12),
    new THREE.MeshBasicMaterial({ color: 0x99f0ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flameInner.rotation.x = Math.PI / 2;
  flameInner.position.z = 0.8;
  burnerGroup.add(flameOuter, flameInner);
  root.add(burnerGroup);

  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.position.set(0, -0.12, -4.35);
  root.add(mouthAnchor);

  return { root, burnerGroup, mouthAnchor };
}

/* ── Volumetric Billboard Fire / Ember / Smoke Particle System ────────── */

function createVolumetricParticles(scene, textures, count = 160) {
  const pool = [];
  const fireMats = [];
  const smokeMats = [];
  const sparkMats = [];

  for (let i = 0; i < count; i++) {
    const kind = i < count * 0.55 ? 'fire' : i < count * 0.82 ? 'spark' : 'smoke';
    const mat = new THREE.SpriteMaterial({
      map: kind === 'fire' ? textures.fireSpriteMap : kind === 'spark' ? textures.sparkSpriteMap : textures.smokeSpriteMap,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: kind === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    scene.add(sprite);
    const entry = {
      kind, sprite, mat, active: false,
      life: 0, maxLife: 0.8,
      vx: 0, vy: 0, vz: 0,
      drag: 0.96, rise: 1.5,
      baseScale: 1, grow: 2.0,
      startColor: new THREE.Color(0xfff4be),
      endColor: new THREE.Color(0xd92408),
      maxOpacity: 0.95
    };
    pool.push(entry);
    if (kind === 'fire') fireMats.push(entry);
    else if (kind === 'spark') sparkMats.push(entry);
    else smokeMats.push(entry);
  }

  let cFire = 0, cSpark = 0, cSmoke = 0;

  function spawn(kind, x, y, z, vx, vy, vz, opts = {}) {
    let arr, idx;
    if (kind === 'fire') { arr = fireMats; idx = cFire; cFire = (cFire + 1) % arr.length; }
    else if (kind === 'spark') { arr = sparkMats; idx = cSpark; cSpark = (cSpark + 1) % arr.length; }
    else { arr = smokeMats; idx = cSmoke; cSmoke = (cSmoke + 1) % arr.length; }
    const p = arr[idx];
    if (!p) return;
    p.active = true;
    p.life = 0;
    p.maxLife = opts.maxLife ?? 0.65;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.drag = opts.drag ?? 0.985;
    p.rise = opts.rise ?? (kind === 'smoke' ? 4.5 : 1.8);
    p.baseScale = opts.baseScale ?? 1.8;
    p.grow = opts.grow ?? 2.6;
    p.maxOpacity = opts.opacity ?? 0.92;
    p.startColor.setHex(opts.startColor ?? (kind === 'smoke' ? 0x3b2c28 : 0xfff4c2));
    p.endColor.setHex(opts.endColor ?? (kind === 'smoke' ? 0x1a1514 : 0xd6240c));
    p.sprite.position.set(x, y, z);
    p.sprite.scale.setScalar(p.baseScale);
    p.mat.color.copy(p.startColor);
    p.mat.opacity = p.maxOpacity;
    p.mat.rotation = Math.random() * Math.PI * 2;
    p.sprite.visible = true;
  }

  function update(dt) {
    const damp = Math.pow(0.25, dt);
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.vx *= (1 - (1 - p.drag) * dt * 60 * 0.25);
      p.vz *= (1 - (1 - p.drag) * dt * 60 * 0.25);
      p.vy += p.rise * dt;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      const sc = p.baseScale * (1 + t * p.grow);
      p.sprite.scale.set(sc, sc, 1);
      p.mat.color.copy(p.startColor).lerp(p.endColor, Math.min(1, t * 1.15));
      const fadeIn = Math.min(1, t * 6);
      const fadeOut = Math.pow(1 - t, p.kind === 'smoke' ? 1.1 : 1.45);
      p.mat.opacity = fadeIn * fadeOut * p.maxOpacity;
      p.mat.rotation += dt * (p.kind === 'fire' ? 1.8 : 0.7) * (i % 2 ? 1 : -1);
    }
    void damp;
  }

  return { spawn, update };
}

/* ── Panoramic Living 3D World Builder (Town + Mountains + Ocean + Distant Realms) ── */

function buildTownWorld(scene, site, worldState, textures, isSoftwareGl) {
  const worldGroup = new THREE.Group();
  const targets = [];
  const foreignCommunities = [];
  const borderIntruders = [];
  const thermals = [];
  const landmarks = [];
  const windowMaterials = [];
  const animatedBoats = [];
  const animatedBirds = [];
  const cloudMaterials = [];
  const scale = 3.2;
  const to3D = (mx, my) => ({ x: (mx - 12) * scale, z: (my - 12) * scale });

  const hasWater = Boolean(site?.water || site?.coastal || window.CommonEarthSim?.waterfront?.(site));
  const isIsland = Boolean(site?.water);
  const territoryLevel = site?.territoryLevel || 0;
  const shoreZ = (25.3 - 12) * scale;

  // 1. Discoverable Distant Islands & Iconic Scenic Landmarks (radius up to 1,100m — zero flight cap!)
  const distantIslands = [
    { id: 'volcano', name: 'Volcano Caldera Peak', x: -560, z: -540, radius: 190, height: 145, crater: true },
    { id: 'atoll', name: 'Emerald Lagoon Atoll', x: -460, z: 480, radius: 135, height: 34, crater: false },
    { id: 'lighthouse', name: 'Cape Lighthouse Island', x: 430, z: 390, radius: 98, height: 28, crater: false }
  ];

  const terrainHeightAt = createTerrainHeightFn(shoreZ, hasWater, isIsland, distantIslands);

  // 2. Endless Animated GLSL Ocean
  const oceanObj = createOceanShaderMesh(shoreZ, hasWater, isIsland);
  worldGroup.add(oceanObj.mesh);

  // 3. Continuous Sculpted Vertex-Colored Terrain Mesh (Coastal Plains -> Foothills -> Alpine Peaks!)
  if (!isIsland) {
    const tWidth = 2200;
    const tDepth = hasWater ? 1450 : 2200;
    const segsX = isSoftwareGl ? 76 : 108;
    const segsZ = isSoftwareGl ? 62 : 92;
    const tGeo = new THREE.PlaneGeometry(tWidth, tDepth, segsX, segsZ);
    tGeo.rotateX(-Math.PI / 2);
    const zOffset = hasWater ? (shoreZ - tDepth / 2 + 12) : 0;

    const posAttr = tGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const cSand = new THREE.Color(0xdcc796);
    const cMeadow = new THREE.Color(0x527d48);
    const cForest = new THREE.Color(0x365c3a);
    const cAlpineRock = new THREE.Color(0x63666c);
    const cSnow = new THREE.Color(0xeef4fa);
    const cLava = new THREE.Color(0x3b2a26);

    for (let i = 0; i < posAttr.count; i++) {
      const wx = posAttr.getX(i);
      const wz = posAttr.getZ(i) + zOffset;
      const wy = terrainHeightAt(wx, wz);
      posAttr.setY(i, wy);

      // Rich natural biome transitions (warm coastal sand -> sunlit meadow -> deep forest -> granite crags -> high snow peaks!)
      const micro = Math.sin(wx * 0.031) * Math.cos(wz * 0.029) * 0.06;
      if (hasWater && wz > shoreZ - 18 && wy < 3.5) {
        _col.copy(cSand).lerp(cMeadow, Math.max(0, (shoreZ - wz) / 18));
      } else if (Math.hypot(wx + 560, wz + 540) < 175) {
        _col.copy(cLava).lerp(cAlpineRock, Math.min(1, wy / 120));
      } else if (wy < 22) {
        _col.copy(cMeadow).lerp(cForest, Math.min(1, wy / 22));
      } else if (wy < 68) {
        _col.copy(cForest).lerp(cAlpineRock, (wy - 22) / 46);
      } else {
        _col.copy(cAlpineRock).lerp(cSnow, Math.min(1, (wy - 68) / 38));
      }
      colors[i * 3] = Math.min(1, Math.max(0, _col.r + micro));
      colors[i * 3 + 1] = Math.min(1, Math.max(0, _col.g + micro));
      colors[i * 3 + 2] = Math.min(1, Math.max(0, _col.b + micro * 0.8));
    }
    tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    tGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: textures.terrainDetailMap,
      roughness: 0.92,
      metalness: 0.03
    });
    const terrainMesh = new THREE.Mesh(tGeo, terrainMat);
    terrainMesh.position.set(0, 0, zOffset);
    terrainMesh.renderOrder = -2;
    worldGroup.add(terrainMesh);

    // Coastal Limestone Seawall Quay & Timber Harbour Piers with Bollards & Lanterns
    if (hasWater) {
      const quayMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.stoneMap, roughness: 0.85 });
      const quay = new THREE.Mesh(new THREE.BoxGeometry(270, 2.2, 3.2), quayMat);
      quay.position.set(0, -0.25, shoreZ);
      worldGroup.add(quay);

      const pierMat = new THREE.MeshStandardMaterial({ color: 0x8e724e, roughness: 0.82 });
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe6a6, emissive: 0xffb84d, emissiveIntensity: 0.65 });
      windowMaterials.push(lampMat);

      for (const px of [2.9, 11.4, 22.4]) {
        const p3 = to3D(px, 27.0);
        const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 11.2), pierMat);
        pier.position.set(p3.x, 0.28, p3.z);
        worldGroup.add(pier);
        for (const pz of [-4.2, 4.4]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.9, 6), pierMat);
          post.position.set(p3.x + 1.35, 0.75, p3.z + pz);
          worldGroup.add(post);
        }
        const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), lampMat);
        lantern.position.set(p3.x + 1.35, 2.05, p3.z + 4.4);
        worldGroup.add(lantern);
      }
    }
  } else {
    const islandGeo = new THREE.CylinderGeometry(64, 78, 5, 24);
    const island = new THREE.Mesh(islandGeo, new THREE.MeshStandardMaterial({ color: 0x5d824f, roughness: 0.88 }));
    island.position.set(0, -2.5, 0);
    worldGroup.add(island);
  }

  // 4. Sculpted Distant Ocean Islands & Scenic Realms (Volcano, Atoll, Cape Lighthouse, Floating Sky Islands!)
  // (A) Ocean Islands (Emerald Atoll + Cape Lighthouse Island)
  for (const isl of distantIslands) {
    if (isl.crater) continue; // Volcano is already sculpted right into the mainland terrain!
    const iGeo = new THREE.ConeGeometry(isl.radius, isl.height + 6, 20, 4);
    const pArr = iGeo.attributes.position;
    for (let i = 0; i < pArr.count; i++) {
      const y = pArr.getY(i);
      const r = Math.hypot(pArr.getX(i), pArr.getZ(i));
      const bump = Math.sin(pArr.getX(i) * 0.06) * Math.cos(pArr.getZ(i) * 0.06) * 3.5;
      pArr.setY(i, y + (r > 6 ? bump : 0));
    }
    iGeo.computeVertexNormals();
    const iMesh = new THREE.Mesh(iGeo, new THREE.MeshStandardMaterial({ color: isl.id === 'atoll' ? 0x4f8c54 : 0x6f746c, roughness: 0.88 }));
    iMesh.position.set(isl.x, (isl.height - 6) * 0.5 - 1.5, isl.z);
    worldGroup.add(iMesh);

    // Sandy beach collar around island
    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(isl.radius * 0.96, isl.radius * 1.05, 1.4, 20),
      new THREE.MeshStandardMaterial({ color: 0xd9c592, roughness: 0.9 })
    );
    beach.position.set(isl.x, -0.3, isl.z);
    worldGroup.add(beach);
  }

  // (B) Volcano Caldera Glowing Magma Pool & Super-Thermal Updraft!
  const magmaPool = new THREE.Mesh(
    new THREE.CircleGeometry(34, 16),
    new THREE.MeshBasicMaterial({ color: 0xff5a18 })
  );
  magmaPool.rotation.x = -Math.PI / 2;
  magmaPool.position.set(-560, 96, -540);
  worldGroup.add(magmaPool);
  landmarks.push({ id: 'volcano', name: 'Volcano Caldera Peak', x: -560, y: 150, z: -540 });
  thermals.push({ x: -560, z: -540, y: 120, radius: 46, strength: 26, maxAlt: 340 });

  // (C) Cape Lighthouse Tower with Rotating Luminous Beacon!
  const lhGroup = new THREE.Group();
  const lhY = terrainHeightAt(430, 390);
  lhGroup.position.set(430, lhY - 2, 390);
  const lhTower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 5.2, 30, 12),
    new THREE.MeshStandardMaterial({ color: 0xf0e9d8, map: textures.stoneMap, roughness: 0.72 })
  );
  lhTower.position.y = 15;
  const lhStripe = new THREE.Mesh(
    new THREE.CylinderGeometry(3.9, 4.4, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0xb83e2c, roughness: 0.65 })
  );
  lhStripe.position.y = 16;
  const lhCupola = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 5.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x2d5e58, roughness: 0.45, metalness: 0.4 })
  );
  lhCupola.position.y = 33.5;
  const lhLantern = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 4.0, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff0aa })
  );
  lhLantern.position.y = 30.2;
  const lhBeam = new THREE.Mesh(
    new THREE.ConeGeometry(16, 110, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe896, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  lhBeam.rotation.z = Math.PI / 2;
  lhBeam.position.set(55, 30.2, 0);
  const lhRotor = new THREE.Group();
  lhRotor.add(lhBeam);
  lhGroup.add(lhTower, lhStripe, lhLantern, lhCupola, lhRotor);
  worldGroup.add(lhGroup);
  landmarks.push({ id: 'lighthouse', name: 'Cape Lighthouse Island', x: 430, y: 55, z: 390 });
  landmarks.push({ id: 'atoll', name: 'Emerald Lagoon Atoll', x: -460, y: 45, z: 480 });

  // (D) Sculpted Craggy Floating Sky-Sanctuary Arch Archipelago with Cascading Waterfalls & Gilded Temple!
  const skyIslandPos = { x: 220, y: 132, z: -260 };
  const skyIsland = new THREE.Group();
  skyIsland.position.set(skyIslandPos.x, skyIslandPos.y, skyIslandPos.z);
  const rockUnderMat = new THREE.MeshStandardMaterial({ color: 0x5c5b63, map: textures.stoneMap, roughness: 0.92, metalness: 0.06 });
  const grassCapMat = new THREE.MeshStandardMaterial({ color: 0x4b874e, map: textures.terrainDetailMap, roughness: 0.84 });
  const skyCrystalMat = new THREE.MeshStandardMaterial({ color: 0xa6f4ff, emissive: 0x45c8ff, emissiveIntensity: 1.35, roughness: 0.14 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xecc464, roughness: 0.3, metalness: 0.7 });

  // Vertex-displaced jagged craggy underside rock massif (NOT a smooth geometric cone!)
  const skyRockGeo = new THREE.ConeGeometry(44, 62, 16, 6);
  const srPos = skyRockGeo.attributes.position;
  for (let i = 0; i < srPos.count; i++) {
    const x = srPos.getX(i), y = srPos.getY(i), z = srPos.getZ(i);
    const crag = 1 + Math.sin(x * 0.18 + y * 0.11) * 0.22 + Math.cos(z * 0.21 - y * 0.09) * 0.18;
    srPos.setXYZ(i, x * crag, y, z * crag);
  }
  skyRockGeo.computeVertexNormals();
  const skyRock = new THREE.Mesh(skyRockGeo, rockUnderMat);
  skyRock.rotation.x = Math.PI;
  skyRock.position.y = -31;

  const skyTop = new THREE.Mesh(new THREE.CylinderGeometry(42, 43, 4.4, 16), grassCapMat);
  skyTop.position.y = 2;

  // Ancient colossal limestone sky-arch with gilded crest + domed temple pavilion
  const skyArch = new THREE.Mesh(
    new THREE.TorusGeometry(23, 3.0, 8, 24, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xdfd3bc, map: textures.stoneMap, roughness: 0.76 })
  );
  skyArch.position.y = 4;

  const templeDome = new THREE.Mesh(new THREE.SphereGeometry(7.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), goldTrimMat);
  templeDome.position.set(0, 11.5, -14);
  const templeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(7.6, 8.2, 8.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xe4d7bf, map: textures.stoneMap, roughness: 0.78 })
  );
  templeBase.position.set(0, 7.6, -14);

  // Shimmering cascading sky-waterfalls pouring off the cliff edge into mist!
  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xc2f5ff,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  for (const wfAngle of [0.65, -0.82]) {
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 96), waterfallMat);
    wf.position.set(Math.cos(wfAngle) * 40, -46, Math.sin(wfAngle) * 40);
    wf.rotation.y = -wfAngle + Math.PI / 2;
    skyIsland.add(wf);
  }

  // Glowing underside levitation crystal spikes + levitating sapphire obelisk + craggy satellite islets
  const skyObelisk = new THREE.Mesh(new THREE.OctahedronGeometry(5.2, 0), skyCrystalMat);
  skyObelisk.scale.set(0.58, 2.6, 0.58);
  skyObelisk.position.set(0, 17, 2);

  const underCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(8.5, 0), skyCrystalMat);
  underCrystal.scale.set(0.75, 2.2, 0.75);
  underCrystal.position.set(0, -64, 0);

  for (let s = 0; s < 5; s++) {
    const ang = (s / 5) * Math.PI * 2 + 0.3;
    const dist = 62 + (s % 2) * 18;
    const satGrp = new THREE.Group();
    satGrp.position.set(Math.cos(ang) * dist, -6 + (s % 3) * 11, Math.sin(ang) * dist);
    const satRock = new THREE.Mesh(new THREE.DodecahedronGeometry(9 + (s % 3) * 3, 0), rockUnderMat);
    satRock.scale.set(1.0, 1.45, 0.9);
    const satCap = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9, 2.2, 9), grassCapMat);
    satCap.position.y = 9.5;
    satGrp.add(satRock, satCap);
    skyIsland.add(satGrp);
  }
  skyIsland.add(skyRock, skyTop, skyArch, templeBase, templeDome, skyObelisk, underCrystal);
  worldGroup.add(skyIsland);
  landmarks.push({ id: 'sky-arch', name: 'Floating Sky-Sanctuary Arch', x: skyIslandPos.x, y: skyIslandPos.y + 18, z: skyIslandPos.z });

  // (E) Highland Snow Citadel on Distant Northeast Ridge
  const keepX = 560, keepZ = -480;
  const keepY = Math.max(48, terrainHeightAt(keepX, keepZ));
  const keepGroup = new THREE.Group();
  keepGroup.position.set(keepX, keepY - 2, keepZ);
  const keepStone = new THREE.MeshStandardMaterial({ color: 0xdcd2be, map: textures.stoneMap, roughness: 0.8 });
  const keepRoof = new THREE.MeshStandardMaterial({ color: 0x3b5878, roughness: 0.55 });
  const keepMain = new THREE.Mesh(new THREE.BoxGeometry(24, 20, 24), keepStone);
  keepMain.position.y = 10;
  keepGroup.add(keepMain);
  for (const [tx, tz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 28, 10), keepStone);
    tw.position.set(tx, 14, tz);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 10, 10), keepRoof);
    roof.position.set(tx, 33, tz);
    keepGroup.add(tw, roof);
  }
  worldGroup.add(keepGroup);
  landmarks.push({ id: 'snow-keep', name: 'Highland Snow Citadel', x: keepX, y: keepY + 32, z: keepZ });

  // (F) Neighbouring Communities — Protected by Sacred Spiritual Borders (Dragons refuse to enter another community's lands!)
  const otherTowns = [
    ...(worldState?.sites || []),
    ...(worldState?.communityLife?.outposts || [])
  ].filter(other => other && other.id !== site?.id);
  const communitySpecs = otherTowns.length
    ? otherTowns.slice(0, 4).map((other, i) => ({ id: other.id, name: other.name || `Neighbouring Community ${i + 1}` }))
    : [
        { id: 'neighbour-north', name: 'Northern Valley Commons' },
        { id: 'neighbour-west', name: 'Westridge Harbour' }
      ];
  const neighbourSlots = [
    { x: -240, z: -210 },
    { x: 265, z: -220 },
    { x: -390, z: -120 },
    { x: 410, z: -135 }
  ];
  for (let i = 0; i < communitySpecs.length && i < neighbourSlots.length; i++) {
    const spec = communitySpecs[i];
    const slot = neighbourSlots[i];
    const nx = slot.x;
    const nz = hasWater ? Math.min(slot.z, shoreZ - 110) : slot.z;
    const ny = Math.max(0, terrainHeightAt(nx, nz));
    const nGroup = new THREE.Group();
    nGroup.position.set(nx, ny, nz);
    for (let b = 0; b < 6; b++) {
      const ba = (b / 6) * Math.PI * 2;
      const bh = 6 + (b % 3) * 2.5;
      const house = new THREE.Mesh(new THREE.BoxGeometry(8, bh, 7), keepStone);
      house.position.set(Math.cos(ba) * 18, bh / 2, Math.sin(ba) * 18);
      const hRoof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 4.5, 4), new THREE.MeshStandardMaterial({ color: 0xa6583d, roughness: 0.72 }));
      hRoof.rotation.y = Math.PI / 4;
      hRoof.position.set(Math.cos(ba) * 18, bh + 2.25, Math.sin(ba) * 18);
      nGroup.add(house, hRoof);
    }
    // Serene emerald-gold spiritual border ring marking another community's sovereign land
    const boundaryRadius = 72;
    const wardMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
    const wardRing = new THREE.Mesh(new THREE.TorusGeometry(boundaryRadius, 0.55, 8, 42), wardMat);
    wardRing.rotation.x = Math.PI / 2;
    wardRing.position.y = 4.5;
    nGroup.add(wardRing);
    worldGroup.add(nGroup);

    foreignCommunities.push({
      id: spec.id,
      name: spec.name,
      x: nx,
      y: ny,
      z: nz,
      radius: boundaryRadius,
      wardRing,
      wardMat,
      pulse: 0
    });
  }

  // 5. District Road Grid (0..24) — cleanly elevated Y=+0.08 to prevent any Z-fighting
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4f5658, roughness: 0.9 });
  for (let r = 0; r <= 24; r += 6) {
    const pH = to3D(12, r);
    const hRoad = new THREE.Mesh(new THREE.BoxGeometry(26 * scale, 0.14, 1.75 * scale), roadMat);
    hRoad.position.set(pH.x, 0.07, pH.z);
    worldGroup.add(hRoad);

    const pV = to3D(r, 12);
    const vRoad = new THREE.Mesh(new THREE.BoxGeometry(1.75 * scale, 0.14, 26 * scale), roadMat);
    vRoad.position.set(pV.x, 0.07, pV.z);
    worldGroup.add(vRoad);
  }

  // 6. Composite Multi-Part 3D Town Buildings (Textured Stone/Terracotta + Chimneys + Glowing Windows!)
  const sharedWinMat = new THREE.MeshStandardMaterial({
    color: 0xffdf96,
    emissive: 0xffa83c,
    emissiveIntensity: 0.25,
    roughness: 0.2
  });
  windowMaterials.push(sharedWinMat);

  function addBuilding3D(id, name, mx, my, w, h, d, wallColor, roofColor, kind = 'building', extra = {}) {
    const pos = to3D(mx, my);
    const grp = new THREE.Group();
    grp.position.set(pos.x, 0, pos.z);

    // Stone plinth foundation
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.9, 0.45, d + 0.9),
      new THREE.MeshStandardMaterial({ color: 0xc2b59c, roughness: 0.88 })
    );
    plinth.position.y = 0.22;
    grp.add(plinth);

    // Main masonry walls
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: wallColor, map: textures.stoneMap, roughness: 0.78 })
    );
    body.position.y = h / 2 + 0.42;
    grp.add(body);

    // Pitched shingle roof with overhang
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.54, 4),
      new THREE.MeshStandardMaterial({ color: roofColor, map: textures.roofMap, roughness: 0.68 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + 0.42 + h * 0.27;
    grp.add(roof);

    // Chimney & glowing windows on front/side facades
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, h * 0.45, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x8f5642, roughness: 0.85 })
    );
    chimney.position.set(w * 0.26, h + h * 0.32, -d * 0.16);
    grp.add(chimney);

    for (const wx of [-w * 0.24, w * 0.24]) {
      const winF = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.35, 0.14), sharedWinMat);
      winF.position.set(wx, h * 0.56 + 0.4, d / 2 + 0.04);
      const winB = winF.clone();
      winB.position.z = -d / 2 - 0.04;
      grp.add(winF, winB);
    }

    // Optional striped shop/café awning
    if (extra.awningColor) {
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.92, 0.22, 2.2),
        new THREE.MeshStandardMaterial({ color: extra.awningColor, roughness: 0.75 })
      );
      awning.position.set(0, h * 0.46, d / 2 + 1.0);
      awning.rotation.x = 0.25;
      grp.add(awning);
    }

    // Burning impact blaze & smoke pillar anchor (hidden until struck!)
    const blaze = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.48, h * 1.15, 8),
      new THREE.MeshBasicMaterial({ color: 0xff7422, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    blaze.position.y = h + 1.8;
    blaze.visible = false;
    grp.add(blaze);

    worldGroup.add(grp);
    targets.push({
      id, kind, name, mx, my,
      x: pos.x, y: h * 0.6, z: pos.z,
      radius: Math.max(w, d) * 0.68,
      hp: 100, mesh: grp, body, blaze
    });
    return grp;
  }

  // Core Town Buildings
  addBuilding3D('market', 'Market Exchange', 15, 21, 9.8, 5.8, 9.0, 0xe4c69a, 0x5c8c84, 'building', { awningColor: 0xd96836 });
  addBuilding3D('cafe', 'The Reading Room', 3, 21, 8.6, 4.8, 7.2, 0xebe0c8, 0x3b7670, 'building', { awningColor: 0x387a62 });
  addBuilding3D('home-0', 'Founding Residence North', 9, 21, 7.6, 5.4, 7.0, 0xe2d3b8, 0xa85d44, 'building');
  addBuilding3D('home-1', 'Founding Residence East', 21, 15, 7.6, 5.4, 7.0, 0xe2d3b8, 0x9c5640, 'building');
  addBuilding3D('home-2', 'Founding Residence South', 21, 21, 7.6, 5.4, 7.0, 0xe4d4ba, 0xa86147, 'building');

  const kindPalette = {
    garden: [0x82aa68, 0x4b783c],
    workshop: [0xb4a08a, 0x5c646b],
    market: [0xe2bc86, 0x558a80],
    hall: [0xe0d0b0, 0x5c6f82],
    pier: [0xa68e6c, 0x4b6a75],
    wetland: [0x589684, 0x36695e],
    fishingDock: [0x98866a, 0x466d78],
    house: [0xe4d5bc, 0xa86147]
  };

  for (const b of site?.buildings || []) {
    if (!b || b.kind === 'dragonStable' || !Number.isFinite(b.plot)) continue;
    const mx = (b.plot % 3) * 6 + 3;
    const my = Math.floor(b.plot / 3) * 6 + 3;
    const [wc, rc] = kindPalette[b.kind] || [0xd4c8ae, 0x736658];
    addBuilding3D(b.id || ('lot-' + b.plot), b.name || b.kind, mx, my, 8.6, 5.4, 8.2, wc, rc, 'building');
  }
  for (const fb of site?.freeBuildings || []) {
    if (!fb || fb.kind === 'dragonStable' || !Number.isFinite(fb.x) || !Number.isFinite(fb.y)) continue;
    const [wc, rc] = kindPalette[fb.kind] || [0xd4c8ae, 0x736658];
    addBuilding3D(fb.id, fb.name || fb.kind, fb.x, fb.y, 8.4, 5.4, 8.0, wc, rc, 'building');
  }
  for (const h of site?.playerHouses || []) {
    if (!h || !Number.isFinite(h.x) || !Number.isFinite(h.y)) continue;
    addBuilding3D(h.id, h.name || 'Community House', h.x, h.y, 7.4, 5.6, 7.0, 0xe8d9be, 0xa35a43, 'building');
  }

  // 7. Grand Multi-Part 3D Dragon Sanctuary Citadel (matching our new painted 2D Dragon Stable!)
  const dsLoc = window.EarthDragonStable?.stableLocation?.(site) || { x: -4.2, y: 12 };
  const ds3D = to3D(dsLoc.x, dsLoc.y);
  const stableGroup = new THREE.Group();
  stableGroup.position.set(ds3D.x, 0, ds3D.z);

  const stablePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(15.5, 0.8, 14.2),
    new THREE.MeshStandardMaterial({ color: 0xd8cab0, map: textures.stoneMap, roughness: 0.85 })
  );
  stablePlinth.position.y = 0.4;
  stableGroup.add(stablePlinth);

  // Glowing inlaid celestial rune ring on the stable courtyard
  const runeRing = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 3.3, 28),
    new THREE.MeshBasicMaterial({ color: 0x8ce8ff, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
  );
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.set(-0.6, 0.84, 3.2);
  stableGroup.add(runeRing);

  // Main Limestone Sanctuary Hall + Oxidized Verdigris-Copper Vaulted Roof + Gilded Ridge
  const hallBody = new THREE.Mesh(
    new THREE.BoxGeometry(12.2, 6.2, 7.6),
    new THREE.MeshStandardMaterial({ color: 0xe6d4b4, map: textures.stoneMap, roughness: 0.78 })
  );
  hallBody.position.set(0, 3.9, -2.4);
  stableGroup.add(hallBody);

  const hallRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 7.4, 5.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x4c8d83, map: textures.roofMap, roughness: 0.56, metalness: 0.22 })
  );
  hallRoof.rotation.y = Math.PI / 4;
  hallRoof.scale.set(1.38, 1.0, 0.92);
  hallRoof.position.set(0, 9.6, -2.4);
  stableGroup.add(hallRoof);

  // Warm hearth archway glowing inside the stable
  const archGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.35, 16, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xffd07a, emissive: 0xff8c2b, emissiveIntensity: 1.2 })
  );
  archGlow.rotation.z = Math.PI / 2;
  archGlow.rotation.y = Math.PI / 2;
  archGlow.position.set(0, 2.6, 1.45);
  stableGroup.add(archGlow);

  // Crenellated Sky-Roost Bastion Tower + Twin Floating Sapphire Crystal Braziers
  const roostTower = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 5.2, 4.6),
    new THREE.MeshStandardMaterial({ color: 0xd8c8a8, map: textures.stoneMap, roughness: 0.8 })
  );
  roostTower.position.set(4.8, 3.4, 2.8);
  stableGroup.add(roostTower);

  const spireMat = new THREE.MeshStandardMaterial({ color: 0xb6f8ff, emissive: 0x45c4ff, emissiveIntensity: 1.35, roughness: 0.14 });
  const stableCrystals = [];
  for (const bx of [-5.8, 5.8]) {
    const ped = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.8, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xcab898, map: textures.stoneMap, roughness: 0.82 })
    );
    ped.position.set(bx, 2.2, 5.4);
    stableGroup.add(ped);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), spireMat);
    crystal.scale.set(0.62, 1.85, 0.62);
    crystal.position.set(bx, 5.2, 5.4);
    stableGroup.add(crystal);
    stableCrystals.push(crystal);
  }
  worldGroup.add(stableGroup);
  landmarks.unshift({ id: 'stable', name: `${site?.name || 'Town'} Dragon Citadel`, x: ds3D.x, y: 24, z: ds3D.z });

  // 8. Instanced Forests (240+ Multi-Tier Pine/Oak/Palm Trees Across Town, Foothills & Islands!)
  const treePositions = [];
  const baseParkTrees = [
    [3, 3], [9, 3], [15, 3], [21, 3], [3, 9], [15, 9], [21, 9], [3, 15], [9, 15], [15, 15],
    [-4.5, 4], [-4.5, 16], [4, -4.5], [18, -4.5], [26, 4], [26, 18]
  ];
  for (const [tx, ty] of baseParkTrees) {
    const tp = to3D(tx, ty);
    treePositions.push({ x: tp.x, y: 0, z: tp.z, s: 0.95 + ((tx * 7 + ty * 3) % 5) * 0.08 });
  }
  // Procedural coastal & highland forest groves (deterministic pseudo-random)
  let seed = 4219;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 240; i++) {
    const tx = (rand() - 0.5) * 1450;
    const tz = hasWater ? (shoreZ - 16 - rand() * 880) : ((rand() - 0.5) * 1450);
    if (Math.abs(tx - 18) < 125 && Math.abs(tz + 6) < 88) continue; // Keep town & runway clean
    const ty = terrainHeightAt(tx, tz);
    if (ty < 0.2 || ty > 46) continue;
    treePositions.push({ x: tx, y: ty - 0.2, z: tz, s: 0.85 + rand() * 0.9 });
  }
  // Palm grove on Emerald Lagoon Atoll
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 28 + rand() * 68;
    const tx = -460 + Math.cos(a) * r;
    const tz = 480 + Math.sin(a) * r;
    const ty = terrainHeightAt(tx, tz);
    if (ty > 1.2) treePositions.push({ x: tx, y: ty - 0.3, z: tz, s: 1.0 + rand() * 0.5 });
  }

  if (treePositions.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.50, 3.4, 7);
    trunkGeo.translate(0, 1.7, 0);
    const trunkInst = new THREE.InstancedMesh(
      trunkGeo,
      new THREE.MeshStandardMaterial({ color: 0x674931, roughness: 0.92 }),
      treePositions.length
    );

    // Lush sculpted organic multi-cluster foliage canopies (NOT plain low-poly triangles!)
    const crownLowerGeo = new THREE.DodecahedronGeometry(2.55, 1);
    crownLowerGeo.scale(1.15, 0.82, 1.15);
    crownLowerGeo.translate(0, 4.4, 0);
    const crownLowerInst = new THREE.InstancedMesh(
      crownLowerGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 }),
      treePositions.length
    );

    const crownTopGeo = new THREE.DodecahedronGeometry(1.85, 1);
    crownTopGeo.scale(1.05, 0.92, 1.05);
    crownTopGeo.translate(0.35, 6.2, -0.25);
    const crownTopInst = new THREE.InstancedMesh(
      crownTopGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 }),
      treePositions.length
    );

    const foliagePalette = [0x3b6f3d, 0x4b7f44, 0x2f5e39, 0x5c8b46, 0x3d7348];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < treePositions.length; i++) {
      const tp = treePositions[i];
      dummy.position.set(tp.x, tp.y, tp.z);
      dummy.rotation.set(0, (i * 1.37) % (Math.PI * 2), 0);
      dummy.scale.setScalar(tp.s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);
      crownLowerInst.setMatrixAt(i, dummy.matrix);
      crownTopInst.setMatrixAt(i, dummy.matrix);
      _col.setHex(foliagePalette[i % foliagePalette.length]);
      crownLowerInst.setColorAt(i, _col);
      crownTopInst.setColorAt(i, _col.clone().offsetHSL(0.015, 0.05, 0.07));
    }
    trunkInst.computeBoundingSphere();
    crownLowerInst.computeBoundingSphere();
    crownTopInst.computeBoundingSphere();
    worldGroup.add(trunkInst, crownLowerInst, crownTopInst);
  }

  // 9. Living Harbour Sailboats with Curved Canvas Sails & Trailing Foam Wakes
  if (hasWater) {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.72 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xf6ebd4, roughness: 0.65, side: THREE.DoubleSide });
    const wakeMat = new THREE.MeshBasicMaterial({ color: 0xe6f8fc, transparent: true, opacity: 0.45, depthWrite: false });
    const boatSpecs = [
      { x: -18, z: shoreZ + 44, rot: 0.35, speed: 2.2 },
      { x: 36, z: shoreZ + 72, rot: -0.42, speed: 2.8 },
      { x: -95, z: shoreZ + 115, rot: 0.85, speed: 3.1 },
      { x: 145, z: shoreZ + 95, rot: -1.1, speed: 2.5 },
      { x: -240, z: shoreZ + 220, rot: 0.6, speed: 3.4 },
      { x: 260, z: shoreZ + 210, rot: -0.7, speed: 3.0 }
    ];
    for (const bs of boatSpecs) {
      const boat = new THREE.Group();
      boat.position.set(bs.x, 0.05, bs.z);
      boat.rotation.y = bs.rot;
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 6.8), hullMat);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.6, 4), hullMat);
      bow.rotation.x = -Math.PI / 2;
      bow.rotation.z = Math.PI / 4;
      bow.position.z = -4.6;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.6, 6), hullMat);
      mast.position.y = 3.4;
      const sail = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.2, 3), sailMat);
      sail.position.set(0.35, 3.8, -0.3);
      const wake = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 12.0), wakeMat);
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(0, -0.15, 7.6);
      boat.add(hull, bow, mast, sail, wake);
      worldGroup.add(boat);
      animatedBoats.push({ mesh: boat, baseZ: bs.z, baseX: bs.x, rot: bs.rot, phase: Math.random() * Math.PI * 2, speed: bs.speed });
    }
  }

  // 10. Ambient Soaring Seabirds Circling Above the Coast & Town
  const birdMat = new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 12; i++) {
    const bird = new THREE.Group();
    const lw = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.42), birdMat);
    lw.rotation.x = -Math.PI / 2;
    lw.position.x = -0.55;
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.42), birdMat);
    rw.rotation.x = -Math.PI / 2;
    rw.position.x = 0.55;
    bird.add(lw, rw);
    worldGroup.add(bird);
    animatedBirds.push({
      group: bird, lw, rw,
      cx: (i % 3 - 1) * 95,
      cz: shoreZ - 20 + (i % 4) * 35,
      radius: 42 + (i % 5) * 18,
      alt: 28 + (i % 4) * 11,
      speed: 0.24 + (i % 3) * 0.08,
      phase: i * 1.15
    });
  }

  // 11. Solid Expanded Perimeter Walls & Watchtowers
  const wallStage = site?.communityLife?.border?.defence?.stage || 2;
  const segments = Physics.perimeterWallSegments(wallStage, territoryLevel, hasWater);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd0be9c, map: textures.stoneMap, roughness: 0.86 });
  for (const seg of segments) {
    const cx = seg.x + seg.w / 2;
    const cy = seg.y + seg.d / 2;
    const p3 = to3D(cx, cy);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(seg.w * scale, seg.h * scale * 0.85, seg.d * scale), wallMat);
    mesh.position.set(p3.x, (seg.z || 0) * scale + seg.h * scale * 0.425, p3.z);
    worldGroup.add(mesh);
  }

  // 12. Military Airbase + Textured Very Long Paved Runway & Glowing Approach Lights
  const mil = Physics.militaryBaseLayout(territoryLevel);
  const basePos = to3D(mil.place.x, mil.place.y);
  const padMesh = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.24, 24),
    new THREE.MeshStandardMaterial({ color: 0x6c7578, roughness: 0.86 })
  );
  padMesh.position.set(basePos.x, 0.12, basePos.z);
  worldGroup.add(padMesh);

  addBuilding3D('mil-hangar', 'Military Base Hangar', mil.place.x - 0.9, mil.place.y - 1.3, 9.6, 5.6, 8.6, 0x72858a, 0x465b64, 'building');
  addBuilding3D('mil-tower', 'Airbase Control Tower', mil.place.x + 1.8, mil.place.y - 1.4, 5.0, 11.2, 5.0, 0x90a4a8, 0x364a52, 'building');

  const rwPos = to3D(mil.runway.x, mil.runway.y);
  const rwW = mil.runway.width * scale * 1.45;
  const rwL = mil.runway.length * scale * 1.6;
  if (hasWater && !isIsland) {
    rwPos.z = Math.min(rwPos.z, shoreZ - rwL / 2 - 4.5);
  }
  const runwayMesh = new THREE.Mesh(
    new THREE.BoxGeometry(rwW, 0.20, rwL),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.runwayMap, roughness: 0.88 })
  );
  runwayMesh.position.set(rwPos.x, 0.10, rwPos.z);
  worldGroup.add(runwayMesh);

  const taxi = new THREE.Mesh(
    new THREE.BoxGeometry(Math.abs(rwPos.x - basePos.x), 0.16, 6.4),
    new THREE.MeshStandardMaterial({ color: 0x444c50, roughness: 0.88 })
  );
  taxi.position.set((rwPos.x + basePos.x) / 2, 0.08, basePos.z);
  worldGroup.add(taxi);

  const beaconAmber = new THREE.MeshBasicMaterial({ color: 0xffce6b });
  const beaconGreen = new THREE.MeshBasicMaterial({ color: 0x6dffb0 });
  for (let i = 0; i < 10; i++) {
    const zOff = -rwL * 0.45 + (i / 9) * rwL * 0.90;
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.36, 6, 6), (i === 0 || i === 9) ? beaconGreen : beaconAmber);
      lamp.position.set(rwPos.x + side * (rwW / 2 + 0.7), 0.5, rwPos.z + zOff);
      worldGroup.add(lamp);
    }
  }

  // 13. Homeland Border Defense — Dragons are purely spiritual protectors of their home community
  //     and NEVER mount offensive raids. Only when an active war threatens the homeland do encroaching
  //     border raiders appear near the home perimeter to be repelled by protective dragonfire & thunder.
  const activeWarEnemies = (worldState?.sites || []).filter(s => {
    if (!s || s.id === site.id) return false;
    const pairKey = [site.id, s.id].sort().join(':');
    const rel = worldState?.diplomacy?.[pairKey] || site?.relations?.[s.id];
    return rel?.status === 'war' || rel === 'war' || rel?.atWar === true;
  });

  if (activeWarEnemies.length > 0) {
    const intruderBodyMat = new THREE.MeshStandardMaterial({ color: 0x4b332c, roughness: 0.78 });
    const intruderHelmMat = new THREE.MeshStandardMaterial({ color: 0x2c3430, roughness: 0.55, metalness: 0.35 });
    const intruderSkinMat = new THREE.MeshStandardMaterial({ color: 0xd8a882, roughness: 0.7 });
    const intruderMarkMat = new THREE.MeshStandardMaterial({ color: 0xc92a22, emissive: 0x5c110c, emissiveIntensity: 0.45, roughness: 0.55 });
    const raiderOrigin = activeWarEnemies[0];
    const perimeterSlots = [
      { x: -72, z: -86 },
      { x: 0, z: -98 },
      { x: 74, z: -84 },
      { x: -88, z: -26 }
    ];
    for (let idx = 0; idx < perimeterSlots.length; idx++) {
      const slot = perimeterSlots[idx];
      const ix = slot.x;
      const iz = hasWater ? Math.min(slot.z, shoreZ - 24) : slot.z;
      const iy = Math.max(0, terrainHeightAt(ix, iz));
      const grp = new THREE.Group();
      grp.position.set(ix, iy, iz);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.55), intruderBodyMat.clone());
      torso.position.y = 1.65;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 7), intruderSkinMat);
      head.position.y = 2.62;
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.41, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58), intruderHelmMat);
      helmet.position.y = 2.70;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 0.30), intruderHelmMat);
      legL.position.set(-0.22, 0.55, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 0.30), intruderHelmMat);
      legR.position.set(0.22, 0.55, 0);
      const capMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), intruderMarkMat);
      capMarker.position.y = 3.55;
      const blaze = new THREE.Mesh(
        new THREE.ConeGeometry(1.15, 2.8, 7),
        new THREE.MeshBasicMaterial({ color: 0xff7a22, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      blaze.position.y = 1.8;
      blaze.visible = false;

      grp.add(torso, head, helmet, legL, legR, capMarker, blaze);
      worldGroup.add(grp);

      const entry = {
        id: `border-intruder-${idx}`,
        kind: 'intruder',
        isIntruder: true,
        enemy: true,
        isUnit: true,
        siteId: site.id,
        name: `${raiderOrigin.name || 'Hostile'} Border Intruder #${idx + 1}`,
        mx: ix / scale + 12,
        my: iz / scale + 12,
        x: ix,
        y: iy + 1.8,
        z: iz,
        radius: 3.0,
        hp: 45,
        maxHp: 45,
        dead: false,
        deathTimer: 0,
        mesh: grp,
        body: torso,
        blaze,
        legL,
        legR,
        homeX: ix,
        homeZ: iz,
        patrolRadius: 11 + (idx % 2) * 5,
        patrolAngle: idx * 1.4,
        patrolSpeed: 0.32 + (idx % 2) * 0.08
      };
      borderIntruders.push(entry);
      targets.push(entry);
    }
  }

  // 14. Golden Thermal Updraft Sky-Rings (Soar through for lift & speed!)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe696, transparent: true, opacity: 0.56, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const thermalSpecs = [
    { x: -24, z: 42, y: 24, radius: 18, strength: 18 },
    { x: 54, z: -38, y: 34, radius: 18, strength: 19 },
    { x: -95, z: -95, y: 46, radius: 20, strength: 20 },
    { x: 145, z: -215, y: 88, radius: 22, strength: 22 },
    { x: 240, z: -380, y: 158, radius: 26, strength: 22 },
    { x: -250, z: 240, y: 42, radius: 20, strength: 18 },
    { x: 220, z: 195, y: 38, radius: 20, strength: 18 }
  ];
  const thermalMeshes = [];
  for (const th of thermalSpecs) {
    thermals.push(th);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.42, 8, 28), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(th.x, th.y, th.z);
    worldGroup.add(ring);
    thermalMeshes.push(ring);
  }

  // 15. Soft Multi-Layer Sunlit Volumetric-Style Cloud Banks across Low, Mid & High Altitudes
  const clouds = [];
  const cloudPuffMat = new THREE.SpriteMaterial({
    map: textures.smokeSpriteMap,
    color: SKY_PRESETS[0].cloudColor,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  cloudMaterials.push(cloudPuffMat);

  for (let i = 0; i < 36; i++) {
    const cGrp = new THREE.Group();
    const ang = (i / 36) * Math.PI * 2 + (i % 3) * 0.21;
    const dist = 120 + (i % 7) * 145;
    const alt = 72 + (i % 5) * 34;
    cGrp.position.set(Math.cos(ang) * dist, alt, Math.sin(ang) * dist);
    const puffs = 4 + (i % 3);
    for (let j = 0; j < puffs; j++) {
      const sp = new THREE.Sprite(cloudPuffMat);
      const pw = 36 + ((i + j) % 4) * 16;
      sp.scale.set(pw * 1.55, pw * 0.72, 1);
      sp.position.set((j - puffs * 0.5) * 19, (j % 2) * 5.5, ((j * 7) % 3 - 1) * 12);
      cGrp.add(sp);
    }
    worldGroup.add(cGrp);
    clouds.push({ grp: cGrp, speed: 0.75 + (i % 4) * 0.35 });
  }

  scene.add(worldGroup);
  return {
    worldGroup,
    targets,
    foreignCommunities,
    borderIntruders,
    thermals,
    thermalMeshes,
    clouds,
    cloudMaterials,
    oceanObj,
    windowMaterials,
    stableCrystals,
    skyObelisk,
    lhRotor,
    animatedBoats,
    animatedBirds,
    landmarks,
    terrainHeightAt,
    scale,
    to3D,
    runwayStart3D: { x: rwPos.x, y: 0.95, z: rwPos.z + rwL * 0.44 },
    stablePerch3D: { x: ds3D.x, y: 18, z: ds3D.z }
  };
}

/* ── Procedural Web Audio Flight Soundscape (Zero External Files) ─────── */

function createFlightAudio() {
  let ctx = null, master = null, windGain = null, windFilter = null, fireGain = null, muted = false;

  function ensureStarted() {
    if (ctx || muted) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);

      // Filtered white noise buffer for continuous airspeed wind + roaring dragonfire
      const bufSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = noiseBuf;
      windSrc.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 280;
      windFilter.Q.value = 1.4;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0;
      windSrc.connect(windFilter).connect(windGain).connect(master);
      windSrc.start();

      const fireSrc = ctx.createBufferSource();
      fireSrc.buffer = noiseBuf;
      fireSrc.loop = true;
      const fireFilter = ctx.createBiquadFilter();
      fireFilter.type = 'lowpass';
      fireFilter.frequency.value = 620;
      fireGain = ctx.createGain();
      fireGain.gain.value = 0.0;
      fireSrc.connect(fireFilter).connect(fireGain).connect(master);
      fireSrc.start();
    } catch {
      ctx = null;
    }
  }

  function playWingFlap(isDash = false) {
    if (!ctx || muted) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isDash ? 150 : 108, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.24);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(isDash ? 0.32 : 0.20, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 0.30);
    } catch {}
  }

  function update(speed, maxSpeed, firing) {
    if (!ctx || muted) return;
    try {
      const now = ctx.currentTime;
      const norm = Math.min(1, Math.max(0, speed / Math.max(1, maxSpeed)));
      windFilter.frequency.setTargetAtTime(180 + norm * 780, now, 0.08);
      windGain.gain.setTargetAtTime(0.03 + norm * 0.22, now, 0.08);
      fireGain.gain.setTargetAtTime(firing ? 0.42 : 0.0, now, 0.06);
    } catch {}
  }

  function playSanctuaryWard() {
    if (!ctx || muted) return;
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(396, now);
      osc1.frequency.exponentialRampToValueAtTime(528, now + 0.38);
      osc2.frequency.setValueAtTime(594, now);
      osc2.frequency.exponentialRampToValueAtTime(792, now + 0.38);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.connect(g);
      osc2.connect(g);
      g.connect(master);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.58);
      osc2.stop(now + 0.58);
    } catch {}
  }

  function playThunderStrike() {
    if (!ctx || muted) return;
    try {
      const now = ctx.currentTime;
      // High-voltage crack + rolling thunder boom
      const crackDur = 0.95;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * crackDur), ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        const env = Math.pow(1 - i / ch.length, 1.35);
        ch[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(2400, now);
      filt.frequency.exponentialRampToValueAtTime(140, now + 0.85);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.85, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + crackDur);
      noise.connect(filt).connect(g).connect(master);
      noise.start(now);

      // Sub-bass sky-splitting boom
      const sub = ctx.createOscillator();
      const sg = ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(145, now);
      sub.frequency.exponentialRampToValueAtTime(34, now + 0.55);
      sg.gain.setValueAtTime(0.35, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      sub.connect(sg).connect(master);
      sub.start(now);
      sub.stop(now + 0.65);
    } catch {}
  }

  function dispose() {
    try { ctx?.close(); } catch {}
    ctx = null;
  }

  return { ensureStarted, playWingFlap, playSanctuaryWard, playThunderStrike, update, dispose };
}

/* ── Main Flight3D Controller ──────────────────────────────────────── */

let activeSession = null;

function createOverlayDom() {
  let el = document.getElementById('flight-3d-overlay');
  if (el) return el;
  el = document.createElement('dialog');
  el.id = 'flight-3d-overlay';
  el.setAttribute('aria-label', '3D Aerodynamic Flight Mode');
  el.hidden = true;
  el.innerHTML = `
    <canvas id="flight-3d-canvas" tabindex="0"></canvas>
    <div class="flight-hud-top">
      <div class="flight-telemetry">
        <div class="flight-telemetry-head">
          <span class="flight-telemetry-kicker" id="f3d-kicker">Enchanted Dragon Flight</span>
          <span class="flight-telemetry-kicker" id="f3d-cam-label">Chase Cam</span>
        </div>
        <h2 class="flight-telemetry-title" id="f3d-title">Aurelia · Wizard</h2>
        <div class="flight-gauges">
          <div class="flight-gauge"><span>Speed</span><strong id="f3d-speed">0 kt</strong></div>
          <div class="flight-gauge"><span>Alt</span><strong id="f3d-alt">0 m</strong></div>
          <div class="flight-gauge"><span>Attitude</span><strong id="f3d-att">0° / 0°</strong></div>
          <div class="flight-gauge"><span id="f3d-res-label">Fire</span><strong id="f3d-res">100%</strong></div>
        </div>
      </div>

      <div class="flight-compass-wrap">
        <div class="flight-compass" aria-label="Sky Compass and Waypoint Guide">
          <span class="flight-heading-pill" id="f3d-heading">N 000°</span>
          <button type="button" class="flight-waypoint-btn" id="f3d-waypoint-btn" title="Cycle scenic destination waypoint (N)">
            <span class="flight-waypoint-arrow" id="f3d-wp-arrow">↑</span>
            <span id="f3d-wp-name">Floating Sky-Sanctuary Arch</span>
            <span class="flight-waypoint-dist" id="f3d-wp-dist">420 m</span>
          </button>
        </div>
      </div>

      <div class="flight-top-actions">
        <button type="button" class="flight-btn" id="f3d-camera-btn">Cam (V)</button>
        <button type="button" class="flight-btn" id="f3d-sky-btn">Sky (T)</button>
        <button type="button" class="flight-btn" id="f3d-launch-btn">Reset</button>
        <button type="button" class="flight-btn primary" id="f3d-exit-btn">Return</button>
      </div>
    </div>

    <div class="flight-reticle" id="f3d-reticle" data-locked="false">
      <div class="flight-reticle-ring"></div>
      <div class="flight-reticle-dot"></div>
    </div>
    <div class="flight-target-banner" id="f3d-target" hidden></div>
    <div class="flight-banner" id="f3d-banner" hidden></div>

    <div class="flight-dock-shell" id="f3d-dock-shell" data-collapsed="false">
      <button type="button" class="flight-dock-toggle" id="f3d-dock-toggle" aria-expanded="true">▾ Hide Controls (H)</button>
      <div class="flight-dock">
        <div class="flight-action-pad">
          <button type="button" class="flight-btn" id="f3d-btn-flap">Wing Flap (Space)</button>
          <button type="button" class="flight-btn dash-btn" id="f3d-btn-dash">Sky Dash (Shift)</button>
          <button type="button" class="flight-btn" id="f3d-btn-hover">Hover (X)</button>
          <button type="button" class="flight-btn" id="f3d-btn-land">Land / Perch (G)</button>
          <button type="button" class="flight-btn" id="f3d-btn-roll">Roll (R)</button>
          <button type="button" class="flight-btn fire-btn" id="f3d-btn-fire">Blast Fire (F)</button>
          <button type="button" class="flight-btn thunder-btn" id="f3d-btn-thunder">Protective Thunder (Z)</button>
        </div>
        <div class="flight-keys-hint" id="f3d-keys-hint">
          Z Protective Staff Thunder · F Dragonfire · Drag Sky · W/S Pitch · A/D Bank · Space Flap · Shift Dash · G Perch · N Waypoint · H Hide
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

function cardinalLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function bearingArrow(relDeg) {
  if (Math.abs(relDeg) <= 22) return '↑';
  if (relDeg > 22 && relDeg <= 68) return '↗';
  if (relDeg > 68 && relDeg <= 112) return '→';
  if (relDeg > 112 && relDeg <= 158) return '↘';
  if (relDeg < -22 && relDeg >= -68) return '↖';
  if (relDeg < -68 && relDeg >= -112) return '←';
  if (relDeg < -112 && relDeg >= -158) return '↙';
  return '↓';
}

function launch(options = {}) {
  if (activeSession) close();
  Physics = window.EarthFlightPhysics || Physics;
  if (!Physics) return false;

  const overlay = createOverlayDom();
  // Always mount a fresh <canvas> so a previously lost WebGL or locked 2D context can never block re-launching!
  const oldCanvas = document.getElementById('flight-3d-canvas');
  const canvas = document.createElement('canvas');
  canvas.id = 'flight-3d-canvas';
  canvas.tabIndex = 0;
  if (oldCanvas && oldCanvas.parentNode) oldCanvas.parentNode.replaceChild(canvas, oldCanvas);
  else overlay.prepend(canvas);

  const mode = options.mode === 'jet' ? 'jet' : 'dragon';
  const site = options.site || { name: options.siteName || 'Town', water: false, coastal: options.hasWaterfront !== false, territoryLevel: options.territoryLevel || 0 };
  const lineageDef = (options.lineage && window.EarthDragonStable?.LINEAGES?.find(l => l.id === options.lineage)) || null;
  const dragon = options.dragon || {
    name: options.craftName || 'Aurelia',
    lineageTitle: lineageDef?.title || 'Solar Gold',
    scale: lineageDef?.scale || '#e2a63b',
    accent: lineageDef?.accent || '#fff0b2',
    wing: lineageDef?.wing || '#9e4422',
    aura: lineageDef?.aura || '#ffcf66',
    fire: lineageDef?.fire || '#ff8828'
  };
  const wizard = options.wizard || { name: options.pilotName || 'Skyweaver' };
  const startEvening = Boolean(options.evening);

  // Acquire WebGL2 directly on the flight canvas (Three.js r187 requires WebGL2; otherwise fall back cleanly to Canvas 2D)
  let gl = null;
  let isSoftwareGl = false;
  let renderer = null;
  const glAttrs = { antialias: true, alpha: false, powerPreference: 'high-performance' };
  try {
    gl = canvas.getContext('webgl2', glAttrs);
    if (gl) {
      isSoftwareGl = detectSoftwareGl(gl);
      renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: !isSoftwareGl, powerPreference: 'high-performance' });
    }
  } catch (err) {
    console.warn('WebGL flight renderer unavailable, falling back to Canvas 2D:', err);
    gl = null;
    renderer = null;
  }
  if (!renderer) {
    // Fresh canvas in case WebGL touched the previous canvas before throwing
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.id = 'flight-3d-canvas';
    fallbackCanvas.tabIndex = 0;
    canvas.parentNode?.replaceChild(fallbackCanvas, canvas);
    isSoftwareGl = true;
    renderer = createCanvasFlightRenderer(fallbackCanvas);
  }
  const activeCanvas = document.getElementById('flight-3d-canvas') || canvas;

  let maxAniso = 4;
  if (gl && renderer.capabilities) {
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    maxAniso = renderer.capabilities.getMaxAnisotropy?.() || 4;
  }
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const textures = createProceduralTextures(maxAniso);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_PRESETS[0].horizon);
  scene.fog = new THREE.FogExp2(SKY_PRESETS[0].fog, SKY_PRESETS[0].fogDensity);

  // Studio Environment Reflections via RoomEnvironment + PMREMGenerator (gracefully optional on older mobile GPUs)
  let environment = null;
  if (gl && typeof THREE.PMREMGenerator === 'function' && typeof THREE.RoomEnvironment === 'function') {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new THREE.RoomEnvironment();
      environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      room.dispose();
      pmrem.dispose();
    } catch (envErr) {
      console.warn('Skipping PMREM environment on this GPU:', envErr);
      environment = null;
    }
  }

  // Atmospheric Sky Dome
  const skyDome = createAtmosphericSkyDome();
  scene.add(skyDome.mesh);

  // Warm/Cool Directional Key + Hemisphere Fill + Rim Backlight
  const hemi = new THREE.HemisphereLight(SKY_PRESETS[0].hemiSky, SKY_PRESETS[0].hemiGround, SKY_PRESETS[0].hemiIntensity);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(SKY_PRESETS[0].sunColor, SKY_PRESETS[0].sunIntensity);
  sun.position.set(160, 210, 140);
  scene.add(sun);
  const rimLight = new THREE.DirectionalLight(0x88d4ff, 0.55);
  rimLight.position.set(-140, 90, -160);
  scene.add(rimLight);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / Math.max(1, window.innerHeight), 0.5, 2400);
  const world3D = buildTownWorld(scene, site, options.world, textures, isSoftwareGl);
  const particles = createVolumetricParticles(scene, textures, isSoftwareGl ? 110 : 185);
  const audio = createFlightAudio();

  // Build Hero Flyer (Ultra-Detailed Enchanted Dragon + Wizard OR Fighter Jet)
  const flyer = mode === 'jet' ? buildFighterJet() : buildEnchantedDragon(dragon, wizard, textures);
  scene.add(flyer.root);

  // Wingtip Luminous Arcane Trail Ribbons (Dragon mode — subtle streaming sky trails!)
  const trailCount = 24;
  const wingTrailMeshes = [];
  if (mode === 'dragon') {
    const trailMat = new THREE.SpriteMaterial({
      map: textures.sparkSpriteMap,
      color: new THREE.Color(dragon.aura || '#ffcf66'),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    for (let i = 0; i < trailCount; i++) {
      const sp = new THREE.Sprite(trailMat.clone());
      sp.visible = false;
      scene.add(sp);
      wingTrailMeshes.push({ sp, life: 0, maxLife: 0.48 });
    }
  }
  let trailCursor = 0;
  let trailSpawnAcc = 0;

  // Dynamic flickering Dragonfire / Afterburner PointLight
  const fireLight = new THREE.PointLight(0xff8a2b, 0, 72, 1.4);
  scene.add(fireLight);

  // Wizard Staff Protective Sky-to-Ground Thunder & Lightning VFX System
  const thunderGroup = new THREE.Group();
  thunderGroup.visible = false;
  const boltCoreMat = new THREE.MeshBasicMaterial({ color: 0xf0fdff, transparent: true, opacity: 0.98, depthWrite: false });
  const boltGlowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.68, depthWrite: false });
  const skyFlashMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide });
  const skyStormFlash = new THREE.Mesh(new THREE.CircleGeometry(28, 20), skyFlashMat);
  skyStormFlash.rotation.x = Math.PI / 2;
  const shockwaveMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide });
  const groundShockwave = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.8, 28), shockwaveMat);
  groundShockwave.rotation.x = -Math.PI / 2;
  thunderGroup.add(skyStormFlash, groundShockwave);
  scene.add(thunderGroup);
  const thunderLight = new THREE.PointLight(0x38bdf8, 0, 120, 1.6);
  scene.add(thunderLight);

  let staffSkyBoltMesh = null;
  let groundBoltMeshes = [];

  function buildJaggedBoltMesh(pStart, pEnd, radius, segs, jitter, mat) {
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const px = pStart.x + (pEnd.x - pStart.x) * f;
      const py = pStart.y + (pEnd.y - pStart.y) * f;
      const pz = pStart.z + (pEnd.z - pStart.z) * f;
      const edgeScale = (i === 0 || i === segs) ? 0 : Math.sin(f * Math.PI);
      pts.push(new THREE.Vector3(
        px + (Math.random() - 0.5) * jitter * edgeScale,
        py + (Math.random() - 0.5) * jitter * 0.25 * edgeScale,
        pz + (Math.random() - 0.5) * jitter * edgeScale
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, segs * 2, radius, 5, false);
    return new THREE.Mesh(geo, mat);
  }

  function clearThunderBolts() {
    if (staffSkyBoltMesh) {
      thunderGroup.remove(staffSkyBoltMesh);
      staffSkyBoltMesh.geometry?.dispose?.();
      staffSkyBoltMesh = null;
    }
    for (const m of groundBoltMeshes) {
      thunderGroup.remove(m);
      m.geometry?.dispose?.();
    }
    groundBoltMeshes = [];
  }

  // Apply Time-of-Day Preset helper (Live switchable with T!)
  let skyIndex = startEvening ? 2 : 0;
  function applySkyPreset(idx) {
    skyIndex = ((idx % SKY_PRESETS.length) + SKY_PRESETS.length) % SKY_PRESETS.length;
    const p = SKY_PRESETS[skyIndex];
    skyDome.uniforms.uZenith.value.setHex(p.zenith);
    skyDome.uniforms.uHorizon.value.setHex(p.horizon);
    skyDome.uniforms.uGround.value.setHex(p.ground);
    skyDome.uniforms.uSunColor.value.setHex(p.sunColor);
    skyDome.uniforms.uSunDir.value.set(p.sunDir[0], p.sunDir[1], p.sunDir[2]).normalize();
    skyDome.uniforms.uStarAlpha.value = p.starAlpha;
    skyDome.uniforms.uAuroraAlpha.value = p.auroraAlpha;

    world3D.oceanObj.uniforms.uDeepColor.value.setHex(p.oceanDeep);
    world3D.oceanObj.uniforms.uShallowColor.value.setHex(p.oceanShallow);
    world3D.oceanObj.uniforms.uSkyHorizon.value.setHex(p.horizon);
    world3D.oceanObj.uniforms.uSunColor.value.setHex(p.sunColor);
    world3D.oceanObj.uniforms.uSunDir.value.set(p.sunDir[0], p.sunDir[1], p.sunDir[2]).normalize();
    world3D.oceanObj.uniforms.uFogColor.value.setHex(p.fog);
    world3D.oceanObj.uniforms.uFogDensity.value = p.fogDensity;

    scene.background?.setHex(p.horizon);
    scene.fog.color.setHex(p.fog);
    scene.fog.density = p.fogDensity;
    hemi.color.setHex(p.hemiSky);
    hemi.groundColor.setHex(p.hemiGround);
    hemi.intensity = p.hemiIntensity;
    sun.color.setHex(p.sunColor);
    sun.intensity = p.sunIntensity;
    sun.position.set(p.sunDir[0] * 280, Math.max(40, p.sunDir[1] * 280), p.sunDir[2] * 280);
    if (gl && renderer) renderer.toneMappingExposure = p.exposure;
    for (const cm of world3D.cloudMaterials) cm.color.setHex(p.cloudColor);
    for (const wm of world3D.windowMaterials) wm.emissiveIntensity = p.windowGlow;
    if (btnSky) btnSky.textContent = `${p.label.split(' ')[0]} (T)`;
  }

  const origin = options.origin;
  const dragonStart = Number.isFinite(origin?.x) && Number.isFinite(origin?.y)
    ? world3D.to3D(origin.x, origin.y) : world3D.stablePerch3D;
  const startFromGround = mode === 'jet' && options.runwayTakeoff !== false;
  // Panoramic Launch Angle: frames Stone Town, gleaming turquoise Ocean + sailboats, Dragon Citadel, Alpine Peaks & Floating Sky-Sanctuary!
  const flightState = Physics.createFlightState({
    kind: mode,
    airborne: !startFromGround,
    x: startFromGround ? world3D.runwayStart3D.x : dragonStart.x - 14,
    y: startFromGround ? 0.95 : 34,
    z: startFromGround ? world3D.runwayStart3D.z : dragonStart.z + 34,
    yaw: startFromGround ? 0 : -0.78,
    pitch: startFromGround ? 0 : -0.04,
    speed: startFromGround ? 0 : (mode === 'jet' ? 54 : 30)
  });
  flightState.thunderStrikes = 0;
  flightState.borderRefusals = 0;
  if (startFromGround) flightState.throttle = 0.9;

  // Determine whether the Wizard is in their originating community (full spiritual resonance)
  const wizardPower = window.EarthDragonStable?.wizardPowerStatus?.(options.worldState || options.world || null, site, wizard.id) || {
    fullPower: !wizard.homeSiteId || !site?.id || wizard.homeSiteId === site.id,
    originSiteName: wizard.homeSiteName || site?.name || 'their homeland',
    reason: ''
  };

  // Bind HUD DOM elements
  const elKicker = document.getElementById('f3d-kicker');
  const elTitle = document.getElementById('f3d-title');
  const elCamLabel = document.getElementById('f3d-cam-label');
  const elSpeed = document.getElementById('f3d-speed');
  const elAlt = document.getElementById('f3d-alt');
  const elAtt = document.getElementById('f3d-att');
  const elResLabel = document.getElementById('f3d-res-label');
  const elRes = document.getElementById('f3d-res');
  const elHeading = document.getElementById('f3d-heading');
  const btnWaypoint = document.getElementById('f3d-waypoint-btn');
  const elWpArrow = document.getElementById('f3d-wp-arrow');
  const elWpName = document.getElementById('f3d-wp-name');
  const elWpDist = document.getElementById('f3d-wp-dist');
  const elReticle = document.getElementById('f3d-reticle');
  const elTarget = document.getElementById('f3d-target');
  const elBanner = document.getElementById('f3d-banner');
  const elDockShell = document.getElementById('f3d-dock-shell');
  const btnDockToggle = document.getElementById('f3d-dock-toggle');
  const btnFlap = document.getElementById('f3d-btn-flap');
  const btnDash = document.getElementById('f3d-btn-dash');
  const btnHover = document.getElementById('f3d-btn-hover');
  const btnLand = document.getElementById('f3d-btn-land');
  const btnRoll = document.getElementById('f3d-btn-roll');
  const btnFire = document.getElementById('f3d-btn-fire');
  const btnThunder = document.getElementById('f3d-btn-thunder');
  const btnCam = document.getElementById('f3d-camera-btn');
  const btnSky = document.getElementById('f3d-sky-btn');
  const btnLaunch = document.getElementById('f3d-launch-btn');
  const btnExit = document.getElementById('f3d-exit-btn');

  applySkyPreset(skyIndex);

  elKicker.textContent = mode === 'jet' ? 'Military Airbase · Jet' : `Guardian of ${site?.name || 'Homeland'}`;
  elTitle.textContent = mode === 'jet' ? (options.craftName || 'Interceptor Squadron') : `${dragon.name} · ${wizard.name}`;
  elResLabel.textContent = mode === 'jet' ? 'Throttle' : 'Fire';
  btnFlap.textContent = mode === 'jet' ? 'Thrust (Space)' : 'Wing Flap (Space)';
  btnDash.textContent = mode === 'jet' ? 'Afterburner (Shift)' : 'Sky Dash (Shift)';
  btnHover.textContent = mode === 'jet' ? 'Airbrake (X)' : 'Hover (X)';
  btnLand.hidden = mode === 'jet';
  btnThunder.hidden = mode === 'jet';
  btnThunder.textContent = wizardPower.fullPower ? 'Protective Thunder (Z)' : 'Staff Ward (Homeland Only)';
  btnFire.textContent = mode === 'jet' ? 'Missiles (F)' : 'Blast Fire (F)';
  btnLaunch.textContent = mode === 'jet' ? 'Runway' : 'Citadel';

  // Destination Waypoint Index (start pointing at the Floating Sky-Sanctuary Arch!)
  let wpIndex = world3D.landmarks.findIndex(l => l.id === 'sky-arch');
  if (wpIndex < 0) wpIndex = 0;

  let bannerTimer = 0;
  function showBanner(text, seconds = 3.2) {
    elBanner.textContent = text;
    elBanner.hidden = false;
    bannerTimer = seconds;
  }
  showBanner(
    mode === 'jet'
      ? 'Cleared for runway takeoff! Hold Shift/Space for afterburner and pull S/↓ to climb.'
      : `${wizard.name} & ${dragon.name} soar to protect ${site?.name || 'the homeland'} — press Z for Protective Staff Thunder.`,
    3.6
  );

  const camModes = [
    'Chase Cam',
    'Panoramic Orbit',
    mode === 'jet' ? 'Cockpit Cam' : 'Wizard Shoulder',
    'Hero Showcase'
  ];
  let camMode = 0;
  let dockCollapsed = false;
  let camShake = 0;
  let fireIntensitySmooth = 0;
  const keys = new Set();
  const touchState = { flap: false, dash: false, hover: false, fire: false, rollPulse: false };
  let fireCooldown = 0;
  let lastFunToast = 0;
  let elapsed = 0;
  let destroyed = false;
  let rafId = 0;
  let timerId = 0;
  let lastNow = performance.now();

  const initFwd = Physics.forwardVector(flightState.yaw, flightState.pitch);
  const camPos = new THREE.Vector3(
    flightState.x - initFwd.x * 14.2,
    flightState.y + 4.6,
    flightState.z - initFwd.z * 14.2
  );
  const camLook = new THREE.Vector3(
    flightState.x + initFwd.x * 20,
    flightState.y + 0.8,
    flightState.z + initFwd.z * 20
  );

  function toggleDock() {
    dockCollapsed = !dockCollapsed;
    elDockShell.dataset.collapsed = dockCollapsed ? 'true' : 'false';
    btnDockToggle.setAttribute('aria-expanded', dockCollapsed ? 'false' : 'true');
    btnDockToggle.textContent = dockCollapsed ? '▴ Show Controls (H)' : '▾ Hide Controls (H)';
  }

  function toggleLandPerch() {
    if (mode !== 'dragon') return;
    if (flightState.airborne) {
      const ground = world3D.terrainHeightAt(flightState.x, flightState.z);
      if (ground < -0.1) {
        showBanner('Skimming open ocean — fly over land, a mountain peak, or an island to perch!', 2.8);
        return;
      }
      flightState.airborne = false;
      flightState.y = ground + 1.05;
      flightState.speed = 0;
      flightState.vy = 0;
      flightState.pitch = 0;
      flightState.roll = 0;
      flightState.hovering = false;
      showBanner(`${dragon.name} perched safely! Press Space, Shift, or G to leap back into the sky.`, 3.2);
    } else {
      flightState.airborne = true;
      flightState.speed = 26;
      flightState.vy = 11;
      flightState.pitch = 0.30;
      flightState.flapPulse = 1.0;
      audio.playWingFlap(true);
      showBanner(`${dragon.name} launched back into open flight!`, 2.2);
    }
  }

  function cycleWaypoint() {
    if (!world3D.landmarks.length) return;
    wpIndex = (wpIndex + 1) % world3D.landmarks.length;
    const wp = world3D.landmarks[wpIndex];
    showBanner(`Compass locked onto ${wp.name} — follow the arrow to explore!`, 2.6);
  }

  let lastRefusalToast = -10;
  const thunderState = {
    active: false,
    t: 0,
    duration: 0.72,
    impactDone: false,
    target: null,
    strikeX: 0,
    strikeY: 0,
    strikeZ: 0
  };

  function applyProtectiveRepel(t, dmg, source = 'fire') {
    if (!t || t.dead) return { repelled: false, hp: 0 };
    t.hp = Math.max(0, t.hp - dmg);
    flightState.targetsHit++;
    if (t.blaze) t.blaze.visible = true;
    if (t.body?.material?.color) {
      t.body.material.color.lerp(_col.setHex(source === 'thunder' ? 0x263242 : 0x281e1a), 0.34);
    }

    const justRepelled = t.hp <= 0 && !t.dead;
    if (justRepelled) {
      t.dead = true;
      if (t.isUnit) {
        t.deathTimer = 3.2;
        t.mesh.rotation.z = Math.PI / 2;
        const gy = Math.max(0, world3D.terrainHeightAt(t.x, t.z));
        t.mesh.position.y = gy + 0.45;
      } else if (t.mesh) {
        t.mesh.scale.y = 0.24;
      }
    }

    const burstCount = justRepelled ? 14 : 9;
    for (let i = 0; i < burstCount; i++) {
      particles.spawn('fire',
        t.x + (Math.random() - 0.5) * 3.4,
        t.y + 0.8 + Math.random() * 2.6,
        t.z + (Math.random() - 0.5) * 3.4,
        (Math.random() - 0.5) * 14,
        6 + Math.random() * 12,
        (Math.random() - 0.5) * 14,
        {
          baseScale: justRepelled ? 2.8 : 2.1,
          grow: 2.3,
          maxLife: 0.85,
          startColor: source === 'thunder' ? 0xd8fdff : 0xfff4bd,
          endColor: source === 'thunder' ? 0x2299ff : 0xd9260a
        }
      );
    }
    for (let i = 0; i < (justRepelled ? 12 : 7); i++) {
      particles.spawn('spark',
        t.x + (Math.random() - 0.5) * 3,
        t.y + 1.8,
        t.z + (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 24,
        10 + Math.random() * 18,
        (Math.random() - 0.5) * 24,
        {
          baseScale: source === 'thunder' ? 1.1 : 0.82,
          grow: 0.32,
          maxLife: 0.95,
          rise: -6,
          startColor: source === 'thunder' ? 0xffffff : 0xfff2c2,
          endColor: source === 'thunder' ? 0x38d8ff : 0xff6e1a
        }
      );
    }
    for (let i = 0; i < (justRepelled ? 6 : 3); i++) {
      particles.spawn('smoke',
        t.x + (Math.random() - 0.5) * 3.5,
        t.y + 2.4,
        t.z + (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 4,
        5 + Math.random() * 5,
        (Math.random() - 0.5) * 4,
        { baseScale: 3.0, grow: 2.2, maxLife: 1.7, opacity: 0.48 }
      );
    }
    return { repelled: justRepelled, hp: t.hp };
  }

  function resolveProtectiveThunderTarget(explicitTarget = null) {
    if (explicitTarget && explicitTarget.isIntruder && !explicitTarget.dead && explicitTarget.hp > 0) return explicitTarget;
    const cone = Physics.findTargetsInFireCone(flightState, world3D.borderIntruders);
    if (cone[0]?.target && !cone[0].target.dead) return cone[0].target;
    let best = null;
    let bestDist = 190;
    for (const t of world3D.borderIntruders) {
      if (!t || t.dead || t.hp <= 0) continue;
      const d = Math.hypot(t.x - flightState.x, t.z - flightState.z);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    return best;
  }

  function triggerThunderStrike(explicitTarget = null) {
    if (mode !== 'dragon') return false;
    audio.ensureStarted();

    // Wizard abilities reach full power ONLY inside the community from which the Wizard originates!
    if (!wizardPower.fullPower) {
      audio.playSanctuaryWard();
      showBanner(
        `${wizard.name}'s Staff Thunder only reaches full power in ${wizardPower.homeSiteName || 'their originating community'}.`,
        3.4
      );
      return false;
    }

    const intruder = resolveProtectiveThunderTarget(explicitTarget);
    let sx, sy, sz;
    if (intruder) {
      sx = intruder.x;
      sy = Math.max(0, world3D.terrainHeightAt(intruder.x, intruder.z)) + 0.5;
      sz = intruder.z;
    } else {
      const fwd = Physics.forwardVector(flightState.yaw, flightState.pitch);
      sx = flightState.x + fwd.x * 58;
      sz = flightState.z + fwd.z * 58;
      sy = Math.max(0, world3D.terrainHeightAt(sx, sz)) + 0.5;
    }

    // Refuse casting thunder into another community's lands
    const foreignHit = world3D.foreignCommunities.find(c => Math.hypot(sx - c.x, sz - c.z) <= c.radius + 14);
    if (foreignHit) {
      foreignHit.pulse = 1.0;
      audio.playSanctuaryWard();
      showBanner(`Protective Staff Thunder guards ${site.name} alone — it will not strike ${foreignHit.name}.`, 3.4);
      return false;
    }

    clearThunderBolts();
    flyer.root.updateMatrixWorld(true);
    if (flyer.staffHead) flyer.staffHead.getWorldPosition(_v1);
    else _v1.set(flightState.x, flightState.y + 2.2, flightState.z);

    // Phase 1: Shoot jagged electric-cyan protective bolt UPWARD from Wizard's staff into the sky!
    _v2.set(_v1.x + (sx - _v1.x) * 0.25, _v1.y + 165, _v1.z + (sz - _v1.z) * 0.25);
    staffSkyBoltMesh = buildJaggedBoltMesh(_v1, _v2, 0.42, 10, 8.5, boltGlowMat);
    thunderGroup.add(staffSkyBoltMesh);

    skyStormFlash.position.set(sx, sy + 160, sz);
    skyFlashMat.opacity = 0.92;
    groundShockwave.position.set(sx, sy + 0.4, sz);
    groundShockwave.scale.setScalar(0.5);
    shockwaveMat.opacity = 0;

    thunderGroup.visible = true;
    thunderLight.position.copy(_v1);
    thunderLight.intensity = 18;

    for (let i = 0; i < 12; i++) {
      particles.spawn('spark',
        _v1.x, _v1.y, _v1.z,
        (Math.random() - 0.5) * 18,
        14 + Math.random() * 20,
        (Math.random() - 0.5) * 18,
        { baseScale: 0.95, grow: 0.2, maxLife: 0.55, startColor: 0xffffff, endColor: 0x3ce8ff, rise: 6 }
      );
    }

    thunderState.active = true;
    thunderState.t = 0;
    thunderState.impactDone = false;
    thunderState.target = intruder;
    thunderState.strikeX = sx;
    thunderState.strikeY = sy;
    thunderState.strikeZ = sz;
    flightState.thunderStrikes = (flightState.thunderStrikes || 0) + 1;
    return true;
  }

  function executeThunderImpact() {
    const sx = thunderState.strikeX;
    const sy = thunderState.strikeY;
    const sz = thunderState.strikeZ;
    // Phase 2: Massive protective sky-to-ground thunderbolt + forked branches crash down to defend the homeland!
    const skyTop = new THREE.Vector3(sx + (Math.random() - 0.5) * 14, sy + 162, sz + (Math.random() - 0.5) * 14);
    const groundHit = new THREE.Vector3(sx, sy, sz);
    const mainBolt = buildJaggedBoltMesh(skyTop, groundHit, 0.85, 12, 13.5, boltCoreMat);
    const haloBolt = buildJaggedBoltMesh(skyTop, groundHit, 1.55, 10, 14.5, boltGlowMat);
    const midPt = new THREE.Vector3((skyTop.x + sx) * 0.5, sy + 72, (skyTop.z + sz) * 0.5);
    const forkA = buildJaggedBoltMesh(midPt, new THREE.Vector3(sx + 14, sy + 2, sz - 10), 0.36, 7, 6.5, boltGlowMat);
    const forkB = buildJaggedBoltMesh(midPt, new THREE.Vector3(sx - 12, sy + 2, sz + 11), 0.36, 7, 6.5, boltGlowMat);
    thunderGroup.add(mainBolt, haloBolt, forkA, forkB);
    groundBoltMeshes.push(mainBolt, haloBolt, forkA, forkB);

    thunderLight.position.set(sx, sy + 12, sz);
    thunderLight.intensity = 9.0;
    shockwaveMat.opacity = 0.86;
    camShake = Math.min(1.0, camShake + 0.58);
    audio.playThunderStrike();

    // Repel any encroaching homeland border intruders near the strike (never harms home buildings or foreign communities!)
    const repelled = [];
    const primary = thunderState.target;
    if (primary && primary.isIntruder && !primary.dead && primary.hp > 0) {
      const res = applyProtectiveRepel(primary, 100, 'thunder');
      repelled.push({ target: primary, ...res });
    }
    for (const t of world3D.borderIntruders) {
      if (!t || t === primary || t.dead || t.hp <= 0) continue;
      if (Math.hypot(t.x - sx, t.z - sz) <= 22 + (t.radius || 2)) {
        const res = applyProtectiveRepel(t, 100, 'thunder');
        repelled.push({ target: t, ...res });
      }
    }

    if (repelled.length > 0) {
      const msg = repelled.length > 1
        ? `${wizard.name}'s Protective Staff Thunder repelled ${repelled.length} border intruders from ${site.name}!`
        : `${wizard.name}'s Protective Staff Thunder drove back ${repelled[0].target.name} from ${site.name}'s borders!`;
      showBanner(msg, 3.2);
      for (const s of repelled) {
        options.onThunderStrike?.({
          kind: 'defense',
          defensive: true,
          intruder: true,
          id: s.target.id,
          name: s.target.name,
          repelled: s.repelled
        });
      }
    } else {
      showBanner(`${wizard.name} raised the Arcane Staff and cast a Protective Thunder Ward across ${site.name}'s homeland!`, 3.0);
      options.onThunderStrike?.({
        kind: 'ward',
        defensive: true,
        name: `${site.name} homeland perimeter`
      });
    }
  }

  function triggerFireBlast(coneHitsList) {
    flightState.fireBlasts++;
    camShake = Math.min(1.0, camShake + 0.26);

    const hitTargets = new Set();
    const allowTarget = t => {
      if (!t || t.dead || t.hp <= 0) return false;
      // Spiritual dragons ONLY use protective fire against encroaching border intruders — never offensive attacks!
      return mode === 'dragon' ? Boolean(t.isIntruder) : true;
    };
    if (Array.isArray(coneHitsList)) {
      for (const h of coneHitsList) {
        if (allowTarget(h?.target)) hitTargets.add(h.target);
      }
    } else if (allowTarget(coneHitsList?.target)) {
      hitTargets.add(coneHitsList.target);
    }

    if (mode === 'dragon' && world3D.borderIntruders.length > 0) {
      const fwd = Physics.forwardVector(flightState.yaw, flightState.pitch);
      const sweepX = flightState.x + fwd.x * 26;
      const sweepZ = flightState.z + fwd.z * 26;
      for (const t of world3D.borderIntruders) {
        if (!t || t.dead || t.hp <= 0) continue;
        if (Math.hypot(t.x - sweepX, t.z - sweepZ) <= 22) hitTargets.add(t);
      }
    }

    if (hitTargets.size > 0) {
      const list = Array.from(hitTargets);
      let repelledCount = 0;
      let lastStruck = null;
      for (const t of list) {
        const dmg = mode === 'jet' ? 50 : 65;
        const res = applyProtectiveRepel(t, dmg, 'fire');
        if (res.repelled) repelledCount++;
        lastStruck = { target: t, ...res };
        const payload = mode === 'dragon'
          ? { kind: 'defense', defensive: true, intruder: true, id: t.id, name: t.name, repelled: res.repelled }
          : { kind: t.isUnit ? 'enemy' : 'building', id: t.id, name: t.name, x: t.mx, y: t.my, hp: t.hp, killed: res.repelled };
        options.onFireHit?.(payload);
        options.onFireAttack?.(payload);
      }
      if (mode === 'dragon') {
        showBanner(
          repelledCount > 0
            ? `${dragon.name}'s protective flame drove ${repelledCount > 1 ? `${repelledCount} intruders` : lastStruck.target.name} away from ${site.name}!`
            : `${dragon.name}'s protective flame held ${lastStruck.target.name} back from ${site.name}!`,
          2.8
        );
      } else if (lastStruck) {
        showBanner(`Direct hit! ${lastStruck.target.name} struck (${lastStruck.hp}% HP)!`, 2.6);
      }
    } else if (elapsed - lastFunToast > 3.8) {
      lastFunToast = elapsed;
      showBanner(
        mode === 'jet'
          ? 'Autocannon & ordnance fired across the open sky!'
          : `${dragon.name} roared with spiritual joy and painted golden-ember fire across ${site.name}'s sky!`,
        2.6
      );
      options.onFireHit?.({ kind: 'fun' });
      options.onFireAttack?.({ kind: 'fun' });
    }
  }

  function onKeyDown(e) {
    if (destroyed) return;
    audio.ensureStarted();
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'q', 'e', 'f', 'x', 'r', 'v', 't', 'g', 'h', 'n', 'z', 'shift'].includes(k)) {
      e.preventDefault();
    }
    if (k === 'escape') { e.preventDefault(); close(); return; }
    if (k === 'v') { camMode = (camMode + 1) % camModes.length; elCamLabel.textContent = camModes[camMode]; return; }
    if (k === 't') { applySkyPreset(skyIndex + 1); showBanner(`Atmosphere: ${SKY_PRESETS[skyIndex].label}`, 2.0); return; }
    if (k === 'h') { toggleDock(); return; }
    if (k === 'g') { toggleLandPerch(); return; }
    if (k === 'n') { cycleWaypoint(); return; }
    if (k === 'z' && mode === 'dragon') { triggerThunderStrike(); return; }
    if (k === 'r') { touchState.rollPulse = true; return; }
    if ((k === ' ' || k === 'shift') && !keys.has(k) && mode === 'dragon') audio.playWingFlap(k === 'shift');
    keys.add(k);
  }
  function onKeyUp(e) { keys.delete(e.key.toLowerCase()); }
  function onResize() {
    if (destroyed) return;
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  // Smooth mouse/touch drag-anywhere sky steering + tap to breathe protective/joyful dragonfire
  let steering = null, touchYaw = 0, touchPitch = 0, tapFire = false;
  const onCanvasDown = e => {
    audio.ensureStarted();
    if (steering || e.button !== 0) return;
    steering = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try { activeCanvas.setPointerCapture?.(e.pointerId); } catch {}
  };
  const onCanvasMove = e => {
    if (steering?.id !== e.pointerId) return;
    const dx = e.clientX - steering.x, dy = steering.y - e.clientY;
    if (!steering.moved && Math.hypot(dx, dy) < 9) return;
    steering.moved = true;
    touchYaw = Math.max(-1, Math.min(1, dx / 72));
    touchPitch = Math.max(-1, Math.min(1, dy / 72));
  };
  const onCanvasUp = e => {
    if (steering?.id !== e.pointerId) return;
    const wasTap = e.type === 'pointerup' && !steering.moved;
    steering = null;
    touchYaw = touchPitch = 0;
    if (wasTap) tapFire = true;
  };
  const releaseInputs = () => {
    keys.clear();
    steering = null;
    touchYaw = touchPitch = 0;
    tapFire = touchState.fire = touchState.flap = touchState.dash = touchState.hover = touchState.rollPulse = false;
  };

  const onCamClick = () => { camMode = (camMode + 1) % camModes.length; elCamLabel.textContent = camModes[camMode]; };
  const onSkyClick = () => { applySkyPreset(skyIndex + 1); showBanner(`Atmosphere: ${SKY_PRESETS[skyIndex].label}`, 2.0); };
  const onLaunchClick = () => {
    if (mode === 'jet') {
      Object.assign(flightState, Physics.createFlightState({
        kind: 'jet', airborne: false,
        x: world3D.runwayStart3D.x, y: 0.95, z: world3D.runwayStart3D.z, yaw: 0, speed: 0
      }));
      flightState.throttle = 0.9;
      showBanner('Positioned on the Military Base runway. Hold Shift/Space to accelerate and climb!');
    } else {
      Object.assign(flightState, Physics.createFlightState({
        kind: 'dragon', airborne: true,
        x: world3D.stablePerch3D.x, y: 34, z: world3D.stablePerch3D.z + 24, yaw: 0, speed: 30
      }));
      showBanner(`${dragon.name} soared above the Dragon Sanctuary Citadel!`);
    }
  };
  const onExitClick = () => close();
  const onCancel = event => { event.preventDefault(); close(); };
  const onThunderClick = () => { audio.ensureStarted(); triggerThunderStrike(); };
  const bindHold = (btn, prop, playFlapSound = false) => {
    const down = e => {
      e.preventDefault();
      audio.ensureStarted();
      touchState[prop] = true;
      btn.dataset.active = 'true';
      if (playFlapSound && mode === 'dragon') audio.playWingFlap(prop === 'dash');
    };
    const up = () => { touchState[prop] = false; btn.dataset.active = 'false'; };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
    return () => {
      btn.removeEventListener('pointerdown', down);
      btn.removeEventListener('pointerup', up);
      btn.removeEventListener('pointerleave', up);
      btn.removeEventListener('pointercancel', up);
    };
  };
  const onRollClick = () => { audio.ensureStarted(); touchState.rollPulse = true; };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  activeCanvas.addEventListener('pointerdown', onCanvasDown);
  activeCanvas.addEventListener('pointermove', onCanvasMove);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) activeCanvas.addEventListener(type, onCanvasUp);
  window.addEventListener('blur', releaseInputs);
  btnCam.addEventListener('click', onCamClick);
  btnSky.addEventListener('click', onSkyClick);
  btnLaunch.addEventListener('click', onLaunchClick);
  btnExit.addEventListener('click', onExitClick);
  btnDockToggle.addEventListener('click', toggleDock);
  btnLand.addEventListener('click', toggleLandPerch);
  btnWaypoint.addEventListener('click', cycleWaypoint);
  btnThunder.addEventListener('click', onThunderClick);
  overlay.addEventListener('cancel', onCancel);
  btnRoll.addEventListener('click', onRollClick);
  const unbindFlap = bindHold(btnFlap, 'flap', true);
  const unbindDash = bindHold(btnDash, 'dash', true);
  const unbindHover = bindHold(btnHover, 'hover');
  const unbindFire = bindHold(btnFire, 'fire');

  // Software-WebGL GPU fence pacing (Three.js skill mandatory afterDraw pattern)
  function afterDraw(cb) {
    if (!gl || typeof gl.fenceSync !== 'function') {
      timerId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (destroyed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        timerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        timerId = window.setTimeout(cb, 75);
      }
    };
    timerId = window.setTimeout(poll, 5);
  }

  let hudTimer = 0.1;

  function stepFrame(now) {
    if (destroyed) return;
    const rawDt = (now - lastNow) / 1000;
    const dt = Math.min(0.05, Math.max(0.008, Number.isFinite(rawDt) ? rawDt : 0.016));
    lastNow = now;
    elapsed += dt;

    // Collect 6-DOF aerodynamic inputs
    const pitchUp = keys.has('s') || keys.has('arrowdown');
    const pitchDown = keys.has('w') || keys.has('arrowup');
    const rollLeft = keys.has('a') || keys.has('arrowleft');
    const rollRight = keys.has('d') || keys.has('arrowright');
    const yawLeft = keys.has('q');
    const yawRight = keys.has('e');
    const flap = keys.has(' ') || touchState.flap;
    const dash = keys.has('shift') || touchState.dash;
    const boost = flap || dash;
    const hover = keys.has('x') || keys.has('c') || touchState.hover;
    const fire = keys.has('f') || touchState.fire || tapFire;
    tapFire = false;

    const autoRotate = mode === 'jet' && !flightState.airborne && flightState.speed >= 24 && (boost || pitchUp);
    const controls = {
      pitch: ((pitchUp || autoRotate) ? 1 : 0) - (pitchDown && !autoRotate ? 1 : 0) + touchPitch,
      roll: (rollLeft ? 1 : 0) - (rollRight ? 1 : 0) - touchYaw * 0.65,
      yaw: (yawRight ? 1 : 0) - (yawLeft ? 1 : 0) + touchYaw * 0.85,
      flap,
      boost,
      dash,
      brake: mode === 'jet' ? hover : keys.has('c'),
      hover: mode === 'dragon' ? hover : false,
      fire,
      barrelRoll: touchState.rollPulse
    };
    touchState.rollPulse = false;

    Physics.stepFlight(flightState, controls, dt, world3D.thermals, world3D.terrainHeightAt);

    // Dragons are spiritually bound to their home community and refuse to enter the lands of another community!
    if (mode === 'dragon' && typeof Physics.enforceSacredSanctuaryBoundary === 'function') {
      const refusal = Physics.enforceSacredSanctuaryBoundary(flightState, world3D.foreignCommunities, dt);
      if (refusal.refused && refusal.community) {
        flightState.borderRefusals = (flightState.borderRefusals || 0) + 1;
        refusal.community.pulse = 1.0;
        if (elapsed - lastRefusalToast > 2.8) {
          lastRefusalToast = elapsed;
          audio.playSanctuaryWard();
          showBanner(`${dragon.name} senses the soul of ${refusal.community.name} and refuses to enter another community's lands.`, 3.4);
        }
      }
    }

    // Sync 3D Flyer Transform
    flyer.root.position.set(flightState.x, flightState.y, flightState.z);
    flyer.root.rotation.order = 'YXZ';
    flyer.root.rotation.set(flightState.pitch, flightState.yaw, flightState.roll);

    // Animate Enchanted Dragon + Wizard OR Fighter Jet
    if (mode === 'dragon') {
      const speedNorm = Math.min(1, flightState.speed / 70);
      const diveTuck = Math.max(0, -flightState.pitch * 0.95) + (dash ? 0.35 : 0);
      const perched = !flightState.airborne;
      const flapAmp = perched ? 0.06 : flightState.hovering ? 0.72 : (0.50 + flightState.flapPulse * 0.36) * Math.max(0.28, 1 - diveTuck * 0.6);
      const wingWave = perched ? -0.35 + Math.sin(elapsed * 2.2) * 0.04 : Math.sin(flightState.wingPhase) * flapAmp;
      const elbowWave = perched ? -0.85 : Math.sin(flightState.wingPhase - 0.72) * flapAmp * 0.76;

      flyer.leftWing.shoulder.rotation.z = -wingWave;
      flyer.rightWing.shoulder.rotation.z = wingWave;
      flyer.leftWing.elbow.rotation.z = -elbowWave;
      flyer.rightWing.elbow.rotation.z = elbowWave;
      flyer.leftWing.shoulder.rotation.y = perched ? 0.45 : diveTuck * 0.42;
      flyer.rightWing.shoulder.rotation.y = perched ? -0.45 : -diveTuck * 0.42;
      flyer.leftWing.shoulder.rotation.x = Math.cos(flightState.wingPhase) * flapAmp * 0.16;
      flyer.rightWing.shoulder.rotation.x = Math.cos(flightState.wingPhase) * flapAmp * 0.16;

      // Sinuous neck leans dynamically into turns & lunges forward when roaring fire
      const turnLean = Math.max(-0.35, Math.min(0.35, -flightState.roll * 0.35));
      flyer.neckBase.rotation.y = turnLean * 0.65;
      flyer.neckUpper.rotation.y = turnLean * 0.75;
      flyer.headGroup.rotation.x = flightState.firing ? 0.14 : Math.sin(elapsed * 2.4) * 0.05;

      // Smoothly undulating 8-segment tail
      for (let i = 0; i < flyer.tailSegments.length; i++) {
        const lag = elapsed * (4.4 + speedNorm * 2.5) - i * 0.52;
        flyer.tailSegments[i].rotation.y = Math.sin(lag) * (0.12 + i * 0.012) - turnLean * 0.25;
        flyer.tailSegments[i].rotation.x = Math.cos(lag * 0.75) * 0.055;
      }

      // Legs extend downward when perched or hovering, tuck sleekly back in fast flight!
      const legTuck = perched ? 0.0 : flightState.hovering ? 0.22 : (0.75 + speedNorm * 0.52);
      for (const lg of flyer.legs) {
        lg.group.rotation.x += (legTuck - lg.group.rotation.x) * Math.min(1, dt * 7);
      }

      // Articulated fire-breathing jaw, glowing inner magma throat & dual-layer 32m volumetric flame stream!
      fireIntensitySmooth += ((flightState.firing ? 1.0 : 0.0) - fireIntensitySmooth) * Math.min(1, dt * 12);
      flyer.jawPivot.rotation.x = 0.05 + fireIntensitySmooth * 0.56 + Math.sin(elapsed * 18) * fireIntensitySmooth * 0.05;
      flyer.magmaMat.opacity = fireIntensitySmooth * 0.92;
      const fireVis = fireIntensitySmooth > 0.04;
      flyer.fireCone.visible = fireVis;
      flyer.fireConeOuter.visible = fireVis;
      flyer.fireConeInner.visible = fireVis;
      flyer.fireConeUniforms.uTime.value = elapsed;
      flyer.fireConeUniforms.uIntensity.value = fireIntensitySmooth;

      // Continuous Velvet Cloth Cape rippling organically in rushing sky wind!
      const cPos = flyer.capeMesh.geometry.attributes.position;
      const cBase = flyer.capeBasePos;
      const billow = perched ? 0.25 : (0.72 + speedNorm * 0.45);
      for (let i = 0; i < cPos.count; i++) {
        const bx = cBase[i * 3];
        const by = cBase[i * 3 + 1]; // +1.075 at shoulders down to -1.075 at hem
        const t = Math.max(0, Math.min(1, (1.075 - by) / 2.15)); // 0 at collar -> 1 at flowing hem
        const taper = 0.58 + t * 0.62;
        const flutter = Math.sin(elapsed * (9.0 + speedNorm * 9.5) - t * 5.2 + bx * 2.2) * (0.14 * t + 0.08 * t * t);
        const sway = Math.cos(elapsed * 5.5 - t * 3.4) * 0.12 * t - turnLean * 0.55 * t;
        const nx = bx * taper + sway;
        const ny = -t * (1.75 - billow * 0.95) + flutter * 0.65;
        const nz = t * (0.55 + billow * 1.45) + flutter * 0.35;
        cPos.setXYZ(i, nx, ny, nz);
      }
      cPos.needsUpdate = true;
      flyer.capeMesh.geometry.computeVertexNormals();

      // Wizard Staff crystal & counter-rotating arcane spell rings flare when casting fire, dash, or Sky Thunder!
      const thunderRaise = thunderState.active ? Math.max(0, 1 - thunderState.t / 0.45) : 0;
      const spinRate = 1.6 + fireIntensitySmooth * 7.5 + thunderRaise * 14.0 + (dash ? 4.5 : 0);
      flyer.staffCrystal.rotation.y += dt * spinRate;
      flyer.staffRingA.rotation.z += dt * spinRate * 1.1;
      flyer.staffRingA.rotation.x += dt * spinRate * 0.6;
      flyer.staffRingB.rotation.y -= dt * spinRate * 1.4;
      flyer.staffArm.rotation.x = -fireIntensitySmooth * 0.42 - thunderRaise * 1.15;

      // Orbiting celestial aura motes
      for (let i = 0; i < flyer.motes.length; i++) {
        const a = elapsed * 2.2 + (i / flyer.motes.length) * Math.PI * 2;
        flyer.motes[i].position.set(Math.cos(a) * 2.2, 0.55 + Math.sin(a * 1.5) * 0.72, Math.sin(a) * 2.4);
      }

      // Wingtip arcane ribbon sparkles during fast soaring or Sky-Dash
      if (flightState.airborne && (flightState.speed > 26 || dash)) {
        trailSpawnAcc += dt;
        if (trailSpawnAcc >= (isSoftwareGl ? 0.06 : 0.032)) {
          trailSpawnAcc = 0;
          flyer.root.updateMatrixWorld(true);
          for (const tip of [flyer.leftWing.tipAnchor, flyer.rightWing.tipAnchor]) {
            tip.getWorldPosition(_v1);
            const tObj = wingTrailMeshes[trailCursor];
            trailCursor = (trailCursor + 1) % wingTrailMeshes.length;
            tObj.sp.position.copy(_v1);
            tObj.sp.scale.setScalar(dash ? 1.55 : 0.92);
            tObj.sp.material.opacity = dash ? 0.75 : 0.42;
            tObj.sp.visible = true;
            tObj.life = 0;
          }
        }
      }
      for (let i = 0; i < wingTrailMeshes.length; i++) {
        const tm = wingTrailMeshes[i];
        if (!tm.sp.visible) continue;
        tm.life += dt;
        if (tm.life >= tm.maxLife) { tm.sp.visible = false; continue; }
        const k = 1 - tm.life / tm.maxLife;
        tm.sp.material.opacity = k * 0.52;
        tm.sp.scale.setScalar(0.35 + k * 0.95);
      }
    } else {
      const burn = flightState.afterburner ? 1.45 + Math.sin(elapsed * 40) * 0.2 : Math.max(0.2, flightState.throttle * 0.8);
      flyer.burnerGroup.scale.set(0.85 + burn * 0.25, 0.85 + burn * 0.25, burn);
      flyer.burnerGroup.visible = flightState.throttle > 0.08 || flightState.airborne;
    }

    // Animate Living World (Shaders, Ocean, Sky Dome centered on camera, Boats, Birds, Crystals, Lighthouse, Clouds)
    skyDome.uniforms.uTime.value = elapsed;
    world3D.oceanObj.uniforms.uTime.value = elapsed;
    for (const r of world3D.thermalMeshes) r.rotation.z += dt * 1.1;
    for (const cr of world3D.stableCrystals) {
      cr.rotation.y += dt * 1.4;
      cr.position.y = 5.2 + Math.sin(elapsed * 2.6 + cr.position.x) * 0.45;
    }
    if (world3D.skyObelisk) {
      world3D.skyObelisk.rotation.y += dt * 0.75;
      world3D.skyObelisk.position.y = 17 + Math.sin(elapsed * 1.9) * 1.4;
    }
    if (world3D.lhRotor) world3D.lhRotor.rotation.y += dt * 0.95;

    for (const c of world3D.clouds) {
      c.grp.position.x += dt * c.speed;
      if (c.grp.position.x > 1300) c.grp.position.x = -1300;
    }
    for (const b of world3D.animatedBoats) {
      b.mesh.position.y = 0.05 + Math.sin(elapsed * 1.8 + b.phase) * 0.22;
      b.mesh.rotation.z = Math.sin(elapsed * 1.4 + b.phase) * 0.06;
    }
    for (const bd of world3D.animatedBirds) {
      const ang = elapsed * bd.speed + bd.phase;
      bd.group.position.set(bd.cx + Math.cos(ang) * bd.radius, bd.alt + Math.sin(ang * 2) * 2.5, bd.cz + Math.sin(ang) * bd.radius);
      bd.group.rotation.y = -ang;
      const bf = Math.sin(elapsed * 7.5 + bd.phase) * 0.48;
      bd.lw.rotation.z = bf;
      bd.rw.rotation.z = -bf;
    }

    // Animate Peaceful Neighbouring Community Spiritual Boundary Wards
    for (const comm of world3D.foreignCommunities) {
      if (comm.pulse > 0) comm.pulse = Math.max(0, comm.pulse - dt * 1.4);
      if (comm.wardMat) {
        const dist = Math.hypot(flightState.x - comm.x, flightState.z - comm.z);
        const proximity = Math.max(0, 1 - Math.max(0, dist - comm.radius) / 90);
        comm.wardMat.opacity = 0.16 + proximity * 0.34 + comm.pulse * 0.42;
      }
      if (comm.wardRing) {
        comm.wardRing.position.y = 4.5 + Math.sin(elapsed * 1.8) * 0.7 + comm.pulse * 4.0;
      }
    }

    // Animate Homeland Border Intruders (only present if defending homeland during active war)
    for (let i = 0; i < world3D.borderIntruders.length; i++) {
      const u = world3D.borderIntruders[i];
      if (u.dead) {
        if (u.deathTimer > 0) {
          u.deathTimer -= dt;
          u.mesh.position.y -= dt * 0.35;
          if (u.deathTimer <= 0) u.mesh.visible = false;
        }
        continue;
      }
      u.patrolAngle += u.patrolSpeed * dt;
      u.x = u.homeX + Math.cos(u.patrolAngle) * u.patrolRadius;
      u.z = u.homeZ + Math.sin(u.patrolAngle) * u.patrolRadius;
      const uy = Math.max(0, world3D.terrainHeightAt(u.x, u.z));
      u.y = uy + 1.8;
      u.mesh.position.set(u.x, uy, u.z);
      if (u.legL && u.legR) {
        const stride = Math.sin(elapsed * 10 + i) * 0.5;
        u.legL.rotation.x = stride;
        u.legR.rotation.x = -stride;
      }
    }

    // Animate 2-Phase Wizard Staff Protective Sky-to-Ground Thunder VFX
    if (thunderState.active) {
      thunderState.t += dt;
      const tt = thunderState.t;
      if (tt >= 0.16 && !thunderState.impactDone) {
        thunderState.impactDone = true;
        executeThunderImpact();
      }
      if (thunderState.impactDone) {
        const impFrac = Math.min(1, (tt - 0.16) / (thunderState.duration - 0.16));
        const flashFade = Math.max(0, 1 - impFrac);
        boltCoreMat.opacity = flashFade * (0.82 + Math.sin(elapsed * 80) * 0.18);
        boltGlowMat.opacity = flashFade * 0.68;
        skyFlashMat.opacity = flashFade * 0.55;
        groundShockwave.scale.setScalar(0.8 + impFrac * 8.5);
        shockwaveMat.opacity = flashFade * 0.82;
        thunderLight.intensity = flashFade * 9.0;
      } else {
        boltGlowMat.opacity = 0.85;
        skyFlashMat.opacity = 0.52;
      }
      if (tt >= thunderState.duration) {
        thunderState.active = false;
        thunderGroup.visible = false;
        thunderLight.intensity = 0;
        clearThunderBolts();
      }
    }

    // Defensive lock indicator (only highlights encroaching homeland intruders for dragon, or targets for jet)
    const activeTargets = mode === 'dragon' ? world3D.borderIntruders : world3D.targets;
    const coneHits = Physics.findTargetsInFireCone(flightState, activeTargets);
    const locked = coneHits[0] || null;
    elReticle.dataset.locked = locked ? 'true' : 'false';
    if (locked) {
      elTarget.hidden = false;
      elTarget.textContent = mode === 'dragon'
        ? `Homeland Intruder: ${locked.target.name} · ${Math.round(locked.distance)}m`
        : `Target: ${locked.target.name} · ${Math.round(locked.distance)}m (${Math.round(locked.target.hp)}% HP)`;
    } else {
      elTarget.hidden = true;
    }

    // Volumetric Dragonfire Plumes, Crackling Sparks & Heat Smoke!
    if (fireCooldown > 0) fireCooldown -= dt;
    if (flightState.firing) {
      flyer.root.updateMatrixWorld(true);
      flyer.mouthAnchor.getWorldPosition(_v1);
      const fwd = Physics.forwardVector(flightState.yaw, flightState.pitch);
      const fireSpeed = flightState.speed + (mode === 'jet' ? 130 : 88);

      // Stream additive fire plumes rapidly along the roaring 32m jet (small at jaws -> huge roaring tongues ahead!)
      const fireCount = isSoftwareGl ? 3 : 5;
      for (let i = 0; i < fireCount; i++) {
        const along = 2.0 + i * 4.2 + Math.random() * 2.5;
        const spread = mode === 'jet' ? 1.4 : 4.2 + along * 0.18;
        particles.spawn('fire',
          _v1.x + fwd.x * along,
          _v1.y + fwd.y * along,
          _v1.z + fwd.z * along,
          fwd.x * fireSpeed + (Math.random() - 0.5) * spread,
          fwd.y * fireSpeed + (Math.random() - 0.5) * spread + 1.2,
          fwd.z * fireSpeed + (Math.random() - 0.5) * spread,
          {
            baseScale: mode === 'jet' ? 1.0 : 1.15 + along * 0.12,
            grow: mode === 'jet' ? 1.1 : 2.1,
            maxLife: mode === 'jet' ? 0.42 : 0.42 + Math.random() * 0.18,
            startColor: 0xfff8d4,
            endColor: mode === 'jet' ? 0xff5518 : 0xd41c08,
            opacity: 0.78
          }
        );
      }
      // Crisp hot incandescent sparks & embers streaking far forward
      for (let i = 0; i < (isSoftwareGl ? 3 : 5); i++) {
        const along = 1.5 + Math.random() * 14;
        particles.spawn('spark',
          _v1.x + fwd.x * along, _v1.y + fwd.y * along, _v1.z + fwd.z * along,
          fwd.x * (fireSpeed * 1.15) + (Math.random() - 0.5) * 16,
          fwd.y * (fireSpeed * 1.15) + (Math.random() - 0.5) * 16,
          fwd.z * (fireSpeed * 1.15) + (Math.random() - 0.5) * 16,
          { baseScale: 0.65, grow: 0.15, maxLife: 0.75, startColor: 0xffffff, endColor: 0xff7a1a }
        );
      }
      // Soft wispy heat smoke ONLY far downstream at the burning tip (never inside the bright mouth!)
      if (Math.random() < 0.32) {
        particles.spawn('smoke',
          _v1.x + fwd.x * 26, _v1.y + fwd.y * 26, _v1.z + fwd.z * 26,
          fwd.x * (fireSpeed * 0.25) + (Math.random() - 0.5) * 6,
          fwd.y * (fireSpeed * 0.25) + 4.5,
          fwd.z * (fireSpeed * 0.25) + (Math.random() - 0.5) * 6,
          { baseScale: 3.4, grow: 2.8, maxLife: 1.1, opacity: 0.24, startColor: 0x5c3624, endColor: 0x2a1d18 }
        );
      }

      fireLight.position.copy(_v1).addScaledVector(_v2.set(fwd.x, fwd.y, fwd.z), 5.5);
      fireLight.intensity = 6.5 + Math.sin(elapsed * 32) * 1.4;
      if (fireCooldown <= 0) {
        fireCooldown = 0.44;
        triggerFireBlast(coneHits);
      }
    } else {
      fireLight.intensity = Math.max(0, fireLight.intensity - dt * 18);
    }

    particles.update(dt);
    audio.update(flightState.speed, mode === 'jet' ? 125 : 86, flightState.firing);

    // Smooth Exponential Camera Damping + Dynamic Speed FOV + Subtle Impact Shake
    const fwd = Physics.forwardVector(flightState.yaw, flightState.pitch);
    const targetFov = 58 + Math.min(22, (flightState.speed / (mode === 'jet' ? 115 : 72)) * 18) + (dash ? 5 : 0);
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-4.5 * dt));
    camera.updateProjectionMatrix();

    camShake = Math.max(0, camShake - dt * 2.2);
    const shakeAmt = camShake * camShake * 0.42;

    if (camMode === 0) {
      // Heroic Chase Cam framing Dragon, sweeping wings, Wizard & panoramic vista ahead
      const dist = mode === 'jet' ? 15.5 : 14.2;
      const up = mode === 'jet' ? 4.4 : 4.6;
      const groundAtCam = world3D.terrainHeightAt(flightState.x - fwd.x * dist, flightState.z - fwd.z * dist);
      _v2.set(
        flightState.x - fwd.x * dist,
        Math.max(groundAtCam + 2.8, flightState.y - fwd.y * dist + up),
        flightState.z - fwd.z * dist
      );
      camPos.lerp(_v2, 1 - Math.exp(-7.2 * dt));
      _v3.set(flightState.x + fwd.x * 20, flightState.y + fwd.y * 20 + 0.8, flightState.z + fwd.z * 20);
      camLook.lerp(_v3, 1 - Math.exp(-9.5 * dt));
      camera.position.copy(camPos);
      if (shakeAmt > 0.001) camera.position.x += (Math.random() - 0.5) * shakeAmt;
      camera.lookAt(camLook);
    } else if (camMode === 1) {
      // Sweeping Panoramic Cinematic Orbit
      const orbitA = flightState.yaw + Math.sin(elapsed * 0.38) * 0.72 + 0.68;
      _v2.set(
        flightState.x + Math.sin(orbitA) * 17.5,
        Math.max(4, flightState.y + 4.8),
        flightState.z + Math.cos(orbitA) * 17.5
      );
      camPos.lerp(_v2, 1 - Math.exp(-5.0 * dt));
      camera.position.copy(camPos);
      camera.lookAt(flightState.x, flightState.y + 0.7, flightState.z);
    } else if (camMode === 2) {
      // Wizard Rider Over-Shoulder / Jet Cockpit Cam
      camera.position.set(
        flightState.x + fwd.x * (mode === 'jet' ? 1.8 : -0.45),
        flightState.y + (mode === 'jet' ? 0.9 : 2.35),
        flightState.z + fwd.z * (mode === 'jet' ? 1.8 : -0.45)
      );
      camera.lookAt(flightState.x + fwd.x * 65, flightState.y + fwd.y * 65 + 0.4, flightState.z + fwd.z * 65);
    } else {
      // Close-Up Hero 3/4 Front-Side Showcase Cam (admire dragon scales, horns, wizard & fire!)
      const sideAng = flightState.yaw - 2.35;
      _v2.set(
        flightState.x + Math.sin(sideAng) * 11.5,
        Math.max(3, flightState.y + 3.2),
        flightState.z + Math.cos(sideAng) * 11.5
      );
      camPos.lerp(_v2, 1 - Math.exp(-6.0 * dt));
      camera.position.copy(camPos);
      camera.lookAt(flightState.x, flightState.y + 0.6, flightState.z);
    }

    // Keep Sky Dome & Endless Ocean centered smoothly around camera for infinite flight!
    skyDome.mesh.position.copy(camera.position);
    world3D.oceanObj.mesh.position.x = Math.floor(camera.position.x / 64) * 64;
    world3D.oceanObj.mesh.position.z = Math.floor(camera.position.z / 64) * 64;

    // Throttle DOM HUD updates to ~15Hz for zero layout thrash
    hudTimer += dt;
    if (hudTimer >= 0.065) {
      hudTimer = 0;
      elSpeed.textContent = `${Math.round(flightState.speed * 2.4)} kt`;
      elAlt.textContent = `${Math.max(0, Math.round(flightState.y))} m`;
      elAtt.textContent = `${Math.round(flightState.pitch * 180 / Math.PI)}°/${Math.round(flightState.roll * 180 / Math.PI)}°`;
      if (mode === 'jet') {
        elRes.textContent = flightState.afterburner ? 'A/B' : `${Math.round(flightState.throttle * 100)}%`;
        elRes.dataset.warn = flightState.stalling ? 'true' : 'false';
      } else {
        elRes.textContent = `${Math.round(flightState.fireEnergy)}%`;
        elRes.dataset.warn = flightState.stalling ? 'true' : 'false';
      }
      // Update Sky Compass & Destination Waypoint Indicator (safe fallback if compassBearing helper unavailable)
      const wp = world3D.landmarks[wpIndex] || world3D.landmarks[0];
      const nav = typeof Physics.compassBearing === 'function'
        ? Physics.compassBearing(flightState, wp)
        : (() => {
            const headingDeg = (((-flightState.yaw * 180 / Math.PI) % 360) + 360) % 360;
            if (!wp) return { headingDeg, relativeDeg: 0, distance: 0 };
            const dx = wp.x - flightState.x, dz = wp.z - flightState.z;
            const tDeg = (((Math.atan2(dx, -dz) * 180 / Math.PI) % 360) + 360) % 360;
            let rel = tDeg - headingDeg;
            while (rel > 180) rel -= 360;
            while (rel < -180) rel += 360;
            return { headingDeg, relativeDeg: rel, distance: Math.hypot(dx, dz) };
          })();
      const degStr = String(Math.round(nav.headingDeg) % 360).padStart(3, '0');
      elHeading.textContent = `${cardinalLabel(nav.headingDeg)} ${degStr}°`;
      if (wp) {
        elWpArrow.textContent = bearingArrow(nav.relativeDeg);
        elWpName.textContent = wp.name;
        elWpDist.textContent = nav.distance >= 1000
          ? `${(nav.distance / 1000).toFixed(1)} km`
          : `${Math.round(nav.distance)} m`;
      }
      btnLand.textContent = flightState.airborne ? 'Land / Perch (G)' : 'Take Off (G)';
    }

    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) elBanner.hidden = true;
    }

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(() => { if (!destroyed) rafId = requestAnimationFrame(stepFrame); });
    } else {
      rafId = requestAnimationFrame(stepFrame);
    }
  }

  activeSession = {
    mode,
    flightState,
    world3D,
    isSoftwareGl,
    setSkyPreset: idx => applySkyPreset(idx),
    setCameraMode: idx => {
      camMode = ((idx % camModes.length) + camModes.length) % camModes.length;
      elCamLabel.textContent = camModes[camMode];
    },
    triggerFire: () => {
      const activeTargets = mode === 'dragon' ? world3D.borderIntruders : world3D.targets;
      const hits = Physics.findTargetsInFireCone(flightState, activeTargets);
      triggerFireBlast(hits);
    },
    triggerThunder: targetId => {
      const t = targetId ? world3D.borderIntruders.find(item => item.id === targetId) : null;
      return triggerThunderStrike(t);
    },
    getForeignCommunities: () => world3D.foreignCommunities.map(c => ({ id: c.id, name: c.name, x: c.x, y: c.y, z: c.z, radius: c.radius })),
    getTargets: () => world3D.targets.map(t => ({ id: t.id, name: t.name, kind: t.kind, isIntruder: Boolean(t.isIntruder), hp: t.hp, dead: Boolean(t.dead), x: t.x, y: t.y, z: t.z })),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      clearThunderBolts();
      audio.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      activeCanvas.removeEventListener('pointerdown', onCanvasDown);
      activeCanvas.removeEventListener('pointermove', onCanvasMove);
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) activeCanvas.removeEventListener(type, onCanvasUp);
      window.removeEventListener('blur', releaseInputs);
      btnCam.removeEventListener('click', onCamClick);
      btnSky.removeEventListener('click', onSkyClick);
      btnLaunch.removeEventListener('click', onLaunchClick);
      btnExit.removeEventListener('click', onExitClick);
      btnDockToggle.removeEventListener('click', toggleDock);
      btnLand.removeEventListener('click', toggleLandPerch);
      btnWaypoint.removeEventListener('click', cycleWaypoint);
      btnThunder.removeEventListener('click', onThunderClick);
      btnRoll.removeEventListener('click', onRollClick);
      unbindFlap();
      unbindDash();
      unbindHover();
      unbindFire();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      textures.dispose();
      environment?.dispose();
      renderer.dispose?.();
      overlay.removeEventListener('cancel', onCancel);
      if (overlay.open) {
        try { overlay.close(); } catch { overlay.removeAttribute('open'); }
      }
      overlay.hidden = true;
      document.body.removeAttribute('data-flight-3d');
      document.dispatchEvent(new Event('earthsheetchange'));
      options.onExit?.({
        mode,
        distanceFlown: flightState.distanceFlown,
        maxAltitudeReached: flightState.maxAltitudeReached,
        fireBlasts: flightState.fireBlasts,
        targetsHit: flightState.targetsHit,
        thunderStrikes: flightState.thunderStrikes || 0,
        borderRefusals: flightState.borderRefusals || 0
      });
    }
  };

  overlay.hidden = false;
  if (!overlay.open) {
    try { overlay.showModal(); } catch { overlay.setAttribute('open', ''); }
  }
  document.body.setAttribute('data-flight-3d', 'open');
  document.dispatchEvent(new Event('earthsheetchange'));
  activeCanvas.focus({ preventScroll: true });
  rafId = requestAnimationFrame(stepFrame);
  return true;
}

function close() {
  if (!activeSession) return;
  const s = activeSession;
  activeSession = null;
  s.destroy();
}

function isOpen() {
  return Boolean(activeSession);
}

function getTelemetry() {
  if (!activeSession) return null;
  const s = activeSession.flightState;
  return {
    mode: activeSession.mode,
    x: s.x, y: s.y, z: s.z,
    speed: s.speed,
    pitch: s.pitch,
    roll: s.roll,
    yaw: s.yaw,
    airborne: s.airborne,
    fireBlasts: s.fireBlasts,
    targetsHit: s.targetsHit,
    thunderStrikes: s.thunderStrikes || 0,
    borderRefusals: s.borderRefusals || 0,
    distanceFlown: s.distanceFlown,
    isSoftwareGl: activeSession.isSoftwareGl
  };
}

function setSkyPreset(idx) {
  activeSession?.setSkyPreset?.(idx);
}

function setCameraMode(idx) {
  activeSession?.setCameraMode?.(idx);
}

function triggerThunder(targetId) {
  return activeSession?.triggerThunder?.(targetId) || false;
}

function getForeignCommunities() {
  return activeSession?.getForeignCommunities?.() || [];
}

function getTargets() {
  return activeSession?.getTargets?.() || [];
}

window.EarthFlight3D = Object.freeze({
  launch,
  close,
  isOpen,
  getTelemetry,
  setSkyPreset,
  setCameraMode,
  triggerThunder,
  getForeignCommunities,
  getTargets
});
