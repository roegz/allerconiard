/* Allerconiard - monde, maps, saut, armes et joueurs.
   Fait main par robotbot. Pas de magie, juste Babylon et un peu de café. */
const World = {
  engine: null,
  scene: null,
  camera: null,
  canvas: null,
  ground: null,
  mapRoot: null,
  remotePlayers: new Map(),
  npcs: [],

  currentMap: 'allerconia',
  controlsEnabled: false,
  baseSpeed: 0.80,
  shift: false,
  jumpVel: 0,
  grounded: true,
  eyeHeight: 1.7,
  viewRoot: null,
  recoil: 0,
  viewPhase: 0,
  viewLastPos: null,
  viewLastRotY: 0,
  viewSwayX: 0,
  viewSwayY: 0,
  reloadT: 0,
  switchT: 0,
  viewKey: 'pistol',
  trickT: 0,
  trickType: 'gun',
  trickCool: 0,
  showT: 0,
  showType: 'gun',
  slideT: 0,
  slideCool: 0,
  airJumps: 1,
  shakeT: 0,
  baseFov: 0.8,
  grenades: [],
  particles: [],
  pickups: [],
  sparkMat: null,
  smokeMat: null,
  dustMat: null,
  boomMat: null,
  ssao: null,
  bumpTex: null,
  groundBump: null,
  qualityTimer: 0,

  MAPS: {
    allerconia: {
      name: 'Allerconia',
      label: 'La ville',
      desc: 'Le bâtiment, les containers, le garage. Le terrain de jeu d’origine.',
      spawn: { x: 2, y: 1.7, z: 24 },
      look: { x: 0, y: 2, z: -2 },
      sky: '#33465a',
      fog: '#b7a68c',
      density: 0.005,
      teamSpawns: {
        T:  { x: 0, y: 1.7, z: 24 },
        CT: { x: 0, y: 1.7, z: -24 }
      },
      sites: [
        { id: 'A', x: -14, z: -12, r: 2.8 },
        { id: 'B', x: 16, z: 5, r: 2.8 }
      ],
      nav: { minX: -27, maxX: 27, minZ: -27, maxZ: 27 }
    },
    dock: {
      name: 'Le Quai',
      label: 'Les docks',
      desc: 'Grues, containers et eau sale. Attention aux plaques de tôle.',
      spawn: { x: -20, y: 1.7, z: 18 },
      look: { x: 0, y: 1.7, z: -4 },
      sky: '#243544',
      fog: '#6d7f86',
      density: 0.008,
      teamSpawns: {
        T:  { x: -18, y: 1.7, z: 18 },
        CT: { x: -18, y: 1.7, z: -18 }
      },
      sites: [
        { id: 'A', x: -8, z: -14, r: 2.8 },
        { id: 'B', x: -4, z: 0, r: 2.8 }
      ],
      nav: { minX: -27, maxX: 6, minZ: -27, maxZ: 27 }
    },
    custom: {
      name: 'Map perso',
      label: 'À toi de jouer',
      desc: 'Un sol vide et tes idées. Tab pour construire, partage avec tout le monde.',
      spawn: { x: 0, y: 1.7, z: 14 },
      look: { x: 0, y: 1.7, z: 0 },
      sky: '#3d3a3a',
      fog: '#a08b73',
      density: 0.005,
      teamSpawns: {
        T:  { x: 0, y: 1.7, z: 14 },
        CT: { x: 0, y: 1.7, z: -14 }
      },
      sites: [
        { id: 'A', x: -6, z: -6, r: 2.8 },
        { id: 'B', x: 6, z: 6, r: 2.8 }
      ],
      nav: { minX: -27, maxX: 27, minZ: -27, maxZ: 27 }
    }
  },

  WEAPONS: {
    pistol: { name: 'Allerconipistolet', short: 'PISTOLET', dmg: 18, mag: 12, rate: 230, type: 'gun' },
    rifle:  { name: 'Carabine du coin',  short: 'CARABINE', dmg: 24, mag: 30, rate: 115, type: 'gun' },
    pick:   { name: 'Pioche',            short: 'PIOCHE',   dmg: 34, mag: 0,  rate: 520, type: 'tool' },
    shovel: { name: 'Pelle',             short: 'PELLE',    dmg: 26, mag: 0,  rate: 430, type: 'tool' }
  },
  weaponOrder: ['pistol', 'rifle', 'pick', 'shovel'],

  SKINS: {
    default:  { name: 'Forgeron', color: '#8a5a2e', gear: '#3b4238', pattern: 'camo_woodland', unlock: 0,
                swatch: 'linear-gradient(135deg,#6d6a43,#1b2314 55%,#3f4d2b)' },
    urban:    { name: 'Urbain',   color: '#576067', gear: '#363d43', pattern: 'camo_urban',    unlock: 0,
                swatch: 'linear-gradient(135deg,#a9ada9,#363d43 55%,#576067)' },
    woodland: { name: 'Woodland', color: '#4b5732', gear: '#26301c', pattern: 'camo_woodland', unlock: 50,
                swatch: 'linear-gradient(135deg,#6d6a43,#151b12 55%,#3f4d2b)' },
    desert:   { name: 'Désert',   color: '#b09a68', gear: '#6b5636', pattern: 'camo_desert',   unlock: 100,
                swatch: 'linear-gradient(135deg,#cfbc8f,#8b7449 55%,#5e4c30)' },
    multicam: { name: 'Multicam', color: '#8a7748', gear: '#4a4f2e', pattern: 'camo_multicam', unlock: 200,
                swatch: 'linear-gradient(135deg,#b7a780,#4a4f2e 50%,#8a7748)' },
    snow:     { name: 'Neige',    color: '#939d96', gear: '#606b65', pattern: 'camo_snow',     unlock: 350,
                swatch: 'linear-gradient(135deg,#e6eae3,#606b65 55%,#939d96)' },
    night:    { name: 'Nuit',     color: '#28312f', gear: '#171d21', pattern: 'camo_night',    unlock: 500,
                swatch: 'linear-gradient(135deg,#56605a,#0b0e11 60%,#28312f)' }
  },
  WEAPON_SKINS: Models.WEAPON_SKINS,

  QUESTS: [
    { id: 'first_blood', title: 'Premier sang', desc: 'Toucher quelqu’un', goal: 1, reward: 50 },
    { id: 'explorer', title: 'Explorateur', desc: 'Aller voir les containers', goal: 1, reward: 50 },
    { id: 'builder', title: 'Architecte', desc: 'Poser 5 trucs dans l’éditeur', goal: 5, reward: 100 },
    { id: 'talker', title: 'Diplomate', desc: 'Discuter avec le Forgeron', goal: 1, reward: 50 },
    { id: 'dock', title: 'Marin d’eau douce', desc: 'Mettre les pieds au Quai', goal: 1, reward: 75 },
    { id: 'jumper', title: 'Cabriole', desc: 'Faire un saut', goal: 1, reward: 25 }
  ],

  /* ------------------------------------------------------------------ */
  init(canvas) {
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, true, { stencil: true });
    const scene = new BABYLON.Scene(this.engine);
    this.scene = scene;

    const meta = this.MAPS.allerconia;
    scene.clearColor = BABYLON.Color4.FromHexString(meta.sky + 'ff');
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = meta.density;
    scene.fogColor = BABYLON.Color3.FromHexString(meta.fog);

    this.camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 1.7, 20), scene);
    this.camera.speed = this.baseSpeed;
    this.camera.inertia = 0.55;
    this.camera.angularSensibility = 1700;
    this.camera.minZ = 0.05;
    // ZQSD et WASD acceptés : ça marche sur AZERTY comme sur QWERTY.
    this.camera.keysUp = [87, 90];
    this.camera.keysDown = [83];
    this.camera.keysLeft = [65, 81];
    this.camera.keysRight = [68];
    this.camera.checkCollisions = true;
    this.camera.ellipsoid = new BABYLON.Vector3(0.4, 0.85, 0.4);
    this.camera.applyGravity = false;
    scene.activeCamera = this.camera;
    this.camera.attachControl(canvas, true);
    this.camera.setTarget(new BABYLON.Vector3(0, 1.7, 0));
    this.controlsEnabled = false;

    // Relais clavier : le focus n'est pas toujours sur le canvas.
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
    window.addEventListener('keydown', e => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.shift = true;
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.shift = false;
    });

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.62;
    hemi.diffuse = new BABYLON.Color3(0.73, 0.8, 0.95);
    hemi.groundColor = new BABYLON.Color3(0.22, 0.19, 0.16);

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.75, -0.7, -0.55), scene);
    sun.intensity = 1.9;
    sun.diffuse = new BABYLON.Color3(1, 0.89, 0.72);
    sun.specular = new BABYLON.Color3(1, 0.94, 0.8);
    this.shadow = new BABYLON.ShadowGenerator(2048, sun);
    this.shadow.usePercentageCloserFiltering = true;
    this.shadow.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
    this.shadow.bias = 0.0015;
    this.shadow.normalBias = 0.02;
    this.shadow.darkness = 0.42;
    // Ombres à 30 Hz : invisible à l'œil, beaucoup plus léger pour le GPU.
    try {
      this.shadow.getShadowMap().refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES;
    } catch (_) { /* pas grave */ }

    // Contre-jour froid pour détacher les silhouettes.
    const fill = new BABYLON.DirectionalLight('fill', new BABYLON.Vector3(0.75, -0.35, 0.65), scene);
    fill.intensity = 0.5;
    fill.diffuse = new BABYLON.Color3(0.6, 0.72, 0.88);
    fill.specular = new BABYLON.Color3(0.4, 0.5, 0.7);

    // Petite lumière dédiée : elle ne sculpte que l'arme à l'écran.
    const viewLight = new BABYLON.PointLight('viewLight', new BABYLON.Vector3(0, 0.4, 0.02), scene);
    viewLight.parent = this.camera;
    viewLight.diffuse = new BABYLON.Color3(0.98, 0.94, 0.86);
    viewLight.specular = new BABYLON.Color3(1, 0.96, 0.88);
    viewLight.intensity = 2.4;
    viewLight.range = 3;
    this.viewLight = viewLight;

    this.setupSky();
    this.setupPostFX();

    this.loadMap('allerconia');
    this.buildViewModel('pistol');

    scene.onBeforeRenderObservable.add(() => this.onFrame());
    window.addEventListener('resize', () => this.engine.resize());
    return scene;
  },

  controls(on) {
    if (!this.camera) return;
    this.controlsEnabled = !!on;
    if (on) this.camera.attachControl(this.canvas, true);
    else this.camera.detachControl();
  },

  /* ------------------------------------------------------------------ */
  /*  Ciel et post-traitement                                            */
  /* ------------------------------------------------------------------ */
  setupSky() {
    // Dôme de ciel : dégradé + nuages procéduraux + disque solaire.
    try {
      const sky = BABYLON.MeshBuilder.CreateSphere('skyDome', { diameter: 900, segments: 32, sideOrientation: BABYLON.Mesh.BACKSIDE }, this.scene);
      const mat = new BABYLON.StandardMaterial('skyMat', this.scene);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      const dt = new BABYLON.DynamicTexture('skyTex', { width: 512, height: 256 }, this.scene, false);
      mat.emissiveTexture = dt;
      mat.diffuseTexture = dt;
      sky.material = mat;
      sky.infiniteDistance = true;
      sky.isPickable = false;
      sky.checkCollisions = false;
      sky.applyFog = false;
      this.skyDome = sky;
      this.skyMat = mat;
      this.skyTex = dt;
      this.buildHorizon();
    } catch (e) {
      console.warn('sky', e);
      this.skyDome = null;
    }
  },

  setSkyColors(skyHex, fogHex) {
    if (!this.skyTex) return;
    try {
      const W = 512, H = 256;
      const c = this.skyTex.getContext();
      const top = Models.rgb(Models.shade(skyHex, 0.62));
      const mid = Models.rgb(Models.shade(skyHex, 0.95));
      const haze = Models.rgb(fogHex);
      const below = Models.rgb(Models.shade(fogHex, 0.8));
      const cloudLight = Models.rgb(Models.shade(fogHex, 1.2));
      const cloudDark = Models.rgb(Models.shade(skyHex, 0.8));

      const img = c.createImageData(W, H);
      const d = img.data;
      for (let y = 0; y < H; y++) {
        const v = y / (H - 1);
        // Zénith → milieu du ciel → brume d'horizon (v = 0.5).
        let base;
        if (v < 0.5) {
          const t = v / 0.5;
          base = [top[0] + (haze[0] - top[0]) * t, top[1] + (haze[1] - top[1]) * t, top[2] + (haze[2] - top[2]) * t];
        } else {
          const t = (v - 0.5) / 0.5;
          base = [haze[0] + (below[0] - haze[0]) * t, haze[1] + (below[1] - haze[1]) * t, haze[2] + (below[2] - haze[2]) * t];
        }
        for (let x = 0; x < W; x++) {
          // Nuages : bruit fractal étiré à l'horizontale.
          const n = Models.fbm(x / 74, y / 34, 41, 4);
          const veil = Models.fbm(x / 140, y / 60, 77, 3);
          let cloud = (n * 0.72 + veil * 0.28 - 0.44) / 0.4;
          cloud = Math.max(0, Math.min(1, cloud));
          cloud *= 0.6 + 0.4 * Math.pow(1 - Math.min(1, v * 2), 0.8);
          const cc = cloud > 0.48 ? cloudLight : cloudDark;
          const alpha = cloud * 0.4;
          const i = (y * W + x) * 4;
          d[i]     = base[0] * (1 - alpha) + cc[0] * alpha;
          d[i + 1] = base[1] * (1 - alpha) + cc[1] * alpha;
          d[i + 2] = base[2] * (1 - alpha) + cc[2] * alpha;
          d[i + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);

      // Soleil bas : halo chaud qui perce la couverture.
      const sx = W * 0.68, sy = H * 0.40;
      c.globalCompositeOperation = 'lighter';
      const halo = c.createRadialGradient(sx, sy, 0, sx, sy, 110);
      halo.addColorStop(0, 'rgba(255,236,198,0.85)');
      halo.addColorStop(0.22, 'rgba(255,220,168,0.34)');
      halo.addColorStop(1, 'rgba(255,210,150,0)');
      c.fillStyle = halo;
      c.fillRect(0, 0, W, H);
      const core = c.createRadialGradient(sx, sy, 0, sx, sy, 17);
      core.addColorStop(0, 'rgba(255,251,236,1)');
      core.addColorStop(1, 'rgba(255,235,190,0)');
      c.fillStyle = core;
      c.fillRect(sx - 24, sy - 24, 48, 48);
      c.globalCompositeOperation = 'source-over';

      this.skyTex.update();
    } catch (e) {
      console.warn('sky colors', e);
    }
  },

  buildHorizon() {
    // Décor lointain : sol brumeux + silhouettes d'usines, pour donner de la profondeur.
    try {
      const root = new BABYLON.TransformNode('horizonRoot', this.scene);
      const floor = BABYLON.MeshBuilder.CreateGround('horizonFloor', { width: 900, height: 900 }, this.scene);
      const fm = new BABYLON.StandardMaterial('horizonFloorMat', this.scene);
      fm.diffuseColor = new BABYLON.Color3(0.26, 0.27, 0.25);
      fm.specularColor = BABYLON.Color3.Black();
      floor.material = fm;
      floor.position.y = -0.06;
      floor.checkCollisions = false;
      floor.receiveShadows = false;
      floor.isPickable = false;
      floor.parent = root;

      const r = Models.rng('horizon');
      const boxes = [];
      for (let i = 0; i < 42; i++) {
        const a = (i / 42) * Math.PI * 2 + (r() - 0.5) * 0.06;
        const dist = 82 + r() * 46;
        const w = 9 + r() * 20;
        const h = 8 + Math.pow(r(), 1.6) * 34;
        const dp = 9 + r() * 18;
        const b = BABYLON.MeshBuilder.CreateBox('hz' + i, { width: w, height: h, depth: dp }, this.scene);
        b.position.set(Math.cos(a) * dist, h / 2 - 0.2, Math.sin(a) * dist);
        b.rotation.y = r() * Math.PI;
        b.isPickable = false;
        b.checkCollisions = false;
        b.receiveShadows = false;
        b.parent = root;
        boxes.push(b);
      }
      const merged = BABYLON.Mesh.MergeMeshes(boxes, true, true, undefined, false, false);
      if (merged) {
        const hm = new BABYLON.StandardMaterial('horizonMat', this.scene);
        hm.diffuseColor = new BABYLON.Color3(0.17, 0.19, 0.2);
        hm.specularColor = BABYLON.Color3.Black();
        merged.material = hm;
        merged.isPickable = false;
        merged.checkCollisions = false;
        merged.parent = root;
      }
      this.horizonRoot = root;
    } catch (e) {
      console.warn('horizon', e);
    }
  },

  setupPostFX() {
    // Pipeline : FXAA, bloom, netteté, grain fin, aberration et étalonnage ACES.
    try {
      const pipe = new BABYLON.DefaultRenderingPipeline('render', true, this.scene, [this.camera]);
      pipe.fxaaEnabled = true;
      pipe.samples = 4;
      pipe.bloomEnabled = true;
      pipe.bloomThreshold = 0.82;
      pipe.bloomWeight = 0.28;
      pipe.bloomKernel = 48;
      pipe.imageProcessingEnabled = true;
      pipe.imageProcessing.toneMappingEnabled = true;
      pipe.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
      pipe.imageProcessing.exposure = 1.16;
      pipe.imageProcessing.contrast = 1.2;
      pipe.imageProcessing.vignetteEnabled = true;
      pipe.imageProcessing.vignetteWeight = 1.1;
      pipe.imageProcessing.vignetteStretch = 0.35;
      pipe.imageProcessing.vignetteColor = new BABYLON.Color4(0.02, 0.025, 0.03, 0);
      this.pipeline = pipe;
    } catch (e) {
      console.warn('postfx', e);
      this.pipeline = null;
    }

    // Occlusion ambiante : les objets se posent enfin sur le sol.
    try {
      this.ssao = new BABYLON.SSAO2RenderingPipeline(
        'ssao', this.scene, { ssaoRatio: 0.4, blurRatio: 1 }, [this.camera], false
      );
      this.ssao.radius = 1.5;
      this.ssao.totalStrength = 1.0;
      this.ssao.base = 0.12;
      this.ssao.samples = 12;
      this.ssao.expensiveBlur = false;
      this.ssao.bilateralSamples = 8;
    } catch (e) {
      console.warn('ssao', e);
      this.ssao = null;
    }

    if (this.viewRoot) this.viewRoot.getChildMeshes().forEach(m => { m.renderingGroupId = 1; });
  },

  /* ------------------------------------------------------------------ */
  /*  Maps                                                               */
  /* ------------------------------------------------------------------ */
  loadMap(name, customObjects) {
    if (!this.MAPS[name]) name = 'allerconia';
    this.currentMap = name;
    const meta = this.MAPS[name];

    if (this.mapRoot) {
      this.npcs.forEach(n => { if (n.rig) Models.dispose(n.rig.root); });
      this.mapRoot.dispose(false, true);
    }
    // Les textures de détail sont partagées : le dispose ci-dessus les tue.
    // On remet les références à zéro pour qu'elles soient redessinées.
    this.detailTex = null;
    this.bumpTex = null;
    this.groundBump = null;
    this.laneMat = null;
    this.windowMat = null;
    if (this.mapLights) this.mapLights.forEach(l => l.dispose());
    this.mapLights = [];
    this.mapRoot = new BABYLON.TransformNode('mapRoot', this.scene);
    if (typeof Editor !== 'undefined' && Editor.meshes) Editor.clear();

    this.npcs = [];
    this.pickups = [];
    this.grenades.forEach(g => { try { g.mesh.dispose(false, true); } catch (_) { /* déjà partie */ } });
    this.grenades = [];
    this.particles.forEach(p => { try { p.mesh.dispose(); } catch (_) { /* déjà partie */ } });
    this.particles = [];
    this.slideT = 0;
    this.slideCool = 0;
    this.shakeT = 0;
    this.ground = null;
    this.scene.clearColor = BABYLON.Color4.FromHexString(meta.sky + 'ff');
    this.scene.fogColor = BABYLON.Color3.FromHexString(meta.fog);
    this.scene.fogDensity = meta.density;
    this.setSkyColors(meta.sky, meta.fog);

    this.camera.position.set(meta.spawn.x, meta.spawn.y, meta.spawn.z);
    this.camera.setTarget(new BABYLON.Vector3(meta.look.x, meta.look.y, meta.look.z));
    this.jumpVel = 0;
    this.grounded = true;

    if (name === 'allerconia') this.buildAllerconia(meta);
    else if (name === 'dock') this.buildDock(meta);
    else this.buildCustomGround(meta);

    if (Array.isArray(customObjects) && customObjects.length && typeof Editor !== 'undefined') {
      Editor.applyRemote(customObjects);
    }
  },

  // Texture de détail commune : cassure des aplats, salissures, micro-relief.
  detailTextures() {
    if (this.detailTex) return;
    const S = 256;
    const make = (name, contrast, big) => {
      const dt = new BABYLON.DynamicTexture(name, { width: S, height: S }, this.scene, false);
      const c = dt.getContext();
      const img = c.createImageData(S, S);
      const d = img.data;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const fine = (Models.hash2(x, y, 3) - 0.5) * contrast;
          const blotch = (Models.fbm(x / big, y / big, 19, 3) - 0.5) * contrast * 2.2;
          const streak = (Models.fbm(x / 7, y / 90, 53, 2) - 0.5) * contrast * 0.7;
          const v = Math.max(0, Math.min(255, 232 + fine + blotch + streak));
          const i = (y * S + x) * 4;
          d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
      dt.update();
      dt.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
      dt.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
      return dt;
    };
    this.detailTex = make('detail_albedo', 16, 26);
    this.detailTex.uScale = 2;
    this.detailTex.vScale = 2;
    this.bumpTex = make('detail_bump', 34, 15);
    this.bumpTex.level = 0.45;
    this.bumpTex.uScale = 2;
    this.bumpTex.vScale = 2;
    this.groundBump = make('ground_bump', 42, 8);
    this.groundBump.level = 0.55;
    this.groundBump.uScale = 10;
    this.groundBump.vScale = 10;
  },

  mat(name, hex, rough = 0.7) {
    this.detailTextures();
    const m = new BABYLON.StandardMaterial(name, this.scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    if (this.detailTex) m.diffuseTexture = this.detailTex;
    if (this.bumpTex) m.bumpTexture = this.bumpTex;
    m.specularColor = new BABYLON.Color3(rough * 0.25, rough * 0.25, rough * 0.25);
    m.specularPower = 12 + rough * 52;
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
    b.parent = this.mapRoot;
    return b;
  },

  makeGround(meta, tileColor) {
    const g = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, this.scene);
    const base = tileColor || '#3a3b3d';
    const m = this.mat('ground_m', base, 0.22);
    const S = 1024;
    const tex = new BABYLON.DynamicTexture('grid_' + this.currentMap, S, this.scene, false);
    const c = tex.getContext();
    const r = Models.rng('ground_' + this.currentMap + '_' + base);
    const rgb = Models.rgb(base);

    // Fond bruité : le grain casse l'aplat sans faire de motif visible.
    const img = c.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const fine = (Models.hash2(x, y, 7) - 0.5) * 26;
        const large = (Models.fbm(x / 90, y / 90, 3, 3) - 0.5) * 30;
        const v = fine + large;
        const i = (y * S + x) * 4;
        d[i] = Math.max(0, Math.min(255, rgb[0] + v));
        d[i + 1] = Math.max(0, Math.min(255, rgb[1] + v));
        d[i + 2] = Math.max(0, Math.min(255, rgb[2] + v));
        d[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);

    // Grandes dalles with joints discrets et taches d'humidité.
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    c.lineWidth = 2;
    for (let i = 0; i <= S; i += 128) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, S); c.stroke();
      c.beginPath(); c.moveTo(0, i); c.lineTo(S, i); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.025)';
      c.beginPath(); c.moveTo(i + 2, 0); c.lineTo(i + 2, S); c.stroke();
      c.beginPath(); c.moveTo(0, i + 2); c.lineTo(S, i + 2); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.22)';
    }
    for (let i = 0; i < 26; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.035)';
      c.beginPath();
      c.ellipse(r() * S, r() * S, 30 + r() * 120, 20 + r() * 80, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    // Petits débris / graviers.
    for (let i = 0; i < 180; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.16)';
      const s = 1 + r() * 3;
      c.fillRect(r() * S, r() * S, s, s);
    }

    tex.update();
    m.diffuseTexture = tex;
    tex.uScale = 4;
    tex.vScale = 4;
    if (this.groundBump) m.bumpTexture = this.groundBump;
    m.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
    g.material = m;
    g.checkCollisions = true;
    g.receiveShadows = true;
    g.parent = this.mapRoot;
    this.ground = g;
    return g;
  },

  walls(color) {
    this.box('wall_n', { w: 60, h: 4, d: 1, x: 0, y: 2, z: 30, color });
    this.box('wall_s', { w: 60, h: 4, d: 1, x: 0, y: 2, z: -30, color });
    this.box('wall_e', { w: 1, h: 4, d: 60, x: 30, y: 2, z: 0, color });
    this.box('wall_w', { w: 1, h: 4, d: 60, x: -30, y: 2, z: 0, color });
  },

  buildAllerconia(meta) {
    this.makeGround(meta, '#403d37');
    this.walls('#7a7163');
    this.road(0, 13, 60, 7, true);
    this.road(-13, 0, 7, 60, false);

    this.zone('zone_ct', 14, 10, -21, '#2f5fa8');
    this.zone('zone_t', 14, 10, 21, '#b5651d');

    const B = '#96897a';
    this.box('av_n', { w: 14, h: 6, d: 0.6, x: 0, y: 3, z: -7, color: B });
    this.box('av_s1', { w: 5, h: 6, d: 0.6, x: -4.5, y: 3, z: 3, color: B });
    this.box('av_s2', { w: 5, h: 6, d: 0.6, x: 4.5, y: 3, z: 3, color: B });
    this.box('av_s3', { w: 4, h: 2, d: 0.6, x: 0, y: 5, z: 3, color: B });
    this.box('av_e', { w: 0.6, h: 6, d: 10, x: 7, y: 3, z: -2, color: B });
    this.box('av_w', { w: 0.6, h: 6, d: 10, x: -7, y: 3, z: -2, color: B });
    this.box('av_roof', { w: 15, h: 0.5, d: 11, x: 0, y: 6.25, z: -2, color: '#4a453e' });
    this.box('av_band', { w: 14.3, h: 0.5, d: 10.3, x: 0, y: 3.3, z: -2,
      color: '#b5651d', collide: false, shadow: false });

    // Marches non solides : c'est le rayon au sol qui fait monter le joueur.
    for (let i = 0; i < 6; i++) {
      const h = i + 1;
      this.box('step' + i, { w: 3, h: h, d: 1.6, x: 9, y: h / 2, z: 9 - i * 1.8,
        color: '#7d7466', collide: false });
    }

    this.box('tower', { w: 6, h: 7, d: 6, x: -18, y: 3.5, z: -2, color: '#6d6559' });
    this.box('bridge', { w: 11, h: 0.4, d: 2.4, x: -11.5, y: 7.2, z: -2, color: '#5a5349', collide: false });

    this.box('cont1', { w: 8, h: 2.8, d: 3, x: -17, y: 1.4, z: 12, color: '#2e6b6b' });
    this.box('cont2', { w: 8, h: 2.8, d: 3, x: -17, y: 4.2, z: 12, color: '#8a4a3a' });
    this.box('cont3', { w: 6, h: 2.8, d: 3, x: -8, y: 1.4, z: 14, color: '#b5651d', rotation: 0.2 });

    this.box('garage_back', { w: 9, h: 3.5, d: 0.5, x: 16, y: 1.75, z: 10, color: '#555b66' });
    this.box('garage_e', { w: 0.5, h: 3.5, d: 8, x: 20.5, y: 1.75, z: 6, color: '#555b66' });
    this.box('garage_w', { w: 0.5, h: 3.5, d: 8, x: 11.5, y: 1.75, z: 6, color: '#555b66' });
    this.box('garage_roof', { w: 10, h: 0.4, d: 9, x: 16, y: 3.7, z: 6, color: '#3b414c', collide: false });
    this.box('garage_door', { w: 6, h: 1, d: 0.3, x: 16, y: 3.1, z: 2, color: '#2a2f38', collide: false });
    this.box('workbench', { w: 4, h: 1, d: 1.2, x: 16, y: 0.5, z: 8, color: '#6b4f2a' });

    [[-5, 1, 15], [-3, 1, 15], [-4, 3, 15], [11, 1, -14], [13, 1, -14],
     [12, 1, 12], [-11, 1, 6], [6, 1, 18]].forEach((p, i) => {
      this.box('crate' + i, { w: 2, h: 2, d: 2, x: p[0], y: p[1], z: p[2], color: '#8a6b3f' });
    });
    [[-10, -8], [10, -8], [-10, 8], [10, 8], [0, 16]].forEach((p, i) => {
      this.box('cover' + i, { w: 3, h: 1.2, d: 0.8, x: p[0], y: 0.6, z: p[1], color: '#6b6357' });
    });
    [[-10, -10], [10, -10], [-10, 10], [10, 10], [0, 0]].forEach((p, i) => this.lamp(p[0], p[1], i));
    this.sign('ALLERCONIARD', 'par robotbot', 0, 7.4, -6.62, { w: 9, h: 2.2, billboard: false });

    // Fenêtres et toit : cassure des grandes surfaces.
    [-5, -2.5, 0, 2.5, 5].forEach((x, i) => this.windowPane(x, 4.3, -6.68, 0));
    this.box('roof_ac1', { w: 1.6, h: 0.9, d: 1.6, x: -4, y: 6.9, z: -4,
      color: '#6d6f70', collide: false });
    this.box('roof_ac2', { w: 1.2, h: 0.7, d: 1.2, x: 3.5, y: 6.8, z: -1,
      color: '#5c6061', collide: false });
    this.box('roof_stack', { w: 0.5, h: 2.2, d: 0.5, x: 5.5, y: 7.5, z: -5,
      color: '#4c4a45', collide: false });

    this.spawnNPC('Le Forgeron', { x: 16, y: 0, z: 6 }, '#f0a64a', 'forge');
    this.spawnNPC('Chef de patrouille', { x: -10, y: 0, z: -19 }, '#6ee7a0', 'patrol');

    // Bonus à ramasser : soin et munitions.
    this.spawnPickup('health', 0, 1.15, 26);
    this.spawnPickup('ammo', 0, 1.15, -18);
    this.spawnPickup('health', 9, 1.15, 4);
    this.spawnPickup('ammo', -11, 1.15, 3);
  },

  buildDock(meta) {
    this.makeGround(meta, '#3b4448');
    this.walls('#4d5a60');

    this.zone('zone_ct', 12, 10, -20, '#2f5fa8');
    this.zone('zone_t', 12, 10, 18, '#b5651d');

    // Eau (côté est)
    const water = BABYLON.MeshBuilder.CreateGround('water', { width: 22, height: 60 }, this.scene);
    water.position.set(19, 0.04, 0);
    const wm = this.mat('water_m', '#123b47', 0.9);
    wm.emissiveColor = new BABYLON.Color3(0.02, 0.12, 0.16);
    wm.alpha = 0.92;
    water.material = wm;
    water.checkCollisions = false;
    water.parent = this.mapRoot;

    // Quai surélevé
    this.box('quay', { w: 10, h: 1.6, d: 34, x: 11, y: 0.8, z: 0, color: '#5d676b' });
    for (let i = 0; i < 5; i++) {
      const h = i + 1;
      this.box('dockstep' + i, { w: 3, h: h, d: 1.5, x: 5, y: h / 2, z: 12 - i * 1.7,
        color: '#6e777b', collide: false });
    }

    // Entrepôts
    this.box('store1', { w: 10, h: 5, d: 9, x: -14, y: 2.5, z: -8, color: '#6b7378' });
    this.box('store1_roof', { w: 11, h: 0.4, d: 10, x: -14, y: 5.2, z: -8,
      color: '#3c4549', collide: false });
    this.box('store2', { w: 8, h: 4, d: 7, x: -16, y: 2, z: 9, color: '#5d666b' });
    this.box('store2_roof', { w: 9, h: 0.4, d: 8, x: -16, y: 4.2, z: 9,
      color: '#3c4549', collide: false });

    // Grues
    [[2, -16], [2, 4], [2, 20]].forEach((p, i) => {
      this.box('crane_pole' + i, { w: 0.6, h: 9, d: 0.6, x: p[0], y: 4.5, z: p[1], color: '#c07a2a' });
      this.box('crane_arm' + i, { w: 12, h: 0.5, d: 0.5, x: p[0] + 5, y: 8.8, z: p[1], color: '#d08b3a' });
      this.box('crane_hook' + i, { w: 0.1, h: 3, d: 0.1, x: p[0] + 10, y: 7, z: p[1],
        color: '#2b2f33', shadow: false });
    });

    // Containers empilés
    [[-4, 1, 10, '#2e6b6b'], [-4, 4, 10, '#8a4a3a'], [13, 2.6, 12, '#2e6b6b'],
     [13, 5.4, 12, '#b5651d'], [13, 2.6, -6, '#8a4a3a']].forEach((p, i) => {
      this.box('dc_cont' + i, { w: 7, h: 2.6, d: 3, x: p[0], y: p[1], z: p[2], color: p[3] });
    });

    // Ponton de bois
    for (let i = 0; i < 6; i++) {
      this.box('plank' + i, { w: 6, h: 0.2, d: 1, x: 17, y: 0.3, z: -14 + i * 1.2,
        color: '#7a5c38', collide: false });
    }

    // Couvertures et fûts
    [[-8, -2], [-8, 14], [6, -8], [6, 8]].forEach((p, i) => {
      this.box('dc_cover' + i, { w: 2.5, h: 1.3, d: 1, x: p[0], y: 0.65, z: p[1], color: '#6b6357' });
    });
    [[-20, -2], [-19, -2], [-20, -1]].forEach((p, i) => {
      const barrel = BABYLON.MeshBuilder.CreateCylinder('barrel' + i,
        { diameter: 1, height: 1.4 }, this.scene);
      barrel.position.set(p[0], 0.7, p[1]);
      barrel.material = this.mat('barrel_m' + i, i === 2 ? '#b5651d' : '#4f5b60');
      barrel.checkCollisions = true;
      barrel.parent = this.mapRoot;
      if (this.shadow) this.shadow.addShadowCaster(barrel);
    });

    [[-12, -12], [8, -12], [-12, 12], [8, 12]].forEach((p, i) => this.lamp(p[0], p[1], i));
    this.sign('LE QUAI', 'robotbot · dock n°2', -14, 3.7, -3.42, { w: 7, h: 1.75, billboard: false });

    this.spawnNPC('Capitaine Marée', { x: 8, y: 0, z: 17 }, '#6ee7a0', 'captain');
    this.spawnNPC('Mécanicien', { x: -16, y: 0, z: 9 }, '#f0a64a', 'forge');

    this.spawnPickup('health', -6, 1.15, 0);
    this.spawnPickup('ammo', -6, 1.15, 14);
    this.spawnPickup('health', -16, 1.15, -18);
    this.spawnPickup('ammo', 2, 1.15, -10);
  },

  buildCustomGround(meta) {
    this.makeGround(meta, '#403a33');
    this.walls('#5a5045');
    this.zone('zone_build', 10, 10, 0, '#5a4a38');
    this.sign('MAP PERSO', 'Tab pour construire', 0, 7, -14);
    this.spawnNPC('Le Forgeron', { x: 10, y: 0, z: 8 }, '#f0a64a', 'forge');
    this.spawnPickup('health', 6, 1.15, 10);
    this.spawnPickup('ammo', -6, 1.15, 10);
  },

  zone(name, w, d, z, hex) {
    const m = BABYLON.MeshBuilder.CreateGround(name, { width: w, height: d }, this.scene);
    m.position.set(0, 0.03, z);
    m.material = this.mat(name + '_m', hex, 0.1);
    m.checkCollisions = false;
    m.receiveShadows = true;
    m.parent = this.mapRoot;
    return m;
  },

  // Bande d'asphalte + ligne centrale délavée.
  road(x, z, w, d, alongX) {
    const m = BABYLON.MeshBuilder.CreateGround('road_' + x + '_' + z, { width: w, height: d }, this.scene);
    m.position.set(x, 0.012, z);
    m.material = this.mat('roadm_' + x + '_' + z, '#3a3b3c', 0.4);
    m.checkCollisions = false;
    m.receiveShadows = true;
    m.parent = this.mapRoot;
    if (!this.laneMat) {
      this.laneMat = new BABYLON.StandardMaterial('laneMat', this.scene);
      this.laneMat.diffuseColor = new BABYLON.Color3(0.68, 0.64, 0.5);
      this.laneMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.04);
    }
    const len = alongX ? w : d;
    for (let i = -len / 2 + 2; i < len / 2; i += 6) {
      const dash = BABYLON.MeshBuilder.CreateGround('lane_' + x + '_' + z + '_' + i,
        { width: alongX ? 2.2 : 0.16, height: alongX ? 0.16 : 2.2 }, this.scene);
      dash.position.set(x + (alongX ? i : 0), 0.022, z + (alongX ? 0 : i));
      dash.material = this.laneMat;
      dash.checkCollisions = false;
      dash.isPickable = false;
      dash.parent = this.mapRoot;
    }
    return m;
  },

  windowPane(x, y, z, rotY) {
    if (!this.windowMat) {
      this.windowMat = new BABYLON.StandardMaterial('windowMat', this.scene);
      this.windowMat.diffuseColor = new BABYLON.Color3(0.055, 0.075, 0.095);
      this.windowMat.emissiveColor = new BABYLON.Color3(0.015, 0.022, 0.03);
      this.windowMat.specularColor = new BABYLON.Color3(0.6, 0.72, 0.82);
      this.windowMat.specularPower = 90;
    }
    const w = BABYLON.MeshBuilder.CreatePlane('window', { width: 1.05, height: 1.35 }, this.scene);
    w.position.set(x, y, z);
    w.rotation.y = rotY || 0;
    w.material = this.windowMat;
    w.isPickable = false;
    w.receiveShadows = false;
    w.parent = this.mapRoot;
    return w;
  },

  lamp(x, z, i) {
    this.box('lamp_pole' + i, { w: 0.18, h: 5, d: 0.18, x, y: 2.5, z, color: '#33363d', shadow: false });
    const bulb = BABYLON.MeshBuilder.CreateSphere('lamp_bulb' + i, { diameter: 0.45 }, this.scene);
    bulb.position.set(x, 5.1, z);
    bulb.material = this.mat('lamp_bulb_m' + i, '#ffe0a0');
    bulb.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0.45);
    bulb.parent = this.mapRoot;
    const light = new BABYLON.PointLight('lamp_light' + i, bulb.position, this.scene);
    light.diffuse = new BABYLON.Color3(1, 0.82, 0.55);
    light.intensity = 0.4;
    light.range = 13;
    this.mapLights.push(light);
  },

  sign(title, sub, x, y, z, opts) {
    opts = opts || {};
    const w = opts.w || 12, h = opts.h || 3;
    const s = BABYLON.MeshBuilder.CreatePlane('sign', { width: w, height: h }, this.scene);
    s.position.set(x, y, z);
    if (opts.billboard !== false) s.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    else s.rotation.y = opts.ry || 0;
    s.parent = this.mapRoot;
    const dt = new BABYLON.DynamicTexture('sign_tex', { width: 1024, height: 256 }, this.scene, false);
    const c = dt.getContext();
    c.fillStyle = 'rgba(10,12,18,0.82)'; c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = '#f0a64a'; c.lineWidth = 8; c.strokeRect(8, 8, 1008, 240);
    c.fillStyle = '#f0a64a'; c.font = 'bold 95px Impact, sans-serif'; c.textAlign = 'center';
    c.fillText(title, 512, 130);
    c.fillStyle = '#cfd6e6'; c.font = 'bold 40px Trebuchet MS, sans-serif';
    c.fillText(sub, 512, 205);
    dt.update();
    const m = new BABYLON.StandardMaterial('sign_m', this.scene);
    m.diffuseTexture = dt; m.emissiveTexture = dt; m.opacityTexture = dt; m.disableLighting = true;
    s.material = m;
  },

  spawnNPC(name, pos, color, kind) {
    const looks = {
      forge:   { weapon: 'shovel', gear: '#3b4238', color: '#8a5a2e', pattern: 'camo_woodland', skin: 'rust' },
      captain: { weapon: 'pistol', gear: '#363d43', color: '#576067', pattern: 'camo_urban',    skin: 'standard' },
      patrol:  { weapon: 'rifle',  gear: '#26301c', color: '#4b5732', pattern: 'camo_woodland', skin: 'woodland' }
    };
    const look = looks[kind] || looks.forge;
    const rig = Models.character(this.scene, {
      id: 'npc_' + kind + '_' + this.npcs.length,
      color: look.color, gear: look.gear, pattern: look.pattern,
      weapon: look.weapon, weaponSkin: look.skin, tone: '#c99a70'
    });
    rig.root.position.set(pos.x, 0.11, pos.z);
    rig.root.parent = this.mapRoot;
    rig.body.getChildMeshes().forEach(m => {
      m.checkCollisions = false;
      m.isPickable = false;
      if (this.shadow) this.shadow.addShadowCaster(m);
    });

    const tag = BABYLON.MeshBuilder.CreatePlane('tag_' + kind, { width: 3, height: 0.7 }, this.scene);
    tag.position.set(pos.x, 2.5, pos.z);
    tag.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    tag.parent = this.mapRoot;
    const dt = new BABYLON.DynamicTexture('tagtex_' + kind, { width: 512, height: 128 }, this.scene, false);
    const c = dt.getContext();
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#f0a64a'; c.font = 'bold 42px Trebuchet MS, sans-serif'; c.textAlign = 'center';
    c.fillText(name, 256, 80);
    dt.update();
    const tm = new BABYLON.StandardMaterial('tagm_' + kind, this.scene);
    tm.diffuseTexture = dt; tm.emissiveTexture = dt; tm.opacityTexture = dt; tm.disableLighting = true;
    tag.material = tm;
    this.npcs.push({ name, kind, pos, rig, meshes: [tag] });
  },

  /* ------------------------------------------------------------------ */
  /*  Armes                                                              */
  /* ------------------------------------------------------------------ */
  // Chaque arme a sa taille : on garde sa place de repos pour le recul.
  VIEW: {
    pistol: { pos: [0.17, -0.16, 0.48], rot: [0.02, -0.05, 0], scale: 0.85 },
    rifle:  { pos: [0.17, -0.15, 0.40], rot: [0.01, -0.04, 0], scale: 0.55 },
    pick:   { pos: [0.18, -0.18, 0.38], rot: [0.04, -0.05, 0], scale: 0.65 },
    shovel: { pos: [0.18, -0.18, 0.38], rot: [0.04, -0.05, 0], scale: 0.65 }
  },

  buildViewModel(key, skinKey) {
    if (this.viewRoot) Models.dispose(this.viewRoot);
    this.viewSkin = skinKey || this.viewSkin || 'standard';
    this.viewKey = this.WEAPONS[key] ? key : 'pistol';
    const v = this.VIEW[key] || this.VIEW.pistol;
    const root = new BABYLON.TransformNode('viewmodel', this.scene);
    root.parent = this.camera;
    root.position.set(v.pos[0], v.pos[1], v.pos[2]);
    root.rotation.set(v.rot[0], v.rot[1], v.rot[2]);
    this.viewRoot = root;
    this.viewBase = v;
    this.switchT = 1;
    this.trickT = 0;
    this.showT = 0;

    Models.weapon(this.scene, this.WEAPONS[key] ? key : 'pistol', root, v.scale, this.viewSkin);
    const meshes = root.getChildMeshes();
    meshes.forEach(m => {
      m.isPickable = false;
      m.checkCollisions = false;
      m.renderingGroupId = 1; // devant le monde, comme il faut dans un FPS
    });
    if (this.viewLight) this.viewLight.includedOnlyMeshes = meshes;
  },

  recoilNow() {
    this.recoil = 1;
  },

  weaponFire() {
    this.recoil = 1;
    this.viewSwayX += (Math.random() - 0.5) * 0.035;
    this.viewSwayY += (Math.random() * 0.03);
  },

  weaponReload() {
    this.reloadT = 1;
  },

  /* F : petit show d'arme. Un tour pour les flingues, un double twirl pour les outils. */
  weaponTrick() {
    if (!this.viewRoot || this.trickT > 0 || this.showT > 0) return false;
    if (this.reloadT > 0.2 || this.switchT > 0.45) return false;
    this.trickType = (this.WEAPONS[this.viewKey] || {}).type || 'gun';
    this.trickT = 0.0001;
    return true;
  },

  /* G : LE grand show. Long, 3 figures enchaînées et un snap final bien sec. */
  weaponShow() {
    if (!this.viewRoot || this.showT > 0 || this.trickT > 0) return false;
    if (this.reloadT > 0.2 || this.switchT > 0.45) return false;
    this.showType = (this.WEAPONS[this.viewKey] || {}).type || 'gun';
    this.showT = 0.0001;
    return true;
  },

  /* ------------------------------------------------------------------ */
  /*  Grenades, particules et bonus                                      */
  /* ------------------------------------------------------------------ */
  throwGrenade(from, dir, remote) {
    if (this.grenades.length > 20) return null;
    const mesh = BABYLON.MeshBuilder.CreateSphere('grenade', { diameter: 0.22, segments: 8 }, this.scene);
    const mat = new BABYLON.StandardMaterial('grenade_m', this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.17, 0.2, 0.15);
    mat.specularColor = new BABYLON.Color3(0.35, 0.35, 0.35);
    mat.emissiveColor = new BABYLON.Color3(0.05, 0.08, 0.03);
    mesh.material = mat;
    mesh.position.copyFrom(from);
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    const band = BABYLON.MeshBuilder.CreateTorus('grenade_band', { diameter: 0.2, thickness: 0.035, tessellation: 10 }, this.scene);
    band.parent = mesh;
    const bm = new BABYLON.StandardMaterial('grenade_band_m', this.scene);
    bm.emissiveColor = new BABYLON.Color3(0.9, 0.35, 0.1);
    bm.disableLighting = true;
    band.material = bm;
    this.grenades.push({
      mesh,
      vel: dir.scale(11).add(new BABYLON.Vector3(0, 3, 0)),
      life: 2.3,
      remote: !!remote
    });
    return mesh;
  },

  explode(pos, remote) {
    const flash = BABYLON.MeshBuilder.CreateSphere('boom_flash', { diameter: 1.2, segments: 8 }, this.scene);
    flash.position.copyFrom(pos);
    flash.material = this.boomMaterial();
    flash.isPickable = false;
    this.particles.push({ mesh: flash, vel: new BABYLON.Vector3(0, 1.2, 0), life: 0.2, maxLife: 0.2, gravity: 0, grow: 5 });

    const light = new BABYLON.PointLight('boom_light', pos.clone(), this.scene);
    light.diffuse = new BABYLON.Color3(1, 0.62, 0.25);
    light.intensity = 9;
    light.range = 16;
    setTimeout(() => { try { light.dispose(); } catch (_) { /* déjà éteinte */ } }, 220);

    for (let i = 0; i < 22; i++) {
      const m = BABYLON.MeshBuilder.CreateSphere('spark', { diameter: 0.09, segments: 4 }, this.scene);
      m.position.copyFrom(pos);
      m.material = this.sparkMaterial();
      m.isPickable = false;
      this.particles.push({
        mesh: m,
        vel: new BABYLON.Vector3((Math.random() - 0.5) * 9, Math.random() * 8, (Math.random() - 0.5) * 9),
        life: 0.3 + Math.random() * 0.35, maxLife: 0.65, gravity: 16, grow: -0.5
      });
    }
    for (let i = 0; i < 9; i++) {
      const m = BABYLON.MeshBuilder.CreateSphere('smoke', { diameter: 0.7, segments: 5 }, this.scene);
      m.position.set(pos.x + (Math.random() - 0.5) * 1.2, pos.y + Math.random() * 0.8, pos.z + (Math.random() - 0.5) * 1.2);
      m.material = this.smokeMaterial();
      m.isPickable = false;
      this.particles.push({
        mesh: m,
        vel: new BABYLON.Vector3((Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8),
        life: 0.8 + Math.random() * 0.7, maxLife: 1.5, gravity: -0.2, grow: 3.2
      });
    }
    this.shakeT = Math.max(this.shakeT, 1);
    if (typeof Game !== 'undefined') Game.playSound('explosion');
    if (remote) return;

    // Dégâts de zone aux autres joueurs.
    const radius = 9;
    for (const [id, obj] of this.remotePlayers) {
      if (id === Net.id) continue;
      const p = obj.root.position;
      const d = BABYLON.Vector3.Distance(new BABYLON.Vector3(pos.x, p.y, pos.z), p);
      if (d < radius) {
        const dmg = Math.max(12, Math.round(70 * (1 - d / radius)));
        Net.send({ type: 'hit', target: id, dmg });
      }
    }
    // Dégâts perso, réduits : on ne se punit pas trop.
    const cam = this.camera.position;
    const dc = BABYLON.Vector3.Distance(new BABYLON.Vector3(pos.x, cam.y, pos.z), cam);
    if (dc < radius && Net.connected) {
      const dmg = Math.max(6, Math.round(25 * (1 - dc / radius)));
      Net.send({ type: 'hit', target: Net.id, dmg });
    }
  },

  impact(point, normal, tool) {
    if (tool) { this.dustPuff(point, false); return; }
    const n = normal || BABYLON.Vector3.Up();
    for (let i = 0; i < 4; i++) {
      const m = BABYLON.MeshBuilder.CreateSphere('spark', { diameter: 0.05, segments: 4 }, this.scene);
      m.position.copyFrom(point);
      m.material = this.sparkMaterial();
      m.isPickable = false;
      this.particles.push({
        mesh: m,
        vel: n.scale(2.6).add(new BABYLON.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4)),
        life: 0.18 + Math.random() * 0.12, maxLife: 0.3, gravity: 14, grow: -0.6
      });
    }
    const f = BABYLON.MeshBuilder.CreateSphere('impact_flash', { diameter: 0.18, segments: 5 }, this.scene);
    f.position.copyFrom(point);
    f.material = this.sparkMaterial();
    f.isPickable = false;
    this.particles.push({ mesh: f, vel: BABYLON.Vector3.Zero(), life: 0.09, maxLife: 0.09, gravity: 0, grow: 2.5 });
  },

  dustPuff(pos, big) {
    const count = big ? 9 : 4;
    for (let i = 0; i < count; i++) {
      const m = BABYLON.MeshBuilder.CreateSphere('dust', { diameter: 0.3 + Math.random() * 0.25, segments: 4 }, this.scene);
      m.position.set(pos.x + (Math.random() - 0.5) * 0.7, pos.y - 1.35 + Math.random() * 0.3, pos.z + (Math.random() - 0.5) * 0.7);
      m.material = this.dustMaterial();
      m.isPickable = false;
      this.particles.push({
        mesh: m,
        vel: new BABYLON.Vector3((Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.7, (Math.random() - 0.5) * 1.2),
        life: 0.35 + Math.random() * 0.3, maxLife: 0.65, gravity: 0.4, grow: 2.2
      });
    }
  },

  sparkMaterial() {
    if (!this.sparkMat) {
      this.sparkMat = new BABYLON.StandardMaterial('spark_m', this.scene);
      this.sparkMat.emissiveColor = new BABYLON.Color3(1, 0.7, 0.25);
      this.sparkMat.diffuseColor = BABYLON.Color3.Black();
      this.sparkMat.disableLighting = true;
      this.sparkMat.alpha = 0.95;
    }
    return this.sparkMat;
  },

  smokeMaterial() {
    if (!this.smokeMat) {
      this.smokeMat = new BABYLON.StandardMaterial('smoke_m', this.scene);
      this.smokeMat.diffuseColor = new BABYLON.Color3(0.24, 0.23, 0.22);
      this.smokeMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
      this.smokeMat.specularColor = BABYLON.Color3.Black();
      this.smokeMat.alpha = 0.42;
      this.smokeMat.disableLighting = true;
    }
    return this.smokeMat;
  },

  boomMaterial() {
    if (!this.boomMat) {
      this.boomMat = new BABYLON.StandardMaterial('boom_m', this.scene);
      this.boomMat.emissiveColor = new BABYLON.Color3(1, 0.72, 0.28);
      this.boomMat.diffuseColor = BABYLON.Color3.Black();
      this.boomMat.disableLighting = true;
      this.boomMat.alpha = 0.9;
    }
    return this.boomMat;
  },

  dustMaterial() {
    if (!this.dustMat) {
      this.dustMat = new BABYLON.StandardMaterial('dust_m', this.scene);
      this.dustMat.diffuseColor = new BABYLON.Color3(0.55, 0.5, 0.4);
      this.dustMat.emissiveColor = new BABYLON.Color3(0.08, 0.07, 0.05);
      this.dustMat.specularColor = BABYLON.Color3.Black();
      this.dustMat.alpha = 0.32;
      this.dustMat.disableLighting = true;
    }
    return this.dustMat;
  },

  spawnPickup(type, x, y, z) {
    const color = type === 'health'
      ? new BABYLON.Color3(0.28, 0.85, 0.42)
      : new BABYLON.Color3(0.95, 0.62, 0.18);
    const root = new BABYLON.TransformNode('pickup_' + type, this.scene);
    root.parent = this.mapRoot;
    const box = BABYLON.MeshBuilder.CreateBox('pickup_box', { size: 0.55 }, this.scene);
    const bm = new BABYLON.StandardMaterial('pickup_box_m', this.scene);
    bm.diffuseColor = new BABYLON.Color3(0.1, 0.12, 0.1);
    bm.emissiveColor = color.scale(0.22);
    bm.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    box.material = bm;
    box.parent = root;
    box.isPickable = false;
    if (type === 'health') {
      const cm = new BABYLON.StandardMaterial('pickup_cross_m', this.scene);
      cm.emissiveColor = color;
      cm.disableLighting = true;
      const c1 = BABYLON.MeshBuilder.CreateBox('pickup_cross1', { width: 0.36, height: 0.1, depth: 0.08 }, this.scene);
      const c2 = BABYLON.MeshBuilder.CreateBox('pickup_cross2', { width: 0.1, height: 0.36, depth: 0.08 }, this.scene);
      [c1, c2].forEach(c => {
        c.material = cm; c.parent = root; c.position.set(0, 0, -0.3); c.isPickable = false;
      });
    } else {
      for (let i = 0; i < 3; i++) {
        const b = BABYLON.MeshBuilder.CreateCylinder('pickup_bullet', { diameter: 0.07, height: 0.24, tessellation: 8 }, this.scene);
        const mm = new BABYLON.StandardMaterial('pickup_bullet_m', this.scene);
        mm.emissiveColor = color;
        mm.disableLighting = true;
        b.material = mm;
        b.parent = root;
        b.position.set((i - 1) * 0.12, 0.02, -0.3);
        b.rotation.z = Math.PI / 2;
        b.isPickable = false;
      }
    }
    const beam = BABYLON.MeshBuilder.CreateCylinder('pickup_beam', { diameter: 0.45, height: 2.6, tessellation: 12 }, this.scene);
    const beamMat = new BABYLON.StandardMaterial('pickup_beam_m', this.scene);
    beamMat.diffuseColor = color;
    beamMat.emissiveColor = color;
    beamMat.alpha = 0.15;
    beamMat.disableLighting = true;
    beamMat.backFaceCulling = false;
    beam.material = beamMat;
    beam.parent = root;
    beam.position.y = 0.7;
    beam.isPickable = false;
    root.position.set(x, y, z);
    this.pickups.push({ type, root, baseY: y, respawnAt: 0, active: true });
  },

  pickupBurst(pos) {
    for (let i = 0; i < 8; i++) {
      const m = BABYLON.MeshBuilder.CreateSphere('pickup_spark', { diameter: 0.06, segments: 4 }, this.scene);
      m.position.copyFrom(pos);
      m.material = this.sparkMaterial();
      m.isPickable = false;
      this.particles.push({
        mesh: m,
        vel: new BABYLON.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3),
        life: 0.3, maxLife: 0.3, gravity: 8, grow: -0.5
      });
    }
  },

  muzzleFlash(pos, dir, tool) {
    if (tool) {
      // Un outil, ça fait juste un petit éclat de poussière.
      const dust = BABYLON.MeshBuilder.CreateSphere('dust', { diameter: 0.22 }, this.scene);
      dust.position.copyFrom(pos);
      dust.material = this.mat('dustm', '#c9b48a');
      dust.material.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.25);
      setTimeout(() => dust.dispose(), 80);
      return;
    }
    const flash = BABYLON.MeshBuilder.CreateSphere('flash', { diameter: 0.35 }, this.scene);
    flash.position.copyFrom(pos);
    flash.material = this.mat('flashm', '#fff2b0');
    flash.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
    setTimeout(() => flash.dispose(), 65);

    const end = pos.add(dir.scale(30));
    const tracer = BABYLON.MeshBuilder.CreateLines('tracer', { points: [pos, end] }, this.scene);
    tracer.color = new BABYLON.Color3(1, 0.75, 0.25);
    setTimeout(() => tracer.dispose(), 85);
  },

  makeRemote(id, skinKey, weaponKey, weaponSkin) {
    const skin = this.SKINS[skinKey] || this.SKINS.default;
    const rig = Models.character(this.scene, {
      id: 'remote_' + id, color: skin.color, gear: skin.gear,
      pattern: skin.pattern, weapon: weaponKey || 'pistol',
      weaponSkin: weaponSkin || 'standard', tone: '#c99a70'
    });
    rig.root.getChildMeshes().forEach(m => {
      m.isPickable = false;
      m.checkCollisions = false;
      if (this.shadow) this.shadow.addShadowCaster(m);
    });
    return { rig, root: rig.root, body: rig.torso, head: rig.head,
      skinKey, weaponKey: weaponKey || 'pistol',
      weaponSkin: weaponSkin || 'standard', moving: false, lastPos: null };
  },

  syncRemote(id, data) {
    let obj = this.remotePlayers.get(id);
    if (!obj) {
      obj = this.makeRemote(id, data.skin, data.weapon, data.weaponSkin);
      this.remotePlayers.set(id, obj);
    }
    if (obj.skinKey !== data.skin) {
      Models.applySkin(this.scene, obj.rig, this.SKINS[data.skin] || this.SKINS.default);
      obj.skinKey = data.skin;
    }
    if (data.weapon && obj.weaponKey !== data.weapon) {
      Models.setHeldWeapon(this.scene, obj.rig, data.weapon, data.weaponSkin || obj.weaponSkin);
      obj.weaponKey = data.weapon;
    }
    if (data.weaponSkin && data.weaponSkin !== obj.weaponSkin) {
      Models.setHeldWeapon(this.scene, obj.rig, obj.weaponKey, data.weaponSkin);
      obj.weaponSkin = data.weaponSkin;
    }
    if (data.pos) {
      const nx = data.pos.x, ny = (data.pos.y || this.eyeHeight) - this.eyeHeight + 0.11, nz = data.pos.z;
      if (obj.lastPos) {
        const moved = Math.abs(nx - obj.lastPos.x) + Math.abs(nz - obj.lastPos.z);
        obj.moving = moved > 0.03;
      }
      obj.lastPos = { x: nx, z: nz };
      obj.root.position.set(nx, ny, nz);
    }
    if (typeof data.rot === 'number') obj.root.rotation.y = data.rot;
  },

  removeRemote(id) {
    const obj = this.remotePlayers.get(id);
    if (obj) {
      Models.dispose(obj.root);
      this.remotePlayers.delete(id);
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Saut + hauteur du sol                                              */
  /* ------------------------------------------------------------------ */
  jump() {
    if (!this.controlsEnabled) return false;
    if (this.grounded) {
      // Si on saute pendant une glissade, la caméra est plongée sous le sol :
      // on la remet à hauteur avant d'appliquer l'impulsion.
      this.camera.position.y = this.groundHeightBelow(this.camera.position);
      this.jumpVel = 0.3;
      this.grounded = false;
      this.airJumps = 1;
      return true;
    }
    // Double saut : une seule fois par saut, avec un petit regain.
    if (this.airJumps > 0) {
      this.airJumps--;
      this.jumpVel = 0.27;
      return 'double';
    }
    return false;
  },

  slide() {
    if (!this.controlsEnabled || !this.grounded || this.slideT > 0 || this.slideCool > 0) return false;
    this.slideT = 1;
    this.slideCool = 2.4;
    return true;
  },

  groundHeightBelow(pos) {
    const ray = new BABYLON.Ray(
      new BABYLON.Vector3(pos.x, pos.y + 0.9, pos.z),
      new BABYLON.Vector3(0, -1, 0), 30
    );
    const hit = this.scene.pickWithRay(ray, m =>
      m.checkCollisions && !/^(remote_|char_|body_|head_|gun_|view|c_|tag_|dust|flash|tracer|npc_|weapon_)/.test(m.name)
    );
    if (hit && hit.hit && hit.pickedPoint) return hit.pickedPoint.y + this.eyeHeight;
    return this.eyeHeight;
  },

  onFrame() {
    const dt = Math.min(this.engine.getDeltaTime() / 16.67, 3);
    const cam = this.camera;
    const groundY = this.groundHeightBelow(cam.position);
    const fallSpeed = this.jumpVel;
    const wasGrounded = this.grounded;

    if (cam.position.y > groundY + 0.02 || this.jumpVel > 0) {
      this.jumpVel -= 0.018 * dt;
      cam.position.y += this.jumpVel * dt;
      if (cam.position.y <= groundY) {
        cam.position.y = groundY;
        this.jumpVel = 0;
        this.grounded = true;
        this.airJumps = 1;
      } else this.grounded = false;
    } else {
      cam.position.y = groundY;
      this.jumpVel = 0;
      this.grounded = true;
      this.airJumps = 1;
    }
    // À l'atterrissage, un nuage de poussière pour marquer le poids du bonhomme.
    if (!wasGrounded && this.grounded && fallSpeed < -0.12) this.dustPuff(cam.position, true);

    // Glissade : boost, caméra qui plonge, FOV qui s'ouvre et poussière.
    this.slideT = Math.max(0, this.slideT - 0.022 * dt);
    this.slideCool = Math.max(0, this.slideCool - 0.02 * dt);
    this.shakeT = Math.max(0, this.shakeT - 0.035 * dt);
    const slideArc = this.slideT > 0 ? Math.sin((1 - this.slideT) * Math.PI) : 0;
    // La plongée ne s'applique qu'au sol : en l'air, elle écraserait le saut.
    if (slideArc > 0.15 && this.grounded) {
      cam.position.y -= slideArc * 0.34;
      if (Math.random() < 0.35) this.dustPuff(cam.position, false);
    }

    cam.speed = this.baseSpeed * (this.shift ? 2 : 1) * (this.slideT > 0 ? 1.75 : 1);
    const targetFov = 0.8 + (this.shift && this.controlsEnabled ? 0.05 : 0) + (this.slideT > 0 ? 0.10 : 0);
    cam.fov += (targetFov - cam.fov) * Math.min(1, 0.12 * dt);

    // Viewmodel : recul, balancement, sway souris, recharge et changement d'arme.
    if (this.viewRoot && this.viewBase) {
      const v = this.viewBase;
      const now = performance.now();
      const moved = this.viewLastPos ? BABYLON.Vector3.Distance(cam.position, this.viewLastPos) : 0;
      this.viewLastPos = cam.position.clone();
      const dRot = cam.rotation.y - this.viewLastRotY;
      this.viewLastRotY = cam.rotation.y;

      this.viewSwayX += (Math.max(-0.055, Math.min(0.055, -dRot * 0.55)) - this.viewSwayX) * Math.min(1, 0.2 * dt);
      this.viewSwayY += (-Math.min(0.03, Math.abs(dRot) * 0.4) - this.viewSwayY) * Math.min(1, 0.18 * dt);

      const enMouvement = moved > 0.001;
      this.viewPhase += (enMouvement ? (this.shift ? 0.24 : 0.14) : 0.012) * dt;
      const amp = Math.min(moved * 0.055, 0.014) * (this.shift ? 1.5 : 1);
      const bx = Math.sin(this.viewPhase) * amp;
      const by = Math.abs(Math.cos(this.viewPhase)) * amp * 0.85;

      this.recoil = Math.max(0, this.recoil - 0.10 * dt);
      this.reloadT = Math.max(0, this.reloadT - 0.018 * dt);
      this.switchT = Math.max(0, this.switchT - 0.035 * dt);
      const reloadArc = Math.sin(this.reloadT * Math.PI);
      const switchArc = Math.sin(this.switchT * Math.PI);

      // Trick F : rotation complète, petit lancer et retour propre.
      let trX = 0, trY = 0, trZ = 0, trLift = 0, trPull = 0;
      if (this.trickT > 0) {
        this.trickT = Math.min(1, this.trickT + dt * 0.029);
        const p = this.trickT;
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const arc = Math.sin(p * Math.PI);
        trLift = arc * 0.10;
        trPull = arc * 0.05;
        if (this.trickType === 'tool') {
          trZ = ease * Math.PI * 4;          // double twirl de pioche/pelle
          trX = arc * 0.4;
          trY = arc * 0.35;
        } else {
          trY = ease * Math.PI * 2;          // un tour complet du flingue
          trZ = arc * 0.6;
          trX = Math.sin(p * Math.PI * 2) * 0.14;
        }
        if (this.trickT >= 1) this.trickT = 0;
      }

      // Show G : ~2 s, trois figures qui s'enchaînent. Tout finit sur un
      // multiple de 2π pour que l'arme retombe exactement à sa place.
      let shX = 0, shY = 0, shZ = 0, shLift = 0, shPull = 0;
      if (this.showT > 0) {
        this.showT = Math.min(1, this.showT + dt * 0.0085);
        const p = this.showT;
        const seg = (a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
        const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const charge = ease(seg(0, 0.10)) - ease(seg(0.82, 0.95)); // on arme, puis on relâche
        const a = ease(seg(0.08, 0.44));  // 1. deux tours sur Y
        const b = ease(seg(0.40, 0.72));  // 2. trois flips sur X
        const c = ease(seg(0.68, 0.88));  // 3. deux twirls sur Z
        const d = ease(seg(0.86, 1));     // 4. snap final
        const vol = Math.sin(p * Math.PI);
        const rebond = Math.sin(d * Math.PI * 3) * (1 - d) * 0.07;

        shY = a * Math.PI * 4 + b * Math.PI * 2 + c * Math.PI * 2;
        shX = charge * 0.22 + b * Math.PI * 4 + c * Math.PI * 2 + rebond;
        shZ = vol * 0.25 + b * Math.PI * 2 + c * Math.PI * 4 + rebond * 0.6;
        shLift = -charge * 0.04 + vol * 0.20;
        shPull = charge * 0.07 + vol * 0.10;
        // Outils : encore plus de twirl, moins de flips.
        if (this.showType === 'tool') {
          shX = charge * 0.22 + b * Math.PI * 2 + rebond;
          shZ = vol * 0.25 + b * Math.PI * 2 + c * Math.PI * 6 + rebond * 0.6;
        }
        if (this.showT >= 1) this.showT = 0;
      }

      // Le projecteur de l'arme encaisse le show, puis revient au régime normal.
      if (this.viewLight) {
        this.viewLight.intensity = 2.4 + (this.showT > 0 ? Math.sin(this.showT * Math.PI) * 1.5 : 0);
      }

      const tremble = (Math.random() - 0.5) * this.shakeT * 0.05;
      this.viewRoot.position.set(
        v.pos[0] + bx + this.viewSwayX - trPull - shPull,
        v.pos[1] + by + this.viewSwayY - reloadArc * 0.17 - switchArc * 0.24 - this.recoil * 0.015 + trLift + shLift - slideArc * 0.10,
        v.pos[2] - this.recoil * 0.13 + switchArc * 0.12
      );
      this.viewRoot.rotation.set(
        v.rot[0] + this.recoil * 0.17 + reloadArc * 0.36 + switchArc * 0.22 + trX + shX + slideArc * 0.08 + tremble,
        v.rot[1] + this.viewSwayX * 0.6 + reloadArc * 0.14 + trY + shY,
        v.rot[2] + Math.sin(this.viewPhase * 0.5) * amp * 1.4 +
          (this.shift ? Math.sin(now * 0.012) * 0.024 : 0) + reloadArc * 0.12 + switchArc * 0.18 + trZ + shZ + slideArc * 0.18 + tremble
      );
    }

    // Grenades : vol, rebond sur la géométrie, puis explosion.
    const dtSec = dt / 60;
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.life -= dtSec;
      const step = g.vel.scale(dtSec);
      if (step.lengthSquared() > 0.000001) {
        const ray = new BABYLON.Ray(g.mesh.position.clone(), step.normalize(), step.length() + 0.08);
        const hit = this.scene.pickWithRay(ray, m =>
          m.checkCollisions && !/^(remote_|char_|body_|head_|gun_|view|c_|tag_|dust|flash|tracer|npc_|weapon_|pickup|grenade|spark|smoke|boom|impact)/.test(m.name)
        );
        if (hit && hit.hit && hit.pickedPoint) {
          const n = hit.getNormal(true);
          g.mesh.position.copyFrom(hit.pickedPoint.add(n.scale(0.12)));
          g.vel = g.vel.subtract(n.scale(2 * BABYLON.Vector3.Dot(g.vel, n))).scale(0.42);
        } else {
          g.mesh.position.addInPlace(step);
          g.vel.y -= 17 * dtSec;
        }
      }
      if (g.mesh.position.y < 0.12) {
        g.mesh.position.y = 0.12;
        if (g.vel.y < 0) g.vel.y = -g.vel.y * 0.38;
        g.vel.x *= 0.72; g.vel.z *= 0.72;
      }
      g.mesh.rotation.x += 5 * dtSec;
      g.mesh.rotation.z += 3 * dtSec;
      if (g.life <= 0) {
        const pos = g.mesh.position.clone();
        try { g.mesh.dispose(false, true); } catch (_) { /* déjà partie */ }
        this.grenades.splice(i, 1);
        this.explode(pos, g.remote);
      }
    }

    // Particules légères (étincelles, fumée, poussière).
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dtSec;
      if (p.life <= 0) {
        try { p.mesh.dispose(); } catch (_) { /* déjà partie */ }
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= (p.gravity || 0) * dtSec;
      p.mesh.position.addInPlace(p.vel.scale(dtSec));
      const k = Math.max(0, p.life / p.maxLife);
      p.mesh.visibility = k;
      if (p.grow) {
        const sc = Math.max(0.02, 1 + (1 - k) * p.grow);
        p.mesh.scaling.setAll(sc);
      }
    }

    // Bonus : rotation, flottement, ramassage et respawn.
    if (this.pickups.length) {
      const now = performance.now();
      for (const p of this.pickups) {
        if (!p.active) {
          if (now > p.respawnAt) {
            p.active = true;
            p.root.setEnabled(true);
          }
          continue;
        }
        p.root.rotation.y += 0.02 * dt;
        p.root.position.y = p.baseY + Math.sin(now * 0.0022) * 0.12;
        if (typeof Game !== 'undefined' && Game.started) {
          const dx = cam.position.x - p.root.position.x;
          const dz = cam.position.z - p.root.position.z;
          if (dx * dx + dz * dz < 2.25 && Math.abs(cam.position.y - p.root.position.y) < 2.2) {
            if (Game.collectPickup(p.type)) {
              this.pickupBurst(p.root.position);
              p.active = false;
              p.root.setEnabled(false);
              p.respawnAt = now + 15000;
            }
          }
        }
      }
    }

    // Garde-fou : si la machine souffre, on coupe l'occlusion ambiante en premier.
    this.qualityTimer += dt;
    if (this.qualityTimer > 240) {
      this.qualityTimer = 0;
      if (this.ssao && this.engine.getFps() < 40) {
        try { this.ssao.dispose(); } catch (_) { /* déjà rangé */ }
        this.ssao = null;
        console.info('SSAO coupé : le GPU respire.');
      }
    }

    // Personnages articulés : PNJ au ralenti, joueurs en fonction de leur vitesse
    const t = performance.now();
    for (const npc of this.npcs) {
      if (npc.rig) Models.animate(npc.rig, t * 0.35, false);
    }
    for (const obj of this.remotePlayers.values()) {
      if (obj.rig) Models.animate(obj.rig, t, obj.moving);
    }
  },

  render() { this.engine.runRenderLoop(() => this.scene.render()); }
};
