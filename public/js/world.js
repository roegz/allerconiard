/** Monde Babylon.js : scène, map, joueurs distants, PNJ, quêtes, skins. */
const World = {
  engine: null,
  scene: null,
  camera: null,
  canvas: null,
  ground: null,
  dynamicRoot: null,
  remotePlayers: new Map(),
  npcs: [],

  SKINS: {
    default:  { name: 'Coniard',   color: '#b5651d', unlock: 0 },
    swat:     { name: 'SWAT',      color: '#2f3a4a', unlock: 0 },
    desert:   { name: 'Désert',    color: '#c2a15a', unlock: 50 },
    neon:     { name: 'Néon',      color: '#00e5ff', unlock: 100 },
    gold:     { name: 'Or massif', color: '#ffd700', unlock: 250 },
    phantom:  { name: 'Fantôme',   color: '#8b5cf6', unlock: 500 }
  },

  QUESTS: [
    { id: 'first_blood', title: 'Premier sang', desc: 'Toucher un autre joueur', goal: 1, reward: 50 },
    { id: 'explorer', title: 'Explorateur', desc: 'Visiter la zone du container', goal: 1, reward: 50 },
    { id: 'builder', title: 'Architecte', desc: 'Poser 5 objets dans l’éditeur', goal: 5, reward: 100 },
    { id: 'talker', title: 'Diplomate', desc: 'Parler au PNJ du garage', goal: 1, reward: 50 }
  ],

  init(canvas) {
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(this.engine);
    this.scene = scene;

    scene.clearColor = new BABYLON.Color4(0.055, 0.07, 0.10, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.008;
    scene.fogColor = new BABYLON.Color3(0.055, 0.07, 0.10);

    this.camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 1.7, 20), scene);
    this.camera.speed = 0.32;
    this.camera.inertia = 0.6;
    this.camera.angularSensibility = 1800;
    this.camera.minZ = 0.05;
    // Codes physiques AZERTY : la touche "Z" = KeyW, "Q" = KeyA, "S" = KeyS, "D" = KeyD
    this.camera.keysUp = [87]; this.camera.keysDown = [83];
    this.camera.keysLeft = [65]; this.camera.keysRight = [68];
    this.camera.checkCollisions = true;
    this.camera.ellipsoid = new BABYLON.Vector3(0.4, 0.85, 0.4);
    this.camera.applyGravity = false;
    scene.activeCamera = this.camera;
    // ⚠️ Sans attachControl, aucun input clavier/souris n'est traité
    this.camera.attachControl(canvas, true);
    this.camera.setTarget(new BABYLON.Vector3(0, 1.7, 0));
    this.controlsEnabled = false;

    // Le focus du canvas n'est pas garanti (bouton du menu, clic dans le HUD…).
    // On relaie donc aussi les touches reçues par window vers l'input Babylon.
    const kb = this.camera.inputs.attached.keyboard;
    if (kb) {
      window.addEventListener('keydown', (e) => {
        if (!this.controlsEnabled || !kb._keys) return;
        if (kb._keys.indexOf(e.keyCode) === -1) kb._keys.push(e.keyCode);
      });
      window.addEventListener('keyup', (e) => {
        if (!kb._keys) return;
        const i = kb._keys.indexOf(e.keyCode);
        if (i !== -1) kb._keys.splice(i, 1);
      });
      window.addEventListener('blur', () => { if (kb._keys) kb._keys.length = 0; });
    }

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.55;
    hemi.diffuse = new BABYLON.Color3(0.75, 0.82, 1);
    hemi.groundColor = new BABYLON.Color3(0.16, 0.13, 0.10);

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.3), scene);
    sun.intensity = 1.1;
    sun.diffuse = new BABYLON.Color3(1, 0.9, 0.75);

    const shadow = new BABYLON.ShadowGenerator(1024, sun);
    shadow.useBlurExponentialShadowMap = true;
    this.shadow = shadow;

    this.buildBaseMap();
    this.spawnNPC('Le Forgeron', { x: 16, y: 0, z: 6 }, '#f0a64a', 'forge');
    this.spawnNPC('Chef de patrouille', { x: -10, y: 0, z: -19 }, '#6ee7a0', 'patrol');

    this.dynamicRoot = new BABYLON.TransformNode('dynamic', scene);

    scene.onBeforeRenderObservable.add(() => this.onFrame());
    window.addEventListener('resize', () => this.engine.resize());

    return scene;
  },

  /** Active/désactive les contrôles caméra (éditeur, chat, dialogue). */
  controls(on) {
    if (!this.camera) return;
    this.controlsEnabled = !!on;
    if (on) this.camera.attachControl(this.canvas, true);
    else this.camera.detachControl();
  },

  mat(name, hex, rough = 0.7) {
    const c = BABYLON.Color3.FromHexString(hex);
    const m = new BABYLON.StandardMaterial(name, this.scene);
    m.diffuseColor = c;
    m.specularColor = new BABYLON.Color3(rough * 0.25, rough * 0.25, rough * 0.25);
    return m;
  },

  box(name, opts) {
    const b = BABYLON.MeshBuilder.CreateBox(name, {
      width: opts.w || 1, height: opts.h || 1, depth: opts.d || 1
    }, this.scene);
    b.position = new BABYLON.Vector3(opts.x || 0, opts.y || 0, opts.z || 0);
    if (opts.color) b.material = this.mat(name + '_m', opts.color, opts.rough);
    if (opts.rotation) b.rotation.y = opts.rotation;
    b.checkCollisions = opts.collide !== false;
    if (opts.shadow !== false && this.shadow) this.shadow.addShadowCaster(b);
    b.receiveShadows = true;
    return b;
  },

  buildBaseMap() {
    const scene = this.scene;

    // ---- Sol avec grille ----
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, scene);
    const gm = this.mat('ground_m', '#3a3b3d', 0.2);
    const grid = new BABYLON.DynamicTexture('grid', 1024, scene, false);
    const ctx = grid.getContext();
    ctx.fillStyle = '#3a3b3d'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#2a2b2d'; ctx.lineWidth = 2;
    for (let i = 0; i <= 1024; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }
    grid.update();
    gm.diffuseTexture = grid;
    ground.material = gm;
    ground.checkCollisions = true;
    ground.receiveShadows = true;
    this.ground = ground;

    // ---- Murs d'enceinte ----
    const wall = '#6b6357';
    this.box('wall_n', { w: 60, h: 4, d: 1, x: 0, y: 2, z: 30, color: wall });
    this.box('wall_s', { w: 60, h: 4, d: 1, x: 0, y: 2, z: -30, color: wall });
    this.box('wall_e', { w: 1, h: 4, d: 60, x: 30, y: 2, z: 0, color: wall });
    this.box('wall_w', { w: 1, h: 4, d: 60, x: -30, y: 2, z: 0, color: wall });

    // ---- Zones de spawn colorées ----
    this.zone('zone_ct', 14, 10, -21, '#2f5fa8');
    this.zone('zone_t', 14, 10, 21, '#b5651d');

    // ---- Bâtiment central "Aviation" (avec porte + toit) ----
    const B = '#8a8172';
    this.box('av_n', { w: 14, h: 6, d: 0.6, x: 0, y: 3, z: -7, color: B });
    this.box('av_s1', { w: 5, h: 6, d: 0.6, x: -4.5, y: 3, z: 3, color: B });
    this.box('av_s2', { w: 5, h: 6, d: 0.6, x: 4.5, y: 3, z: 3, color: B });
    this.box('av_s3', { w: 4, h: 2, d: 0.6, x: 0, y: 5, z: 3, color: B });
    this.box('av_e', { w: 0.6, h: 6, d: 10, x: 7, y: 3, z: -2, color: B });
    this.box('av_w', { w: 0.6, h: 6, d: 10, x: -7, y: 3, z: -2, color: B });
    this.box('av_roof', { w: 15, h: 0.5, d: 11, x: 0, y: 6.25, z: -2, color: '#4a453e' });
    this.box('av_band', { w: 14.3, h: 0.5, d: 10.3, x: 0, y: 3.3, z: -2,
      color: '#b5651d', collide: false, shadow: false });

    // ---- Escalier pour monter sur le toit ----
    for (let i = 0; i < 6; i++) {
      const h = i + 1;
      this.box('step' + i, { w: 3, h: h, d: 1.6, x: 9, y: h / 2, z: 9 - i * 1.8, color: '#7d7466' });
    }

    // ---- Tour ouest + passerelle ----
    this.box('tower', { w: 6, h: 7, d: 6, x: -18, y: 3.5, z: -2, color: '#6d6559' });
    this.box('bridge', { w: 11, h: 0.4, d: 2.4, x: -11.5, y: 7.2, z: -2, color: '#5a5349' });

    // ---- Zone containers (quête Explorateur) ----
    this.box('cont1', { w: 8, h: 2.8, d: 3, x: -17, y: 1.4, z: 12, color: '#2e6b6b' });
    this.box('cont2', { w: 8, h: 2.8, d: 3, x: -17, y: 4.2, z: 12, color: '#8a4a3a' });
    this.box('cont3', { w: 6, h: 2.8, d: 3, x: -8, y: 1.4, z: 14, color: '#b5651d', rotation: 0.2 });

    // ---- Garage RP (PNJ Forgeron) ----
    this.box('garage_back', { w: 9, h: 3.5, d: 0.5, x: 16, y: 1.75, z: 10, color: '#555b66' });
    this.box('garage_e', { w: 0.5, h: 3.5, d: 8, x: 20.5, y: 1.75, z: 6, color: '#555b66' });
    this.box('garage_w', { w: 0.5, h: 3.5, d: 8, x: 11.5, y: 1.75, z: 6, color: '#555b66' });
    this.box('garage_roof', { w: 10, h: 0.4, d: 9, x: 16, y: 3.7, z: 6, color: '#3b414c' });
    this.box('garage_door', { w: 6, h: 1, d: 0.3, x: 16, y: 3.1, z: 2, color: '#2a2f38', collide: false });
    this.box('workbench', { w: 4, h: 1, d: 1.2, x: 16, y: 0.5, z: 8, color: '#6b4f2a' });

    // ---- Caisses & couvertures ----
    [[-5, 1, 15], [-3, 1, 15], [-4, 3, 15], [11, 1, -14], [13, 1, -14],
     [12, 1, 12], [-11, 1, 6], [6, 1, 18]].forEach((p, i) => {
      this.box('crate' + i, { w: 2, h: 2, d: 2, x: p[0], y: p[1], z: p[2], color: '#8a6b3f' });
    });
    [[-10, -8], [10, -8], [-10, 8], [10, 8], [0, 16]].forEach((p, i) => {
      this.box('cover' + i, { w: 3, h: 1.2, d: 0.8, x: p[0], y: 0.6, z: p[1], color: '#6b6357' });
    });

    // ---- Lampadaires ----
    [[-10, -10], [10, -10], [-10, 10], [10, 10], [0, 0]].forEach((p, i) => this.lamp(p[0], p[1], i));

    // ---- Enseigne ----
    this.sign();

    // ---- Décor : terre du parking ----
    const soil = BABYLON.MeshBuilder.CreateGround('soil', { width: 14, height: 10 }, scene);
    soil.position.set(16, 0.02, -14);
    soil.material = this.mat('soil_m', '#4a3a2a', 0.1);
    soil.checkCollisions = false;
    soil.receiveShadows = true;
  },

  zone(name, w, d, z, hex) {
    const m = BABYLON.MeshBuilder.CreateGround(name, { width: w, height: d }, this.scene);
    m.position.set(0, 0.03, z);
    m.material = this.mat(name + '_m', hex, 0.1);
    m.checkCollisions = false;
    m.receiveShadows = true;
    return m;
  },

  lamp(x, z, i) {
    this.box('lamp_pole' + i, { w: 0.18, h: 5, d: 0.18, x, y: 2.5, z, color: '#33363d', shadow: false });
    const bulb = BABYLON.MeshBuilder.CreateSphere('lamp_bulb' + i, { diameter: 0.45 }, this.scene);
    bulb.position.set(x, 5.1, z);
    bulb.material = this.mat('lamp_bulb_m' + i, '#ffe0a0');
    bulb.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0.45);
    const light = new BABYLON.PointLight('lamp_light' + i, bulb.position, this.scene);
    light.diffuse = new BABYLON.Color3(1, 0.82, 0.55);
    light.intensity = 0.45;
    light.range = 14;
  },

  sign() {
    const s = BABYLON.MeshBuilder.CreatePlane('sign', { width: 12, height: 3 }, this.scene);
    s.position.set(0, 9, -2);
    s.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const dt = new BABYLON.DynamicTexture('sign_tex', { width: 1024, height: 256 }, this.scene, false);
    const c = dt.getContext();
    c.fillStyle = 'rgba(10,12,18,0.85)'; c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = '#f0a64a'; c.lineWidth = 8; c.strokeRect(8, 8, 1008, 240);
    c.fillStyle = '#f0a64a'; c.font = 'bold 100px sans-serif'; c.textAlign = 'center';
    c.fillText('ALLERCONIARD', 512, 130);
    c.fillStyle = '#cfd6e6'; c.font = 'bold 42px sans-serif';
    c.fillText('par robotbot', 512, 205);
    dt.update();
    const m = new BABYLON.StandardMaterial('sign_m', this.scene);
    m.diffuseTexture = dt; m.emissiveTexture = dt; m.opacityTexture = dt; m.disableLighting = true;
    s.material = m;
  },

  spawnNPC(name, pos, color, kind) {
    const body = this.box('npc_' + kind, { w: 0.9, h: 1.7, d: 0.6, x: pos.x, y: 1.1, z: pos.z, color, collide: false, shadow: false });
    const head = BABYLON.MeshBuilder.CreateSphere('npc_head_' + kind, { diameter: 0.55 }, this.scene);
    head.position.set(pos.x, 2.2, pos.z);
    head.material = this.mat('npc_head_m_' + kind, '#d7a97c');
    const tag = BABYLON.MeshBuilder.CreatePlane('tag_' + kind, { width: 3, height: 0.7 }, this.scene);
    tag.position.set(pos.x, 3, pos.z);
    tag.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const dt = new BABYLON.DynamicTexture('tagtex_' + kind, { width: 512, height: 128 }, this.scene, false);
    const c = dt.getContext();
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#f0a64a'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center';
    c.fillText(name, 256, 80);
    dt.update();
    const tm = new BABYLON.StandardMaterial('tagm_' + kind, this.scene);
    tm.diffuseTexture = dt; tm.emissiveTexture = dt; tm.opacityTexture = dt; tm.disableLighting = true;
    tag.material = tm;
    this.npcs.push({ name, kind, pos, meshes: [body, head, tag] });
  },

  makePlayerMesh(id, skinKey) {
    const skin = this.SKINS[skinKey] || this.SKINS.default;
    const root = new BABYLON.TransformNode('remote_' + id, this.scene);
    const body = BABYLON.MeshBuilder.CreateBox('body_' + id, { width: 0.9, height: 1.5, depth: 0.55 }, this.scene);
    body.position.y = 1.0; body.parent = root;
    body.material = this.mat('bodym_' + id, skin.color);
    const head = BABYLON.MeshBuilder.CreateSphere('head_' + id, { diameter: 0.5 }, this.scene);
    head.position.y = 2.05; head.parent = root;
    head.material = this.mat('headm_' + id, '#d7a97c');
    const gun = BABYLON.MeshBuilder.CreateBox('gun_' + id, { width: 0.12, height: 0.12, depth: 0.8 }, this.scene);
    gun.position.set(0.4, 1.25, 0.4); gun.parent = root;
    gun.material = this.mat('gunm_' + id, '#22252c');
    return { root, body, head, gun, skinKey };
  },

  syncRemote(id, data) {
    let obj = this.remotePlayers.get(id);
    if (!obj) {
      obj = this.makePlayerMesh(id, data.skin);
      this.remotePlayers.set(id, obj);
    }
    if (obj.skinKey !== data.skin) {
      obj.body.material = this.mat('bodym_' + id, (this.SKINS[data.skin] || this.SKINS.default).color);
      obj.skinKey = data.skin;
    }
    if (data.pos) obj.root.position.set(data.pos.x, data.pos.y || 0, data.pos.z);
    if (typeof data.rot === 'number') obj.root.rotation.y = data.rot;
  },

  removeRemote(id) {
    const obj = this.remotePlayers.get(id);
    if (obj) {
      obj.root.dispose(false, true);
      this.remotePlayers.delete(id);
    }
  },

  muzzleFlash(pos, dir) {
    const flash = BABYLON.MeshBuilder.CreateSphere('flash', { diameter: 0.35 }, this.scene);
    flash.position.copyFrom(pos);
    flash.material = this.mat('flashm', '#fff2b0');
    flash.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
    setTimeout(() => flash.dispose(), 70);

    // tracer
    const end = pos.add(dir.scale(30));
    const tracer = BABYLON.MeshBuilder.CreateLines('tracer', { points: [pos, end] }, this.scene);
    tracer.color = new BABYLON.Color3(1, 0.75, 0.25);
    setTimeout(() => tracer.dispose(), 90);
  },

  onFrame() {
    // Garde-fou : reste à hauteur humaine même en regardant vers le bas
    const p = this.camera.position;
    if (p.y < 1.3) p.y = 1.3;
    if (p.y > 12) p.y = 12;
  },

  render() { this.engine.runRenderLoop(() => this.scene.render()); }
};
