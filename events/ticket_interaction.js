const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readJSON } = require('../utils/storage');

async function handleTicketOpen(interaction, reason) {
  await interaction.deferReply({ ephemeral: true });
  const config = readJSON('ticket_config.json');
  const guildConfig = config[interaction.guild.id];
  if (!guildConfig) return interaction.editReply({ content: '❌ Aucune configuration de ticket.' });

  const guild = interaction.guild;
  const member = interaction.member;
  const channelName = `${reason.substring(0, 10)}-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 32);

  // Vérifier si un ticket du même utilisateur+raison existe déjà
  const existing = guild.channels.cache.find(c => c.name === channelName && c.parentId === guildConfig.categoryId);
  if (existing) {
    return interaction.editReply({ content: `❌ Tu as déjà un ticket ouvert : ${existing}` });
  }

  // Créer le channel
  const permOverwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];

  for (const roleId of (guildConfig.modRoles || [])) {
    permOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: guildConfig.categoryId || null,
      permissionOverwrites: permOverwrites,
      reason: `Ticket ouvert par ${member.user.tag}`,
    });
  } catch (err) {
    return interaction.editReply({ content: '❌ Impossible de créer le salon de ticket. Vérifie les permissions.' });
  }

  // Embed dans le ticket
  const embed = new EmbedBuilder()
    .setColor(guildConfig.color ? parseInt(guildConfig.color.replace('#', ''), 16) : 0x2ecc71)
    .setTitle(`Ticket — ${reason}`)
    .setDescription(`Bonjour ${member} 👋\nNotre staff répondra d'ici peu. Merci de ta patience.`)
    .setFooter(guildConfig.footer ? { text: guildConfig.footer } : null)
    .setTimestamp();

  if (guildConfig.thumbnail) embed.setThumbnail(guildConfig.thumbnail);
  if (guildConfig.image) embed.setImage(guildConfig.image);

  const closeBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close:')
      .setLabel('🔒 Fermer le ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: `${member} | Ticket : **${reason}**`, embeds: [embed], components: [closeBtn] });

  // Log
  if (guildConfig.logsChannelId) {
    const logsChannel = await guild.channels.fetch(guildConfig.logsChannelId).catch(() => null);
    if (logsChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎟️ Ticket ouvert')
        .addFields(
          { name: 'Utilisateur', value: `${member} (${member.user.tag})`, inline: true },
          { name: 'Raison', value: reason, inline: true },
          { name: 'Salon', value: `${channel}`, inline: true }
        )
        .setTimestamp();
      await logsChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  await interaction.editReply({ content: `✅ Ton ticket a été créé : ${channel}` });
}

async function handleTicketClose(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const config = readJSON('ticket_config.json');
  const guildConfig = config[interaction.guild.id];

  const channel = interaction.channel;
  const member = interaction.member;
  const isAllowed = member.permissions.has(PermissionFlagsBits.Administrator) ||
    (guildConfig?.modRoles || []).some(r => member.roles.cache.has(r));

  if (!isAllowed) return interaction.editReply({ content: '❌ Tu n\'as pas la permission de fermer ce ticket.' });

  // Log
  if (guildConfig?.logsChannelId) {
    const logsChannel = await interaction.guild.channels.fetch(guildConfig.logsChannelId).catch(() => null);
    if (logsChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🎟️ Ticket fermé')
        .addFields(
          { name: 'Fermé par', value: `${member} (${member.user.tag})`, inline: true },
          { name: 'Salon', value: channel.name, inline: true }
        )
        .setTimestamp();
      await logsChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  await interaction.editReply({ content: '🔒 Fermeture du ticket dans 5 secondes...' });
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

module.exports = { handleTicketOpen, handleTicketClose };
