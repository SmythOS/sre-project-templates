/**
 * Android Start Script
 *
 * Starts the Android emulator (if not already running), waits for
 * the device to boot, launches Metro bundler, and deploys the app.
 * Uses only Node.js built-ins.
 */

import { execSync, spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkAndroidEnv, printEnvError, printEnvSuccess } from './android-env-check.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const BOOT_TIMEOUT_MS = 120_000;
const BOOT_POLL_INTERVAL_MS = 2_000;

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

/**
 * @param {string} cmd
 * @returns {string | null}
 */
function tryExec(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch {
        return null;
    }
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if any Android emulator is currently running.
 * @param {string} adbPath
 * @returns {boolean}
 */
function isEmulatorRunning(adbPath) {
    const output = tryExec(`"${adbPath}" devices`);
    if (!output) return false;
    return output.split('\n').some((line) => line.includes('emulator-'));
}

/**
 * Get the list of available AVDs.
 * @param {string} emulatorPath
 * @returns {string[]}
 */
function listAvds(emulatorPath) {
    const output = tryExec(`"${emulatorPath}" -list-avds`);
    if (!output) return [];
    return output.split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * Wait for the emulator to finish booting.
 * @param {string} adbPath
 * @returns {Promise<boolean>}
 */
async function waitForBoot(adbPath) {
    const start = Date.now();
    while (Date.now() - start < BOOT_TIMEOUT_MS) {
        const result = tryExec(`"${adbPath}" shell getprop sys.boot_completed`);
        if (result === '1') return true;
        await sleep(BOOT_POLL_INTERVAL_MS);
    }
    return false;
}

// ── Step 1: Environment check ───────────────────────────────────────────

header('Checking Android environment');

const envResult = checkAndroidEnv(PROJECT_ROOT);

if (!envResult.ok) {
    printEnvError(envResult);
    process.exit(1);
}

printEnvSuccess(envResult);

const sdkPath = envResult.androidHome.path;
const isWindows = process.platform === 'win32';

const adbBin = isWindows ? 'adb.exe' : 'adb';
const emulatorBin = isWindows ? 'emulator.exe' : 'emulator';
const adbPath = path.join(sdkPath, 'platform-tools', adbBin);
const emulatorPath = path.join(sdkPath, 'emulator', emulatorBin);

// ── Step 2: Start emulator if not running ───────────────────────────────

header('Starting Android emulator');

if (isEmulatorRunning(adbPath)) {
    console.log(`${ANSI.green}✓${ANSI.reset} Emulator is already running`);
} else {
    const avds = listAvds(emulatorPath);

    if (avds.length === 0) {
        console.error(`${ANSI.red}No Android Virtual Devices (AVDs) found.${ANSI.reset}`);
        console.error('');
        console.error(`${ANSI.yellow}Create one using Android Studio's Device Manager, or run:${ANSI.reset}`);
        console.error(`${ANSI.dim}  ${sdkPath}/cmdline-tools/latest/bin/avdmanager create avd \\`);
        console.error(`    --name SmythOS_Emulator \\`);
        console.error(`    --package "system-images;android-36;google_apis;${process.arch === 'arm64' ? 'arm64-v8a' : 'x86_64'}" \\`);
        console.error(`    --device pixel_6${ANSI.reset}`);
        console.error('');
        process.exit(1);
    }

    const avdName = avds[0];
    console.log(`${ANSI.dim}Launching AVD: ${avdName}${ANSI.reset}`);

    const emulatorProc = spawn(emulatorPath, ['-avd', avdName, '-no-snapshot-load'], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ANDROID_HOME: sdkPath, ANDROID_SDK_ROOT: sdkPath },
    });
    emulatorProc.unref();

    console.log(`${ANSI.yellow}Waiting for emulator to boot (timeout: ${BOOT_TIMEOUT_MS / 1000}s)...${ANSI.reset}`);
    const booted = await waitForBoot(adbPath);
    if (!booted) {
        console.error(`${ANSI.red}Emulator did not finish booting within ${BOOT_TIMEOUT_MS / 1000} seconds.${ANSI.reset}`);
        console.error('Try launching the emulator manually from Android Studio and re-running this command.');
        process.exit(1);
    }

    console.log(`${ANSI.green}✓${ANSI.reset} Emulator booted successfully`);
}

// ── Step 3: Launch Metro + deploy app ───────────────────────────────────

header('Starting Metro bundler and deploying app');

const runEnv = {};
if (sdkPath) {
    runEnv.ANDROID_HOME = sdkPath;
    runEnv.ANDROID_SDK_ROOT = sdkPath;
}
if (envResult.jdk.path) {
    runEnv.JAVA_HOME = envResult.jdk.path;
}

const rnCmd = isWindows ? 'npx.cmd' : 'npx';
const result = spawnSync(rnCmd, ['react-native', 'run-android'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...runEnv },
    stdio: 'inherit',
    shell: true,
});

if (result.status !== 0) {
    console.error(`${ANSI.red}Failed to deploy app. See errors above.${ANSI.reset}`);
    process.exit(result.status || 1);
}

console.log('');
console.log(`${ANSI.green}${ANSI.bold}App deployed and running!${ANSI.reset}`);
console.log('');
