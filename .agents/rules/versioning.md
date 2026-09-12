# Règle de Versioning Automatique — OpenPeek

## Principe
Pour chaque nouvelle fonctionnalité, amélioration notable ou ensemble de corrections apportées au projet :
1. **Toujours incrémenter la version de l'application**.
2. **Ne jamais laisser la version désynchronisée** entre les différents fichiers de configuration.

## SemVer (Semantic Versioning)
- **Nouvelle fonctionnalité / Évolution fonctionnelle** : Incrémentation **MINOR** (ex: `1.3.0` -> `1.4.0`) via `npm run bump:minor`.
- **Correction de bug / Ajustement mineur** : Incrémentation **PATCH** (ex: `1.3.0` -> `1.3.1`) via `npm run bump:patch`.
- **Refonte majeure ou rupture de compatibilité** : Incrémentation **MAJOR** (ex: `1.3.0` -> `2.0.0`) via `npm run bump:major`.

## Script de Synchronisation
Le script [bump-version.js](file:///c:/Users/ash/Documents/GitHub/OpenPeek/scripts/bump-version.js) synchronise automatiquement tous les fichiers :
- [package.json](file:///c:/Users/ash/Documents/GitHub/OpenPeek/package.json)
- [package-lock.json](file:///c:/Users/ash/Documents/GitHub/OpenPeek/package-lock.json)
- [tauri.conf.json](file:///c:/Users/ash/Documents/GitHub/OpenPeek/src-tauri/tauri.conf.json)
- [Cargo.toml](file:///c:/Users/ash/Documents/GitHub/OpenPeek/src-tauri/Cargo.toml)
- [Cargo.lock](file:///c:/Users/ash/Documents/GitHub/OpenPeek/src-tauri/Cargo.lock)
- [version.ts](file:///c:/Users/ash/Documents/GitHub/OpenPeek/src/version.ts) (utilisé dans l'UI)

L'agent exécutera simplement `npm run bump:minor` (ou le niveau approprié) après l'ajout de nouvelles fonctionnalités.
