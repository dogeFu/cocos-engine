# 小游戏平台适配

> Cocos Creator 引擎小游戏平台（微信、支付宝、字节跳动、小米、百度等）的完整适配参考。涵盖 PAL 层小游戏模块、平台配置、构建约束与各平台差异。

---

## 目录

1. [小游戏平台概览](#1-小游戏平台概览)
2. [pal/minigame 模块](#2-palminigame-模块)
3. [PAL 层各模块的小游戏实现](#3-pal-层各模块的小游戏实现)
4. [平台构建配置](#4-平台构建配置)
5. [vite/platforms/ — 平台配置源码](#5-viteplatforms--平台配置源码)
6. [编译时常量](#6-编译时常量)
7. [各小游戏平台差异详解](#7-各小游戏平台差异详解)
8. [小游戏适配模式](#8-小游戏适配模式)
9. [隐含知识与常见陷阱](#9-隐含知识与常见陷阱)
10. [关键文件索引](#10-关键文件索引)

---

## 1. 小游戏平台概览

Cocos Creator 支持的小游戏/快游戏平台：

| 平台 | 常量名 | SDK 全局对象 | 构建目录 |
|------|--------|-------------|---------|
| 微信小游戏 | `WECHAT` | `wx` | `vite/platforms/wechat/` |
| 微信小程序 | `WECHAT_MINI_PROGRAM` | `wx` | — |
| 支付宝小游戏 | `ALIPAY` | `my` | `vite/platforms/alipay/` |
| 字节跳动小游戏 | `BYTEDANCE` | `tt` | `vite/platforms/bytedance/` |
| 小米快游戏 | `XIAOMI` | `qg` | `vite/platforms/xiaomi/` |
| 百度小游戏 | `BAIDU` | `swan` | `vite/platforms/baidu/` |
| OPPO 快游戏 | `OPPO` | `qg` | — |
| VIVO 快游戏 | `VIVO` | `qg` | — |
| 华为快游戏 | `HUAWEI` | `hbs` | — |
| 咪咕快游戏 | `MIGU` | `mg` | — |
| 荣耀快游戏 | `HONOR` | `honor` | — |
| 淘宝创意小程序 | `TAOBAO` | `my` | — |
| 淘宝小游戏 | `TAOBAO_MINIGAME` | `my` | — |
| Cocos Runtime | `COCOS_RUNTIME` | `ral` | — |

### 组合常量

| 常量 | 表达式 | 说明 |
|------|--------|------|
| `MINIGAME` | 任一小游戏平台为 true | 小游戏环境统一判断 |
| `RUNTIME_BASED` | `COCOS_RUNTIME \|\| HUAWEI \|\| OPPO \|\| VIVO` | Runtime 环境判断 |

---

## 2. pal/minigame 模块

### 2.1 目录结构

```
pal/minigame/
├── wechat.ts              # 微信小游戏适配
├── wechat_mini_program.ts # 微信小程序适配
├── alipay.ts              # 支付宝小游戏适配
├── bytedance.ts           # 字节跳动小游戏适配
├── xiaomi.ts              # 小米快游戏适配
├── baidu.ts               # 百度小游戏适配
├── taobao.ts              # 淘宝创意小程序适配
├── taobao_minigame.ts     # 淘宝小游戏适配
├── runtime.ts             # 华为/OPPO/VIVO Runtime 适配
└── non-minigame.ts        # 非小游戏平台的空实现
```

### 2.2 核心适配模式

每个小游戏适配文件的核心模式是 `cloneObject(minigame, sdkGlobal)`，即将 SDK 全局对象的方法克隆到 `minigame` 对象上，然后进行 polyfill 和兼容性处理：

```typescript
// pal/minigame/wechat.ts（简化示例）
import { cloneObject } from '../utils';

const minigame = {} as System;
cloneObject(minigame, wx);

// polyfill：音频
minigame.createInnerAudioContext = createInnerAudioContextPolyfill(wx);

// 兼容性处理
if (!minigame.onUnhandledRejection) {
    minigame.onUnhandledRejection = () => {};
}

export default minigame;
```

### 2.3 minigame 对象的公共接口

所有小游戏适配文件导出的 `minigame` 对象必须满足相同的接口（通过 `checkPalIntegrity` 类型校验）：

| 方法/属性 | 说明 |
|----------|------|
| `createCanvas()` | 创建 Canvas 元素 |
| `createImage()` | 创建 Image 元素 |
| `createInnerAudioContext()` | 创建音频上下文 |
| `getSystemInfoSync()` | 获取系统信息 |
| `onTouchStart/Move/End/Cancel()` | 触摸事件监听 |
| `onMemoryWarning()` | 内存警告监听 |
| `onUnhandledRejection()` | 未处理 Promise 拒绝监听 |
| `loadSubpackage()` | 分包加载 |
| `exitMiniProgram()` | 退出小游戏 |

### 2.4 non-minigame.ts 空实现

当构建目标不是小游戏平台时，`pal/minigame` 路径别名解析到 `non-minigame.ts`，提供空实现以确保类型兼容。

---

## 3. PAL 层各模块的小游戏实现

### 3.1 env 模块

**文件：** `pal/env/minigame/env.ts`

| 功能 | 实现方式 |
|------|---------|
| `findCanvas()` | `document.createElement('div')` + `window.canvas` |
| `loadJsFile()` | 小米: `require()`；微信: `__wxRequire()`；淘宝: 不支持动态加载 |

### 3.2 system-info 模块

**文件：** `pal/system-info/minigame/system-info.ts`

- 使用各小游戏 SDK 的 `getSystemInfoSync()` 获取信息
- 通过条件编译常量（`WECHAT`、`BYTEDANCE` 等）区分不同小游戏平台
- `isNative = false`，`isBrowser = false`，`isMiniGame = true`

### 3.3 input 模块

**文件：** `pal/input/minigame/`

- 触摸事件通过 `wx.onTouchStart/Move/End/Cancel` 注册
- 坐标转换与 Web 平台类似
- 不支持鼠标和手柄输入

### 3.4 audio 模块

**文件：** `pal/audio/minigame/player.ts`

- 使用小游戏 SDK 的 `createInnerAudioContext()` API
- 音频类型为 `AudioType.DOM_AUDIO`
- 不支持 Web Audio API

### 3.5 screen-adapter 模块

**文件：** `pal/screen-adapter/minigame/screen-adapter.ts`

- `devicePixelRatio` 通过 `getSystemInfoSync().pixelRatio` 获取
- `windowSize` 通过 `window.innerWidth/Height` 获取
- 不支持全屏操作

### 3.6 pacer 模块

**文件：** `pal/pacer/pacer-minigame.ts`

- 使用 `requestAnimationFrame` 驱动
- 通过 `jsb.setPreferredFramesPerSecond()` 设置帧率（如果可用）

### 3.7 wasm 模块

**文件：** `pal/wasm/wasm-minigame.ts`

- 使用 `WebAssembly.instantiate()` 加载
- WASM 文件通过 `wx.getFileSystemManager().readFile()` 读取
- 支持 `WASM_SUBPACKAGE` 分包

---

## 4. 平台构建配置

### 4.1 配置文件

每个小游戏平台在 `vite/platforms/` 下有独立的 `platform.config.ts`：

| 平台 | 配置文件 | 输出格式 |
|------|---------|---------|
| 微信 | `vite/platforms/wechat/platform.config.ts` | cjs |
| 字节跳动 | `vite/platforms/bytedance/platform.config.ts` | cjs |
| 支付宝 | `vite/platforms/alipay/platform.config.ts` | cjs |
| 小米 | `vite/platforms/xiaomi/platform.config.ts` | cjs |
| 百度 | `vite/platforms/baidu/platform.config.ts` | cjs |

### 4.2 配置内容

每个平台配置包含：

```typescript
{
    required: {
        constants: {
            WECHAT: true,          // 平台标识
            MINIGAME: true,        // 小游戏环境
            HTML5: true,           // 基于 HTML5
            NATIVE: false,         // 非原生
            // ...
        },
        alias: {
            'pal/audio': resolve(engineRoot, 'pal/audio/minigame/player.ts'),
            'pal/env': resolve(engineRoot, 'pal/env/minigame/env.ts'),
            'pal/system-info': resolve(engineRoot, 'pal/system-info/minigame/system-info.ts'),
            'pal/screen-adapter': resolve(engineRoot, 'pal/screen-adapter/minigame/screen-adapter.ts'),
            'pal/input': resolve(engineRoot, 'pal/input/minigame/index.ts'),
            'pal/pacer': resolve(engineRoot, 'pal/pacer/pacer-minigame.ts'),
            'pal/wasm': resolve(engineRoot, 'pal/wasm/wasm-minigame.ts'),
            'pal/minigame': resolve(engineRoot, 'pal/minigame/wechat.ts'),
        },
        output: { format: 'cjs' },
    },
    defaults: {
        features: { /* 默认启用的功能 */ },
    },
    constraints: {
        unsupportedFeatures: ['terrain', 'xr', 'physics-physx'],
        forcedOffFeatures: ['video', 'webview'],
    },
}
```

### 4.3 特性约束

所有小游戏平台的通用约束：

| 约束类型 | 特性 | 说明 |
|---------|------|------|
| 不支持 | `terrain` | 地形系统 |
| 不支持 | `xr` | XR 扩展现实 |
| 不支持 | `physics-physx` | PhysX 物理 |
| 强制关闭 | `video` | 视频播放 |
| 强制关闭 | `webview` | WebView |

---

## 5. vite/platforms/ — 平台配置源码

### 5.1 目录结构

```
vite/platforms/
├── base.ts                    # 基础类型定义与配置合并逻辑
├── web/platform.config.ts     # Web 平台
├── native/platform.config.ts  # 原生平台
├── wechat/platform.config.ts  # 微信小游戏
├── alipay/platform.config.ts  # 支付宝小游戏
├── bytedance/platform.config.ts # 字节跳动小游戏
├── baidu/platform.config.ts   # 百度小游戏
├── xiaomi/platform.config.ts  # 小米小游戏
└── cli/platform.config.ts     # CLI 模式（编辑器用）
```

### 5.2 核心类型定义（base.ts）

**UserConfig — 用户配置：**

```typescript
export interface UserConfig {
    features: {
        spine: boolean; spineVersion: "3.8" | "4.2"; dragonBones: boolean;
        marionette: boolean; physics: boolean; physics2D: boolean;
        skeletalAnimation: boolean;
    };
    build: { debug: boolean; sourceMap: boolean; minify: boolean; };
    platform: string;
}
```

**PlatformConfig — 平台配置：**

| 字段 | 说明 |
|------|------|
| `required.constants` | 编译常量（HTML5, JSB, MINIGAME, SUPPORT_JIT 等） |
| `required.alias` | 模块别名（pal 层替换） |
| `required.output` | 输出格式（es/cjs/iife） |
| `defaults` | 默认 features 和 build 配置 |
| `constraints.unsupportedFeatures` | 不支持的功能（开启则报错） |
| `constraints.forcedOffFeatures` | 强制关闭的功能（自动关闭+警告） |
| `jsbReplacements` | JSB 替换映射（native 专用） |

### 5.3 各平台关键差异

| 平台 | HTML5 | JSB | MINIGAME | SUPPORT_JIT | 输出格式 | CULL_MESHOPT |
|------|-------|-----|----------|-------------|---------|-------------|
| web | true | false | false | true | es | false |
| native | false | true | false | true | cjs | true |
| wechat | true | false | true | false | cjs | true |
| alipay | true | false | true | false | cjs | true |
| bytedance | true | false | true | false | cjs | true |
| cli | false | false | false | true | iife | false |

### 5.4 pal 层别名替换机制

每个平台通过 `required.alias` 将统一的 `pal/*` 模块路径映射到具体平台实现：

| 模块别名 | web | native | minigame |
|---------|-----|--------|----------|
| `pal/audio` | `web/player.ts` | `native/player.ts` | `minigame/player.ts` |
| `pal/env` | `web/env.ts` | `native/env.ts` | `minigame/env.ts` |
| `pal/system-info` | `web/` | `native/` | `minigame/` |
| `pal/screen-adapter` | `web/` | `native/` | `minigame/` |
| `pal/input` | `web/` | `native/` | `minigame/` |
| `pal/pacer` | `pacer-web.ts` | `pacer-native.ts` | `pacer-minigame.ts` |
| `pal/wasm` | `wasm-web.ts` | `wasm-native.ts` | `wasm-minigame.ts` |
| `pal/minigame` | `non-minigame.ts` | `non-minigame.ts` | 各平台独立 |

小游戏平台之间唯一的区别就是 `pal/minigame` 指向不同的平台适配文件。

### 5.5 native 平台的 JSB 替换

native 平台通过 `jsbReplacements` 将大量引擎模块替换为 `.jsb.ts` 版本，涵盖：
- 渲染管线（rendering/index, render-pipeline, render-stage）
- 渲染场景核心（render-scene/core/*, render-scene/scene/*）
- 2D 渲染器（2d/renderer/native-2d）
- GFX 层（gfx/base/pipeline-state, gfx/index）
- 场景图（scene-graph/node, scene, scene-globals）
- 资产系统（asset/assets/*）
- 3D 模型（3d/assets/*, 3d/models/*）
- GI 光照探针（gi/light-probe/*）

### 5.6 配置加载流程

- `loadUserConfig()` — 优先从环境变量 `VITE_ENGINE_FEATURES` / `VITE_ENGINE_BUILD` 读取，回退到 `vite/user.config.ts` 文件
- `loadPlatformConfig()` — 通过 `jiti` 动态加载 `vite/platforms/{platform}/platform.config.ts`
- `mergeConfig()` — 合并策略：检查约束 → 合并 features → 强制关闭 → 合并 build → 合并常量

### 5.7 隐含知识

- 小游戏平台（MINIGAME=true）的 `SUPPORT_JIT` 为 false，禁用 JIT 优化
- native 平台的 `CULL_MESHOPT` 为 true，启用网格优化裁剪
- cli 平台是编辑器专用，`EDITOR: true`，复用 web 的 pal 实现
- `forcedOffFeatures` 中的功能会自动关闭并输出警告，不会报错
- `unsupportedFeatures` 中的功能开启会直接抛错

---

## 6. 编译时常量

### 5.1 小游戏平台常量

构建小游戏时，对应的平台常量为 `true`，其余为 `false`：

```typescript
// 微信小游戏构建时
export const WECHAT = true;
export const MINIGAME = true;
export const HTML5 = true;
export const NATIVE = false;
export const ALIPAY = false;
export const BYTEDANCE = false;
// ...
```

### 5.2 条件编译使用

```typescript
import { WECHAT, MINIGAME, ALIPAY } from 'internal:constants';

if (MINIGAME) {
    // 小游戏通用代码
}

if (WECHAT) {
    // 微信专用代码
}

if (ALIPAY) {
    // 支付宝专用代码
}
```

---

## 7. 各小游戏平台差异详解

### 6.1 微信小游戏

**SDK 全局对象：** `wx`
**适配文件：** `pal/minigame/wechat.ts`

- 最完善的小游戏平台支持
- 支持 `wx.createCanvas()`、`wx.createImage()`
- 支持 `wx.createInnerAudioContext()` 音频
- 支持 `wx.getFileSystemManager()` 文件系统
- 支持 `wx.loadSubpackage()` 分包加载
- 支持 `wx.onMemoryWarning()` 内存警告
- 不支持 DOM 操作
- 不支持 `XMLHttpRequest`（使用 `wx.request()` 替代）

### 6.2 微信小程序

**适配文件：** `pal/minigame/wechat_mini_program.ts`

- 与微信小游戏共享 `wx` 全局对象
- 小程序没有 `createCanvas()` 和 `createImage()`，需要通过组件获取
- 更严格的包体限制

### 6.3 支付宝小游戏

**SDK 全局对象：** `my`
**适配文件：** `pal/minigame/alipay.ts`

- 使用 `my.createCanvas()`、`my.createImage()`
- 音频使用 `my.createInnerAudioContext()`
- 不支持 `XMLHttpRequest`（使用 `my.request()` 替代）

### 6.4 字节跳动小游戏

**SDK 全局对象：** `tt`
**适配文件：** `pal/minigame/bytedance.ts`

- 使用 `tt.createCanvas()`、`tt.createImage()`
- 音频使用 `tt.createInnerAudioContext()`
- 支持 `tt.loadSubpackage()` 分包

### 6.5 小米快游戏

**SDK 全局对象：** `qg`
**适配文件：** `pal/minigame/xiaomi.ts`

- 使用 `qg.createCanvas()`、`qg.createImage()`
- 支持 `require()` 动态加载 JS 文件
- Runtime 环境，基于 ral 运行时

### 6.6 百度小游戏

**SDK 全局对象：** `swan`
**适配文件：** `pal/minigame/baidu.ts`

- 使用 `swan.createCanvas()`、`swan.createImage()`

### 6.7 OPPO/VIVO/华为快游戏

**SDK 全局对象：** `qg`（OPPO/VIVO）、`hbs`（华为）
**适配文件：** `pal/minigame/runtime.ts`

- 基于 Cocos Runtime 运行时（`ral` 全局对象）
- 使用 `ral.createCanvas()` 创建画布
- `RUNTIME_BASED` 常量为 `true`

### 6.8 淘宝

**适配文件：** `pal/minigame/taobao.ts`（创意小程序）、`pal/minigame/taobao_minigame.ts`（小游戏）

- 使用 `my` 全局对象（与支付宝共享）
- 创意小程序不支持动态加载 JS

---

## 8. 小游戏适配模式

### 7.1 cloneObject 工具

**文件：** `pal/utils.ts`

```typescript
export function cloneObject<T>(target: T, source: any): T {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    }
    return target;
}
```

将 SDK 全局对象的所有方法/属性克隆到 `minigame` 对象，然后对不兼容的 API 进行 polyfill。

### 7.2 音频 Polyfill

各平台音频 API 差异较大，需要统一 polyfill：

```typescript
function createInnerAudioContextPolyfill(sdk: any) {
    return function() {
        const audio = sdk.createInnerAudioContext();
        // 统一接口适配
        return {
            src: '',
            play() { audio.play(); },
            pause() { audio.pause(); },
            stop() { audio.stop(); },
            // ...
        };
    };
}
```

### 7.3 分包加载

小游戏平台普遍支持分包加载，但 API 不统一：

| 平台 | API | 说明 |
|------|-----|------|
| 微信 | `wx.loadSubpackage()` | 返回 Promise |
| 字节跳动 | `tt.loadSubpackage()` | 返回 Promise |
| 支付宝 | `my.loadSubpackage()` | 返回 Promise |

### 7.4 WASM 支持

小游戏平台的 WASM 支持情况：

| 平台 | WASM 支持 | 说明 |
|------|----------|------|
| 微信 | ✓ | 基础库 2.14.0+ |
| 字节跳动 | ✓ | — |
| 支付宝 | ✗ | 不支持 |
| 小米 | ✓ | Runtime 环境 |
| OPPO/VIVO/华为 | ✓ | Runtime 环境 |

`WASM_SUBPACKAGE` 常量控制是否将 WASM 文件放在分包中。

---

## 9. 隐含知识与常见陷阱

1. **小游戏没有 DOM** — 不能使用 `document.createElement()`、`window` 等浏览器 API，必须通过 SDK 提供的 API
2. **包体限制严格** — 微信小游戏主包 4MB，总包 20MB；其他平台也有类似限制
3. **`MINIGAME` 常量用于通用判断** — 不要用 `WECHAT || ALIPAY || BYTEDANCE`，直接用 `MINIGAME`
4. **音频 API 不统一** — 各平台的 `createInnerAudioContext()` 行为有差异，需要 polyfill
5. **`non-minigame.ts` 必须保持接口兼容** — 非小游戏构建时使用空实现，但必须导出相同的接口
6. **`RUNTIME_BASED` 平台使用 `ral` 运行时** — 华为/OPPO/VIVO 共享 runtime 适配
7. **不支持 `XMLHttpRequest`** — 必须使用各平台 SDK 的网络请求 API
8. **不支持 `video` 和 `webview`** — 这些特性在小游戏平台被强制关闭
9. **分包加载 API 不统一** — 需要通过 `pal/minigame` 适配层统一
10. **WASM 支持需要基础库版本** — 微信小游戏需要基础库 2.14.0+ 才支持 WASM
11. **`loadJsFile()` 在淘宝不可用** — 淘宝创意小程序不支持动态加载 JS 文件
12. **PAL 别名在构建时解析** — `pal/minigame` 路径在构建时通过 Rollup alias 解析到对应平台文件

---

## 10. 关键文件索引

| 文件 | 职责 |
|------|------|
| `pal/minigame/wechat.ts` | 微信小游戏适配 |
| `pal/minigame/alipay.ts` | 支付宝小游戏适配 |
| `pal/minigame/bytedance.ts` | 字节跳动小游戏适配 |
| `pal/minigame/xiaomi.ts` | 小米快游戏适配 |
| `pal/minigame/baidu.ts` | 百度小游戏适配 |
| `pal/minigame/runtime.ts` | 华为/OPPO/VIVO Runtime 适配 |
| `pal/minigame/non-minigame.ts` | 非小游戏空实现 |
| `pal/utils.ts` | cloneObject 等共享工具 |
| `pal/integrity-check.ts` | 接口一致性校验 |
| `vite/platforms/wechat/platform.config.ts` | 微信平台构建配置 |
| `vite/platforms/alipay/platform.config.ts` | 支付宝平台构建配置 |
| `vite/platforms/bytedance/platform.config.ts` | 字节跳动平台构建配置 |
| `vite/platforms/xiaomi/platform.config.ts` | 小米平台构建配置 |
| `vite/platforms/baidu/platform.config.ts` | 百度平台构建配置 |
| `pal/env/minigame/env.ts` | 小游戏环境模块 |
| `pal/system-info/minigame/system-info.ts` | 小游戏系统信息模块 |
| `pal/audio/minigame/player.ts` | 小游戏音频模块 |
| `pal/screen-adapter/minigame/screen-adapter.ts` | 小游戏屏幕适配模块 |
| `pal/input/minigame/` | 小游戏输入模块 |
| `pal/pacer/pacer-minigame.ts` | 小游戏帧率控制模块 |
| `pal/wasm/wasm-minigame.ts` | 小游戏 WASM 加载模块 |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
