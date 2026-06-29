const { EmbedBuilder } = require('discord.js');
const { isAdmin, hasUhqBypassRole } = require('../utils/permissions');
const { YELLOW } = require('../utils/colors');
const { hasInviteInStatus, grantVerifiedRole, VERIF_CHANNEL_ID } = require('../utils/verification');
const { isMessageSpam, isMentionSpam } = require('../utils/raid');

const LOGS_CHANNEL_ID = '1520179265809940521';
const LINK_REGEX = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+/gi;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    const member = message.member;
    if (!member) return;

    const isMod = isAdmin(member);

    // ─── VÉRIFICATION PAR PING DANS LE SALON DÉDIÉ ────────────────────────────
    if (message.channel.id === VERIF_CHANNEL_ID && message.mentions.has(client.user.id)) {
      if (hasInviteInStatus(member)) {
        const result = await grantVerifiedRole(member).catch(() => null);
        if (result === 'granted') {
          await message.reply('✅ Lien d\'invitation détecté dans ton statut. Rôle attribué, bienvenue !');
        } else if (result === 'already') {
          await message.reply('✅ Tu es déjà vérifié(e).');
        } else {
          await message.reply('❌ Lien détecté mais impossible de t\'attribuer le rôle (vérifie mes permissions).');
        }
      } else {
        await message.reply('❌ Je ne trouve pas le lien d\'invitation du serveur dans ton statut personnalisé. Ajoute-le puis reping-moi ici.');
      }
      return;
    }

    // ─── ANTI MENTION-SPAM (raid) ──────────────────────────────────────────────
    if (!isMod && isMentionSpam(message)) {
      await message.delete().catch(() => {});
      await member.timeout(60 * 1000, 'Anti-raid : spam de mentions').catch(() => {});
      const logsChannel = await message.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
      if (logsChannel) {
        const embed = new EmbedBuilder()
          .setColor(YELLOW)
          .setTitle('🚨 Spam de mentions bloqué')
          .addFields(
            { name: 'Utilisateur', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'Salon', value: `${message.channel}`, inline: true }
          )
          .setTimestamp();
        await logsChannel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    // ─── ANTI MESSAGE-SPAM (raid) ──────────────────────────────────────────────
    if (!isMod && isMessageSpam(message.author.id)) {
      await member.timeout(60 * 1000, 'Anti-raid : spam de messages').catch(() => {});
      const logsChannel = await message.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
      if (logsChannel) {
        const embed = new EmbedBuilder()
          .setColor(YELLOW)
          .setTitle('🚨 Spam de messages détecté')
          .addFields(
            { name: 'Utilisateur', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'Salon', value: `${message.channel}`, inline: true }
          )
          .setTimestamp();
        await logsChannel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    // ─── COMMANDES PRÉFIXÉES (*) ───────────────────────────────────────────────
    if (message.content.startsWith(client.prefix)) {
      const args = message.content.slice(client.prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();
      const command = client.commands.get(commandName);
      if (command) {
        try {
          await command.execute(message, args, client);
        } catch (err) {
          console.error(`Erreur commande ${client.prefix}${commandName}:`, err);
          await message.reply('❌ Une erreur est survenue.').catch(() => {});
        }
      }
      return;
    }

    // ─── ANTIBOT (tentative d'ajout de bot via lien OAuth) ───────────────────
    const oauthRegex = /discord\.com\/oauth2\/authorize/i;
    if (oauthRegex.test(message.content) && !isMod) {
      await message.delete().catch(() => {});
      const logsChannel = await message.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
      if (logsChannel) {
        const embed = new EmbedBuilder()
          .setColor(YELLOW)
          .setTitle('🤖 Tentative d\'ajout de bot bloquée')
          .addFields(
            { name: 'Utilisateur', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'Salon', value: `${message.channel}`, inline: true },
            { name: 'Lien', value: message.content.substring(0, 200) }
          )
          .setTimestamp();
        await logsChannel.send({ embeds: [embed] }).catch(() => {});
      }
      await message.channel.send({ content: `${message.author} ❌ Tu ne peux pas ajouter de bot ici.`, allowedMentions: { users: [message.author.id] } }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      return;
    }

    // ─── ANTILINK ─────────────────────────────────────────────────────────────
    const hasLink = LINK_REGEX.test(message.content);
    LINK_REGEX.lastIndex = 0;

    if (hasLink && !isMod) {
      const foundLinks = message.content.match(LINK_REGEX) || [];

      await message.delete().catch(() => {});

      try {
        await member.timeout(30 * 1000, 'Antilink - envoi de lien');
      } catch {}

      const notif = await message.channel.send({ content: `${message.author} ❌ Les liens sont interdits ici. Tu es muté 30 secondes.`, allowedMentions: { users: [message.author.id] } }).catch(() => null);
      if (notif) setTimeout(() => notif.delete().catch(() => {}), 6000);

      const logsChannel = await message.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
      if (logsChannel) {
        const embed = new EmbedBuilder()
          .setColor(YELLOW)
          .setTitle('🔗 Lien bloqué — Antilink')
          .addFields(
            { name: 'Utilisateur', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'Salon', value: `${message.channel}`, inline: true },
            { name: 'Lien(s) tenté(s)', value: foundLinks.join('\n').substring(0, 500) || 'N/A' }
          )
          .setTimestamp();
        await logsChannel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    // ─── FILTRE UHQ ───────────────────────────────────────────────────────────
    if (!isMod && !hasUhqBypassRole(member)) {
      if (/\buhq\b/i.test(message.content)) {
        await message.reply('t\'as pas hq mek').catch(() => {});
      }
    }
  },
};
