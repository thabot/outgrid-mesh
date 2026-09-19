# OutGrid Mesh Field Operations & Survival Guide (EN)
**Protocol:** Thabot OutGrid Protocol (TOG v1.1)  
**Author:** Thabot (<thabo47@gmail.com>)  
**License:** AGPL-3.0 Non-Profit Humanitarian Public Good

---

## 1. Disaster Emergency Quickstart
1. **Enable Bluetooth & Location:** OutGrid Mesh leverages Bluetooth Low Energy (BLE) to autonomously form an off-grid ad-hoc mesh without cellular towers or satellite link.
2. **One-Tap Red SOS Beacon:** In critical life-threatening situations, tap the central SOS button. Emergency beacons propagate across neighbor nodes using epidemic gossip routing.
3. **Offline APK Sharing (Emergency Sideload):** If people around you lack the app, activate the built-in HTTP Sideload server. Nearby devices can connect to your local Wi-Fi hotspot and download `OutGridMesh.apk` directly.

---

## 2. Delay-Tolerant Store-and-Forward (DTN)
- **Data Mules:** Your mobile device caches bundles and forwards them to passing users, ferrying critical alerts across long distances even when disconnected.
- **Privacy Assurance:** Public civilian feeds clamp precision to coarse H3 Res 7 (~1.2km) to prevent tracking and preserve survivor safety.

---

## 3. Acoustic & Optical Emergency Beacon
- If trapped in debris or dense fog, enable the **Acoustic Audio Morse Siren** and **Optical Strobe Torch** to sound the universal SOS pattern and guide first responders.
