# Thabot OutGrid Protocol (TOG v1.1) Wire Specification
### Global Emergency Cross-Radio Mesh Protocol Specification (Cross-Radio Mesh Wire Spec)

> **Copyright & Intellectual Property:**
> - **Protocol Name:** **Thabot OutGrid Protocol (TOG v1.1 Wire Specification)**
> - **Creator & Lead Architect:** **Thabot** (<thabo47@gmail.com>)
> - **License:** **GNU Affero General Public License v3.0 (AGPL-3.0) + Commercial Rights Reserved to Thabot**
> - **Supported Transports:** Bluetooth 5.0 LE Legacy (31B), BLE Coded PHY (S=8), Wi-Fi Direct P2P, Wi-Fi HaLow (802.11ah Sub-1GHz), LoRa ESP32 Companion Bridge

---

## 1. The 4 Core Packet Types Overview

| Packet Type Code | Packet Name | Over-the-Air Size | Transport Channel | Features & Security |
| :---: | :--- | :---: | :--- | :--- |
| `0x01` | **`SOS_BEACON`** | **21 – 25 Bytes** | BLE Coded S=8 / LoRa | Sub-meter precision (< 1m, H3 Res 9 + Delta GPS 4B), Ed25519 signature, 0ms display wake |
| `0x02` | **`DIRECT_CHAT`** | $\le 280$ characters | BLE Extended Adv (255B) | Dual-layer E2EE (X25519 ECDH + AES-256-GCM Overhead 28B), 8-digit Safety Numbers |
| `0x07` | **`PRESENCE_CHIRP`** | **27 Bytes** | BLE Legacy Adv (31B) / LoRa | Broadcasts 5 neighbors (H3 6 directions 3b + Fused Bat/RSSI 5b), Radio Type 1B, CRC-16 |
| `0x02` (Frag) | **`MEDIA_CHUNK`** | 180B Chunks | Wi-Fi Direct / HaLow / BLE | WebP Image 5–12KB / Opus Audio 2–3KB, Reed-Solomon FEC (8+4 Shards) 33.3% packet-loss recovery |

---

## 2. Presence & 5-Neighbor Packet Layout (`0x07: PRESENCE_CHIRP` - 27 Bytes)

> **Goal:** Report local node status and neighbor discovery list within the 31-byte ceiling of BLE Legacy Advertisement, equipped with industrial-grade check digits and cross-radio capability flags.

### 2.1 Bitfield Layout

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Type(5b)|Hop(3)|             Our Short NodeID (24 bits)        | (Bytes 0-3)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Our Bat/Stat(1B|             Our Target H3 Res 9 (32 bits)     | (Bytes 4-7)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| (Cont. H3 1B) | Radio Type(1B)| Neighbor 1 Short NodeID (16b) | (Bytes 8-11)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|N1 Fused(H3/B/R| Neighbor 2 Short NodeID (16b) |N2 Fused(H3/B/R| (Bytes 12-15)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Neighbor 3 Short NodeID (16b) |N3 Fused(H3/B/R| Neighbor 4 ...| (Bytes 16-19)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|... Short NodeID (16b)         |N4 Fused(H3/B/R| Neighbor 5 ...| (Bytes 20-23)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|... Short NodeID (16b)         |N5 Fused(H3/B/R|  CRC-16-CCITT | (Bytes 24-26)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| (Cont. CRC 1B)|  [ 4 Bytes Unallocated Radio Guard Headroom ]  | (End of 31B)
+-+-+-+-+-+-+-+-+-----------------------------------------------+
```

### 2.2 Byte Breakdown:

#### 1. Our Node Header (9 Bytes)
- **Byte 0: Type & Hop (8 bits)**
  - `Bit 0–4 (5 bits)`: Packet Type = `0x07` (`PRESENCE_CHIRP`)
  - `Bit 5–7 (3 bits)`: Hop Count (0–7 hops)
- **Byte 1–3: Our Short NodeID (24 bits / 3 Bytes)**
  - Node identifier with 16,777,216 distinct addresses (derived from Truncated SHA-256 of Ed25519 Public Key)
- **Byte 4: Our Battery & Charging (8 bits / 1 Byte)**
  - `Bit 0–2 (3 bits)`: Battery indicator (Levels 1–5 / 20% per tier)
  - `Bit 3 (1 bit)`: Charging Status (`1` = Charging)
  - `Bit 4–7 (4 bits)`: Reserved Status Flags
- **Byte 5–8: Our H3 Cell Index (32 bits / 4 Bytes)**
  - Hexagonal spatial index via Uber H3 Resolution 9 (~100–150 meters)

#### 2. Radio & Node Capabilities (1 Byte / Byte 9)
- `Bit 0`: **Stationary Node** (`1` = Fixed tower at evacuation center/rooftop, `0` = Mobile pedestrian)
- `Bit 1–2`: **Power Tier** (`00`=Normal, `01`=Critical battery <20%, `10`=Charging, `11`=Permanent grid/solar)
- `Bit 3`: **BLE Active** (`1` = Standard mobile Bluetooth operational 100–300 m)
- `Bit 4`: **LoRa Bridge Active** (`1` = LoRa repeater bridge operational 15–20 km)
- `Bit 5`: **Wi-Fi Standard Ready** (`1` = Wi-Fi Direct peer-to-peer distribution ready 50–100 m)
- `Bit 6`: **Wi-Fi HaLow Active (802.11ah)** (`1` = Sub-1GHz long-range image/audio transport 1–3 km)
- `Bit 7`: **Internet Gateway Active** (`1` = Upstream cellular 4G/5G/Satellite link active)

#### 3. 5 Best Neighbors List (15 Bytes / Bytes 10–24)
Each neighbor consumes exactly **3 Bytes** ($5 \times 3\text{B} = 15\text{ Bytes}$):
- **Byte 0–1 (16 bits)**: `Neighbor Short NodeID` (65,536 IDs in radio vicinity)
- **Byte 2 (8 bits / 1 Byte - Fused Field combining Battery + RSSI + Relative H3 Bearing)**:
  $$\mathbf{[}\ \underbrace{\text{H3 6 Bearings (3 bits)}}_{\text{Bit 0–2}}\ \mid\ \underbrace{\text{Battery 5 Levels (3 bits)}}_{\text{Bit 3–5}}\ \mid\ \underbrace{\text{RSSI Signal Quality (2 bits)}}_{\text{Bit 6–7}}\ \mathbf{]}$$
  - **H3 Relative Bearing (3 bits)**:
    - `0b000` (0): Same H3 cell as local node
    - `0b001` (1): North
    - `0b010` (2): North-East
    - `0b011` (3): South-East
    - `0b100` (4): South
    - `0b101` (5): South-West
    - `0b110` (6): North-West
  - **Battery 5 Levels (3 bits)**: Values `0b001` (1 tier) through `0b101` (5 tiers)
  - **RSSI 4 Levels (2 bits)**:
    - `0b11` (3): Excellent ($> -60\text{ dBm}$)
    - `0b10` (2): Good ($-60\text{ to }-75\text{ dBm}$)
    - `0b01` (1): Moderate ($-75\text{ to }-85\text{ dBm}$)
    - `0b00` (0): Weak ($< -85\text{ dBm}$)

#### 4. Check Digit (2 Bytes / Bytes 25–26)
- **CRC-16-CCITT (Polynomial `0x1021`, Initial `0xFFFF`)**:
  - Computed over Bytes 0 to 24, detecting over-the-air bit corruptions with **99.998%** accuracy

#### 5. Headroom (4 Bytes / Bytes 27–30)
- 4 unallocated bytes reserved as radio guard buffer aligned with Apple Find My standards to ensure maximum interoperability across all mobile chipsets.

---

## 3. Spatial Disambiguation Protocol (Local Node ID Conflict Resolution)

1. **Spatial Disambiguation Principle**:
   To retain BLE frame constraints within 31 bytes without bloating node identifiers to 32-bit/4B (+6B overhead), the protocol combines a 24-bit Short NodeID with the localized H3 cell index to formulate a **Unique Local Identity**:
   $$\text{Unique Local Identity} = \text{H3 Cell Index (4B)} + \text{Short NodeID (3B / 24-bit)}$$
2. **Zero Collision in Local Radio Space**:
   The probability of two devices sharing both the same 24-bit Short NodeID within the same H3 cell (radio coverage 300m - 5km) is negligible ($< 1$ in $10^{14}$). Nodes with identical 24-bit IDs in distinct geographical regions are immediately distinguished by their H3 Cell Index.
3. **Automatic Collision Resolution Procedure**:
   If two devices are detected with both identical H3 Cell Index and 24-bit Short NodeID within radio range:
   - *Secondary Key Suffix*: Append the last 2 bytes of the full 32B Ed25519 Public Key (e.g. `#9B1C-E4`).
   - *Silent NodeID Re-Roll*: The application transparently re-rolls a new 24-bit NodeID in the background and broadcasts the updated state, resolving routing ambiguities with 100% determinism.

---

## 4. Emergency SOS Beacon Packet Layout (`0x01: SOS_BEACON` - 21-25 Bytes)

> **Goal:** Ultra-compact footprint capable of penetrating 15–25 hops (3–5 km) reaching rescue centers in 2–5 seconds with sub-meter spatial precision (< 1m).

```text
[ Type/Hop 1B ] + [ Short NodeID 3B ] + [ Incident Category 1B ] + [ Battery 1B ] 
+ [ Target H3 Res 9 (4B) ] + [ H3 Delta Offset GPS (4B) ] + [ Ed25519 Sig 6-8B ] + [ CRC16 2B ]
```

### H3 Local Delta Offset (< 1 Meter Precision):
- Retrieve center coordinates of Target H3 Res 9 as reference origin `(Lat_0, Lng_0)`.
- Compute earth metric displacement in meters:
  - $\Delta X = (\text{Lng} - \text{Lng}_0) \times \cos(\text{Lat}_0) \times 111,320\text{ m}$
  - $\Delta Y = (\text{Lat} - \text{Lat}_0) \times 110,540\text{ m}$
- Pack into `int16` (2B X + 2B Y = 4 Bytes) where 1 unit = 10 centimeters.
- **Outcome:** Pinpoint accuracy capable of identifying individual dwelling roofs (< 1 meter) in only 4 bytes.

---

## 5. Direct P2P Chat Packet Layout (`0x02: DIRECT_CHAT` - Extended BLE 255B)

> **Goal:** Multi-hop relayable across intermediate nodes while strictly confidential to the intended recipient.

```text
[ Header 5B ] + [ MessageID 8B ] + [ Sender Hash 8B ] + [ Recipient Hash 8B ]
+ [ Target H3 Res 9 8B ] + [ Payload Length 2B ]
+ [ Ciphertext Payload: IV 12B + Encrypted Content (≤ 280 chars) + Tag 16B ] + [ CRC16 2B ]
```

- **E2EE Cipher Suite:** ECDH (Curve25519) + HKDF-SHA256 + AES-256-GCM
- **Security Overhead:** Fixed at exactly **28 Bytes** (`IV 12B + Tag 16B`)

---

## 6. File Chunking, Fragmentation & Out-of-Order Reassembly Specification (`MEDIA_CHUNK`)

> **Goal:** Standardize large payload and file partitioning (WebP images, Opus audio memos, emergency map tiles, and disaster recovery documents) into MTU-safe chunks, providing robust out-of-order reassembly and Reed-Solomon Forward Error Correction (FEC).

### 6.1 Wire Chunk Header Format

Each sliced file fragment is framed with an **8-Byte Chunk Header (Standard Mode)** or **12-Byte Chunk Header (Full ID Mode)**:

#### Standard Chunk Header Structure (8 Bytes Header):
```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 Truncated Message/File ID (32 bits / 4B)      | (Bytes 0-3)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    Total Chunks (16 bits / 2B) | Sequence Index (16 bits / 2B) | (Bytes 4-7)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                  Chunk Data Payload (Variable ≤ 180B)         | (Bytes 8...)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

1. **Truncated Message/File ID (4 Bytes / uint32):**
   - Computed as `MessageID & 0xFFFFFFFF` or Truncated Hash to correlate chunks belonging to the same payload session.
2. **Total Chunks (2 Bytes / uint16, 0–65,535):**
   - Total number of expected chunks for this payload.
3. **Sequence Index (2 Bytes / uint16, 0-indexed):**
   - Sequence index of the current chunk (ranging from `0` to `Total Chunks - 1`).
4. **Chunk Data Payload:**
   - Raw binary slice data.

---

### 6.2 Dual-Mode Slicing Strategy

The protocol supports dual-mode slicing tailored to different wireless radio capabilities:

| Transport Mode | Max Payload per Chunk | Total Chunk Size (Inc. 8B Header) | Target Radio Transport |
| :--- | :---: | :---: | :--- |
| **Extended Chunk Mode** | **$\le 180$ Bytes** | **$188$ Bytes** | BLE 5 Extended Adv (255B), Wi-Fi Direct, Wi-Fi HaLow |
| **Legacy Chunk Mode** | **$\le 24$ Bytes** | **$32$ Bytes** (BLE Adv Data + Service Header) | Bluetooth 4.2 Legacy Advertisement (31B limit) |

- **Chunk Count Calculation:**
  $$\text{Total Chunks} = \left\lceil \frac{\text{Payload Length}}{\text{Chunk Size}} \right\rceil$$

---

### 6.3 Out-of-Order Reassembly & RAM Lifecycle Management

```mermaid
flowchart TD
    InChunk["📥 Receive Chunk [Seq: N]"] --> CheckDuplicate{"Check Bitmask<br>(Is Bit N set?)"}
    CheckDuplicate -- "Yes (Duplicate)" --> Discard["🗑️ Discard Immediately (O(1) Drop)"]
    CheckDuplicate -- "No (New Chunk)" --> SaveChunk["💾 Store Chunk in RAM Map<br>and Set Bit N in Bitmask"]
    SaveChunk --> CheckComplete{"All Chunks Received?<br>(Received == Total)"}
    CheckComplete -- "Not Yet" --> WaitNext["⏳ Await Next Chunk<br>(Timeout 15–30s)"]
    CheckComplete -- "100% Complete" --> Assemble["🧩 Sort Seq 0..Total-1<br>Assemble Original File"]
    Assemble --> ReleaseRAM["🧹 Flush Buffer from RAM<br>Dispatch to Application"]
```

1. **Bitmask Tracking Checklist (`Uint32Array`):**
   - Receiver maintains a compact bit array to verify arrival and discard duplicate chunks in $O(1)$ time.
   - Fully supports out-of-order chunk arrivals across heterogeneous multi-hop mesh routes.
2. **Session Eviction & Buffer Timeout:**
   - Text/Short Chat Chunks: Evicted after **30 seconds** of inactivity.
   - Large Media Files (Images/Audio): Buffer retained for up to **15 minutes** to accommodate intermittent Data Mule transfers.

---

### 6.4 Forward Error Correction (Reed-Solomon 8+4 Shards)

- **Source File Compression:**
  - Damage Assessment Photos: WebP (320x240) resulting in **5–12 KB**.
  - Emergency Voice Memos:考 Opus Narrowband (6kbps) resulting in **2–3 KB** (15-second duration).
- **Erasure Coding Parity:**
  - Partitioned into $K = 8$ Data Shards and generating $M = 4$ Parity Shards (Total 12 Shards).
  - Receiving **any 8 of the 12 shards (tolerating up to 33.3% packet loss)** guarantees immediate 100% original file reconstruction with **Zero-Retransmit Recovery**.

---

### 6.5 Selective NACK Retransmission Protocol

- If wireless packet loss exceeds FEC recovery capacity ($> 4$ Shards), the receiver transmits a **`0x06: DELIVERY_NACK`** packet rather than requesting the entire file again.
- **NACK Wire Payload Structure:**
  `[ MessageID 4B ] + [ Total Chunks 2B ] + [ Missing Chunks Bitmask N Bytes ]`
- The sender retransmits **only the missing shards flagged in the Bitmask**, reducing mesh channel congestion and battery drain by up to 85%.

---

## 7. Cross-Radio Bridge Specification (BLE ↔ LoRa Forwarding)

> **Goal:** Standardize packet forwarding and signal repetition between local short-range mobile radios (BLE 2.4GHz) and long-range community radios (LoRa AS923 920–925 MHz) via standalone microcontroller bridges (ESP32 + SX1262 LoRa) or emergency response field units.

```mermaid
flowchart LR
    subgraph LocalArea["1. Local Mobile BLE Mesh"]
        PhoneA["📱 Victim Device A<br>(BLE 2.4GHz only)"] 
        PhoneB["📱 Citizen Device B<br>(BLE 2.4GHz only)"]
    end

    subgraph BridgeDevice["2. Autonomous LoRa Bridge"]
        ESP32["📻 ESP32 Dual-Radio Bridge<br>• BLE Central/Observer (Scan Window 80%)<br>• LoRa SX1262 Transceiver<br>• Zero-Payload Mutation & LRU Deduplication"]
    end

    subgraph LongRangeBackbone["3. LoRa Long-Range Backbone"]
        TowerNode["🗼 Hilltop / High Ground Repeater<br>(LoRa AS923 920-925MHz)"]
        RescueCenter["🚒 Rescue HQ / Starlink Gateway<br>(Internet Outlink)"]
    end

    PhoneA -->|BLE Legacy Adv 21B/27B| PhoneB
    PhoneB -->|BLE Legacy Adv| ESP32
    ESP32 -->|LoRa Long-Range TX 15-35 km| TowerNode
    TowerNode -->|LoRa Relay| RescueCenter
```

### 7.1 Cross-Radio Invariants

1. **Zero-Payload Mutation:**
   - The LoRa Bridge acts as a **Transparent L2/L3 Frame Forwarder**.
   - The bridge **must never modify** H3 coordinates, Delta GPS Offset, Battery status, or Ed25519 signature fields generated by the originating device.
   - The **original CRC-16-CCITT** calculated by the originating device must be preserved identically (100%) so that rescue endpoints can verify payload authenticity without trusting intermediate relay nodes.

2. **Strict Loop & Duplicate Protection:**
   - Every bridge node must maintain an active **Packet Deduplication Cache (LRU 64 entries)**.
   - **Cache Key:** `SHA-256(Packet Type + Short NodeID + First 4B of Payload)[0..7]`
   - If an incoming packet matches a Cache Key processed within the last **60 seconds**, it must be **dropped immediately (100%)** to prevent packet storms and channel congestion.

3. **Hop Limit (TTL) Management:**
   - For packets containing a Hop Count field (Bits 5–7 of Byte 0):
     - When receiving via BLE and relaying via LoRa, decrement Hop Count by 1 (or increment Relay Counter according to packet type specification).
     - If Hop Count reaches its exhaustion limit, relaying must cease immediately.

4. **Listen-Before-Talk & CAD (Channel Activity Detection):**
   - Prior to RF transmission, the SX1262 transceiver must perform **LoRa CAD (Channel Activity Detection)** for $\le 5\text{ms}$.
   - If channel activity is detected, apply a Random Exponential Backoff (50–200ms) before re-attempting transmission to avoid airtime collisions.

---

### 7.2 Physical RF Profile (LoRa Radio Parameters)

To ensure interoperability across all hardware platforms (Heltec, TTGO T-Beam, Seeed Studio, or custom bridge hardware), follow these parameters:

| Parameter | Standard Value | Engineering Rationale |
| :--- | :--- | :--- |
| **Radio Frequency** | **`923.200 MHz`** (LoRa AS923 TH Band) | Compliant with NBTC regulatory requirements for Thailand and ASEAN region |
| **Bandwidth** | **`125 kHz`** | Optimal balance between receiver sensitivity and link range |
| **Spreading Factor (SF)** | **`SF9`** (Standard data) / **`SF11`** (Emergency SOS) | SF11 penetrates dense foliage and mountainous topography up to 20+ km |
| **Coding Rate (CR)** | **`4/5`** | Robust forward error correction against ambient RF noise |
| **Transmit Power (TX)** | **`+14 to +20 dBm`** (25–100 mW) | Energy-efficient for 18650 battery cells operating continuously on solar |
| **Preamble Length** | **`8 Symbols`** | Rapid carrier detection with minimized on-air transmission time |

---

### 7.3 Traffic Prioritization for LoRa Uplink

Due to limited LoRa channel bandwidth (effective throughput 1–5 kbps), strict traffic shaping must be enforced:

1. 🚨 **High Priority (100% Unrestricted): `0x01 SOS_BEACON` (21–25 Bytes)**
   - Preempts all ongoing scan cycles and transmits immediately (Zero-Queue Preemption).
2. 📡 **Normal Priority (Rate Limited): `0x07 PRESENCE_CHIRP` (27 Bytes)**
   - Only relayed by **Stationary or Supernodes**, capped at a maximum rate of **1 transmission per 60 seconds per H3 cell**.
3. 🔒 **Low Priority (Compressed Text Only): `0x02 DIRECT_CHAT`**
   - Restricted to short text messages with payload size $\le 60$ bytes.
4. 🚫 **Forbidden (Strictly Prohibited on LoRa): `MEDIA_CHUNK` (WebP Image / Opus Audio)**
   - Media chunks must never be broadcast over LoRa channels to prevent backbone saturation. They must be transmitted exclusively via **Wi-Fi Direct P2P or Mobile Rescue Data Mules**.

---

## 8. Ultra-Compact Single-Packet Messaging & Bluetooth Optimization

> **Goal:** Fit emergency status and short messages into **1 Single BLE Packet ($\le 31$ Bytes)** without fragmentation (Zero-Fragmentation Delivery) to reduce on-air transmission time (Air Time on BLE Coded S=8), eliminate fragment loss 100%, and maximize battery conservation.

### 8.1 Packet Optimization Matrix

| Data / Packet Type | Standard Size | Ultra-Compact Size | Optimization Technique | Single Packet Delivery |
| :--- | :---: | :---: | :--- | :---: |
| **Canned Emergency Status** | 28–45B | **10 Bytes** | 1-Byte Status Code + 9B Header (Zero Fragment Loss 100%) | ✅ 1 Packet (17B Headroom) |
| **SOS Beacon** | 21–25B | **11–13 Bytes** | Local H3 Index (32b) + Quantized GPS Delta (1m / 2B) | ✅ 1 Packet (14B Headroom) |
| **Presence Chirp** | 27B (Fixed) | **15–21 Bytes** | Dynamic Neighbor Packing (Trims empty slots in sparse areas) | ✅ 1 Packet (6–12B Headroom) |
| **Short Free-form ASCII** | 28B | **18–22 Bytes** | Minimal Header 9B + Base40/GSM 7-bit (16–21 chars) | ✅ 1 Packet |
| **Short Thai Text** | 35–50B | **22–26 Bytes** | Minimal Header 9B + Thai 7-bit Indexing (12–16 chars) | ✅ 1 Packet |

### 8.2 Single-Packet Bitfield Layouts

#### 1. Canned Emergency Status (10 Bytes):
```text
[ Type/Hop 1B ] + [ Sender ShortID 2B ] + [ Recipient ShortID 2B ] + [ Msg Seq 2B ] 
+ [ Emergency StatusCode 1B ] + [ CRC-16 2B ]  ==> Total 10 Bytes in 1 Packet
```
- **Emergency StatusCode (1-Byte Enum):**
  - `0x01`: *Safe & Secure*
  - `0x02`: *Trapped in Building / Need Extraction*
  - `0x03`: *Need Medical Aid / Severe Injury*
  - `0x04`: *Need Food & Drinking Water*
  - `0x05`: *Rising Water Level / Flood Danger*
  - `0x06`: *Fire / Hazardous Gas Detected*

#### 2. Short Free-form Message in 1 Single Packet ($\le 27$ Bytes):
```text
[ Header 9B ] + [ Text Payload 14–18B (ASCII / Base40 / Thai 7-bit) ] + [ CRC-16 2B ]
```
- **System Benefits:**
  - Zero Reassembly Delay: Instant 0ms display wake on recipient devices
  - 40–50% reduction in Air Time on BLE Coded PHY (S=8)
  - Collision Shield: Drastically lowers RF collision probability in congested disaster zones

---

*This document constitutes the formal wire specification for Thabot OutGrid Protocol v1.1. Commercial rights reserved.*
