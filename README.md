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

**OpenPeek** is an open-source, ultra-lightweight, and GPU-accelerated desktop screen recording application with a built-in **Live Annotation Engine**, **Multi-Track Video Editor**, and **Interactive Privacy Blur System**. Built with Rust (Tauri v2) and React/TypeScript, it delivers blazing-fast performance, zero bloatware, and complete local privacy.

---

## 🚀 Key Features

### 🎥 1. Pro Screen Recording & Audio
- **4K, 1080p, and 720p 60fps** capture using hardware-accelerated VP9, VP8, and H.264 codecs.
- **Multi-Monitor Support**: Automatic monitor detection and seamless multi-display capture via Win32 GDI.
- **Independent Audio Mixing**: Capture Voice Microphone and System Audio (Desktop sounds) simultaneously.
- **Draggable Facecam (Webcam)**: Smooth circular picture-in-picture webcam with live preview and custom positioning.
- **Click Ripple Visualizer**: Neon animated rings under mouse clicks with distinct left/right click colors.

### 🔍 2. Dynamic Cursor Zoom
- **F9 / Alt + Z**: Instantly zooms 2.0x centered directly on the mouse cursor with smooth cubic-bezier easing.

### ✏️ 3. Freeze & Draw Annotation Engine
- **F8 / Alt + D**: Instantly freezes the screen frame and opens an overlay toolbar to annotate without triggering underlying links or buttons.
- **Tools**: Freehand Marker, Directional Arrows, Framing Rectangles, Translucent Highlighter.
- **Auto-Fade Ink**: Ephemeral ink disappearing automatically after 3.5 seconds.
- **F10 / Alt + C**: Clear all drawings instantly.

### 🔒 4. Draggable Privacy Blur Masks
- Place persistent pixelation / frosted blur boxes over sensitive data (passwords, API keys, emails).
- Move and resize blur zones directly on the live dashboard preview.
- **100% Persistent**: Remains active throughout the entire video tutorial even when navigating between apps.

### ✂️ 5. Post-Capture Video Trimmer
- Integrated trimmer in the Video Library to cut beginning hesitations and ending silence with 0.1s accuracy.
- Real-time looping preview and client-side instant re-encoding.

### 🎬 6. Multi-Track Video Studio (Editor)
- **Video Track**: Re-order, arrange, and trim multiple clips from your library.
- **Transitions**: Smooth *Crossfade*, *Fade to Black*, *Slide*, and *Cut*.
- **Title & Text Track**: Customizable Intro cards, Lower-Third banners, and Outro titles with glassmorphism styles.
- **Project Persistence**: Save and reload your `.captproj` editing project files to resume work at any time.
- **Full Audio & Video Exporter**: Generates a unified high-definition video with full audio fidelity.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`F9`** or **`Alt + Z`** | **Dynamic Zoom** | Zooms 2x centered on the current mouse position |
| **`F8`** or **`Alt + D`** | **Freeze & Draw** | Freezes screen and opens drawing overlay |
| **`F10`** or **`Alt + C`** | **Clear Drawings** | Clears all marker strokes on screen |
| **`Escape`** | **Exit Drawing** | Unfreezes screen and restores interactive control |

---

## 🛠️ Tech Stack & Architecture

- **Desktop Framework**: [Tauri v2](https://tauri.app) (Rust)
- **Frontend UI**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev)
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
git clone https://github.com/your-username/openpeek.git
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

**OpenPeek** est une application open-source d'enregistrement d'écran et de montage vidéo ultra-légère, accélérée par GPU et respectueuse de votre vie privée. Conçue avec Rust (Tauri v2) et React/TypeScript, elle offre des performances maximales sans aucun logiciel espion ni dépendance cloud.

---

## 🚀 Fonctionnalités Principales

### 🎥 1. Enregistrement Écran & Audio Haute Fidélité
- **4K, 1080p et 720p à 60 FPS** avec les codecs matériels VP9, VP8 et H.264.
- **Support Multi-Écrans** : Détection automatique des moniteurs secondaires sous Windows.
- **Mixage Audio Indépendant** : Enregistrez simultanément le microphone (voix) et le son système (bureau).
- **Facecam Déplaçable** : Bulle caméra circulaire avec aperçu en direct, déplaçable à la souris.
- **Ondes de Clics Visuelles** : Animation circulaire néon sous le curseur à chaque clic gauche/droit.

### 🔍 2. Zoom Dynamique au Curseur
- **F9 / Alt + Z** : Zoom fluide 2.0x centré instantanément sur la position de la souris.

### ✏️ 3. Feutre & Annotation sur Écran Figé (*Freeze & Draw*)
- **F8 / Alt + D** : Fige l'écran instantanément et ouvre la barre d'outils de dessin sans cliquer par inadvertance sur vos applications.
- **Outils** : Feutre libre, Flèches directionnelles, Rectangles d'encadrement, Surligneur translucide.
- **Encre Éphémère (Auto-Fade)** : Les traits s'effacent automatiquement après 3.5 secondes.
- **F10 / Alt + C** : Tout effacer d'un coup.

### 🔒 4. Masques de Flou de Confidentialité Déplaçables
- Posez des rectangles de flou permanent sur vos données sensibles (mots de passe, clés d'API, emails).
- Déplacez et redimensionnez la zone de flou directement sur le tableau de bord.
- **Permanent** : La zone reste floutée sur la vidéo pendant toute la durée de l'enregistrement.

### ✂️ 5. Mini-Studio de Découpe (Rognage)
- Rognez les hésitations au début et à la fin de vos vidéos dans l'onglet **Mes Vidéos**.
- Réglage fin à 0.1s près et export instantané côté client.

### 🎬 6. Studio de Montage Vidéo Multi-Pistes
- **Piste Vidéo** : Assemblez plusieurs captures issues de votre bibliothèque, changez l'ordre et rognez les clips.
- **Transitions** : *Fondu enchaîné*, *Fondu au noir*, *Balayage*, *Coupure*.
- **Piste Titres & Textes** : Cartons d'intro, bandeaux inférieurs (*lower-thirds*) et cartons de fin personnalisables.
- **Sauvegarde de Projets** : Enregistrez et rechargez vos montages (`.captproj` / base locale) pour y revenir plus tard.
- **Exportateur Vidéo + Audio** : Génère une vidéo unique HD avec tout le son d'origine mixé.

---

## ⌨️ Raccourcis Clavier Globaux

| Raccourci | Action | Description |
| :--- | :--- | :--- |
| **`F9`** ou **`Alt + Z`** | **Zoom Dynamique** | Zoome à 200% centré sur la souris |
| **`F8`** ou **`Alt + D`** | **Feutre & Dessin** | Fige l'écran et active la palette de dessin |
| **`F10`** ou **`Alt + C`** | **Effacer les traits** | Supprime tous les dessins à l'écran |
| **`Échap`** | **Quitter le dessin** | Dégèle l'écran et redonne le contrôle interactif |

---

## 📦 Compilation & Installation

```bash
# 1. Cloner le projet
git clone https://github.com/votre-nom/openpeek.git
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
