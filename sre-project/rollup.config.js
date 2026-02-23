import json from '@rollup/plugin-json';
import path from 'path';
import esbuild from 'rollup-plugin-esbuild';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import colorfulLogs from './scripts/rollup-colorfulLogs.js';
import seaPlugin from './scripts/rollup-sea-plugin.js';
import regexTransformPlugin from './scripts/rollup-regex-transform.js';

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

const isProduction = process.env.NODE_ENV === 'production';
const enableSEA = process.env.BUILD_SEA === 'true';
const seaPlatforms = process.env.SEA_PLATFORMS ? process.env.SEA_PLATFORMS.split(',') : ['win', 'linux', 'macos'];

const config = {
    input: './src/index.ts',
    output: {
        file: '../nodejs-assets/nodejs-project/dist/index.cjs', // CommonJS output
        format: 'cjs', // Specify the CommonJS format
        sourcemap: !isProduction, // No sourcemap in production
        inlineDynamicImports: true, // Inline all dynamic imports into one file
    },
    // Bundle ALL dependencies to ensure portability
    plugins: [
        colorfulLogs('Smyth Builder'),
        resolve({
            browser: false, // Allow bundling of modules from `node_modules`
            preferBuiltins: true, // Prefer Node.js built-in modules
            mainFields: ['module', 'main'], // Ensure Node.js package resolution
            extensions: ['.js', '.ts', '.json'], // Resolve these extensions
            exportConditions: ['node'], // Use Node.js conditions
        }),
        commonjs({
            include: /node_modules/, // Convert CommonJS modules from node_modules
            requireReturnsDefault: 'auto', // Handle default exports correctly
            ignoreDynamicRequires: false, // Don't ignore dynamic requires
        }), // Convert CommonJS modules to ES6 for Rollup to bundle them
        json(),

        typescriptPaths({
            tsconfig: './tsconfig.json',
            preserveExtensions: true,
            nonRelative: false,
        }),
        esbuild({
            sourceMap: !isProduction,
            minify: isProduction, // Enable minification in production
            treeShaking: true, // Enable tree shaking
            target: 'node18',
            define: {
                'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
                // Remove debug code in production
                'process.env.DEBUG': isProduction ? 'undefined' : 'process.env.DEBUG',
            },
        }),
        // Transform Unicode property escapes in regex to ASCII equivalents
        // This must run after esbuild to catch any remaining patterns
        regexTransformPlugin(),
        !isProduction && sourcemaps(),
        seaPlugin({
            enabled: enableSEA,
            platforms: seaPlatforms,
            outputDir: 'dist/exe',
            seaConfigPath: 'sea-config.json',
        }),
    ].filter(Boolean),
};

export default config;
