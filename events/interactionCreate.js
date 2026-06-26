const { readJSON } = require('../utils/storage');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`Erreur commande /${interaction.commandName}:`, err);
        const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      if (customId === 'ticket_select') {
        const reason = interaction.values[0].replace('ticket_open:', '');
        const ticketHandler = require('./ticket_interaction');
        await ticketHandler.handleTicketOpen(interaction, reason).catch(console.error);
        return;
      }
      if (customId === 'autorole_select') {
        await handleAutoRole(interaction).catch(console.error);
        return;
      }
      if (customId === 'gender_select') {
        await handleGenderRole(interaction).catch(console.error);
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
    }
  },
};

async function handleAutoRole(interaction) {
  const config = readJSON('autorole_config.json');
  const guildConfig = config[interaction.guild.id];
  if (!guildConfig) return interaction.reply({ content: '❌ Configuration introuvable.', ephemeral: true });
  const selectedRoleId = interaction.values[0];
  const member = interaction.member;
  try {
    if (member.roles.cache.has(selectedRoleId)) {
      await member.roles.remove(selectedRoleId);
      await interaction.reply({ content: `✅ Rôle <@&${selectedRoleId}> retiré.`, ephemeral: true });
    } else {
      await member.roles.add(selectedRoleId);
      await interaction.reply({ content: `✅ Rôle <@&${selectedRoleId}> attribué.`, ephemeral: true });
    }
  } catch {
    await interaction.reply({ content: '❌ Impossible de modifier ton rôle.', ephemeral: true });
  }
}

async function handleGenderRole(interaction) {
  const config = readJSON('gender_config.json');
  const guildConfig = config[interaction.guild.id];
  if (!guildConfig) return interaction.reply({ content: '❌ Configuration introuvable.', ephemeral: true });
  const selectedRoleId = interaction.values[0];
  const member = interaction.member;
  const genderRoleIds = guildConfig.options.map(o => o.value);
  try {
    for (const roleId of genderRoleIds) {
      if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
    }
    await member.roles.add(selectedRoleId);
    await interaction.reply({ content: `✅ Rôle <@&${selectedRoleId}> attribué.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: '❌ Impossible de modifier ton rôle.', ephemeral: true });
  }
}
