# Shelly — Setup and build

This TaskLab task gets [Shelly](https://github.com/RYOITABASHI/Shelly) (AI terminal IDE for Android) installed on your device. Two paths:

- **Local build** — `pnpm android` from source. Requires Node 22+, pnpm, Android NDK r27+.
- **Release APK** — download from GitHub Releases and sideload. No build tools needed.

## Session prelude (copy/paste once)

```bash
cd /Users/steve/dev/TaskLab

PROJECT_ROOT="$HOME/projects/shelly"   # path to cloned Shelly repo
TASK_DIR="tasklab/tasks/shelly/setup-and-build"
export PROJECT_ROOT TASK_DIR

cd "$TASK_DIR"
```

## Operator quickstart

1) Print deep links and generate `/tmp` helper scripts:

```bash
bash outputs/scripts/00-hitl-links.sh --project-root "$PROJECT_ROOT"
```

2) Complete HITL: enable USB debugging on your Android device — `hitl/enable-usb-debugging.step.yaml`

3) Clone Shelly (if not already):

```bash
git clone https://github.com/RYOITABASHI/Shelly "$PROJECT_ROOT"
```

4) Preflight:

```bash
# Local build path:
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT" --build-path local

# Release APK path:
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT" --build-path release
```

5a) **Local build path** — install deps and build:

```bash
bash outputs/scripts/02-install-deps.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/03-build-and-install.sh --project-root "$PROJECT_ROOT"
```

5b) **Release APK path** (no build tools required):

```bash
bash outputs/scripts/04-download-and-install.sh --project-root "$PROJECT_ROOT"
```

6) Verify installation:

```bash
bash outputs/scripts/99-run-tests.sh --project-root "$PROJECT_ROOT"
```

7) Complete HITL: add your AI API key in Shelly — `hitl/configure-api-keys.step.yaml`

8) Fill in evidence and update the manifest:

- Complete `outputs/reports/setup-report.md`
- Update `manifest.yaml`: set `maturity: 1`, append run entry

9) Regenerate the registry:

```bash
cd /Users/steve/dev/TaskLab
./scripts/build-registry.sh
git add tasklab/tasks/shelly/setup-and-build/manifest.yaml tasklab/registry.yaml
git commit -m "chore: update manifest + registry for shelly setup"
```

## NDK issues

If `pnpm android` fails with NDK errors: open Android Studio → SDK Manager → SDK Tools tab → NDK (Side by side) → install 27.x → retry.

## Pitfalls

- Expo Go is **not supported** — Shelly uses native Kotlin/C modules. You must build from source or use the release APK.
- USB debugging must be enabled AND the device must accept the "Allow USB debugging?" dialog — `adb devices` shows `unauthorized` if you haven't tapped Allow.
- On first launch, Shelly requests All Files Access (`MANAGE_EXTERNAL_STORAGE`). Tap Allow — the terminal needs it to read `/sdcard`.
