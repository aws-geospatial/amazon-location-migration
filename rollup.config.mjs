// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import { getBabelOutputPlugin } from "@rollup/plugin-babel";
import nodePolyfills from "rollup-plugin-polyfill-node";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const banner = `
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
// Third party license at https://github.com/aws-geospatial/amazon-location-migration/blob/main/LICENSE-THIRD-PARTY.txt
`;

// MapLibre GL JS v6 ships as ES modules only. It finds its web worker by resolving
// "./maplibre-gl-worker.mjs" against `import.meta.url`. Our bundle is loaded with a classic
// <script> tag (UMD), where `import.meta` is a syntax error. So:
//   1. Capture the bundle's own URL from document.currentScript while the script is evaluating
//      (it is null once evaluation finishes) and use it in place of `import.meta.url`.
//   2. Ship the MapLibre worker (and the shared chunk it imports) next to the bundle in dist/,
//      so the worker URL MapLibre derives from the bundle URL exists.
const bundleUrlVariable = "__amazonLocationMigrationSDKScriptUrl";
const maplibreWorkerFiles = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

function maplibreWorker() {
  return {
    name: "maplibre-worker",
    resolveImportMeta(property) {
      if (property === "url") {
        return bundleUrlVariable;
      }
      return null;
    },
    generateBundle() {
      const maplibreDist = path.dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
      for (const fileName of maplibreWorkerFiles) {
        this.emitFile({
          type: "asset",
          fileName,
          source: fs.readFileSync(path.join(maplibreDist, fileName), "utf8"),
        });
      }
    },
  };
}

// MapLibre GL JS v6 contains non-ASCII identifiers (for example the Arabic ligature table
// `{لآ:[65269,65270],...}`). A classic <script> is decoded with the page's encoding unless the
// server sends `charset=utf-8`, and a page or server without it makes those bytes a syntax error.
// Escape every non-ASCII character as \uXXXX so the bundle is plain ASCII and loads under any
// encoding. \uXXXX is valid in identifiers, strings, regular expressions and comments alike.
function asciiOnly() {
  return {
    name: "ascii-only",
    renderChunk(code) {
      const backslashBeforeNonAscii = /\\[\u0080-\uffff]/.exec(code);
      if (backslashBeforeNonAscii) {
        this.error(
          `Cannot safely escape non-ASCII character after a backslash at index ${backslashBeforeNonAscii.index}`,
        );
      }
      return {
        code: code.replace(/[\u0080-\uffff]/g, (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0")),
        map: null,
      };
    },
  };
}

export default {
  input: "./dist/esm/index.js",
  output: {
    file: "dist/amazonLocationMigrationSDK.js",
    format: "esm",
    banner,
    intro: `const ${bundleUrlVariable} = typeof document !== "undefined" && document.currentScript && document.currentScript.src ? document.currentScript.src : typeof location !== "undefined" ? location.href : "";`,
    inlineDynamicImports: true,
    plugins: [
      getBabelOutputPlugin({
        minified: true,
        moduleId: "amazonLocationMigrationSDK",
        presets: [["@babel/env", { modules: "umd" }]],
      }),
      asciiOnly(),
    ],
  },
  plugins: [
    maplibreWorker(),
    nodeResolve({
      browser: true,
    }),
    json(),
    commonjs(),
    nodePolyfills({
      include: ["events"],
    }),
  ],
};
