import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const commonPlugins = [
  json(),
  typescript({
    tsconfig: "./tsconfig.json",
    sourceMap: true,
  }),
  resolve({
    preferBuiltins: true,
  }),
  commonjs(),
];

export default [
  // Main process configuration
  {
    input: "src/main.ts",
    output: {
      file: "dist/main.js",
      format: "cjs",
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: commonPlugins,
    external: [
      "electron",
      "path",
      "fs",
      "url",
      "os",
      "crypto",
      "stream",
      "events",
      "util",
      "buffer",
      "http",
      "https",
      "zlib",
      "pkce-challenge",
    ],
  },
  // Renderer process configuration
  {
    input: "src/renderer.ts",
    output: {
      file: "dist/renderer.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: commonPlugins,
    external: ["electron"],
  },
];
