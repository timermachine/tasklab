import { walletFetch } from './_shared.mjs';

async function main() {
  const issuerId = process.env.ISSUER_ID;

  let issuerCount = 0;
  try {
    const list = await walletFetch('/walletobjects/v1/issuer', { method: 'GET' });
    issuerCount = Array.isArray(list?.resources) ? list.resources.length : 0;
    console.error(`Issuer list OK (resources: ${issuerCount})`);
    if (issuerCount > 0) {
      const simplified = list.resources.map((r) => ({ issuerId: r?.issuerId, name: r?.name }));
      console.log(JSON.stringify({ issuers: simplified }, null, 2));
      console.error('Pick one issuerId from the list above and set ISSUER_ID=<issuerId> in your project .env.');
    } else {
      console.error(
        'Issuer list returned 0 issuers. This usually means the service account is not authorized in the Google Pay & Wallet console, or you are looking at the wrong business/issuer account.'
      );
      process.exitCode = 2;
    }
  } catch (err) {
    console.error('Issuer list failed.');
    const msg = String(err?.message || err);
    if (msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')) {
      console.error('Hint: cannot reach Google APIs (DNS/network). If you are running in a sandboxed environment, run this from your host shell with normal internet access.');
    }
    throw err;
  }

  if (!issuerId || issuerCount === 0) {
    if (!issuerId) console.error('ISSUER_ID is not set; skipping GET /issuer/{ISSUER_ID}.');
    return;
  }

  if (!/^[0-9]+$/.test(issuerId) || issuerId.length > 19) {
    console.error('ISSUER_ID is set but does not look like a numeric int64; skipping GET /issuer/{ISSUER_ID}.');
    console.error('Hint: ISSUER_ID must be digits only (usually <= 19 digits).');
    return;
  }

  try {
    const issuer = await walletFetch(`/walletobjects/v1/issuer/${issuerId}`, { method: 'GET' });
    console.log(JSON.stringify({ issuerId: issuer?.issuerId, name: issuer?.name }, null, 2));
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes(' 403 ')) {
      console.error(
        'Hint: 403 usually means your service account is not authorized in the Google Pay & Wallet console (Users → invite service account email as Developer), or you are using the wrong ISSUER_ID.'
      );
    } else if (msg.includes(' 404 ')) {
      console.error('Hint: 404 usually means ISSUER_ID is wrong, or the issuer is not shared to this service account.');
    } else if (msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')) {
      console.error('Hint: cannot reach Google APIs (DNS/network). If you are running in a sandboxed environment, run this from your host shell with normal internet access.');
    } else if (msg.includes('INVALID_ARGUMENT')) {
      console.error('Hint: ISSUER_ID must be a numeric int64 (digits only, usually <= 19 digits).');
    }
    throw err;
  }
}

await main();
