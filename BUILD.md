# Build Instructions – ZQ Ops Brain v2

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Frontend build |
| npm | ≥ 10 | Package manager |
| Rust | stable | Tauri backend |
| Tauri CLI | 2.x | Build orchestration |
| Python | ≥ 3.10 | INNM engine (sidecar) |
| PyInstaller | ≥ 6 | Package Python sidecar |
| Android SDK | API 34 | Android target |
| NDK | 27.x | Android native build |
| Java | 17 | Android toolchain |

---

## Quick Start

```bash
# Clone
git clone https://github.com/zubinqayam/-ZQ_OPS_Brain-v2.git
cd zq-ops-brain-v2

# Install JavaScript dependencies
npm install

# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli --version "^2.0"
```

---

## Development

```bash
# Start hot-reload dev server
npm run tauri-dev
```

---

## Build Windows (.exe)

```bash
npm run tauri-build
# Output: src-tauri/target/release/bundle/nsis/ZQ Ops Brain_2.0.0_x64-setup.exe
```

### Optional: Package Python sidecar for Windows

```bash
pip install pyinstaller

# From project root
pyinstaller \
  --onefile \
  --name innm-engine-x86_64-pc-windows-msvc \
  src-tauri/binaries/innm-engine

# Move compiled binary
mv dist/innm-engine-x86_64-pc-windows-msvc.exe src-tauri/binaries/
```

---

## Build Android (.apk)

```bash
# One-time: initialise Android project
npm run tauri-android-init

# Build debug APK
npm run tauri-android-build -- --apk

# Build release APK (requires signing config in src-tauri/gen/android/)
npm run tauri-android-build -- --apk --release
```

APK output: `src-tauri/gen/android/app/build/outputs/apk/`

---

## CI/CD (GitHub Actions)

The workflow at `.github/workflows/build.yml` automatically:

- **On push to main/master**: builds Windows `.exe` + Android `.apk`
- **On pull request**: runs lint + TypeScript type-check
- **On tag `v*`**: creates a GitHub Release draft with both artifacts

---

## INNM Engine Setup

The INNM Triangular Matrix Engine lives in `src-tauri/INNM_ENGINE/`.

### Python modules

| File | Role |
|------|------|
| `ibox_core.py` | Orchestrator – coordinates FRONT/BACK/UP pipeline |
| `front_matrix.py` | Input processing & keyword candidate retrieval |
| `back_matrix.py` | TF-IDF re-ranking & context validation |
| `up_matrix.py` | Response synthesis & attribution |
| `woods_builder.py` | WOODS folder walker & document indexer |

### Using the engine standalone

```bash
cd src-tauri/INNM_ENGINE

# Interactive REPL
python ibox_core.py
# Then pipe commands:
echo '{"cmd":"load_woods","path":"/your/docs"}' | python ibox_core.py
echo '{"cmd":"query","message":"deployment plan"}' | python ibox_core.py
echo '{"cmd":"status"}' | python ibox_core.py
```

---

## Project Structure

```
zq-ops-brain-v2/
├── src/                          # React Frontend
│   ├── App.tsx                   # Main UI (6 tabs)
│   ├── App.css                   # Dark GitHub-inspired styles
│   ├── main.tsx                  # React entry point
│   └── lib/utils.ts              # Utility helpers
├── src-tauri/                    # Tauri 2 Backend
│   ├── src/
│   │   ├── lib.rs                # Rust commands + INNM integration
│   │   └── main.rs               # Entry point
│   ├── capabilities/
│   │   └── default.json          # Tauri 2 permissions
│   ├── tauri.conf.json           # Tauri 2 configuration
│   ├── Cargo.toml                # Rust dependencies
│   ├── build.rs                  # Tauri build script
│   ├── binaries/
│   │   └── innm-engine           # Python sidecar entry-point
│   └── INNM_ENGINE/              # Python INNM modules
│       ├── ibox_core.py
│       ├── front_matrix.py
│       ├── back_matrix.py
│       ├── up_matrix.py
│       └── woods_builder.py
├── .github/workflows/
│   └── build.yml                 # CI/CD for Windows + Android
├── BUILD.md                      # This file
├── README.md                     # Project overview
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.cjs
└── postcss.config.cjs
```
