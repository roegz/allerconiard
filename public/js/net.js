/** Gestion WebSocket +état des autres joueurs. */
const Net = {
  ws: null,
  id: null,
  connected: false,
  players: new Map(),
  onWorld: null,
  onChat: null,
  onHit: null,
  onShoot: null,
  onRoster: null,

  connect(name, skin, pos, rot) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${proto}//${location.host}/ws`);

    this.ws.onopen = () => {
      this.connected = true;
      this.send({ type: 'join', name, skin, pos, rot });
      this.updateStatus(true);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.updateStatus(false);
      setTimeout(() => this.connect(name, skin, pos, rot), 2500);
    };

    this.ws.onerror = () => this.updateStatus(false);

    this.ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      this.handle(m);
    };
  },

  handle(m) {
    switch (m.type) {
      case 'welcome':
        this.id = m.id;
        m.players.forEach(p => this.players.set(p.id, p));
        if (m.world && this.onWorld) this.onWorld(m.world);
        break;
      case 'roster':
        this.players.clear();
        m.players.forEach(p => this.players.set(p.id, p));
        if (this.onRoster) this.onRoster(this.players);
        break;
      case 'player:join':
        this.players.set(m.player.id, m.player);
        break;
      case 'player:leave':
        this.players.delete(m.id);
        break;
      case 'player:move': {
        const p = this.players.get(m.id);
        if (p) { p.pos = m.pos; p.rot = m.rot; }
        break;
      }
      case 'player:skin': {
        const p = this.players.get(m.id);
        if (p) p.skin = m.skin;
        break;
      }
      case 'player:hit':
        if (this.onHit) this.onHit(m);
        break;
      case 'fx:shoot':
        if (this.onShoot) this.onShoot(m);
        break;
      case 'chat':
        if (this.onChat) this.onChat(m);
        break;
      case 'world:update':
        if (this.onWorld) this.onWorld(m.world);
        break;
    }
  },

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  },

  updateStatus(ok) {
    const el = document.getElementById('server-status');
    if (!el) return;
    el.textContent = ok ? '● En ligne' : '● Hors ligne';
    el.classList.toggle('off', !ok);
    const count = document.getElementById('player-count');
    if (count) count.textContent = `${this.players.size + 1} joueur(s)`;
  }
};
