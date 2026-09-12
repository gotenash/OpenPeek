import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetArg = process.argv[2];

if (!targetArg) {
  console.error('❌ Usage: node scripts/bump-version.js <patch | minor | major | X.Y.Z>');
  process.exit(1);
}

const pkgPath = path.join(rootDir, 'package.json');
const pkgLockPath = path.join(rootDir, 'package-lock.json');
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const cargoLockPath = path.join(rootDir, 'src-tauri', 'Cargo.lock');
const versionTsPath = path.join(rootDir, 'src', 'version.ts');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

function calculateNextVersion(current, typeOrVersion) {
  if (/^\d+\.\d+\.\d+.*$/.test(typeOrVersion)) {
    return typeOrVersion;
  }
  const parts = current.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid current version: ${current}`);
  }
  let [major, minor, patch] = parts;
  switch (typeOrVersion.toLowerCase()) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
    default:
      throw new Error(`Unknown bump type or invalid version: ${typeOrVersion}`);
  }
  return `${major}.${minor}.${patch}`;
}

const newVersion = calculateNextVersion(currentVersion, targetArg);
console.log(`🚀 Bumping version: ${currentVersion} -> ${newVersion}`);

// 1. package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`  ✓ Updated package.json`);

// 2. package-lock.json
if (fs.existsSync(pkgLockPath)) {
  const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
  pkgLock.version = newVersion;
  if (pkgLock.packages && pkgLock.packages['']) {
    pkgLock.packages[''].version = newVersion;
  }
  fs.writeFileSync(pkgLockPath, JSON.stringify(pkgLock, null, 2) + '\n', 'utf8');
  console.log(`  ✓ Updated package-lock.json`);
}

// 3. src-tauri/tauri.conf.json
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
  console.log(`  ✓ Updated src-tauri/tauri.conf.json`);
}

// 4. src-tauri/Cargo.toml
if (fs.existsSync(cargoTomlPath)) {
  let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  cargoToml = cargoToml.replace(/^version = ".*?"/m, `version = "${newVersion}"`);
  fs.writeFileSync(cargoTomlPath, cargoToml, 'utf8');
  console.log(`  ✓ Updated src-tauri/Cargo.toml`);
}

// 5. src-tauri/Cargo.lock
if (fs.existsSync(cargoLockPath)) {
  let cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
  // Match [[package]] name = "openpeek" followed by version = "..."
  const openpeekBlockRegex = /(\[\[package\]\]\s+name = "openpeek"\s+version = ")[^"]+(")/;
  if (openpeekBlockRegex.test(cargoLock)) {
    cargoLock = cargoLock.replace(openpeekBlockRegex, `$1${newVersion}$2`);
    fs.writeFileSync(cargoLockPath, cargoLock, 'utf8');
    console.log(`  ✓ Updated src-tauri/Cargo.lock`);
  }
}

// 6. src/version.ts
const versionTsContent = `// Automatically synchronized by scripts/bump-version.js
export const APP_VERSION = '${newVersion}';
`;
fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');
console.log(`  ✓ Updated src/version.ts`);

console.log(`\n🎉 Successfully updated OpenPeek to v${newVersion}!`);
