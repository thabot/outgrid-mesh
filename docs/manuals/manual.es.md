# Guía de Supervivencia y Operaciones en Campo de OutGrid Mesh (ES)
**Protocolo:** Thabot OutGrid Protocol (TOG v1.1)  
**Autor:** Thabot (<thabo47@gmail.com>)  
**Licencia:** AGPL-3.0 Bien Público Humanitario sin Fines de Lucro

---

## 1. Instalación de la Aplicación

### Conexión a Internet Disponible:
1. Descargue la versión oficial (`outgrid-mesh.apk`) o de prueba (`outgrid-mesh-uat.apk`) desde GitHub Releases.
2. Abra el archivo en su móvil Android y confirme "Permitir instalación desde orígenes desconocidos".
3. Conceda los permisos indispensables:
   - **Bluetooth y Dispositivos Cercanos:** Para el descubrimiento de nodos y la retransmisión en malla.
   - **Ubicación:** Para georreferenciar las alertas SOS y activar la navegación por radar.
   - **Exención de Optimización de Batería:** Para operar en segundo plano las 24 horas con pantalla apagada.

### Instalación Fuera de Línea en Zona de Desastre (Wi-Fi Sideload):
1. Acérquese a un compañero o socorrista que ya tenga instalada la app.
2. Pídale que active **"Emergency APK Sideload"** (creará una zona Wi-Fi local sin consumo de datos).
3. Conéctese a esa red Wi-Fi y abra en su navegador `http://192.168.49.1:8080` para descargar el APK directamente.

---

## 2. Tipos de Operación y Funcionalidades

### 🚨 1. Baliza de Emergencia SOS de Un Toque
- Mantenga presionado el **botón rojo SOS** durante 1 segundo.
- Seleccione el tipo de peligro (heridos graves, atrapados por inundación, derrumbe de edificio).
- El sistema comprime coordenadas GPS submétricas, celda H3 Res 9, batería y estado médico en solo **21 bytes**, transmitiéndose inmediatamente a todos los nodos circundantes.

### 💬 2. Chat Privado Cifrado Extremo a Extremo (1-on-1 E2EE)
- Seleccione a cualquier superviviente o rescatista detectado en la red.
- Envíe mensajes de texto, notas de voz de 15 segundos o fotografías WebP comprimidas del lugar del siniestro.
- Cifrado con **X25519 ECDH + AES-256-GCM**. Ningún nodo intermedio puede leer ni manipular los mensajes.

### 📢 3. Canal de Alertas Verificadas (Crisis Feed)
- Reciba órdenes oficiales de evacuación, puntos de distribución de agua y mapas de refugios seguros.
- Cada comunicado lleva una **Firma Digital Ed25519** de las autoridades, impidiendo rumores y noticias falsas.

### 🗺️ 4. Mapa Vectorial Fuera de Línea y Radar de Rescate
- Mapa mundial ultraligero de menos de 5MB, utilizable 100% sin conexión.
- Toque cualquier alerta SOS para activar la **Brújula de Navegación Radar**, que señala el rumbo y la distancia exacta en metros hacia la víctima.

### 🔦 5. Sirena Sonora Morse y Linterna Estroboscópica
- En situaciones de atrapamiento bajo escombros o en la oscuridad, active el sonido Morse SOS y el destello intermitente para guiar a los equipos de rescate.

---

## 3. Alcance de Transmisión y Especificaciones Físicas

| Medio de Comunicación | Alcance Efectivo por Salto | Entorno Óptimo | Velocidad de Datos |
| :--- | :---: | :--- | :---: |
| **BLE 5 Long Range (Coded PHY S=8)** | **300 – 1.000 metros** | Terrenos abiertos, campos, ríos, azoteas | ~125 kbps |
| **BLE Estándar (1M PHY)** | **30 – 100 metros** | Interiores urbanos, atravesando muros | ~1 Mbps |
| **Wi-Fi Direct P2P (SoftAP)** | **100 – 200 metros** | Transferencia directa de APKs y fotos | ~10 – 50 Mbps |
| **Puente LoRa Externo (ESP32)** | **5 – 15 kilómetros** | Montañas, zonas rurales aisladas | ~0.3 – 5 kbps |

- **Retransmisión Multi-Salto (Multi-Hop):** Los paquetes pueden saltar hasta **15 veces** entre móviles, cubriendo decenas de kilómetros a través de comunidades.
- **Mula de Datos (DTN Store-and-Forward):** Al desplazarse a pie, su móvil almacena los mensajes y los entrega automáticamente al encontrarse con personas en pueblos vecinos.

---

## 4. Limitaciones de Envío y Restricciones Operativas

1. **Tamaño de Carga Útil:**
   - Mensajes de texto y SOS: Máximo recomendado de **200 caracteres** para entrega instantánea.
   - Notas de voz: Límite estricto de **15 segundos**.
   - Fotos: Se comprimen automáticamente en WebP ligero para no saturar el canal radio.
2. **Control de Inundación de Red (Storm Guard):**
   - Sistema Counting Bloom Filter que descarta paquetes duplicados y evita bucles de retransmisión.
3. **Almacenamiento Local:**
   - Límite de **50MB** bajo política FIFO. Los mensajes SOS prioritarios jamás se eliminan.

---

## 5. Cuidado y Supervivencia de la Batería

- Por debajo del 20% de carga, entra en **Deep Hibernation**, optimizando el ciclo de escaneo para mantenerse operativo hasta **100+ horas de guardia**.
- Cierre otras aplicaciones en segundo plano para conservar energía vital de rescate.
