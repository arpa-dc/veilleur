const { EmbedBuilder } = require('discord.js');
const { YELLOW } = require('../../utils/colors');

module.exports = {
  name: 'couple',
  description: 'Trouve ton couple aléatoire parmi les membres du serveur !',
  usage: '*couple',
  category: 'Fun',
  permission: 'public',

  async execute(message, args, client) {
    try {
      const members = await message.guild.members.fetch();
      const humanMembers = members.filter(m => !m.user.bot && m.id !== message.author.id);

      if (humanMembers.size === 0) {
        return message.reply('❌ Pas assez de membres pour ça.');
      }

      const random = humanMembers.random();

      const embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle('💘 Nouveau couple !')
        .setDescription(`${message.author} s'est mis(e) avec ${random} ! 💕`)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      await message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
