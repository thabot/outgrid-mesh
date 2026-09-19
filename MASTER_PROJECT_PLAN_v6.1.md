# แผนงานโครงการฉบับสมบูรณ์ (Master Project Plan v6.1)
### Disaster-Resilient & Production-Ready Edition: OutGrid Mesh


┌──► [ 1-on-1 Unicast ] ──────► E2EE (ECDH + AES-GCM) + Edge Relay
[ Multi-Mode Messaging ] ─────────┼──► [ Local Broadcast / SOS ] ──► Compact Binary (Protobuf/CBOR) + Epidemic Gossip
                                  └──► *(Group Chat ถอดไปบรรจุใน Roadmap v2.0)*

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
| **1. Emergency & SOS** | **One-Tap SOS Beacon:** พิกัด GPS (Lat/Lng), H3 Index, ระดับแบตเตอรี่, สถานะผู้ประสบภัย (เด็ก/คนแก่/ผู้ป่วย/ขาดออกซิเจน) พร้อม **Optional SOS Note (จำกัดเด็ดขาด $\le 280$ ตัวอักษร)** หรือ Voice SOS (15s) | $\le 28$ bytes (Beacon)<br>+ Note $\le 280$ chars | **Bluetooth 5 Long Range (LE Coded PHY)**<br>*(Fallback: BLE 1M Legacy)* | ส่งทันทีไร้การจับคู่ รัศมีทะลุทะลวง **200–400+ เมตร** (ที่โล่งแตะ 500 ม.) กินไฟต่ำสุด เซ็นกำกับด้วย Ed25519 กันปลอม |
| **2. Text & Chat** | **1-on-1 Private Messages (E2EE):** แชตส่วนบุคคลเข้ารหัส AES-256-GCM สองชั้น โหนดตัวกลางอ่านไม่ได้ (Security Overhead เพียง +28 bytes: IV 12B + Tag 16B) *(หมายเหตุ: Group Chat ถอดไปพัฒนาใน Roadmap v2.0)* | **จำกัดเด็ดขาด $\le 280$ ตัวอักษร**<br>(Hard Limit ห้ามส่งเกิน) | **Bluetooth 5 Long Range (LE Coded PHY)**<br>+ Extended Adv & Epidemic Gossip | ส่งข้อความแชตตัวหนังสือข้ามตึก/ซอกซอยระยะไกล **200–400 เมตร/ทอด** รวดเร็วในเสี้ยววินาที ไร้เน็ต 100% |
| **3. Broadcast / Crisis** | **Offline Crisis Feed:** ประกาศเตือนภัย, ข่าวสารอพยพ พร้อมลายเซ็นดิจิทัล Ed25519 ป้องกันข่าวปลอม | **จำกัดเด็ดขาด $\le 280$ ตัวอักษร**<br>(Hard Limit ห้ามส่งเกิน) | **BT 5 Long Range Epidemic Broadcast** | กระจายข่าวสารรอบทิศทางในรัศมี 200–400 เมตร ทุกโหนดรับรู้พร้อมกัน |
| **4. Voice Messages** | **คลิปเสียงสั้น (Push-to-Talk Voice Memo):** บันทึกเสียงแจ้งเหตุด้วย Opus Codec (Voice Mono 6–12 kbps) สำหรับผู้บาดเจ็บ/สูงอายุ **(พร้อมระบบ Preview & กดยืนยันส่งเสมอ)** | **ความยาวสูงสุด 15 วินาที**<br>(~8 KB – 15 KB, ตัดจบอัตโนมัติ) | **BLE Chunks หรือ Wi-Fi Direct** | บันทึกสูงสุด 15 วิ ผู้ใช้กดฟังทวนซ้ำได้ และ **ต้องกดยืนยันส่งด้วยตนเองเสมอ** ส่งผ่าน BLE ถึงใน 3–5 วินาที |
| **5. Image Compression** | **ภาพถ่ายความเสียหาย (Client-Side Auto-Compress Engine):**<br>- 🔴 **Ultra-Low Emergency (Default):** 320x240 WebP<br>- 🟡 **Standard Disaster:** 640x480 WebP<br>- 🟢 **High Detail (เน็ต/Wi-Fi มา):** 1280x720 WebP | <br>**5 KB – 12 KB**<br>**18 KB – 35 KB**<br>80 KB – 150 KB | <br>**BLE Mesh ส่งได้ทันทีใน 1-2s!**<br>**Wi-Fi Direct P2P (1s)**<br>Wi-Fi / Cloud Sync | **ผู้ใช้เลือกรูปขนาดเท่าไหร่ก็ได้ ระบบย่อและแปลงเป็น WebP ในเครื่องทันทีก่อนส่ง** เห็นสะพานขาดชัดเจน<br>*(🚫 วิดีโอปิดกั้นในโหมดออฟไลน์เพื่อรักษาแบตเตอรี่)* |
| **6. App Sideloading** | **ตัวติดตั้งแอปเต็ม (`OutGridMesh.apk`):** ส่งต่อแอปให้เครื่องข้างเคียงผ่าน Web Browser โดยตรง | 15 - 30 MB | **Local Wi-Fi Hotspot + QR Code** | อีกเครื่องใช้แค่กล้องสแกน QR โหลดผ่าน Chrome ได้เลย |
| **7. Physical Signals** | **Acoustic Siren & Flash Strobe:** เสียงไซเรนความถี่สูง/อัลตราโซนิก (ใต้ซากตึก) + แฟลช LED SOS | - | **Phone Speaker & Camera LED** | ใช้ค้นหาด้วยเสียงและสายตาในความมืด |

---

## 2. ภาพรวมสถาปัตยกรรมระบบ (System Architecture Overview)


```
┌────────────────────────────────────────────────────────────────────────┐
│                        OutGrid Mesh Client Architecture                │
│                                                                        │

│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     UI / Presentation Layer                    │   │
│   │  [One-Tap SOS]  [Offline Crisis Feed]  [Diagnostics Dashboard] │   │
│   │  [1-on-1 Chat]                         [Offline Map & H3 Tile] │   │
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
   - `0x03` (`GROUP_CHAT`): ข้อความกลุ่มชุมชนเฉพาะพื้นที่ ถอดรหัสด้วย Group Key *(สงวนไว้สำหรับ Roadmap v2.0)*
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

#### 🖥️ จำนวนเครื่อง Server และสถานที่รัน (Server Count & Deployment Locations Specification)
> **สรุปสำคัญด้านฮาร์ดแวร์และค่าใช้จ่าย (Core Cost & Infrastructure Summary):**
> - **จำนวนเครื่อง Server ที่ต้องสร้าง/เช่าซื้อ (Dedicated/VPS Cloud Boxes):** **`0 เครื่อง`** (ไม่ต้องเช่า AWS EC2, DigitalOcean, หรือเครื่อง On-premise แม้แต่เครื่องเดียว จึงไม่มีค่าเช่าเซิร์ฟเวอร์รายเดือน $0 บาทตลอดชีพ)
> - **สถาปัตยกรรม:** **Zero-Cost Serverless & Edge-First Architecture** รันแบบกระจายตัวบน Edge Cloudflare และโครงข่าย P2P ไม่ล่มตามไฟดับในพื้นที่ภัยพิบัติ

| ลำดับ | ส่วนประกอบของระบบ | รันไว้ที่ไหน (Location & Platform) | หน้าที่การทำงาน | รูปแบบค่าบริการ (Cost) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Web Dashboard ศูนย์กู้ภัย (Frontend)** | **Cloudflare Pages**<br>*(Anycast CDN 300+ เมืองทั่วโลก รวมศูนย์ BKK)* | ให้เจ้าหน้าที่กู้ภัยและประชาชนเปิดดูแผนที่เรดาร์ และสถานะผู้ประสบภัยผ่านเว็บเบราว์เซอร์ (`https://outgrid-rescue.pages.dev`) | **ฟรี 100%**<br>(Unlimited Bandwidth & DDoS Protection) |
| **2** | **API Gateway & Real-Time Engine (Backend)** | **Cloudflare Workers**<br>*(Edge V8 Isolates ทั่วโลก Latency 5-15ms)* | • รับพิกัด SOS / Presence Heartbeat<br>• สตรีมสัญญาณสดเข้าจอศูนย์กู้ภัยผ่าน SSE<br>• ตรวจสอบลายเซ็น Ed25519 & ป้องกัน Replay Attack<br>• รับ Inbound Webhook แจ้งเตือนภัยพิบัติ (CAP v1.2) | **ฟรี 100%**<br>(รองรับได้ถึง 100,000 requests/วัน บน Free Tier) |
| **3** | **ฐานข้อมูลเชิงพื้นที่ (Spatial Mesh DB)** | **Cloudflare D1**<br>*(Serverless Distributed SQLite Edge)* | บันทึกตาราง `active_nodes`, `node_neighbors`, `passkey_credentials`, `user_contacts` โดยมีระบบ Write Coalescing Buffer ประหยัดโควตา | **ฟรี 100%**<br>(โควตาอ่าน 5M reads/day, เขียน 100k writes/day) |
| **4** | **ที่จัดเก็บไฟล์ดาวน์โหลด (Storage)** | **Cloudflare R2**<br>*(S3-Compatible Object Storage)* | โฮสต์ไฟล์ติดตั้ง `OutGridMesh.apk` และ `vector-basemap.pbf` ให้ดาวน์โหลดได้ทั่วโลก | **ฟรี 100%**<br>(ไม่มีค่า Egress Bandwidth 100%) |
| **5** | **ระบบเชื่อมต่อ Peer-to-Peer (WebRTC)** | **Google & Cloudflare Public STUN**<br>• `stun.l.google.com:19302`<br>• `stun.cloudflare.com:3478` | ช่วยให้เครื่องที่ต่อเน็ตได้สามารถส่งข้อมูลหากันแบบ P2P ทะลุไฟร์วอลล์ (NAT) ได้โดยตรง โดยไม่ต้องส่งข้อมูลผ่าน Media Relay Server | **ฟรี 100%**<br>(ใช้ฟรีผ่าน Public Infrastructure สากล) |
| **+** | **Offline Hotspot Web Server** | **ฝังอยู่ในมือถือสมาร์ตโฟนของผู้ใช้ทุกคน**<br>*(Local Nano HTTP & DNS Server)* | เมื่อเปิดโหมดแชร์ออฟไลน์ มือถือจะรัน Web Server ในตัวเอง (Port 8080) เพื่อแจกไฟล์ APK ให้คนรอบข้างดาวน์โหลดโดยไม่ต้องมีอินเทอร์เน็ต | **ไม่มีค่าใช้จ่าย**<br>(ทำงานออฟไลน์ 100% บนเครื่องโทรศัพท์) |

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
│   │   │   ├── VoiceRecorderModal.tsx     # อัดเสียง 15s + นับถอยหลัง + Preview ฟังซ้ำ + กดยืนยันส่ง
│   │   │   ├── ImageCompressorModal.tsx   # พรีวิวรูปและบีบอัด Auto-WebP (5-12KB) ก่อนส่ง
│   │   │   ├── PasskeyModal.tsx           # สแกนลายนิ้วมือ/FaceID ผูกบัญชีและกู้คืนรายชื่อเพื่อนฟรี
│   │   │   ├── H3OfflineMap.tsx           # เรนเดอร์ Vector Basemap 5MB + หกเหลี่ยม H3
│   │   │   ├── DeliveryBadge.tsx          # แสดงไอคอนสถานะ 5 ขั้น (ส่ง/ฝาก/ติ๊กถูกคู่)
│   │   │   └── BatteryIndicator.tsx       # แสดงโหมด Duty Cycle ตามระดับแบต
│   │   ├── screens/                       # Main Pages
│   │   │   ├── EmergencyScreen.tsx        # หน้าหลักกู้ภัย (SOS, สัญญาณไซเรน, ไฟกระพริบ)
│   │   │   ├── ChatListScreen.tsx         # รายชื่อแชต 1-on-1 และผู้ติดต่อที่ยืนยันแล้ว
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
**เป้าหมาย:** วางรากฐานวิศวกรรมซอฟต์แวร์ระดับโลกแบบ **Strict Clean Architecture (Hexagonal / Ports & Adapters Architecture)** แยกแกนหลักทางคณิตศาสตร์และตรรกะโครงข่าย (Pure Core Domain) ออกจาก Native Hardware (Android/BLE), Browser DOM, และ Cloud APIs โดยสิ้นเชิง พร้อมวางระบบ Quality Gates ตรวจสอบอัตโนมัติ 100% ตั้งแต่วินาทีแรก

#### 📋 TaskList Detail:
- [ ] **Task 1.1: Git Repository & Workspace Infrastructure**
  - **Branch Governance & Strict Workflow:**
    - กำหนดสาขาการพัฒนาหลักเป็น **`uat`** อย่างเคร่งครัด (ห้าม Commit หรือ Push สู่ `main` โดยตรงเด็ดขาด จนกว่าจะผ่านการตรวจสอบ UAT 100%)
    - ติดตั้งระบบ Tagging มาตรฐาน Semantic Versioning (`v1.0.0-rc1`, `v1.1.0`)
  - **Comprehensive Disaster-Grade `.gitignore`:**
    - ปกป้องไฟล์ความลับขั้นสูงสุด: กรอง Private Keystores (`*.jks`, `*.keystore`), Private Keys (`*.pem`, `*.key`), Mnemonic Phrases, `.env*`
    - กรองไฟล์ Build Artifacts ของทุกแพลตฟอร์ม:
      - **Node/Vite:** `node_modules/`, `dist/`, `.svelte-kit/`, `.vite/`
      - **Android Native:** `android/app/build/`, `.gradle/`, `local.properties`, `captures/`, `*.apk`, `*.aab`
      - **Capacitor Shell:** `capacitor.settings.json`
      - **Cloudflare Serverless:** `.wrangler/`, `.mf/`

- [ ] **Task 1.2: Strict TypeScript & Zero-Leak Clean Architecture Scaffold**
  - **Strict Compiler Configuration (`tsconfig.json`):**
    - เปิดการตรวจสอบประเภทข้อมูลขั้นสูงสุด:
      - `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`
      - `"exactOptionalPropertyTypes": true`, `"noImplicitReturns": true`, `"noFallthroughCasesInSwitch": true`
      - `"target": "ES2022"`, `"moduleResolution": "bundler"`, `"useDefineForClassFields": true`
    - กำหนด **Path Aliases** ป้องกัน Relative Path พันกัน:
      - `@core/*` $\rightarrow$ `src/core/*` (Pure Domain Logic)
      - `@platform/*` $\rightarrow$ `src/platform/*` (Native Plugins & Web Adapters)
      - `@ui/*` $\rightarrow$ `src/ui/*` (Presentation & Components)
  - **Hexagonal Domain Isolation (Ports & Adapters Boundary Guard ⭐️):**
    - **`src/core/` (Pure Core Engine 100%):**
      - **Zero Platform Leak:** ห้าม Import `window`, `document`, `@capacitor/*`, `localStorage`, `android.*` หรือ Web APIs อื่นๆ เด็ดขาด
      - พัฒนาด้วย Pure TypeScript / Uint8Array เท่านั้น เพื่อให้สามารถรันบน Node.js, Bun, Cloudflare Workers, Android V8, หรือแม้แต่ ESP32 QuickJS ได้ทันที
    - **Ports & Interfaces (`src/core/interfaces/`):**
      - `IRadioDriver.ts`: สัญญาสำหรับส่ง/รับข้อมูลระดับบิต (BLE Long Range, Wi-Fi Direct, Mock Radio)
      - `IStorageDriver.ts`: สัญญาสำหรับบันทึกข้อมูล (SQLite Native, IndexedDB Web, In-Memory Test)
      - `IKeystoreDriver.ts`: สัญญาสำหรับ Hardware Keystore (Android TEE, WebCrypto Subtle)
      - `IGpsDriver.ts`: สัญญาสำหรับดึงพิกัดภูมิศาสตร์ (Android FusedLocation, Web Geolocation)
    - **Adapters (`src/platform/`):**
      - นำ Ports มาต่อประสานเข้ากับฮาร์ดแวร์จริง เช่น `CapacitorBleAdapter.ts`, `WebCryptoStorageAdapter.ts`

- [ ] **Task 1.3: Quality Gates, Static Analysis & Automated Tooling**
  - **Sub-Second Core Unit Testing Engine (`bun test` / Vitest):**
    - คอนฟิกชุดทดสอบสำหรับ `src/core/` ให้รันเสร็จสิ้นในเวลาไม่เกิน **300ms – 1 วินาที**
    - สร้างโครงสร้าง `tests/unit/core/` ครอบคลุม: Bitfield Serialization, CRC-16, Cryptography, Bloom Filter, และ H3 Math
  - **Pre-Commit Syntax & Lint Guard (`scripts/checkSyntax.js` ⭐️):**
    - พัฒนาสคริปต์สแกนตรวจสอบความถูกต้องทางไวยากรณ์ (Syntax Verification) อัตโนมัติ:
      - ตรวจสอบ AST Parsing ผ่าน Node.js / TypeScript Compiler API
      - สแกนทุกไฟล์ `.ts`, `.js`, `.json` ใน `src/`, `scripts/`, `tests/`
      - บังคับรัน `node scripts/checkSyntax.js` ก่อนทำการ Commit ทุกครั้ง หากพบ Error แม้แต่จุดเดียวจะปฏิเสธการ Commit ทันที
  - **Continuous Integration (CI) Pipeline Blueprint (`.github/workflows/ci.yml`):**
    - สเต็ปที่ 1: Checkout Branch `uat`
    - สเต็ปที่ 2: รัน Syntax Check (`node scripts/checkSyntax.js`)
    - สเต็ปที่ 3: รัน Core Unit Tests (`bun test`) ด้วยเป้าหมาย 100% Pass
    - สเต็ปที่ 4: ตรวจสอบ Boundary Leak (ใช้ ESLint กฎ `no-restricted-imports` สกัดกั้นไม่ให้ `src/core/` มีการเรียกใช้ Platform APIs)

- [ ] **Task 1.4: Universal Error Handling, Telemetry & Logging Architecture**
  - พัฒนา `src/core/utils/Logger.ts` และ `src/core/errors/MeshError.ts`:
    - **Structured Log Levels:** `DEBUG`, `INFO`, `WARN`, `ERROR`, `CRITICAL_SOS`
    - **Log Masking & Privacy Guard:** ห้ามพิมพ์ Private Keys, Raw GPS พิกัดละเอียด, หรือข้อความแชตส่วนตัวลงใน Console Log โดยเด็ดขาด
    - **Disaster In-Memory Ring Buffer:** เก็บ Log ย้อนหลัง 500 รายการล่าสุดในหน่วยความจำ RAM สำหรับแสดงบนหน้าจอ `NetworkDiagnostics.tsx` เพื่อให้วิเคราะห์ปัญหาหน้างานได้แบบออฟไลน์ 100%

- [ ] **Task 1.5: Core Foundation, Boundary Isolation & Tooling Unit Test Suite (`tests/unit/foundation/` ⭐️)**
  - พัฒนาชุดทดสอบอัตโนมัติ 100% ตรวจสอบความถูกต้องของโครงสร้างสถาปัตยกรรม รากฐานเครื่องมือ และตรรกะระบบเบื้องต้น:
    - **1. `ArchitectureBoundary.test.ts` (Static Boundary Isolation Test):**
      - สแกนไฟล์ทุกไฟล์ภายใต้ `src/core/` เพื่อวิเคราะห์ Abstract Syntax Tree (AST)
      - ตรวจสอบว่า **ห้ามมี Import หรือเรียกใช้โมดูลของแพลตฟอร์มภายนอกเด็ดขาด** (เช่น `@capacitor/*`, `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `indexedDB`, `android.*`)
      - ยืนยันว่า `src/core/` ขึ้นตรงกับมาตรฐาน Pure TypeScript / JavaScript ES2022 และชุดเครื่องมือคณิตศาสตร์ภายในเท่านั้น 100%
    - **2. `InterfacePortsMock.test.ts` (Contract & Mock Implementation Test):**
      - สร้าง Mock Classes จำลองการทำงานของ Ports ทั้งหมด: `MockRadioDriver`, `MockStorageDriver`, `MockKeystoreDriver`, `MockGpsDriver`
      - ยืนยันว่า Core Services สามารถเชื่อมต่อกับ Mock Interfaces และส่งผ่าน Data Streams ได้สมบูรณ์แบบโดยไม่ต้องมีฮาร์ดแวร์จริง
      - ทดสอบการสลับ Adapter ในช่วง Runtime (Dependency Injection Verification)
    - **3. `LoggerRingBuffer.test.ts` (Unit Test ระบบบันทึก Log และ Ring Buffer):**
      - ทดสอบการทำงานของ Ring Buffer ในหน่วยความจำ RAM ขนาด 500 รายการ:
        - เมื่อเขียน Log เกิน 500 รายการ (เช่น เขียน 1,000 รายการ) ข้อมูลเก่าที่สุดจะต้องถูกเลื่อนทิ้งอัตโนมัติ (FIFO Eviction) และคงเหลือเฉพาะ 500 รายการล่าสุดเสมอ ไร้ Memory Leak
      - ทดสอบ **Privacy Masking:** จำลองการส่ง Private Key (Base64), พิกัด GPS ละเอียด, และเนื้อหาข้อความแชตเข้า Logger แล้วยืนยันว่าระบบต้อง Masking เป็น `[REDACTED_KEY]`, `[REDACTED_GPS]`, `[REDACTED_TEXT]` 100% ไม่หลุดออกไปที่ Console Log
      - ทดสอบการกรอง Log ตามระดับความสำคัญ (`DEBUG`, `INFO`, `WARN`, `ERROR`, `CRITICAL_SOS`)
    - **4. `SyntaxChecker.test.ts` (Unit Test สำหรับสคริปต์ `checkSyntax.js`):**
      - ทดสอบสคริปต์ `scripts/checkSyntax.js` กับไฟล์จำลองที่มี Syntax Error (เช่น วงเล็บเปิดไม่ปิด, Typo ใน JSON, Identifier ผิด)
      - ยืนยันว่าตัวสแกนสามารถดักจับ Syntax Error และส่งคืน Exit Code = 1 ได้ถูกต้อง 100%
      - ยืนยันว่าเมื่อไฟล์ถูกต้องทั้งหมด จะส่งคืน Exit Code = 0 พร้อมรายงานจำนวนไฟล์ที่สแกนถูกต้อง

#### 🎯 Acceptance Criteria (Definition of Done for Phase 1):
- สคริปต์ `node scripts/checkSyntax.js` และคำสั่งทดสอบ `bun test` ทำงานผ่าน 100% ไร้ข้อผิดพลาด
- โฟลเดอร์ `src/core/` ผ่านการทดสอบ Boundary Isolation Test 100%: ไม่มี Dependency หรือ Import ของ Browser/Capacitor/Native แม้แต่บรรทัดเดียว
- ชุดทดสอบใน `tests/unit/foundation/` (ทั้ง 4 ไฟล์ทดสอบ) ทำงานผ่าน 100% ครอบคลุม Mock Ports, Ring Buffer, Privacy Masking, และ Syntax Checker
- โครงสร้างโปรเจกต์รองรับการพัฒนาข้ามระบบ (Cross-Platform) อย่างเป็นอิสระทั้ง Android Native, Web PWA และ Cloudflare Serverless
- สาขาการพัฒนา `uat` ถูกตั้งค่าพร้อมรองรับการส่งมอบงานในเฟสถัดไปอย่างเคร่งครัดตามกฎของโครงการ

---

### 🔹 Phase 2: Thabot OutGrid Protocol (TOG v1.1) Bitfield Packing & Frame Engine
**เป้าหมาย:** พัฒนาเอนจินระดับสายสัญญาณ (Wire Protocol Engine) ด้วย **Thabot OutGrid Protocol (TOG v1.1)** ทำงานบนหน่วยความจำระดับไบต์ (`Uint8Array` / `DataView`) โดยตรง ไร้ JSON Overhead เพื่อความเร็วสูงสุดและกินแบตเตอรี่ต่ำสุด พร้อมระบบตรวจจับความผิดพลาด (CRC-16-CCITT), การซอยชิ้นส่วน (Fragmentation), การกู้คืนแพ็กเก็ตตกหล่นในอากาศด้วย Reed-Solomon Erasure Coding (8+4), และระบบคิวส่งแบบ Selective NACK Sliding Window

#### 📋 TaskList Detail:
- [ ] **Task 2.1: Zero-Copy Binary Bitfield Serializer & Memory Buffer Pool (`src/core/protocol/PacketSerializer.ts` ⭐️)**
  - **Zero-Allocation Buffer Pool Pattern:**
    - พัฒนา `BufferPool.ts` จัดสรร `Uint8Array` ขนาดคงที่ (256B, 512B, 1024B) หมุนเวียนใช้งานซ้ำ (Object Pooling) ป้องกัน Garbage Collection (GC) Stutter บนโทรศัพท์ Android สเปกต่ำขณะรับส่งข้อมูลความถี่สูง
  - **Bitfield Bit-Shift Packing Engine:**
    - พัฒนาการอ่าน/เขียนระดับบิตด้วย Bitwise Operators (`<<`, `>>`, `&`, `|`):
      - **Byte 0-1 (16b):** Magic Word `0x544F` (`'TO'`)
      - **Byte 2 (8b):** `[Version 3b: 0b001] | [Packet_Type 5b]` (0x01=SOS, 0x02=Chat, 0x04=Crisis, 0x05=ACK, 0x06=NACK, 0x07=Chirp)
      - **Byte 3 (8b):** `TTL / Hop Count` (0–255, Clamped ตามค่า Density)
      - **Byte 4 (8b):** `[Priority 4b (0xF=SOS .. 0x1=Chirp)] | [Flags 4b: IsFragmented(1b), HasDeltaGPS(1b), IsSigned(1b), Reserved(1b)]`
      - **Bytes 5-12 (64b uint64 Big-Endian):** `Message ID` (สุ่มด้วย CSPRNG ป้องกันซ้ำ)
      - **Bytes 13-20 (64b uint64):** `Sender Public Key Hash` (Truncated SHA-256 8 ไบต์แรก)
      - **Bytes 21-28 (64b uint64):** `Recipient Public Key Hash / Topic Hash` (8 ไบต์)
      - **Bytes 29-36 (64b uint64):** `Target H3 Index Resolution 9` (~100m)
      - **Bytes 37-38 (16b uint16):** `Payload Length` (0–65535 ไบต์)
  - **CRC-16-CCITT Frame Integrity Checksum (2 Bytes):**
    - เติมท้ายแพ็กเก็ตด้วย **CRC-16-CCITT (Polynomial `0x1021`, Initial `0xFFFF`)**
    - ตรวจจับบิตเพี้ยนจากคลื่นรบกวนในอากาศทันทีในระดับ Microsecond ก่อนส่งเข้า Layer การถอดรหัสลับ ช่วยประหยัด CPU 100% หากแพ็กเก็ตเสียหาย

- [ ] **Task 2.2: H3 Local Delta Offset Encoder & High-Precision GPS Compression (`src/core/spatial/H3DeltaCompressor.ts` ⭐️)**
  - บีบอัดพิกัด GPS ดิบ (Lat/Lng Float64 = 16 ไบต์) ให้เหลือเพียง **4 ไบต์ถ้วน**:
    - ดึงจุดศูนย์กลางพิกัดของ Target H3 Cell Res 9 (`h3ToGeo(target_h3)`) เป็นจุดอ้างอิง `(Lat_0, Lng_0)`
    - คำนวณระยะกระจัดแกนโลกจริง (Equirectangular Projection) เป็นเมตร:
      - $\Delta X = (\text{Lng} - \text{Lng}_0) \times \cos(\text{Lat}_0) \times 111,320\text{ m}$
      - $\Delta Y = (\text{Lat} - \text{Lat}_0) \times 110,540\text{ m}$
    - บีบอัดลงฟิลด์ `int16` (-32,768 ถึง +32,767 โดย 1 หน่วย = 10 เซนติเมตร ครอบคลุมรัศมี ±3.2 กิโลเมตร)
  - **ผลลัพธ์:** ส่งพิกัดแม่นยำระดับ **< 1 เมตร (ระบุหลังคาบ้านผู้ประสบภัยได้เป๊ะ)** ในขนาดเพียง **4 ไบต์** ลดขนาดจาก String ปกติ (35–40 ไบต์) ลงถึง 90%

- [ ] **Task 2.3: Large Payload Fragmentation & Out-of-Order Bitmask Reassembler (`src/core/protocol/Fragmenter.ts` & `Reassembler.ts`)**
  - **Adaptive MTU Chunk Slicing:**
    - หั่นรูปภาพ Auto-WebP (5–12 KB) หรือไฟล์เสียง Opus (8–15 KB) ออกเป็นชิ้นย่อยขนาด $\le 180\text{ bytes}$ ต่อก้อน เพื่อให้ฟิตพอดีกับ BLE L2CAP / Extended Advertising MTU โดยไม่ต้องต่อ GATT Connection
    - กำกับหัวชิ้นส่วนด้วย **Fragment Sub-Header (4 Bytes):**
      - `[Total_Chunks (16b uint16)]` + `[Sequence_Index (16b uint16)]`
  - **Memory-Efficient Bitmask Checklist:**
    - ติดตามการมาถึงของชิ้นส่วนด้วย `Uint32Array` Bitmask (1 บิต = 1 ชิ้นส่วน, 100 ชิ้นส่วนใช้ RAM เพียง 16 ไบต์)
    - รองรับการรับชิ้นส่วนสลับลำดับ (Out-of-Order Reassembly) และชิ้นส่วนที่มาจากคนละเส้นทาง (Multi-Path Relay)
  - **Reassembly Buffer Eviction & Timeout:**
    - ตั้งเวลาหมดอายุชิ้นส่วนที่ประกอบไม่เสร็จ (Buffer Timeout 15 นาที) เพื่อล้าง RAM คืนระบบอัตโนมัติ

- [ ] **Task 2.4: Reed-Solomon Forward Error Correction (Erasure Coding 8+4) (`src/core/protocol/ErasureCoder.ts` ⭐️)**
  - พัฒนา **Reed-Solomon FEC บน Galois Field $GF(2^8)$**:
    - แบ่งข้อมูลต้นฉบับออกเป็น $K = 8$ Data Shards
    - สร้างชิ้นส่วนสำรองเพิ่ม $M = 4$ Parity Shards (Overhead +50% หรือเลือกโหมดประหยัด $10+3$ +30%)
    - รวมเป็น $N = 12$ ชิ้นส่วนส่งออกสู่อากาศพร้อมกัน
  - **Instant Mathematical Recovery:**
    - หากแพ็กเก็ตสูญหายในอากาศเนื่องจากสัญญาณวิทยุถูกบังสเปกตรัมสูงถึง **30% – 33%** (ได้รับเพียง 8 ใน 12 ชิ้นส่วนใดๆ ก็ตาม) ปลายทางสามารถแก้สมการเมทริกซ์เกาส์เซียน (Gaussian Elimination) กู้คืนไฟล์รูปหรือคลิปเสียงฉุกเฉินได้สมบูรณ์แบบ 100% ทันทีโดยไม่ต้องเสียเวลาและพลังงานแบตเตอรี่ขอส่งใหม่ (Zero-Retransmit Recovery)

- [ ] **Task 2.5: Selective NACK & Backoff Sliding Window (`src/core/protocol/SlidingWindow.ts`)**
  - พัฒนาระบบคิวส่งและตอบรับสำหรับกรณีที่ Reed-Solomon กู้คืนไม่ได้ (หายเกิน 4 ชิ้น):
    - ปลายทางส่งแพ็กเก็ต **`DELIVERY_NACK (0x06)`** บรรจุ Bitmask ระบุเฉพาะหมายเลขชิ้นส่วนที่ขาดหาย (เช่น ขาดชิ้นที่ #3, #7)
    - ฝั่งส่งจะส่งซ่อมเฉพาะชิ้นที่ระบุใน NACK แทนที่จะส่งใหม่ทั้งหมด 12 ชิ้น
    - **Exponential Backoff & Jitter:** สุ่มดีเลย์ 50–200ms ในการส่งซ่อมเพื่อป้องกันไม่ให้ชนกันซ้ำกับแพ็กเก็ตของโหนดเพื่อนบ้าน (Collision Avoidance)

- [ ] **Task 2.6: Comprehensive Protocol & Wire Engine Unit Test Suite (`tests/unit/protocol/` ⭐️)**
  - พัฒนาชุดทดสอบอัตโนมัติ 100% ครอบคลุมทุกฟังก์ชันของโพรโทคอล TOG v1.1 ด้วย `bun test` / Vitest:
    - **1. `PacketSerializer.test.ts` (Unit Test โครงสร้างบิตและ Header):**
      - ทดสอบ Serialize และ Deserialize ครบทั้ง 6 Packet Types (`0x01: SOS`, `0x02: CHAT`, `0x04: CRISIS`, `0x05: ACK`, `0x06: NACK`, `0x07: CHIRP`)
      - ทดสอบ Big-Endian Byte Order และตรวจสอบความถูกต้องของ `Message ID` (64b), `Sender Hash` (64b), `Recipient Hash` (64b), `Target H3` (64b)
      - ทดสอบขอบเขตค่าผิดปกติ (Boundary & Overflow Cases): Payload ขนาด 0 ไบต์, Payload เต็มขีดจำกัด 65,535 ไบต์, TTL = 0, TTL = 255
      - ทดสอบ **Buffer Pool Leak Test:** วนลูป Serialize/Deserialize 50,000 ครั้ง และยืนยันว่าไม่มี Memory Leak หรือ Unreleased Buffer ค้าง
    - **2. `CRC16.test.ts` (Unit Test ตรวจสอบความถูกต้องของบิต):**
      - ตรวจสอบค่า Checksum ตรงตามมาตรฐานสากล **CRC-16-CCITT (`0x1021`, Initial `0xFFFF`)** เทียบกับ Known Test Vectors
      - ทดสอบ **Bit-Flip Detection:** จำลองคลื่นรบกวนสุ่มกลับบิต (Single-bit flip, Burst 4-bit error) ตรวจจับและปฏิเสธแพ็กเก็ตเสียได้ถูกต้อง 100%
    - **3. `H3DeltaCompressor.test.ts` (Unit Test บีบอัดพิกัด GPS เหลือ 4 ไบต์):**
      - ทดสอบแปลงพิกัด GPS จริงทั่วโลก (เช่น อนุสาวรีย์ชัยสมรภูมิ กรุงเทพฯ, เชียงใหม่, ภูเก็ต, นิวยอร์ก, โตเกียว)
      - ตรวจสอบระยะกระจัด `Delta X (int16)` + `Delta Y (int16)` ขนาด 4 ไบต์
      - ยืนยันว่าพิกัดที่ถอดรหัสกลับมามีความคลาดเคลื่อนเชิงตำแหน่ง **$< 0.5 เมตร (ระดับหลังคาบ้าน)**
      - ทดสอบจุดพิกัดนอกขอบเขตรังผึ้ง (>3.2 กม.) และยืนยันว่าระบบคืนค่า Error / Out-of-Bounds อย่างถูกต้อง
    - **4. `ErasureCoder.test.ts` (Unit Test กู้คืนแพ็กเก็ตตกหล่น Reed-Solomon FEC 8+4):**
      - ทดสอบสร้าง 8 Data Shards + 4 Parity Shards (รวม 12 Shards)
      - ทดสอบจำลอง Drop Packets สูญหายในอากาศ:
        - สุ่มลบ 1 ชิ้นส่วน $\rightarrow$ กู้คืนได้สมบูรณ์แบบ 100% (SHA-256 ตรงเป๊ะ)
        - สุ่มลบ 2 ชิ้นส่วน $\rightarrow$ กู้คืนได้สมบูรณ์แบบ 100%
        - สุ่มลบ 3 ชิ้นส่วน $\rightarrow$ กู้คืนได้สมบูรณ์แบบ 100%
        - สุ่มลบ 4 ชิ้นส่วน (สูญหายสูงสุด 33.3%) $\rightarrow$ กู้คืนได้สมบูรณ์แบบ 100%
        - จำลองลบ 5 ชิ้นส่วน (เกินกำลัง FEC) $\rightarrow$ ระบบแจ้งเตือน Fail สุภาพ และส่งต่อเข้าคิว Selective NACK
      - ทดสอบความเร็วในการถอดรหัส (Performance Benchmark): ต้องกู้คืนเสร็จสิ้นภายในเวลา **$< 15\text{ms}$**
    - **5. `FragmenterAndReassembler.test.ts` (Unit Test ซอยชิ้นส่วนและประกอบร่างไฟล์):**
      - ทดสอบหั่นไฟล์ภาพ Auto-WebP (10 KB) และเสียง Opus (12 KB) เป็นชิ้นส่วนขนาด $\le 180$ ไบต์
      - ทดสอบการส่งชิ้นส่วนสลับลำดับ (Out-of-Order Shuffle เช่น ส่งชิ้นที่ #5, #1, #8, #2...) และยืนยันว่าปลายทางใช้ Bitmask ประกอบกลับมาได้ถูกต้อง 100%
      - ทดสอบรับชิ้นส่วนซ้ำซ้อน (Duplicate Fragments) และยืนยันว่า Bitmask ไม่นับเบิ้ล
      - ทดสอบ Reassembly Timeout (15 นาที) ล้างแคชคืน RAM เมื่อชิ้นส่วนมาไม่ครบ
    - **6. `SlidingWindowNack.test.ts` (Unit Test คิวส่งและ Selective NACK):**
      - ทดสอบสร้างแพ็กเก็ต `DELIVERY_NACK (0x06)` แนบ Bitmask ระบุชิ้นส่วนที่ขาดหาย
      - ทดสอบการตอบสนองของฝั่งส่ง: ส่งซ่อมเฉพาะชิ้นที่ระบุใน NACK อย่างถูกต้อง
      - ทดสอบ Exponential Backoff Jitter หน่วงเวลาสุ่ม 50–200ms ป้องกันการชนกัน

#### 🎯 Acceptance Criteria (Definition of Done for Phase 2):
- **100% Deterministic Bitfield Serialization:** แปลงไป-กลับทุกประเภทแพ็กเก็ต (SOS, Chat, ACK, NACK, Chirp) ข้อมูลตรงกันระดับบิต ไร้ Memory Leak
- **High-Precision Delta Compression:** พิกัด GPS หลังถอดรหัสมีความคลาดเคลื่อนเชิงตำแหน่ง $< 0.5$ เมตร เทียบกับพิกัดจริง
- **CRC-16 Error Trap:** ดักจับแพ็กเก็ตที่ถูกแกล้งกลับบิต (Bit-flip attack) หรือคลื่นกวนได้ถูกต้อง 100%
- **Erasure Coding Resilience Drill:** ในการทดสอบจำลอง Drop Packets สูญหาย 4 ใน 12 ชิ้น ระบบสามารถกู้คืนไฟล์รูปภาพและเสียง Opus กลับมาได้ครบถ้วน 100% โดยใช้เวลาคำนวณ $< 15\text{ms}$ บน CPU มือถือ
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/protocol/` (ทั้ง 6 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาดและมี Code Coverage $\ge 95\%$

---

### 🔹 Phase 3: Zero-Knowledge Cryptography Engine & Offline QR Pairing
**เป้าหมาย:** พัฒนาระบบเข้ารหัสลับ End-to-End ไร้ศูนย์กลาง (E2EE) ประสิทธิภาพสูงด้วย Ed25519, X25519 ECDH, HKDF-SHA256, AES-256-GCM พร้อมระบบจับคู่กุญแจ Offline Dynamic QR Code และ Visual Emoji Fingerprint

#### 📋 TaskList Detail:
- [ ] **Task 3.1: Instant Hardware-Backed Dual-Keypair Identity & Zero-Mental-Load Engine (Ed25519 + X25519 ⭐️)**
  - พัฒนา `src/core/crypto/KeyManager.ts` จัดการวงจรชีวิตตัวตนดิจิทัล (Self-Sovereign Identity):
  - **Zero-Mental-Load Instant Identity:** สุ่มสร้าง Entropy 256-bit ด้วย CSPRNG ทันทีที่เปิดแอปครั้งแรก โดยผู้ใช้ไม่ต้องจดรหัส 12 คำ และไม่ต้องจำรหัสผ่าน พร้อมส่ง SOS กู้ชีพได้ใน 1 วินาที:
    - **Ed25519 Identity Signing Key (32B Private / 32B Public):** สำหรับเซ็นกำกับตัวตน (Digital Signature) ในแพ็กเก็ต SOS, Heartbeat, ใบเสร็จ ACK, และการรับรองสิทธิ์กู้ภัย
    - **X25519 Diffie-Hellman Key (32B Private / 32B Public):** สำหรับทำ Key Agreement แลกเปลี่ยนกุญแจเข้ารหัสแชต 1-on-1 แบบสองชั้น
  - **Node ID Generation:** สร้าง `node_id_hash` (8 Bytes uint64) จาก Truncated SHA-256 ของ Ed25519 Public Key เพื่อใช้เป็นรหัสประจำตัวความยาวคงที่ใน Header TOG v1.1
  - **Clean Reinstall Strategy:** หากผู้ใช้ถอนการติดตั้งแอป (Uninstall) เครื่องที่ติดตั้งใหม่จะสร้างตัวตนใหม่ทันที (Fresh Identity) และกู้คืนเฉพาะ **"รายชื่อเพื่อนและกุญแจสาธารณะของเพื่อน (Contacts)"** กลับมาผ่านระบบ Passkey Biometrics โดยไม่ต้องกรอกรหัสผ่านใดๆ
- [ ] **Task 3.2: E2EE Direct Messaging Engine (Static-Ephemeral ECDH + HKDF + AES-256-GCM ⭐️)**
  - พัฒนา `src/core/crypto/CipherEngine.ts` ป้องกันการดักฟังและปลอมแปลงข้อความ:
  - **Session Key Derivation:**
    - ผู้ส่งสร้าง Ephemeral X25519 Keypair ชั่วคราว สลับกุญแจกับ Recipient Public Key ได้ Shared Secret 32 ไบต์
    - ปั่นกุญแจผ่าน **HKDF-SHA256** พร้อม Salt สุ่ม และ Info String `"TOG-v1.1-E2EE-Direct"` ได้ `Key_enc` (32 Bytes)
  - **Authenticated Encryption (AEAD):**
    - เข้ารหัสด้วย **AES-256-GCM** สุ่ม Initial Vector (`IV` 12 Bytes) ต่อข้อความ
    - สร้าง Authentication Tag (`Tag` 16 Bytes) เพื่อตรวจจับการแก้ไขข้อมูลระหว่างทาง (Tamper-Proof)
    - **Strict Wire Overhead:** ควบคุม Overhead คงที่เป๊ะที่ **28 ไบต์** (`12B IV + 16B Tag`) ทำให้ข้อความ Text 280 ตัวอักษรส่งผ่าน BLE Coded PHY ได้เร็วในเสี้ยววินาที
- [ ] **Task 3.3: Dynamic QR Code Binary Protocol & 6-8 Digit Safety Numbers (Anti-MitM Pairing ⭐️)**
  - พัฒนา `src/core/crypto/QrPairingEngine.ts` สร้างและสแกน Dynamic QR Code แบบออฟไลน์ 100%
  - **Compact Binary QR Payload (ความยาวกะทัดรัดเพียง 80–110 Bytes เพื่อให้กล้องมือถือราคาถูกสแกนติดง่ายในที่มืด/จอแตก):**
    - `[Magic 2B: 0x4F47 ("OG")]` + `[Version 1B: 0x01]` + `[Pairing_Type 1B]` (0x01=Friend, 0x02=Responder Delegation)
    - `[Ed25519_PubKey 32B]` + `[X25519_PubKey 32B]` + `[Ephemeral_Nonce 8B]` + `[Nickname UTF-8 1-16B]` + `[Ed25519_Signature 64B]`
  - **6-8 Digit Safety Numbers (รหัสตัวเลขยืนยันความปลอดภัยขานรหัสวิทยุ ⭐️):**
    - นำกุญแจสาธารณะของทั้งสองฝั่งมารวมกัน `SHA-256(Key_A || Key_B)` แล้วแปลงเป็น **ตัวเลข 8 หลัก แบ่งเป็น 2 ชุด** เช่น `[ 4 8 2 1 ]   [ 9 0 3 5 ]` แสดงบนหน้าจอคู่สนทนา
    - **Radio-Friendly & Hardware-Agnostic:** เหมาะอย่างยิ่งสำหรับทีมกู้ภัย สามารถอ่านออกเสียงขานรหัสสั้นๆ ผ่านวิทยุสื่อสาร วอล์คกี้-ทอล์คกี้ หรือชำเลืองมองเทียบกันได้ทันที โดยไม่มีปัญหาเรื่องฟอนต์อีโมจิเพี้ยนบนอุปกรณ์จอขาวดำ/LoRa หรือโทรศัพท์รุ่นเก่า
    - หากตัวเลขทั้ง 2 ชุดตรงกัน ➔ ยืนยันว่าไม่มีใครดักคั่นกลาง (Man-in-the-Middle) ได้ 100% โดยไม่ต้องพึ่งพาอินเทอร์เน็ต
- [ ] **Task 3.4: Hardware-Backed Secure Keystore & WebCrypto Storage Adapter (⭐️)**
  - พัฒนา `src/core/crypto/SecureStorageAdapter.ts`:
  - **Android Native Shell:** จัดเก็บ Private Seed ใน **Android Keystore System (TEE / StrongBox Hardware-Backed)** เข้ารหัสทับด้วยระดับ Master Key ป้องกันการขโมยกุญแจแม้เครื่องจะถูกรูท (Root)
  - **Web PWA / Desktop Shell:** จัดเก็บผ่าน **Web Crypto API (SubtleCrypto non-extractable CryptoKey)** หรือ IndexedDB เข้ารหัสลับด้วย PBKDF2/Argon2id Passphrase
- [ ] **Task 3.5: Digital Signature & Authority Broadcast Verification**
  - พัฒนาการเซ็นและตรวจสอบลายเซ็น Ed25519 สำหรับประกาศทางการของศูนย์กู้ภัย/เตือนภัยพิบัติ (CAP Ingestion)
  - สกัดกั้นข่าวปลอม (Fake News / Panic Hoax) โดยแอปจะปฏิเสธการบรอดแคสต์ประกาศใดๆ ที่ไม่มี Master Authority Signature ที่ถูกต้อง
- [ ] **Task 3.6: Re-Key Handshake & Seamless Friend Migration Engine (Anti-Replay & Fresh Identity Reconnection ⭐️)**
  - พัฒนา `src/core/crypto/ReKeyHandshakeEngine.ts` จัดการกรณีผู้ใช้ลงแอปใหม่แล้วได้รับ Fresh Node ID:
  - **Cross-Curve Birational Conversion:**
    - แปลง Ed25519 Public Key ไปเป็น X25519 Encryption Key ด้วย Birational Equivalence (`edwardsToMontgomeryPub`) ผ่าน `@noble/curves/ed25519` ช่วยลดขนาด Metadata บนแพ็กเก็ตคลื่นวิทยุเหลือเพียง 32 ไบต์เดียว
  - **Re-Key Migration Packet Protocol:**
    - เมื่อผู้ใช้ติดตั้งแอปใหม่และกู้คืนรายชื่อเพื่อนผ่าน Passkey ตัวเครื่องจะส่ง Re-Key Announcement ข้ามคลื่น LoRa/BLE ไปยังเพื่อนในระยะ
    - โครงสร้างแพ็กเก็ต: `[Migrate_Op 1B: 0x52 ("R")]` + `[Old_Node_ID 8B]` + `[New_Node_ID 8B]` + `[New_Ed25519_PubKey 32B]` + `[New_X25519_PubKey 32B]` + `[Passkey_Receipt_Sig 64B]`
    - เครื่องของเพื่อนจะทำการตรวจสอบลายเซ็น เมื่อผ่านจะอัปเดต Public Key และ Node ID ในสมุดผู้ติดต่อ (Contact Book) ท้องถิ่นโดยอัตโนมัติ พร้อมแจ้งเตือนให้ผู้ใช้ทราบว่า "เพื่อนของคุณได้ติดตั้งแอปใหม่ รหัสความปลอดภัยได้รับการอัปเดตเรียบร้อยแล้ว"
  - **Anti-Replay Guard & Monotonic Ephemeral Nonce Clamping:**
    - ทุกข้อความ E2EE จะมี Monotonic Packet Counter คู่กับ IV 12 ไบต์
    - มี LRU Replay Cache ขนาด 1,024 รายการ ดักจับแพ็กเก็ตซ้ำซ้อนหรือการโจมตี Replay Attack ทันทีที่คลื่นวิทยุถูกบันทึกและส่งซ้ำโดยผู้ไม่หวังดี
- [ ] **Task 3.7: Comprehensive Cryptography & Anti-Tamper Unit Test Suite (`tests/unit/crypto/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยสำหรับเครื่องจักรการเข้ารหัสลับ ป้องกันช่องโหว่ความปลอดภัย 100%:
  - **`KeyManager.test.ts`:**
    - ทดสอบการสุ่ม Entropy ด้วย CSPRNG ความเร็วสูง $(<10\text{ms})$
    - ทดสอบ Deterministic Key Derivation และ Birational Curve Conversion (Ed25519 $\leftrightarrow$ X25519) ตรวจสอบค่าจุดบนเส้นโค้ง Curve25519 ตรงตามมาตรฐาน RFC 7748 / RFC 8032
    - ทดสอบ Node ID Truncated SHA-256 Hashing ว่าไม่มีการชนกัน (Collision test บน 10,000 keys)
  - **`CipherEngine.test.ts`:**
    - ทดสอบ HKDF-SHA256 Key Derivation ด้วย Test Vectors มาตรฐาน RFC 5869
    - ทดสอบการเข้ารหัสและถอดรหัส AES-256-GCM ตรวจสอบความถูกต้องของ Plaintext 100%
    - ทดสอบ Wire Overhead คงที่เป๊ะที่ 28 ไบต์ (`12B IV + 16B Tag`)
    - ทดสอบ Tamper Detection: แก้ไข Ciphertext หรือ Tag แม้เพียง 1 บิต ต้องโยนข้อผิดพลาด `AuthenticationTagMismatchException` เสมอ
  - **`QrPairing.test.ts`:**
    - ทดสอบการ Serialize/Deserialize Compact Binary QR Payload ขนาด 80–110 ไบต์
    - ทดสอบ Magic Byte `0x4F47 ("OG")` และการตรวจสอบ Version
    - ทดสอบการคำนวณ Safety Numbers 8 หลัก `SHA-256(Key_A || Key_B)` ว่าทั้งสองอุปกรณ์คำนวณได้ตัวเลขชุดเดียวกันตรงกัน 100%
  - **`SecureStorageAdapter.test.ts`:**
    - ทดสอบ Mock Hardware Keystore บน Android (TEE / StrongBox) และ WebCrypto `non-extractable` CryptoKey
    - ทดสอบการดึงและบันทึกกุญแจลับ ป้องกัน Memory Leak และการหลุดรอดของ Raw Private Seed
  - **`DigitalSignature.test.ts`:**
    - ทดสอบการเซ็นและตรวจสอบลายเซ็น Ed25519 ด้วย Test Vectors RFC 8032
    - ทดสอบระบบ Authority Broadcast: หากข้อความถูกปลอมแปลง ลายเซ็นไม่ตรง หรือถูกแก้ไข ต้อง Reject แพ็กเก็ตทิ้งทันที
  - **`ReKeyHandshake.test.ts`:**
    - ทดสอบ Handshake ย้ายตัวตน (Seamless Migration) ของเพื่อนที่เพิ่งติดตั้งแอปใหม่
    - ทดสอบ Anti-Replay Guard: ส่งแพ็กเก็ต Re-Key ซ้ำ หรือ Replay ข้อความเก่า ระบบต้องตัดทิ้งและตรวจจับได้ 100%

#### 🎯 Acceptance Criteria:
- สร้าง Keypair Ed25519/X25519 ได้ทันทีใน <10ms โดยไม่ต้องบังคับผู้ใช้จดรหัส 12 คำ
- ฟังก์ชันเข้ารหัส/ถอดรหัส E2EE ทนทานต่อการแก้ไขข้อมูล (Auth Tag Mismatch ถอดรหัสไม่ผ่าน) และกิน Overhead คงที่เพียง 28 ไบต์
- Dynamic QR Code สามารถอ่านค่า Keypair ครบถ้วนในขนาด <110 ไบต์ และ Safety Numbers 8 หลักคำนวณตรงกันทั้งสองฝั่ง 100%
- ระบบ Re-Key Handshake อัปเดตกุญแจเพื่อนใหม่อัตโนมัติหลัง Reinstall พร้อม Anti-Replay Guard สกัดการโจมตีได้ 100%
- ระบบป้องกันการสวมรอยข่าวปลอมด้วย Ed25519 Signature ตรวจสอบผ่าน 100% และ Private Key จัดเก็บใน Hardware Keystore ปลอดภัย
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/crypto/` (ทั้ง 6 ไฟล์ทดสอบ) รันผ่าน 100% ไร้ข้อผิดพลาด และครอบคลุม Cryptographic Corner Cases ทั้งหมด

---

### 🔹 Phase 4: Local Storage, SQLite Schema, Quota Clamping & Bloom Filter
**เป้าหมาย:** ฐานข้อมูลออฟไลน์ประสิทธิภาพสูงบน SQLite (Native) และ IndexedDB (Web) จัดเก็บประวัติ ข้อความ ข้อมูลคู่สนทนา แผนที่ พร้อมระบบจำกัดโควตาอัตโนมัติเข้มงวด 50MB (Strict 50MB Quota Clamping), การกวาดล้างข้อมูลหมดอายุ (Auto-Pruning), Counting Bloom Filter สกัดกั้นลูปแพ็กเก็ต และ LRU Suppression Cache ป้องกัน Broadcast Storm วนลูป 100%

#### 📋 TaskList Detail:
- [ ] **Task 4.1: SQLite Database Engine, Migration Schema & Dual Storage Driver (`src/core/storage/` ⭐️)**
  - พัฒนา `src/core/storage/DatabaseSchema.ts`, `src/platform/storage/SqliteStorageAdapter.ts`, และ `src/platform/storage/IndexedDbStorageAdapter.ts`:
  - **Dual Storage Driver Architecture (Hexagonal Ports & Adapters):**
    - **`SqliteStorageAdapter.ts` (Android Native Shell):** ขับเคลื่อนด้วย SQLite Native Driver / Capacitor SQLite เปิดใช้งาน `PRAGMA journal_mode = WAL;` และ `PRAGMA synchronous = NORMAL;` เพื่อความเร็วสูงสุด
    - **`IndexedDbStorageAdapter.ts` (Web PWA / Desktop Shell):** ขับเคลื่อนด้วย IndexedDB API บริหารจัดเก็บ Object Store โครงสร้างเทียบเท่าตาราง SQL เพื่อรองรับการทำงานออฟไลน์ 100% บนเบราว์เซอร์
    - **`StorageAdapterFactory.ts`:** ตรวจสอบสภาพแวดล้อม Runtime (`Capacitor.isNativePlatform()`) และสลับเลือก Adapter อัตโนมัติไร้รอยต่อ
  - **Relational Tables & Indexing (Pure Offline Schema):**
    - `messages`:
      - คอลัมน์: `id (TEXT/uint64 PRIMARY KEY)`, `type (INT)`, `sender_hash (TEXT)`, `recipient_hash (TEXT)`, `payload (BLOB)`, `status (INT: PENDING/SENT/DELIVERED/FAILED)`, `timestamp (INT)`, `ttl (INT)`, `hops (INT)`, `is_emergency (BOOLEAN)`
      - ดัชนี: `CREATE INDEX idx_messages_recipient ON messages(recipient_hash, timestamp DESC);`
      - ดัชนี: `CREATE INDEX idx_messages_emergency ON messages(is_emergency, timestamp DESC);`
    - `peers`:
      - คอลัมน์: `pubkey_hash (TEXT PRIMARY KEY)`, `ed25519_pubkey (TEXT)`, `x25519_pubkey (TEXT)`, `nickname (TEXT)`, `last_seen (INT)`, `battery_level (INT)`, `h3_index (TEXT)`, `is_supernode (BOOLEAN)`, `safety_numbers (TEXT)`
      - ดัชนี: `CREATE INDEX idx_peers_last_seen ON peers(last_seen DESC);`
    - `dtn_bundles`:
      - คอลัมน์: `id (TEXT PRIMARY KEY)`, `bundle_data (BLOB)`, `priority (INT)`, `created_at (INT)`, `expires_at (INT)`, `hop_count (INT)`, `target_h3 (TEXT)`
      - ดัชนี: `CREATE INDEX idx_dtn_expires ON dtn_bundles(expires_at ASC);`
    - `vector_tiles`:
      - คอลัมน์: `tile_id (TEXT PRIMARY KEY)`, `zoom (INT)`, `x (INT)`, `y (INT)`, `pbf_data (BLOB)`, `size_bytes (INT)`, `last_accessed (INT)`
      - ดัชนี: `CREATE INDEX idx_tiles_accessed ON vector_tiles(last_accessed ASC);`
  - **Transaction Batching & Burst Ingestion:**
    - รองรับ Bulk Insert ผ่าน Transaction เดียว ยามเกิดคลื่นพายุข้อความเข้าพร้อมกัน (Burst Ingestion) ขณะเกิดภัยพิบัติ

- [ ] **Task 4.2: Strict 50MB Storage Quota Clamping, Auto-Pruning & Data-at-Rest Encryption Envelope (`src/core/storage/StorageManager.ts` ⭐️)**
  - **Data-at-Rest Encryption Envelope (Zero-Knowledge Local Security):**
    - ห่อหุ้ม `payload` ของข้อความในตาราง `messages` ด้วย **AES-256-GCM Local Key Envelope** ก่อนบันทึกลงดิสก์ โดยกุญแจดึงมาจาก Hardware Keystore / WebCrypto Subtle
    - ป้องกันการดัมป์ไฟล์ฐานข้อมูลออกจากเครื่อง แม้เครื่องจะถูกขโมยหรือถูกดึงไฟล์ SQLite ออกไป ก็ไม่สามารถเปิดอ่านข้อความได้ 100%
  - **Strict 50MB Storage Quota Clamping:**
    - ควบคุมขนาดพื้นที่ฐานข้อมูลรวมไม่ให้เกิน 50MB บนโทรศัพท์เครื่องกู้ภัย/ผู้ประสบภัย
    - คำนวณขนาดหน่วยความจำจริงผ่าน `PRAGMA page_count * PRAGMA page_size` และขนาด BLOB ของตาราง Vector Tiles / IndexedDB Storage Estimate
  - **Prioritized Auto-Pruning Waterfall (นโยบายกวาดล้างตามลำดับความสำคัญเมื่อแตะ 80% หรือ 40MB):**
    1. **Tier 1 (ลบก่อนเสมอ):** Presence Chirps และ Peer Heartbeats ที่หมดอายุ (> 24 ชั่วโมง)
    2. **Tier 2:** Vector Map Tiles ที่ไม่ได้เปิดดูนานที่สุด (LRU Tile Eviction)
    3. **Tier 3:** ข้อความแชต 1-on-1 ธรรมดาที่ส่ง/รับสำเร็จแล้วและมีอายุเกิน 7 วัน
    4. **Tier 4 (ห้ามลบเด็ดขาด - Protected Forever):**
       - แพ็กเก็ตฉุกเฉิน `0x01: SOS_BEACON` และ `0x04: CRISIS_FEED` ทุกฉบับ
       - กุญแจสาธารณะและประวัติเพื่อนในตาราง `peers`
  - **Vacuum Scheduling:** สั่ง `PRAGMA incremental_vacuum` เมื่อมีการล้างพื้นที่ เพื่อคืนขนาดไฟล์ให้ระบบปฏิบัติการทันที

- [ ] **Task 4.3: Counting Bloom Filter & Duplicate Suppression Cache (`src/core/mesh/BloomFilter.ts` ⭐️)**
  - ป้องกัน Broadcast Storm และการส่งต่อแพ็กเก็ตซ้ำซ้อนระดับ Microsecond:
  - **Counting Bloom Filter (128 KB - 256 KB RAM Footprint):**
    - ใช้ $k = 4$ Hash Functions (ดัดแปลงจาก Murmur3 / Double Hashing ของ SHA-256)
    - รองรับการบันทึก Packet IDs สูงสุด 50,000 ชิ้น ด้วย False Positive Rate ต่ำกว่า $0.1\%$
    - มีฟังก์ชัน Decrement / Eviction เพื่อรีเซ็ตช่องนับตามรอบเวลา 15 นาที
  - **LRU In-Memory Message Suppression Ring Cache (5,000 Elements):**
    - เก็บ `Message_ID (uint64)` ล่าสุด 5,000 รายการไว้ใน `Map` / `BigUint64Array`
    - ค้นหาทันทีใน $O(1)$: หากเจอว่าข้อความนี้เพิ่งเคยถูกส่งต่อภายใน 10 นาทีที่ผ่านมา ให้ตัดทิ้ง (Drop) ทันทีตั้งแต่ชั้น Physical Radio ไร้การคำนวณซ้ำ

- [ ] **Task 4.4: Comprehensive Storage, Quota & Bloom Filter Unit Test Suite (`tests/unit/storage/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยสำหรับฐานข้อมูล การจำกัดโควตา และ Bloom Filter:
  - **`DatabaseSchema.test.ts`:**
    - ทดสอบการรัน Migration สร้างตาราง `messages`, `peers`, `dtn_bundles`, `vector_tiles`
    - ทดสอบ CRUD Operations ทุกตาราง และความถูกต้องของ Data Types
    - ทดสอบการทำ Transaction Batching รับแพ็กเก็ต 1,000 รายการพร้อมกันโดยไม่เกิด Lock Timeout
  - **`StorageAdapterFactory.test.ts`:**
    - ทดสอบการสลับ Adapter ระหว่าง `SqliteStorageAdapter` (บน Native) และ `IndexedDbStorageAdapter` (บน Web)
    - ตรวจสอบความถูกต้องของอินเทอร์เฟซ `IStorageDriver` ทั้งสองฝั่งให้ได้ผลลัพธ์ข้อมูลตรงกัน 100%
  - **`EncryptedPayloadEnvelope.test.ts`:**
    - ทดสอบการเข้ารหัสและถอดรหัส Payload ก่อนบันทึกลง Database
    - ยืนยันว่า Raw Payload ในไฟล์ Database ไม่เป็น Plaintext และอ่านไม่ออกหากไม่มี Key
  - **`QuotaClamping.test.ts`:**
    - จำลองอัดข้อมูล BLOB ขนาดใหญ่ 100MB เข้าสู่ฐานข้อมูล
    - ทดสอบ Auto-Pruning Waterfall: ระบบต้องล้าง Presence Chirps และ Map Tiles ออกก่อน
    - ยืนยันว่าแพ็กเก็ต `0x01: SOS_BEACON` และรายชื่อเพื่อนใน `peers` **ไม่ถูกลบแม้แต่รายการเดียว**
    - ยืนยันว่าขนาดพื้นที่หลัง Pruning จะถูกควบคุมไว้ที่ **$\le 50\text{MB}$ เสมอ 100%**
  - **`BloomFilter.test.ts`:**
    - ทดสอบใส่ Message ID สุ่ม 10,000 ชิ้น ตรวจสอบว่า `contains()` ส่งค่า `true` ถูกต้อง 100%
    - ทดสอบ False Positive Rate ยืนยันว่าต่ำกว่า $0.1\%$ ตามทฤษฎี
    - ทดสอบความเร็วในการตรวจสอบ: ต้องใช้เวลา **$< 0.05\text{ms}$ ต่อรายการ**
    - ทดสอบ Counting Bloom Filter Decrement / Window Slide เมื่อเวลาผ่านไป
  - **`LruSuppressionCache.test.ts`:**
    - ทดสอบยัด Message ID จำนวน 6,000 รายการเข้า Cache ขนาด 5,000 รายการ
    - ตรวจสอบ FIFO/LRU Eviction ว่า 1,000 รายการแรกถูกเลื่อนทิ้ง และ 5,000 รายการล่าสุดยังคงอยู่
    - ตรวจสอบพฤติกรรมดักจับแพ็กเก็ตซ้ำ (Duplicate Packet Drop) ต้องตอบสนองในเวลา $O(1)$

#### 🎯 Acceptance Criteria:
- รองรับระบบจัดเก็บข้อมูลทั้ง SQLite บน Native และ IndexedDB บน Web PWA ด้วย Interface `IStorageDriver` เดียวกัน
- ข้อมูลข้อความในฐานข้อมูลถูกเข้ารหัสแบบ Data-at-Rest ป้องกันการดัมป์ไฟล์ออกไปอ่านได้ 100%
- ทดสอบอัดข้อมูลขนาด 100MB เข้าฐานข้อมูล ระบบตัดทอน (Auto-Prune) เหลือไม่เกิน 50MB อย่างถูกต้อง
- ข้อมูล SOS Beacon และ Critical Emergency ไม่สูญหายจากการ Pruning 100%
- Bloom Filter สามารถกรองแพ็กเก็ตซ้ำ 10,000 ชิ้นได้ถูกต้อง และใช้เวลาตรวจสอบ $< 0.05\text{ms}$ ต่อแพ็กเก็ต
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/storage/` (ทั้ง 6 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาด

---

### 🔹 Phase 5: Spatial H3 Indexing, Hierarchical Fallback & Supernode Election
**เป้าหมาย:** วางโครงข่ายพิกัดเชิงพื้นที่ด้วย Uber H3 Hexagonal Grid (Res 9, 7, 5, 4), ระบบ Geocast Routing ย่อขยายพิกัดฉุกเฉิน (Progressive Spatial Expansion), และอัลกอริทึมเลือกตั้ง Supernode อัตโนมัติ (Deterministic Supernode Election) ควบคู่กับระบบ LoRa Backbone Gateway Promotion

#### 📋 TaskList Detail:
- [ ] **Task 5.1: Spatial H3 Grid & Geo-Hashing Engine (Hybrid Mesh & Precision Triage Architecture ⭐️)**
  - พัฒนา `src/core/spatial/H3GridEngine.ts` แปลง GPS Lat/Long เป็น H3 Index ด้วย `h3-js` / Pure H3 Algorithmic Core:
  - **Sweet-Spot Hierarchical Resolution Strategy:**
    - **Resolution 9 (~100m / รัศมี ~107m - Core Radio Mesh Base):** ความละเอียดฐานหลักของโครงข่าย BLE Mesh และตัวตรวจจับ Stationary เพื่อหลีกเลี่ยงผลกระทบจาก GPS Drift ในอาคาร และเข้าคู่กับระยะทำการของคลื่นบลูทูธพอดีเป๊ะ
    - **Resolution 11 (~25m) & Resolution 12 (~9m - Precision Roof Triage Layer):** ถอดรหัสสดจาก **H3 Local Delta Offset (4B)** เพื่อปักหมุดระบุหลังคาบ้านผู้ประสบภัย (Roof-Level Pinpoint) บนหน้าจอเรดาร์ของทีมกู้ภัยโดยไม่รบกวนชั้นส่งสัญญาณวิทยุ
    - **Resolution 7 (~1.2km / รัศมี ~1.22km):** สำหรับช่องสนทนาระดับตำบล / สถิติ Anonymous Heatmap
    - **Resolution 5 (~8.5km / รัศมี ~8.88km):** สำหรับการกระจายข่าวด่วนระดับตำบลขนาดใหญ่/กึ่งอำเภอ
    - **Resolution 4 (~22km / รัศมี ~22.6km):** สำหรับการขนส่งข้อความข้ามอำเภอและเชื่อมต่อกับ Data Mule
  - **Cell Boundary & Distance Calculation:**
    - พัฒนาฟังก์ชันคำนวณระยะห่างระหว่าง H3 Cells (`gridDistance`) และจุดศูนย์กลาง (`cellToLatLng`) แบบ Zero-Allocation

- [ ] **Task 5.2: Progressive Spatial Expansion & K-Ring Search เมื่อปลายทาง Offline (⭐️)**
  - พัฒนาระบบ **H3 Progressive Spatial Expansion** ค้นหาและส่งมอบข้อความเมื่อปลายทาง Offline เป็นระลอกคลื่น:
    - **ระดับ 1 (Offline < 15 นาที):** พยายามส่งตรงพิกัดเดิม **Res 9 (~100m)** ผ่าน BLE Long Range
    - **ระดับ 2 (Offline 15 นาที – 2 ชม.):** ถอยระดับสู่ **Res 7 (~1.2km)** พร้อมสั่ง `gridDisk(k=1)` ดักจับรังผึ้งรอบข้าง 6 ช่องรอบตัว เพื่อดักผู้ประสบภัยที่กำลังเดินอพยพ
    - **ระดับ 3 (Offline 2 – 12 ชม.):** ถอยระดับสู่ **Res 5 (~8.5km)** ประสานส่งต่อยังศูนย์อพยพระดับตำบล
    - **ระดับ 4 (Offline > 12 – 24 ชม.):** ถอยระดับสู่ **Res 4 (~22km)** บรรจุเข้าสู่ตู้เก็บสัมภาระของ **High-Priority Data Mule** ขนส่งข้ามอำเภอ
  - **Instant Collapse On Signed Receipt:** พัฒนาระบบยุบขนาดการค้นหากลับมาเป็น Point-to-Point ทันทีเมื่อได้รับ Signed ACK จากปลายทาง

- [ ] **Task 5.3: Deterministic Supernode Election Algorithm & LoRa Gateway Tier-1 Promotion (⭐️)**
  - พัฒนา `src/core/mesh/SupernodeElection.ts` คำนวณความเหมาะสมในการเป็นโหนดกระจายสัญญาณ (Score-based Election):
  - **Scoring Function Formula:**
    $$\text{Score} = (\text{Battery\%} \times 0.4) + (\text{IsCharging} \times 30) + (\text{PeerStability} \times 0.2) + (\text{LoRaBridgeActive} \times 100)$$
  - **LoRa Gateway Priority Override (Tier-1 Community Backbone):**
    - เครื่องที่มีการเชื่อมต่อกับกล่อง LoRa ฮาร์ดแวร์ส่วนตัว (Active BLE LoRa Companion Bridge) จะได้รับคะแนนโบนัสสูงสุด (+100 คะแนน) ได้รับการแต่งตั้งเป็น **Zone Tier-1 Backbone Gateway** อัตโนมัติ เพื่อทำหน้าที่เป็นเครื่องแม่ข่ายยิงข้อความข้ามเขาระยะไกล 10–20+ กม. ให้เพื่อนบ้านรอบตัว
  - **Smartphone Supernode Criteria:** แบตเตอรี่ > 50%, กำลังชาร์จไฟ (Wall/Car charger), มีหน่วยความจำเหลือ, เสถียรภาพการเชื่อมต่อ (สูงสุด 1 Master + 2 Standby Backups ต่อ H3 Res 7 Zone)
  - **Graceful Demotion:** สลับสิทธิ์กลับเป็น Normal Node อัตโนมัติเมื่อแบตเตอรี่ลดต่ำกว่า 30% (เว้นแต่กำลังชาร์จไฟหรือเชื่อมต่อ LoRa Gateway อยู่)

- [ ] **Task 5.4: Spatial Geocast Forwarding & Bounded Epidemic Flood Engine (`src/core/mesh/GeocastRouter.ts` ⭐️)**
  - พัฒนาการส่งต่อแพ็กเก็ตจำกัดขอบเขตเชิงพื้นที่ (Geographically Bounded Flooding):
  - **Target H3 Cell Boundary Check:**
    - เมื่อโหนดได้รับแพ็กเก็ตบรอดแคสต์ฉุกเฉิน จะตรวจสอบว่าตนเองอยู่ใน `Target_H3` หรืออยู่ใน K-Ring ($k=1$) ของพื้นที่เป้าหมายหรือไม่
    - หากอยู่นอกเขตระยะไกลเกินกว่ากำหนด ให้ลดการส่งต่อ (Prune Forwarding) ทันที เพื่อไม่ให้เปลือง Airtime ในพื้นที่ไม่เกี่ยวข้อง
  - **Hop Count & Density-Adaptive Forwarding:**
    - หากอยู่ในเขตเป้าหมายที่มีโหนดหนาแน่น ($N > 20$) จะสุ่มส่งต่อเพียง $p = 1/\sqrt{N}$ เพื่อกำจัดปัญหา Broadcast Storm
    - ประเมินระยะกระจัด (Distance Gradient) โดยโหนดที่อยู่ห่างจากผู้ส่งเดิมมากกว่าจะได้รับสิทธิ์ส่งต่อก่อน (Priority Forwarding via Jitter Delay)

- [ ] **Task 5.5: Epidemic Anti-Entropy Gossip Protocol & Bloom Digest Synchronization (`src/core/mesh/GossipSyncEngine.ts` ⭐️)**
  - พัฒนาระบบแลกเปลี่ยนข้อมูลข้อความที่ตกหล่นระหว่างโหนดเมื่อเดินสวนทางกัน (Pairwise Anti-Entropy Session):
  - **Pairwise Bloom Digest Exchange (ประหยัด Airtime ขีดสุด):**
    - เมื่อโหนดสองโหนดตรวจพบกันผ่าน BLE Chirp จะส่ง **Compact Bloom Filter Digest (128–256 Bytes)** สรุปรายการข้อความที่ตนเองมี
    - เปรียบเทียบ Bitwise XOR ระหว่าง Digest เพื่อระบุว่ามีข้อความใดที่อีกฝ่ายยังขาด โดยไม่ต้องส่ง Message ID ทั้งหมดข้ามอากาศ
  - **Differential Bundle Push & Rate Limiting:**
    - ส่งมอบเฉพาะแพ็กเก็ตที่อีกฝั่งยังไม่มี โดยจำกัดอัตราส่งไม่เกิน 5 แพ็กเก็ตต่อวินาที เพื่อป้องกันช่องสัญญาณแบนด์วิดท์ BLE อิ่มตัว

- [ ] **Task 5.6: Comprehensive Spatial, Routing & Gossip Unit Test Suite (`tests/unit/spatial/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยสำหรับ H3 Spatial Engine, Geocast, Supernode และ Epidemic Gossip:
  - **`H3GridEngine.test.ts`:**
    - ทดสอบแปลงพิกัด Lat/Long เป็น H3 Index ถูกต้องตามมาตรฐาน Uber H3 ทั้ง 5 ระดับ (Res 4, 5, 7, 9, 11/12)
    - ทดสอบคำนวณ `cellToLatLng` และคำนวณระยะทาง `gridDistance` ถูกต้องแม่นยำ
  - **`ProgressiveExpansion.test.ts`:**
    - จำลองไทม์ไลน์สถานการณ์ปลายทาง Offline ตามช่วงเวลา (<15 นาที, 2 ชม., 12 ชม., 24 ชม.)
    - ยืนยันการปรับความละเอียด Res 9 $\rightarrow$ Res 7 (k=1) $\rightarrow$ Res 5 $\rightarrow$ Res 4 ตามลำดับขั้น
    - ทดสอบ **Instant Collapse:** เมื่อได้รับ ACK จำลอง ระบบต้องยกเลิก Expansion และกลับสู่ Res 9 ทันที 100%
  - **`SupernodeElection.test.ts`:**
    - ทดสอบการคำนวณคะแนนตามสูตร Scoring Function
    - ทดสอบกรณีเชื่อมต่อ LoRa Companion Bridge: ต้องได้รับการแต่งตั้งเป็น Supernode Tier-1 ทันที 100%
    - ทดสอบกรณีแบตเตอรี่ลดต่ำกว่า 30%: ระบบต้องสละตำแหน่ง (Demote) คืนสู่ Normal Node อย่างสุภาพ
  - **`GeocastRouter.test.ts`:**
    - ทดสอบการคัดกรองแพ็กเก็ต: โหนดที่อยู่นอกพื้นที่เป้าหมาย H3 ต้อง Drop แพ็กเก็ตทิ้ง
    - ทดสอบ Density-Adaptive Forwarding: ในสภาพแวดล้อมหนาแน่น อัตราการ Forward ต้องลดลงตามสัดส่วน $1/\sqrt{N}$
    - ทดสอบ Distance Gradient Jitter Delay: โหนดที่อยู่ไกลกว่าส่งต่อก่อน
  - **`GossipSyncEngine.test.ts`:**
    - ทดสอบการสร้างและเทียบ Compact Bloom Digest (128B) ระหว่าง 2 โหนด
    - ทดสอบการดึงและแลกเปลี่ยนเฉพาะข้อความที่ตกหล่น (Missing Packets Detection) สำเร็จ 100%
    - ทดสอบ Rate Limiting ไม่ส่งเกิน 5 แพ็กเก็ตต่อวินาที

#### 🎯 Acceptance Criteria:
- แปลงพิกัด GPS เป็น H3 Index ถูกต้องตามมาตรฐาน Uber H3 ครบทั้ง 5 ระดับ (Res 4, 5, 7, 9, 11/12)
- ระบบ Progressive Spatial Expansion ขยายวงรังผึ้ง Res 9 -> 7 -> 5 -> 4 ตามช่วงเวลาที่กำหนดได้อย่างแม่นยำ 100% และ Instant Collapse เมื่อได้ ACK
- การเลือกตั้ง Supernode คำนวณคะแนนและสลับบทบาทได้ถูกต้อง ยกสิทธิ์สูงสุดให้โหนดที่ต่อ LoRa Gateway และลดบทบาทเมื่อแบตเตอรี่ต่ำกว่า 30%
- Geocast Router สกัดกั้นการแพร่กระจายของแพ็กเก็ตออกนอกเขตเป้าหมายได้อย่างแม่นยำ 100%
- ระบบ Epidemic Anti-Entropy Gossip ซิงก์ข้อมูลที่ตกหล่นระหว่างโหนดผ่าน Bloom Digest ได้สมบูรณ์ 100%
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/spatial/` (ทั้ง 5 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาด

---

### 🔹 Phase 6: DTN Data Mule, Store-and-Forward & Velocity Tracker
**เป้าหมาย:** สถาปัตยกรรม Delay-Tolerant Networking (DTN) ขนส่งข้อมูลผ่านบุคคลและยานพาหนะเคลื่อนที่ ข้ามพื้นที่สัญญาณขาดหาย พร้อมระบบคืนชีพเครือข่าย (Network Healing & Re-anchoring) โอนย้ายสิทธิ์ดูแลสัมภาระ (Bundle Custody Transfer), การประเมินความน่าจะเป็นในการพบเจอ (PRoPHET Delivery Predictability), และระบบหยุดนับฮอปชั่วคราว (Hop Freeze)

#### 📋 TaskList Detail:
- [ ] **Task 6.1: DTN Store-and-Forward Bundle Custody Engine (`src/core/dtn/BundleStore.ts` ⭐️)**
  - พัฒนาระบบจัดเก็บและส่งต่อแพ็กเก็ตแบบทนทานต่อการตัดขาดของสัญญาณ (Disruption-Tolerant):
  - **Bundle Structure & Serialization:**
    - โครงสร้าง Bundle: `[Bundle_ID 16B]` + `[Creation_Timestamp 8B]` + `[Expires_At 8B]` + `[Priority 1B]` + `[Hop_Count 1B]` + `[Custodian_Node_ID 8B]` + `[Target_H3 8B]` + `[Triage_Level 1B: Red(0x01)/Yellow(0x02)/Green(0x03)]` + `[Payload_Len 2B]` + `[Encrypted_Payload BLOB]`
  - **Custody Transfer Protocol (การโอนย้ายสิทธิ์ดูแลความปลอดภัยของข้อมูล):**
    - เมื่อโหนด A ส่งมอบ Bundle ให้โหนด B (เช่น ผู้ประสบภัยส่งต่อให้รถกู้ภัย):
      - โหนด A จะยังไม่ลบ Bundle ทันที แต่จะคงสถานะเป็น `CUSTODY_OFFERED`
      - เมื่อโหนด B ตอบรับด้วยแพ็กเก็ต **`CUSTODY_ACCEPT (0x08)`** พร้อมลายเซ็น โหนด A จึงจะปลดสถานะเป็น `CUSTODY_TRANSFERRED` และลบออกจาก Flash Memory ได้อย่างปลอดภัย
      - ป้องกันข้อมูลสูญหาย 100% หากการเชื่อมต่อหลุดขณะกำลังส่งมอบกลางทาง
  - **Bundle Buffer Congestion & Triage Eviction Policy (บริหารคลังสัมภาระเมื่อ Flash Memory เต็ม):**
    - กำหนดโควตา DTN Bundle Storage บนอุปกรณ์ (สูงสุด 30MB)
    - หากคลังเก็บเต็มและมี Bundle ใหม่เข้ามา จะใช้ระบบ **Prioritized Triage Eviction**:
      1. ทิ้ง Direct Chat ที่หมดอายุหรือส่งนานเกิน 24 ชม. ก่อน
      2. ทิ้ง Crisis Feed ที่อยู่นอกเขต H3
      3. สำหรับแพ็กเก็ต SOS ฉุกเฉิน: **ห้ามทิ้งเคสฉุกเฉินระดับสีแดง (Triage Red 0x01: บาดเจ็บสาหัส/ติดค้างวิกฤต) เด็ดขาด 100%** แต่จะคัดกรองเคสสีเขียว (Green: ร้องขอของใช้ทั่วไป) ออกก่อนหากจำเป็นขีดสุด

- [ ] **Task 6.2: Velocity Azimuth & Mobility Tracker (`src/core/dtn/MobilityTracker.ts` ⭐️)**
  - พัฒนาระบบตรวจจับและวิเคราะห์การเคลื่อนที่เชิงเวกเตอร์ของอุปกรณ์:
  - **Speed & Azimuth Calculation:**
    - คำนวณความเร็วเฉลี่ย ($v$) และทิศทางมุมอะซิมัท ($\theta$) จากข้อมูล GPS ในช่วงเวลา 60 วินาทีล่าสุด:
      - **Stationary Mode ($v < 5\text{ km/h}$):** บุคคลอยู่กับที่หรือเดินเท้าในศูนย์พักพิง จัดเป็น Normal Node
      - **High-Priority Data Mule ($20\text{ km/h} \le v \le 120\text{ km/h}$):** รถกู้ภัย, เรือกู้ชีพ, หรือรถยนต์ที่กำลังเดินทางข้ามเขต
  - **Target Interception Angle:**
    - หากเวกเตอร์ความเร็วของ Data Mule กำลังมุ่งหน้าไปยัง `Target_H3` ของแพ็กเก็ต จะเพิ่มความสำคัญในการรับ Bundle นั้นมาขนส่งทันที

- [ ] **Task 6.3: Hop Freeze, Extended TTL & PRoPHET Predictability Governance (⭐️)**
  - จัดการวงจรอายุและการนับฮอปของสัมภาระระหว่างการเดินทางข้ามอำเภอ:
  - **Hop Freeze Mechanism:**
    - โดยปกติในโครงข่าย Mesh ค่า Hop Count จะถูกลดทอน ($TTL = TTL - 1$) ทุกครั้งที่มีการกระโดดข้ามเครื่อง
    - **ข้อยกเว้นสำหรับ Data Mule:** ระหว่างที่แพ็กเก็ตถูกเก็บอยู่ในคลังสัมภาระของยานพาหนะที่กำลังเดินทาง ค่า Hop Count จะถูก "แช่แข็ง" (Hop Freeze) ไม่ลดทอนลงตลอดการเดินทาง เพื่อให้เมื่อไปถึงอำเภอปลายทาง แพ็กเก็ตยังมี Hop Count เต็มเปี่ยมพร้อมกระจายต่อให้ผู้รับ
  - **Disaster-Grade Extended TTL Policy:**
    - `0x01: SOS_BEACON`: อายุขัย **7 – 14 วัน** (ห้ามถูกทิ้งเด็ดขาดจนกว่าจะได้รับการช่วยเหลือ)
    - `0x04: CRISIS_FEED`: อายุขัย **3 – 7 วัน**
    - `0x02: DIRECT_CHAT`: อายุขัย **24 – 48 ชั่วโมง**
  - **PRoPHET Delivery Predictability Metric:**
    - คำนวณค่าความน่าจะเป็นในการพบเจอปลายทาง $P_{(a, b)} \in [0, 1]$ จากสถิติการพบเจอย้อนหลัง และ Aging Factor:
      $$P_{(a, b)} = P_{(a, b)\text{old}} + (1 - P_{(a, b)\text{old}}) \times L_{\text{encounter}}$$
    - คัดเลือกส่งต่อเฉพาะโหนดที่มีโอกาสเดินทางไปพบปลายทางสูงที่สุด

- [ ] **Task 6.4: Network Healing, Cloud Re-anchoring & Epidemic Vaccine Kill Pill (`src/core/dtn/` ⭐️)**
  - พัฒนา `src/core/dtn/CloudReAnchorEngine.ts` และ `src/core/dtn/VaccineKillPillEngine.ts`:
  - **Cellular / Wi-Fi Detection & Burst Upload:**
    - ตรวจสอบสถานะการเชื่อมต่ออินเทอร์เน็ตของ Data Mule ทันทีที่เข้าสู่เขตที่มีสัญญาณ Cellular (4G/5G) หรือ Wi-Fi
    - บีบอัดและส่ง Bundle ฉุกเฉินทั้งหมดขึ้นสู่ **Cloudflare Workers API (`POST /api/mesh/sync-bundle`)** เป็นชุดเดียว (Batch Upload)
    - นำเข้าข้อมูลสู่ Cloudflare D1 Database และอัปเดตสถานะ Heatmap กู้ภัยระดับประเทศแบบเรียลไทม์
  - **Global Delivery Receipt Broadcast:**
    - เมื่อ Cloudflare ได้รับข้อมูล จะสร้างใบเสร็จดิจิทัลส่งกลับลงมา เพื่อให้ Data Mule นำใบเสร็จกลับไปกระจายแจ้งโหนดในป่าว่า "ข้อความกู้ชีพของคุณถึงศูนย์บัญชาการแล้ว"
  - **Epidemic Vaccine Kill Pill Protocol (ฉีดวัคซีนหยุดส่งข้อความที่ช่วยแล้ว ⭐️):**
    - เมื่อเคสได้รับการช่วยเหลือ หรือแพ็กเก็ตขึ้นสู่ Cloudflare เรียบร้อยแล้ว ระบบจะออก **"Vaccine / Kill Pill Packet"** บรรจุ `Bundle_ID` พร้อมลายเซ็นทางการ
    - แพ็กเก็ตวัคซีนจะแพร่กระจายแบบ Epidemic เมื่อโหนดหรือ Data Mule คันอื่นได้รับวัคซีนนี้ จะทำการลบสำเนา Bundle ดังกล่าวทิ้งจาก Flash Memory ทันที (Instant Purge) สกัดกั้นการส่งต่อซ้ำซ้อนข้ามอำเภอ และคืนพื้นที่จัดเก็บให้เครือข่าย 100%

- [ ] **Task 6.5: Comprehensive DTN & Data Mule Unit Test Suite (`tests/unit/dtn/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยสำหรับสถาปัตยกรรม DTN และระบบ Data Mule ครบวงจร:
  - **`BundleStore.test.ts`:**
    - ทดสอบ Serialize และ Deserialize โครงสร้าง DTN Bundle ขนาดต่างๆ รวมถึงฟิลด์ Triage Level
    - ทดสอบกระบวนการ Custody Transfer: สถานะ `CUSTODY_OFFERED` $\rightarrow$ ได้รับ `CUSTODY_ACCEPT` $\rightarrow$ สลับสถานะเป็น `CUSTODY_TRANSFERRED` และคืนพื้นที่ Flash Memory
    - ทดสอบกรณีส่งมอบขาดตอน (Simulated Link Drop): ยืนยันว่า Bundle ต้องไม่สูญหายและคงอยู่บนโหนดต้นทาง
  - **`BundleEvictionTriage.test.ts`:**
    - จำลองอัด Bundle เต็มโควตา 30MB
    - ตรวจสอบลำดับการ Evict: Direct Chat $\rightarrow$ Crisis Feed $\rightarrow$ Green SOS
    - ยืนยันว่า **Red SOS (0x01) ที่มีวิกฤตขั้นสูงสุด จะไม่มีวันถูกลบออกจากหน่วยความจำ 100%**
  - **`MobilityTracker.test.ts`:**
    - ทดสอบคำนวณความเร็วและทิศทางจากลำดับพิกัด GPS จำลอง:
      - จำลองพิกัดเดินเท้า ($3\text{ km/h}$) $\rightarrow$ สถานะ Normal Node
      - จำลองพิกัดรถกู้ภัยวิ่งบนถนน ($60\text{ km/h}$) $\rightarrow$ สถานะ High-Priority Data Mule
    - ทดสอบการคำนวณมุมมุ่งหน้า (Bearing/Azimuth) ไปยังเป้าหมาย Target H3
  - **`HopFreezeAndTtl.test.ts`:**
    - ทดสอบสถานะ Hop Freeze: แพ็กเก็ตที่ถูกจัดเก็บใน Data Mule เป็นเวลา 12 ชั่วโมง ค่า Hop Count ต้องไม่ลดลงแม้แต่หน่วยเดียว
    - ทดสอบอายุ TTL: แพ็กเก็ต SOS ต้องคงอยู่ครบ 7 วัน และทดสอบการหมดอายุของ Direct Chat หลัง 48 ชั่วโมง
    - ทดสอบสูตรการคำนวณ PRoPHET Predictability และ Aging Factor
  - **`CloudReAnchor.test.ts`:**
    - จำลองการตรวจพบอินเทอร์เน็ตบน Data Mule และการยิง Batch POST เข้า Endpoint จำลอง
    - ตรวจสอบการแปลง Bundle เป็น D1 Record และการรับใบเสร็จ Global Delivery Receipt
  - **`VaccineKillPill.test.ts`:**
    - จำลองการสร้างแพ็กเก็ตวัคซีน Kill Pill เมื่อเคสกู้ภัยสำเร็จ
    - ทดสอบการส่งต่อวัคซีนระหว่างโหนด และการสั่ง Instant Purge ลบ Bundle เป้าหมายออกจาก Flash Memory ทันที
    - ยืนยันว่าหลังจากได้รับวัคซีน โหนดจะไม่ส่งต่อข้อความเคสนั้นอีกต่อไป 100%

#### 🎯 Acceptance Criteria:
- จำลองการเคลื่อนที่ของ Data Mule จากจุดอับสัญญาณไปยังเขตมีอินเทอร์เน็ต สามารถส่งต่อ Bundle สู่ Cloudflare ได้ครบถ้วน 100%
- กระบวนการ Custody Transfer มีระบบทนทานต่อสัญญาณหลุดกลางคัน โดยไม่มีข้อมูลสูญหาย 100%
- นโยบาย Triage Eviction ป้องกันการสูญหายของเคสวิกฤตสีแดง (Red SOS) ได้อย่างสมบูรณ์แบบ 100% แม้หน่วยความจำเต็ม
- กลไก Hop Freeze ป้องกันการลดทอน Hop Count ของ Bundle ระหว่างการเดินทางข้ามอำเภอได้อย่างถูกต้อง
- ระบบ Epidemic Vaccine Kill Pill สามารถล้างแพ็กเก็ตที่ช่วยแล้วออกจากเครือข่าย ป้องกันการกระจายซ้ำซ้อน 100%
- ระบบ Mobility Tracker ระบุสถานะ High-Priority Data Mule ได้อย่างแม่นยำตามเกณฑ์ความเร็ว 20–120 กม./ชม.
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/dtn/` (ทั้ง 6 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาด

---

### 🔹 Phase 7: Android Native Layer, Foreground Service & Battery Duty Cycle
**เป้าหมาย:** พัฒนาระบบเบื้องหลังบน Android 14/15 ทำงานตลอด 24 ชั่วโมงไม่โดนระบบฆ่า พร้อมจัดการคลื่นความถี่ BLE สลับ 4-tier Ultra-Saver อัจฉริยะ

#### 📋 TaskList Detail:
- [ ] **Task 7.1: Android Foreground Service, Full-Screen Intent & OEM Killer Defense (`MeshForegroundService.kt` ⭐️)**
  - พัฒนา `android/app/src/main/java/.../MeshForegroundService.kt`:
  - **Android 14/15 Compliant Service Types & Manifest Matrix:**
    - กำหนด `android:foregroundServiceType="connectedDevice|location|dataSync"` ใน `AndroidManifest.xml`
    - ขอสิทธิ์จำเป็นระดับ Runtime: `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`
  - **OEM Aggressive Battery Killer Defense (รับมือระบบฆ่าแอปของ Samsung/Xiaomi/Vivo/Oppo):**
    - ขอข้อยกเว้นประหยัดพลังงานผ่าน `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (Battery Optimization Whitelist)
    - มีหน้าจอตรวจจับยี่ห้อโทรศัพท์ (OEM Detector) แนะนำวิธีเปิด Auto-start / ปิด App Sleep ให้ผู้ใช้แบบ Step-by-Step
    - **Doze Mode Alarm Fallback:** ใช้ `AlarmManager.setExactAndAllowWhileIdle()` คู่กับ `SCHEDULE_EXACT_ALARM` ทำหน้าที่เป็น Watchdog ปลุก CPU มารับส่งคลื่นวิทยุตรงเวลา แม้ระบบจะเข้าสู่ Deep Doze Mode
  - **WakeLock Management & Disaster Energy Governance:**
    - บริหารจัดสรร `PARTIAL_WAKE_LOCK` แบบชั่วคราว (Acquire เฉพาะช่วงกำลังประมวลผลแพ็กเก็ต แล้ว Release ทันทีในระดับ Millisecond) เพื่อการันตีไม่กินไฟเกินกำหนด
  - **Priority-Based Popup Notification System (ระบบแจ้งเตือนป๊อปอัปตามลำดับความสำคัญ ⭐️):**
    - **Tier-1 Critical SOS (`0x01: SOS_BEACON`):**
      - สั่งเปิดหน้าจออัตโนมัติแม้ล็อกหน้าจอ/จอดับอยู่ด้วย **Android Full-Screen Intent**
      - แสดง **Emergency Overlay Modal** สีแดงเต็มจอ ทะลุผ่านโหมดห้ามรบกวน (Bypass Do Not Disturb / Silent Mode)
      - ส่งสัญญาณเสียงไซเรนกู้ภัยสั้นและสั่นรหัส Morse Code (`... --- ...`) พร้อมปุ่มกด *"กำลังไปช่วย"* และพิกัดระยะทางทันที
    - **Tier-2 Direct Chat (`0x02`):**
      - เด้ง **In-App Toast Banner** ลอยลงมาเมื่อเปิดแอปอยู่
      - เด้ง **Heads-Up Notification** พร้อมปุ่มพิมพ์ตอบกลับด่วน (Quick Reply) เมื่อแอปอยู่เบื้องหลัง
    - **Tier-3 Crisis Feed (`0x04`):**
      - เด้ง **High-Priority Sticky Notification** สีส้ม/เหลืองเด่นชัด ไม่หายไปจนกว่าผู้ใช้จะกดอ่าน เพื่อไม่ให้พลาดประกาศเตือนภัยจากศูนย์อพยพ
- [ ] **Task 7.2: Hardware ScanFilter, Full-Stack BLE Coded S=8 Radio Driver & 4-Tier Collision Shield (Long-Range & High-Density Guaranteed ⭐️)**
  - พัฒนา `android/app/src/main/java/.../BleRadioPlugin.kt` จัดการไดรเวอร์วิทยุบลูทูธระดับฮาร์ดแวร์
  - ใช้ Hardware BLE ScanFilter ดักจับ Service UUID เฉพาะระดับ Baseband (CPU หลับลึก 100% ถ้าไม่มีแพ็กเก็ต TOG)
  - **Full-Stack Coded S=8 Architecture (สแกนเจอที่ 300ม. คุยส่งข้อความถึงกันได้จริงที่ 300ม. 100%):**
    - **Long-Range Scanning Engine:** บังคับเปิดสแกนด้วย **`BluetoothDevice.PHY_LE_CODED` (S=8)** ร่วมกับ Hardware ScanFilter ขยายความไวในการรับสัญญาณ (+12dBm Sensitivity) ดักฟังเพื่อนบ้านจากระยะไกลสุดขั้ว **200 – 350+ เมตร**
    - **Ultra-Long-Range SOS & Chat Transmission:** ส่งแพ็กเก็ตฉุกเฉิน `SOS_BEACON` และข้อความสนทนา `DIRECT_CHAT` ด้วย **Coded PHY (S=8) + Max TX Power ตลอดรอดฝั่ง** ป้องกันปัญหาสัญญาณหลุด (Drop Connection) เมื่ออยู่นอกระยะ 1M PHY ทำให้การันตีการคุยแชตได้ระยะไกลเท่ากับระยะสแกน
    - **RSSI-Adaptive High-Throughput Mode (เฉพาะเมื่ออยู่ประชิดตัว):** หากตรวจพบว่าโหนดเพื่อนบ้านอยู่ใกล้มาก (< 30–50 เมตร สัญญาณ RSSI > -75dBm) จึงจะอนุญาตให้สลับความเร็วเป็น 1M PHY เพื่อส่งไฟล์หรือข้อมูลขนาดใหญ่ได้เร็วขึ้น
    - **Hardware Fallback Compatibility:** ตรวจสอบความสามารถของชิปมือถือ หากเป็นรุ่นเก่าที่ไม่รองรับ Coded PHY จะถอยกลับมาใช้ `1M PHY` ดั้งเดิมอัตโนมัติ 100%
  - **4-Tier Collision Shield for BLE Coded S=8 (เกราะป้องกันสัญญาณชนกันเมื่อเปิดแอปพร้อมกันจำนวนมากในจุดเดียว 🛡️):**
    - ด้วยคุณสมบัติของ BLE Coded PHY (S=8) แพ็กเก็ตจะแช่อยู่ในอากาศ (Airtime) นานขึ้น (~2.4ms ต่อแพ็กเก็ต) หากมีโหนดหนาแน่นในศูนย์พักพิง อาจเสี่ยงคลื่นชนกัน (Packet Collision) ระบบจึงติดตั้งเกราะป้องกัน 4 ระดับ:
      1. **CSMA/CA Carrier Sense & Pseudo-Random TX Jitter:** ก่อนยิงคลื่นออกอากาศ โหนดจะสุ่มหน่วงเวลาหนีกัน (Random Jitter 0–150ms) และตรวจเช็คสถานะช่องสัญญาณวิทยุก่อนส่ง ป้องกันทุกเครื่องยิงคลื่นชนกันพร้อมกัน
      2. **Adaptive Density Throttling Engine:** โหนดจะนับจำนวนเพื่อนบ้านรอบตัว ($N$) อัตโนมัติ:
         - หากโหนดหนาแน่น ($N > 30$ เครื่องในรัศมี): จะปรับลดความถี่ Presence Chirp ให้ห่างขึ้น (เช่น จากทุก 1 นาที เป็นทุก 5–10 นาที) และบีบเพดาน Hop Count เหลือ 3–5 ทอด เพื่อตัด Broadcast Storm
         - หากโหนดเบาบาง ($N < 5$ เครื่อง): เร่งความถี่สแกนและขยาย Hop Count เป็น 10–15 ทอด เพื่อดึงสัญญาณให้ไกลที่สุด
      3. **Smart Gossip Suppression (Probabilistic Relay):** เมื่อได้รับแพ็กเก็ตบรอดแคสต์ โหนดจะหน่วงเวลาสั้นๆ ($t$) หากตรวจพบว่ามีโหนดเพื่อนบ้านอื่นช่วยรีเลย์ส่งต่อแพ็กเก็ตนั้นไปแล้ว โหนดนี้จะสั่งยกเลิกการส่งต่อของตนเองทันที (Drop redundant forward) ลดภาระแบนด์วิดท์ในอากาศลงได้กว่า 70%
      4. **Reed-Solomon Erasure Coding Recovery (8+4):** แม้จะเกิดสัญญาณชนกันจนข้อมูลตกหล่นหายไปในอากาศบางชิ้น ปลายทางยังสามารถประกอบข้อมูลคืนได้สมบูรณ์แบบ 100% หากได้รับชิ้นส่วนเพียง 8 จาก 12 ชิ้น (ทนทานต่อ Packet Loss ได้สูงถึง 33%)
- [ ] **Task 7.3: Adaptive Context-Aware Battery Duty Cycle (BLE-Only Radio Scheduling ⭐️)**
  - พัฒนา `src/core/battery/DutyCycleManager.ts` จัดตารางเวลาสแกนคลื่นวิทยุ **BLE ล้วน 100%** (ปิด Wi-Fi สนิทเพื่อประหยัดไฟ) และปรับความถี่ตามการประสานข้อมูล (Sensor Fusion) ระหว่าง **Hardware Accelerometer (<20µA - ไม่ใช้ Gyroscope เพื่อกันไฟรั่ว)** ร่วมกับ **H3 Res 9 Cell Boundary**:
    - **Stationary Detection (อยู่นิ่งบนโต๊ะ/ในบ้าน):** Accelerometer ตรวจไม่พบแรงขยับ และพิกัดยังไม่หลุดข้ามเส้นขอบ H3 Res 9 (~100m) ➔ ป้องกัน GPS Drift 100% และสั่งหลับยาว:
      - **Normal (>50%):** สแกน BLE 2.0s / **หลับ 60 วินาที** (อยู่ได้ 3–5 วัน)
      - **Saver (20–50%):** สแกน BLE 1.0s / **หลับ 3 นาที** (อยู่ได้ 5–7 วัน)
      - **Low (10–20%):** สแกน BLE 1.0s / **หลับ 10 นาที** (อยู่ได้ 7–10 วัน)
      - **Deep Hibernation (<10%):** สแกน BLE 0.5s / **หลับ 30 นาที** / ยิง SOS สั้น 30ms (ยืดอายุได้อีก 48–72 ชม.)
    - **In-Motion Burst Mode (เมื่อกำลังเดิน/วิ่ง/หลุดข้าม H3 Res 9 ใหม่ 🚶 - ดักจับเครื่องที่เดินสวนกัน):**
      - **Normal (>50%):** สแกน BLE 2.5s / หลับ 5.0s
      - **Saver (20–50%):** สแกน BLE 1.5s / หลับ 10.0s
      - **Low (10–20%):** สแกน BLE 1.0s / หลับ 30.0s
      - **Deep (<10%):** สแกน BLE 0.5s / หลับ 5.0 นาที (รับฟังเฉพาะ SOS Beacon)
    - **Zero-Latency Outbound SOS:** เมื่อผู้ใช้กดปุ่ม SOS เอง เครื่องจะยิงคลื่นทันที 0ms Burst Blast โดยไม่สนใจตารางเวลาหลับ
- [ ] **Task 7.4: BLE-Triggered On-Demand Wi-Fi Direct / Local SoftAP Handshake**
  - ชิป Wi-Fi ปิดสนิท 100% ขณะสแตนด์บาย
  - สะกิดปลุก Wi-Fi ผ่านสัญญาณสั้นของ BLE เฉพาะจังหวะที่ต้องการส่งรูปภาพ แผนที่ หรือไฟล์ขนาดใหญ่ เมื่อส่งเสร็จสั่งปิด Wi-Fi คืนทันทีเพื่อหยุดการสูบแบตเตอรี่
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

- [ ] **Task 7.6: Comprehensive Android Native, Radio & Battery Unit Test Suite (`tests/unit/native/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยและการจำลองฮาร์ดแวร์สำหรับ Android Layer, Duty Cycle, และ Protocol Bridges:
  - **`DutyCycleManager.test.ts`:**
    - ทดสอบ State Machine การสลับโหมดตามระดับแบตเตอรี่ (Normal $>50\%$, Saver $20-50\%$, Low $10-20\%$, Deep $<10\%$)
    - ทดสอบ Sensor Fusion การตรวจจับ Stationary (Accelerometer นิ่ง + H3 Res 9 คงที่): ยืนยันว่าสั่งหลับ 60s, 3 นาที, 10 นาที, 30 นาที ตรงตามสเปก
    - ทดสอบ In-Motion Burst Mode: เมื่อ Accelerometer มีแรงสั่นสะเทือน หรือพิกัดข้ามเส้น H3 Res 9 ระบบต้องสลับมาสแกนถี่ขึ้นอัตโนมัติ
    - ทดสอบ **Zero-Latency Outbound SOS:** เมื่อยิง SOS ระบบต้อง Bypass การหลับทันที 0ms Blast
  - **`CollisionShield.test.ts`:**
    - ทดสอบ CSMA/CA Pseudo-Random Jitter (0–150ms) ว่าไม่มีโหนดสุ่มเวลาชนกัน
    - ทดสอบ Adaptive Density Throttling: เมื่อจำลองเพื่อนบ้าน $N > 30$ โหนด ความถี่ Chirp ต้องลดลง และ Hop Count ต้องถูกจำกัดเหลือ $\le 5$
    - ทดสอบ Gossip Suppression: จำลองโหนดอื่นช่วยรีเลย์แพ็กเก็ตไปแล้ว โหนดตนเองต้องระงับการส่งต่อ (Drop Redundant Forward)
  - **`BleRadioDriverMock.test.ts`:**
    - ทดสอบไดรเวอร์ BLE Coded S=8 Mock: ยืนยันการตั้งค่า PHY_LE_CODED, TX Power สูงสุด
    - ทดสอบ Hardware Fallback: เมื่อจำลองชิปที่ไม่รองรับ Coded PHY ระบบต้องถอยสู่ 1M PHY อัตโนมัติ 100%
  - **`PriorityNotification.test.ts`:**
    - ทดสอบการคัดกรอง Notification: `0x01: SOS` ต้องเรียกคำสั่ง Full-Screen Intent และ Morse Audio Trigger
    - ทดสอบ `0x02: Chat` แสดง Quick Reply Toast และ `0x04: Crisis` แสดง Sticky Alert
  - **`MeshtasticBridge.test.ts`:**
    - ทดสอบการแปลงแพ็กเก็ต TOG v1.1 $\leftrightarrow$ Meshtastic Protobuf Packet
    - ตรวจสอบความถูกต้องของพิกัด Lat/Long และข้อความกู้ชีพใน Protobuf Payload
    - ทดสอบการยกระดับสถานะโหนดขึ้นเป็น Backbone Gateway เมื่อตรวจพบกล่อง Meshtastic
  - **`BriarBridge.test.ts`:**
    - ทดสอบการแปลงแพ็กเก็ตระหว่าง TOG v1.1 และ Bramble Transport Protocol (BTP) Framing
    - ตรวจสอบฟีดข่าวเตือนภัยและการถ่ายโอนข้อความข้ามโครงข่าย

#### 🎯 Acceptance Criteria:
- แอปสามารถรันในโหมดปิดหน้าจอบน Android ต่อเนื่องเกิน 24 ชั่วโมงโดยไม่ถูกระบบปิดกั้น
- การบริโภคแบตเตอรี่ในโหมด Deep Hibernation (<10%) ไม่เกิน 0.2% ต่อชั่วโมง
- ทดสอบเชื่อมต่อกล่อง Meshtastic เสมือน สามารถแปลงแพ็กเก็ต TOG v1.1 ไป-กลับ และส่งต่อข้อความ SOS ข้ามโครงข่าย LoRa ได้ถูกต้อง 100%
- โมดูล `briarAdapter.ts` รองรับโครงสร้าง BTP Framing และสามารถแปลงแพ็กเก็ตฟีดข่าว/ข้อความฉุกเฉินแลกเปลี่ยนกับโหนด Briar แบบสองทิศทางได้สมบูรณ์
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/native/` (ทั้ง 6 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาด

---

### 🔹 Phase 8: Emergency Sideload APK, Acoustic Morse Siren & Optical Strobe
**เป้าหมาย:** ระบบส่งต่อตัวติดตั้งแอปพลิเคชันแบบออฟไลน์ 100% ไร้อินเทอร์เน็ตผ่าน Local Embedded HTTP Server และ Wi-Fi SoftAP Captive Portal พร้อมระบบส่งสัญญาณขอความช่วยเหลือฉุกเฉินด้วยคลื่นเสียงอะคูสติกไซเรน (Acoustic Audio Morse Beacon) และไฟกระพริบฉุกเฉินระดับฮาร์ดแวร์ (Optical Strobe Torch)

#### 📋 TaskList Detail:
- [ ] **Task 8.1: Offline APK Sideloading, Micro Embedded HTTP Server & Dynamic Captive Portal (`src/platform/sideload/` ⭐️)**
  - พัฒนา `android/app/src/main/java/.../LocalHttpServerPlugin.kt`, `MicroDnsServer.kt`, และ `src/ui/components/SideloadQrModal.svelte`:
  - **Android LocalOnlyHotspot & Dynamic Interface IP Discovery:**
    - สั่งเปิด Hotspot ผ่าน `WifiManager.startLocalOnlyHotspot()` 
    - ดึง IP ของ Host Interface จาก `NetworkInterface` แบบไดนามิก (ไม่ Hardcode IP ป้องกันปัญหา Android สุ่มแจก Subnet `192.168.43.x` หรือ `192.168.49.x`)
  - **Micro DNS Daemon (UDP Port 53) for Zero-Click Captive Portal:**
    - รัน DNS Server จิ๋วบน UDP Port 53 ตอบรับทุก DNS Query ชี้กลับมาที่ Dynamic Host IP
    - รองรับมาตรฐาน Captive Portal Trigger: หลอกล่อ URL ตรวจสอบอินเทอร์เน็ตของทั้ง Android (`/generate_204`), Apple iOS (`/hotspot-detect.html`), และ Windows (`/ncsi.txt`) ให้เด้งหน้าเว็บดาวน์โหลด APK ขึ้นมาเต็มจอของผู้ประสบภัยทันทีที่เชื่อมต่อ
  - **Embedded Nano HTTP Server (Port 8080):**
    - ให้บริการไฟล์ติดตั้ง `outgrid-rescue.apk` (ขนาดไม่เกิน 15–20MB) จากที่เก็บข้อมูลภายในเครื่อง
    - จัดเสิร์ฟ Landing Page แบบ Responsive น้ำหนักเบามาก (<50KB) พร้อมปุ่มดาวน์โหลดขนาดใหญ่ภาษาไทยและอังกฤษ
  - **Dual-Purpose QR Code Display:**
    - แสดง Dynamic QR Code บนหน้าจอเครื่องต้นทาง:
      - สแกนด้วยกล้องมือถือทั่วไป: สั่งเชื่อมต่อ Wi-Fi Hotspot อัตโนมัติ (`WIFI:S:OutGrid-Rescue-Download;T:nopass;;`)
      - นำทางเปิดเบราว์เซอร์ไปที่ `http://<Dynamic_Host_IP>:8080/download` ทันที

- [ ] **Task 8.2: Acoustic Audio Morse Siren, Ultrasonic FSK & FFT Demodulator (`src/core/acoustic/` ⭐️)**
  - พัฒนา `src/core/acoustic/AcousticMorseEngine.ts` และไดรเวอร์เสียง:
  - **Cross-Platform Audio Synthesis (Web Audio API + Native AudioTrack):**
    - **Android Native:** ขับเคลื่อนผ่าน `AudioTrack` สังเคราะห์เสียงความแม่นยำสูงระดับ Latency ต่ำ
    - **Web PWA Fallback:** ขับเคลื่อนผ่าน **Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)** สร้างคลื่นเสียงผ่านเบราว์เซอร์ได้ทันที 100%
  - **High-Penetration Audio Siren Pattern:**
    - สร้างคลื่นเสียงสังเคราะห์รูปคลื่นไซน์ (Sine Wave) ที่ความถี่กวาด (Sweep Frequency 800 Hz – 1,800 Hz) ทะลุผ่านซากปรักหักพัง ดินถล่ม หรือเสียงฝนตกหนักได้ดีที่สุด
  - **Dual-Mode Morse Code & Ultrasonic FSK Beacon:**
    - **Mode 1: Audible Morse SOS (`... --- ...`):** สัญญาณสั้น (Dot: 150ms) สัญญาณยาว (Dash: 450ms) สลับเสียงไซเรนบีบคั้นเป็นจังหวะต่อเนื่อง
    - **Mode 2: Acoustic Ultrasonic/High-Frequency Data Chirp (18–20 kHz):**
      - เข้ารหัสตัวเลขพิกัดละติจูด/ลองจิจูดและข้อความสั้นด้วย Frequency Shift Keying (FSK: Mark 18.5 kHz / Space 19.5 kHz, 100 baud)
  - **Goertzel Algorithm / FFT Demodulator Pipeline (ฝั่งรับของกู้ภัย ⭐️):**
    - ดักฟังคลื่นเสียงผ่านไมโครโฟน ประมวลผลด้วย **Goertzel Algorithm / Fast Fourier Transform (FFT 512–1024 จุด)** เพื่อตรวจจับความถี่เฉพาะและแปลงกลับเป็นไบต์พิกัด GPS แสดงบนเรดาร์ในระยะ 30–50 เมตร แม้ไม่มีคลื่นบลูทูธ

- [ ] **Task 8.3: Optical Emergency Strobe Torch & Web ImageCapture Torch Fallback (`src/platform/hardware/` ⭐️)**
  - พัฒนา `src/platform/hardware/FlashlightPlugin.kt`:
  - **Dual-Platform Flashlight Strobe Controller:**
    - **Android Native:** สั่งงานหลอดไฟแฟลช LED ผ่าน `CameraManager.setTorchMode`
    - **Web PWA Fallback:** สั่งงานผ่าน **ImageCapture API (`MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })`)** สั่งเปิดไฟแฟลชบนเบราว์เซอร์มือถือได้โดยไม่ต้องลงแอป Native
    - ยิงจังหวะไฟกระพริบฉุกเฉินมาตรฐานสากล **Morse Code SOS (`... --- ...`)**
    - ปรับความสว่างสูงสุด (Max Luminance) สำหรับการนำร่องให้โดรนกู้ภัยหรือเฮลิคอปเตอร์ค้นหามองเห็นจากมุมสูงในเวลากลางคืนได้ไกลกว่า 1–2 กิโลเมตร
  - **Thermal Protection & Battery-Guarded Duty Strobe:**
    - กะพริบเป็นรอบ 3 ชุดแล้วหยุดพัก 10 วินาที ป้องกันหลอดแฟลชร้อนจัด (Overheating) และยืดอายุแบตเตอรี่โทรศัพท์ให้ส่องสว่างต่อเนื่องได้นานข้ามคืน

- [ ] **Task 8.4: Comprehensive Sideload, Audio & Optical Unit Test Suite (`tests/unit/emergency/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยสำหรับการติดตั้งออฟไลน์และสัญญาณเสียง/แสงฉุกเฉิน:
  - **`LocalHttpServer.test.ts`:**
    - ทดสอบการเริ่มและหยุดทำงานของ Micro HTTP Server
    - ทดสอบการดึง Dynamic Interface IP และการตอบรับ UDP DNS Query (Port 53 Captive Portal Trigger)
    - ทดสอบ HTTP GET `/download` ตรวจสอบความถูกต้องของ MIME Type (`application/vnd.android.package-archive`) และ Content-Length
  - **`AcousticMorseEngine.test.ts`:**
    - ทดสอบการแปลงข้อความตัวอักษรเป็นชุดสัญลักษณ์ Morse Code (`.` และ `-`) ถูกต้อง 100%
    - ทดสอบ Timing ของ Dot (150ms), Dash (450ms), และช่วงเว้นวรรค
    - ทดสอบการสร้าง Sine Wave Buffer ที่ความถี่ 800Hz–1800Hz ทั้งบน Web Audio Mock และ PCM AudioTrack
  - **`FskDemodulator.test.ts`:**
    - ทดสอบการสังเคราะห์คลื่นเสียง FSK (18.5 kHz / 19.5 kHz) จากข้อมูลพิกัด GPS
    - ทดสอบการถอดรหัสคลื่นเสียงด้วย Goertzel Algorithm / FFT ยืนยันว่าถอดรหัสพิกัดกลับมาได้ถูกต้อง 100%
  - **`FlashlightStrobe.test.ts`:**
    - ทดสอบรอบจังหวะเวลาเปิด/ปิดไฟฉาย Camera2 Mock และ Web ImageCapture Torch Mock ตามลำดับ Morse Code SOS
    - ทดสอบระบบตัดความร้อนและประหยัดพลังงาน (Thermal Protection): ปิดพัก 10 วินาทีทุกรอบ
  - **`SideloadQrGenerator.test.ts`:**
    - ทดสอบสร้างสตริง Wi-Fi Config สำหรับ QR Code (`WIFI:S:...`) และ URL Redirect ร่วมกับ Dynamic Host IP

#### 🎯 Acceptance Criteria:
- สมาร์ตโฟนเครื่องอื่นที่ไม่มีแอป สามารถต่อ Wi-Fi SoftAP ของเครื่องแม่ข่ายแล้วเปิดหน้าเว็บดาวน์โหลด APK ผ่าน Captive Portal ได้สำเร็จ 100% แบบออฟไลน์
- สัญญาณเสียง Acoustic Morse Siren สังเคราะห์คลื่นเสียงย่าน 800–1800Hz และถอดรหัสเสียง FSK พิกัด GPS ด้วย Goertzel Algorithm ได้ถูกต้อง 100%
- ระบบไฟฉายกระพริบแสง SOS ทำงานได้ทั้งบน Android Native (`CameraManager`) และ Web PWA (`ImageCapture API`) พร้อมระบบตัดความร้อนประหยัดแบตเตอรี่
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/emergency/` (ทั้ง 5 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาด

---

### 🔹 Phase 9: Cloudflare Spatial Signaling, Public STUN & Donation Dashboard
**เป้าหมาย:** พัฒนาระบบคลาวด์บน Cloudflare Workers + D1 ช่วยเชื่อมโยงโครงข่ายผ่านอินเทอร์เน็ตฟรี ไร้ค่าใช้จ่าย Server ด้วย Public STUN และหน้ารับบริจาคโปร่งใส

#### 📋 TaskList Detail:
- [ ] **Task 9.1: Zero-Cost Public STUN & P2P WebRTC Signaling Engine**
  - ผนวก Public STUN เซิร์ฟเวอร์ฟรีสากล (`stun.l.google.com:19302`, `stun.cloudflare.com:3478`)
  - พัฒนา WebRTC DataChannel สำหรับเชื่อมต่อ P2P ระหว่างผู้ใช้ที่เข้าถึงเน็ตได้ ข้าม NAT โดยไม่ผ่าน Media Relay
- [ ] **Task 9.2: Cloudflare Workers Spatial Presence API, D1 Mesh Graph Schema & Zero-Trust Security (Heartbeat Engine ⭐️)**
  - พัฒนา Cloudflare Worker API บน Endpoint `https://api.outgrid-mesh.workers.dev`:
  - **1. Cryptographic Zero-Trust API Security & Anti-Spoofing Architecture:**
    - **Ed25519 Request Signing:** ทุก HTTP Request ที่โหนดส่งขึ้น Server จะต้องถูกเซ็นกำกับด้วย Master Private Key (Ed25519) ประจำเครื่อง
      - Headers: `X-Node-ID` (8-byte hash), `X-Timestamp` (Unix ms), `X-Nonce` (16B Hex), `X-Signature` (Ed25519 64B Hex)
    - **Anti-Replay & Timestamp Drift Protection:** Worker ตรวจสอบ Timestamp หากเบี่ยงเบนเกิน ±60 วินาที หรือพบ Nonce ซ้ำใน Cloudflare KV (TTL 120s) จะตัด Drop ทันที
    - **Zero-Trust Identity Verification:** ตรวจสอบความถูกต้องของ Signature เทียบกับ `pubkey` เพื่อยืนยันว่าไม่มีใครสามารถสวมรอย Node ID ของผู้อื่นได้
    - **Rate Limiting & Abuse Shield:** จำกัดอัตราการยิงไม่เกิน 1 ครั้ง/15-30 วินาทีต่อโหนด ป้องกัน Sybil Attack และ DDoS
  - **2. Adaptive Context-Aware Heartbeat Scheduling (ความถี่การรายงานตัว 1-60 นาที เพื่อเซฟแบตเตอรี่ & เซฟโควตาฟรี):**
    - **กำลังชาร์จไฟ / เป็น Supernode:** ยิงทุกๆ **1 – 2 นาที** (แบตไม่จำกัด อัปเดตสถานะแบบ Real-time)
    - **แบตเตอรี่ปกติ (>50%):** ยิงทุกๆ **5 นาที** (จุดสมดุล ยืนยันสถานะโดยกินไฟโมเด็ม <0.05%/ชม.)
    - **โหมดประหยัด (20–50%):** ยิงทุกๆ **15 นาที**
    - **แบตเตอรี่ต่ำ (10–20%):** ยิงทุกๆ **30 นาที**
    - **วิกฤต (<10%):** ยิงทุกๆ **60 นาที** (หรือปิดการส่งเน็ต เก็บแบตไว้ส่งเฉพาะ BLE SOS สั้น)
    - **Event-Driven Instant Flush (ยิงทันที 0ms ไม่ต้องรอรอบเวลา):** เมื่อเพิ่งต่อเน็ตได้ครั้งแรกหลังออฟไลน์ (Re-connected), เมื่อจับสัญญาณฉุกเฉิน `SOS_BEACON` ของคนอื่นได้, หรือเมื่อก้าวข้ามขอบเขต H3 Res 7 ใหม่
  - **3. Production API Endpoints Specification:**
    - `POST /v1/presence/heartbeat`: โหนดส่งสถานะตนเอง + ข้อมูลแบตเตอรี่ละเอียด + รายชื่อ Neighbors รอบตัว
      - Request Body: `node_pubkey`, `h3_res7`, `battery: {level_pct, is_charging, power_save_mode, est_runtime_min, battery_tier}`, `mesh_role`, `seen_neighbors: [{peer_id_hash, rssi, last_seen_sec_ago, via_transport, battery_tier}]`
      - Response Body: `status: "ok"`, `nearby_active_nodes`, `supernodes_in_zone`, `inbound_emergency_alerts`
    - `GET /v1/spatial/neighbors?h3=...&k_ring=1`: ดึงข้อมูลโหนดใกล้เคียงในรัศมีรังผึ้งรอบตัว สำหรับเชื่อมต่อ WebRTC P2P
    - `GET /v1/spatial/stream?h3=...`: **Server-Sent Events (SSE Real-Time Push):** สตรีมพิกัด SOS สดเข้าสู่หน้าจอ Incident Commander แดชบอร์ดแบบ Zero-Polling ประหยัด D1 Read Quota 100%
    - `POST /v1/alerts/cap-ingest`: นำเข้าประกาศเตือนภัยพิบัติระดับชาติมาตรฐาน **CAP v1.2 (Common Alerting Protocol)** แปลงเป็นแพ็กเก็ต `0x04: CRISIS_FEED` เซ็นกำกับด้วย Authority Ed25519 Signature
  - **4. Cloudflare D1 Multi-Table Mesh & Free-Tier Quota Coalescing (`cloudflare/schema.sql` ⭐️):**
    - **D1 Write Coalescing Buffer:**
      - รวบรวม Heartbeat หลายรายการในพื้นที่ H3 เดียวกันไว้ใน Worker Memory / KV Buffer แล้วทำ **Batch Upsert (Multi-row Insert)** ทุก 10–30 วินาที ช่วยลดจำนวน Write Transaction ลงกว่า 85% ป้องกันการชนเพดาน Free Tier (100,000 Writes/วัน)
    - **ตาราง `active_nodes`:** บันทึก `node_id_hash` (PK), `pubkey`, `h3_res7`, `battery_level`, `is_charging`, `power_save_mode`, `est_runtime_min`, `battery_tier`, `mesh_role`, `transport_type`, `last_nonce`, `last_seen_at`, `expires_at` (Index: `(h3_res7, expires_at)`)
    - **ตาราง `node_neighbors`:** บันทึก `reporter_node_hash`, `neighbor_node_hash`, `rssi`, `via_transport`, `neighbor_battery_tier`, `seen_at` (PK: `(reporter, neighbor)`) เพื่อให้แดชบอร์ดสร้างกราฟความสัมพันธ์ของเครือข่ายได้แบบ Live
    - **ตาราง `passkey_credentials` (ระบบยืนยันตัวตน FIDO2 / WebAuthn ฟรี 100% ไร้ค่าบริการส่ง Email):**
      - เก็บรหัสประจำตัวอุปกรณ์ชีวมิติ: `credential_id` (PK, Base64URL), `user_handle` (UUID), `public_key` (COSE format), `counter` (ป้องกัน Clone), `device_name` (เช่น "Pixel 8 Pro", "iPhone 15"), `created_at`
    - **ตาราง `user_contacts` (ระบบกู้คืนรายชื่อเพื่อนอัตโนมัติเมื่อลงแอปใหม่):**
      - เก็บรหัสเพื่อนและกุญแจสาธารณะ: `id` (PK), `user_handle` (FK), `friend_node_id` (uint64 hex), `friend_nickname` (Text), `friend_ed25519_pubkey` (32B Base64), `friend_x25519_pubkey` (32B Base64), `is_verified` (Integer), `safety_numbers` (Text 8 หลัก), `updated_at` (Unique: `user_handle, friend_node_id`)
    - **5. Passkey & Contacts Sync Endpoints:**
      - `POST /v1/auth/passkey/register-challenge`: สร้าง Challenge สำหรับลงทะเบียนสแกนนิ้วครั้งแรก
      - `POST /v1/auth/passkey/register-verify`: ตรวจสอบลายเซ็น FIDO2 และบันทึก Credential ลง D1
      - `POST /v1/auth/passkey/login-challenge`: สร้าง Challenge สำหรับเครื่องที่เพิ่งลงใหม่ต้องการกู้คืน
      - `POST /v1/auth/passkey/login-verify`: ยืนยันสแกนนิ้วสำเร็จ แจก Session Token สั้น
      - `GET /v1/user/contacts`: ดึงรายชื่อเพื่อน + Node ID + Public Key กลับมาลงเครื่องใหม่ทันทีใน 1 วิ
      - `POST /v1/user/contacts/sync`: อัปเดตรายชื่อเพื่อนใหม่ขึ้น D1 อัตโนมัติเมื่อมีการแอดเพื่อนผ่าน QR
    - **Auto-Prune Cron Job:** สั่งล้างโหนดหมดอายุอัตโนมัติ (`expires_at < unixepoch()`) ทุก 1 ชั่วโมง รักษาฐานข้อมูลให้สะอาดและฟรีตลอดชีพ
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
- [ ] **Task 9.6: Passkey & Cloud Identity Engine (Zero-Cost FIDO2 Recovery & Google Sign-In Option ⭐️)**
  - **Web Dashboard Authentication (Strict Role-Based Cloud Access):**
    - บังคับล็อกอินสำหรับเจ้าหน้าที่ศูนย์บัญชาการกู้ภัยผ่าน **Google / Gmail (OAuth 2.0 / OpenID Connect)** หรือ **Cloudflare Access (OTP/SSO)** สำหรับการเข้าถึงระบบควบคุมส่วนกลาง, ดูพิกัดแม่นยำ (Res 9/11 Precision), และคิวสั่งการส่งทีมกู้ภัย ป้องกันบุคคลภายนอกเข้าถึงข้อมูลความลับ
  - **Android Mobile App Zero-Mental-Load Passkey Engine (`src/core/auth/PasskeyAuthManager.ts` ⭐️):**
    - **100% Zero-Barrier Instant Guest Mode:** เมื่อไม่มีสัญญาณอินเทอร์เน็ต แอปเปิดให้ส่งสัญญาณฉุกเฉิน `SOS_BEACON`, ดูแผนที่ออฟไลน์, และแชต P2P ได้ทันที 100% โดยระบบสุ่มสร้าง Local Ed25519/X25519 Identity ให้อัตโนมัติ (<10ms) ไม่บล็อกหน้าจอ ไม่บังคับจำรหัส 12 คำ
    - **Zero-Cost Passkey Biometrics Contact Backup (Google Credential Manager / Apple Keychain):**
      - เมื่อต่อเน็ตได้ ผู้ใช้สามารถผูก Passkey สแกนนิ้ว/ใบหน้าเพื่อสำรองรายชื่อเพื่อน (Node ID + Public Keys) ขึ้น Cloudflare D1
      - **Clean Reinstall Recovery:** เมื่อถอนการติดตั้งแล้วลงใหม่ เครื่องจะสร้าง Node ID ใหม่ทันที และกู้คืนเฉพาะสมุดเพื่อนกลับมาด้วยสแกนนิ้วเพียง 1 วินาที โดยไม่ต้องจ่ายเงินค่าส่ง SMS/Email OTP แม้แต่บาทเดียว
    - **Optional Google Account Binding:** เปิดให้ผูกบัญชี Google เพื่อกำหนดรายชื่ออีเมลครอบครัวสำหรับแจ้งเตือนสถานะความปลอดภัยอัตโนมัติ

- [ ] **Task 9.7: Comprehensive Cloudflare, Signaling & Passkey Unit Test Suite (`tests/unit/cloud/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยสำหรับ Cloudflare Workers, D1 Schema, P2P WebRTC Signaling, และ Passkey Auth:
  - **`WebRtcSignaling.test.ts`:**
    - ทดสอบการดึง Public STUN Configuration (`stun.l.google.com:19302`, `stun.cloudflare.com:3478`)
    - ทดสอบ ICE Candidate Exchange และ WebRTC DataChannel Handshake จำลองระหว่าง 2 โหนด
  - **`CloudflareWorkerApi.test.ts`:**
    - ทดสอบการตรวจสอบ Ed25519 Request Signing: ปฏิเสธ Request ที่ไม่มี Signature หรือ Signature ผิด
    - ทดสอบ Anti-Replay Guard: ส่งซ้ำ Nonce เดิม หรือส่ง Timestamp คลาดเคลื่อนเกิน 60 วินาที ต้องได้ HTTP 401/403 ทันที
    - ทดสอบ Rate Limiting Shield: ยิงถี่เกิน 1 ครั้ง/15 วินาที ต้องตอบกลับ HTTP 429 Too Many Requests
    - ทดสอบ Heartbeat Endpoint (`POST /v1/presence/heartbeat`): ตรวจสอบการบันทึกลง Mock D1
    - ทดสอบ SSE Real-Time Stream Endpoint (`GET /v1/spatial/stream`)
  - **`D1DatabaseSchema.test.ts`:**
    - ทดสอบ Schema Migration ใน `cloudflare/schema.sql` (ตาราง `active_nodes`, `node_neighbors`, `passkey_credentials`, `user_contacts`)
    - ทดสอบ Spatial Query: ค้นหาโหนดในรัศมี H3 Res 7 และ K-Ring ($k=1$)
    - ทดสอบ Auto-Prune Query: กวาดล้างโหนดที่ `expires_at < unixepoch()` ได้ถูกต้อง 100%
  - **`D1QuotaCoalescing.test.ts`:**
    - ทดสอบ Worker Buffer Coalescing: ยิง Heartbeat 500 รายการพร้อมกันใน 5 วินาที ระบบต้องรวมเป็น Batch Insert 1 ครั้ง ลด Write Query ได้ $\ge 80\%$
  - **`CapAlertIngestion.test.ts`:**
    - ทดสอบการแปลงประกาศภัยพิบัติมาตรฐาน CAP v1.2 XML/JSON เป็นแพ็กเก็ต TOG v1.1 `CRISIS_FEED`
    - ตรวจสอบ Authority Ed25519 Signature บนแพ็กเก็ตเตือนภัย
  - **`PasskeyAuthManager.test.ts`:**
    - ทดสอบการสร้างและตรวจสอบ FIDO2 Registration Challenge & Verification
    - ทดสอบการสร้างและตรวจสอบ FIDO2 Authentication Challenge สำหรับกู้คืนรายชื่อเพื่อนหลัง Reinstall
    - ทดสอบการซิงก์ `user_contacts` ระหว่างเครื่องและคลาวด์ D1
  - **`DualTierPrivacy.test.ts`:**
    - ทดสอบ Guest Filter: ปรับพิกัดเป็น H3 Res 7 (~1.2km) และเบลอข้อมูลระบุตัวตน (Zero-PII)
    - ทดสอบ Responder Authorization: สแกน Signed Delegation QR Code แล้วปลดล็อกพิกัด Res 9/11 ได้ถูกต้อง 100%

#### 🎯 Acceptance Criteria:
- การเชื่อมต่อ WebRTC P2P ผ่าน Public STUN ข้ามเครือข่ายสำเร็จโดยไม่ต้องมีเซิร์ฟเวอร์ Relay
- D1 Database รองรับการบันทึกสถานะโหนด Spatial H3 และแสดงผล Heatmap อย่างถูกต้อง พร้อม Buffer Coalescing ประหยัดโควตา Write
- สตรีม Server-Sent Events (SSE) ยิงการแจ้งเตือน SOS สดเข้าสู่หน้าจอ Incident Commander ได้ทันที
- นำเข้าประกาศเตือนภัยมาตรฐาน CAP v1.2 และแปลงเป็นแพ็กเก็ต `CRISIS_FEED` เซ็นรับรองสิทธิ์ถูกต้อง 100%
- หน้าเว็บและ API แยกมุมมอง Guest (เบลอพิกัด Res 7) และ Responder (พิกัดแม่นยำ Res 9/11) ได้ถูกต้อง 100%
- การสแกน QR Code หน้างานสามารถมอบสิทธิ์กู้ภัยแบบออฟไลน์สำเร็จ และระบบ OTP / SSO Cloudflare Access ตรวจสอบโดเมนอีเมลราชการได้อย่างแม่นยำ
- Web Dashboard ใช้งานได้ผ่าน `*.pages.dev` และ API รันผ่าน `*.workers.dev` พร้อมทั้งแอปมือถือสามารถสลับ Custom Server URL ได้อย่างถูกต้อง
- ระบบ Passkey FIDO2 ลงทะเบียนและกู้คืนรายชื่อเพื่อนจาก D1 ได้สำเร็จ 100% ไร้ค่าใช้จ่าย SMS/Email
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/cloud/` (ทั้ง 7 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาด

---

### 🔹 Phase 10: Multiplatform UI/UX, 10 Global Languages & Disaster Drills
**เป้าหมาย:** พัฒนาหน้าจอการใช้งานระดับสากล รองรับ 10 ภาษาหลักทั่วโลก แผนที่ออฟไลน์ 5MB และซ้อมรับมือสถานการณ์ฉุกเฉินเสมือนจริง

#### 📋 TaskList Detail:
- [ ] **Task 10.1: Universal 10-Language Embedded i18n Engine**
  - พัฒนาระบบแปลภาษาออฟไลน์ (`src/ui/i18n/`) น้ำหนักเบา (<100KB JSON) บรรจุ 10 ภาษา:
    1. English (`en`) | 2. 中文 (`zh`) | 3. Español (`es`) | 4. हिन्दी (`hi`) | 5. العربية (`ar` - รองรับ RTL)
    6. Français (`fr`) | 7. Русский (`ru`) | 8. Português (`pt`) | 9. 日本語 (`ja`) | 10. ไทย (`th`)
  - ตรวจจับภาษาอัตโนมัติตาม Locale ของเครื่อง และสลับภาษาได้ทันทีโดยไม่ต้องต่อเน็ต
- [ ] **Task 10.2: Icon-Driven Disaster UI, Unified Multi-Channel Media Engine & Accessibility (⭐️)**
  - ออกแบบ UI แบบสัญลักษณ์สากล (Universal Icons) ใช้งานได้แม้ผู้ประสบภัยอ่านหนังสือไม่ออก
  - คอนทราสต์สูงพิเศษ (High Contrast Mode) สำหรับมองกลางแดดจ้าหรือในควันไฟ
  - ปุ่ม Emergency SOS สีแดงขนาดใหญ่ กดครั้งเดียวส่งพิกัดและกระจายสัญญาณฉุกเฉินทันที
  - **Unified Chat, Crisis Feed & SOS Media Engine (มาตรฐานเดียวกันทุกช่องทาง):**
    - **1. Text Message Hard Limit:**
      - บังคับล็อกช่องพิมพ์ **ห้ามเกิน 280 ตัวอักษรเด็ดขาด** (Hard Limit) ครอบคลุมทั้ง **1-on-1 Chat, Crisis Feed และ SOS Emergency Note** (รวมถึง Group Chat ในอนาคต)
      - แสดง Counter ตัวอักษรสด `0/280` ป้องกันแพ็กเก็ตเกินขนาด เพื่อให้ส่งทะลวงผ่านคลื่น BLE Coded PHY (S=8) ได้ใน 1 ทอด
    - **2. Client-Side Auto-Compress Image Engine (`ImageCompressorModal.tsx`):**
      - ผู้ใช้เลือกภาพถ่ายขนาดใดก็ได้จากกล้อง/แกลเลอรี ระบบจะบีบอัดและแปลงเป็น **WebP ในเครื่องทันที**
      - เริ่มต้นที่ **320x240 px ขนาดเพียง 5–12 KB** (เห็นสะพานขาด/ป้ายชัดเจน) เพื่อให้ส่งผ่าน BLE Mesh ได้ใน 1–2 วินาที พร้อมแถบพรีวิวยืนยัน
    - **3. Push-to-Talk Voice Memo with Review & Confirm (`VoiceRecorderModal.tsx`):**
      - รองรับการอัดเสียงแจ้งเหตุสำหรับผู้ป่วย/ผู้สูงอายุ ทั้งในห้องแชต 1-on-1 และแนบไปกับสัญญาณ SOS
      - **ความยาวสูงสุด 15 วินาที** (ตัดหยุดบันทึกอัตโนมัติเมื่อครบ 15 วิ ขนาด ~8–15 KB บีบอัดด้วย Opus Mono 6–12 kbps)
      - **Review & Confirm Flow (ห้ามส่งทันที):** เมื่ออัดเสร็จจะขึ้นแถบพรีวิวให้ผู้ใช้ **กดฟังเสียงทบทวนความชัดเจนได้ก่อน** พร้อมปุ่ม "อัดใหม่" และ **ผู้ใช้ต้องกดปุ่มยืนยันส่ง (Confirm Send) ด้วยตนเองเสมอ** เพื่อป้องกันการเผลอกดส่งไฟล์เสียงขยะไปแช่คลื่นวิทยุในอากาศ
    - **4. Zero-Cost Biometric Passkey Sync Flow (`PasskeyModal.tsx` ⭐️):**
      - เพิ่มปุ่ม One-Tap **"ผูกลายนิ้วมือ/FaceID สำรองรายชื่อเพื่อนฟรี"** ในหน้าตั้งค่า/โปรไฟล์
      - เมื่อลบแอปแล้วลงใหม่ บนหน้าแรกจะมีปุ่ม **"กู้คืนรายชื่อเพื่อนด้วย Passkey"** แตะนิ้วเดียวดึงรายชื่อเพื่อน (Node ID + Public Keys) กลับมาลงเครื่องทันทีใน 1 วินาที โดยไม่ต้องมีระบบส่ง Email OTP ใดๆ ให้เสียค่าบริการ
- [ ] **Task 10.3: Hybrid Smart Spatial Pyramid & Dual-Platform Offline Map Engine (Android & Web PWA ⭐️)**
  - **สถาปัตยกรรมแผนที่ออฟไลน์แบบผสมผสาน (Hybrid Pragmatic Spatial Architecture):**
    - **1. Base Offline Vector Bundle (แผนที่ครอบคลุมทั้งโลก 100% ขนาดเพียง 3–5 MB ฝังใน App ตั้งแต่วินาทีแรก):**
      - ฝังไฟล์ Vector แผนที่ทั้งโลกสำเร็จรูป (`vector-basemap.pbf` $\le 5\text{MB}$) ที่แปลงจาก Natural Earth World Vector + OpenStreetMap Global Landmass/Borders (ODbL) ลงใน Local Asset ของแอป Android และ IndexedDB บน Web PWA
      - **Global Offline Coverage (ครอบคลุมทุกประเทศทั่วโลก 100%):** บรรจุขอบเขตทุกทวีป, แนวชายฝั่งทะเลทั่วโลก, เส้นแบ่งเขตแดนทุกประเทศทั่วโลก, เกาะสำคัญ, แม่น้ำสายหลักระดับโลก, และแนวทางหลวงเชื่อมต่อระหว่างประเทศ
      - **Zero-Internet Guarantee:** รับประกันว่าไม่ว่าจะนำแอปไปเปิดใช้งานที่ประเทศใดในโลก (เช่น ไทย, ญี่ปุ่น, สหรัฐฯ, ยุโรป หรือเกาะกลางมหาสมุทร) แม้ไม่มีเน็ตตั้งแต่ดาวน์โหลดเสร็จ จะมีแผนที่เวกเตอร์ทั้งโลกเปิดดูได้ทันที 100% ไม่มีปัญหาหน้าจอสีเทาว่างเปล่า
    - **2. Cloudflare Edge Tile Cache Proxy (สำหรับซูมดูถนน/ซอยบ้านความละเอียดสูงเมื่อมีเน็ต):**
      - พัฒนา Cloudflare Worker ให้ทำหน้าที่เป็น **Edge Cache Proxy** ดึง Map Tile ระดับลึก (Zoom 14+) จาก OpenStreetMap / CARTO มาเก็บไว้ที่ Global Edge Cache
      - **ODbL Compliance & OSM Protection:** ป้องกันการยิงรัวกวนเซิร์ฟเวอร์กลางของ OSM โดย Cloudflare จะดูดซับ Request ซ้ำ (Cache Hit Rate >95%) ส่งให้ผู้ใช้ได้เร็ว 5–10ms และถูกกฎ Tile Usage Policy 100%
      - **On-Demand Local Sync:** เมื่อผู้ใช้เปิดดูแผนที่ซอยบ้านขณะมีเน็ต แอปจะบันทึกชิ้นส่วนแผนที่นั้นลงใน SQLite / IndexedDB ในเครื่องอัตโนมัติ (เพดานไม่เกิน 50MB ด้วย FIFO Auto-Prune) เพื่อให้ยังเปิดดูซอยบ้านนั้นได้แม้เน็ตตัดในภายหลัง
    - **3. Pure Math H3 Hexagon Overlay (แผนที่กู้ภัยขนาด 0 ไบต์):**
      - ใช้ `h3-js` คำนวณขอบเขตรังผึ้งหกเหลี่ยมด้วยสูตรคณิตศาสตร์สดบนหน้าจอ (0 ไบต์) ซ้อนทับบนเวกเตอร์แผนที่ (Zoom 14+ = Res 9 ~100m, Zoom 11-13 = Res 7 ~1.2km, Zoom <10 = Res 5 ~8.5km)
      - แสดงเข็มทิศเรดาร์นำทางและระยะทางเป็นเมตร ชี้เป้าตรงไปยังหมุดผู้ประสบภัยที่ถอดรหัสจาก H3 Local Delta Offset ได้แม่นยำระดับ < 1 เมตร (ระดับหลังคาบ้าน)
    - **4. Legal Attribution:** ใส่ข้อความเครดิต `© OpenStreetMap contributors` อย่างถูกต้องในหน้าจอเกี่ยวกับ (About) และมุมแผนที่
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

- [ ] **Task 10.6: Comprehensive UI/UX, Media, Map & Multiplatform Unit Test Suite (`tests/unit/ui/` ⭐️)**
  - พัฒนาชุดทดสอบหน่วยสำหรับเลเยอร์หน้าจอ การบีบอัดสื่อ แผนที่เวกเตอร์ และระบบหลายภาษา:
  - **`I18nEngine.test.ts`:**
    - ทดสอบการโหลดและ Fallback ของคำแปลครบทั้ง 10 ภาษา (en, zh, es, hi, ar, fr, ru, pt, ja, th)
    - ตรวจสอบความถูกต้องของ Right-to-Left (RTL) Layout Trigger เมื่อเลือกภาษาอาหรับ (`ar`)
    - ทดสอบการดึง System Locale ของเครื่องมาตั้งค่าเริ่มต้นอัตโนมัติ
  - **`MediaCompressor.test.ts`:**
    - ทดสอบ Client-Side Image Compressor: แปลงรูปภาพขนาดใหญ่เป็น WebP 320x240 px ขนาดควบคุมระหว่าง 5–12 KB
    - ทดสอบ Voice Recorder Engine: ควบคุมความยาวตัดหยุดอัตโนมัติที่ 15 วินาที และบีบอัดเป็น Opus Mono 6–12 kbps ขนาด $\le 15\text{ KB}$
    - ทดสอบ Review & Confirm State Machine: ยืนยันว่าไม่อนุญาตให้ส่งไฟล์เสียงหากผู้ใช้ยังไม่ได้กด Confirm
    - ทดสอบ Text Counter Limit: บล็อกการพิมพ์เกิน 280 ตัวอักษรอย่างเข้มงวด
  - **`OfflineMapEngine.test.ts`:**
    - ทดสอบการอ่านไฟล์เวกเตอร์ต้นฉบับ `vector-basemap.pbf` (ขนาด $\le 5\text{MB}$) และแสดงผลรูปทรงทวีป/พรมแดน
    - ทดสอบ Pure Math H3 Hexagon Overlay: คำนวณรูปทรงรังผึ้ง Res 9, Res 7, Res 5 ซ้อนทับพิกัดได้ถูกต้องใน RAM 0 ไบต์
    - ทดสอบการคำนวณเข็มทิศเรดาร์ (Bearing & Distance) ชี้เป้าไปยังหมุดผู้ประสบภัย
  - **`HelpManualMarkdown.test.ts`:**
    - ทดสอบการพาร์ส Markdown คู่มือทั้ง 10 ภาษาผ่าน Micro Parser (<15KB) โดยไม่เกิด Error
    - ยืนยันว่าเนื้อหาคู่มือทุกภาษาออฟไลน์สามารถอ่านได้ 100% ในโหมด Airplane Mode
  - **`PasskeyModal.test.ts`:**
    - ทดสอบ Interaction Flow การกดปุ่มผูกลายนิ้วมือ และปุ่มกู้คืนรายชื่อเพื่อนด้วย Passkey
    - ตรวจสอบการจัดการ UI State ระหว่างรอสแกนนิ้ว และการแสดงผลสถานะเสร็จสิ้นใน 1 วินาที

#### 🎯 Acceptance Criteria:
- สลับภาษาทั้ง 10 ภาษาได้สมบูรณ์ ภาษาอารบิก (Arabic) แสดงผลจัดหน้าจากขวาไปซ้าย (RTL) ถูกต้อง 100%
- เอนจินบีบอัดรูปภาพ WebP ควบคุมขนาดไฟล์ $\le 12\text{KB}$ และเสียง Opus ความยาว 15 วินาที $\le 15\text{KB}$ พร้อม Review & Confirm
- แผนที่เวกเตอร์ออฟไลน์ขนาด $\le 5\text{MB}$ แสดงผลได้ทั่วโลก 100% แม้ไม่มีเน็ต พร้อม H3 Hexagon Overlay
- คู่มือการเอาชีวิตรอด 10 ภาษาเปิดอ่านออฟไลน์ได้ครบถ้วนในโหมดเครื่องบิน
- การจำลองสถานการณ์ฉุกเฉิน 20 โหนด สามารถส่งต่อข้อความ SOS ไปยังโหนดปลายทางที่มีเน็ตได้สำเร็จครบถ้วน
- **Unit Test Coverage 100%:** ทุกชุดทดสอบใน `tests/unit/ui/` (ทั้ง 5 ไฟล์ทดสอบ) ทำงานผ่าน 100% ไร้ข้อผิดพลาด

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
  - Tiered TTL & Storage Quota Clamping (ทดสอบ FIFO ลบประวัติแชตเก่าที่หมดอายุทิ้งเมื่อครบ 50 MB และปกป้อง SOS 72 ชม.)
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
---

## 7. แผนและขั้นตอนการ Deploy ระบบสู่สภาพแวดล้อมจริง (Deployment Architecture, Pipeline & Release Strategy 🚀)

เพื่อให้การปล่อยระบบ OutGrid Mesh สู่การใช้งานจริงของเจ้าหน้าที่กู้ภัยและประชาชนเป็นไปอย่างแม่นยำ ปลอดภัย และไร้ค่าใช้จ่ายเซิร์ฟเวอร์ ($0) แผนการ Deploy จึงถูกแบ่งออกเป็น **4 ช่องทางหลัก (4 Deployment Pipelines)** พร้อมระบบตรวจสอบอัตโนมัติ (Automated CI/CD):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                OutGrid Mesh Dual-Environment Deployment Pipeline                       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  [ Git Push: uat / main ] ──► [ GitHub Actions CI/CD Pipeline ]                                       │
│                                      │                                                                 │
│                                      ├─► Step 1: Syntax Check (`node scripts/checkSyntax.js`)          │
│                                      ├─► Step 2: Full Unit Tests 51 Suites (`bun test`)                │
│                                      ├─► Step 3: TypeScript Typecheck (`svelte-check`)                 │
│                                      └─► Step 4: Svelte/Vite Static Assets Compile (`bun run build`)   │
│                                                    │                                                   │
│     ┌──────────────────────────────────────────────┴─────────────────────────────────────────────┐     │
│     ▼                                                                                            ▼     │
│ [ BRANCH: uat (Staging / UAT) ]                                           [ BRANCH: main (Production Stable) ]
│ • Cloudflare Pages: `uat.outgrid-rescue.pages.dev`                        • Cloudflare Pages: `outgrid-rescue.pages.dev`
│ • Worker API: `api-uat.outgrid-mesh.workers.dev`                          • Worker API: `api.outgrid-mesh.workers.dev`
│ • D1 Database: `outgrid-mesh-db-uat` (Test Isolated Data)                 • D1 Database: `outgrid-mesh-db` (Production Live)
│ • APK Release: `outgrid-rescue-uat.apk` (Pre-release)                      • APK Release: `outgrid-rescue-v1.1.apk` (Stable)
│ • R2 Bucket: `r2-uat.outgrid.org`                                         • R2 Bucket: `r2.outgrid.org`
│ • P2P Sideload: Test Hotspot SSID `OutGrid-UAT`                           • P2P Sideload: SSID `OutGrid-Rescue`
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 รายละเอียดการ Deploy แต่ละสภาพแวดล้อม (Dual-Tier Environments: UAT & MAIN)

#### 🌐 1. Deployment: Cloudflare Pages (Frontend Web Dashboard & Map)
- **เครื่องมือ Deploy:** Cloudflare Pages Git Integration หรือผ่าน Wrangler CLI:
  ```bash
  # บิลด์เว็บแอปพลิเคชัน Static Bundle
  bun run build

  # เมื่อ Push / Deploy ที่ branch: uat
  npx wrangler pages deploy build/ --project-name outgrid-rescue-uat --branch uat
  # -> URL: https://uat.outgrid-rescue.pages.dev

  # เมื่อ Merge / Deploy ที่ branch: main
  npx wrangler pages deploy build/ --project-name outgrid-rescue --branch main
  # -> URL: https://outgrid-rescue.pages.dev (Production Live)
  ```
- **ผลลัพธ์การ Deploy:** 
  - ระบบแยก Environment ชัดเจน: ทีมกู้ภัยทดสอบระบบใหม่ได้ที่ `uat.*` โดยไม่รบกวนหน้าจอ Dashboard ของศูนย์สั่งการจริงบน `main`
  - รองรับ Instant Rollback ถอยเวอร์ชันแยกอิสระทั้งสองสภาพแวดล้อม

#### ⚡ 2. Deployment: Cloudflare Workers & D1 Database (Backend API Gateway)
- **เครื่องมือ Deploy:** Cloudflare Wrangler CLI v3+
- **คำสั่งและขั้นตอน Deploy ตามสภาพแวดล้อม:**
  ```bash
  # ==========================================
  # สำหรับสภาพแวดล้อม UAT (Branch: uat)
  # ==========================================
  npx wrangler d1 execute outgrid-mesh-db-uat --file=./cloudflare/schema.sql --remote
  npx wrangler deploy --env uat
  # -> Endpoint: https://api-uat.outgrid-mesh.workers.dev

  # ==========================================
  # สำหรับสภาพแวดล้อม Production (Branch: main)
  # ==========================================
  npx wrangler d1 execute outgrid-mesh-db --file=./cloudflare/schema.sql --remote
  npx wrangler deploy --env production
  # -> Endpoint: https://api.outgrid-mesh.workers.dev
  ```
- **คอนฟิกสำคัญ (`wrangler.toml`):**
  - แยก Environment ชัดเจน: `[env.uat]` ชี้ไปที่ฐานข้อมูล `outgrid-mesh-db-uat` และ `[env.production]` ชี้ไปที่ `outgrid-mesh-db`
  - ข้อมูลทดสอบใน UAT จะถูกแยกขาดจากข้อมูลจริงในยามภัยพิบัติ 100%

#### 📱 3. Deployment: Android Native APK & Cloudflare R2 (Mobile App Release)
- **การคอมไพล์และแจกจ่ายแยกตาม Branch:**
  - **UAT Staging (`branch: uat`):**
    - คอมไพล์ได้ไฟล์ `outgrid-rescue-uat.apk` (Package: `org.outgrid.rescue.uat`)
    - อัปโหลดเป็น **Pre-release** บน GitHub Releases และ R2 Bucket สภาพแวดล้อมทดสอบ
  - **Production Stable (`branch: main`):**
    - คอมไพล์ได้ไฟล์ `outgrid-rescue-v1.1.apk` (Package: `org.outgrid.rescue`)
    - เซ็นกำกับด้วย Production Keystore อัปโหลดเป็น **Official Release** บน GitHub Releases และ R2 Bucket (`r2.outgrid.org/download/outgrid-rescue.apk`)

#### 📶 4. Deployment: Local Offline Zero-Internet Hotspot (P2P Field Sideload)
- **การปล่อยแอปในสนามรบจริง (Disaster Zone):**
  - ฝังไฟล์ APK ตามสภาพแวดล้อมไว้ในเครื่อง (`uat` หรือ `main`)
  - ให้บริการดาวน์โหลดผ่าน Local Hotspot และ Nano HTTP Server (Port 8080) โดยอัตโนมัติ

---

### 7.2 ระบบตรวจสอบและไปป์ไลน์อัตโนมัติ (Dual CI/CD Quality Gates & Release Policy)
1. **Pre-commit Gate (ความปลอดภัยฝั่ง Local):**
   - รัน `node scripts/checkSyntax.js` ตรวจสอบไวยากรณ์ทุกไฟล์ก่อน Commit
   - ตรวจสอบว่าไม่มี API Keys หรือ Secret รั่วไหลลง Git
2. **Automated Continuous Integration (GitHub Actions Workflow):**
   - ทริกเกอร์อัตโนมัติทั้งเมื่อมีการ Push สู่ branch **`uat`** และเมื่อมีการ Merge สู่ **`main`**
   - รัน `bun test` เพื่อยืนยันว่า **Unit Test ทั้ง 51 ชุด ต้องผ่าน 100% (Zero Failure)**
   - หากมีข้อผิดพลาดแม้แต่กรณีเดียว ระบบจะปฏิเสธการ Deploy ทันที
3. **Branching, Promotion & Delivery Strategy (นโยบายสาขา Git):**
   - **`uat` Branch (Active Development & Staging Testing):** 
     - นักพัฒนาและ Agent จะทำการ Commit และ Push งานทั้งหมดมาที่ `uat` เท่านั้น
     - ระบบ CI/CD จะทำการ Deploy สู่สภาพแวดล้อม UAT (`api-uat.*`, `uat.pages.dev`) อัตโนมัติ เพื่อให้ทีมงานและผู้ใช้ทดสอบ E2E ได้ทันที
   - **`main` Branch (Production Stable & Live Field Operations):**
     - **ห้าม Push โค้ดตรงสู่ `main` โดยเด็ดขาด**
     - เมื่อการทดสอบบน `uat` ผ่านการรับรองครบถ้วน 100% และผู้ใช้อนุมัติ จะทำการสร้าง Pull Request / Merge จาก `uat` สู่ `main`
     - ระบบ CI/CD จะทำการ Deploy สู่ Production Live (`api.*`, `pages.dev`, Official APK Release) อัตโนมัติ

---

## 8. ข้อกำหนดการทำงานและการส่งมอบ (Compliance & Delivery Rules)
- **Git Branch Policy:** เมื่อพัฒนาและทดสอบผ่าน 100% แล้ว ให้ทำการ Commit และ Push ไปยัง branch `uat` เท่านั้น (ห้าม Push เข้า `main` โดยตรง จนกว่าจะตรวจสอบความเรียบร้อยครบถ้วนบน UAT แล้วจึงทำการ Merge เข้า `main`)
- **Dual-Environment Support:** โค้ด คอนฟิก (`wrangler.toml`), CI/CD Actions และสคริปต์ ต้องรองรับตัวแปรและโหมดการทำงานของทั้ง `uat` และ `main` แยกจากกันอย่างสมบูรณ์
- **UI Integrity:** ไม่ลบปุ่มหรือคอมโพเนนต์เดิม คงความสมบูรณ์ 100% สำหรับผู้ใช้ทั้ง Guest และ Authenticated User
- **Comprehensive Delivery:** พัฒนาระบบให้ครบถ้วนเชื่อมโยงทั้ง End-to-End ตามโครงสร้าง v6.1

---

## 9. แผนงานในอนาคตและฟีเจอร์ระยะถัดไป (Future Roadmap & Post-MVP Backlog v2.0)
เพื่อรักษาความกระชับ ความเสถียร และความรวดเร็วในการกู้ภัยของระบบ MVP ให้โฟกัสที่ **1-on-1 E2EE Chat (`0x02`), Emergency SOS (`0x01`) และ Crisis Feed (`0x04`)** ระบบจึงได้ถอดฟีเจอร์ด้านล่างนี้ไปพัฒนาในเวอร์ชันถัดไป (Roadmap v2.0):

### 8.1 Group Chat & Topic Multi-Party Privacy Engine (Zero-Knowledge Group)
- **Symmetric Group Key Distribution & Epoch Rotation Engine:**
  - พัฒนา `src/core/crypto/GroupKeyManager.ts` สำหรับห้องแชตกลุ่มผู้ประสบภัยและกลุ่มทีมกู้ภัยประจำตำบล
  - **Topic Secret Key (32 Bytes):** สร้างด้วย CSPRNG ประจำแต่ละ `Topic_ID` (4 Bytes)
  - **Zero-Knowledge Multi-Party Privacy:** โหนดตัวกลางที่ช่วยรีเลย์ข้อความกลุ่ม จะเห็นเฉพาะ `Topic_ID` เพื่อส่งต่อตามเส้นทาง แต่ไม่สามารถถอดรหัสอ่านข้อความข้างในได้
  - **Epoch Key Rotation (การขับไล่สมาชิกหรือเปลี่ยนเวร):**
    - กำกับหัวซองกลุ่มด้วย `Key_Epoch (1 Byte)` เมื่อต้องการเตะสมาชิกหรือหมดกะกู้ภัย หัวหน้าห้องจะสร้าง Epoch ใหม่แล้วแจกจ่ายกุญแจใหม่ผ่าน 1-on-1 E2EE ให้สมาชิกที่เหลือ
  - **Packet Frame `0x03` (`GROUP_CHAT`):** เปิดใช้งานเมื่อติดตั้งเอนจิน Group Key เต็มรูปแบบ
  - UI Room Management: ระบบสร้างห้องกลุ่ม สแกน QR เข้าร่วมกลุ่มเฉพาะจุด และรายชื่อสมาชิกในห้อง

### 8.2 LoRa ESP32 External Radio Bridge & Satellite Gateway
- การเชื่อมต่อฮาร์ดแวร์ภายนอกผ่าน Serial/BLE สู่บอร์ด ESP32 LoRa 433/868/915 MHz สำหรับส่งสัญญาณข้ามเขา 10-30 กิโลเมตร
- เชื่อมต่อ Iridium Go / Garmin InReach สำหรับทีมกู้ภัยพิเศษ

### 8.3 Offline Voice Stream & Drone Data Mule Auto-Sync
- ระบบสตรีมมิ่งเสียงแบบกดพูด Push-to-Talk ข้ามวง Mesh แบบกึ่งเรียลไทม์
- โดรนบินสำรวจตรวจจับจุดขอความช่วยเหลือและดึงข้อมูลกลับฐานอัตโนมัติ (Drone Ferry Integration)

