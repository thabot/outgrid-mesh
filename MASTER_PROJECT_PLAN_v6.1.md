# แผนงานโครงการฉบับสมบูรณ์ (Master Project Plan v6.1)
### Disaster-Resilient & Production-Ready Edition: OutGrid Mesh


┌──► [ 1-on-1 Unicast ] ──────► E2EE (ECDH + AES-GCM) + Edge Relay
[ Multi-Mode Messaging ] ─────────┼──► [ Group Chat ] ──────────► Shared Group Key + Targeted Flood
                                  └──► [ Local Broadcast / SOS ] ──► Compact Binary (Protobuf/CBOR) + Epidemic Gossip

                                  ┌──► [ Normal Mesh Mode ] ────► Multi-Transport (Internet Server + Local P2P)
[ Network & Disaster Engine ] ────┼──► [ Server Timeout / Down ] ──► Standalone Local Mesh (Timeout 5s Auto-fallback)
                                  └──► [ Disaster Emergency Mode ]► Emergency SOS + Physical Store-Carry-Forward

                                  ┌──► [ Normal Duty Cycling ] ─► สแกนสลับหลับ (สแกน 5s / นอน 55s)
[ Power & Storage Management ] ───┼──► [ Disaster Power Policy ] ─► Max Power Saving (BLE-first / Wi-Fi on Demand)
                                  └──► [ Battery-Aware Bridge ] ──► ถือไฟล์เมื่อแบต > 50% หรือชาร์จอยู่ (แบต < 20% = Receiver Only)

                                  ┌──► [ Wi-Fi Hotspot + QR ] ──► สแกน QR แล้วโหลดตรงผ่านเบราว์เซอร์ทันที (No App Required)
[ Offline App Sideloading ] ──────┼──► [ Wi-Fi Direct P2P ] ────► ส่งต่อ APK ข้ามเครื่องแบบความเร็วสูง
                                  └──► [ Anti-Tampering Check ] ─► ตรวจสอบ SHA-256 Checksum ป้องกัน APK ปลอม

                                  ┌──► [ Physical Data Mule ] ──► ฝากส่งผ่านคน/รถกู้ภัยข้ามพื้นที่สีแดง (Zero-click Delivery)
[ DTN Offline Delivery Engine ] ──┼──► [ Spatial H3 Drop-box ] ─► ฝากไว้ที่โทรศัพท์เพื่อนบ้านในหกเหลี่ยม H3 เดียวกัน
                                  └──► [ Reverse Delivery ACK ] ─► ส่งใบเสร็จยืนยันกลับเข้า Mesh + สั่ง Auto-Prune คืนเมม

                                  ┌──► [ In-Person QR Scan ] ───► สแกน QR แอดเพื่อน/ครอบครัวแบบเห็นหน้า ป้องกัน MITM 100%
[ QR Peer Pairing & Identity ] ───┼──► [ Dual-Key Exchange ] ──► แลกเปลี่ยน X25519 (E2EE) + Ed25519 (ลายเซ็นดิจิทัล)
                                  └──► [ Trusted Contacts ] ────► บันทึกลงสมุดผู้ติดต่อพร้อมตราสัญลักษณ์ Verified ออฟไลน์

---



## 1. การวิเคราะห์คู่แข่งในตลาด (Competitive Analysis & Benchmarking)

### 1.1 คู่แข่งหลัก 4 กลุ่ม
1. **Bridgefy (Commercial Mobile Mesh):** แอปพลิเคชันส่งข้อความออฟไลน์ผ่าน Bluetooth ยอดนิยมในสภาวะภัยพิบัติและการชุมนุม แต่เป็น Closed-source และกินแบตเตอรี่สูง
2. **Briar (Anti-Censorship & Disaster Mesh):** โอเพนซอร์สเน้นความปลอดภัยสูง ทำงานแบบกระจายศูนย์ผ่าน Tor, Wi-Fi Direct และ Bluetooth แต่ไม่มีระบบส่งพิกัดฉุกเฉินเฉพาะทางและยังกินทรัพยากรสูง
3. **Meshtastic (LoRa Off-Grid Mesh):** เครือข่าย Mesh ยอดนิยมในกลุ่มกู้ภัย ทำงานระยะไกลได้ดีและกินไฟต่ำมาก แต่มีข้อจำกัดเรื่อง Barrier to Entry สูง เพราะต้องซื้อบอร์ด LoRa ภายนอกมาต่อเพิ่ม
4. **Serval Mesh / Disaster Radio (Legacy / Research):** โครงการวิจัยระบบเครือข่ายบรรเทาสาธารณภัย เน้น Wi-Fi Ad-hoc แต่ขาดความต่อเนื่องในการพัฒนาบน Mobile OS สมัยใหม่

### 1.2 ตารางเปรียบเทียบฟีเจอร์เชิงลึก (Deep Feature Comparison Matrix)

| ฟีเจอร์ / มิติการประเมิน | **OutGrid Mesh (Plan v6.1)** | **Bridgefy (Commercial)** | **Briar (Anti-Censorship)** | **Meshtastic (LoRa Mesh)** |
| :--- | :---: | :---: | :---: | :---: |
| **1. อุปกรณ์ที่รองรับ (Barrier to Entry)** | **สมาร์ตโฟนทั่วไป 100%** (Capacitor/Android) | สมาร์ตโฟนทั่วไป (iOS/Android) | สมาร์ตโฟนทั่วไป (Android) | **ต้องซื้ออุปกรณ์ LoRa เพิ่ม** ($25-$50) |
| **2. ความกระชับของโปรโตคอล (Wire Efficiency)** | **สูงสุด: TOG v1.1 Header 5B** (SOS 21B, ACK 10B ใน 1 Beacon) | ปานกลาง (Overhead สูง, ใช้ GATT/JSON ขนาดใหญ่) | ต่ำ (Bramble Protocol มี Handshake ค่อนข้างหนา) | ดีมาก (Custom Binary LoRa Packet) |
| **3. การกู้คืน Packet Loss ในพื้นที่วิกฤต** | **ดีที่สุด: Erasure Coding (+30% Parity)** ได้ 10 ใน 13 ประกอบคืนได้ทันที | ไม่มี (ใช้ Link-layer ACK ถ้าหลุดคือหาย) | ใช้ TCP/Link Retransmit (เปลืองแบตเตอรี่) | Retransmission Flood (ถ้าชนกันแพ็กเก็ตหายทันที) |
| **4. การปรับ Hop ตามความหนาแน่น (Adaptive Hop)** | **มี (Density Engine):** เมืองหนาแน่น 3-7 ทอด / ชนบท 12-15 ทอด | ค่าคงที่ (เสี่ยง Broadcast Storm ในเมือง) | เน้น Sync แบบ P2P ตรง ไม่ได้ปรับตาม Density | ค่าคงที่ (Default 3-5 Hops) |
| **5. การระบุตำแหน่งและจัดเส้นทางแบบออฟไลน์** | **3-Level H3 Routing** (Res 9/7/5) + Zoom-out Fallback | ไม่มี (ระบุแค่ Peer ID ไม่รู้พิกัดภูมิศาสตร์) | ไม่มี (จงใจซ่อนพิกัดเพื่อความปลอดภัย) | มี (แชร์ Lat/Long ดิบ ไม่มี Hierarchical H3) |
| **6. ส่งข้อความข้ามพื้นที่/ข้ามจังหวัด (DTN)** | **Autonomous Mobility Detection** ($\ge 15-20$ km/h) + Zero-click 4B | มี (Store & Forward พื้นฐาน ไม่ตรวจจับความเร็ว) | มี (ผ่าน Flash Drive หรือคนที่เดินผ่าน) | มี (Router Node ทำ Store & Forward เฉพาะจุด) |
| **7. การยืนยันการส่งถึง & แจ้งเตือนเมื่อไม่ถึง** | **Reverse Signed ACK (🟢) + Reverse NACK (⚠️)** + Auto-Prune | มี (ACK ภายใน Mesh แต่ไม่มี NACK แจ้งเตือน) | มี (Delivery Status แต่ซิงค์ช้า) | มี (ACK จำกัดในวง Mesh ไม่ส่งข้ามโซน) |
| **8. การควบคุมพื้นที่จัดเก็บ (Storage Quota)** | **Tiered Expiry (SOS 72h / Chat 24h)** + เพดาน 50 MB FIFO | จัดการตาม OS Cache ไม่มี Quota ตามความสำคัญ | เก็บสะสมเรื่อยๆ ไม่มี Auto-Prune เชิงรุก | บอร์ดมี Flash จำกัด (เก็บข้อความได้น้อยมาก) |
| **9. สลับโหมดอัตโนมัติเมื่อเน็ตล่ม (Auto-fallback)** | **มี (Timeout 5s Auto-fallback เข้า Standalone Mesh)** | ไม่มี (ผู้ใช้ต้องสังเกตและเปิดโหมดเอง) | มี (สลับ Tor / Local อัตโนมัติ) | ไม่มี (ทำงานแบบ LoRa ออฟไลน์ 100% ตั้งแต่แรก) |
| **10. สื่อมีเดียที่รองรับ (Supported Media)** | **Hybrid:** Text (BLE), Voice Memo (Opus 15-30KB), รูป 3 ระดับ (5-15KB WebP) | ส่งรูปได้ช้ามาก (ผ่าน BLE Bluetooth ช้าและหลุดง่าย) | ส่งรูปภาพได้ (ผ่าน Wi-Fi) | **ส่งได้เฉพาะ Text สั้นเท่านั้น** (Bandwidth LoRa ไม่พอ) |
| **11. การแจกแอปออฟไลน์ (Offline Sideloading)** | **One-Tap Wi-Fi QR Sideload** (โหลดตรงผ่านเบราว์เซอร์ ไม่ต้องมีแอป) | ไม่มี (ต้องโหลดจาก App Store ล่วงหน้า) | มี (แชร์ไฟล์ APK ผ่าน Bluetooth ช้ามาก) | ไม่มี (เป็น Firmware แฟลชผ่านสาย USB) |
| **12. ช่องทางรับแจ้งเตือนจากภายนอก (Ingestion API)**| **มี (REST Webhook / CAP Protocol / ESP32 Gateway)** | ไม่มี (แอปปิด ไม่มี Open API) | ไม่มี (ระบบปิดมุ่งเน้นความเป็นส่วนตัวสูง) | มี (เชื่อมต่อผ่าน Serial / MQTT Gateway) |
| **13. แผนที่ความหนาแน่นประชาชน (Public Heatmap)** | **Privacy-Preserving H3 Res 7 Heatmap** (K-Anonymity $\ge 3$) | ไม่มี | ไม่มี | มี (MeshMap แต่ระบุพิกัดชัดเจน เสี่ยง Privacy) |
| **14. ความปลอดภัยและความเป็นส่วนตัว (Security)** | **E2EE (ECDH+AES-GCM) + Ed25519 Signature + QR In-Person Pairing** | E2EE (แต่ Proprietary Code ปิด) | E2EE สมบูรณ์แบบ (Audited) | E2EE (PSK / Pre-shared Channel Key) |
| **15. สิทธิ์ทางกฎหมายและโมเดลธุรกิจ (Business Model)** | **AGPL v3.0 + Dual-Licensing (Lead: Thabot)** ขาย Commercial ได้ | Closed-source (ผูกขาด) | โอเพนซอร์ส (GPLv3) ไม่มีโมเดลธุรกิจชัดเจน | โอเพนซอร์ส (GPLv3) ทำกำไรจากการขายบอร์ด |

### 1.3 จุดเด่นเชิงยุทธศาสตร์ที่ OutGrid Mesh เหนือกว่าคู่แข่ง (Strategic Competitive Advantages)
1. **เหนือกว่า Bridgefy ด้านประสิทธิภาพ ความโปร่งใส และการประหยัดพลังงาน:**
   - Bridgefy กินพลังงานสูงมากและเป็นระบบปิด ไม่สามารถตรวจสอบความปลอดภัยได้ ขณะที่ OutGrid Mesh มีระบบ Battery-Aware Duty Cycling (3 ระดับ) และใช้ Open Cryptography มาตรฐานโลก
2. **เหนือกว่า Meshtastic ด้านความพร้อมใช้งานของประชาชนทั่วไป (Zero Hardware Barrier):**
   - ในสถานการณ์ภัยพิบัติ ประชาชน 99.9% ไม่มีบอร์ด LoRa พกติดตัว แต่ทุกคนมีสมาร์ตโฟน OutGrid Mesh สามารถเปลี่ยนสมาร์ตโฟนทุกเครื่องให้เป็นโหนดกู้ภัยได้ทันทีโดยไม่ต้องซื้ออุปกรณ์เพิ่มแม้แต่บาทเดียว
3. **เหนือกว่า Briar ด้านความเร็วในการกู้ภัยและความกระชับของข้อมูล (Disaster Optimization):**
   - Briar ออกแบบมาสำหรับนักกิจกรรมหลบเลี่ยงการดักฟัง ทำให้กระบวนการ Handshake มีขนาดใหญ่และช้า ในขณะที่ OutGrid Mesh ออกแบบมาเพื่อ "ช่วยชีวิต" จึงใช้ Thabot OutGrid Protocol (TOG v1.1) ขนาดเพียง 21 ไบต์ ยิงสัญญาณ SOS ขึ้นแผนที่ได้ในเสี้ยววินาที พร้อมระบบกระจายไฟล์ APK ออฟไลน์ผ่าน Wi-Fi QR Code ที่โหลดได้ผ่านเบราว์เซอร์ทันที

### 1.4 สิ่งที่ระบบรองรับการรับ-ส่ง (Supported Payloads & Transports Matrix)
ระบบถูกออกแบบด้วยนโยบาย Hybrid Transport เลือกช่องทางส่งตามขนาดข้อมูลและระดับแบตเตอรี่อัตโนมัติ:

| หมวดหมู่ข้อมูล | ข้อมูลที่สามารถส่งได้ (Supported Payloads) | ขนาดข้อมูล / ความยาว | ช่องทางการส่ง (Transport) | สภาพแวดล้อมการทำงาน |
| :--- | :--- | :---: | :---: | :--- |
| **1. Emergency & SOS** | **One-Tap SOS Beacon:** พิกัด GPS (Lat/Lng), H3 Index, ระดับแบตเตอรี่, สถานะผู้ประสบภัย (เด็ก/คนแก่/ผู้ป่วย/ขาดออกซิเจน) | $\le 28$ bytes (Single Packet) | **Bluetooth 5 Long Range (LE Coded PHY)**<br>*(Fallback: BLE 1M Legacy)* | ส่งทันทีไร้การจับคู่ รัศมีทะลุทะลวง **200–400+ เมตร** (ที่โล่งแตะ 500 ม.) กินไฟต่ำสุด เซ็นกำกับด้วย Ed25519 กันปลอม |
| **2. Text & Chat** | **1-on-1 Private Messages (E2EE):** แชตส่วนบุคคลเข้ารหัส AES-256-GCM สองชั้น โหนดตัวกลางอ่านไม่ได้ (Security Overhead เพียง +28 bytes: IV 12B + Tag 16B) | **แนะนำ 140–300 ตัวอักษร** (สูงสุดไม่เกิน 1,000 ตัวอักษร / < 1 KB) | **Bluetooth 5 Long Range (LE Coded PHY)**<br>+ Extended Adv & Epidemic Gossip | ส่งข้อความแชตตัวหนังสือข้ามตึก/ซอกซอยระยะไกล **200–400 เมตร/ทอด** รวดเร็วในเสี้ยววินาที ไร้เน็ต 100% |
| **3. Group Chat** | **กลุ่มผู้ประสบภัย / กลุ่มกู้ภัยเฉพาะจุด:** ถอดรหัสด้วย Shared Group Key (32B) ติดหัวซองด้วย `TopicID` (4B) | **100–200 ตัวอักษร** (สูงสุดไม่เกิน 500 ตัวอักษร) | **BT 5 Long Range / Targeted Flood** | กระจายข้อความกลุ่มครอบคลุมกว้างขวาง รัศมีระดับหมู่บ้าน/ตำบล |
| **4. Broadcast / Crisis** | **Offline Crisis Feed:** ประกาศเตือนภัย, ข่าวสารอพยพ พร้อมลายเซ็นดิจิทัล Ed25519 ป้องกันข่าวปลอม | < 500 bytes | **BT 5 Long Range Epidemic Broadcast** | กระจายข่าวสารรอบทิศทางในรัศมี 200–400 เมตร ทุกโหนดรับรู้พร้อมกัน |
| **5. Voice Messages** | **คลิปเสียงสั้น (Push-to-Talk Voice Memo):** บันทึกเสียงแจ้งเหตุด้วย Opus Codec (Voice Mono 6–12 kbps) สำหรับผู้บาดเจ็บ/สูงอายุ | **ความยาว 10–15 วินาที** (~15 KB – 30 KB) | **Wi-Fi Direct หรือ BLE Chunks** | ส่งผ่าน Wi-Fi หรือซอยส่งผ่าน BLE ได้ใน 10–30 วินาที |
| **6. Image Compression** | **ภาพถ่ายความเสียหาย (3-Tier Adaptive Image Engine):**<br>- 🔴 **Ultra-Low Emergency:** 320x240 WebP (Grayscale/Color)<br>- 🟡 **Standard Disaster:** 640x480 WebP (Color)<br>- 🟢 **High Detail (เน็ต/แบตเต็ม):** 1280x720 WebP | <br>**5 KB – 15 KB**<br>**20 KB – 40 KB**<br>100 KB – 200 KB | <br>**BLE Mesh ส่งได้ทันทีใน 1-2s!**<br>**Wi-Fi Direct P2P (1s)**<br>Wi-Fi / Cloud Sync | บีบอัดในเครื่องลด 99% เห็นรอยแตก/สะพานขาดชัดเจน<br>*(🚫 วิดีโอปิดกั้นในโหมดออฟไลน์เพื่อรักษาแบตเตอรี่)* |
| **7. App Sideloading** | **ตัวติดตั้งแอปเต็ม (`OutGridMesh.apk`):** ส่งต่อแอปให้เครื่องข้างเคียงผ่าน Web Browser โดยตรง | 15 - 30 MB | **Local Wi-Fi Hotspot + QR Code** | อีกเครื่องใช้แค่กล้องสแกน QR โหลดผ่าน Chrome ได้เลย |
| **8. Physical Signals** | **Acoustic Siren & Flash Strobe:** เสียงไซเรนความถี่สูง/อัลตราโซนิก (ใต้ซากตึก) + แฟลช LED SOS | - | **Phone Speaker & Camera LED** | ใช้ค้นหาด้วยเสียงและสายตาในความมืด |

---

## 2. ภาพรวมสถาปัตยกรรมระบบ (System Architecture Overview)


```
┌────────────────────────────────────────────────────────────────────────┐
│                        OutGrid Mesh Client Architecture                │
│                                                                        │

│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     UI / Presentation Layer                    │   │
│   │  [One-Tap SOS]  [Offline Crisis Feed]  [Diagnostics Dashboard] │   │
│   │  [1-on-1 Chat]  [Group Chat]           [Offline Map & H3 Tile] │   │
│   │  [One-Tap QR Offline APK Share Modal]                          │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │                     Application State Engine                   │   │
│   │  - Mode State Machine (Cloud Online / Local Mesh / Disaster)   │   │
│   │  - Heartbeat & Auto-Fallback Monitor (5s Timeout)             │   │
│   │  - Battery-Aware Duty Cycle Policy Manager                     │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │                  Security & Compression Layer                  │   │
│   │  - E2EE Engine (ECDH Key Exchange + AES-256-GCM)              │   │
│   │  - Ed25519 Digital Signature (SOS Authenticity & Anti-Spoof)   │   │
│   │  - Compact Binary Serializer (CBOR / Protobuf ≤ 28 bytes)      │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │                     Data & Forwarding Layer                    │   │
│   │  - Epidemic Gossip & Targeted Flood Router                     │   │
│   │  - Counting Bloom Filter & LRU Cache (Duplicate Storm Guard)   │   │
│   │  - SQLite Store-Carry-Forward & Deferred Sync Queue            │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │                      Hybrid Transport Layer                    │   │
│   │     ┌───────────────────────┬────────────────────────────┐     │   │
│   │     │      BLE Plugin       │   Wi-Fi Direct / Nearby    │     │   │
│   │     │ (Text, SOS, GPS, Ping)│   (Images / Large Media)   │     │   │
│   │     ├───────────────────────┴────────────────────────────┤     │   │
│   │     │  Local Hotspot + Embedded HTTP Server (APK Share)  │     │   │
│   │     └────────────────────────────────────────────────────┘     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---



### 2.1 ข้อกำหนดโครงสร้างโพรโทคอล Thabot OutGrid Protocol (TOG) (TOG v1.1 Wire Specification)
> **ลิขสิทธิ์และสิทธิ์ทางปัญญา (Copyright & Authorship):**
> - **ชื่อโพรโทคอล:** **Thabot OutGrid Protocol (TOG v1.1)**
> - **ผู้คิดค้นและสถาปนิกหลัก (Creator & Lead Architect):** **Thabot** (<thabo47@gmail.com>)
> - **อีเมลติดต่อเจ้าของลิขสิทธิ์ (Official Contact):** `thabo47@gmail.com`
> - **สัญญาอนุญาต (License):** **GNU Affero General Public License v3.0 (AGPL-3.0) + Commercial Rights Reserved to Thabot**
> - **ข้อกำหนดลิขสิทธิ์:** สงวนสิทธิ์ความเป็นเจ้าของโพรโทคอลโดย **Thabot** อนุญาตให้ใช้งานได้ฟรี 100% สำหรับสาธารณกุศลและงานกู้ภัยมนุษยธรรม แต่ห้ามบริษัทเอกชนนำไปหาผลประโยชน์เชิงพาณิชย์เว้นแต่จะได้รับอนุญาตเป็นลายลักษณ์อักษรจาก Thabot (ติดต่อขอสิทธิ์เชิงพาณิชย์ได้ที่ `thabo47@gmail.com`)

เพื่อให้การรับส่งข้อมูลผ่านคลื่นความถี่ต่ำ (BLE Long Range & Wi-Fi Direct) มีประสิทธิภาพสูงสุด บีบอัดไบต์แน่นหนา และประมวลผลได้รวดเร็วระดับ Microsecond จึงกำหนดสเปกโครงสร้างระดับบิต (Bitfield Layout) ดังนี้:

#### 📊 1. โครงสร้างแพ็กเก็ตมาตรฐาน (TOG v1.1 Binary Frame Layout)
```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Magic (0x544F)|Ver| Type  |TTL/Hop| Priority |Flags| Reserved | (4 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Message ID (uint64, 8 Bytes)              | (8 Bytes)
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                  Sender Public Key Hash (8 Bytes)             | (8 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|               Recipient / Topic Hash (8 Bytes)                | (8 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|               Target H3 Index Res 9 (uint64, 8 Bytes)         | (8 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Payload Length (uint16, 2B)   |           Payload Data ...    | (Var)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### 📋 2. รายละเอียดฟิลด์ข้อมูลระดับบิต:
1. **Magic Word (16 bits / 2 Bytes):** ค่าคงที่ `0x544F` (รหัส ASCII ตัวอักษร `'TO' (Thabot OutGrid)`) สำหรับกรองและตัดแพ็กเก็ตแปลกปลอมทิ้งทันที
2. **Protocol Version (3 bits):** ค่าเริ่มต้น `0b001` (Version 1.1)
3. **Packet Type (5 bits):** กำหนดประเภทหน้าที่ของแพ็กเก็ต:
   - `0x01` (`SOS_BEACON`): ขอความช่วยเหลือฉุกเฉิน (ไม่เข้ารหัสเนื้อหา แต่มีลายเซ็น Ed25519)
   - `0x02` (`DIRECT_CHAT`): ข้อความแชต 1-on-1 เข้ารหัสลับสองชั้น E2EE (AES-256-GCM)
   - `0x03` (`GROUP_CHAT`): ข้อความกลุ่มชุมชนเฉพาะพื้นที่ ถอดรหัสด้วย Group Key
   - `0x04` (`CRISIS_FEED`): ประกาศเตือนภัยทางการ พร้อม Ed25519 Authority Master Signature
   - `0x05` (`DELIVERY_ACK`): ใบเสร็จยืนยันข้อความส่งถึงปลายทาง (ตีกลับล้างแคช Auto-Prune)
   - `0x06` (`DELIVERY_NACK`): แจ้งเตือนข้อความส่งไม่ถึงเมื่อเส้นทางขาดหาย
   - `0x07` (`PRESENCE_CHIRP`): สัญญาณชีพสั้นจิ๋ว (Heartbeat) อัปเดตสถานะเพื่อนบ้านรอบตัว
4. **TTL / Hop Count (8 bits / 1 Byte):** ค่าจำนวนการกระโดดข้ามโหนด (ลดทอนลง 1 ทุกทอด ตัดทิ้งเมื่อเหลือ 0 ป้องกันลูป)
5. **Priority (4 bits):** ลำดับความสำคัญของคิวในหน่วยความจำ (`0xF` = SOS สูงสุด ห้ามลบทิ้ง, `0x8` = Chat, `0x1` = Presence)
6. **Message ID (64 bits / 8 Bytes):** รหัสเฉพาะของแพ็กเก็ต สุ่มขึ้นด้วย CSPRNG ป้องกันข้อความซ้ำ (นำไปคำนวณใน Bloom Filter)
7. **Sender & Recipient Hash (64 bits / 8 Bytes แต่ละตัว):** แฮช truncated SHA-256 ของ Public Key เพื่อประหยัดพื้นที่แทนการส่ง Full Key 32 ไบต์
8. **Target H3 Index Res 9 (64 bits / 8 Bytes):** รหัสหกเหลี่ยม Uber H3 ความละเอียด ~100 เมตร (ใช้ `h3ToParent` ถอยเป็น Res 7 / 5 / 4 ได้ทันที)
9. **Payload Length & Data (Variable):** ความยาวขนาดข้อมูลตามจริง บรรจุ Ciphertext (IV 12B + Ciphertext + Tag 16B)
10. **Fragmented Chunk Header (4 Bytes - สำหรับแพ็กเก็ตที่มีขนาดเกิน MTU > 200B):**
    - `Total Chunks (16 bits / 2 Bytes)`: ระบุจำนวนชิ้นส่วนทั้งหมดของไฟล์
    - `Sequence Index (16 bits / 2 Bytes)`: ระบุลำดับที่ของชิ้นส่วน (0 ถึง N-1) ช่วยให้ปลายทางรองรับการรับชิ้นส่วนสลับลำดับ (Out-of-order Reassembly) ได้ 100%
11. **H3 Local Delta Offset (4 Bytes - Ultra-Compact High-Precision GPS Payload ⭐️):**
    - ในแพ็กเก็ตขอความช่วยเหลือ `SOS_BEACON` หรือการแชร์พิกัดฉุกเฉิน จะใช้ **H3 Local Delta Offset** แทนพิกัด Float ดั้งเดิม (16B):
      - `Delta X (int16, 2 Bytes)`: ระยะกระจัดแกน X (-1,500m ถึง +1,500m) จากจุดกึ่งกลางของ Target H3 Hexagon
      - `Delta Y (int16, 2 Bytes)`: ระยะกระจัดแกน Y (-1,500m ถึง +1,500m) จากจุดกึ่งกลางของ Target H3 Hexagon
    - **ผลลัพธ์:** บีบอัดพิกัด GPS แม่นยำระดับ **< 1 เมตร (เห็นหลังคาบ้านชัดเป๊ะ)** โดยกินขนาดข้อมูลเพียง **4 ไบต์** เท่านั้น! ประหยัดกว่าการส่งตัวอักษร GPS (35-40B) ถึง 90% และส่งผ่านคลื่นวิทยุ BLE / LoRa ได้เร็วในเสี้ยววินาที


---

### 2.2 โครงสร้างการทำงานของ Server แม่ข่ายจิ๋ว (Cloud Coordinator & Spatial Edge Architecture)

เพื่อให้ระบบทำงานระดับโลกได้โดย **ไร้ภาระค่าใช้จ่ายเซิร์ฟเวอร์ ($0 - $15/เดือน)** และรักษาหลักการ **Zero-Storage Policy (ไม่เก็บข้อมูลส่วนบุคคลและไม่เก็บข้อความแชต)** เซิร์ฟเวอร์แม่ข่ายจึงถูกวางโครงสร้างเป็น **Micro-Serverless Edge Architecture** บนเครือข่าย Cloudflare (Node กรุงเทพฯ Latency ต่ำ 5–15ms) ทำหน้าที่หลัก 4 ด้านเท่านั้น:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   Cloudflare Edge Coordinator Architecture (Zero-Cost)                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [ Public STUN Servers ] (Google & Cloudflare STUN - ฟรี 100%)                          │
│         ▲                                                                              │
│         │ 1. NAT Discovery (ค้นหา Public IP/Port ของตัวเอง)                            │
│         │                                                                              │
│  [ Client เครื่อง A ] ──── 2. ส่ง SDP นามบัตร (1 KB) ───► [ Cloudflare Worker ]         │
│                                                              │  (Spatial Coordinator)  │
│                                                              ▼                         │
│  [ Client เครื่อง B ] ◄─── 3. จับคู่ห้อง H3 Hexagon ◄───────┴─ [ Cloudflare D1 ]       │
│         │                                                        - Ephemeral Presence  │
│         │                                                        - Anonymous Heatmap   │
│         ▼                                                                              │
│  [ P2P WebRTC DataChannel เชื่อมต่อตรง ] ═══════════════════════════════════════════   │
│  (คุยตรงหากันเองแบบ E2EE - เซิร์ฟเวอร์ไม่ยุ่งเกี่ยวกับเนื้อหาแชต 100%)                 │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Inbound Alert Ingestion Gateway ] (ปภ. / กรมอุตุฯ / เซนเซอร์เตือนภัย)                 │
│         │ POST /v1/alerts/broadcast (CAP Protocol + HMAC Token + Ed25519)              │
│         ▼                                                                              │
│  [ Cloudflare Worker ] ───► กระจายลง D1 Spatial Cache ───► โหนดขอบเขตดึงลง Mesh ท้องถิ่น│
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Cloudflare R2 Object Storage ] (Zero Egress Fee) ───► ให้ดาวน์โหลด OutGridMesh.apk ฟรี│
│  [ Cloudflare Pages ] ─────────────────────────────────► Public Network Heatmap & ICS │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 🛠️ หน้าที่หลัก 4 ส่วนของ Server แม่ข่าย:

1. **Spatial H3 Signaling Handler (ห้องจับคู่นามบัตรตามพิกัดหกเหลี่ยม):**
   - **การทำงาน:** เมื่อมือถือเข้าถึงอินเทอร์เน็ตได้ จะติดต่อไปยัง Public STUN (`stun.l.google.com:19302`) เพื่อหา Public IP/Port ของตนเอง จากนั้นส่งข้อมูล SDP (ขนาดเพียง 1–2 KB) มาฝากไว้ที่ Worker ตามรหัส `H3_Tile_ID` (Resolution 7)
   - **Zero Media Relay:** Worker แค่ส่งต่อ SDP นามบัตรให้เครื่องคู่สนทนา จากนั้นทั้งสองเครื่องจะเปิดท่อ **WebRTC DataChannel แบบ P2P คุยตรงหากันเองทันที** เซิร์ฟเวอร์ไม่เป็นตัวกลางรับส่งข้อมูล (Zero Bandwidth Cost)

2. **Cloudflare D1 Ephemeral Presence & Anonymous Heatmap Table:**
   - เก็บสถานะโหนดแบบชั่วคราวและลบทิ้งอัตโนมัติ (TTL 1 ชั่วโมง):
     - `h3_index` (หกเหลี่ยม Res 7 ระดับตำบล ~5 ตร.กม.)
     - `peer_id_hash` (แฮชแบบทางเดียว ไม่ระบุตัวตน)
     - `battery_tier`, `is_supernode`, `last_seen`
   - **Privacy Guard:** ห้ามจัดเก็บ Lat/Long ละเอียด, ห้ามเก็บเบอร์โทร, ห้ามเก็บชื่อผู้ใช้ และใช้ K-Anonymity ($\ge 3$ เครื่องจึงจะแสดงจุดสี)

3. **Inbound Emergency Alert Gateway (API รับแจ้งเตือนภัยทางการ):**
   - เปิด Endpoint `POST /v1/alerts/broadcast` รับข้อมูลมาตรฐานสากล **CAP (Common Alerting Protocol)** จากกรมป้องกันและบรรเทาสาธารณภัย (ปภ.) หรือกรมอุตุนิยมวิทยา
   - ตรวจสอบความถูกต้องด้วย **Ed25519 Master Authority Signature** ป้องกันข่าวปลอม 100%
   - กระจายประกาศลงพิกัด H3 ที่กำหนด เพื่อให้เครื่องของประชาชนที่อยู่แถบนั้นดึงลงไปกระจายต่อในวง Mesh ออฟไลน์

4. **Zero-Egress Distribution & Public Heatmap Dashboard:**
   - **Cloudflare R2:** โฮสต์ไฟล์ `OutGridMesh.apk` และ `vector-basemap.pbf` ประชาชนทั่วโลกดาวน์โหลดได้ฟรี **ไม่มีค่า Egress Bandwidth 100%**
   - **Cloudflare Pages:** เว็บไซต์แสดงแผนที่ความหนาแน่นเครือข่ายกู้ภัย (Public Heatmap) และหน้าแดชบอร์ดแสดงบัญชีเงินบริจาคโปร่งใส (Transparent Ledger)

---


## 3. สแต็กเทคโนโลยีและภาษาที่ใช้ในการพัฒนา (Technology Stack & Languages)

เพื่อให้ระบบทำงานได้รวดเร็ว เบาหวิว และทนทานสูงสุดบนมือถือราคาประหยัด 100% จึงเลือกใช้สถาปัตยกรรม **Bun-Powered Modern Hybrid Architecture (Bun + TypeScript Core + Svelte 5 + Native Kotlin Driver)**:

| ส่วนของระบบ (Component) | ภาษาที่ใช้ (Language) | เฟรมเวิร์ก & เครื่องมือหลัก (Key Frameworks & Tools) | เหตุผลความจำเป็นทางเทคนิค |
| :--- | :---: | :--- | :--- |
| **0. Runtime & Package Manager** | **Bun (Zig / C++)** | **Bun v1.4+ (`bun install`, `bun test`, `bun run build`)** | ติดตั้ง Dependencies เร็วขึ้น 25 เท่า, รัน TypeScript ตรงๆ โดยไม่ต้องแปลงไฟล์, เบาเครื่อง และกินแรมน้อยกว่า Node.js มหาศาล |
| **1. UI & Screen Presentation** | **TypeScript** | **Svelte 5 (Runes) + TailwindCSS + Lucide Icons** | **ไม่มี Virtual DOM** คอมไพล์เป็น Pure JS ขนาดเล็กจิ๋ว (<15 KB), ไม่หน่วง ไม่ค้างบนมือถือราคาประหยัด RAM 1.5–2GB, เรนเดอร์ 60 FPS ลื่นไหล |
| **2. Mesh Protocol & Core Logic** | **TypeScript (Pure)** | **Thabot OutGrid Protocol (TOG v1.1), `h3-js`, Counting Bloom Filter** | Single Source of Truth สำหรับตรรกะเครือข่ายทั้งหมด ปราศจาก Browser/Capacitor Dependency, รันเทสบน `bun test` เร็วในเสี้ยววินาที |
| **3. Security & Cryptography** | **TypeScript** | **`@noble/ciphers` (AES-256-GCM), `@noble/curves` (Ed25519, X25519)** | ไลบรารีการเข้ารหัสความเร็วสูง มาตรฐานสากล Zero-Dependency ปลอดภัย 100% |
| **4. Native Mobile Shell** | **TypeScript & Native Bridge** | **Capacitor 6** | สะพานเชื่อมต่อ Web UI เข้ากับ Native Android ที่น้ำหนักเบาและคลีน ให้ประสิทธิภาพสูงกว่า React Native |
| **5. Native Android Radios & Hardware** | **Kotlin** | **Android BLE APIs (`BluetoothLeScanner`, `BluetoothLeAdvertiser`), Wi-Fi P2P** | เข้าถึง Low-level Hardware ของชิปบลูทูธโดยตรง, เปิดโหมด **Bluetooth 5 Long Range (LE Coded PHY)** และฝัง Hardware ScanFilter |
| **6. Background Engine & OS Resilience** | **Kotlin** | **Android Foreground Service (`connectedDevice`), `BatteryManager`, WakeLock** | รักษาการทำงาน 24/7 เบื้องหลัง ไม่ให้โดน Android Doze Mode สั่งปิด และดักจับเปอร์เซ็นต์แบตเตอรี่เพื่อปรับ Duty Cycle อัตโนมัติ |
| **7. Local Database (Offline-first)** | **SQL / TypeScript** | **`@capacitor-community/sqlite` (SQLite3 Engine)** | จัดเก็บข้อความออฟไลน์, ตารางเพื่อนบ้าน, คิว DTN Relay Queue และ Public Key รายชื่อเพื่อน (เพดาน 50 MB FIFO) |
| **8. Cloud Serverless Coordinator** | **TypeScript** | **Cloudflare Workers, Cloudflare D1 (SQLite Edge), Cloudflare R2** | รันบน Edge ใกล้ผู้ใช้ในไทย (BKK Latency 5–15ms), Zero-Egress Fee สำหรับแจก APK ฟรี และแชร์ Data Types ร่วมกับ Client 100% |
| **9. Automated Testing & Tooling** | **TypeScript** | **Bun Built-in Test Runner (`bun test`), `scripts/checkSyntax.js`** | รันการทดสอบ Unit Test ระดับพันรอบได้ในเสี้ยววินาที และตรวจสอบ Syntax ทุกไฟล์ก่อน Commit สู่ `uat` |


### 3.1 ข้อกำหนดคุณสมบัติอุปกรณ์ที่รองรับ (Device Hardware & OS Specifications)

ระบบถูกออกแบบภายใต้ปรัชญา **"Universal Disaster Accessibility"** เพื่อให้ทำงานได้บนสมาร์ตโฟนราคาประหยัดของชาวบ้านทั่วไป 100% รวมถึงเครื่องเก่าที่ไม่ได้ใส่ซิมการ์ด (No SIM Required):

#### 1. สเปกขั้นต่ำสุดที่ระบบรองรับ (Minimum System Requirements):
*สำหรับมือถือราคาประหยัด (1,500 – 2,500 บาท) หรือเครื่องเก่าอายุ 6–8 ปี สามารถรับ-ส่งข้อความและยิง SOS ช่วยชีวิตได้*
- **ระบบปฏิบัติการ (OS):** Android 8.0 (Oreo / API Level 26) ขึ้นไป (ครอบคลุมสมาร์ตโฟนในไทย $> 96\%$)
- **หน่วยประมวลผล (CPU):** Quad-Core 1.3 GHz (32-bit หรือ 64-bit ARM)
- **หน่วยความจำ (RAM):** 1.5 GB – 2 GB RAM (ตัวแอปกิน RAM สแตนด์บายเบื้องหลังเพียง $\approx 35 - 55\text{ MB}$)
- **พื้นที่จัดเก็บ (Storage):** พื้นที่ว่างขั้นต่ำ 100 MB (ตัวแอปติดตั้ง $\approx 25\text{ MB}$ + แคชข้อความ SQLite สูงสุด 50 MB)
- **บลูทูธ (Bluetooth):** Bluetooth 4.2 (BLE) รองรับทั้ง BLE Scanning (Central) และ BLE Advertising (Peripheral)
- **การระบุตำแหน่ง (Location):** GPS / A-GPS / GLONASS มีชิปดาวเทียมในตัว สำหรับคำนวณ H3 ออฟไลน์
- **Wi-Fi:** Wi-Fi 802.11 b/g/n (2.4 GHz) สำหรับโหมด Local Hotspot แจกแอปออฟไลน์
- **ซิมการ์ด:** **ไม่จำเป็นต้องใส่ซิม (No SIM Required)** เครื่องเปล่าเปิด Wi-Fi/Bluetooth และ GPS ใช้งานได้ทันที 100%

#### 2. สเปกแนะนำสำหรับการใช้งานเต็มรูปแบบ (Recommended Specifications):
*สำหรับสมาร์ตโฟนทั่วไปในตลาดปัจจุบัน (ราคา 3,500 – 7,000 บาท) รับบทบาทเป็น Full Relay & Data Mule*
- **ระบบปฏิบัติการ (OS):** Android 11.0 – 14.0+ (API Level 30–34)
- **หน่วยประมวลผล (CPU):** Octa-Core 2.0 GHz ขึ้นไป (ถอดรหัส E2EE และบีบอัดรูปภาพ WebP ในเสี้ยววินาที)
- **หน่วยความจำ (RAM):** 4 GB – 8 GB RAM (สลับแอปราบรื่นและทำหน้าที่เป็น Data Mule ส่งต่อข้อความข้ามจังหวัด)
- **พื้นที่จัดเก็บ (Storage):** พื้นที่ว่าง 500 MB – 1 GB (สำรองแผนที่ออฟไลน์และแคชเสียง Opus)
- **บลูทูธ (Bluetooth):** Bluetooth 5.0 / 5.2 ขึ้นไป พร้อม **BLE Extended Advertising & LE Coded PHY (รัศมีส่งไกล 100–300 เมตร)**
- **เซนเซอร์เพิ่มเติม:** Accelerometer, Gyroscope (สำหรับ Autonomous Mobility Detection $\ge 15-20$ กม./ชม.), Magnetometer (เข็มทิศ)
- **ฮาร์ดแวร์กายภาพ:** กล้องหลัง + LED Flashlight (สแกน QR และกระพริบ Optical Strobe SOS) และลำโพง (Acoustic Siren)

#### 3. สเปกสำหรับโหนดสถาปนาเป็นแม่ข่าย (Supernode Candidate Specs):
*สำหรับเครื่องหัวหน้าทีมกู้ภัย, รถพยาบาล, หรืออุปกรณ์ประจำศูนย์อพยพ*
- **สถานะพลังงาน:** เสียบสายชาร์จอยู่ตลอดเวลา (AC Power / Car Inverter / Power Bank ขนาดใหญ่)
- **หน่วยความจำ (RAM) & ความจุ:** RAM $\ge 4\text{ GB}$, พื้นที่ว่าง $\ge 2\text{ GB}$ สำหรับพักข้อความของคนทั้งค่าย (50–100 คน)
- **Backhaul (ออปชันเสริม):** รองรับการต่อเชื่อม Starlink / 4G / Wi-Fi เพื่อทำหน้าที่เป็นสะพานส่งข้อมูลขึ้น Cloudflare D1

---


### 3.2 โครงสร้างไดเรกทอรีโปรเจกต์มาตรฐาน (Recommended Project Structure)

```text
OutGridMesh/                               # Root Directory (เดิมคือ GossipMSG)
├── .github/                               # CI/CD Workflows (Lint, Syntax Check, Test)
├── docs/                                  # 📖 เอกสารโครงการและคู่มือการใช้งาน 10 ภาษา (Offline User Manuals)
│   ├── manuals/                           # คู่มือการใช้งานฉบับย่อ & กู้ภัยฉุกเฉิน (Embedded Markdown/HTML & Web)
│   │   ├── manual.en.md                   # 1. English - Quickstart & Emergency Survival Guide
│   │   ├── manual.zh.md                   # 2. 简体中文 - 离线应急通信与自救手册
│   │   ├── manual.es.md                   # 3. Español - Guía Rápida y Manual de Rescate de Emergencia
│   │   ├── manual.hi.md                   # 4. हिन्दी - आपातकालीन मेश संचार एवं जीवन रक्षा मार्गदर्शिका
│   │   ├── manual.ar.md                   # 5. العربية - دليل النجاة وحالات الطوارئ (RTL Format)
│   │   ├── manual.fr.md                   # 6. Français - Guide de Démarrage et Survie d'Urgence
│   │   ├── manual.ru.md                   # 7. Русский - Руководство по выживанию в ЧС и офлайн-связи
│   │   ├── manual.pt.md                   # 8. Português - Guia de Início Rápido e Sobrevivência
│   │   ├── manual.ja.md                   # 9. 日本語 - 防災オフラインメッシュ通信・避難マニュアル
│   │   └── manual.th.md                   # 10. ภาษาไทย - คู่มือการใช้งานกู้ภัยและสื่อสารฉุกเฉินไร้เน็ต
│   └── architecture/                      # เอกสารเชิงลึกด้านเทคนิค (TOG v1.1, Cryptography, H3 Grid)
├── android/                               # Capacitor Android Native Project (Kotlin/Java)
│   └── app/src/main/
│       ├── AndroidManifest.xml            # กำหนด Permissions (BLE, Foreground Service, WakeLock)
│       └── java/com/outgrid/mesh/
│           ├── service/                   # Background Services
│           │   ├── MeshForegroundService.kt  # 24/7 Sticky Service (connectedDevice)
│           │   ├── BatteryWatchdog.kt        # 3-Tier Battery Monitor & Duty Cycling
│           │   └── RadioResetWatchdog.kt     # ป้องกันชิปบลูทูธค้าง (Auto Soft-Reset)
│           ├── radio/                     # Low-Level Hardware Drivers
│           │   ├── BleAdvertiserDriver.kt    # ยิงแพ็กเก็ต BLE 21B (Legacy & Extended)
│           │   ├── BleScannerDriver.kt       # ฝัง Hardware ScanFilter ลงชิปบลูทูธ
│           │   └── WifiDirectDriver.kt       # สลับเปิด Wi-Fi โอนไฟล์รูปภาพ/APK
│           └── plugins/                   # Capacitor Bridge Plugins
│               └── OutGridNativeBridge.kt    # สะพานเชื่อมคำสั่งระหว่าง TypeScript กับ Kotlin
│
├── src/                                   # TypeScript Core & UI Application
│   ├── core/                              # 🧠 Pure Protocol & Mesh Engine (Zero-UI / 100% Testable)
│   │   ├── protocol/                      # Thabot OutGrid Protocol (TOG v1.1)
│   │   │   ├── header.ts                  # Bitfield Header 5 ไบต์ (Magic, Flags, Hop, TTL)
│   │   │   ├── encoder.ts                 # Pack Binary Buffer (ArrayBuffer / DataView)
│   │   │   ├── decoder.ts                 # Unpack Binary Buffer สู่ Object
│   │   │   ├── types.ts                   # Protocol Packet Types (SOS, Chat, ACK, NACK)
│   │   │   └── constants.ts               # ขนาด Magic Number, Service UUID, Port
│   │   │
│   │   ├── routing/                       # Routing & Dissemination
│   │   │   ├── gossipRouter.ts            # Epidemic Gossip & Targeted Flood
│   │   │   ├── bloomFilter.ts             # Counting Bloom Filter สกัดพายุข้อความซ้ำ
│   │   │   ├── dtnMuleEngine.ts           # Store-Carry-Forward & Hop Freeze บนรถ
│   │   │   ├── velocityTracker.ts         # Azimuth Bearing & H3 Cone of Projection
│   │   │   ├── reverseAckEngine.ts        # ส่งใบเสร็จสะท้อนกลับ & Instant Auto-Prune
│   │   │   └── antiEntropySync.ts         # Flash Crowd & Network Partition Reconcile
│   │   │
│   │   ├── spatial/                       # Uber H3 Spatial Indexing
│   │   │   ├── h3Manager.ts               # แปลง Lat/Lng เป็น H3 (Res 9, 7, 5)
│   │   │   ├── hierarchyFallback.ts       # ถอย Level ซอย -> ตำบล -> อำเภอ
│   │   │   └── supernodeElection.ts       # กฎ 1 แม่ข่าย/H3 Res 7 & คำนวณ Rank Score
│   │   │
│   │   ├── crypto/                        # Security & Encryption Engine
│   │   │   ├── e2eeCipher.ts              # X25519 (ECDH) + AES-256-GCM
│   │   │   ├── signature.ts               # Ed25519 Sign/Verify สำหรับ SOS & Beacon
│   │   │   └── keyStore.ts                # จัดเก็บ Identity Key & QR Friend Pairing
│   │   │
│   │   ├── time/                          # Time Consensus & Sync
│   │   │   └── timeSyncManager.ts         # GPS Atomic Clock & Gossip Lamport Median
│   │   │
│   │   ├── adapters/                      # 🔌 Open-Source Protocol Bridge Adapters Layer
│   │   │   ├── IProtocolAdapter.ts        # มาตรฐาน Interface รองรับการเสียบ Adapter ใหม่ในอนาคต
│   │   │   ├── meshtasticAdapter.ts       # Bridge แปลง TOG <-> Meshtastic LoRa Protobuf
│   │   │   ├── briarAdapter.ts            # Bridge แปลง TOG <-> Briar Bramble Protocol
│   │   │   └── capXmlAdapter.ts           # Bridge แปลง TOG <-> Common Alerting Protocol (ปภ./อุตุฯ)
│   │   │
│   │   └── storage/                       # Local Storage & Database
│   │       ├── sqliteDriver.ts            # Wrapper เชื่อมต่อ SQLite บนมือถือ
│   │       ├── schema.sql                 # ตาราง: dtn_relay_queue, peer_neighbor_table
│   │       └── quotaManager.ts            # คุมพื้นที่ไม่เกิน 50 MB (FIFO & Protect SOS)
│   │
│   ├── services/                          # Application Bridge Layer
│   │   ├── transportManager.ts            # สลับส่ง BLE vs Wi-Fi Direct อัตโนมัติ
│   │   ├── disasterStateMachine.ts        # สถานะ Cloud Online <-> Mesh <-> Emergency
│   │   └── offlineApkServer.ts            # Mini HTTP Server + แจก APK ผ่าน QR Code
│   │
│   ├── ui/                                # Presentation Layer (React + TailwindCSS)
│   │   ├── components/                    # Reusable UI Widgets
│   │   │   ├── SosPanicButton.tsx         # ปุ่ม SOS นับถอยหลัง 3 วิ (Hold-to-Activate)
│   │   │   ├── CancelSosModal.tsx         # ปุ่ม "ฉันปลอดภัยแล้ว" ลบหมุดฉุกเฉิน
│   │   │   ├── H3OfflineMap.tsx           # เรนเดอร์ Vector Basemap 5MB + หกเหลี่ยม H3
│   │   │   ├── DeliveryBadge.tsx          # แสดงไอคอนสถานะ 5 ขั้น (ส่ง/ฝาก/ติ๊กถูกคู่)
│   │   │   └── BatteryIndicator.tsx       # แสดงโหมด Duty Cycle ตามระดับแบต
│   │   ├── screens/                       # Main Pages
│   │   │   ├── EmergencyScreen.tsx        # หน้าหลักกู้ภัย (SOS, สัญญาณไซเรน, ไฟกระพริบ)
│   │   │   ├── ChatListScreen.tsx         # รายชื่อแชต 1-on-1 และกลุ่มชุมชน
│   │   │   ├── ConversationScreen.tsx     # หน้าต่างพิมพ์แชตพร้อม Dropdown เลือกอายุ TTL
│   │   │   ├── CrisisFeedScreen.tsx       # ฟีดข่าวสารรอบตัวระยะ 1–5 กม. (Verified Badge)
│   │   │   ├── NetworkDiagnostics.tsx     # ดูจำนวน Peers รอบตัว, Bloom Hit Rate
│   │   │   └── OnboardingWizard.tsx       # หน้าขอสิทธิ์ 4 อย่างรวดเดียว + แนะนำ DontKillMyApp
│   │   └── assets/                        # Static Assets
│   │       └── basemap/                   # Vector Tile แผนที่อำเภอ/ตำบลไทย (~5-8 MB)
│   │
│   ├── main.tsx                           # Application Entry Point
│   └── App.tsx                            # Root Navigation & Layout
│
├── cloudflare/                            # Cloud Serverless Coordinator (Edge BKK)
│   ├── src/
│   │   ├── worker.ts                      # Cloudflare Worker API & STUN Signaling
│   │   ├── schema.sql                     # Cloudflare D1 Schema (Presence & Heatmap)
│   │   └── alertsGateway.ts               # Inbound CAP Alert Webhook (ปภ./อุตุฯ)
│   └── wrangler.toml                      # Cloudflare Configuration
│
├── tests/                                 # 🧪 Automated Test Suite (100% Coverage Target)
│   ├── unit/
│   │   ├── protocol.test.ts               # ทดสอบ Pack/Unpack TOG Header & Payload
│   │   ├── bloomFilter.test.ts            # ทดสอบการดักจับ Duplicate Storm
│   │   ├── h3Hierarchy.test.ts            # ทดสอบ Zoom-out Fallback (Res 9 -> 7 -> 5)
│   │   ├── crypto.test.ts                 # ทดสอบ E2EE Encrypt/Decrypt & Ed25519 Sign
│   │   ├── velocityTracker.test.ts        # ทดสอบการคำนวณทิศรถและกรวย H3 Cone
│   │   └── timeSync.test.ts               # ทดสอบ Gossip Time Consensus
│   └── simulation/
│       ├── multiHopRelay.test.ts          # จำลองการกระโดด 5-10 โหนดเสมือน
│       └── networkPartition.test.ts       # จำลองการแยกโซนและ Reconcile กลับเข้าหากัน
│
├── scripts/
│   ├── checkSyntax.js                     # ตรวจสอบ Syntax ทุกไฟล์ก่อน Commit
│   └── generateTestVectors.js             # สร้างชุดข้อมูลทดสอบโพรโทคอล
│
├── capacitor.config.ts                    # Capacitor App Configuration
├── package.json                           # Dependencies & Scripts
├── tsconfig.json                          # TypeScript Strict Mode Configuration
└── vite.config.ts                         # Vite Bundler & Build Settings
```

---

## 4. แผนการพัฒนารายเฟสแบบละเอียด 10 เฟส (Phases 1 - 10 Granular TaskList)

เพื่อให้การพัฒนาระบบ **OutGrid Mesh** ดำเนินการได้อย่างแม่นยำ ไร้รอยต่อ ไม่มีฟีเจอร์ใดตกหล่น และควบคุมคุณภาพได้ 100% ตามแนวทาง Clean Architecture จึงจัดแบ่งแผนงานออกเป็น **4 หลักเป้าหมายสำคัญ (Strategic Milestones & Release Gates)** ครอบคลุม **10 Granular Micro-Phases** ดังนี้:

### 🏆 ตารางเป้าหมายความสำเร็จของโครงการ (Project Strategic Milestones)

| Milestone | ชื่อเป้าหมายหลัก | เฟสที่ครอบคลุม | ผลลัพธ์ที่จับต้องได้ (Deliverables & Release Gates) | เกณฑ์การผ่าน (Definition of Done) |
| :---: | :--- | :---: | :--- | :--- |
| **M1** | **Core Engine & Wire Protocol Ready** | Phase 1 – 2 | • โครงสร้าง Clean Architecture & Bun Tooling<br>• TOG v1.1 Wire Protocol Packing & Serializer<br>• Reed-Solomon Erasure Coding 8+4 & Fragmenter | • ผ่าน Syntax Check และ Unit Tests 100%<br>• กู้คืนแพ็กเก็ตที่สูญหาย 30% ได้สมบูรณ์แบบ |
| **M2** | **Autonomous Mesh & Spatial Intelligence** | Phase 3 – 6 | • Epidemic Gossiping & Density Engine<br>• IndexedDB/SQLite Quota Clamping (50MB)<br>• Uber H3 Spatial Expansion & Supernode<br>• DTN Data Mule & Velocity Tracker | • ส่งผ่านข้อความ 5–10 Hops สำเร็จ ไร้ Loop<br>• สลับบทบาท Supernode แม่ข่ายอัตโนมัติ<br>• Data Mule อุ้มข้อมูลข้ามอำเภอได้ 100% |
| **M3** | **Hardware Radio & Cross-Protocol Interop** | Phase 7 – 8 | • Android Foreground Service & 24h Background<br>• Meshtastic LoRa Companion Bridge (BLE)<br>• Briar BTP Protocol Bridge<br>• Emergency Wi-Fi APK Sideload & Audio Morse | • แบตเตอรี่โหมด Deep Sleep <0.2%/ชม.<br>• แปลงแพ็กเก็ตข้ามไป LoRa / Briar สำเร็จ<br>• มือถือเครื่องอื่นต่อ Wi-Fi โหลด APK ได้ |
| **M4** | **Production Operations & Global Field Readiness** | Phase 9 – 10 | • Cloudflare Pages/Workers & D1 Spatial Heatmap<br>• Dual-Tier Privacy & QR Delegation / OTP SSO<br>• Svelte 5 High-Contrast Dark UI & 10 Languages<br>• ซ้อมแผนเผชิญเหตุเสมือนจริง (Disaster Drills) | • Web & Mobile ทำงานเชื่อมโยงกันสมบูรณ์<br>• สแกน QR รับสิทธิ์กู้ภัยออฟไลน์สำเร็จ<br>• รองรับ 10 ภาษาและแผนที่ออฟไลน์ 5MB 100% |

---

### 🔹 Phase 1: Core Foundation, Clean Architecture & Developer Tooling
**เป้าหมาย:** วางรากฐานโครงสร้างโปรเจกต์แบบ Clean Architecture แยก Platform-independent Core ออกจาก Native Layer พร้อมระบบทดสอบอัตโนมัติ 100%

#### 📋 TaskList Detail:
- [ ] **Task 1.1: Git Repository & Workspace Setup**
  - กำหนดค่า `.gitignore` ครอบคลุม Node, Vite, Capacitor, Android (Gradle/build), Keys/Keystores
  - สร้าง Branch `uat` เป็น Branch หลักในการพัฒนาตามกฎเคร่งครัด
- [ ] **Task 1.2: Strict TypeScript & Clean Architecture Scaffold**
  - ตั้งค่า `tsconfig.json` แบบ Strict Mode (`"strict": true`, `"noImplicitAny": true`, `"exactOptionalPropertyTypes": true`)
  - วางโครงสร้างโฟลเดอร์ `src/core/` (Pure TS 100% ห้ามมี Capacitor/DOM/Android imports)
  - วางโครงสร้าง `src/platform/`, `src/ui/`, `android/`, `cloudflare/`
- [ ] **Task 1.3: Quality Gates & Automated Tooling**
  - ตั้งค่าระบบทดสอบอัตโนมัติด้วย Bun Test (`bun test`) / Vitest รัน Unit Tests ฝั่ง `src/core/` ในเสี้ยววินาที
  - สร้างสคริปต์ `scripts/checkSyntax.js` ตรวจสอบ Syntax ไฟล์ `.ts`, `.js`, `.json` ทุกไฟล์ก่อน Commit
  - สร้าง GitHub/GitLab CI workflow จำลองรัน `checkSyntax.js` และ `vitest run`

#### 🎯 Acceptance Criteria:
- `bun run check:syntax` และ `bun test` ทำงานผ่าน 100%
- โครงสร้าง `src/core/` ปราศจาก Native/Browser Dependency โดยสิ้นเชิง

---

### 🔹 Phase 2: Thabot OutGrid Protocol (TOG v1.1) Bitfield Packing & Frame Engine
**เป้าหมาย:** สร้าง Engine เข้ารหัส/ถอดรหัสแพ็กเก็ตระดับ Binary Bitfield (28 bytes minimum) พร้อมระบบ Erasure Coding, Sliding Window และ NACK Retransmission

#### 📋 TaskList Detail:
- [ ] **Task 2.1: Binary Frame Bitfield Packing & Unpacking Engine**
  - พัฒนา `src/core/protocol/PacketSerializer.ts` จัดสรร Buffer และอ่าน/เขียน Bitfield ตาม TOG v1.1
  - **Fixed Header (28 Bytes):**
    - `Protocol Version (3b)`, `Packet Type (5b)`, `TTL / Hop Count (8b)`, `Priority (4b)`, `Reserved (4b)`
    - `Message ID (8B uint64)`, `Sender Hash (8B)`, `Recipient/Topic Hash (8B)`
  - **Spatial Target Field (8 Bytes uint64):**
    - ฝังรหัส **Target H3 Index Resolution 9 (~100m)** กำกับไปกับแพ็กเก็ต เพื่อให้โหนดตัวกลางสามารถใช้สูตรคณิตศาสตร์ `h3ToParent` ถอยระดับเป็น Res 7 (ตำบล), Res 5 (กึ่งอำเภอ) และ Res 4 (ข้ามอำเภอ) ในการเลือกเส้นทางส่งต่อได้อย่างแม่นยำ
  - **H3 Local Delta Offset Packing Engine (4 Bytes Precision GPS ⭐️):**
    - พัฒนาระบบคำนวณและแปลงพิกัด GPS ดิบ เป็นระยะกระจัด `Delta X (int16)` + `Delta Y (int16)` สัมพัทธ์กับจุดกึ่งกลางของ Target H3 Cell
    - ปลายทางสามารถถอดรหัสระยะกระจัด 4 ไบต์กลับเป็นพิกัด GPS แม่นยำระดับ < 1 เมตร (ระดับหลังคาบ้าน) โดยไม่ต้องส่ง Float 16 ไบต์หรือสตริง 35-40 ไบต์
  - พัฒนา Unit Tests ตรวจสอบ Header และ Spatial Index Serialization ถูกต้อง 100%
- [ ] **Task 2.2: Large Payload Fragmentation, Bitmask Reassembly & Erasure Coding**
  - พัฒนา `src/core/protocol/Fragmenter.ts` หั่น Payload ขนาดใหญ่ (>200B เช่น รูปภาพ/เสียง) ออกเป็น Chunks พร้อมกำกับ `[Total_Chunks (2B)] + [Sequence_Index (2B)]`
  - พัฒนา `src/core/protocol/Reassembler.ts` ระบบประกอบร่างไฟล์อัจฉริยะ:
    - **In-Memory Bitmask Checklist:** กระดานเช็คชื่อในหน่วยความจำ RAM ติ๊กถูกบิตของชิ้นส่วนที่ได้รับ ช่วยให้ทราบทันทีว่าครบ 100% หรือยังแม้ชิ้นส่วนจะมาสลับลำดับ
    - **SHA-256 Checksum Verification:** ตรวจสอบความถูกต้องของข้อมูลทั้งหมดหลังประกอบเสร็จ ก่อนยิงตอบรับ `DELIVERY_ACK (0x05)`
  - พัฒนา `src/core/protocol/ErasureCoder.ts` (Reed-Solomon FEC 8+4) สามารถคำนวณกู้คืนข้อมูลเต็มได้ทันทีแม้ชิ้นส่วนตกหล่นหายไปในอากาศ 4 ชิ้น
- [ ] **Task 2.3: Selective NACK & Sliding Window Retransmission**
  - พัฒนา `src/core/protocol/SlidingWindow.ts` ควบคุมคิวส่งข้อมูลและคิวตอบรับ
  - พัฒนา `src/core/protocol/NackManager.ts` ส่งคำขอซ้ำเฉพาะชิ้นส่วนที่ขาดหายแทนการส่งใหม่ทั้งก้อน

#### 🎯 Acceptance Criteria:
- Serialize/Deserialize ทุกประเภท Packet (Chat, SOS, Voice, Map) ได้ความถูกต้อง 100%
- Erasure Coding สามารถจำลองกู้คืนเสียง/ภาพแผนที่ได้สำเร็จเมื่อ Drop Packet หายไป 30%

---

### 🔹 Phase 3: Zero-Knowledge Cryptography Engine & Offline QR Pairing
**เป้าหมาย:** พัฒนาระบบเข้ารหัสลับ End-to-End ไร้ศูนย์กลาง (E2EE) ด้วย X25519, AES-256-GCM, Ed25519 พร้อมจับคู่กุญแจแบบ Offline QR Code

#### 📋 TaskList Detail:
- [ ] **Task 3.1: Identity Keypair Generation & Storage**
  - พัฒนา `src/core/crypto/KeyManager.ts` สร้าง Master Ed25519/X25519 Keypair
  - ระบบ Keystore ปลอดภัย (Android Hardware Keystore / SecureStorage)
- [ ] **Task 3.2: E2EE Direct Messaging (ECDH + AES-256-GCM)**
  - พัฒนา `src/core/crypto/CipherEngine.ts` คำนวณ Shared Secret ผ่าน X25519 ECDH
  - เข้ารหัสและถอดรหัสแบบ AES-256-GCM (Ciphertext + 12B IV + 16B Auth Tag = 28B Overhead)
- [ ] **Task 3.3: Digital Signature & Authority Broadcast Verification**
  - พัฒนาการเซ็นและตรวจสอบลายเซ็น Ed25519 สำหรับประกาศทางการของศูนย์กู้ภัย/เตือนภัยพิบัติ
- [ ] **Task 3.4: Offline QR Code Out-of-Band Pairing Engine**
  - พัฒนาโมดูลสร้างและสแกน Dynamic QR Code บรรจุ Public Key + Ephemeral Nonce
  - ป้องกันการโจมตีแบบ Man-in-the-Middle (MitM) โดยไม่ต้องใช้อินเทอร์เน็ต

#### 🎯 Acceptance Criteria:
- Unit Test ฟังก์ชันเข้ารหัส/ถอดรหัส E2EE ทนทานต่อการแก้ไขข้อมูล (Auth Tag Mismatch ถอดรหัสไม่ผ่าน)
- การทดสอบจับคู่ Public Key ผ่าน QR Code ได้รับการยืนยัน Fingerprint ตรงกัน 100%

---

### 🔹 Phase 4: Local Storage, SQLite Schema, Quota Clamping & Bloom Filter
**เป้าหมาย:** ฐานข้อมูลออฟไลน์ประสิทธิภาพสูงบน SQLite จัดเก็บประวัติ ข้อความ แผนที่ พร้อมระบบจำกัดโควตาอัตโนมัติ 50MB และ Bloom Filter สกัดกั้นลูปแพ็กเก็ต

#### 📋 TaskList Detail:
- [ ] **Task 4.1: SQLite Database Engine & Migration Schema**
  - พัฒนา `src/core/storage/DatabaseSchema.ts` รองรับตาราง:
    - `messages` (id, type, sender, recipient, payload, status, timestamp, ttl, hops)
    - `peers` (pubkey_hash, last_seen, battery, h3_tile, is_supernode)
    - `dtn_bundles` (id, bundle_data, priority, expires_at, hop_count)
    - `vector_tiles` (tile_id, zoom, pbf_data)
- [ ] **Task 4.2: Strict 50MB Storage Quota Clamping & Auto-Pruning**
  - พัฒนา `src/core/storage/StorageManager.ts` ตรวจวัดขนาดไฟล์ฐานข้อมูล
  - นโยบายตัดข้อมูลเก่าเมื่อเกิน 50MB: ทิ้ง Presence Chirps > ลบ Chat ปกติที่หมดอายุ > รักษา SOS/Emergency ไว้เสมอ
- [ ] **Task 4.3: Counting Bloom Filter & Duplicate Suppression Cache**
  - พัฒนา `src/core/mesh/BloomFilter.ts` (ขนาด 128KB - 256KB) กรอง Packet ที่เคยเห็นแล้วทันทีในระดับ RAM
  - พัฒนา LRU Message Cache (5,000 รายการล่าสุด) ป้องกัน Broadcast Storm วนลูป 100%

#### 🎯 Acceptance Criteria:
- ทดสอบอัดข้อมูลขนาด 100MB เข้าฐานข้อมูล ระบบตัดทอน (Auto-Prune) เหลือไม่เกิน 50MB อย่างถูกต้อง
- Bloom Filter สามารถกรองแพ็กเก็ตซ้ำ 10,000 ชิ้นได้ถูกต้อง 100% โดยใช้เวลา < 1ms ต่อแพ็กเก็ต

---

### 🔹 Phase 5: Spatial H3 Indexing, Hierarchical Fallback & Supernode Election
**เป้าหมาย:** วางโครงข่ายพิกัดเชิงพื้นที่ด้วย Uber H3 Hexagonal Grid (Res 9, 7, 5, 4) ระบบย่อขยายพิกัดฉุกเฉิน และอัลกอริทึมเลือกตั้ง Supernode อัตโนมัติ

#### 📋 TaskList Detail:
- [ ] **Task 5.1: Spatial H3 Grid & Geo-Hashing Engine (4-Tier Architecture)**
  - พัฒนา `src/core/spatial/H3GridEngine.ts` แปลง GPS Lat/Long เป็น H3 Index ด้วย `h3-js`
  - รองรับความละเอียดเชิงพื้นที่ 4 ระดับสมบูรณ์:
    - **Resolution 9 (~100m / รัศมี ~107m):** สำหรับการส่งข้อความท้องถิ่น / เพื่อนบ้านติดกัน
    - **Resolution 7 (~1.2km / รัศมี ~1.22km):** สำหรับช่องสนทนาระดับตำบล / สถิติ Anonymous Heatmap
    - **Resolution 5 (~8.5km / รัศมี ~8.88km):** สำหรับการกระจายข่าวด่วนระดับตำบลขนาดใหญ่/กึ่งอำเภอ
    - **Resolution 4 (~22km / รัศมี ~22.6km):** สำหรับการขนส่งข้อความข้ามอำเภอและเชื่อมต่อกับ Data Mule
- [ ] **Task 5.2: Progressive Spatial Expansion & K-Ring Search เมื่อปลายทาง Offline**
  - พัฒนาระบบ **H3 Progressive Spatial Expansion** ค้นหาและส่งมอบข้อความเมื่อปลายทาง Offline เป็นระลอกคลื่น:
    - **ระดับ 1 (Offline < 15 นาที):** พยายามส่งตรงพิกัดเดิม **Res 9 (~100m)** ผ่าน BLE Long Range
    - **ระดับ 2 (Offline 15 นาที – 2 ชม.):** ถอยระดับสู่ **Res 7 (~1.2km)** พร้อมสั่ง `gridDisk(k=1)` ดักจับรังผึ้งรอบข้าง 6 ช่องรอบตัว เพื่อดักผู้ประสบภัยที่กำลังเดินอพยพ
    - **ระดับ 3 (Offline 2 – 12 ชม.):** ถอยระดับสู่ **Res 5 (~8.5km)** ประสานส่งต่อยังศูนย์อพยพระดับตำบล
    - **ระดับ 4 (Offline > 12 – 24 ชม.):** ถอยระดับสู่ **Res 4 (~22km)** บรรจุเข้าสู่ตู้เก็บสัมภาระของ **High-Priority Data Mule** ขนส่งข้ามอำเภอ
  - พัฒนาระบบลดขนาดการค้นหาอัตโนมัติ (Instant Collapse) เมื่อปลายทางตอบรับ Signed ACK กลับมา
- [ ] **Task 5.3: Deterministic Supernode Election Algorithm & LoRa Gateway Tier-1 Promotion**
  - พัฒนา `src/core/mesh/SupernodeElection.ts` คำนวณความเหมาะสมในการเป็นโหนดกระจายสัญญาณ (Score-based Election)
  - **LoRa Gateway Priority Override (Tier-1 Community Backbone):**
    - เครื่องที่มีการเชื่อมต่อกับกล่อง LoRa ฮาร์ดแวร์ส่วนตัว (Active BLE LoRa Companion Bridge) จะได้รับคะแนนโบนัสสูงสุด (+100 คะแนน) ได้รับการแต่งตั้งเป็น **Zone Tier-1 Backbone Gateway** อัตโนมัติ เพื่อทำหน้าที่เป็นเครื่องแม่ข่ายยิงข้อความข้ามเขาระยะไกล 10–20+ กม. ให้เพื่อนบ้านรอบตัว
  - **Smartphone Supernode Criteria:** แบตเตอรี่ > 50%, กำลังชาร์จไฟ (Wall/Car charger), มีหน่วยความจำเหลือ, เสถียรภาพการเชื่อมต่อ (สูงสุด 1 Master + 2 Standby Backups ต่อ H3 Res 7 Zone)
  - สลับสิทธิ์เป็น Normal Node อัตโนมัติเมื่อแบตเตอรี่ลดต่ำกว่า 30% (เว้นแต่กำลังชาร์จไฟหรือเชื่อมต่อ LoRa Gateway อยู่)

#### 🎯 Acceptance Criteria:
- Unit Test แปลงพิกัด GPS เป็น H3 Index ถูกต้องตามมาตรฐาน Uber H3 ครบทั้ง 4 ระดับ (Res 9, 7, 5, 4)
- ระบบจำลองสถานการณ์จำลองปลายทาง Offline สามารถสั่งขยายวงรังผึ้ง Res 9 -> 7 -> 5 -> 4 ตามช่วงเวลาที่กำหนดได้อย่างแม่นยำ 100%
- การเลือกตั้ง Supernode สลับบทบาทได้ทันทีเมื่อแบตเตอรี่ลดลงโดยไม่ทำให้การส่งต่อข้อมูลสะดุด

---

### 🔹 Phase 6: DTN Data Mule, Store-and-Forward & Velocity Tracker
**เป้าหมาย:** สถาปัตยกรรม Delay-Tolerant Networking (DTN) ขนส่งข้อมูลผ่านบุคคลและยานพาหนะเคลื่อนที่ ข้ามพื้นที่สัญญาณขาดหาย พร้อมระบบคืนชีพเครือข่าย

#### 📋 TaskList Detail:
- [ ] **Task 6.1: DTN Store-and-Forward Bundle Custody Engine**
  - พัฒนา `src/core/dtn/BundleStore.ts` พักแพ็กเก็ตลง Flash Memory นาน 5–7 วัน
  - ตรวจจับการพบเจอโหนดใหม่ (Peer Discovery) และทำการแลกเปลี่ยนเฉพาะข้อมูลที่โหนดปลายทางยังไม่มี
- [ ] **Task 6.2: Velocity Azimuth & Mobility Tracker**
  - พัฒนา `src/core/dtn/MobilityTracker.ts` วิเคราะห์เวกเตอร์ความเร็วและทิศทางของอุปกรณ์จาก GPS
  - หากอุปกรณ์เคลื่อนที่ด้วยความเร็ว 20–80 กม./ชม. (เช่น รถกู้ภัย/เรือ) ให้ยกสถานะเป็น **"High-Priority Data Mule"**
- [ ] **Task 6.3: Hop Freeze & Extended TTL Governance**
  - ปรับค่า Hop Count: ระหว่างถูกอุ้มโดย Data Mule จะไม่ลดทอน Hop Count (Hop Freeze)
  - นโยบาย Extended TTL: กำหนดอายุแพ็กเก็ตฉุกเฉิน SOS 7–14 วัน, ข้อความทั่วไป 3–7 วัน
- [ ] **Task 6.4: Network Healing & Re-anchoring Engine**
  - พัฒนาระบบสะพานส่งต่อข้อมูลกลับเข้าสู่ระบบคลาวด์/อินเทอร์เน็ตทันทีที่ Data Mule เดินทางเข้าสู่เขตมีสัญญาณ

#### 🎯 Acceptance Criteria:
- จำลองการเคลื่อนที่ของ Mule จากจุดอับสัญญาณไปยังเขตมีเน็ต ข้อความส่งต่อถึง Cloudflare D1 ครบถ้วน 100%
- Hop Freeze ทำงานถูกต้อง ไม่มีการทิ้งแพ็กเก็ตก่อนเวลาอันควรระหว่างการขนส่งข้ามอำเภอ

---

### 🔹 Phase 7: Android Native Layer, Foreground Service & Battery Duty Cycle
**เป้าหมาย:** พัฒนาระบบเบื้องหลังบน Android 14/15 ทำงานตลอด 24 ชั่วโมงไม่โดนระบบฆ่า พร้อมจัดการคลื่นความถี่ BLE สลับ 4-tier Ultra-Saver อัจฉริยะ

#### 📋 TaskList Detail:
- [ ] **Task 7.1: Android Foreground Service, Full-Screen Intent & Priority Popup Engine**
  - พัฒนา `android/app/src/main/java/.../MeshForegroundService.kt`
  - รัน Service พร้อม Persistent Notification แสดงสถานะ Mesh ตามข้อกำหนด Android 14+
  - บริหารจัดสรร WakeLock แบบไม่กินไฟ (สอดรับกับ Google Battery Optimization / Doze Mode)
  - **Priority-Based Popup Notification System (ระบบแจ้งเตือนป๊อปอัปตามลำดับความสำคัญ ⭐️):**
    - **Tier-1 Critical SOS (`0x01: SOS_BEACON`):**
      - สั่งเปิดหน้าจออัตโนมัติแม้ล็อกหน้าจอ/จอดับอยู่ด้วย **Android Full-Screen Intent**
      - แสดง **Emergency Overlay Modal** สีแดงเต็มจอ ทะลุผ่านโหมดห้ามรบกวน (Bypass Do Not Disturb / Silent Mode)
      - ส่งสัญญาณเสียงไซเรนกู้ภัยสั้นและสั่นรหัส Morse Code (`... --- ...`) พร้อมปุ่มกด *"กำลังไปช่วย"* และพิกัดระยะทางทันที
    - **Tier-2 Direct/Group Chat (`0x02`, `0x03`):**
      - เด้ง **In-App Toast Banner** ลอยลงมาเมื่อเปิดแอปอยู่
      - เด้ง **Heads-Up Notification** พร้อมปุ่มพิมพ์ตอบกลับด่วน (Quick Reply) เมื่อแอปอยู่เบื้องหลัง
    - **Tier-3 Crisis Feed (`0x04`):**
      - เด้ง **High-Priority Sticky Notification** สีส้ม/เหลืองเด่นชัด ไม่หายไปจนกว่าผู้ใช้จะกดอ่าน เพื่อไม่ให้พลาดประกาศเตือนภัยจากศูนย์อพยพ
- [ ] **Task 7.2: Hardware ScanFilter & BLE Radio Driver**
  - พัฒนา `BleRadioPlugin.kt` ใช้ Hardware BLE ScanFilter ดักจับ Service UUID เฉพาะระดับฮาร์ดแวร์
  - รองรับ BLE Advertising (Peripheral Mode) และ BLE Scanning (Central Mode) พร้อมกัน
- [ ] **Task 7.3: Adaptive 4-tier Battery Duty Cycle**
  - พัฒนา `src/core/battery/DutyCycleManager.ts` สลับโหมดการทำงานตามระดับแบตเตอรี่:
    - **Normal Mode (>50%):** สแกน 2.5s / หลับ 2.5s
    - **Saver Mode (20–50%):** สแกน 1.5s / หลับ 4.5s
    - **Low Mode (10–20%):** สแกน 1.0s / หลับ 9.0s
    - **Deep Hibernation (<10%):** สลีป 55–60 วินาที / ตื่นมายิง SOS สั้น 20–50ms ยืดอายุแบตเตอรี่ได้ 24–48 ชม.
- [ ] **Task 7.4: Direct Wi-Fi Direct / Local SoftAP Handshake**
  - พัฒนาระบบกระตุ้นเปิด Wi-Fi Direct อัตโนมัติเมื่อต้องการส่งรูปภาพ แผนที่ หรือไฟล์ขนาดใหญ่
- [ ] **Task 7.5: Protocol Bridge Adapters Layer (Meshtastic LoRa & Briar BTP Bridges)**
  - **Extensible Protocol Bridge Architecture (`src/core/adapters/`):**
    - ออกแบบ `IProtocolAdapter` Interface แบบเปิดกว้าง (Pluggable Architecture) เพื่อรองรับการเขียน Adapter เชื่อมต่อโพรโทคอลโอเพนซอร์สอื่นเพิ่มเติมได้ไม่จำกัดในอนาคต
  - **Meshtastic LoRa BLE Companion Bridge (`meshtasticAdapter.ts`):**
    - พัฒนาระบบเชื่อมต่อกับอุปกรณ์ฮาร์ดแวร์ภายนอก (กล่องบอร์ด LoRa ESP32 Meshtastic ส่วนตัว) ผ่าน BLE Client API
    - **Supernode / Gateway Auto-Promotion:** เมื่อแอปเชื่อมต่อกับกล่อง LoRa สำเร็จ เครื่องนั้นจะถูกยกระดับสถานะขึ้นเป็น **"Community Supernode / Long-Range Backbone Gateway"** อัตโนมัติ กลายเป็นเครื่องแม่ข่ายรับฝากข้อความ SOS และแชตจากมือถือชาวบ้านรอบตัว (30–50 ม.) แล้วส่งต่อออกทาง LoRa ยิงข้ามเขา/ข้ามเกาะ 10–20+ กม. ทันที
    - **Cross-Protocol Translation:** แปลงแพ็กเก็ต TOG v1.1 (`SOS_BEACON` / `DIRECT_CHAT`) เป็น Meshtastic Protobuf Packet แบบสองทิศทาง (Bi-directional Relay)
    - **Long-Distance Mountain Relay (10–20+ กิโลเมตร):** เมื่อโหนดมือถือ OutGrid Mesh ตรวจพบอุปกรณ์ Meshtastic รอบตัว จะใช้เสาอากาศ LoRa ช่วยยิงข้อความข้ามยอดเขา ข้ามเกาะ หรือข้ามอำเภอทันที
  - **Briar Bramble Transport Protocol (BTP) Bridge (`briarAdapter.ts`):**
    - รองรับสถาปัตยกรรมเชื่อมโยงกับ **Bramble Transport Protocol (BTP)** ของเครือข่าย **Briar (Open-Source GPLv3)**
    - **Peer-to-Peer Interoperability:** เชื่อมต่อและแลกเปลี่ยนข้อมูลผ่าน Bluetooth RFCOMM / Wi-Fi Local Socket กับแอปพลิเคชันหรือโหนด Briar ในรัศมีใกล้เคียง
    - **Asynchronous Forum / Crisis Feed & Message Forwarding:** ถ่ายโอนและแปลฟีดข่าวเตือนภัย ข้อมูลศูนย์พักพิง (`CRISIS_FEED`) และข้อความระหว่างบุคคลแบบ Store-and-Forward ข้ามไปยังโหนด Briar
    - **Tor Onion Egress Gateway:** ใช้ประโยชน์จากเครือข่าย Briar ซึ่งมีระบบ Tor Hidden Services ในการส่งข้อมูลหลุดข้ามพื้นที่ปิดกั้นอินเทอร์เน็ตออกสู่โลกภายนอก โดย OutGrid Mesh ทำหน้าที่เป็นด่านหน้ายิง SOS เร็ว (Fast Disaster SOS) ขณะที่ BTP รับหน้าที่เป็นท่อลับข้ามแดน (Anti-Censorship Egress)
  - **Next-Gen Wi-Fi HaLow Bridge (`halowAdapter.ts` - IEEE 802.11ah Sub-1GHz Ready):**
    - วางสถาปัตยกรรมรองรับคลื่นความถี่ต่ำ Sub-1 GHz (850–950 MHz) สำหรับดองเกิล USB-C หรือชิปโมดูล HaLow ยุคใหม่
    - **1km Single-Hop H3 Res 7 Coverage:** ส่งผ่านข้อมูลพิกัด SOS แผนที่ และข้อความได้ไกลถึง 1–1.5 กิโลเมตรใน 1 Hop ทะลุกำแพงตึกและป่าเขา ประหยัดพลังงานระดับ Ultra-Low Power
    - **High-Bandwidth Disaster Media Relay:** รองรับการส่งภาพถ่ายความเสียหายความละเอียดสูง และคลิปเสียงกู้ภัย (Opus Audio) ข้ามตำบลได้ทันทีโดยไม่ต้องเข้าใกล้แบบ Wi-Fi Direct ดั้งเดิม

#### 🎯 Acceptance Criteria:
- แอปสามารถรันในโหมดปิดหน้าจอบน Android ต่อเนื่องเกิน 24 ชั่วโมงโดยไม่ถูกระบบปิดกั้น
- การบริโภคแบตเตอรี่ในโหมด Deep Hibernation (<10%) ไม่เกิน 0.2% ต่อชั่วโมง
- ทดสอบเชื่อมต่อกล่อง Meshtastic เสมือน สามารถแปลงแพ็กเก็ต TOG v1.1 ไป-กลับ และส่งต่อข้อความ SOS ข้ามโครงข่าย LoRa ได้ถูกต้อง 100%
- โมดูล `briarAdapter.ts` รองรับโครงสร้าง BTP Framing และสามารถแปลงแพ็กเก็ตฟีดข่าว/ข้อความฉุกเฉินแลกเปลี่ยนกับโหนด Briar แบบสองทิศทางได้สมบูรณ์

---

### 🔹 Phase 8: Emergency Sideload APK, Acoustic Morse Siren & Optical Strobe
**เป้าหมาย:** ติดตั้งระบบส่งต่อตัวติดตั้งแอปแบบออฟไลน์ผ่าน Local HTTP/Wi-Fi พร้อมระบบส่งสัญญาณขอความช่วยเหลือฉุกเฉินด้วยเสียงไซเรนและไฟกระพริบ

#### 📋 TaskList Detail:
- [ ] **Task 8.1: Offline APK Sideloading (Built-in Embedded HTTP Server)**
  - พัฒนา Local Micro HTTP Server ภายในแอป (เช่น Port 8080)
  - สร้าง Wi-Fi SoftAP ชื่อ *"OutGrid-Rescue-APK"* ให้เครื่องข้างเคียงเชื่อมต่อแล้วดาวน์โหลด APK ได้โดยตรงผ่าน Browser
  - สร้างระบบแสดง QR Code เชื่อมต่อ Wi-Fi และเปิดหน้า Download ทันที
- [ ] **Task 8.2: Acoustic Audio Morse Code Beacon**
  - พัฒนาโมดูลยิงเสียงคลื่นความถี่สูง/เสียงไซเรนบีบคั้น (Audio Siren) แปลงข้อความพิกัดเป็นรหัส Morse Code
  - สามารถตรวจจับเสียง SOS ผ่านไมโครโฟนของเครื่องกู้ภัยในระยะ 50–100 เมตร
- [ ] **Task 8.3: Optical Emergency Strobe Torch**
  - พัฒนาระบบควบคุม Flashlight Hardware ให้กะพริบเป็นจังหวะ SOS สากล (`... --- ...`)
  - โหมดประหยัดพลังงานแสงสำหรับการมองเห็นเวลากลางคืนของทีมค้นหากู้ภัย

#### 🎯 Acceptance Criteria:
- สมาร์ตโฟนเครื่องอื่นที่ไม่มีแอป สามารถต่อ Wi-Fi ของเครื่องแม่ข่ายแล้วดาวน์โหลด APK ไปติดตั้งได้สำเร็จ 100%
- รหัส Morse Code จากลำโพงและไฟฉายกระพริบตรงตามมาตรฐาน SOS สากล

---

### 🔹 Phase 9: Cloudflare Spatial Signaling, Public STUN & Donation Dashboard
**เป้าหมาย:** พัฒนาระบบคลาวด์บน Cloudflare Workers + D1 ช่วยเชื่อมโยงโครงข่ายผ่านอินเทอร์เน็ตฟรี ไร้ค่าใช้จ่าย Server ด้วย Public STUN และหน้ารับบริจาคโปร่งใส

#### 📋 TaskList Detail:
- [ ] **Task 9.1: Zero-Cost Public STUN & P2P WebRTC Signaling Engine**
  - ผนวก Public STUN เซิร์ฟเวอร์ฟรีสากล (`stun.l.google.com:19302`, `stun.cloudflare.com:3478`)
  - พัฒนา WebRTC DataChannel สำหรับเชื่อมต่อ P2P ระหว่างผู้ใช้ที่เข้าถึงเน็ตได้ ข้าม NAT โดยไม่ผ่าน Media Relay
- [ ] **Task 9.2: Cloudflare Workers Spatial Signaling & D1 Spatial Table**
  - พัฒนา Worker รับส่ง Signaling SDP ขนาดเล็ก 1–2KB อิงตามพิกัด H3 Hexagon
  - สร้าง D1 Database จัดเก็บโหนดที่เปิดใช้งาน พร้อม API Heatmap แบบไม่เก็บข้อมูลส่วนบุคคล (Zero-PII)
- [ ] **Task 9.3: Transparent Community Donation Ledger & Dashboard**
  - พัฒนาหน้าแดชบอร์ดระดมทุนเพื่อมนุษยธรรม เชื่อมต่อ Open Collective / GitHub Sponsors / PromptPay
  - แสดงรายงานรายรับ-รายจ่ายของโครงสร้างพื้นฐานแบบ Open Ledger โปร่งใส 100%
- [ ] **Task 9.4: Dual-Tier Privacy & Responder Authentication (QR Delegation & Cloudflare Access SSO/OTP)**
  - **Dual-Tier Spatial Visibility Engine:**
    - **Public / Guest View (ประชาชน & สื่อมวลชน):** ซ่อนพิกัด GPS ละเอียด (Zero-PII) แสดงเฉพาะภาพรวมรังผึ้ง H3 Res 7 (~1.2km) และจุดปลอดภัย/ศูนย์พักพิง
    - **Incident Commander View (ทีมกู้ภัยทางการ):** ปลดล็อกพิกัดหลังคาบ้านแม่นยำระดับ 1–3 เมตร (Res 9/11) และคิว Triage ฉุกเฉิน
  - **Offline Field Delegation via QR (สแกน QR Code หน้างาน รับสิทธิ์ทันที):**
    - หัวหน้าทีมกู้ภัยที่มีสิทธิ์ สามารถกดสร้าง **Signed Delegation QR Code** (มีอายุ 24–48 ชม.) จากหน้าจอแดชบอร์ดหรือแอป
    - อาสาสมัครภาคสนาม / ทีมเรือ / เจ็ตสกี เพียงเปิดแอปมือถือสแกน QR Code ของหัวหน้า จะได้รับสิทธิ์กู้ภัยและปลดล็อกพิกัด Res 9 ทันทีในระดับออฟไลน์ 100% โดยไม่ต้องใช้อินเทอร์เน็ตและไม่ต้องรอแอดมินพิมพ์แจกรหัส
  - **Remote Backup Responders (ระบบ Emergency OTP / Single Sign-On ผ่าน Cloudflare Access):**
    - ผนวก **Cloudflare Zero Trust Access** สำหรับเจ้าหน้าที่สั่งการระยะไกลและหน่วยงานร่วม
    - ล็อกอินด้วย **One-Time Passcode (OTP)** ผ่านอีเมลองค์กรราชการ/กู้ภัยที่อนุญาตไว้ล่วงหน้า (Whitelist Domains เช่น `@disaster.go.th`, `@rescue.org`) หรือ SSO บัญชีหน่วยงาน โดย Admin ไม่ต้องคอยสร้างรหัสผ่านให้ทีละคน
- [ ] **Task 9.5: Zero-Cost Cloudflare Domain Architecture & Dynamic API Configuration**
  - **Production Zero-Cost Subdomain Architecture (ไม่ต้องซื้อโดเมน 100%):**
    - **Web Dashboard Frontend:** เผยแพร่ผ่าน **Cloudflare Pages** (`https://outgrid-rescue.pages.dev`) แบนด์วิดท์ฟรีไม่จำกัด ป้องกัน DDoS อัตโนมัติ
    - **Backend API & Spatial Signaling:** เผยแพร่ผ่าน **Cloudflare Workers** (`https://api.outgrid-mesh.workers.dev`) พร้อม HTTPS/TLS Certificate ฟรีระดับธนาคาร รองรับ 100,000 Request/วันฟรี
  - **Dynamic API Server Resolver & Custom Private Cloud (`src/core/network/ApiConfig.ts`):**
    - ฝังค่า Default Production Endpoint ชี้ไปยัง Cloudflare Workers
    - มีหน้าจอการตั้งค่า (Settings UI) ให้ผู้ใช้หรือหน่วยงานราชการสามารถระบุ Custom Signaling / Private Cloud URL ของตนเองได้อิสระ
    - **Offline-First Resilience:** หากต่อเน็ตไม่ได้หรือไม่พบเซิร์ฟเวอร์ ระบบจะไม่หยุดการทำงาน แต่จะ Fallback สู่โหมด BLE Mesh เต็มรูปแบบทันที
- [ ] **Task 9.6: Hybrid Gmail / Google OAuth2 Authentication Engine (Zero-Barrier Offline + Cloud Identity)**
  - **Web Dashboard Authentication (100% Mandatory Google/Gmail Login):**
    - บังคับล็อกอินด้วยบัญชี **Google / Gmail (OAuth 2.0 / OpenID Connect)** สำหรับการเข้าถึงระบบควบคุมส่วนกลาง, ดูพิกัดแม่นยำ (Res 9 Precision), และคิวสั่งการส่งทีมกู้ภัย ป้องกันบุคคลภายนอกเข้าถึงข้อมูลความลับ
  - **Android Mobile App Hybrid Authentication (`src/core/auth/AuthManager.ts`):**
    - **Life-Saving Zero-Barrier Offline Guest Mode:** เมื่อไม่มีสัญญาณอินเทอร์เน็ตในพื้นที่ภัยพิบัติ แอปเปิดให้ส่งสัญญาณฉุกเฉิน `SOS_BEACON`, ดูแผนที่ออฟไลน์, และแชต P2P ได้ทันที 100% โดยระบบสร้าง Local Ed25519 Identity ให้อัตโนมัติ ไม่มีการบล็อกหน้าจอ
    - **Connected Mode (Sign in with Google / Gmail):** เมื่อผู้ใช้มีอินเทอร์เน็ต สามารถกดเข้าสู่ระบบด้วย Gmail เพื่อ:
      - ซิงก์และสำรองข้อมูลกุญแจส่วนตัว (Key Backup & Recovery)
      - กำหนดรายชื่อเบอร์โทร/อีเมลแจ้งเตือนฉุกเฉินของครอบครัว (Emergency Contacts)
      - ส่งอีเมลแจ้งเตือนอัตโนมัติไปยังครอบครัวเมื่อสัญญาณเน็ตกลับมา ว่า *"บุคคลนี้ปลอดภัยแล้ว"*

#### 🎯 Acceptance Criteria:
- การเชื่อมต่อ WebRTC P2P ผ่าน Public STUN ข้ามเครือข่ายสำเร็จโดยไม่ต้องมีเซิร์ฟเวอร์ Relay
- D1 Database รองรับการบันทึกสถานะโหนด Spatial H3 และแสดงผล Heatmap อย่างถูกต้อง
- หน้าเว็บแยกมุมมอง Guest (เบลอพิกัด) และ Responder (พิกัดแม่นยำ) ได้ถูกต้อง 100%
- การสแกน QR Code หน้างานสามารถมอบสิทธิ์กู้ภัยแบบออฟไลน์สำเร็จ และระบบ OTP / SSO Cloudflare Access ตรวจสอบโดเมนอีเมลราชการได้อย่างแม่นยำ
- Web Dashboard ใช้งานได้ผ่าน `*.pages.dev` และ API รันผ่าน `*.workers.dev` พร้อมทั้งแอปมือถือสามารถสลับ Custom Server URL ได้อย่างถูกต้อง
- Web Dashboard บังคับล็อกอินด้วย Gmail สำเร็จ และแอป Android รองรับทั้งโหมด Guest ออฟไลน์ 100% และการผูกบัญชีด้วย Gmail ได้อย่างสมบูรณ์

---

### 🔹 Phase 10: Multiplatform UI/UX, 10 Global Languages & Disaster Drills
**เป้าหมาย:** พัฒนาหน้าจอการใช้งานระดับสากล รองรับ 10 ภาษาหลักทั่วโลก แผนที่ออฟไลน์ 5MB และซ้อมรับมือสถานการณ์ฉุกเฉินเสมือนจริง

#### 📋 TaskList Detail:
- [ ] **Task 10.1: Universal 10-Language Embedded i18n Engine**
  - พัฒนาระบบแปลภาษาออฟไลน์ (`src/ui/i18n/`) น้ำหนักเบา (<100KB JSON) บรรจุ 10 ภาษา:
    1. English (`en`) | 2. 中文 (`zh`) | 3. Español (`es`) | 4. हिन्दी (`hi`) | 5. العربية (`ar` - รองรับ RTL)
    6. Français (`fr`) | 7. Русский (`ru`) | 8. Português (`pt`) | 9. 日本語 (`ja`) | 10. ไทย (`th`)
  - ตรวจจับภาษาอัตโนมัติตาม Locale ของเครื่อง และสลับภาษาได้ทันทีโดยไม่ต้องต่อเน็ต
- [ ] **Task 10.2: Icon-Driven Disaster UI & Accessibility**
  - ออกแบบ UI แบบสัญลักษณ์สากล (Universal Icons) ใช้งานได้แม้ผู้ประสบภัยอ่านหนังสือไม่ออก
  - คอนทราสต์สูงพิเศษ (High Contrast Mode) สำหรับมองกลางแดดจ้าหรือในควันไฟ
  - ปุ่ม Emergency SOS สีแดงขนาดใหญ่ กดครั้งเดียวส่งพิกัดและกระจายสัญญาณฉุกเฉินทันที
- [ ] **Task 10.3: 3-Tier Smart Spatial Pyramid & Dual-Platform Offline Map Engine (Android & Web PWA)**
  - **สถาปัตยกรรมแผนที่ทั้งโลกขนาดเล็ก 3 ระดับ (3-Tier Smart Spatial Pyramid ไม่เกิน 25-30MB):**
    - **Level 1 (Global Low-Poly Basemap ~1.5MB):** เส้นเวกเตอร์ธรรมชาติ (Natural Earth) ขอบเขตทวีป มหาสมุทร และแนวเขตทุกประเทศทั่วโลก เปิดดูได้ทั้งโลกแบบออฟไลน์ 100%
    - **Level 2 (Regional Master Roads & Rivers ~3.5MB):** ฝังเส้นทางหลวงสายหลัก แม่น้ำ ลำคลอง และโรงพยาบาลศูนย์ประจำภูมิภาค/ประเทศ
    - **Level 3 (Local Geo-Fence On-Demand Cache ~5MB):** แคชแผนที่ซอยบ้านละเอียดรัศมี 15–30 กม. รอบพิกัดปัจจุบันของผู้ใช้ พร้อมระบบตัดทอน **FIFO Auto-Prune ไม่เกิน 50MB**
  - **100% Offline Map Architecture (ทั้งบน Android App และ Web PWA):**
    - **ฝั่ง Android:** ฝังไฟล์ Vector Basemap บีบอัด (`vector-basemap.pbf` $\le 5\text{MB}$) ใน Local Asset เปิดอ่านได้ทันทีแม้เปิดโหมดเครื่องบิน (No SIM / No Internet 100%)
    - **ฝั่ง Web Dashboard:** พัฒนาระบบ **Service Worker + Cache Storage API / IndexedDB** แคชไฟล์แผนที่และ H3 Grid ลงในเบราว์เซอร์อัตโนมัติ เข้าเว็บครั้งเดียว ครั้งต่อไปไม่มีเน็ตก็เปิดดูแผนที่และพิกัดได้แบบ Offline PWA ทันที
  - **OpenStreetMap (OSM) + Pure Math H3 Hexagon Overlay:**
    - ตารางรังผึ้ง H3 ไม่ใช้พื้นที่ไฟล์เก็บรูปภาพ แต่คำนวณผ่านสูตรคณิตศาสตร์สดๆ (`h3-js` `cellToBoundary`) ครอบคลุมทุกตารางนิ้วบนโลกใบนี้แบบ 0 ไบต์
    - ซ้อนทับ GeoJSON Polygons บนแผนที่ OSM แบบเรียลไทม์ (Zoom 14+ = Res 9 ~100m, Zoom 11-13 = Res 7 ~1.2km, Zoom <10 = Res 5 ~8.5km)
  - **Live Anonymous Heatmap & SOS Radar:**
    - ระบายสีช่องหกเหลี่ยมตามความหนาแน่นสัญญาณจริง (เขียว/เหลือง/ส้ม/แดง) พร้อมปักหมุดตำแหน่งตนเอง และหมุดขอความช่วยเหลือ SOS สีแดงชัดเจน
- [ ] **Task 10.4: End-to-End Disaster Simulation & Field Drills**
  - จำลองสถานการณ์ไฟดับ-เสาสัญญาณล่ม (Simulated Blackout): โหนด 20 เครื่องส่งต่อข้อความ SOS และตำแหน่งข้ามอาคาร
  - ตรวจสอบความถูกต้องของสถิติ Network Heatmap บน Web Dashboard
- [ ] **Task 10.5: 10-Language Emergency User Manual & In-App Field Survival Guide**
  - จัดทำคู่มือการใช้งานฉบับสมบูรณ์และคู่มือการเอาตัวรอดจากภัยพิบัติฉุกเฉินครบ **10 ภาษาหลักสากล** ทั้งบน Web Dashboard และฝังใน App (Offline Accessible 100%):
    1. **English (`docs/manuals/manual.en.md`):** Quickstart, SOS Broadcast, BLE Mesh Setup & Troubleshooting
    2. **中文 (`docs/manuals/manual.zh.md`):** 离线网状网连接、一键SOS呼救、离线APK局域网快传与避难指南
    3. **Español (`docs/manuals/manual.es.md`):** Red Mesh Sin Internet, Botón de Pánico SOS y Guía de Rescate
    4. **हिन्दी (`docs/manuals/manual.hi.md`):** बिना इंटरनेट आपातकालीन संचार, SOS प्रसारण और सुरक्षा निर्देश
    5. **العربية (`docs/manuals/manual.ar.md`):** شبكة الطوارئ بدون إنترنت، نداء الاستغاثة SOS ودليل النجاة (RTL Layout)
    6. **Français (`docs/manuals/manual.fr.md`):** Réseau Maillé d'Urgence, Alerte SOS et Guide de Survie Hors-ligne
    7. **Русский (`docs/manuals/manual.ru.md`):** Автономная ячеистая связь, сигнал бедствия SOS и инструкция по эвакуации
    8. **Português (`docs/manuals/manual.pt.md`):** Rede Mesh Offline, Transmissão SOS e Manual de Sobrevivência
    9. **日本語 (`docs/manuals/manual.ja.md`):** オフライン災害メッシュ通信、ワンタップSOS発信、避難所連携ガイド
    10. **ไทย (`docs/manuals/manual.th.md`):** การเชื่อมต่อ Mesh ไร้เน็ต, การส่ง SOS ฉุกเฉิน, การแชร์ APK ออฟไลน์ และคู่มือการเอาชีวิตรอด
  - พัฒนาหน้าจอในแอป `HelpManualScreen.tsx` เรนเดอร์คู่มือออฟไลน์ผ่าน Markdown Parser ขนาดจิ๋ว (<15KB) เปิดอ่านได้ทันทีแม้ปิดเน็ตหรืออยู่ในโหมดเครื่องบิน
  - มีสัญลักษณ์ภาพประกอบ (Infographic Diagrams) ขั้นตอน: 1. เปิดบลูทูธ 2. กดปุ่ม SOS แดง 3. แสกน QR แจกแอปเพื่อน

#### 🎯 Acceptance Criteria:
- สลับภาษาทั้ง 10 ภาษาได้สมบูรณ์ ภาษาอารบิก (Arabic) แสดงผลจัดหน้าจากขวาไปซ้าย (RTL) ถูกต้อง 100%
- การจำลองสถานการณ์ฉุกเฉิน 20 โหนด สามารถส่งต่อข้อความ SOS ไปยังโหนดปลายทางที่มีเน็ตได้สำเร็จครบถ้วน


---

## 5. แผนการตรวจสอบและทดสอบระบบ (Verification & Testing Plan)

### 5.1 Automated Tests (100% Coverage Target)
- **Unit Tests:**
  - Compact Binary Serialization/Deserialization (ตรวจสอบขนาด Payload ≤ 28 bytes)
  - Cryptography Engine (ECDH Key Exchange, AES-GCM Encrypt/Decrypt Overhead +28B, Ed25519 Sign/Verify)
  - Counting Bloom Filter & LRU Cache (ทดสอบการดักจับ Duplicate Storm 1,000+ packets)
  - Adaptive Density Hop & Dynamic Hop Decay (ทดสอบการสลับ Hop 3–7 ในเมือง vs 12–15 ในชนบท และ Dynamic Clamping)
  - 3-Level Spatial H3 Hierarchy & Fallback (ทดสอบการหา Parent `h3ToParent` Res 9 $\rightarrow$ Res 7 $\rightarrow$ Res 5)
  - Reverse Delivery ACK & NACK Engine (ทดสอบสร้างใบเสร็จยืนยันปลายทางและการล้างแคช Auto-Prune)
  - Tiered TTL & Storage Quota Clamping (ทดสอบ FIFO ลบข้อความกลุ่มเก่าทิ้งเมื่อครบ 50 MB และปกป้อง SOS 72 ชม.)
  - Image Compression Engine (ทดสอบลดขนาดรูปภาพเหลือ 5–15 KB และ 20–40 KB WebP)
  - Local SQLite & D1 Database Mapping (ทดสอบการบันทึกและจับคู่โหนดปลายทาง)
  - Battery Policy State Transitions (จำลองสถานการณ์แบตเตอรี่ >50%, 20-50%, <20%)
  - Local HTTP Server & QR Code Generation (ทดสอบสร้าง Wi-Fi QR Payload และตรวจสอบ SHA-256 Checksum)
- **Integration Tests:**
  - 5-second Server Timeout & Auto-fallback Simulation
  - Multi-hop Mesh Relay Simulation (จำลองการส่งข้อมูลผ่าน 3-5 โหนดเสมือน)
  - Anti-Ghosting Loop Simulation (จำลองโหนดวิ่งวนเพื่อยืนยันว่า Hop นับถอยหลังและตัดวงจรได้จริง)
  - End-to-End DTN Data Mule & Reverse ACK Flow (จำลองพาหนะขนข้อความข้ามโซนและส่งมอบ Zero-click พร้อมตีกลับใบเสร็จ)
  - Deferred Sync Queue (จำลองสถานะ Offline -> บันทึก SQLite -> Online -> Batch Upload)
  - Offline APK Sideload Flow (จำลองการร้องขอไฟล์ APK จาก Local Server เสมือน)

- **Syntax & Lint:**
  - รัน `node -c` หรือ script syntax validation ก่อนการส่งมอบทุกครั้ง

### 5.2 Manual & Simulation Verification
- ทดสอบปิดเครือข่ายอินเทอร์เน็ต (Airplane mode / Sim down) และจับเวลาการสลับโหมดเข้าสู่ Disaster Mesh ภายใน 5 วินาที
- ทดสอบ One-Tap SOS และตรวจสอบการแสดงผลบน Crisis Feed ของโหนดข้างเคียง
- ตรวจสอบความถูกต้องของ UI ทั้งในสถานะ Guest และ Logged-in ผู้ใช้งาน

---

## 6. ยุทธศาสตร์โอเพนซอร์สเพื่อมนุษยธรรมและการระดมทุนบริจาค (Humanitarian Open Source & Donation Sustainability)

### 6.1 สัญญาอนุญาตสาธารณะเพื่อชุมชนและสิทธิ์ผู้สร้างสรรค์ (AGPL v3.0 & Intellectual Property)
- **เจ้าของลิขสิทธิ์และสถาปนิกผู้ออกแบบ (Copyright Holder & Lead Architect):** **Thabot** (<thabo47@gmail.com>) (สงวนสิทธิ์ทางปัญญาในสถาปัตยกรรมและโพรโทคอล TOG v1.1 ทั้งหมด)
- **ช่องทางติดต่ออย่างเป็นทางการ (Official Contact & Commercial Inquiries):** `thabo47@gmail.com`
- **สัญญาอนุญาตทางการ:** **GNU Affero General Public License v3.0 (AGPL v3.0)** ควบคู่กับ **Commercial Dual-Licensing**
- **สัญญาอนุญาตทางการ:** **GNU Affero General Public License v3.0 (AGPL v3.0)**
- **เจตนารมณ์ไม่แสวงหาผลกำไร (Non-Profit Humanitarian Public Good):**
  - ตัวแอปและโพรโทคอลถูกสร้างขึ้นเพื่อให้ **ประชาชน ชุมชน มูลนิธิ และทีมกู้ภัยทั่วโลก ใช้งานได้ฟรีตลอดชีพ 100%** โดยไม่มีโฆษณา ไม่เก็บค่าบริการ และไม่มีการขายข้อมูลส่วนบุคคล
- **เกราะป้องกันกลุ่มทุนและบริษัทใหญ่ชุบมือเปิบ (Network Copyleft):**
  - กฎหมาย AGPL v3.0 ระบุเงื่อนไขเด็ดขาดว่า หากบริษัทโทรคมนาคม ค่ายมือถือ หรือบริษัทคลาวด์ยักษ์ใหญ่ใด นำโค้ด OutGrid Mesh ไปติดตั้งเพื่อเปิดให้บริการเชิงพาณิชย์แก่ลูกค้า **บริษัทนั้นถูกบังคับตามกฎหมายทันทีให้ต้องเปิดเผย Source Code ทั้งหมดของระบบตนเองสู่สาธารณะ**
  - ช่วยสกัดกั้นไม่ให้กลุ่มทุนขโมยเทคโนโลยีกู้ภัยของประชาชนไปผูกขาดหรือหาผลประโยชน์ส่วนตัวได้อย่างเด็ดขาด
- **Infrastructure ฟรีบน GitHub:**
  - **GitHub Releases:** แจกจ่ายไฟล์ `OutGridMesh.apk` ฟรีทั่วโลก
  - **GitHub Actions (CI/CD):** ทดสอบและ Build อัตโนมัติทุกครั้งที่ Commit สู่ `uat`
  - **Community Security Auditing:** เปิดให้ชุมชนนักพัฒนาช่วยกันตรวจสอบความปลอดภัยของ Cryptography อย่างโปร่งใส

### 6.2 ความยั่งยืนของเซิร์ฟเวอร์แม่ข่ายด้วยระบบบริจาค (Community Crowdfunding & Transparent Donation)
เนื่องจากระบบใช้ **สถาปัตยกรรม True P2P + Public STUN ฟรี + Cloudflare Serverless จิ๋ว** ทำให้ค่าใช้จ่ายเซิร์ฟเวอร์แม่ข่ายต่ำมากแม้มีผู้ใช้ระดับโลก:

1. **ระบบรับบริจาคเพื่อมนุษยธรรม (Community Donation via Open Collective / GitHub Sponsors / PromptPay):**
   - เปิดให้ประชาชน หน่วยกู้ภัย และผู้มีจิตศรัทธา ร่วมสนับสนุนค่าบำรุงรักษาเซิร์ฟเวอร์แม่ข่ายตามความสมัครใจ
   - **ประมาณการค่าใช้จ่ายจริง:**
     - ผู้ใช้ 1,000,000 คน: ค่าใช้จ่ายเพียง ~$5 – $15/เดือน (~175 – 500 บาท)
     - ผู้ใช้ระดับโลก 10,000,000 คน: ค่าใช้จ่ายเพียง ~$40 – $80/เดือน (~1,400 – 2,800 บาท)
   - การรับบริจาคเพียงเล็กน้อยจากชุมชนก็เพียงพอที่จะหล่อเลี้ยงเซิร์ฟเวอร์แม่ข่ายทั้งระบบได้อย่างยั่งยืนตลอดชีพ
2. **Transparent Expense Ledger (บัญชีโปร่งใสตรวจสอบได้):**
   - มีหน้า Dashboard แสดงค่าใช้จ่ายจริงของคลาวด์เทียบกับยอดเงินบริจาคคงเหลือแบบ Real-time
   - หากมียอดบริจาคคงเหลือ จะนำไปจัดซื้ออุปกรณ์ฮาร์ดแวร์จริง เช่น บอร์ด **ESP32 Solar Repeater** มอบให้แก่ชุมชนในพื้นที่เสี่ยงภัยน้ำท่วม/ดินถล่มในถิ่นทุรกันดาร
3. **P2P Federation (การกระจายภาระแม่ข่าย):**
   - เปิดให้มหาวิทยาลัย, เทศบาล, หรือศูนย์กู้ภัยท้องถิ่น สามารถรันแม่ข่ายประจำจังหวัดเพื่อช่วยกระจายภาระค่าใช้จ่ายและทำให้เครือข่ายไม่มีวันล่ม

---

## 7. ข้อกำหนดการทำงานและการส่งมอบ (Compliance & Delivery Rules)
- **Git Branch:** เมื่อพัฒนาและทดสอบผ่าน 100% แล้ว จะทำการ Commit และ Push ไปยัง branch `uat` เท่านั้น (ไม่ Push ไป `main` โดยตรง)
- **UI Integrity:** ไม่ลบปุ่มหรือคอมโพเนนต์เดิม คงความสมบูรณ์ 100% สำหรับผู้ใช้ทั้ง Guest และ Authenticated User
- **Comprehensive Delivery:** พัฒนาระบบให้ครบถ้วนเชื่อมโยงทั้ง End-to-End ตามโครงสร้าง v6.1

