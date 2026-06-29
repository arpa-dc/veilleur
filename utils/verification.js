const VERIF_CHANNEL_ID = '1521264818047156224';
const VERIFIED_ROLE_ID = '1521264562412978227';
const INVITE_CODE = 'CzR6WEruEZ'; // code d'invite à repérer, quel que soit le format (brut, markdown, .gg, etc.)

/**
 * Vérifie si le membre a le lien d'invitation du serveur dans son statut personnalisé
 * (peu importe le format : "https://discord.gg/XXX", "[discord.gg/XXX](...)",
 * "[.gg/XXX](...)", "[/XXX](...)" — on cherche juste le code d'invite).
 */
function hasInviteInStatus(member) {
  if (!member?.presence?.activities) return false;
  const customStatus = member.presence.activities.find(a => a.type === 4); // CustomStatus
  if (!customStatus) return false;
  const text = `${customStatus.state || ''} ${customStatus.name || ''}`;
  return text.toLowerCase().includes(INVITE_CODE.toLowerCase());
}

async function grantVerifiedRole(member) {
  if (member.roles.cache.has(VERIFIED_ROLE_ID)) return 'already';
  await member.roles.add(VERIFIED_ROLE_ID);
  return 'granted';
}

module.exports = { VERIF_CHANNEL_ID, VERIFIED_ROLE_ID, INVITE_CODE, hasInviteInStatus, grantVerifiedRole };
