// const path = require('path');
// const fs = require('fs');
//
// // Set up proper storage path for Android before requiring SmythOS SDK
// const androidAppDir = '/data/data/com.SmythOS/files';
// const smythStorageDir = path.join(androidAppDir, '.smyth', 'storage', 'local');
//
// // Create storage directories if they don't exist
// try {
//   fs.mkdirSync(smythStorageDir, { recursive: true });
//   console.log('Created SmythOS storage directory at:', smythStorageDir);
// } catch (error) {
//   console.log('Storage directory creation result:', error.message);
// }
//
// // Set environment variable to override default storage path (if supported)
// process.env.SMYTH_STORAGE_PATH = smythStorageDir;
// process.env.SMYTH_HOME = path.join(androidAppDir, '.smyth');
//

// CRITICAL: Prevent undici from loading WASM-dependent modules
// nodejs-mobile on iOS doesn't support WebAssembly, but Node.js 18's undici requires it

// Strategy 1: Set environment variables
process.env.DISABLE_WASM = '1';
process.env.NODE_SKIP_PLATFORM_CHECK = '1';

// Strategy 2: Provide a complete WebAssembly polyfill that returns working fallbacks
if (typeof global.WebAssembly === 'undefined') {
  // Create a realistic dummy module with llhttp exports that undici expects
  class DummyModule {
    constructor() {
      // Undici's llhttp WASM module exports these functions
      // We'll create dummy versions that won't be called if we use node-fetch
      this.exports = {
        _initialize: () => { },
        malloc: () => 0,
        free: () => { },
        llhttp_alloc: () => 0,
        llhttp_free: () => { },
        llhttp_execute: () => 0,
        llhttp_finish: () => 0,
      };
    }
  }

  class DummyInstance {
    constructor() {
      this.exports = {
        _initialize: () => { },
        malloc: () => 0,
        free: () => { },
        llhttp_alloc: () => 0,
        llhttp_free: () => { },
        llhttp_execute: () => 0,
        llhttp_finish: () => 0,
      };
    }
  }

  global.WebAssembly = {
    compile: async (bytes) => {
      console.log('⚠️  WebAssembly.compile called - returning dummy module with llhttp exports');
      return new DummyModule();
    },
    instantiate: async (bufferOrModule, importObject) => {
      console.log('⚠️  WebAssembly.instantiate called - returning dummy instance with llhttp exports');
      const instance = new DummyInstance();
      if (bufferOrModule instanceof DummyModule) {
        return instance;
      }
      return { module: new DummyModule(), instance };
    },
    validate: () => false,
    Module: DummyModule,
    Instance: DummyInstance,
    Memory: class { constructor() { this.buffer = Buffer.alloc(0); } },
    Table: class { },
    CompileError: class extends Error { },
    LinkError: class extends Error { },
    RuntimeError: class extends Error { }
  };

  console.log('✅ WebAssembly polyfill installed for iOS compatibility');
}

// Disable native fetch to prevent undici from being loaded at all
delete global.fetch;

process.env.LOG_LEVEL = 'debug';
process.env.LOG_FILTER = '';

// Polyfill fetch for iOS compatibility (nodejs-mobile doesn't support WebAssembly)
// Node.js 18's built-in fetch uses undici which requires WebAssembly
// We use node-fetch v2 which doesn't have this dependency
const fetch = require('node-fetch');
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

console.log('✅ Fetch polyfilled for iOS compatibility');

// Now require and run the SmythOS SDK
require('./dist/index.cjs');
