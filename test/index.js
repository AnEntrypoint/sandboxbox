console.log('Hello from SandboxBox test container!');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Current working directory:', process.cwd());

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from SandboxBox container!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});