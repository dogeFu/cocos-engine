import type { Plugin } from 'vite';
import { resolve } from 'path';

export interface CocosExternalOptions {
  platform: string;
}

const EXTERNAL_MODULES = [
  /external:emscripten\/meshopt\/meshopt_decoder\.(wasm|asm)\.js/,
  /external:emscripten\/meshopt\/meshopt_decoder\.wasm\.wasm/,
  /external:emscripten\/box2d\/box2d\.release\.(wasm|asm)\.js/,
  /external:emscripten\/box2d\/box2d\.release\.wasm\.wasm/,
  /external:emscripten\/webgpu\/(webgpu_wasm|glslang|twgsl)\.(js|wasm)/,
  /external:emscripten\/spine\/[\d.]+\/spine\.(wasm|asm)\.js/,
  /external:emscripten\/spine\/[\d.]+\/spine\.wasm/,
  /external:emscripten\/bullet\/bullet\.release\.(wasm|asm)\.js/,
  /external:emscripten\/bullet\/bullet\.release\.wasm\.wasm/,
  /external:emscripten\/physx\/physx\.release\.(wasm|asm)\.js/,
  /external:emscripten\/physx\/physx\.release\.wasm\.wasm/,
];

export function cocosExternalModules(options: CocosExternalOptions): Plugin {
  const { platform } = options;
  
  return {
    name: 'vite-plugin-cocos-external-modules',
    enforce: 'pre',
    
    resolveId(source, importer) {
      if (source.startsWith('external:emscripten/')) {
        return { id: source, external: true };
      }
      return null;
    },
    
    load(id) {
      if (id.startsWith('external:emscripten/')) {
        if (id.endsWith('.wasm') || id.endsWith('.wasm.wasm')) {
          return `export default "${id}";`;
        }
        if (id.endsWith('.js')) {
          return `
            export default function() {
              console.warn("[Vite] External module not loaded: ${id}");
              return {};
            }
          `;
        }
        return `export default "${id}";`;
      }
      return null;
    },
  };
}
