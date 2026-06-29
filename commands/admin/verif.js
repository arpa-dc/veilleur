const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { YELLOW } = require('../../utils/colors');
const { checkPermission } = require('../../utils/permissions');

module.exports = {
  name: 'verif',
  description: 'Envoie l\'embed de vérification Sentinel avec le bouton de vérification.',
  usage: '*verif',
  category: 'Admin',
  permission: 'admin',

  async execute(message, args, client) {
    if (!checkPermission(message.member, this.permission)) {
      return message.reply('❌ Permission refusée.');
    }

    const embed = new EmbedBuilder()
      .setColor(YELLOW)
      .setTitle('Vérification Sentinel')
      .setDescription(
        'Pour accéder au reste du serveur, tu dois vérifier ton identité.\n\n' +
        'Appuie sur le bouton **Vérifier** ci-dessous pour valider ta vérification.'
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verif_check')
        .setLabel('Vérifier')
        .setStyle(ButtonStyle.Success) // vert
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => {});
  },
};
