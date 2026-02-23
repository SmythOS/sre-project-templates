import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

class SEABundler {
    constructor(options = {}) {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.platforms = options.platforms || ['win', 'linux', 'macos'];
        this.outputDir = options.outputDir || 'dist/exe';
        this.seaConfigPath = options.seaConfigPath || 'sea-config.json';
        this.suffix = this.isProduction ? '-prod' : '';
    }

    log(message, color = 'cyan') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    success(message) {
        console.log(`${colors.green}✓ ${message}${colors.reset}`);
    }

    error(message) {
        console.log(`${colors.red}✗ ${message}${colors.reset}`);
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            this.log(`Created output directory: ${this.outputDir}`);
        }
    }

    createSEABlob() {
        this.log('Creating SEA blob...');
        try {
            execSync(`node --experimental-sea-config ${this.seaConfigPath}`, {
                stdio: 'inherit',
                env: { ...process.env, NODE_ENV: this.isProduction ? 'production' : 'development' },
            });
            this.success('SEA blob created successfully');
        } catch (error) {
            this.error(`Failed to create SEA blob: ${error.message}`);
            throw error;
        }
    }

    createExecutable(platform) {
        const platformConfig = {
            win: {
                execName: `index-win${this.suffix}.exe`,
                postjectFlags: '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
            },
            linux: {
                execName: `index-linux${this.suffix}`,
                postjectFlags: '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
            },
            macos: {
                execName: `index-macos${this.suffix}`,
                postjectFlags: '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA',
            },
        };

        const config = platformConfig[platform];
        if (!config) {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        const execPath = path.join(this.outputDir, config.execName);

        this.log(`Creating ${platform} executable: ${config.execName}`);

        try {
            // Copy Node.js executable
            fs.copyFileSync(process.execPath, execPath);

            // Inject SEA blob
            const blobPath = './dist/exe-prep.blob';
            const postjectCmd = `npx postject "${execPath}" NODE_SEA_BLOB ${blobPath} ${config.postjectFlags}`;

            execSync(postjectCmd, { stdio: 'inherit' });

            this.success(`${platform} executable created: ${config.execName}`);

            // Make executable on Unix systems
            if (platform !== 'win') {
                fs.chmodSync(execPath, 0o755);
            }
        } catch (error) {
            this.error(`Failed to create ${platform} executable: ${error.message}`);
            throw error;
        }
    }

    async bundle() {
        console.log(
            `\n${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
        );
        console.log(`${colors.bright} ${colors.green}    SEA Bundler ${this.isProduction ? '(Production)' : '(Development)'}`);
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

        try {
            this.ensureOutputDir();
            this.createSEABlob();

            this.log(`Building executables for platforms: ${this.platforms.join(', ')}`);

            for (const platform of this.platforms) {
                this.createExecutable(platform);
            }

            console.log(`\n${colors.green}🎉 All executables created successfully!${colors.reset}`);
            console.log(`${colors.yellow}📁 Output directory: ${this.outputDir}${colors.reset}\n`);
        } catch (error) {
            this.error(`SEA bundling failed: ${error.message}`);
            process.exit(1);
        }
    }
}
/**
 * Rollup plugin for Single Executable Application (SEA) bundling
 * @param {Object} options - Plugin options
 * @param {string[]} options.platforms - Platforms to build for ['win', 'linux', 'macos']
 * @param {boolean} options.enabled - Whether to enable SEA bundling (default: false)
 * @param {string} options.outputDir - Output directory for executables
 * @returns {Object} Rollup plugin
 */
export default function seaPlugin(options = {}) {
    const { platforms = ['win', 'linux', 'macos'], enabled = false, outputDir = 'dist/exe', seaConfigPath = 'sea-config.json' } = options;

    return {
        name: 'sea-bundler',
        async writeBundle(outputOptions, bundle) {
            // Only run if enabled
            if (!enabled) {
                return;
            }

            // Only run after the main bundle is written
            if (outputOptions.format !== 'cjs') {
                return;
            }

            console.log('\n🔧 Starting SEA bundling process...');

            try {
                const bundler = new SEABundler({
                    platforms,
                    outputDir,
                    seaConfigPath,
                });

                await bundler.bundle();
            } catch (error) {
                this.error(`SEA bundling failed: ${error.message}`);
            }
        },
    };
}
