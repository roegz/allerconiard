/** Allerconiard - logique de jeu, progression et HUD. */
const Game = {
  started: false,
  name: 'Coniard',
  skin: 'default',
  hp: 100,
  ammo: 12,
  maxAmmo: 12,
  xp: 0,
  quests: {},
  lastMoveSend: 0,
  keys: {},

  init() {
    // Skins dans le menu
    const picker = document.getElementById('skin-picker');
    Object.entries(World.SKINS).forEach(([key, s]) => {
      const el = document.createElement('div');
      el.className = 'skin' + (key === 'default' ? ' selected' : '') + (s.unlock > 0 ? ' locked' : '');
      el.style.background = s.color;
      el.title = `${s.name} — ${s.unlock > 0 ? s.unlock + ' XP' : 'Gratuit'}`;
      el.onclick = () => {
        if (s.unlock > this.xp) return alert(`Il faut ${s.unlock} XP pour débloquer ${s.name}.`);
        picker.querySelectorAll('.skin').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        this.skin = key;
      };
      picker.appendChild(el);
    });

    document.getElementById('play-btn').onclick = () => this.start();
    document.getElementById('name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this.start();
    });

    this.bindControls();
    World.render();
    this.loopHUD();
  },

  start() {
    const input = document.getElementById('name-input').value.trim();
    this.name = input || 'Coniard';
    this.started = true;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    const cam = World.camera;
    cam.position.set(0, 1.7, 12);

    Net.connect(this.name, this.skin,
      { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      cam.rotation.y);

    this.lockPointer();

    // Récupère la map partagée si elle existe
    Net.send({ type: 'world:request' });
  },

  bindControls() {
    const canvas = World.canvas;

    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.started && !Editor.active && !this.chatOpen()) {
        // on ne force pas le re-lock (navigateur), l'utilisateur clique pour reprendre
      }
    });

    canvas.addEventListener('click', () => {
      if (!this.started) return;
      if (Editor.active) {
        const pick = World.scene.pick(World.scene.pointerX, World.scene.pointerY,
          m => m === World.ground || m.name.startsWith('edit_'));
        Editor.place(pick && pick.hit ? pick.pickedPoint : null);
        return;
      }
      if (!document.pointerLockElement) {
        this.lockPointer();
        return;
      }
      if (this.chatOpen()) return;
      this.shoot();
    });

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.started) Editor.toggle();
        return;
      }
      if (e.code === 'KeyT' && this.started && !Editor.active) {
        e.preventDefault();
        const inp = document.getElementById('chat-input');
        inp.classList.add('active');
        inp.focus();
        return;
      }
      if (e.code === 'KeyE' && this.started && !Editor.active) {
        this.interact();
        return;
      }
      if (e.code === 'KeyR' && this.started) {
        this.ammo = this.maxAmmo;
      }
    });

    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    const chat = document.getElementById('chat-input');
    chat.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const text = chat.value.trim();
        if (text) Net.send({ type: 'chat', text });
        chat.value = ''; chat.classList.remove('active'); chat.blur();
        this.lockPointer();
      }
      if (e.key === 'Escape') { chat.classList.remove('active'); chat.blur(); }
    });

    document.getElementById('dialog-close').onclick = () =>
      document.getElementById('dialog').classList.add('hidden');
  },

  chatOpen() {
    return document.getElementById('chat-input').classList.contains('active');
  },

  lockPointer() {
    try {
      const p = World.canvas.requestPointerLock?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* navigateur refuse (ex: automation) : on joue sans */ }
  },

  shoot() {
    if (this.ammo <= 0) { this.ammo = this.maxAmmo; return; }
    this.ammo--;
    const cam = World.camera;
    const dir = cam.getForwardRay().direction;
    const from = cam.position.add(dir.scale(0.6));

    World.muzzleFlash(from, dir);
    Net.send({ type: 'shoot', from: { x: from.x, y: from.y, z: from.z },
      dir: { x: dir.x, y: dir.y, z: dir.z }, weapon: 'allerconipistolet' });

    // Raycast contre les joueurs distants
    const ray = new BABYLON.Ray(cam.position, dir, 80);
    let best = null, bestT = Infinity;
    for (const [id, remote] of World.remotePlayers) {
      if (id === Net.id) continue;
      for (const mesh of [remote.body, remote.head]) {
        const hit = ray.intersectsMesh(mesh, false);
        if (hit.hit && hit.distance < bestT) { bestT = hit.distance; best = id; }
      }
    }
    if (best && bestT < 60) {
      const dmg = 18;
      Net.send({ type: 'hit', target: best, dmg });
      this.progress('first_blood');
      this.addFeed(`Vous avez touché ${Net.players.get(best)?.name || 'un joueur'}`);
    }
  },

  interact() {
    const cam = World.camera;
    let nearest = null, dist = 4;
    for (const npc of World.npcs) {
      const d = BABYLON.Vector3.Distance(cam.position, new BABYLON.Vector3(npc.pos.x, 1, npc.pos.z));
      if (d < dist) { dist = d; nearest = npc; }
    }
    if (nearest) this.openDialog(nearest);
    else if (cam.position.x < -12 && cam.position.z > 6) this.progress('explorer');
  },

  openDialog(npc) {
    const dlg = document.getElementById('dialog');
    document.getElementById('dialog-title').textContent = npc.name;
    const actions = document.getElementById('dialog-actions');
    actions.innerHTML = '';

    if (npc.kind === 'forge') {
      document.getElementById('dialog-text').textContent =
        '« T’veux une vraie skin ?ramasse de l’XP. Chaque chose que tu fais ici compte, coniard. »';
      const b = document.createElement('button');
      b.textContent = 'Parler (50 XP)';
      b.onclick = () => { this.gainXP(50); this.progress('talker'); dlg.classList.add('hidden'); };
      actions.appendChild(b);
    } else {
      document.getElementById('dialog-text').textContent =
        '« Patrouille du coin. Tire pas sur les potes, et aide-toi avec l’éditeur (Tab). »';
      const b = document.createElement('button');
      b.textContent = 'Saluer';
      b.onclick = () => { this.addFeed('Vous saluez la patrouille.'); dlg.classList.add('hidden'); };
      actions.appendChild(b);
    }
    dlg.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  },

  progress(id) {
    if (this.quests[id]) return;
    const q = World.QUESTS.find(x => x.id === id);
    if (!q) return;
    this.quests[id] = 1;
    this.addFeed(`✔ Quête : ${q.title} (+${q.reward} XP)`);
    this.gainXP(q.reward);
  },

  gainXP(amount) {
    this.xp += amount;
    this.updateQuestHUD();
    // débloque visuellement les skins dans le menu
    const locked = document.querySelectorAll('#skin-picker .skin.locked');
    locked.forEach(el => {
      const key = Object.keys(World.SKINS).find(k => World.SKINS[k].name === el.title.split(' —')[0]);
      if (key && World.SKINS[key].unlock <= this.xp) {
        el.classList.remove('locked');
        el.title = World.SKINS[key].name + ' — Débloqué !';
      }
    });
  },

  updateQuestHUD() {
    const box = document.getElementById('quest-tracker');
    box.innerHTML = '<div class="quest-title">📋 QUÊTES</div>' +
      World.QUESTS.map(q => {
        const done = this.quests[q.id];
        return `<div class="quest-line">${done ? '✔' : '○'} ${q.title} <small>${q.desc}</small></div>`;
      }).join('') +
      `<div class="quest-line" style="color:#f0a64a">XP : ${this.xp}</div>`;
  },

  addFeed(text) {
    const el = document.getElementById('killfeed');
    const d = document.createElement('div');
    d.textContent = text;
    el.prepend(d);
    setTimeout(() => d.remove(), 4000);
  },

  loopHUD() {
    setInterval(() => {
      document.getElementById('ammo').innerHTML = `${this.ammo} <small>/ ${this.maxAmmo}</small>`;
      document.getElementById('hp-fill').style.width = this.hp + '%';
      document.getElementById('hp-text').textContent = this.hp;
      const fps = Math.round(World.engine.getFps());
      document.getElementById('fps').textContent = fps + ' FPS';

      if (this.started && Net.connected && !Editor.active) {
        const cam = World.camera;
        const now = performance.now();
        if (now - this.lastMoveSend > 60) {
          this.lastMoveSend = now;
          Net.send({ type: 'move',
            pos: { x: +cam.position.x.toFixed(2), y: +cam.position.y.toFixed(2), z: +cam.position.z.toFixed(2) },
            rot: +cam.rotation.y.toFixed(3) });
        }
        // Zone container
        if (cam.position.x < -12 && cam.position.z > 6) this.progress('explorer');
      }

      // Synchro des joueurs distants
      for (const [id, data] of Net.players) {
        if (id !== Net.id) World.syncRemote(id, data);
      }
      for (const id of World.remotePlayers.keys()) {
        if (!Net.players.has(id)) World.removeRemote(id);
      }
    }, 100);
  }
};

/* ---------- Branchement des callbacks réseau ---------- */
Net.onChat = (m) => {
  const log = document.getElementById('chat-log');
  const d = document.createElement('div');
  d.innerHTML = `<b>${escapeHTML(m.name)}</b> : ${escapeHTML(m.text)}`;
  log.appendChild(d);
  while (log.children.length > 8) log.removeChild(log.firstChild);
};

Net.onHit = (m) => {
  if (m.id === Net.id) {
    Game.hp = m.hp;
    if (m.hp <= 0) Game.addFeed('Vous êtes tombé… réapparition.');
  }
};

Net.onShoot = (m) => {
  if (m.id === Net.id || !m.from || !m.dir) return;
  const p = new BABYLON.Vector3(m.from.x, m.from.y, m.from.z);
  const d = new BABYLON.Vector3(m.dir.x, m.dir.y, m.dir.z);
  World.muzzleFlash(p, d);
};

Net.onWorld = (list) => {
  Editor.applyRemote(list);
};

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Boot ---------- */
window.addEventListener('DOMContentLoaded', () => {
  World.init(document.getElementById('game'));
  Editor.init();
  Game.init();
  Editor.onPlaceCount = (n) => { if (n >= 5) Game.progress('builder'); };
  Game.updateQuestHUD();
});
