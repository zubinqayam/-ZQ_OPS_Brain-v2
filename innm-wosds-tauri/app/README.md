# INNM-WOSDS Intelligence System

**Triangular Matrix Engine for Offline Document Retrieval**

[![Build Status](https://github.com/yourusername/innm-wosds/workflows/Build%20INNM-WOSDS/badge.svg)](https://github.com/yourusername/innm-wosds/actions)
[![Version](https://img.shields.io/badge/version-1.0.0-rose)](https://github.com/yourusername/innm-wosds/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

---

## Overview

INNM-WOSDS is a sovereign, offline-first intelligence system that uses a **Triangular Matrix Engine** to process natural language queries against your local documents.

### The Triangular Matrix

```
       FRONT
      (Input)
         /\
        /  \
       /    \
      /      \
     /________\
   BACK        UP
(Context)   (Synthesis)
```

1. **FRONT Matrix**: Input processing, keyword extraction, intent detection
2. **BACK Matrix**: Context validation, conversation history, constraint checking
3. **UP Matrix**: Document retrieval from WOODS, relevance scoring, answer synthesis

---

## Features

- **Offline-First**: No internet required, all processing happens locally
- **WOODS Mapping**: Index folders containing text documents (.txt, .md, .csv, .log)
- **Natural Language Queries**: Ask questions in plain English
- **Triangular Processing**: Three-stage query processing for accurate results
- **Cross-Platform**: Windows (.exe), Android (.apk), Linux, macOS
- **Privacy-First**: Your documents never leave your device

---

## Installation

### Windows

Download the latest `.exe` installer from [Releases](https://github.com/yourusername/innm-wosds/releases).

```bash
# Or build from source
git clone https://github.com/yourusername/innm-wosds.git
cd innm-wosds
npm install
npm run tauri-build
```

### Android

Download the latest `.apk` from [Releases](https://github.com/yourusername/innm-wosds/releases) and install on your device.

```bash
# Or build from source
git clone https://github.com/yourusername/innm-wosds.git
cd innm-wosds
npm install
npm run tauri-android-build
```

---

## Usage

### 1. Map a WOODS Folder

1. Open the app and go to the **WOODS** tab
2. Select or enter a folder path containing your documents
3. Click "Map WOODS Folder"
4. Wait for indexing to complete

### 2. Chat with INNM

1. Go to the **Chat** tab
2. Type your question about the documents
3. INNM will search the WOODS and provide relevant answers

Example queries:
- "What does the document say about project timelines?"
- "Find all mentions of budget constraints"
- "Summarize the key points from the reports"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INNM-WOSDS                              │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Tauri)                                   │
│  ├── Chat Interface                                         │
│  ├── WOODS Mapper                                           │
│  └── Matrix Visualizer                                      │
├─────────────────────────────────────────────────────────────┤
│  Tauri Bridge (Rust)                                        │
│  ├── Python Sidecar Manager                                 │
│  └── File System Access                                     │
├─────────────────────────────────────────────────────────────┤
│  Python Engine (Sidecar)                                    │
│  ├── ibox_core.py (IntelligenceBox)                         │
│  ├── front_matrix.py (Input Processing)                     │
│  ├── back_matrix.py (Context Validation)                    │
│  ├── up_matrix.py (Response Synthesis)                      │
│  └── woods_builder.py (Folder Indexing)                     │
├─────────────────────────────────────────────────────────────┤
│  Storage                                                    │
│  └── WOODS_STORE/memory/active_mapcore.json                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Development

### Prerequisites

- Node.js 20+
- Rust 1.75+
- Python 3.10+
- Android SDK (for mobile builds)

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/innm-wosds.git
cd innm-wosds

# Install dependencies
npm install

# Run development server
npm run tauri-dev
```

### Build

```bash
# Windows
npm run tauri-build

# Android
npm run tauri-android-build

# Linux
npm run tauri-build

# macOS
npm run tauri-build
```

See [BUILD.md](BUILD.md) for detailed build instructions.

---

## Project Structure

```
innm-wosds/
├── src/                    # React frontend
│   ├── App.tsx            # Main application
│   ├── App.css            # Styles
│   └── ...
├── src-tauri/             # Rust + Tauri backend
│   ├── src/
│   │   └── main.rs        # Rust entry point
│   ├── tauri.conf.json    # Tauri configuration
│   ├── Cargo.toml         # Rust dependencies
│   ├── binaries/
│   │   └── innm-engine    # Python sidecar wrapper
│   └── INNM_ENGINE/       # INNM Python modules
│       ├── ibox_core.py
│       ├── front_matrix.py
│       ├── back_matrix.py
│       ├── up_matrix.py
│       └── woods_builder.py
├── .github/workflows/     # CI/CD
│   └── build.yml
├── BUILD.md               # Build instructions
└── README.md              # This file
```

---

## Supported File Types

- `.txt` - Plain text files
- `.md` - Markdown files
- `.csv` - CSV data files
- `.log` - Log files

---

## How It Works

1. **WOODS Mapping**: The `woods_builder.py` indexes your folder, chunks documents into ~700 character segments, and creates `active_mapcore.json`

2. **Query Processing**: When you ask a question:
   - **FRONT** extracts keywords and detects intent
   - **BACK** validates context against conversation history
   - **UP** searches the WOODS index and synthesizes an answer

3. **Response**: INNM returns the most relevant document chunks with relevance scores

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

---

**INNM-WOSDS** - Sovereign Intelligence for Your Documents
