/**
 * Allerconiard - serveur léger
 * - sert le client (HTML/JS/CSS)
 * - relaye les joueurs via WebSocket (positions, tirs, chat, map)
 * Aucune persistance lourde : tout reste en mémoire, redémarrage = reset.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html' }));
app.get('/health', (_req, res) => res.json({ ok: true, players: players.size }));

/* ---------- État en mémoire ---------- */
const players = new Map(); // id -> { id, name, skin, pos, rot, hp, ping, lastSeen }
let worldState = null; // dernière map partagée (posée par l'éditeur)
let nextId = 1;

function broadcast(payload, exceptId = null) {
  const data = JSON.stringify(payload);
  for (const [id, ws] of clients) {
    if (id !== exceptId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

const clients = new Map(); // id -> ws

wss.on('connection', (ws) => {
  const id = 'p' + nextId++;
  clients.set(id, ws);

  // État initial envoyé au nouveau joueur
  ws.send(JSON.stringify({
    type: 'welcome',
    id,
    players: Array.from(players.values()),
    world: worldState,
    count: players.size
  }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;

    const player = players.get(id) || { id };

    switch (msg.type) {
      case 'join': {
        player.name = String(msg.name || 'Coniard').slice(0, 20);
        player.skin = String(msg.skin || 'default').slice(0, 40);
        player.pos = msg.pos || { x: 0, y: 2, z: 6 };
        player.rot = msg.rot || 0;
        player.hp = 100;
        player.lastSeen = Date.now();
        players.set(id, player);
        broadcast({ type: 'player:join', player }, id);
        broadcast({ type: 'roster', players: Array.from(players.values()) });
        break;
      }
      case 'move': {
        if (!players.has(id)) break;
        player.pos = msg.pos;
        player.rot = msg.rot;
        player.lastSeen = Date.now();
        // diffusion légère (pas de broadcast à soi-même)
        broadcast({ type: 'player:move', id, pos: msg.pos, rot: msg.rot }, id);
        break;
      }
      case 'shoot': {
        broadcast({ type: 'fx:shoot', id, from: msg.from, dir: msg.dir, weapon: msg.weapon }, id);
        break;
      }
      case 'hit': {
        const target = players.get(msg.target);
        if (target) {
          target.hp = Math.max(0, (target.hp || 100) - (msg.dmg || 10));
          broadcast({ type: 'player:hit', id: msg.target, hp: target.hp, by: id });
          if (target.hp <= 0) {
            broadcast({ type: 'player:dead', id: msg.target, by: id });
            target.hp = 100; // réapparition simple
          }
        }
        break;
      }
      case 'chat': {
        const text = String(msg.text || '').slice(0, 200);
        if (text.trim()) broadcast({ type: 'chat', id, name: player.name || '?', text });
        break;
      }
      case 'skin': {
        player.skin = String(msg.skin || 'default').slice(0, 40);
        broadcast({ type: 'player:skin', id, skin: player.skin });
        break;
      }
      case 'world:save': {
        worldState = msg.world;
        broadcast({ type: 'world:update', world: worldState }, id);
        break;
      }
      case 'world:request': {
        if (worldState) ws.send(JSON.stringify({ type: 'world:update', world: worldState }));
        break;
      }
      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong', t: msg.t }));
        break;
      }
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    players.delete(id);
    broadcast({ type: 'player:leave', id });
    broadcast({ type: 'roster', players: Array.from(players.values()) });
  });

  ws.on('error', () => {});
});

// Nettoyage des joueurs fantômes
setInterval(() => {
  const now = Date.now();
  for (const [id, p] of players) {
    if (now - (p.lastSeen || 0) > 60000) players.delete(id);
  }
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Allerconiard listening on http://0.0.0.0:${PORT}`);
});
