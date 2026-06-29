# 🤖 Bot Discord — Sentinel

Bot Discord avec système de tickets, modération, vérification anti-raid et plus encore.

> ⚠️ **Important** : le bot fonctionne désormais avec des **commandes par préfixe `*`** (ex : `*clear 50`), et non plus avec des slash commands `/`. Le fichier `deploy-commands.js` n'existe plus : il n'y a rien à déployer, les commandes sont actives dès que le bot démarre.

---

## 📁 Structure du projet

```
discord-bot/
├── index.js                  # Point d'entrée (charge les commandes/events, préfixe = "*")
├── keep_alive.js             # Serveur HTTP pour Render
├── .env                      # Variables d'environnement (ne pas commit)
├── commands/
│   ├── admin/
│   │   ├── ticketconfig.js   # Config système de tickets
│   │   ├── verif.js          # Envoie l'embed "Vérification Sentinel" + bouton
│   │   ├── slowmode.js       # Mode lent
│   │   ├── clear.js          # Suppression de messages
│   │   ├── lockdown.js       # Verrouille le serveur (anti-raid manuel)
│   │   └── unlock.js         # Lève le verrouillage
│   ├── moderation/
│   │   ├── bl.js / unbl.js   # Ban / Unban
│   │   ├── mute.js / unmute.js
│   │   ├── kick.js
│   │   ├── bl-list.js
│   │   └── sanctions.js      # Implémentation commune
│   ├── general/
│   │   └── help.js           # Liste toutes les commandes
│   └── fun/
│       └── couple.js
├── events/
│   ├── ready.js
│   ├── guildMemberAdd.js     # Welcome + Antibot + Anti-raid (arrivées massives)
│   ├── messageCreate.js      # Dispatch des commandes + Antilink + Antibot + Anti-spam + filtre UHQ + vérification par ping
│   ├── interactionCreate.js  # Boutons/menus (tickets + bouton "Vérifier")
│   └── ticket_interaction.js # Logique d'ouverture/fermeture tickets
├── utils/
│   ├── storage.js            # Lecture/écriture JSON
│   ├── permissions.js        # Gestion des rôles/perms
│   ├── colors.js             # Couleur jaune unique pour toutes les embeds
│   ├── raid.js               # Détection raid (arrivées massives, spam)
│   └── verification.js       # Vérification du lien d'invitation dans le statut
└── data/                     # Fichiers JSON générés (config tickets, etc.)
```

---

## ⚙️ Installation

```bash
git clone https://github.com/TON_USERNAME/TON_REPO.git
cd discord-bot
npm install discord.js dotenv
```

### Configurer le `.env`

```env
DISCORD_TOKEN=ton_token_bot
```

(`CLIENT_ID` et `GUILD_ID` ne sont plus nécessaires : il n'y a plus de slash commands à déployer.)

### Permissions / Intents requis

Dans le **Developer Portal → Bot**, active les **Privileged Gateway Intents** :
- ✅ **Presence Intent** (obligatoire pour la vérification via statut)
- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

Dans **OAuth2 → URL Generator** :
- Scope : `bot`
- Permissions : Administrator (recommandé) ou au minimum Manage Roles, Kick Members, Ban Members, Moderate Members, Manage Channels, Manage Messages, View Audit Log.

### Lancer le bot

```bash
node index.js
```

---

## 📋 Commandes (préfixe `*`)

Toutes les commandes sont listées dynamiquement via `*help`. Résumé :

### 🛡️ Sécurité / Anti-raid
| Commande | Description | Permission |
|----------|-------------|------------|
| `*lockdown` | Verrouille le serveur (plus personne ne peut écrire, expulsion auto des comptes suspects) | Admin |
| `*unlock` | Lève le verrouillage | Admin |

### 🔧 Admin
| Commande | Description | Permission |
|----------|-------------|------------|
| `*verif` | Envoie l'embed "Vérification Sentinel" avec le bouton **Vérifier** | Admin |
| `*ticketconfig titre \|\| description \|\| #salon-logs \|\| categorieID \|\| @role1,@role2 \|\| Label1:Description1; Label2:Description2` | Configure et publie le système de tickets | Admin |
| `*slowmode <secondes>` | Mode lent du salon | Admin |
| `*clear [nombre]` | Supprime des messages (défaut/max 100) | Admin ou rôle autorisé |

### 🔨 Modération
| Commande | Description | Cooldown (non-admin) |
|----------|-------------|----------------------|
| `*bl @membre [jours] <raison>` | Bannir | 15 min |
| `*unbl <userid> [raison]` | Débannir par ID | — |
| `*mute @membre <durée_minutes> <raison>` | Muter (timeout) | 5 min |
| `*unmute @membre [raison]` | Démuter | — |
| `*kick @membre <raison>` | Expulser | 10 min |
| `*bl-list` | Liste des bannis | — |

### 🎉 Fun
| Commande | Description |
|----------|-------------|
| `*couple` | Trouve un couple aléatoire |

### ℹ️ Général
| Commande | Description |
|----------|-------------|
| `*help` | Affiche toutes les commandes |

---

## ✅ Système de vérification "Sentinel"

Deux façons de vérifier un membre — les deux vérifient si le lien d'invitation du serveur (`discord.gg/CzR6WEruEZ`, peu importe le format markdown) est présent dans le **statut personnalisé Discord** du membre :

1. **Embed + bouton** : `*verif` envoie une embed jaune *"Vérification Sentinel"* avec un bouton vert **Vérifier**. Le membre clique, le bot vérifie son statut et donne le rôle `1521264562412978227` si le lien est trouvé.
2. **Ping dans le salon dédié** : si un membre ping le bot dans le salon `1521264818047156224`, le bot fait la même vérification.

⚠️ Cette fonctionnalité nécessite que l'intent **Presence** soit activé (voir section Installation), sinon le bot ne pourra pas lire le statut des membres.

---

## 🛡️ Systèmes anti-raid

- **Antibot** : kick automatique de tout bot ajouté par un non-admin.
- **Antilink** : suppression des liens + mute 30s pour les non-admins.
- **Anti spam de messages** : timeout automatique si un membre envoie trop de messages en peu de temps.
- **Anti spam de mentions** : suppression + timeout si un message mentionne trop d'utilisateurs/rôles d'un coup.
- **Détection d'arrivées massives** : alerte dans le salon de sécurité si trop de membres rejoignent en peu de temps (raid potentiel) ; pendant une alerte ou en `*lockdown`, les comptes créés très récemment sont expulsés automatiquement.
- **`*lockdown` / `*unlock`** : verrouillage/déverrouillage manuel du serveur en cas d'attaque.
- **Vérification "Sentinel"** : tant qu'un membre n'a pas vérifié son statut, il n'a pas le rôle donnant accès au reste du serveur (à condition de bien configurer les permissions des salons pour qu'ils soient réservés au rôle vérifié).

---

## 🎟️ Système de tickets

Inchangé dans son fonctionnement, configuré désormais via `*ticketconfig` (voir tableau des commandes ci-dessus pour le format exact).

---

## 📝 Rôles de modération

| Rôle ID | Permissions |
|---------|-------------|
| `1520179219265622287` | ban, unban, kick, mute, unmute |
| `1520179219471142973` | ban, unban, kick, mute, unmute + clear |
| `1520179219521605732` | ban, unban, kick, mute, unmute |
| `1520189435449180342` | ban, unban, kick, mute, unmute + clear |
| `1520179219752030218` | mute, unmute uniquement |
| `1520179219190124566` | mute, unmute uniquement |

---

## 📊 Salons de logs

| Salon ID | Contenu |
|----------|---------|
| `1520179324643180667` | Sanctions (ban, kick, mute, unmute) |
| `1520179265809940521` | Sécurité (antilink, antibot, anti-raid, cooldown) |

---

## ⚠️ Notes importantes

1. Le bot doit avoir un rôle **au-dessus** des rôles qu'il gère.
2. Pour le timeout (mute), le bot a besoin de la permission `Moderate Members`.
3. Pour l'antibot, le bot a besoin de `View Audit Log`.
4. Les fonctionnalités **confession, citation automatique, autorole et gender** ont été retirées.
5. Toutes les embeds du bot sont désormais en **jaune**.
