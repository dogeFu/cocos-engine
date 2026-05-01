import { defineConfig, type UserConfig } from 'vite';
import { resolve } from 'path';
import { loadPlatformConfig, mergeConfig, loadUserConfig, getEngineRoot } from '../platforms/base';
import { cocosVirtualModules } from '../plugins/vite-plugin-cocos-constants';
import { cocosJsbReplace } from '../plugins/vite-plugin-cocos-jsb-replace';
import { cocosDecoratorOptimizer } from '../plugins/vite-plugin-cocos-decorator-optimizer';
import { cocosExternalModules } from '../plugins/vite-plugin-cocos-external-modules';
import { cocosModuleReplace } from '../plugins/vite-plugin-cocos-module-replace';
import { cocosDelayStaticInit } from '../plugins/vite-plugin-cocos-delay-static-init';
import { cocosModules } from '../plugins/vite-plugin-cocos-modules';

const engineRoot = getEngineRoot();

export default defineConfig(({ mode }): UserConfig => {
  const platform = process.env.VITE_PLATFORM || 'web';

  const userConfig = loadUserConfig();
  userConfig.platform = platform;

  const platformConfig = loadPlatformConfig(platform);
  const finalConfig = mergeConfig(userConfig, platformConfig);

  const isProduction = mode === 'production';
  // Allow custom output directory via environment variable
  const customOutputDir = process.env.VITE_ENGINE_OUTPUT_DIR;
  const outputDir = customOutputDir || resolve(engineRoot, 'bin/vite', platform, isProduction ? 'prod' : 'dev');
  
  const isNative = platform === 'native';
  const preserveModules = finalConfig.output.preserveModules ?? false;
  
  const useModuleCulling = process.env.VITE_MODULE_CULLING !== 'false';
  
  return {
    mode,
    
    resolve: {
      alias: {
        ...finalConfig.alias,
        'cc.decorator': resolve(engineRoot, 'cocos/core/data/decorators/index.ts'),
      },
    },
    
    define: Object.fromEntries(
      Object.entries(finalConfig.constants).map(([k, v]) => [k, JSON.stringify(v)])
    ),
    
    plugins: [
      ...(useModuleCulling ? [cocosModules({
        features: finalConfig.features,
        platform: platform,
      })] : []),
      cocosVirtualModules({
        constants: finalConfig.constants,
        platform: platform,
      }),
      {
        name: 'cocos-internal-bridge',
        transform(code, id) {
          // In global-exports.ts, right after `cclegacy.internal = {}`, inject code
          // that captures the internal namespace to a global variable. This runs inside
          // the IIFE body, so when modules later populate cclegacy.internal.X = X,
          // window._ccInternal will point to the same object.
          // The footer then restores window.cc.internal from window._ccInternal.
          if (id.endsWith('global-exports.ts')) {
            const marker = 'cclegacy.internal = {};';
            const idx = code.indexOf(marker);
            if (idx !== -1) {
              const insertPos = idx + marker.length;
              const injection = '\nif (typeof window !== "undefined") { window._ccInternal = cclegacy.internal; }';
              return code.slice(0, insertPos) + injection + code.slice(insertPos);
            }
          }
          return null;
        },
      },
      cocosDelayStaticInit(),
      cocosModuleReplace({
        platform: platform,
        features: finalConfig.features,
      }),
      cocosJsbReplace({
        enabled: isNative,
        replacements: finalConfig.jsbReplacements || {},
      }),
      cocosDecoratorOptimizer({
        optimize: isProduction,
        removeEditorDecorators: isProduction,
      }),
      cocosExternalModules({
        platform: platform,
        nativeCodeBundleMode: finalConfig.constants.NATIVE_CODE_BUNDLE_MODE as number,
        engineRoot,
      }),
    ],
    
    build: {
      outDir: outputDir,
      emptyOutDir: true,
      sourcemap: finalConfig.build.sourceMap,
      minify: finalConfig.build.minify ? 'terser' : false,
      
      rollupOptions: {
        input: useModuleCulling 
          ? 'virtual:cocos-entry' 
          : resolve(engineRoot, 'exports/full.ts'),
        output: {
          format: 'iife',
          name: 'cc',
          exports: 'named',
          entryFileNames: 'cc.js',
          chunkFileNames: 'cc-[hash].js',
          assetFileNames: '[name].[ext]',
          globals: {},
          footer: '// Merge Rollup exports into window.cc (legacyCC)\nif (typeof window !== "undefined" && window.cc) { Object.getOwnPropertyNames(cc).forEach(function(k) { try { if (!(k in window.cc)) window.cc[k] = cc[k]; } catch(e) {} }); } else { window.cc = cc; }\n// Restore cc.internal from captured reference\nif (typeof window !== "undefined" && window._ccInternal && window.cc && !window.cc.internal) { window.cc.internal = window._ccInternal; }\n',
        },
        preserveEntrySignatures: 'allow-extension',
        treeshake: {
          moduleSideEffects: 'no-external',
          preset: 'safest',
        },
      },
    },
    
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
          emitDecoratorMetadata: true,
        },
      },
    },
  };
});
