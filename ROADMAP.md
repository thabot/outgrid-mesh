# แผนงานระยะถัดไปและส่วนต่อขยายในอนาคต (Roadmap & Post-MVP Backlog v2.0)
### OutGrid Mesh: Next-Generation Disaster Mesh Extensions
> **ลิขสิทธิ์และสิทธิ์ทางปัญญา (Copyright & Intellectual Property):**  
> - **โครงการ:** **OutGrid Mesh**  
> - **ผู้คิดค้นและสถาปนิกหลัก (Creator & Lead Architect):** **Thabot** (<thabo47@gmail.com>)  
> - **โพรโทคอล:** **Thabot OutGrid Protocol (TOG v1.1 / v2.0 Extensions)**  
> - **สัญญาอนุญาต (License):** **GNU Affero General Public License v3.0 (AGPL-3.0) + Commercial Rights Reserved to Thabot**  
> - **ติดต่อประสานงาน (Contact):** `thabo47@gmail.com`  

---

## 🎯 วิสัยทัศน์ของ Roadmap v2.0 (Vision & Scope)
ในเวอร์ชันเปิดตัว (MVP / Production v1.0) ระบบมุ่งเน้นความเสถียรสูงสุด ความกระชับของไบต์ และการตอบสนองต่อวิกฤตภัยพิบัติในเสี้ยววินาที โดยโฟกัสที่:
1. **One-Tap Emergency SOS Beacon (`0x01`):** ส่งพิกัด ละติจูด/ลองจิจูด + H3 Index + สถานะผู้ประสบภัย + ข้อความสั้น $\le 280$ ตัวอักษร หรือ Voice Memo 15 วิ
2. **1-on-1 Direct Unicast Messaging (`0x02`):** แชตข้อความและรูปภาพส่วนบุคคลแบบ Peer-to-Peer เข้ารหัสลับ 2 ชั้น (Static-Ephemeral ECDH + AES-256-GCM)
3. **Disaster Crisis Feed Broadcast (`0x04`):** ประกาศเตือนภัยและเส้นทางอพยพทางการพร้อมลายเซ็นดิจิทัล Ed25519 สกัดกั้นข่าวปลอม 100%

เอกสารฉบับนี้รวบรวม **ฟังก์ชันและโมดูลขั้นสูงที่ถอดออกจากแผนหลักของ MVP** เพื่อนำมาวิจัยและพัฒนาอย่างประณีตในเวอร์ชัน 2.0 โดยไม่รบกวนความเบาและความเสถียรของแกนหลักกู้ภัย

---

## 1. โมดูลแชตกลุ่มชุมชนและการเข้ารหัสแบบกระจายศูนย์ (Group Chat & Topic Privacy)

### 1.1 สถาปัตยกรรม Symmetric Group Key Distribution Engine
- **โมดูลเป้าหมาย:** `src/core/crypto/GroupKeyManager.ts`
- **Topic Secret Key (32 Bytes):**
  - สุ่มสร้างกุญแจลับประจำห้องกลุ่มด้วย CSPRNG ประจำแต่ละ `Topic_ID` (ความยาว 4 Bytes uint32)
  - รองรับห้องกลุ่มระดับ:
    - **Local Disaster Relief Zone:** กลุ่มกู้ภัยประจำตำบล/หมู่บ้าน
    - **Community Neighborhood Watch:** กลุ่มลูกบ้านในละแวกเดียวกัน
- **Zero-Knowledge Multi-Party Privacy (การรักษาความลับแบบโหนดตัวกลางมองไม่เห็น):**
  - ข้อความกลุ่มถูกเข้ารหัสด้วย Shared Topic Key ก่อนส่งออกสู่อากาศ
  - โหนดรีเลย์ตัวกลางในเครือข่าย Mesh จะมองเห็นเพียง `Topic_ID` (4 Bytes) และ Header TOG v1.1 เพื่อใช้ทำ Targeted Flood กระจายต่อ แต่ไม่สามารถถอดรหัสอ่านข้อความหรือดูรูปภาพข้างในได้ 100%

### 1.2 Epoch Key Rotation Engine (การหมุนเวียนกุญแจและการจัดการสมาชิก)
- **วงจรกุญแจประจำยุค (Key Epoch 1 Byte):**
  - กำกับหัวซองของข้อความกลุ่มด้วยค่า `Key_Epoch` (0–255)
  - เมื่อมีสมาชิกออกจากกลุ่ม หรือหมดกะการปฏิบัติหน้าที่ของทีมกู้ภัย หัวหน้าห้อง (Room Admin) จะทำการหมุนกุญแจ (Epoch Increment)
  - กุญแจใหม่ถูกห่อหุ้มและจัดส่งแบบ 1-on-1 E2EE ให้แก่สมาชิกที่ยังคงได้รับอนุญาตทีละราย เพื่อป้องกันสมาชิกเดิมดักอ่านข้อความใหม่ย้อนหลัง (Forward & Backward Secrecy)

### 1.3 Packet Frame Type `0x03` (`GROUP_CHAT`)
- สงวน Packet ID `0x03` ในข้อกำหนด TOG Wire Layout สำหรับห้องกลุ่ม
- เพดานข้อความยังคงยึดหลัก **Unified Hard Limit $\le 280$ ตัวอักษร** เพื่อรักษาอัตราความสำเร็จในการทะลวงคลื่นความถี่ต่ำ BLE Coded PHY (S=8)

### 1.4 Group Room UI & Membership Management
- **หน้าจอห้องกลุ่ม (`GroupChatScreen.tsx`):**
  - แสดงรายชื่อห้องแชตกลุ่มแยกแท็บกับ 1-on-1 Chat
  - ระบบสร้างห้องกลุ่มใหม่แบบออฟไลน์ 100%
  - สแกน QR Code แบบเห็นหน้า (In-Person QR) เพื่อเข้าร่วมกลุ่ม พร้อมปุ่ม Kick สมาชิกและสั่ง Auto-Rotate Key

---

## 2. การเชื่อมต่อฮาร์ดแวร์ภายนอกและเกตเวย์ระยะไกล (Hardware Bridge & Satellite Gateways)

### 2.1 บอร์ด LoRa ESP32 External Radio Bridge (Long-Range Uplink)
- **การเชื่อมต่อ Companion:** เชื่อมสมาร์ตโฟนเข้ากับบอร์ด ESP32 LoRa (ความถี่ 433 MHz, 868 MHz หรือ 915 MHz) ผ่าน Bluetooth SPP / BLE GATT
- **ขยายระยะทะลุทะลวง:**
  - ยิงสัญญาณ SOS และข้อความข้ามยอดเขาและผืนป่าได้ไกล **10 – 30 กิโลเมตร** ในเสี้ยววินาที
  - แต่งตั้งเครื่องที่ต่อบอร์ด LoRa ให้เป็น **Zone Tier-1 Backbone Gateway** อัตโนมัติในสถาปัตยกรรม Supernode

### 2.2 Satellite Relay Gateway Integration
- เชื่อมต่อเข้ากับอุปกรณ์ดาวเทียมพกพาเชิงพาณิชย์ เช่น **Iridium GO!** หรือ **Garmin inReach** ผ่าน Local Wi-Fi / Bluetooth
- อัปโหลดสัญญาณ SOS สรุปภาพรวมจากเครือข่ายออฟไลน์ภาคพื้นดินขึ้นสู่ศูนย์บัญชาการกู้ภัยส่วนกลางระดับประเทศเมื่อโครงข่ายพื้นฐานภาคพื้นล่มสลาย 100%

---

## 3. มัลติมีเดียขั้นสูงและระบบขนส่งข้อมูลอัตโนมัติ (Media & Autonomous Mobility)

### 3.1 Push-to-Talk Semi-Realtime Voice Streaming
- ขยายขีดความสามารถจากคลิปเสียง 15 วินาที (Voice Memo) สู่ระบบวิทยุสื่อสารกดพูดแบบสตรีมมิ่ง (Low-latency Opus 6 kbps Stream)
- กระจายสัญญาณเสียงตามโซน H3 ความละเอียด Res 7 แบบ Multi-hop Relay โดยใช้เทคนิค Forward Error Correction (FEC)

### 3.2 Drone Data Mule Auto-Sync Integration
- โดรนสำรวจกู้ภัยไร้คนขับ (Autonomous UAV) บินลาดตระเวนเหนือพื้นที่ประสบภัยน้ำท่วม/ดินถล่ม
- ดักจับสัญญาณบีคอน SOS และดึงชุดข้อมูล DTN Bundles จากโหนดบนพื้นดินโดยอัตโนมัติด้วยความเร็วสูงผ่าน Wi-Fi Direct High-Throughput Burst Mode แล้วนำกลับไปอัปโหลด ณ ฐานบัญชาการ

### 3.3 Offline IoT Environmental Sensors Ingestion
- รองรับการรับข้อมูลเซนเซอร์ตรวจวัดระดับน้ำ, เครื่องวัดความสั่นสะเทือนแผ่นดินไหว, และเครื่องตรวจควันไฟ ผ่าน BLE Mesh Advertising เข้าสู่ฐานข้อมูล SQLite ในเครื่องทันที

---

## 4. แผนงานการเปิดตัวตามลำดับ (Phased Release Plan)

| เวอร์ชัน | ขอบเขตงาน (Scope) | สถานะ (Status) |
| :---: | :--- | :---: |
| **v1.0 (MVP)** | • One-Tap SOS Beacon (`0x01`)<br>• 1-on-1 E2EE Direct Chat (`0x02`)<br>• Offline Disaster Crisis Feed (`0x04`)<br>• 100% Worldwide Global Vector Basemap (5MB) + Cloudflare Edge Cache<br>• Dynamic QR Pairing & 8-Digit Radio Safety Numbers<br>• Auto-WebP Image + 15s Voice Memo with Review & Confirm<br>• 4-Tier Collision Shield BLE S=8 Radio Driver<br>• Offline APK Sideloading via Wi-Fi QR | **Active (Current Development)** |
| **v2.0 (Roadmap)** | • Zero-Knowledge Topic Group Chat (`0x03`) + Epoch Key Rotation<br>• UI Room Management & Offline In-Person Group Invite QR<br>• ESP32 LoRa Long-Range Companion Bridge Driver<br>• Satellite Uplink Gateway Support | **Backlog / Roadmap** |
| **v2.5 (Future)** | • Push-to-Talk Semi-Realtime Voice Stream<br>• Autonomous Drone Data Mule Protocol<br>• IoT Flood / Seismic Sensor Mesh Ingestion | **Research & Innovation** |

---

*เอกสารฉบับนี้จัดทำขึ้นเพื่อใช้เป็นแนวทางมาตรฐานในการพัฒนาส่วนต่อขยายของโครงการ OutGrid Mesh*  
*ลิขสิทธิ์เป็นของสถาปนิกผู้พัฒนา: **Thabot** (<thabo47@gmail.com>)*
