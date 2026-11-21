/* Interactive Three.js 3D Aerodynamic Flight Engine for Enchanted Dragons
   (ridden by Wizards) and Military Fighter Jets (with long-runway takeoff). */
import { createCanvasFlightRenderer } from './flight-canvas.mjs';
import * as THREE from './vendor/three-flight-r187.mjs';

const Physics = window.EarthFlightPhysics;

function detectSoftwareGl(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return /SwiftShader|llvmpipe|Software|Mesa|Microsoft Basic/i.test(String(rendererStr || ''));
  } catch {
    return false;
  }
}

function makeToonNoiseTexture(baseHex, accentHex, size = 128) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = baseHex;
  g.fillRect(0, 0, size, size);
  g.fillStyle = accentHex;
  for (let i = 0; i < 160; i++) {
    const x = (i * 47) % size;
    const y = (i * 83) % size;
    const r = 2 + (i % 5);
    g.globalAlpha = 0.08 + (i % 4) * 0.03;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a high-craft composite 3D Enchanted Dragon with articulated wings,
 * undulating tail, glowing dorsal crystals, opening jaw, and Wizard rider.
 */
function buildEnchantedDragon(palette = {}, rider = {}) {
  const root = new THREE.Group();
  const scaleCol = new THREE.Color(palette.scale || '#4b9be0');
  const accentCol = new THREE.Color(palette.accent || '#a8f0ff');
  const wingCol = new THREE.Color(palette.wing || '#295d9c');
  const auraCol = new THREE.Color(palette.aura || '#7be6ff');

  const scaleMat = new THREE.MeshStandardMaterial({
    color: scaleCol,
    roughness: 0.34,
    metalness: 0.38,
    emissive: scaleCol.clone().multiplyScalar(0.16)
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: accentCol.clone().lerp(new THREE.Color('#f7e8bd'), 0.55),
    roughness: 0.45,
    metalness: 0.2
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: auraCol,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.3
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: wingCol,
    emissive: auraCol.clone().multiplyScalar(0.28),
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xf4dca0,
    roughness: 0.3,
    metalness: 0.45
  });

  // Sculpted torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.68, 2.3, 6, 12), scaleMat);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(1.0, 1.0, 0.88);
  root.add(torso);

  // Armored chest & belly plates
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.74, 12, 10), bellyMat);
  chest.position.set(0, -0.18, -0.55);
  chest.scale.set(0.88, 0.72, 1.35);
  root.add(chest);

  // Glowing dorsal crystal spines along back
  for (let i = 0; i < 6; i++) {
    const spine = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 - i * 0.018, 0), crystalMat);
    spine.position.set(0, 0.58 - i * 0.03, -0.9 + i * 0.46);
    spine.scale.set(0.55, 1.5, 0.9);
    root.add(spine);
  }

  // Sinuous neck + horned head + articulated jaw
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 0.22, -1.35);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 1.45, 10), scaleMat);
  neck.rotation.x = Math.PI / 2 - 0.36;
  neck.position.set(0, 0.25, -0.55);
  neckGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.55, -1.25);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 1.15), scaleMat);
  skull.position.set(0, 0.06, -0.35);
  headGroup.add(skull);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.92, 6), scaleMat);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, 0.06, -1.12);
  headGroup.add(snout);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.92), bellyMat);
  jaw.position.set(0, -0.18, -0.52);
  headGroup.add(jaw);

  // Swept horns
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.95, 6), hornMat);
    horn.position.set(side * 0.24, 0.36, 0.12);
    horn.rotation.set(0.85, 0, side * -0.26);
    headGroup.add(horn);

    // Glowing enchanted eye
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff5a8 })
    );
    eye.position.set(side * 0.30, 0.12, -0.64);
    headGroup.add(eye);
  }
  neckGroup.add(headGroup);
  root.add(neckGroup);

  // Articulated 5-segment undulating tail with crystal fin tip
  const tailSegments = [];
  let tailParent = root;
  for (let i = 0; i < 5; i++) {
    const segGroup = new THREE.Group();
    segGroup.position.set(0, i === 0 ? 0.02 : 0, i === 0 ? 1.4 : 0.88);
    const r = Math.max(0.11, 0.42 - i * 0.072);
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, 0.96, 8), scaleMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = 0.44;
    segGroup.add(mesh);
    if (i === 4) {
      const fin = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), crystalMat);
      fin.scale.set(1.5, 0.18, 1.4);
      fin.position.z = 0.92;
      segGroup.add(fin);
    }
    tailParent.add(segGroup);
    tailSegments.push(segGroup);
    tailParent = segGroup;
  }

  // Swept articulated wings (shoulder + elbow + thick arched iridescent sails & arcane ribs)
  const ribMat = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: auraCol,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.4
  });
  function makeWing(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.56, 0.34, -0.35);

    const sparInner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 2.65, 8), hornMat);
    sparInner.rotation.z = side * -Math.PI / 2;
    sparInner.position.set(side * 1.32, 0.08, -0.12);
    shoulder.add(sparInner);

    // Sculpted inner wing sail (thick ExtrudeGeometry with slight dihedral camber so it catches light from behind!)
    const innerShape = new THREE.Shape();
    innerShape.moveTo(0, 0);
    innerShape.lineTo(2.6, 0.28);
    innerShape.lineTo(2.35, -2.35);
    innerShape.quadraticCurveTo(1.25, -1.75, 0.1, -1.75);
    innerShape.closePath();
    const innerGeo = new THREE.ExtrudeGeometry(innerShape, { depth: 0.08, bevelEnabled: false });
    innerGeo.rotateX(-Math.PI / 2);
    if (side < 0) innerGeo.scale(-1, 1, 1);
    const innerMesh = new THREE.Mesh(innerGeo, wingMat);
    innerMesh.rotation.z = side * 0.10;
    shoulder.add(innerMesh);

    // Glowing enchanted wing veins across inner sail
    for (const [rx, rz, len, rotY] of [[0.9, 0.85, 1.85, 0.18], [1.85, 0.98, 2.25, -0.08]]) {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, len, 6), ribMat);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = side * rotY;
      rib.position.set(side * rx, 0.06, rz);
      shoulder.add(rib);
    }

    const elbow = new THREE.Group();
    elbow.position.set(side * 2.55, 0.14, -0.24);

    const sparOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.095, 3.4, 8), hornMat);
    sparOuter.rotation.z = side * -Math.PI / 2;
    sparOuter.rotation.y = side * -0.18;
    sparOuter.position.set(side * 1.65, 0.04, 0.30);
    elbow.add(sparOuter);

    const outerShape = new THREE.Shape();
    outerShape.moveTo(0, 0);
    outerShape.lineTo(3.45, -0.58);
    outerShape.lineTo(2.45, -2.65);
    outerShape.quadraticCurveTo(1.65, -2.05, 1.1, -2.35);
    outerShape.quadraticCurveTo(0.45, -1.9, -0.25, -2.35);
    outerShape.closePath();
    const outerGeo = new THREE.ExtrudeGeometry(outerShape, { depth: 0.07, bevelEnabled: false });
    outerGeo.rotateX(-Math.PI / 2);
    if (side < 0) outerGeo.scale(-1, 1, 1);
    const outerMesh = new THREE.Mesh(outerGeo, wingMat);
    outerMesh.rotation.z = side * -0.06;
    elbow.add(outerMesh);

    // Radial enchanted wing fingers fanning across the outer sail
    for (const [ang, len] of [[0.38, 2.55], [0.78, 2.35], [1.18, 2.05]]) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.045, len, 6), ribMat);
      finger.rotation.x = Math.PI / 2;
      finger.rotation.z = side * (-Math.PI / 2 + ang);
      finger.position.set(side * Math.cos(ang) * len * 0.48, 0.05, Math.sin(ang) * len * 0.48 + 0.1);
      elbow.add(finger);
    }

    // Glowing arcane crystal crest on wingtip & elbow
    const elbowCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), crystalMat);
    elbowCrystal.position.set(0, 0.14, 0);
    elbow.add(elbowCrystal);

    const tipCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), crystalMat);
    tipCrystal.scale.set(0.8, 1.4, 1.2);
    tipCrystal.position.set(side * 3.35, 0.06, 0.62);
    elbow.add(tipCrystal);

    shoulder.add(elbow);
    return { shoulder, elbow };
  }
  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  root.add(leftWing.shoulder, rightWing.shoulder);

  // Tucked clawed legs
  for (const side of [-1, 1]) {
    for (const zOff of [-0.65, 0.72]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.75, 6), scaleMat);
      leg.position.set(side * 0.44, -0.42, zOff);
      leg.rotation.x = 0.65;
      root.add(leg);
    }
  }

  // Wizard Rider on Enchanted Saddle
  const wizardGroup = new THREE.Group();
  wizardGroup.position.set(0, 0.72, -0.22);
  const saddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.16, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x5c3926, roughness: 0.6, metalness: 0.2 })
  );
  wizardGroup.add(saddle);

  const robeMat = new THREE.MeshStandardMaterial({ color: rider.robeColor || 0x352e78, roughness: 0.5, metalness: 0.15 });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.92, 10), robeMat);
  robe.position.set(0, 0.48, 0);
  wizardGroup.add(robe);

  const wizHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xe2b898, roughness: 0.6 })
  );
  wizHead.position.set(0, 0.96, -0.04);
  wizardGroup.add(wizHead);

  // Pointed star-crested wizard hat
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 12), robeMat);
  hatBrim.position.set(0, 1.09, -0.02);
  const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.68, 10), robeMat);
  hatCone.position.set(0, 1.40, 0.06);
  hatCone.rotation.x = 0.22;
  const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.028, 6, 14), hornMat);
  hatBand.rotation.x = Math.PI / 2;
  hatBand.position.set(0, 1.13, -0.02);
  wizardGroup.add(hatBrim, hatCone, hatBand);

  // Billowing cloak behind wizard
  const cloak = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 1.15),
    new THREE.MeshStandardMaterial({ color: 0x4b3f9c, roughness: 0.55, side: THREE.DoubleSide })
  );
  cloak.position.set(0, 0.62, 0.45);
  cloak.rotation.x = 1.05;
  wizardGroup.add(cloak);

  // Glowing arcane staff held by Wizard
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.45, 6), hornMat);
  staff.position.set(0.32, 0.72, -0.35);
  staff.rotation.x = -0.35;
  const staffOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 1), crystalMat);
  staffOrb.position.set(0.32, 1.38, -0.60);
  wizardGroup.add(staff, staffOrb);
  root.add(wizardGroup);

  // Orbiting magical aura motes
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), crystalMat);
    root.add(mote);
    motes.push(mote);
  }

  // Mouth origin for dragonfire
  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.position.set(0, 0.72, -3.45);
  root.add(mouthAnchor);

  return {
    root,
    leftWing,
    rightWing,
    tailSegments,
    jaw,
    cloak,
    motes,
    mouthAnchor
  };
}

/**
 * Builds a sleek composite 3D Fighter Jet with delta wings, twin vertical tails,
 * tinted canopy, missile pylons, and dynamic afterburner flame cone.
 */
function buildFighterJet() {
  const root = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6b7f8c, roughness: 0.34, metalness: 0.65 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x384650, roughness: 0.42, metalness: 0.6 });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x8be2ff,
    emissive: 0x164a66,
    roughness: 0.12,
    metalness: 0.75,
    transparent: true,
    opacity: 0.85
  });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe6b85c, roughness: 0.4, metalness: 0.3 });

  // Fuselage
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.56, 4.8, 12), hullMat);
  body.rotation.x = Math.PI / 2;
  root.add(body);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.85, 12), darkMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.32;
  root.add(nose);

  // Bubble cockpit canopy
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), canopyMat);
  canopy.scale.set(0.85, 0.65, 2.3);
  canopy.position.set(0, 0.34, -1.25);
  root.add(canopy);

  // Swept delta wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -0.9);
  wingShape.lineTo(3.4, 1.35);
  wingShape.lineTo(3.4, 1.95);
  wingShape.lineTo(0, 1.45);
  wingShape.lineTo(-3.4, 1.95);
  wingShape.lineTo(-3.4, 1.35);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: false });
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, hullMat);
  wings.position.set(0, 0.04, 0.1);
  root.add(wings);

  // Wingtip accent stripes & underwing missiles
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.05, 1.25), darkMat);
    fin.position.set(side * 0.72, 0.55, 1.78);
    fin.rotation.z = side * -0.28;
    root.add(fin);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.95), stripeMat);
    stripe.position.set(side * 0.74, 0.78, 1.85);
    stripe.rotation.z = side * -0.28;
    root.add(stripe);

    const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), stripeMat);
    missile.rotation.x = Math.PI / 2;
    missile.position.set(side * 1.75, -0.14, 0.55);
    root.add(missile);
  }

  // Twin exhaust nozzles & dynamic afterburner flame
  const burnerGroup = new THREE.Group();
  burnerGroup.position.set(0, 0, 2.55);
  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 2.4, 10),
    new THREE.MeshBasicMaterial({ color: 0xff7b29, transparent: true, opacity: 0.85 })
  );
  flameOuter.rotation.x = Math.PI / 2;
  flameOuter.position.z = 1.15;
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.20, 1.6, 10),
    new THREE.MeshBasicMaterial({ color: 0x99f0ff, transparent: true, opacity: 0.95 })
  );
  flameInner.rotation.x = Math.PI / 2;
  flameInner.position.z = 0.75;
  burnerGroup.add(flameOuter, flameInner);
  root.add(burnerGroup);

  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.position.set(0, -0.12, -4.3);
  root.add(mouthAnchor);

  return { root, burnerGroup, mouthAnchor };
}

/**
 * Builds the 3D living world mirroring the active Common Earth town:
 * roads, buildings, Dragon Stable, expanded outer walls, Military Airbase +
 * very long runway, endless ocean, coastal piers, hills, thermals & targets.
 */
function buildTownWorld(scene, site, evening, textured) {
  const worldGroup = new THREE.Group();
  const targets = [];
  const thermals = [];
  const scale = 3.2; // 1 Common Earth map unit = 3.2 3D meters for dramatic soaring scale
  const to3D = (mx, my) => ({ x: (mx - 12) * scale, z: (my - 12) * scale });

  const hasWater = Boolean(site?.water || site?.coastal || window.CommonEarthSim?.waterfront?.(site));
  const territoryLevel = site?.territoryLevel || 0;
  const bounds = Physics.perimeterBounds(territoryLevel, hasWater);

  // Endless 3D Ocean plane (deep below land or full south/surrounding expanse)
  const oceanTex = textured && makeToonNoiseTexture(evening ? '#163547' : '#266d7e', evening ? '#2a5670' : '#4fb5b8');
  if (oceanTex) oceanTex.repeat.set(80, 80);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(3600, 3600),
    new THREE.MeshStandardMaterial({
      map: oceanTex || null, color: textured ? '#ffffff' : evening ? '#163547' : '#266d7e',
      roughness: 0.25,
      metalness: 0.35
    })
  );
  ocean.renderOrder = -3;
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.35;
  worldGroup.add(ocean);

  // Landmass (for coastal towns, ocean starts cleanly south of y = 25.25 -> z = 13.25 * scale)
  const grassTex = textured && makeToonNoiseTexture(evening ? '#2f4536' : '#658559', evening ? '#3d5744' : '#85a66e');
  if (grassTex) grassTex.repeat.set(42, 42);
  const landMat = new THREE.MeshStandardMaterial({ map: grassTex || null, color: textured ? '#ffffff' : evening ? '#2f4536' : '#658559', roughness: 0.88, metalness: 0.04 });

  if (!site?.water) {
    const landDepth = hasWater ? 1400 : 2800;
    const landGeo = new THREE.PlaneGeometry(2800, landDepth);
    const land = new THREE.Mesh(landGeo, landMat);
    land.renderOrder = -2;
    land.rotation.x = -Math.PI / 2;
    const shoreZ = (25.3 - 12) * scale;
    land.position.set(0, 0, hasWater ? shoreZ - landDepth / 2 : 0);
    worldGroup.add(land);

    // Coastal seawall & timber piers
    if (hasWater) {
      const quayMat = new THREE.MeshStandardMaterial({ color: 0xb9ac92, roughness: 0.85 });
      const quay = new THREE.Mesh(new THREE.BoxGeometry(280, 1.4, 2.2), quayMat);
      quay.position.set(0, 0.15, shoreZ);
      worldGroup.add(quay);

      const pierMat = new THREE.MeshStandardMaterial({ color: 0x998462, roughness: 0.8 });
      for (const px of [2.9, 11.4, 22.4]) {
        const p3 = to3D(px, 26.8);
        const pier = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 9.5), pierMat);
        pier.position.set(p3.x, 0.25, p3.z);
        worldGroup.add(pier);
      }
    }
  } else {
    // Ocean island platform
    const island = new THREE.Mesh(new THREE.BoxGeometry(110, 1.5, 110), landMat);
    island.position.set(0, -0.35, 0);
    worldGroup.add(island);
  }

  // Rolling scenic hills in the inland distance
  const hillMat = new THREE.MeshStandardMaterial({ color: evening ? '#283c34' : '#56784e', roughness: 0.92 });
  const hillCoords = [
    [-190, -140, 62, 24], [-95, -185, 78, 34], [35, -210, 92, 42],
    [165, -175, 74, 30], [260, -90, 68, 28], [-230, -35, 58, 22]
  ];
  for (const [hx, hz, hr, hh] of hillCoords) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 8), hillMat);
    hill.position.set(hx, hh / 2 - 1, hz);
    worldGroup.add(hill);
  }

  // District road grid (0..24)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x565c5d, roughness: 0.9 });
  for (let r = 0; r <= 24; r += 6) {
    const pH = to3D(12, r);
    const hRoad = new THREE.Mesh(new THREE.BoxGeometry(26 * scale, 0.12, 1.75 * scale), roadMat);
    hRoad.position.set(pH.x, 0.06, pH.z);
    hRoad.renderOrder = -1;
    worldGroup.add(hRoad);

    const pV = to3D(r, 12);
    const vRoad = new THREE.Mesh(new THREE.BoxGeometry(1.75 * scale, 0.12, 26 * scale), roadMat);
    vRoad.position.set(pV.x, 0.06, pV.z);
    vRoad.renderOrder = -1;
    worldGroup.add(vRoad);
  }

  // Helper to add a 3D targetable building
  function addBuilding3D(id, name, mx, my, w, h, d, wallColor, roofColor, kind = 'building') {
    const pos = to3D(mx, my);
    const grp = new THREE.Group();
    grp.position.set(pos.x, 0, pos.z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72 })
    );
    body.position.y = h / 2;
    grp.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.74, h * 0.52, 4),
      new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.65 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + h * 0.26;
    grp.add(roof);

    // Scorch / fire visual overlay (hidden until hit by dragonfire / jet missiles)
    const blaze = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.45, h * 0.95, 7),
      new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, opacity: 0.85 })
    );
    blaze.position.y = h + 1.2;
    blaze.visible = false;
    grp.add(blaze);

    worldGroup.add(grp);
    targets.push({
      id,
      kind,
      name,
      mx,
      my,
      x: pos.x,
      y: h * 0.6,
      z: pos.z,
      radius: Math.max(w, d) * 0.65,
      hp: 100,
      mesh: grp,
      body,
      blaze
    });
    return grp;
  }

  // Core Town Buildings (Market, Reading Room, Homes, Lots, Free Buildings, Player Houses)
  addBuilding3D('market', 'Market Exchange', 15, 21, 9.5, 5.4, 8.8, 0xd8b88a, 0xb85e3e, 'building');
  addBuilding3D('cafe', 'The Reading Room', 3, 21, 8.2, 4.6, 6.8, 0xe0d6be, 0x3b7670, 'building');
  addBuilding3D('home-0', 'Founding Residence North', 9, 21, 7.2, 5.2, 6.8, 0xd9cab0, 0x9c5a44, 'building');
  addBuilding3D('home-1', 'Founding Residence East', 21, 15, 7.2, 5.2, 6.8, 0xd9cab0, 0x9c5a44, 'building');
  addBuilding3D('home-2', 'Founding Residence South', 21, 21, 7.2, 5.2, 6.8, 0xd9cab0, 0x9c5a44, 'building');

  const kindPalette = {
    garden: [0x6e9c5a, 0x4b783c],
    workshop: [0x9e8c7a, 0x5c646b],
    market: [0xd9b078, 0xb85838],
    hall: [0xd8c8a8, 0x5c6f82],
    pier: [0x9e8868, 0x4b6a75],
    wetland: [0x4c8a7a, 0x36695e],
    fishingDock: [0x8c7b60, 0x466d78],
    dragonStable: [0x7b75ad, 0x4c3f8a],
    house: [0xdcccb2, 0xa86147]
  };

  for (const b of site?.buildings || []) {
    const mx = (b.plot % 3) * 6 + 3;
    const my = Math.floor(b.plot / 3) * 6 + 3;
    const [wc, rc] = kindPalette[b.kind] || [0xc8bca2, 0x736658];
    addBuilding3D(b.id || ('lot-' + b.plot), b.name || b.kind, mx, my, 8.6, b.kind === 'dragonStable' ? 7.2 : 5.2, 8.2, wc, rc, 'building');
  }

  for (const fb of site?.freeBuildings || []) {
    const [wc, rc] = kindPalette[fb.kind] || [0xc8bca2, 0x736658];
    addBuilding3D(fb.id, fb.name || fb.kind, fb.x, fb.y, 8.4, fb.kind === 'dragonStable' ? 7.4 : 5.2, 8.0, wc, rc, 'building');
  }

  for (const h of site?.playerHouses || []) {
    addBuilding3D(h.id, h.name || 'Community House', h.x, h.y, 7.2, 5.4, 6.8, 0xe2d2b5, 0x9e5842, 'building');
  }

  // Add charming town park trees, perimeter trees, and moored ocean sailboats for vibrant 3D scale
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4e38, roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: evening ? 0x2a4e36 : 0x457d44, roughness: 0.85 });
  const treeCoords = [
    [3, 3], [9, 3], [15, 3], [21, 3], [3, 9], [15, 9], [21, 9], [3, 15], [9, 15], [15, 15],
    [-4.5, 4], [-4.5, 14], [4, -4.5], [18, -4.5], [26, 4], [26, 18]
  ];
  for (const [tx, ty] of treeCoords) {
    const tp = to3D(tx, ty);
    const tree = new THREE.Group();
    tree.position.set(tp.x, 0, tp.z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 2.6, 6), trunkMat);
    trunk.position.y = 1.3;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.4, 7), canopyMat);
    crown.position.y = 4.2;
    tree.add(trunk, crown);
    worldGroup.add(tree);
  }
  if (hasWater) {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x7c5032, roughness: 0.7 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xf4ead3, roughness: 0.6, side: THREE.DoubleSide });
    for (const [bx, by] of [[5, 34], [18, 42], [-6, 48], [28, 38]]) {
      const bp = to3D(bx, by);
      const boat = new THREE.Group();
      boat.position.set(bp.x, 0.15, bp.z);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 5.4), hullMat);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.8, 6), trunkMat);
      mast.position.y = 2.4;
      const sail = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.6, 3), sailMat);
      sail.position.set(0.3, 2.7, 0);
      boat.add(hull, mast, sail);
      worldGroup.add(boat);
    }
  }

  // Dedicated Dragon Stable glowing beacon spires if built (or scenic Dragon Sanctuary landmark)
  const dsLoc = window.EarthDragonStable?.stableLocation?.(site) || { x: -4.2, y: 12 };
  if (dsLoc) {
    const p3 = to3D(dsLoc.x, dsLoc.y);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x8be6ff, emissive: 0x4aa8ff, emissiveIntensity: 0.9, roughness: 0.2
    });
    for (const dx of [-4.4, 4.4]) {
      const spire = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), spireMat);
      spire.scale.set(0.6, 2.2, 0.6);
      spire.position.set(p3.x + dx, 8.8, p3.z + 3.8);
      worldGroup.add(spire);
    }
  }

  // Expanded Solid Perimeter Walls (well outside roads & vehicles!)
  const wallStage = site?.communityLife?.border?.defence?.stage || 2;
  const segments = Physics.perimeterWallSegments(wallStage, territoryLevel, hasWater);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc2b08d, roughness: 0.85 });
  for (const seg of segments) {
    const cx = seg.x + seg.w / 2;
    const cy = seg.y + seg.d / 2;
    const p3 = to3D(cx, cy);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(seg.w * scale, seg.h * scale * 0.85, seg.d * scale), wallMat);
    mesh.position.set(p3.x, (seg.z || 0) * scale + seg.h * scale * 0.425, p3.z);
    worldGroup.add(mesh);
  }

  // Military Airbase + VERY LONG Paved Runway (cleanly separated east of perimeter wall!)
  const mil = Physics.militaryBaseLayout(territoryLevel);
  const basePos = to3D(mil.place.x, mil.place.y);
  const padMesh = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.22, 22),
    new THREE.MeshStandardMaterial({ color: 0x6c7578, roughness: 0.85 })
  );
  padMesh.position.set(basePos.x, 0.11, basePos.z);
  worldGroup.add(padMesh);

  addBuilding3D('mil-hangar', 'Military Base Hangar', mil.place.x - 0.9, mil.place.y - 1.3, 9.2, 5.4, 8.2, 0x6f8286, 0x4c5f66, 'building');
  addBuilding3D('mil-tower', 'Airbase Control Tower', mil.place.x + 1.8, mil.place.y - 1.4, 4.8, 10.5, 4.8, 0x8ea2a6, 0x3b4d54, 'building');

  // Very Long Paved Runway with centerline dashes, piano keys, and approach beacons!
  const rwPos = to3D(mil.runway.x, mil.runway.y);
  const rwW = mil.runway.width * scale * 1.35;
  const rwL = mil.runway.length * scale * 1.55; // Extra long visual runway in 3D (~110m!)
  const coastalShoreZ = (25.3 - 12) * scale;
  if (hasWater && !site?.water) {
    rwPos.z = Math.min(rwPos.z, coastalShoreZ - rwL / 2 - 4.5);
  }
  const runwayMesh = new THREE.Mesh(
    new THREE.BoxGeometry(rwW, 0.18, rwL),
    new THREE.MeshStandardMaterial({ color: 0x2f3538, roughness: 0.88 })
  );
  runwayMesh.position.set(rwPos.x, 0.09, rwPos.z);
  worldGroup.add(runwayMesh);

  // Taxiway connecting hangar apron to runway
  const taxi = new THREE.Mesh(
    new THREE.BoxGeometry(Math.abs(rwPos.x - basePos.x), 0.16, 6.2),
    new THREE.MeshStandardMaterial({ color: 0x454c4f, roughness: 0.88 })
  );
  taxi.position.set((rwPos.x + basePos.x) / 2, 0.08, basePos.z);
  worldGroup.add(taxi);

  // Runway centerline dashes & edge beacons
  const stripeWhite = new THREE.MeshBasicMaterial({ color: 0xf4f2e8 });
  const beaconAmber = new THREE.MeshBasicMaterial({ color: 0xffc864 });
  const dashCount = 14;
  for (let i = 0; i < dashCount; i++) {
    const zOff = -rwL * 0.44 + (i / (dashCount - 1)) * rwL * 0.88;
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 3.8), stripeWhite);
    dash.position.set(rwPos.x, 0.20, rwPos.z + zOff);
    worldGroup.add(dash);
    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), beaconAmber);
        lamp.position.set(rwPos.x + side * (rwW / 2 + 0.65), 0.45, rwPos.z + zOff);
        worldGroup.add(lamp);
      }
    }
  }

  // Rival Outpost Watchtowers & Sea Target Vessels out beyond the town so players have fun aerial targets!
  const targetSites = [
    { id: 'enemy-north', name: 'Rival Outpost Bastion', mx: 12, my: -26, wc: 0x8f584c, rc: 0x522e28, kind: 'enemy' },
    { id: 'enemy-west', name: 'Raider Camp Tower', mx: -28, my: 8, wc: 0x8a644b, rc: 0x4d3527, kind: 'enemy' },
    { id: 'enemy-east', name: 'Eastern Ridge Fort', mx: 64, my: -14, wc: 0x7e5a54, rc: 0x472d2b, kind: 'enemy' }
  ];
  for (const ts of targetSites) {
    addBuilding3D(ts.id, ts.name, ts.mx, ts.my, 8.8, 9.2, 8.8, ts.wc, ts.rc, ts.kind);
  }

  // Golden Thermal Updraft Rings (fly through for soaring lift!)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe48f, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  const thermalPositions = [
    { x: -18, z: 32, y: 18, radius: 14, strength: 15 },
    { x: 42, z: -28, y: 24, radius: 15, strength: 16 },
    { x: -55, z: -48, y: 28, radius: 16, strength: 16 },
    { x: 24, z: 95, y: 20, radius: 16, strength: 15 }
  ];
  const thermalMeshes = [];
  for (const th of thermalPositions) {
    thermals.push(th);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.28, 6, 20), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(th.x, th.y, th.z);
    worldGroup.add(ring);
    thermalMeshes.push(ring);
  }

  // Floating 3D Cumulus Clouds across the wide sky
  const cloudMat = new THREE.MeshStandardMaterial({
    color: evening ? 0x6f738a : 0xfaf7ef,
    roughness: 0.95,
    metalness: 0
  });
  const clouds = [];
  for (let i = 0; i < 18; i++) {
    const cGrp = new THREE.Group();
    const ang = (i / 18) * Math.PI * 2;
    const dist = 85 + (i % 5) * 65;
    cGrp.position.set(Math.cos(ang) * dist, 52 + (i % 4) * 14, Math.sin(ang) * dist);
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(7 + (j === 1 ? 3 : 0), 8, 6), cloudMat);
      puff.scale.set(1.5, 0.65, 1.15);
      puff.position.set((j - 1) * 7.5, j === 1 ? 2.2 : 0, (j % 2) * 2.5);
      cGrp.add(puff);
    }
    worldGroup.add(cGrp);
    clouds.push(cGrp);
  }

  scene.add(worldGroup);
  return {
    worldGroup,
    targets,
    thermals,
    thermalMeshes,
    clouds,
    ocean,
    scale,
    to3D,
    runwayStart3D: { x: rwPos.x, y: 0.95, z: rwPos.z + rwL * 0.44 },
    stablePerch3D: dsLoc ? { x: to3D(dsLoc.x, dsLoc.y).x, y: 12, z: to3D(dsLoc.x, dsLoc.y).z } : { x: 0, y: 24, z: 0 }
  };
}

/**
 * Pooled zero-GC fire-breath / missile / explosion particle system.
 */
function createParticlePool(scene, count = 72) {
  const geo = new THREE.SphereGeometry(0.75, 6, 6);
  const pool = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8c2b, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({
      mesh,
      active: false,
      life: 0,
      maxLife: 0.8,
      vx: 0, vy: 0, vz: 0,
      baseScale: 1,
      grow: 1.5
    });
  }
  let cursor = 0;
  function spawn(x, y, z, vx, vy, vz, colorHex, baseScale = 0.7, maxLife = 0.65, grow = 2.4) {
    const p = pool[cursor];
    cursor = (cursor + 1) % pool.length;
    p.active = true;
    p.life = 0;
    p.maxLife = maxLife;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.baseScale = baseScale;
    p.grow = grow;
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(baseScale);
    p.mesh.material.color.setHex(colorHex);
    p.mesh.material.opacity = 0.95;
    p.mesh.visible = true;
  }
  function update(dt) {
    for (const p of pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(p.baseScale * (1 + t * p.grow));
      p.mesh.material.opacity = (1 - t) * 0.92;
    }
  }
  return { spawn, update };
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
        <h2 class="flight-telemetry-title" id="f3d-title">Aurelia &amp; Wizard</h2>
        <div class="flight-gauges">
          <div class="flight-gauge"><span>Airspeed</span><strong id="f3d-speed">0 kt</strong></div>
          <div class="flight-gauge"><span>Altitude</span><strong id="f3d-alt">0 m</strong></div>
          <div class="flight-gauge"><span>Pitch / Bank</span><strong id="f3d-att">0° / 0°</strong></div>
          <div class="flight-gauge"><span id="f3d-res-label">Fire Energy</span><strong id="f3d-res">100%</strong></div>
        </div>
      </div>
      <div class="flight-top-actions">
        <button type="button" class="flight-btn" id="f3d-camera-btn">Camera (V)</button>
        <button type="button" class="flight-btn" id="f3d-launch-btn">Runway / Sky</button>
        <button type="button" class="flight-btn primary" id="f3d-exit-btn">Return to Street</button>
      </div>
    </div>
    <div class="flight-reticle" id="f3d-reticle" data-locked="false">
      <div class="flight-reticle-ring"></div>
      <div class="flight-reticle-dot"></div>
    </div>
    <div class="flight-target-banner" id="f3d-target" hidden></div>
    <div class="flight-banner" id="f3d-banner" hidden></div>
    <div class="flight-hud-bottom">
      <div class="flight-keys-hint" id="f3d-keys-hint">
        Drag the sky to steer · W/S Pitch · A/D Bank &amp; Turn · Q/E Yaw · Space/Shift Flap/Boost · X Hover/Brake · F Blast Fire · R Barrel Roll · V Camera · Esc Exit
      </div>
      <div class="flight-action-pad">
        <button type="button" class="flight-btn" id="f3d-btn-flap">Wing Flap (Space)</button>
        <button type="button" class="flight-btn" id="f3d-btn-hover">Hover (X)</button>
        <button type="button" class="flight-btn" id="f3d-btn-roll">Barrel Roll (R)</button>
        <button type="button" class="flight-btn fire-btn" id="f3d-btn-fire">Blast Fire (F)</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

function launch(options = {}) {
  if (activeSession) close();
  if (!Physics) return false;

  const overlay = createOverlayDom();
  const canvas = document.getElementById('flight-3d-canvas');

  const mode = options.mode === 'jet' ? 'jet' : 'dragon';
  const site = options.site || { name: options.siteName || 'Town', water: false, coastal: options.hasWaterfront !== false, territoryLevel: options.territoryLevel || 0 };
  const lineageDef = (options.lineage && window.EarthDragonStable?.LINEAGES?.find(l => l.id === options.lineage)) || null;
  const dragon = options.dragon || {
    name: options.craftName || 'Aurelia',
    lineageTitle: lineageDef?.title || 'Starlight Sapphire',
    scale: lineageDef?.scale || '#4b9be0',
    accent: lineageDef?.accent || '#a8f0ff',
    wing: lineageDef?.wing || '#295d9c',
    aura: lineageDef?.aura || '#7be6ff',
    fire: lineageDef?.fire || '#ff8a2b'
  };
  const wizard = options.wizard || { name: options.pilotName || 'Skyweaver' };
  const evening = Boolean(options.evening);

  // Renderer & Software WebGL adaptation
  const attributes = {antialias:true, alpha:false, powerPreference:'high-performance'};
  const gl = canvas.getContext('webgl2', attributes);
  const renderer = gl ? new THREE.WebGLRenderer({canvas, context:gl, ...attributes}) : createCanvasFlightRenderer(canvas);
  const isSoftwareGl = !gl || detectSoftwareGl(gl);
  if (gl) {
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = evening ? 0.92 : 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  const skyColor = evening ? 0x19253d : 0x7cb7d4;
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.FogExp2(evening ? 0x1a2a42 : 0x8ec4db, 0.00145);

  let environment;
  if (gl) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new THREE.RoomEnvironment();
    environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
  }

  const hemi = new THREE.HemisphereLight(evening ? 0x627ab0 : 0xdaf0ff, evening ? 0x202d28 : 0x5c7450, evening ? 0.8 : 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(evening ? 0xffb782 : 0xfff4d6, evening ? 1.45 : 2.1);
  sun.position.set(140, 180, 95);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / Math.max(1, window.innerHeight), 0.5, 2200);
  const world3D = buildTownWorld(scene, site, evening, Boolean(gl));
  const particles = createParticlePool(scene, isSoftwareGl ? 44 : 84);

  // Build Flyer (Enchanted Dragon + Wizard OR Fighter Jet)
  const flyer = mode === 'jet' ? buildFighterJet() : buildEnchantedDragon(dragon, wizard);
  scene.add(flyer.root);

  // Dynamic point light for dragonfire / afterburner glow
  const fireLight = new THREE.PointLight(0xff842b, 0, 48, 1.5);
  scene.add(fireLight);

  const origin = options.origin;
  const dragonStart = Number.isFinite(origin?.x) && Number.isFinite(origin?.y)
    ? world3D.to3D(origin.x, origin.y) : world3D.stablePerch3D;
  const startFromGround = mode === 'jet' && options.runwayTakeoff !== false;
  const flightState = Physics.createFlightState({
    kind: mode,
    airborne: !startFromGround,
    x: startFromGround ? world3D.runwayStart3D.x : dragonStart.x,
    y: startFromGround ? 0.95 : 28,
    z: startFromGround ? world3D.runwayStart3D.z : dragonStart.z,
    yaw: 0, // Facing North along runway or over town
    pitch: startFromGround ? 0 : -0.04,
    speed: startFromGround ? 0 : (mode === 'jet' ? 54 : 28)
  });
  if (startFromGround) flightState.throttle = 0.9;

  // HUD elements
  const elKicker = document.getElementById('f3d-kicker');
  const elTitle = document.getElementById('f3d-title');
  const elCamLabel = document.getElementById('f3d-cam-label');
  const elSpeed = document.getElementById('f3d-speed');
  const elAlt = document.getElementById('f3d-alt');
  const elAtt = document.getElementById('f3d-att');
  const elResLabel = document.getElementById('f3d-res-label');
  const elRes = document.getElementById('f3d-res');
  const elReticle = document.getElementById('f3d-reticle');
  const elTarget = document.getElementById('f3d-target');
  const elBanner = document.getElementById('f3d-banner');
  const btnFlap = document.getElementById('f3d-btn-flap');
  const btnHover = document.getElementById('f3d-btn-hover');
  const btnRoll = document.getElementById('f3d-btn-roll');
  const btnFire = document.getElementById('f3d-btn-fire');
  const btnCam = document.getElementById('f3d-camera-btn');
  const btnLaunch = document.getElementById('f3d-launch-btn');
  const btnExit = document.getElementById('f3d-exit-btn');

  elKicker.textContent = mode === 'jet' ? 'Military Airbase · Fighter Jet' : 'Enchanted Dragon · Wizard Flight';
  elTitle.textContent = mode === 'jet' ? (options.craftName || 'Interceptor Squadron') : `${dragon.name} · ${wizard.name}`;
  elResLabel.textContent = mode === 'jet' ? 'Throttle' : 'Fire Breath';
  btnFlap.textContent = mode === 'jet' ? 'Afterburner (Shift)' : 'Wing Flap (Space)';
  btnHover.textContent = mode === 'jet' ? 'Airbrake (X)' : 'Hover (X)';
  btnFire.textContent = mode === 'jet' ? 'Fire Missiles (F)' : 'Blast Fire (F)';
  btnLaunch.textContent = mode === 'jet' ? 'Reset on Runway' : 'Sky Soar Reset';

  let bannerTimer = 0;
  function showBanner(text, seconds = 3.2) {
    elBanner.textContent = text;
    elBanner.hidden = false;
    bannerTimer = seconds;
  }
  showBanner(
    mode === 'jet'
      ? 'Cleared for takeoff on the Military Base runway! Hold Shift/Space for afterburner and pull S/↑ to lift off.'
      : `${wizard.name} mounted ${dragon.name}. Drag left or right to turn, up to climb, or down to dive.`,
    4.5
  );

  const camModes = ['Chase Cam', 'Cinematic Soar', mode === 'jet' ? 'Cockpit Cam' : 'Wizard Rider Cam'];
  let camMode = 0;
  const keys = new Set();
  const touchState = { flap: false, hover: false, fire: false, rollPulse: false };
  let fireCooldown = 0;
  let lastFunToast = 0;
  let elapsed = 0;
  let destroyed = false;
  let rafId = 0;
  let timerId = 0;
  let lastNow = performance.now();

  const camPos = new THREE.Vector3(flightState.x, flightState.y + 8, flightState.z + 20);
  const camLook = new THREE.Vector3(flightState.x, flightState.y, flightState.z);
  const mouthWorld = new THREE.Vector3();

  function triggerFireBlast(lockedHit) {
    flightState.fireBlasts++;
    if (lockedHit) {
      const t = lockedHit.target;
      t.hp = Math.max(0, t.hp - (mode === 'jet' ? 50 : 45));
      flightState.targetsHit++;
      t.blaze.visible = true;
      t.body.material.color.lerp(new THREE.Color(0x2a1f1c), 0.35);
      // Explosive burst at impact
      for (let i = 0; i < 10; i++) {
        particles.spawn(
          t.x + (Math.random() - 0.5) * 4,
          t.y + 2 + Math.random() * 3,
          t.z + (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 14,
          6 + Math.random() * 12,
          (Math.random() - 0.5) * 14,
          i % 2 ? 0xff4b1f : 0xffcc52,
          1.4,
          0.9,
          2.2
        );
      }
      const status = t.hp <= 0 ? `${t.name} engulfed in flames!` : `${t.name} struck (${t.hp}% integrity)!`;
      showBanner(mode === 'jet' ? `Direct hit! ${status}` : `${dragon.name} blasted fire onto ${status}`, 3.0);
      const payload = {
        kind: t.kind === 'enemy' ? 'enemy' : 'building',
        id: t.id,
        name: t.name,
        x: t.mx,
        y: t.my,
        hp: t.hp
      };
      options.onFireHit?.(payload);
      options.onFireAttack?.(payload);
    } else if (elapsed - lastFunToast > 3.5) {
      lastFunToast = elapsed;
      showBanner(
        mode === 'jet'
          ? 'Autocannon & ordnance fired across the open sky!'
          : `${dragon.name} roared and blasted a blazing stream of enchanted fire mid-flight just for fun!`,
        2.6
      );
      options.onFireHit?.({ kind: 'fun' });
      options.onFireAttack?.({ kind: 'fun' });
    }
  }

  function onKeyDown(e) {
    if (destroyed) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'q', 'e', 'f', 'x', 'r', 'v', 'shift'].includes(k)) {
      e.preventDefault();
    }
    if (k === 'escape') { e.preventDefault(); close(); return; }
    if (k === 'v') { camMode = (camMode + 1) % camModes.length; elCamLabel.textContent = camModes[camMode]; return; }
    if (k === 'r') { touchState.rollPulse = true; return; }
    keys.add(k);
  }
  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }
  function onResize() {
    if (destroyed) return;
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  let steering = null, touchYaw = 0, touchPitch = 0, tapFire = false;
  const onCanvasDown = e => {
    if (steering || e.button !== 0) return;
    steering = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  const onCanvasMove = e => {
    if (steering?.id !== e.pointerId) return;
    const dx = e.clientX - steering.x, dy = steering.y - e.clientY;
    if (!steering.moved && Math.hypot(dx, dy) < 7) return;
    steering.moved = true;
    touchYaw = Math.max(-1, Math.min(1, dx / 65));
    touchPitch = Math.max(-1, Math.min(1, dy / 65));
  };
  const onCanvasUp = e => {
    if (steering?.id !== e.pointerId) return;
    if (e.type === 'pointerup' && !steering.moved) tapFire = true;
    steering = null;
    touchYaw = touchPitch = 0;
  };
  const releaseInputs = () => {
    keys.clear();
    steering = null;
    touchYaw = touchPitch = 0;
    tapFire = touchState.fire = touchState.flap = touchState.hover = touchState.rollPulse = false;
  };
  const onCamClick = () => { camMode = (camMode + 1) % camModes.length; elCamLabel.textContent = camModes[camMode]; };
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
        x: world3D.stablePerch3D.x, y: 32, z: world3D.stablePerch3D.z + 20, yaw: 0, speed: 28
      }));
      showBanner(`${dragon.name} soared above the Dragon Stable!`);
    }
  };
  const onExitClick = () => close();
  const onCancel = event => { event.preventDefault(); close(); };
  const bindHold = (btn, prop) => {
    const down = e => { e.preventDefault(); touchState[prop] = true; btn.dataset.active = 'true'; };
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
  const onRollClick = () => { touchState.rollPulse = true; };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  canvas.addEventListener('pointerdown', onCanvasDown);
  canvas.addEventListener('pointermove', onCanvasMove);
  for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type, onCanvasUp);
  window.addEventListener('blur', releaseInputs);
  btnCam.addEventListener('click', onCamClick);
  btnLaunch.addEventListener('click', onLaunchClick);
  btnExit.addEventListener('click', onExitClick);
  overlay.addEventListener('cancel', onCancel);
  btnRoll.addEventListener('click', onRollClick);
  const unbindFlap = bindHold(btnFlap, 'flap');
  const unbindHover = bindHold(btnHover, 'hover');
  const unbindFire = bindHold(btnFire, 'fire');


  function stepFrame(now) {
    if (destroyed) return;
    const dt = Math.min(0.05, Math.max(0.008, (now - lastNow) / 1000));
    lastNow = now;
    elapsed += dt;

    // Collect aerodynamic flight inputs
    const pitchUp = keys.has('s') || keys.has('arrowdown');
    const pitchDown = keys.has('w') || keys.has('arrowup');
    const rollLeft = keys.has('a') || keys.has('arrowleft');
    const rollRight = keys.has('d') || keys.has('arrowright');
    const yawLeft = keys.has('q');
    const yawRight = keys.has('e');
    const boost = keys.has('shift') || keys.has(' ') || touchState.flap;
    const hover = keys.has('x') || keys.has('c') || touchState.hover;
    const fire = keys.has('f') || touchState.fire || tapFire;
    tapFire = false;

    const autoRotate = mode === 'jet' && !flightState.airborne && flightState.speed >= 24 && (boost || pitchUp);
    const controls = {
      pitch: ((pitchUp || autoRotate) ? 1 : 0) - (pitchDown && !autoRotate ? 1 : 0) + touchPitch,
      roll: (rollLeft ? 1 : 0) - (rollRight ? 1 : 0),
      yaw: (yawRight ? 1 : 0) - (yawLeft ? 1 : 0) + touchYaw,
      flap: boost,
      boost,
      brake: mode === 'jet' ? hover : keys.has('c'),
      hover: mode === 'dragon' ? hover : false,
      fire,
      barrelRoll: touchState.rollPulse
    };
    touchState.rollPulse = false;

    Physics.stepFlight(flightState, controls, dt, world3D.thermals);

    // Sync 3D Flyer Transform (YXZ order so yaw -> pitch -> roll feels natural)
    flyer.root.position.set(flightState.x, flightState.y, flightState.z);
    flyer.root.rotation.order = 'YXZ';
    flyer.root.rotation.set(flightState.pitch, flightState.yaw, flightState.roll);

    // Animate Enchanted Dragon or Fighter Jet parts
    if (mode === 'dragon') {
      const diveTuck = Math.max(0, -flightState.pitch * 0.9);
      const flapAmp = flightState.hovering ? 0.68 : (0.48 + flightState.flapPulse * 0.34) * (1 - diveTuck * 0.65);
      const wingWave = Math.sin(flightState.wingPhase) * flapAmp;
      const elbowWave = Math.sin(flightState.wingPhase - 0.75) * flapAmp * 0.75;
      flyer.leftWing.shoulder.rotation.z = -wingWave;
      flyer.rightWing.shoulder.rotation.z = wingWave;
      flyer.leftWing.elbow.rotation.z = -elbowWave;
      flyer.rightWing.elbow.rotation.z = elbowWave;
      flyer.leftWing.shoulder.rotation.y = diveTuck * 0.45;
      flyer.rightWing.shoulder.rotation.y = -diveTuck * 0.45;

      // Undulating tail
      for (let i = 0; i < flyer.tailSegments.length; i++) {
        flyer.tailSegments[i].rotation.y = Math.sin(elapsed * 4.5 - i * 0.7) * 0.16;
        flyer.tailSegments[i].rotation.x = Math.cos(elapsed * 3.2 - i * 0.6) * 0.08;
      }
      // Jaw opens wide when breathing fire
      flyer.jaw.rotation.x = flightState.firing ? 0.48 : 0.04;
      // Billowing wizard cloak
      flyer.cloak.rotation.x = 0.85 + Math.min(0.65, flightState.speed / 60) + Math.sin(elapsed * 12) * 0.08;
      // Orbiting arcane motes
      for (let i = 0; i < flyer.motes.length; i++) {
        const a = elapsed * 2.4 + (i / flyer.motes.length) * Math.PI * 2;
        flyer.motes[i].position.set(Math.cos(a) * 1.9, 0.45 + Math.sin(a * 1.5) * 0.7, Math.sin(a) * 2.2);
      }
    } else {
      // Dynamic Jet Afterburner cone
      const burn = flightState.afterburner ? 1.35 + Math.sin(elapsed * 40) * 0.18 : Math.max(0.2, flightState.throttle * 0.75);
      flyer.burnerGroup.scale.set(0.85 + burn * 0.25, 0.85 + burn * 0.25, burn);
      flyer.burnerGroup.visible = flightState.throttle > 0.08 || flightState.airborne;
    }

    // Rotate thermal updraft rings & gently drift clouds
    for (const r of world3D.thermalMeshes) r.rotation.z += dt * 1.2;
    for (const c of world3D.clouds) c.position.x += dt * 0.7;

    // Target lock detection along forward aim cone
    const coneHits = Physics.findTargetsInFireCone(flightState, world3D.targets);
    const locked = coneHits[0] || null;
    elReticle.dataset.locked = locked ? 'true' : 'false';
    if (locked) {
      elTarget.hidden = false;
      elTarget.textContent = `Target: ${locked.target.name} · ${Math.round(locked.distance)}m (${locked.target.hp}% HP)`;
    } else {
      elTarget.hidden = true;
    }

    // Fire Breath / Jet Weapons particle stream & impact logic
    if (fireCooldown > 0) fireCooldown -= dt;
    if (flightState.firing) {
      flyer.root.updateMatrixWorld(true);
      flyer.mouthAnchor.getWorldPosition(mouthWorld);
      const fwd = Physics.forwardVector(flightState.yaw, flightState.pitch);
      const fireSpeed = flightState.speed + (mode === 'jet' ? 115 : 58);
      for (let i = 0; i < (isSoftwareGl ? 2 : 4); i++) {
        const spread = mode === 'jet' ? 1.8 : 4.6;
        particles.spawn(
          mouthWorld.x, mouthWorld.y, mouthWorld.z,
          fwd.x * fireSpeed + (Math.random() - 0.5) * spread,
          fwd.y * fireSpeed + (Math.random() - 0.5) * spread,
          fwd.z * fireSpeed + (Math.random() - 0.5) * spread,
          mode === 'jet' ? (i % 2 ? 0xffe07a : 0xff7029) : (i % 2 ? 0xff9b2b : 0xff451f),
          mode === 'jet' ? 0.55 : 0.95,
          mode === 'jet' ? 0.85 : 0.68,
          mode === 'jet' ? 0.9 : 2.8
        );
      }
      fireLight.position.copy(mouthWorld);
      fireLight.intensity = 4.5;
      if (fireCooldown <= 0) {
        fireCooldown = 0.55;
        triggerFireBlast(locked);
      }
    } else {
      fireLight.intensity = Math.max(0, fireLight.intensity - dt * 16);
    }

    particles.update(dt);

    // Camera tracking with smooth exponential damping & dynamic FOV speed kick
    const fwd = Physics.forwardVector(flightState.yaw, flightState.pitch);
    const targetFov = 60 + Math.min(20, (flightState.speed / (mode === 'jet' ? 110 : 58)) * 16);
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();

    if (camMode === 0) {
      // Dynamic Chase Cam
      const dist = mode === 'jet' ? 15.5 : 13.5;
      const up = mode === 'jet' ? 4.4 : 4.8;
      const desired = new THREE.Vector3(
        flightState.x - fwd.x * dist,
        Math.max(2.2, flightState.y - fwd.y * dist + up),
        flightState.z - fwd.z * dist
      );
      camPos.lerp(desired, Math.min(1, dt * 6.5));
      camLook.lerp(new THREE.Vector3(flightState.x + fwd.x * 18, flightState.y + fwd.y * 18, flightState.z + fwd.z * 18), Math.min(1, dt * 9));
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    } else if (camMode === 1) {
      // Cinematic Soaring Side/Orbit Cam
      const orbitA = flightState.yaw + Math.sin(elapsed * 0.45) * 0.65 + 0.75;
      const desired = new THREE.Vector3(
        flightState.x + Math.sin(orbitA) * 16,
        Math.max(3, flightState.y + 4.5),
        flightState.z + Math.cos(orbitA) * 16
      );
      camPos.lerp(desired, Math.min(1, dt * 5));
      camera.position.copy(camPos);
      camera.lookAt(flightState.x, flightState.y + 0.6, flightState.z);
    } else {
      // First-Person Wizard Rider / Fighter Cockpit Cam
      camera.position.set(
        flightState.x + fwd.x * (mode === 'jet' ? 1.8 : 1.0),
        flightState.y + (mode === 'jet' ? 0.9 : 1.85),
        flightState.z + fwd.z * (mode === 'jet' ? 1.8 : 1.0)
      );
      camera.lookAt(flightState.x + fwd.x * 60, flightState.y + fwd.y * 60, flightState.z + fwd.z * 60);
    }

    // Update crisp perimeter telemetry readouts
    elSpeed.textContent = `${Math.round(flightState.speed * 2.4)} kt`;
    elAlt.textContent = `${Math.max(0, Math.round(flightState.y))} m`;
    elAtt.textContent = `${Math.round(flightState.pitch * 180 / Math.PI)}° / ${Math.round(flightState.roll * 180 / Math.PI)}°`;
    if (mode === 'jet') {
      elRes.textContent = flightState.afterburner ? 'A/B MAX' : `${Math.round(flightState.throttle * 100)}%`;
      elRes.dataset.warn = flightState.stalling ? 'true' : 'false';
    } else {
      elRes.textContent = `${Math.round(flightState.fireEnergy)}%`;
      elRes.dataset.warn = flightState.stalling ? 'true' : 'false';
    }
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) elBanner.hidden = true;
    }

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      timerId = window.setTimeout(() => { rafId = requestAnimationFrame(stepFrame); }, 16);
    } else {
      rafId = requestAnimationFrame(stepFrame);
    }
  }

  activeSession = {
    mode,
    flightState,
    world3D,
    isSoftwareGl,
    triggerFire: () => {
      const hits = Physics.findTargetsInFireCone(flightState, world3D.targets);
      triggerFireBlast(hits[0] || null);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onCanvasDown);
      canvas.removeEventListener('pointermove', onCanvasMove);
      for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.removeEventListener(type, onCanvasUp);
      window.removeEventListener('blur', releaseInputs);
      btnCam.removeEventListener('click', onCamClick);
      btnLaunch.removeEventListener('click', onLaunchClick);
      btnExit.removeEventListener('click', onExitClick);
      btnRoll.removeEventListener('click', onRollClick);
      unbindFlap();
      unbindHover();
      unbindFire();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      environment?.dispose();
      renderer.dispose?.();
      overlay.removeEventListener('cancel', onCancel);
      overlay.close();
      overlay.hidden = true;
      document.body.removeAttribute('data-flight-3d');
      document.dispatchEvent(new Event('earthsheetchange'));
      options.onExit?.({
        mode,
        distanceFlown: flightState.distanceFlown,
        maxAltitudeReached: flightState.maxAltitudeReached,
        fireBlasts: flightState.fireBlasts,
        targetsHit: flightState.targetsHit
      });
    }
  };

  overlay.hidden = false;
  overlay.showModal();
  document.body.setAttribute('data-flight-3d', 'open');
  document.dispatchEvent(new Event('earthsheetchange'));
  canvas.focus({ preventScroll: true });
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
    distanceFlown: s.distanceFlown,
    isSoftwareGl: activeSession.isSoftwareGl
  };
}

window.EarthFlight3D = Object.freeze({ launch, close, isOpen, getTelemetry });
