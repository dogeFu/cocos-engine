import type { Plugin } from 'vite';
import { resolve, basename } from 'path';
import { readFileSync } from 'fs';

export interface CocosExternalOptions {
  platform: string;
  nativeCodeBundleMode: number; // 0=ASMJS, 1=WASM, 2=BOTH
  engineRoot: string;
  cullMeshopt?: boolean; // When true, meshopt decoder module is excluded from build
}

const VIRTUAL_PREFIX = '\0cocos-external:';

/**
 * Resolve external:emscripten/... virtual protocol to real filesystem paths
 * and properly handle WASM/ASMJS binary assets and Emscripten glue code.
 */
export function cocosExternalModules(options: CocosExternalOptions): Plugin {
  const { platform, nativeCodeBundleMode, engineRoot } = options;

  function resolveRealPath(source: string): string {
    return resolve(engineRoot, source.replace('external:', 'native/external/'));
  }

  function shouldCullWasm(): boolean {
    return nativeCodeBundleMode === 0; // ASMJS only
  }

  function shouldCullAsmJS(): boolean {
    return nativeCodeBundleMode === 1; // WASM only
  }

  // Emscripten IIFE glue code creates a global variable (e.g. BOX2D, PHYSX, Bullet)
  // but does not export it as ES module default. Extract the name so we can
  // append the correct export statement.
  function extractEmscriptenGlobalName(source: string): string | null {
    // Matches both: var NAME = (() => {  and  var NAME = (function () {
    const match = source.match(/^var\s+(\w+)\s*=\s*\((?:\(\)\s*=>|function\s*\(\))\s*\{/m);
    return match ? match[1] : null;
  }

  function ensureDefaultExport(source: string): string {
    if (source.includes('export default')) {
      return source;
    }
    const name = extractEmscriptenGlobalName(source);
    if (name) {
      return source + `\nexport default ${name};\n`;
    }
    return source;
  }

  return {
    name: 'vite-plugin-cocos-external-modules',
    enforce: 'pre',

    resolveId(source, importer) {
      if (source.startsWith('external:emscripten/')) {
        // Use Rollup virtual module prefix to prevent other plugins from touching
        return VIRTUAL_PREFIX + resolveRealPath(source);
      }
      return null;
    },

    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;

      const realPath = id.slice(VIRTUAL_PREFIX.length);

      // Cull meshopt decoder when CULL_MESHOPT is true
      if (options.cullMeshopt && realPath.includes('meshopt')) {
        if (realPath.endsWith('.wasm') || realPath.endsWith('.wasm.wasm') || realPath.endsWith('.js.mem')) {
          return `export default '';`;
        }
        if (realPath.endsWith('.wasm.js') || realPath.endsWith('.asm.js')) {
          return `export default function() { throw new Error('meshopt decoder disabled by CULL_MESHOPT'); };`;
        }
      }

      // .wasm / .wasm.wasm — WebAssembly binary
      if (realPath.endsWith('.wasm') || realPath.endsWith('.wasm.wasm')) {
        if (shouldCullWasm()) {
          return `export default '';`;
        }
        const ref = this.emitFile({
          type: 'asset',
          name: basename(realPath),
          source: readFileSync(realPath),
        });
        return `export default new URL(import.meta.ROLLUP_FILE_URL_${ref}, import.meta.url).href;`;
      }

      // .wasm.js — Emscripten glue code (JS factory function)
      if (realPath.endsWith('.wasm.js')) {
        if (shouldCullWasm()) {
          return `export default function() { throw new Error('WASM module disabled by NATIVE_CODE_BUNDLE_MODE'); };`;
        }
        // UMD-formatted emscripten files (box2d, physx, bullet) lack ES export.
        // Spine and meshopt already include `export default <name>`.
        return ensureDefaultExport(readFileSync(realPath, 'utf-8'));
      }

      // .asm.js — ASM.js fallback factory
      if (realPath.endsWith('.asm.js')) {
        if (shouldCullAsmJS()) {
          return `export default function() { throw new Error('ASMJS module disabled by NATIVE_CODE_BUNDLE_MODE'); };`;
        }
        return ensureDefaultExport(readFileSync(realPath, 'utf-8'));
      }

      // .js.mem — memory initializer file for ASM.js
      if (realPath.endsWith('.js.mem')) {
        if (shouldCullAsmJS()) {
          return `export default '';`;
        }
        const ref = this.emitFile({
          type: 'asset',
          name: basename(realPath),
          source: readFileSync(realPath),
        });
        return `export default new URL(import.meta.ROLLUP_FILE_URL_${ref}, import.meta.url).href;`;
      }

      return null;
    },
  };
}
