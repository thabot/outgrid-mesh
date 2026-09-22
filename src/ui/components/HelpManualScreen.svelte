<!--
  OutGrid Mesh - In-App Emergency Survival Guide & 10-Language Manual Screen
  Protocol: Thabot OutGrid Protocol (TOG v1.1)
  Author: Thabot (thabo47@gmail.com)
  License: AGPL-3.0 + Commercial Rights Reserved to Thabot
-->
<script lang="ts">
  import type { SupportedLocale } from '../../core/i18n/I18nStore';

  export let currentLanguage: SupportedLocale = 'th';

  export interface ManualContent {
    title: string;
    steps: { number: number; title: string; desc: string; icon: string }[];
    dtnTitle: string;
    dtnDesc: string;
    beaconTitle: string;
    beaconDesc: string;
    isRtl?: boolean;
  }

  export const MANUALS: Record<SupportedLocale, ManualContent> = {
    th: {
      title: 'คู่มือการเอาชีวิตรอดฉุกเฉิน OutGrid Mesh',
      steps: [
        { number: 1, title: 'เปิด Bluetooth & พิกัด', desc: 'ระบบจะเชื่อมต่อร่างแหอัตโนมัติไร้เน็ตทันที', icon: '📶' },
        { number: 2, title: 'กดปุ่ม SOS สีแดง', desc: 'กระจายสัญญาณขอความช่วยเหลือไปยังเพื่อนรอบข้าง', icon: '🚨' },
        { number: 3, title: 'แชร์ APK ให้คนข้างเคียง', desc: 'เปิด Wi-Fi Hotspot ให้ผู้อื่นสแกนรับแอปแบบออฟไลน์', icon: '📲' }
      ],
      dtnTitle: 'เครือข่ายส่งต่อข้อมูลเมื่อเคลื่อนที่ (DTN)',
      dtnDesc: 'โทรศัพท์ของคุณจะทำหน้าที่เป็นพาหะนำข้อมูลฉุกเฉินส่งต่อให้คนที่เดินสวนกัน เพื่อนำพาข้อความไปถึงศูนย์กู้ภัย',
      beaconTitle: 'สัญญาณเสียงและไฟฉุกเฉินสากล',
      beaconDesc: 'เมื่อติดอยู่ในที่มืดหรือซากปรักหักพัง เปิดระบบเสียงรหัสมอส SOS และไฟกะพริบเพื่อนำทางทีมกู้ภัย'
    },
    en: {
      title: 'OutGrid Mesh Field Survival Guide',
      steps: [
        { number: 1, title: 'Enable Bluetooth & GPS', desc: 'Forms autonomous ad-hoc mesh without cell reception.', icon: '📶' },
        { number: 2, title: 'Tap Emergency Red SOS', desc: 'Propagates distress beacon across neighbor nodes.', icon: '🚨' },
        { number: 3, title: 'Offline APK Sideload', desc: 'Spin up local Wi-Fi to share app installation offline.', icon: '📲' }
      ],
      dtnTitle: 'Delay-Tolerant Data Mule Routing (DTN)',
      dtnDesc: 'Your phone carries bundles while walking and transfers them to encounters, crossing disaster dead zones.',
      beaconTitle: 'Acoustic & Optical Emergency Beacon',
      beaconDesc: 'In debris or smoke, activate Morse audio and optical strobe torch to guide rescuers.'
    },
    zh: {
      title: 'OutGrid Mesh 应急生存操作指南',
      steps: [
        { number: 1, title: '开启蓝牙与定位', desc: '无网状态下自动建立手机间网状互联。', icon: '📶' },
        { number: 2, title: '一键红色 SOS', desc: '向周围所有节点快速扩散紧急求救信号。', icon: '🚨' },
        { number: 3, title: '离线分享 APK 安装包', desc: '开启本机离线热点，扫码免流量直传应用。', icon: '📲' }
      ],
      dtnTitle: '容迟网络数据骡子传递 (DTN)',
      dtnDesc: '手机在移动时充当数据中继，在遇到其他避难者时自动同步救援信息至大本营。',
      beaconTitle: '声光莫尔斯应急救援信标',
      beaconDesc: '若受困黑暗或废墟中，开启莫尔斯求救音与强光闪烁引导救援力量。'
    },
    es: {
      title: 'Guía de Supervivencia en Campo OutGrid Mesh',
      steps: [
        { number: 1, title: 'Activar Bluetooth y GPS', desc: 'Crea una red en malla autónoma sin internet.', icon: '📶' },
        { number: 2, title: 'Presionar SOS Rojo', desc: 'Transmite la alerta de rescate a los teléfonos cercanos.', icon: '🚨' },
        { number: 3, title: 'Compartir APK sin Conexión', desc: 'Active el punto de acceso para que otros instalen el app.', icon: '📲' }
      ],
      dtnTitle: 'Enrutamiento por Mula de Datos (DTN)',
      dtnDesc: 'Su teléfono transporta mensajes en movimiento y los comparte con personas encontradas.',
      beaconTitle: 'Sirena Acústica y Luz Estroboscópica',
      beaconDesc: 'Active el código Morse auditivo y la linterna de destellos para guiar a los socorristas.'
    },
    hi: {
      title: 'आउटग्रिड मेश आपातकालीन फील्ड उत्तरजीविता गाइड',
      steps: [
        { number: 1, title: 'ब्लूटूथ और लोकेशन चालू करें', desc: 'इंटरनेट के बिना फोन-टू-फोन मेश नेटवर्क बनता है।', icon: '📶' },
        { number: 2, title: 'लाल SOS बटन दबाएं', desc: 'आसपास के सभी नोड्स पर तुरंत मदद का संदेश भेजें।', icon: '🚨' },
        { number: 3, title: 'ऑफ़लाइन ऐप साझा करें', desc: 'बिना इंटरनेट के हॉटस्पॉट से साथियों को APK दें।', icon: '📲' }
      ],
      dtnTitle: 'डेटा म्यूल रूटिंग (DTN)',
      dtnDesc: 'चलते समय आपका फोन संदेशों को स्टोर करके नए लोगों से मिलने पर आगे बढ़ाता है।',
      beaconTitle: 'ध्वनिक मोर्स सायरन और स्ट्रोब लाइट',
      beaconDesc: 'मलबे में फंसे होने पर बचाव दल को आकर्षित करने के लिए सायरन और लाइट ऑन करें।'
    },
    ar: {
      title: 'دليل النجاة في الميدان لشبكة OutGrid Mesh',
      isRtl: true,
      steps: [
        { number: 1, title: 'تفعيل البلوتوث والموقع', desc: 'تكوين شبكة لاسلكية بدون اتصال خلوي أو إنترنت.', icon: '📶' },
        { number: 2, title: 'الضغط على زر SOS الأحمر', desc: 'نشر نداء استغاثة فوري لجميع الأجهزة المجاورة.', icon: '🚨' },
        { number: 3, title: 'مشاركة التطبيق بدون إنترنت', desc: 'تشغيل نقطة اتصال مباشرة لمشاركة ملف APK.', icon: '📲' }
      ],
      dtnTitle: 'توجيه حزم البيانات المتنقلة (DTN)',
      dtnDesc: 'يحمل هاتفك رسائل الطوارئ أثناء تحركك وينقلها للمارين لإيصالها لفرق الإغاثة.',
      beaconTitle: 'صفارة مورس الصوتية والوميض الضوئي',
      beaconDesc: 'في حال الحصار تحت الركام، استخدم إشارة مورس ووميض الكشاف لإرشاد المسعفين.'
    },
    fr: {
      title: 'Guide de Survie sur le Terrain OutGrid Mesh',
      steps: [
        { number: 1, title: 'Activer Bluetooth & GPS', desc: 'Réseau maillé autonome sans couverture mobile.', icon: '📶' },
        { number: 2, title: 'Appuyer sur SOS Rouge', desc: 'Diffuse le signal de détresse aux téléphones voisins.', icon: '🚨' },
        { number: 3, title: 'Partage APK Hors-Ligne', desc: 'Point d\'accès local pour installer l\'app sans données.', icon: '📲' }
      ],
      dtnTitle: 'Routage par Mules de Données (DTN)',
      dtnDesc: 'Votre smartphone transporte les messages et les transmet aux personnes croisées.',
      beaconTitle: 'Balise Morse Acoustique et Stroboscope',
      beaconDesc: 'En cas de détresse, activez le son Morse et le flash pour orienter les secours.'
    },
    ru: {
      title: 'Руководство по Выживанию OutGrid Mesh',
      steps: [
        { number: 1, title: 'Включить Bluetooth и GPS', desc: 'Создает автономную сеть без сотовой связи.', icon: '📶' },
        { number: 2, title: 'Нажать Красную Кнопку SOS', desc: 'Мгновенная передача сигнала бедствия соседям.', icon: '🚨' },
        { number: 3, title: 'Офлайн-Передача APK', desc: 'Раздача приложения через локальную точку доступа.', icon: '📲' }
      ],
      dtnTitle: 'Передача Данных Курьерами (DTN)',
      dtnDesc: 'Телефон накапливает сообщения и пересылает встречным людям до штаба.',
      beaconTitle: 'Звуковой Морзе и Световой Стробоскоп',
      beaconDesc: 'Под завалами активируйте звуковой сигнал Морзе и мигающий свет для спасателей.'
    },
    pt: {
      title: 'Guia de Sobrevivência em Campo OutGrid Mesh',
      steps: [
        { number: 1, title: 'Ligue o Bluetooth e o GPS', desc: 'Cria rede em malha sem necessidade de internet.', icon: '📶' },
        { number: 2, title: 'Pressione o SOS Vermelho', desc: 'Propaga alerta de resgate aos aparelhos próximos.', icon: '🚨' },
        { number: 3, title: 'Envio de APK Offline', desc: 'Compartilhe o instalador via ponto de acesso Wi-Fi.', icon: '📲' }
      ],
      dtnTitle: 'Roteamento por Mulas de Dados (DTN)',
      dtnDesc: 'Seu celular carrega pacotes de alerta e os retransmite ao cruzar com pessoas.',
      beaconTitle: 'Sirene Morse Sonora e Lanterna Flash',
      beaconDesc: 'Sob escombros, use o som de socorro e o pisca-alerta para orientar as buscas.'
    },
    ja: {
      title: 'OutGrid Mesh 災害時サバイバルガイド',
      steps: [
        { number: 1, title: 'Bluetoothと位置情報をON', desc: '基地局遮断時も端末同士で自律メッシュを形成。', icon: '📶' },
        { number: 2, title: '赤色SOSボタンを押す', desc: '周辺端末へゴシップ通信で迅速に救援要請を拡散。', icon: '🚨' },
        { number: 3, title: 'オフラインでAPKを配布', desc: '端末内蔵Wi-Fiスポットからアプリを直接共有。', icon: '📲' }
      ],
      dtnTitle: '移動中継による遅延耐性通信 (DTN)',
      dtnDesc: '移動する避難者の端末が伝言を預かり、すれ違いざまに中継して本部に届けます。',
      beaconTitle: '音響モールス信号＆ストロボ点滅',
      beaconDesc: '閉じ込められた場合、モールス音とストロボ発光で救助隊を的確に誘導します。'
    }
  };

  $: manual = MANUALS[currentLanguage] || MANUALS.en;
  $: isRtl = manual.isRtl || false;
</script>

<div class="manual-container" class:rtl={isRtl} dir={isRtl ? 'rtl' : 'ltr'} data-testid="manual-screen">
  <div class="manual-header">
    <h2>📖 {manual.title}</h2>
    <div class="lang-selector">
      <label for="lang-select">🌐</label>
      <select id="lang-select" bind:value={currentLanguage}>
        <option value="th">ไทย (TH)</option>
        <option value="en">English (EN)</option>
        <option value="zh">中文 (ZH)</option>
        <option value="es">Español (ES)</option>
        <option value="hi">हिन्दी (HI)</option>
        <option value="ar">العربية (AR)</option>
        <option value="fr">Français (FR)</option>
        <option value="ru">Русский (RU)</option>
        <option value="pt">Português (PT)</option>
        <option value="ja">日本語 (JA)</option>
      </select>
    </div>
  </div>

  <div class="infographic-section">
    <h3>⚡ 3-Step Emergency Survival Sequence</h3>
    <div class="steps-grid">
      {#each manual.steps as step}
        <div class="step-card">
          <div class="step-icon">{step.icon}</div>
          <div class="step-number">Step {step.number}</div>
          <strong class="step-title">{step.title}</strong>
          <p class="step-desc">{step.desc}</p>
        </div>
      {/each}
    </div>
  </div>

  <div class="info-blocks">
    <div class="info-card">
      <h4>🚚 {manual.dtnTitle}</h4>
      <p>{manual.dtnDesc}</p>
    </div>
    <div class="info-card">
      <h4>🚨 {manual.beaconTitle}</h4>
      <p>{manual.beaconDesc}</p>
    </div>
  </div>
</div>

<style>
  .manual-container {
    padding: 1.5rem;
    background: #090d16;
    color: #f1f5f9;
    border-radius: 0.75rem;
    border: 1px solid #1e293b;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .manual-container.rtl {
    direction: rtl;
    text-align: right;
  }
  .manual-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .manual-header h2 {
    margin: 0;
    font-size: 1.35rem;
    color: #38bdf8;
  }
  .lang-selector {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .lang-selector select {
    background: #1e293b;
    color: #f8fafc;
    border: 1px solid #334155;
    padding: 0.35rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  .infographic-section {
    margin-bottom: 1.5rem;
  }
  .infographic-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #f8fafc;
  }
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .step-card {
    background: #131d2e;
    border: 1px solid #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .step-icon {
    font-size: 1.75rem;
  }
  .step-number {
    font-size: 0.75rem;
    font-weight: 700;
    color: #38bdf8;
    text-transform: uppercase;
  }
  .step-title {
    font-size: 0.95rem;
    color: #f1f5f9;
  }
  .step-desc {
    margin: 0;
    font-size: 0.8rem;
    color: #94a3b8;
    line-height: 1.35;
  }
  .info-blocks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }
  .info-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 0.5rem;
    padding: 1rem;
  }
  .info-card h4 {
    margin: 0 0 0.5rem 0;
    color: #38bdf8;
    font-size: 0.95rem;
  }
  .info-card p {
    margin: 0;
    font-size: 0.8rem;
    color: #94a3b8;
    line-height: 1.4;
  }
</style>
