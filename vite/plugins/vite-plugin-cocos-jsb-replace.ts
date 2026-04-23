import type { Plugin } from 'vite';
import { resolve, relative } from 'path';

export interface CocosJsbReplaceOptions {
  enabled: boolean;
  replacements: Record<string, string>;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\.ts$/, '');
}

export function cocosJsbReplace(options: CocosJsbReplaceOptions): Plugin {
  const { enabled, replacements } = options;
  const engineRoot = resolve(__dirname, '../..');
  
  const replacementMap = new Map<string, string>();
  if (enabled && replacements) {
    for (const [original, replacement] of Object.entries(replacements)) {
      const originalPath = normalizePath(resolve(engineRoot, original));
      const replacementPath = resolve(engineRoot, replacement);
      replacementMap.set(originalPath, replacementPath);
    }
  }
  
  return {
    name: 'vite-plugin-cocos-jsb-replace',
    
    enforce: 'pre',
    
    resolveId(source, importer, resolveOptions) {
      if (!enabled) {
        return null;
      }
      
      if (!importer) {
        return null;
      }
      
      const importerDir = resolve(importer, '..');
      let fullPath: string;
      
      if (source.startsWith('../') || source.startsWith('./')) {
        fullPath = resolve(importerDir, source);
      } else {
        fullPath = resolve(engineRoot, source);
      }
      
      const normalizedPath = normalizePath(fullPath);
      const replacement = replacementMap.get(normalizedPath);
      
      if (replacement) {
        return {
          id: replacement,
          external: false,
        };
      }
      
      return null;
    },
  };
}

export default cocosJsbReplace;
