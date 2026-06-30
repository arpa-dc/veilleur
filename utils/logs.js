// IDs des salons de logs par catégorie
const LOGS = {
  mute:     '1521264806118555718',
  warn:     '1521264805154131988',
  ban:      '1521264817808347378',
  raid:     '1521264805149671556',
  roles:    '1521264817862738041',
  mod:      '1521264838653775962',
  messages: '1521264826737889370',
  voice:    '1521264838741856347',
  leave:    '1521264826628837436',
  bot:      '1521264851937263737',
  admin:    '1521264838691651644',
  rank:     '1521264897587941416',
  antilink: '1521264897563037827',
};

async function getLogChannel(guild, key) {
  const id = LOGS[key];
  if (!id) return null;
  return guild.channels.fetch(id).catch(() => null);
}

module.exports = { LOGS, getLogChannel };
