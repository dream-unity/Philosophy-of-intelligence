/* The street and picking share a projection. Only the regional homes actually in view are fetched. */
(() => {
  'use strict';

  const cellWidth = 360, cellHeight = 464, inkWidth = 350, groundRow = 459;
  const maskWidth = 72, maskHeight = 93;
  const scriptURL = typeof document === 'undefined' ? null : document.currentScript?.src || document.baseURI;
  const listeners = new Set();
  const sheets = new Map();
  let lastUse = 0;
  const civic = {
    exchange: {sheet:'civic', slot:0, width:5.65, front:1.43},
    market:   {sheet:'civic', slot:0, width:4.45, front:1.10},
    hall:     {sheet:'civic', slot:1, width:5.05, front:1.22},
    workshop: {sheet:'civic', slot:2, width:5.00, front:1.22}
  };
  const harbour = Object.fromEntries(Object.entries(civic).map(([kind,art])=>[kind,{...art,sheet:'harbour'}]));
  const homes = new Map();
  for (const name of ['marine','coastal','temperate','timber','courtyard','australian','tropical']) {
    homes.set(name, [4.76,4.83,4.86].map((width,slot)=>({sheet:name,slot,width,front:1.16})));
  }

  function homeStyle(site) {
    if (site.water) return 'marine';
    const {lat,lon} = site;
    // Distinct coastal, island and dry-land forms; all buildings depict the fictional settlement.
    if (lat >= -13 && lat <= 1 && lon >= 38 && lon <= 43) return 'coastal';
    if ((lat >= 30 && lat <= 38.5 && lon >= 129 && lon <= 142) ||
        (lat > 38.5 && lat < 46 && lon > 138 && lon < 146)) return 'timber';
    if (lat >= 17 && lat <= 36.8 && lon >= -13 && lon <= 65) return 'courtyard';
    if (lat >= -44 && lat <= -10 && lon >= 112 && lon <= 154) return 'australian';
    if (Math.abs(lat) <= 20) return 'tropical';
    return 'temperate';
  }

  function frame(site,kind,index) {
    if (kind === 'home') return site && homes.get(homeStyle(site))[index];
    return (site?.water ? harbour : civic)[kind];
  }

  function buildMask(image) {
    try {
      const tile = document.createElement('canvas');
      tile.width = maskWidth * 3;
      tile.height = maskHeight;
      const brush = tile.getContext('2d',{willReadFrequently:true});
      brush.drawImage(image,0,0,tile.width,tile.height);
      const rgba = brush.getImageData(0,0,tile.width,tile.height).data;
      const mask = new Uint8Array(tile.width * tile.height);
      for (let i=0;i<mask.length;i++) mask[i] = rgba[4*i+3];
      return mask;
    } catch { return null; }
  }

  function load(name) {
    const existing = sheets.get(name);
    if (existing) {
      existing.lastUse = ++lastUse;
      return existing;
    }
    if (!scriptURL || typeof Image === 'undefined') return null;
    // Retain two town pairs across visits. Revisited sheets can use the ordinary HTTP cache.
    if (sheets.size >= 4) {
      let oldest;
      for (const entry of sheets) if (!oldest || entry[1].lastUse < oldest[1].lastUse) oldest = entry;
      sheets.delete(oldest[0]);
    }
    const image = new Image();
    const sheet = {image,ready:false,mask:null,lastUse:++lastUse};
    sheets.set(name,sheet);
    image.onload = () => {
      if (sheets.get(name) !== sheet || image.naturalWidth !== cellWidth*3 || image.naturalHeight !== cellHeight) return;
      sheet.ready = true;
      for (const refresh of listeners) refresh();
    };
    image.decoding = 'async';
    image.src = new URL(`art/architecture-${name}-v1.webp`,scriptURL).href;
    return sheet;
  }

  function draw(ctx,site,kind,index,sx,sy,unit) {
    const art = frame(site,kind,index);
    if (!art) return false;
    const sheet = load(art.sheet);
    if (!sheet?.ready) return false;
    const scale = art.width*unit/inkWidth;
    const x = sx-cellWidth*.5*scale;
    const y = sy+art.front*unit-groundRow*scale;
    ctx.drawImage(sheet.image,art.slot*cellWidth,0,cellWidth,cellHeight,x,y,cellWidth*scale,cellHeight*scale);
    return true;
  }

  function contains(site,kind,index,dx,dy,unit) {
    const art = frame(site,kind,index);
    const sheet = art && sheets.get(art.sheet);
    if (!sheet?.ready || !(unit>0)) return undefined;
    const scale = art.width*unit/inkWidth;
    const x = dx/scale + cellWidth*.5;
    const y = (dy-art.front*unit)/scale + groundRow;
    if (x<0 || x>=cellWidth || y<0 || y>=cellHeight) return false;
    if (sheet.mask===null) sheet.mask = buildMask(sheet.image) || false;
    if (!sheet.mask) return undefined;
    const ix = art.slot*maskWidth + Math.floor(x*maskWidth/cellWidth);
    return sheet.mask[Math.floor(y*maskHeight/cellHeight)*maskWidth*3+ix] >= 50;
  }

  function watch(refresh) {
    listeners.add(refresh);
    return () => listeners.delete(refresh);
  }

  window.EarthTownArchitecture = {draw,contains,watch};
})();
