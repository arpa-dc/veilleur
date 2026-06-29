module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    console.log(`ℹ️  Préfixe des commandes : ${client.prefix}`);
  },
};
