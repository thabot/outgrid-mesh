# 💻 Developer & Contributor Guide

Welcome to the **OutGrid Mesh** engineering documentation. This guide is intended for core contributors, security researchers, and developers integrating or extending the **Thabot OutGrid Protocol (TOG v1.1)**.

---

## 📂 1. Project Directory Structure

OutGrid Mesh follows a strict **Clean Architecture** model, isolating the pure domain logic (`src/core/`) from browser/DOM APIs and native mobile runtimes (`android/`):

```text
OutGridMesh/
├── .github/workflows/          # CI/CD Pipelines (Android APK build & GitHub Releases)
├── android/                    # Native Android Runtime (Kotlin + Gradle 8.5)
│   ├── app/src/main/java/io/outgrid/mesh/
│   │   ├── MainActivity.kt               # Entrypoint UI & Hardware Permission Bridge
│   │   ├── OutGridMeshService.kt         # 24/7 Foreground Service & WakeLock
│   │   ├── BleRadioNativeDriver.kt       # BLE 5 Coded PHY S=8 Hardware Radio Driver
│   │   └── LocalHotspotSideloadService.kt# Offline APK HTTP Server & Hotspot
│   └── build.gradle                      # Android Build Configuration (AGP 8.2.2)
├── docs/
│   ├── manuals/                # 10-Language Emergency Field Survival Manuals
│   └── DEVELOPER_GUIDE.md      # This engineering manual
├── src/
│   ├── core/                   # Platform-Independent Core Engine (Clean Architecture)
│   │   ├── crypto/             # E2EE (X25519 + AES-256-GCM), Ed25519 Signatures, HKDF
│   │   ├── dtn/                # Bundle Custody Store, Velocity Tracker, Hop Freeze
│   │   ├── i18n/               # 10-Language Universal Translation Engine
│   │   ├── network/            # Dynamic API Configuration & Zero-Cost Cloudflare Resolver
│   │   ├── protocol/           # TOG v1.1 Bitfield Serializer, Reed-Solomon 8+4 FEC, Sliding Window
│   │   ├── radio/              # BLE Coded PHY, Collision Shield, Wi-Fi P2P Driver
│   │   ├── routing/            # Epidemic Gossip Router, Dynamic Hop Decay, Bloom Filter
│   │   ├── spatial/            # 4-Tier H3 Geo-Hashing, Vector Basemap Parser, Radar Nav
│   │   └── storage/            # 50MB FIFO Quota Clamping Engine, SQLite/IndexedDB
│   ├── routes/                 # SvelteKit Root Pages & Layouts
│   └── ui/                     # Svelte 5 High-Contrast Dark Mode UI Components
├── scripts/
│   ├── checkSyntax.js          # AST Syntax Verification Guard (Scans 160+ files)
│   └── generateTestVectorMap.js# 5MB Offline Basemap Generator
├── tests/                      # Automated Unit & Integration Tests (245 Tests / 76 Suites)
└── package.json                # SvelteKit, Bun, Noble Cryptography, H3 Spatial
```

---

## ⚡ 2. Local Environment Setup

### Prerequisites:
- [Bun](https://bun.sh/) (recommended for sub-second test execution) or [Node.js](https://nodejs.org/) v20+
- [Android Studio](https://developer.android.com/studio) / Android SDK 34 (if compiling Android Native APK locally)

### Step 1: Install Dependencies
```bash
bun install
```

### Step 2: Codebase Syntax & Clean Architecture Verification
Runs the AST syntax checker to guarantee that `src/core/` has zero browser/DOM or platform leaks:
```bash
bun run check:syntax
# or node scripts/checkSyntax.js
```

### Step 3: Run Full Automated Test Suite
Executes all 245 unit and integration tests across 76 test suites:
```bash
bun test
```

### Step 4: Build Web PWA & Static Bundle
Compiles the static Web Dashboard into `build/`:
```bash
bun run build
```

---

## 🛠️ 3. Building Android Native APK Locally

To compile the Android APK directly from your local terminal:

```bash
cd android
./gradlew assembleDebug
# Generated APK will be placed at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📐 4. Architectural Rules & Code Quality Standards

1. **Zero Browser/Native Leaks in `src/core/`:**
   - Any files placed in `src/core/` must be 100% pure TypeScript.
   - Prohibited tokens in core: `window.`, `localStorage`, `document.`, `@capacitor/`, `android.`.
   - Verified automatically by `tests/unit/foundation/ArchitectureBoundary.test.ts`.

2. **Test-Driven Delivery:**
   - 100% unit test pass rate is strictly enforced on every PR.
   - Any new wire packet structure must include bitfield packing and unpacking roundtrip tests.

3. **Dual-Release Governance:**
   - Active development and experimental features are merged into `uat`.
   - Production releases are tagged and merged strictly via Pull Request into `main`.
