import type { Plugin } from 'vite';
import { resolve } from 'path';

export interface CocosModuleReplaceOptions {
  platform: string;
  features?: {
    spine: boolean;
    spineVersion: '3.8' | '4.2';
    marionette: boolean;
    physics: boolean;
    physics2D: boolean;
  };
}

const WEB_REPLACEMENTS: [string, string][] = [
  ['cocos/2d/renderer/native-2d.ts', 'cocos/2d/renderer/native-2d-empty.ts'],
];

const SPINE_3_8_REPLACEMENTS: [string, string][] = [
  ['cocos/spine/lib/spine-version.ts', 'cocos/spine/lib/spine-version-3.8.ts'],
  ['cocos/spine/lib/spine-instantiate.ts', 'cocos/spine/lib/spine-instantiate-3.8.ts'],
];

const SPINE_4_2_REPLACEMENTS: [string, string][] = [
  ['cocos/spine/lib/spine-version.ts', 'cocos/spine/lib/spine-version-4.2.ts'],
  ['cocos/spine/lib/spine-instantiate.ts', 'cocos/spine/lib/spine-instantiate-4.2.ts'],
];

export function cocosModuleReplace(options: CocosModuleReplaceOptions): Plugin {
  const { platform, features } = options;
  const engineRoot = resolve(__dirname, '../..');
  
  let replacements: [string, string][] = [];
  
  if (platform !== 'native') {
    replacements = [...WEB_REPLACEMENTS];
  }
  
  if (features?.spine) {
    if (features.spineVersion === '3.8') {
      replacements = [...replacements, ...SPINE_3_8_REPLACEMENTS];
    } else if (features.spineVersion === '4.2') {
      replacements = [...replacements, ...SPINE_4_2_REPLACEMENTS];
    }
  }
  
  const replacementMap = new Map<string, string>();
  for (const [original, replacement] of replacements) {
    const originalPath = resolve(engineRoot, original);
    const replacementPath = resolve(engineRoot, replacement);
    replacementMap.set(originalPath, replacementPath);
  }
  
  return {
    name: 'vite-plugin-cocos-module-replace',
    enforce: 'pre',
    
    resolveId(source, importer, resolveOptions) {
      if (!importer || replacements.length === 0) return null;
      
      const importerDir = resolve(importer, '..');
      let fullPath: string;
      
      if (source.startsWith('../') || source.startsWith('./')) {
        fullPath = resolve(importerDir, source);
      } else {
        return null;
      }
      
      if (replacementMap.has(fullPath)) {
        return { id: replacementMap.get(fullPath)!, external: false };
      }
      
      for (const [original, replacement] of replacementMap) {
        if (fullPath === original || fullPath === original.replace(/\.ts$/, '')) {
          return { id: replacement, external: false };
        }
      }
      
      return null;
    },
  };
}
