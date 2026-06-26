const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');

const SECURITY_LOGS_ID = '1520179265809940521';
const WELCOME_CHANNEL_ID = '1520179265784643625';

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (member.user.bot) {
      const auditLogs = await member.guild.fetchAuditLogs({ type: 28, limit: 1 }).catch(() => null);
      const entry = auditLogs?.entries.first();
      const executor = entry ? await member.guild.members.fetch(entry.executorId).catch(() => null) : null;

      if (!executor || !isAdmin(executor)) {
        await member.kick('Antibot : ajout non autorisé').catch(() => {});
        const logsChannel = await member.guild.channels.fetch(SECURITY_LOGS_ID).catch(() => null);
        if (logsChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
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

    if (!member.user.bot) {
      const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
      if (channel) await channel.send(`parle bouffon ${member}`).catch(() => {});
    }
  },
};
