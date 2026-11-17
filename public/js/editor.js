/** Éditeur de map : poser des objets, sauvegarde locale, partage serveur, JSON. */
const Editor = {
  active: false,
  objects: [],
  meshes: [],
  brush: 'mur',
  color: '#b5651d',
  size: 2,
  onPlaceCount: null,

  BRUSHES: {
    mur:    { w: 3, h: 3, d: 0.6, label: '🧱 Mur' },
    caisse: { w: 2, h: 2, d: 2, label: '📦 Caisse' },
    plate:  { w: 2, h: 0.3, d: 2, label: '⬛ Plateforme' },
    rampe:  { w: 2, h: 0.3, d: 3, label: '◢ Rampe' },
    lamp:   { w: 0.4, h: 1.5, d: 0.4, label: '💡 Lampe' },
    spawn:  { w: 1, h: 0.1, d: 1, label: '🚩 Spawn' },
    supp:   { label: '🗑 Supprimer' }
  },

  init() {
    const palette = document.getElementById('palette');
    Object.entries(this.BRUSHES).forEach(([key, b], i) => {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      if (i === 0) btn.classList.add('active');
      btn.onclick = () => {
        this.brush = key;
        palette.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
      };
      palette.appendChild(btn);
    });

    document.getElementById('brush-color').oninput = e => this.color = e.target.value;
    document.getElementById('brush-size').oninput = e => this.size = +e.target.value;
    document.getElementById('editor-done').onclick = () => this.toggle(false);
    document.getElementById('editor-clear').onclick = () => this.clear();
    document.getElementById('editor-share').onclick = () => this.share();
    document.getElementById('editor-export').onclick = () => this.exportJSON();
    document.getElementById('editor-import').onclick = () => this.importJSON();

    // Restaure la map locale
    try {
      const local = localStorage.getItem('allerconiard_map');
      if (local) this.load(JSON.parse(local));
    } catch {}
  },

  toggle(force) {
    this.active = force === undefined ? !this.active : force;
    document.getElementById('editor').classList.toggle('hidden', !this.active);
    document.getElementById('hud').classList.toggle('hidden', this.active);
    // On rend la main au joueur quand on quitte l'éditeur
    World.controls(!this.active && Game.started && !Game.chatOpen());
    // Pointer lock quitté quand on édite
    if (this.active && document.pointerLockElement) document.exitPointerLock();
  },

  place(point) {
    if (!this.active || !point) return;
    if (this.brush === 'supp') {
      const pick = this.pickObject(point);
      if (pick !== -1) this.removeAt(pick);
      return;
    }
    const b = this.BRUSHES[this.brush];
    const s = this.size;
    const obj = {
      type: this.brush,
      x: +point.x.toFixed(2), y: +(b.h / 2).toFixed(2), z: +point.z.toFixed(2),
      w: b.w * s / 2, h: b.h * s / 2, d: b.d * s / 2,
      color: this.color
    };
    this.objects.push(obj);
    this.spawnMesh(obj, this.meshes.length);
    if (this.onPlaceCount) this.onPlaceCount(this.objects.length);
    this.saveLocal();
  },

  pickObject(point) {
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const m = this.meshes[i];
      if (m && BABYLON.Vector3.Distance(m.position, point) < 2.2) return i;
    }
    return -1;
  },

  removeAt(i) {
    if (this.meshes[i]) this.meshes[i].dispose();
    this.meshes.splice(i, 1);
    this.objects.splice(i, 1);
    this.saveLocal();
  },

  spawnMesh(o, i) {
    const m = BABYLON.MeshBuilder.CreateBox('edit_' + i, {
      width: o.w * 2, height: o.h * 2, depth: o.d * 2
    }, World.scene);
    m.position.set(o.x, o.y, o.z);
    if (o.type === 'lamp') {
      m.material = World.mat('lampm_' + i, o.color);
      m.material.emissiveColor = BABYLON.Color3.FromHexString(o.color);
      const glow = new BABYLON.PointLight('glow_' + i, m.position, World.scene);
      glow.diffuse = BABYLON.Color3.FromHexString(o.color);
      glow.intensity = 0.6; glow.range = 10;
    } else {
      m.material = World.mat('editm_' + i, o.color);
    }
    m.checkCollisions = true;
    m.receiveShadows = true;
    if (World.shadow) World.shadow.addShadowCaster(m);
    this.meshes[i] = m;
  },

  clear() {
    this.meshes.forEach(m => m && m.dispose());
    this.meshes = [];
    this.objects = [];
    this.saveLocal();
  },

  load(list) {
    this.clear();
    (list || []).forEach((o, i) => {
      this.objects.push(o);
      this.spawnMesh(o, i);
    });
  },

  saveLocal() {
    localStorage.setItem('allerconiard_map', JSON.stringify(this.objects));
  },

  share() {
    Net.send({ type: 'world:save', world: this.objects });
    alert('Map partagée avec tous les joueurs connectés !');
  },

  exportJSON() {
    document.getElementById('editor-json').value = JSON.stringify(this.objects, null, 2);
  },

  importJSON() {
    try {
      const list = JSON.parse(document.getElementById('editor-json').value);
      if (!Array.isArray(list)) throw new Error('Pas une liste');
      this.load(list);
      this.saveLocal();
      alert('Map importée !');
    } catch (e) {
      alert('JSON invalide : ' + e.message);
    }
  },

  applyRemote(list) {
    this.load(list);
    localStorage.setItem('allerconiard_map', JSON.stringify(list));
  }
};
