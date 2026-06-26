const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('citation')
    .setDescription('Démarrer/redémarrer le scheduler de citations automatiques')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ content: '✅ Le scheduler de citations est actif (toutes les 7h). Il démarre automatiquement au lancement du bot.', ephemeral: true });
  },
};
