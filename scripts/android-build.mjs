/**
 * Android Build Script
 *
 * Unified build command: checks Android environment, builds the
 * sre-project (rollup), then builds the Android APK (Gradle).
 * Uses only Node.js built-ins.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkAndroidEnv, printEnvError, printEnvSuccess } from './android-env-check.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const ANSI = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    reset: '\x1b[0m',
};

function header(text) {
    console.log('');
    console.log(`${ANSI.cyan}${ANSI.bold}▸ ${text}${ANSI.reset}`);
    console.log('');
}

function run(cmd, opts = {}) {
    console.log(`${ANSI.dim}  $ ${cmd}${ANSI.reset}`);
    const result = spawnSync(cmd, {
        cwd: opts.cwd || PROJECT_ROOT,
        env: { ...process.env, ...opts.env },
        stdio: 'inherit',
        shell: true,
    });
    if (result.status !== 0) {
        console.error(`${ANSI.red}Command failed with exit code ${result.status}${ANSI.reset}`);
        process.exit(result.status || 1);
    }
}

// ── Step 1: Environment check ───────────────────────────────────────────

header('Checking Android environment');

const envResult = checkAndroidEnv(PROJECT_ROOT);

if (!envResult.ok) {
    printEnvError(envResult);
    process.exit(1);
}

printEnvSuccess(envResult);

// ── Step 2: Install nodejs-assets dependencies ─────────────────────────

header('Installing Node.js Mobile runtime dependencies');

const nodejsProjectDir = path.join(PROJECT_ROOT, 'nodejs-assets', 'nodejs-project');

if (!fs.existsSync(path.join(nodejsProjectDir, 'node_modules'))) {
    run('npm install', { cwd: nodejsProjectDir });
}
console.log(`${ANSI.green}✓${ANSI.reset} nodejs-assets/nodejs-project dependencies ready`);

// ── Step 3: Build sre-project (rollup) ──────────────────────────────────

header('Building sre-project (rollup)');

const sreProjectDir = path.join(PROJECT_ROOT, 'sre-project');

if (!fs.existsSync(path.join(sreProjectDir, 'node_modules'))) {
    console.log(`${ANSI.yellow}sre-project/node_modules not found, running npm install...${ANSI.reset}`);
    run('npm install', { cwd: sreProjectDir });
}

run('npm run build:dev', { cwd: sreProjectDir });

const builtBundle = path.join(nodejsProjectDir, 'dist', 'index.cjs');
if (!fs.existsSync(builtBundle)) {
    console.error(`${ANSI.red}Expected build output not found at: ${builtBundle}${ANSI.reset}`);
    process.exit(1);
}
console.log(`${ANSI.green}✓${ANSI.reset} sre-project built successfully`);

// ── Step 4: Build Android APK (Gradle) ──────────────────────────────────

header('Building Android APK (Gradle)');

const androidDir = path.join(PROJECT_ROOT, 'android');
const isWindows = process.platform === 'win32';
const gradleCmd = isWindows ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';

const buildEnv = {};
if (envResult.androidHome.path) {
    buildEnv.ANDROID_HOME = envResult.androidHome.path;
    buildEnv.ANDROID_SDK_ROOT = envResult.androidHome.path;
}
if (envResult.jdk.path) {
    buildEnv.JAVA_HOME = envResult.jdk.path;
}

const localPropsPath = path.join(androidDir, 'local.properties');
if (!fs.existsSync(localPropsPath) && envResult.androidHome.path) {
    const sdkDir = envResult.androidHome.path.replace(/\\/g, '\\\\');
    fs.writeFileSync(localPropsPath, `sdk.dir=${sdkDir}\n`);
    console.log(`${ANSI.green}✓${ANSI.reset} Generated android/local.properties`);
}

run(gradleCmd, { cwd: androidDir, env: buildEnv });

console.log('');
console.log(`${ANSI.green}${ANSI.bold}Build complete!${ANSI.reset}`);
console.log(`${ANSI.dim}Run ${ANSI.reset}${ANSI.bold}npm start${ANSI.reset}${ANSI.dim} to launch the emulator and deploy the app.${ANSI.reset}`);
console.log('');
