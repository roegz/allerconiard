# ALLERCONIARD

Un FPS jouable dans le navigateur, fait par robotbot. Pas de compte, pas d'installe, tu click et tu joues.

---

## Lancer le truc

```powershell
cd C:\Users\robotbot\Documents\robotbotjeuxfps
npm.cmd start
```

Ouvre **http://localhost:3000**. C'est tout.

---

## Commandes

Touches physiques, donc ça marche sur AZERTY **et** QWERTY (Z/A = W/A sur un clavier US).

| Touche | Action |
|--------|--------|
| **Z Q S D** (ou WASD) | Marcher (vitesse 0.8) |
| **Souris** | Regarder |
| **Clic gauche** | Tirer / frapper |
| **Espace** | Sauter, puis **double saut** en l'air |
| **Shift** | Courir (x2) |
| **C** | Glissade (boost + caméra au sol) |
| **Q** | Lancer une grenade |
| **1 / 2 / 3 / 4** ou **molette** | Changer d'arme |
| **F** | Trick d'arme (tour complet au flingue, double twirl aux outils) |
| **G** | **Grand show** : ~2 s de figures, trois tours et un snap final |
| **B** | Changer de finition d'arme (parmi celles débloquées) |
| **R** | Recharger |
| **E** | Parler aux PNJ |
| **M** | Changer de map (pour tout le serveur) |
| **T** | Chat |
| **Tab** | Éditeur (uniquement sur la map perso) |

---

## Les armes

Quatre trucs dans la ceinture, chacun avec son look à l'écran et son petit bruit :

| Touche | Arme | Dégâts | Munitions |
|--------|------|--------|-----------|
| 1 | Allerconipistolet | 18 | 12 |
| 2 | Carabine du coin | 24 | 30 |
| 3 | Pioche | 34 | ∞ |
| 4 | Pelle | 26 | ∞ |

Les outils ont une cadence plus lente mais tapent plus fort. Le recul et le bruit changent avec l'arme.

Avec **F**, tu fais tourner l'arme que tu tiens : un tour complet sur Y pour les flingues, un double twirl sur Z pour la pioche et la pelle (avec un petit lancer et un sifflement). Ça marche avec toutes les finitions et ça ne bloque pas le tir.

**G**, c'est le grand show : ~2 secondes d'enchaînement — l'arme se recule, monte, fait deux tours sur Y, trois flips sur X, deux twirls sur Z, le projecteur monte en puissance, puis tout retombe d'un coup avec un rebond et un clac. Version outil : encore plus de twirls. Les deux tricks s'excluent mutuellement et sont bloqués pendant la recharge ou le changement d'arme.

Chaque arme est un vrai modèle 3D fait main (boîtier, canon, chargeur, viseur, détente, vis, etc.) — pas un cube coloré. Toutes les pièces ont des **bords arrondis** (mesh généré avec normales lissées), donc plus d'arêtes coupantes à 90°. Tout est construit par `public/js/models.js` au chargement, sans fichier à télécharger.

---

## Pack fun

Tout ce qui rend une partie vivante, sans sortir du style tactique :

- **Grenades (Q)** — trois en poche, une se reforme toutes les 22 s. La grenade rebondit sur les murs et le sol, puis explose : flash, lumière, étincelles, fumée, secousse d'écran et dégâts de zone (plus tu es loin, moins tu prends). Les autres joueurs voient la grenade voler et exploser, le lanceur applique les dégâts.
- **Glissade (C)** — boost de vitesse, plongée de caméra, FOV qui s'ouvre, poussière sous les pieds. Recharge en 2,4 s.
- **Double saut (Espace en l'air)** — un second saut par passage dans les airs, avec un nuage de poussière et un bruit sec.
- **Bonus (soin / munitions)** — des caisses flottantes avec faisceau lumineux sur les trois maps. Le soin rend 35 PV, les munitions remplissent le chargeur et rendent une grenade. Chaque bonus réapparaît 15 s après avoir été ramassé.
- **Impacts de balle** — étincelles et bruit à chaque tir sur le décor, flash sur les ennemis touchés. Plus de balles qui traversent silencieusement le monde.
- **Sprint et glissade** — le FOV s'ouvre quand tu cours, le viewmodel tremble, la caméra respire.
- **Séries d'éliminations** — DOUBLE FRAG, TRIPLE FRAG, QUADRA, RAMPAGE, avec XP bonus dans le feed.
- **Mort et respawn** — quand tu tombes, tu réapparais au spawn de la map, face au centre, avec 100 PV.
- **Atterrissage** — un nuage de poussière quand tu retombes d'un saut ou d'un toit.
- **Chat et touches** — les actions sont bloquées quand tu tapes dans le chat, et maintenir une touche ne spamme plus les grenades, sauts ou glissades.

### Finition des armes

Huit finitions, toutes en **camo militaire réaliste** généré pixel par pixel (bruit fractal multi-échelles, grain de toile, taches organiques, éraflures) :

| Finition | Déblocage |
|----------|-----------|
| De série | dispo |
| Woodland | dispo |
| Désert | 60 XP |
| Multicam | 120 XP |
| Urbain | 200 XP |
| Neige | 350 XP |
| Nuit | 500 XP |
| Rouillé | 750 XP |

Tu choisis la finition dans le menu ou avec **B** en jeu. La finition est gardée quand tu changes d'arme et synchronisée avec les autres joueurs : tout le monde voit la vraie texture de ton arme.

---

## Les maps

Deux maps **officielles**, identiques pour tout le monde et non modifiables :

- **Allerconia** — le terrain d'origine. Bâtiment avec toit accessible, tour + passerelle, containers, garage, spawn bleu au nord et orange au sud.
- **Le Quai** — ambiance portuaire. Eau, trois grues, conteneurs empilés, quai surélevé, ponton de bois, fûts. Deux PNJ différents (Capitaine Marée, Mécanicien).

Une map **perso** : un sol vide, l'éditeur avec Tab, et le bouton « Partager au serveur » qui l'envoie à tout le monde. Export/import JSON possible.

Le choix de la map est synchronisé via WebSocket : si quelqu'un change de map avec **M**, tout le monde y va.

---

## Quêtes et skins

Six petites quêtes : Premier sang, Explorateur, Architecte, Diplomate, Marin d'eau douce, Cabriole.
Elles donnent de l'XP, et l'XP débloque les tenues (Woodland 50, Désert 100, Multicam 200, Neige 350, Nuit 500) **et** les finitions d'armes (voir plus haut).

Les tenues utilisent le même moteur de camo que les armes, avec une trame de toile. Le casque reprend le motif de la tenue. Tout est envoyé par WebSocket : les autres joueurs voient exactement ce que tu portes.

---

## Interface et animations

L'interface a été refondue : palette kaki/charbon, typographie sobre, grille technique, et animations partout (apparition des panneaux, survol des swatches, bandeau de tir, compteur de munitions, flash de dégât, feed de quêtes).

Côté 3D, le viewmodel a un vrai jeu d'animations : balancement selon la vitesse, sway souris, recul, mouvement de recharge (l'arme descend puis revient), animation quand tu changes d'arme, le trick sur **F** et le grand show sur **G**. Les personnages ont une marche articulée, le poids du corps, une respiration au repos et des bras qui suivent le mouvement.

---

## Rendu

Tout est généré à la volée, sans asset externe :

- **Ciel** : dôme avec dégradé zénith/horizon, nuages en bruit fractal et halo solaire. Les couleurs changent avec la map (crépuscule chaud sur Allerconia, brume froide sur le Quai).
- **Profondeur** : sol lointain brumeux et silhouettes d'usines autour de l'horizon, brouillard volumétrique léger.
- **Éclairage** : hémisphérique + soleil directionnel chaud + contre-jour froid. Ombres **PCF** (2048, rafraîchies à 30 Hz) et une lumière dédiée qui ne sculpte que l'arme à l'écran.
- **Matériaux** : texture de détail partagée (salissures, micro-relief) et bump map sur les murs, le sol, les routes. Fenêtres, marquages au sol et objets de toit cassent les aplats.
- **Post-FX** : FXAA + MSAA x4, bloom discret, étalonnage ACES, vignette. Occlusion ambiante **SSAO** — elle se coupe toute seule si le FPS passe sous 40, pour rester jouable sur un GPU intégré.

Le réticule est volontairement **sans point central** : juste quatre bras, comme il faut.

---

## Déployer sur Render

1. Pousse le dossier sur GitHub
2. render.com → **New → Web Service** → choisis le repo
3. Le fichier `render.yaml` fait le taf : `npm install` / `npm start` / healthcheck `/health`
4. Plan gratuit OK. Le premier visiteur après 15 min d'inactivité attend ~30 s (cold start). 7 $/mois si tu veux que ce soit toujours chaud.

---

## Dans le code

```
server/server.js   Express + WebSocket (joueurs, map, armes, finitions, tirs, chat)
public/index.html  Menu, HUD, atelier, dialogues
public/css/        Style (un peu brut, exprès)
public/js/net.js   WebSocket
public/js/models.js Modèles 3D détaillés + textures procedurales (armes, finitions, tenues)
public/js/world.js Babylon : maps, ciel, rendu/SSAO, saut, glissade, grenades, bonus, armes, tricks, PNJ
public/js/editor.js Éditeur + JSON
public/js/game.js  Contrôles, tir, grenades, bonus, séries, respawn, quêtes, HUD, sons
```

Pour rajouter une arme : une entrée dans `World.WEAPONS` + une position/échelle dans `World.VIEW` + un `case` dans `Models.weapon()`.
Pour rajouter une finition : une entrée dans `Models.TEX` (texture) et `Models.WEAPON_SKINS` (nom, XP, texture à utiliser).
Pour rajouter une map : une entrée dans `World.MAPS` + une fonction `buildMaMap()` + un bouton dans l'accueil et le menu M.

---

*Fait à la main. Si ça saute, c'est sûrement ma faute. — robotbot*
