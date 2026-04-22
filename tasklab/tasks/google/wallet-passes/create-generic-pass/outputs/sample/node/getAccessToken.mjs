import { GoogleAuth } from 'google-auth-library';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const keyPath = requiredEnv('GOOGLE_APPLICATION_CREDENTIALS');

// NOTE: Scope(s) MUST be verified in official docs per run.
// Set it in env if you need to override without editing code.
const scope = process.env.WALLET_SCOPE || 'https://www.googleapis.com/auth/wallet_object.issuer';

const auth = new GoogleAuth({
  keyFile: keyPath,
  scopes: [scope],
});

const client = await auth.getClient();
const tokenResponse = await client.getAccessToken();

if (!tokenResponse?.token) {
  throw new Error('Failed to obtain access token');
}

process.stdout.write(tokenResponse.token);

