const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketconfig')
    .setDescription('Configurer le système de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('titre').setDescription('Titre de l\'embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Description de l\'embed').setRequired(true))
    .addStringOption(o => o.setName('couleur').setDescription('Couleur hex (ex: #2ecc71)').setRequired(true))
    .addStringOption(o => o.setName('footer').setDescription('Texte du footer').setRequired(false))
    .addStringOption(o => o.setName('thumbnail').setDescription('URL image en haut à gauche').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('URL image en bas').setRequired(false))
    .addChannelOption(o => o.setName('logs').setDescription('Salon de logs tickets').setRequired(true))
    .addStringOption(o => o.setName('categorie_id').setDescription('ID de la catégorie pour les tickets').setRequired(true))
    .addRoleOption(o => o.setName('mod_role_1').setDescription('Rôle modérateur 1').setRequired(true))
    .addRoleOption(o => o.setName('mod_role_2').setDescription('Rôle modérateur 2').setRequired(false))
    .addRoleOption(o => o.setName('mod_role_3').setDescription('Rôle modérateur 3').setRequired(false))
    .addStringOption(o => o.setName('option1').setDescription('Option menu 1 (label|description)').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option menu 2 (label|description)').setRequired(false))
    .addStringOption(o => o.setName('option3').setDescription('Option menu 3 (label|description)').setRequired(false))
    .addStringOption(o => o.setName('option4').setDescription('Option menu 4 (label|description)').setRequired(false))
    .addStringOption(o => o.setName('option5').setDescription('Option menu 5 (label|description)').setRequired(false)),

  async execute(interaction) {
    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const couleur = interaction.options.getString('couleur');
    const footer = interaction.options.getString('footer');
    const thumbnail = interaction.options.getString('thumbnail');
    const image = interaction.options.getString('image');
    const logsChannel = interaction.options.getChannel('logs');
    const categorieId = interaction.options.getString('categorie_id');

    const modRoles = [
      interaction.options.getRole('mod_role_1'),
      interaction.options.getRole('mod_role_2'),
      interaction.options.getRole('mod_role_3'),
    ].filter(Boolean).map(r => r.id);

    const rawOptions = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
      interaction.options.getString('option5'),
    ].filter(Boolean);

    const menuOptions = rawOptions.map((opt, i) => {
      const [label, desc] = opt.split('|');
      return { label: label?.trim() || `Option ${i + 1}`, description: desc?.trim() || '', value: label?.trim().toLowerCase().replace(/\s+/g, '-') || `option-${i + 1}` };
    });

    // Sauvegarder la config
    const config = readJSON('ticket_config.json');
    config[interaction.guild.id] = {
      titre, description, couleur, footer, thumbnail, image,
      logsChannelId: logsChannel.id,
      categoryId: categorieId,
      modRoles,
      menuOptions,
    };
    writeJSON('ticket_config.json', config);

    // Créer l'embed ticket
    const colorInt = parseInt(couleur.replace('#', ''), 16) || 0x2ecc71;
    const embed = new EmbedBuilder()
      .setColor(colorInt)
      .setTitle(titre)
      .setDescription(description)
      .setTimestamp();

    if (footer) embed.setFooter({ text: footer });
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);

    // Créer le menu déroulant
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_open')
      .setPlaceholder('📋 Choisir la raison du ticket')
      .addOptions(menuOptions.map(opt => ({
        label: opt.label,
        description: opt.description || undefined,
        value: `ticket_open:${opt.value}`,
      })));

    // Correction du customId pour le handler
    selectMenu.setCustomId('ticket_select');

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Système de tickets configuré et publié !', ephemeral: true });
  },
};
