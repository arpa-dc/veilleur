const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Définir un mode lent dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(o => o.setName('secondes').setDescription('Délai en secondes (0 = désactivé)').setRequired(true).setMinValue(0).setMaxValue(21600)),

  async execute(interaction) {
    const secondes = interaction.options.getInteger('secondes');
    try {
      await interaction.channel.setRateLimitPerUser(secondes);
      if (secondes === 0) {
        await interaction.reply({ content: '✅ Mode lent désactivé.', ephemeral: true });
      } else {
        await interaction.reply({ content: `✅ Mode lent défini à **${secondes} seconde(s)**.`, ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  },
};
