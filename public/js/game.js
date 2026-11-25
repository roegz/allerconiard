/* Allerconiard - gameplay, HUD et petites histoires.
   Tout ce qui suit est jouable direct. Amuse-toi bien. — robotbot */
const Game = {
  started: false,
  name: 'Coniard',
  skin: 'default',
  weapon: 'pistol',
  weaponSkin: 'standard',
  hp: 100,
  ammo: 12,
  grenades: 3,
  nextGrenadeAt: 0,
  streak: 0,
  lastKillAt: 0,
  lastImpactSound: 0,
  xp: 0,
  quests: {},
  lastMoveSend: 0,
  lastShot: 0,
  keys: {},
  audioCtx: null,

  init() {
    const picker = document.getElementById('skin-picker');
    Object.entries(World.SKINS).forEach(([key, s]) => {
      const el = document.createElement('div');
      el.className = 'skin' + (key === 'default' ? ' selected' : '') + (s.unlock > 0 ? ' locked' : '');
      el.style.background = s.swatch || `repeating-linear-gradient(45deg,${s.color} 0 10px,${Models.shade(s.color, .75)} 10px 20px)`;
      el.dataset.key = key;
      el.dataset.unlock = s.unlock;
      el.title = s.unlock > 0 ? `${s.name} — ${s.unlock} XP` : `${s.name} — dispo`;
      el.onclick = () => {
        if (s.unlock > this.xp) {
          this.note(`Encore ${s.unlock - this.xp} XP pour « ${s.name} ».`, 'warn');
          return;
        }
        picker.querySelectorAll('.skin').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        this.skin = key;
        if (Net.connected) Net.send({ type: 'skin', skin: key });
      };
      picker.appendChild(el);
    });

    const wpicker = document.getElementById('weapon-skin-picker');
    Object.entries(World.WEAPON_SKINS).forEach(([key, s]) => {
      const el = document.createElement('div');
      el.className = 'skin skin-weapon' + (key === 'standard' ? ' selected' : '') + (s.unlock > 0 ? ' locked' : '');
      el.style.background = s.swatch;
      el.dataset.key = key;
      el.dataset.unlock = s.unlock;
      el.title = s.unlock > 0 ? `${s.name} — ${s.unlock} XP` : `${s.name} — dispo`;
      el.onclick = () => this.setWeaponSkin(key);
      wpicker.appendChild(el);
    });

    const maps = document.getElementById('map-picker');
    Object.entries(World.MAPS).forEach(([key, m]) => {
      const card = document.createElement('button');
      card.className = 'map-card' + (key === 'allerconia' ? ' selected' : '');
      card.innerHTML = `<b>${m.name}</b><small>${m.label}</small><span>${m.desc}</span>`;
      card.onclick = () => {
        maps.querySelectorAll('.map-card').forEach(x => x.classList.remove('selected'));
        card.classList.add('selected');
        this.chosenMap = key;
      };
      maps.appendChild(card);
    });
    this.chosenMap = 'allerconia';

    document.getElementById('play-btn').onclick = () => this.start();
    document.getElementById('name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this.start();
    });

    document.getElementById('map-menu-close').onclick = () => this.closeMapMenu();
    this.bindControls();
    this.setWeapon('pistol', true);
    this.updateGrenades();
    World.render();
    this.loopHUD();
  },

  start() {
    this.name = document.getElementById('name-input').value.trim() || 'Coniard';
    this.started = true;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    World.loadMap(this.chosenMap, Editor.customData);
    World.controls(true);
    World.canvas.focus();
    const cam = World.camera;

    Net.connect(this.name, this.skin,
      { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      cam.rotation.y);
    Net.send({ type: 'weapon', weapon: this.weapon });
    Net.send({ type: 'weaponSkin', skin: this.weaponSkin });
    Net.send({ type: 'world:request' });
    this.lockPointer();
    this.note(`Bienvenue ${this.name}. Tire pas sur le Forgeron, il est sympa.`, 'info');
  },

  bindControls() {
    const canvas = World.canvas;

    canvas.addEventListener('click', () => {
      if (!this.started) return;
      if (Editor.active) {
        const pick = World.scene.pick(World.scene.pointerX, World.scene.pointerY,
          m => m === World.ground || m.name.startsWith('edit_'));
        Editor.place(pick && pick.hit ? pick.pickedPoint : null);
        return;
      }
      if (!document.pointerLockElement) {
        World.canvas.focus();
        this.lockPointer();
        return;
      }
      if (this.chatOpen() || !document.getElementById('map-menu').classList.contains('hidden')) return;
      this.shoot();
    });

    canvas.addEventListener('wheel', e => {
      if (!this.started || Editor.active) return;
      e.preventDefault();
      const i = World.weaponOrder.indexOf(this.weapon);
      const next = (i + (e.deltaY > 0 ? 1 : World.weaponOrder.length - 1)) % World.weaponOrder.length;
      this.setWeapon(World.weaponOrder[next]);
    }, { passive: false });

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (!this.started) return;
      // Ne pas déclencher d'actions pendant qu'on tape dans le chat.
      if (this.chatOpen()) return;
      // Le navigateur répète keydown quand on garde appuyé : une action = une pression.
      if (e.repeat) return;

      if (e.code === 'Tab') {
        e.preventDefault();
        Editor.toggle();
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        this.toggleMapMenu();
        return;
      }
      if (e.code === 'Escape' && !document.getElementById('map-menu').classList.contains('hidden')) {
        this.closeMapMenu();
        return;
      }
      if (e.code === 'KeyT' && !Editor.active && document.getElementById('map-menu').classList.contains('hidden')) {
        e.preventDefault();
        const inp = document.getElementById('chat-input');
        inp.classList.add('active');
        inp.focus();
        World.controls(false);
        return;
      }
      if (e.code === 'KeyE' && !Editor.active) { this.interact(); return; }
      if (e.code === 'KeyR' && !Editor.active) { this.reload(); return; }
      if (e.code === 'KeyF' && !Editor.active) {
        e.preventDefault();
        if (World.weaponTrick()) this.playSound('trick');
        return;
      }
      if (e.code === 'KeyG' && !Editor.active) {
        e.preventDefault();
        if (World.weaponShow()) {
          this.playSound('show');
          this.note('Grand show !', 'info');
        }
        return;
      }
      if (e.code === 'KeyQ' && !Editor.active) {
        e.preventDefault();
        this.throwGrenade();
        return;
      }
      if (e.code === 'KeyC' && !Editor.active) {
        e.preventDefault();
        if (World.slide()) {
          this.playSound('slide');
          World.dustPuff(World.camera.position, true);
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        const jump = World.jump();
        if (jump) {
          this.progress('jumper');
          this.playSound(jump === 'double' ? 'doublejump' : 'jump');
          if (jump === 'double') World.dustPuff(World.camera.position, true);
        }
        return;
      }
      if (e.code === 'KeyB' && !Editor.active) {
        e.preventDefault();
        const dispo = Object.keys(World.WEAPON_SKINS).filter(k => World.WEAPON_SKINS[k].unlock <= this.xp);
        const i = dispo.indexOf(this.weaponSkin);
        this.setWeaponSkin(dispo[(i + 1) % dispo.length]);
        return;
      }
      const num = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (num !== -1) this.setWeapon(World.weaponOrder[num]);
    });

    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    const chat = document.getElementById('chat-input');
    chat.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const text = chat.value.trim();
        if (text) Net.send({ type: 'chat', text });
        chat.value = ''; chat.classList.remove('active'); chat.blur();
        World.controls(true);
        this.lockPointer();
      }
      if (e.key === 'Escape') {
        chat.classList.remove('active'); chat.blur(); World.controls(true);
      }
    });

    document.getElementById('dialog-close').onclick = () => this.closeDialog();
  },

  chatOpen() {
    return document.getElementById('chat-input').classList.contains('active');
  },

  lockPointer() {
    try {
      const p = World.canvas.requestPointerLock?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* le navigateur refuse parfois, on s'en fiche */ }
  },

  /* ---------- Armes ---------- */
  setWeapon(key, silent) {
    if (!World.WEAPONS[key]) return;
    this.weapon = key;
    const w = World.WEAPONS[key];
    this.ammo = w.mag;
    World.buildViewModel(key, this.weaponSkin);
    document.getElementById('weapon-name').textContent = w.name;
    document.getElementById('weapon-skin-name').textContent = World.WEAPON_SKINS[this.weaponSkin].name;
    this.updateAmmo();
    if (this.started) {
      Net.send({ type: 'weapon', weapon: key });
      if (!silent) this.note(`À la main : ${w.name}`, 'info');
    }
  },

  setWeaponSkin(key, silent) {
    const skin = World.WEAPON_SKINS[key];
    if (!skin) return;
    if (skin.unlock > this.xp) {
      this.note(`Encore ${skin.unlock - this.xp} XP pour « ${skin.name} ».`, 'warn');
      return;
    }
    this.weaponSkin = key;
    World.buildViewModel(this.weapon, key);
    const el = document.getElementById('weapon-skin-name');
    if (el) el.textContent = skin.name;
    document.querySelectorAll('#weapon-skin-picker .skin').forEach(x =>
      x.classList.toggle('selected', x.dataset.key === key));
    if (Net.connected) Net.send({ type: 'weaponSkin', skin: key });
    if (!silent) this.note(`Finition : ${skin.name}.`, 'info');
  },

  reload() {
    const w = World.WEAPONS[this.weapon];
    if (w.type !== 'gun') return;
    this.ammo = w.mag;
    World.weaponReload();
    this.playSound('reload');
    this.note('Chargeur plein.', 'info');
    this.updateAmmo();
  },

  throwGrenade() {
    if (this.grenades <= 0) {
      this.note('Plus de grenades. Ça se reforme tout seul.', 'warn');
      this.playSound('empty');
      return;
    }
    const cam = World.camera;
    const dir = cam.getForwardRay().direction;
    const from = cam.position.add(dir.scale(0.7)).add(new BABYLON.Vector3(0, -0.15, 0));
    this.grenades--;
    this.nextGrenadeAt = performance.now() + 22000;
    this.updateGrenades();
    World.throwGrenade(from, dir, false);
    this.playSound('throw');
    Net.send({ type: 'grenade', from: { x: from.x, y: from.y, z: from.z }, dir: { x: dir.x, y: dir.y, z: dir.z } });
  },

  updateGrenades() {
    const el = document.getElementById('grenades');
    if (!el) return;
    el.innerHTML = `${this.grenades} <small>/ 3</small>`;
    el.classList.toggle('empty', this.grenades <= 0);
  },

  collectPickup(type) {
    if (type === 'health') {
      if (this.hp >= 100) return false;
      this.hp = Math.min(100, this.hp + 35);
      this.note('+35 PV — trousse de soin.', 'info');
    } else {
      const w = World.WEAPONS[this.weapon];
      const gun = w.type === 'gun';
      const ammoFull = !gun || this.ammo >= w.mag;
      const grenadesFull = this.grenades >= 3;
      if (ammoFull && grenadesFull) return false;
      if (gun && !ammoFull) this.ammo = w.mag;
      if (!grenadesFull) this.grenades = Math.min(3, this.grenades + 1);
      this.updateAmmo();
      this.updateGrenades();
      this.note(!grenadesFull ? 'Munitions + 1 grenade.' : 'Chargeur rempli.', 'info');
    }
    this.playSound('pickup');
    return true;
  },

  registerKill() {
    const now = performance.now();
    if (now - this.lastKillAt > 9000) this.streak = 0;
    this.streak++;
    this.lastKillAt = now;
    this.gainXP(15);
    let label = null;
    if (this.streak === 2) label = 'DOUBLE FRAG';
    else if (this.streak === 3) label = 'TRIPLE FRAG';
    else if (this.streak === 4) label = 'QUADRA';
    else if (this.streak >= 5) label = 'RAMPAGE';
    if (label) {
      this.note(`${label} ! +${this.streak * 5} XP`, 'kill');
      this.gainXP(this.streak * 5);
      this.playSound('streak');
    }
  },

  updateAmmo() {
    const w = World.WEAPONS[this.weapon];
    const el = document.getElementById('ammo');
    el.innerHTML = w.mag
      ? `${this.ammo} <small>/ ${w.mag}</small>`
      : `<span class="tool-ammo">∞</span>`;
  },

  shoot() {
    const w = World.WEAPONS[this.weapon];
    const now = performance.now();
    if (now - this.lastShot < w.rate) return;

    if (w.type === 'gun' && this.ammo <= 0) {
      this.playSound('empty');
      this.note('Plus de balles. R pour recharger.', 'warn');
      return;
    }

    this.lastShot = now;
    if (w.type === 'gun') this.ammo--;
    World.recoilNow();
    World.weaponFire();
    this.playSound(w.type === 'tool' ? 'tool' : 'shot');
    this.flash('crosshair', 'firing', 110);
    this.flash('ammo', 'pop', 130);

    const cam = World.camera;
    const dir = cam.getForwardRay().direction;
    const from = cam.position.add(dir.scale(0.6));
    World.muzzleFlash(from, dir, w.type === 'tool');
    Net.send({ type: 'shoot', from: { x: from.x, y: from.y, z: from.z },
      dir: { x: dir.x, y: dir.y, z: dir.z }, weapon: this.weapon });

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
      Net.send({ type: 'hit', target: best, dmg: w.dmg });
      this.progress('first_blood');
      World.impact(cam.position.add(dir.scale(bestT)), dir.scale(-1), false);
      const who = Net.players.get(best)?.name || 'quelqu’un';
      this.note(`${w.type === 'tool' ? 'Tu as fracassé' : 'Touché'} ${who}.`, 'kill');
      this.flash('crosshair', 'hit', 180);
      if (w.type === 'tool') this.playSound('hittool');
    } else {
      // Impact sur le décor : petite étincelle et bruit sec, ça change tout.
      const worldHit = World.scene.pickWithRay(new BABYLON.Ray(from, dir, 80), m =>
        m.checkCollisions && !/^(remote_|char_|body_|head_|gun_|view|c_|tag_|dust|flash|tracer|npc_|weapon_|pickup|grenade|spark|smoke|boom|impact)/.test(m.name)
      );
      if (worldHit && worldHit.hit && worldHit.pickedPoint) {
        World.impact(worldHit.pickedPoint, worldHit.getNormal(true), w.type === 'tool');
        if (now - this.lastImpactSound > 55) {
          this.lastImpactSound = now;
          this.playSound('impact');
        }
      }
    }
    this.updateAmmo();
  },

  playSound(kind) {
    try {
      if (!this.audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.audioCtx = new AC();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      if (kind === 'show') {
        // Whoosh qui monte pendant les figures, puis clac sec à la retombée.
        const dur = 2;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const u = i / data.length;
          const t = i / ctx.sampleRate;
          const sweep = Math.sin(2 * Math.PI * (220 * t + 420 * t * t));
          const env = Math.sin(Math.PI * Math.pow(u, 0.8));
          const clac = u > 0.87 ? (Math.random() * 2 - 1) * Math.pow(1 - (u - 0.87) / 0.13, 3) : 0;
          data[i] = sweep * env * 0.45 + clac * 0.7;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.Q.value = 1.6;
        filt.frequency.setValueAtTime(300, ctx.currentTime);
        filt.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 1.4);
        filt.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 1.9);
        const gain = ctx.createGain();
        gain.gain.value = 0.11;
        src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
        src.start();
        return;
      }

      if (kind === 'explosion') {
        // Grosse détonation : bruit grave, souffle et queue qui s'éteint.
        const dur = 0.9;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const u = i / data.length;
          const t = i / ctx.sampleRate;
          const env = Math.pow(1 - u, 2.2);
          const rumble = Math.sin(2 * Math.PI * (55 * t + 20 * t * t));
          data[i] = ((Math.random() * 2 - 1) * 0.8 + rumble * 0.5) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.Q.value = 0.9;
        filt.frequency.setValueAtTime(1600, ctx.currentTime);
        filt.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.8);
        const gain = ctx.createGain();
        gain.gain.value = 0.22;
        src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
        src.start();
        return;
      }

      const cfg = {
        trick:      { dur: 0.24, type: 'bandpass', freq: 1900, q: 1.4, gain: 0.06, fade: 1.4 },
        tool:       { dur: 0.14, type: 'lowpass',  freq: 850,  gain: 0.13 },
        hittool:    { dur: 0.14, type: 'lowpass',  freq: 700,  gain: 0.13 },
        jump:       { dur: 0.10, type: 'lowpass',  freq: 400,  gain: 0.10 },
        doublejump: { dur: 0.16, type: 'bandpass', freq: 950,  q: 1.2, gain: 0.10 },
        slide:      { dur: 0.34, type: 'lowpass',  freq: 620,  gain: 0.10, fade: 1.2 },
        throw:      { dur: 0.18, type: 'bandpass', freq: 1200, q: 1.1, gain: 0.08 },
        impact:     { dur: 0.05, type: 'bandpass', freq: 2200, q: 1.8, gain: 0.06 },
        pickup:     { dur: 0.18, type: 'bandpass', freq: 1600, q: 1.2, gain: 0.09 },
        streak:     { dur: 0.30, type: 'bandpass', freq: 900,  q: 1.0, gain: 0.10, fade: 1.2 },
        empty:      { dur: 0.06, type: 'bandpass', freq: 800,  gain: 0.07 },
        reload:     { dur: 0.08, type: 'bandpass', freq: 1200, gain: 0.07 },
        shot:       { dur: 0.08, type: 'bandpass', freq: 1500, gain: 0.13 }
      }[kind] || { dur: 0.08, type: 'bandpass', freq: 1500, gain: 0.13 };

      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * cfg.dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const fade = Math.pow(1 - i / data.length, cfg.fade || 2);
        data[i] = (Math.random() * 2 - 1) * fade;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = cfg.type;
      filt.frequency.value = cfg.freq;
      if (cfg.q) filt.Q.value = cfg.q;
      const gain = ctx.createGain();
      gain.gain.value = cfg.gain;
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      src.start();
    } catch (_) { /* pas de son, pas de drame */ }
  },

  /* ---------- Maps ---------- */
  toggleMapMenu() {
    const menu = document.getElementById('map-menu');
    const open = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !open);
    World.controls(!open);
    if (open && document.pointerLockElement) document.exitPointerLock();
    const cur = document.getElementById('current-map');
    if (cur) cur.textContent = World.MAPS[World.currentMap].name;
  },

  closeMapMenu() {
    document.getElementById('map-menu').classList.add('hidden');
    World.controls(true);
    World.canvas.focus();
  },

  setMap(name) {
    if (!World.MAPS[name]) return;
    World.loadMap(name, Editor.customData);
    Net.send({ type: 'map:set', map: name });
    if (name === 'dock') this.progress('dock');
    this.note(`Map : ${World.MAPS[name].name}.`, 'info');
    this.closeMapMenu();
  },

  /* ---------- PNJ et quêtes ---------- */
  interact() {
    const cam = World.camera;
    let nearest = null, dist = 4;
    for (const npc of World.npcs) {
      const d = BABYLON.Vector3.Distance(cam.position, new BABYLON.Vector3(npc.pos.x, 1, npc.pos.z));
      if (d < dist) { dist = d; nearest = npc; }
    }
    if (nearest) this.openDialog(nearest);
    else this.checkZones();
  },

  openDialog(npc) {
    const text = document.getElementById('dialog-text');
    const actions = document.getElementById('dialog-actions');
    document.getElementById('dialog-title').textContent = npc.name;
    actions.innerHTML = '';

    if (npc.kind === 'forge') {
      text.textContent = '« T’as une pioche ? Bien. T’as une pelle ? Encore mieux. Ici on se débrouille avec ce qu’on trouve, pas avec un catalogue. »';
      const b = document.createElement('button');
      b.textContent = 'Lui dire merci (+50 XP)';
      b.onclick = () => {
        this.gainXP(50); this.progress('talker');
        this.note('Le Forgeron ronchonne, mais il est content.', 'info');
        this.closeDialog();
      };
      actions.appendChild(b);
    } else if (npc.kind === 'captain') {
      text.textContent = '« Le quai, c’est pas Disneyland. Les grues sont hautes, l’eau est froide et le vent a volé mes deux casquettes. »';
      const b = document.createElement('button');
      b.textContent = 'Demander des nouvelles (+25 XP)';
      b.onclick = () => { this.gainXP(25); this.note('Il te raconte l’histoire de la casquette perdue.', 'info'); this.closeDialog(); };
      actions.appendChild(b);
    } else {
      text.textContent = '« Patrouille du coin. Tire pas sur les potes. Et si tu veux refaire la map, c’est M puis Map perso, Tab pour construire. »';
      const b = document.createElement('button');
      b.textContent = 'Saluer';
      b.onclick = () => { this.note('Vous vous faites un coude à coude.', 'info'); this.closeDialog(); };
      actions.appendChild(b);
    }
    document.getElementById('dialog').classList.remove('hidden');
    World.controls(false);
    if (document.pointerLockElement) document.exitPointerLock();
  },

  closeDialog() {
    document.getElementById('dialog').classList.add('hidden');
    World.controls(true);
  },

  checkZones() {
    const p = World.camera.position;
    if (World.currentMap === 'allerconia' && p.x < -12 && p.z > 6) this.progress('explorer');
    if (World.currentMap === 'dock') {
      this.progress('dock');
      if (p.x < -2 && p.z > 6) this.progress('explorer');
    }
  },

  progress(id) {
    if (this.quests[id]) return;
    const q = World.QUESTS.find(x => x.id === id);
    if (!q) return;
    this.quests[id] = 1;
    this.note(`${q.title} — terminée. +${q.reward} XP`, 'quest');
    this.gainXP(q.reward);
  },

  gainXP(amount) {
    this.xp += amount;
    this.updateQuestHUD();
    document.querySelectorAll('#skin-picker .skin.locked, #weapon-skin-picker .skin.locked').forEach(el => {
      if (Number(el.dataset.unlock || 0) <= this.xp) {
        el.classList.remove('locked');
        el.title = el.title.split(' —')[0] + ' — débloqué';
      }
    });
  },

  updateQuestHUD() {
    const box = document.getElementById('quest-tracker');
    box.innerHTML = '<div class="quest-title">A faire</div>' +
      World.QUESTS.map(q => {
        const done = this.quests[q.id];
        return `<div class="quest-line ${done ? 'done' : ''}">${done ? '■' : '□'} ${q.title}</div>`;
      }).join('') +
      `<div class="xp-line">${this.xp} XP</div>`;
  },

  flash(id, className, ms) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), ms || 150);
  },

  note(text, kind) {
    const el = document.getElementById('killfeed');
    const d = document.createElement('div');
    d.className = 'note ' + (kind || 'info');
    d.textContent = text;
    el.prepend(d);
    setTimeout(() => d.remove(), 4200);
  },

  loopHUD() {
    setInterval(() => {
      const cam = World.camera;
      document.getElementById('hp-fill').style.width = this.hp + '%';
      document.getElementById('hp-text').textContent = this.hp;
      document.getElementById('fps').textContent = Math.round(World.engine.getFps()) + ' fps';
      document.getElementById('current-map').textContent = World.MAPS[World.currentMap].name;
      document.getElementById('sprint').classList.toggle('on', World.shift && this.started);
      const slideEl = document.getElementById('slide');
      if (slideEl) slideEl.classList.toggle('on', World.slideT > 0);

      // Grenades : une toutes les 22 s, jusqu'à 3.
      if (this.started && this.grenades < 3 && performance.now() >= this.nextGrenadeAt) {
        this.grenades++;
        this.nextGrenadeAt = performance.now() + 22000;
        this.updateGrenades();
        this.note('Grenade reformée.', 'info');
      }
      // Combo : il retombe si on ne tue plus pendant 9 s.
      if (this.streak > 0 && performance.now() - this.lastKillAt > 9000) this.streak = 0;

      if (this.started && Net.connected && !Editor.active) {
        const now = performance.now();
        if (now - this.lastMoveSend > 60) {
          this.lastMoveSend = now;
          Net.send({ type: 'move',
            pos: { x: +cam.position.x.toFixed(2), y: +cam.position.y.toFixed(2), z: +cam.position.z.toFixed(2) },
            rot: +cam.rotation.y.toFixed(3) });
        }
        this.checkZones();
      }
      for (const [id, data] of Net.players) {
        if (id !== Net.id) World.syncRemote(id, data);
      }
      for (const id of World.remotePlayers.keys()) {
        if (!Net.players.has(id)) World.removeRemote(id);
      }
    }, 100);
  }
};

/* ---------- Réseau ---------- */
Net.onChat = m => {
  const log = document.getElementById('chat-log');
  const d = document.createElement('div');
  d.innerHTML = `<b>${escapeHTML(m.name)}</b> ${escapeHTML(m.text)}`;
  log.appendChild(d);
  while (log.children.length > 8) log.removeChild(log.firstChild);
};

Net.onHit = m => {
  if (m.id === Net.id) {
    Game.hp = m.hp;
    Game.flash('damage-flash', 'on', 90);
    Game.flash('hp-bar', 'hit', 220);
    if (m.hp <= 0) {
      Game.hp = 100;
      Game.streak = 0;
    }
  }
};

Net.onDead = m => {
  if (m.by === Net.id && m.id !== Net.id) Game.registerKill();
  if (m.id === Net.id) {
    // Retour au spawn : on repart proprement, face au centre de la map.
    Game.hp = 100;
    Game.streak = 0;
    const meta = World.MAPS[World.currentMap];
    const spawn = meta.spawn;
    World.camera.position.set(spawn.x, spawn.y, spawn.z);
    World.camera.rotation.y = Math.atan2(meta.look.x - spawn.x, meta.look.z - spawn.z);
    World.jumpVel = 0;
    World.grounded = true;
    World.slideT = 0;
    World.slideCool = 0;
    Game.flash('damage-flash', 'on', 140);
    Game.note('Éliminé — retour au spawn.', 'warn');
  }
};

Net.onGrenade = m => {
  if (m.id === Net.id || !m.from || !m.dir) return;
  World.throwGrenade(
    new BABYLON.Vector3(m.from.x, m.from.y, m.from.z),
    new BABYLON.Vector3(m.dir.x, m.dir.y, m.dir.z),
    true
  );
};

Net.onShoot = m => {
  if (m.id === Net.id || !m.from || !m.dir) return;
  World.muzzleFlash(
    new BABYLON.Vector3(m.from.x, m.from.y, m.from.z),
    new BABYLON.Vector3(m.dir.x, m.dir.y, m.dir.z),
    (World.WEAPONS[m.weapon] || {}).type === 'tool'
  );
};

Net.onWorld = list => {
  Editor.customData = list;
  if (World.currentMap === 'custom') Editor.applyRemote(list);
};

Net.onMap = name => {
  if (!World.MAPS[name]) return;
  if (World.currentMap !== name) {
    World.loadMap(name, Editor.customData);
    if (Game.started) Game.note(`La map est passée en ${World.MAPS[name].name}.`, 'info');
  }
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
  Editor.onPlaceCount = n => { if (n >= 5) Game.progress('builder'); };
  Game.updateQuestHUD();
});
