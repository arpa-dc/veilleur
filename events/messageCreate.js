const { readJSON, writeJSON } = require('../utils/storage');
const { isAdmin, hasUhqBypassRole } = require('../utils/permissions');

const LOGS_CHANNEL_ID = '1520179265809940521';
const LINK_REGEX = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+/gi;

const mutedUsers = new Map(); // userId -> timeoutId

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    const member = message.member;
    if (!member) return;

    // ─── ANTIBOT (tentative d'ajout de bot via lien OAuth) ───────────────────
    const oauthRegex = /discord\.com\/oauth2\/authorize/i;
    if (oauthRegex.test(message.content) && !isAdmin(member)) {
      await message.delete().catch(() => {});
      const logsChannel = await message.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
      if (logsChannel) {
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
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

    if (hasLink && !isAdmin(member)) {
      // Récupérer le lien trouvé
      const foundLinks = message.content.match(LINK_REGEX) || [];

      await message.delete().catch(() => {});

      // Mute 30 secondes (timeout Discord)
      try {
        await member.timeout(30 * 1000, 'Antilink - envoi de lien');
      } catch {}

      // Notif dans le channel
      const notif = await message.channel.send({ content: `${message.author} ❌ Les liens sont interdits ici. Tu es muté 30 secondes.`, allowedMentions: { users: [message.author.id] } }).catch(() => null);
      if (notif) setTimeout(() => notif.delete().catch(() => {}), 6000);

      // Logs
      const logsChannel = await message.guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
      if (logsChannel) {
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setColor(0xe67e22)
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
    if (!isAdmin(member) && !hasUhqBypassRole(member)) {
      if (/\buhq\b/i.test(message.content)) {
        await message.reply('t\'as pas hq mek').catch(() => {});
      }
    }
  },
};
