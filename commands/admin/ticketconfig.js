const {
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
} = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const { checkPermission } = require('../../utils/permissions');
const { YELLOW } = require('../../utils/colors');

module.exports = {
  name: 'ticketconfig',
  description: 'Configure et publie le système de tickets dans ce salon.',
  usage: '*ticketconfig titre || description || #salon-logs || categorieID || @role1,@role2 || Label1:Description1; Label2:Description2',
  category: 'Admin',
  permission: 'admin',

  async execute(message, args, client) {
    if (!checkPermission(message.member, this.permission)) {
      return message.reply('❌ Permission refusée.');
    }

    const fullText = args.join(' ');
    const parts = fullText.split('||').map(p => p.trim());

    if (parts.length < 6) {
      return message.reply(
        '❌ Format invalide.\nUsage :\n`*ticketconfig titre || description || #salon-logs || categorieID || @role1,@role2 || Label1:Description1; Label2:Description2`'
      );
    }

    const [titre, description, logsRaw, categorieId, rolesRaw, optionsRaw] = parts;

    const logsChannelMatch = logsRaw.match(/\d{15,21}/);
    const logsChannelId = logsChannelMatch ? logsChannelMatch[0] : null;
    const logsChannel = logsChannelId
      ? await message.guild.channels.fetch(logsChannelId).catch(() => null)
      : null;

    if (!logsChannel) {
      return message.reply('❌ Salon de logs introuvable. Mentionne le salon (#salon) ou donne son ID.');
    }

    const modRoles = (rolesRaw.match(/\d{15,21}/g) || []);
    if (modRoles.length === 0) {
      return message.reply('❌ Indique au moins un rôle modérateur (mention ou ID).');
    }

    const menuOptions = optionsRaw.split(';').map((opt, i) => {
      const [label, desc] = opt.split(':');
      return {
        label: label?.trim() || `Option ${i + 1}`,
        description: desc?.trim() || '',
        value: (label?.trim().toLowerCase().replace(/\s+/g, '-') || `option-${i + 1}`),
      };
    }).filter(o => o.label);

    if (menuOptions.length === 0) {
      return message.reply('❌ Indique au moins une option au format `Label:Description`.');
    }

    const config = readJSON('ticket_config.json');
    config[message.guild.id] = {
      titre, description,
      logsChannelId: logsChannel.id,
      categoryId: categorieId,
      modRoles,
      menuOptions,
    };
    writeJSON('ticket_config.json', config);

    const embed = new EmbedBuilder()
      .setColor(YELLOW)
      .setTitle(titre)
      .setDescription(description)
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('📋 Choisir la raison du ticket')
      .addOptions(menuOptions.map(opt => ({
        label: opt.label,
        description: opt.description || undefined,
        value: `ticket_open:${opt.value}`,
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.reply('✅ Système de tickets configuré et publié !');
  },
};
