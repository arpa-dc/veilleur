const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPermission } = require('../../utils/permissions');
const { setLockdown } = require('../../utils/raid');
const { YELLOW } = require('../../utils/colors');

module.exports = {
  name: 'lockdown',
  description: 'Active le mode lockdown : ferme l\'accès au serveur (@everyone ne peut plus écrire) et active l\'expulsion automatique des nouveaux comptes suspects.',
  usage: '*lockdown',
  category: 'Sécurité',
  permission: 'admin',

  async execute(message, args, client) {
    if (!checkPermission(message.member, this.permission)) {
      return message.reply('❌ Permission refusée.');
    }

    setLockdown(true);

    try {
      const everyoneId = message.guild.roles.everyone.id;
      await message.guild.channels.cache
        .filter(c => c.isTextBased && c.isTextBased())
        .forEach(async c => {
          await c.permissionOverwrites.edit(everyoneId, { SendMessages: false }).catch(() => {});
        });
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(YELLOW)
      .setTitle('🔒 Lockdown activé')
      .setDescription('Le serveur est verrouillé : envoi de messages désactivé pour @everyone et expulsion automatique des nouveaux comptes suspects. Utilise `*unlock` pour lever le lockdown.')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
