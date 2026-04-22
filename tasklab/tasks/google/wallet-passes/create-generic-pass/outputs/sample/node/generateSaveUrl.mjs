import jwt from 'jsonwebtoken';
import { readServiceAccountKey, requiredEnv } from './_shared.mjs';

const issuerId = requiredEnv('ISSUER_ID');
const classId = requiredEnv('CLASS_ID');
const objectId = requiredEnv('OBJECT_ID');

const key = readServiceAccountKey();

// NOTE: Claim shape + audience/origins MUST be verified in official docs per run.
// This is a conservative skeleton that may require adjustment.
const now = Math.floor(Date.now() / 1000);
const claims = {
  iss: key.client_email,
  aud: 'google',
  typ: 'savetowallet',
  iat: now,
  // Many examples use `payload` nesting; verify current required structure.
  payload: {
    genericObjects: [
      {
        id: objectId,
        classId,
        // Some flows allow embedding minimal object fields; prefer creating via API first.
      },
    ],
  },
};

void issuerId;

const token = jwt.sign(claims, key.private_key, { algorithm: 'RS256' });
const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

console.log(saveUrl);

