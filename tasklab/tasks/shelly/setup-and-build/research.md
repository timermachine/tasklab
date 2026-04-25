# Research (verify online per run)

Update these files per run:
- `references/docs.md`
- `references/checked-surfaces.yaml`

## Surfaces checked

- Build: `pnpm android` — runs Expo + Gradle to produce and install debug APK via adb.
- Release APK: GitHub Releases (https://github.com/RYOITABASHI/Shelly/releases) — no build tools needed.
- CI build: GitHub Actions triggers on push to main; `gh run download <run-id>` fetches the APK.
- No official CLI for Shelly itself. All setup is local toolchain + adb.
- Expo Go is NOT supported — Shelly uses native Kotlin/C modules (JNI forkpty). Must build from source or use release APK.

## Notes

- NDK r27 is required. Android Studio SDK Manager: SDK Tools → NDK (Side by side) → 27.x.
- Bundle ID: `dev.shelly.terminal`
- USB debugging must be enabled on the device (Settings → Developer Options → USB debugging).
- Developer Options are hidden by default; tap Build Number 7 times to unlock.
- After install, Shelly requests All Files Access (MANAGE_EXTERNAL_STORAGE) on first launch — required for terminal to read /sdcard. Tap Allow.
- API keys (Claude, Gemini, etc.) are configured in-app via Settings → API Keys or `shelly config` from the terminal pane.
