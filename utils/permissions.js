// Role IDs autorisés pour les commandes de modération
const MOD_ROLES = [
  '1520179219265622287',
  '1520179219471142973',
  '1520179219521605732',
  '1520189435449180342',
];

// Roles avec uniquement mute/unmute
const MUTE_ONLY_ROLES = [
  '1520179219752030218',
  '1520179219190124566',
];

// Roles autorisés pour *clear
const CLEAR_ROLES = [
  '1520179219471142973',
  '1520189435449180342',
];

// Roles qui ignorent le filtre "uhq"
const UHQ_BYPASS_ROLES = [
  '1520179219471142973',
  '1520189435449180342',
];

function isAdmin(member) {
  return member.permissions.has('Administrator');
}

function hasModRole(member) {
  return MOD_ROLES.some(r => member.roles.cache.has(r));
}

function hasMuteOnlyRole(member) {
  return MUTE_ONLY_ROLES.some(r => member.roles.cache.has(r));
}

function hasClearRole(member) {
  return CLEAR_ROLES.some(r => member.roles.cache.has(r));
}

function hasUhqBypassRole(member) {
  return UHQ_BYPASS_ROLES.some(r => member.roles.cache.has(r));
}

function canUseSanction(member) {
  return isAdmin(member) || hasModRole(member) || hasMuteOnlyRole(member);
}

// ─── Système générique de permission pour les commandes préfixées ───────────
// Chaque commande déclare un champ `permission` parmi :
// 'public' (tout le monde), 'admin', 'mod' (mod ou admin),
// 'muteOnly' (mute/unmute, mod ou admin), 'clear' (clear, mod ou admin)
function checkPermission(member, permission) {
  switch (permission) {
    case 'admin':
      return isAdmin(member);
    case 'mod':
      return isAdmin(member) || hasModRole(member);
    case 'muteOnly':
      return isAdmin(member) || hasModRole(member) || hasMuteOnlyRole(member);
    case 'clear':
      return isAdmin(member) || hasClearRole(member);
    case 'public':
    default:
      return true;
  }
}

module.exports = {
  MOD_ROLES, MUTE_ONLY_ROLES, CLEAR_ROLES, UHQ_BYPASS_ROLES,
  isAdmin, hasModRole, hasMuteOnlyRole, hasClearRole, hasUhqBypassRole, canUseSanction,
  checkPermission,
};
