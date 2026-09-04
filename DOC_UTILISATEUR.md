# 🎬 Guide d'Utilisation Complet d'OpenPeek

Bienvenue dans le guide officiel d'**OpenPeek**, la suite moderne et ultra-légère d'enregistrement d'écran et de montage vidéo pour Windows, conçue avec **Rust (Tauri v2)** et **React 19 / TypeScript**.

Ce document vous guide pas à pas dans la découverte et la maîtrise de toutes les fonctionnalités d'OpenPeek.

---

## 📑 Table des Matières

1. [🚀 Démarrage Rapide en 3 Étapes](#-1-démarrage-rapide-en-3-étapes)
2. [🖥️ Le Tableau de Bord d'Enregistrement](#️-2-le-tableau-de-bord-denregistrement)
3. [📺 Gestion du Multi-Écrans (Double Écran)](#-3-gestion-du-multi-écrans-double-écran)
4. [🪄 Effets Studio en Direct (*L'effet Screen Studio*)](#-4-effets-studio-en-direct-leffet-screen-studio)
5. [⌨️ Raccourcis Clavier Globaux (Cheatsheet)](#️-5-raccourcis-clavier-globaux-cheatsheet)
6. [✏️ Mode Dessin & Freeze Frame en Direct](#️-6-mode-dessin--freeze-frame-en-direct)
7. [🎞️ Le Studio de Montage & Vidéothèque](#️-7-le-studio-de-montage--vidéothèque)
8. [✂️ Suppresseur Automatique de Silences (*Silence Remover*)](#️-8-suppresseur-automatique-de-silences-silence-remover)
9. [⏩ Accélérateur de Chargements (*Fast-Forward*)](#-9-accélérateur-de-chargements-fast-forward)
10. [🎙️ Sous-Titres Dynamiques IA & Voix-Off](#️-10-sous-titres-dynamiques-ia--voix-off)
11. [📱 Habillage Mockup d'Appareils (*Device Frames*)](#-11-habillage-mockup-dappareils-device-frames)
12. [🔒 Masquage & Censure de Confidentialité (*Auto-Redact*)](#-12-masquage--censure-de-confidentialité-auto-redact)
13. [💾 Exportation & GIF Animé](#-13-exportation--gif-animé)
14. [🛡️ Confidentialité & Données Locales](#️-14-confidentialité--données-locales)
15. [🖥️ Spécifications & Prérequis Matériels (GPU, CPU, RAM)](#️-15-spécifications--prérequis-matériels-gpu-cpu-ram)

---

## 🚀 1. Démarrage Rapide en 3 Étapes

1. **Lancer OpenPeek** depuis le menu Démarrer ou votre raccourci de bureau.
2. **Vérifier vos réglages** sur le Tableau de bord (Microphone activé, choix de l'écran, Facecam optionnelle).
3. **Démarrer la capture** :
   - Soit en cliquant sur le bouton rouge **Démarrer l'enregistrement** sur l'interface.
   - Soit n'importe où sur Windows en appuyant sur **`F6`** ou **`Alt + R`**.
4. Un compte à rebours immersif **3... 2... 1...** s'affiche sur votre écran, et l'enregistrement démarre !
5. Pour arrêter : réappuyez sur **`F6`** ou **`Alt + R`**. Votre vidéo est prête instantanément dans votre vidéothèque locale.

---

## 🖥️ 2. Le Tableau de Bord d'Enregistrement

L'écran d'accueil d'OpenPeek réunit tous les contrôles indispensables :

### A. Flux Audio & Traitements Vocaux DSP
- **Microphone** : Choisissez votre micro dans la liste déroulante.
- **DSP Réduction de bruit active** : Filtre coupe-bas 85 Hz éliminant les bruits de souffle, ventilateurs de PC et résonances.
- **DSP Clarté Vocale** : Rehausseur d'harmoniques (3.5 kHz) pour donner à votre voix le son chaleureux d'un micro de studio professionnel.
- **Son du Système (Bureau)** : Activez ce commutateur pour enregistrer simultanément la musique, les vidéos lues ou les voix de vos interlocuteurs en réunion (Discord, Teams, Meet).
- **Vu-mètre en direct** : Visualisez le niveau sonore en temps réel pour éviter toute saturation.

### B. Facecam (Webcam Incrustée)
- Activez ou désactivez la webcam d'un clic.
- **Formes disponibles** : Cercle esthétique, Squircle (carré adouci) ou Format large 16:9.
- **Repositionnement libre** : Déplacez la bulle de webcam à la souris par glisser-déposer sur le canevas d'aperçu.
- **Liseré Néon & Effet Miroir** : Personnalisez la couleur de la bordure lumineuse et inversez l'image pour un rendu naturel.

### C. Masques de Confidentialité Pré-Capture (Blur Zones)
- Ajoutez des rectangles de flou permanents directement sur l'aperçu pour masquer d'avance des zones sensibles (un mot de passe, un numéro de compte, une clé d'API).
- Déplacez et redimensionnez ces boîtes à la souris.

---

## 📺 3. Gestion du Multi-Écrans (Double Écran)

Si vous travaillez avec plusieurs écrans (ex. écran d'ordinateur portable + écran externe) :

### Sélection directe depuis l'Enregistreur (Dashboard)
Sous la grille des **Sources de capture**, vous disposez d'un sélecteur d'écran immédiat :
- **🎯 Sélecteur (Choix interactif)** : Affiche la boîte de dialogue avec vignettes en direct pour choisir librement entre Écran 1, Écran 2 ou une fenêtre.
- **🖥️ Écran 1** : Cible directement votre écran principal (avec affichage de sa résolution, ex: `1366×768`).
- **🖥️ Écran 2** : Cible directement votre écran secondaire (ex: `1920×1080`).

Vous pouvez également retrouver ces options détaillées dans **Paramètres > Vidéo > Moniteurs & Sélection d'Écran**.

> [!TIP]
> **Curseur et Dessin calibrés** : Lorsqu'un écran est ciblé, le curseur cinématique et l'overlay de dessin s'ancrent exactement sur cet écran. Si vous déplacez votre souris sur l'autre écran, elle disparaît proprement sans créer de curseur fantôme sur la vidéo.

---

## 🪄 4. Effets Studio en Direct (*L'effet Screen Studio*)

OpenPeek intègre les technologies visuelles qui rendent les vidéos de démonstration modernes et captivantes :

### 1. Curseur Cinématique Haute Résolution
- **Suivi natif 120 Hz** : Surveillance ultra-fluide via le thread d'arrière-plan Rust.
- **Lissage dynamique (Lerp)** : Élimine les tremblements et micro-hésitations de la main pour des trajectoires de souris parfaites.
- **Pointeur Vectoriel Haute Précision** : Remplace le pointeur par défaut par une flèche studio nette avec ombre portée 3D et micro-rebond élastique à chaque clic.
- **Taille ajustable** : Standard (1.0x), Studio Tutoriel (1.35x), ou Keynote Présentation (1.7x).

### 2. Auto-Zoom Intelligent au Clic
- Zoom dynamique automatique centré sur vos actions lorsque vous cliquez sur un bouton ou un menu important.
- Dézoom automatique fluide après un délai ajustable (ex. 2,8 secondes).

### 3. Ondes Lumineuses (Click Ripples)
- Projette une onde de choc lumineuse circulaire sous le curseur à chaque clic gauche ou clic droit.

### 4. Visualiseur de Raccourcis Clavier (Keystroke HUD)
- Dès que vous tapez une combinaison de touches (`Ctrl + C`, `Alt + Tab`, `Ctrl + Shift + P`...), une élégante pilule 3D flottante s'affiche à l'écran et s'incruste sur la vidéo finale.
- **Filtre intelligent** : Les raccourcis internes d'OpenPeek (F6, F7, F8, F9, etc.) ne sont jamais affichés pour ne pas parasiter vos vidéos.
- **Actif uniquement pendant la capture** : Ne vous dérange jamais lorsque vous travaillez sur votre PC en dehors d'un enregistrement.

---

## ⌨️ 5. Raccourcis Clavier Globaux (Cheatsheet)

Ces raccourcis fonctionnent **partout sous Windows**, même si OpenPeek est minimisé ou en arrière-plan :

| Raccourci | Touche Alternative | Action | Description |
| :--- | :--- | :--- | :--- |
| **`F6`** | **`Alt + R`** | **Démarrer / Arrêter** | Lance le compte à rebours 3-2-1 ou finalise l'enregistrement |
| **`F7`** | **`Alt + P`** | **Pause / Reprise** | Suspend temporairement l'enregistrement sans couper la vidéo |
| **`F9`** | **`Alt + Z`** | **Zoom 2x sur le Curseur** | Zoome immédiatement sur la position exacte de votre souris |
| **`F8`** | **`Alt + D`** | **Mode Dessin & Annotation** | Gèle l'écran et ouvre la palette d'outils de dessin |
| **`F10`** | **`Alt + C`** | **Effacer les Dessins** | Nettoie instantanément tous les traits d'annotation à l'écran |
| **`Échap`** | — | **Quitter le Dessin** | Dégèle l'écran et referme la palette pour reprendre le contrôle |

---

## ✏️ 6. Mode Dessin & Freeze Frame en Direct

Besoin d'expliquer un détail ou d'entourer un code à l'écran ?

1. Appuyez sur **`F8`** ou **`Alt + D`** :
   - L'écran se fige instantanément (*Freeze Frame*), ce qui vous évite de cliquer accidentellement sur des liens ou boutons du bureau.
2. Une barre d'outils néon apparaît :
   - **✏️ Crayon à main levée** : Tracé lissé avec algorithme Catmull-Rom.
   - **➡️ Flèches directionnelles** : Pour pointer directement vers un élément.
   - **🔲 Rectangles de cadrage** : Pour entourer des formulaires ou fenêtres.
   - **🖍️ Surligneur translucide** : Pour mettre en valeur du texte ou du code.
   - **Couleurs éclatantes** : Rouge néon, Vert émeraude, Bleu cyan, Jaune vif, Violette.
   - **Auto-Estompage (Fade 3.5s)** : Permet aux traits de disparaître d'eux-mêmes après quelques secondes.
3. Appuyez sur **`Échap`** ou réappuyez sur **`F8`** pour débloquer l'écran et reprendre votre démonstration !

---

## 🎞️ 7. Le Studio de Montage Multi-Pistes & Post-Production

Cliquez sur l'onglet **Studio de Montage** dans le menu latéral gauche :

- **Timeline Multi-Pistes Complète** :
  - **Piste 1 (🔤 Titres & Cartons)** : Superposition de bandeaux inférieurs (*Lower Third*) ou d'écrans de titre d'intro/outro personnalisables.
  - **Piste 2 (🎬 Vidéos & Transitions)** : Enchaînement de clips avec raccords, vitesse variable et transitions fluides (Cut, Fondu enchaîné, Fondu au noir, Glissement).
  - **Piste 3 (🎵 Musique de Fond & Auto-Ducking)** :
    - Générateur d'ambiances synthétiques relaxantes (Lofi, Synthwave, Chill, Focus) ou import de fichiers audio personnels (`.mp3`, `.wav`).
    - **Auto-Ducking Intelligent** : Baisse automatiquement le volume de la musique (à ~20%) dès que vous parlez ou qu'un son vidéo est présent, et rétablit le niveau musical en douceur pendant les respirations et silences.
  - **Piste 4 (🔍 Zooms Dynamiques Studio)** :
    - Ajoutez des effets de zoom ciblés façon *Screen Studio* directement sur la timeline.
    - **Grille 3x3 intuitive** : Choisissez la zone d'attention (Haut Gauche, Centre, Bas Droite, etc.).
    - **Facteur d'échelle** : `1.5x`, `2.0x` ou `2.5x`.
    - **Transitions fluides** : Zoom avant et retour avec lissage sinusoïdal cinématique (*easing* fluide).
- **Lecture et Scrubbing Interactif** : Prévisualisation temps réel avec rendu immédiat des zooms, titres et mixage musical.
- **Sauvegarde de Projets** : Enregistrez et réouvrez vos montages dans la base locale (`.captproj` ou IndexedDB).

---

## ✂️ 8. Suppresseur Automatique de Silences (*Silence Remover*)

Cette fonctionnalité révolutionnaire supprime automatiquement tous les moments de flottement et d'hésitation dans vos vidéos :

1. Dans le Studio de Montage, cliquez sur le bouton **✂️ Supprimer les Silences**.
2. L'algorithme acoustique analyse la piste audio et génère une forme d'onde colorée :
   - **Cyan** : Zones de parole active conservées.
   - **Rouge** : Pauses et temps morts détectés à supprimer.
3. **Réglages précis** :
   - **Seuil de silence (dB)** : De -50 dB à -20 dB selon la sensibilité voulue.
   - **Durée minimale du silence** : Évite de couper les pauses naturelles de respiration (ex: 0.5s).
   - **Marge de sécurité vocale (Padding)** : Conserve 80 à 120 ms avant et après chaque phrase pour ne jamais rogner les consonnes d'attaque.
4. Cliquez sur **Appliquer** : Votre vidéo est instantanément raccourcie et devient percutante et dynamique !

---

## ⏩ 9. Accélérateur de Chargements (*Fast-Forward*)

Pendant un tutoriel, une compilation de code, une installation de dépendances ou un chargement de page Web ralentissent souvent le rythme :

1. Sélectionnez le clip concerné dans la timeline.
2. Choisissez le multiplicateur de vitesse : **`2x`**, **`4x`**, **`8x`** ou **`16x Hyper-Speed`**.
3. **Bouton magique "⏩ 4x sur chargement"** : Découpe automatiquement le milieu du clip et applique une vitesse 4x en un seul clic.
4. Un badge animé **`⏩ 4x FAST-FORWARD`** est automatiquement incrusté sur la vidéo pour informer vos spectateurs de l'accélération.

---

## 🎙️ 10. Sous-Titres Dynamiques IA & Voix-Off

### A. Sous-Titres Kinétiques (Style Hormozi / TikTok / YouTube Shorts)
1. Ouvrez le **Studio de Sous-Titres** depuis le Studio de Montage.
2. Renseignez une clé API Whisper (**Groq** pour une transcription quasi-instantanée en 1 seconde, ou **OpenAI**).
3. Cliquez sur **Transcrire avec l'IA** : Le texte est synchronisé mot par mot.
4. **Options de style** :
   - **Animations de mots** : *Pop élastique*, *Rebond vertical* ou *Zoom focal*.
   - **Nettoyeur de tics de langage** : Élimine en 1 clic les *"euh"*, *"hum"*, bégaiements et hésitations.
   - **Traduction Multilingue en 1 Clic** : Traduisez instantanément vos sous-titres en anglais, espagnol, allemand, italien, etc.
   - **Export SRT / VTT** : Téléchargez les sous-titres au format standard pour vos plateformes vidéo.

### B. Générateur de Voix-Off IA (TTS)
- Remplacez votre voix ou ajoutez un commentaire audio impeccable généré par IA à partir d'un script textuel.

---

## 📱 11. Habillage Mockup d'Appareils (*Device Frames*)

Sublimez vos captures d'écran en les intégrant dans des châssis modernes :

- **Châssis disponibles** :
  - **MacBook Pro** (Gris Sidéral ou Argent)
  - **iPhone 16 Pro** (Châssis Titane)
  - **iPad Pro** (Format tablette)
  - **Fenêtre de Navigateur Web** (Entête épuré avec boutons rouge/jaune/vert)
- **Arrière-plans personnalisés** : Dégradés Mesh modernes, flou d'ambiance ou couleur unie avec ombre portée réaliste.

---

## 🔒 12. Masquage & Censure de Confidentialité (*Auto-Redact*)

Vous avez oublié de masquer une information sensible pendant l'enregistrement ?

1. Ouvrez l'outil **Auto-Redact** dans le Studio.
2. Dessinez des zones de flou ou de pixelisation sur les éléments à masquer (emails, coordonnées bancaires, visages, secrets API).
3. Le moteur réencode la vidéo localement en appliquant le floutage de façon permanente sur les images ciblées.

---

## 💾 13. Exportation Multi-Formats & GIF Animé

- **Choix Direct du Conteneur Vidéo** :
  - **Format MP4 (`.mp4`)** : Encodage universel H.264 / AVC avec piste audio AAC, lisible directement sur tous les téléphones (iPhone, Android), réseaux sociaux et téléviseurs sans aucune conversion requise.
  - **Format WebM (`.webm`)** : Conteneur open-source moderne haute efficacité (VP9 / H.264 et audio Opus), ultra-léger pour le Web.
- **Convertisseur GIF Animé Optimisé** :
  - Génération de GIF légers et fluides avec palette de couleurs dynamique adaptative (`gifenc`).
  - Idéal pour intégrer des démonstrations directes dans vos README GitHub, emails ou documentations Notion.

---

## 🛡️ 14. Confidentialité & Données Locales

- **Zéro Télémétrie, Zéro Tracking** : Vos captures d'écran, vidéos, flux audio et webcam ne quittent **jamais** votre ordinateur.
- **Stockage Local** : Toutes les vidéos sont stockées localement dans la base de données interne de votre navigateur/PC (`IndexedDB`).
- **Clés d'API Whisper/Groq** : Elles restent stockées uniquement dans le `localStorage` de votre machine et ne sont transmises qu'aux API officielles que vous avez configurées.

---

## 🖥️ 15. Spécifications & Prérequis Matériels (GPU, CPU, RAM)

Pour connaître en détail les exigences matérielles, le rôle de la carte graphique et les performances attendues selon vos résolutions cibles (1080p 30/60 fps, 4K, multi-écrans) :

👉 **Consultez le guide dédié : [Spécifications & Prérequis Matériels (CONFIGURATION_MATERIELLE.md)](CONFIGURATION_MATERIELLE.md)**.

