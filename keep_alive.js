const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot en ligne ✅');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Serveur keep-alive actif sur le port ${process.env.PORT || 3000}`);
});
