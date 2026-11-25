/* Allerconiard - modèles et textures 3D faits main.
   Tout est dessiné à la volée sur des canvas : aucune image à télécharger.
   armes détaillées + skins d'arme + uniforms de personnage. — robotbot */
const Models = {

  texCache: {},

  /* ---------- Textures : camo réaliste dessiné pixel par pixel ---------- */
  TEX: {
    steel:       { base: '#4d545e', mode: 'brushed' },
    darkmetal:   { base: '#272c33', mode: 'brushed' },
    wood:        { base: '#7d5730', mode: 'grain' },
    camo_woodland:{ mode: 'camo', seed: 11, colors: ['#151b12','#26301c','#3f4d2b','#6d6a43','#9a8b5c'] },
    camo_desert: { mode: 'camo', seed: 23, colors: ['#5e4c30','#8b7449','#b09a68','#cfbc8f','#e0d3ae'] },
    camo_multicam:{ mode: 'camo', seed: 37, colors: ['#1c2419','#4a4f2e','#8a7748','#b7a780','#3d4240'] },
    camo_urban:  { mode: 'camo', seed: 51, colors: ['#1e2227','#363d43','#576067','#82898c','#a9ada9'] },
    camo_snow:   { mode: 'camo', seed: 67, colors: ['#39413e','#606b65','#939d96','#c6cdc5','#e6eae3'] },
    camo_night:  { mode: 'camo', seed: 83, colors: ['#0b0e11','#171d21','#28312f','#3d4642','#56605a'] },
    carbon:      { base: '#1d2025', mode: 'carbon' },
    neon:        { base: '#0d1420', mode: 'grid', colors: ['#00e5ff', '#0a6b80'] },
    gold:        { base: '#b5892f', mode: 'streak', colors: ['#e8c76b', '#8a5f1e'] },
    rust:        { base: '#6a4a36', mode: 'rust', colors: ['#a45c2c', '#3f413d', '#7a3f22'] }
  },

  WEAPON_SKINS: {
    standard: { name: 'De série',  unlock: 0,   metal: 'steel',        grip: 'wood',         swatch: 'linear-gradient(135deg,#6b7280,#2d3239)' },
    woodland: { name: 'Woodland',  unlock: 0,   metal: 'camo_woodland',grip: 'camo_woodland',swatch: 'linear-gradient(135deg,#6d6a43,#1b2314 55%,#3f4d2b)' },
    desert:   { name: 'Désert',    unlock: 60,  metal: 'camo_desert',  grip: 'camo_desert',  swatch: 'linear-gradient(135deg,#cfbc8f,#8b7449 55%,#5e4c30)' },
    multicam: { name: 'Multicam',  unlock: 120, metal: 'camo_multicam',grip: 'camo_multicam',swatch: 'linear-gradient(135deg,#b7a780,#4a4f2e 50%,#8a7748)' },
    urban:    { name: 'Urbain',    unlock: 200, metal: 'camo_urban',   grip: 'darkmetal',    swatch: 'linear-gradient(135deg,#a9ada9,#363d43 55%,#576067)' },
    snow:     { name: 'Neige',     unlock: 350, metal: 'camo_snow',    grip: 'camo_snow',    swatch: 'linear-gradient(135deg,#e6eae3,#606b65 55%,#939d96)' },
    night:    { name: 'Nuit',      unlock: 500, metal: 'camo_night',   grip: 'camo_night',   swatch: 'linear-gradient(135deg,#56605a,#0b0e11 60%,#28312f)' },
    rust:     { name: 'Rouillé',   unlock: 750, metal: 'rust',         grip: 'wood',         swatch: 'linear-gradient(135deg,#a45c2c,#4a3529)' }
  },

  rng(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  shade(hex, factor) {
    const n = parseInt(hex.replace('#', ''), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map(v => Math.max(0, Math.min(255, Math.round(v * factor))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  },

  rgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },

  // Bruit de valeur + fbm : donne des taches organiques, pas des ellipses.
  hash2(x, y, s) {
    const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return n - Math.floor(n);
  },

  vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = this.hash2(xi, yi, s), b = this.hash2(xi + 1, yi, s);
    const c = this.hash2(xi, yi + 1, s), d = this.hash2(xi + 1, yi + 1, s);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  },

  fbm(x, y, s, oct) {
    let total = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < (oct || 3); i++) {
      total += this.vnoise(x * freq, y * freq, s + i * 17) * amp;
      norm += amp; amp *= 0.5; freq *= 2;
    }
    return total / norm;
  },

  // La couche camo commune aux armes et aux uniformes.
  camoPixels(c, S, palette, seed, weave) {
    const img = c.createImageData(S, S);
    const data = img.data;
    const cols = palette.map(h => this.rgb(h));
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = x / S, v = y / S;
        const big = this.fbm(u * 3.2, v * 3.2, seed, 3);
        const mid = this.fbm(u * 8.4, v * 8.4, seed + 13, 2);
        let n = big * 0.82 + mid * 0.18;
        n = Math.max(0, Math.min(0.999, (n - 0.16) / 0.68));
        const col = cols[Math.min(cols.length - 1, Math.floor(n * cols.length))];
        const grain = (this.hash2(x, y, seed + 61) - 0.5) * (weave ? 13 : 19);
        const tooth = weave
          ? ((x % 3 === 0) ? -5 : 0) + ((y % 3 === 0) ? 4 : 0)
          : 0;
        const speck = this.hash2(x * 3, y * 3, seed + 97) > 0.93 ? -24 : 0;
        const i = (y * S + x) * 4;
        data[i]     = Math.max(0, Math.min(255, col[0] + grain + tooth + speck));
        data[i + 1] = Math.max(0, Math.min(255, col[1] + grain + tooth + speck));
        data[i + 2] = Math.max(0, Math.min(255, col[2] + grain + tooth + speck));
        data[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  },

  texture(scene, key) {
    if (this.texCache[key]) return this.texCache[key];
    const def = this.TEX[key] || this.TEX.steel;
    const S = 256;
    const dt = new BABYLON.DynamicTexture('tex_' + key, { width: S, height: S }, scene, false);
    const c = dt.getContext();
    const r = this.rng(key);

    if (def.mode === 'camo') {
      this.camoPixels(c, S, def.colors, def.seed, false);
      // Usure : petites éraflures claires sur la peinture.
      for (let i = 0; i < 60; i++) {
        c.strokeStyle = r() > .5 ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.13)';
        c.lineWidth = .5 + r();
        const x = r() * S, y = r() * S;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + r() * 26 - 13, y + r() * 5 - 2.5); c.stroke();
      }
    } else {
      c.fillStyle = def.base;
      c.fillRect(0, 0, S, S);

      if (def.mode === 'grain') {
        for (let i = 0; i < 130; i++) {
          c.strokeStyle = r() > .45 ? 'rgba(0,0,0,.15)' : 'rgba(255,225,185,.07)';
          c.lineWidth = .5 + r() * 2.4;
          const x = r() * S;
          c.beginPath(); c.moveTo(x, 0);
          c.bezierCurveTo(x + r() * 22 - 11, S * .33, x + r() * 22 - 11, S * .66, x + r() * 16 - 8, S);
          c.stroke();
        }
      } else if (def.mode === 'brushed') {
        for (let i = 0; i < 320; i++) {
          c.strokeStyle = r() > .5 ? 'rgba(255,255,255,' + (.02 + r() * .08) + ')' : 'rgba(0,0,0,' + (.02 + r() * .07) + ')';
          c.lineWidth = .5 + r();
          const y = r() * S;
          c.beginPath(); c.moveTo(0, y); c.lineTo(S, y + r() * 2 - 1); c.stroke();
        }
      } else if (def.mode === 'carbon') {
        for (let y = 0; y < S; y += 12) for (let x = 0; x < S; x += 12) {
          c.fillStyle = ((x / 12 + y / 12) % 2) ? '#2a2f36' : '#353b44';
          c.fillRect(x + 1, y + 1, 10, 5);
          c.fillStyle = ((x / 12 + y / 12) % 2) ? '#353b44' : '#2a2f36';
          c.fillRect(x + 1, y + 6, 5, 5);
        }
      } else if (def.mode === 'grid') {
        c.strokeStyle = def.colors[1]; c.lineWidth = 2;
        for (let i = 0; i <= S; i += 32) {
          c.beginPath(); c.moveTo(i, 0); c.lineTo(i, S); c.stroke();
          c.beginPath(); c.moveTo(0, i); c.lineTo(S, i); c.stroke();
        }
        c.fillStyle = def.colors[0];
        for (let i = 16; i < S; i += 64) for (let j = 16; j < S; j += 64) c.fillRect(i - 2, j - 2, 4, 4);
      } else if (def.mode === 'streak') {
        for (let i = 0; i < 65; i++) {
          c.strokeStyle = def.colors[Math.floor(r() * def.colors.length)];
          c.lineWidth = 1 + r() * 7;
          const x = r() * S - 60, y = r() * S;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60 + r() * 90, y - 25 - r() * 30); c.stroke();
        }
      } else if (def.mode === 'rust') {
        for (let i = 0; i < 190; i++) {
          c.fillStyle = def.colors[Math.floor(r() * def.colors.length)];
          c.globalAlpha = .2 + r() * .6;
          c.beginPath(); c.ellipse(r() * S, r() * S, 2 + r() * 14, 2 + r() * 10, r() * 3, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
      }

      if (def.mode !== 'grain' && def.mode !== 'carbon') {
        for (let i = 0; i < 34; i++) {
          c.strokeStyle = r() > .5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.17)';
          c.lineWidth = .5 + r();
          const x = r() * S, y = r() * S;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + r() * 40 - 20, y + r() * 8 - 4); c.stroke();
        }
      }
    }

    dt.update();
    dt.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    this.texCache[key] = dt;
    return dt;
  },

  uniformTexture(scene, hex, pattern) {
    const key = 'u_' + hex + '_' + (pattern || 'plain');
    if (this.texCache[key]) return this.texCache[key];
    const S = 256;
    const dt = new BABYLON.DynamicTexture('tex_' + key, { width: S, height: S }, scene, false);
    const c = dt.getContext();
    const r = this.rng(key);

    const camo = this.TEX[pattern];
    if (camo && camo.mode === 'camo') {
      this.camoPixels(c, S, camo.colors, camo.seed, true);
    } else {
      const dark = this.shade(hex, .68), light = this.shade(hex, 1.2), mid = this.shade(hex, .87);
      c.fillStyle = hex; c.fillRect(0, 0, S, S);
      if (pattern === 'digital') {
        for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x += 16) {
          const v = r();
          c.fillStyle = v > .78 ? light : v > .48 ? mid : v > .22 ? hex : dark;
          c.fillRect(x, y, 16, 16);
        }
      } else if (pattern === 'stripe') {
        for (let i = -S; i < S * 2; i += 26) {
          c.fillStyle = i % 52 === 0 ? light : dark;
          c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 16, 0); c.lineTo(i + 16 + S, S); c.lineTo(i + S, S); c.fill();
        }
      } else {
        c.fillStyle = mid; c.fillRect(18, 20, S - 36, 70); c.fillRect(18, 150, S - 36, 60);
        c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 2;
        c.setLineDash([5, 5]);
        c.strokeRect(18, 20, S - 36, 70); c.strokeRect(18, 150, S - 36, 60);
        c.setLineDash([]);
      }
      for (let i = 0; i < S; i += 3) {
        c.strokeStyle = 'rgba(0,0,0,.06)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(i, 0); c.lineTo(i, S); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.035)';
        c.beginPath(); c.moveTo(0, i); c.lineTo(S, i); c.stroke();
      }
    }

    dt.update();
    dt.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    this.texCache[key] = dt;
    return dt;
  },

  mat(scene, name, hex, kind, texture) {
    const m = new BABYLON.StandardMaterial(name, scene);
    if (texture) {
      m.diffuseTexture = texture;
      m.diffuseColor = new BABYLON.Color3(1, 1, 1);
    } else {
      m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    }
    if (kind === 'metal') {
      m.specularColor = new BABYLON.Color3(.8, .82, .86); m.specularPower = 72;
    } else if (kind === 'wood') {
      m.specularColor = new BABYLON.Color3(.14, .11, .08); m.specularPower = 16;
    } else if (kind === 'skin') {
      m.specularColor = new BABYLON.Color3(.16, .14, .13); m.specularPower = 24;
    } else {
      m.specularColor = new BABYLON.Color3(.28, .28, .3); m.specularPower = 40;
    }
    return m;
  },

  box(parent, name, w, h, d, x, y, z, mat, rot) {
    const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, parent.getScene());
    m.parent = parent; m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.material = mat; m.isPickable = false;
    return m;
  },

  // Boîtier à bords arrondis : somme d'un petit box et d'une sphère.
  // Les normales sont calculées à la main, donc pas de couture visible sur les arêtes.
  rbox(parent, name, w, h, d, x, y, z, mat, rot, radius) {
    const scene = parent.getScene();
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const r = Math.max(0.0005, Math.min(
      radius === undefined ? Math.min(hw, hh, hd) * 0.28 : radius,
      hw * 0.92, hh * 0.92, hd * 0.92));
    const ix = hw - r, iy = hh - r, iz = hd - r;
    const N = 6;
    const pos = [], nor = [], uv = [], idx = [];
    // Plus de points près des bords : l'arrondi reste net sans trop de triangles.
    const bend = (t) => t < 0 ? -bend(-t) : 1 - Math.pow(1 - t, 1.7);
    // Chaque face est orientée pour que u x v pointe vers l'extérieur.
    const faces = [
      { p: (u, v) => [ hw, u * hh, v * hd ] },
      { p: (u, v) => [-hw, v * hh, u * hd ] },
      { p: (u, v) => [ v * hw, hh, u * hd ] },
      { p: (u, v) => [ u * hw,-hh, v * hd ] },
      { p: (u, v) => [ u * hw, v * hh, hd ] },
      { p: (u, v) => [ v * hw, u * hh,-hd ] }
    ];
    for (const f of faces) {
      const base = pos.length / 3;
      for (let j = 0; j <= N; j++) {
        for (let i = 0; i <= N; i++) {
          const q = f.p(bend(-1 + 2 * i / N), bend(-1 + 2 * j / N));
          const cx = Math.max(-ix, Math.min(ix, q[0]));
          const cy = Math.max(-iy, Math.min(iy, q[1]));
          const cz = Math.max(-iz, Math.min(iz, q[2]));
          let nx = q[0] - cx, ny = q[1] - cy, nz = q[2] - cz;
          const len = Math.hypot(nx, ny, nz) || 1;
          nx /= len; ny /= len; nz /= len;
          pos.push(cx + nx * r, cy + ny * r, cz + nz * r);
          nor.push(nx, ny, nz);
          uv.push(i / N, j / N);
        }
      }
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 1, e = c + 1;
          idx.push(a, b, c, b, e, c);
        }
      }
    }
    const vd = new BABYLON.VertexData();
    vd.positions = pos; vd.normals = nor; vd.uvs = uv; vd.indices = idx;
    const m = new BABYLON.Mesh(name, scene);
    vd.applyToMesh(m, false);
    m.parent = parent; m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.material = mat; m.isPickable = false;
    return m;
  },

  cyl(parent, name, dTop, dBottom, h, x, y, z, mat, rot, tess) {
    const m = BABYLON.MeshBuilder.CreateCylinder(name, {
      diameterTop: dTop, diameterBottom: dBottom, height: h, tessellation: tess || 16
    }, parent.getScene());
    m.parent = parent; m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.material = mat; m.isPickable = false;
    return m;
  },

  ball(parent, name, d, x, y, z, mat, scaling) {
    const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter: d, segments: 12 }, parent.getScene());
    m.parent = parent; m.position.set(x, y, z);
    if (scaling) m.scaling.set(scaling[0], scaling[1], scaling[2]);
    m.material = mat; m.isPickable = false;
    return m;
  },

  ring(parent, name, d, thickness, x, y, z, mat, rot) {
    const m = BABYLON.MeshBuilder.CreateTorus(name, { diameter: d, thickness, tessellation: 16 }, parent.getScene());
    m.parent = parent; m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.material = mat; m.isPickable = false;
    return m;
  },

  /* ================================================================= */
  /*  ARMES                                                             */
  /* ================================================================= */
  weapon(scene, key, parent, scale, skinKey) {
    const root = new BABYLON.TransformNode('weapon_' + key, scene);
    root.parent = parent;
    root.scaling.setAll(scale || 1);
    root.skinKey = skinKey || 'standard';

    const skin = this.WEAPON_SKINS[skinKey] || this.WEAPON_SKINS.standard;
    const metalTex = this.texture(scene, skin.metal);
    const gripTex = this.texture(scene, skin.grip);
    const cache = {};
    const M = (n, c, k, tex) => cache[n] || (cache[n] = this.mat(scene, 'wm_' + key + '_' + n, c, k, tex));
    const steel = M('steel', '#535a64', 'metal', metalTex);
    const dark  = M('dark', '#262a31', 'metal');
    const black = M('black', '#1a1c21', 'metal');
    const wood  = M('wood', '#8a5f33', 'wood', gripTex);
    const brass = M('brass', '#b08a45', 'metal');
    const edge  = M('edge', '#b9c0c9', 'metal');

    if (key === 'rifle') {
      this.rbox(root, 'r_receiver', 0.13, 0.15, 0.50, 0, 0, 0.15, steel);
      this.rbox(root, 'r_upper', 0.135, 0.06, 0.52, 0, 0.09, 0.15, steel);
      this.rbox(root, 'r_ejection_port', 0.012, 0.065, 0.17, 0.069, 0.02, 0.22, black);
      this.rbox(root, 'r_charging', 0.035, 0.035, 0.06, 0.085, 0.075, 0.30, dark);
      this.ball(root, 'r_bolt_release', 0.03, 0.073, -0.02, 0.14, dark);
      this.rbox(root, 'r_handguard', 0.12, 0.12, 0.36, 0, 0.01, 0.56, steel);
      for (let i = 0; i < 6; i++) {
        this.rbox(root, 'r_rib' + i, 0.125, 0.012, 0.022, 0, 0.075, 0.42 + i * 0.055, dark);
      }
      this.rbox(root, 'r_foregrip', 0.085, 0.17, 0.10, 0, -0.14, 0.66, gripTex ? wood : dark);
      this.ring(root, 'r_sling_front', 0.07, 0.012, 0, -0.07, 0.70, dark, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'r_barrel', 0.045, 0.045, 0.52, 0, 0.01, 0.86, steel, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'r_muzzle', 0.07, 0.062, 0.09, 0, 0.01, 1.12, black, [Math.PI / 2, 0, 0]);
      this.rbox(root, 'r_stock', 0.11, 0.13, 0.34, 0, -0.02, -0.26, wood, [-0.04, 0, 0]);
      this.rbox(root, 'r_stock_hole', 0.115, 0.045, 0.09, 0, -0.02, -0.30, black);
      this.rbox(root, 'r_stock_plate', 0.12, 0.17, 0.03, 0, -0.03, -0.44, black);
      this.rbox(root, 'r_grip', 0.09, 0.21, 0.11, 0, -0.19, -0.02, wood, [0.22, 0, 0]);
      this.rbox(root, 'r_mag', 0.10, 0.26, 0.13, 0, -0.22, 0.28, steel, [-0.1, 0, 0]);
      this.rbox(root, 'r_mag_curve', 0.10, 0.10, 0.14, 0, -0.37, 0.33, steel, [-0.22, 0, 0]);
      this.ball(root, 'r_mag_release', 0.028, 0.07, -0.17, 0.31, black);
      this.ring(root, 'r_trigger', 0.11, 0.014, 0, -0.14, 0.09, steel, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'r_trigger_blade', 0.012, 0.012, 0.06, 0, -0.13, 0.09, brass, [Math.PI / 2, 0, 0]);
      this.rbox(root, 'r_rail', 0.11, 0.02, 0.44, 0, 0.13, 0.34, black);
      for (let i = 0; i < 9; i++) {
        this.rbox(root, 'r_tooth' + i, 0.115, 0.016, 0.012, 0, 0.145, 0.15 + i * 0.047, steel);
      }
      this.cyl(root, 'r_scope', 0.06, 0.06, 0.26, 0, 0.21, 0.36, black, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'r_scope_lens', 0.052, 0.052, 0.006, 0, 0.21, 0.50, edge, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'r_scope_knob', 0.05, 0.05, 0.025, 0, 0.25, 0.31, dark);
      this.cyl(root, 'r_scope_knob_side', 0.045, 0.045, 0.02, 0.04, 0.21, 0.38, dark, [0, 0, Math.PI / 2]);
      this.rbox(root, 'r_scope_mount1', 0.06, 0.06, 0.03, 0, 0.17, 0.28, steel);
      this.rbox(root, 'r_scope_mount2', 0.06, 0.06, 0.03, 0, 0.17, 0.45, steel);
      [[0.07, 0.04], [-0.07, 0.04], [0.07, -0.07], [-0.07, -0.07]].forEach((p, i) => {
        this.ball(root, 'r_screw' + i, 0.016, p[0], p[1], 0.10, brass);
      });

    } else if (key === 'pick') {
      this.cyl(root, 'pk_handle', 0.05, 0.06, 0.96, 0, 0, 0.34, wood, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'pk_grip', 0.058, 0.058, 0.22, 0, 0, -0.06, dark, [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 4; i++) {
        this.ring(root, 'pk_wrap' + i, 0.06, 0.006, 0, 0, -0.14 + i * 0.045, black, [Math.PI / 2, 0, 0]);
      }
      this.cyl(root, 'pk_ferrule', 0.068, 0.062, 0.10, 0, 0, 0.74, steel, [Math.PI / 2, 0, 0]);
      this.rbox(root, 'pk_head', 0.075, 0.075, 0.38, 0, 0, 0.84, steel);
      this.cyl(root, 'pk_tip_front', 0.006, 0.10, 0.34, 0, -0.17, 1.00, edge, [-0.45, 0, 0]);
      this.cyl(root, 'pk_tip_back', 0.006, 0.09, 0.28, 0, 0.15, 0.68, edge, [Math.PI + 0.4, 0, 0]);
      this.rbox(root, 'pk_bevel', 0.078, 0.012, 0.30, 0, -0.045, 0.86, edge);
      this.ring(root, 'pk_eye', 0.045, 0.008, 0, 0, 0.84, dark, [Math.PI / 2, 0, 0]);
      this.ball(root, 'pk_bolt1', 0.035, 0.05, 0, 0.84, dark);
      this.ball(root, 'pk_bolt2', 0.035, -0.05, 0, 0.84, dark);

    } else if (key === 'shovel') {
      this.cyl(root, 'sh_handle', 0.05, 0.055, 0.94, 0, 0, 0.30, wood, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'sh_grip', 0.06, 0.06, 0.20, 0, 0, -0.08, dark, [Math.PI / 2, 0, 0]);
      this.ring(root, 'sh_cap', 0.062, 0.008, 0, 0, -0.18, black, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'sh_socket', 0.075, 0.062, 0.16, 0, 0, 0.72, steel, [Math.PI / 2, 0, 0]);
      this.rbox(root, 'sh_neck', 0.09, 0.12, 0.18, 0, -0.02, 0.84, steel);
      this.rbox(root, 'sh_blade', 0.27, 0.30, 0.035, 0, -0.11, 1.02, steel);
      this.rbox(root, 'sh_curve', 0.27, 0.08, 0.10, 0, -0.26, 0.99, steel, [-0.35, 0, 0]);
      this.rbox(root, 'sh_edge', 0.28, 0.025, 0.055, 0, -0.29, 1.01, edge);
      this.rbox(root, 'sh_rib1', 0.025, 0.22, 0.045, -0.07, -0.10, 1.045, dark);
      this.rbox(root, 'sh_rib2', 0.025, 0.22, 0.045, 0.07, -0.10, 1.045, dark);
      this.rbox(root, 'sh_spine', 0.03, 0.24, 0.05, 0, -0.10, 1.06, steel);

    } else { // pistolet
      this.rbox(root, 'p_slide', 0.12, 0.10, 0.42, 0, 0.045, 0.10, steel);
      this.rbox(root, 'p_slide_top', 0.115, 0.018, 0.40, 0, 0.102, 0.10, dark);
      this.rbox(root, 'p_ejection', 0.012, 0.045, 0.11, 0.062, 0.055, 0.16, black);
      for (let i = 0; i < 5; i++) {
        this.rbox(root, 'p_serration_l' + i, 0.008, 0.07, 0.012, -0.061, 0.05, -0.05 + i * 0.022, dark);
        this.rbox(root, 'p_serration_r' + i, 0.008, 0.07, 0.012, 0.061, 0.05, -0.05 + i * 0.022, dark);
      }
      this.rbox(root, 'p_frame', 0.11, 0.08, 0.30, 0, -0.035, 0.06, dark);
      this.cyl(root, 'p_barrel', 0.05, 0.05, 0.14, 0, 0.015, 0.33, black, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'p_muzzle', 0.062, 0.062, 0.02, 0, 0.015, 0.41, steel, [Math.PI / 2, 0, 0]);
      this.rbox(root, 'p_grip', 0.10, 0.23, 0.12, 0, -0.21, -0.04, wood, [0.28, 0, 0]);
      this.rbox(root, 'p_grip_panel', 0.104, 0.16, 0.124, 0, -0.21, -0.04, dark, [0.28, 0, 0]);
      for (let i = 0; i < 4; i++) {
        this.rbox(root, 'p_grip_line' + i, 0.106, 0.008, 0.126, 0, -0.16 - i * 0.035, -0.04, black, [0.28, 0, 0]);
      }
      this.ring(root, 'p_lanyard', 0.035, 0.008, 0, -0.34, -0.09, dark, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'p_hammer', 0.03, 0.04, 0.05, 0, 0.075, -0.15, dark);
      this.rbox(root, 'p_beavertail', 0.10, 0.02, 0.09, 0, 0.015, -0.13, steel);
      this.ring(root, 'p_guard', 0.11, 0.013, 0, -0.12, 0.10, steel, [Math.PI / 2, 0, 0]);
      this.cyl(root, 'p_trigger', 0.012, 0.012, 0.055, 0, -0.11, 0.09, brass, [Math.PI / 2, 0, 0]);
      this.rbox(root, 'p_front_sight', 0.016, 0.035, 0.02, 0, 0.125, 0.28, dark);
      this.rbox(root, 'p_rear_sight', 0.075, 0.028, 0.02, 0, 0.12, -0.06, dark);
      this.rbox(root, 'p_mag_base', 0.11, 0.028, 0.13, 0, -0.33, -0.04, steel, [0.28, 0, 0]);
    }

    if (key === 'pick' || key === 'shovel') brass.dispose();
    if (key === 'pistol') edge.dispose();

    return root;
  },

  /* ================================================================= */
  /*  PERSONNAGES                                                       */
  /* ================================================================= */
  character(scene, opts) {
    opts = opts || {};
    const id = opts.id || ('c' + Math.floor(Math.random() * 9999));
    const color = opts.color || '#b5651d';
    const tone = opts.tone || '#d3a17a';
    const gear = opts.gear || '#39414e';
    const pattern = opts.pattern || 'plain';

    const root = new BABYLON.TransformNode('char_' + id, scene);
    const body = new BABYLON.TransformNode('body_' + id, scene);
    body.parent = root;

    const M = (n, c, k, tex) => this.mat(scene, 'cm_' + id + '_' + n, c, k, tex);
    const uniform = M('uniform', color, 'cloth', this.uniformTexture(scene, color, pattern));
    const gearMat = M('gear', gear, 'cloth', this.uniformTexture(scene, gear, pattern));
    const skin = M('skin', tone, 'skin');
    const dark = M('dark', '#20242b', 'cloth');
    const metal = M('metal', '#4b5058', 'metal');
    const boot = M('boot', '#17191d', 'cloth');
    const eye = M('eye', '#121418', 'cloth');

    this.box(body, 'c_torso', 0.50, 0.60, 0.30, 0, 1.16, 0, uniform);
    this.box(body, 'c_shoulders', 0.68, 0.18, 0.32, 0, 1.42, 0, uniform);
    this.box(body, 'c_vest', 0.54, 0.46, 0.34, 0, 1.18, 0.01, gearMat);
    this.box(body, 'c_pocket_l', 0.17, 0.15, 0.06, -0.15, 1.22, 0.19, dark);
    this.box(body, 'c_pocket_r', 0.17, 0.15, 0.06, 0.15, 1.22, 0.19, dark);
    this.box(body, 'c_pocket_b', 0.20, 0.12, 0.06, 0, 1.00, 0.19, dark);
    this.box(body, 'c_belt', 0.53, 0.07, 0.33, 0, 0.90, 0, dark);
    this.box(body, 'c_buckle', 0.10, 0.07, 0.35, 0, 0.90, 0, metal);
    this.cyl(body, 'c_neck', 0.13, 0.14, 0.14, 0, 1.53, 0, skin);

    const head = this.ball(body, 'c_head', 0.36, 0, 1.73, 0, skin, [1, 1.08, 0.95]);
    this.box(body, 'c_jaw', 0.22, 0.10, 0.20, 0, 1.61, 0.05, skin);
    this.ball(body, 'c_nose', 0.055, 0, 1.72, 0.19, skin, [0.7, 1, 1.2]);
    this.ball(body, 'c_eye_l', 0.035, -0.075, 1.77, 0.175, eye);
    this.ball(body, 'c_eye_r', 0.035, 0.075, 1.77, 0.175, eye);
    const helmet = this.ball(body, 'c_helmet', 0.42, 0, 1.82, -0.01, gearMat, [1.02, 0.72, 1.05]);
    this.box(body, 'c_helmet_brim', 0.42, 0.035, 0.14, 0, 1.81, 0.19, gearMat);
    this.box(body, 'c_helmet_strap_l', 0.03, 0.18, 0.03, -0.16, 1.65, 0.06, dark);
    this.box(body, 'c_helmet_strap_r', 0.03, 0.18, 0.03, 0.16, 1.65, 0.06, dark);
    this.box(body, 'c_ear_l', 0.05, 0.10, 0.07, -0.19, 1.72, 0, skin);
    this.box(body, 'c_ear_r', 0.05, 0.10, 0.07, 0.19, 1.72, 0, skin);

    const arm = (side) => {
      const s = side === 'l' ? -1 : 1;
      const shoulder = new BABYLON.TransformNode('arm_' + side + '_' + id, scene);
      shoulder.parent = body; shoulder.position.set(s * 0.39, 1.42, 0);
      this.ball(shoulder, 'c_pad_' + side, 0.22, 0, -0.04, 0, uniform, [1, 0.8, 1]);
      this.cyl(shoulder, 'c_upper_' + side, 0.13, 0.15, 0.40, 0, -0.24, 0, uniform);
      const elbow = new BABYLON.TransformNode('elbow_' + side + '_' + id, scene);
      elbow.parent = shoulder; elbow.position.set(0, -0.46, 0);
      this.ball(elbow, 'c_elbow_' + side, 0.13, 0, 0, 0, dark);
      this.cyl(elbow, 'c_fore_' + side, 0.11, 0.13, 0.36, 0, -0.20, 0, skin);
      this.box(elbow, 'c_glove_' + side, 0.12, 0.13, 0.12, 0, -0.38, 0, dark);
      const hand = new BABYLON.TransformNode('hand_' + side + '_' + id, scene);
      hand.parent = elbow; hand.position.set(0, -0.42, 0);
      return { shoulder, elbow, hand };
    };
    const leftArm = arm('l');
    const rightArm = arm('r');

    const leg = (side) => {
      const s = side === 'l' ? -1 : 1;
      const hip = new BABYLON.TransformNode('leg_' + side + '_' + id, scene);
      hip.parent = body; hip.position.set(s * 0.16, 0.88, 0);
      this.cyl(hip, 'c_thigh_' + side, 0.18, 0.20, 0.44, 0, -0.23, 0, gearMat);
      const knee = new BABYLON.TransformNode('knee_' + side + '_' + id, scene);
      knee.parent = hip; knee.position.set(0, -0.46, 0);
      this.ball(knee, 'c_knee_' + side, 0.17, 0, 0, 0, dark);
      this.cyl(knee, 'c_shin_' + side, 0.14, 0.16, 0.38, 0, -0.21, 0, gearMat);
      this.box(knee, 'c_boot_' + side, 0.17, 0.16, 0.30, 0, -0.44, 0.05, boot);
      this.box(knee, 'c_toe_' + side, 0.17, 0.08, 0.12, 0, -0.49, 0.19, dark);
      return { hip, knee };
    };
    const leftLeg = leg('l');
    const rightLeg = leg('r');

    let held = null;
    if (opts.weapon) held = this.weapon(scene, opts.weapon, rightArm.hand, 0.34, opts.weaponSkin);

    return {
      id, root, body, head, helmet,
      torso: body.getChildMeshes().find(m => m.name === 'c_torso') || head,
      chestMat: uniform, helmetMat: gearMat,
      leftArm: leftArm.shoulder, rightArm: rightArm.shoulder,
      leftLeg: leftLeg.hip, rightLeg: rightLeg.hip,
      leftElbow: leftArm.elbow, rightElbow: rightArm.elbow,
      rightHand: rightArm.hand, held,
      phase: Math.random() * Math.PI * 2
    };
  },

  applySkin(scene, rig, skin) {
    if (!rig || !skin) return;
    rig.chestMat.diffuseTexture = this.uniformTexture(scene, skin.color, skin.pattern || 'plain');
    rig.chestMat.diffuseColor = BABYLON.Color3.White();
    rig.helmetMat.diffuseTexture = this.uniformTexture(scene, skin.gear || skin.color, skin.pattern || 'plain');
    rig.helmetMat.diffuseColor = BABYLON.Color3.White();
  },

  // Babylon ne libère pas les matériaux des enfants d'un TransformNode tout seul.
  // Les textures sont gardées en cache et partagées : on ne les détruit donc pas ici.
  dispose(node) {
    if (!node) return;
    const mats = new Set();
    node.getChildMeshes().forEach(m => { if (m.material) mats.add(m.material); });
    node.dispose(false, false);
    mats.forEach(m => m.dispose(true, false));
  },

  setHeldWeapon(scene, rig, key, skinKey) {
    if (rig.held) this.dispose(rig.held);
    rig.held = key ? this.weapon(scene, key, rig.rightHand, 0.34, skinKey || rig.heldSkin || 'standard') : null;
    rig.heldSkin = skinKey || rig.heldSkin || 'standard';
  },

  animate(rig, t, moving) {
    if (!rig || !rig.body) return;
    const p = rig.phase;
    const s = Math.sin(t * 0.010 + p);
    const amp = moving ? 0.62 : 0.03;
    rig.leftLeg.rotation.x = s * amp;
    rig.rightLeg.rotation.x = -s * amp;
    rig.leftLeg.rotation.z = moving ? 0.045 : 0;
    rig.rightLeg.rotation.z = moving ? -0.045 : 0;
    rig.leftArm.rotation.x = -s * amp * 0.65;
    rig.rightArm.rotation.x = s * amp * 0.35;
    rig.leftArm.rotation.z = moving ? -0.08 : 0;
    rig.leftElbow.rotation.x = moving ? -0.35 - Math.max(0, s) * 0.2 : -0.25;
    rig.rightElbow.rotation.x = -0.55 + (moving ? Math.max(0, -s) * 0.08 : 0);
    rig.body.rotation.z = moving ? Math.sin(t * 0.005 + p) * 0.035 : Math.sin(t * 0.0012 + p) * 0.01;
    rig.body.rotation.x = moving ? 0.05 : Math.sin(t * 0.0016 + p) * 0.012;
    rig.body.scaling.y = 1 + Math.sin(t * 0.0021 + p) * 0.008;
    rig.body.position.y = moving
      ? Math.abs(Math.sin(t * 0.010 + p)) * 0.038
      : Math.sin(t * 0.0022 + p) * 0.007;
  }
};
