# 🟠 Allerconiard

**FPS de rôle-play 100 % modifiable — créé par robotbot**

Un jeu dans le navigateur, style Counter-Strike, où tout est modifiable :
map éditable en direct, skins à débloquer, quêtes, PNJ, chat et joueurs en ligne.
Hébergeable gratuitement sur Render.

---

## 🎮 Jouer

### En local
```bash
npm install
npm start
```
Ouvre **http://localhost:3000**

### 🗺 Carte de départ « Allerconia »
Dès le lancement, la map est déjà construite et jouable :
- **Bâtiment Aviation** au centre, avec une porte et un toit accessible par l'escalier
- **Tour ouest + passerelle** pour dominer la rue
- **Zone containers** (quête Explorateur)
- **Garage RP** avec le Forgeron
- **Zones de spawn** bleue (CT, nord) et orange (T, sud)
- Caisses, couvertures, lampadaires et enseigne **ALLERCONIARD — par robotbot**

### Commandes (clavier AZERTY)
| Touche | Action |
|--------|--------|
| **Z Q S D** | Marcher (codes physiques W A S D, adaptés à l'AZERTY) |
| **Souris** | Regarder |
| **Clic gauche** | Tirer |
| **E** | Parler aux PNJ / interagir |
| **T** | Chat |
| **Tab** | Éditeur de map |
| **R** | Recharger |

---

## 🛠 Éditeur de map (Tab)

- Choisis un objet dans la palette (mur, caisse, plateforme, rampe, lampe, spawn, gomme)
- Ajuste la couleur et la taille
- **Clique sur le sol** pour poser / supprimer
- **Partager au serveur** : la map s'applique à **tous les joueurs connectés**
- **Exporter / Importer JSON** : partage tes créations sous forme de texte
- Sauvegarde automatique dans le navigateur (`localStorage`)

---

## 🎯 Quêtes & skins

| Quête | Objectif | Récompense |
|-------|----------|------------|
| Premier sang | Toucher un joueur | 50 XP |
| Explorateur | Aller au container | 50 XP |
| Architecte | Poser 5 objets | 100 XP |
| Diplomate | Parler au Forgeron | 50 XP |

Skins déblocables avec l'XP : Désert (50), Néon (100), Or massif (250), Fantôme (500).
Le skin sélectionné est synchronisé avec les autres joueurs.

---

## 🚀 Déployer sur Render

1. Crée un compte sur [render.com](https://render.com)
2. **New → Web Service** → connecte ce dépôt GitHub
3. Render détecte automatiquement `render.yaml` :
   - **Build** : `npm install`
   - **Start** : `npm start`
   - **Health check** : `/health`
4. Plan **Free** suffit. Clique sur **Create Web Service**.
5. L'URL publique type `https://allerconiard.onrender.com` est prête à partager.

> ⚠️ Sur le plan gratuit, Render met le service en veille après ~15 min d'inactivité.
> Le premier visiteur après la veille attend ~30-50 s (cold start). Passe au plan Starter (7 $/mois)
> pour un service toujours actif.

---

## 🧩 Architecture

```
allerconiard/
├── server/
│   └── server.js        # Express + WebSocket (positions, tirs, chat, map)
├── public/
│   ├── index.html       # Interface (menu, HUD, éditeur, dialogues)
│   ├── css/style.css    # Style HUD / overlays
│   └── js/
│       ├── net.js       # Client WebSocket + état des joueurs
│       ├── world.js     # Scène Babylon.js, map, PNJ, skins, quêtes
│       ├── editor.js    # Éditeur de map + JSON
│       └── game.js      # Contrôles, tir, HUD, progression
├── package.json
├── render.yaml
└── README.md
```

---

## 🔧 Ajouter du contenu

- **Nouveau skin** : ajoute une entrée dans `World.SKINS` (`world.js`)
- **Nouvelle quête** : ajoute dans `World.QUESTS` puis appelle `Game.progress('id')`
- **Nouvel objet éditable** : ajoute dans `Editor.BRUSHES` (`editor.js`)
- **Nouvelle arme** : modifie `MAX_AMMO` / dégâts dans `Game.shoot()` (`game.js`)

---

*Allerconiard — un projet libre, modifiable et fait pour s'amuser. Bon jeu, coniard ! 🟠*
