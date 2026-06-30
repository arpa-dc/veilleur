const { EmbedBuilder } = require('discord.js');
const { isAdmin, hasUhqBypassRole } = require('../utils/permissions');
const { YELLOW } = require('../utils/colors');
const { getLogChannel } = require('../utils/logs');
const { isMessageSpam, isMentionSpam } = require('../utils/raid');

const LINK_REGEX = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+/gi;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    const member = message.member;
    if (!member) return;
    const isMod = isAdmin(member);

    // ─── ANTI MENTION-SPAM ────────────────────────────────────────────────────
    if (!isMod && isMentionSpam(message)) {
      await message.delete().catch(() => {});
      await member.timeout(60 * 1000, 'Anti-raid : spam de mentions').catch(() => {});
      const ch = await getLogChannel(message.guild, 'raid');
      if (ch) {
        await ch.send({ embeds: [
          new EmbedBuilder()
            .setColor(YELLOW)
            .setTitle('🚨 Spam de mentions bloqué')
            .addFields(
              { name: 'Utilisateur', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Salon', value: `${message.channel}`, inline: true }
            )
            .setTimestamp()
        ]}).catch(() => {});
      }
      return;
    }

    // ─── ANTI MESSAGE-SPAM ────────────────────────────────────────────────────
    if (!isMod && isMessageSpam(message.author.id)) {
      await member.timeout(60 * 1000, 'Anti-raid : spam de messages').catch(() => {});
      const ch = await getLogChannel(message.guild, 'raid');
      if (ch) {
        await ch.send({ embeds: [
          new EmbedBuilder()
            .setColor(YELLOW)
            .setTitle('🚨 Spam de messages détecté')
            .addFields(
              { name: 'Utilisateur', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Salon', value: `${message.channel}`, inline: true }
            )
            .setTimestamp()
        ]}).catch(() => {});
      }
      return;
    }

    // ─── COMMANDES PRÉFIXÉES ─────────────────────────────────────────────────
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

      // Log dans admin logs
      const adminCh = await getLogChannel(message.guild, 'admin');
      if (adminCh) {
        await adminCh.send({ embeds: [
          new EmbedBuilder()
            .setColor(YELLOW)
            .setTitle('🛠️ Commande utilisée')
            .addFields(
              { name: 'Auteur', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Salon', value: `${message.channel}`, inline: true },
              { name: 'Commande', value: message.content.substring(0, 500) }
            )
            .setTimestamp()
        ]}).catch(() => {});
      }
      return;
    }

    // ─── ANTIBOT (lien OAuth) ─────────────────────────────────────────────────
    if (/discord\.com\/oauth2\/authorize/i.test(message.content) && !isMod) {
      await message.delete().catch(() => {});
      const ch = await getLogChannel(message.guild, 'bot');
      if (ch) {
        await ch.send({ embeds: [
          new EmbedBuilder()
            .setColor(YELLOW)
            .setTitle('🤖 Tentative d\'ajout de bot bloquée')
            .addFields(
              { name: 'Utilisateur', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Salon', value: `${message.channel}`, inline: true },
              { name: 'Lien', value: message.content.substring(0, 200) }
            )
            .setTimestamp()
        ]}).catch(() => {});
      }
      await message.channel.send({ content: `${message.author} ❌ Tu ne peux pas ajouter de bot ici.`, allowedMentions: { users: [message.author.id] } })
        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      return;
    }

    // ─── ANTILINK ────────────────────────────────────────────────────────────
    const hasLink = LINK_REGEX.test(message.content);
    LINK_REGEX.lastIndex = 0;

    if (hasLink && !isMod) {
      const foundLinks = message.content.match(LINK_REGEX) || [];
      await message.delete().catch(() => {});
      try { await member.timeout(30 * 1000, 'Antilink - envoi de lien'); } catch {}

      const notif = await message.channel.send({
        content: `${message.author} ❌ Les liens sont interdits ici. Tu es muté 30 secondes.`,
        allowedMentions: { users: [message.author.id] }
      }).catch(() => null);
      if (notif) setTimeout(() => notif.delete().catch(() => {}), 6000);

      const ch = await getLogChannel(message.guild, 'antilink');
      if (ch) {
        await ch.send({ embeds: [
          new EmbedBuilder()
            .setColor(YELLOW)
            .setTitle('🔗 Lien bloqué — Antilink')
            .addFields(
              { name: 'Utilisateur', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Salon', value: `${message.channel}`, inline: true },
              { name: 'Lien(s)', value: foundLinks.join('\n').substring(0, 500) || 'N/A' }
            )
            .setTimestamp()
        ]}).catch(() => {});
      }
      return;
    }

    // ─── FILTRE UHQ ──────────────────────────────────────────────────────────
    if (!isMod && !hasUhqBypassRole(member)) {
      if (/\buhq\b/i.test(message.content)) {
        await message.reply('t\'as pas uhq mek').catch(() => {});
      }
    }

    // ─── LOG MESSAGES ─────────────────────────────────────────────────────────
    // (optionnel : log tous les messages dans message logs)
    // Décommente si tu veux tracker tous les messages
    /*
    const msgCh = await getLogChannel(message.guild, 'messages');
    if (msgCh) {
      await msgCh.send({ embeds: [
        new EmbedBuilder()
          .setColor(YELLOW)
          .setTitle('💬 Message')
          .addFields(
            { name: 'Auteur', value: `${message.author.tag}`, inline: true },
            { name: 'Salon', value: `${message.channel}`, inline: true },
            { name: 'Contenu', value: message.content.substring(0, 1000) || '(vide)' }
          )
          .setTimestamp()
      ]}).catch(() => {});
    }
    */
  },
};
