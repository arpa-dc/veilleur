const { YELLOW } = require('../../utils/colors');
const { checkPermission } = require('../../utils/permissions');

module.exports = {
  name: 'clear',
  description: 'Supprime un nombre de messages dans le salon (max 100, défaut 100).',
  usage: '*clear [nombre]',
  category: 'Modération',
  permission: 'clear', // admin ou rôle autorisé

  async execute(message, args, client) {
    if (!checkPermission(message.member, this.permission)) {
      return message.reply('❌ Permission refusée.');
    }

    let nombre = parseInt(args[0], 10);
    if (isNaN(nombre) || nombre < 1) nombre = 100;
    if (nombre > 100) nombre = 100;

    // On supprime aussi le message de commande lui-même (+1)
    const totalToFetch = nombre + 1;

    try {
      let deleted = 0;
      let lastId = null;
      let remaining = totalToFetch;

      while (remaining > 0) {
        const toFetch = Math.min(remaining, 100);
        const options = { limit: toFetch };
        if (lastId) options.before = lastId;

        const messages = await message.channel.messages.fetch(options);
        if (messages.size === 0) break;

        // Ne supprimer que les messages < 14 jours (limite API Discord)
        const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
        if (deletable.size === 0) break;

        await message.channel.bulkDelete(deletable, true);
        deleted += deletable.size;
        lastId = messages.last()?.id;
        remaining -= toFetch;

        if (deletable.size < toFetch) break;
        await new Promise(r => setTimeout(r, 1000)); // éviter le rate limit
      }

      // -1 pour ne pas compter le message de commande dans le compteur affiché
      const affiche = Math.max(0, deleted - 1);
      const confirm = await message.channel.send({ content: `✅ **${affiche}** message(s) supprimé(s).` });
      setTimeout(() => confirm.delete().catch(() => {}), 5000);
    } catch (err) {
      message.channel.send(`❌ Erreur : ${err.message}`);
    }
  },
};
