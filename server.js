require('dotenv').config({ quiet: true });
const crypto = require('node:crypto');
const express = require('express');

const { SECRET_MESSAGE, USERNAME, PASSWORD, PORT = 3000 } = process.env;

for (const [name, value] of Object.entries({ SECRET_MESSAGE, USERNAME, PASSWORD })) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));

function basicAuth(req, res, next) {
  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i !== -1) {
      const userOk = safeEqual(decoded.slice(0, i), USERNAME);
      const passOk = safeEqual(decoded.slice(i + 1), PASSWORD);
      if (userOk && passOk) return next();
    }
  }
  res.set('WWW-Authenticate', 'Basic realm="secret", charset="UTF-8"');
  res.status(401).send('Unauthorized: invalid username or password');
}

const app = express();
app.disable('x-powered-by');

app.get('/', (req, res) => res.send('Hello, world!'));
app.get('/healthz', (req, res) => res.send('ok'));
app.get('/secret', basicAuth, (req, res) => res.send(SECRET_MESSAGE));

const server = app.listen(PORT, '0.0.0.0', () => console.log(`Listening on :${PORT}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
