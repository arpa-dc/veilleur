// ─── Anti-raid : suivi des arrivées et du spam en mémoire ──────────────────

// Fenêtre de détection des arrivées en masse (raid de bots/comptes)
const JOIN_WINDOW_MS = 10 * 1000;   // 10 secondes
const JOIN_THRESHOLD = 6;           // 6 arrivées en 10s => alerte raid

// Anti spam (messages)
const MSG_SPAM_WINDOW_MS = 5 * 1000;
const MSG_SPAM_THRESHOLD = 6;       // 6 messages en 5s => spam

// Anti spam (mentions)
const MENTION_SPAM_THRESHOLD = 5;   // 5 mentions dans un seul message

// Compte considéré "jeune" / suspect (raid de comptes fraîchement créés)
const NEW_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours

const joinTimestamps = [];     // [timestamp, ...]
const messageTimestamps = new Map(); // userId -> [timestamps]
let lockdownActive = false;

function registerJoin() {
  const now = Date.now();
  joinTimestamps.push(now);
  // purge les entrées hors fenêtre
  while (joinTimestamps.length && now - joinTimestamps[0] > JOIN_WINDOW_MS) {
    joinTimestamps.shift();
  }
  return joinTimestamps.length;
}

function isJoinRaidDetected() {
  return joinTimestamps.length >= JOIN_THRESHOLD;
}

function isNewAccount(user) {
  return Date.now() - user.createdTimestamp < NEW_ACCOUNT_AGE_MS;
}

function registerMessage(userId) {
  const now = Date.now();
  const arr = messageTimestamps.get(userId) || [];
  arr.push(now);
  while (arr.length && now - arr[0] > MSG_SPAM_WINDOW_MS) arr.shift();
  messageTimestamps.set(userId, arr);
  return arr.length;
}

function isMessageSpam(userId) {
  return registerMessage(userId) >= MSG_SPAM_THRESHOLD;
}

function isMentionSpam(message) {
  return message.mentions.users.size + message.mentions.roles.size >= MENTION_SPAM_THRESHOLD;
}

function setLockdown(state) {
  lockdownActive = state;
}

function isLockdownActive() {
  return lockdownActive;
}

module.exports = {
  registerJoin,
  isJoinRaidDetected,
  isNewAccount,
  isMessageSpam,
  isMentionSpam,
  setLockdown,
  isLockdownActive,
  JOIN_THRESHOLD,
  NEW_ACCOUNT_AGE_MS,
};
