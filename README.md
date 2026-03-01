# ZQ Ops Brain v2

> AI-powered operations workstation with **INNM-WOSDS** Triangular Matrix Engine – packaged as a native desktop app (Windows .exe) and Android app (.apk) via **Tauri 2**.

---

## Features

### ZQ Ops Brain
| Feature | Description |
|---------|-------------|
| **Today** | Task management with priorities and due dates |
| **Projects** | Hierarchical folder project structure |
| **Tasks** | Full task list with filter & sort |
| **Chat** | INNM chat interface with Triangular Matrix responses |
| **INNM** | WOODS folder mapping, Matrix visualisation, status |
| **Settings** | Keyhole Vault (AES-256), system info |

### INNM-WOSDS Engine
| Component | Role |
|-----------|------|
| **WOODS Builder** | Indexes `.txt`, `.md`, `.csv`, `.log` documents |
| **FRONT Matrix** | Input processing & keyword candidate retrieval |
| **BACK Matrix** | TF-IDF re-ranking & context validation |
| **UP Matrix** | Response synthesis & attribution |
| **ibox_core** | Orchestrator: FRONT → BACK → UP pipeline |

---

## Build

See [BUILD.md](./BUILD.md) for complete instructions.

```bash
npm install

# Windows (.exe)
npm run tauri-build

# Android (.apk)
npm run tauri-android-init
npm run tauri-android-build -- --apk
```

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Rust (Tauri 2)
- **AI Engine**: Python 3 (INNM-WOSDS, sidecar)
- **Crypto**: AES-256-GCM (Keyhole Vault)
- **CI/CD**: GitHub Actions (Windows + Android builds)

---

## Project Structure

```
src/               React UI (6 tabs)
src-tauri/         Rust backend + Tauri 2 config
  INNM_ENGINE/     Python INNM modules
  binaries/        Compiled sidecar
.github/workflows/ CI/CD pipelines
BUILD.md           Full build guide
```

---

## License

MIT © ZQ Ops
