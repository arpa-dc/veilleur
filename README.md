# 🤖 Bot Discord — All-in-One

Bot Discord complet avec système de tickets, autorole, modération, confessions, citations automatiques et bien plus.

---

## 📁 Structure du projet

```
discord-bot/
├── index.js                  # Point d'entrée
├── deploy-commands.js        # Script de déploiement des slash commands
├── keep_alive.js             # Serveur HTTP pour Render
├── package.json
├── .env                      # Variables d'environnement (ne pas commit)
├── commands/
│   ├── admin/
│   │   ├── ticketconfig.js   # Config système de tickets
│   │   ├── autorole.js       # Menu de rôles automatiques
│   │   ├── gender.js         # Menu de rôles genre
│   │   ├── citation.js       # Scheduler de citations
│   │   ├── slowmode.js       # Mode lent
│   │   └── clean.js          # Suppression de messages
│   ├── moderation/
│   │   ├── bl.js             # Ban
│   │   ├── unbl.js           # Unban
│   │   ├── mute.js           # Mute (timeout)
│   │   ├── unmute.js         # Unmute
│   │   ├── kick.js           # Kick
│   │   └── bl-list.js        # Liste des bannis
│   └── fun/
│       ├── confession.js     # Confession anonyme
│       └── couple.js         # Couple aléatoire
├── events/
│   ├── ready.js              # Scheduler citations + logs connexion
│   ├── guildMemberAdd.js     # Welcome + Antibot
│   ├── messageCreate.js      # Antilink + filtre UHQ
│   ├── interactionCreate.js  # Handler global interactions
│   └── ticket_interaction.js # Logique d'ouverture/fermeture tickets
├── utils/
│   ├── storage.js            # Lecture/écriture JSON
│   └── permissions.js        # Gestion des rôles/perms
└── data/
    └── citations.js          # ~500 citations
```

---

## ⚙️ Installation

### 1. Cloner le repo

```bash
git clone https://github.com/TON_USERNAME/TON_REPO.git
cd discord-bot
npm install
```

### 2. Configurer le `.env`

Copie `.env.example` → `.env` et remplis :

```env
DISCORD_TOKEN=ton_token_bot
CLIENT_ID=id_de_ton_application
GUILD_ID=id_de_ton_serveur
```

- **DISCORD_TOKEN** → [Discord Developer Portal](https://discord.com/developers/applications) → ton app → Bot → Token
- **CLIENT_ID** → Onglet "General Information" → Application ID
- **GUILD_ID** → Clic droit sur ton serveur Discord → "Copier l'identifiant"

### 3. Permissions du bot

Dans le Developer Portal → OAuth2 → URL Generator :
- Scopes : `bot`, `applications.commands`
- Permissions bot :
  - Administrator (pour tout gérer facilement)  
  OU les permissions individuelles :
  - Manage Roles, Kick Members, Ban Members, Moderate Members, Manage Channels, Manage Messages, Read Message History, Send Messages, View Channels

### 4. Déployer les commandes

```bash
node deploy-commands.js
```

### 5. Lancer le bot

```bash
npm start
```

---

## 🚀 Déploiement sur Render

### Étape 1 — Mettre le code sur GitHub

1. Crée un repo GitHub (privé recommandé)
2. Push le code :
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/TON_REPO.git
git push -u origin main
```

> ⚠️ **Ne jamais commit le fichier `.env`** (il est dans `.gitignore`)

### Étape 2 — Créer un Web Service sur Render

1. Va sur [render.com](https://render.com) et connecte ton GitHub
2. **New → Web Service**
3. Sélectionne ton repo
4. Configuration :
   - **Name** : `discord-bot` (ou ce que tu veux)
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. Dans **Environment Variables**, ajoute :
   - `DISCORD_TOKEN` = ton token
   - `CLIENT_ID` = ton client ID
   - `GUILD_ID` = ton guild ID
6. Clique **Create Web Service**

### Étape 3 — Cron Job pour garder le bot éveillé

Render met en veille les services gratuits après 15 min d'inactivité.

**Option A : Cron Job Render** (si plan payant)
- New → Cron Job → Schedule : `*/10 * * * *` → Command : `curl https://TON_SERVICE.onrender.com`

**Option B : Cron-job.org (gratuit)**
1. Va sur [cron-job.org](https://cron-job.org)
2. Crée un compte gratuit
3. New Cronjob :
   - URL : `https://TON-SERVICE.onrender.com`
   - Schedule : toutes les 10 minutes
4. Active-le

Le `keep_alive.js` répond sur `/` avec un HTTP 200, ce qui suffit pour garder le service actif.

---

## 📋 Commandes

### 🔧 Admin
| Commande | Description |
|----------|-------------|
| `/ticketconfig` | Configurer le système de tickets avec embed personnalisée |
| `/autorole` | Créer un menu de rôles automatiques (max 10) |
| `/gender` | Créer un menu de rôles genre (max 5) |
| `/citation` | Info sur le scheduler de citations (auto au démarrage) |
| `/slowmode [secondes]` | Définir un mode lent (0 = désactiver) |
| `/clean [nombre]` | Supprimer des messages du salon |

### 🔨 Modération
| Commande | Description | Cooldown (non-admin) |
|----------|-------------|----------------------|
| `/bl @membre raison` | Bannir un membre | 15 min |
| `/unbl userid raison` | Débannir par ID | — |
| `/mute @membre durée raison` | Muter (timeout) | 5 min |
| `/unmute @membre` | Démuter | — |
| `/kick @membre raison` | Expulser | 10 min |
| `/bl-list` | Liste des membres bannis | — |

### 🎉 Fun
| Commande | Description |
|----------|-------------|
| `/confession [message]` | Envoyer une confession anonyme |
| `/couple` | Trouver un couple aléatoire |

---

## 🛡️ Systèmes automatiques

### Antilink
- Détecte tout lien HTTP/HTTPS ou invitation Discord
- Supprime le message + mute 30 secondes
- Log dans `#1520179265809940521`

### Antibot
- Bloque l'ajout de bots par des non-admins
- Kick automatique du bot
- Log dans `#1520179265809940521`

### Filtre "uhq"
- Répond "t'as pas hq mek" si quelqu'un écrit "uhq"
- Ignoré pour les admins et les rôles `1520179219471142973` / `1520189435449180342`

### Citations automatiques
- Envoie une citation toutes les **7 heures** dans `#1520179295270469632`
- ~500 citations stockées, repart au début quand toutes épuisées
- État sauvegardé dans `data/citation_state.json`

### Welcome
- Message "parle bouffon @membre" dans `#1520179265784643625` à chaque arrivée

---

## 🎟️ Système de tickets

### Configuration via `/ticketconfig`
- Titre, description, couleur, footer, images personnalisables
- Jusqu'à 5 options dans le menu déroulant
- Rôles modérateurs configurables
- Salon de logs dédié
- Catégorie Discord pour les tickets

### Fonctionnement
1. L'utilisateur choisit une option dans le menu
2. Un salon privé est créé avec le nom `raison-username`
3. Une embed de bienvenue est envoyée avec bouton "Fermer le ticket"
4. Seuls les modérateurs peuvent fermer le ticket
5. Fermeture = suppression du salon après 5s + log

---

## 📝 Rôles de modération

| Rôle ID | Permissions |
|---------|-------------|
| `1520179219265622287` | ban, unban, kick, mute, unmute |
| `1520179219471142973` | ban, unban, kick, mute, unmute + clean |
| `1520179219521605732` | ban, unban, kick, mute, unmute |
| `1520189435449180342` | ban, unban, kick, mute, unmute + clean |
| `1520179219752030218` | mute, unmute uniquement |
| `1520179219190124566` | mute, unmute uniquement |

---

## 📊 Salons de logs

| Salon ID | Contenu |
|----------|---------|
| `1520179324643180667` | Sanctions (ban, kick, mute, unmute) |
| `1520179265809940521` | Sécurité (antilink, antibot, cooldown violations) |
| `1520186767561461891` | Logs confessions (qui a envoyé quoi) |

---

## 🔧 Format des options pour `/autorole` et `/gender`

```
label|description|roleId
```

Exemple :
```
Staff|Rôle de staff|1234567890123456789
Membre|Rôle membre de base|9876543210987654321
```

---

## ⚠️ Notes importantes

1. Le bot doit avoir un rôle **au-dessus** des rôles qu'il gère
2. Pour le timeout (mute), le bot a besoin de la permission `Moderate Members`
3. Pour l'antibot, le bot a besoin de `View Audit Log`
4. Les données (config tickets, autoroles, etc.) sont stockées en JSON local dans `/data/` — sur Render, elles sont **réinitialisées** à chaque redéploiement (comportement normal pour un service gratuit). Pour une persistance permanente, envisage MongoDB ou une base SQLite.
