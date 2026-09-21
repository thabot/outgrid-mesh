# OutGrid Mesh Field Operations & Survival Guide (EN)
**Protocol:** Thabot OutGrid Protocol (TOG v1.1)  
**Author:** Thabot (<thabo47@gmail.com>)  
**License:** AGPL-3.0 Non-Profit Humanitarian Public Good

[🏠 Home / README](../../README.md) • 
[🇹🇭 ไทย](manual.th.md) • 
[🇬🇧 English](manual.en.md) • 
[🇨🇳 中文](manual.zh.md) • 
[🇪🇸 Español](manual.es.md) • 
[🇯🇵 日本語](manual.ja.md) • 
[🇫🇷 Français](manual.fr.md) • 
[🇵🇹 Português](manual.pt.md) • 
[🇷🇺 Русский](manual.ru.md) • 
[🇸🇦 العربية](manual.ar.md) • 
[🇮🇳 हिन्दी](manual.hi.md)

---

## 1. Application Installation

### For Devices with Internet Access:
1. Download either the official release (`outgrid-mesh.apk`) or testing release (`outgrid-mesh-uat.apk`) from GitHub Releases.
2. Open the file on your Android device and allow "Install from Unknown Sources".
3. Grant necessary runtime permissions:
   - **Bluetooth & Nearby Devices:** For peer discovery and relay forwarding over the ad-hoc mesh.
   - **Location:** For embedding high-accuracy coordinates in SOS packets and compass navigation.
   - **Battery Optimization Exemption:** To allow 24/7 background relay operation when screen is asleep.

### Offline Field Installation (Wi-Fi Sideloading):
1. Locate an existing nearby OutGrid Mesh device (survivor or responder).
2. Have them open **"Emergency APK Sideload"** (activates a local zero-data Wi-Fi hotspot).
3. Connect your phone to that hotspot and open `http://192.168.49.1:8080` in your web browser to download and install the APK directly without internet access.

---

## 2. Feature Operations & Use Cases

### 🚨 1. One-Tap SOS Emergency Beacon
- Press and hold the central red **SOS button** for 1 second.
- Select your triage category (e.g., severe injury, flash flood trap, collapsed building).
- The engine compresses sub-meter GPS coordinates, Uber H3 Res 9 hexagon index, battery level, and triage status into a compact **21-byte** broadcast that floods across neighbor nodes.

### 💬 2. 1-on-1 End-to-End Encrypted Chat
- Tap any detected survivor or responder node in the mesh contact list.
- Send instant text messages, 15-second compressed voice memos, or low-bitrate WebP damage photos.
- All communications are secured using **X25519 ECDH + AES-256-GCM**. Intermediate relay nodes cannot read or modify payloads.

### 📢 3. Verified Crisis Broadcast Feed
- Receive official evacuation orders, water/food distribution locations, and field triage updates.
- Authenticated with **Ed25519 Digital Signatures** from incident commanders to completely eliminate rumors and spoofing.

### 🗺️ 4. Offline Vector Basemap & Radar Navigation
- Global offline vector map under 5MB, instantly usable without internet.
- Tap any incoming SOS beacon to engage **Compass Radar Navigation**, providing real-time compass bearings and straight-line distances to victims.

### 🔦 5. Acoustic Morse Siren & Optical Strobe Torch
- If trapped in darkness or building rubble, trigger this feature to blast universal SOS Morse audio code and flash the camera strobe to guide search and rescue teams.

---

## 3. Communication Range & Technical Specifications

| Radio Transport | Effective Range (Per Hop) | Ideal Environment | Throughput |
| :--- | :---: | :--- | :---: |
| **BLE 5 Long Range (Coded PHY S=8)** | **300 – 1,000 meters** | Open plains, rural terrain, rooftops, water bodies | ~125 kbps |
| **BLE Standard (1M PHY)** | **30 – 100 meters** | Urban interiors, through reinforced walls | ~1 Mbps |
| **Wi-Fi Direct P2P (SoftAP)** | **100 – 200 meters** | APK direct transfers, situational photos | ~10 – 50 Mbps |
| **LoRa Companion Bridge (ESP32)** | **5 – 15 kilometers** | Mountains, long-range rural backbones | ~0.3 – 5 kbps |

- **Multi-Hop Relay:** Packets hop through intermediate smartphones up to **15 hops**, allowing signals to cross tens of kilometers across communities.
- **DTN Store-and-Forward (Data Mule):** In disconnected zones, walking users automatically store packets and carry them across physical gaps to forward upon meeting new nodes.

---

## 4. Transmission Limits & Operational Constraints

1. **Payload Size Guidelines:**
   - Text messages & SOS: Keep under **200 characters** for instant delivery across narrow radio channels.
   - Voice Memos: Capped at **15 seconds** using ultra-compact speech codecs.
   - Images: Automatically converted to low-resolution WebP to preserve mesh bandwidth.
2. **Duplicate Suppression (Storm Guard):**
   - Built-in Counting Bloom Filter prevents redundant message flooding, protecting shared airwaves.
3. **Local Storage Ceiling:**
   - Enforces a strict **50MB** FIFO quota. Life-critical SOS messages are permanently shielded from eviction.

---

## 5. Battery Preservation Strategy

- Below 20% battery, the app enters **Deep Hibernation**, adjusting radio duty cycles while preserving critical SOS reception for up to **100+ standby hours**.
- Turn off unused background applications to conserve battery power for emergency communications.

---

## 6. 3-Phase Disaster Response SOP (Standard Operating Procedure)

### 🟢 Phase 1: Pre-Disaster Readiness
1. **Pre-install & Permissions:** Install OutGrid Mesh beforehand. Grant Bluetooth, Precise Location, and Battery Optimization Exemption permissions.
2. **Family & Group In-Person Pairing:** Scan in-person QR codes with family members and neighbors to exchange X25519 / Ed25519 E2EE keys in advance.
3. **Power Reserves:** Keep phones and external power banks fully charged.

### 🔴 Phase 2: Active Disaster & Cellular Blackout
1. **Immediate Launch:** Launch OutGrid Mesh as soon as public cellular/power infrastructure collapses.
2. **Critical Distress / Trapped:**
   - Press and hold the red **SOS button** for 1 second to broadcast the 21-byte sub-meter GPS/H3 packet across 15 hops.
   - If trapped in darkness or building rubble, activate **Acoustic Morse & Strobe Torch** to guide search teams.
3. **Safe Individuals:** Keep the app open in the background to serve as an autonomous **Relay Node** for neighbors.
4. **Offline Recipient Messaging (Spatial H3 Drop-box):** If messaging someone whose device is currently offline, the message is safely held in custody by neighbor nodes within the same spatial H3 hexagon. Once the recipient walks into range, the packet is automatically delivered via zero-click BLE.

### 🔵 Phase 3: Rescue Operations & Autonomous Mobility (Data Mule)
1. **Data Mules:** Rescue boats, ambulances, and moving responders ($\ge 15\text{ km/h}$) automatically ingest SOS packets from isolated pockets with Hop Freeze engaged.
2. **Cloud Re-anchoring (Auto-Flush):** Once vehicles reach internet coverage or command headquarters, all accumulated bundles auto-flush to the cloud coordinator in seconds.
