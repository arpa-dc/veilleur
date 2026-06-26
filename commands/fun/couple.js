const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('couple')
    .setDescription('Trouver ton couple aléatoire !'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const members = await interaction.guild.members.fetch();
      const humanMembers = members.filter(m => !m.user.bot && m.id !== interaction.user.id);

      if (humanMembers.size === 0) {
        return interaction.editReply({ content: '❌ Pas assez de membres pour ça.' });
      }

      const random = humanMembers.random();

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💘 Nouveau couple !')
        .setDescription(`${interaction.user} s'est mis(e) avec ${random} ! 💕`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Erreur : ${err.message}` });
    }
  },
};
