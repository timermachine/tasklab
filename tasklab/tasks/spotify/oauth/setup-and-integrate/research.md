# Research (verify online per run)

Update these files per run:
- `references/docs.md` (URLs you used)
- `references/checked-surfaces.yaml` (verified_on + Node version)

## Surfaces checked

- Spotify Web API: Authorization Code flow — fully scriptable after HITL app registration.
- No official Spotify CLI exists. All post-registration steps are scripted via Node.js + native fetch.
- App registration has no API surface — requires HITL via developer.spotify.com/dashboard.

## Notes

- Access tokens expire in 3600 seconds. Refresh token does not expire unless revoked or unused for >1 year.
- Scopes used: `user-read-private user-read-email` (minimum for /v1/me identity verification).
- SPOTIFY_CALLBACK_PORT defaults to 8888. Override if port is in use.
- The callback server is short-lived: it starts, catches one redirect, exchanges the code, writes tokens, and exits.
