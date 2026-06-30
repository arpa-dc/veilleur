const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const { YELLOW } = require('../utils/colors');
const { getLogChannel } = require('../utils/logs');
const {
  registerJoin, isJoinRaidDetected, isNewAccount, isLockdownActive, JOIN_THRESHOLD,
} = require('../utils/raid');

const WELCOME_CHANNEL_ID = '1521264780055281874';

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // ─── ANTIBOT ──────────────────────────────────────────────────────────────
    if (member.user.bot) {
      const auditLogs = await member.guild.fetchAuditLogs({ type: 28, limit: 1 }).catch(() => null);
      const entry = auditLogs?.entries.first();
      const executor = entry ? await member.guild.members.fetch(entry.executorId).catch(() => null) : null;

      if (!executor || !isAdmin(executor)) {
        await member.kick('Antibot : ajout non autorisé').catch(() => {});
        const logsChannel = await getLogChannel(member.guild, 'bot');
        if (logsChannel) {
          const embed = new EmbedBuilder()
            .setColor(YELLOW)
            .setTitle('🤖 Bot bloqué — Antibot')
            .addFields(
              { name: 'Bot', value: `${member.user.tag} (${member.id})`, inline: true },
              { name: 'Ajouté par', value: executor ? `${executor.user.tag} (${executor.id})` : 'Inconnu', inline: true }
            )
            .setTimestamp();
          await logsChannel.send({ embeds: [embed] }).catch(() => {});
        }
        return;
      }
    }

    // ─── ANTI-RAID : détection d'arrivées massives ────────────────────────────
    const joinCount = registerJoin();
    const raidDetected = isJoinRaidDetected();
    const newAccount = !member.user.bot && isNewAccount(member.user);

    if (raidDetected || (isLockdownActive() && newAccount)) {
      const logsChannel = await getLogChannel(member.guild, 'raid');

      if (newAccount && (raidDetected || isLockdownActive())) {
        await member.kick('Anti-raid : compte trop récent pendant une alerte de raid / lockdown').catch(() => {});
        if (logsChannel) {
          const embed = new EmbedBuilder()
            .setColor(YELLOW)
            .setTitle('🚨 Anti-raid — Compte expulsé')
            .setDescription(`${member.user.tag} (${member.id}) a été expulsé : compte créé récemment pendant une alerte de raid.`)
            .setTimestamp();
          await logsChannel.send({ embeds: [embed] }).catch(() => {});
        }
        return;
      }

      if (raidDetected && logsChannel) {
        const embed = new EmbedBuilder()
          .setColor(YELLOW)
          .setTitle('🚨 Alerte raid détectée')
          .setDescription(`${joinCount} arrivées détectées en moins de 10 secondes (seuil : ${JOIN_THRESHOLD}). Utilise \`*lockdown\` si besoin.`)
          .setTimestamp();
        await logsChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // ─── LOG ARRIVÉE ──────────────────────────────────────────────────────────
    if (!member.user.bot) {
      const modChannel = await getLogChannel(member.guild, 'mod');
      if (modChannel) {
        const embed = new EmbedBuilder()
          .setColor(YELLOW)
          .setTitle('📥 Membre arrivé')
          .addFields(
            { name: 'Membre', value: `${member.user.tag} (${member.id})`, inline: true },
            { name: 'Compte créé le', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
          )
          .setTimestamp();
        await modChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // ─── BIENVENUE ────────────────────────────────────────────────────────────
    if (!member.user.bot) {
      const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
      if (channel) await channel.send(`parle bouffon ${member}`).catch(() => {});
    }
  },
};
