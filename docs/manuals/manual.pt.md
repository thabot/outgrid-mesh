# Manual de Sobrevivência e Operações em Campo OutGrid Mesh (PT)
**Protocolo:** Thabot OutGrid Protocol (TOG v1.1)  
**Autor:** Thabot (<thabo47@gmail.com>)  
**Licença:** AGPL-3.0 Bem Público Humanitário sem Fins Lucrativos

[🏠 Início / README](../../README.md) • 
[🇹🇭 ไทย](manual.th.md) • 
[🇬🇧 English](manual.en.md) • 
[🇨🇳 中文](manual.zh.md) • 
[🇪🇸 Español](manual.es.md) • 
[🇯🇵 日本語](manual.ja.md) • 
[🇫🇷 Français](manual.fr.md) • 
[🇵🇹 Português](manual.pt.md) • 
[🇷🇺 Русский](manual.ru.md) • 
[🇸🇦 العربية](manual.ar.md) • 
[🇮🇳 हिन्दी](manual.hi.md)

---

## 1. Instalação do Aplicativo

### Com Acesso à Internet:
1. Baixe o instalador oficial (`outgrid-mesh.apk`) ou de teste (`outgrid-mesh-uat.apk`) via GitHub Releases.
2. Abra o arquivo no smartphone Android e confirme a permissão "Instalar de fontes desconhecidas".
3. Conceda as autorizações necessárias:
   - **Bluetooth e Dispositivos Próximos:** Para comunicação em malha ad-hoc e retransmissão de pacotes.
   - **Localização:** Para incluir coordenadas precisas em chamados SOS e navegação por radar.
   - **Isenção de Otimização de Bateria:** Para manter o serviço ativo 24h em segundo plano mesmo com tela apagada.

### Instalação Offline em Cenário de Catástrofe (Wi-Fi Sideload):
1. Aproxime-se de alguém que já possua o aplicativo instalado.
2. Solicite que abra a opção **"Emergency APK Sideload"** (o celular criará um ponto de acesso Wi-Fi local sem dados).
3. Conecte seu aparelho a essa rede Wi-Fi e acesse `http://192.168.49.1:8080` no navegador para baixar o arquivo APK diretamente.

---

## 2. Tipos de Operação e Funcionalidades

### 🚨 1. Sinalizador de Emergência SOS de Um Toque
- Mantenha o **botão vermelho SOS** pressionado por 1 segundo.
- Indique a categoria do perigo (ferimentos graves, ilhados por inundação, desabamento).
- O motor comprime GPS submétrico, hexágono H3 Res 9 e nível de bateria em um pacote de apenas **21 bytes**, inundando a vizinhança de imediato.

### 💬 2. Mensagens Privadas com Criptografia de Ponta a Ponta (1-on-1 E2EE)
- Selecione qualquer sobrevivente ou socorrista na lista da rede em malha.
- Envie textos, notas de voz de até 15 segundos ou imagens compactadas WebP.
- Criptografia padrão militar **X25519 ECDH + AES-256-GCM**. Nenhuma estação intermediária tem acesso ao conteúdo.

### 📢 3. Mural Oficial de Alertas de Crise (Crisis Feed)
- Receba ordens de evacuação oficiais, locais de abrigo e postos de auxílio humanitário.
- Todas as mensagens possuem **Assinatura Digital Ed25519** emitida pelo comando de socorro contra boatos falsos.

### 🗺️ 4. Mapa Vetorial Offline e Radar de Busca
- Mapa mundial ultracompacto com menos de 5MB que funciona 100% sem internet.
- Toque em qualquer chamado de socorro para abrir a **Bússola Radar**, que aponta o azimute e a distância direta em metros até a vítima.

### 🔦 5. Sirene Sonora Morse e Lanterna Estroboscópica
- Em locais escuros ou escombros, acione o áudio Morse SOS e o pisca-alerta do flash para guiar os socorristas.

---

## 3. Alcance de Sinal e Especificações Técnicas

| Tecnologia de Rádio | Alcance Efetivo por Salto | Ambiente Recomendado | Taxa de Transferência |
| :--- | :---: | :--- | :---: |
| **BLE 5 Long Range (Coded PHY S=8)** | **300 – 1.000 metros** | Áreas abertas, descampados, rios, topos de prédios | ~125 kbps |
| **BLE Padrão (1M PHY)** | **30 – 100 metros** | Ambientes internos, através de alvenaria | ~1 Mbps |
| **Wi-Fi Direct P2P (SoftAP)** | **100 – 200 metros** | Envio de APK e fotos de alta resolução | ~10 – 50 Mbps |
| **Ponte LoRa Complementar (ESP32)** | **5 – 15 quilômetros** | Serras, áreas rurais e florestais | ~0.3 – 5 kbps |

- **Roteamento Multi-Salto (Multi-Hop):** As mensagens podem saltar por até **15 aparelhos**, cobrindo dezenas de quilômetros.
- **Mula de Dados (DTN Store-and-Forward):** Ao caminhar, o celular retém os pacotes e os retransmite ao cruzar com pessoas em outros povoados.

---

## 4. Limites e Recomendações de Envio

1. **Volume de Dados:**
   - Mensagens de texto e SOS: Máximo recomendado de **200 caracteres** para envio imediato.
   - Áudio: Limitado a **15 segundos**.
   - Imagens: Convertidas em WebP econômico.
2. **Prevenção de Sobrecarga (Storm Guard):**
   - Filtro de Bloom impede a retransmissão desnecessária de pacotes já conhecidos.
3. **Limite de Armazenamento Local:**
   - Limite de **50MB** em FIFO. Mensagens críticas de SOS nunca são apagadas.

---

## 5. Estratégia de Economia de Bateria

- Abaixo de 20%, o aplicativo ativa o modo **Deep Hibernation**, espaçando as varreduras para manter o aparelho ativo por mais de **100 horas**.
- Desative aplicativos desnecessários para resguardar a carga de resgate.

---

## 6. Procedimento Operacional Padrão de Emergência em 3 Fases (3-Phase Emergency SOP)

### 🟢 Fase 1: Preparação Prévia (Pre-Disaster Readiness)
1. **Instalação e Permissões:** Instale o OutGrid Mesh com antecedência. Conceda permissões de Bluetooth, Localização precisa e Isenção de otimização de bateria.
2. **Pareamento Presencial QR:** Escaneie códigos QR presencialmente com familiares e vizinhos para trocar chaves criptográficas E2EE X25519/Ed25519.
3. **Reserva de Energia:** Mantenha celulares e baterias externas totalmente carregados.

### 🔴 Fase 2: Desastre Ativo e Apagão Total (Active Disaster & Blackout)
1. **Ativação Imediata:** Abra o OutGrid Mesh assim que as redes de celular ou energia caírem.
2. **Emergência Crítica / Soterrados:**
   - Pressione o botão vermelho **SOS** por 1 segundo para irradiar o micro-pacote de 21 bytes (GPS/H3) por 15 saltos.
   - Em escombros ou no escuro, acione o **Código Morse Acústico e Luz Estroboscópica** para guiar as equipes de resgate.
3. **Pessoas em Segurança:** Mantenha o app em segundo plano atuando como **Nó Repetidor (Relay Node)** comunitário.
4. **Mensagem para Destinatário Offline (Caixa Postal Espacial H3):** Se enviar mensagem para alguém sem sinal, ela fica sob custódia dos nós vizinhos do hexágono H3 (Spatial H3 Drop-box) e é entregue via BLE sem cliques quando ele se aproximar.

### 🔵 Fase 3: Resgate e Mula de Dados (Rescue & Data Mule)
1. **Mulas de Dados:** Barcos de resgate, ambulâncias e equipes móveis ($\ge 15\text{ km/h}$) absorvem pacotes com congelamento de saltos (Hop Freeze).
2. **Restauração em Nuvem (Auto-Flush):** Ao atingir cobertura de internet ou o comando central, os dados são enviados para a nuvem automaticamente em segundos.
