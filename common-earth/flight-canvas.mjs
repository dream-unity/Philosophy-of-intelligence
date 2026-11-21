// Project the existing flight scene with Canvas 2D on devices without WebGL 2.
export function createCanvasFlightRenderer(canvas) {
  const ctx = canvas.getContext('2d', {alpha:false});
  const vertices = new WeakMap();
  const palettes = new WeakMap();
  let width, height, focal;

  const fallbackColor = { r: 0.72, g: 0.76, b: 0.80, getHex: () => 0xb8c2cc };

  function palette(material) {
    const c = material?.color
      || material?.uniforms?.uDeepColor?.value
      || material?.uniforms?.uColorMid?.value
      || fallbackColor;
    let saved = palettes.get(material);
    if (saved && saved.r === c.r && saved.g === c.g && saved.b === c.b) return saved.shades;
    const rgb = typeof c.getHex === 'function' ? c.getHex() : 0xb8c2cc;
    const shades = Array.from({length:8}, (_, i) => {
      const factor = .62 + .055 * i;
      return 'rgb(' + [rgb >> 16, (rgb >> 8) & 255, rgb & 255].map(n => Math.round(n * factor)).join(',') + ')';
    });
    palettes.set(material, {r:c.r, g:c.g, b:c.b, shades});
    return shades;
  }

  function clipNear(points, near) {
    const out = [];
    let a = points[points.length - 1];
    for (const b of points) {
      if ((a.z < near) !== (b.z < near)) {
        const t = (near - a.z) / (b.z - a.z);
        out.push({sx:width / 2 + (a.x + (b.x - a.x) * t) * focal / near,
          sy:height / 2 - (a.y + (b.y - a.y) * t) * focal / near, z:near});
      }
      if (b.z >= near) out.push(b);
      a = b;
    }
    return out;
  }

  return {
    setSize(w, h) {
      // Keep the software raster workload bounded on high-density tablets.
      const safeW = Math.max(1, w || 640);
      const safeH = Math.max(1, h || 360);
      const scale = Math.min(1, 1000 / safeW);
      width = canvas.width = Math.max(1, Math.round(safeW * scale));
      height = canvas.height = Math.max(1, Math.round(safeH * scale));
    },
    render(scene, camera) {
      if (!ctx || !width || !height) return;
      ctx.fillStyle = scene.background && typeof scene.background.getStyle === 'function'
        ? scene.background.getStyle()
        : '#7ec0de';
      ctx.fillRect(0, 0, width, height);
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      focal = height * camera.projectionMatrix.elements[5] / 2;
      const faces = [];
      scene.traverseVisible(mesh => {
        if (!mesh.isMesh || mesh.isInstancedMesh || !mesh.material || !mesh.material.visible) return;
        const geometry = mesh.geometry, mat = mesh.material;
        if (!geometry || !geometry.attributes?.position) return;
        // Skip BackSide sky dome shader sphere in 2D software projection (scene.background paints the sky)
        if (mat.isShaderMaterial && mat.side === 1) return;
        mesh.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
        const m = mesh.modelViewMatrix.elements;
        if (!geometry.boundingSphere) geometry.computeBoundingSphere();
        const bound = geometry.boundingSphere, radius = bound.radius * mesh.matrixWorld.getMaxScaleOnAxis();
        const {x, y, z} = bound.center;
        const depth = -(m[2]*x + m[6]*y + m[10]*z + m[14]);
        if (depth + radius < camera.near || depth - radius > camera.far) return;
        const reach = Math.max(camera.near, depth) / focal;
        if (Math.abs(m[0]*x + m[4]*y + m[8]*z + m[12]) > width * reach / 2 + 2*radius ||
            Math.abs(m[1]*x + m[5]*y + m[9]*z + m[13]) > height * reach / 2 + 2*radius) return;
        if (radius < reach * .7) return;

        const pos = geometry.attributes.position;
        let points = vertices.get(mesh);
        if (!points || points.length !== pos.count) {
          points = Array.from({length:pos.count}, () => ({}));
          vertices.set(mesh, points);
        }
        for (let i = 0; i < points.length; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), p = points[i];
          p.x = m[0]*x + m[4]*y + m[8]*z + m[12];
          p.y = m[1]*x + m[5]*y + m[9]*z + m[13];
          p.z = -(m[2]*x + m[6]*y + m[10]*z + m[14]);
          p.sx = width / 2 + p.x * focal / p.z;
          p.sy = height / 2 - p.y * focal / p.z;
        }
        const indices = geometry.index?.array;
        const count = indices?.length ?? points.length;
        const colors = palette(mat);
        const vertColors = mat.vertexColors ? geometry.attributes.color : null;
        const alpha = Number.isFinite(mat.opacity) ? mat.opacity : 1;
        for (let i = 0; i < count; i += 3) {
          const ia = indices ? indices[i] : i;
          const ib = indices ? indices[i+1] : i+1;
          const ic = indices ? indices[i+2] : i+2;
          const a = points[ia];
          const b = points[ib];
          const c = points[ic];
          if (Math.max(a.z,b.z,c.z) < camera.near) continue;
          const path = Math.min(a.z,b.z,c.z) < camera.near ? clipNear([a,b,c],camera.near) : [a,b,c];
          const [p,q,r] = path;
          if (!r) continue;
          const area = (q.sx-p.sx)*(r.sy-p.sy) - (q.sy-p.sy)*(r.sx-p.sx);
          if (Math.abs(area) < .38 || (area > 0 && !mat.side)) continue;
          const ux=b.x-a.x, uy=b.y-a.y, uz=b.z-a.z, vx=c.x-a.x, vy=c.y-a.y, vz=c.z-a.z;
          const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
          const light=(.36*nx-.72*ny+.59*nz)/(Math.hypot(nx,ny,nz)||1);
          let fill;
          if (vertColors) {
            const shade = .66 + .34 * Math.max(0, Math.min(1, .5 + light * .5));
            const vr = Math.round(vertColors.getX(ia) * 255 * shade);
            const vg = Math.round(vertColors.getY(ia) * 255 * shade);
            const vb = Math.round(vertColors.getZ(ia) * 255 * shade);
            fill = `rgb(${vr},${vg},${vb})`;
          } else {
            fill = colors[Math.min(7,Math.max(0,Math.round(4+light*3)))];
          }
          faces.push({path, depth:(a.z+b.z+c.z)/3, order:mesh.renderOrder, fill, alpha});
        }
      });
      faces.sort((a,b) => a.order-b.order || b.depth-a.depth);
      for (const face of faces) {
        ctx.globalAlpha = face.alpha;
        ctx.fillStyle = face.fill;
        ctx.beginPath();
        ctx.moveTo(face.path[0].sx, face.path[0].sy);
        for (let i=1; i<face.path.length; i++) ctx.lineTo(face.path[i].sx, face.path[i].sy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };
}
