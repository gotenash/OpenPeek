<div align="center">

# 🎬 OpenPeek

**The Ultimate Modern Screen Recorder & Video Studio for Windows**  
*L'enregistreur d'écran et studio de montage moderne ultime pour Windows*

[![Tauri](https://img.shields.io/badge/Tauri_v2-24C8D5?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Rust](https://img.shields.io/badge/Rust-black?style=for-the-badge&logo=rust&logoColor=E57324)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

[**English**](#-english) • [**Français**](#-français)

</div>

---

# 🇬🇧 English

## ✨ Overview

**OpenPeek** is an open-source, ultra-lightweight, GPU-accelerated screen recording suite and video editing studio for Windows. Built on Rust (Tauri v2) and React 19/TypeScript, it features a **Dynamic AI Subtitles Studio**, **AI Voiceover Generator (TTS)**, **Multi-Track Video Compositor**, **Device Mockup Framing**, **Live Annotation Palette**, and **Privacy Auto-Redaction System** — all running fast, with zero bloatware and 100% local privacy.

---

## 🚀 Key Features

### 🎙️ 1. Dynamic Subtitles & AI Captions Studio
- **Ultra-Fast Whisper STT**: Transcribe entire video audio in ~1 second using Groq Whisper Large v3 or OpenAI Whisper.
- **Word Animations (Pop / Bounce / Zoom)**: Real-time active word kinetic highlighting (Hormozi / TikTok style elastic pop, dynamic vertical bounce, or focal zoom).
- **Punchy Short Segmenting**: Automatically chunks sentences into 3–4 word blocks with precise word-level timestamps to ensure text never overflows screen boundaries.
- **🧹 Filler Words Cleaner**: 1-click removal of verbal tics (*"um"*, *"uh"*, *"euh"*, *"like"*, *"you know"*), stuttering, and accidental repeated words.
- **🌐 1-Click Multilingual Translation**: Translate subtitles into 10+ languages (English, Spanish, German, Italian, French, Japanese, etc.) while preserving millisecond-exact timing.
- **SRT & VTT Support**: Import existing subtitle files or export with formatted `.srt` and `.vtt`.
- **Smart Voice Activity Detection (VAD)**: Analyze audio energy (RMS) to place segment markers around actual speech bursts without requiring an API key.

### 🎥 2. Pro Screen Recording, Audio & Global Hotkeys
- **Global Hotkeys (Anywhere on Windows)**:
  - **`F6`** or **`Alt + R`**: Start or Stop recording.
  - **`F7`** or **`Alt + P`**: Pause or Resume recording.
- **⏱️ Full-Screen 3-2-1 Countdown**: Glowing neon countdown overlay directly on screen before capture starts.
- **4K, 1080p, and 720p 60fps** capture using hardware-accelerated VP9, VP8, and H.264 codecs.
- **Multi-Monitor Support**: Automatic monitor detection and seamless multi-display capture via Win32 GDI.
- **Independent Audio Mixing**: Capture Voice Microphone and System Audio (Desktop sounds) simultaneously.
- **Smart Audio DSP Filters**: Built-in 85Hz Anti-Rumble High-Pass filter (cuts PC fan hum and desk bumps) and 3.5kHz vocal clarity presence filter.
- **Draggable Facecam (Webcam)**: Smooth circular picture-in-picture webcam with live preview, mirror mode, and custom glow halo.
- **Click Ripple Visualizer**: Neon animated rings under mouse clicks with distinct left/right click colors.

### 🔍 3. Dynamic Cursor Zoom
- **`F9` / `Alt + Z`**: Instantly zooms 2.0x centered directly on the mouse cursor with smooth cubic-bezier easing.

### ✏️ 4. Freeze & Draw Annotation Engine
- **`F8` / `Alt + D`**: Instantly freezes the screen frame and opens an overlay toolbar to annotate without triggering underlying links or buttons.
- **Tools**: Freehand Marker, Directional Arrows, Framing Rectangles, Translucent Highlighter.
- **Auto-Fade Ink**: Ephemeral ink disappearing automatically after 3.5 seconds.
- **`F10` / `Alt + C`**: Clear all drawings instantly.
- **`Escape`**: Exit drawing mode and restore full interactive control.

### 📱 5. Device Mockup Framing Studio
- Wrap your recorded tutorials inside sleek 2D/3D device frames:
  - **MacBook Pro** (Space Gray / Silver)
  - **iPhone 16 Pro** (Titanium Frame)
  - **iPad Pro** (Tablet presentation)
  - **Browser Glass Window** (Safari / Chrome dark & light header)
- Customizable gradient / mesh backdrops and real-time GPU re-encoding.

### 🔒 6. Draggable Privacy Blur Masks & Auto-Redaction
- Place persistent pixelation / frosted blur boxes over sensitive data (passwords, API keys, emails).
- Move and resize blur zones directly on the live dashboard preview.
- **Auto-Redact Video Exporter**: Batch-blur sensitive coordinates across the entire video file with client-side canvas re-encoding.

### 🎞️ 7. Animated GIF Exporter
- Convert screen captures or subtitled clips directly into high-framerate lightweight animated GIFs.
- Customizable FPS (10, 15, 20, 24 fps), resolution downscaling, speed multiplier (1x, 1.25x, 1.5x, 2x), and loop count.

### ✂️ 8. Post-Capture Video Trimmer
- Integrated trimmer in the Video Library to cut beginning hesitations and ending silence with 0.1s accuracy.
- Real-time looping preview and client-side instant re-encoding.

### 🎬 9. Multi-Track Video Studio, Voiceover TTS & Audio Bin
- **Video Track**: Re-order, arrange, and trim multiple clips from your library.
- **Transitions**: Smooth *Crossfade*, *Fade to Black*, *Slide*, and *Cut*.
- **Title & Text Track**: Customizable Intro cards, Lower-Third banners, and Outro titles with glassmorphism styles.
- **🎙️ AI Voiceover Generator (TTS)**: Generate high-definition studio commentary from text scripts using OpenAI TTS (`nova`, `alloy`, `echo`, `shimmer`, `onyx`, `fable`) or offline Windows voices.
- **🎵 Background Music & Audio Bin**: Import your own MP3/WAV/M4A files or choose from built-in royalty-free ambient presets (*Lo-Fi Chill*, *Modern Tech*, *Ambient Focus*, *Acoustic Calm*) with dedicated volume slider and audio ducking.
- **Project Persistence**: Save and reload your `.captproj` editing project files to resume work at any time.
- **Full Audio & Video Exporter**: Generates a unified high-definition video or animated GIF with full voice, voiceover, and background music mixed.

---

## 🤖 AI Services & API Keys Guide

| Feature | Recommended Engine | API Key Required? | Cost / Pricing | Commercial Use |
| :--- | :--- | :--- | :--- | :--- |
| **Transcription (STT)** | **Groq Whisper Large v3** | Free key on [console.groq.com](https://console.groq.com) | **Free tier available** (Ultra fast ~1s) | ✅ Allowed |
| **Subtitle Translation** | **Groq LLM / OpenAI** | Same Groq / OpenAI key | **< $0.001 per video** | ✅ Allowed |
| **Voiceover (Free)** | **Local Windows Speech** | ❌ **No key needed (100% Offline)** | **Free forever** | ✅ Allowed |
| **Voiceover (HD Studio)** | **OpenAI TTS (`tts-1`)** | Key on [platform.openai.com](https://platform.openai.com) | **$0.015 / 1k chars** (~$0.06 for 5 min video) | ✅ 100% Commercial Rights |

> 🔒 **Privacy Guarantee**: All API keys are stored exclusively in your local machine storage (`localStorage`). They are never transmitted to any third-party telemetry server.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`F6`** or **`Alt + R`** | **Start / Stop Recording** | Triggers 3-2-1 screen countdown and starts or saves recording |
| **`F7`** or **`Alt + P`** | **Pause / Resume** | Pauses or resumes the ongoing recording |
| **`F9`** or **`Alt + Z`** | **Dynamic Zoom** | Zooms 2x centered on the current mouse position |
| **`F8`** or **`Alt + D`** | **Freeze & Draw** | Freezes screen and opens drawing overlay |
| **`F10`** or **`Alt + C`** | **Clear Drawings** | Clears all marker strokes on screen |
| **`Escape`** | **Exit Drawing** | Unfreezes screen and restores interactive control |

---

## 🛠️ Tech Stack & Architecture

- **Desktop Framework**: [Tauri v2](https://tauri.app) (Rust)
- **Frontend UI**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev)
- **Speech Recognition & TTS**: Groq Whisper Large v3, OpenAI TTS-1, Web Speech API
- **Audio DSP**: Web Audio API Filter Nodes (BiquadFilter, DynamicsCompressor)
- **Icons**: [Lucide React](https://lucide.dev)
- **Local Storage**: IndexedDB (100% offline and private)
- **Native OS APIs**: Win32 GDI (`MonitorFromPoint`, `GetMonitorInfoW`), Global Windows Hooks

---

## 📦 Installation & Development

### Prerequisites
- [Node.js](https://nodejs.org) (v18+)
- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- Windows 10 / 11

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/gotenash/OpenPeek.git
cd openpeek

# 2. Install dependencies
npm install

# 3. Run in Development Mode (Live Hot-Reload)
npm run tauri dev

# 4. Build Production Standalone Executable (.exe / .msi)
npm run tauri build
```

---

<br/>

# 🇫🇷 Français

## ✨ Présentation

**OpenPeek** est une suite logicielle open-source d'enregistrement d'écran et de montage vidéo ultra-légère, accélérée par GPU et respectueuse de votre vie privée. Conçue avec Rust (Tauri v2) et React 19/TypeScript, elle intègre un **Studio de Sous-titres IA Dynamiques**, un **Générateur de Voix Off**, un **Studio Multi-Pistes**, l'**Habillage Device Mockup (MacBook, iPhone, iPad)**, une **Palette d'Annotation** et des **Masques d'Anonymisation**.

---

## 🚀 Fonctionnalités Principales

### 🎙️ 1. Studio de Sous-titres & Captions Dynamiques (IA)
- **Transcription Ultra-Rapide Whisper** : Transcrivez l'audio de vos vidéos en moins de 2 secondes avec Groq Whisper ou OpenAI.
- **Animations de Mots Dynamiques (Pop / Rebond / Zoom)** : Effet cinétique mot à mot (style Hormozi / TikTok, rebond vertical fluide ou mise en avant focalisée).
- **Découpage Punchy (3-4 mots)** : Segmente automatiquement les prises de parole en blocs courts avec horodatages précis mot à mot pour éviter tout dépassement d'écran.
- **🧹 Nettoyeur de Tics de Langage** : Suppression en 1 clic des hésitations (*"euh"*, *"hum"*, *"genre"*, *"du coup"*, *"en fait"*), des bégaiements et des répétitions.
- **🌐 Traduction Multilingue en 1 clic** : Traduisez vos sous-titres dans plus de 10 langues (Anglais, Espagnol, Allemand, Italien, Japonais...) en conservant le minutage exact.
- **Import / Export SRT & VTT** : Chargez vos fichiers existants ou exportez vos sous-titres en un clic.
- **Découpage VAD (Détection d'Activité Vocale)** : Découpage intelligent basé sur les silences réels sans clé API.

### 🎥 2. Enregistrement Écran, Raccourcis Globaux & Audio
- **Raccourcis Clavier Partout sous Windows** :
  - **`F6`** ou **`Alt + R`** : Démarrer / Arrêter l'enregistrement à tout moment.
  - **`F7`** ou **`Alt + P`** : Mettre en Pause / Reprendre la capture.
- **⏱️ Compte à Rebours 3-2-1 Plein Écran** : Animation visuelle lumineuse en surimpression au centre de votre écran avant le début de la capture.
- **4K, 1080p et 720p à 60 FPS** avec les codecs matériels VP9, VP8 et H.264.
- **Support Multi-Écrans** : Détection automatique des moniteurs secondaires sous Windows.
- **Mixage Audio Indépendant** : Enregistrez simultanément le microphone (voix) et le son système (bureau).
- **Filtres DSP Audio Intelligents** : Filtre passe-haut anti-ronflement (ventilation, bruits de bureau) et rehausseur de présence vocale.
- **Facecam Déplaçable** : Bulle caméra circulaire avec aperçu en direct, mode miroir et halo néon personnalisé.
- **Ondes de Clics Visuelles** : Animation circulaire néon sous le curseur à chaque clic gauche/droit.

### 🔍 3. Zoom Dynamique au Curseur
- **`F9` / `Alt + Z`** : Zoom fluide 2.0x centré instantanément sur la position de la souris.

### ✏️ 4. Feutre & Annotation sur Écran Figé (*Freeze & Draw*)
- **`F8` / `Alt + D`** : Fige l'écran instantanément et ouvre la barre d'outils de dessin sans cliquer par inadvertance sur vos applications.
- **Outils** : Feutre libre, Flèches directionnelles, Rectangles d'encadrement, Surligneur translucide.
- **Encre Éphémère (Auto-Fade)** : Les traits s'effacent automatiquement après 3.5 secondes.
- **`F10` / `Alt + C`** : Tout effacer d'un coup.
- **`Échap`** : Dégèle l'écran et redonne le contrôle interactif.

### 📱 5. Studio d'Habillage Mockup Device
- Intégrez vos vidéos dans des cadres d'appareils élégants :
  - **MacBook Pro** (Gris sidéral / Argent)
  - **iPhone 16 Pro** (Cadre Titane)
  - **iPad Pro** (Tablette)
  - **Fenêtre de Navigateur Dépolie** (Header Safari / Chrome clair ou sombre)
- Arrière-plans dégradés / mesh modernes et rendu GPU direct.

### 🔒 6. Masques de Confidentialité Déplaçables & Auto-Redaction
- Posez des rectangles de flou permanent sur vos données sensibles (mots de passe, clés d'API, emails).
- Déplacez et redimensionnez la zone de flou directement sur le tableau de bord.
- **Export Anonymisé** : Ré-encode la vidéo avec floutage automatique des zones définies.

### 🎞️ 7. Exportateur GIF Animé
- Convertissez vos captures ou extraits sous-titrés en GIFs légers et fluides.
- Choix de la cadence (10 à 24 FPS), échelle de résolution, multiplicateur de vitesse et bouclage.

### ✂️ 8. Mini-Studio de Découpe (Rognage)
- Rognez les hésitations au début et à la fin de vos vidéos dans l'onglet **Mes Vidéos**.
- Réglage fin à 0.1s près et export instantané côté client.

### 🎬 9. Studio de Montage Multi-Pistes, Voix Off IA & Chutier Audio
- **Piste Vidéo** : Assemblez plusieurs captures issues de votre bibliothèque, changez l'ordre et rognez les clips.
- **Transitions** : *Fondu enchaîné*, *Fondu au noir*, *Balayage*, *Coupure*.
- **Piste Titres & Textes** : Cartons d'intro, bandeaux inférieurs (*lower-thirds*) et cartons de fin personnalisables.
- **🎙️ Générateur de Voix Off IA (Text-to-Speech)** : Créez des commentaires de qualité studio à partir de scripts textuels avec OpenAI TTS (`nova`, `alloy`, `echo`, `shimmer`, `onyx`, `fable`) ou les voix locales Windows gratuites.
- **🎵 Musique de Fond & Chutier Audio** : Importez vos fichiers audio (**MP3, WAV, M4A**) ou choisissez parmi les ambiances libres de droits intégrées (*Lo-Fi Chill*, *Modern Tech*, *Ambient Focus*, *Acoustic Calm*) avec curseur de volume fin pour ne jamais masquer les voix.
- **Sauvegarde de Projets** : Enregistrez et rechargez vos montages (`.captproj` / base locale) pour y revenir plus tard.
- **Exportateur Vidéo & GIF** : Génère une vidéo gravée HD avec tout le mixage audio (voix + voix off + musique) ou un GIF animé.

---

## 🤖 Guide des Clés API & Tarification IA

| Fonctionnalité | Moteur Recommandé | Clé API Requise ? | Coût / Tarification | Droits Commerciaux |
| :--- | :--- | :--- | :--- | :--- |
| **Transcription (STT)** | **Groq Whisper Large v3** | Clé gratuite sur [console.groq.com](https://console.groq.com) | **Gratuit (Quota offert)** (Vitesse ~1s) | ✅ Autorisés |
| **Traduction Sous-titres** | **Groq LLM / OpenAI** | Même clé Groq ou OpenAI | **< 0,001 € par vidéo** | ✅ Autorisés |
| **Voix Off (Gratuite)** | **Voix Locales Windows** | ❌ **Aucune clé (100% Hors-ligne)** | **100% Gratuit à vie** | ✅ Autorisés |
| **Voix Off HD Studio** | **OpenAI TTS (`tts-1`)** | Clé sur [platform.openai.com](https://platform.openai.com) | **0,015 $ / 1 000 car.** (~0,06 € pour 5 min) | ✅ 100% Propriétaire & Monétisable |

> 🔒 **Confidentialité Totale** : Vos clés d'API sont stockées exclusivement sur votre PC local (`localStorage`). Elles ne sont jamais envoyées à un serveur intermédiaire tiers.

---

## ⌨️ Raccourcis Clavier Globaux

| Raccourci | Action | Description |
| :--- | :--- | :--- |
| **`F6`** ou **`Alt + R`** | **Démarrer / Arrêter** | Affiche le compte à rebours 3-2-1 plein écran et lance/enregistre la capture |
| **`F7`** ou **`Alt + P`** | **Pause / Reprendre** | Met en pause ou reprend l'enregistrement en cours |
| **`F9`** ou **`Alt + Z`** | **Zoom Dynamique** | Zoome à 200% centré sur la souris |
| **`F8`** ou **`Alt + D`** | **Feutre & Dessin** | Fige l'écran et active la palette de dessin |
| **`F10`** ou **`Alt + C`** | **Effacer les traits** | Supprime tous les dessins à l'écran |
| **`Échap`** | **Quitter le dessin** | Dégèle l'écran et redonne le contrôle interactif |

---

## 📦 Compilation & Installation

```bash
# 1. Cloner le projet
git clone https://github.com/gotenash/OpenPeek.git
cd openpeek

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement
npm run tauri dev

# 4. Compiler l'exécutable autonome pour Windows (.exe / .msi)
npm run tauri build
```

---

## 📄 Licence

Ce projet est distribué sous licence **MIT**.
