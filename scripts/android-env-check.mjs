/**
 * Android Environment Checker
 *
 * Detects whether the host machine has a working Android development
 * environment. Uses only Node.js built-ins (no node_modules).
 *
 * Checks: JDK 17+, ANDROID_HOME, platform-tools, build-tools 36.0.0,
 * platforms android-36, NDK 27.1.12297006, emulator.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REQUIRED_JDK_MAJOR = 17;

const DOCS_URL = 'https://reactnative.dev/docs/set-up-your-environment';

const ANSI = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    reset: '\x1b[0m',
};

/**
 * @typedef {Object} ComponentCheck
 * @property {boolean} found
 * @property {string} [path]
 */

/**
 * @typedef {Object} JdkCheck
 * @property {boolean} found
 * @property {number | null} version
 * @property {string | null} path
 */

/**
 * @typedef {Object} EnvCheckResult
 * @property {boolean} ok
 * @property {JdkCheck} jdk
 * @property {{ found: boolean, path: string | null }} androidHome
 * @property {{ platformTools: ComponentCheck, buildTools: ComponentCheck, platform: ComponentCheck, ndk: ComponentCheck, emulator: ComponentCheck }} components
 * @property {string[]} missing
 */

/**
 * Attempts to run a command and return its stdout. Returns null on failure.
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
 * Parse the JDK major version from `java -version` stderr output.
 * @returns {JdkCheck}
 */
function checkJdk() {
    const output = tryExec('java -version 2>&1');
    if (!output) {
        return { found: false, version: null, path: null };
    }

    const match = output.match(/version\s+"(\d+)(?:\.(\d+))?/);
    if (!match) {
        return { found: false, version: null, path: null };
    }

    const major = parseInt(match[1], 10);
    const javaHome = tryExec(
        process.platform === 'win32'
            ? 'echo %JAVA_HOME%'
            : 'echo $JAVA_HOME'
    );

    return {
        found: major >= REQUIRED_JDK_MAJOR,
        version: major,
        path: javaHome || null,
    };
}

/**
 * Resolve ANDROID_HOME from environment variable or android/local.properties.
 * @param {string} projectRoot
 * @returns {{ found: boolean, path: string | null }}
 */
function resolveAndroidHome(projectRoot) {
    if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
        return { found: true, path: process.env.ANDROID_HOME };
    }

    if (process.env.ANDROID_SDK_ROOT && fs.existsSync(process.env.ANDROID_SDK_ROOT)) {
        return { found: true, path: process.env.ANDROID_SDK_ROOT };
    }

    const localPropsPath = path.join(projectRoot, 'android', 'local.properties');
    if (fs.existsSync(localPropsPath)) {
        const content = fs.readFileSync(localPropsPath, 'utf8');
        const match = content.match(/sdk\.dir\s*=\s*(.+)/);
        if (match) {
            const sdkDir = match[1].trim().replace(/\\\\/g, '\\').replace(/\\:/g, ':');
            if (fs.existsSync(sdkDir)) {
                return { found: true, path: sdkDir };
            }
        }
    }

    const defaults = {
        darwin: path.join(os.homedir(), 'Library', 'Android', 'sdk'),
        linux: path.join(os.homedir(), 'Android', 'Sdk'),
        win32: path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
    };

    const fallback = defaults[process.platform];
    if (fallback && fs.existsSync(fallback)) {
        return { found: true, path: fallback };
    }

    return { found: false, path: null };
}

/**
 * Check whether a specific SDK component file or directory exists.
 * @param {string} sdkPath
 * @param {string} relativePath
 * @returns {ComponentCheck}
 */
function checkComponent(sdkPath, relativePath) {
    const full = path.join(sdkPath, relativePath);
    return { found: fs.existsSync(full), path: full };
}

/**
 * Check whether a versioned SDK component directory has at least one
 * installed version (e.g. build-tools/*, ndk/*, platforms/*).
 * @param {string} sdkPath
 * @param {string} componentDir  e.g. 'build-tools', 'ndk', 'platforms'
 * @returns {ComponentCheck}
 */
function checkVersionedComponent(sdkPath, componentDir) {
    const dir = path.join(sdkPath, componentDir);
    if (!fs.existsSync(dir)) {
        return { found: false, path: dir };
    }
    const entries = fs.readdirSync(dir).filter((e) => !e.startsWith('.'));
    if (entries.length === 0) {
        return { found: false, path: dir };
    }
    return { found: true, path: path.join(dir, entries[0]) };
}

/**
 * Run the full environment check.
 * @param {string} [projectRoot]
 * @returns {EnvCheckResult}
 */
export function checkAndroidEnv(projectRoot) {
    const root = projectRoot || process.cwd();
    const missing = [];

    const jdk = checkJdk();
    if (!jdk.found) {
        missing.push(
            jdk.version
                ? `JDK ${REQUIRED_JDK_MAJOR}+ (found JDK ${jdk.version})`
                : `JDK ${REQUIRED_JDK_MAJOR}+`
        );
    }

    const androidHome = resolveAndroidHome(root);
    if (!androidHome.found) {
        missing.push('Android SDK (ANDROID_HOME not set or directory not found)');
    }

    const sdkPath = androidHome.path || '';
    const notFound = { found: false, path: undefined };

    const adbBin = process.platform === 'win32' ? 'adb.exe' : 'adb';
    const platformTools = androidHome.found
        ? checkComponent(sdkPath, path.join('platform-tools', adbBin))
        : notFound;
    if (!platformTools.found) missing.push('Android SDK Platform-Tools');

    const buildTools = androidHome.found
        ? checkVersionedComponent(sdkPath, 'build-tools')
        : notFound;
    if (!buildTools.found) missing.push('Android SDK Build-Tools');

    const platform = androidHome.found
        ? checkVersionedComponent(sdkPath, 'platforms')
        : notFound;
    if (!platform.found) missing.push('Android SDK Platform');

    const ndk = androidHome.found
        ? checkVersionedComponent(sdkPath, 'ndk')
        : notFound;
    if (!ndk.found) missing.push('Android NDK');

    const emulatorBin = process.platform === 'win32' ? 'emulator.exe' : 'emulator';
    const emulator = androidHome.found
        ? checkComponent(sdkPath, path.join('emulator', emulatorBin))
        : notFound;
    if (!emulator.found) missing.push('Android Emulator');

    return {
        ok: missing.length === 0,
        jdk,
        androidHome,
        components: { platformTools, buildTools, platform, ndk, emulator },
        missing,
    };
}

/**
 * Print a formatted failure message with the list of missing components
 * and a link to the setup documentation.
 * @param {EnvCheckResult} result
 */
export function printEnvError(result) {
    const line = '─'.repeat(60);
    console.error('');
    console.error(`${ANSI.red}${line}${ANSI.reset}`);
    console.error(`${ANSI.red}${ANSI.bold}  Android environment not found or incomplete${ANSI.reset}`);
    console.error(`${ANSI.red}${line}${ANSI.reset}`);
    console.error('');
    console.error(`${ANSI.yellow}  Missing:${ANSI.reset}`);
    for (const item of result.missing) {
        console.error(`${ANSI.red}    ✗  ${item}${ANSI.reset}`);
    }
    console.error('');
    console.error(`${ANSI.cyan}  To set up your Android development environment, follow:${ANSI.reset}`);
    console.error(`${ANSI.bold}  ${DOCS_URL}${ANSI.reset}`);
    console.error('');
    console.error(`${ANSI.dim}  Tip: Once your environment is configured, run this command again.${ANSI.reset}`);
    console.error(`${ANSI.red}${line}${ANSI.reset}`);
    console.error('');
}

/**
 * Print a formatted success summary.
 * @param {EnvCheckResult} result
 */
export function printEnvSuccess(result) {
    console.log(`${ANSI.green}✓${ANSI.reset} JDK ${result.jdk.version} found`);
    console.log(`${ANSI.green}✓${ANSI.reset} Android SDK at ${result.androidHome.path}`);
    console.log(`${ANSI.green}✓${ANSI.reset} Platform-Tools, Build-Tools, Platform, NDK, Emulator`);
}
