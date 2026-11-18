/* Scenery beyond the playable district. The raster atlas is loaded when street
   view asks for it. All coast, allotment and building drawing is ground-cached. */
(() => {
  'use strict';

  // Source rectangle, projected ground anchor and world units per source pixel.
  const tiles = {
    land: [2, 2, 608, 608],
    estuary: [615, 2, 608, 608],
    lateen: [1228, 2, 224, 246, 109.62, 209.79, 0.01949],
    coral1: [2, 615, 235, 246, 115.91, 169.57, 0.02305],
    water: [242, 615, 512, 240],
    coral0: [759, 615, 247, 193, 144.69, 141.56, 0.02721],
    coral2: [1011, 615, 246, 191, 139.96, 137.22, 0.02615],
    canopy: [1262, 615, 205, 190, 100.34, 157.7, 0.01904],
    cottage2: [2, 866, 204, 179, 94.21, 129.41, 0.02706],
    cottage0: [211, 866, 204, 178, 102.93, 125.49, 0.02584],
    lath: [420, 866, 205, 175, 106.27, 140.04, 0.02286],
    barn: [630, 866, 204, 170, 102.87, 130.79, 0.02454],
    cottage1: [839, 866, 205, 153, 103.67, 104.01, 0.02633],
    horizon: [1049, 866, 144, 144],
    nursery: [1198, 866, 205, 141, 111.23, 100.72, 0.02782]
  };
  const backgroundColors = {
    coast: ['#668e8d','#496872'], zanzibar: ['#598f88', '#395e65'], ocean: ['#497a7e', '#2f545f'],
    temperate: ['#798a73', '#546957'], warm: ['#8a9478', '#65745b'],
    boreal: ['#778a84', '#506861']
  };
  const scriptUrl = typeof document !== 'undefined' && document.currentScript?.src;
  const assetPath = 'art/town-surroundings.webp?v=d7756de751d1';
  const atlasUrl = scriptUrl ? new URL(assetPath, scriptUrl).href : assetPath;
  let atlas = null;
  let requested = false;
  const listeners = new Set();

  function onReady(callback) {
    if (typeof callback !== 'function') return () => {};
    listeners.add(callback);
    if (atlas) {
      Promise.resolve().then(() => { if (listeners.delete(callback)) callback(); });
      return () => listeners.delete(callback);
    }
    if (!requested && typeof Image === 'function') {
      requested = true;
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        atlas = image;
        for (const notify of listeners) notify();
        listeners.clear();
      };
      image.onerror = () => { requested = false; listeners.clear(); };
      image.src = atlasUrl;
    }
    return () => listeners.delete(callback);
  }

  function profile(site) {
    const waterfront=window.CommonEarthSim?.waterfront?.(site);
    if(waterfront)return waterfront;
    if (site?.water) return 'ocean';
    const lat = Number(site?.lat), lon = Number(site?.lon);
    // The opening settlement is on the western waterfront of Unguja. Other
    // equatorial settlements do not acquire a coastline simply from latitude.
    if (Math.abs(lat + 6.163) < .046 && Math.abs(lon - 39.189) < .036) return 'zanzibar';
    if (Math.abs(lat) > 57) return 'boreal';
    return Math.abs(lat) < 27 ? 'warm' : 'temperate';
  }
  function background(site) { return backgroundColors[profile(site)]; }
  function jitter(seed, n) {
    let h = Math.imul(seed ^ Math.imul(n + 137, 147525217), 1597334677);
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  }
  function ink(g, project, points, color, width = 0) {
    g.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = project(...points[i]);
      if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
    }
    if (width) { g.strokeStyle = color; g.lineWidth = width; g.stroke(); }
    else { g.closePath(); g.fillStyle = color; g.fill(); }
  }
  function box(g, project, x, y, w, d, z, h, top, face, end) {
    ink(g, project, [[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]], face);
    ink(g, project, [[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]], end);
    ink(g, project, [[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]], top);
  }
  function contact(g, project, unit, x, y, radius, z, alpha = .28) {
    const p = project(x + .22, y + .11, z);
    g.save(); g.translate(p[0], p[1]); g.scale(unit * radius, unit * radius * .32);
    const shade = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    shade.addColorStop(0, `rgba(33,42,35,${alpha})`); shade.addColorStop(1, 'rgba(33,42,35,0)');
    g.fillStyle = shade; g.fillRect(-1, -1, 2, 2); g.restore();
  }
  function stamp(g, project, unit, name, x, y, z, size, flip = false) {
    if (!atlas) return;
    const [sx,sy,w,h,ax,ay,worldScale] = tiles[name];
    const [px,py] = project(x, y, z), scale = unit * size * worldScale;
    g.save(); g.translate(px, py); if (flip) g.scale(-1, 1);
    g.drawImage(atlas, sx, sy, w, h, -ax*scale, -ay*scale, w*scale, h*scale); g.restore();
  }
  function drawBoat(g, project, unit, name, x, y, size=1, flip=false) {
    if (!atlas || (name !== 'canopy' && name !== 'lateen')) return false;
    const surface = -.44;
    if (atlas) {
      const [sx,sy,w,h,ax,ay,s] = tiles[name], p = project(x, y, surface);
      const scale = unit * size * s;
      g.save(); g.translate(p[0], p[1]); g.scale(flip ? -1 : 1, -.29); g.globalAlpha = .095;
      g.drawImage(atlas, sx, sy, w, h, -ax*scale, -ay*scale, w*scale, h*scale); g.restore();
    }
    contact(g, project, unit, x+.02, y+.04, size*2.6, surface-.02, .38);
    stamp(g, project, unit, name, x, y, surface, size, flip);
    return true;
  }

  // Make the painted sail and hull tappable, including the mirrored artwork.
  // The two masks are made on demand and occupy one byte per 4 × 4 source pixels.
  const boatMasks=new Map();
  function boatContains(name,dx,dy,size,flip){
    if(!atlas || !tiles[name])return false;
    const [sx,sy,w,h,ax,ay,s]=tiles[name];
    const x=ax+(flip?-dx:dx)/(size*s), y=ay+dy/(size*s);
    if(x<0 || y<0 || x>=w || y>=h)return false;
    const stride=Math.ceil(w/4);
    if(!boatMasks.has(name)){
      let mask=null;
      try{
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        const g=canvas.getContext('2d',{willReadFrequently:true});
        g.drawImage(atlas,sx,sy,w,h,0,0,w,h);
        const rgba=g.getImageData(0,0,w,h).data;
        mask=new Uint8Array(stride*Math.ceil(h/4));
        for(let row=0;row<h;row++)for(let col=0;col<w;col++){
          if(rgba[(row*w+col)*4+3]>=48)mask[(row>>2)*stride+(col>>2)]=1;
        }
      }catch{/* The geometric hull and jetty remain available if pixels cannot be read. */}
      boatMasks.set(name,mask);
    }
    return Boolean(boatMasks.get(name)?.[(y>>2)*stride+(x>>2)]);
  }

  function paintHorizon(g, project, unit, width, height, site) {
    if (!atlas || !['zanzibar','coast'].includes(profile(site)) || !width || !height) return false;
    // A tiny landscape gradient continues the western waterfront outside the
    // cached map at any zoom. Only its visible subsection reaches the GPU.
    const [sx,sy,w,h] = tiles.horizon;
    const zero=project(0,0,-.48), rise=project(1,0,-.48)[1]-zero[1];
    if (!(unit>0 && rise>0)) return false;
    const left=-zero[0]/unit, right=(width-zero[0])/unit, top=-zero[1]/rise, bottom=(height-zero[1])/rise;
    const x0=Math.max(-144,Math.floor((left+top)/2)-3), x1=Math.min(168,Math.ceil((right+bottom)/2)+3);
    const y0=Math.max(-144,Math.floor((top-right)/2)-3), y1=Math.min(168,Math.ceil((bottom-left)/2)+3);
    if(x1<=x0 || y1<=y0) return false;
    if(x0===-144 || y0===-144 || x1===168 || y1===168){
      g.fillStyle=backgroundColors.zanzibar[0];g.fillRect(0,0,width,height);
    }
    g.save(); g.transform(unit,rise,-unit,rise,zero[0],zero[1]);
    g.drawImage(atlas,sx+(x0+144)*w/312,sy+(y0+144)*h/312,(x1-x0)*w/312,(y1-y0)*h/312,x0,y0,x1-x0,y1-y0);
    g.restore(); return true;
  }
  function terrain(g, project, name) {
    const [sx,sy,w,h] = tiles[name];
    const a = project(-12,-12,-.48), b = project(36,-12,-.48), c = project(-12,36,-.48);
    g.save(); g.transform((b[0]-a[0])/w,(b[1]-a[1])/w,(c[0]-a[0])/h,(c[1]-a[1])/h,a[0],a[1]);
    if (atlas) g.drawImage(atlas, sx, sy, w, h, 0, 0, w, h);
    else {
      // Available instantly, even if the local image request fails.
      g.fillStyle = name === 'estuary' ? '#97a086' : '#869b7f';
      g.fillRect(96, 96, w-192, name === 'estuary' ? h*.62 : h-192);
    }
    g.restore();
  }
  function water(g, project, unit, sea, seed) {
    if (atlas) {
      const positions = sea ? [[-3,5],[13,-3],[29,4],[33,19],[26,31],[9,30],[-2,21],[-3,-3]] : [[-1,31],[11,31],[23,30],[30,34],[10,38]];
      const [sx,sy,w,h] = tiles.water;
      for (let i=0; i<positions.length; i++) {
        const [x,y] = positions[i], p = project(x,y,-.53);
        const width = unit * (15 + jitter(seed, i)*6), height = width*h/w;
        g.drawImage(atlas, sx, sy, w, h, p[0]-width/2,p[1]-height/2,width,height);
      }
    }
    // Shoals run parallel to the shore and disappear gradually into deep water.
    const start = 25.26;
    for (let i = 0; i < 9; i++) {
      const band = [], fade = (9-i)/9, far = start + .15+i*.31;
      for (let j = 0; j <= 36; j++) {
        const x = -1.23 + j*.74;
        band.push([x, far + .19*Math.sin(x*.81+i*.16) + .14*Math.sin(x*1.54), -.49]);
      }
      ink(g, project, [[-1.23,start,-.49], ...band, [25.41,start,-.49]], `rgba(153,202,167,${.026 + fade*.022})`);
    }
    for (let i=0; i<70; i++) {
      const x = -1.15 + 26.4*jitter(seed,i+200), y = 25.48 + 5*jitter(seed,i+333)**1.4, length = .08+.31*jitter(seed,i+505);
      ink(g, project, [[x,y,-.46],[x+length*.54,y-length*.51,-.46],[x+length,y-length*.98,-.46]], 'rgba(216,230,191,.35)', Math.max(.55,unit*.018));
    }
  }

  function jetty(g, project, unit, x, length) {
    const y = 25.48, width = .78, n = Math.round(length/.23);
    contact(g, project, unit, x, y+length*.60, 1.15, -.50, .31);
    for (let i=0;i<n;i++) {
      box(g, project, x-width/2,y+i*length/n,width,length/n-.015,-.28,.29,
        ['#b2a17d','#bbaa86','#a69979'][i%3], '#80765d', '#716d57');
    }
    for (let j=0;j<3;j++) for (const side of [-1,1]) {
      const px=x+side*.38, py=y+.14+j*(length-.28)/2;
      box(g, project, px,py,.09,.09,-.44,.78,'#d1bea0','#776b52','#695f49');
    }
    ink(g, project, [[x+.41,y+.13,.27],[x+.41,y+length*.47,.11],[x+.41,y+length-.1,.29]], '#ab9772',Math.max(.75,unit*.025));
  }
  function seawall(g,project,unit) {
    const tile=1.16,y=25.24;
    for (let i=0;i<23;i++) {
      const x=-1.25+i*tile;
      box(g,project,x,y,tile-.018,.28,-.48,.435,
        ['#ccbea3','#c2b69d','#cbbfa4','#cbbda1'][i%4],
        ['#968e77','#998f77','#a0957d'][i%3], '#837f69');
      if(i%3===1)box(g,project,x+.41,y+.08,.14,.12,-.035,.18,'#847c66','#625f52','#55584d');
    }
    ink(g,project,[[-1.26,y+.31,-.39],[25.32,y+.31,-.39]],'rgba(149,162,122,.7)',Math.max(.6,unit*.036));
  }
  function fence(g, project, unit, a, b, tint) {
    const [x,y]=a, dx=b[0]-x, dy=b[1]-y, count=Math.ceil(Math.hypot(dx,dy)/1.12);
    for(let i=0;i<=count;i++) {
      const px=x+dx*i/count, py=y+dy*i/count;
      ink(g,project,[[px,py,-.4],[px,py,-.02]],tint,Math.max(.8,unit*.061));
    }
    for(const z of [-.13,-.29])ink(g,project,[[...a,z],[...b,z]],tint,Math.max(.55,unit*.027));
  }
  function allotment(g,project,unit,x,y,seed) {
    // Beds sit outside the retaining fence, on the far side of the service path.
    for (let row=0;row<3;row++) {
      const xx=x+row*.57, yy=y-.035*row;
      box(g,project,xx,yy,.40,1.70,-.48,.09,'#8c805e','#8f815e','#7f775a');
      for (let j=0;j<8;j++) {
        const t=j*.20+.16, bend=jitter(seed,row*8+j)*.05;
        ink(g,project,[[xx+.07,yy+t,-.37],[xx+.21,yy+t-.02,-.22],[xx+.33,yy+t+bend,-.31],[xx+.22,yy+t+.10,-.35]],['#788b5e','#82996c','#92a16e'][row]);
      }
    }
  }
  function outskirts(g, project, unit, place, seed, plant) {
    const port = place === 'zanzibar' || place==='coast', hot = place === 'warm';
    const features = [];
    if(port) {
      // Lower contrast and setbacks keep the occupied quarter visually distinct
      // from the market, residents' homes and projects that the player can visit.
      const sites=[[-4.9,.3],[-4.4,4.8],[-6.2,12.4],[-4.3,16.3],[-6.7,21.4],[-7.8,-3.6],[.1,-4.3],[4.4,-4.0],[10.8,-6.3],[17.3,-5.1],[21.0,-4.3],[27.7,-3.1],[29.0,4.3],[30.4,11.3],[28.8,16.5],[29.1,20.4]];
      for(let i=0;i<sites.length;i++){
        const x=sites[i][0]+jitter(seed,i)*.42, y=sites[i][1]+jitter(seed,i+62)*.47;
        features.push({x,y, size:.74+jitter(seed,i+88)*.16, tile:(place==='coast'?'cottage':'coral')+((i+seed%3)%3), flip:false});
      }
    } else {
      const sites=[[-4.75,4.0],[-5.3,10.0],[-4.3,19.9],[2.7,-4.8],[7.5,-5.1],[20.6,-4.2],[29.4,5.1],[28.8,13.8],[29.0,22.5],[3.3,29.4],[8.5,28.8],[19.5,29.7]];
      for(let i=0;i<sites.length;i++){
        const x=sites[i][0]+jitter(seed,i)*.67, y=sites[i][1]+jitter(seed,i+39)*.57;
        const cottage='cottage'+(place==='boreal' ? (i%2 ? 0 : 2) : i%3);
        const tile=i%4===0 ? (hot?'lath':'nursery') : i%5===0 ? 'barn' : cottage;
        features.push({x,y,size:.76+jitter(seed,i+92)*.17,tile,flip:false});
      }
      allotment(g,project,unit,10.5,26.4,seed); allotment(g,project,unit,26.5,12.8,seed+44);
      for (const [a,b] of [[[-1.65,1.1],[-1.65,9.7]],[[-1.74,14.1],[-1.74,23.1]],[[2.1,25.60],[8.7,25.60]],[[14.3,25.61],[22.6,25.61]],[[25.65,8.0],[25.65,14.5]]]) fence(g, project, unit, a, b, '#8a8c6f');
    }
    if (plant) {
      const homes=features.slice();
      for(let i=0;i<homes.length;i++) {
        const house=homes[i], dx=i%2 ? -2.15 : 2.16, dy=i%3 ? 1.06 : 2.24;
        const x=house.x+dx, y=house.y+dy;
        if ((x<-1.9 || x>26.0 || y<-1.9 || y>26.0) && (!port || y<24)) {
          features.push({x,y,tree:true,size:.75+jitter(seed,441+i)*.47,variant:i%4,palm:(place==='zanzibar' || hot) && i%3!==0});
        }
      }
      if (!port) {
        // Orchard rows have a human scale near the first street you can walk.
        for(let row=0;row<2;row++) for(let j=0;j<4;j++) {
          features.push({x:13.65+j*1.18,y:26.81+row*1.17+j*.024,size:.58+jitter(seed,j+164)*.14,tree:true,variant:1,palm:false});
        }
      }
    }
    features.sort((a,b) => a.x+a.y-b.x-b.y);
    for(const f of features) {
      if(f.tree) {
        contact(g,project,unit,f.x+.36*f.size,f.y+.13*f.size,f.size*1.32,-.47,.21);
        g.save();g.translate(0,.48*unit);plant(f.x,f.y,f.size,f.variant,f.palm);g.restore();
      } else {
        contact(g, project, unit, f.x, f.y, f.size*3.5, -.48);
        stamp(g, project, unit, f.tile, f.x, f.y, -.45, f.size, f.flip);
      }
    }
  }
  function paint(g, project, unit, site, seed=0, plant=null) {
    if(!site) return;
    const place=profile(site), sea=place==='ocean', port=place==='zanzibar'||place==='coast';
    g.save();
    if(sea || port) water(g,project,unit,sea,seed);
    if(!sea) {
      terrain(g,project,port?'estuary':'land');
      outskirts(g,project,unit,place,seed,plant);
    }
    if(port) {
      seawall(g,project,unit);
      for(const [x,length] of [[2.9,1.80],[11.4,2.76],[22.4,2.20]])jetty(g,project,unit,x,length);
    }
    if((sea || port) && site.buildings?.some(b=>b.kind==='fishingDock')){
      // The shore station occupies its reserved lot. Its landing reaches open water.
      const x=6.5;
      jetty(g,project,unit,x,2.74);
      box(g,project,x-.72,27.48,1.45,.71,-.27,.33,'#bdb18b','#897652','#75674f');
      for(const dx of [-.62,.56])box(g,project,x+dx,27.96,.09,.09,-.42,1.00,'#bda06c','#7d6b4a','#705e42');
      for(let i=0;i<7;i++){
        const rx=x-.55+i*.16;
        ink(g,project,[[rx,28,.50],[rx+.13,28,.21],[rx+.22,28,.09]],'#7b8c76',Math.max(.6,unit*.025));
        ink(g,project,[[rx+.22,28,.50],[rx+.13,28,.21],[rx,28,.09]],'#91a288',Math.max(.6,unit*.025));
      }
      for(let i=0;i<2;i++)box(g,project,x-.29,26.04+i*.37,.39,.32,.02,.23,'#d2b991','#a3845a','#876f4e');
    }
    g.restore();
  }
  window.EarthTownSurroundings = Object.freeze({profile,background,onReady,paint,paintHorizon,drawBoat,boatContains});
})();
