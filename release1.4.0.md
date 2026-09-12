# 🚀 OpenPeek v1.4.0 — Release Notes / Notes de Version

---

## 🇫🇷 Français

### ✨ Quoi de neuf dans OpenPeek v1.4.0 ?

**OpenPeek v1.4.0** franchit un nouveau cap dans la création de vidéos professionnelles, tutoriels et démonstrations logicielles en intégrant une **deuxième caméra de capture (B-Roll / Iriun Webcam)**, une **frise chronologique avec potard horizontal studio** et un **moteur de mixage audio multi-pistes**.

---

### 🌟 Points Forts de la Version 1.4.0

#### 1. 📹 Caméra Secondaire B-Roll & Cadrage en Direct (Iriun Webcam / USB)
- **Transformez votre smartphone en caméra B-roll** : Utilisez l'application gratuite **Iriun Webcam** (Wi-Fi ou câble USB) ou n'importe quelle webcam USB pour filmer vos mains, des schémas papier, des circuits électroniques ou des objets réels.
- **Retour visuel PiP flottant (Zero Screen Pollution)** : Une petite fenêtre de cadrage en direct apparaît en bas à droite de votre écran pendant la prise de vue pour vous permettre de cadrer vos gestes sans quitter votre scène des yeux. Ce retour est un overlay d'interface et **n'apparaît JAMAIS dans la vidéo enregistrée de votre écran**.
- **Déclenchement instantané** : Appuyez sur **`F10`** ou **`Alt + B`** (ou cliquez sur le bouton rougeoyant de la barre d'outils) à tout moment pendant la capture pour lancer ou terminer vos plans de coupe.
- **Montage automatique sur la Piste V2** : À l'arrêt de la capture, vos séquences B-roll sont automatiquement découpées et insérées sur la **Piste V2** du Studio à leurs **timecodes exacts** (`startTime`), avec passage en plein écran automatique au-dessus de la capture d'écran.

#### 2. 🎛️ Potard Horizontal d'Échelle Temporelle (Fader Studio Pro)
- **Zoom continu de 1.0x à 8.0x** : Ajustez la largeur temporelle de la frise chronologique selon vos besoins de précision. À `1.0x`, le projet tient dans la fenêtre ; à `8.0x`, chaque seconde s'étire sur 800% pour une découpe chirurgicale.
- **Design console analogique** : Fader studio avec rail rétroéclairé, crans de repères (1x, 2x, 4x, 8x) et boutons pas-à-pas `+` / `-`.
- **Raccourci Molette & Double-Clic** : Maintenez **`Ctrl`** et utilisez la molette de votre souris sur la frise pour zoomer/dézoomer intuitivement. Un double-clic sur le potard réinitialise instantanément à `1.0x`.
- **Défilement synchronisé & En-têtes Sticky** : Toutes les pistes défilent de concert avec une règle adaptative dont les graduations s'affinent au dixième de seconde, et des en-têtes ancrés fixes à gauche.

#### 3. 🎚️ Mixage Audio Multi-Pistes & Nœud de Gain Web Audio
- **Curseurs de volume indépendants par clip (0% à 100%)** : Réglez avec précision le volume de chaque élément sur la Piste 1 et la Piste 2, avec bouton Muet instantané.
- **Équilibrage Voix / Ambiance Caméra** : Lors des passages en superposition (Piste 1 + Piste 2), les deux pistes audio jouent simultanément selon les niveaux de volume que vous avez définis.
- **Fidélité sonore à l'export** : Un pipeline Web Audio avec `GainNode` dédié applique fidèlement vos réglages de mixage dans les fichiers vidéo MP4 et WebM exportés.

---

### 📦 Téléchargements & Installation

1. Téléchargez le programme d'installation Windows :
   - **Setup Installateur (NSIS)** : `OpenPeek_1.4.0_x64-setup.exe`
   - **Exécutable portable autonome** : `openpeek.exe`
   - **Package MSI (Français)** : `OpenPeek_1.4.0_x64_fr-FR.msi`
   - **Package MSI (Anglais)** : `OpenPeek_1.4.0_x64_en-US.msi`
2. Lancez l'exécutable pour mettre à jour ou installer OpenPeek v1.4.0.

---
---

## 🇬🇧 English

### ✨ What's New in OpenPeek v1.4.0?

**OpenPeek v1.4.0** elevates video tutorial production and presentation recordings to a new level by introducing **Secondary Camera B-Roll Capture (Iriun Webcam / USB)**, a **Studio-Grade Timeline Scale Potentiometer**, and an **Independent Multi-Track Audio Mixer**.

---

### 🌟 Key Highlights in v1.4.0

#### 1. 📹 Secondary Camera B-Roll & Live Framing PiP (Iriun Webcam / USB)
- **Smartphone & Webcam B-Roll**: Turn your smartphone into an HD B-roll camera using **Iriun Webcam** (over Wi-Fi or USB) or plug in a secondary USB camera to film physical hardware, paperwork, or live demonstrations.
- **Live Framing PiP Window (Zero Screen Pollution)**: A discreet picture-in-picture framing card floats at the bottom-right of your screen during B-roll takes, helping you position your subject perfectly. Because it's an interface overlay, it **never appears on your recorded screen canvas**.
- **Real-Time Hotkey Trigger**: Hit **`F10`** or **`Alt + B`** (or click the glowing toolbar button) anytime during capture to start or finish B-roll segments.
- **Automatic Track 2 (V2) Timeline Insertion**: When recording stops, your B-roll segments are automatically cut and placed onto **Track 2** of the Video Editor Studio at their exact timecodes (`startTime`), displaying fullscreen over Track 1 with smooth transitions.

#### 2. 🎛️ Horizontal Timeline Scale Potentiometer (Studio Fader)
- **Continuous 1.0x to 8.0x Zoom**: Effortlessly expand the timeline up to 800% for surgical frame-accurate cuts and alignment.
- **Console Studio Design**: Brushed textured fader head with illuminated slider track, tick markers (1x, 2x, 4x, 8x), and stepped `+` / `-` buttons.
- **Mouse Wheel & Double-Click Reset**: Hold **`Ctrl`** and scroll your mouse wheel over the timeline to zoom smoothly. Double-click the potentiometer to reset instantly to `1.0x`.
- **Synchronized Multi-Track Scroll & Sticky Headers**: Adaptive master ruler ticks refine to sub-second precision, while track names and quick-action buttons remain anchored to the left.

#### 3. 🎚️ Multi-Track Audio Mixing & Web Audio Gain Pipeline
- **Per-Clip Volume Sliders (0% to 100%)**: Individually adjust the audio level of each clip on Track 1 and Track 2, complete with quick-mute toggles.
- **Voice / B-Roll Balance**: During multi-track overlaps, both audio streams play simultaneously according to your chosen volume mix.
- **Accurate Master Export**: A dedicated Web Audio `GainNode` pipeline guarantees that your exported MP4 and WebM files preserve your exact studio mix.

---

### 📦 Downloads & Installation

1. Download the Windows installer:
   - **NSIS Setup Installer**: `OpenPeek_1.4.0_x64-setup.exe`
   - **Standalone Portable Executable**: `openpeek.exe`
   - **MSI Installer (French)** : `OpenPeek_1.4.0_x64_fr-FR.msi`
   - **MSI Installer (English)**: `OpenPeek_1.4.0_x64_en-US.msi`
2. Run the installer to upgrade or install OpenPeek v1.4.0.
