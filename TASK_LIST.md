# แผนปฏิบัติการพัฒนาระบบรายสปรินต์ (Actionable Task List Breakdown by Sprint)
### OutGrid Mesh: Autonomous Disaster-Resilient Spatial Mesh Network
> **ข้อมูลลิขสิทธิ์และสิทธิ์ทางปัญญา (Copyright & Intellectual Property):**  
> - **ชื่อโครงการ:** **OutGrid Mesh**  
> - **ผู้คิดค้นและสถาปนิกหลัก (Creator & Lead Architect):** **Thabot** (<thabo47@gmail.com>)  
> - **โพรโทคอล:** **Thabot OutGrid Protocol (TOG v1.1)**  
> - **สัญญาอนุญาต (License):** **GNU Affero General Public License v3.0 (AGPL-3.0) + Commercial Rights Reserved to Thabot**  
> - **สาขา Git ปฏิบัติการ:** `uat` (ห้าม Push สู่ `main` จนกว่าจะผ่านการทดสอบ 100%)

---

## 🧭 โครงสร้างภาพรวมของสปรินต์ (Sprint Overview)

| สปรินต์ (Sprint) | โฟกัสหลัก (Core Focus) | หมวดหมู่ Phase | จำนวน Tasks |
| :---: | :--- | :---: | :---: |
| **Sprint 1** | โพรโทคอลระดับบิต, ความปลอดภัย และการเข้ารหัส (Protocol & Crypto) | Phase 1 | 5 Tasks |
| **Sprint 2** | ฐานข้อมูลเครื่อง, กฎการลดทอน Hop และการจัดเส้นทาง (Storage & Routing) | Phase 2 | 5 Tasks |
| **Sprint 3** | ไดรเวอร์วิทยุ BLE Long Range (S=8) และนโยบายประหยัดแบตเตอรี่ | Phase 4 | 6 Tasks |
| **Sprint 4** | แผนที่เวกเตอร์โลกออฟไลน์ (<5MB) และเรดาร์พิกัด H3 (Spatial & Map) | Phase 5 | 6 Tasks |
| **Sprint 5** | เอนจินส่งภาพ WebP, เสียง Opus และ Wi-Fi Direct P2P (Media & P2P) | Phase 6 | 5 Tasks |
| **Sprint 6** | ตัวติดตั้งแอปออฟไลน์ผ่าน Wi-Fi QR และสัญญาณชีพฉุกเฉิน (Sideload & Physical) | Phase 8 | 5 Tasks |
| **Sprint 7** | Android Foreground Service, กันหลับ Doze และสะพาน LoRa (Native & Bridge)| Phase 7 | 6 Tasks |
| **Sprint 8** | หน้าจอผู้ใช้หลัก SOS, 1-on-1 Chat, Heatmap & Guest Parity (UI Engine) | Phase 3 | 5 Tasks |
| **Sprint 9** | Cloudflare Workers, D1 DB, STUN Signaling & CAP Alert (Cloudless Edge) | Phase 9 | 7 Tasks |
| **Sprint 10** | รองรับ 10 ภาษา, ซิมูเลชัน 15-Hop Relay และการซ้อมภาคสนาม (Drills & QA) | Phase 10 | 4 Tasks |
| **รวมทั้งสิ้น** | **10 Sprints ครอบคลุมระบบอย่างสมบูรณ์** | **10 Phases** | **54 Tasks** |

---

## 📦 SPRINT 1: โพรโทคอลระดับบิตและความปลอดภัย (Phase 1: Protocol & Crypto Engine)
> **เป้าหมาย:** สร้างรากฐานการแปลงข้อมูลเป็นไบต์ตามมาตรฐาน TOG v1.1, การคำนวณ H3 Delta Offset <1m, การเข้ารหัส E2EE AES-256-GCM สองชั้น และลายเซ็น Ed25519

- [x] **Task 1.1: พัฒนาเอนจินเข้ารหัส/ถอดรหัสแพ็กเก็ต TOG v1.1 Wire Format**
  - **ไฟล์เป้าหมาย:** `src/core/protocol/PacketSerializer.ts`, `src/core/protocol/TOGPacket.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/protocol/PacketSerializer.test.ts`
  - **รายละเอียดการทำงาน:**
    - แปลง Header 4 ไบต์: Magic `0x544F`, Version (3b), Type (5b), TTL/Hop (8b), Priority (4b), Flags (3b), Reserved (3b)
    - รองรับ Packet Types: `0x01: SOS_BEACON`, `0x02: DIRECT_CHAT`, `0x04: CRISIS_FEED`, `0x05: DELIVERY_ACK`, `0x06: DELIVERY_NACK`, `0x07: PRESENCE_CHIRP`
    - ตรวจสอบขนาด SOS Beacon ดั้งเดิมต้อง $\le 21$ ไบต์
  - **คำสั่งทดสอบ:** `bun test tests/unit/protocol/PacketSerializer.test.ts`

- [x] **Task 1.2: พัฒนาระบบบีบอัดพิกัด GPS แม่นยำสูง H3 Delta Compressor (<1 เมตร)**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/H3DeltaCompressor.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/protocol/H3DeltaCompressor.test.ts`
  - **รายละเอียดการทำงาน:**
    - ฟังก์ชันแปลงพิกัดจริง (Lat, Lng) เข้าสู่ Uber H3 Index (Res 9) + Delta X/Y (int16 4 Bytes, ระยะกระจัด -1500m ถึง +1500m)
    - ฟังก์ชันถอดรหัส Delta Offset กลับเป็นพิกัด GPS ละติจูด/ลองจิจูด ความคลาดเคลื่อนต้องน้อยกว่า 1 เมตร
  - **คำสั่งทดสอบ:** `bun test tests/unit/protocol/H3DeltaCompressor.test.ts`

- [x] **Task 1.3: พัฒนาระบบเข้ารหัสลับสองชั้นแบบ End-to-End Encryption (E2EE Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/crypto/CryptoEngine.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/protocol/CryptoEngine.test.ts`
  - **รายละเอียดการทำงาน:**
    - แลกเปลี่ยนกุญแจลับด้วย X25519 ECDH (Ephemeral + Static Key Exchange)
    - เข้ารหัส/ถอดรหัสข้อความด้วย AES-256-GCM พร้อม Authentication Tag
    - ควบคุม Security Overhead เพิ่มเติมไม่เกิน 28 ไบต์ (IV 12B + Tag 16B)
  - **คำสั่งทดสอบ:** `bun test tests/unit/protocol/CryptoEngine.test.ts`

- [x] **Task 1.4: พัฒนาระบบลายเซ็นดิจิทัลและสกัดกั้นการปลอมแปลง (Ed25519 Sign/Verify Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/crypto/DigitalSignature.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/protocol/DigitalSignature.test.ts`
  - **รายละเอียดการทำงาน:**
    - เซ็นกำกับแพ็กเก็ต SOS และ Crisis Feed ด้วย `@noble/ed25519`
    - ตรวจสอบความถูกต้องของ Signature ป้องกันการส่งสปอยล์หรือข่าวปลอมเข้าสู่วง Mesh
  - **คำสั่งทดสอบ:** `bun test tests/unit/protocol/DigitalSignature.test.ts`

- [x] **Task 1.5: พัฒนาตัวกรองข้อความซ้ำ Counting Bloom Filter และ LRU Cache**
  - **ไฟล์เป้าหมาย:** `src/core/protocol/BloomFilter.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/protocol/BloomFilter.test.ts`
  - **รายละเอียดการทำงาน:**
    - สร้าง Counting Bloom Filter รองรับ 10,000 ข้อความ อัตราชนกัน (False Positive Rate) $< 0.1\%$
    - มีระบบหมุนเวียนลบรายการเก่า (Eviction/Decay) บน RAM เพื่อรองรับการทำงานต่อเนื่อง
  - **คำสั่งทดสอบ:** `bun test tests/unit/protocol/BloomFilter.test.ts`

---

## 🗄️ SPRINT 2: การจัดเก็บข้อมูลและการจัดเส้นทาง (Phase 2: Storage & Router Engine)
> **เป้าหมาย:** จัดการฐานข้อมูล SQLite/IndexedDB ในเครื่อง, การส่งต่อ Epidemic Gossip, ปรับ Hop ตามความหนาแน่น และระบบใบเสร็จ Signed ACK/NACK

- [x] **Task 2.1: พัฒนาระบบฐานข้อมูล SQLite/IndexedDB ในเครื่องพร้อมเพดาน 50MB FIFO**
  - **ไฟล์เป้าหมาย:** `src/core/storage/SqliteStorageEngine.ts`, `src/core/storage/schema.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/storage/SqliteStorageEngine.test.ts`
  - **รายละเอียดการทำงาน:**
    - สร้างโครงสร้างตาราง `messages`, `contacts`, `spatial_cache`, `outbox_queue`
    - ควบคุมขนาดฐานข้อมูลไม่เกิน 50MB หากเต็มให้ลบข้อความเก่าสุดแบบ FIFO (ยกเว้น SOS ห้ามลบ)
  - **คำสั่งทดสอบ:** `bun test tests/unit/storage/SqliteStorageEngine.test.ts`

- [x] **Task 2.2: พัฒนาเอนจินจัดเส้นทาง Epidemic Gossip & Targeted Flood Router**
  - **ไฟล์เป้าหมาย:** `src/core/routing/EpidemicRouter.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/storage/EpidemicRouter.test.ts`
  - **รายละเอียดการทำงาน:**
    - ตรวจสอบ `Target H3 Index` และส่งต่อข้อความไปยังโหนดที่มีทิศทางใกล้เคียงปลายทาง
    - ตรวจสอบ Message ID ใน Bloom Filter ก่อนส่งต่อ ป้องกัน Broadcast Storm
  - **คำสั่งทดสอบ:** `bun test tests/unit/storage/EpidemicRouter.test.ts`

- [x] **Task 2.3: พัฒนาระบบปรับทอดการส่งอัตโนมัติตามความหนาแน่น (Dynamic Hop Decay Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/routing/DynamicHopDecay.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/storage/DynamicHopDecay.test.ts`
  - **รายละเอียดการทำงาน:**
    - ประเมินจำนวนโหนดเพื่อนบ้านรอบตัว: เขตเมืองหนาแน่นปรับ Hop เป็น 3–7 ทอด / ชนบทห่างไกลปรับเป็น 12–15 ทอด
    - ลดทอนค่า TTL ตามค่าความแรงสัญญาณ RSSI เพื่อรักษาอายุแบตเตอรี่
  - **คำสั่งทดสอบ:** `bun test tests/unit/storage/DynamicHopDecay.test.ts`

- [x] **Task 2.4: พัฒนาระบบใบเสร็จยืนยันข้อความตีกลับ (Reverse Signed ACK & NACK Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/routing/DeliveryReceipt.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/storage/DeliveryReceipt.test.ts`
  - **รายละเอียดการทำงาน:**
    - เมื่อผู้รับได้รับข้อความ จะยิงแพ็กเก็ต `0x05: DELIVERY_ACK` เซ็นด้วย Private Key กลับเข้าสู่วง Mesh
    - เมื่อโหนดต้นทางได้รับ ACK จะเปลี่ยนสถานะเป็น 🟢 ส่งถึงแล้ว และสั่งล้างข้อความออกจากคิวรีเลย์ (Auto-Prune)
  - **คำสั่งทดสอบ:** `bun test tests/unit/storage/DeliveryReceipt.test.ts`

- [x] **Task 2.5: พัฒนาระบบกำหนดอายุข้อความแบบแบ่งระดับ (Tiered TTL & Expiry Manager)**
  - **ไฟล์เป้าหมาย:** `src/core/storage/TieredTtlManager.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/storage/TieredTtlManager.test.ts`
  - **รายละเอียดการทำงาน:**
    - ข้อความ SOS ฉุกเฉิน: ปกป้องในเครื่องนาน 72 ชั่วโมง
    - ข้อความแชต 1-on-1 ทั่วไป: ลบทิ้งเมื่อครบ 24 ชั่วโมง
    - สัญญาณชีพ Presence Heartbeat: หมดอายุและล้างทิ้งภายใน 1 ชั่วโมง
  - **คำสั่งทดสอบ:** `bun test tests/unit/storage/TieredTtlManager.test.ts`

---

## 📶 SPRINT 3: ไดรเวอร์วิทยุ BLE Long Range (Phase 4: BLE Radio Driver)
> **เป้าหมาย:** พัฒนาตัวส่งสัญญาณวิทยุ Bluetooth 5 LE Coded PHY (S=8), แยกชิ้นส่วนแพ็กเก็ต และนโยบาย Duty Cycling

- [x] **Task 3.1: พัฒนาระบบกระจายสัญญาณบลูทูธ (BleAdvertiser Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/ble/BleAdvertiser.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ble/BleAdvertiser.test.ts`
  - **รายละเอียดการทำงาน:**
    - กระจายสัญญาณบลูทูธแบบไร้การจับคู่ (Non-connectable Advertising)
    - รองรับการสลับระหว่าง Legacy BLE (31B) และ Extended Advertising
  - **คำสั่งทดสอบ:** `bun test tests/unit/ble/BleAdvertiser.test.ts`

- [x] **Task 3.2: พัฒนาระบบสแกนสัญญาณบลูทูธฮาร์ดแวร์ (BleScanner Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/ble/BleScanner.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ble/BleScanner.test.ts`
  - **รายละเอียดการทำงาน:**
    - กรองสัญญาณด้วย Hardware ScanFilter เฉพาะ Service UUID / Manufacturer Data `0x544F`
    - กรองข้อความซ้ำในระดับฮาร์ดแวร์เพื่อไม่ให้ CPU ตื่นโดยไม่จำเป็น
  - **คำสั่งทดสอบ:** `bun test tests/unit/ble/BleScanner.test.ts`

- [x] **Task 3.3: พัฒนาระบบเจรจาคลื่นระยะไกล Bluetooth 5 LE Coded PHY (S=8 / S=2)**
  - **ไฟล์เป้าหมาย:** `src/core/ble/LeCodedPhy.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ble/LeCodedPhy.test.ts`
  - **รายละเอียดการทำงาน:**
    - เจรจาขอใช้งานโหมด LE Coded PHY (S=8) เพื่อขยายระยะการส่งสู่ 200–400+ เมตร
    - หากชิปเซ็ตไม่รองรับ ให้ Fallback กลับสู่ BLE 1M Legacy อัตโนมัติ
  - **คำสั่งทดสอบ:** `bun test tests/unit/ble/LeCodedPhy.test.ts`

- [x] **Task 3.4: พัฒนาระบบเชื่อมต่อ GATT Server/Client สำหรับส่งข้อความหนาแน่น**
  - **ไฟล์เป้าหมาย:** `src/core/ble/BleConnectionManager.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ble/BleConnectionManager.test.ts`
  - **รายละเอียดการทำงาน:**
    - เปิดการเชื่อมต่อ GATT ชั่วคราวเมื่อต้องการส่งข้อมูลที่มีขนาดใหญ่เกิน Advertising Payload
    - ขอปรับเพิ่มขนาด MTU สูงสุด 512 ไบต์ เพื่อความรวดเร็วในการส่งข้อมูล
  - **คำสั่งทดสอบ:** `bun test tests/unit/ble/BleConnectionManager.test.ts`

- [x] **Task 3.5: พัฒนาระบบควบคุมวงจรการสแกนสลับหลับ (Duty Cycle Controller)**
  - **ไฟล์เป้าหมาย:** `src/core/ble/DutyCycleController.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ble/DutyCycleController.test.ts`
  - **รายละเอียดการทำงาน:**
    - แบตเตอรี่ > 50%: สแกน 5 วิ / พัก 55 วิ (Normal Duty Cycle)
    - แบตเตอรี่ 20%–50%: สแกน 3 วิ / พัก 120 วิ (Eco Mode)
    - แบตเตอรี่ < 20%: สแกน 2 วิ / พัก 300 วิ (Deep Hibernation Mode)
  - **คำสั่งทดสอบ:** `bun test tests/unit/ble/DutyCycleController.test.ts`

- [x] **Task 3.6: พัฒนาระบบแบ่งและประกอบชิ้นส่วนแพ็กเก็ต (BlePacketFragmentation)**
  - **ไฟล์เป้าหมาย:** `src/core/ble/BlePacketFragmentation.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ble/BlePacketFragmentation.test.ts`
  - **รายละเอียดการทำงาน:**
    - ซอยไฟล์ขนาดใหญ่เป็นชิ้นส่วนย่อย (Chunks $\le 200$ ไบต์) พร้อมกำกับ Total Chunks และ Sequence Index
    - ประกอบคืนไฟล์ต้นฉบับได้สมบูรณ์แม้แพ็กเก็ตจะเดินทางมาสลับลำดับกัน (Out-of-order Reassembly)
  - **คำสั่งทดสอบ:** `bun test tests/unit/ble/BlePacketFragmentation.test.ts`

---

## 🗺️ SPRINT 4: แผนที่เวกเตอร์ออฟไลน์และเรดาร์ H3 (Phase 5: Spatial Engine & Map)
> **เป้าหมาย:** แผนที่โลกเวกเตอร์ออฟไลน์ขนาดเล็ก <5MB, เข็มทิศเรดาร์หาพิกัด SOS และการรักษาความเป็นส่วนตัว K-Anonymity

- [x] **Task 4.1: พัฒนาระบบรวมพิกัดหกเหลี่ยมแบบลำดับชั้น (H3 Hierarchy Fallback Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/H3Hierarchy.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/spatial/H3HierarchyFallback.test.ts`
  - **รายละเอียดการทำงาน:**
    - แปลงพิกัดจาก Res 9 (~100m) ย่อส่วนขึ้นสู่ Res 7 (~1.2km) และ Res 5 (~8.8km)
    - ช่วยให้แสดงผลแผนที่ภาพรวมระดับอำเภอ/จังหวัดได้โดยไม่ต้องโหลดพิกัดระดับเมตร
  - **คำสั่งทดสอบ:** `bun test tests/unit/spatial/H3HierarchyFallback.test.ts`

- [x] **Task 4.2: พัฒนาระบบอ่านไฟล์แผนที่เวกเตอร์โลกออฟไลน์ (Vector Tile Parser)**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/VectorTileParser.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/spatial/VectorTileParser.test.ts`
  - **รายละเอียดการทำงาน:**
    - พาร์สไฟล์ `vector-basemap.pbf` (ขนาด < 5MB) แสดงแนวแผ่นดิน เส้นขอบฟ้า และเมืองใหญ่ทั่วโลก
    - วาดแผนที่ลง Canvas / MapLibre GL ได้โดยไม่ต้องเชื่อมต่ออินเทอร์เน็ต
  - **คำสั่งทดสอบ:** `bun test tests/unit/spatial/VectorTileParser.test.ts`

- [x] **Task 4.3: พัฒนาระบบแคชข้อมูลแผนที่ออฟไลน์ในเครื่อง (Offline Spatial Cache)**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/OfflineSpatialCache.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/spatial/OfflineSpatialCache.test.ts`
  - **รายละเอียดการทำงาน:**
    - จัดเก็บ Vector Tiles ลง IndexedDB ในเครื่องอัตโนมัติ
    - จัดการพื้นที่ด้วยนโยบาย FIFO Eviction เมื่อขนาดเกินโควตา
  - **คำสั่งทดสอบ:** `bun test tests/unit/spatial/OfflineSpatialCache.test.ts`

- [x] **Task 4.4: พัฒนาเอนจินเข็มทิศเรดาร์นำทางสู่จุดขอความช่วยเหลือ (SOS Radar Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/SosRadarEngine.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/spatial/SosRadarEngine.test.ts`
  - **รายละเอียดการทำงาน:**
    - คำนวณทิศทางเข็มทิศ (Compass Bearing) และระยะทางเป็นเมตรระหว่างโหนดปัจจุบันกับจุดเกิดเหตุ SOS
    - อัปเดตทิศทางการเดินแบบ Real-time นำทางทีมกู้ภัยเข้าหาผู้ประสบภัยแม้ไม่มีถนน
  - **คำสั่งทดสอบ:** `bun test tests/unit/spatial/SosRadarEngine.test.ts`

- [x] **Task 4.5: พัฒนาระบบทำแผนที่ความร้อนแบบไม่ระบุตัวตน (K-Anonymity Heatmap)**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/KAnonymityHeatmap.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/spatial/KAnonymityHeatmap.test.ts`
  - **รายละเอียดการทำงาน:**
    - ซ่อนพิกัดเดี่ยวของผู้ใช้ โดยรวมกลุ่มลงหกเหลี่ยม H3 Res 7
    - แสดงจุดความหนาแน่นเฉพาะเมื่อมีโหนดในหกเหลี่ยมนั้นตั้งแต่ 3 เครื่องขึ้นไป ($K \ge 3$)
  - **คำสั่งทดสอบ:** `bun test tests/unit/spatial/KAnonymityHeatmap.test.ts`

- [x] **Task 4.6: พัฒนาระบบดึงแผนที่ผ่าน Cloudflare Edge Cache (Tile Proxy Client)**
  - **ไฟล์เป้าหมาย:** `src/core/spatial/TileProxyClient.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/spatial/TileProxyClient.test.ts`
  - **รายละเอียดการทำงาน:**
    - เมื่อเครื่องต่อเน็ตได้ จะดึงแผนที่และบันทึกลงเครื่องอัตโนมัติ
    - แสดงข้อความให้เกียรติแหล่งข้อมูล OpenStreetMap (ODbL Attribution) อย่างถูกต้อง
  - **คำสั่งทดสอบ:** `bun test tests/unit/spatial/TileProxyClient.test.ts`

---

## 📷 SPRINT 5: สื่อมีเดียและการส่งตรงความเร็วสูง (Phase 6: Wi-Fi P2P & Media Engine)
> **เป้าหมาย:** การบีบอัดรูปภาพ WebP อัตโนมัติ, คลิปเสียงสั้น Opus 15 วิ พร้อมปุ่มฟังทวน และ Wi-Fi Direct P2P

- [x] **Task 5.1: พัฒนาระบบบีบอัดภาพถ่ายฉุกเฉินอัตโนมัติ (Client-Side WebP Compressor)**
  - **ไฟล์เป้าหมาย:** `src/core/media/ImageCompressor.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/media/ImageCompressor.test.ts`
  - **รายละเอียดการทำงาน:**
    - บีบอัดภาพถ่ายจากกล้องลงเหลือขนาด 320x240 WebP (5–12 KB) ในโหมดฉุกเฉิน
    - รองรับระดับความละเอียด Standard 640x480 (18–35 KB)
    - ปิดกั้นการส่งวิดีโอออฟไลน์ 100% เพื่อประหยัดพลังงาน
  - **คำสั่งทดสอบ:** `bun test tests/unit/media/ImageCompressor.test.ts`

- [x] **Task 5.2: พัฒนาระบบบันทึกเสียงแจ้งเหตุฉุกเฉิน (Voice Memo Recorder - Opus 15s)**
  - **ไฟล์เป้าหมาย:** `src/core/media/VoiceMemoRecorder.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/media/VoiceMemoRecorder.test.ts`
  - **รายละเอียดการทำงาน:**
    - บันทึกเสียงด้วย Opus Mono Bitrate ต่ำ (6–12 kbps) ตัดจบอัตโนมัติเมื่อครบ 15 วินาที (~8–15 KB)
    - มีระบบเล่นฟังทวนซ้ำ (Review & Preview) และต้องกดยืนยันส่งด้วยตนเองเสมอ
  - **คำสั่งทดสอบ:** `bun test tests/unit/media/VoiceMemoRecorder.test.ts`

- [x] **Task 5.3: พัฒนาระบบจัดการ Wi-Fi Direct Peer-to-Peer (WifiP2pManager)**
  - **ไฟล์เป้าหมาย:** `src/core/media/WifiP2pManager.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/media/WifiP2pManager.test.ts`
  - **รายละเอียดการทำงาน:**
    - จัดตั้งกลุ่ม Wi-Fi Direct (Group Owner Negotiation) อัตโนมัติ
    - เปิดการเชื่อมต่อ P2P ส่งข้อมูลรูปภาพข้ามเครื่องด้วยความเร็วสูง
  - **คำสั่งทดสอบ:** `bun test tests/unit/media/WifiP2pManager.test.ts`

- [x] **Task 5.4: พัฒนาระบบสตรีมข้อมูลชิ้นส่วนไฟล์และตรวจสอบความถูกต้อง (P2P Stream Socket)**
  - **ไฟล์เป้าหมาย:** `src/core/media/P2pStreamSocket.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/media/P2pStreamSocket.test.ts`
  - **รายละเอียดการทำงาน:**
    - ส่งชุดข้อมูลมีเดียแบบ Chunked Stream ผ่าน TCP/P2P Socket พร้อม Flow Control
    - ตรวจสอบความถูกต้องของแต่ละชิ้นส่วนด้วย CRC32 Checksum
  - **คำสั่งทดสอบ:** `bun test tests/unit/media/P2pStreamSocket.test.ts`

- [x] **Task 5.5: พัฒนาระบบเข้ารหัสไฟล์มีเดียสองชั้น (Media Payload E2EE Security)**
  - **ไฟล์เป้าหมาย:** `src/core/media/MediaPayloadSecurity.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/media/MediaPayloadSecurity.test.ts`
  - **รายละเอียดการทำงาน:**
    - เข้ารหัสลับก้อนข้อมูลภาพและเสียงด้วย Shared Secret ประจำคู่สนทนาก่อนแบ่งชิ้นส่วนส่ง
    - เครื่องรีเลย์ตัวกลางไม่สามารถเปิดดูรูปภาพหรือดักฟังเสียงได้
  - **คำสั่งทดสอบ:** `bun test tests/unit/media/MediaPayloadSecurity.test.ts`

---

## 📲 SPRINT 6: การแจกแอปออฟไลน์และสัญญาณเสียง/แสง (Phase 8: Emergency Sideload)
> **เป้าหมาย:** Hotspot Web Server แจก APK ผ่าน Wi-Fi QR, สัญญาณเสียง Acoustic Morse และไฟกระพริบฉุกเฉิน

- [ ] **Task 6.1: พัฒนาระบบเว็บเซิร์ฟเวอร์จิ๋วแจกไฟล์ติดตั้งในเครื่อง (Local Embedded HTTP Server)**
  - **ไฟล์เป้าหมาย:** `src/core/emergency/LocalHttpServer.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/emergency/LocalHttpServer.test.ts`
  - **รายละเอียดการทำงาน:**
    - รัน Embedded HTTP Server บน Port 8080 เมื่อผู้ใช้กดปุ่ม "แชร์แอปให้อีกเครื่อง"
    - บริการส่งไฟล์ `outgrid-rescue.apk` ตรงให้เบราว์เซอร์ของเครื่องรอบข้างที่เชื่อมต่อเข้ามา
  - **คำสั่งทดสอบ:** `bun test tests/unit/emergency/LocalHttpServer.test.ts`

- [ ] **Task 6.2: พัฒนาระบบ Micro DNS Server และ Captive Portal จำลอง**
  - **ไฟล์เป้าหมาย:** `src/core/emergency/MicroDnsServer.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/emergency/MicroDnsServer.test.ts`
  - **รายละเอียดการทำงาน:**
    - ดักจับการสืบค้น DNS บน UDP Port 53 ส่งคำขอทั้งหมดกลับมาที่ IP ของเครื่องตนเอง
    - ตอบสนองต่อ Captive Portal URL (`/generate_204`) เด้งหน้าดาวน์โหลด APK อัตโนมัติ
  - **คำสั่งทดสอบ:** `bun test tests/unit/emergency/MicroDnsServer.test.ts`

- [ ] **Task 6.3: พัฒนาระบบส่งพิกัดฉุกเฉินด้วยคลื่นเสียงไซเรน (Acoustic Morse Sound Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/emergency/AcousticMorseEngine.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/emergency/AcousticMorseEngine.test.ts`
  - **รายละเอียดการทำงาน:**
    - ยิงเสียงไซเรนกวาดความถี่ (Sweep Sine 800–1800Hz) ทะลุใต้ซากตึกคอนกรีต
    - ส่งรหัส Morse Code พิกัด GPS สำหรับใช้ดักฟังในระยะ 30–50 เมตร
  - **คำสั่งทดสอบ:** `bun test tests/unit/emergency/AcousticMorseEngine.test.ts`

- [ ] **Task 6.4: พัฒนาระบบดักฟังสัญญาณเสียงพิกัดฉุกเฉิน (Ultrasonic / FSK Demodulator)**
  - **ไฟล์เป้าหมาย:** `src/core/emergency/FskDemodulator.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/emergency/FskDemodulator.test.ts`
  - **รายละเอียดการทำงาน:**
    - วิเคราะห์เสียงผ่านไมโครโฟนด้วย Goertzel Algorithm / FFT ตรวจจับความถี่ 18.5 kHz และ 19.5 kHz
    - ถอดรหัสคลื่นเสียงกลับมาเป็นพิกัดละติจูด/ลองจิจูดของผู้ประสบภัยใต้ซากตึก
  - **คำสั่งทดสอบ:** `bun test tests/unit/emergency/FskDemodulator.test.ts`

- [ ] **Task 6.5: พัฒนาระบบส่งรหัสไฟฉายกะพริบฉุกเฉิน SOS (Flashlight Strobe Controller)**
  - **ไฟล์เป้าหมาย:** `src/core/emergency/FlashlightStrobe.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/emergency/FlashlightStrobe.test.ts`
  - **รายละเอียดการทำงาน:**
    - ควบคุมไฟแฟลช LED ของกล้องให้กะพริบตามจังหวะรหัสมอร์สสากล `... --- ...`
    - มีระบบ Thermal Cutoff ป้องกันหลอดไฟแฟลชร้อนจัดจนเสียหาย
  - **คำสั่งทดสอบ:** `bun test tests/unit/emergency/FlashlightStrobe.test.ts`

---

## 🤖 SPRINT 7: บริการระบบ Android และสะพานฮาร์ดแวร์ภายนอก (Phase 7: Native Android & Bridge)
> **เป้าหมาย:** ทำงานเบื้องหลัง 24 ชม. ไม่โดนตัด, ขนส่งข้อมูลผ่านรถกู้ภัย (Data Mule) และสะพานเชื่อม LoRa

- [ ] **Task 7.1: พัฒนาระบบบริการเบื้องหลัง Android Foreground Service และ WakeLock**
  - **ไฟล์เป้าหมาย:** `src/core/native/ForegroundService.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/native/ForegroundService.test.ts`
  - **รายละเอียดการทำงาน:**
    - รัน Foreground Service พร้อมแสดง Notification ถาวรบนหน้าจอมือถือ
    - ถือ WakeLock อย่างมีวินัย ป้องกันระบบ Android ตัดการเชื่อมต่อขณะปิดหน้าจอ
  - **คำสั่งทดสอบ:** `bun test tests/unit/native/ForegroundService.test.ts`

- [ ] **Task 7.2: พัฒนาระบบปลุกเครื่องข้ามโหมดหลับลึก (Doze Mode Resilience Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/native/DozeModeResilience.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/native/DozeModeResilience.test.ts`
  - **รายละเอียดการทำงาน:**
    - ใช้ AlarmManager (`setAndAllowWhileIdle`) ปลุกระบบขึ้นมาสแกนวิทยุรอบข้างตามรอบ
    - ตรวจสอบและขอข้อยกเว้นการประหยัดแบตเตอรี่ (Battery Optimization Whitelist)
  - **คำสั่งทดสอบ:** `bun test tests/unit/native/DozeModeResilience.test.ts`

- [ ] **Task 7.3: พัฒนาระบบตรวจจับการเคลื่อนที่อัตโนมัติ (Autonomous Mobility Detection)**
  - **ไฟล์เป้าหมาย:** `src/core/native/AutonomousMobility.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/native/AutonomousMobility.test.ts`
  - **รายละเอียดการทำงาน:**
    - อ่านค่าจาก Accelerometer และ GPS ตรวจพบความเร็ว $\ge 15-20$ กม./ชม. (กำลังเดินทางบนรถยนต์/เรือกู้ภัย)
    - สลับเครื่องเข้าสู่โหมด "Physical Data Mule" อัตโนมัติทันที
  - **คำสั่งทดสอบ:** `bun test tests/unit/native/AutonomousMobility.test.ts`

- [ ] **Task 7.4: พัฒนาระบบฝากและส่งต่อข้อมูลแบบไร้สัมผัส (Data Mule Zero-Click Exchange)**
  - **ไฟล์เป้าหมาย:** `src/core/native/DataMuleTransfer.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/native/DataMuleTransfer.test.ts`
  - **รายละเอียดการทำงาน:**
    - ดูดแพ็กเก็ตตกค้างจากคลัสเตอร์ผู้ประสบภัยมาเก็บไว้ในเครื่องอัตโนมัติขณะรถวิ่งผ่าน
    - ปล่อยข้อความลงสู่อีกคลัสเตอร์หนึ่งทันทีที่ขับเข้าใกล้ โดยไม่ต้องมีการแตะหน้าจอ (Zero-Click)
  - **คำสั่งทดสอบ:** `bun test tests/unit/native/DataMuleTransfer.test.ts`

- [ ] **Task 7.5: พัฒนาตัวแปลงโพรโทคอลสะพานเชื่อม LoRa Meshtastic (Meshtastic Bridge)**
  - **ไฟล์เป้าหมาย:** `src/core/adapters/meshtasticAdapter.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/native/MeshtasticBridge.test.ts`
  - **รายละเอียดการทำงาน:**
    - แปลงแพ็กเก็ต TOG v1.1 ข้ามสู่โครงสร้าง LoRa Protobuf ของเครือข่าย Meshtastic
    - รองรับการเชื่อมต่อบอร์ด ESP32 LoRa ผ่านสาย OTG Serial หรือ Bluetooth SPP
  - **คำสั่งทดสอบ:** `bun test tests/unit/native/MeshtasticBridge.test.ts`

- [ ] **Task 7.6: พัฒนาตัวแปลงสะพานเชื่อม Briar Bramble Protocol (Briar Bridge)**
  - **ไฟล์เป้าหมาย:** `src/core/adapters/briarAdapter.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/native/BriarBridge.test.ts`
  - **รายละเอียดการทำงาน:**
    - แปลงแพ็กเก็ต TOG v1.1 ส่งต่อเข้าท่อสื่อสารของ Briar BTP เพื่อแลกเปลี่ยนข้อมูลข้ามแพลตฟอร์ม
  - **คำสั่งทดสอบ:** `bun test tests/unit/native/BriarBridge.test.ts`

---

## 📱 SPRINT 8: หน้าจอผู้ใช้และเอนจินสลับโหมดอัตโนมัติ (Phase 3: State Machine & UI)
> **เป้าหมาย:** One-Tap SOS, 1-on-1 Chat, Crisis Feed, จับคู่ QR Code และสลับโหมดตามเน็ตล่มใน 5 วินาที

- [ ] **Task 8.1: พัฒนาเอนจินสลับสถานะอัตโนมัติเมื่อเน็ตตัด (Mode State Machine & 5s Fallback)**
  - **ไฟล์เป้าหมาย:** `src/core/state/ModeStateMachine.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ui/ModeStateMachine.test.ts`
  - **รายละเอียดการทำงาน:**
    - ตรวจสอบสถานะการเชื่อมต่ออินเทอร์เน็ต หากขาดหายเกิน 5 วินาที ให้สลับเข้าสู่ **Disaster Mesh Mode** ทันที
    - มีระบบ Transition แจ้งเตือนบนแถบสถานะของแอปแบบไร้รอยต่อ
  - **คำสั่งทดสอบ:** `bun test tests/unit/ui/ModeStateMachine.test.ts`

- [ ] **Task 8.2: รักษาความเท่าเทียมของผู้ใช้แบบไม่ล็อกอินและล็อกอิน (Guest Parity Engine)**
  - **ไฟล์เป้าหมาย:** `src/core/auth/AuthManager.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ui/ParityGuestUser.test.ts`
  - **รายละเอียดการทำงาน:**
    - ผู้ใช้ทั่วไป (Guest) เปิดแอปแล้วใช้งานปุ่ม One-Tap SOS, แผนที่ออฟไลน์ และแชต 1-on-1 ได้ทันทีโดยไม่ต้องล็อกอิน
    - เจ้าหน้าที่กู้ภัย (Authenticated) แสดงตราสัญลักษณ์ Verified Responder และฟังก์ชันการจัดการเหตุ
  - **คำสั่งทดสอบ:** `bun test tests/unit/ui/ParityGuestUser.test.ts`

- [ ] **Task 8.3: พัฒนาระบบจัดการระดับแบตเตอรี่ (Battery Policy Manager)**
  - **ไฟล์เป้าหมาย:** `src/core/state/BatteryPolicyManager.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ui/BatteryPolicyManager.test.ts`
  - **รายละเอียดการทำงาน:**
    - ปรับเปลี่ยนสถานะเครื่องตามแบตเตอรี่: Full Power (>50%), Balanced (20–50%), Deep Hibernation (<20%)
    - แสดงคำแนะนำการประหยัดแบตเตอรี่ฉุกเฉินแก่ผู้ประสบภัย
  - **คำสั่งทดสอบ:** `bun test tests/unit/ui/BatteryPolicyManager.test.ts`

- [ ] **Task 8.4: พัฒนาหน้าจอและตัวกรองประกาศเตือนภัยทางการ (Offline Crisis Feed UI)**
  - **ไฟล์เป้าหมาย:** `src/ui/components/CrisisFeed.svelte`, `src/core/feed/CrisisFeedManager.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/ui/OfflineCrisisFeed.test.ts`
  - **รายละเอียดการทำงาน:**
    - แสดงประกาศเตือนภัย เรียงลำดับตามความสำคัญ ปักหมุดคำสั่งอพยพด่วน
    - ตรวจสอบลายเซ็นดิจิทัล Ed25519 หากไม่ผ่านจะแสดงคำเตือนว่าอาจเป็นข่าวปลอม
  - **คำสั่งทดสอบ:** `bun test tests/unit/ui/OfflineCrisisFeed.test.ts`

- [ ] **Task 8.5: พัฒนาหน้าจอกดขอความช่วยเหลือฉุกเฉินในคลิกเดียว (One-Tap SOS UI)**
  - **ไฟล์เป้าหมาย:** `src/ui/components/OneTapSos.svelte`
  - **ไฟล์ทดสอบ:** `tests/unit/ui/OneTapSos.test.ts`
  - **รายละเอียดการทำงาน:**
    - ปุ่ม SOS สีแดงขนาดใหญ่ กดเพียงครั้งเดียวยิงพิกัด GPS, H3 Delta, ระดับแบตเตอรี่ และสถานะฉุกเฉินออกสู่อากาศทันที
    - มีตัวเลือกสถานะ: "ติดอยู่ใต้ซากตึก", "มีเด็ก/คนชรา", "ต้องการเรือ", "ขาดออกซิเจน"
  - **คำสั่งทดสอบ:** `bun test tests/unit/ui/OneTapSos.test.ts`

---

## ☁️ SPRINT 9: คลาวด์ไร้เซิร์ฟเวอร์และการเชื่อมต่อขอบเขต (Phase 9: Cloud & Zero-Trust)
> **เป้าหมาย:** Cloudflare Workers, D1 Spatial DB, STUN P2P Signaling และรับ Inbound Alert CAP v1.2

- [ ] **Task 9.1: พัฒนาระบบจับคู่นามบัตร P2P WebRTC Signaling บน Cloudflare Worker**
  - **ไฟล์เป้าหมาย:** `cloudflare/workers/signaling.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/cloud/WebRtcSignaling.test.ts`
  - **รายละเอียดการทำงาน:**
    - จับคู่เครื่องผ่าน H3 Tile ID บน Worker ส่งต่อ SDP ผ่าน STUN Server ฟรีของ Google/Cloudflare
    - สองเครื่องเปิดท่อคุยตรงหากันเองแบบ P2P เซิร์ฟเวอร์ไม่เป็นตัวกลางรับส่งข้อมูล (Zero Media Relay)
  - **คำสั่งทดสอบ:** `bun test tests/unit/cloud/WebRtcSignaling.test.ts`

- [ ] **Task 9.2: พัฒนา API Gateway บน Cloudflare Worker พร้อมระบบตรวจลายเซ็นคำขอ**
  - **ไฟล์เป้าหมาย:** `cloudflare/workers/index.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/cloud/CloudflareWorkerApi.test.ts`
  - **รายละเอียดการทำงาน:**
    - รับคำขอด้วยการตรวจสอบสิทธิ์ Ed25519 Request Signature ป้องกัน Replay Attack
    - จำกัดปริมาณคำขอ (Rate Limiting) 1 คำขอต่อ 15 วินาทีต่อเครื่อง
  - **คำสั่งทดสอบ:** `bun test tests/unit/cloud/CloudflareWorkerApi.test.ts`

- [ ] **Task 9.3: ออกแบบและติดตั้งโครงสร้างฐานข้อมูล Cloudflare D1 Spatial Database**
  - **ไฟล์เป้าหมาย:** `cloudflare/d1/schema.sql`
  - **ไฟล์ทดสอบ:** `tests/unit/cloud/D1DatabaseSchema.test.ts`
  - **รายละเอียดการทำงาน:**
    - กำหนดตาราง `active_nodes`, `node_neighbors`, `passkey_credentials`, `user_contacts`
    - กำหนดคำสั่งตั้งเวลาลบข้อมูลที่หมดอายุ (TTL 1 ชั่วโมง) อัตโนมัติ
  - **คำสั่งทดสอบ:** `bun test tests/unit/cloud/D1DatabaseSchema.test.ts`

- [ ] **Task 9.4: พัฒนาระบบรวบการเขียนข้อมูลเพื่อประหยัดโควตา (D1 Quota Coalescing Buffer)**
  - **ไฟล์เป้าหมาย:** `cloudflare/workers/d1Buffer.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/cloud/D1QuotaCoalescing.test.ts`
  - **รายละเอียดการทำงาน:**
    - พักคำขออัปเดตสถานะโหนดในหน่วยความจำ Worker รวบรวมเขียนลง D1 แบบ Batch Upsert ทุก 10 วินาที
    - ลดทอนจำนวนการเขียนข้อมูลลงมากกว่า 85% รักษาการทำงานให้อยู่ใน Free Tier 100%
  - **คำสั่งทดสอบ:** `bun test tests/unit/cloud/D1QuotaCoalescing.test.ts`

- [ ] **Task 9.5: พัฒนาระบบรับแจ้งเตือนภัยจากภายนอกมาตรฐานสากล (CAP Alert Ingestion Gateway)**
  - **ไฟล์เป้าหมาย:** `cloudflare/workers/capAlert.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/cloud/CapAlertIngestion.test.ts`
  - **รายละเอียดการทำงาน:**
    - รับ Inbound Webhook ข้อความเตือนภัยรูปแบบ CAP v1.2 (XML/JSON) จากกรมอุตุนิยมวิทยาและ ปภ.
    - เซ็นกำกับด้วย Master Key แล้วส่งกระจายลงฐานข้อมูล D1 ให้แอปดึงเข้าวง Mesh
  - **คำสั่งทดสอบ:** `bun test tests/unit/cloud/CapAlertIngestion.test.ts`

- [ ] **Task 9.6: พัฒนาระบบยืนยันตัวตนกู้ภัยไร้รหัสผ่าน Passkey (FIDO2 WebAuthn)**
  - **ไฟล์เป้าหมาย:** `cloudflare/workers/passkeyAuth.ts`, `src/core/auth/PasskeyClient.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/cloud/PasskeyAuthManager.test.ts`
  - **รายละเอียดการทำงาน:**
    - ยืนยันตัวตนเจ้าหน้าที่ผ่านการสแกนลายนิ้วมือ/ใบหน้า (FIDO2 Passkey)
    - ซิงก์รายชื่อผู้ติดต่อที่ปลอดภัยผ่านการเข้ารหัส E2EE
  - **คำสั่งทดสอบ:** `bun test tests/unit/cloud/PasskeyAuthManager.test.ts`

- [ ] **Task 9.7: พัฒนาระบบแยกสิทธิ์การดูข้อมูลเชิงพื้นที่สองระดับ (Dual-Tier Spatial Privacy)**
  - **ไฟล์เป้าหมาย:** `cloudflare/workers/spatialPrivacy.ts`
  - **ไฟล์ทดสอบ:** `tests/unit/cloud/DualTierPrivacy.test.ts`
  - **รายละเอียดการทำงาน:**
    - ผู้ใช้ทั่วไปเห็นแผนที่ความหนาแน่นระดับ H3 Res 7 (เบลอพิกัด)
    - เจ้าหน้าที่กู้ภัยที่ยืนยันตัวตนแล้วสามารถเห็นพิกัดหลังคาบ้าน Res 9 / Delta Offset เพื่อเข้าช่วยเหลือ
  - **คำสั่งทดสอบ:** `bun test tests/unit/cloud/DualTierPrivacy.test.ts`

---

## 🌐 SPRINT 10: ความสมบูรณ์ 10 ภาษาและการซ้อมรบเสมือนจริง (Phase 10: i18n & E2E Drills)
> **เป้าหมาย:** ตรวจสอบคีย์แปล 10 ภาษาครบ 100%, จำลองเครือข่าย 15-Hop Relay และการซ้อมตัดเน็ตภาคสนาม

- [ ] **Task 10.1: ตรวจสอบความสมบูรณ์ของชุดแปลภาษาทั้ง 10 ภาษา (i18n Bundle Completeness)**
  - **ไฟล์เป้าหมาย:** `src/locales/th.json`, `en.json`, `my.json`, `lo.json`, `km.json`, `vi.json`, `ms.json`, `zh.json`, `ja.json`, `es.json`
  - **ไฟล์ทดสอบ:** `tests/unit/i18n/I18nBundleCompleteness.test.ts`
  - **รายละเอียดการทำงาน:**
    - ตรวจสอบว่าคีย์ข้อความ UI ฉุกเฉินครบถ้วน 100% เท่ากันทุกภาษา ไร้คีย์ตกหล่น
  - **คำสั่งทดสอบ:** `bun test tests/unit/i18n/I18nBundleCompleteness.test.ts`

- [ ] **Task 10.2: พัฒนาการจำลองเครือข่ายกระโดดข้ามตึก 15 ทอด (Multi-Hop Mesh 15-Hop Simulation)**
  - **ไฟล์เป้าหมาย:** `tests/integration/MultiHopSimulation.test.ts`
  - **รายละเอียดการทำงาน:**
    - จำลองโหนดเสมือนจริง 15 เครื่อง รันในหน่วยความจำ
    - ยิงสัญญาณ SOS และ Chat ทดสอบการกระจายตัวข้าม 15 ทอด ตรวจสอบว่าไม่มี Packet Loop และได้รับ ACK ครบถ้วน
  - **คำสั่งทดสอบ:** `bun test tests/integration/MultiHopSimulation.test.ts`

- [ ] **Task 10.3: พัฒนาชุดทดสอบการสลับเข้าสู่โหมดออฟไลน์อัตโนมัติภายใน 5 วินาที (E2E Fallback Test)**
  - **ไฟล์เป้าหมาย:** `tests/integration/OfflineFallback.test.ts`
  - **รายละเอียดการทำงาน:**
    - จำลองการตัดสายเคเบิลหรือเสาสัญญาณหลักล่ม ตรวจสอบว่าแอปตรวจพบและสลับโหมดออฟไลน์อัตโนมัติใน 5 วินาที
  - **คำสั่งทดสอบ:** `bun test tests/integration/OfflineFallback.test.ts`

- [ ] **Task 10.4: จัดทำคู่มือและบันทึกผลการซ้อมรับมือภัยพิบัติภาคสนาม (Disaster Drill Checklist)**
  - **ไฟล์เป้าหมาย:** `docs/DISASTER_DRILL_CHECKLIST.md`
  - **รายละเอียดการทำงาน:**
    - ตรวจสอบระยะรับส่ง BLE S=8 จริง 200–400 เมตร บนเครื่องจริง
    - ตรวจสอบการกินแบตเตอรี่โหมดสแตนด์บาย 24 ชั่วโมง (<0.2%/ชม.)
    - ตรวจสอบการยิงเสียง Acoustic Morse ทะลุใต้กล่องและสิ่งกีดขวาง

---

## 🎯 สรุปขั้นตอนการปฏิบัติงานสำหรับ Dev / AI (Execution Workflow)
1. ดำเนินการทำทีละ Task ตามลำดับสปรินต์
2. เขียนโค้ดใน `src/` และสร้างชุดทดสอบใน `tests/unit/`
3. รันคำสั่งตรวจสอบไวยากรณ์: `node scripts/checkSyntax.js`
4. รันชุดทดสอบด้วย Bun: `bun test <test-file>` ยืนยันผลลัพธ์ Pass 100%
5. ติ๊กเครื่องหมาย `[x]` ใน Task ที่ทำเสร็จ
6. ทำการ Commit และ Push ไปยังสาขา **`uat`** เท่านั้น (ห้าม Push สู่ `main` เด็ดขาด)
