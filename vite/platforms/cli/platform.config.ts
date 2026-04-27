import { definePlatformConfig } from '../base';
import { resolve } from 'path';

const engineRoot = resolve(__dirname, '../../..');

export default definePlatformConfig({
    name: 'cli',

    required: {
        constants: {
            // ==========================================
            // 平台标识
            // ==========================================
            HTML5: false,
            NATIVE: false,
            JSB: false,
            MINIGAME: false,
            RUNTIME_BASED: false,
            SUPPORT_JIT: true,

            // ==========================================
            // 核心：开启 EDITOR，保留 _serialize() 方法体
            // ==========================================
            EDITOR: true,
            EDITOR_NOT_IN_PREVIEW: false,

            // ==========================================
            // 构建和调试
            // ==========================================
            PREVIEW: false,
            BUILD: true,
            TEST: false,
            DEBUG: false,
            DEV: false,
            SERVER_MODE: false,

            // ==========================================
            // 平台特定 — 全部 false
            // ==========================================
            ANDROID: false,
            IOS: false,
            MAC: false,
            WINDOWS: false,
            LINUX: false,
            OHOS: false,
            OPEN_HARMONY: false,
            WECHAT: false,
            WECHAT_MINI_PROGRAM: false,
            XIAOMI: false,
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
            WEBGPU: false,

            // ==========================================
            // 功能常量
            // ==========================================
            NET_MODE: 0,
            NATIVE_CODE_BUNDLE_MODE: 2,
            WASM_SUBPACKAGE: false,
            CULL_MESHOPT: false,
            LOAD_SPINE_MANUALLY: false,
            LOAD_BOX2D_MANUALLY: false,
            USE_3D: true,
            USE_UI_SKEW: false,
            USE_SORTING_2D: false,
        },

        alias: {
            // 复用 web 平台的 pal 实现，依赖 setupWindowMocks() 提供的浏览器 API 模拟
            'pal/audio': resolve(engineRoot, 'pal/audio/web/player.ts'),
            'pal/env': resolve(engineRoot, 'pal/env/web/env.ts'),
            'pal/system-info': resolve(engineRoot, 'pal/system-info/web/system-info.ts'),
            'pal/screen-adapter': resolve(engineRoot, 'pal/screen-adapter/web/screen-adapter.ts'),
            'pal/input': resolve(engineRoot, 'pal/input/web/index.ts'),
            'pal/pacer': resolve(engineRoot, 'pal/pacer/pacer-web.ts'),
            'pal/wasm': resolve(engineRoot, 'pal/wasm/wasm-web.ts'),
            'pal/minigame': resolve(engineRoot, 'pal/minigame/non-minigame.ts'),
            'cocos/2d/renderer/native-2d': resolve(engineRoot, 'cocos/2d/renderer/native-2d-empty.ts'),
        },

        output: {
            format: 'iife',
            preserveModules: false,
        },
    },

    defaults: {
        features: {
            marionette: true,
            spine: false,
            dragonBones: false,
            physics: false,
            physics2D: false,
            skeletalAnimation: false,
        },
        build: {
            sourceMap: true,
            minify: false,
        },
    },
});
