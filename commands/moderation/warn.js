const { EmbedBuilder } = require('discord.js');
const { YELLOW } = require('../../utils/colors');
const { checkPermission } = require('../../utils/permissions');
const { getLogChannel } = require('../../utils/logs');
const { readJSON, writeJSON } = require('../../utils/storage');

module.exports = {
  name: 'warn',
  description: 'Avertit un membre et enregistre l\'avertissement.',
  usage: '*warn <@membre> <raison>',
  category: 'Modération',
  permission: 'mod',

  async execute(message, args, client) {
    if (!checkPermission(message.member, this.permission)) {
      return message.reply('❌ Permission refusée.');
    }

    const raw = args[0];
    const raison = args.slice(1).join(' ');

    if (!raw || !raison) {
      return message.reply('❌ Usage : `*warn <@membre> <raison>`');
    }

    const id = raw.replace(/[<@!>]/g, '');
    const target = await message.guild.members.fetch(id).catch(() => null);
    if (!target) return message.reply('❌ Membre introuvable.');

    // Stockage des warns
    const warns = readJSON('warns.json');
    if (!warns[target.id]) warns[target.id] = [];
    warns[target.id].push({
      raison,
      auteur: message.author.id,
      date: new Date().toISOString(),
    });
    writeJSON('warns.json', warns);

    const totalWarns = warns[target.id].length;

    // MP au membre
    await target.user.send({
      content: `⚠️ Tu as reçu un avertissement sur **${message.guild.name}**.\n📋 **Raison :** ${raison}\n📊 Tu as maintenant **${totalWarns}** avertissement(s).`
    }).catch(() => {});

    // Confirmation dans le salon
    const confirmEmbed = new EmbedBuilder()
      .setColor(YELLOW)
      .setTitle('⚠️ Avertissement')
      .addFields(
        { name: 'Membre', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Raison', value: raison, inline: true },
        { name: 'Total warns', value: `${totalWarns}`, inline: true }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [confirmEmbed] });

    // Log dans le salon dédié
    const logsChannel = await getLogChannel(message.guild, 'warn');
    if (logsChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle('⚠️ Warn — Log')
        .addFields(
          { name: 'Membre', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Modérateur', value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: 'Raison', value: raison, inline: false },
          { name: 'Total warns', value: `${totalWarns}`, inline: true }
        )
        .setTimestamp();
      await logsChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  },
};
