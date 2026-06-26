const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

const ALLOWED_ROLES = ['1520179219471142973', '1520189435449180342'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clean')
    .setDescription('Supprimer tous les messages de ce salon')
    .addIntegerOption(o => o.setName('nombre').setDescription('Nombre de messages à supprimer (max 100, défaut: 100)').setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    const member = interaction.member;
    const hasRole = ALLOWED_ROLES.some(r => member.roles.cache.has(r));

    if (!isAdmin(member) && !hasRole) {
      return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const nombre = interaction.options.getInteger('nombre') || 100;

    try {
      let deleted = 0;
      let lastId = null;

      while (deleted < nombre) {
        const toFetch = Math.min(nombre - deleted, 100);
        const options = { limit: toFetch };
        if (lastId) options.before = lastId;

        const messages = await interaction.channel.messages.fetch(options);
        if (messages.size === 0) break;

        // Ne supprimer que les messages < 14 jours (limite API Discord)
        const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
        if (deletable.size === 0) break;

        await interaction.channel.bulkDelete(deletable, true);
        deleted += deletable.size;
        lastId = messages.last()?.id;

        if (deletable.size < toFetch) break;
        await new Promise(r => setTimeout(r, 1000)); // Éviter le rate limit
      }

      await interaction.editReply({ content: `✅ **${deleted}** message(s) supprimé(s).` });
    } catch (err) {
      await interaction.editReply({ content: `❌ Erreur : ${err.message}` });
    }
  },
};
