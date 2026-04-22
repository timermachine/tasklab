import { requiredEnv, walletFetch } from './_shared.mjs';

const issuerId = requiredEnv('ISSUER_ID');
const classId = requiredEnv('CLASS_ID');
const title = requiredEnv('PASS_TITLE');

// NOTE: Endpoint + payload fields must be verified in official docs per run.
// This is a reasonable default skeleton for a Generic pass class.
const payload = {
  id: classId,
  issuerName: 'TaskLab',
  reviewStatus: 'UNDER_REVIEW',
  title,
  hexBackgroundColor: '#1A1A1A',
  heroImage: {
    sourceUri: { uri: 'https://via.placeholder.com/1200x630.png?text=TaskLab' },
    contentDescription: { defaultValue: { language: 'en-US', value: 'TaskLab' } },
  },
};

// Some APIs require the issuerId to be present in the class ID only; keep it as env for reporting.
void issuerId;

const created = await walletFetch(`/walletobjects/v1/genericClass`, {
  method: 'POST',
  body: JSON.stringify(payload),
});

console.log(JSON.stringify({ ok: true, classId: created?.id || classId }, null, 2));

