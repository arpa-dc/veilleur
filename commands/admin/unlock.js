const { EmbedBuilder } = require('discord.js');
const { checkPermission } = require('../../utils/permissions');
const { setLockdown } = require('../../utils/raid');
const { YELLOW } = require('../../utils/colors');

module.exports = {
  name: 'unlock',
  description: 'Désactive le mode lockdown et redonne le droit d\'écrire à @everyone.',
  usage: '*unlock',
  category: 'Sécurité',
  permission: 'admin',

  async execute(message, args, client) {
    if (!checkPermission(message.member, this.permission)) {
      return message.reply('❌ Permission refusée.');
    }

    setLockdown(false);

    try {
      const everyoneId = message.guild.roles.everyone.id;
      message.guild.channels.cache
        .filter(c => c.isTextBased && c.isTextBased())
        .forEach(async c => {
          await c.permissionOverwrites.edit(everyoneId, { SendMessages: null }).catch(() => {});
        });
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(YELLOW)
      .setTitle('🔓 Lockdown levé')
      .setDescription('Le serveur est de nouveau accessible normalement.')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
