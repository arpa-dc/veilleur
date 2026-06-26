const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CONFESSION_CHANNEL_ID = '1520179315566841866';
const CONFESSION_LOGS_ID = '1520186767561461891';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Envoyer une confession anonyme')
    .addStringOption(o => o.setName('message').setDescription('Ta confession').setRequired(true).setMaxLength(1000)),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const guild = interaction.guild;

    const confessChannel = await guild.channels.fetch(CONFESSION_CHANNEL_ID).catch(() => null);
    const logsChannel = await guild.channels.fetch(CONFESSION_LOGS_ID).catch(() => null);

    if (!confessChannel) return interaction.reply({ content: '❌ Salon de confession introuvable.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💬 Nouvelle confession')
      .setDescription(message)
      .setTimestamp();

    await confessChannel.send({ embeds: [embed] });

    if (logsChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x7f8c8d)
        .setTitle('📋 Log confession')
        .addFields(
          { name: 'Auteur', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: 'Message', value: message }
        )
        .setTimestamp();
      await logsChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }

    await interaction.reply({ content: '✅ Ta confession a été envoyée anonymement.', ephemeral: true });
  },
};
