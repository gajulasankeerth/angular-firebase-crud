/* eslint-disable no-console */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '.dropbox-pkce.json');

function parseArgs(argv) {
  const args = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    args[k] = rest.join('=') || true;
  }
  return args;
}

function base64url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function generatePkce() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { encoding: 'utf8' });
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function requireArg(args, name) {
  const v = args[name];
  if (!v || v === true) throw new Error(`Missing required --${name}=...`);
  return v;
}

function buildAuthorizeUrl({ clientId, redirectUri, codeChallenge }) {
  const u = new URL('https://www.dropbox.com/oauth2/authorize');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('token_access_type', 'offline');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('code_challenge', codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

async function exchangeCodeForToken({ code, clientId, redirectUri, codeVerifier, clientSecret }) {
  const body = new URLSearchParams();
  body.set('code', code);
  body.set('grant_type', 'authorization_code');
  body.set('client_id', clientId);
  body.set('redirect_uri', redirectUri);
  body.set('code_verifier', codeVerifier);
  if (clientSecret) body.set('client_secret', clientSecret);

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json && json.error_description ? json.error_description : JSON.stringify(json);
    throw new Error(`Dropbox token exchange failed (${res.status}): ${msg}`);
  }
  return json;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!command || command === 'help' || command === '--help') {
    console.log(
      [
        'Dropbox OAuth helper (PKCE)',
        '',
        '1) Start OAuth (prints authorize URL, saves verifier locally):',
        '   node scripts/dropbox-oauth.js start --client-id=APP_KEY --redirect-uri=http://localhost:3000/callback',
        '',
        '2) Exchange code for refresh token:',
        '   node scripts/dropbox-oauth.js exchange --code=AUTH_CODE --client-id=APP_KEY --redirect-uri=http://localhost:3000/callback',
        '   (optional) add --client-secret=APP_SECRET if your app requires it',
        '',
        `State file (DO NOT COMMIT): ${STATE_FILE}`,
      ].join('\n'),
    );
    return;
  }

  if (command === 'start') {
    const clientId = requireArg(args, 'client-id');
    const redirectUri = requireArg(args, 'redirect-uri');
    const { codeVerifier, codeChallenge } = generatePkce();

    saveState({ clientId, redirectUri, codeVerifier, createdAt: new Date().toISOString() });

    const url = buildAuthorizeUrl({ clientId, redirectUri, codeChallenge });
    console.log('Open this URL in your browser and approve access:\n');
    console.log(url);
    console.log('\nThen copy the `code` from the redirect URL and run:\n');
    console.log(
      `node scripts/dropbox-oauth.js exchange --code=PASTE_CODE --client-id=${clientId} --redirect-uri=${redirectUri}`,
    );
    return;
  }

  if (command === 'exchange') {
    const code = requireArg(args, 'code');
    const clientId = args['client-id'] && args['client-id'] !== true ? args['client-id'] : null;
    const redirectUri =
      args['redirect-uri'] && args['redirect-uri'] !== true ? args['redirect-uri'] : null;
    const clientSecret =
      args['client-secret'] && args['client-secret'] !== true ? args['client-secret'] : null;
    const codeVerifier =
      args['code-verifier'] && args['code-verifier'] !== true ? args['code-verifier'] : null;

    const state = loadState();
    const finalClientId = clientId || (state && state.clientId);
    const finalRedirectUri = redirectUri || (state && state.redirectUri);
    const finalCodeVerifier = codeVerifier || (state && state.codeVerifier);

    if (!finalClientId) throw new Error('Missing --client-id=... (or run `start` first)');
    if (!finalRedirectUri) throw new Error('Missing --redirect-uri=... (or run `start` first)');
    if (!finalCodeVerifier) throw new Error('Missing --code-verifier=... (or run `start` first)');

    const token = await exchangeCodeForToken({
      code,
      clientId: finalClientId,
      redirectUri: finalRedirectUri,
      codeVerifier: finalCodeVerifier,
      clientSecret,
    });

    console.log('\nSuccess. Keep these server-side only.\n');
    console.log(JSON.stringify(token, null, 2));

    if (token.refresh_token) {
      console.log(
        `\n(refresh_token length: ${token.refresh_token.length} — paste the full value into Firebase; no quotes or line breaks)\n`,
      );
      console.log('\nSet these env vars for Firebase Functions:\n');
      console.log(`DROPBOX_CLIENT_ID=${finalClientId}`);
      if (clientSecret) console.log(`DROPBOX_CLIENT_SECRET=${clientSecret}`);
      console.log(`DROPBOX_REFRESH_TOKEN=${token.refresh_token}`);
    } else {
      console.log(
        '\nNo refresh_token returned. Make sure your authorize URL included token_access_type=offline.',
      );
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exitCode = 1;
});
