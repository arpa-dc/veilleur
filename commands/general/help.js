const { EmbedBuilder } = require('discord.js');
const { YELLOW } = require('../../utils/colors');

module.exports = {
  name: 'help',
  description: 'Affiche la liste de toutes les commandes du bot.',
  usage: '*help',
  category: 'Général',
  permission: 'public',

  async execute(message, args, client) {
    const categories = {};
    for (const cmd of client.commands.values()) {
      if (!categories[cmd.category]) categories[cmd.category] = [];
      // Évite les doublons (plusieurs alias pointant vers la même commande, ex: bl/unbl/etc déjà uniques ici)
      if (!categories[cmd.category].some(c => c.name === cmd.name)) {
        categories[cmd.category].push(cmd);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(YELLOW)
      .setTitle('📖 Aide — Liste des commandes')
      .setDescription(
        'Toutes les commandes utilisent désormais le préfixe **`*`** (plus de slash `/`).\n' +
        'Exemple : `*clear 50`'
      )
      .setTimestamp();

    const order = ['Sécurité', 'Modération', 'Admin', 'Fun', 'Général'];
    const sortedCategories = Object.keys(categories).sort(
      (a, b) => order.indexOf(a) - order.indexOf(b)
    );

    for (const cat of sortedCategories) {
      const lines = categories[cat]
        .map(c => `**${c.usage}**\n${c.description}`)
        .join('\n\n');
      embed.addFields({ name: `__${cat}__`, value: lines });
    }

    await message.channel.send({ embeds: [embed] });
  },
};
