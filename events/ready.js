const { readJSON, writeJSON } = require('../utils/storage');
const { citations } = require('../data/citations');

const CITATION_CHANNEL_ID = '1520179295270469632';
const CITATION_INTERVAL_MS = 7 * 60 * 60 * 1000; // 7 heures

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    // Démarrage du scheduler de citations
    startCitationScheduler(client);
  },
};

function startCitationScheduler(client) {
  const sendCitation = async () => {
    try {
      const channel = await client.channels.fetch(CITATION_CHANNEL_ID).catch(() => null);
      if (!channel) return;

      let state = readJSON('citation_state.json');
      if (!state.index || state.index >= citations.length) state.index = 0;

      const citation = citations[state.index];
      state.index++;
      writeJSON('citation_state.json', state);

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('✨ Citation du moment')
        .setDescription(`> ${citation}`)
        .setFooter({ text: `${state.index}/${citations.length} citations` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur citation scheduler:', err);
    }
  };

  // Envoyer immédiatement au démarrage
  sendCitation();
  // Puis toutes les 7h
  setInterval(sendCitation, CITATION_INTERVAL_MS);
}
