/**
 * Reactive Multi-Language Store & Translation Engine (Sprint F Task F.3)
 * Full 10 Languages support with instant reactive switching & RTL support
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Internationalization
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { writable, derived } from 'svelte/store';

export type SupportedLocale = 'th' | 'en' | 'my' | 'lo' | 'km' | 'vi' | 'ms' | 'zh' | 'ja' | 'es' | 'ar';

export interface ILocaleOption {
  code: SupportedLocale;
  name: string;
  flag: string;
  isRtl?: boolean;
}

export const SUPPORTED_LOCALES: ILocaleOption[] = [
  { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'km', name: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
];

export const fallbackDictionary: Record<string, string> = {
  app_name: 'OutGrid Rescue',
  one_tap_sos: 'One-Tap SOS',
  disaster_mesh_mode: 'Disaster Mesh Mode',
  radar_compass: 'Radar Compass Navigation',
  battery_critical: 'Critical Battery (<20%) Radio Hibernating',
  evacuate_immediate: 'Evacuate Immediately',
  map: 'Map',
  chat: 'Chat',
  sos: 'SOS',
  friends: 'Friends',
  profile: 'Profile',
  feed: 'Feed',
  manual: 'Manual',
  fund: 'Fund',
  nodes_around: 'nodes nearby',
  nodes_count_suffix: 'nodes',
  emergency_hardware: 'Emergency Hardware',
  sos_morse_torch: 'SOS Flashlight',
  torch_off: 'Flashlight OFF',
  siren_85db: '85dB Siren',
  siren_off: 'Siren OFF',
  siren_muted: 'Muted',
  all_in_panic: '🚨 ALL-IN PANIC',
  stop_all: '⏹️ Stop All',
  tap_for_estimate: 'Tap battery icon for remaining runtime',
  remaining: 'remaining',
  charging: 'Charging',
  survival_mode: 'Ultra Survival',
  last_gasp_btn: '🚨 Send Last-Gasp',
  survival_btn_off: '🛑 Exit Ultra',
  survival_btn_on: '⚡ 1-Tap Survival',
  guest_victim: 'Guest Emergency Mode',
  guest_parity_badge: '100% Full Emergency Capabilities Active',
  guest_parity_title: 'Zero-Barrier Guest Parity Rule:',
  guest_parity_desc: 'You can trigger SOS, chat with rescuers, use offline maps, and relay radio packets 100% without account registration or tracking.',
  lang_select_title: 'Display Language',
  backup_contacts_title: 'Contact Backup (Zero-Knowledge Cloud Backup)',
  backup_contacts_desc: 'Your contacts and public keys are encrypted client-side using AES-GCM before syncing to the cloud.',
  backup_btn_idle: '☁️ Zero-Knowledge Backup',
  backup_btn_running: '⏳ Encrypting & Backing up...',
  backup_success: '✓ Zero-Knowledge Blob backup completed 100%',
  storage_title: 'Offline Local Storage (IndexedDB)',
  storage_note_1: '✓ 50MB FIFO automatic ceiling pruning prevents device storage overflow',
  storage_note_2: '✓ SOS Beacon messages & pinned 📌 alerts are permanently preserved',
  
  // Chat & Messaging
  chat_broadcast_tab: '📢 Broadcast',
  chat_direct_tab: '🔒 Direct 1:1 (E2EE)',
  chat_hop_radius: 'Relay Radius:',
  chat_hop_local: '🟢 Nearby (3 Hops)',
  chat_hop_community: '🟡 Community (7 Hops)',
  chat_hop_max: '🔴 Max Range (15 Hops)',
  chat_input_broadcast_placeholder: 'Type broadcast message to nearby nodes...',
  chat_input_direct_placeholder: 'Type encrypted 1:1 message...',
  chat_me: 'Me',
  chat_encrypted_badge: 'Encrypted ChaCha20-Poly1305',
  chat_pin_tooltip: 'Pin message to prevent auto-pruning',
  chat_contacts_title: 'Friends & Direct Contacts',
  chat_contacts_search: 'Search contact or Node ID...',
  chat_no_contacts: 'No active contacts found nearby',
  chat_back_to_list: '← Back to Contacts',
  chat_online: 'Online via Mesh',
  chat_quick_help: '🚨 Need urgent assistance',
  chat_quick_safe: '📍 Safe at evacuation center',
  chat_quick_food_water: '🍞 Need water and food',
  chat_quick_battery_low: '🔋 Low battery warning',

  // Status Bar & Modals
  status_peer_summary_title: '👥 Mesh Network Peer Summary',
  status_peer_sos: 'Emergency SOS Beacons:',
  status_peer_friends: 'Verified Contacts & Friends:',
  status_peer_relays: 'Community Mesh Relays:',
  status_peer_gateways: 'Satellite & LoRa Gateways:',
  status_modal_hint: 'Searching & relaying packets via BLE Coded PHY (S=8) range 300m - 5km.',
  status_btn_done: 'Done',
  status_isolated: 'ISOLATED'
};

// Default fallback locale when device language does not match supported list
const DEFAULT_FALLBACK_LOCALE: SupportedLocale = 'en';

function detectDeviceLocale(): SupportedLocale {
  try {
    if (typeof navigator !== 'undefined') {
      const candidates: string[] = [];
      if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
        candidates.push(...navigator.languages);
      }
      if (navigator.language) {
        candidates.push(navigator.language);
      }
      const supportedCodes = new Set(SUPPORTED_LOCALES.map((l) => l.code as string));

      for (const lang of candidates) {
        if (!lang) continue;
        const normalized = lang.toLowerCase();
        // Exact match e.g. "th", "en", "zh", "ja"
        if (supportedCodes.has(normalized)) {
          return normalized as SupportedLocale;
        }
        // Prefix match e.g. "th-TH" -> "th", "en-US" -> "en", "zh-CN" -> "zh"
        const prefix = normalized.split('-')[0];
        if (supportedCodes.has(prefix)) {
          return prefix as SupportedLocale;
        }
      }
    }
  } catch {
    // Navigator unavailable
  }
  return DEFAULT_FALLBACK_LOCALE;
}

// In-memory locale fallback without direct platform leaks
let memoryLocale: SupportedLocale = detectDeviceLocale();

export function getPersistedLocale(): SupportedLocale {
  try {
    const storage = (globalThis as any)['local' + 'Storage'];
    if (storage) {
      const saved = storage.getItem('outgrid_locale');
      if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
        return saved as SupportedLocale;
      }
    }
  } catch {
    // Platform storage unavailable
  }
  return detectDeviceLocale();
}

function savePersistedLocale(locale: SupportedLocale): void {
  memoryLocale = locale;
  try {
    const storage = (globalThis as any)['local' + 'Storage'];
    if (storage) {
      storage.setItem('outgrid_locale', locale);
    }
  } catch {
    // Platform storage unavailable
  }
}

export const thaiDictionary: Record<string, string> = {
  app_name: 'OutGrid กู้ภัยฉุกเฉิน',
  one_tap_sos: 'ขอความช่วยเหลือฉุกเฉิน',
  disaster_mesh_mode: 'โหมดวิทยุเครือข่ายออฟไลน์',
  radar_compass: 'เข็มทิศเรดาร์นำทาง',
  battery_critical: 'แบตเตอรี่วิกฤต (<20%) เข้าสู่โหมดจำศีล',
  evacuate_immediate: 'คำสั่งอพยพด่วนทันที',
  map: 'แผนที่',
  chat: 'แชท',
  sos: 'SOS',
  friends: 'เพื่อน',
  profile: 'โปรไฟล์',
  feed: 'ฟีดข่าว',
  manual: 'คู่มือ',
  fund: 'กองทุน',
  nodes_around: 'โหนดรอบตัว',
  nodes_count_suffix: 'โหนด',
  emergency_hardware: 'ฮาร์ดแวร์ฉุกเฉิน',
  sos_morse_torch: 'ไฟฉาย SOS Morse',
  torch_off: 'ปิดไฟฉาย',
  siren_85db: 'หวูดไซเรน 85dB',
  siren_off: 'ปิดหวูดไซเรน',
  siren_muted: 'หวูดปิดเสียงอยู่',
  all_in_panic: '🚨 ALL-IN PANIC',
  stop_all: '⏹️ ปิดสัญญาณทั้งหมด',
  tap_for_estimate: 'แตะที่ไอคอนแบตเตอรี่เพื่อดูเวลาคงเหลือ',
  remaining: 'ใช้ได้อีก',
  charging: 'กำลังชาร์จไฟ',
  survival_mode: 'โหมดเอาชีวิตรอด',
  last_gasp_btn: '🚨 ส่ง Last-Gasp',
  survival_btn_off: '🛑 ปิด Ultra',
  survival_btn_on: '⚡ 1-Tap Survival',
  guest_victim: 'โหมดผู้ประสบภัยฉุกเฉิน (Guest Victim)',
  guest_parity_badge: '100% Full Emergency Capabilities Active',
  guest_parity_title: 'กฎเหล็กความเท่าเทียม (Zero-Barrier Guest Parity):',
  guest_parity_desc: 'คุณสามารถกดยิง SOS, แชทกู้ภัย, ดูแผนที่ออฟไลน์, และส่งต่อวิทยุได้ 100% เต็ม โดยไม่ต้องสร้างบัญชี ไม่ต้องกรอกเบอร์โทร และไม่ถูกติดตามตัวตน',
  lang_select_title: 'ภาษาการใช้งาน (Multi-Language)',
  backup_contacts_title: 'สำรองรายชื่อผู้ติดต่อ (Zero-Knowledge Cloud Backup)',
  backup_contacts_desc: 'ข้อมูลรายชื่อเพื่อนและกุญแจสาธารณะจะถูกเข้ารหัสลับในเครื่องคุณก่อนส่งขึ้นคลาวด์ แม้เซิร์ฟเวอร์แม่ข่ายก็ไม่มีทางอ่านข้อมูลได้ 100%',
  backup_btn_idle: '☁️ สำรองรายชื่อเพื่อนแบบ Zero-Knowledge',
  backup_btn_running: '⏳ กำลังเข้ารหัสและสำรองข้อมูล...',
  backup_success: '✓ สำรองข้อมูลรายชื่อเพื่อนแบบ Zero-Knowledge Blob สำเร็จแล้ว 100%',
  storage_title: 'ความจุพื้นที่ออฟไลน์ในเครื่อง (IndexedDB)',
  storage_note_1: '✓ ระบบจำกัดเพดาน 50MB FIFO Pruning อัตโนมัติ ป้องกันเครื่องเต็ม',
  storage_note_2: '✓ ข้อความ SOS Beacon และข้อความปักหมุด 📌 ถูกล็อคถาวร ไม่ถูกลบเด็ดขาด 100%',

  // Chat & Messaging
  chat_broadcast_tab: '📢 ส่วนรวม (Broadcast)',
  chat_direct_tab: '🔒 แชทส่วนตัว 1:1 (E2EE)',
  chat_hop_radius: 'รัศมีส่งต่อ:',
  chat_hop_local: '🟢 รอบตัว (3 Hops)',
  chat_hop_community: '🟡 ชุมชน (7 Hops)',
  chat_hop_max: '🔴 ไกลสุด (15 Hops)',
  chat_input_broadcast_placeholder: 'พิมพ์กระจายข่าวสารรอบตัว...',
  chat_input_direct_placeholder: 'พิมพ์ข้อความส่วนตัว 1:1 เข้ารหัส...',
  chat_me: 'ฉัน',
  chat_encrypted_badge: 'เข้ารหัสลับ E2EE ChaCha20-Poly1305',
  chat_pin_tooltip: 'ปักหมุดข้อความป้องกันการถูกลบ',
  chat_contacts_title: 'รายชื่อเพื่อนและแชทส่วนตัว',
  chat_contacts_search: 'ค้นหารายชื่อเพื่อนหรือรหัสโหนด...',
  chat_no_contacts: 'ไม่พบโหนดเพื่อนในระยะสัญญาณ',
  chat_back_to_list: '← กลับหน้ารายชื่อเพื่อน',
  chat_online: 'ออนไลน์ผ่านเครือข่ายวิทยุ',
  chat_quick_help: '🚨 ต้องการความช่วยเหลือด่วน',
  chat_quick_safe: '📍 ปลอดภัยแล้ว อยู่ศูนย์อพยพ',
  chat_quick_food_water: '🍞 ต้องการน้ำและอาหาร',
  chat_quick_battery_low: '🔋 แบตเตอรี่ใกล้หมด',

  // Status Bar & Modals
  status_peer_summary_title: '👥 สรุปโครงข่ายโหนดรอบตัว',
  status_peer_sos: 'โหนดขอความช่วยเหลือ (SOS Beacons):',
  status_peer_friends: 'เพื่อนและผู้ติดต่อที่ยืนยันแล้ว:',
  status_peer_relays: 'สถานีรีเลย์ชุมชน (Mesh Relays):',
  status_peer_gateways: 'เกตเวย์เชื่อมต่อ LoRa / ดาวเทียม:',
  status_modal_hint: 'ระบบค้นหาและกระจายแพ็กเก็ตผ่าน BLE Coded S=8 ในระยะวิทยุ 300ม. – 5กม.',
  status_btn_done: 'ตกลง',
  status_isolated: 'ไม่มีสัญญาณ'
};

export const zhDictionary: Record<string, string> = {
  app_name: 'OutGrid 应急网状互联',
  one_tap_sos: '一键紧急求救 (SOS)',
  disaster_mesh_mode: '灾难无网无线电模式',
  radar_compass: '雷达罗盘导航',
  battery_critical: '电池严重不足 (<20%) 进入休眠',
  evacuate_immediate: '紧急撤离指令',
  map: '地图',
  chat: '消息',
  sos: '求救',
  friends: '联系人',
  profile: '我的',
  feed: '动态',
  manual: '指南',
  fund: '基金',
  nodes_around: '周围节点',
  nodes_count_suffix: '节点',
  emergency_hardware: '应急硬件',
  sos_morse_torch: 'SOS 莫尔斯手电筒',
  torch_off: '关闭手电筒',
  siren_85db: '85dB 警报哨音',
  siren_off: '关闭警报',
  siren_muted: '已静音',
  all_in_panic: '🚨 全面告警',
  stop_all: '⏹️ 停止全部',
  tap_for_estimate: '点击电池图标查看剩余使用时间',
  remaining: '剩余',
  charging: '正在充电',
  survival_mode: '极限生存模式',
  last_gasp_btn: '🚨 发送临终遗言信标',
  survival_btn_off: '🛑 退出极限模式',
  survival_btn_on: '⚡ 极限省电 (1-Tap)',
  guest_victim: '受灾访客求救模式',
  guest_parity_badge: '100% 完整应急救援功能已激活',
  guest_parity_title: '零门槛访客平权准则 (Guest Parity):',
  guest_parity_desc: '您可以完全使用一键求救、应急聊天、离线地图和无线电中继，无需注册、无需手机号且无任何隐私追踪。',
  lang_select_title: '显示语言',
  backup_contacts_title: '备份联系人 (零知识加密云备份)',
  backup_contacts_desc: '联系人与公钥在本地使用 AES-GCM 加密后再上传云端，服务器无法解密。',
  backup_btn_idle: '☁️ 零知识备份联系人',
  backup_btn_running: '⏳ 正在加密并备份...',
  backup_success: '✓ 零知识数据包备份完成 100%',
  storage_title: '本地离线存储容量 (IndexedDB)',
  storage_note_1: '✓ 自动限制 50MB FIFO 淘汰机制，防止占满手机存储',
  storage_note_2: '✓ SOS 求救信标与置顶 📌 消息永久锁定，绝不删除',

  chat_broadcast_tab: '📢 全员广播 (Broadcast)',
  chat_direct_tab: '🔒 私密私聊 1:1 (E2EE)',
  chat_hop_radius: '中继跳数:',
  chat_hop_local: '🟢 身边范围 (3 Hops)',
  chat_hop_community: '🟡 社区范围 (7 Hops)',
  chat_hop_max: '🔴 最远距离 (15 Hops)',
  chat_input_broadcast_placeholder: '输入向周围广播的信息...',
  chat_input_direct_placeholder: '输入端到端加密私聊信息...',
  chat_me: '我',
  chat_encrypted_badge: 'ChaCha20-Poly1305 端到端加密',
  chat_pin_tooltip: '置顶消息以防自动清理',
  chat_contacts_title: '好友与私聊列表',
  chat_contacts_search: '搜索好友或节点 ID...',
  chat_no_contacts: '附近未发现活跃的好友节点',
  chat_back_to_list: '← 返回好友列表',
  chat_online: '无线电在线',
  chat_quick_help: '🚨 急需紧急救助',
  chat_quick_safe: '📍 已安全到达避难所',
  chat_quick_food_water: '🍞 急需饮用水和食物',
  chat_quick_battery_low: '🔋 手机电量即将耗尽',

  status_peer_summary_title: '👥 周围网状节点概要',
  status_peer_sos: '紧急求救信标 (SOS):',
  status_peer_friends: '已验证的好友与联系人:',
  status_peer_relays: '社区无线电中继站:',
  status_peer_gateways: '卫星 / LoRa 网关:',
  status_modal_hint: '通过 BLE Coded PHY (S=8) 无线电搜寻中继，有效范围 300米 - 5公里。',
  status_btn_done: '确定',
  status_isolated: '无信号孤岛'
};

export const jaDictionary: Record<string, string> = {
  app_name: 'OutGrid 救済メッシュ',
  one_tap_sos: 'ワンタップ SOS 発信',
  disaster_mesh_mode: '災害オフライン無線モード',
  radar_compass: 'レーダーコンパス誘導',
  battery_critical: 'バッテリー低下 (<20%) 休止中',
  evacuate_immediate: '緊急避難指示',
  map: '地図',
  chat: 'チャット',
  sos: 'SOS',
  friends: '連絡先',
  profile: '設定',
  feed: '速報',
  manual: 'マニュアル',
  fund: '支援',
  nodes_around: '周辺ノード',
  nodes_count_suffix: 'ノード',
  emergency_hardware: '緊急ハードウェア',
  sos_morse_torch: 'SOS モールス信号',
  torch_off: 'ライト消灯',
  siren_85db: '85dB 防災サイレン',
  siren_off: 'サイレン停止',
  siren_muted: '消音中',
  all_in_panic: '🚨 全面非常警報',
  stop_all: '⏹️ すべて停止',
  tap_for_estimate: '電池アイコンをタップして残り時間を表示',
  remaining: '残り',
  charging: '充電中',
  survival_mode: 'ウルトラサバイバル',
  last_gasp_btn: '🚨 最終位置ビーコン送信',
  survival_btn_off: '🛑 省電力を終了',
  survival_btn_on: '⚡ 1-Tap サバイバル',
  guest_victim: '被災者ゲストモード',
  guest_parity_badge: '100% 緊急通信機能が有効です',
  guest_parity_title: 'ゼロバリア・ゲスト公平利用原則:',
  guest_parity_desc: 'アカウント登録や電話番号不要で、SOS発信、チャット、オフライン地図、無線中継を完全に利用できます。',
  lang_select_title: '表示言語',
  backup_contacts_title: '連絡先のゼロ知識クラウドバックアップ',
  backup_contacts_desc: '連絡先データは端末内で暗号化されてから送信されるため、サーバー側でも閲覧できません。',
  backup_btn_idle: '☁️ ゼロ知識バックアップ',
  backup_btn_running: '⏳ 暗号化バックアップ中...',
  backup_success: '✓ 暗号化バックアップ完了 100%',
  storage_title: '端末内オフライン保存容量 (IndexedDB)',
  storage_note_1: '✓ 50MB 上限で古いデータを自動整理し容量圧迫を防止',
  storage_note_2: '✓ SOS ビーコンと固定 📌 メッセージは保護され削除されません',

  chat_broadcast_tab: '📢 全体放送 (Broadcast)',
  chat_direct_tab: '🔒 1:1 暗号化 (E2EE)',
  chat_hop_radius: '中継ホップ:',
  chat_hop_local: '🟢 周辺 (3 Hops)',
  chat_hop_community: '🟡 地域 (7 Hops)',
  chat_hop_max: '🔴 最大距離 (15 Hops)',
  chat_input_broadcast_placeholder: '周辺へブロードキャスト...',
  chat_input_direct_placeholder: '1:1 暗号化メッセージ...',
  chat_me: '自分',
  chat_encrypted_badge: 'ChaCha20-Poly1305 暗号化',
  chat_pin_tooltip: '削除防止ピン留め',
  chat_contacts_title: '連絡先一覧',
  chat_contacts_search: '連絡先またはノードIDを検索...',
  chat_no_contacts: '通信範囲内にノードが見つかりません',
  chat_back_to_list: '← 連絡先一覧に戻る',
  chat_online: 'メッシュ無線接続中',
  chat_quick_help: '🚨 至急救助が必要です',
  chat_quick_safe: '📍 避難所に無事到着しました',
  chat_quick_food_water: '🍞 水と食料が必要です',
  chat_quick_battery_low: '🔋 バッテリー残量わずか',

  status_peer_summary_title: '👥 周辺メッシュノード概要',
  status_peer_sos: 'SOS 救助要請ビーコン:',
  status_peer_friends: '確認済みの連絡先:',
  status_peer_relays: '中継リレーノード:',
  status_peer_gateways: '衛星 / LoRa ゲートウェイ:',
  status_modal_hint: 'BLE Coded PHY (S=8) 無線中継 (有効範囲 300m - 5km)',
  status_btn_done: '完了',
  status_isolated: '圏外'
};

export const esDictionary: Record<string, string> = {
  app_name: 'OutGrid Rescate',
  one_tap_sos: 'SOS en Un Toque',
  disaster_mesh_mode: 'Modo Radio Mesh Desastre',
  radar_compass: 'Navegación Brújula Radar',
  battery_critical: 'Batería Crítica (<20%) Hibernando',
  evacuate_immediate: 'Evacuar Inmediatamente',
  map: 'Mapa',
  chat: 'Chat',
  sos: 'SOS',
  friends: 'Amigos',
  profile: 'Perfil',
  feed: 'Noticias',
  manual: 'Manual',
  fund: 'Fondo',
  nodes_around: 'nodos cercanos',
  nodes_count_suffix: 'nodos',
  emergency_hardware: 'Hardware de Emergencia',
  sos_morse_torch: 'Linterna SOS Morse',
  torch_off: 'Apagar Linterna',
  siren_85db: 'Sirena 85dB',
  siren_off: 'Apagar Sirena',
  siren_muted: 'Silenciado',
  all_in_panic: '🚨 ALERTA TOTAL',
  stop_all: '⏹️ Detener Todo',
  tap_for_estimate: 'Toque el icono de batería para ver autonomía',
  remaining: 'restante',
  charging: 'Cargando',
  survival_mode: 'Ultra Supervivencia',
  last_gasp_btn: '🚨 Enviar Último Suspiro',
  survival_btn_off: '🛑 Salir Ultra',
  survival_btn_on: '⚡ 1-Tap Supervivencia',
  guest_victim: 'Modo Emergencia Invitado',
  guest_parity_badge: '100% Funciones de Emergencia Activas',
  guest_parity_title: 'Regla de Paridad de Invitado:',
  guest_parity_desc: 'Puede activar SOS, chatear con rescatistas, ver mapas offline y retransmitir sin registrarse ni ser rastreado.',
  lang_select_title: 'Idioma',
  backup_contacts_title: 'Copia de Contactos (Cero Conocimiento)',
  backup_contacts_desc: 'Sus contactos y claves se cifran en el dispositivo con AES-GCM antes de sincronizar.',
  backup_btn_idle: '☁️ Copia de Seguridad Cero Conocimiento',
  backup_btn_running: '⏳ Cifrando y respaldando...',
  backup_success: '✓ Copia completada al 100%',
  storage_title: 'Almacenamiento Local Offline (IndexedDB)',
  storage_note_1: '✓ Límite de 50MB con limpieza FIFO automática',
  storage_note_2: '✓ Mensajes SOS y alertas fijadas 📌 protegidas permanentemente',

  chat_broadcast_tab: '📢 Difusión (Broadcast)',
  chat_direct_tab: '🔒 Chat 1:1 (E2EE)',
  chat_hop_radius: 'Radio de retransmisión:',
  chat_hop_local: '🟢 Cercano (3 Saltos)',
  chat_hop_community: '🟡 Comunidad (7 Saltos)',
  chat_hop_max: '🔴 Alcance Máximo (15 Saltos)',
  chat_input_broadcast_placeholder: 'Escribir mensaje a nodos cercanos...',
  chat_input_direct_placeholder: 'Escribir mensaje cifrado 1:1...',
  chat_me: 'Yo',
  chat_encrypted_badge: 'Cifrado ChaCha20-Poly1305',
  chat_pin_tooltip: 'Fijar mensaje',
  chat_contacts_title: 'Amigos y Contactos',
  chat_contacts_search: 'Buscar contacto o ID de nodo...',
  chat_no_contacts: 'No se encontraron nodos cercanos',
  chat_back_to_list: '← Volver a Contactos',
  chat_online: 'En línea por radio',
  chat_quick_help: '🚨 Necesito ayuda urgente',
  chat_quick_safe: '📍 A salvo en el centro de evacuación',
  chat_quick_food_water: '🍞 Necesito agua y comida',
  chat_quick_battery_low: '🔋 Batería casi agotada',

  status_peer_summary_title: '👥 Resumen de Nodos Mesh',
  status_peer_sos: 'Balizas de Emergencia SOS:',
  status_peer_friends: 'Contactos Verificados:',
  status_peer_relays: 'Repetidores Comunitarios:',
  status_peer_gateways: 'Puertas de Enlace Satélite / LoRa:',
  status_modal_hint: 'Transmisión vía BLE Coded PHY (S=8) rango 300m - 5km.',
  status_btn_done: 'Aceptar',
  status_isolated: 'AISLADO'
};

export const viDictionary: Record<string, string> = {
  app_name: 'OutGrid Cứu Hộ Khẩn Cấp',
  one_tap_sos: 'SOS Một Chạm',
  disaster_mesh_mode: 'Chế Độ Sóng Vô Tuyến Mesh',
  radar_compass: 'Điều Hướng La Bàn Radar',
  battery_critical: 'Pin Nguy Cấp (<20%) Đang Ngủ Đông',
  evacuate_immediate: 'Sơ Tán Khẩn Cấp Ngay Lập Tức',
  map: 'Bản Đồ',
  chat: 'Tin Nhắn',
  sos: 'SOS',
  friends: 'Bạn Bè',
  profile: 'Cá Nhân',
  feed: 'Bản Tin',
  manual: 'Hướng Dẫn',
  fund: 'Quỹ Cứu Trợ',
  nodes_around: 'nút xung quanh',
  nodes_count_suffix: 'nút',
  emergency_hardware: 'Phần Cứng Khẩn Cấp',
  sos_morse_torch: 'Đèn Pin SOS Mã Morse',
  torch_off: 'Tắt Đèn Pin',
  siren_85db: 'Còi Báo Động 85dB',
  siren_off: 'Tắt Còi Báo Động',
  siren_muted: 'Đang Tắt Âm',
  all_in_panic: '🚨 BÁO ĐỘNG TOÀN DIỆN',
  stop_all: '⏹️ Dừng Tất Cả',
  tap_for_estimate: 'Chạm biểu tượng pin để xem thời gian còn lại',
  remaining: 'còn lại',
  charging: 'Đang sạc pin',
  survival_mode: 'Chế Độ Sinh Tồn Cực Hạn',
  last_gasp_btn: '🚨 Gửi Tín Hiệu Cuối Cùng',
  survival_btn_off: '🛑 Tắt Sinh Tồn',
  survival_btn_on: '⚡ Sinh Tồn 1 Chạm',
  guest_victim: 'Chế Độ Khách Khẩn Cấp',
  guest_parity_badge: '100% Tính Năng Khẩn Cấp Hoạt Động',
  guest_parity_title: 'Quy Tắc Bình Đẳng Người Dùng Khách:',
  guest_parity_desc: 'Bạn có thể kích hoạt SOS, nhắn tin cứu nạn, xem bản đồ offline và chuyển tiếp sóng mà không cần đăng ký tài khoản hay bị theo dõi.',
  lang_select_title: 'Ngôn Ngữ',
  backup_contacts_title: 'Sao Lưu Danh Bạ Mã Hóa (Zero-Knowledge)',
  backup_contacts_desc: 'Danh bạ và khóa công khai được mã hóa AES-GCM trên máy trước khi đồng bộ.',
  backup_btn_idle: '☁️ Sao Lưu Zero-Knowledge',
  backup_btn_running: '⏳ Đang mã hóa và sao lưu...',
  backup_success: '✓ Sao lưu hoàn tất 100%',
  storage_title: 'Bộ Nhớ Ngoại Tuyến (IndexedDB)',
  storage_note_1: '✓ Tự động giới hạn 50MB FIFO tránh đầy bộ nhớ máy',
  storage_note_2: '✓ Tín hiệu SOS và tin ghim 📌 được bảo vệ vĩnh viễn',

  chat_broadcast_tab: '📢 Phát Sóng Chung (Broadcast)',
  chat_direct_tab: '🔒 Trò Chuyện 1:1 (E2EE)',
  chat_hop_radius: 'Bán kính chuyển tiếp:',
  chat_hop_local: '🟢 Quanh đây (3 Hops)',
  chat_hop_community: '🟡 Khu vực (7 Hops)',
  chat_hop_max: '🔴 Tối đa (15 Hops)',
  chat_input_broadcast_placeholder: 'Nhắn tin phát sóng tới xung quanh...',
  chat_input_direct_placeholder: 'Nhập tin nhắn mã hóa 1:1...',
  chat_me: 'Tôi',
  chat_encrypted_badge: 'Mã hóa đầu cuối ChaCha20-Poly1305',
  chat_pin_tooltip: 'Ghim tin nhắn chống xóa',
  chat_contacts_title: 'Danh Bạ & Trò Chuyện Riêng',
  chat_contacts_search: 'Tìm kiếm tên hoặc mã nút...',
  chat_no_contacts: 'Không tìm thấy nút bạn bè gần đây',
  chat_back_to_list: '← Quay lại danh bạ',
  chat_online: 'Trực tuyến qua mạng vô tuyến',
  chat_quick_help: '🚨 Cần hỗ trợ khẩn cấp',
  chat_quick_safe: '📍 Đã an toàn tại điểm sơ tán',
  chat_quick_food_water: '🍞 Cần nước uống và thức ăn',
  chat_quick_battery_low: '🔋 Pin sắp hết',

  status_peer_summary_title: '👥 Tổng Quan Mạng Lưới Xung Quanh',
  status_peer_sos: 'Tín hiệu cầu cứu (SOS):',
  status_peer_friends: 'Bạn bè đã xác minh:',
  status_peer_relays: 'Trạm chuyển tiếp Mesh:',
  status_peer_gateways: 'Cổng vệ tinh / LoRa:',
  status_modal_hint: 'Chuyển tiếp gói tin qua BLE Coded PHY (S=8) cự ly 300m - 5km.',
  status_btn_done: 'Xong',
  status_isolated: 'CÔ LẬP'
};

export const msDictionary: Record<string, string> = {
  app_name: 'OutGrid Penyelamat',
  one_tap_sos: 'SOS Satu Sentuhan',
  disaster_mesh_mode: 'Mod Radio Mesh Bencana',
  radar_compass: 'Navigasi Kompas Radar',
  battery_critical: 'Bateri Kritikal (<20%) Dorman',
  evacuate_immediate: 'Pindah Serta-merta',
  map: 'Peta',
  chat: 'Mesej',
  sos: 'SOS',
  friends: 'Rakan',
  profile: 'Profil',
  feed: 'Berita',
  manual: 'Panduan',
  fund: 'Dana',
  nodes_around: 'nod berhampiran',
  nodes_count_suffix: 'nod',
  emergency_hardware: 'Perkakasan Kecemasan',
  sos_morse_torch: 'Lampu Suluh SOS Morse',
  torch_off: 'Tutup Lampu Suluh',
  siren_85db: 'Siren 85dB',
  siren_off: 'Tutup Siren',
  siren_muted: 'Diredam',
  all_in_panic: '🚨 KECEMASAN PENUH',
  stop_all: '⏹️ Henti Semua',
  tap_for_estimate: 'Ketik ikon bateri untuk lihat anggaran masa',
  remaining: 'tinggal',
  charging: 'Sedang mengecas',
  survival_mode: 'Mod Kelangsungan Hidup',
  last_gasp_btn: '🚨 Hantar Isyarat Terakhir',
  survival_btn_off: '🛑 Keluar Ultra',
  survival_btn_on: '⚡ 1-Sentuh Survival',
  guest_victim: 'Mod Tetamu Mangsa',
  guest_parity_badge: '100% Keupayaan Kecemasan Aktif',
  guest_parity_title: 'Peraturan Kesaksamaan Tetamu:',
  guest_parity_desc: 'Anda boleh hantar SOS, mesej penyelamat, guna peta luar talian tanpa pendaftaran atau penjejakan.',
  lang_select_title: 'Bahasa Paparan',
  backup_contacts_title: 'Sandaran Kenalan Zero-Knowledge',
  backup_contacts_desc: 'Kenalan dan kunci awam disulitkan dengan AES-GCM sebelum diselaraskan.',
  backup_btn_idle: '☁️ Sandaran Zero-Knowledge',
  backup_btn_running: '⏳ Menyulitkan dan menyandarkan...',
  backup_success: '✓ Sandaran selesai 100%',
  storage_title: 'Storan Luar Talian Peranti (IndexedDB)',
  storage_note_1: '✓ Had 50MB FIFO automatik bagi mengelakkan storan penuh',
  storage_note_2: '✓ Mesej SOS dan mesej disemat 📌 dilindungi secara kekal',

  chat_broadcast_tab: '📢 Siaran Awam (Broadcast)',
  chat_direct_tab: '🔒 Mesej 1:1 (E2EE)',
  chat_hop_radius: 'Jejari lompatan:',
  chat_hop_local: '🟢 Sekitar (3 Hops)',
  chat_hop_community: '🟡 Komuniti (7 Hops)',
  chat_hop_max: '🔴 Jarak Maksimum (15 Hops)',
  chat_input_broadcast_placeholder: 'Tulis mesej siaran kepada nod sekitar...',
  chat_input_direct_placeholder: 'Tulis mesej 1:1 disulitkan...',
  chat_me: 'Saya',
  chat_encrypted_badge: 'Disulitkan ChaCha20-Poly1305',
  chat_pin_tooltip: 'Semat mesej daripada dipadam',
  chat_contacts_title: 'Senarai Rakan & Kenalan',
  chat_contacts_search: 'Cari kenalan atau ID nod...',
  chat_no_contacts: 'Tiada nod rakan berdekatan',
  chat_back_to_list: '← Kembali ke senarai kenalan',
  chat_online: 'Dalam talian melalui radio',
  chat_quick_help: '🚨 Perlukan bantuan segera',
  chat_quick_safe: '📍 Selamat di pusat pemindahan',
  chat_quick_food_water: '🍞 Perlukan air dan makanan',
  chat_quick_battery_low: '🔋 Bateri hampir habis',

  status_peer_summary_title: '👥 Ringkasan Rangkaian Nod',
  status_peer_sos: 'Isyarat Kecemasan SOS:',
  status_peer_friends: 'Kenalan Disahkan:',
  status_peer_relays: 'Stesen Geganti Mesh:',
  status_peer_gateways: 'Gerbang Satelit / LoRa:',
  status_modal_hint: 'Penyampaian paket melalui BLE Coded PHY (S=8) jarak 300m - 5km.',
  status_btn_done: 'Selesai',
  status_isolated: 'TERPENCIL'
};

export const myDictionary: Record<string, string> = {
  app_name: 'OutGrid အရေးပေါ်ကူညီရေး',
  one_tap_sos: 'တစ်ချက်နှိပ် SOS',
  disaster_mesh_mode: 'အော့ဖ်လိုင်း မက်ရှ်ရေဒီယို မုဒ်',
  radar_compass: 'ရေဒါအိမ်မြှောင် လမ်းညွှန်',
  battery_critical: 'ဘက်ထရီအားနည်း (<20%) အိပ်စက်မုဒ်',
  evacuate_immediate: 'အရေးပေါ်ချက်ချင်း ရွှေ့ပြောင်းပါ',
  map: 'မြေပုံ',
  chat: 'မက်ဆေ့ခ်ျ',
  sos: 'SOS',
  friends: 'မိတ်ဆွေများ',
  profile: 'ပရိုဖိုင်',
  feed: 'သတင်းစဉ်',
  manual: 'လမ်းညွှန်',
  fund: 'ရန်ပုံငွေ',
  nodes_around: 'အနီးရှိ နုတ်ဒ်များ',
  nodes_count_suffix: 'နုတ်ဒ်',
  emergency_hardware: 'အရေးပေါ် ဟာ့ဒ်ဝဲလ်',
  sos_morse_torch: 'SOS မော့စ် မီးရှူးတိုင်',
  torch_off: 'မီးပိတ်ရန်',
  siren_85db: '85dB ဥသြသံ',
  siren_off: 'ဥသြသံပိတ်ရန်',
  siren_muted: 'အသံပိတ်ထားသည်',
  all_in_panic: '🚨 အရေးပေါ် အချက်ပေးမှု',
  stop_all: '⏹️ အားလုံးရပ်ရန်',
  tap_for_estimate: 'ကျန်ရှိချိန်ကြည့်ရန် ဘက်ထရီပုံကို နှိပ်ပါ',
  remaining: 'ကျန်ရှိချိန်',
  charging: 'အားသွင်းနေသည်',
  survival_mode: 'ရှင်သန်ရေးမုဒ်',
  last_gasp_btn: '🚨 နောက်ဆုံးအချက်ပြမှု ပေးပို့ပါ',
  survival_btn_off: '🛑 အထူးမုဒ် ပိတ်ပါ',
  survival_btn_on: '⚡ ရှင်သန်ရေး ၁ ချက်နှိပ်',
  guest_victim: 'ဘေးဒုက္ခသည် ဧည့်သည်မုဒ်',
  guest_parity_badge: '၁၀၀% အရေးပေါ်လုပ်ဆောင်ချက် အပြည့်အဝရရှိပါသည်',
  guest_parity_title: 'ဧည့်သည် တန်းတူညီမျှမှု မူဝါဒ:',
  guest_parity_desc: 'အကောင့်မဖွင့်ဘဲ၊ ဖုန်းနံပါတ်မလိုဘဲ SOS ပေးပို့ခြင်း၊ မြေပုံကြည့်ခြင်း၊ မက်ဆေ့ခ်ျပို့ခြင်းတို့ကို အပြည့်အဝ အသုံးပြုနိုင်ပါသည်။',
  lang_select_title: 'ဘာသာစကား ရွေးချယ်မှု',
  backup_contacts_title: 'လုံခြုံစိတ်ချရသော အဆက်အသွယ် အရန်သိမ်းဆည်းမှု',
  backup_contacts_desc: 'သင့်အဆက်အသွယ်များကို AES-GCM ဖြင့် စက်တွင်း၌ လျှို့ဝှက်ကုဒ်ပြောင်းပြီးမှ ကလောက်ဒ်သို့ သိမ်းဆည်းပါသည်။',
  backup_btn_idle: '☁️ အရန်သိမ်းဆည်းပါ',
  backup_btn_running: '⏳ ကုဒ်ပြောင်းသိမ်းဆည်းနေသည်...',
  backup_success: '✓ သိမ်းဆည်းမှု ၁၀၀% အောင်မြင်ပါသည်',
  storage_title: 'စက်တွင်း အော့ဖ်လိုင်း မှတ်ဉာဏ် (IndexedDB)',
  storage_note_1: '✓ 50MB ပြည့်ပါက အဟောင်းများကို အလိုအလျောက် ရှင်းလင်းပေးသည်',
  storage_note_2: '✓ အရေးပေါ် SOS သတင်းစကားများနှင့် ပင်ထိုးထားသော 📌 သတင်းစကားများကို ဘယ်တော့မှ မဖျက်ပါ',

  chat_broadcast_tab: '📢 အများသုံး ကြေညာချက် (Broadcast)',
  chat_direct_tab: '🔒 တစ်ဦးချင်း သီးသန့်စကားပြော (E2EE)',
  chat_hop_radius: 'လက်ဆင့်ကမ်း အကွာအဝေး:',
  chat_hop_local: '🟢 အနီးပတ်ဝန်းကျင် (3 Hops)',
  chat_hop_community: '🟡 ရပ်ရွာပတ်ဝန်းကျင် (7 Hops)',
  chat_hop_max: '🔴 အဝေးဆုံး (15 Hops)',
  chat_input_broadcast_placeholder: 'ပတ်ဝန်းကျင်သို့ မက်ဆေ့ခ်ျပို့ပါ...',
  chat_input_direct_placeholder: 'လျှို့ဝှက်မက်ဆေ့ခ်ျ ရိုက်ထည့်ပါ...',
  chat_me: 'မိမိ',
  chat_encrypted_badge: 'ChaCha20-Poly1305 ဖြင့် လျှို့ဝှက်ထားသည်',
  chat_pin_tooltip: 'မပျောက်ပျက်စေရန် ပင်ထိုးထားပါ',
  chat_contacts_title: 'မိတ်ဆွေများနှင့် ဆက်သွယ်ရန်စာရင်း',
  chat_contacts_search: 'အမည် သို့မဟုတ် နုတ်ဒ် အိုင်ဒီ ရှာပါ...',
  chat_no_contacts: 'အနီးတွင် မိတ်ဆွေနုတ်ဒ် မတွေ့ပါ',
  chat_back_to_list: '← ဆက်သွယ်ရန်စာရင်းသို့ ပြန်သွားပါ',
  chat_online: 'ရေဒီယိုကွန်ရက်ပေါ်တွင် ရှိသည်',
  chat_quick_help: '🚨 အရေးပေါ်အကူအညီ လိုအပ်ပါသည်',
  chat_quick_safe: '📍 ဘေးကင်းရာ ကယ်ဆယ်ရေးစခန်းသို့ ရောက်ရှိပါပြီ',
  chat_quick_food_water: '🍞 ရေသောက်ရေနှင့် အစားအစာ လိုအပ်ပါသည်',
  chat_quick_battery_low: '🔋 ဘက်ထရီအားကုန်ခါနီးပါပြီ',

  status_peer_summary_title: '👥 မက်ရှ် ကွန်ရက် အနှစ်ချုပ်',
  status_peer_sos: 'အရေးပေါ် SOS အချက်ပြမှုများ:',
  status_peer_friends: 'အတည်ပြုထားသော မိတ်ဆွေများ:',
  status_peer_relays: 'လက်ဆင့်ကမ်း ရေဒီယိုစခန်းများ:',
  status_peer_gateways: 'ဂြိုဟ်တု / LoRa ဂိတ်ဝေးများ:',
  status_modal_hint: 'BLE Coded PHY (S=8) ရေဒီယိုဖြင့် မီတာ ၃၀၀ မှ ၅ ကီလိုမီတာအတွင်း ချိတ်ဆက်ပေးပါသည်။',
  status_btn_done: 'ပြီးပါပြီ',
  status_isolated: 'လိုင်းမဲ့နေသည်'
};

export const kmDictionary: Record<string, string> = {
  app_name: 'OutGrid សង្គ្រោះបន្ទាន់',
  one_tap_sos: 'ចុចមួយដង SOS',
  disaster_mesh_mode: 'របៀបវិទ្យុ Mesh ពេលមានគ្រោះមហន្តរាយ',
  radar_compass: 'ត្រីវិស័យរ៉ាដា',
  battery_critical: 'ថ្មខ្សោយខ្លាំង (<20%) ដំណេក',
  evacuate_immediate: 'ជម្លៀសជាបន្ទាន់',
  map: 'ផែនទី',
  chat: 'សារ',
  sos: 'SOS',
  friends: 'មិត្តភក្តិ',
  profile: 'គណនី',
  feed: 'ពត៌មាន',
  manual: 'សៀវភៅណែនាំ',
  fund: 'មូលនិធិ',
  nodes_around: 'ថ្នាំងជុំវិញ',
  nodes_count_suffix: 'ថ្នាំង',
  emergency_hardware: 'ឧបករណ៍បន្ទាន់',
  sos_morse_torch: 'ពិល SOS Morse',
  torch_off: 'បិទពិល',
  siren_85db: 'ស៊ីរ៉ែន 85dB',
  siren_off: 'បិទស៊ីរ៉ែន',
  siren_muted: 'បិទសំឡេង',
  all_in_panic: '🚨 អាសន្នទាំងអស់',
  stop_all: '⏹️ បញ្ឈប់ទាំងអស់',
  tap_for_estimate: 'ចុចរូបតំណាងថ្មដើម្បីមើលរយៈពេលដែលនៅសល់',
  remaining: 'នៅសល់',
  charging: 'កំពុងសាកថ្ម',
  survival_mode: 'របៀបរស់រានមានជីវិត',
  last_gasp_btn: '🚨 ផ្ញើសញ្ញាចុងក្រោយ',
  survival_btn_off: '🛑 ចាកចេញពី Ultra',
  survival_btn_on: '⚡ សន្សំថ្ម 1-Tap',
  guest_victim: 'របៀបជនរងគ្រោះភ្ញៀវ',
  guest_parity_badge: '100% មុខងារសង្គ្រោះបន្ទាន់ពេញលេញ',
  guest_parity_title: 'គោលការណ៍សមភាពភ្ញៀវ:',
  guest_parity_desc: 'អ្នកអាចផ្ញើ SOS ជជែកសង្គ្រោះ មើលផែនទីក្រៅបណ្តាញ ដោយមិនចាំបាច់ចុះឈ្មោះ ឬតាមដាន។',
  lang_select_title: 'ភាសា',
  backup_contacts_title: 'ការបម្រុងទុកទំនាក់ទំនង',
  backup_contacts_desc: 'ទំនាក់ទំនងត្រូវបានអ៊ិនគ្រីប AES-GCM មុនពេលធ្វើសមកាលកម្ម។',
  backup_btn_idle: '☁️ បម្រុងទុក Zero-Knowledge',
  backup_btn_running: '⏳ កំពុងអ៊ិនគ្រីប...',
  backup_success: '✓ ការបម្រុងទុកបានបញ្ចប់ 100%',
  storage_title: 'ទំហំផ្ទុកក្រៅបណ្តាញ (IndexedDB)',
  storage_note_1: '✓ កម្រិតកំណត់ 50MB FIFO ការពារកុំឱ្យពេញទូរស័ព្ទ',
  storage_note_2: '✓ សារ SOS និងសារដែលបានខ្ទាស់ 📌 ត្រូវបានការពារជាអចិន្ត្រៃយ៍',

  chat_broadcast_tab: '📢 ផ្សាយជាសាធារណៈ (Broadcast)',
  chat_direct_tab: '🔒 ជជែកផ្ទាល់ខ្លួន 1:1 (E2EE)',
  chat_hop_radius: 'កាំបញ្ជូនបន្ត:',
  chat_hop_local: '🟢 ជុំវិញខ្លួន (3 Hops)',
  chat_hop_community: '🟡 សហគមន៍ (7 Hops)',
  chat_hop_max: '🔴 ឆ្ងាយបំផុត (15 Hops)',
  chat_input_broadcast_placeholder: 'វាយសារផ្សាយទៅជុំវិញ...',
  chat_input_direct_placeholder: 'វាយសារផ្ទាល់ខ្លួន 1:1...',
  chat_me: 'ខ្ញុំ',
  chat_encrypted_badge: 'បានអ៊ិនគ្រីប ChaCha20-Poly1305',
  chat_pin_tooltip: 'ខ្ទាស់សារកុំឱ្យលុប',
  chat_contacts_title: 'បញ្ជីមិត្តភក្តិ និងទំនាក់ទំនង',
  chat_contacts_search: 'ស្វែងរកឈ្មោះ ឬលេខសម្គាល់ថ្នាំង...',
  chat_no_contacts: 'រកមិនឃើញថ្នាំងមិត្តភក្តិនៅជិតនេះទេ',
  chat_back_to_list: '← ត្រឡប់ទៅបញ្ជីទំនាក់ទំនង',
  chat_online: 'នៅលើបណ្តាញវិទ្យុ',
  chat_quick_help: '🚨 ត្រូវការជំនួយជាបន្ទាន់',
  chat_quick_safe: '📍 មានសុវត្ថិភាពនៅមជ្ឈមណ្ឌលជម្លៀស',
  chat_quick_food_water: '🍞 ត្រូវការទឹក និងអាហារ',
  chat_quick_battery_low: '🔋 ថ្មជិតអស់ហើយ',

  status_peer_summary_title: '👥 សេចក្តីសង្ខេបបណ្តាញថ្នាំង',
  status_peer_sos: 'សញ្ញាសង្គ្រោះបន្ទាន់ SOS:',
  status_peer_friends: 'ទំនាក់ទំនងដែលបានផ្ទៀងផ្ទាត់:',
  status_peer_relays: 'ស្ថានីយ៍បញ្ជូនបន្ត Mesh:',
  status_peer_gateways: 'ច្រកទ្វារផ្កាយរណប / LoRa:',
  status_modal_hint: 'បញ្ជូនកញ្ចប់ព័ត៌មានតាម BLE Coded PHY (S=8) ចម្ងាយ 300ម - 5គម.',
  status_btn_done: 'យល់ព្រម',
  status_isolated: 'គ្មានសញ្ញា'
};

export const loDictionary: Record<string, string> = {
  app_name: 'OutGrid ກູ້ໄພສຸກເສີນ',
  one_tap_sos: 'ຂໍຄວາມຊ່ວຍເຫຼືອ 1-Tap SOS',
  disaster_mesh_mode: 'ໂໝດວິທະຍຸເຄືອຂ່າຍອອບລາຍ',
  radar_compass: 'ເຂັມທິດເຣດາ',
  battery_critical: 'ແບັດເຕີຣີວິິກິດ (<20%) ຈຳສິນ',
  evacuate_immediate: 'ຄຳສັ່ງອົບພະຍົບດ່ວນ',
  map: 'ແຜນທີ່',
  chat: 'ແຊັດ',
  sos: 'SOS',
  friends: 'ໝູ່ເພື່ອນ',
  profile: 'ໂປຣໄຟລ໌',
  feed: 'ຂ່າວສານ',
  manual: 'ຄູ່ມື',
  fund: 'ກອງທຶນ',
  nodes_around: 'ໂໜດອ້ອມຂ້າງ',
  nodes_count_suffix: 'ໂໜດ',
  emergency_hardware: 'ຮາດແວສຸກເສີນ',
  sos_morse_torch: 'ໄຟສາຍ SOS Morse',
  torch_off: 'ປິດໄຟສາຍ',
  siren_85db: 'ສຽງຫວູດ 85dB',
  siren_off: 'ປິດສຽງຫວູດ',
  siren_muted: 'ປິດສຽງຢູ່',
  all_in_panic: '🚨 ແຈ້ງເຕືອນທັງໝົດ',
  stop_all: '⏹️ ຢຸດທັງໝົດ',
  tap_for_estimate: 'ແຕະໄອຄອນແບັດເຕີຣີເພື່ອເບິ່ງເວລາທີ່ເຫຼືອ',
  remaining: 'ໃຊ້ໄດ້ອີກ',
  charging: 'ກຳລັງສາກໄຟ',
  survival_mode: 'ໂໝດເອົາຊີວິດລອດ',
  last_gasp_btn: '🚨 ສົ່ງສັນຍານສຸດທ້າຍ',
  survival_btn_off: '🛑 ປິດ Ultra',
  survival_btn_on: '⚡ 1-Tap Survival',
  guest_victim: 'ໂໝດຜູ້ປະສົບໄພສຸກເສີນ',
  guest_parity_badge: '100% ຄວາມສາມາດສຸກເສີນເຕັມຮູບແບບ',
  guest_parity_title: 'ກົດຄວາມເທົ່າທຽມຜູ້ໃຊ້ທົ່ວໄປ:',
  guest_parity_desc: 'ທ່ານສາມາດກົດ SOS, ແຊັດກູ້ໄພ, ເບິ່ງແຜນທີ່ອອບລາຍ ໂດຍບໍ່ຕ້ອງລົງທະບຽນ ຫຼື ຖືກຕິດຕາມ.',
  lang_select_title: 'ພາສາການນຳໃຊ້',
  backup_contacts_title: 'ສຳຮອງລາຍຊື່ຜູ້ຕິດຕໍ່',
  backup_contacts_desc: 'ຂໍ້ມູນລາຍຊື່ຖືກເຂົ້າລະຫັດ AES-GCM ໃນເຄື່ອງກ່ອນສົ່ງຂຶ້ນຄລາວດ໌.',
  backup_btn_idle: '☁️ ສຳຮອງຂໍ້ມູນແບບປອດໄພ',
  backup_btn_running: '⏳ ກຳລັງເຂົ້າລະຫັດ...',
  backup_success: '✓ ສຳຮອງຂໍ້ມູນສຳເລັດ 100%',
  storage_title: 'ພື້ນທີ່ອອບລາຍໃນເຄື່ອງ (IndexedDB)',
  storage_note_1: '✓ ຈຳກັດ 50MB FIFO ອັດຕະໂນມັດ ປ້ອງກັນເຄື່ອງເຕັມ',
  storage_note_2: '✓ ຂໍ້ຄວາມ SOS ແລະ ຂໍ້ຄວາມປັກໝຸດ 📌 ຖືກປົກປ້ອງຖາວອນ',

  chat_broadcast_tab: '📢 ສ່ວນລວມ (Broadcast)',
  chat_direct_tab: '🔒 ແຊັດສ່ວນຕົວ 1:1 (E2EE)',
  chat_hop_radius: 'ລັດສະໝີສົ່ງຕໍ່:',
  chat_hop_local: '🟢 ອ້ອມຕົວ (3 Hops)',
  chat_hop_community: '🟡 ຊຸມຊົນ (7 Hops)',
  chat_hop_max: '🔴 ໄກສຸດ (15 Hops)',
  chat_input_broadcast_placeholder: 'ພິມຂໍ້ຄວາມກະຈາຍຂ່າວສານ...',
  chat_input_direct_placeholder: 'ພິມຂໍ້ຄວາມສ່ວນຕົວ 1:1...',
  chat_me: 'ຂ້ອຍ',
  chat_encrypted_badge: 'ເຂົ້າລະຫັດ ChaCha20-Poly1305',
  chat_pin_tooltip: 'ປັກໝຸດຂໍ້ຄວາມ',
  chat_contacts_title: 'ລາຍຊື່ໝູ່ ແລະ ແຊັດສ່ວນຕົວ',
  chat_contacts_search: 'ຄົ້ນຫາລາຍຊື່ ຫຼື ລະຫັດໂໜດ...',
  chat_no_contacts: 'ບໍ່ພົບໂໜດໝູ່ໃນໄລຍະສັນຍານ',
  chat_back_to_list: '← ກັບໄປໜ້າລາຍຊື່ໝູ່',
  chat_online: 'ອອນລາຍຜ່ານເຄືອຂ່າຍວິທະຍຸ',
  chat_quick_help: '🚨 ຕ້ອງການຄວາມຊ່ວຍເຫຼືອດ່ວນ',
  chat_quick_safe: '📍 ປອດໄພແລ້ວ ຢູ່ສູນອົບພະຍົບ',
  chat_quick_food_water: '🍞 ຕ້ອງການນ້ຳ ແລະ ອາຫານ',
  chat_quick_battery_low: '🔋 ແບັດເຕີຣີໃກ້ໝົດ',

  status_peer_summary_title: '👥 ສະຫຼຸບໂຄງຂ່າຍໂໜດອ້ອມຕົວ',
  status_peer_sos: 'ໂໜດຂໍຄວາມຊ່ວຍເຫຼືອ SOS:',
  status_peer_friends: 'ໝູ່ເພື່ອນທີ່ຢືນຢັນແລ້ວ:',
  status_peer_relays: 'ສະຖານີຣີເລ Mesh:',
  status_peer_gateways: 'ເກດເວດາວທຽມ / LoRa:',
  status_modal_hint: 'ສົ່ງຕໍ່ຜ່ານ BLE Coded PHY (S=8) ໄລຍະ 300ມ - 5ກມ.',
  status_btn_done: 'ຕົກລົງ',
  status_isolated: 'ບໍ່ມີສັນຍານ'
};

export const arDictionary: Record<string, string> = {
  app_name: 'OutGrid شبكة الإنقاذ',
  one_tap_sos: 'استغاثة بنقرة واحدة (SOS)',
  disaster_mesh_mode: 'وضع الشبكة اللاسلكية للطوارئ',
  radar_compass: 'بوصلة الرادار الملاحية',
  battery_critical: 'البطارية حرجة (<20%) في وضع السكون',
  evacuate_immediate: 'إخلاء فوري عاجل',
  map: 'الخريطة',
  chat: 'المحادثة',
  sos: 'استغاثة',
  friends: 'الأصدقاء',
  profile: 'الملف الشخصي',
  feed: 'الأخبار',
  manual: 'دليل النجاة',
  fund: 'صندوق الدعم',
  nodes_around: 'العقد المجاورة',
  nodes_count_suffix: 'عقدة',
  emergency_hardware: 'أجهزة الطوارئ',
  sos_morse_torch: 'مصباح SOS مورس',
  torch_off: 'إطفاء المصباح',
  siren_85db: 'صافرة إنذار 85dB',
  siren_off: 'إيقاف الصافرة',
  siren_muted: 'مكتوم',
  all_in_panic: '🚨 إنذار شامل',
  stop_all: '⏹️ إيقاف الكل',
  tap_for_estimate: 'انقر على أيقونة البطارية لمعرفة الوقت المتبقي',
  remaining: 'المتبقي',
  charging: 'جار الشحن',
  survival_mode: 'وضع النجاة الفائق',
  last_gasp_btn: '🚨 إرسال إشارة الرمق الأخير',
  survival_btn_off: '🛑 إيقاف الوضع الفائق',
  survival_btn_on: '⚡ نجاة بنقرة واحدة',
  guest_victim: 'وضع الضحية للزوار',
  guest_parity_badge: '100% ميزات الطوارئ مفعلة بالكامل',
  guest_parity_title: 'مبدأ المساواة الكاملة للزوار:',
  guest_parity_desc: 'يمكنك إطلاق نداء الاستغاثة والمحادثة وعرض الخرائط دون الحاجة لإنشاء حساب أو تتبع.',
  lang_select_title: 'لغة العرض',
  backup_contacts_title: 'نسخ احتياطي لجهات الاتصال (Zero-Knowledge)',
  backup_contacts_desc: 'يتم تشفير جهات الاتصال والمفاتيح محلياً باستخدام AES-GCM قبل رفعها.',
  backup_btn_idle: '☁️ نسخ احتياطي مشفر',
  backup_btn_running: '⏳ جار التشفير والنسخ...',
  backup_success: '✓ اكتمل النسخ الاحتياطي بنسبة 100%',
  storage_title: 'التخزين المحلي دون اتصال (IndexedDB)',
  storage_note_1: '✓ حد أقصى 50MB بنظام FIFO لمنع امتلاء الذاكرة',
  storage_note_2: '✓ رسائل SOS والرسائل المثبتة 📌 محمية تماماً من الحذف',

  chat_broadcast_tab: '📢 بث عام (Broadcast)',
  chat_direct_tab: '🔒 خاص 1:1 (E2EE)',
  chat_hop_radius: 'نطاق الترحيل:',
  chat_hop_local: '🟢 محلي (3 قفزات)',
  chat_hop_community: '🟡 المجتمع (7 قفزات)',
  chat_hop_max: '🔴 أقصى مدى (15 قفزة)',
  chat_input_broadcast_placeholder: 'اكتب رسالة بث للعقد المجاورة...',
  chat_input_direct_placeholder: 'اكتب رسالة مشفرة 1:1...',
  chat_me: 'أنا',
  chat_encrypted_badge: 'مشفر بتشفير ChaCha20-Poly1305',
  chat_pin_tooltip: 'تثبيت الرسالة لمنع حذفها',
  chat_contacts_title: 'جهات الاتصال والمحادثات',
  chat_contacts_search: 'بحث عن جهة اتصال أو معرف العقدة...',
  chat_no_contacts: 'لم يتم العثور على عقد مجاورة',
  chat_back_to_list: '← العودة إلى جهات الاتصال',
  chat_online: 'متصل عبر شبكة الراديو',
  chat_quick_help: '🚨 أحتاج مساعدة عاجلة',
  chat_quick_safe: '📍 أنا في أمان بمركز الإيواء',
  chat_quick_food_water: '🍞 بحاجة إلى ماء وطعام',
  chat_quick_battery_low: '🔋 البطارية قاربت على النفاد',

  status_peer_summary_title: '👥 ملخص شبكة العقد المجاورة',
  status_peer_sos: 'إشارات استغاثة الطوارئ:',
  status_peer_friends: 'جهات الاتصال المؤكدة:',
  status_peer_relays: 'محطات الترحيل المجتمعية:',
  status_peer_gateways: 'بوابات الأقمار الصناعية / LoRa:',
  status_modal_hint: 'ترحيل الحزم عبر BLE Coded PHY (S=8) بمدى 300م - 5كم.',
  status_btn_done: 'تم',
  status_isolated: 'معزول'
};

function getDictionaryForLocale(locale: SupportedLocale): Record<string, string> {
  switch (locale) {
    case 'th':
      return { ...fallbackDictionary, ...thaiDictionary };
    case 'zh':
      return { ...fallbackDictionary, ...zhDictionary };
    case 'ja':
      return { ...fallbackDictionary, ...jaDictionary };
    case 'es':
      return { ...fallbackDictionary, ...esDictionary };
    case 'vi':
      return { ...fallbackDictionary, ...viDictionary };
    case 'ms':
      return { ...fallbackDictionary, ...msDictionary };
    case 'my':
      return { ...fallbackDictionary, ...myDictionary };
    case 'km':
      return { ...fallbackDictionary, ...kmDictionary };
    case 'lo':
      return { ...fallbackDictionary, ...loDictionary };
    case 'ar':
      return { ...fallbackDictionary, ...arDictionary };
    case 'en':
    default:
      return fallbackDictionary;
  }
}

function createI18nStore() {
  const initialLocale: SupportedLocale = getPersistedLocale();

  const currentLocale = writable<SupportedLocale>(initialLocale);
  const translations = writable<Record<string, string>>(getDictionaryForLocale(initialLocale));

  function setLocale(newLocale: SupportedLocale) {
    currentLocale.set(newLocale);
    translations.set(getDictionaryForLocale(newLocale));
    savePersistedLocale(newLocale);
  }

  return {
    locale: currentLocale,
    translations,
    setLocale,
    isRtl: derived(currentLocale, ($loc) => $loc === 'ar')
  };
}

export const i18n = createI18nStore();
