const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const { isAdmin, hasModRole, hasMuteOnlyRole } = require('../../utils/permissions');

const LOGS_CHANNEL_ID = '1520179324643180667';
const SECURITY_LOGS_ID = '1520179265809940521';
const SERVER_INVITE = 'https://discord.gg/wEccEnmCj7';

// Cooldowns en ms
const COOLDOWNS = { ban: 15 * 60 * 1000, mute: 5 * 60 * 1000, kick: 10 * 60 * 1000 };

function getCooldownKey(userId, action) { return `${userId}_${action}`; }

function checkCooldown(client, userId, action) {
  const key = getCooldownKey(userId, action);
  const last = client.cooldowns.get(key) || 0;
  const elapsed = Date.now() - last;
  const cd = COOLDOWNS[action] || 0;
  if (elapsed < cd) return Math.ceil((cd - elapsed) / 1000);
  return 0;
}

function setCooldown(client, userId, action) {
  const key = getCooldownKey(userId, action);
  client.cooldowns.set(key, Date.now());
}

async function logSanction(guild, client, action, target, author, reason, extra = '') {
  const ch = await guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(action === 'ban' ? 0xe74c3c : action === 'kick' ? 0xe67e22 : action === 'mute' ? 0xf39c12 : 0x2ecc71)
    .setTitle(`🔨 Sanction — ${action.toUpperCase()}`)
    .addFields(
      { name: 'Utilisateur', value: `${target.user?.tag || target.tag} (${target.id})`, inline: true },
      { name: 'Raison', value: reason || 'Aucune raison', inline: true },
      { name: 'Durée', value: extra || '—', inline: true }
    )
    .setTimestamp();
  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function logCooldownViolation(guild, client, action, targetId, authorId) {
  const ch = await guild.channels.fetch(SECURITY_LOGS_ID).catch(() => null);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('⏱️ Tentative de sanction trop rapide')
    .addFields(
      { name: 'Auteur', value: `<@${authorId}>`, inline: true },
      { name: 'Cible', value: `<@${targetId}>`, inline: true },
      { name: 'Action', value: action, inline: true }
    )
    .setTimestamp();
  await ch.send({ embeds: [embed] }).catch(() => {});
}

// ─── /bl (ban) ───────────────────────────────────────────────────────────────
const blCommand = {
  data: new SlashCommandBuilder()
    .setName('bl')
    .setDescription('Bannir un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison du ban').setRequired(true))
    .addIntegerOption(o => o.setName('jours').setDescription('Supprimer X jours de messages (0-7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction, client) {
    const member = interaction.member;
    if (!isAdmin(member) && !hasModRole(member)) {
      return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
    }

    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison');
    const jours = interaction.options.getInteger('jours') ?? 0;

    if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    if (target.permissions?.has(PermissionFlagsBits.Administrator) && !isAdmin(member)) {
      return interaction.reply({ content: '❌ Tu ne peux pas bannir un administrateur.', ephemeral: true });
    }

    if (!isAdmin(member)) {
      const remaining = checkCooldown(client, member.id, 'ban');
      if (remaining > 0) {
        await logCooldownViolation(interaction.guild, client, 'ban', target.id, member.id);
        return interaction.reply({ content: `⏱️ Cooldown ban : encore **${remaining}s** à attendre.`, ephemeral: true });
      }
    }

    try {
      await target.user.send({
        content: `🔨 Tu as été **banni** du serveur.\n📋 **Raison :** ${raison}`
      }).catch(() => {});

      await target.ban({ reason: raison, deleteMessageSeconds: jours * 86400 });
      if (!isAdmin(member)) setCooldown(client, member.id, 'ban');

      await logSanction(interaction.guild, client, 'ban', target, member, raison);
      await interaction.reply({ content: `✅ **${target.user.tag}** a été banni.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ Impossible de bannir : ${err.message}`, ephemeral: true });
    }
  },
};

// ─── /unbl (unban) ───────────────────────────────────────────────────────────
const unblCommand = {
  data: new SlashCommandBuilder()
    .setName('unbl')
    .setDescription('Débannir un utilisateur')
    .addStringOption(o => o.setName('userid').setDescription('ID de l\'utilisateur').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.member;
    if (!isAdmin(member) && !hasModRole(member)) {
      return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
    }

    const userId = interaction.options.getString('userid');
    const raison = interaction.options.getString('raison') || 'Aucune raison';

    try {
      await interaction.guild.members.unban(userId, raison);
      await logSanction(interaction.guild, client, 'unban', { id: userId, user: { tag: userId } }, member, raison);
      await interaction.reply({ content: `✅ Utilisateur \`${userId}\` débanni.`, ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Impossible de débannir. ID invalide ou l\'utilisateur n\'est pas banni.', ephemeral: true });
    }
  },
};

// ─── /mute ───────────────────────────────────────────────────────────────────
const muteCommand = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Muter un membre (timeout)')
    .addUserOption(o => o.setName('membre').setDescription('Membre à muter').setRequired(true))
    .addIntegerOption(o => o.setName('duree').setDescription('Durée en minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(true)),

  async execute(interaction, client) {
    const member = interaction.member;
    if (!isAdmin(member) && !hasModRole(member) && !hasMuteOnlyRole(member)) {
      return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
    }

    const target = interaction.options.getMember('membre');
    const duree = interaction.options.getInteger('duree');
    const raison = interaction.options.getString('raison');

    if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });

    if (!isAdmin(member)) {
      const remaining = checkCooldown(client, member.id, 'mute');
      if (remaining > 0) {
        await logCooldownViolation(interaction.guild, client, 'mute', target.id, member.id);
        return interaction.reply({ content: `⏱️ Cooldown mute : encore **${remaining}s** à attendre.`, ephemeral: true });
      }
    }

    try {
      await target.user.send({
        content: `🔇 Tu as été **muté** pour **${duree} minute(s)**.\n📋 **Raison :** ${raison}`
      }).catch(() => {});

      await target.timeout(duree * 60 * 1000, raison);
      if (!isAdmin(member)) setCooldown(client, member.id, 'mute');

      const dureeStr = `${duree} min`;
      await logSanction(interaction.guild, client, 'mute', target, member, raison, dureeStr);
      await interaction.reply({ content: `✅ **${target.user.tag}** muté pour ${duree} minute(s).`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ Impossible de muter : ${err.message}`, ephemeral: true });
    }
  },
};

// ─── /unmute ─────────────────────────────────────────────────────────────────
const unmuteCommand = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Démuter un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à démuter').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.member;
    if (!isAdmin(member) && !hasModRole(member) && !hasMuteOnlyRole(member)) {
      return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
    }

    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') || 'Aucune raison';

    if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });

    try {
      await target.timeout(null, raison);
      await logSanction(interaction.guild, client, 'unmute', target, member, raison);
      await interaction.reply({ content: `✅ **${target.user.tag}** démuté.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ Impossible de démuter : ${err.message}`, ephemeral: true });
    }
  },
};

// ─── /kick ───────────────────────────────────────────────────────────────────
const kickCommand = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(true)),

  async execute(interaction, client) {
    const member = interaction.member;
    if (!isAdmin(member) && !hasModRole(member)) {
      return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
    }

    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison');

    if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });

    if (!isAdmin(member)) {
      const remaining = checkCooldown(client, member.id, 'kick');
      if (remaining > 0) {
        await logCooldownViolation(interaction.guild, client, 'kick', target.id, member.id);
        return interaction.reply({ content: `⏱️ Cooldown kick : encore **${remaining}s** à attendre.`, ephemeral: true });
      }
    }

    try {
      await target.user.send({
        content: `👢 Tu as été **expulsé** du serveur.\n📋 **Raison :** ${raison}\n🔗 Tu peux rejoindre à nouveau : ${SERVER_INVITE}`
      }).catch(() => {});

      await target.kick(raison);
      if (!isAdmin(member)) setCooldown(client, member.id, 'kick');

      await logSanction(interaction.guild, client, 'kick', target, member, raison);
      await interaction.reply({ content: `✅ **${target.user.tag}** expulsé.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ Impossible d'expulser : ${err.message}`, ephemeral: true });
    }
  },
};

// ─── /bl list ────────────────────────────────────────────────────────────────
const blListCommand = {
  data: new SlashCommandBuilder()
    .setName('bl-list')
    .setDescription('Voir la liste des membres bannis'),

  async execute(interaction, client) {
    const member = interaction.member;
    if (!isAdmin(member) && !hasModRole(member)) {
      return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const bans = await interaction.guild.bans.fetch();
      if (bans.size === 0) return interaction.editReply({ content: '✅ Aucun membre banni.' });

      const lines = bans.map(b => `• **${b.user.tag}** (${b.user.id}) — ${b.reason || 'Aucune raison'}`);
      const chunks = [];
      let current = '';
      for (const line of lines) {
        if ((current + line).length > 1900) { chunks.push(current); current = ''; }
        current += line + '\n';
      }
      if (current) chunks.push(current);

      const embed = new EmbedBuilder().setColor(0xe74c3c).setTitle(`🚫 Liste des bannis (${bans.size})`).setDescription(chunks[0]).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Erreur : ${err.message}` });
    }
  },
};

module.exports = { blCommand, unblCommand, muteCommand, unmuteCommand, kickCommand, blListCommand };
