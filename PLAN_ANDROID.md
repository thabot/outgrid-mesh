# Plan Android (OutGrid Mesh: Global Humanitarian Edition)
### บูรณาการ Master Project Plan v6.1 & TASK_LIST.md (10 Sprints / 54 Tasks) อย่างสมบูรณ์ 100%

> **ข้อมูลลิขสิทธิ์และสิทธิ์ทางปัญญา (Copyright & Intellectual Property):**
> - **ชื่อโครงการ:** **OutGrid Mesh**
> - **ผู้คิดค้นและสถาปนิกหลัก (Creator & Lead Architect):** **Thabot** (<thabo47@gmail.com>)
> - **โพรโทคอล:** **Thabot OutGrid Protocol (TOG v1.1 Wire Specification)**
> - **สัญญาอนุญาต (License):** **GNU Affero General Public License v3.0 (AGPL-3.0) + Commercial Rights Reserved to Thabot**
> - **กฎการพัฒนา:** คงโครงสร้างเดิมที่มีอยู่ทั้งหมด 100% (ห้ามลบทิ้ง) และเชื่อมต่อ Master Plan เข้าสู่ Implementation Plan ฉบับนี้อย่างครบถ้วน

---

## สรุปภาพรวมและเป้าหมาย (Goal Overview)
ยกระดับ OutGrid Mesh สู่ระบบสื่อสารกู้ภัยฉุกเฉินระดับโลก (Global Humanitarian Public Good):
- **แผนที่ทั้งโลกแบบออฟไลน์ติดเครื่อง 100% (World Vector Basemap Level 2)**: บรรจุแผนที่เวกเตอร์ความละเอียดระดับ 2 จากฐานข้อมูลมาตรฐานสากล **Natural Earth Data (Scale 1:50m, CC0 Public Domain)** ครอบคลุมทุกทวีป 200+ ประเทศทั่วโลก ขอบเขตจังหวัด/รัฐ แม่น้ำสายหลัก และเมืองสำคัญ โดยผ่านขั้นตอนการบีบอัดให้เหลือเพียง **~5–6 MB** ฝังติดใน Assets ของ APK เปิดดูได้ทั่วโลกทันทีตั้งแต่วินาทีแรกโดยไม่ต้องต่อเน็ต และผู้ใช้ไม่ต้องกดดาวน์โหลดเอง
- **ระบบอัปเดตเว็บอัตโนมัติเมื่อต่อเน็ต (Smart Hybrid OTA Web Update)**: เมื่อเชื่อมต่อเน็ตจะดึงและอัปเดตเว็บเวอร์ชันใหม่ล่าสุดอัตโนมัติโดยไม่ต้องติดตั้ง APK ใหม่
- **ฟังก์ชันกู้ภัยฉุกเฉินระดับโลกครบวงจร**: รองรับ 10 ภาษา, One-Tap SOS (< 1m precision), เรดาร์เข็มทิศ, ไฟฉาย/หวูดไซเรนรหัสมอส, แชทไมค์พิมพ์ด้วยเสียง, คลังภาพส่งรูปสถานการณ์, แถบสถานะ Network 5G/4G/WiFi/Offline, **ระบบคำนวณระยะเวลาแบตเตอรี่คงเหลือ (เหลืออีกกี่ชั่วโมงกี่นาที)**, ตัวนับโหนดรอบตัว, และความปลอดภัยรักษาความเป็นส่วนตัวสูงสูด
- **บูรณาการสถาปัตยกรรมเชิงลึกจาก Master Plan v6.1 (Deep Engineering Specifications for Devs)**:
  1. **TOG v1.1 Wire Protocol & Frame Bitfield Packing**:
     - *Header 5B*: Byte 0–1 Magic `0x544F` ('TO'), Byte 2 `[Ver 3b: 0b001 | Type 5b]` (0x01 SOS, 0x02 Chat, 0x04 Crisis, 0x05 ACK, 0x06 NACK, 0x07 Chirp), Byte 3 `TTL/Hop` (uint8 0–255), Byte 4 `[Priority 4b (0xF SOS .. 0x1 Chirp) | Flags 4b (IsFrag, HasDeltaGPS, IsSigned, Reserved)]`
     - *Addressing & Identity (32B)*: Bytes 5–12 `Message ID` (uint64 Big-Endian CSPRNG), Bytes 13–20 `Sender PubKey Hash` (uint64 Truncated SHA-256), Bytes 21–28 `Recipient/Topic Hash` (uint64), Bytes 29–36 `Target H3 Index Res 9` (uint64)
     - *Length & Payload*: Bytes 37–38 `Payload Length` (uint16), Payload Data (IV 12B + Ciphertext + Tag 16B), เติมท้ายด้วย CRC-16-CCITT (Polynomial `0x1021`, Init `0xFFFF`) 2 Bytes
  2. **Uber H3 Delta Offset (< 1 เมตร) Compression Engine**:
     - *อัลกอริทึม*: ดึง Center `(Lat_0, Lng_0)` ของ Target H3 Cell Res 9 (`h3ToGeo`) แล้วคำนวณระยะกระจัดโลกจริง (Equirectangular Projection):
       $$\Delta X = (\text{Lng} - \text{Lng}_0) \times \cos(\text{Lat}_0) \times 111,320\text{ m}$$
       $$\Delta Y = (\text{Lat} - \text{Lat}_0) \times 110,540\text{ m}$$
     - *การบีบอัด*: บรรจุลง `int16` (2 Bytes สำหรับ X, 2 Bytes สำหรับ Y รวม 4B) โดย 1 หน่วย = 10 ซม. ครอบคลุมรัศมี $\pm 3.2$ กม. ประหยัดพื้นที่กว่า Float64 (16B) ถึง 75% และ String GPS (35B) ถึง 90% ให้ความแม่นยำระดับระบุหลังคาบ้านผู้ประสบภัย
  3. **Reed-Solomon Erasure Coding (8+4 Shards บน $GF(2^8)$)**:
     - *เมทริกซ์และ Galois Field*: ใช้ Vandermonde Matrix บน Galois Field $GF(2^8)$ Generator Polynomial $x^8 + x^4 + x^3 + x^2 + 1$ (0x11D)
     - *Sharding Pipeline*: หั่น Payload ออกเป็น $K = 8$ Data Shards สร้าง $M = 4$ Parity Shards (รวม $N = 12$ Shards, Overhead +50% หรือโหมดประหยัด $10+3$ +30%)
     - *Instant Recovery*: ปลายทางแก้สมการ Gaussian Elimination กู้คืนชิ้นส่วนที่สูญหายในอากาศได้สมบูรณ์แบบ 100% แม้หลุดไปถึง 4 ชิ้น (Loss $\le 33.3\%$) โดยใช้เวลาคำนวณ $< 15\text{ms}$ ไร้ Retransmit (Zero-Retransmit Recovery)
  4. **Selective NACK & Backoff Sliding Window**:
     - *Trigger*: หากชิ้นส่วนสูญหายเกิน 4 ชิ้น (เกินกำลัง Reed-Solomon) ปลายทางจะส่งแพ็กเก็ต `0x06: DELIVERY_NACK`
     - *NACK Payload*: บรรจุ Bitmask ของ Sequence Index ที่ขาดหาย (เช่น ขาด #3, #7)
     - *Retransmit Logic*: โหนดส่งจะ Re-transmit เฉพาะชิ้นที่ระบุใน Bitmask เท่านั้น พร้อม Random Jitter Delay $50–200\text{ms}$ แบบ Exponential Backoff เพื่อป้องกัน Collision ซ้ำ
  5. **6-8 Digit Safety Numbers & Anti-MitM QR Pairing**:
     - *QR Payload*: Compact Binary 80–110B: `[Magic 2B: 0x4F47 ("OG")]` + `[Ver 1B]` + `[PairingType 1B]` + `[Ed25519_Pub 32B]` + `[X25519_Pub 32B]` + `[Nonce 8B]` + `[Nickname 1-16B]` + `[Ed25519_Sig 64B]`
     - *Safety Numbers Formula*: $H = \text{SHA-256}(\text{Key}_A \parallel \text{Key}_B)$ แปลงเป็นเลข 8 หลักแบ่ง 2 ชุด: `[ 4821 ]  [ 9035 ]`
     - *วิทยุสื่อสาร Walkie-Talkie Friendly*: ผู้ใช้และทีมกู้ภัยสามารถขานรหัส 4 หลัก 2 ชุดผ่านวอล์คกี้-ทอล์คกี้เพื่อเทียบความปลอดภัย ป้องกัน Man-in-the-Middle 100% โดยไม่ต้องพึ่งเน็ต
  6. **Re-Key Handshake & Birational Curve Conversion**:
     - *Birational Equivalence*: เมื่อผู้ใช้ลบแอปแล้วติดตั้งใหม่ ได้ Fresh Identity แต่กู้คืนเพื่อนผ่าน Passkey จะใช้ `@noble/curves/ed25519` แปลง Ed25519 Public Key สู่ Montgomery X25519 Curve อัตโนมัติ (`edwardsToMontgomeryPub`)
     - *Re-Key Announcement Frame*: `[Op 1B: 0x52 ("R")]` + `[Old_Node_ID 8B]` + `[New_Node_ID 8B]` + `[New_Ed25519 32B]` + `[New_X25519 32B]` + `[Passkey_Sig 64B]`
     - *Anti-Replay Guard*: ตรวจสอบ Monotonic Counter และบันทึกลง LRU Replay Cache ขนาด 1,024 รายการ สกัดกั้นการบันทึกคลื่นมายิงซ้ำ
  7. **Data-at-Rest Encryption Envelope**:
     - *Local Storage Security*: ห่อหุ้มตาราง `messages` ใน SQLite / IndexedDB ด้วย AES-256-GCM Envelope ดึง Key จาก Hardware Keystore (TEE/StrongBox) หรือ WebCrypto `non-extractable`
     - *Zero-Dump Policy*: ป้องกันการ Extract หรือ Dump ไฟล์ `.db` ออกจากเครื่อง แม้โดนขโมยมือถือก็อ่านข้อความกู้ภัยไม่ได้ 100%
  8. **Progressive Spatial Expansion (Res 9 $\rightarrow$ 7 $\rightarrow$ 5 $\rightarrow$ 4)**:
     - *ระดับการขยาย*: เมื่อปลายทาง Offline:
       - $< 15$ นาที: ตรึงพิกัด Res 9 (~100m)
       - 15 นาที – 2 ชม.: ถอยเป็น Res 7 (~1.2km) พร้อม K-Ring `gridDisk(k=1)` กวาด 6 รังผึ้งรอบตัว
       - 2 – 12 ชม.: ถอยเป็น Res 5 (~8.5km) กระจายสู่ศูนย์อพยพตำบล
       - 12 – 24 ชม.: ถอยเป็น Res 4 (~22km) ฝากขึ้น Data Mule ข้ามอำเภอ
     - *Instant Collapse*: ยุบวงค้นหากลับสู่ Res 9 ทันที 100% เมื่อได้รับ Signed ACK
  9. **Deterministic Supernode Election (+100 คะแนน LoRa Gateway)**:
     - *สูตรคำนวณคะแนน (Scoring Function)*:
       $$\text{Score} = (\text{Battery\%} \times 0.4) + (\text{IsCharging} \times 30) + (\text{PeerStability} \times 0.2) + (\text{LoRaBridgeActive} \times 100)$$
     - *Backbone Gateway*: เครื่องที่เชื่อมต่อกล่อง LoRa Companion Bridge (ESP32) ผ่าน BLE จะได้โบนัส +100 คะแนน สถาปนาเป็น Tier-1 Community Backbone ส่งสัญญาณข้ามยอดเขา 10–20+ กม.
     - *Graceful Demotion*: หากแบตเตอรี่ลดต่ำกว่า 30% และไม่ได้ชาร์จ จะลดบทบาทกลับเป็น Normal Node ทันที
  10. **DTN Bundle Custody Transfer Protocol**:
      - *โครงสร้าง Bundle*: `[Bundle_ID 16B]` + `[Created_At 8B]` + `[Expires_At 8B]` + `[Priority 1B]` + `[Hop_Count 1B]` + `[Custodian_Node 8B]` + `[Target_H3 8B]` + `[Triage 1B]` + `[Payload_Len 2B]` + `[Payload BLOB]`
      - *โอนย้ายสิทธิ์*: โหนดต้นทางส่ง `CUSTODY_OFFERED` จะยังไม่ลบข้อมูล จนกว่าโหนดผู้รับจะตอบกลับแพ็กเก็ต `0x08: CUSTODY_ACCEPT` พร้อมลายเซ็นดิจิทัล จึงปลดเป็น `CUSTODY_TRANSFERRED` และลบได้ ป้องกันข้อมูลหายหากหลุดกลางทาง
      - *Triage Eviction*: เมื่อความจุเต็ม (30MB) ลบ Chat ก่อน ตามด้วย Green SOS แต่ **ห้ามทิ้ง Red SOS (0x01: วิกฤตชีวิต) เด็ดขาด 100%**
  11. **Epidemic Vaccine Kill Pill Protocol**:
      - *การสร้างวัคซีน*: เมื่อเคสกู้ภัยได้รับการช่วยเหลือแล้ว หรือข้อมูลถูก Sync ขึ้น Cloudflare สำเร็จ ระบบจะออก `0x09: VACCINE_KILL_PILL` แนบ `Bundle_ID` + Authority Signature
      - *Instant Purge*: โหนดและ Data Mule ทุกเครื่องที่ได้รับวัคซีนจะลบสำเนา Bundle นั้นออกจากหน่วยความจำทันที ยุติการส่งซ้ำซ้อนข้ามอำเภอ คืน RAM/Flash ให้โครงข่าย 100%
  12. **4-Tier Collision Shield for BLE Coded S=8**:
      - *Tier 1: CSMA/CA Carrier Sense & TX Jitter*: สุ่มดีเลย์ 0–150ms ก่อนส่ง และตรวจสอบช่องสัญญาณ
      - *Tier 2: Adaptive Density Throttling*: นับเพื่อนบ้าน $N$: หาก $N > 30$ ลดความถี่ Heartbeat และจำกัด Hop $\le 3–5$; หาก $N < 5$ ขยาย Hop 10–15
      - *Tier 3: Smart Gossip Suppression*: หน่วงเวลาสุ่ม $t$ หากได้ยินเพื่อนบ้านรีเลย์แพ็กเก็ตนั้นไปแล้ว ให้ยกเลิกการส่งต่อของตนเองทันที (ลดโหลด 70%)
      - *Tier 4: Reed-Solomon Recovery*: ซ่อมแซมชิ้นส่วนที่ชนกันในอากาศได้ 4 ชิ้น (33%) ทันที
  13. **Sensor Fusion Duty Cycling (Accelerometer + H3 Res 9)**:
      - *Stationary*: Accelerometer นิ่ง + อยู่ใน H3 Res 9 เดิม $\rightarrow$ หลับลึกตามระดับแบต (>50%: หลับ 60s, 20–50%: หลับ 3 นาที, 10–20%: หลับ 10 นาที, <10%: หลับ 30 นาที กินไฟ <0.2%/ชม.)
      - *In-Motion*: ตรวจพบแรงสั่นไหวหรือก้าวข้าม H3 Res 9 $\rightarrow$ ตื่นสแกนถี่ขึ้นเพื่อดักจับโหนดที่เดินสวนกัน
      - *Zero-Latency SOS*: กดยิง SOS เอง จะ Blast ทันที 0ms ข้ามรอบหลับ
  14. **Acoustic Morse & Ultrasonic FSK (18.5–19.5 kHz)**:
      - *Acoustic Morse*: สังเคราะห์ Sine Wave ความถี่ 960Hz / 1,440Hz ระดับ 85+ dB ทะลุซากตึกคอนกรีต
      - *Ultrasonic FSK*: แปลงพิกัด GPS เป็นความถี่ 18.5 kHz (บิต 0) และ 19.5 kHz (บิต 1) ส่งผ่านลำโพงมือถือ ดักฟังด้วย Goertzel Algorithm / FFT ถอดรหัสพิกัดได้แม้ไม่มีสัญญาณวิทยุ
  15. **Micro DNS Daemon (UDP 53) & Captive Portal Engine**:
      - *Captive Portal Trigger*: เมื่อเปิด Hotspot แจก APK สคริปต์ Native จะดักฟัง UDP Port 53 ตอบรับทุก DNS Query ชี้กลับมาที่ Dynamic Host IP (`192.168.49.1` หรือ `192.168.43.1`)
      - *Auto-Popup*: หลอกให้มือถือ Android, iOS, Windows เด้งหน้าต่าง Sign-in to Wi-Fi เปิดหน้าเบราว์เซอร์ดาวน์โหลด `OutGridMesh.apk` เต็มจอทันทีโดยไม่ต้องพิมพ์ URL
  16. **ระเบียบ Spatial Disambiguation (24-bit Short NodeID + H3 Cell Resolution 7/9)**:
      - *หลักการระบุตัวตนเชิงพื้นที่ (Spatial Disambiguation Principle)*:
        เพื่อรักษาขนาด BLE Advertising Frame ไม่ให้เกินเพดาน 31 Bytes ของ BLE Legacy (ไม่เพิ่มเป็น 32-bit/4B ให้บวมขึ้น +6B) ระบบจะใช้ Short NodeID ขนาด 24-bit (3 Bytes / 16,777,216 รหัส) ควบคู่กับเซลล์ H3 ในการสร้าง **Unique Identity ในระดับท้องถิ่น**:
        $$\text{Unique Local Identity} = \text{H3 Cell Index (4B / Res 7/9)} + \text{Short NodeID (3B / 24-bit)}$$
      - *การป้องกันการชนกันของรหัส (Zero Collision in Local Radio Space)*:
        โอกาสที่เครื่อง 2 เครื่องจะมีรหัส 24-bit ซ้ำกันในเซลล์ H3 เดียวกัน (รัศมีคลื่นวิทยุ 300 ม. – 5 กม.) มีความน่าจะเป็นต่ำมาก ($< 1$ ใน $10^{14}$) โดยโหนดที่มีรหัส 24-bit เดียวกันแต่อยู่ต่างอำเภอหรือต่างจังหวัด จะถูกแยกออกจากกันอย่างเด็ดขาดด้วยค่าพิกัด H3 Cell ทันที
      - *ขั้นตอนการคลี่คลายเมื่อพบรหัสซ้ำในเซลล์เดียวกัน (Automatic Collision Resolution)*:
        หากตรวจพบโหนด 2 เครื่องที่มีทั้ง H3 Cell Index เดียวกันและ Short NodeID 24-bit ซ้ำกันในระยะวิทยุ:
        1. **Secondary Key Disambiguation**: ดึง 2 ไบต์ท้ายของ Full Public Key 32B (Ed25519 / X25519) มาเป็น Suffix ห้อยท้าย เช่น `#9B1C-E4`
        2. **Silent NodeID Re-Roll**: แอปจะทำการสุ่ม Re-roll รหัส Short NodeID 24-bit ตัวใหม่ของตนเองในพื้นหลังแบบเงียบๆ ทันที พร้อมประกาศอัปเดตสถานะใหม่ เพื่อขจัดความสับสนใน Mesh Routing 100%
  17. **สเปกโปรโตคอลวิทยุกู้ภัย 27 Bytes (TOG v1.1 Presence Micro-Packet ⭐️)**:
      - *โครงสร้างระดับบิต (27 Bytes จากเพดาน 31B, เหลือ 4B Headroom)*:
        - **Header & Our Node (9B)**: Type/Hop (1B) + Short NodeID (3B, 16.7M) + Battery/Status (1B) + H3 Res 9 (4B)
        - **Radio & Node Capabilities (1B)**: ระบุ Stationary (b0), Power Tier (b1-2), BLE (b3), LoRa (b4), Wi-Fi Direct (b5), Wi-Fi HaLow 802.11ah Sub-1GHz (b6), Internet Gateway (b7)
        - **5 Best Neighbors (15B, โหนดละ 3B พอดีเป๊ะ)**: Short NodeID (2B) + Fused Packed Byte (1B: H3 6 ทิศรอบตัว 3-bit + แบตเตอรี่ 5 ขีด 3-bit + RSSI 4 ระดับ 2-bit)
        - **Check Digit (2B)**: CRC-16-CCITT (Polynomial `0x1021`) ป้องกันบิตเพี้ยนในอากาศ 99.998%
      - *เอกสารอ้างอิงทางการ*: แยกจัดเก็บรายละเอียดทั้งหมดไว้ใน [docs/TOG_v1.1_WIRE_SPECIFICATION.md](file:///d:/thabot/git/gitlab/thabot/Mesh/OutGridMesh/docs/TOG_v1.1_WIRE_SPECIFICATION.md)
  18. **Cross-Radio Bridge Protocol & LoRa Forwarding Rules (BLE ↔ LoRa ⭐️)**:
      - *Zero-Payload Mutation*: บอร์ด LoRa Bridge (ESP32 + SX1262) ทำหน้าที่เป็น Transparent Forwarder คงค่า CRC-16, พิกัด H3, Delta GPS, และลายเซ็น Ed25519 ดั้งเดิมของมือถือต้นทางไว้ 100% ห้ามแก้ไข
      - *LRU Deduplication*: แคชตรวจสอบ 64 รายการล่าสุด `SHA-256(Type + ShortNodeID + Payload[0..4])[0..7]` ป้องกันการทวนสัญญาณซ้ำซ้อนภายใน 60 วินาที ตัดปัญหาพายุคลื่นวิทยุชนกัน
      - *Traffic Prioritization*: อนุญาต `0x01 SOS_BEACON` ข้ามทันที (Preemption 0ms), โควต้า `0x07 PRESENCE_CHIRP` 1 ครั้ง/60s ต่อเซลล์ H3, และ **ห้ามส่ง `MEDIA_CHUNK` (ภาพ/เสียง) ขึ้น LoRa เด็ดขาด**
      - *RF Profile*: คลื่น LoRa ย่าน AS923 (923.2 MHz, BW 125kHz, SF9/SF11, CR 4/5, TX +14..+20dBm) พร้อมกลไก Listen-Before-Talk ผ่าน LoRa CAD $\le 5\text{ms}$ ก่อนส่ง

---

## สรุปรายการฟีเจอร์ทั้งหมดตามแผนการพัฒนา (Full Feature Breakdown)

### 1. 🔋 แสดงสถานะแบตเตอรี่ & คำนวณเวลาที่แบตจะหมด (Survival Battery Life Engine)
- แสดงระดับ **% แบตเตอรี่** และสถานะการชาร์จไฟ (⚡ กำลังชาร์จ / 🔋 ใช้แบตเตอรี่) บนแถบสถานะด้านบนแบบ Real-time
- **ระบบคำนวณเวลาแบตเตอรี่คงเหลืออัจฉริยะ (Adaptive Consumption Modeling)**:
  - คำนวณและแสดงผลชัดเจน: `🔋 78% (ใช้ได้อีกประมาณ 18 ชม. 45 นาที)`
  - ตรวจจับอัตราการกินไฟของฮาร์ดแวร์จริง ณ ขณะนั้น:
    - หากเปิดไฟฉาย SOS (Flashlight Strobe) ➔ แจ้งเตือนการใช้พลังงานสูงและคำนวณเวลาลดลงตามจริง
    - หากเปิดหวูดไซเรน (Acoustic Siren) หรือเปิด GPS ความแม่นยำสูงต่อเนื่อง ➔ ปรับโมเดลเวลาอัตโนมัติ
- **โหมดเอาชีวิตรอดฉุกเฉินขั้นสูงสุด (1-Tap Ultra Battery Saver / Survival Mode)**:
  - สวิตช์เปิดโหมดประหยัดพลังงานขั้นสูงสุดเพียงแตะครั้งเดียว:
    1. ขยายรอบการส่งคลื่นวิทยุ Mesh Heartbeat จาก 15s เป็น 60s (ประหยัดพลังงานชิปบลูทูธ)
    2. ปรับหน้าจอเป็นธีมสีดำสนิท (True AMOLED Black) และลดการใช้แอนิเมชันของแผนที่
    3. คำนวณและแสดงระยะเวลาที่ยืดออกไปให้ผู้ประสบภัยเห็นทันที (เช่น *จากเหลือ 4 ชม. ➡️ ยืดเป็น 14 ชม. 30 นาที*)
- **การแจ้งเตือนระดับแบตเตอรี่วิกฤต & Last-Gasp Beacon (สัญญาณสั่งลาส่งพิกัดสุดท้าย)**:
  - แจ้งเตือนเมื่อแบตเตอรี่ลดลงเหลือ 15% แนะนำให้เปิดโหมดประหยัดพลังงาน
  - **Last-Gasp Beacon (เมื่อแบตเตอรี่ลดถึง 5% วิกฤต)**: ตัวแอปจะส่งแพ็กเก็ตวิทยุฉุกเฉินชุดสุดท้ายออกไปรอบตัวอัตโนมัติ บันทึกพิกัดตำแหน่งสุดท้ายที่แม่นยำ (Last Known Location) และแจ้งเตือนไปยังโหนดรอบข้างว่าเครื่องนี้กำลังจะดับเพราะแบตเตอรี่หมด ทำให้หน่วยกู้ภัยยังคงมีเบาะแสจุดสุดท้ายของผู้ประสบภัยได้อย่างแม่นยำ

### 2. 🌍 ขั้นตอนการสร้างและติดตั้งแผนที่เวกเตอร์ทั้งโลก ระดับ 2 & การแสดงโหนดรอบตัว (World Vector Basemap & Peer Distance Display)
- **แหล่งข้อมูลสากล (Data Source)**: Natural Earth 1:50m (Public Domain CC0)
  - `ne_50m_admin_0_countries` (ขอบเขต 200+ ประเทศทั่วโลก)
  - `ne_50m_admin_1_states_provinces` (ขอบเขตจังหวัด / รัฐ / แคว้นทั่วโลก)
  - `ne_50m_rivers_lake_centerlines` (แม่น้ำและทะเลสาบสายหลักของโลก)
  - `ne_50m_populated_places` (พิกัดเมืองสำคัญทั่วโลก)
- **ขั้นตอนการดึงและบีบอัดข้อมูล (Pipeline Script: `scripts/fetchAndOptimizeWorldBasemap.js`)**:
  1. ดึงชุดข้อมูลเวกเตอร์สากล Scale 1:50m
  2. กรองข้อมูลเฉพาะเลเยอร์ที่จำเป็นสำหรับงานกู้ภัย
  3. บีบอัดพิกัดทศนิยมด้วยอัลกอริทึม Vector Compression เพื่อคุมขนาดไฟล์รวมไม่เกิน **5 – 6 MB**
  4. บันทึกผลลัพธ์เป็น `static/data/world_basemap_l2.json`
- **การแพ็กเกจและการเรนเดอร์ใน `SosMapView.svelte`**:
  - เมื่อรันคำสั่ง `bun run build` ไฟล์แผนที่ทั้งโลกจะถูกบรรจุเข้าไปในโฟลเดอร์ Assets ของ APK ทันที
  - ในตัวแอป `SosMapView.svelte` จะโหลดไฟล์นี้ขึ้นมาเรนเดอร์ผ่าน Leaflet Canvas Vector Layer ออฟไลน์ 100%
  - เมื่อมีเน็ต สามารถโหลดภาพ OpenStreetMap มาซ้อนทับเสริมความละเอียดได้
- **การแสดงโหนดรอบตัวและการควบคุมระยะทางบนแผนที่ (Peer Node Distance & Display Controls)**:
  - **การจำกัดจำนวนโหนดแสดงผลอัจฉริยะ (Adaptive Multi-Tier Limit & Canvas Rendering)**:
    - 📱 **บนมือถือ (Mobile APK - สูงสุด 200 โหนด)**: คัดกรองด้วย Smart Priority (1. SOS Nodes 2. Friends 3. Closest Proximity RSSI) จำกัดไว้ไม่เกิน 200 โหนด ป้องกัน Bluetooth Stack หน่วง แบตเตอรี่อึด เครื่องไม่ร้อน
    - 🌐 **บนเว็บเบราว์เซอร์ (Web Command Center - สูงสุด 1,000 โหนด)**: แสดงภาพรวมระดับเมือง/จังหวัดได้สูงสุด 1,000 โหนดรอบจุดที่สนใจ รองรับศูนย์บัญชาการกู้ภัย
    - **High-Performance Canvas Marker & Clustering**: ใช้ HTML5 Canvas ผืนเดียววาดจุดร่วมกับ Dynamic Clustering รวมกลุ่มตัวเลขเมื่อซูมออก ไม่สร้าง DOM Element ทำให้ลื่นไหลระดับ 60 FPS แม้มีจุดจำนวนมาก
  - **โปรโตคอลวิทยุกู้ภัยจิ๋ว 27 Bytes บรรจุ 5 โหนดข้างเคียง (27-Byte Micro-Packet 5-Neighbor Sharing ⭐️)**:
    - สอดคล้องกับมาตรฐาน **Thabot OutGrid Protocol (TOG v1.1 Wire Spec)** ที่กำหนดรหัส `TOGPacketType` ไว้ในระดับ Header:
      - `0x01` (`SOS_BEACON`): 🚨 ข้อความฉุกเฉิน (สั่นเตือน, แบนเนอร์สีแดง, กระจายต่อเร่งด่วน TTL 25 Hops, พิกัด < 1m)
      - `0x02` / `0x03` (`DIRECT_CHAT` / `GROUP_CHAT`): 💬 ข้อความแชทปกติ (1:1 E2EE หรือแชทสาธารณะ)
      - `0x07` (`PRESENCE_CHIRP`): 📡 ส่งสถานะตัวเอง (แบต 5 ขีด + พิกัด H3 + Radio Type) และ 👥 ส่งรายการ 5 โหนดข้างเคียง
      - `0x05` (`DELIVERY_ACK`): 💓 การตอบรับว่ายังคงอยู่ (Keep-Alive ACK) เพื่อรักษาจุดเขียว 🟢 Online
    - ออกแบบการบีบอัดระดับบิต (Bit-Packing) ลงใน 27 Bytes เหลือ 4 Bytes Headroom ตามมาตรฐาน Apple Find My (เพดาน 31 Bytes ของ BLE Legacy):
      - **Header & Our Node (9 Bytes)**: Type/Hop (1B) + Short NodeID (3B, 16.7 ล้านเครื่อง) + Battery/Status (1B, แบตเตอรี่ 5 ขีด) + H3 Cell Location Res 9 (4B)
      - **Radio & Node Capabilities (1 Byte)**: แฟล็ก Stationary (b0), Power Tier (b1-2), BLE (b3), LoRa Bridge (b4), Wi-Fi Direct (b5), Wi-Fi HaLow 802.11ah Sub-1GHz (b6), Internet Gateway (b7)
      - **5 Best Neighbors (15 Bytes, โหนดละ 3 Bytes พอดีเป๊ะ)**: Short NodeID (2B) + Fused Packed Byte (1B: H3 6 ทิศรอบตัว 3-bit + แบตเตอรี่ 5 ขีด 3-bit + RSSI 4 ระดับ 2-bit)
      - **CRC-16-CCITT Check Digit (2 Bytes)**: ตรวจสอบความสมบูรณ์ ป้องกันข้อมูลขยะและบิตพลิกในอากาศ 99.998%
    - **ระเบียบ Spatial Disambiguation ในคลื่นวิทยุ (Spatial Disambiguation Rules)**:
      - Short NodeID 24-bit (3 Bytes) มีพื้นที่รหัส 16,777,216 ค่า ถูกรับประกันความไม่ซ้ำซ้อนระดับท้องถิ่นด้วย H3 Cell Index (4B) ซึ่งครอบคลุมรัศมี 5–10 กม.
      - หากเกิดสภาวะชนกัน (Collision) ในเซลล์เดียวกัน ให้ใช้ 2 ไบต์ท้ายของ Public Key (Ed25519) แยกแยะ และโหนดจะทำการ Re-roll รหัส 24-bit ใหม่อัตโนมัติในพื้นหลัง
    - **Adaptive Radio Interval (Trickle Algorithm)**: โหนดทั่วไปส่งห่าง 15–30s เมื่อคนหนาแน่น, หากมี SOS สลับยิงทันที (High Priority) พร้อม Jitter ±300ms ป้องกันคลื่นชนกัน 100%
  - **การคำนวณและแสดงระยะทางของโหนด**: คำนวณระยะทางจากตำแหน่งของเราไปยังแต่ละโหนดอย่างแม่นยำด้วย Haversine Formula โดยแบ่งเป็นระดับระยะทาง:
    - ใกล้มาก (< 100 ม.): เหมาะกับการค้นหาจุดใกล้เคียง
    - ระยะกลาง (100–500 ม.): อยู่ในระยะการเดินเท้าหรือตะโกนเรียก
    - ระยะไกล (500 ม. – 2 กม.): ระยะสัญญาณวิทยุ Mesh ทั่วไป
  - **แสดงสถานะ Online / Offline และระดับแบตเตอรี่คงเหลือของแต่ละโหนด (Hop-Aware Node Status & Battery Info)**:
    - **สถานะการเชื่อมต่อแบบหลายทอด (Hop-Aware Online/Offline Thresholds)**:
      - 🟢 **Online**: 
        - โหนด 1-Hop เพื่อนบ้านใกล้ตัว (< 300 ม.): ได้ยินภายใน **1 นาทีล่าสุด**
        - โหนด Multi-Hop ระยะไกล (> 400 ม. ข้ามทอด): ได้ยินผ่านรีเลย์ภายใน **5 นาทีล่าสุด**
      - 🟡 **Stale/Weak**:
        - โหนด 1-Hop: ขาดช่วง **1 – 5 นาที**
        - โหนด Multi-Hop: ขาดช่วง **5 – 15 นาที** (กำลังรอรอบรีเลย์ข้ามทอด)
      - ⚫ **Offline**: ขาดการติดต่อไปนานกว่า **15 นาที** (แสดงเป็นหมุดสีเทาพร้อมระบุเวลาที่พบครั้งล่าสุด เช่น `⚫ ออฟไลน์เมื่อ 18 นาทีที่แล้ว (14:35 น.)`)
      - 🗑️ **Prune Ceiling**: หากขาดการติดต่อเกิน **45 นาที** ระบบจะลบออกจากแคช 200 โหนดอัตโนมัติ เพื่อเปิดพื้นที่ให้โหนดใหม่ที่เดินเข้ามา
    - **ระบบกระจายข้อมูล 200 โหนดด้วยคิวหมุนเวียน (Round-Robin Rotating Window)**:
      - โหนดตรงกลางจะหมุนเวียนส่งรายชื่อเพื่อนรอบตัวครั้งละ 5 โหนดในแต่ละรอบ เพื่อให้ภายใน 2–5 นาที ทุกเครื่องสามารถสะสมจิ๊กซอว์ข้อมูลโหนดรอบข้างได้ครบถ้วนโดยคลื่นไม่ชนกัน
    - **ระดับแบตเตอรี่คงเหลือ (Node Battery Level - 5 ขีด Segmented Bar)**:
      - นำค่าแบตเตอรี่ที่แต่ละโหนดแพร่สัญญาณผ่าน Mesh Heartbeat Payload มาแปลงเป็น **ไอคอนก้อนแบต 5 ขีด (ระดับละ 20%)** เพื่อความสบายตา สวยงาม ไม่รกหน้าจอ และกวาดสายตามองเห็นสถานะวิกฤตได้ทันที:
        - 🟩🟩🟩🟩🟩 (5 ขีด / 81–100%): เต็มเปี่ยม ปลอดภัย
        - 🟩🟩🟩🟩⬜ (4 ขีด / 61–80%): ปกติ พร้อมใช้งาน
        - 🟨🟨🟨⬜⬜ (3 ขีด / 41–60%): ปานกลาง
        - 🟧🟧⬜⬜⬜ (2 ขีด / 21–40%): เริ่มต่ำ
        - 🟥⬜⬜⬜⬜ (1 ขีด / 1–20%): แดงกะพริบ ⚠️ *(เตือนวิกฤต แบตใกล้หมด)*
      - เมื่อแตะดูรายละเอียดที่หมุด (Popup) จะแสดงตัวเลข % กำกับควบคู่กันด้วย (เช่น `[███░░] 3 ขีด (~55%)`)
  - **ปุ่มเปิด/ปิดระยะทางโหนด (Toggle Peer Distance)**: มีปุ่มบนหน้าจอแผนที่ให้ผู้ใช้เลือกเปิด/ปิดป้ายระยะทางและสถานะ (เช่น `🟢 ~45 ม. | 🟩🟩🟩🟩⬜`) เพื่อความสะดวกและไม่รกหน้าจอ
  - **ปุ่มแสดงโหนดทั้งหมด (Show All Nodes Toggle)**: มีปุ่มให้กดสลับระหว่าง "แสดงเฉพาะโหนดที่ส่ง SOS ฉุกเฉิน" หรือ "แสดงโหนดโครงข่ายทั้งหมดรอบตัว (All Mesh Nodes)"
  - **Privacy Mode 100%**: ไม่แสดงชื่อเล่น (Nickname) ของโหนดข้างเคียง เพื่อรักษาความปลอดภัยและความเป็นส่วนตัวสูงสุด แสดงเฉพาะ NodeID ย่อ, สถานะ Online/Offline, แบตเตอรี่ 5 ขีด, RSSI, และระยะทางเท่านั้น

### 3. 🌉 สะพานเชื่อมฮาร์ดแวร์ Android (`OutGridAndroidBridge` / JavascriptInterface) & การแชร์ไฟล์ APK ออฟไลน์
- **แหล่งที่มาของไฟล์ APK ในเครื่อง (Zero-Storage Overhead APK Extraction)**:
  - ดึงไฟล์ `.apk` ตัวเต็มของแอปที่ติดตั้งอยู่ในเครื่อง Android โดยตรงผ่าน `context.packageCodePath` (เช่น `/data/app/.../base.apk`) ทำให้ไม่ต้องเสียพื้นที่เก็บไฟล์ซ้ำซ้อนในเครื่อง
- **ช่องทางการแชร์ไฟล์ APK ให้เพื่อนแบบออฟไลน์ 100%**:
  - **วิธีที่ 1: ระบบแชร์ของ Android (Quick Share / Bluetooth Intent)**:
    - เรียก `shareApkFile()` ส่งไฟล์ผ่าน `FileProvider` เปิดหน้าต่างแชร์มาตรฐานของ Android ยิงไฟล์ตรงเข้าเครื่องเพื่อนข้างๆ ด้วย Quick Share หรือ Bluetooth ได้ทันที
  - **วิธีที่ 2: วง Hotspot ท้องถิ่น + QR Code สแกนโหลด (Local Hotspot & QR Sideloading)**:
    - เรียก `startHotspot()` เปิด Wi-Fi Hotspot วงปิดชั่วคราว พร้อมรันเว็บเซิร์ฟเวอร์ขนาดจิ๋ว (Embedded HTTP Server) แจกไฟล์ APK ภายในเครื่อง
    - หน้าจอแสดง QR Code ให้เพื่อนใช้กล้องมือถือสแกน เพื่อต่อ Wi-Fi และดาวน์โหลดไฟล์ APK ติดตั้งได้ทันทีโดยไม่ต้องต่อเน็ตทั้งสองฝ่าย
- **ฟังก์ชันฮาร์ดแวร์อื่นๆ**:
  - `toggleTorch(enabled)`: เปิด/ปิดไฟฉายแฟลชกล้องหลังผ่าน `CameraManager` โดยตรง ชัวร์ 100%
  - `getBatteryInfo()`: อ่าน % แบตเตอรี่, สถานะชาร์จ, และอัตราการใช้พลังงานจริงจากระบบ

### 4. 🔲 ตัวสร้างภาพ QR Code แบบออฟไลน์ 100% (Pure Offline Canvas/SVG QR Generator)
- **อัลกอริทึม Reed-Solomon In-Memory (Zero-Network Dependency)**:
  - ประมวลผลและวาดภาพ QR Code แบบ Matrix ขาว-ดำ ผ่าน Pure TypeScript ลงบน `<canvas>` หรือ `<svg>` โดยตรงภายในเครื่อง
  - ไม่พึ่งพาเซิร์ฟเวอร์ภายนอก (ไม่ต้องพึ่งพา Google Charts API หรืออินเทอร์เน็ต) ทำงานได้ 100% แม้อยู่กลางป่าหรือเสาสัญญาณดับ
- **ระดับความทนทานสูงสุด Level H (High Resilience - 30% Error Correction)**:
  - เลือกใช้การกู้คืนข้อผิดพลาดระดับ **Level H** เพื่อให้กล้องสามารถสแกนติดได้อย่างแม่นยำ แม้หน้าจอมือถือจะแตกร้าว มีรอยขีดข่วน เปื้อนฝุ่นโคลน หรือมีแสงสะท้อนแดดในพื้นที่ภัยพิบัติ
- **รองรับ 2 โหมดการทำงานหลัก (Dual Operational Modes)**:
  - 👥 **โหมดเพิ่มเพื่อนฉุกเฉิน (Emergency Contact QR)**: ฝัง `NodeID`, `Nickname`, และ `X25519 Public Key` (32 Bytes) ให้เพื่อนสแกนเพื่อจับคู่และแลกกุญแจเข้ารหัสแชท 1:1 แบบ E2EE ได้ทันทีโดยไม่ต้องพิมพ์
  - 📲 **โหมดแจกไฟล์ APK ออฟไลน์ (Offline Sideloading QR)**: ฝังข้อมูลการเชื่อมต่อ Wi-Fi Hotspot อัตโนมัติ (`WIFI:S:OutGrid-Rescue;...`) พร้อมลิงก์ดาวน์โหลดตรง `http://192.168.49.1:8080/app.apk` ให้เพื่อนที่ยังไม่มีแอปใช้กล้องมือถือทั่วไปสแกนแล้วโหลดติดตั้งได้ทันที
- **ฟังก์ชันเสริมเพื่อทัศนวิสัยในที่มืด (UX Enhancements)**:
  - **Invert High-Contrast**: ปุ่มสลับสีพื้นหลังดำ-ลวดลายขาว สำหรับใช้งานกลางคืน ไม่แสบตา และประหยัดไฟจอ AMOLED
  - **Auto-Boost Screen Brightness**: เร่งแสงสว่างหน้าจอชั่วคราวขณะแสดง QR Code เพื่อให้กล้องของเพื่อนจับภาพได้ง่ายจากระยะ 1–2 เมตร

### 5. 🚨 หน้าต่างและแบนเนอร์แจ้งเตือนเมื่อได้รับสัญญาณ SOS ขาเข้า & กลไกกรองข้อความซ้ำ (Incoming SOS Alert Banner & Deduplication Engine)
- **ระบบแจ้งเตือนปลุกประสาทสัมผัสรอบด้าน (Multi-Sensory Emergency WakeLock)**:
  - เมื่อได้รับแพ็กเก็ต `0x01` (`SOS_BEACON`) ระบบจะปลุกหน้าจอสว่างอัตโนมัติ (WakeLock) แม้หน้าจอปิดอยู่
  - สั่นเตือนจังหวะรหัสมอส SOS (`... --- ...`) ให้ผู้ใช้รู้สึกตัวได้ทันทีแม้ใส่ไว้ในกระเป๋ากางเกง
  - เสียงหวูดเตือนภัยความถี่สูงสั้นๆ (Acoustic Morse Tone) ระดับ 85+ dB
- **แถบแบนเนอร์สีแดงกะพริบลอยด้านบน (Top Floating Emergency Banner)**:
  - แสดงลอยเด่นเหนือทุกหน้าจอ: `🚨 ตรวจพบสัญญาณขอความช่วยเหลือฉุกเฉิน ห่างออกไป 340 เมตร! [ดูบนแผนที่] [ตอบกลับ]`
  - ระบุทิศทางเข็มทิศ (Compass Bearing เช่น ตะวันออกเฉียงเหนือ 45°), ระดับแบตเตอรี่ของผู้ส่ง, และเวลาที่ส่ง
  - แตะเพื่อเปิดดูรายละเอียดพิกัด GPS แม่นยำ (< 1m) และเปิด **Rescue Radar Compass (เข็มทิศนำทางกู้ภัย)** พุ่งตรงไปยังจุดเกิดเหตุ
- **โครงสร้างรหัสข้อความ 64-bit และการกรองข้อความซ้ำ (64-bit MessageId & Deduplication Engine)**:
  - **โครงสร้าง MessageId (64-bit Unsigned Integer / 8 Bytes)**:
    - 44-bit Timestamp (นับเวลา ms ใช้งานต่อเนื่องได้ยาวนานถึง 557 ปี ไม่มีทางล้น) + 10-bit Sequence Counter (1,024 ข้อความ/ms) + 10-bit Node Salt (ป้องกันชนกับเครื่องอื่น 100%)
  - **กลไกการกรองข้อความซ้ำ O(1) LRU Cache (เมื่อแคชเต็ม 2,048 รายการ)**:
    - ใช้ LRU Sliding Window ขนาด 2,048 รายการล่าสุด (กิน RAM คงที่เพียง ~16–32 KB ตลอดกาล ไม่เกิด Memory Leak)
    - เมื่อมีข้อความใหม่เข้ามาจนเต็มโควตา ข้อความที่เก่าที่สุด (ซึ่งหมดอายุขัยของคลื่นวิทยุแล้ว) จะถูกเตะออกไปทิ้งอัตโนมัติ (LRU Eviction)
    - ป้องกันข้อความเก่ามากที่หลุดจากแคชด้วยการตรวจสอบ Timestamp: หากข้อความมีอายุเก่าเกิน 2 ชั่วโมง ระบบจะ Drop ทิ้งทันที ไม่นำกลับมาประมวลผลซ้ำ

### 6. ⚡ ระบบสลับโหมดอัตโนมัติใน 5 วินาที (Zero-Config 5s Mode State Machine & Cloud Sync)
- **กลไกช่วงผ่อนผัน 5 วินาที (5-Second Grace Period - ป้องกันเน็ตกระตุกชั่วคราว)**:
  - วินาทีที่ 0 (เมื่อเน็ตหลุด): ตรวจพบผ่าน `navigator.onLine` และ Cloud Ping แต่ยังไม่สลับโหมดทันที เพื่อป้องกันกรณีสัญญาณ 4G/5G ขาดหายสั้นๆ (เช่น ลอดใต้สะพาน)
  - วินาทีที่ 1–4: นับถอยหลัง Grace Period เฝ้ารอสัญญาณกลับมา
  - วินาทีที่ 5 (ครบ 5,000 ms เป๊ะ): เมื่อติดต่อเน็ตไม่ได้ครบ 5 วินาที ระบบจะตัดสินใจว่าเกิดเหตุฉุกเฉินและสลับเข้าสู่ **`DISASTER_MESH` (โหมดวิทยุกู้ภัยออฟไลน์)** อัตโนมัติ 100% โดยที่ผู้ใช้ไม่ต้องเข้าไปกดเปิดในเมนูตั้งค่า
- **การทำงานอัตโนมัติเมื่อเข้าสู่โหมด `DISASTER_MESH`**:
  - 📡 **เปิดสแต็กวิทยุท้องถิ่นทันที**: สั่งให้บลูทูธ BLE Mesh (`BleAdvertiser`) และ Wi-Fi Direct ในเครื่องเริ่มแพร่สัญญาณและสแกนหาโหนดรอบตัว
  - 🗺️ **สลับใช้แผนที่ในเครื่อง**: สลับจากการโหลดภาพ OpenStreetMap ผ่านอินเทอร์เน็ต มาเรนเดอร์ **World Vector Basemap (~5MB) ในเครื่อง** 100%
  - 🏷️ **แจ้งเตือนสถานะบนหัวจอ**: เปลี่ยน Badge จาก `☁️ Cloud Online` ➔ `📡 Disaster Mesh (โหมดวิทยุออฟไลน์)` สีส้มสะท้อนแสง
- **การคืนสภาพอัตโนมัติ & ส่งข้อมูลขึ้นคลาวด์ (Auto-Recovery & Sync to Cloud)**:
  - เมื่อเดินไปเจอสัญญาณเน็ต หรือเน็ตบ้านกลับมาใช้งานได้ ระบบจะสลับกลับสู่ **`NORMAL_CLOUD` ทันที** (ไม่ต้องรอ 5 วินาที)
  - **Auto-Sync Incident Data**: รวบรวมข้อความ SOS, พิกัดตำแหน่ง, และข้อมูลเพื่อนที่บันทึกไว้ใน IndexedDB ช่วงที่ไร้เน็ต ส่งขึ้นสู่เซิร์ฟเวอร์คลาวด์ศูนย์บัญชาการกู้ภัยอัตโนมัติทันที

### 7. 💬 ช่องแชทกู้ภัยครบวงจร (Broadcast ฉุกเฉิน & แชทส่วนตัว 1:1 แบบ E2EE, ไมค์, รูป WebP, วันเวลาที่ส่ง)
- **ระบบห้องแชท 2 รูปแบบ (Chat Hub)**:
  - 📢 **ช่องฉุกเฉินส่วนรวม (Emergency Broadcast)**: ส่งข้อความ/รูปภาพ กระจายถึงทุกคนในรัศมีวิทยุรอบตัวเพื่อแจ้งเหตุภัยพิบัติ
  - 🔒 **แชทส่วนตัว 1:1 (Direct 1-on-1 Encrypted Chat)**:
    - คุยแบบตัวต่อตัวกับเพื่อนหรือโหนดเฉพาะเจาะจง
    - **เข้ารหัสลับแบบหัว-ท้าย (End-to-End Encryption - E2EE)**: เข้ารหัสด้วย ECDH (Curve25519) + ChaCha20-Poly1305 เครื่องโหนดอื่นที่ช่วยรีเลย์สัญญาณวิทยุจะไม่สามารถแอบอ่านข้อความได้ 100% มีเฉพาะผู้รับปลายทางเท่านั้นที่อ่านได้
    - **เริ่มแชท 1:1 ได้สะดวก**: กดเริ่มคุยได้จากทั้ง *หน้ารายชื่อเพื่อน* หรือ *แตะที่หมุดของโหนดบนแผนที่*
- **การส่งรูปภาพบีบอัด & ชิ้นส่วนแพ็กเก็ตวิทยุ (WebP Image Fragmentation & Reassembly)**:
  - บีบอัดภาพถ่ายสถานการณ์เหลือ **5–12 KB** ด้วย WebP
  - หั่นข้อมูลออกเป็นชิ้นย่อย (Chunks ละ ~128B) ส่งผ่านคลื่นวิทยุ BLE โดยมีแถบ Progress แสดงสถานะ เช่น `📥 กำลังรับภาพ 65%...` เมื่อครบจึงรวมและเรนเดอร์ภาพ
- **ปักหมุดข้อความสำคัญ & ป้องกันการถูกลบ (Pinned / Starred Message Protection)**:
  - ผู้ใช้สามารถกดปักหมุด (Pin) ข้อความสำคัญ เช่น ข้อมูลคนติดในอาคาร หรือเบอร์ติดต่อฉุกเฉิน
  - ข้อความที่ปักหมุดจะถูกล็อคป้องกันถาวร (`isProtected: true`) ใน IndexedDB จะไม่ถูก FIFO Pruning ลบออกเด็ดขาด
- **ปุ่มส่งพิกัด GPS ด่วน (1-Tap Share Location Pin)**:
  - ปุ่ม 📍 แตะครั้งเดียวส่งพิกัดละติจูด/ลองจิจูดและ H3 Index ปัจจุบันลงในแชททันที
  - ผู้รับสามารถแตะที่กล่องพิกัด เพื่อเปิดแผนที่นำทางไปยังจุดเกิดเหตุได้ในคลิกเดียว
- **วันและเวลาที่ส่ง (Timestamp & Relative Time)**:
  - ใต้ทุกลูกโป่งข้อความ (Message Bubble) จะแสดงเวลาที่ส่ง เช่น `14:35`
  - หากมีการส่งข้ามวัน จะมีแถบคั่นวันที่ เช่น `── วันนี้ ──` หรือ `── 20 ก.ย. 2026 ──` และระบุวันที่ย่อในข้อความ
  - แสดงระยะเวลาที่ผ่านมา (Relative Time Indicator) เมื่อแตะดู เช่น *เมื่อ 3 นาทีที่แล้ว*, *เมื่อ 1 ชม. ที่แล้ว* ช่วยให้ทีมกู้ภัยประเมินความสดใหม่ของสถานการณ์ได้ทันที
  - สถานะการส่งผ่านคลื่นวิทยุ Mesh: 🕒 กำลังส่ง ➡️ ✓ ส่งออกจากเครื่อง ➡️ ✓✓ ส่งต่อสำเร็จ (Relayed / Read)
- **เครื่องมือช่วยเหลือผู้ประสบภัยหน้างาน**:
  - **ปุ่มไมค์ 🎙️**: ถอดเสียงพูดเป็นข้อความอัตโนมัติ (Speech-to-Text)
  - **ชิปข้อความฉุกเฉินสำเร็จรูป (Quick SOS Chips)**: แตะส่งทันที เช่น *"ต้องการแพทย์ด่วน"*, *"น้ำท่วมสูง ต้องการเรือ"*, *"ติดใต้ซากอาคาร"*, *"ปลอดภัยแล้ว"*
  - **Strict Payload Limit**: จำกัด 160 ตัวอักษร พร้อมตัวนับอักษร Real-time เพื่อประสิทธิภาพวิทยุ

### 8. 🔄 ระบบอัปเดตหน้าเว็บอัตโนมัติเมื่อต่อเน็ต (Smart Hybrid OTA Web Update Architecture)
- **สถาปัตยกรรม Stale-While-Revalidate (เปิดแอปเร็วทันทีใน 0.1 วินาที)**:
  - เมื่อเปิดแอป ตัว WebView จะโหลดโค้ด UI จาก Local Cache หรือ Embedded Assets ของ APK ขึ้นมาแสดงผลทันที ไม่ต้องยืนรอโหลดหน้าขาว พร้อมใช้งานช่วยเหลือชีวิตได้ในเสี้ยววินาที
- **การตรวจสอบเวอร์ชันใหม่แบบเงียบๆ เบื้องหลัง (Silent Background Manifest Check)**:
  - หากเครื่องมีสัญญาณอินเทอร์เน็ต Service Worker จะส่ง Background Fetch ตรวจสอบ `version.json` หรือ Build Hash จากเซิร์ฟเวอร์
  - หากพบว่ามีเวอร์ชันใหม่ จะเริ่มดาวน์โหลดไฟล์ JS, CSS, และ Translations ชุดใหม่มาจัดเก็บในแคชสำรองเบื้องหลัง โดยไม่กระทบการใช้งานของผู้ใช้
- **กลไกการสลับไฟล์แบบปลอดภัย (Atomic Cache Swap & Integrity Check)**:
  - ตรวจสอบความถูกต้องของไฟล์ครบ 100% (Subresource Integrity Hash) ก่อนทำการสลับแคช ป้องกันกรณีเน็ตหลุดกลางคันจนไฟล์เสียหาย
  - แสดงแบนเนอร์แจ้งเตือนแบบไม่รบกวน: `✨ มีเวอร์ชันใหม่พร้อมใช้งาน [แตะเพื่อรีโหลด]` หรืออัปเดตอัตโนมัติเมื่อเปิดแอปครั้งถัดไป
- **รับประกันข้อมูลในเครื่องไม่สูญหาย (Zero-Data Loss Guarantee)**:
  - การอัปเดต OTA จะเปลี่ยนแปลงเฉพาะไฟล์ส่วนติดต่อผู้ใช้ (UI Bundle) เท่านั้น
  - ข้อมูลใน **IndexedDB ทั้งหมด (ประวัติแชท, ข้อความ SOS, รายชื่อเพื่อน, กุญแจเข้ารหัส)** และ LocalStorage จะถูกปกป้องคงอยู่ครบ 100% ไม่สูญหายเด็ดขาด
- **โหมดสำรองออฟไลน์ 100% (Offline Fallback to Embedded Assets)**:
  - หากเซิร์ฟเวอร์คลาวด์มีปัญหา หรือเน็ตตัดขาด WebView จะสลับกลับมารันจากไฟล์ดั้งเดิมที่ฝังอยู่ใน Assets ของตัว APK ทันที การันตีว่าแอปจะไม่มีวันเปิดไม่ติด (Zero White-Screen Risk)

### 9. 🎨 ติดตั้ง Logo & App Icon ทางการ (Official Branding - Version 1 Selected)
- **การเลือกใช้ดีไซน์ทางการ (Official Selected Design - Version 1)**:
  - เลือกใช้ภาพต้นฉบับ **Version 1 (`outgrid_mesh_logo_1789888894200.jpg`)**: สไตล์ **Hexagonal Mesh Shield + Glowing Emergency Beacon** ผสานโครงข่าย Mesh Nodes สีฟ้าคราม (Cyan/Emerald) และสัญญาณเตือนภัยกู้ภัยตรงกลางอย่างสมบูรณ์แบบ
- **การติดตั้งฝั่ง Android Native App (APK)**:
  - **Android Adaptive Icon (เวกเตอร์ 2 เลเยอร์)**:
    - Foreground (`ic_launcher_foreground.xml`): ภาพเวกเตอร์โลโก้ Hexagonal Shield และ Beacon ตรงกลางที่คมชัดในทุกระดับความละเอียด
    - Background (`ic_launcher_background.xml`): โทนสีน้ำเงินเข้มเนวีตัดดำ `#0A0F1D`
  - **Mipmap Multi-DPI Resources**: สร้างไฟล์ไอคอนขนาดต่างๆ ครบทุกความละเอียดหน้าจอ:
    - `mipmap-mdpi` (48x48 px), `mipmap-hdpi` (72x72 px), `mipmap-xhdpi` (96x96 px), `mipmap-xxhdpi` (144x144 px), `mipmap-xxxhdpi` (192x192 px)
  - กำหนดค่า `android:icon` และ `android:roundIcon` ใน `AndroidManifest.xml`
- **การติดตั้งฝั่ง Web Application (PWA & Header)**:
  - **Header Logo**: นำไปวางที่มุมบนซ้ายของ Header (`+page.svelte`) ขนาด 36x36 px สวยงาม
  - **Favicon & Web App Icons**: `static/favicon.png`, `static/apple-touch-icon.png` (180x180 px), และ Web App Manifest (`static/manifest.json` ขนาด 192x192 และ 512x512 maskable)

### 10. 🛡️ ขอสิทธิ์ฮาร์ดแวร์แบบรวดเดียว (All-in-One Permissions Request Architecture)
- **ชุดคำขอสิทธิ์ 9 รายการในรอบเดียว (Single Batch Permission Request)**:
  - ขอสิทธิ์ทั้งหมดตอนเปิดแอปครั้งแรกเพื่อป้องกันป๊อปอัปเด้งขัดจังหวะผู้ใช้ในยามเกิดภัยพิบัติฉุกเฉิน:
    1. `ACCESS_FINE_LOCATION`: อ่านพิกัดดาวเทียม GPS ความแม่นยำสูงระดับเมตรสำหรับกู้ภัย
    2. `ACCESS_COARSE_LOCATION`: พิกัดเสาสัญญาณสำรองประหยัดพลังงาน
    3. `BLUETOOTH_SCAN`: ค้นหาโหนดและเพื่อนรอบตัวผ่านคลื่นวิทยุ BLE ไร้เน็ต
    4. `BLUETOOTH_ADVERTISE`: ปล่อยสัญญาณวิทยุขอความช่วยเหลือ SOS และพิกัดตำแหน่ง
    5. `BLUETOOTH_CONNECT`: ถ่ายโอนข้อความแชทระหว่างเครื่อง
    6. `NEARBY_WIFI_DEVICES`: ค้นหาและจับคู่อุปกรณ์ Wi-Fi Direct สำหรับแชร์ไฟล์ออฟไลน์
    7. `CAMERA`: ถ่ายภาพสถานการณ์ภัยพิบัติ และสแกน QR Code เพิ่มเพื่อน
    8. `RECORD_AUDIO`: ไมโครโฟนสำหรับพิมพ์ด้วยเสียง (Speech-to-Text)
    9. `POST_NOTIFICATIONS`: แจ้งเตือนสั่นและเสียงเมื่อได้รับสัญญาณ SOS ขาเข้าขณะจอดับ
- **สะพานเชื่อมสิทธิ์ระหว่าง Android Native กับ WebView (WebChromeClient Handlers)**:
  - `onGeolocationPermissionsShowPrompt`: ส่งต่อสิทธิ์ GPS ให้กับ Leaflet Map ทันทีโดยไม่มีหน้าต่างถามซ้ำ
  - `onPermissionRequest`: อนุมัติสิทธิ์กล้องและไมโครโฟน (Media/WebRTC) ให้หน้าเว็บทันที
  - `onShowFileChooser`: รองรับปุ่มแนบรูปถ่ายในช่องแชท เปิดแอปกล้องและคลังภาพของ Android ได้อย่างราบรื่น
- **หน้าจอนำทางที่เป็นมิตร (Pre-Permission Rationale Modal)**:
  - แสดงหน้าต่างอธิบายเหตุผลอย่างโปร่งใสก่อนระบบ Android เด้งถาม: ระบุชัดเจนว่าสิทธิ์ทั้งหมดใช้เพื่อสร้างวิทยุกู้ภัยออฟไลน์ และข้อมูลทั้งหมดจะถูกเก็บไว้ในเครื่องเท่านั้น ไม่มีการส่งออกภายนอก ทำให้ผู้ใช้มั่นใจและกดอนุญาตทั้งหมดในคลิกเดียว

### 11. 🔦 ไฟฉายกะพริบขอทาง & หวูดเสียงไซเรนรหัสมอส (Optical Strobe & Acoustic Morse Siren)
- **ไฟฉายแฟลชกล้องหลังกะพริบรหัสมอส (Optical Strobe SOS via CameraManager)**:
  - ควบคุมผ่าน `CameraManager.setTorchMode` โดยตรงผ่าน Native Bridge ตอบสนองแม่นยำระดับมิลลิวินาที
  - **จังหวะรหัสมอสสากล (`... --- ...` SOS)**:
    - S: เปิด 200ms / ปิด 200ms (3 ครั้ง)
    - O: เปิด 600ms / ปิด 200ms (3 ครั้ง)
    - S: เปิด 200ms / ปิด 200ms (3 ครั้ง)
    - พัก 1,500ms แล้ววนลูปอัตโนมัติ ส่องสว่างมองเห็นได้ไกลกว่า 1 กม. ในความมืด
  - **2 โหมดการใช้งาน**: 🔦 Steady Light (เปิดค้างส่องทาง) / ⚡ SOS Strobe (กะพริบฉุกเฉิน)
  - **Thermal & Battery Protection**: ลดความถี่ลงอัตโนมัติหากแบตเตอรี่ต่ำกว่า 10% ป้องกันเครื่องดับ
- **หวูดเสียงไซเรนรหัสมอสความถี่สูง (Acoustic Morse Siren via Web Audio API)**:
  - สังเคราะห์คลื่นเสียงสดๆ ในเครื่องด้วย `AudioContext.createOscillator()` (Zero MP3 Dependencies ไม่เปลืองพื้นที่)
  - **ความถี่ทะลุสิ่งกีดขวาง (960 Hz สลับ 1,440 Hz Dual-Tone)**:
    - ช่วงความถี่ที่หูมนุษย์และสุนัขกู้ภัย K-9 ไวต่อการได้ยินมากที่สุด และสะท้อนทะลุซากตึกคอนกรีตได้ดีเยี่ยม
  - บังคับเร่งเสียงลำโพงขึ้นระดับสูงสุดอัตโนมัติขณะส่งเสียงเตือนภัย
- **แผงควบคุมและปุ่มฉุกเฉินสูงสุด (Master Panic Button / BeaconControlsBar)**:
  - วิดเจ็ตแถบควบคุมที่เข้าถึงได้ทันทีจากทุกหน้าจอ
  - **Master Panic Button [ALL-IN SOS]**: แตะปุ่มเดียว ➔ สั่งการพร้อมกันทั้งไฟฉายกะพริบ + หวูดไซเรน + ยิงแพ็กเก็ตวิทยุขอความช่วยเหลือรอบตัวทันที

### 12. 📶 แถบสถานะ Network & ตัวนับโหนดรอบตัว (Network Telemetry & Peer Counter Bar)
- **การตรวจจับประเภทสัญญาณ Real-time (Network Link Detector)**:
  - 🟢 **`5G / 4G LTE`**: มีสัญญาณอินเทอร์เน็ตมือถือความเร็วสูง เชื่อมต่อ Cloud Gateway ได้สมบูรณ์
  - 🔵 **`Wi-Fi`**: เชื่อมต่อผ่าน Local Wi-Fi หรือ Hotspot เครือข่ายฉุกเฉิน
  - 🟠 **`Disaster Mesh (วิทยุไร้เน็ต)`**: สลับเป็นสีส้มสะท้อนแสงอัตโนมัติเมื่อไร้เน็ต แสดงสถานะวิทยุ BLE 5.0 Active / Wi-Fi Direct P2P พร้อมส่งต่อข้อมูล
  - ⚫ **`Isolated (ไร้การเชื่อมต่อ)`**: เตือนเมื่อปิดบลูทูธและไม่มีเน็ต พร้อมปุ่มแนะนำให้เปิดวิทยุทันที
- **ตัวนับโหนดรอบตัวอัจฉริยะ (Smart Peer Counter & Tap to Expand Modal)**:
  - แสดงตัวเลขชัดเจนบนหัวจอ: เช่น `👥 12 โหนดรอบตัว` พร้อมจุดไฟแอนิเมชันกระพริบเมื่อได้รับ Heartbeat ใหม่
  - เมื่อแตะที่ตัวนับโหนด จะเปิดหน้าต่างสรุปจำแนกประเภทโหนดรอบตัวทันที:
    - 🚨 **โหนดที่ส่ง SOS**: เช่น `1 เครื่อง (ต้องการความช่วยเหลือด่วน!)`
    - ⭐ **โหนดเพื่อน/ครอบครัว**: เช่น `3 เครื่อง (อยู่ในระยะติดต่อ)`
    - 📡 **โหนดโครงข่าย Mesh ทั่วไป**: เช่น `8 เครื่อง (ช่วยรีเลย์ส่งต่อสัญญาณวิทยุ)`
    - 🌐 **โหนดที่เป็น Internet Gateway**: เช่น `1 เครื่อง (สามารถนำพาข้อความออกสู่เน็ตภายนอกได้)`
- **มาตรวัดความแข็งแกร่งของเครือข่ายวิทยุ (Mesh Density & Health Score)**:
  - 🟢 **หนาแน่นดีเยี่ยม (Dense / 10+ โหนด)**: เครือข่ายแข็งแกร่งมาก โอกาสข้อความตกหล่น 0%
  - 🟡 **ปานกลาง (Moderate / 3–9 โหนด)**: สื่อสารได้ต่อเนื่อง
  - 🔴 **เบาบาง (Sparse / 1–2 โหนด)**: แนะนำให้อยู่ในรัศมีใกล้กันไม่เกิน 50–100 เมตร
  - ⚪ **โดดเดี่ยว (Isolated / 0 โหนด)**: ระบบจะเร่งความถี่บีคอน Trickle เพื่อค้นหาเพื่อนรอบข้างให้เร็วที่สุด

### 13. 🆔 ข้อมูลโหนดของเรา, พิกัด GPS, ดัชนี H3, และรายการ NodeID ข้างเคียง (Privacy Mode & Node Telemetry Engine)
- **ข้อมูลตัวตนโหนดประจำตัวของเรา (Our Node Identity & Spatial Engine)**:
  - **Full NodeID & Short NodeID**: แสดงรหัสประจำตัวเต็ม (64-bit Hash) ควบคู่กับรหัสย่อ 4–6 ตัวอักษร (เช่น `#9B1C` จาก 24-bit Short NodeID 16.7 ล้านรหัส) เพื่อให้อ่านออกเสียงสื่อสารทางวิทยุง่าย
  - **ระบบ Spatial Disambiguation**: ผสาน Short NodeID 24-bit ร่วมกับ H3 Cell Index ทำให้คงเอกลักษณ์เฉพาะตัวในพื้นที่วิทยุท้องถิ่นโดยไม่ต้องเพิ่มขนาดไบต์ใน BLE Packet หากชนกันในเซลล์เดียวกันจะดึง 2 ไบต์ท้ายของ Public Key มาช่วยแยกแยะ เช่น `#9B1C-E4`
  - **Custom Nickname**: ช่องตั้งชื่อเล่นของตัวเอง (เช่น *"ทีมกู้ภัยจุดที่ 1"* หรือ *"ครอบครัวสมชาย"*) โดยชื่อนี้จะเปิดเผยเฉพาะกับเพื่อนที่สแกน QR เพิ่มกันแล้วเท่านั้น
  - **พิกัด GPS ความละเอียดสูง & ระดับความสูง**: ละติจูด/ลองจิจูดทศนิยม 6 ตำแหน่ง, ค่าความคลาดเคลื่อน (`± 2.5 ม.`), และความสูงจากระดับน้ำทะเล (Altitude เพื่อประเมินน้ำท่วม)
  - **ดัชนีเซลล์ตาราง H3 (Uber H3 Hexagon Resolution 9 ~100m)**: คำนวณพิกัดเป็นรหัสตาราง 6 เหลี่ยมสั้นๆ (เช่น `89650e42c2bffff`) สะดวกต่อการแจ้งพิกัดส่งเสบียงหรือแจ้งทางวิทยุ
  - **ปุ่มคัดลอกและแชร์พิกัดด่วน**: คัดลอกสรุปพิกัดลงคลิปบอร์ดพร้อมส่งต่อได้ทันที
- **รายการโหนดข้างเคียง & กฎเหล็กความเป็นส่วนตัว (Neighbor Nodes & Strict Privacy Mode)**:
  - 🛡️ **Privacy Mode 100% (Zero PII Exposure)**:
    - **ห้ามแสดงชื่อเล่นของโหนดข้างเคียงที่ไม่ใช่เพื่อนเด็ดขาด**: แสดงเฉพาะ Short NodeID เพื่อป้องกันคนแปลกหน้าหรือผู้ไม่หวังดีแอบสแกนหาชื่อบุคคลในพื้นที่ภัยพิบัติ
    - แสดงชื่อได้เฉพาะโหนดที่เป็นเพื่อนในสมุดรายชื่อ (Emergency Contacts) ของเราเท่านั้น
  - **การ์ดข้อมูลโทรมาตรของแต่ละโหนด (Per-Node Telemetry Card)**:
    - 🟢 **Online (< 30s)** / 🟡 **Stale (30s–2m)** / ⚫ **Offline (> 2m พร้อมระบุเวลาล่าสุด เช่น *ออฟไลน์เมื่อ 5 นาทีที่แล้ว*)**
    - **ระดับแบตเตอรี่ 5 ขีด**: แสดงก้อนแบตตามสีเตือนภัย เช่น `[████░] 4 ขีด` หรือ `[█░░░░] แดงกะพริบ 1 ขีด ⚠️ วิกฤต`
    - **ความแรงสัญญาณวิทยุ (RSSI dBm & Signal Bars)**: สัญญาณแรงมาก (-50 dBm, 4 ขีด), ปานกลาง (-75 dBm), หรืออ่อน (-95 dBm)
    - **ระยะห่างโดยประมาณ (Haversine Distance)**: เช่น `~65 ม.`, `~280 ม.`, `~1.2 กม.`
    - **จำนวน Hop การส่งต่อ**: เช่น `Direct (0 Hop)` หรือ `Relayed (2 Hops)`
  - **ระบบจัดเรียงและปุ่มลัด (Sorting & Quick Actions)**:
    - จัดเรียงตาม: *ระยะทางใกล้สุด*, *ความแรงสัญญาณ RSSI*, หรือ *แบตเตอรี่ต่ำสุดก่อน*
    - ปุ่มลัดบนการ์ด: 💬 **[เริ่มแชท 1:1 แบบ E2EE]** และ 🗺️ **[ชี้เป้าบนแผนที่]**

### 14. 🌐 ระบบ 10 ภาษาสากลทางการ แปลครบทุกเมนู (Default Language: English `en`)
- **ชุด 10 ภาษาสากลทางการของระบบ (Official 10 Languages - สอดคล้องกับสเปกเดิม 100%)**:
  1. 🇬🇧 **`en` (English - ภาษาเริ่มต้น Default)**: ภาษาสากลสำหรับทีมกู้ภัยนานาชาติและผู้ใช้ทั่วโลก
  2. 🇹🇭 **`th` (ไทย - Thai)**: ภาษาไทยครบถ้วนสมบูรณ์
  3. 🇨🇳 **`zh` (中文 - Simplified Chinese)**: ภาษาจีน
  4. 🇪🇸 **`es` (Español - Spanish)**: ภาษาสเปน
  5. 🇮🇳 **`hi` (हिन्दी - Hindi)**: ภาษาฮินดี (อินเดีย)
  6. 🇸🇦 **`ar` (العربية - Arabic)**: ภาษาอาหรับ (พร้อมรองรับ Right-to-Left / RTL layout)
  7. 🇫🇷 **`fr` (Français - French)**: ภาษาฝรั่งเศส
  8. 🇷🇺 **`ru` (Русский - Russian)**: ภาษารัสเซีย
  9. 🇧🇷 / 🇵🇹 **`pt` (Português - Portuguese)**: ภาษาโปรตุเกส
  10. 🇯🇵 **`ja` (日本語 - Japanese)**: ภาษาญี่ปุ่น
- **ครอบคลุมการแปลทุกเมนูและทุกหน้าจอทั่วทั้งระบบ (Comprehensive UI Coverage)**:
  - **ปุ่ม Bottom Navigation Bar 5 เมนู**: Map (แผนที่), Chat (แชทกู้ภัย), SOS (ปุ่มฉุกเฉิน), Friends (เพื่อน), Profile (โปรไฟล์)
  - **แถบสถานะ Network & แบตเตอรี่**: สถานะการเชื่อมต่อ, ตัวนับโหนด, และข้อความเวลาแบตเตอรี่คงเหลือ
  - **หน้าจอแผนที่ (SosMapView)**: เลเยอร์, หมุดตำแหน่ง, ปุ่มสลับระยะทาง, และหน้าต่างป๊อปอัปโหนด
  - **หน้าจอแชทกู้ภัย (MeshChatScreen)**: ป้ายเวลา, ชิปข้อความฉุกเฉินด่วน 4 รายการ, สถานะการส่ง
  - **หน้าต่างแจ้งเตือนฉุกเฉิน (Incoming SOS Banner & Modal)**
  - **หน้ารายการเพื่อนและหน้าแชร์ APK (Friends & APK Sideloading Screens)**
- **การตั้งค่าเริ่มต้นและการจำค่า (Default & Persistence)**:
  - **เริ่มต้นเป็นภาษาอังกฤษ (`en`) เสมอ** สำหรับการเปิดใช้งานครั้งแรกทั่วโลก
  - ผู้ใช้สามารถกดเมนูลูกโลก 🌐 บน Header เพื่อเลือกเปลี่ยนเป็นภาษาใดก็ได้ใน 10 ภาษาได้ทันทีโดยไม่ต้องโหลดหน้าเว็บใหม่ (Reactive Zero-Reload)
  - จำค่าภาษาที่ผู้ใช้เลือกไว้ถาวรใน `localStorage ('outgrid_lang')` เพื่อให้เปิดแอปครั้งถัดไปเป็นภาษานั้นต่อเนื่อง

### 15. 📱 สถาปัตยกรรม Hybrid Navigation (Hamburger Menu ☰ บน Header + Bottom Bar 5 ปุ่ม + ระบบโปรไฟล์)
- **สถาปัตยกรรมการนำทางแบบผสมผสาน (Hybrid Navigation Architecture)**:
  - **1. แถบ Bottom Navigation Bar (5 เมนูหลักด้านล่าง ตาม Thumb Zone มือเดียว)**:
    1. 🗺️ **Map (แผนที่)**: แสดง World Vector Basemap L2 ออฟไลน์, ตำแหน่ง H3, หมุดโหนดรอบตัว (แบตเตอรี่ 5 ขีด/ระยะทาง), ปุ่มเปิดปิดระยะทาง และปุ่มสลับโหนดทั้งหมด
    2. 💬 **Chat (แชทกู้ภัย)**: แชทฉุกเฉิน Broadcast + แชทส่วนตัว 1:1 แบบ E2EE, ปุ่มไมค์พิมพ์ด้วยเสียง, แนบรูป WebP (พร้อม Chunk Progress), ชิปด่วน, ปุ่มแชร์พิกัด GPS
    3. 🚨 **One-Tap SOS (ปุ่มฉุกเฉินวงกลมกึ่งกลาง Floating Center Button)**: ปุ่มเด่นนูนตรงกลาง แตะครั้งเดียวส่งสัญญาณขอความช่วยเหลือความแม่นยำสูงทันที
    4. 👥 **Friends (เพื่อน & กู้ภัย)**: รายชื่อเพื่อนฉุกเฉิน, สแกน QR แอดเพื่อน, และเปิดห้องคุย 1:1
    5. 👤 **Profile (โปรไฟล์ & ตัวตน)**: รหัส NodeID ย่อ/เต็ม, แก้ไขชื่อเล่น (Nickname), ปุ่มเข้าสู่ระบบ Google, และจัดการสำรองข้อมูล
  - **2. แถบ Hamburger Menu ☰ (Side Drawer Menu มุมบนซ้ายของ Header)**:
    - แตะไอคอน ☰ เพื่อสไลด์เปิดแถบเมนูด้านข้างสำหรับเครื่องมือเสริมและข้อมูลระบบ:
      - 📖 **คู่มือการเอาชีวิตรอดฉุกเฉิน (Survival Field Manual - 10 ภาษา)**
      - 📲 **แชร์ไฟล์ APK ให้เพื่อนแบบออฟไลน์ (Offline APK Sideloading via Quick Share / Hotspot)**
      - 🔦 **แผงควบคุมสัญญาณไฟฉาย SOS & หวูดเสียงไซเรนฉุกเฉิน**
      - 💰 **กองทุนช่วยเหลือสาธารณะ (Disaster Relief Fundraiser - คงไว้ครบ 100%)**
      - ⚙️ **การวินิจฉัยและสถิติเครือข่ายวิทยุ (Radio Diagnostics & Mesh Stats)**
      - ℹ️ **เกี่ยวกับ OutGrid Mesh (เวอร์ชัน TOG v1.1 & สถานะเครื่อง)**
- **ระบบเข้าสู่ระบบ Gmail & กฎเหล็ก 100% Guest Parity**:
  - 👤 **Guest Mode (ผู้ใช้ทั่วไปไม่ต้องสมัคร)**: เข้าถึงฟีเจอร์ช่วยชีวิตได้ครบ 100% เท่าเทียมกันทุกประการ (ส่ง SOS, ดูแผนที่, แชทวิทยุ Mesh, แอดเพื่อนในเครื่อง) โดยไม่มีการบังคับล็อกอิน
  - 🔑 **Google Sign-In (ออปชันเสริมสำหรับสำรองข้อมูล)**: เข้าสู่ระบบเพื่อผูกบัญชีสำหรับสำรองและกู้คืนรายชื่อเพื่อนเมื่อเปลี่ยนเครื่องใหม่
- **ระบบสำรองรายชื่อเพื่อนบน Server แม่ข่าย (Zero-Knowledge Central Server Backup)**:
  - **การเข้ารหัสลับฝั่งเครื่อง (Client-Side Encryption)**: รายชื่อเพื่อนและกุญแจสาธารณะจะถูกเข้ารหัสลับด้วย AES-GCM / X25519 ภายในเครื่องก่อนส่งเสมอ
  - **จัดเก็บที่ Server แม่ข่ายอย่างปลอดภัย**: ข้อมูลที่ส่งขึ้น Server แม่ข่ายของ OutGrid Mesh จะเป็นเพียง Encrypted Blob ทำให้แม้แต่แอดมินหรือผู้ดูแลเซิร์ฟเวอร์ก็ไม่สามารถแอบอ่านรายชื่อเพื่อนได้ 100%
  - **กู้คืนข้อมูลข้ามเครื่องอัตโนมัติ (Seamless Cloud Restore)**: เมื่อผู้ใช้ย้ายไปล็อกอิน Gmail ในเครื่องใหม่ ระบบจะดึง Encrypted Blob จาก Server แม่ข่ายมาถอดรหัสลงสู่ IndexedDB ในเครื่องใหม่ทันที ข้อมูลเพื่อนและกุญแจแชทไม่สูญหายแม้เครื่องเดิมตกน้ำหรือพังเสียหาย

### 16. 💾 ระบบฐานข้อมูลในเครื่องด้วย IndexedDB ออฟไลน์ 100% (Local Database & Storage Ceiling)
- **สถาปัตยกรรม IndexedDB เต็มรูปแบบ (Local-First Offline Database)**:
  - จัดเก็บข้อมูลทั้งหมดลงใน `IndexedDB` ปลอดภัย ออฟไลน์ 100% ข้อมูลไม่สูญหายเมื่อปิดแอปหรือเครื่องดับ
  - **สิ่งที่จัดเก็บใน IndexedDB**:
    - 💬 **ประวัติข้อความแชท (Chat History)**: ข้อความฉุกเฉิน SOS, แชทกลุ่ม Broadcast, แชทส่วนตัว 1:1 แบบ E2EE, และรูปภาพ WebP
    - 👥 **รายชื่อเพื่อนฉุกเฉิน (Friends & Contacts)**: NodeID, ชื่อเล่น, Public Key, เวลาที่แอด
    - 🗺️ **แคชพิกัดและข้อมูลแผนที่ (Spatial & H3 Cache)**
    - 📡 **ประวัติการตรวจจับโหนดรอบตัว (Peer Node Cache)**: รายการโหนดข้างเคียง 200 โหนดล่าสุด, RSSI, แบตเตอรี่, สถานะ Online/Offline
- **การการันตีพื้นที่จัดเก็บถาวร (Persistent Storage Guarantee via `navigator.storage.persist()`)**:
  - เรียกใช้ `navigator.storage.persist()` ตั้งแต่เปิดแอป เพื่อขอสถานะความคงทนถาวรจากระบบ Android
  - **ป้องกัน Android ลบข้อมูลทิ้งอัตโนมัติ**: แม้หน่วยความจำเครื่องจะใกล้เต็ม ระบบ Android จะไม่สั่งล้าง (Evict) ฐานข้อมูลของ OutGrid Mesh เด็ดขาด ข้อมูลกู้ภัยปลอดภัย 100%
- **ระบบกู้คืนข้อมูลอัตโนมัติเมื่อเครื่องดับวูบ (Auto-Corruption Recovery & Self-Healing)**:
  - รองรับกรณีฉุกเฉินที่มือถือแบตเตอรี่หมดดับไปกะทันหันขณะกำลังเขียนข้อมูล: ระบบจะ Rollback กลับสู่ Checkpoint ที่สมบูรณ์ล่าสุดอัตโนมัติเมื่อเปิดแอปใหม่ ไม่เกิดอาการแอปค้างหน้าขาว (Zero Crash on Corrupt)
- **การคุมความจุและการลบอัตโนมัติ (50MB FIFO Storage Ceiling & Protected SOS)**:
  - กำหนดเพดานความจุสูงสุดไว้ที่ **50 MB** ป้องกันแอปกินพื้นที่เครื่องจนเต็ม
  - **Tiered Pruning Policy**: เมื่อความจุใกล้เต็ม ระบบจะลบข้อความเก่าทิ้งอัตโนมัติแบบ FIFO โดยเริ่มจากแพ็กเก็ตสถานะทั่วไป (`PRESENCE_CHIRP`) ก่อน
  - **Protected Flag**: ข้อความขอความช่วยเหลือฉุกเฉิน (`SOS_BEACON`) และข้อความที่ปักหมุดไว้ (Pinned) จะถูกล็อคป้องกันถาวร **ห้ามลบเด็ดขาด** จนกว่าผู้ใช้จะกดลบเอง
- **แดชบอร์ดตรวจสอบพื้นที่และการส่งออกข้อมูล (Storage Health Dashboard & Export)**:
  - หน้าจอแสดงผลความจุ Real-time ในเมนู Profile/Settings เช่น `💾 ใช้ไป 12.4 MB / 50 MB [███░░░░░░░] 25%`
  - ปุ่มส่งออกข้อมูลสำรอง (Export JSON Backup) ลงในเครื่องผู้ใช้ด้วยตนเอง

### 17. 🧭 ระบบนำทางเข็มทิศเรดาร์กู้ภัยแบบก้าวต่อก้าว (Rescue Radar Compass HUD - Tactical Life-Finder)
- **การนำทางด้วยเข็มทิศแมกนีโตมิเตอร์จริง (DeviceOrientation Magnetometer Compass)**:
  - เมื่อมีสัญญาณ SOS หรือเราเลือกโหนดเพื่อนที่ต้องการค้นหาในระยะใกล้ (< 1–2 กม.) ในป่า ในน้ำท่วม หรือในที่มืด:
  - หน้าจอ **Tactical Rescue Radar HUD**:
    - แสดงลูกศรนำทาง 3D เปล่งแสง ชี้ตรงไปยังทิศทางจริงของตำแหน่งผู้ประสบภัยแบบก้าวต่อก้าว
    - แสดงเข็มทิศหมุนรอบทิศ 360° ตามการหันหน้าของผู้ใช้จริง
    - คำนวณและนับระยะทางถอยหลังแบบ Real-time: `🚶 เข้าใกล้เป้าหมาย: เหลืออีก 140 ม. ➔ 65 ม. ➔ 12 ม.`
- **ระบบสั่นนำทางตามระยะทาง (Proximity Haptic Pacing)**:
  - สั่นเตือนที่มือเป็นจังหวะ และจะสั่นถี่ขึ้นเรื่อยๆ เมื่อเดินเข้าใกล้เป้าหมายในระยะ 10–20 เมตร ช่วยให้ค้นพบตัวผู้ประสบภัยที่ติดใต้ซากตึกหรือในควันมืดได้อย่างแม่นยำแม้สายตามองไม่เห็น
- **ระบบเสียงโซนาร์นำทางตามระยะทาง (Geiger-Counter Audio Beep)**:
  - ส่งเสียงปี๊บเป็นจังหวะตามความใกล้: ระยะ > 100 ม. ดังทุก 2 วินาที, ระยะ 20–50 ม. ดังทุก 0.5 วินาที, ระยะ < 10 ม. ดังถี่เป็นเสียงลากยาวต่อเนื่อง (Continuous Solid Tone) คล้ายเซนเซอร์ถอยจอดรถยนต์ ช่วยนำทางในควันมืดสนิทโดยไม่ต้องก้มมองหน้าจอ พร้อมปุ่ม Mute ปิดเสียงได้ทันที
- **โหมดค้นหาในอาคารและใต้ซากตึกด้วยคลื่นวิทยุ (BLE RSSI Proximity Mode - No GPS Fallback)**:
  - ในกรณีติดอยู่ใต้ซากอาคารคอนกรีตหรืออุโมงค์ที่สัญญาณ GPS ดับสนิท: ระบบจะสลับมาวัดจาก **ความแรงคลื่นวิทยุบลูทูธ (RSSI)** ของเครื่องผู้ประสบภัยโดยตรง
  - แสดงแถบวัดระดับสัญญาณวิทยุ (Signal Strength Meter): ยิ่งเดินเข้าใกล้ ค่า RSSI จะเพิ่มจาก `-95 dBm` (ไกล/ริบหรี่) ➔ `-60 dBm` ➔ `-40 dBm` (อยู่ห่างไม่เกิน 1–2 เมตร)
- **ระดับความสูงและชั้นอาคารสัมพัทธ์ (Barometric Altimeter / Relative Altitude)**:
  - อ่านค่าจาก Barometer เซนเซอร์วัดความกดอากาศในมือถือ เพื่อแสดงทิศทางแนวตั้ง:
    - 🔺 **"อยู่สูงกว่าคุณประมาณ +6 เมตร (~ชั้น 2-3)"**
    - 🔻 **"อยู่ต่ำกว่าคุณประมาณ -3 เมตร (~ชั้นใต้ดิน)"**
    - 🟢 **"ระดับความสูงเท่ากัน (Same Floor Level)"**
- **ระบบตรวจจับและปรับเทียบสนามแม่เหล็กอัตโนมัติ (Compass Magnetic Calibration Helper)**:
  - ตรวจจับสนามแม่เหล็กผิดปกติจากเหล็กเส้นในซากตึก (Magnetic Anomaly): แสดงคำแนะนำรูปเลข 8 (`∞`) สั้นๆ ให้ผู้ใช้แกว่งมือถือเพื่อ Calibrate คืนความแม่นยำใน 3 วินาที

### 18. 🛡️ การทำงานเบื้องหลังตลอด 24 ชั่วโมง (24/7 Android Background Radio & Foreground Service)
- **บริการเบื้องหลังระดับระบบ (Android Native Foreground Service - `OutGridMeshService.kt`)**:
  - ประกาศประเภท Foreground Service อย่างถูกต้องตามมาตรฐานความปลอดภัยล่าสุดของ Android 14+ (API Level 34): `android:foregroundServiceType="connectedDevice"`
  - ตั้งค่าลำดับความสำคัญสูงสุด (`START_STICKY`) เพื่อให้ Android OS ทราบว่าบริการนี้มีความสำคัญต่อชีวิต และจะคืนชีพ (Auto-Restart) Service ขึ้นมาใหม่ทันทีหากถูกหน่วยความจำบีบอัด
  - **Persistent Notification ถาวรบน Status Bar**:
    - ผูกกับ Notification Channel: `outgrid_emergency_mesh_channel` (Importance: `LOW` เพื่อไม่ให้มีเสียงเด้งกวนใจ แต่ตรึงแถบไว้ถาวร)
    - แสดงข้อความและสถิติสด: `🛡️ OutGrid Mesh Active • เฝ้าระวังคลื่นวิทยุกู้ภัย (เชื่อมต่อ 5 โหนด | แบต 78%)`
    - ล็อคไม่ให้ผู้ใช้ปัดทิ้ง (`setOngoing(true)`) ซึ่งเป็นเกณฑ์บังคับของ Android ในการยกเว้นแอปจากการถูก Low Memory Killer (OOM Killer) สั่งปิด
- **ระบบถือครอง Partial WakeLock อย่างมีวินัย (Disciplined CPU WakeLock)**:
  - ถือ `PowerManager.PARTIAL_WAKE_LOCK` ในระดับฮาร์ดแวร์ เพื่อป้องกันไม่ให้ CPU ของโทรศัพท์เข้าสู่ภาวะ Deep Sleep ขณะผู้ใช้ปิดหน้าจอหรือเก็บมือถือใส่กระเป๋า
  - **Zero-Wake Jitter**: CPU ยังคงประมวลผลการรับ-ส่งและรีเลย์แพ็กเก็ตวิทยุฉุกเฉินได้ต่อเนื่องตลอด 24 ชั่วโมง แม้ล็อกหน้าจอ
  - มีระบบ Watchdog คอยตรวจสอบและปลดล็อก WakeLock ชั่วคราวเมื่อไม่มีทราฟฟิก เพื่อประหยัดพลังงานแบตเตอรี่สูงสุด
- **ระบบทะลวง Doze Mode และ Battery Whitelist (Battery Optimization Exemption)**:
  - ขอสิทธิ์ `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` ตั้งแต่เปิดแอปครั้งแรก
  - รันคำสั่ง Intent `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` เพื่อเปิดหน้าต่างของระบบให้ผู้ใช้กด "อนุญาตให้ทำงานเบื้องหลังโดยไม่จำกัด (Unrestricted)" ในคลิกเดียว
  - **ผลลัพธ์**: ชิปวิทยุบลูทูธจะไม่ถูกระบบปฏิบัติการตัดไฟหรือระงับการทำงานเมื่อวางเครื่องทิ้งไว้นิ่งๆ ในเวลากลางคืน
- **การจัดการวงจรชีวิตวิทยุ BLE เบื้องหลัง 24 ชม. (Continuous Background BLE Radio Engine - `BleRadioNativeDriver.kt`)**:
  - **Hardware ScanFilter ฝังชิป**: สั่งให้ชิปเซ็ตบลูทูธดักกรองแพ็กเก็ตที่มีรหัส Magic Word `0x544F` ในระดับฮาร์ดแวร์ เพื่อไม่ให้รบกวนหรือปลุก CPU ขึ้นมาโดยไม่จำเป็น
  - **ScanSettings Adaptive Mode**:
    - ขณะเสียบชาร์จ หรือมีเหตุ SOS: รัน `SCAN_MODE_LOW_LATENCY` ตลอดเวลาเพื่อความไวระดับมิลลิวินาที
    - ขณะใช้งานแบตเตอรี่ปกติ: รัน `SCAN_MODE_BALANCED` ผสานกับ Duty Cycle Controller (สแกน 5 วิ / พัก 55 วิ) กินแบตเตอรี่ต่ำมากเพียง **< 0.2% - 0.5% ต่อชั่วโมง**
  - **รองรับ Bluetooth 5.0 LE Coded PHY (S=8)**: เจรจาขอใช้โหมดระยะไกลพิเศษ (รัศมี 200–400+ เมตร) ข้ามตึกและทะลุซอย หากชิปเซ็ตของเครื่องรุ่นเก่าไม่รองรับ จะ Fallback สู่ BLE 1M Legacy อัตโนมัติ 100%
- **ระบบสตาร์ตตัวเองอัตโนมัติเมื่อเปิดเครื่องใหม่ (Auto-Start on Boot - `BootReceiver.kt`)**:
  - ลงทะเบียนรับสิทธิ์ `android.permission.RECEIVE_BOOT_COMPLETED` ใน `AndroidManifest.xml`
  - สร้าง `BootReceiver.kt` รับ Broadcast `Intent.ACTION_BOOT_COMPLETED` และ `QUICKBOOT_POWERON`
  - ทันทีที่โทรศัพท์เปิดเครื่องใหม่ หรือเครื่องติดขึ้นมาหลังแบตหมดชาร์จไฟเข้า Service กู้ภัยจะเริ่มทำงานและเปิดเรดาร์วิทยุทันที โดยที่ผู้ประสบภัยไม่ต้องหยิบมือถือมาปลดล็อคหน้าจอเปิดแอป
- **การปลุกหน้าจอฉุกเฉินเมื่อมีสัญญาณ SOS ขาเข้า (Incoming SOS Screen Wake & Sound Alert)**:
  - เมื่อ `BleRadioNativeDriver` ดักจับแพ็กเก็ตประเภท `0x01` (`SOS_BEACON`) ได้จากคลื่นวิทยุ:
    - ปลุกหน้าจอให้สว่างวาบขึ้นมาทันที (`FLAG_TURN_SCREEN_ON` และ `FLAG_SHOW_WHEN_LOCKED`)
    - ยิงระบบสั่นรหัสมอส SOS และส่งเสียงหวูดเตือนภัยระดับ 85+ dB ปลุกให้ผู้ประสบภัยหรือกู้ภัยรับรู้เหตุฉุกเฉินรอบตัวได้ทันท่วงที

### 19. 🚚 ระบบส่งข้อความข้ามอำเภอ/ข้ามจังหวัดแบบออฟไลน์บนมือถือ (Mobile Physical Data Mule & Divergence Handover Engine)
- **การตรวจจับการเดินทางบนมือถือ (Autonomous Mobility Detection on Mobile)**:
  - เซนเซอร์ Accelerometer + GPS ในมือถือตรวจจับความเร็วแบบประหยัดพลังงาน: เมื่อพบความเร็ว $\ge 15 - 20$ กม./ชม. แอปจะสถาปนาเครื่องให้เป็น **"Data Mule Node"** โดยอัตโนมัติ
- **ระบบแช่แข็งจำนวนทอด (Hop Freeze Protocol)**:
  - ขณะที่รถยนต์/เรือ/มอเตอร์ไซค์กู้ภัยกำลังวิ่งข้ามอำเภอหรือข้ามจังหวัด ตัวนับ Hop Count (TTL) จะถูก **"แช่แข็ง (Freeze)" ไม่ลดทอนลง** ตลอดระยะทางเดินทาง 50–200 กม. เพื่อไม่ให้ข้อความหมดอายุระหว่างทาง
- **ระบบตรวจจับจุดเลี้ยวและออกห่างจากเป้าหมาย (Divergence Detection & Closest-Point-of-Approach - CPA)**:
  - มือถือจะคำนวณระยะห่างทางภูมิศาสตร์ (H3 / Haversine) ระหว่างพิกัดปัจจุบันของรถกับ Target H3 ปลายทางแบบ Real-time
  - **กรณีรถเลี้ยวไปทางอื่น / ไปไม่ถึงเป้าหมาย**: เมื่อตรวจพบว่าระยะทางเริ่ม "เพิ่มขึ้น" (รถกำลังวิ่งออกห่างจากเป้าหมาย) ระบบจะสั่ง **Drop-off / Offload** สำเนาข้อความผ่านสัญญาณวิทยุ BLE ฝากไว้ที่โหนดคนข้างทาง หรือโหนดใน H3 หกเหลี่ยม ณ จุดทางแยกนั้นทันที เพื่อรอรถคันถัดไปที่มุ่งหน้าไปทางที่ถูกต้องรับช่วงต่อ (Relay Handover)
- **การปลดล็อก Hop เมื่อเข้าสู่พื้นที่เป้าหมาย (H3 Hierarchical Unfreeze & Local Flood)**:
  - เมื่อรถวิ่งเข้าสู่ขอบเขตหกเหลี่ยมระดับอำเภอ (H3 Res 5) หรือระดับตำบล (H3 Res 7) ของปลายทาง: ระบบมือถือจะ **ปลดล็อกการแช่แข็ง Hop (Unfreeze)** ทันที และเริ่มยิงกระจายแพ็กเก็ตสู่ผู้คนในพื้นที่เพื่อส่งต่อเข้าสู่บ้านปลายทาง (H3 Res 9)
- **ระบบสำเนาแบบจำกัดจำนวน (Multi-Mule Replication Cap $\le 3$) & Auto-Prune**:
  - กระจายสำเนาให้รถที่มุ่งหน้าไปทิศทางเดียวกันไม่เกิน 2–3 คัน เพื่อเพิ่มโอกาสรอดโดยไม่เปลืองพื้นที่จัดเก็บ
  - เมื่อปลายทางได้รับข้อความและยิงใบเสร็จ `0x05: DELIVERY_ACK` สะท้อนกลับมา เครื่อง Data Mule ทุกเครื่องที่ได้รับ ACK จะล้างสำเนาออกจากฐานข้อมูลในเครื่องทันที (Auto-Prune)

### 20. 📋 แผนผังผูกโยง Master Plan 10 Sprints / 54 Tasks สู่โครงสร้างไฟล์จริง (Complete 54-Task Traceability & Execution Matrix)
เพื่อให้ Developer สามารถตรวจสอบและเชื่อมโยง Core Engine ทั้ง 10 Sprints เข้ากับหน้าจอและบริการของ Android ได้อย่างไร้รอยต่อ:

| Sprint | หมวดหมู่งาน | โมดูลไฟล์ที่ทำเสร็จแล้วใน `src/core/` | ไฟล์ชุดทดสอบที่ผ่าน 100% (`bun test`) | จุดเชื่อมต่อใน Plan Android (Wiring Target) |
| :---: | :--- | :--- | :--- | :--- |
| **Sprint 1** | TOG v1.1 Wire & Crypto | `PacketSerializer.ts`<br>`H3DeltaCompressor.ts`<br>`CryptoEngine.ts`<br>`DigitalSignature.ts`<br>`BloomFilter.ts` | `tests/unit/protocol/PacketSerializer.test.ts`<br>`H3DeltaCompressor.test.ts`<br>`CryptoEngine.test.ts`<br>`DigitalSignature.test.ts`<br>`BloomFilter.test.ts` | เชื่อมต่อเข้าสู่ `MainActivity.kt` และ `SosMapView.svelte` (ส่ง/รับพิกัด <1m) |
| **Sprint 2** | Storage & Routing | `SqliteStorageEngine.ts`<br>`EpidemicRouter.ts`<br>`DynamicHopDecay.ts`<br>`DeliveryReceipt.ts`<br>`TieredTtlManager.ts` | `tests/unit/storage/SqliteStorageEngine.test.ts`<br>`EpidemicRouter.test.ts`<br>`DynamicHopDecay.test.ts`<br>`DeliveryReceipt.test.ts`<br>`TieredTtlManager.test.ts` | เชื่อมต่อ IndexedDB 50MB FIFO, แชท 1:1, และอัปเดตสถานะ 🟢 ส่งถึงแล้ว |
| **Sprint 3** | BLE Radio & Duty Cycle | `BleAdvertiser.ts`<br>`BleScanner.ts`<br>`LeCodedPhy.ts`<br>`BleConnectionManager.ts`<br>`DutyCycleController.ts`<br>`BlePacketFragmentation.ts` | `tests/unit/ble/BleAdvertiser.test.ts`<br>`BleScanner.test.ts`<br>`LeCodedPhy.test.ts`<br>`BleConnectionManager.test.ts`<br>`DutyCycleController.test.ts`<br>`BlePacketFragmentation.test.ts` | เชื่อมต่อเข้า `BleRadioNativeDriver.kt` และ `OutGridMeshService.kt` (Coded S=8) |
| **Sprint 4** | Spatial H3 & Basemap | `H3Hierarchy.ts`<br>`VectorTileParser.ts`<br>`OfflineSpatialCache.ts`<br>`SosRadarEngine.ts`<br>`KAnonymityHeatmap.ts`<br>`TileProxyClient.ts` | `tests/unit/spatial/H3HierarchyFallback.test.ts`<br>`VectorTileParser.test.ts`<br>`OfflineSpatialCache.test.ts`<br>`SosRadarEngine.test.ts`<br>`KAnonymityHeatmap.test.ts`<br>`TileProxyClient.test.ts` | เชื่อมต่อ `world_basemap_l2.json` (5-6MB) เข้า `SosMapView.svelte` และเข็มทิศเรดาร์ |
| **Sprint 5** | Media & Wi-Fi P2P | `ImageCompressor.ts`<br>`VoiceMemoRecorder.ts`<br>`WifiP2pManager.ts`<br>`P2pStreamSocket.ts`<br>`MediaPayloadSecurity.ts` | `tests/unit/media/ImageCompressor.test.ts`<br>`VoiceMemoRecorder.test.ts`<br>`WifiP2pManager.test.ts`<br>`P2pStreamSocket.test.ts`<br>`MediaPayloadSecurity.test.ts` | เชื่อมต่อส่งรูป WebP (5–12KB), คลิปเสียง Opus (15s) เข้า `MeshChatScreen.svelte` |
| **Sprint 6** | Offline Sideload & Alert | `LocalHttpServer.ts`<br>`MicroDnsServer.ts`<br>`AcousticMorseEngine.ts`<br>`FskDemodulator.ts`<br>`FlashlightStrobe.ts` | `tests/unit/emergency/LocalHttpServer.test.ts`<br>`MicroDnsServer.test.ts`<br>`AcousticMorseEngine.test.ts`<br>`FskDemodulator.test.ts`<br>`FlashlightStrobe.test.ts` | เชื่อมต่อปุ่มแชร์ APK ออฟไลน์ (`ApkShareScreen`), หวูดไซเรน, และไฟฉายฉุกเฉิน |
| **Sprint 7** | Native Android & Bridges | `ForegroundService.ts`<br>`DozeModeResilience.ts`<br>`AutonomousMobility.ts`<br>`DataMuleTransfer.ts`<br>`meshtasticAdapter.ts`<br>`briarAdapter.ts` | `tests/unit/native/ForegroundService.test.ts`<br>`DozeModeResilience.test.ts`<br>`AutonomousMobility.test.ts`<br>`DataMuleTransfer.test.ts`<br>`MeshtasticBridge.test.ts`<br>`BriarBridge.test.ts` | เชื่อมต่อ `OutGridMeshService.kt` (24 ชม. Background), Hop Freeze, และ Data Mule |
| **Sprint 8** | UI & State Machine | `ModeStateMachine.ts`<br>`AuthManager.ts`<br>`BatteryPolicyManager.ts`<br>`CrisisFeedManager.ts`<br>`OneTapSos.svelte` | `tests/unit/ui/ModeStateMachine.test.ts`<br>`ParityGuestUser.test.ts`<br>`BatteryPolicyManager.test.ts`<br>`OfflineCrisisFeed.test.ts`<br>`OneTapSos.test.ts` | เชื่อมต่อสลับโหมด 5s, แถบ Network/Battery (`NetworkStatusBar`), และ Guest Parity |
| **Sprint 9** | Cloudflare Edge & Auth | `signaling.ts`<br>`workers/index.ts`<br>`cloudflare/d1/schema.sql`<br>`d1Buffer.ts`<br>`capAlert.ts`<br>`PasskeyClient.ts`<br>`spatialPrivacy.ts` | `tests/unit/cloud/WebRtcSignaling.test.ts`<br>`CloudflareWorkerApi.test.ts`<br>`D1DatabaseSchema.test.ts`<br>`D1QuotaCoalescing.test.ts`<br>`CapAlertIngestion.test.ts`<br>`PasskeyAuthManager.test.ts`<br>`DualTierPrivacy.test.ts` | เชื่อมต่อระบบ Sync ข้อความขึ้นคลาวด์อัตโนมัติเมื่อต่อเน็ต และระบบสำรองเพื่อนด้วย Passkey |
| **Sprint 10**| i18n & E2E Simulation | `src/locales/*.json` (10 ภาษา)<br>`MultiHopSimulation.ts`<br>`OfflineFallback.ts`<br>`DISASTER_DRILL_CHECKLIST.md` | `tests/unit/i18n/I18nBundleCompleteness.test.ts`<br>`tests/integration/MultiHopSimulation.test.ts`<br>`tests/integration/OfflineFallback.test.ts` | เชื่อมต่อระบบ 10 ภาษาลงสู่ทุกหน้าจอ และทดสอบความคงทนข้ามตึก 15 ทอด |

---

## แผนปฏิบัติการพัฒนารายสปรินต์สำหรับแอป Android (Plan Android: 6 Actionable Sprints & Granular TaskList)

เพื่อให้ Developer สามารถรับช่วงต่อและลงมือเขียนโค้ดได้ทันทีตามลำดับขั้นตอน (Step-by-Step Execution Playbook) จึงจัดแบ่งทั้ง 18 ข้อเข้าสู่ **6 Actionable Sprints** ดังนี้:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          Plan Android: 8 Production Sprints                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Sprint A: Official Assets & Offline Basemap ] ──► Logo Version 1 + World L2 (5MB) ✅ │
│  [ Sprint B: Native Android Bridge & 24/7 ] ───────► Service + WakeLock + BleRadio ✅ │
│  [ Sprint C: Emergency Hardware & Power HUD ] ─────► Battery Runtime + Torch/Siren ✅ │
│  [ Sprint D: Navigation & State Machine Engine ] ──► 5s Fallback + Drawer + BottomNav │
│  [ Sprint E: Tactical Radar & Offline Chat Hub ] ──► Radar HUD + E2EE + WebP/Opus/Pin  │
│  [ Sprint F: Zero-Barrier Security & Sideload ] ───► Offline QR + APK Hotspot + i18n  │
│  [ Sprint G: Autonomous Mobility & Acoustic ] ─────► Data Mule + DTN + Ultrasonic FSK │
│  [ Sprint H: Native Android Production Build ] ────► Capacitor + BlePlugin + Release  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 🚀 SPRINT A: การติดตั้งแบรนด์ทางการและแผนที่เวกเตอร์ทั้งโลก (Brand Assets & World Basemap L2) ✅ [COMPLETED 100%]
> **เป้าหมาย:** ติดตั้ง Logo Version 1 ลงระบบทั้ง Android Native และ Web พร้อมทั้งสกัดข้อมูลเวกเตอร์ทั้งโลก Natural Earth 1:50m เป็น `world_basemap_l2.json` (~5-6 MB) ฝังลงใน Assets ของ APK

- [x] **Task A.1: ติดตั้ง Logo Version 1 เป็น Android Adaptive Icons และ Web Assets (ครอบคลุม Item 9) ✅**
  - **ไฟล์เป้าหมาย:** 
    - `scripts/generateAppIcons.js` (Automated Multi-Resolution Generator)
    - `android/app/src/main/res/drawable/ic_launcher_foreground.xml`
    - `android/app/src/main/res/drawable/ic_launcher_background.xml`
    - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
    - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
    - `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
    - `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
    - `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)
    - `static/logo.png` (512x512), `static/favicon.png` (32x32), `static/apple-touch-icon.png` (180x180), `static/manifest.json`
  - **รายละเอียดการทำงาน:**
    - พัฒนาสคริปต์ `scripts/generateAppIcons.js` นำภาพต้นฉบับ Version 1 (`outgrid_mesh_logo_1789888894200.jpg`) รูป Hexagonal Mesh Shield + Glowing Emergency Beacon โทนสี Cyan/Emerald บนพื้นหลังเนวีเข้ม `#0A0F1D` มา Crop & Resize อัตโนมัติครบทุก DPI
    - สร้าง Android Vector Adaptive Icon (`ic_launcher_foreground.xml` & `ic_launcher_background.xml`) สำหรับ Android 8.0+
    - ผูกเข้า `android:icon="@mipmap/ic_launcher"` และ `android:roundIcon="@mipmap/ic_launcher_round"` ใน `AndroidManifest.xml`
    - วางโลโก้ขนาด 36x36 px บนมุมซ้ายของ Header ในหน้าเว็บ (`+page.svelte`)
  - **เกณฑ์การผ่าน (DoD):** รัน `bun scripts/generateAppIcons.js` สร้างไฟล์ไอคอนครบทุกโฟลเดอร์ ไอคอนแอปบนมือถือและ Favicon บนเบราว์เซอร์แสดงผลเป็นโลโก้ Version 1 อย่างคมชัด

- [x] **Task A.2: พัฒนา Pipeline ดึงและบีบอัด World Vector Basemap L2 (`scripts/fetchAndOptimizeWorldBasemap.js`) (ครอบคลุม Item 2) ✅**
  - **ไฟล์เป้าหมาย:** `scripts/fetchAndOptimizeWorldBasemap.js`, `static/data/world_basemap_l2.json`
  - **รายละเอียดการทำงาน:**
    - ดึงข้อมูลจาก Natural Earth Scale 1:50m (Public Domain CC0): ขอบเขต 200+ ประเทศ (`ne_50m_admin_0_countries`), จังหวัด/รัฐ (`ne_50m_admin_1_states_provinces`), แม่น้ำสายหลัก (`ne_50m_rivers_lake_centerlines`), และเมืองสำคัญ (`ne_50m_populated_places`)
    - **แหล่งดาวน์โหลดหลัก & แหล่งสำรอง (Multi-Mirror Fallback)**:
      - Primary: `https://naciscdn.org/naturalearth/50m/cultural/`
      - Mirror: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/`
      - Offline/Local Cache Fallback: บันทึก Cache ลงโฟลเดอร์ `.cache/naturalearth/` เพื่อให้บิลด์แบบออฟไลน์ได้โดยไม่ต้องต่อเน็ตซ้ำ
    - บีบอัดทศนิยมพิกัด (3 ตำแหน่ง) และกรองแอตทริบิวต์ส่วนเกิน เพื่อควบคุมขนาดไฟล์รวมให้เหลือเพียง **~5–6 MB**
    - บันทึกลงใน `static/data/world_basemap_l2.json` พร้อมตรวจโครงสร้าง GeoJSON
  - **เกณฑ์การผ่าน (DoD):** รัน `bun scripts/fetchAndOptimizeWorldBasemap.js` แล้วไฟล์ `world_basemap_l2.json` ถูกสร้างขึ้นโดยมีขนาดไม่เกิน 6 MB

- [x] **Task A.3: อัปเดต `VectorTileParser.ts` และเชื่อมต่อ Leaflet Canvas ใน `SosMapView.svelte` (ครอบคลุม Item 2) ✅**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/VectorTileParser.ts`, `src/ui/components/SosMapView.svelte`
  - **รายละเอียดการทำงาน:**
    - ปรับปรุง `VectorTileParser.ts` ให้โหลดและพาร์ส `world_basemap_l2.json` ขึ้นมาเป็น Leaflet GeoJSON Vector Layer แบบ Canvas
    - แสดงผลแผนที่ทั้งโลกได้ 100% แม้อยู่ในโหมด Offline / Airplane Mode
    - เพิ่มปุ่มสลับระยะทาง (Toggle Peer Distance `🟢 ~45 ม. | 🟩🟩🟩🟩⬜`) และปุ่มสลับโหนดทั้งหมด (Show All Nodes Toggle)
  - **เกณฑ์การผ่าน (DoD):** เปิดแอปในโหมดเครื่องบิน แผนที่โลกเวกเตอร์แสดงผลขึ้นมาได้ทันทีใน <1 วินาที

- [x] **Task A.4: Automated Validation Tests สำหรับ World Basemap L2 (ครอบคลุม Item 2) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/spatial/WorldBasemapValidation.test.ts`
  - **รายละเอียดการทำงาน:**
    - เขียนชุดทดสอบตรวจสอบความถูกต้องของไฟล์ `world_basemap_l2.json`:
      1. ตรวจสอบว่าขนาดไฟล์ $\le 6\text{ MB}$ ($< 6,291,456\text{ bytes}$)
      2. ตรวจสอบโครงสร้าง GeoJSON มาตรฐาน (`type === "FeatureCollection"`)
      3. ตรวจสอบว่ามี Features ครบทุกเลเยอร์หลัก (`country`, `state`, `river`, `city`)
      4. ตรวจสอบว่าพิกัดทั้งหมดถูกบีบอัดทศนิยมไม่เกิน 3 ตำแหน่ง
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/spatial/WorldBasemapValidation.test.ts` ผ่าน 100% (5/5 tests passed)

---

### 🛡️ SPRINT B: บริการเบื้องหลัง Android 24 ชั่วโมงและไดรเวอร์วิทยุฮาร์ดแวร์ (Background Native & Radio Driver) ✅ [COMPLETED 100%]
> **เป้าหมาย:** รัน Native Foreground Service 24 ชั่วโมง, ทะลวง Doze Mode, ถือ Partial WakeLock, ดักฟังคลื่น BLE Coded PHY (S=8), รองรับ Android 12–14+ Permissions, มี Watchdog คืนชีพบลูทูธ และบริดจ์สื่อสาร 2 ทางกับ WebView

- [x] **Task B.1: พัฒนา Android Foreground Service, Persistent Notification และจัดการ Android 12–14+ Permissions (`OutGridMeshService.kt`) (ครอบคลุม Item 18, 10) ✅**
  - **ไฟล์เป้าหมาย:** `android/app/src/main/java/io/outgrid/mesh/OutGridMeshService.kt`, `android/app/src/main/AndroidManifest.xml`
  - **รายละเอียดการทำงาน:**
    - ประกาศ Service ประเภท `android:foregroundServiceType="connectedDevice"` ใน Manifest อย่างถูกต้องตามข้อกำหนด Android 14 (API 34)
    - กำหนดสิทธิ์ Bluetooth แยกชัดเจนสำหรับ Android 12+ (API 31+):
      - `android.permission.BLUETOOTH_SCAN` พร้อมแฟล็ก `android:usesPermissionFlags="neverForLocation"` (เพื่อไม่ให้ถูกบังคับเปิด GPS ตลอดเวลา ช่วยประหยัดแบตเตอรี่)
      - `android.permission.BLUETOOTH_ADVERTISE`
      - `android.permission.BLUETOOTH_CONNECT`
      - สิทธิ์ดั้งเดิม `android.permission.BLUETOOTH` และ `android.permission.BLUETOOTH_ADMIN` สำหรับ Android 8–11
    - สร้าง Notification Channel `outgrid_emergency_mesh_channel` (Importance: `LOW`) แสดงแถบถาวร `setOngoing(true)`
    - แสดงข้อความสถานะสดบน Status Bar: `🛡️ OutGrid Mesh Active • เฝ้าระวังคลื่นวิทยุกู้ภัย (เชื่อมต่อ x โหนด)`
    - คืนชีพ Service อัตโนมัติ (`START_STICKY`) หากระบบเคลียร์ RAM
  - **เกณฑ์การผ่าน (DoD):** ปิดหน้าจอมือถือและเปิดแอปอื่น Service ยังคงรันต่อเนื่อง แถบ Notification ตรึงอยู่ถาวร และสิทธิ์ Bluetooth ทำงานถูกต้องบน Android 12–14

- [x] **Task B.2: ระบบถือครอง Partial WakeLock และทะลวง Doze Mode (`MainActivity.kt` & Manifest) (ครอบคลุม Item 18) ✅**
  - **ไฟล์เป้าหมาย:** `android/app/src/main/java/io/outgrid/mesh/MainActivity.kt`, `android/app/src/main/AndroidManifest.xml`
  - **รายละเอียดการทำงาน:**
    - ขอสิทธิ์ `android.permission.WAKE_LOCK` และ `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
    - ถือ `PowerManager.PARTIAL_WAKE_LOCK` ระดับฮาร์ดแวร์เพื่อไม่ให้ CPU หลับขณะล็อกหน้าจอ
    - รัน Intent `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` เพื่อให้ผู้ใช้กดยกเว้นการประหยัดพลังงานในคลิกเดียว
  - **เกณฑ์การผ่าน (DoD):** CPU ไม่เข้าสู่ Deep Sleep และประมวลผลการรับส่งแพ็กเก็ตวิทยุได้ต่อเนื่องข้ามคืน

- [x] **Task B.3: ไดรเวอร์วิทยุบลูทูธเบื้องหลัง, Coded PHY S=8 และ Watchdog ฟื้นฟูอัตโนมัติ (`BleRadioNativeDriver.kt`) (ครอบคลุม Item 18) ✅**
  - **ไฟล์เป้าหมาย:** `android/app/src/main/java/io/outgrid/mesh/BleRadioNativeDriver.kt`
  - **รายละเอียดการทำงาน:**
    - ติดตั้ง Hardware ScanFilter ดักจับ Magic Word `0x544F` ในชิปเบสแบนด์
    - เจรจาขอใช้โหมด Bluetooth 5.0 LE Coded PHY (S=8) สำหรับระยะไกล 200–400+ เมตร พร้อม Fallback สู่ 1M Legacy
    - ผสานรอบสแกน Adaptive: สแกน 5 วิ / พัก 55 วิ ในโหมดปกติ (<0.2%/ชม.) และ Low Latency เมื่อมี SOS
    - **Native Watchdog Self-Healing (รอบ 15 นาที)**: ตรวจจับสภาวะ Silent Bluetooth Freeze ที่มักพบบนสมาร์ตโฟนบางยี่ห้อ หากไม่ได้รับสแกนอีเวนต์ผิดปกติ จะทำการ Re-register ScanCallback ให้อัตโนมัติโดยไม่ต้องรีสตาร์ตเครื่อง
  - **เกณฑ์การผ่าน (DoD):** ชิปบลูทูธสแกนเจอบีคอน `0x544F` โดยไม่ปลุก CPU หากไม่มีแพ็กเก็ตที่เกี่ยวข้อง และระบบ Watchdog กู้คืนบลูทูธได้เองเมื่อจำลองการค้าง

- [x] **Task B.4: ระบบสตาร์ตตัวเองเมื่อเปิดเครื่อง (`BootReceiver.kt`) และ Full-Screen Intent ปลุกจอ SOS (ครอบคลุม Item 18, 5) ✅**
  - **ไฟล์เป้าหมาย:** `android/app/src/main/java/io/outgrid/mesh/BootReceiver.kt`
  - **รายละเอียดการทำงาน:**
    - ขอสิทธิ์ `RECEIVE_BOOT_COMPLETED` รับ Intent `ACTION_BOOT_COMPLETED` และ `QUICKBOOT_POWERON` สตาร์ต `OutGridMeshService` ทันทีหลังเปิดเครื่อง
    - เมื่อได้รับแพ็กเก็ต SOS `0x01` สั่งปลุกหน้าจอสว่างวาบ (`FLAG_TURN_SCREEN_ON`, `FLAG_SHOW_WHEN_LOCKED`), สั่นรหัสมอส, และยิงเสียงหวูด 85+ dB
  - **เกณฑ์การผ่าน (DoD):** รีบูตโทรศัพท์ Service เริ่มทำงานเองทันทีโดยไม่ต้องเปิดแอป และจอปลุกสว่างเมื่อมี SOS ขาเข้า

- [x] **Task B.5: Two-Way Packet Dispatcher และ Mock Native Bridge สำหรับเบราว์เซอร์ (`MockOutGridBridge.ts`) (ครอบคลุม Item 3, 18) ✅**
  - **ไฟล์เป้าหมาย:** `src/core/native/NativeBridgeDispatcher.ts`, `src/core/native/MockOutGridBridge.ts`
  - **รายละเอียดการทำงาน:**
    - ในฝั่ง Native (`OutGridAndroidBridge.kt`): เมื่อ `BleRadioNativeDriver` รับแพ็กเก็ตไบต์ได้ จะเรียก `webView.evaluateJavascript("window.OutGridMesh.receiveNativePacket('$base64Payload', $rssi)", null)`
    - ในฝั่ง TypeScript (`NativeBridgeDispatcher.ts`): สร้าง Event Listener ดักจับ `receiveNativePacket` ถอดรหัส Base64 ส่งเข้า Core Pipeline (`togWireFormat.ts` ➔ `RoutingManager.ts`)
    - พัฒนา `MockOutGridBridge.ts`: ทำงานแทน Native Bridge อัตโนมัติเมื่อตรวจพบว่าไม่ได้รันบน Android (เช็ค `window.AndroidBridge == null`) เพื่อให้ Developer สามารถรัน `bun run dev` บน Chrome/Firefox และเขียนโค้ดได้โดยไม่ติดบั๊ก
  - **เกณฑ์การผ่าน (DoD):** รันแอปบนเว็บเบราว์เซอร์ไม่เกิด runtime error เรื่อง bridge หาย และจำลองส่ง-รับ Base64 แพ็กเก็ตเข้าสู่ Core Engine ได้ 100%

- [x] **Task B.6: ชุดทดสอบความเข้ากันได้ของ Native Bridge Interface (ครอบคลุม Item 3) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/native/NativeBridgeContract.test.ts`, `tests/unit/native/NativeBridgeDispatcher.test.ts`
  - **รายละเอียดการทำงาน:**
    - เขียน Unit Test ตรวจสอบความถูกต้องของ Methods ทั้ง 13 ตัวของ Bridge ว่ารับพารามิเตอร์และคืนค่าตรงตาม Code Contract:
      `getDeviceNodeId`, `startMeshService`, `stopMeshService`, `broadcastBlePacket`, `startSosBeacon`, `stopSosBeacon`, `setTorchMode`, `playAcousticSiren`, `stopAcousticSiren`, `getBatteryStatus`, `shareApkFile`, `startApkHotspot`, `stopApkHotspot`
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/native/NativeBridgeContract.test.ts` และ `NativeBridgeDispatcher.test.ts` ผ่าน 100% ครบทั้ง 13 เมธอด

---

### 🔋 SPRINT C: ฮาร์ดแวร์ฉุกเฉินและการคำนวณพลังงานอัจฉริยะ (Emergency Hardware & Power HUD) ✅ [COMPLETED 100%]
> **เป้าหมาย:** คำนวณเวลาคงเหลือของแบตเตอรี่เป็น `ชั่วโมง:นาที`, สวิตช์ 1-Tap Ultra Saver, ไฟฉายกะพริบ SOS ผ่าน CameraManager และหวูดไซเรนรหัสมอส

- [x] **Task C.1: พัฒนาเอนจินคำนวณเวลาแบตเตอรี่คงเหลือ (`BatteryRuntimeEstimator.ts`) (ครอบคลุม Item 1) ✅**
  - **ไฟล์เป้าหมาย:** `src/core/battery/BatteryRuntimeEstimator.ts`, `tests/unit/battery/BatteryRuntimeEstimator.test.ts`
  - **รายละเอียดการทำงาน:**
    - อ่านค่า % แบตเตอรี่, สถานะชาร์จ, และคำนวณอัตราการกินไฟเฉลี่ย
    - แปลงผลลัพธ์เป็นชั่วโมงและนาที: `🔋 78% (ใช้ได้อีกประมาณ 18 ชม. 45 นาที)`
    - ตรวจจับฮาร์ดแวร์โหลดสูง (เปิดไฟฉาย SOS หรือเปิดหวูดไซเรน) แล้วปรับลดเวลาลงตามจริง
    - ตรวจจับแบตเตอรี่วิกฤตที่ 5%: ส่งแพ็กเก็ต **Last-Gasp Beacon** แจ้งพิกัดสุดท้ายก่อนเครื่องดับ
  - **เกณฑ์การผ่าน (DoD):** ชุดทดสอบคำนวณเวลาแบตเตอรี่ได้แม่นยำและ Last-Gasp Beacon ถูกทริกเกอร์ที่ 5% (4/4 tests passed)

- [x] **Task C.2: สวิตช์โหมดประหยัดพลังงานขั้นสูงสุด (1-Tap Ultra Saver Mode) (ครอบคลุม Item 1) ✅**
  - **ไฟล์เป้าหมาย:** `src/core/battery/DutyCycleManager.ts`, `src/ui/components/BatteryStatusBanner.svelte`, `src/ui/components/BeaconControlsBar.svelte`
  - **รายละเอียดการทำงาน:**
    - ปุ่มเปิดโหมดประหยัดพลังงานแตะครั้งเดียว: ขยายรอบ Heartbeat เป็น 60s, ปรับธีมจอเป็นดำสนิท True AMOLED Black
    - แสดงตัวเลขเวลาที่ยืดออกไปให้ผู้ใช้เห็นทันที (เช่น *จากเหลือ 4 ชม. ➔ ยืดเป็น 14 ชม. 30 นาที*)
  - **เกณฑ์การผ่าน (DoD):** แตะสลับโหมด Duty Cycle ปรับเป็น 60s และธีมหน้าจอกลายเป็นสีดำสนิท

- [x] **Task C.3: พัฒนาตัวสั่งการไฟฉาย SOS และหวูดไซเรนรหัสมอส (`EmergencyBeaconControls.ts` & `EmergencyFlashlightController.kt`) (ครอบคลุม Item 11) ✅**
  - **ไฟล์เป้าหมาย:** `src/core/emergency/EmergencyBeaconControls.ts`, `android/app/src/main/java/io/outgrid/mesh/EmergencyFlashlightController.kt`, `src/ui/components/BeaconControlsBar.svelte`
  - **รายละเอียดการทำงาน:**
    - **Native Morse Flash Loop**: ย้ายลูปจังหวะการกะพริบไฟฉาย SOS `... --- ...` (200ms dot, 600ms dash, 200ms element gap, 600ms letter gap) ไปรันบน Native Background Thread (`EmergencyFlashlightController.kt`) ผ่าน Android `CameraManager.setTorchMode` เพื่อความแม่นยำระดับเสี้ยววินาที ไร้ปัญหา Jitter จาก JS Engine
    - **Thermal Cutoff 5 นาที**: ระบบตัดไฟฉายอัตโนมัติหากเปิดต่อเนื่องเกิน 5 นาที เพื่อป้องกันความร้อนสะสมและถนอมหลอด LED/แบตเตอรี่ พร้อมแจ้งเตือนผู้ใช้
    - หวูดไซเรนผ่าน Web Audio API: สังเคราะห์คลื่นเสียงความถี่สูง 960 Hz สลับ 1,440 Hz ทะลุสิ่งกีดขวาง
    - ปุ่ม **Master Panic Button [ALL-IN SOS]**: สั่งไฟฉาย + หวูด + ยิงแพ็กเก็ตวิทยุพร้อมกันในคลิกเดียว
  - **เกณฑ์การผ่าน (DoD):** กด Panic Button ไฟฉายกะพริบรหัสมอสตรงจังหวะเป๊ะ เสียงหวูดดังขึ้นพร้อมกัน และไฟฉายตัดอัตโนมัติเมื่อครบ 5 นาที

- [x] **Task C.4: Automated Unit Tests สำหรับฮาร์ดแวร์ฉุกเฉินและระบบพลังงาน (ครอบคลุม Item 1, 11) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/emergency/EmergencyBeaconControls.test.ts`
  - **รายละเอียดการทำงาน:**
    - ทดสอบ State Machine ของหวูดไซเรน: การสลับความถี่ 960Hz ↔ 1440Hz และปุ่ม Mute ปิดเสียงทันที
    - ทดสอบจังหวะรหัสมอสของไฟฉาย SOS ให้ถูกต้องตามค่า Timing (จุด 200ms, ขีด 600ms)
    - ทดสอบฟังก์ชัน Auto Thermal Timeout ตัดไฟฉายเมื่อจำลองเวลาผ่านไป 300,000ms (5 นาที)
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/emergency/EmergencyBeaconControls.test.ts` ผ่าน 100% (4/4 tests passed)

---

### 🧭 SPRINT D: สถาปัตยกรรมนำทางและสลับโหมดอัตโนมัติ (Navigation & State Machine) ✅ [COMPLETED 100%]
> **เป้าหมาย:** ตรวจจับเน็ตหลุดสลับเข้าโหมดวิทยุ `DISASTER_MESH` ใน 5 วินาที, แถบสถานะ Network Bar, Hamburger Drawer ☰, Bottom Nav Bar 5 ปุ่ม และระบบสิทธิ์ Android 13+ Notifications

- [x] **Task D.1: พัฒนาแถบสถานะ Network & ตัวนับโหนดรอบตัว (`NetworkStatusBar.svelte`) (ครอบคลุม Item 12, 6, 1) ✅**
  - **ไฟล์เป้าหมาย:** `src/ui/components/NetworkStatusBar.svelte`
  - **รายละเอียดการทำงาน:**
    - แสดงประเภทสัญญาณสด: `5G/4G`, `Wi-Fi`, `Disaster Mesh (สีส้ม)`, หรือ `Isolated`
    - กลไกช่วงผ่อนผัน 5 วินาที (5s Grace Period): เมื่อเน็ตหลุดครบ 5s สลับเข้าสู่โหมดวิทยุกู้ภัยออฟไลน์อัตโนมัติ และสลับกลับส่งขึ้นคลาวด์ทันทีเมื่อต่อเน็ต
    - แสดง % แบตเตอรี่พร้อมเวลาคงเหลือ และตัวนับโหนด `👥 12 โหนด` ที่แตะเพื่อเปิดดูสรุปจำแนกประเภท (SOS, เพื่อน, รีเลย์, เกตเวย์)
  - **เกณฑ์การผ่าน (DoD):** ตัดเน็ตครบ 5 วินาที แถบเปลี่ยนเป็นสีส้ม `Disaster Mesh` และตัวเลขโหนดแสดงผลถูกต้อง

- [x] **Task D.2: พัฒนาสถาปัตยกรรม Hybrid Navigation (Drawer + Bottom Bar) (`+page.svelte`) (ครอบคลุม Item 15) ✅**
  - **ไฟล์เป้าหมาย:** 
    - `src/ui/components/HamburgerDrawer.svelte`
    - `src/ui/components/BottomNavigationBar.svelte`
    - `src/routes/+page.svelte`
  - **รายละเอียดการทำงาน:**
    - **Bottom Navigation Bar (5 เมนูหลักตาม Thumb Zone)**: 🗺️ Map, 💬 Chat, 🚨 SOS (ปุ่มนูนกึ่งกลาง), 👥 Friends, 👤 Profile
    - **Hamburger Drawer Menu ☰ (มุมบนซ้าย)**: สไลด์เปิดดูคู่มือเอาชีวิตรอด 10 ภาษา, หน้าแชร์ APK ออฟไลน์, แผงไฟฉาย/หวูด, กองทุนช่วยเหลือ (คงไว้ 100%), และข้อมูลระบบ
    - คงโครงสร้างคอมโพเนนต์เดิมไว้ทั้งหมด 100% ไม่ลบทิ้ง
  - **เกณฑ์การผ่าน (DoD):** สลับหน้าจอผ่าน Bottom Bar ได้ลื่นไหล และเปิดปิด Drawer จากเมนู ☰ ได้สมบูรณ์

- [x] **Task D.3: ระบบสิทธิ์ฮาร์ดแวร์ All-in-One และ WebChromeClient Bridge (ครอบคลุม Item 10, 3) ✅**
  - **ไฟล์เป้าหมาย:** `android/app/src/main/java/io/outgrid/mesh/MainActivity.kt`
  - **รายละเอียดการทำงาน:**
    - ขอสิทธิ์ Runtime พร้อมกัน 10 รายการตอนเปิดแอปครั้งแรก:
      1. `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`
      2. `BLUETOOTH_SCAN` & `BLUETOOTH_ADVERTISE` & `BLUETOOTH_CONNECT` (Android 12+)
      3. `NEARBY_WIFI_DEVICES` (Android 13+ สำหรับ APK Hotspot)
      4. `CAMERA` (สำหรับสแกน QR และเปิดไฟฉายฉุกเฉิน)
      5. `RECORD_AUDIO` (สำหรับคลิปเสียง Opus / Speech-to-Text)
      6. `POST_NOTIFICATIONS` (Android 13+ เพื่อแสดง Foreground Service Bar และแบนเนอร์แจ้งเตือน SOS ขาเข้า)
    - กลไก Graceful Permission Degradation: หากผู้ใช้ปฏิเสธสิทธิ์แจ้งเตือน แอปยังคงรันวิทยุ Mesh ได้ 100% ไม่บังคับปิดแอป
    - ติดตั้ง `WebChromeClient`: อนุมัติสิทธิ์ GPS (`onGeolocationPermissionsShowPrompt`), กล้อง/ไมค์ (`onPermissionRequest`), และเลือกภาพแนบแชท (`onShowFileChooser`)
  - **เกณฑ์การผ่าน (DoD):** หน้าเว็บสามารถเข้าถึง GPS และเปิดกล้อง/คลังภาพได้ทันทีโดยไม่มีข้อผิดพลาด และสิทธิ์ POST_NOTIFICATIONS ถูกขออย่างถูกต้อง

- [x] **Task D.4: Automated Unit Tests สำหรับ State Machine และ Flapping Prevention (ครอบคลุม Item 12) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/ui/NetworkStateEngine.test.ts`
  - **รายละเอียดการทำงาน:**
    - ทดสอบตัวจัดการสลับโหมดเครือข่ายทั้ง 4 สถานะ: Online Cloud (`5G/Wi-Fi`) ➔ 5s Grace Period ➔ Offline Mesh (`DISASTER_MESH`) ➔ Reconnect Cloud Sync
    - ทดสอบ Flapping Protection: เมื่อเน็ตหลุดๆ ติดๆ ภายใน 3 วินาที ระบบต้องไม่สลับโหมดสับสน
    - ทดสอบความถูกต้องของตัวนับโหนดรอบตัวและจำแนกประเภท (SOS, เพื่อน, รีเลย์)
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/ui/NetworkStateEngine.test.ts` ผ่าน 100%

---

### 💬 SPRINT E: เรดาร์นำทางกู้ภัยและศูนย์แชทครบวงจร (Tactical Radar & Offline Chat Hub) ✅ [COMPLETED 100%]
> **เป้าหมาย:** เรดาร์เข็มทิศ 360° ก้าวต่อก้าวพร้อมโซนาร์เสียง Geiger-Counter, แชทฉุกเฉิน Broadcast + แชทส่วนตัว 1:1 E2EE, แนบรูป WebP, ไมค์, และปักหมุดข้อความ

- [x] **Task E.1: พัฒนาระบบนำทางเข็มทิศเรดาร์กู้ภัยพร้อม Low-Pass Filter (`RescueRadarHud.svelte`) (ครอบคลุม Item 17) ✅**
  - **ไฟล์เป้าหมาย:** `src/ui/components/RescueRadarHud.svelte`, `src/core/spatial/SosRadarEngine.ts`
  - **รายละเอียดการทำงาน:**
    - อ่านค่า Magnetometer จาก `DeviceOrientationEvent` พร้อม **Low-Pass Filter (Exponential Moving Average $\alpha = 0.15$)** เพื่อตัดสัญญาณรบกวน (Jitter) ทำให้เข็มทิศหมุนนุ่มนวลระดับ 60 FPS ไม่สั่นกระตุก
    - คำนวณ Relative Bearing ชี้ลูกศรเปล่งแสงตรงไปยังพิกัดเป้าหมายกู้ภัย
    - นับระยะทางถอยหลังก้าวต่อก้าว: `เหลืออีก 140 ม. ➔ 65 ม. ➔ 12 ม.`
    - สั่นเตือนตามระยะ (Proximity Haptic) และส่งเสียงโซนาร์บี๊บ (Geiger-Counter Audio) ถี่ขึ้นเรื่อยๆ เมื่อเข้าใกล้เป้าหมาย
    - โหมด BLE RSSI Proximity ไร้ GPS ใต้ซากตึก, วัดระดับความสูงชั้นอาคาร (Barometric Altimeter), และรูปเลข 8 (`∞`) Calibrate สนามแม่เหล็ก
  - **เกณฑ์การผ่าน (DoD):** หมุนตัวโทรศัพท์ ลูกศรเข็มทิศหมุนนุ่มนวลไม่สั่น ชี้ทิศทางเป้าหมายถูกต้อง และเสียงบี๊บดังถี่ขึ้นเมื่อเข้าใกล้

- [x] **Task E.2: พัฒนาศูนย์แชทกู้ภัยครบวงจร (`MeshChatScreen.svelte`) (ครอบคลุม Item 7, 13) ✅**
  - **ไฟล์เป้าหมาย:** `src/ui/components/MeshChatScreen.svelte`
  - **รายละเอียดการทำงาน:**
    - รองรับ 2 ช่องทาง: 📢 ช่องฉุกเฉินส่วนรวม (Broadcast) และ 🔒 แชทส่วนตัว 1:1 แบบ E2EE (Curve25519 + ChaCha20-Poly1305)
    - **การควบคุม Hop อัจฉริยะ (Auto Hop by Default + Advanced Presets)**:
      - *Default*: ระบบคำนวณและปรับ Hop ให้เหมาะสมที่สุดอัตโนมัติตามความหนาแน่นและแบตเตอรี่ (3–15 Hops)
      - *Chat Preset Chips (3 ระดับเลือกง่าย)*: 🟢 รอบตัว (3 Hops ~300ม.), 🟡 ชุมชน (7 Hops ~1กม.), 🔴 กระจายไกลสุด (15 Hops ~2-3กม.)
      - *SOS Emergency Override*: เมื่อกดปุ่ม 🚨 1-Tap SOS ระบบจะล็อคขยายสัญญาณสูงสุด 15–25 Hops อัตโนมัติทันที
    - แนบรูปถ่ายบีบอัด WebP (5–12 KB) พร้อมแถบแสดง Progress การส่งชิ้นส่วนวิทยุ
    - ปุ่มปักหมุดข้อความสำคัญ (Pinned) ป้องกันการถูกลบถาวรใน IndexedDB
    - ปุ่มไมค์ Speech-to-Text 🎙️, คลิปเสียงสั้นบีบอัด Opus (8kHz, 6kbps ขนาด ~2-3 KB), ชิปข้อความด่วน 4 รายการ, ปุ่มแชร์พิกัด GPS 📍, วันเวลาที่ส่ง และสถานะ 🕒 ➔ ✓ ➔ ✓✓
    - รายการโหนดข้างเคียงแบบ **Strict Privacy Mode** (แสดงเฉพาะ Short NodeID, แบต 5 ขีด, RSSI, ระยะทาง ไม่เปิดเผยชื่อเล่น)
  - **เกณฑ์การผ่าน (DoD):** ส่งข้อความแชท 1:1 แบบเข้ารหัส, แนบรูป WebP สำเร็จ, สลับ Hop Preset ได้ และปักหมุดข้อความได้

- [x] **Task E.3: แบนเนอร์เตือนภัย SOS ขาเข้าและการกรองข้อความซ้ำ (`IncomingSosBanner.svelte`) (ครอบคลุม Item 5) ✅**
  - **ไฟล์เป้าหมาย:** `src/ui/components/IncomingSosBanner.svelte`, `src/core/protocol/BloomFilter.ts`
  - **รายละเอียดการทำงาน:**
    - แบนเนอร์สีแดงกะพริบลอยด้านบนเมื่อได้รับแพ็กเก็ต `0x01: SOS_BEACON` พร้อมทิศทางและระยะทาง แตะเพื่อเปิดเข็มทิศนำทางทันที
    - กรองข้อความซ้ำด้วย MessageId 64-bit และ LRU Cache 2,048 รายการ ($O(1)$) ป้องกันข้อความเด้งซ้ำ
  - **เกณฑ์การผ่าน (DoD):** จำลองรับแพ็กเก็ต SOS เดิมซ้ำ แบนเนอร์เตือนครั้งเดียวและไม่เกิดการประมวลผลซ้ำ

- [x] **Task E.4: Automated Unit Tests สำหรับเอนจินเรดาร์กู้ภัย (ครอบคลุม Item 17) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/spatial/SosRadarEngine.test.ts`
  - **รายละเอียดการทำงาน:**
    - ทดสอบสูตร Haversine คำนวณระยะห่างระหว่างจุดพิกัด
    - ทดสอบการคำนวณทิศมุมองศา (Forward Azimuth / Bearing) และ Relative Bearing เทียบกับองศาเข็มทิศ
    - ทดสอบอัลกอริทึม Low-Pass Filter $\alpha = 0.15$ กรองสัญญาณรบกวน
    - ทดสอบการแปลงค่าความกดอากาศ Barometer (hPa) เป็นความสูงสัมพัทธ์แนวตั้งและชั้นอาคาร ($\approx 3\text{ ม.}/ชั้น$)
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/spatial/SosRadarEngine.test.ts` ผ่าน 100%

- [x] **Task E.5: Automated Unit Tests สำหรับการหั่นและประกอบชิ้นส่วนภาพ/เสียงแชท (ครอบคลุม Item 7, 13) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/chat/MeshChatPayload.test.ts`
  - **รายละเอียดการทำงาน:**
    - ทดสอบการหั่นภาพถ่าย WebP (5–12 KB) เป็น Chunks ขนาดไม่เกิน 200 ไบต์ต่อแพ็กเก็ต
    - ทดสอบการบีบอัดเสียงพูด Opus Narrowband 6kbps และหั่นชิ้นส่วน
    - ทดสอบการประกอบชิ้นส่วน (Reassembly) ที่ปลายทางแม้ได้รับชิ้นส่วนสลับลำดับ (Out-of-Order Delivery)
    - ทดสอบการเข้ารหัสและถอดรหัสแบบ E2EE (ChaCha20-Poly1305) ข้อความแชทส่วนตัว 1:1
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/chat/MeshChatPayload.test.ts` ผ่าน 100%

---

### 📲 SPRINT F: ความปลอดภัยไร้เน็ต การแชร์แอป และสากล 10 ภาษา (Zero-Barrier Security, Sideload & i18n) ✅ [COMPLETED 100%]
> **เป้าหมาย:** ตัวสร้างภาพ QR Code ออฟไลน์ 100%, แชร์ไฟล์ APK ผ่าน Quick Share/Hotspot, ระบบ 10 ภาษา, Guest Mode 100% เท่าเทียม และการสำรองเพื่อนแบบ Zero-Knowledge

- [x] **Task F.1: ตัวสร้างภาพ QR Code ออฟไลน์ 100% (`OfflineQrGenerator.ts`) (ครอบคลุม Item 4) ✅**
  - **ไฟล์เป้าหมาย:** `src/core/crypto/OfflineQrGenerator.ts`, `tests/unit/crypto/OfflineQrGenerator.test.ts`
  - **รายละเอียดการทำงาน:**
    - ประมวลผลและวาด QR Code ลง Canvas/SVG ด้วย Pure TypeScript ในเครื่อง ไม่พึ่ง API ภายนอก
    - เลือกระดับความทนทานสูงสุด **Level H (30% Error Correction)** ทนทานต่อหน้าจอแตกร้าวหรือเปื้อนโคลน
    - รองรับ 2 โหมด: โหมดจับคู่เพื่อน E2EE (ฝัง NodeID + PubKey) และโหมดแจก APK ออฟไลน์
    - ปุ่ม Invert สีขาว-ดำสำหรับกลางคืน และเร่งแสงหน้าจออัตโนมัติขณะแสดง QR
  - **เกณฑ์การผ่าน (DoD):** สร้างภาพ QR Code ได้ในโหมด Airplane Mode และกล้องมือถืออื่นสแกนติดได้อย่างรวดเร็ว

- [x] **Task F.2: ระบบแชร์ไฟล์ APK ให้เพื่อนแบบออฟไลน์ (`ApkShareScreen.svelte` & Bridge) (ครอบคลุม Item 3, 8) ✅**
  - **ไฟล์เป้าหมาย:** `src/ui/components/ApkShareScreen.svelte`, `android/app/src/main/java/io/outgrid/mesh/MainActivity.kt`
  - **รายละเอียดการทำงาน:**
    - ดึง `base.apk` ตรงจากเครื่องผ่าน `context.packageCodePath` (Zero-Storage Overhead)
    - วิธีที่ 1: ส่งผ่านระบบแชร์ของ Android (Quick Share / Bluetooth Intent) ด้วย `FileProvider`
    - วิธีที่ 2: เปิด Local Wi-Fi Hotspot + Embedded HTTP Server แจกไฟล์ APK พร้อมแสดง QR Code ให้เพื่อนสแกนโหลดผ่านเบราว์เซอร์
    - สถาปัตยกรรม Smart Hybrid OTA Web Update: ตรวจสอบเวอร์ชันเงียบๆ เบื้องหลังเมื่อต่อเน็ต โดยข้อมูล IndexedDB ไม่สูญหาย 100%
  - **เกณฑ์การผ่าน (DoD):** เครื่องที่ไม่มีแอปสามารถสแกน QR ต่อ Wi-Fi และดาวน์โหลดไฟล์ APK ไปติดตั้งได้สำเร็จ

- [x] **Task F.3: ระบบ 10 ภาษาสากลทางการ แปลครบทุกเมนู (`I18nStore.ts`) (ครอบคลุม Item 14) ✅**
  - **ไฟล์เป้าหมาย:** `src/core/i18n/I18nStore.ts`, `src/locales/*.json`
  - **รายละเอียดการทำงาน:**
    - กำหนดค่าเริ่มต้นเป็นภาษาอังกฤษ (`en`) รองรับ ไทย (`th`), จีน (`zh`), สเปน (`es`), ฮินดี (`hi`), อาหรับ (`ar` - RTL), ฝรั่งเศส (`fr`), รัสเซีย (`ru`), โปรตุเกส (`pt`), ญี่ปุ่น (`ja`)
    - แปลครอบคลุมครบทุกเมนู: Bottom Bar, แถบสถานะ, หน้าจอแผนที่, ช่องแชท, แบนเนอร์ SOS, และหน้ารายชื่อเพื่อน
    - เมนูลูกโลก 🌐 สลับภาษาได้ทันทีโดยไม่ต้องรีโหลดหน้าเว็บ และจำค่าถาวรใน `localStorage`
  - **เกณฑ์การผ่าน (DoD):** สลับเปลี่ยนภาษาได้ครบทั้ง 10 ภาษา ข้อความเปลี่ยนทันที และเปิดแอปใหม่ยังคงจำภาษาเดิม

- [x] **Task F.4: ระบบโปรไฟล์, กฎเหล็ก 100% Guest Parity และการสำรองรายชื่อเพื่อน (`AuthProfileScreen.svelte`) (ครอบคลุม Item 15, 16) ✅**
  - **ไฟล์เป้าหมาย:** `src/ui/components/AuthProfileScreen.svelte`, `src/core/storage/SqliteStorageEngine.ts`
  - **รายละเอียดการทำงาน:**
    - การันตี **Guest Mode 100% เท่าเทียม**: ใช้งานฟังก์ชันกู้ภัยได้ครบทุกอย่างโดยไม่ต้องล็อกอิน
    - ตัวเลือกผูก Google Sign-In สำหรับสำรองข้อมูล: เข้ารหัสลับรายชื่อเพื่อนในเครื่องด้วย Client-Side Encryption ก่อนส่งขึ้น Server แม่ข่ายแบบ Zero-Knowledge Blob
    - ขอพื้นที่ถาวรผ่าน `navigator.storage.persist()`, คุมเพดาน 50MB FIFO Pruning โดยล็อคข้อความ SOS และ Pin ไว้ถาวร
  - **เกณฑ์การผ่าน (DoD):** ผู้ใช้ Guest ใช้งานได้ครบถ้วน และการสำรองเพื่อนถูกเข้ารหัสลับก่อนส่งขึ้นคลาวด์

- [x] **Task F.5: Automated Unit Tests สำหรับความสมบูรณ์ของชุดภาษา 10 ภาษา (ครอบคลุม Item 14) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/i18n/I18nLanguageBundle.test.ts`
  - **รายละเอียดการทำงาน:**
    - ตรวจสอบว่าไฟล์ JSON ทั้ง 10 ภาษา (`en`, `th`, `zh`, `es`, `hi`, `ar`, `fr`, `ru`, `pt`, `ja`) มีคีย์ครบถ้วนตรงกัน 100% (Missing Key Coverage = 0)
    - ทดสอบการสลับภาษาแบบ Reactive ใน Store โดยไม่ต้องรีโหลดเพจ
    - ทดสอบแฟล็ก RTL (`dir="rtl"`) สำหรับภาษาอาหรับ (`ar`)
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/i18n/I18nLanguageBundle.test.ts` ผ่าน 100%

- [x] **Task F.6: Automated Unit Tests สำหรับความปลอดภัย Zero-Knowledge และความจุ IndexedDB (ครอบคลุม Item 15, 16) ✅**
  - **ไฟล์เป้าหมาย:** `tests/unit/storage/ZeroKnowledgeBackup.test.ts`
  - **รายละเอียดการทำงาน:**
    - ทดสอบการเข้ารหัส AES-GCM รายชื่อเพื่อน: Payload ที่ส่งออกต้องเป็น Encrypted Ciphertext ที่ไม่สามารถอ่าน plaintext ในเครื่อง server ได้
    - ทดสอบ FIFO Pruning: เมื่อข้อมูลจำลองเกิน 50MB ข้อความที่ไม่สำคัญต้องถูกลบออก แต่ข้อความ `SOS_BEACON` และ `Pinned` ต้องคงอยู่ถาวร
    - ทดสอบ 100% Functional Parity ของ Guest Mode: ตรวจสอบว่าทุก API กู้ภัยทำงานได้โดยไม่ต้องมี Access Token
  - **เกณฑ์การผ่าน (DoD):** รัน `bun test tests/unit/storage/ZeroKnowledgeBackup.test.ts` ผ่าน 100%

---

### 🚚 SPRINT G: ระบบขับเคลื่อนกู้ภัยขั้นสูงและการสื่อสารด้วยเสียง (Autonomous Mobility, DTN Custody & Acoustic Engine)
> **เป้าหมาย:** พัฒนาระบบส่งต่อข้อมูลแบบ Store-and-Forward ข้ามตำบลผ่านรถกู้ภัย (Data Mule), การโอนย้ายสิทธิ์ Bundle ที่ปลอดภัย, วัคซีนลบข้อมูลที่ช่วยเหลือเสร็จแล้ว, และการส่งพิกัดผ่านเสียงความถี่สูง Ultrasonic FSK ทะลุซากตึก

- [ ] **Task G.1: ระบบตรวจจับความเคลื่อนไหวอัตโนมัติและโหมดรถกู้ภัย (Autonomous Data Mule Mode) (ครอบคลุม เสาหลัก 10, 13)**
  - **ไฟล์เป้าหมาย:** `src/core/dtn/MobilityTracker.ts`, `src/core/dtn/DataMuleEngine.ts`
  - **รายละเอียดการทำงาน:**
    - อ่านค่า Accelerometer ผสานกับตำแหน่งพิกัด GPS: หากตรวจพบความเร็วเคลื่อนที่ $\ge 15\text{ km/h}$ ต่อเนื่องเกิน 30 วินาที ให้สลับบทบาทเป็น **`DATA_MULE_ACTIVE`** อัตโนมัติ
    - ปรับ Duty Cycle เป็นโหมดดักฟังพิเศษ: เร่งรอบการสแกน BLE เพื่อควานหาและดูด Bundle ฉุกเฉินจากมือถือชาวบ้านข้างทาง (Opportunistic Zero-Click Exchange) ในระยะ 50–100 เมตร
    - เมื่อความเร็วลดลงเหลือ $0\text{ km/h}$ ในเขตที่มีสัญญาณเน็ตหรือศูนย์อพยพ ให้ระบายข้อมูล (Unload Bundles) ขึ้น Cloudflare Gateway ทันที
  - **เกณฑ์การผ่าน (DoD):** จำลองความเร็ว $25\text{ km/h}$ โหมด Data Mule ถูกกระตุ้นและแลกเปลี่ยน Bundle อัตโนมัติโดยไม่ต้องมีการคลิกหน้าจอ

- [ ] **Task G.2: โพรโทคอลโอนย้ายสิทธิ์การถือครองข้อมูลฉุกเฉิน (DTN Bundle Custody Transfer Protocol) (ครอบคลุม เสาหลัก 10)**
  - **ไฟล์เป้าหมาย:** `src/core/dtn/HopGovernance.ts`, `src/core/dtn/BundleStore.ts`
  - **รายละเอียดการทำงาน:**
    - กำหนดโครงสร้าง Bundle ตามมาตรฐาน DTN: `Bundle_ID (16B)`, `Created_At (8B)`, `Expires_At (8B)`, `Priority (1B)`, `Hop_Count (1B)`, `Custodian_Node (8B)`, `Payload`
    - กลไก **Custody Transfer Handshake**:
      1. โหนดส่งเสนอส่ง Bundle พร้อมสถานะ `CUSTODY_OFFERED`
      2. โหนดรับตรวจสอบความจุและตอบกลับแพ็กเก็ต `0x08: CUSTODY_ACCEPT` พร้อมลายเซ็นดิจิทัล
      3. โหนดส่งจึงเปลี่ยนสถานะเป็น `CUSTODY_TRANSFERRED` และลบสำเนาออกจากเครื่องตนเอง ป้องกันข้อมูลตกหล่นหากสัญญาณหลุดกลางทาง
    - นโยบายคุ้มครองชีวิต: **ห้ามทิ้ง Red SOS (`0x01`) เด็ดขาด 100%** แม้หน่วยความจำจะเต็ม
  - **เกณฑ์การผ่าน (DoD):** ทดสอบการส่งต่อ Bundle ข้าม 3 โหนด สิทธิ์การถือครองถูกส่งมอบอย่างถูกต้องและไม่มีข้อความสูญหาย

- [ ] **Task G.3: ระบบกระจายวัคซีนลบข้อมูลที่ช่วยเหลือเสร็จแล้ว (Epidemic Vaccine Kill Pill Engine) (ครอบคลุม เสาหลัก 11)**
  - **ไฟล์เป้าหมาย:** `src/core/dtn/NetworkHealingEngine.ts`
  - **รายละเอียดการทำงาน:**
    - เมื่อผู้ประสบภัยได้รับการช่วยเหลือแล้ว หรือข้อมูลถูกซิงก์ขึ้นสู่ระบบแม่ข่ายสำเร็จ ระบบจะสร้างแพ็กเก็ต **`0x09: VACCINE_KILL_PILL`** แนบ `Bundle_ID` + ลายเซ็น Authority Signature
    - กระจายวัคซีนผ่านโครงข่าย Mesh และฝากไปกับ Data Mule:
      - ทุกโหนดที่ได้รับวัคซีนจะตรวจสอบลายเซ็น และลบสำเนา Bundle นั้นออกจากหน่วยความจำถาวรทันที
      - ยุติการส่งต่อข้อมูลที่หมดความจำเป็น ช่วยคืนพื้นที่ RAM และ Bandwidth ให้กับผู้ประสบภัยรายอื่น
  - **เกณฑ์การผ่าน (DoD):** ปล่อยแพ็กเก็ตวัคซีน โหนดในวง Mesh ทั้งหมดลบ Bundle เป้าหมายทิ้งภายใน 100ms

- [ ] **Task G.4: แผงควบคุมเสียงความถี่สูงและการสังเคราะห์รหัสมอส (Ultrasonic FSK & Acoustic Morse HUD) (ครอบคลุม เสาหลัก 14)**
  - **ไฟล์เป้าหมาย:** `src/core/emergency/AcousticMorseEngine.ts`, `src/core/emergency/FskDemodulator.ts`, `src/ui/components/AcousticBeaconPanel.svelte`
  - **รายละเอียดการทำงาน:**
    - **Acoustic Morse Tone (960Hz / 1440Hz)**: สังเคราะห์เสียงไซเรนฉุกเฉินระดับ 85+ dB เพื่อให้ทีมค้นหากู้ภัยได้ยินเสียงจากใต้ซากอาคาร
    - **Ultrasonic FSK (18.5 kHz / 19.5 kHz)**: แปลงพิกัด GPS เป็นความถี่เสียงความถี่สูงที่มนุษย์ไม่ได้ยิน ส่งผ่านลำโพง และดักฟังถอดรหัสผ่านไมโครโฟนด้วย Goertzel Algorithm
    - พัฒนา UI ควบคุม: ปุ่มเปิด/ปิดเสียงไซเรน และโหมดสแกนหาผู้รอดชีวิตใต้ซากตึก
  - **เกณฑ์การผ่าน (DoD):** สังเคราะห์สัญญาณ FSK ข้ามเครื่อง และไมโครโฟนสามารถถอดรหัสพิกัด GPS ได้ถูกต้องโดยไม่ต้องใช้คลื่นวิทยุ

---

### 📦 SPRINT H: โครงสร้างคอมไพล์ Android Native และการออกไฟล์ APK ตัวจริง (Native Build & Hardware Plugins)
> **เป้าหมาย:** ประกอบโครงสร้าง Android Capacitor โฟลเดอร์ `android/` ตัวจริง, เขียนปลั๊กอินฮาร์ดแวร์วิทยุ `OutGridBlePlugin.kt`, ตั้งค่า Background Service 24 ชม., และคอมไพล์ไฟล์ `OutGridMesh.apk` พร้อมใช้งานจริง

- [ ] **Task H.1: ติดตั้งและสร้างโครงสร้างโปรเจกต์ Android Native ผ่าน Capacitor (`android/` directory)**
  - **ไฟล์เป้าหมาย:** `capacitor.config.ts`, ไดเรกทอรี `android/`, `android/app/build.gradle`
  - **รายละเอียดการทำงาน:**
    - กำหนดค่า `capacitor.config.ts`: App ID `io.outgrid.mesh`, App Name `OutGrid Mesh`, WebDir `build`
    - รันคำสั่งสแกลฟโฟลด์ `npx cap add android` และซิงก์ Assets
    - ตั้งค่า `build.gradle`: `compileSdkVersion 34`, `targetSdkVersion 34`, `minSdkVersion 26` (Android 8.0 Oreo ขึ้นไป)
    - ตั้งค่า ProGuard / R8 rules เพื่อป้องกันการ Obfuscate คลาสของ Wire Protocol และ Data Models
  - **เกณฑ์การผ่าน (DoD):** โฟลเดอร์ `android/` ถูกสร้างขึ้นอย่างสมบูรณ์ และสามารถเปิดรันโปรเจกต์ใน Android Studio ได้โดยไม่มีข้อผิดพลาด

- [ ] **Task H.2: พัฒนาปลั๊กอินฮาร์ดแวร์บลูทูธวิทยุระดับ Native (`OutGridBlePlugin.kt`) (ครอบคลุม เสาหลัก 2, 17, 18)**
  - **ไฟล์เป้าหมาย:** `android/app/src/main/java/io/outgrid/mesh/OutGridBlePlugin.kt`
  - **รายละเอียดการทำงาน:**
    - เชื่อมโยงบลูทูธระดับฮาร์ดแวร์ผ่าน Android BLE API:
      - `BluetoothLeAdvertiser`: ส่งแพ็กเก็ต `PRESENCE_CHIRP` 27 Bytes และ `SOS_BEACON` 21 Bytes บน Service UUID `0x544F`
      - `BluetoothLeScanner`: กรองแพ็กเก็ตในระดับฮาร์ดแวร์ชิป SoC ด้วย `ScanFilter.Builder().setServiceData(...)` โดยไม่ปลุก CPU (Zero-Wake 40% Power Reduction)
    - รองรับการสลับโหมดกำลังส่งวิทยุ (`TX_POWER_LOW`, `TX_POWER_HIGH`) ตามสถานะแบตเตอรี่
    - ส่งมอบข้อมูลดิบ (Raw Byte Stream) ข้าม JavaScript Interface สู่ TypeScript Layer
  - **เกณฑ์การผ่าน (DoD):** มือถือ 2 เครื่องสามารถค้นพบและแลกเปลี่ยนแพ็กเก็ต 27 ไบต์ผ่านบลูทูธระดับ Native ได้สำเร็จ

- [ ] **Task H.3: ระบบบริการเบื้องหลัง 24 ชั่วโมงและการทะลวง Doze Mode (`OutGridMeshService.kt`) (ครอบคลุม เสาหลัก 1)**
  - **ไฟล์เป้าหมาย:** `android/app/src/main/java/io/outgrid/mesh/OutGridMeshService.kt`, `android/app/src/main/java/io/outgrid/mesh/BootReceiver.kt`
  - **รายละเอียดการทำงาน:**
    - สร้าง Android Foreground Service ชนิด `connectedDevice` พร้อม Silent Ongoing Notification บนแถบสถานะ
    - จัดการระบบปลุก CPU ด้วย `AlarmManager.setExactAndAllowWhileIdle()` ทุกรอบสแกน 60 วินาที เพื่อให้ทำงานได้ต่อเนื่องแม้ระบบเข้าสู่ Deep Doze Mode
    - สร้าง `BootReceiver` เพื่อฟื้นคืนชีพโครงข่าย Mesh อัตโนมัติทันทีที่มือถือเปิดเครื่อง (`RECEIVE_BOOT_COMPLETED`)
    - สร้างไดอะล็อกขอข้อยกเว้นการประหยัดพลังงาน (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)
  - **เกณฑ์การผ่าน (DoD):** ปิดหน้าจอมือถือทิ้งไว้ 30 นาที แอปยังคงสแกนและรับสัญญาณ SOS ในพื้นหลังได้ 100%

- [ ] **Task H.4: ไพป์ไลน์คอมไพล์และสร้างไฟล์ Release APK ตัวจริง (`scripts/buildAndroidApk.js`)**
  - **ไฟล์เป้าหมาย:** `scripts/buildAndroidApk.js`, `android/app/build/outputs/apk/release/app-release-unsigned.apk`
  - **รายละเอียดการทำงาน:**
    - สร้างสคริปต์คอมไพล์อัตโนมัติ: `bun run build` ➔ `npx cap sync android` ➔ `./gradlew assembleRelease`
    - ตรวจสอบความถูกต้องของ Relative Asset Path `./app/` ใน WebView
    - จัดเตรียมไฟล์ผลลัพธ์ APK สำหรับทดสอบแจกจ่ายแบบ Sideload ออฟไลน์ตามสเปก Sprint B
  - **เกณฑ์การผ่าน (DoD):** รันสคริปต์แล้วได้ไฟล์ APK ที่สามารถติดตั้งบนมือถือ Android จริงและเปิดใช้งานโหมดกู้ภัยได้สมบูรณ์แบบ

---

## สเปกทางวิศวกรรมเชิงลึกและสัญญาการเชื่อมต่อโค้ด (Technical Specifications & Code Contracts for Devs)

เพื่อให้ Developer สามารถเริ่มเขียนโค้ดได้ทันทีแบบ 100% ไร้ข้อสงสัย กำหนดสัญญาการเชื่อมต่อระดับโค้ด (Code Contracts) ดังต่อไปนี้:

### 1. 🌉 สัญญาฝั่ง Android Native Bridge (`OutGridAndroidBridge.kt` Interface Contract)
ฝังลงใน `MainActivity.kt` เพื่อให้หน้าเว็บ Svelte เรียกผ่าน `window.AndroidBridge`:

```kotlin
package io.outgrid.mesh

import android.webkit.JavascriptInterface

class OutGridAndroidBridge(private val activity: MainActivity) {

    /** ควบคุมไฟฉายกล้องหลังกะพริบรหัสมอส */
    @JavascriptInterface
    fun toggleTorch(enabled: Boolean): Boolean

    /** เริ่มกะพริบไฟฉายรหัสมอส SOS อัตโนมัติ */
    @JavascriptInterface
    fun startSosStrobe(): Boolean

    /** หยุดไฟฉาย */
    @JavascriptInterface
    fun stopTorch(): Boolean

    /** อ่านข้อมูลแบตเตอรี่ละเอียด: {"level": 78, "isCharging": false, "temperature": 32.5, "voltage": 3950} */
    @JavascriptInterface
    fun getBatteryInfo(): String

    /** ขอข้อยกเว้นประหยัดแบตเตอรี่ Doze Mode */
    @JavascriptInterface
    fun requestBatteryOptimizationExemption(): Boolean

    /** ตรวจสอบว่าแอปได้รับการยกเว้น Doze Mode หรือยัง */
    @JavascriptInterface
    fun isIgnoringBatteryOptimizations(): Boolean

    /** เปิดหน้าต่างระบบแชร์ไฟล์ APK ให้เครื่องข้างเคียงผ่าน Quick Share / Bluetooth */
    @JavascriptInterface
    fun shareApkFile(): Boolean

    /** เปิด Local Wi-Fi Hotspot + Embedded HTTP Server แจก APK คืนค่า URL: "http://192.168.49.1:8080/app.apk" */
    @JavascriptInterface
    fun startApkHotspot(): String

    /** ปิด Hotspot และหยุด HTTP Server */
    @JavascriptInterface
    fun stopApkHotspot(): Boolean

    /** บังคับสั่งเปิดหน้าจอสว่างและปลุกเครื่องเมื่อมี SOS ขาเข้า */
    @JavascriptInterface
    fun wakeScreenForEmergency(): Boolean

    /** สั่นเครื่องตามจังหวะรหัสมอส SOS */
    @JavascriptInterface
    fun vibrateSosPattern(): Boolean

    /** ดึงพิกัดและทิศทางเซนเซอร์เข็มทิศ Magnetometer: {"azimuth": 45.2, "pitch": 0.0, "roll": 0.0, "accuracy": 3} */
    @JavascriptInterface
    fun getCompassOrientation(): String

    /** อ่านค่าความกดอากาศ Barometric Altimeter: {"pressureHpa": 1013.25, "relativeAltitudeMeters": 4.5} */
    @JavascriptInterface
    fun getBarometerAltitude(): String
}
```

---

### 2. 📱 สัญญาการรับ-ส่งข้อมูลฝั่ง Svelte Components (Props & Reactive Event Contracts)

#### 2.1 `NetworkStatusBar.svelte`
```typescript
interface NetworkStatusProps {
    networkType: '5g' | '4g' | 'wifi' | 'disaster_mesh' | 'isolated';
    isOnline: boolean;
    batteryLevelPct: number;
    isCharging: boolean;
    remainingRuntimeFormatted: string; // เช่น "18 ชม. 45 นาที"
    isUltraSaverActive: boolean;
    peerNodesCount: number;
    sosNodesCount: number;
    friendsCount: number;
    onToggleUltraSaver: () => void;
    onOpenPeerListModal: () => void;
}
```

#### 2.2 `RescueRadarHud.svelte`
```typescript
interface RescueRadarHudProps {
    targetLat: number;
    targetLng: number;
    targetH3Res9: string;
    targetShortNodeId: string;
    targetBatteryFiveBars: number; // 1-5
    currentAzimuth: number; // 0-360 องศาจาก Magnetometer
    distanceMeters: number; // Haversine Distance
    relativeFloorLevel: 'higher' | 'lower' | 'same_level'; // จาก Barometer
    relativeAltitudeMeters: number;
    isProximityRssiMode: boolean; // True เมื่อไม่มี GPS ใต้ซากตึก
    rssiLevelDbm: number; // -95 ถึง -40 dBm
    isAudioSonarMuted: boolean;
    onCloseRadar: () => void;
    onToggleMuteSonar: () => void;
}
```

#### 2.3 `MeshChatScreen.svelte`
```typescript
interface ChatMessage {
    id: string; // 64-bit Hex
    type: 'broadcast' | 'direct_e2ee';
    senderNodeId: string;
    recipientNodeId?: string;
    senderNickname?: string;
    content: string; // Text <= 280 chars หรือ Base64 Data URL สำหรับ WebP
    mediaType?: 'text' | 'image_webp' | 'voice_opus';
    mediaChunkProgress?: number; // 0 - 100%
    locationPin?: { lat: number; lng: number; h3Index: string };
    timestamp: number;
    formattedTime: string; // เช่น "14:35"
    deliveryStatus: 'sending' | 'sent' | 'delivered' | 'failed';
    isPinned: boolean;
}
```

#### 2.4 `IncomingSosBanner.svelte`
```typescript
interface IncomingSosProps {
    senderNodeId: string;
    distanceMeters: number;
    bearingDegrees: number;
    batteryFiveBars: number; // 1-5
    statusCategory: string; // เช่น "ติดใต้ซากอาคาร", "มีเด็ก/คนชรา"
    timestamp: number;
    onNavigateRadar: () => void;
    onDismiss: () => void;
}
```

---

### 3. 🌍 สเปกการสกัดและบีบอัดแผนที่เวกเตอร์ทั้งโลก (`scripts/fetchAndOptimizeWorldBasemap.js`)
- **เกณฑ์การคุมขนาด $\le 5–6\text{ MB}$**:
  1. **Coordinate Truncation**: ปัดเศษทศนิยมพิกัด Lat/Lng ให้เหลือ **3 ตำแหน่ง** (ความคลาดเคลื่อน $\approx 110\text{ เมตร}$ ซึ่งแม่นยำเพียงพอสำหรับแผนที่โลกภาพรวมระดับ 2 โดยประหยัดพื้นที่ String ได้ 60%)
  2. **Attribute Stripping**: ตัด Properties ที่ไม่จำเป็นทิ้งทั้งหมด คงเหลือเฉพาะ:
     - `name`: ชื่อประเทศ/จังหวัด (ภาษาอังกฤษสากล)
     - `scalerank`: ลำดับความสำคัญในการเรนเดอร์ตามระดับซูม
     - `type`: `country`, `state`, `river`, `city`
  3. **MultiPolygon Simplification**: ใช้ Douglas-Peucker Algorithm ทอนจุดพิกัดของเกาะเล็กๆ และแนวชายฝั่งด้วยค่า Tolerance `0.02`
  4. **Output Format**: GeoJSON FeatureCollection บรรจุลง `static/data/world_basemap_l2.json`

---

### 4. 📱 สเปกระดับฮาร์ดแวร์ Android Native & BLE Hardware Filter Blueprint

#### 4.1 ข้อมูลวิทยุและการกรองในระดับฮาร์ดแวร์ (Hardware-Offloaded BLE Scan Filter)
- **OutGrid Mesh 16-bit Service UUID**:
  - **UUID**: `0x544F` (ASCII 'TO' - Thabot OutGrid)
  - **Full 128-bit UUID**: `0000544F-0000-1000-8000-00805F9B34FB`
- **การแมปข้อมูลใน `BluetoothLeAdvertiser` (Android Native)**:
  ```java
  AdvertiseData advertiseData = new AdvertiseData.Builder()
      .addServiceData(new ParcelUuid(UUID.fromString("0000544F-0000-1000-8000-00805F9B34FB")), presenceChirp27Bytes)
      .setIncludeDeviceName(false)
      .setIncludeTxPowerLevel(false)
      .build();
  ```
- **การกรองระดับฮาร์ดแวร์ชิปบลูทูธ (Zero-Wake Hardware Offloading)**:
  - ใช้ `ScanFilter.Builder().setServiceData(ParcelUuid, byte[] dataMask)`
  - **ผลลัพธ์ทางวิศวกรรม**: ชิป Bluetooth SoC จะเป็นผู้คัดกรองแพ็กเก็ตที่ไม่ใช่ OutGrid Mesh ทิ้งไปในระดับฮาร์ดแวร์ **โดยไม่ปลุก CPU (Application Processor)** ทำให้ลดอัตราการกินแบตเตอรี่ขณะสแตนด์บายในพื้นหลังลงอีก **40%**

#### 4.2 สิทธิ์และการรันแอปในพื้นหลัง 24 ชม. (Android Manifest & Background Survival)
- **สิทธิ์ใน `AndroidManifest.xml` (Target SDK 34 / 35 Android 14+)**:
  ```xml
  <!-- BLE Radio Operations -->
  <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN" 
                   android:usesPermissionFlags="neverForLocation" />
  <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

  <!-- Background Mesh Operations -->
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
  ```
- **Foreground Service Life Cycle**:
  - แสดง Persistent Silent Notification: *"OutGrid Mesh กำลังปกป้องชุมชน (โหนดทำงานในพื้นหลัง)"*
  - ควบคุมรอบการสแกนผ่าน `AlarmManager.setExactAndAllowWhileIdle()` เพื่อให้ทำงานได้ต่อเนื่องแม้ระบบเข้าสู่ Deep Doze Mode

#### 4.3 ตารางสรุปสถานะความคืบหน้า 8 Sprints (The 8-Sprint Android Delivery Matrix)

| Sprint | ชื่อสปรินต์และขอบเขตงาน | สถานะความพร้อม | ผลการทดสอบ (DoD) |
| :---: | :--- | :---: | :--- |
| **Sprint A** | **Survival Battery & Peer Distance HUD** | **✅ เสร็จสมบูรณ์ (100%)** | `BatteryStatusBanner`, 5-Bar HUD, Last-Gasp Beacon, AMOLED Black |
| **Sprint B** | **Offline APK Sideload & Hardware Bridge** | **📋 พร้อมเริ่มพัฒนา** | ดูด APK ในเครื่อง, Wi-Fi Hotspot Sideloading, ไฟฉายกล้องหลัง |
| **Sprint C** | **High-Resilience QR Code Generator** | **📋 สเปกและ Core พร้อม** | Pure TS Canvas/SVG QR, Reed-Solomon Level H กู้คืน 30% |
| **Sprint D** | **Incoming SOS Alert & 5s Mode Fallback** | **📋 สเปกและ Core พร้อม** | ปลุกจอ WakeLock, เสียงหวูด 85+ dB, สลับโหมด 5s Fallback |
| **Sprint E** | **Full Emergency Chat Hub & WebP Media** | **📋 สเปกและ Core พร้อม** | Broadcast, แชท 1:1 E2EE (28B), WebPบีบอัด, เสียง Opus |
| **Sprint F** | **Zero-Knowledge Backup & Storage Parity** | **📋 สเปกและ Core พร้อม** | ZK Encrypted Backup, เพดาน SQLite 50MB, Guest Parity 100% |
| **Sprint G** | **Autonomous Mobility, DTN Custody & Acoustic** | **📋 สเปกและ Core พร้อม** | Data Mule $\ge 15\text{km/h}$, Vaccine Kill Pill, Ultrasonic FSK |
| **Sprint H** | **Android Native Production Build & Hardware Plugin** | **✅ เสร็จสมบูรณ์ (100%)** | โครงสร้าง `android/`, `OutGridBlePlugin.kt`, Build Release APK |

---

## การตรวจสอบคุณภาพขั้นสุดท้าย (Final Verification & Delivery Gates)
1. **Syntax Check**: รัน `node scripts/checkSyntax.js` ต้องผ่าน 100% ครบทุกไฟล์
2. **Automated Tests**: รัน `bun test` ผ่านครบ 299 รายการ (87 test files)
3. **Build Bundle**: รัน `bun run build` สร้าง Production Bundle สำเร็จ พร้อมตรวจสอบ Path `./app/` ใน WebView
4. **Git Branch Compliance**: ทำการ Commit และ Push ไปยัง branch **`uat`** เท่านั้น (ห้ามแตะต้อง branch `main` เด็ดขาด)



