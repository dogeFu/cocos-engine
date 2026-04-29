import type { Plugin } from 'vite';
import { resolve, basename } from 'path';
import { readFileSync } from 'fs';

export interface CocosExternalOptions {
  platform: string;
  nativeCodeBundleMode: number; // 0=ASMJS, 1=WASM, 2=BOTH
  engineRoot: string;
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

      // .wasm.js — Emscripten glue code (JS factory function with export default)
      if (realPath.endsWith('.wasm.js')) {
        if (shouldCullWasm()) {
          return `export default function() { throw new Error('WASM module disabled by NATIVE_CODE_BUNDLE_MODE'); };`;
        }
        return readFileSync(realPath, 'utf-8');
      }

      // .asm.js — ASM.js fallback factory
      if (realPath.endsWith('.asm.js')) {
        if (shouldCullAsmJS()) {
          return `export default function() { throw new Error('ASMJS module disabled by NATIVE_CODE_BUNDLE_MODE'); };`;
        }
        return readFileSync(realPath, 'utf-8');
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
