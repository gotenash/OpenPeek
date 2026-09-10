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

[**English**](#-english) • [**Français**](#-français) • [**Documentation Utilisateur**](DOC_UTILISATEUR.md) • [**Configuration Matérielle**](CONFIGURATION_MATERIELLE.md)

</div>

---

# 🇬🇧 English

## ✨ Overview

**OpenPeek** is an open-source, ultra-lightweight, GPU-accelerated screen recording suite and video editing studio for Windows. Built on Rust (Tauri v2) and React 19/TypeScript, it features a **Cinematic Studio Cursor**, **Live Keystroke HUD Visualizer**, **Automated Silence Remover**, **Fast-Forward Speed-Up Tool**, **Dynamic AI Subtitles Studio**, **Live Microphone Voiceover Recording**, **ElevenLabs & OpenAI Voiceover Generator (TTS)**, **Floating Teleprompter with Script Manager**, **Step-by-Step Tutorial Generator (Markdown/HTML/PDF)**, **YouTube Chapters Automation**, **Image & Logo Overlay (Watermarks)**, **Webcam Background Blur & Virtual Backdrops (Bokeh/Chroma Key)**, **FFmpeg-Powered MP4 Exporter**, **Multi-Track Video Compositor**, **Device Mockup Framing**, **Live Annotation Palette**, and **Privacy Auto-Redaction System** — all running fast, with zero bloatware and 100% local privacy.

---

## 🚀 Key Features

### 🪄 1. Cinematic Studio Cursor & Smoothing (*Screen Studio Effect*)
- **120Hz Native Win32 Tracking**: High-frequency cursor position monitoring in a low-overhead Rust background thread.
- **Dynamic Lerp Smoothing**: Removes mouse jitter and nervous twitches with selectable smoothing speeds (*Cinematic 0.28*, *Smooth 0.16*, *Direct 0.58*).
- **High-DPI Vector Pointer**: Replaces the pixelated native cursor with a crisp studio arrow, 3D drop shadow, and micro-rebound elastic pulse on clicks.
- **Customizable Studio Sizes**: Choose from *Normal (1.0x)*, *Large Studio (1.35x)*, or *Keynote (1.7x)* for maximum tutorial readability.
- **OS Cursor Masking**: Hides the native Windows cursor from capture automatically (`cursor: 'never'`).

### ⌨️ 2. Live Keystroke Visualizer HUD (*3D Keycaps Overlay*)
- **Real-Time Global Key Scanner**: Tracks modifier combos (`Ctrl`, `Alt`, `Shift`, `Win` + keys/arrows/actions) system-wide using Win32 `GetAsyncKeyState`.
- **Screen & Video Overlay**: Displays stylish floating 3D keycap pill badges with smooth fade-out directly on screen and permanently baked into recorded videos.
- **🛡️ Intelligent Recorder Filtering**: Internal OpenPeek shortcuts (`Alt+R`, `F6`, `Alt+P`, `F7`, `Alt+Z`, `F9`, `Alt+D`, `F8`, `Alt+C`, `F10`) are automatically filtered out to avoid polluting your tutorial footage.
- **Custom Placement**: Position HUD at *Bottom Center*, *Bottom Left*, *Bottom Right*, or *Top Right*.

### 🎭 3. AI Webcam Background Blur & Bokeh (*100% Offline*)
- **Local Neural Segmentation**: Powered by Google MediaPipe Selfie Segmentation running locally via WebAssembly & WebGL — zero cloud dependency, 100% privacy.
- **4 Background Modes**:
  - *Normal*: Raw camera feed with zero overhead.
  - *Subtle Blur (10px)*: Natural depth of field preserving scene context.
  - *Intense Blur (25px)*: Heavy portrait bokeh hiding all room background details.
  - *Cutout (Remove)*: Fully transparent background without any green screen.
- **Bubble Shapes & Neon Halos**: Works seamlessly with circular, squircle, or rectangular facecam bubbles with glowing neon borders.
- **Zero-Flicker Warmup**: Instant camera preview with no black-frame glitches.

### ✂️ 4. Automatic Silence Remover
- **Web Audio API Acoustic Analysis**: Fast client-side PCM energy (RMS/dB) calculation to detect speech pauses and dead air.
- **Interactive Threshold & Padding Controls**: Fine-tune silence threshold (`-50 dB` to `-20 dB`), minimum silence duration (`0.3s` to `1.5s`), and safety speech padding (`50ms` to `250ms`) so words are never clipped.
- **Visual Waveform Strip**: Color-coded preview (cyan for speech, red for cut pauses) with duration reduction percentage.
- **1-Click Splitting**: Instantly converts single recordings into dynamic, punchy multi-clip sequences in the Video Studio and Video Trimmer.

### ⏩ 5. Fast-Forward / Speed-Up on Loading Times
- **Per-Clip Speed Multiplier**: Accelerate boring sequences to **`2x`**, **`4x`**, **`8x`**, or **`16x Hyper-Speed`**.
- **1-Click Loading Slicer (`⏩ 4x`)**: Automatically cuts out the middle loading/build sequence of a clip and applies 4x speed in one click.
- **Automatic Master Timeline Sync**: Clip duration and project total length automatically adjust according to playback speed.
- **Neon On-Screen Badge**: Displays an animated **`⏩ Nx FAST-FORWARD`** badge on preview and exported videos for professional tutorial polish.

### 🎙️ 6. Dynamic Subtitles & AI Captions Studio
- **Ultra-Fast Whisper STT**: Transcribe entire video audio in ~1 second using Groq Whisper Large v3 or OpenAI Whisper.
- **Word Animations (Pop / Bounce / Zoom)**: Real-time active word kinetic highlighting (Hormozi / TikTok style elastic pop, dynamic vertical bounce, or focal zoom).
- **Punchy Short Segmenting**: Automatically chunks sentences into 3–4 word blocks with precise word-level timestamps.
- **🧹 Filler Words Cleaner**: 1-click removal of verbal tics (*"um"*, *"uh"*, *"euh"*, *"like"*, *"you know"*), stuttering, and accidental repeated words.
- **🌐 1-Click Multilingual Translation**: Translate subtitles into 10+ languages (English, Spanish, German, Italian, French, Japanese, etc.).
- **SRT & VTT Support**: Import existing subtitle files or export with formatted `.srt` and `.vtt`.

### 🎥 7. Pro Screen Recording, Audio & Global Hotkeys
- **Global Hotkeys (Anywhere on Windows)**:
  - **`F6`** or **`Alt + R`**: Start or Stop recording.
  - **`F7`** or **`Alt + P`**: Pause or Resume recording.
- **⏱️ Full-Screen 3-2-1 Countdown**: Glowing neon countdown overlay directly on screen before capture starts.
- **4K, 1080p, and 720p 60fps** capture using hardware-accelerated VP9, VP8, and H.264 codecs.
- **Multi-Monitor Support**: Automatic monitor detection and multi-display capture via Win32 GDI.
- **Independent Audio Mixing**: Capture Voice Microphone and System Audio (Desktop sounds) simultaneously.
- **Smart Audio DSP Filters**: Built-in 85Hz Anti-Rumble High-Pass filter and 3.5kHz vocal clarity presence filter.
- **Draggable Facecam (Webcam)**: Smooth circular picture-in-picture webcam with live preview, mirror mode, custom glow halo, and background blur.
- **Click Ripple Visualizer**: Neon animated rings under mouse clicks with distinct left/right click colors.

### 🔍 8. Dynamic Cursor Zoom
- **`F9` / `Alt + Z`**: Instantly zooms 2.0x centered directly on the mouse cursor with smooth cubic-bezier easing.
- **Single-Screen Visual & Audio Indicators**: Distinct audio beeps and discreet corner badges keep you informed of zoom state on single-monitor setups.

### ✏️ 9. Freeze & Draw Annotation Engine
- **`F8` / `Alt + D`**: Instantly freezes the screen frame and opens an overlay toolbar to annotate without triggering underlying links or buttons.
- **Tools**: Freehand Marker (with Catmull-Rom stroke smoothing), Directional Arrows, Framing Rectangles, Translucent Highlighter.
- **Auto-Fade Ink**: Ephemeral ink disappearing automatically after 3.5 seconds.
- **`F10` / `Alt + C`**: Clear all drawings instantly.
- **`Escape` (or `Alt + D` / `F8`)**: Instantly unfreezes screen and restores interactive control via global Win32 hook.

### 📱 10. Device Mockup Framing Studio
- Wrap your recorded tutorials inside sleek 2D/3D device frames:
  - **MacBook Pro** (Space Gray / Silver)
  - **iPhone 16 Pro** (Titanium Frame)
  - **iPad Pro** (Tablet presentation)
  - **Browser Glass Window** (Safari / Chrome dark & light header)
- Customizable gradient / mesh backdrops and real-time GPU re-encoding.

### 🔒 11. Draggable Privacy Blur Masks & Auto-Redaction
- Place persistent pixelation / frosted blur boxes over sensitive data (passwords, API keys, emails).
- Move and resize blur zones directly on the live dashboard preview.
- **Auto-Redact Video Exporter**: Batch-blur sensitive coordinates across the entire video file with client-side canvas re-encoding.

### 🎞️ 12. Animated GIF Exporter
- Convert screen captures or subtitled clips directly into high-framerate lightweight animated GIFs.
- Customizable FPS (10, 15, 20, 24 fps), resolution downscaling, speed multiplier (1x, 1.25x, 1.5x, 2x), and loop count.

### 🎬 13. Multi-Track Video Studio, Visual Filmstrip Timeline & Audio Bin
- **🎞️ Visual Filmstrip Timeline**:
  - Switch between **Filmstrip Thumbnail View** (like Premiere Pro / DaVinci Resolve) and **Compact Card View**.
  - Background extraction of sequential high-resolution video frames taking trim offsets and speed multipliers into account.
  - Active playhead tracking with a glowing purple outline following playback in real-time.
  - Quick visual element placement on hover: click **`+🔤 Title`**, **`+🖼️ Logo`**, **`+🔍 Zoom`**, or **`+🔖 Chapter`** directly on any thumbnail to insert elements at that exact second.
  - Click-to-seek navigation across all tracks (clicking any thumbnail, title, zoom, or image chip instantly seeks the player).
- **🖥️ Resizable Monitor & Cinema Fullscreen Mode**:
  - **1-Click Size Presets**: Switch instantly between **`260px` (Compact)**, **`380px` (Standard Recommandé)** (+70% larger canvas), and **`520px` (Grand Cinéma)**. Both the master monitor and the media bin scale smoothly together, with preference saved locally.
  - **Cinema Fullscreen Suite**: Toggle true immersive fullscreen via the **`⛶ Plein écran`** button, double-clicking the canvas, or pressing **`F`**. Includes a floating glass HUD with timeline scrubbing, spacebar play/pause, frame-stepping (`-1s` / `+1s` with arrow keys), active layer badges, and `Esc` to exit.
- **Multi-Track Arrangement**: Synchronized tracks with standardized 160px headers (Video Filmstrip, Live Microphone Voiceover, Titles, Background Music & Ducking, Dynamic Zooms, Image & Logo Watermarks, YouTube Chapters).
- **🔴 Live Microphone Voiceover Recording**: Record audio commentary directly from your microphone while the video plays on the preview monitor. Includes blinking recording badge (`🔴 RECORDING VOICEOVER • 00:04`), interactive timeline blocks, duration trimming, volume control (0% to 200%), and automatic audio ducking lowering music volume during speech.
- **Native MP4 Pipeline via FFmpeg**: Ultra-fast H.264 / AAC encoding with `+faststart` for universal compatibility (Windows Media Player, QuickTime, iOS, Android, YouTube).
- **Interactive Export Progress**: Real-time progress bar with percentage indicator and stage status (Rendering → Converting → Ready).
- **Transitions**: Smooth *Crossfade*, *Fade to Black*, *Slide*, and *Cut*.
- **Title & Text Track**: Customizable Intro cards, Lower-Third banners, and Outro titles with glassmorphism styles.
- **🎙️ AI Voiceover Generator (TTS)**: Generate studio commentary from text scripts using **ElevenLabs** (featuring a **100% free plan with 10,000 characters/month** and ultra-realistic `eleven_multilingual_v2` voices), **OpenAI TTS** (`nova`, `alloy`, `echo`, `shimmer`, `onyx`, `fable`), or offline Windows voices.
- **🎵 Background Music & Audio Bin**: Import your own MP3/WAV/M4A files or choose from built-in royalty-free ambient presets (*Lo-Fi Chill*, *Modern Tech*, *Ambient Focus*, *Acoustic Calm*) with dedicated volume slider and audio ducking.
- **Project Persistence**: Save and reload your `.captproj` editing project files to resume work at any time.

### 🔖 14. YouTube Chapters Generator & Timeline Track
- **1-Click Generation**: Automatically detects video clip cuts or title cards on the timeline and creates YouTube-compliant chapters (`00:00 - Title`).
- **Interactive Track 6**: Dedicated timeline chapter bar with jump-to-time chips.
- **YouTube Compliance**: Enforces starting at `00:00`, minimum 3 chapters, and flags any segments shorter than 10 seconds.
- **Instant Export**: 1-click clipboard copy formatted for YouTube video descriptions and `.txt` file download.

### 📜 15. Floating Teleprompter & Script Manager
- **100% Local Script Storage**: Write and save unlimited scripts locally in IndexedDB with real-time word counting and speaking time estimates based on target WPM (words per minute).
- **Floating Draggable Player**: Move the translucent prompter window directly beneath your webcam to maintain eye contact with your audience.
- **Adjustable Opacity (25% - 95%)**: Keep full visibility of your desktop applications while reading.
- **Eye-Line Focus & Smooth Auto-Scroll**: Precise pixel-smooth scrolling with spacebar play/pause controls.
- **Mirror Mode (Horizontal Flip)**: Perfect for professional prompters equipped with reflective beam-splitter glass.

### 📖 16. Step-by-Step Tutorial Generator (Markdown, HTML, PDF)
- **High-Res Video Frame Extraction**: Navigate with precision controls (`-5s`, `-1s`, `+1s`, `+5s`) and click **📸 Capture Step** to grab pristine screenshots.
- **Rich Step Editor**: Add action titles, multi-line instructions, and styled pro tip callouts (`💡 Tip`).
- **Live Publication Preview**: Toggle between editor and finished guide view with numbered badges and step cards.
- **Triple Export Formats**:
  - **Markdown (`.md`)**: GitHub Flavored Markdown with embedded Base64 screenshots and table of contents.
  - **Standalone HTML (`.html`)**: Self-contained responsive single-file webpage with dark/light styling and zero external asset dependencies.
  - **Print / PDF A4 (`.pdf`)**: Native `@media print` layout with clean page breaks ready for PDF generation.

### 🖼️ 17. Image & Logo Overlay Studio (Watermarks)
- **Dedicated Images Bin**: Import PNG, SVG, WebP, and JPG logos into your project.
- **Timeline Track 5**: Place logos permanently as watermarks or schedule timed on-screen appearances.
- **Visual Studio Modal**: Live 16:9 canvas preview, 5 quick position presets (*Top-Right*, *Top-Left*, *Center*, etc.) or free X/Y coordinates, scale slider (5% to 50%), opacity (10% to 100%), drop shadow, and rounded corners.

---

## 🤖 AI Services & API Keys Guide

| Feature | Recommended Engine | API Key Required? | Cost / Pricing | Commercial Use |
| :--- | :--- | :--- | :--- | :--- |
| **Transcription (STT)** | **Groq Whisper Large v3** | Free key on [console.groq.com](https://console.groq.com) | **Free tier available** (Ultra fast ~1s) | ✅ Allowed |
| **Subtitle Translation** | **Groq LLM / OpenAI** | Same Groq / OpenAI key | **< $0.001 per video** | ✅ Allowed |
| **Voiceover (Free)** | **Local Windows Speech** | ❌ **No key needed (100% Offline)** | **Free forever** | ✅ Allowed |
| **Voiceover (Ultra-Realistic)** | **ElevenLabs (`eleven_multilingual_v2`)** | Free key on [elevenlabs.io](https://elevenlabs.io) | **10,000 chars/month FREE** (No credit card required) | ✅ Free tier (Attribution) / Commercial (Paid) |
| **Voiceover (HD Studio)** | **OpenAI TTS (`tts-1`)** | Key on [platform.openai.com](https://platform.openai.com) | **$0.015 / 1k chars** (~$0.06 for 5 min video) | ✅ 100% Commercial Rights |

> 🔒 **Privacy Guarantee**: All API keys are stored exclusively in your local machine storage (`localStorage`). They are never transmitted to any third-party telemetry server.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`F6`** or **`Alt + R`** | **Start / Stop Recording** | Triggers 3-2-1 screen countdown and starts or saves recording |
| **`F7`** or **`Alt + P`** | **Pause / Resume** | Pauses or resumes the ongoing recording |
| **`F9`** or **`Alt + Z`** | **Dynamic Zoom** | Zooms 2x centered on the current mouse position with audio feedback |
| **`F8`** or **`Alt + D`** | **Freeze & Draw** | Freezes screen and opens drawing overlay |
| **`F10`** or **`Alt + C`** | **Clear Drawings** | Clears all marker strokes on screen |
| **`Escape`** | **Exit Drawing** | Unfreezes screen and restores interactive control immediately |

---

## 🛠️ Tech Stack & Architecture

- **Desktop Framework**: [Tauri v2](https://tauri.app) (Rust)
- **Frontend UI**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev)
- **AI Webcam Segmentation**: [Google MediaPipe Selfie Segmentation](https://developers.google.com/mediapipe) (WASM/TFLite, 100% offline & local)
- **Video & MP4 Encoding**: Native FFmpeg Rust pipeline (H.264 / AAC `+faststart`), WebCodecs / MediaRecorder (VP9/VP8/H.264)
- **Speech Recognition & TTS**: Groq Whisper Large v3, ElevenLabs Multilingual v2, OpenAI TTS-1, Web Speech API
- **Audio Processing**: Web Audio API (PCM silence detection, RMS analysis, BiquadFilter, DynamicsCompressor)
- **Icons**: [Lucide React](https://lucide.dev)
- **Local Storage**: IndexedDB (100% offline and private)
- **Native OS APIs**: Win32 GDI (`MonitorFromPoint`, `GetMonitorInfoW`), Global Windows Hooks (`GetAsyncKeyState`)

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

**OpenPeek** est une suite logicielle open-source d'enregistrement d'écran et de montage vidéo ultra-légère, accélérée par GPU et respectueuse de votre vie privée. Conçue avec Rust (Tauri v2) et React 19/TypeScript, elle intègre un **Curseur Studio Lissé**, un **Visualiseur de Raccourcis Clavier HUD**, un **Suppresseur Automatique de Silences**, un outil d'**Avance Rapide sur Temps de Chargement**, un **Studio de Sous-titres IA Dynamiques**, l'**Enregistrement de Voix Off au Micro en Direct**, un **Générateur de Voix Off IA (ElevenLabs & OpenAI)**, un **Téléprompteur Flottant avec Gestionnaire de Scripts**, un **Générateur de Guides Pas-à-Pas (Markdown/HTML/PDF)**, les **Chapitres YouTube Automatisés**, l'**Incrustation de Logos & Filigranes**, le **Floutage d'Arrière-Plan & Fonds Virtuels Webcam (Bokeh/Chroma Key)**, l'**Export MP4 Haute Fidélité via FFmpeg**, un **Studio Multi-Pistes**, l'**Habillage Device Mockup (MacBook, iPhone, iPad)**, une **Palette d'Annotation** et des **Masques d'Anonymisation**.

---

## 🚀 Fonctionnalités Principales

### 🪄 1. Lissage Cinématographique du Curseur (*Effet Screen Studio*)
- **Suivi Win32 Natif à 120Hz** : Capture en temps réel de la position de la souris dans un thread Rust léger.
- **Interpolation Dynamique (Lerp)** : Élimine les micro-tremblements et les saccades avec choix de la vitesse (*Cinématographique 0.28*, *Fluide 0.16*, *Direct 0.58*).
- **Pointeur Vectoriel Haute Définition** : Remplace le curseur Windows pixélisé par une flèche studio stylisée avec ombre portée 3D et micro-rebond élastique au clic.
- **Tailles Ajustables** : Formats *Normal (1.0x)*, *Large Studio (1.35x)* ou *Keynote (1.7x)* pour une visibilité optimale.
- **Masquage Automatique du Curseur OS** : Masque le curseur Windows natif de la capture (`cursor: 'never'`).

### ⌨️ 2. Visualiseur de Raccourcis Clavier en Direct (HUD 3D)
- **Scanner Global Win32** : Détection système de toutes les combinaisons avec modificateurs (`Ctrl`, `Alt`, `Shift`, `Win` + touches/flèches/actions).
- **Incrustation Écran & Vidéo** : Affiche des badges 3D flottants (*style touches de clavier mécaniques*) avec fondu élégant à l'écran et sur la vidéo finale.
- **🛡️ Filtrage Intelligent** : Les raccourcis internes d'OpenPeek (`Alt+R`, `F6`, `Alt+P`, `F7`, `Alt+Z`, `F9`, `Alt+D`, `F8`, `Alt+C`, `F10`) sont automatiquement exclus pour ne pas parasiter vos tutoriels.
- **Position Personnalisable** : *Bas Centré*, *Bas Gauche*, *Bas Droite*, ou *Haut Droite*.

### 🎭 3. Floutage d'Arrière-Plan & Détourage Webcam IA (*100% Hors-Ligne*)
- **Segmentation Neurale Locale** : Intégration de Google MediaPipe Selfie Segmentation via WebAssembly et WebGL — aucun calcul dans le cloud, respect absolu de votre vie privée.
- **4 Modes d'Arrière-Plan** :
  - *Normal* : Flux brut de la caméra sans consommation supplémentaire.
  - *Flou subtil (10px)* : Profondeur de champ naturelle préservant le contexte.
  - *Flou intense (25px)* : Effet portrait/bokeh prononcé masquant l'arrière-plan.
  - *Détourage (Suppression)* : Fond transparent sans besoin de fond vert physique.
- **Formes de Bulle & Halos Lumineux** : Compatible avec les formats cercle, squircle ou rectangle et les bordures néon lumineuses.
- **Préchauffage Transparent** : Démarrage fluide sans scintillement ni écran noir.

### ✂️ 4. Suppresseur Automatique de Silences (*Silence Remover*)
- **Analyse Acoustique Web Audio** : Détection ultra-rapide des baisses de niveau d'énergie (RMS/dB) sur le flux audio pour repérer les pauses orales.
- **Réglages Fin de Détection** : Seuil de silence (`-50 dB` à `-20 dB`), durée minimale du blanc (`0.3s` à `1.5s`) et marge vocale de sécurité (*Padding* de `50 ms` à `250 ms`) pour ne jamais trancher une syllabe.
- **Frise Visuelle Interactive** : Visualisation couleur (cyan pour la voix, rouge pour les pauses coupées) avec pourcentage de durée économisée.
- **Découpage en 1 Clic** : Transforme instantanément un clip brut en séquence rythmée dans le Studio de Montage et le Rognage.

### ⏩ 5. Avance Rapide Intelligente sur les Temps de Chargement
- **Multiplicateur de Vitesse par Clip** : Accélérez les temps d'attente (`npm install`, compilation, chargement web) en **`2x`**, **`4x`**, **`8x`** ou **`16x Hyper-Vitesse`**.
- **Outil 1 Clic `⏩ 4x`** : Découpe automatiquement la section centrale de chargement d'un clip et lui applique l'accélération 4x en un seul geste.
- **Synchronisation Automatique de la Timeline** : La durée du clip et la durée totale du projet sont instantanément recalculées selon la vitesse.
- **Macaron Visuel Neon** : Incrustation animée **`⏩ Nx FAST-FORWARD`** en haut à droite lors de la lecture et sur la vidéo exportée.

### 🎙️ 6. Studio de Sous-titres & Captions Dynamiques (IA)
- **Transcription Ultra-Rapide Whisper** : Transcrivez l'audio de vos vidéos en moins de 2 secondes avec Groq Whisper ou OpenAI.
- **Animations de Mots Dynamiques (Pop / Rebond / Zoom)** : Effet cinétique mot à mot (style Hormozi / TikTok, rebond vertical fluide ou mise en avant focalisée).
- **Découpage Punchy (3-4 mots)** : Segmente automatiquement les prises de parole en blocs courts avec horodatages précis mot à mot.
- **🧹 Nettoyeur de Tics de Langage** : Suppression en 1 clic des hésitations (*"euh"*, *"hum"*, *"genre"*, *"du coup"*, *"en fait"*), des bégaiements et des répétitions.
- **🌐 Traduction Multilingue en 1 clic** : Traduisez vos sous-titres dans plus de 10 langues en conservant le minutage exact.
- **Import / Export SRT & VTT** : Chargez vos fichiers existants ou exportez vos sous-titres en un clic.

### 🎥 7. Enregistrement Écran, Raccourcis Globaux & Audio
- **Raccourcis Clavier Partout sous Windows** :
  - **`F6`** ou **`Alt + R`** : Démarrer / Arrêter l'enregistrement à tout moment.
  - **`F7`** ou **`Alt + P`** : Mettre en Pause / Reprendre la capture.
- **⏱️ Compte à Rebours 3-2-1 Plein Écran** : Animation visuelle lumineuse en surimpression au centre de votre écran avant le début de la capture.
- **4K, 1080p et 720p à 60 FPS** avec les codecs matériels VP9, VP8 et H.264.
- **Support Multi-Écrans** : Détection automatique des moniteurs secondaires sous Windows.
- **Mixage Audio Indépendant** : Enregistrez simultanément le microphone (voix) et le son système (bureau).
- **Filtres DSP Audio Intelligents** : Filtre passe-haut anti-ronflement et rehausseur de présence vocale.
- **Facecam Déplaçable** : Bulle caméra circulaire avec aperçu en direct, mode miroir, halo néon personnalisé et floutage d'arrière-plan.
- **Ondes de Clics Visuelles** : Animation circulaire néon sous le curseur à chaque clic gauche/droit.

### 🔍 8. Zoom Dynamique au Curseur
- **`F9` / `Alt + Z`** : Zoome à 200% centré instantanément sur la position de la souris.
- **Indicateurs Mono-Écran** : Bip audio distinctif (grave/aigu) et macaron d'angle discret pour confirmer l'état du zoom en temps réel.

### ✏️ 9. Feutre & Annotation sur Écran Figé (*Freeze & Draw*)
- **`F8` / `Alt + D`** : Fige l'écran instantanément et active la palette de dessin sans cliquer par inadvertance sur vos applications.
- **Outils** : Feutre libre (lissage Catmull-Rom fluide), Flèches directionnelles, Rectangles d'encadrement, Surligneur translucide.
- **Encre Éphémère (Auto-Fade)** : Les traits s'effacent automatiquement après 3.5 secondes.
- **`F10` / `Alt + C`** : Tout effacer d'un coup.
- **`Échap` (ou `Alt + D` / `F8`)** : Dégèle l'écran instantanément et redonne le contrôle interactif grâce au hook global Win32.

### 📱 10. Studio d'Habillage Mockup Device
- Intégrez vos vidéos dans des cadres d'appareils élégants :
  - **MacBook Pro** (Gris sidéral / Argent)
  - **iPhone 16 Pro** (Cadre Titane)
  - **iPad Pro** (Tablette)
  - **Fenêtre de Navigateur Dépolie** (Header Safari / Chrome clair ou sombre)
- Arrière-plans dégradés / mesh modernes et rendu GPU direct.

### 🔒 11. Masques de Confidentialité Déplaçables & Auto-Redaction
- Posez des rectangles de flou permanent sur vos données sensibles (mots de passe, clés d'API, emails).
- Déplacez et redimensionnez la zone de flou directement sur le tableau de bord.
- **Export Anonymisé** : Ré-encode la vidéo avec floutage automatique des zones définies.

### 🎞️ 12. Exportateur GIF Animé
- Convertissez vos captures ou extraits sous-titrés en GIFs légers et fluides.
- Choix de la cadence (10 à 24 FPS), échelle de résolution, multiplicateur de vitesse et bouclage.

### 🎬 13. Studio de Montage Multi-Pistes, Export MP4 Natif FFmpeg & Chutier Audio
- **Piste Vidéo & Alignement Strict** : Timeline multi-pistes fluide avec en-têtes standardisés de 160px garantissant une verticalité parfaite de la tête de lecture.
- **🔴 Enregistrement de Voix Off en Direct (Microphone)** : Enregistrez votre voix au micro directement pendant que la vidéo défile sur le moniteur de montage. Badge d'enregistrement en direct (`🔴 ENREGISTREMENT VOIX OFF • 00:04`), blocs interactifs, volume réglable (0 à 200%) et auto-ducking automatique (la musique de fond baisse dès que vous parlez).
- **Pipeline MP4 Natif via FFmpeg** : Encodage ultra-rapide H.264 / AAC avec `+faststart` pour une compatibilité universelle (Windows Media Player, QuickTime, iOS, Android, YouTube).
- **Barre de Progression en Temps Réel** : Suivi visuel du rendu et de la conversion avec affichage dynamique du pourcentage et de l'état.
- **Transitions** : *Fondu enchaîné*, *Fondu au noir*, *Balayage*, *Coupure*.
- **Piste Titres & Textes** : Cartons d'intro, bandeaux inférieurs (*lower-thirds*) et cartons de fin personnalisables.
- **🎙️ Générateur de Voix Off IA (Text-to-Speech)** : Créez des commentaires de qualité studio à partir de scripts textuels avec **ElevenLabs** (**forfait 100% gratuit de 10 000 caractères par mois** avec les voix ultra-réalistes `eleven_multilingual_v2`), **OpenAI TTS** (`nova`, `alloy`, `echo`, `shimmer`, `onyx`, `fable`) ou les voix locales Windows gratuites.
- **🎵 Musique de Fond & Chutier Audio** : Importez vos fichiers audio (**MP3, WAV, M4A**) ou choisissez parmi les ambiances libres de droits intégrées (*Lo-Fi Chill*, *Modern Tech*, *Ambient Focus*, *Acoustic Calm*) avec curseur de volume fin et auto-ducking.
- **Sauvegarde de Projets** : Enregistrez et rechargez vos montages (`.captproj` / base locale) pour y revenir plus tard.

### 🔖 14. Générateur de Chapitres YouTube & Piste Timeline
- **Génération en 1 Clic** : Détecte automatiquement les coupures de clips vidéo ou les cartons de titre pour créer des chapitres YouTube au format standard (`00:00 - Titre`).
- **Piste Interactive 6 sur la Timeline** : Visualisez vos chapitres et sautez instantanément à n'importe quel moment de la vidéo en cliquant sur son badge.
- **Règles YouTube Garanties** : Début obligatoire à `00:00`, minimum de 3 chapitres et avertissement dynamique si un chapitre dure moins de 10 secondes.
- **Export Immédiat** : Copie dans le presse-papiers prête à coller dans la description YouTube et téléchargement du fichier `.txt`.

### 📜 15. Téléprompteur Flottant & Gestionnaire de Scripts
- **Gestionnaire de Scripts 100% Local** : Rédigez et stockez vos scripts dans IndexedDB avec calcul en temps réel du nombre de mots et estimation précise du temps de parole selon votre débit (WPM).
- **Lecteur Flottant Déplaçable** : Placez la fenêtre translucide juste sous votre webcam pour maintenir un contact visuel naturel avec votre audience.
- **Transparence Réglable (25% à 95%)** : Continuez de voir votre écran et vos fenêtres en arrière-plan pendant la lecture.
- **Ligne de Repère Visuel & Défilement Fluide** : Défilement automatique régulier au pixel près avec contrôle Pause/Reprise par la barre d'espace.
- **Mode Miroir** : Retournement horizontal compatible avec les vitres de prompteurs physiques équipées d'un verre semi-réfléchissant.

### 📖 16. Générateur de Guide Pas-à-Pas (Markdown, HTML, PDF)
- **Extraction d'Images Haute Résolution** : Naviguez dans la vidéo avec précision (`-5s`, `-1s`, `+1s`, `+5s`) et capturez les écrans clés d'un clic sur **📸 Capturer cette étape**.
- **Formulaire d'Étape Pédagogique** : Titre de l'action, explications détaillées multi-lignes et boîtes d'astuces pro (`💡 Astuce`).
- **Aperçu Avant Publication** : Basculez entre l'onglet d'édition et l'aperçu du guide avec cartes illustrées et badges numérotés.
- **Triple Export 100% Hors-Ligne** :
  - **Markdown (`.md`)** : Format GitHub Flavored Markdown avec sommaire interactif et images Base64 intégrées.
  - **HTML Autonome (`.html`)** : Fichier HTML unique responsive avec design sombre/clair moderne, prêt à être partagé ou hébergé sans aucune ressource externe.
  - **Impression PDF A4 (`.pdf`)** : Prise en charge des règles CSS `@media print` avec sauts de page propres pour un rendu PDF impeccable.

### 🖼️ 17. Incrustation de Logos & Images (Filigranes)
- **Chutier d'Images Dédié** : Importez vos logos PNG, SVG, WebP et JPG directement dans votre projet.
- **Piste 5 sur la Timeline** : Intégrez votre logo en filigrane permanent ou sur des intervalles temporels choisis.
- **Boîte de Réglages Studio** : Moniteur de prévisualisation 16:9 en direct, 5 présélections de position (*Haut Droite*, *Haut Gauche*, *Centre*, etc.) ou coordonnées libres X/Y, échelle (5% à 50%), opacité (10% à 100%), ombre portée et coins arrondis.

---

## 🤖 Guide des Clés API & Tarification IA

| Fonctionnalité | Moteur Recommandé | Clé API Requise ? | Coût / Tarification | Droits Commerciaux |
| :--- | :--- | :--- | :--- | :--- |
| **Transcription (STT)** | **Groq Whisper Large v3** | Clé gratuite sur [console.groq.com](https://console.groq.com) | **Gratuit (Quota offert)** (Vitesse ~1s) | ✅ Autorisés |
| **Traduction Sous-titres** | **Groq LLM / OpenAI** | Même clé Groq ou OpenAI | **< 0,001 € par vidéo** | ✅ Autorisés |
| **Voix Off (Gratuite)** | **Voix Locales Windows** | ❌ **Aucune clé (100% Hors-ligne)** | **100% Gratuit à vie** | ✅ Autorisés |
| **Voix Off Ultra-Réaliste** | **ElevenLabs (`eleven_multilingual_v2`)** | Clé gratuite sur [elevenlabs.io](https://elevenlabs.io) | **10 000 caractères/mois GRATUITS** (Sans carte bancaire) | ✅ Gratuit (avec attribution) / Commercial (payant) |
| **Voix Off HD Studio** | **OpenAI TTS (`tts-1`)** | Clé sur [platform.openai.com](https://platform.openai.com) | **0,015 $ / 1 000 car.** (~0,06 € pour 5 min) | ✅ 100% Propriétaire & Monétisable |

> 🔒 **Confidentialité Totale** : Vos clés d'API sont stockées exclusivement sur votre PC local (`localStorage`). Elles ne sont jamais envoyées à un serveur intermédiaire tiers.

---

## ⌨️ Raccourcis Clavier Globaux

| Raccourci | Action | Description |
| :--- | :--- | :--- |
| **`F6`** ou **`Alt + R`** | **Démarrer / Arrêter** | Affiche le compte à rebours 3-2-1 plein écran et lance/enregistre la capture |
| **`F7`** ou **`Alt + P`** | **Pause / Reprendre** | Met en pause ou reprend l'enregistrement en cours |
| **`F9`** ou **`Alt + Z`** | **Zoom Dynamique** | Zoome à 200% centré sur la souris avec retours audio et visuels |
| **`F8`** ou **`Alt + D`** | **Feutre & Dessin** | Fige l'écran et active la palette de dessin |
| **`F10`** ou **`Alt + C`** | **Effacer les traits** | Supprime tous les dessins à l'écran |
| **`Échap`** | **Quitter le dessin** | Dégèle l'écran immédiatement et redonne le contrôle interactif |

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
