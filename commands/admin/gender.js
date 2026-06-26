const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder
} = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gender')
    .setDescription('Configurer un menu de rôles genre (max 5)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('titre').setDescription('Titre de l\'embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Description de l\'embed').setRequired(true))
    .addStringOption(o => o.setName('couleur').setDescription('Couleur hex').setRequired(false))
    .addStringOption(o => o.setName('footer').setDescription('Footer').setRequired(false))
    .addStringOption(o => o.setName('option1').setDescription('label|description|roleId').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('label|description|roleId').setRequired(false))
    .addStringOption(o => o.setName('option3').setDescription('label|description|roleId').setRequired(false))
    .addStringOption(o => o.setName('option4').setDescription('label|description|roleId').setRequired(false))
    .addStringOption(o => o.setName('option5').setDescription('label|description|roleId').setRequired(false)),

  async execute(interaction) {
    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const couleur = interaction.options.getString('couleur') || '#e91e8c';
    const footer = interaction.options.getString('footer');

    const rawOptions = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) rawOptions.push(opt);
    }

    const options = rawOptions.map((opt, i) => {
      const parts = opt.split('|');
      return {
        label: parts[0]?.trim() || `Option ${i + 1}`,
        description: parts[1]?.trim() || '',
        value: parts[2]?.trim() || '',
      };
    }).filter(o => o.value);

    if (options.length === 0) {
      return interaction.reply({ content: '❌ Aucune option valide. Format: `label|description|roleId`', ephemeral: true });
    }

    const config = readJSON('gender_config.json');
    config[interaction.guild.id] = { titre, description, couleur, footer, options };
    writeJSON('gender_config.json', config);

    const colorInt = parseInt(couleur.replace('#', ''), 16) || 0xe91e8c;
    const embed = new EmbedBuilder()
      .setColor(colorInt)
      .setTitle(titre)
      .setDescription(description)
      .setTimestamp();
    if (footer) embed.setFooter({ text: footer });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('gender_select')
      .setPlaceholder('⚧ Choisir ton genre')
      .addOptions(options.map(o => ({
        label: o.label,
        description: o.description || undefined,
        value: o.value,
      })));

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Menu de genre publié !', ephemeral: true });
  },
};
