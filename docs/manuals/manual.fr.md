# Guide de Survie et d'Opérations de Terrain OutGrid Mesh (FR)
**Protocole:** Thabot OutGrid Protocol (TOG v1.1)  
**Auteur:** Thabot (<thabo47@gmail.com>)  
**Licence:** AGPL-3.0 Bien Public Humanitaire à But Non Lucratif

---

## 1. Installation de l'Application

### Avec Connexion Internet:
1. Téléchargez la version officielle (`outgrid-mesh.apk`) ou la version de test (`outgrid-mesh-uat.apk`) depuis GitHub Releases.
2. Ouvrez le fichier sur votre smartphone Android et acceptez "Autoriser l'installation depuis des sources inconnues".
3. Accordez les permissions indispensables :
   - **Bluetooth et Appareils à proximité :** Pour la découverte des nœuds et le routage en réseau maillé.
   - **Position géographique :** Pour intégrer vos coordonnées précises aux alertes SOS et guider le radar.
   - **Exemption d'optimisation de batterie :** Pour maintenir le relais actif 24h/24 en arrière-plan écran éteint.

### Installation Hors-Ligne en Zone de Catastrophe (Wi-Fi Sideload) :
1. Repérez un appareil équipé d'OutGrid Mesh à proximité.
2. Demandez-lui d'activer **"Emergency APK Sideload"** (création d'un point d'accès Wi-Fi local sans données).
3. Connectez votre téléphone à ce réseau Wi-Fi et accédez à `http://192.168.49.1:8080` depuis votre navigateur pour télécharger directement le fichier APK.

---

## 2. Fonctionnalités et Modes d'Utilisation

### 🚨 1. Balise de Détresse SOS en Un Seul Clic
- Maintenez le bouton rouge **SOS** enfoncé pendant 1 seconde.
- Sélectionnez la catégorie de triage (blessure grave, piégé par les eaux, bâtiment effondré).
- Le moteur compresse vos coordonnées GPS submétriques, l'hexagone H3 Res 9 et le niveau de batterie en un micro-paquet de **21 octets** diffusé immédiatement par inondation épidémique.

### 💬 2. Messagerie Privée Chiffrée de Bout en Bout (1-on-1 E2EE)
- Touchez n'importe quel contact détecté sur le maillage.
- Envoyez des messages texte, des mémos vocaux de 15 secondes ou des photos WebP du sinistre.
- Chiffrement de niveau militaire **X25519 ECDH + AES-256-GCM**. Les nœuds intermédiaires ne peuvent ni intercepter ni modifier vos messages.

### 📢 3. Fil d'Alertes Certifiées de Crise (Crisis Feed)
- Recevez les ordres d'évacuation officiels, les points de ravitaillement en eau potable et les abris d'urgence.
- Chaque publication comporte une **Signature Numérique Ed25519** des autorités afin d'éliminer toute fausse information.

### 🗺️ 4. Carte Vectorielle Hors-Ligne et Boussole Radar
- Carte mondiale ultralégère (<5 Mo), 100% utilisable sans connexion internet.
- Appuyez sur une balise SOS pour ouvrir la **Navigation Radar**, indiquant en temps réel la direction et la distance directe en mètres vers la victime.

### 🔦 5. Sirène Sonore Morse et Lampe Stroboscopique
- En cas d'ensevelissement ou d'obscurité totale, activez le signal sonore Morse SOS et le flash clignotant pour guider les secouristes.

---

## 3. Portée et Caractéristiques Physiques

| Vecteur Radio | Portée par Saut (Per Hop) | Environnement Optimal | Débit Utile |
| :--- | :---: | :--- | :---: |
| **BLE 5 Long Range (Coded PHY S=8)** | **300 – 1 000 mètres** | Espaces dégagés, campagnes, plans d'eau, toits | ~125 kbps |
| **BLE Standard (1M PHY)** | **30 – 100 mètres** | Bâtiments urbains, à travers les cloisons | ~1 Mbps |
| **Wi-Fi Direct P2P (SoftAP)** | **100 – 200 mètres** | Partage d'APK direct, photos de terrain | ~10 – 50 Mbps |
| **Pont LoRa Externe (ESP32)** | **5 – 15 kilomètres** | Traversée de montagnes, liaisons interurbaines | ~0.3 – 5 kbps |

- **Routage Multi-Sauts :** Les paquets peuvent franchir jusqu'à **15 sauts** consécutifs de téléphone en téléphone, reliant des villages distants de dizaines de kilomètres.
- **Mule de Données (DTN Store-and-Forward) :** En l'absence de réseau continu, l'appareil stocke les alertes et les retransmet automatiquement aux personnes croisées en chemin.

---

## 4. Limites de Transmission et Bonnes Pratiques

1. **Taille des Données :**
   - Textes et SOS : Limiter à **200 caractères** pour une propagation instantanée en bas débit.
   - Mémos vocaux : Plafonnés à **15 secondes**.
   - Photos : Automatiquement réduites en WebP basse résolution.
2. **Protection Anti-Tempête (Storm Guard) :**
   - Un filtre de Bloom à comptage empêche la retransmission multiple des mêmes paquets.
3. **Plafond Mémoire :**
   - Stockage local bridé à **50 Mo** en FIFO. Les SOS vitaux ne sont jamais purgés.

---

## 5. Gestion Énergétique et Autonomie

- En dessous de 20% de batterie, le système bascule en **Deep Hibernation**, réduisant l'intervalle de scan radio pour préserver plus de **100 heures d'autonomie**.
- Fermez les applications tierces inutilisées afin de réserver votre batterie aux communications de sauvetage.
