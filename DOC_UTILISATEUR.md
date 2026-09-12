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
14. [📜 Le Téléprompteur Flottant & Outil de Script](#-14-le-téléprompteur-flottant--outil-de-script)
15. [📖 Le Générateur de Guide Pas-à-Pas (Markdown, HTML & PDF)](#-15-le-générateur-de-guide-pas-à-pas-markdown-html--pdf)
16. [🔖 Les Chapitres YouTube dans le Studio](#-16-les-chapitres-youtube-dans-le-studio)
17. [🖼️ Incrustation d'Images, Logos & Filigranes](#️-17-incrustation-dimages-logos--filigranes)
18. [🎭 Floutage d'Arrière-Plan & Fonds Virtuels Webcam (Bokeh / Chroma Key)](#-18-floutage-darrière-plan--fonds-virtuels-webcam-bokeh--chroma-key)
19. [📹 Caméra Secondaire B-Roll & Cadrage en Direct (Iriun Webcam / USB)](#-19-caméra-secondaire-b-roll--cadrage-en-direct-iriun-webcam--usb)
20. [📁 Organisation de la Bibliothèque Locale (Projets & Filtres Médias)](#-20-organisation-de-la-bibliothèque-locale-projets--filtres-médias)
21. [🛡️ Confidentialité & Données Locales](#-21-confidentialité--données-locales)
22. [🖥️ Spécifications & Prérequis Matériels (GPU, CPU, RAM)](#-22-spécifications--prérequis-matériels-gpu-cpu-ram)

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
| **`F10`** | **`Alt + B`** | **Caméra B-Roll (Piste V2)** | Déclenche ou arrête l'enregistrement de la caméra 2 (Iriun / USB) |
| **`Alt + C`** | — | **Effacer les Dessins** | Nettoie instantanément tous les traits d'annotation à l'écran |
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

### A. Les 3 Modes d'Affichage & Règle Temporelle Maîtresse
En haut à droite de la timeline, basculez selon vos préférences de travail :
- **📐 Vue Piste Alignée (Recommandée par défaut)** :
  - La piste vidéo principale est **100 % proportionnelle au temps** (`0%` à `100%`) et parfaitement alignée avec les pistes de Titres, Logos et Zooms.
  - **Tête de lecture continue & unifiée** : Le repère violet néon traverse la règle temporelle et la piste vidéo de façon parfaitement synchrone avec le lecteur vidéo.
  - **Surbrillance du clip actif** : Le clip (vidéo, diapositive ou image) en cours de lecture s'illumine automatiquement d'une bordure cyan électrique éclatante.
  - **Inspecteur de Clip Dédié** : Cliquez sur n'importe quel clip sur la piste vidéo pour ouvrir instantanément sous la piste ses réglages complets (rognage début/fin, vitesse d'avance rapide, suppression automatique des silences, modification de style pour les diapositives, transition vers le clip suivant et aperçu des photogrammes).
- **🎞️ Vue Vignettes Dépliées (Filmstrip)** :
  - Déplie côte-à-côte l'ensemble des photogrammes de chaque clip de la timeline avec boutons d'insertion rapide au survol (`+🔤`, `+🖼️`, `+🔍`, `+🔖`).
- **📋 Cartes Compactes** :
  - Mode condensé épuré pour une gestion globale des très longs projets comportant des dizaines de clips.

### B. Règle Temporelle Maîtresse & Navigation Libre (*Scrubbing*)
- Une règle de timecode graduée (ex: `00:00`, `00:10`, `00:20`...) surmonte l'ensemble des pistes avec un curseur triangulaire violet.
- **Scrubbing instantané** : Cliquez ou glissez votre curseur de souris n'importe où sur la règle ou directement sur la piste vidéo pour parcourir fluidement toute votre vidéo en direct sans à-coups.

### C. 🎛️ Potard Horizontal d'Échelle Temporelle (Fader Studio Pro)
- **Zoom continu de 1.0x à 8.0x** : Ajustez la largeur de la frise chronologique selon la précision requise. À `1.0x`, le projet tient dans la fenêtre ; à `8.0x`, chaque seconde s'étire sur 800% pour une découpe chirurgicale.
- **Boutons pas-à-pas** : Cliquez sur `-` ou `+` pour ajuster l'échelle progressivement.
- **Raccourci Molette** : Maintenez **`Ctrl`** et faites défiler la molette de votre souris sur la frise pour zoomer et dézoomer sans quitter la souris.
- **Réinitialisation en 1 Clic** : Double-cliquez sur le fader ou cliquez sur le badge numérique (ex: `2.4x`) pour revenir instantanément à `1.0x`.
- **Règle Adaptative & Défilement Unifié** : Les graduations de la règle s'affinent automatiquement (secondes, dixièmes) et toutes les pistes défilent ensemble, avec ancrage fixe des en-têtes de pistes à gauche (*sticky headers*).

### D. 🎚️ Mixage Audio Multi-Pistes & Curseurs de Volume Indépendants
- **Potentiomètre de Volume par Clip (0% à 100%)** : Chaque clip sur la Piste 1 ou la Piste 2 dispose d'un curseur de volume fin et d'un bouton Muet instantané.
- **Équilibrage Voix / B-Roll** : Si vous superposez un plan B-Roll (Piste 2) sur votre capture d'écran (Piste 1), les deux sons jouent ensemble selon vos réglages de volume, vous permettant d'entendre votre voix tout en dosant le micro d'ambiance de la caméra 2.
- **Nœud de Gain Web Audio à l'Export** : Le mixage audio appliqué dans le studio est fidèlement répercuté dans le rendu vidéo final (MP4 et WebM) via un pipeline `GainNode` dédié.

### E. Les Pistes de Montage & Chronologie Interactive Spatiale
L'éditeur multi-pistes place désormais la piste vidéo en haut comme référence maîtresse, avec les pistes secondaires calées sur la durée totale du projet :
- **Piste 1 (🎬 Vidéos, Diapositives Titres & Images Plein Écran)** :
  - **Clips Vidéos** : Enchaînement de vos captures avec raccords (Trim), vitesse variable (jusqu'à 8x) et transitions fluides (Cut, Fondu enchaîné, Fondu au noir, Glissement).
  - **📑 Diapositives Titres (Cartons d'introduction et de chapitres)** :
    - Insérez un carton de titre directement sur la piste principale via le bouton **`+ Diapo`** (dans la barre de transport ou l'en-tête de la piste).
    - Choisissez où insérer le carton : au début du projet (idéal pour introduire la vidéo), après le clip sélectionné, ou à la fin.
    - **Personnalisation complète** : Titre, sous-titre, taille de police, alignement (Gauche, Centre, Droite), durée d'affichage, et sélection de thèmes de couleurs modernes (*Nuit Bleutée, Cyber Violet, Océan Cyan, Émeraude Sombre, Ambre Chaud, Rouge Cinéma, Noir Pur*).
    - **Image d'arrière-plan** : Possibilité d'utiliser une photo de votre chutier comme fond de la diapositive avec assombrissement cinématique automatique pour préserver la lisibilité du texte.
    - **Réédition instantanée** : Cliquez sur le bouton **`⚙️ Style`** directement sur le clip de diapositive pour ajuster le texte ou le dégradé à tout moment.
  - **🖼️ Diapositives Images Plein Écran** :
    - Diffusez une photo, un schéma technique, une infographie ou une capture d'écran directement comme un clip de la timeline sans avoir à créer un faux fichier vidéo.
    - Insérez en 1 clic via le bouton **`🎬 Diapo`** dans l'onglet **Images** du Chutier, ou via **`+ Image`** dans l'en-tête de la piste vidéo.
    - Ajustez la durée d'affichage (ex. 3s, 5s, 10s) par simple clic sur les touches `-1s` / `+1s`.
  - **Rendu Unifié & Transitions** :
    - Les diapositives et images bénéficient des mêmes transitions de fondu croisé (*crossfade*), fondu au noir (*fade-to-black*) et glissement (*slide*) que les clips vidéos.
    - Visibilité parfaite en lecture continue, en pause et lors de l'exportation vidéo finale.
- **Piste 2 (🔤 Titres & Textes Chronologiques)** :
  - **Voie spatiale proportionnelle** : Vos bandeaux et titres sont placés directement sous la vidéo sur une frise temporelle continue alignée sur la durée totale.
  - **Déplacement libre à la souris (*Drag to Move*)** : Glissez le bloc vers la gauche ou la droite pour caler instantanément le titre au bon moment dans la vidéo.
  - **Étirement de la durée (*Drag to Stretch*)** : Saisissez la poignée droite pour étirer la durée ou la poignée gauche pour ajuster le début avec retour visuel du timecode en temps réel.
  - Bouton **`⚙️`** pour rééditer le texte, le style ou la couleur en 1 clic.
- **Piste 3 (🖼️ Images, Logos & Filigranes Chronologiques)** :
  - Calage visuel direct sous la vidéo avec miniature du logo.
  - **Déplacement & Étirement fluide** : Positionnez votre logo exactement sur les scènes désirées et étirez sa durée à la souris.
  - Bouton **`⚙️`** pour ajuster la position sur l'écran (5 presets ou libre), l'opacité, l'ombre portée et les coins arrondis.
- **Piste 4 (🔍 Zooms Dynamiques Studio)** :
  - Voie temporelle pour caler les zooms cinématiques ciblés (*Screen Studio*), avec étirement de la durée de focalisation et réglage du cadrage (Grille 3x3 et facteur `1.5x` à `2.5x`).
- **Piste 5 (🎵 Musique de Fond & Auto-Ducking)** :
  - Ambiances sonores synthétiques relaxantes (Lofi, Synthwave, Chill, Focus) ou import de fichiers audio personnels (`.mp3`, `.wav`).
  - **Auto-Ducking Intelligent** : Baisse automatiquement le volume de la musique (à ~20%) dès que vous parlez ou qu'un son vidéo est présent, et rétablit le niveau musical en douceur pendant les respirations et silences.
- **Piste 6 (🔖 Chapitres Vidéo)** :
  - Repères temporels interactifs synchronisés avec l'outil de génération et d'exportation YouTube.
- **Aiguille de lecture synchronisée (*Playhead Indicator*)** :
  - Une ligne verticale mauve traverse toutes les pistes pour visualiser instantanément où se situe la tête de lecture.
  - Cliquez n'importe où sur une piste pour sauter immédiatement à cet instant.

### C. Moniteur Vidéo Agrandissable & Mode Plein Écran Cinéma
- **Zone d'aperçu redimensionnable** :
  - Ajustez la hauteur du moniteur en 1 clic grâce aux préréglages dédiés :
    - **`260px` (Compact)** : Idéal sur les petits écrans d'ordinateurs portables pour maximiser l'espace timeline.
    - **`380px` (Standard Recommandé)** : Format large et confortable (70% plus grand), parfait pour peaufiner les animations, textes et incrustations avec un rendu 16:9 cristallin.
    - **`520px` (Grand Cinéma)** : Aperçu géant occupant toute la largeur disponible pour un contrôle visuel haute fidélité.
  - Le chutier multimédia (vidéos, images, audios) s'adapte automatiquement à la hauteur choisie.
  - Votre préférence de taille est mémorisée automatiquement sur votre PC.
- **Mode Plein Écran Cinéma (`Fullscreen`)** :
  - Cliquez sur le bouton **`⛶ Plein écran`** (ou appuyez sur la touche **`F`**, ou double-cliquez directement sur la vidéo) pour basculer en plein écran immersif.
  - **HUD de contrôle cinéma flottant** :
    - Grand bouton **Lecture / Pause** (contrôlable aussi avec la barre **Espace**).
    - Touches **`-1s`** et **`+1s`** (accessibles avec les **Flèches Gauche / Droite** du clavier, ou `Shift + Flèches` pour des sauts de 5s).
    - **Barre de défilement scrub intégrale** avec affichage précis du temps.
    - **Badges d'éléments actifs** : Voyants visuels signalant en direct la présence de titres (`🔤`), zooms (`🔍`) ou logos (`🖼️`) au moment de la lecture.
    - Quittez le plein écran à tout moment avec **`Échap`**, la touche **`F`**, ou par double-clic sur l'écran.

### D. Lecture, Scrubbing & Sauvegarde
- **Scrubbing Interactif** : Déplacez la tête de lecture sur la timeline pour inspecter image par image vos transitions et superpositions.
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

### B. Enregistrement de Voix Off en Direct (Microphone) avec Défilement Vidéo
Vous souhaitez commenter votre vidéo en direct pendant qu'elle défile sur le moniteur ? OpenPeek intègre un studio complet d'enregistrement de voix off synchronisée :

1. **Démarrer l'enregistrement vocal** :
   - Placez la tête de lecture à l'endroit souhaité sur la timeline.
   - Cliquez sur le bouton **`🔴 Voix Off`** dans la barre de contrôle (disponible en mode standard et en mode plein écran cinéma).
   - La vidéo démarre sa lecture immédiatement et votre microphone enregistre votre voix.
   - Un badge clignotant **`🔴 ENREGISTREMENT VOIX OFF • 00:04`** s'affiche en surimpression sur le moniteur vidéo.
2. **Arrêter l'enregistrement** :
   - Cliquez sur **`⏹️ Arrêter Micro`** (ou mettez la lecture en pause avec la barre `Espace`).
   - Le micro est libéré et un bloc audio vocal est automatiquement créé sur la piste chronologique dédiée **Voix Off (Micro)**.
3. **Piste Dédiée « Voix Off (Micro) » sur la Timeline** :
   - Positionnée au-dessus des Titres, elle conserve un en-tête standardisé de `160px` pour un alignement irréprochable de la tête de lecture.
   - Déplacez le bloc audio à la souris pour recaler votre commentaire.
   - Ajustez sa durée via la poignée droite.
   - Cliquez sur l'icône **⚙️ (Options)** pour réécouter l'extrait vocal et régler le volume individuel (de `0 %` à `200 %`).
4. **Auto-Ducking & Mixage Intelligent** :
   - Dès que votre voix off commence à parler, la musique de fond diminue automatiquement son volume sonore pour laisser votre voix parfaitement audible.
   - À l'exportation finale, les prises de voix off sont mixées dans le flux audio MP4 (H.264/AAC) ou WebM.

---

### C. Générateur de Voix-Off IA (Text-to-Speech)
Si vous préférez générer un commentaire vocal professionnel à partir d'un script écrit sans utiliser votre propre micro :

1. Dans l'onglet **Audio** du chutier, cliquez sur **🎙️ Voix Off IA**.
2. Saisissez ou collez votre script dans la zone de texte.
3. Choisissez votre fournisseur parmi les 3 options disponibles :
   - **✨ ElevenLabs (Gratuit 10 000 caractères/mois)** :
     - Rendu ultra-réaliste avec le modèle `eleven_multilingual_v2` (intonations, respirations et accents naturels en français).
     - **Forfait 100 % gratuit à vie** de 10 000 caractères par mois offert à l'inscription sur [elevenlabs.io](https://elevenlabs.io) (sans carte bancaire requise).
     - Choix parmi 8 timbres de voix d'élite : *Rachel* (calme), *Adam* (narratif), *Antoni* (posé), *Bella* (douce), *Arnold* (dynamique), *Domi* (énergique), *Josh* (jeune), *Dorothy* (convaincante).
     - Affichage en direct du nombre exact de caractères gratuits restants pour le mois.
   - **🤖 OpenAI TTS** :
     - Modèle `tts-1` avec 6 voix de studio (*Nova, Alloy, Echo, Shimmer, Onyx, Fable*).
     - Nécessite une clé API OpenAI avec des crédits prépayés.
   - **💻 Windows Local (100% Hors-Ligne & Gratuit)** :
     - Synthèse vocale native installée sur votre ordinateur Windows, sans connexion Internet ni clé d'API.
4. Ajustez la vitesse de diction (`0.7x` à `1.5x`).
5. Cliquez sur **Écouter l'extrait** pour prévisualiser, puis sur **Générer la Voix Off** pour insérer le commentaire directement sur la timeline.

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

---

## 📜 14. Le Téléprompteur Flottant & Outil de Script

Le **Téléprompteur** d'OpenPeek vous permet de délivrer vos présentations, tutoriels et cours en ligne avec une fluidité absolue, sans trous de mémoire et en maintenant votre regard droit vers la webcam.

### A. Accès au Téléprompteur
- Cliquez sur le bouton **📜 Téléprompteur** situé dans l'en-tête principal ou dans le menu latéral gauche.

### B. Gestionnaire de Scripts & Calculateur de Débit
- **Création de scripts multiples** : Rédigez ou collez vos textes, organisez vos prises de parole par sujet.
- **Stockage 100% local** : Tous vos scripts sont enregistrés sur votre machine dans IndexedDB.
- **Estimation dynamique du temps de parole** :
  - OpenPeek compte en temps réel les mots de votre texte.
  - Réglez votre cadence cible (ex: 140 mots/minute).
  - L'application calcule immédiatement la durée exacte de votre intervention (ex: *3m 45s*).

### C. Mode Lecteur Flottant Déplaçable
- Cliquez sur **Lancer le Prompteur** :
  - Une fenêtre semi-transparente épurée s'ouvre.
  - **Déplacement à la souris** : Glissez la barre supérieure pour positionner le prompteur directement sous l'objectif de votre webcam (pour que vos yeux ne quittent jamais vos spectateurs).
  - **Curseur de transparence (25% à 95%)** : Ajustez l'opacité pour lire votre prompteur tout en voyant vos fenêtres et logiciels au travers.
  - **Ligne de repère visuel (Eye-line)** : Une barre horizontale discrète guide votre regard sur la ligne en cours de prononciation.
  - **Défilement automatique fluide** : Vitesse calée sur votre débit WPM.
  - **Contrôles pratiques** :
    - Barre d'espace : Pause / Reprise instantanée.
    - Touche Début / Raccourci : Recommencer au début en 1 clic.
    - Curseur de taille de police : De 18px à 64px pour un confort de lecture optimal à distance.
    - **Mode Miroir** : Inverse horizontalement le texte si vous utilisez un prompteur physique à miroir sans tain.

---

## 📖 15. Le Générateur de Guide Pas-à-Pas (Markdown, HTML & PDF)

Transformez n'importe quelle capture vidéo en un tutoriel documenté, illustré et pédagogique en quelques clics :

### A. Ouvrir le Générateur
- **Depuis la Bibliothèque Locale** : Cliquez sur le bouton **Guide** sur la fiche de n'importe quelle vidéo.
- **Depuis le Studio de Montage** : Cliquez sur **Guide Tuto** dans les actions d'export ou la barre supérieure.

### B. Composition des Étapes
1. **Naviguez dans la vidéo** à l'aide de la timeline ou des boutons de saut rapide (`-5s`, `-1s`, `+1s`, `+5s`).
2. Cliquez sur **📸 Capturer cette étape (00:XX)** :
   - OpenPeek extrait instantanément une capture d'écran haute résolution du moment exact de la vidéo.
   - Une nouvelle carte d'étape s'ajoute à votre guide.
3. **Renseignez les détails pédagogiques** :
   - **Titre de l'action** (ex: *Cliquer sur le menu Fichier > Exporter*).
   - **Instructions détaillées** (supporte le texte multi-lignes et les explications pas-à-pas).
   - **Astuce / Conseil pro facultatif** (`💡 Astuce`) : Pour signaler un raccourci clavier ou un piège à éviter.
4. Réorganisez les étapes grâce aux flèches monter/descendre ou remplacez une capture sans perdre votre texte grâce au bouton de rafraîchissement.

### C. Aperçu & Triple Export 100% Hors-Ligne
Basculez sur l'onglet **Aperçu du Guide** pour admirer la mise en page finale, puis choisissez votre format d'export :
- **📋 Copier / Télécharger en Markdown (`.md`)** : Document complet GitHub Flavored Markdown intégrant le sommaire interactif, les étapes numérotées et les images en Base64.
- **🌐 Télécharger en HTML Autonome (`.html`)** : Fichier web unique tout-en-un avec design moderne sombre/clair responsive et images intégrées. Peut être envoyé par email, hébergé ou partagé sans aucun fichier supplémentaire.
- **🖨️ Imprimer en PDF (`.pdf`)** : Ouvre le dialogue d'impression système calibré pour le format A4 avec gestion des sauts de page automatiques pour générer un PDF propre et soigné.

---

## 🔖 16. Les Chapitres YouTube dans le Studio

Structurez vos vidéos longues et optimisez le référencement (SEO) de vos vidéos sur YouTube grâce aux chapitres automatiques :

### A. Génération en 1 Clic
Dans le **Studio de Montage**, ouvrez la boîte de dialogue **🔖 Chapitres** :
- **Générer depuis les clips** : Crée automatiquement un découpage calé sur chaque coupure de votre montage.
- **Générer depuis les titres** : Convertit l'ensemble de vos cartons de titre et bandeaux d'intro/outro en chapitres minutés.

### B. Piste 6 sur la Timeline Multi-Pistes
- Vos chapitres apparaissent directement sur la piste **🔖 Chapitres** sous forme de badges horodatés.
- Cliquez sur n'importe quel chapitre sur la timeline pour vous y téléporter immédiatement.

### C. Respect des Normes YouTube & Export
- OpenPeek veille à ce que votre premier chapitre commence bien à `00:00`, que vous disposiez d'au moins 3 chapitres et vous alerte si un chapitre dure moins de 10 secondes.
- **Bouton Copier pour YouTube** : Copie la liste prête à être collée dans la description de votre vidéo YouTube.
- **Bouton Télécharger (.txt)** : Exporte le fichier texte des chapitres.

---

## 🖼️ 17. Incrustation d'Images, Logos & Filigranes

Apposez l'identité de votre marque, chaîne YouTube ou entreprise directement sur vos montages vidéo :

### A. Chutier d'Images Dédié
- Dans le Studio de Montage, basculez sur l'onglet **Images** du Chutier.
- Cliquez sur **+ Importer un Logo / Image** pour charger vos fichiers PNG (avec transparence alpha), SVG, WebP ou JPG.

### B. Piste 5 de la Timeline & Réglages Visuels
- Ajoutez l'image sur la **Piste 5 (Images & Logos)** de la timeline.
- **Options de personnalisation** :
  - **Filigrane permanent** : Cochez l'option pour que le logo s'affiche sur toute la durée de la vidéo.
  - **Présélections de position** : *Haut Droite*, *Haut Gauche*, *Centre*, *Bas Droite*, *Bas Gauche* ou placement libre X/Y.
  - **Échelle & Opacité** : Ajustez la taille (de 5% à 50%) et la transparence (de 10% à 100%).
  - **Ombre portée & Coins arrondis** : Pour une parfaite lisibilité sur tous les fonds d'écran clairs ou sombres.

---

## 🎭 18. Floutage d'Arrière-Plan & Fonds Virtuels Webcam (Bokeh / Chroma Key)

Grâce au modèle d'intelligence artificielle léger embarqué **Google MediaPipe Selfie Segmentation**, OpenPeek détoure et sublime votre facecam en temps réel, 100% en local sur votre PC :

### A. Modes de Floutage
- **Flou Léger (10px)** : Crée une profondeur de champ subtile mettant en valeur votre visage tout en conservant le contexte de votre pièce.
- **Flou Prononcé (25px)** : Effet bokeh studio masquant entièrement le désordre ou les éléments privés de votre arrière-plan.

### B. Détourage & Fonds Virtuels
- **Détourage Transparent** : Isole votre silhouette sans écran vert physique. Idéal pour incruster votre visage directement au-dessus de vos applications sans masquer l'écran.
- **Fond Vert Chroma Key (`#00ff00`)** : Pour les utilisateurs souhaitant retravailler leur incrustation dans OBS Studio ou DaVinci Resolve.
- **Galerie de Dégradés Studio** : *Studio Sombre*, *Cyber Neon*, *Slate Moderne*, *Sunset Chaleureux*, *Émeraude Feutré*.
- **Image Personnalisée** : Sélectionnez n'importe quelle photo de votre ordinateur pour l'utiliser comme décor virtuel.

---

## 📹 19. Caméra Secondaire B-Roll & Cadrage en Direct (Iriun Webcam / USB)

OpenPeek prend en charge nativement une **deuxième caméra** pendant votre capture d'écran, particulièrement optimisée pour l'application gratuite **Iriun Webcam** (transformant votre smartphone en webcam HD sans fil via Wi-Fi ou USB) ou toute webcam USB externe :

### A. Pourquoi utiliser une Caméra Secondaire B-Roll ?
- **Démonstrations matérielles** : Filmez un circuit électronique, une feuille de papier, un dessin manuel, un livre ou un produit physique pendant que vous commentez votre écran.
- **Plans de coupe dynamiques (B-Roll)** : Cassez la monotonie d'un enregistrement d'écran en insérant des prises de vue réelles en plein écran.

### B. Configuration dans les Paramètres
1. Rendez-vous dans **Paramètres > Caméra**.
2. Dans la carte **Caméra Secondaire B-Roll**, cochez **Activer la Caméra Secondaire**.
3. Sélectionnez votre caméra (OpenPeek détecte et sélectionne automatiquement **Iriun Webcam** dès qu'elle est connectée).
4. Vérifiez le cadrage dans l'aperçu vidéo en direct.
5. Optionnellement, cochez **Enregistrer l'audio de la caméra 2** et choisissez votre raccourci de déclenchement (**`F10`** par défaut ou **`Alt + B`**).

### C. Prise de Vue & Cadrage en Direct
- Pendant l'enregistrement de l'écran, appuyez sur **`F10`** (ou cliquez sur le bouton rouge `📹 Caméra B-Roll` de la barre d'outils) pour lancer un plan de coupe.
- **Fenêtre Flottante PiP de Cadrage** : Une petite fenêtre de retour vidéo s'affiche immédiatement en bas à droite de votre écran. Elle vous permet de vérifier en temps réel que vos mains ou votre document sont bien cadrés.
- **Zéro pollution d'écran** : Cette fenêtre flottante est un overlay d'interface purement virtuel pour vos yeux ; elle **n'apparaît JAMAIS dans la capture vidéo enregistrée** de votre écran principal.
- Réappuyez sur **`F10`** pour clore le plan B-roll et revenir à l'écran.

### D. Montage Automatique sur la Piste V2
- Dès que vous arrêtez la capture d'écran, OpenPeek découpe automatiquement vos séquences B-roll et génère un projet de montage multi-pistes :
  - **Piste V1** : Votre capture d'écran principale.
  - **Piste V2** : Vos plans de caméra secondaire placés automatiquement à leurs **timecodes exacts de tournage** (`startTime`).
- Sur la Piste V2, ces clips s'affichent automatiquement **en plein écran au-dessus de la capture d'écran**, avec transitions douces.
- Utilisez les curseurs de volume pour ajuster le niveau sonore entre votre micro de bureau (Piste 1) et le micro de votre smartphone/caméra 2 (Piste 2).

---

## 📁 20. Organisation de la Bibliothèque Locale (Projets & Filtres Médias)

La **Bibliothèque locale** d'OpenPeek a été repensée pour vous offrir un espace de travail ordonné :

- **Dossiers de Projets Personnalisés** : Créez des projets thématiques (ex: *Formation Rust*, *Démos Clients*, *Shorts TikTok*) avec pastilles de couleurs personnalisées pour regrouper vos captures.
- **Filtres par Type de Média** : Affichez d'un clic uniquement vos *Vidéos*, vos *Images & Logos*, ou vos *Enregistrements Audio*.
- **Recherche Instantanée & Tri** : Retrouvez n'importe quel fichier par mot-clé, date ou taille.
- **Importation par Glisser-Déposer** : Glissez simplement vos fichiers depuis l'Explorateur Windows directement dans l'interface d'OpenPeek pour les intégrer à votre bibliothèque.

---

## 🛡️ 21. Confidentialité & Données Locales

- **Zéro Télémétrie, Zéro Tracking** : Vos captures d'écran, vidéos, flux audio, webcam et scripts ne quittent **jamais** votre ordinateur.
- **Stockage Local** : Toutes les vidéos, projets et scripts sont stockés localement dans la base de données interne de votre navigateur/PC (`IndexedDB`).
- **Clés d'API Whisper/Groq** : Elles restent stockées uniquement dans le `localStorage` de votre machine et ne sont transmises qu'aux API officielles que vous avez configurées.

---

## 🖥️ 22. Spécifications & Prérequis Matériels (GPU, CPU, RAM)

Pour connaître en détail les exigences matérielles, le rôle de la carte graphique et les performances attendues selon vos résolutions cibles (1080p 30/60 fps, 4K, multi-écrans) :

👉 **Consultez le guide dédié : [Spécifications & Prérequis Matériels (CONFIGURATION_MATERIELLE.md)](CONFIGURATION_MATERIELLE.md)**.

