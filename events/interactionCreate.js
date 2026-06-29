const { hasInviteInStatus, grantVerifiedRole } = require('../utils/verification');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      if (customId === 'ticket_select') {
        const reason = interaction.values[0].replace('ticket_open:', '');
        const ticketHandler = require('./ticket_interaction');
        await ticketHandler.handleTicketOpen(interaction, reason).catch(console.error);
        return;
      }
    }

    if (interaction.isButton()) {
      const [type] = interaction.customId.split(':');

      if (type === 'ticket_close') {
        const ticketHandler = require('./ticket_interaction');
        await ticketHandler.handleTicketClose(interaction).catch(console.error);
        return;
      }

      if (interaction.customId === 'verif_check') {
        const member = interaction.member;
        if (hasInviteInStatus(member)) {
          const result = await grantVerifiedRole(member).catch(() => null);
          if (result === 'granted') {
            await interaction.reply({ content: '✅ Lien d\'invitation détecté dans ton statut. Rôle attribué, bienvenue !', ephemeral: true });
          } else if (result === 'already') {
            await interaction.reply({ content: '✅ Tu es déjà vérifié(e).', ephemeral: true });
          } else {
            await interaction.reply({ content: '❌ Lien détecté mais impossible de t\'attribuer le rôle (vérifie mes permissions).', ephemeral: true });
          }
        } else {
          await interaction.reply({ content: '❌ Je ne trouve pas le lien d\'invitation du serveur dans ton statut personnalisé. Ajoute-le puis réessaie.', ephemeral: true });
        }
        return;
      }
    }
  },
};
