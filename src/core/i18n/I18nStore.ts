/**
 * Reactive Multi-Language Store & Translation Engine (Sprint F Task F.3)
 * Full 10 Languages support with instant reactive switching & RTL support
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Internationalization
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { writable, derived } from 'svelte/store';

export type SupportedLocale = 'th' | 'en' | 'zh' | 'es' | 'ja' | 'hi' | 'ar' | 'fr' | 'ru' | 'pt';

export interface ILocaleOption {
  code: SupportedLocale;
  name: string;
  flag: string;
  isRtl?: boolean;
}

export const SUPPORTED_LOCALES: ILocaleOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', isRtl: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' }
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

export const hiDictionary: Record<string, string> = {
  app_name: 'OutGrid आपातकालीन मेश',
  one_tap_sos: 'वन-टैप SOS आपातकालीन',
  disaster_mesh_mode: 'आपदा मेश रेडियो मोड',
  radar_compass: 'रडार कंपास नेविगेशन',
  battery_critical: 'बैटरी गंभीर (<20%) रेडियो स्लीप मोड',
  evacuate_immediate: 'तत्काल निकासी आदेश',
  map: 'मानचित्र',
  chat: 'चैट',
  sos: 'SOS',
  friends: 'मित्र',
  profile: 'प्रोफ़ाइल',
  feed: 'समाचार',
  manual: 'गाइड',
  fund: 'फंड',
  nodes_around: 'आसपास के नोड्स',
  nodes_count_suffix: 'नोड्स',
  emergency_hardware: 'आपातकालीन हार्डवेयर',
  sos_morse_torch: 'SOS मोर्स टॉर्च',
  torch_off: 'टॉर्च बंद',
  siren_85db: '85dB सायरन',
  siren_off: 'सायरन बंद',
  siren_muted: 'म्यूट',
  all_in_panic: '🚨 आपातकालीन चेतावनी',
  stop_all: '⏹️ सभी रोकें',
  tap_for_estimate: 'शेष समय के लिए बैटरी आइकन पर टैप करें',
  remaining: 'शेष',
  charging: 'चार्ज हो रहा है',
  survival_mode: 'अल्ट्रा उत्तरजीविता',
  last_gasp_btn: '🚨 अंतिम बीकन भेजें',
  survival_btn_off: '🛑 अल्ट्रा से बाहर निकलें',
  survival_btn_on: '⚡ 1-टैप उत्तरजीविता',
  guest_victim: 'अतिथि पीड़ित मोड',
  guest_parity_badge: '100% आपातकालीन सुविधाएं सक्रिय',
  guest_parity_title: 'शून्य-बाधा अतिथि समानता नियम:',
  guest_parity_desc: 'आप बिना पंजीकरण या ट्रैकिंग के SOS भेज सकते हैं, चैट कर सकते हैं, ऑफ़लाइन मानचित्र देख सकते हैं।',
  lang_select_title: 'भाषा चयन',
  backup_contacts_title: 'संपर्क बैकअप (शून्य-ज्ञान)',
  backup_contacts_desc: 'आपके संपर्कों को सिंक करने से पहले डिवाइस पर स्थानीय रूप से AES-GCM द्वारा एन्क्रिप्ट किया जाता है।',
  backup_btn_idle: '☁️ शून्य-ज्ञान बैकअप',
  backup_btn_running: '⏳ एन्क्रिप्ट और बैकअप हो रहा है...',
  backup_success: '✓ बैकअप 100% पूरा हुआ',
  storage_title: 'ऑफ़लाइन स्थानीय संग्रहण (IndexedDB)',
  storage_note_1: '✓ 50MB FIFO सीमा डिवाइस संग्रहण को भरने से रोकती है',
  storage_note_2: '✓ SOS संदेश और पिन की गई 📌 सूचनाएं कभी नहीं हटाई जाती हैं',

  chat_broadcast_tab: '📢 सार्वजनिक प्रसारण (Broadcast)',
  chat_direct_tab: '🔒 निजी चैट 1:1 (E2EE)',
  chat_hop_radius: 'रिले दायरा:',
  chat_hop_local: '🟢 निकट (3 Hops)',
  chat_hop_community: '🟡 समुदाय (7 Hops)',
  chat_hop_max: '🔴 अधिकतम दूरी (15 Hops)',
  chat_input_broadcast_placeholder: 'आसपास के नोड्स को संदेश भेजें...',
  chat_input_direct_placeholder: 'एन्क्रिप्टेड 1:1 संदेश लिखें...',
  chat_me: 'मैं',
  chat_encrypted_badge: 'ChaCha20-Poly1305 एन्क्रिप्टेड',
  chat_pin_tooltip: 'संदेश पिन करें',
  chat_contacts_title: 'मित्र और संपर्क सूची',
  chat_contacts_search: 'नाम या नोड आईडी खोजें...',
  chat_no_contacts: 'पास में कोई मित्र नोड नहीं मिला',
  chat_back_to_list: '← संपर्कों पर वापस जाएं',
  chat_online: 'रेडियो मेश पर ऑनलाइन',
  chat_quick_help: '🚨 तत्काल सहायता की आवश्यकता है',
  chat_quick_safe: '📍 राहत शिविर में सुरक्षित हूँ',
  chat_quick_food_water: '🍞 पानी और भोजन चाहिए',
  chat_quick_battery_low: '🔋 बैटरी कम है',

  status_peer_summary_title: '👥 मेश नेटवर्क नोड्स सारांश',
  status_peer_sos: 'आपातकालीन SOS बीकन:',
  status_peer_friends: 'सत्यापित मित्र व संपर्क:',
  status_peer_relays: 'सामुदायिक मेश रिले:',
  status_peer_gateways: 'सैटेलाइट / LoRa गेटवे:',
  status_modal_hint: 'BLE Coded PHY (S=8) 300m - 5km सीमा के साथ पैकेट रिले।',
  status_btn_done: 'पूर्ण',
  status_isolated: 'अलग-थलग'
};

export const frDictionary: Record<string, string> = {
  app_name: 'OutGrid Sauvetage',
  one_tap_sos: 'SOS en 1-Clic',
  disaster_mesh_mode: 'Mode Radio Mesh d\'Urgence',
  radar_compass: 'Boussole Radar de Navigation',
  battery_critical: 'Batterie Critique (<20%) Radio en Veille',
  evacuate_immediate: 'Évacuation Immédiate',
  map: 'Carte',
  chat: 'Messagerie',
  sos: 'SOS',
  friends: 'Contacts',
  profile: 'Profil',
  feed: 'Alertes',
  manual: 'Guide',
  fund: 'Fonds',
  nodes_around: 'nœuds à proximité',
  nodes_count_suffix: 'nœuds',
  emergency_hardware: 'Matériel d\'Urgence',
  sos_morse_torch: 'Lampe SOS Morse',
  torch_off: 'Éteindre Lampe',
  siren_85db: 'Sirène 85dB',
  siren_off: 'Arrêter Sirène',
  siren_muted: 'Silencieux',
  all_in_panic: '🚨 ALERTE GÉNÉRALE',
  stop_all: '⏹️ Tout Arrêter',
  tap_for_estimate: 'Appuyez sur l\'icône batterie pour l\'autonomie',
  remaining: 'restant',
  charging: 'En charge',
  survival_mode: 'Ultra Survie',
  last_gasp_btn: '🚨 Envoyer Dernier Souffle',
  survival_btn_off: '🛑 Quitter Ultra',
  survival_btn_on: '⚡ Survie 1-Clic',
  guest_victim: 'Mode Invité Sinistré',
  guest_parity_badge: '100% Fonctionnalités d\'Urgence Actives',
  guest_parity_title: 'Règle de Parité Totale Invité:',
  guest_parity_desc: 'Déclenchez le SOS, dialoguez avec les secours, accédez aux cartes hors-ligne sans inscription ni traçage.',
  lang_select_title: 'Langue d\'Affichage',
  backup_contacts_title: 'Sauvegarde Zéro-Connaissance',
  backup_contacts_desc: 'Vos contacts et clés publiques sont chiffrés en local avec AES-GCM avant synchronisation.',
  backup_btn_idle: '☁️ Sauvegarde Zéro-Connaissance',
  backup_btn_running: '⏳ Chiffrement et sauvegarde...',
  backup_success: '✓ Sauvegarde terminée à 100%',
  storage_title: 'Stockage Local Hors-Ligne (IndexedDB)',
  storage_note_1: '✓ Nettoyage automatique FIFO plafonné à 50 Mo pour préserver l\'espace',
  storage_note_2: '✓ Balises SOS et messages épinglés 📌 préservés en permanence',

  chat_broadcast_tab: '📢 Diffusion Générale',
  chat_direct_tab: '🔒 Privé 1:1 (E2EE)',
  chat_hop_radius: 'Rayon de relais:',
  chat_hop_local: '🟢 Proximité (3 Sauts)',
  chat_hop_community: '🟡 Communauté (7 Sauts)',
  chat_hop_max: '🔴 Portée Max (15 Sauts)',
  chat_input_broadcast_placeholder: 'Diffuser un message aux nœuds voisins...',
  chat_input_direct_placeholder: 'Message chiffré 1:1...',
  chat_me: 'Moi',
  chat_encrypted_badge: 'Chiffré ChaCha20-Poly1305',
  chat_pin_tooltip: 'Épingler le message',
  chat_contacts_title: 'Contacts & Amis',
  chat_contacts_search: 'Rechercher un contact ou ID...',
  chat_no_contacts: 'Aucun contact détecté à proximité',
  chat_back_to_list: '← Retour aux contacts',
  chat_online: 'En ligne sur le réseau mesh',
  chat_quick_help: '🚨 Besoin d\'aide urgente',
  chat_quick_safe: '📍 En sécurité au centre d\'évacuation',
  chat_quick_food_water: '🍞 Besoin d\'eau et nourriture',
  chat_quick_battery_low: '🔋 Batterie presque vide',

  status_peer_summary_title: '👥 Résumé du Réseau Mesh',
  status_peer_sos: 'Balises de Détresse SOS:',
  status_peer_friends: 'Contacts Vérifiés:',
  status_peer_relays: 'Relais Communautaires:',
  status_peer_gateways: 'Passerelles Satellite / LoRa:',
  status_modal_hint: 'Relais de paquets via BLE Coded PHY (S=8) portée 300m - 5km.',
  status_btn_done: 'Fermer',
  status_isolated: 'ISOLÉ'
};

export const ruDictionary: Record<string, string> = {
  app_name: 'OutGrid Спасение',
  one_tap_sos: 'SOS в Одно Касание',
  disaster_mesh_mode: 'Аварийный Mesh Радио Режим',
  radar_compass: 'Радар-Компас Навигация',
  battery_critical: 'Критический Заряд (<20%) Спящий Режим',
  evacuate_immediate: 'Срочная Эвакуация',
  map: 'Карта',
  chat: 'Чат',
  sos: 'SOS',
  friends: 'Контакты',
  profile: 'Профиль',
  feed: 'Лента',
  manual: 'Инструкция',
  fund: 'Фонд',
  nodes_around: 'узлов поблизости',
  nodes_count_suffix: 'узлов',
  emergency_hardware: 'Аварийное Оборудование',
  sos_morse_torch: 'Фонарик SOS Морзе',
  torch_off: 'Выключить Фонарик',
  siren_85db: 'Сирена 85дБ',
  siren_off: 'Выключить Сирену',
  siren_muted: 'Без Звука',
  all_in_panic: '🚨 ПОЛНАЯ ТРЕВОГА',
  stop_all: '⏹️ Остановить Всё',
  tap_for_estimate: 'Нажмите на иконку батареи для расчета времени',
  remaining: 'осталось',
  charging: 'Зарядка',
  survival_mode: 'Ультра Выживание',
  last_gasp_btn: '🚨 Сигнал Последнего Вздоха',
  survival_btn_off: '🛑 Выйти из Ультра',
  survival_btn_on: '⚡ 1-Касание Выживание',
  guest_victim: 'Гостевой Режим Пострадавшего',
  guest_parity_badge: '100% Аварийных Функций Активны',
  guest_parity_title: 'Полное Равноправие Гостя:',
  guest_parity_desc: 'Подавайте SOS, общайтесь со спасателями, используйте офлайн-карты без регистрации и слежки.',
  lang_select_title: 'Язык Интерфейса',
  backup_contacts_title: 'Резервная Копия Без Разглашения (Zero-Knowledge)',
  backup_contacts_desc: 'Контакты шифруются локально с помощью AES-GCM перед синхронизацией.',
  backup_btn_idle: '☁️ Резервное Копирование',
  backup_btn_running: '⏳ Шифрование и копирование...',
  backup_success: '✓ Копирование успешно завершено на 100%',
  storage_title: 'Офлайн Хранилище Устройства (IndexedDB)',
  storage_note_1: '✓ Автоматический лимит 50МБ FIFO предотвращает переполнение памяти',
  storage_note_2: '✓ Сигналы SOS и закрепленные 📌 сообщения защищены от удаления',

  chat_broadcast_tab: '📢 Общее Оповещение',
  chat_direct_tab: '🔒 Личный Чат 1:1 (E2EE)',
  chat_hop_radius: 'Радиус передачи:',
  chat_hop_local: '🟢 Рядом (3 Прыжка)',
  chat_hop_community: '🟡 Сообщество (7 Прыжков)',
  chat_hop_max: '🔴 Макс. Дистанция (15 Прыжков)',
  chat_input_broadcast_placeholder: 'Сообщение соседним узлам...',
  chat_input_direct_placeholder: 'Зашифрованное сообщение 1:1...',
  chat_me: 'Я',
  chat_encrypted_badge: 'Зашифровано ChaCha20-Poly1305',
  chat_pin_tooltip: 'Закрепить сообщение',
  chat_contacts_title: 'Контакты и Друзья',
  chat_contacts_search: 'Поиск по имени или ID узла...',
  chat_no_contacts: 'Поблизости нет активных контактов',
  chat_back_to_list: '← Назад к контактам',
  chat_online: 'В сети через радиосеть',
  chat_quick_help: '🚨 Срочно требуется помощь',
  chat_quick_safe: '📍 В безопасности в центре эвакуации',
  chat_quick_food_water: '🍞 Нужна вода и еда',
  chat_quick_battery_low: '🔋 Батарея почти разряжена',

  status_peer_summary_title: '👥 Обзор Узлов Радиосети',
  status_peer_sos: 'Экстренные Сигналы SOS:',
  status_peer_friends: 'Подтвержденные Контакты:',
  status_peer_relays: 'Ретрансляторы Сообщества:',
  status_peer_gateways: 'Спутниковые / LoRa Шлюзы:',
  status_modal_hint: 'Ретрансляция через BLE Coded PHY (S=8) радиус 300м - 5км.',
  status_btn_done: 'Готово',
  status_isolated: 'ИЗОЛИРОВАН'
};

export const ptDictionary: Record<string, string> = {
  app_name: 'OutGrid Resgate',
  one_tap_sos: 'SOS em Um Toque',
  disaster_mesh_mode: 'Modo Rádio Mesh Desastre',
  radar_compass: 'Navegação por Bússola Radar',
  battery_critical: 'Bateria Crítica (<20%) Rádio Hibernando',
  evacuate_immediate: 'Evacuação Imediata',
  map: 'Mapa',
  chat: 'Mensagens',
  sos: 'SOS',
  friends: 'Amigos',
  profile: 'Perfil',
  feed: 'Notícias',
  manual: 'Manual',
  fund: 'Fundo',
  nodes_around: 'nós próximos',
  nodes_count_suffix: 'nós',
  emergency_hardware: 'Hardware de Emergência',
  sos_morse_torch: 'Lanterna SOS Morse',
  torch_off: 'Desligar Lanterna',
  siren_85db: 'Sirene 85dB',
  siren_off: 'Desligar Sirene',
  siren_muted: 'Silenciado',
  all_in_panic: '🚨 ALERTA TOTAL',
  stop_all: '⏹️ Parar Tudo',
  tap_for_estimate: 'Toque no ícone da bateria para ver o tempo restante',
  remaining: 'restante',
  charging: 'Carregando',
  survival_mode: 'Ultra Sobrevivência',
  last_gasp_btn: '🚨 Enviar Último Suspiro',
  survival_btn_off: '🛑 Sair do Ultra',
  survival_btn_on: '⚡ 1-Toque Sobrevivência',
  guest_victim: 'Modo Convidado Vítima',
  guest_parity_badge: '100% Recursos de Emergência Ativos',
  guest_parity_title: 'Regra de Paridade Total para Convidados:',
  guest_parity_desc: 'Dispare SOS, converse com equipes de resgate e use mapas offline sem cadastro nem rastreamento.',
  lang_select_title: 'Idioma de Exibição',
  backup_contacts_title: 'Backup de Contatos Zero-Knowledge',
  backup_contacts_desc: 'Seus contatos e chaves são criptografados localmente com AES-GCM antes da sincronização.',
  backup_btn_idle: '☁️ Backup Zero-Knowledge',
  backup_btn_running: '⏳ Criptografando e salvando...',
  backup_success: '✓ Backup concluído com 100% de sucesso',
  storage_title: 'Armazenamento Offline Local (IndexedDB)',
  storage_note_1: '✓ Limite automático de 50MB FIFO evita sobrecarga do aparelho',
  storage_note_2: '✓ Mensagens SOS e avisos fixados 📌 protegidos permanentemente',

  chat_broadcast_tab: '📢 Transmissão Geral',
  chat_direct_tab: '🔒 Privado 1:1 (E2EE)',
  chat_hop_radius: 'Raio de retransmissão:',
  chat_hop_local: '🟢 Próximo (3 Saltos)',
  chat_hop_community: '🟡 Comunidade (7 Saltos)',
  chat_hop_max: '🔴 Alcance Máximo (15 Saltos)',
  chat_input_broadcast_placeholder: 'Mensagem de transmissão para os nós próximos...',
  chat_input_direct_placeholder: 'Mensagem criptografada 1:1...',
  chat_me: 'Eu',
  chat_encrypted_badge: 'Criptografado ChaCha20-Poly1305',
  chat_pin_tooltip: 'Fixar mensagem contra exclusão',
  chat_contacts_title: 'Amigos e Contatos',
  chat_contacts_search: 'Buscar contato ou ID do nó...',
  chat_no_contacts: 'Nenhum contato ativo encontrado por perto',
  chat_back_to_list: '← Voltar aos contatos',
  chat_online: 'Online via rádio mesh',
  chat_quick_help: '🚨 Preciso de ajuda urgente',
  chat_quick_safe: '📍 A salvo no abrigo de evacuação',
  chat_quick_food_water: '🍞 Preciso de água e comida',
  chat_quick_battery_low: '🔋 Bateria fraca',

  status_peer_summary_title: '👥 Resumo dos Nós da Rede',
  status_peer_sos: 'Sinais de Emergência SOS:',
  status_peer_friends: 'Contatos e Amigos Verificados:',
  status_peer_relays: 'Repetidores Comunitários:',
  status_peer_gateways: 'Gateways Satélite / LoRa:',
  status_modal_hint: 'Retransmissão via BLE Coded PHY (S=8) alcance de 300m a 5km.',
  status_btn_done: 'Concluir',
  status_isolated: 'ISOLADO'
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
    case 'hi':
      return { ...fallbackDictionary, ...hiDictionary };
    case 'ar':
      return { ...fallbackDictionary, ...arDictionary };
    case 'fr':
      return { ...fallbackDictionary, ...frDictionary };
    case 'ru':
      return { ...fallbackDictionary, ...ruDictionary };
    case 'pt':
      return { ...fallbackDictionary, ...ptDictionary };
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
