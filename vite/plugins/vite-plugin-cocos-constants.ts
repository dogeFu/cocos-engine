import type { Plugin } from 'vite';
import { resolve } from 'path';

export interface CocosVirtualModulesOptions {
  constants: Record<string, boolean | number>;
  platform: string;
}

export function cocosVirtualModules(options: CocosVirtualModulesOptions): Plugin {
  const constantsModuleId = 'internal:constants';
  const nativeModuleId = 'internal:native';
  
  const resolvedConstantsId = '\0' + constantsModuleId;
  const resolvedNativeId = '\0' + nativeModuleId;
  
  const isNative = options.platform === 'native';
  
  return {
    name: 'vite-plugin-cocos-virtual-modules',
    
    resolveId(id: string) {
      if (id === constantsModuleId) {
        return resolvedConstantsId;
      }
      if (id === nativeModuleId) {
        return resolvedNativeId;
      }
      return null;
    },
    
    load(id: string) {
      if (id === resolvedConstantsId) {
        const lines = Object.entries(options.constants).map(
          ([key, value]) => `export const ${key} = ${JSON.stringify(value)};`
        );
        return lines.join('\n');
      }
      
      if (id === resolvedNativeId) {
        if (isNative) {
          return `export * from ${JSON.stringify(resolve(__dirname, '../../cocos/native-binding/impl.ts'))};`;
        }
        return `export const native = {};`;
      }
      
      return null;
    },
  };
}

export default cocosVirtualModules;
