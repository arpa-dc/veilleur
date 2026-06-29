const { checkPermission } = require('../../utils/permissions');

module.exports = {
  name: 'slowmode',
  description: 'Définit un mode lent (en secondes) dans ce salon. 0 pour désactiver.',
  usage: '*slowmode <secondes>',
  category: 'Admin',
  permission: 'admin',

  async execute(message, args, client) {
    if (!checkPermission(message.member, this.permission)) {
      return message.reply('❌ Permission refusée.');
    }

    const secondes = parseInt(args[0], 10);
    if (isNaN(secondes) || secondes < 0 || secondes > 21600) {
      return message.reply('❌ Usage : `*slowmode <secondes>` (entre 0 et 21600).');
    }

    try {
      await message.channel.setRateLimitPerUser(secondes);
      if (secondes === 0) {
        await message.reply('✅ Mode lent désactivé.');
      } else {
        await message.reply(`✅ Mode lent défini à **${secondes} seconde(s)**.`);
      }
    } catch (err) {
      await message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
