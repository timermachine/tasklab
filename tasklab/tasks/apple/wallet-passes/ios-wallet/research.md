# Research — Apple Wallet (PassKit `.pkpass`)

## What this task does

- Scaffolds a small local project layout suitable for building a `.pkpass`.
- Produces a deterministic build pipeline:
  - generate placeholder PNGs (optional)
  - render `pass.json`
  - compute `manifest.json` (SHA-1 over files)
  - sign `manifest.json` with a Pass Type ID certificate
  - zip into a `.pkpass`

## Surfaces checked (must be verified per run)

Because Apple’s Developer portal UX and certificate flows drift, and because this repo run is offline, treat the links in `references/docs.md` as **seed links** and re-verify them before use.

Important access note:

- Building a **signed** `.pkpass` requires a **Pass Type ID certificate** issued by Apple.
- Apple states that Apple Developer Program membership is required to request/download signing certificates, and Pass Type ID certificates are requested in Certificates, Identifiers & Profiles.
- If the Developer portal shows “This resource is only for developers enrolled in a developer program…”, you’re likely using a free Apple Account (not enrolled) or you’re not a member of an enrolled organization team.

Record:

- The exact Apple Developer portal pages used
- The certificate type downloaded
- The WWDR certificate you used (and date)

## Known sharp edges

- `passTypeIdentifier` and `teamIdentifier` must match the Pass Type ID certificate.
- Images are required for most passes; at minimum `icon.png` is typically expected.
- `manifest.json` must include SHA-1 hashes for each file in the pass bundle (excluding `manifest.json` and `signature`).
