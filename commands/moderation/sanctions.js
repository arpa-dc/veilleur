const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPermission } = require('../../utils/permissions');
const { YELLOW } = require('../../utils/colors');

const LOGS_CHANNEL_ID = '1520179324643180667';
const SECURITY_LOGS_ID = '1520179265809940521';
const SERVER_INVITE = 'https://discord.gg/wEccEnmCj7';

// Cooldowns en ms
const COOLDOWNS = { ban: 15 * 60 * 1000, mute: 5 * 60 * 1000, kick: 10 * 60 * 1000 };

function getCooldownKey(userId, action) { return `${userId}_${action}`; }

function checkCooldown(client, userId, action) {
  const key = getCooldownKey(userId, action);
  const last = client.cooldowns.get(key) || 0;
  const elapsed = Date.now() - last;
  const cd = COOLDOWNS[action] || 0;
  if (elapsed < cd) return Math.ceil((cd - elapsed) / 1000);
  return 0;
}

function setCooldown(client, userId, action) {
  const key = getCooldownKey(userId, action);
  client.cooldowns.set(key, Date.now());
}

async function logSanction(guild, client, action, target, author, reason, extra = '') {
  const ch = await guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(YELLOW)
    .setTitle(`🔨 Sanction — ${action.toUpperCase()}`)
    .addFields(
      { name: 'Utilisateur', value: `${target.user?.tag || target.tag} (${target.id})`, inline: true },
      { name: 'Raison', value: reason || 'Aucune raison', inline: true },
      { name: 'Durée', value: extra || '—', inline: true }
    )
    .setTimestamp();
  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function logCooldownViolation(guild, client, action, targetId, authorId) {
  const ch = await guild.channels.fetch(SECURITY_LOGS_ID).catch(() => null);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(YELLOW)
    .setTitle('⏱️ Tentative de sanction trop rapide')
    .addFields(
      { name: 'Auteur', value: `<@${authorId}>`, inline: true },
      { name: 'Cible', value: `<@${targetId}>`, inline: true },
      { name: 'Action', value: action, inline: true }
    )
    .setTimestamp();
  await ch.send({ embeds: [embed] }).catch(() => {});
}

// Récupère un membre cible depuis args[0] (mention ou ID)
async function resolveMember(message, raw) {
  if (!raw) return null;
  const id = raw.replace(/[<@!>]/g, '');
  return message.guild.members.fetch(id).catch(() => null);
}

// ─── *bl (ban) ────────────────────────────────────────────────────────────────
const blCommand = {
  name: 'bl',
  description: 'Bannit un membre. Tu peux préciser un nombre de jours de messages à supprimer (0-7) juste après le membre.',
  usage: '*bl <@membre> [jours] <raison>',
  category: 'Modération',
  permission: 'mod',

  async execute(message, args, client) {
    const member = message.member;
    if (!checkPermission(member, this.permission)) return message.reply('❌ Permission refusée.');

    const target = await resolveMember(message, args[0]);
    if (!target) return message.reply('❌ Membre introuvable. Usage : `*bl <@membre> [jours] <raison>`');

    let jours = 0;
    let raisonArgs = args.slice(1);
    if (/^\d+$/.test(args[1]) && Number(args[1]) <= 7) {
      jours = Number(args[1]);
      raisonArgs = args.slice(2);
    }
    const raison = raisonArgs.join(' ') || 'Aucune raison';

    if (target.permissions?.has(PermissionFlagsBits.Administrator) && !checkPermission(member, 'admin')) {
      return message.reply('❌ Tu ne peux pas bannir un administrateur.');
    }

    if (!checkPermission(member, 'admin')) {
      const remaining = checkCooldown(client, member.id, 'ban');
      if (remaining > 0) {
        await logCooldownViolation(message.guild, client, 'ban', target.id, member.id);
        return message.reply(`⏱️ Cooldown ban : encore **${remaining}s** à attendre.`);
      }
    }

    try {
      await target.user.send({ content: `🔨 Tu as été **banni** du serveur.\n📋 **Raison :** ${raison}` }).catch(() => {});
      await target.ban({ reason: raison, deleteMessageSeconds: jours * 86400 });
      if (!checkPermission(member, 'admin')) setCooldown(client, member.id, 'ban');

      await logSanction(message.guild, client, 'ban', target, member, raison);
      await message.reply(`✅ **${target.user.tag}** a été banni.`);
    } catch (err) {
      await message.reply(`❌ Impossible de bannir : ${err.message}`);
    }
  },
};

// ─── *unbl (unban) ────────────────────────────────────────────────────────────
const unblCommand = {
  name: 'unbl',
  description: 'Débannit un utilisateur via son ID.',
  usage: '*unbl <userid> [raison]',
  category: 'Modération',
  permission: 'mod',

  async execute(message, args, client) {
    const member = message.member;
    if (!checkPermission(member, this.permission)) return message.reply('❌ Permission refusée.');

    const userId = args[0];
    const raison = args.slice(1).join(' ') || 'Aucune raison';
    if (!userId) return message.reply('❌ Usage : `*unbl <userid> [raison]`');

    try {
      await message.guild.members.unban(userId, raison);
      await logSanction(message.guild, client, 'unban', { id: userId, user: { tag: userId } }, member, raison);
      await message.reply(`✅ Utilisateur \`${userId}\` débanni.`);
    } catch {
      await message.reply('❌ Impossible de débannir. ID invalide ou l\'utilisateur n\'est pas banni.');
    }
  },
};

// ─── *mute ───────────────────────────────────────────────────────────────────
const muteCommand = {
  name: 'mute',
  description: 'Mute (timeout) un membre pour une durée en minutes.',
  usage: '*mute <@membre> <durée_minutes> <raison>',
  category: 'Modération',
  permission: 'muteOnly',

  async execute(message, args, client) {
    const member = message.member;
    if (!checkPermission(member, this.permission)) return message.reply('❌ Permission refusée.');

    const target = await resolveMember(message, args[0]);
    const duree = parseInt(args[1], 10);
    const raison = args.slice(2).join(' ');

    if (!target) return message.reply('❌ Membre introuvable.');
    if (isNaN(duree) || duree < 1 || duree > 40320 || !raison) {
      return message.reply('❌ Usage : `*mute <@membre> <durée_minutes> <raison>`');
    }

    if (!checkPermission(member, 'admin')) {
      const remaining = checkCooldown(client, member.id, 'mute');
      if (remaining > 0) {
        await logCooldownViolation(message.guild, client, 'mute', target.id, member.id);
        return message.reply(`⏱️ Cooldown mute : encore **${remaining}s** à attendre.`);
      }
    }

    try {
      await target.user.send({ content: `🔇 Tu as été **muté** pour **${duree} minute(s)**.\n📋 **Raison :** ${raison}` }).catch(() => {});
      await target.timeout(duree * 60 * 1000, raison);
      if (!checkPermission(member, 'admin')) setCooldown(client, member.id, 'mute');

      await logSanction(message.guild, client, 'mute', target, member, raison, `${duree} min`);
      await message.reply(`✅ **${target.user.tag}** muté pour ${duree} minute(s).`);
    } catch (err) {
      await message.reply(`❌ Impossible de muter : ${err.message}`);
    }
  },
};

// ─── *unmute ─────────────────────────────────────────────────────────────────
const unmuteCommand = {
  name: 'unmute',
  description: 'Démute un membre.',
  usage: '*unmute <@membre> [raison]',
  category: 'Modération',
  permission: 'muteOnly',

  async execute(message, args, client) {
    const member = message.member;
    if (!checkPermission(member, this.permission)) return message.reply('❌ Permission refusée.');

    const target = await resolveMember(message, args[0]);
    const raison = args.slice(1).join(' ') || 'Aucune raison';
    if (!target) return message.reply('❌ Membre introuvable.');

    try {
      await target.timeout(null, raison);
      await logSanction(message.guild, client, 'unmute', target, member, raison);
      await message.reply(`✅ **${target.user.tag}** démuté.`);
    } catch (err) {
      await message.reply(`❌ Impossible de démuter : ${err.message}`);
    }
  },
};

// ─── *kick ───────────────────────────────────────────────────────────────────
const kickCommand = {
  name: 'kick',
  description: 'Expulse un membre.',
  usage: '*kick <@membre> <raison>',
  category: 'Modération',
  permission: 'mod',

  async execute(message, args, client) {
    const member = message.member;
    if (!checkPermission(member, this.permission)) return message.reply('❌ Permission refusée.');

    const target = await resolveMember(message, args[0]);
    const raison = args.slice(1).join(' ');
    if (!target) return message.reply('❌ Membre introuvable.');
    if (!raison) return message.reply('❌ Usage : `*kick <@membre> <raison>`');

    if (!checkPermission(member, 'admin')) {
      const remaining = checkCooldown(client, member.id, 'kick');
      if (remaining > 0) {
        await logCooldownViolation(message.guild, client, 'kick', target.id, member.id);
        return message.reply(`⏱️ Cooldown kick : encore **${remaining}s** à attendre.`);
      }
    }

    try {
      await target.user.send({ content: `👢 Tu as été **expulsé** du serveur.\n📋 **Raison :** ${raison}\n🔗 Tu peux rejoindre à nouveau : ${SERVER_INVITE}` }).catch(() => {});
      await target.kick(raison);
      if (!checkPermission(member, 'admin')) setCooldown(client, member.id, 'kick');

      await logSanction(message.guild, client, 'kick', target, member, raison);
      await message.reply(`✅ **${target.user.tag}** expulsé.`);
    } catch (err) {
      await message.reply(`❌ Impossible d'expulser : ${err.message}`);
    }
  },
};

// ─── *bl-list ────────────────────────────────────────────────────────────────
const blListCommand = {
  name: 'bl-list',
  description: 'Affiche la liste des membres bannis.',
  usage: '*bl-list',
  category: 'Modération',
  permission: 'mod',

  async execute(message, args, client) {
    const member = message.member;
    if (!checkPermission(member, this.permission)) return message.reply('❌ Permission refusée.');

    try {
      const bans = await message.guild.bans.fetch();
      if (bans.size === 0) return message.reply('✅ Aucun membre banni.');

      const lines = bans.map(b => `• **${b.user.tag}** (${b.user.id}) — ${b.reason || 'Aucune raison'}`);
      const chunks = [];
      let current = '';
      for (const line of lines) {
        if ((current + line).length > 1900) { chunks.push(current); current = ''; }
        current += line + '\n';
      }
      if (current) chunks.push(current);

      const embed = new EmbedBuilder().setColor(YELLOW).setTitle(`🚫 Liste des bannis (${bans.size})`).setDescription(chunks[0]).setTimestamp();
      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      await message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};

module.exports = { blCommand, unblCommand, muteCommand, unmuteCommand, kickCommand, blListCommand };
