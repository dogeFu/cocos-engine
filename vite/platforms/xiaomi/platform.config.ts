import { definePlatformConfig } from '../base';
import { resolve } from 'path';

const engineRoot = resolve(__dirname, '../../..');

export default definePlatformConfig({
  name: 'xiaomi',
  
  required: {
    constants: {
      HTML5: true,
      NATIVE: false,
      JSB: false,
      ANDROID: false,
      IOS: false,
      MAC: false,
      WINDOWS: false,
      LINUX: false,
      OHOS: false,
      OPEN_HARMONY: false,
      WECHAT: false,
      WECHAT_MINI_PROGRAM: false,
      XIAOMI: true,
      ALIPAY: false,
      TAOBAO: false,
      TAOBAO_MINIGAME: false,
      BYTEDANCE: false,
      OPPO: false,
      VIVO: false,
      HUAWEI: false,
      MIGU: false,
      HONOR: false,
      COCOS_RUNTIME: false,
      EDITOR: false,
      EDITOR_NOT_IN_PREVIEW: false,
      PREVIEW: false,
      BUILD: true,
      TEST: false,
      DEBUG: false,
      DEV: false,
      SERVER_MODE: false,
      MINIGAME: true,
      RUNTIME_BASED: false,
      SUPPORT_JIT: false,
      NET_MODE: 0,
      WEBGPU: false,
      NATIVE_CODE_BUNDLE_MODE: 2,
      WASM_SUBPACKAGE: false,
      CULL_MESHOPT: true,
      LOAD_SPINE_MANUALLY: false,
      LOAD_BOX2D_MANUALLY: false,
      USE_3D: true,
      USE_UI_SKEW: false,
      USE_SORTING_2D: false,
    },
    alias: {
      'pal/audio': resolve(engineRoot, 'pal/audio/minigame/player.ts'),
      'pal/env': resolve(engineRoot, 'pal/env/minigame/env.ts'),
      'pal/system-info': resolve(engineRoot, 'pal/system-info/minigame/system-info.ts'),
      'pal/screen-adapter': resolve(engineRoot, 'pal/screen-adapter/minigame/screen-adapter.ts'),
      'pal/input': resolve(engineRoot, 'pal/input/minigame/index.ts'),
      'pal/pacer': resolve(engineRoot, 'pal/pacer/pacer-minigame.ts'),
      'pal/wasm': resolve(engineRoot, 'pal/wasm/wasm-minigame.ts'),
      'pal/minigame': resolve(engineRoot, 'pal/minigame/xiaomi.ts'),
    },
    output: {
      format: 'cjs',
      preserveModules: false,
    },
  },
  
  defaults: {
    features: {
      marionette: true,
    },
    build: {
      sourceMap: true,
      minify: false,
    },
  },
  
  constraints: {
    unsupportedFeatures: [],
    forcedOffFeatures: [],
    requiredOutputFormat: 'cjs',
  },
});
