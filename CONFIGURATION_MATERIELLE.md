# 🖥️ Spécifications & Prérequis Matériels — OpenPeek

Ce document détaille les **exigences matérielles**, l'**impact des composants (GPU, CPU, RAM)** et les **performances attendues** pour tirer le meilleur parti d'OpenPeek selon votre usage (tutoriels, démos logicielles, gameplay, montage vidéo).

---

## 📊 1. Paliers de Configuration Recommandés

| Composant | 🥉 Configuration Minimale (Bureautique / Démos) | 🥈 Configuration Recommandée (Polyvalente / Standard) | 🥇 Configuration Haute Performance (Studio / 4K / Jeux) |
| :--- | :--- | :--- | :--- |
| **Système d'exploitation** | Windows 10 (64-bit, v1903+) ou Windows 11 | Windows 10/11 (64-bit) | Windows 11 (64-bit) |
| **Processeur (CPU)** | Intel Core i3 / i5 (8ᵉ gén+) ou AMD Ryzen 3 (3000+) | Intel Core i5 / i7 (10ᵉ gén+) ou AMD Ryzen 5/7 (4000+) | Intel Core i7 / i9 (12ᵉ gén+) ou AMD Ryzen 7/9 (5000+) |
| **Carte Graphique (GPU)** | iGPU Intel UHD 620+ / Iris Xe ou AMD Radeon Vega | GPU dédié : NVIDIA GTX 1650/1660, RTX 3050 ou AMD RX 6500/6600 | NVIDIA RTX 3060/4060 ou supérieur, AMD RX 6700/7700+ |
| **Mémoire Vive (RAM)** | 8 Go DDR4 | 16 Go DDR4 / DDR5 | 32 Go DDR4 / DDR5 |
| **Mémoire Vidéo (VRAM)** | Partagée avec le système | 4 Go de VRAM dédiée | 6 à 8+ Go de VRAM dédiée |
| **Stockage** | Disque SSD SATA ou NVMe (500 Mo libres) | SSD NVMe (2 Go libres pour cache vidéo) | SSD NVMe haute vitesse (PCIe 3.0/4.0) |
| **Encodeur Matériel** | Intel QuickSync ou AMD AMF de base | NVIDIA NVENC (Turing+) ou QuickSync récent | NVIDIA NVENC (Ada Lovelace / Ampere) |

---

## 🎯 2. Matrice d'Usage : Résolutions & Résultats Attendus

| Usage type | Résolution | Fréquence (FPS) | Palier matériel conseillé | Résultat attendu |
| :--- | :--- | :--- | :--- | :--- |
| **Tutoriel bureautique, SaaS, web** | 1080p | 30 fps | 🥉 Minimale (iGPU) | **Parfaitement fluide**, consommation CPU < 5%. |
| **Présentation produit & Marketing** | 1080p | 60 fps | 🥈 Recommandée | **Fluidité studio**, animations du curseur et zooms ultra-nets. |
| **Capture multi-écrans + Webcam HD** | 1080p | 30 / 60 fps | 🥈 Recommandée | Rendu simultané des deux flux sans baisse de cadence. |
| **Capture logicielle 4K / Graphisme** | 4K (2160p) | 30 fps | 🥈 Recommandée | Texte et code sources ultra-fins sans crénelage. |
| **Gameplay 3D & Moteur temps réel** | 1080p / 4K | 60 fps | 🥇 Haute Performance | Aucun impact mesurable sur les FPS du jeu capturé grâce au GPU dédié. |
| **Exports GIF animés (Documentation)** | 720p / 1080p | 12 - 24 fps | 🥉 Minimale | Conversion optimisée en quelques secondes. |

---

## 🔍 3. Rôle Détaillé des Composants Techniques

### 🎮 A. Carte Graphique (GPU & VRAM)
Le GPU est le composant le plus important pour garantir la fluidité de la capture et du studio de montage :
1. **Accélération matérielle Canvas 2D/3D** :
   - OpenPeek utilise un moteur de composition Canvas temps réel accéléré via DirectX / Direct3D (fourni par WebView2 / Windows).
   - Les effets de **lissage cinématique du curseur (120 Hz)**, les **zooms fluides (lissage sinusoïdal)**, les **masques de flou de confidentialité** et la **bulle webcam circulaire** sont tous calculés par le GPU.
2. **Encodeurs vidéo dédiés (NVENC, QuickSync, VCN)** :
   - Lors de l'enregistrement de l'écran, le flux est compressé par l'encodeur matériel du GPU (`MediaRecorder` avec accélération matérielle).
   - **Avec encodeur matériel GPU** : utilisation du CPU quasi-nulle (2 à 5%), aucun ralentissement de vos applications.
   - **Sans encodeur matériel GPU (rendu logiciel)** : le processeur effectue l'encodage, faisant monter l'utilisation CPU entre 40% et 70%.
3. **Consommation VRAM (Mémoire vidéo)** :
   - Une image 1080p non compressée en mémoire tampon pèse environ **8 Mo**.
   - Une image 4K non compressée pèse environ **33 Mo**.
   - À 60 images par seconde, le débit de traitement vidéo en 4K atteint environ **2 Go/s**. C'est pourquoi un GPU dédié ou un iGPU avec de la RAM rapide en double canal (*dual-channel*) est recommandé pour la 4K.

---

### 🧠 B. Processeur (CPU)
Le CPU prend le relais pour les opérations de traitement de signal et de post-production :
1. **Découpage intelligent des silences (VAD)** :
   - Analyse spectrale audio en temps réel (RMS / décibels via Web Audio API).
   - Très léger : s'exécute sur n'importe quel processeur moderne sans ralentissement.
2. **Quantification des couleurs pour les GIF animés (`gifenc`)** :
   - Réduction de millions de couleurs vers une palette optimale de 256 couleurs (arbre octree).
   - Calcul purement processeur : plus le CPU a de cœurs véloces, plus l'export GIF est rapide (généralement 2 à 5 secondes).
3. **Conversion universelle MP4 (FFmpeg)** :
   - Transcodage ultra-rapide en H.264 (`libx264 -preset ultrafast`) et audio AAC.
   - Sur un CPU récent (6 à 8 cœurs), une minute de vidéo est transcodée en **moins de 3 secondes**.

---

### 💾 C. Mémoire Vive (RAM) & Stockage (SSD)
1. **RAM système** :
   - **8 Go** : suffisant pour l'enregistrement et le montage de clips courts à moyens en 1080p.
   - **16 Go** : recommandé si vous enregistrez avec de nombreux logiciels lourds ouverts en arrière-plan (navigateurs avec dizaines d'onglets, IDE, suites bureautiques).
   - **32 Go** : idéal pour les montages multi-pistes 4K comportant de nombreux clips volumineux.
2. **Stockage SSD** :
   - Un disque SSD (SATA ou NVMe) est fortement recommandé par rapport aux disques durs magnétiques traditionnels (HDD).
   - Les vidéos brutes et le cache IndexedDB nécessitent des vitesses d'écriture constantes (>200 Mo/s) pour éviter les saccades lors des enregistrements prolongés.

---

## 🛠️ 4. Outils & Prérequis Logiciels Complémentaires

### 🎬 A. FFmpeg (Recommandé pour l'export MP4 universel)
- **Rôle** : Permet la conversion instantanée de vos montages en véritable format **MP4 universel** (H.264 standard + audio AAC 192 kbps), lisible sur tous les téléviseurs, smartphones (iOS, Android), réseaux sociaux et dans Windows Media Player.
- **Vérification** : OpenPeek détecte automatiquement si `ffmpeg.exe` est installé sur votre ordinateur (dans le `PATH`, dans WinGet Packages ou dans Program Files).
- **Installation en 1 commande sous Windows** (si non présent) :
  ```powershell
  winget install Gyan.FFmpeg
  ```

### 🎙️ B. Périphériques Audio & Vidéo
- **Microphones** : Tout microphone USB ou prise jack 3.5mm est supporté. Un taux d'échantillonnage de **48 kHz** (standard Windows) est recommandé.
- **Webcams** : Compatible avec toutes les webcams USB UVC (720p, 1080p, 4K) ainsi que les caméras virtuelles (OBS Virtual Camera, Camo, Elgato Facecam).
- **Multi-écrans** : Prise en charge transparente des configurations multi-moniteurs avec résolutions mixtes (ex. Écran principal 4K à 150% de mise à l'échelle + Écran secondaire 1080p à 100%).

---

## ⚡ 5. Conseils d'Optimisation pour Petites Configurations

Si vous utilisez un ordinateur d'entrée de gamme ou un ultraportable léger :
1. **Privilégiez le format 1080p à 30 fps** dans les options d'enregistrement (rendu impeccable et charge matérielle minimale).
2. **Activez l'accélération matérielle dans Windows** :
   - *Paramètres Windows > Système > Affichage > Graphiques > Modifier les paramètres graphiques par défaut > Activer la planification de processeur graphique à accélération matérielle (HAGS)*.
3. **Fermez les applications gourmandes en arrière-plan** (jeux 3D, moteurs de rendu) pendant la capture pour libérer la VRAM de l'iGPU.
4. **Pour les exports GIF**, limitez la durée du segment sélectionné à moins de 30 secondes pour une génération instantanée.
