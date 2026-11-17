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

    this.camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 1.7, 8), scene);
    this.camera.speed = 0.18;
    this.camera.angularSensibility = 2200;
    this.camera.minZ = 0.05;
    this.camera.keysUp = [87]; this.camera.keysDown = [83];
    this.camera.keysLeft = [65]; this.camera.keysRight = [68];
    this.camera.checkCollisions = true;
    this.camera.ellipsoid = new BABYLON.Vector3(0.4, 0.85, 0.4);
    this.camera.applyGravity = false;
    scene.activeCamera = this.camera;

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
    this.spawnNPC('Le Forgeron', { x: 6, y: 0, z: 2 }, '#f0a64a', 'forge');
    this.spawnNPC('Chef de patrouille', { x: -8, y: 0, z: -6 }, '#6ee7a0', 'patrol');

    this.dynamicRoot = new BABYLON.TransformNode('dynamic', scene);

    scene.onBeforeRenderObservable.add(() => this.onFrame());
    window.addEventListener('resize', () => this.engine.resize());

    return scene;
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
    // Sol
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, this.scene);
    const gm = this.mat('ground_m', '#3a3b3d', 0.2);
    const grid = new BABYLON.DynamicTexture('grid', 1024, this.scene, false);
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

    // Contour murs
    const wall = '#6b6357';
    this.box('wall_n', { w: 60, h: 4, d: 1, x: 0, y: 2, z: 30, color: wall });
    this.box('wall_s', { w: 60, h: 4, d: 1, x: 0, y: 2, z: -30, color: wall });
    this.box('wall_e', { w: 1, h: 4, d: 60, x: 30, y: 2, z: 0, color: wall });
    this.box('wall_w', { w: 1, h: 4, d: 60, x: -30, y: 2, z: 0, color: wall });

    // Bâtiment central (deux étages Aviation, référence au lycée)
    this.box('batiment', { w: 14, h: 6, d: 10, x: 0, y: 3, z: -12, color: '#8a8172' });
    this.box('batiment_band', { w: 14.2, h: 0.6, d: 10.2, x: 0, y: 3.2, z: -12, color: '#b5651d', collide: false });
    this.box('toit', { w: 15, h: 0.4, d: 11, x: 0, y: 6.2, z: -12, color: '#4a453e' });

    // Container (zone d'exploration)
    this.box('container', { w: 8, h: 2.8, d: 3, x: -16, y: 1.4, z: 10, color: '#2e6b6b' });
    this.box('container2', { w: 8, h: 2.8, d: 3, x: -16, y: 4.1, z: 10, color: '#8a4a3a' });

    // Garage / RP
    this.box('garage', { w: 9, h: 3.5, d: 7, x: 14, y: 1.75, z: 6, color: '#555b66' });
    this.box('garage_door', { w: 5, h: 2.6, d: 0.2, x: 14, y: 1.3, z: 2.45, color: '#2a2f38', collide: false });

    // Caisses
    [[-6, 1, 12], [-4, 1, 12], [-5, 3, 12], [10, 1, -14], [12, 1, -14]].forEach((p, i) => {
      this.box('crate' + i, { w: 2, h: 2, d: 2, x: p[0], y: p[1], z: p[2], color: '#8a6b3f' });
    });

    // Terre / décor
    const soil = BABYLON.MeshBuilder.CreateGround('soil', { width: 14, height: 10 }, this.scene);
    soil.position.set(16, 0.02, -14);
    soil.material = this.mat('soil_m', '#4a3a2a', 0.1);
    soil.receiveShadows = true;
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
    // rien de coûteux ici ; la logique de tir est dans Game
  },

  render() { this.engine.runRenderLoop(() => this.scene.render()); }
};
