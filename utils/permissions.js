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

// Roles autorisés pour /clean
const CLEAN_ROLES = [
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

function hasCleanRole(member) {
  return CLEAN_ROLES.some(r => member.roles.cache.has(r));
}

function hasUhqBypassRole(member) {
  return UHQ_BYPASS_ROLES.some(r => member.roles.cache.has(r));
}

function canUseSanction(member) {
  return isAdmin(member) || hasModRole(member) || hasMuteOnlyRole(member);
}

module.exports = {
  MOD_ROLES, MUTE_ONLY_ROLES, CLEAN_ROLES, UHQ_BYPASS_ROLES,
  isAdmin, hasModRole, hasMuteOnlyRole, hasCleanRole, hasUhqBypassRole, canUseSanction,
};
