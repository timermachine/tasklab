import { requiredEnv, walletFetch } from './_shared.mjs';

const classId = requiredEnv('CLASS_ID');
const objectId = requiredEnv('OBJECT_ID');

// NOTE: Endpoint + payload fields must be verified in official docs per run.
const payload = {
  id: objectId,
  classId,
  state: 'ACTIVE',
  barcode: {
    type: 'QR_CODE',
    value: objectId,
  },
  cardTitle: { defaultValue: { language: 'en-US', value: 'TaskLab' } },
  header: { defaultValue: { language: 'en-US', value: 'Generic pass' } },
  subheader: { defaultValue: { language: 'en-US', value: 'Demo' } },
};

try {
  const created = await walletFetch(`/walletobjects/v1/genericObject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  console.log(JSON.stringify({ ok: true, objectId: created?.id || objectId }, null, 2));
} catch (err) {
  const msg = String(err?.message || err);
  if (msg.includes(' 409 ') || msg.includes('ALREADY_EXISTS')) {
    console.log(JSON.stringify({ ok: true, objectId, note: 'already exists' }, null, 2));
  } else {
    throw err;
  }
}
