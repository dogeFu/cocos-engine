# 平台抽象层（PAL）架构

> Cocos Creator 引擎平台抽象层（Platform Abstraction Layer）的完整参考。涵盖 PAL 目录结构、接口一致性校验机制、路径别名解析、各模块的平台差异详解。

---

## 目录

1. [PAL 架构概览](#1-pal-架构概览)
2. [目录结构](#2-目录结构)
3. [接口一致性校验机制](#3-接口一致性校验机制)
4. [路径别名解析机制](#4-路径别名解析机制)
5. [env 模块 — 运行环境](#5-env-模块--运行环境)
6. [system-info 模块 — 系统信息](#6-system-info-模块--系统信息)
7. [input 模块 — 输入系统](#7-input-模块--输入系统)
8. [audio 模块 — 音频播放](#8-audio-模块--音频播放)
9. [screen-adapter 模块 — 屏幕适配](#9-screen-adapter-模块--屏幕适配)
10. [pacer 模块 — 帧率控制](#10-pacer-模块--帧率控制)
11. [wasm 模块 — WebAssembly 加载](#11-wasm-模块--webassembly-加载)
12. [minigame 模块 — 小游戏适配](#12-minigame-模块--小游戏适配)
13. [共享类型与枚举](#13-共享类型与枚举)
14. [隐含知识与常见陷阱](#14-隐含知识与常见陷阱)
15. [关键文件索引](#15-关键文件索引)

---

## 1. PAL 架构概览

PAL（Platform Abstraction Layer）是 Cocos 引擎的平台抽象层，负责将不同平台的底层差异封装为统一的 TypeScript 接口。

### 核心设计原则

1. **路径别名解析**：构建时通过 Rollup alias 将 `pal/xxx` 映射到具体平台实现
2. **编译期接口校验**：`checkPalIntegrity` 确保三个平台实现接口一致
3. **共享类型与枚举**：`enum-type/` 目录存放跨平台共享的类型定义
4. **条件编译常量**：`NATIVE`、`WECHAT`、`EDITOR` 等常量控制平台特定代码路径
5. **JSB 桥接**：原生平台通过 `jsb` 全局对象与 C++ 层通信，Web 平台使用浏览器 API

### 架构图

```
┌──────────────────────────────────────────────────────┐
│              引擎业务层 (cocos/)                       │
│   import { systemInfo } from 'pal/system-info'       │
│   import { screenAdapter } from 'pal/screen-adapter' │
├──────────────────────────────────────────────────────┤
│           PAL 接口层 (pal/xxx 路径别名)                 │
│   编译期类型校验 (checkPalIntegrity)                    │
├──────────┬──────────┬──────────┬─────────────────────┤
│  native/ │   web/   │minigame/ │  runtime/           │
│  jsb.*   │ DOM API  │  wx/ral  │  ral.*              │
└──────────┴──────────┴──────────┴─────────────────────┘
```

---

## 2. 目录结构

```
pal/
├── audio/                # 音频播放
│   ├── native/           # 原生平台实现
│   │   └── player.ts     # jsb.AudioEngine
│   ├── web/              # Web 平台实现
│   │   └── player.ts     # AudioPlayerDOM / AudioPlayerWeb
│   ├── minigame/         # 小游戏平台实现
│   │   └── player.ts     # createInnerAudioContext
│   └── type.ts           # 共享类型定义
├── env/                  # 运行环境
│   ├── native/           # jsb.window.__canvas / require()
│   ├── web/              # DOM 查询 / <script> 标签
│   ├── minigame/         # window.canvas / __wxRequire()
│   └── runtime/          # ral.createCanvas()
├── input/                # 输入系统
│   ├── native/           # jsb.onTouchStart/Move/End/Cancel
│   ├── web/              # canvas.addEventListener
│   ├── minigame/         # wx.onTouchStart/Move/End/Cancel
│   ├── input-source.ts   # 共享输入源
│   ├── keycodes.ts       # 共享键码
│   └── touch-manager.ts  # 共享触摸管理
├── minigame/             # 小游戏平台适配
│   ├── wechat.ts         # 微信
│   ├── alipay.ts         # 支付宝
│   ├── bytedance.ts      # 字节跳动
│   ├── xiaomi.ts         # 小米
│   ├── baidu.ts          # 百度
│   ├── taobao.ts         # 淘宝创意小程序
│   ├── taobao_minigame.ts # 淘宝小游戏
│   ├── runtime.ts        # 华为/OPPO/VIVO Runtime
│   └── non-minigame.ts   # 非小游戏空实现
├── pacer/                # 帧率控制
│   ├── pacer-native.ts   # jsb.setPreferredFramesPerSecond
│   ├── pacer-web.ts      # requestAnimationFrame + 时间差
│   └── pacer-minigame.ts # requestAnimationFrame
├── screen-adapter/       # 屏幕适配
│   ├── native/           # jsb.device.*
│   ├── web/              # DOM/CSS 操作
│   ├── minigame/         # getSystemInfoSync
│   └── enum-type/        # 共享枚举类型
├── system-info/          # 系统信息
│   ├── native/           # jsb.device.* / __getPlatform()
│   ├── web/              # navigator.userAgent
│   ├── minigame/         # getSystemInfoSync
│   └── enum-type/        # Platform, OS, Language 等枚举
├── wasm/                 # WebAssembly 加载
│   ├── wasm-native.ts    # native.fileUtils.getDataFromFile
│   ├── wasm-web.ts       # fetch() / require('fs')
│   └── wasm-minigame.ts  # WebAssembly.instantiate
├── integrity-check.ts    # 接口一致性校验
└── utils.ts              # 共享工具函数（cloneObject 等）
```

---

## 3. 接口一致性校验机制

### 3.1 校验原理

**文件：** `pal/integrity-check.ts`

每个平台实现的 `index.ts` 文件末尾都会调用：

```typescript
checkPalIntegrity<typeof import('pal/input')>(withImpl<typeof import('./index')>());
```

`checkPalIntegrity` 函数本身运行时为空（可被 tree-shaking 移除），但 TypeScript 的类型系统会在**编译期**检查每个平台实现是否满足 `pal/xxx` 模块声明的公共接口。类型不匹配时会产生编译错误。

### 3.2 校验函数签名

```typescript
export function checkPalIntegrity<T> (_impl: T): void { /* 空实现 */ }
export function withImpl<T> (): T { return null as unknown as T; }
```

### 3.3 三个平台导出相同的子模块列表

以 `pal/input` 为例，三个平台的 `index.ts` 都导出完全相同的子模块：

```typescript
export * from './accelerometer-input';
export * from './gamepad-input';
export * from './handle-input';
export * from './hmd-input';
export * from './handheld-input';
export * from './keyboard-input';
export * from './mouse-input';
export * from './touch-input';
```

### 3.4 接口兼容性要求

- 每个平台实现必须导出**完全相同的类型签名**
- 移除某平台的功能时，**保留接口属性为 stub**（返回默认值），而非删除
- 例如：移除 XR 后，`gamepad-input.ts` 中的 `gripLeft`、`handLeftPosition` 等保留为 stub 返回 `0`/`Vec3.ZERO`/`Quat.IDENTITY`

---

## 4. 路径别名解析机制

### 4.1 构建时 alias 配置

平台选择通过构建配置中的 alias 映射实现。以 Native 平台为例：

**文件：** `vite/platforms/native/platform.config.ts`

```typescript
alias: {
    'pal/audio': resolve(engineRoot, 'pal/audio/native/player.ts'),
    'pal/env': resolve(engineRoot, 'pal/env/native/env.ts'),
    'pal/system-info': resolve(engineRoot, 'pal/system-info/native/system-info.ts'),
    'pal/screen-adapter': resolve(engineRoot, 'pal/screen-adapter/native/screen-adapter.ts'),
    'pal/input': resolve(engineRoot, 'pal/input/native/index.ts'),
    'pal/pacer': resolve(engineRoot, 'pal/pacer/pacer-native.ts'),
    'pal/wasm': resolve(engineRoot, 'pal/wasm/wasm-native.ts'),
    'pal/minigame': resolve(engineRoot, 'pal/minigame/non-minigame.ts'),
}
```

### 4.2 Web 平台 alias

**文件：** `vite/platforms/web/platform.config.ts`

```typescript
alias: {
    'pal/audio': resolve(engineRoot, 'pal/audio/web/player.ts'),
    'pal/env': resolve(engineRoot, 'pal/env/web/env.ts'),
    'pal/system-info': resolve(engineRoot, 'pal/system-info/web/system-info.ts'),
    'pal/screen-adapter': resolve(engineRoot, 'pal/screen-adapter/web/screen-adapter.ts'),
    'pal/input': resolve(engineRoot, 'pal/input/web/index.ts'),
    'pal/pacer': resolve(engineRoot, 'pal/pacer/pacer-web.ts'),
    'pal/wasm': resolve(engineRoot, 'pal/wasm/wasm-web.ts'),
    'pal/minigame': resolve(engineRoot, 'pal/minigame/non-minigame.ts'),
}
```

### 4.3 小游戏平台 alias

以微信为例：

```typescript
alias: {
    'pal/audio': resolve(engineRoot, 'pal/audio/minigame/player.ts'),
    'pal/env': resolve(engineRoot, 'pal/env/minigame/env.ts'),
    'pal/system-info': resolve(engineRoot, 'pal/system-info/minigame/system-info.ts'),
    'pal/screen-adapter': resolve(engineRoot, 'pal/screen-adapter/minigame/screen-adapter.ts'),
    'pal/input': resolve(engineRoot, 'pal/input/minigame/index.ts'),
    'pal/pacer': resolve(engineRoot, 'pal/pacer/pacer-minigame.ts'),
    'pal/wasm': resolve(engineRoot, 'pal/wasm/wasm-minigame.ts'),
    'pal/minigame': resolve(engineRoot, 'pal/minigame/wechat.ts'),
}
```

### 4.4 引擎代码中的使用

引擎其余代码只需统一导入，无需关心平台差异：

```typescript
import { systemInfo } from 'pal/system-info';
import { screenAdapter } from 'pal/screen-adapter';
import { findCanvas, loadJsFile } from 'pal/env';
```

构建时，Rollup/Vite 会根据目标平台将 `pal/xxx` 路径别名解析到对应的平台实现文件。

---

## 5. env 模块 — 运行环境

### 5.1 公共接口

```typescript
export function findCanvas(): { frame: HTMLDivElement, container: HTMLDivElement, canvas: HTMLCanvasElement };
export function loadJsFile(url: string): Promise<void>;
```

### 5.2 平台差异

| 功能 | Web | Native | Minigame |
|------|-----|--------|----------|
| `findCanvas()` | DOM 查询 `#GameDiv` / `#Cocos3dGameContainer` / `#GameCanvas` | `jsb.window.__canvas`，创建 div 容器 | `document.createElement('div')` + `window.canvas` |
| `loadJsFile()` | `<script>` 标签动态加载 | OpenHarmony: `oh.loadModule()`；Preview: XHR + eval；否则: `require()` | 小米: `require()`；微信: `__wxRequire()`；淘宝: 不支持 |

### 5.3 Native 平台特殊逻辑

`pal/env/native/env.ts` 还有一个 `runtime/` 子平台，用于华为/OPPO/VIVO 等基于 ral 运行时的平台，使用 `ral.createCanvas()` 创建画布。

---

## 6. system-info 模块 — 短信信息

### 6.1 公共接口

```typescript
export const systemInfo: SystemInfo;
```

`SystemInfo` 接口提供：

| 属性 | 类型 | 说明 |
|------|------|------|
| `isNative` | boolean | 是否原生平台 |
| `isBrowser` | boolean | 是否浏览器 |
| `isMobile` | boolean | 是否移动设备 |
| `platform` | Platform | 平台枚举 |
| `os` | OS | 操作系统枚举 |
| `osVersion` | string | 操作系统版本 |
| `browserType` | BrowserType | 浏览器类型 |
| `networkType` | NetworkType | 网络类型 |
| `batteryLevel` | number | 电池电量 |
| `language` | string | 系统语言 |
| `nativeLanguage` | string | 原生语言 |
| `devicePixelRatio` | number | 设备像素比 |
| `pixelRatio` | number | 像素比 |
| `windowSize` | Size | 窗口尺寸 |
| `safeArea` | SafeArea | 安全区域 |
| `features` | Record<string, boolean> | 设备能力 |

### 6.2 Native 平台实现

**文件：** `pal/system-info/native/system-info.ts`

- 通过 `jsb` 全局对象与原生层通信：`jsb.device.getNetworkType()`、`jsb.device.getBatteryLevel()` 等
- 使用 `declare` 声明的原生桥接函数：`__getPlatform()`、`__getCurrentLanguage()`、`__getOS()` 等
- 平台映射表：`0→WIN32, 2→MACOS, 3→ANDROID, 4→IOS, 6→OHOS, 7→OPENHARMONY`
- `isNative = true`，`isBrowser = false`
- Feature 检测基于平台判断（如 `INPUT_TOUCH` 仅在移动端为 true）

### 6.3 Web 平台实现

**文件：** `pal/system-info/web/system-info.ts`

- 完全基于浏览器 API：`navigator.userAgent` 解析、`WebGLRenderingContext` 检测、`createImageBitmap` 异步检测等
- `isNative = false`，`isBrowser = true`

### 6.4 Minigame 平台实现

**文件：** `pal/system-info/minigame/system-info.ts`

- 使用各小游戏 SDK 的 `getSystemInfoSync()` 获取信息
- 通过条件编译常量（`WECHAT`、`BYTEDANCE` 等）区分不同小游戏平台
- `isNative = false`，`isBrowser = false`

### 6.5 共享枚举

**文件：** `pal/system-info/enum-type/`

| 枚举 | 值 | 说明 |
|------|-----|------|
| `Platform` | WECHAT_GAME, ALIPAY_MINI_GAME, BYTEDANCE_MINI_GAME, ... | 平台标识 |
| `OS` | IOS, ANDROID, WINDOWS, MAC, LINUX, OHOS, OPENHARMONY, ... | 操作系统 |
| `BrowserType` | WECHAT, CHROME, FIREFOX, SAFARI, ... | 浏览器类型 |
| `NetworkType` | WWAN, WIFI, NONE | 网络类型 |
| `Language` | CHINESE, ENGLISH, ... | 语言 |

---

## 7. input 模块 — 输入系统

### 7.1 子模块

每个平台实现都导出以下子模块：

| 子模块 | 文件 | 说明 |
|--------|------|------|
| accelerometer-input | `accelerometer-input.ts` | 加速度计 |
| gamepad-input | `gamepad-input.ts` | 手柄 |
| handle-input | `handle-input.ts` | XR 手柄 |
| hmd-input | `hmd-input.ts` | XR 头显 |
| handheld-input | `handheld-input.ts` | 手持设备 |
| keyboard-input | `keyboard-input.ts` | 键盘 |
| mouse-input | `mouse-input.ts` | 鼠标 |
| touch-input | `touch-input.ts` | 触摸 |

### 7.2 Native 平台触摸输入

**文件：** `pal/input/native/touch-input.ts`

- 通过 `jsb.onTouchStart/Move/End/Cancel` 注册原生回调
- 使用 `jsb.ISystemWindowManager` 获取窗口尺寸
- 实现了 `TouchEventCache` 缓存机制，在帧内批量派发事件
- 坐标转换：`y = windowSize.height - clientY * dpr`

### 7.3 Web 平台触摸输入

**文件：** `pal/input/web/touch-input.ts`

- 通过 `canvas.addEventListener('touchstart/move/end/cancel')` 注册
- 使用 `canvas.getBoundingClientRect()` 获取画布位置
- 支持 `isFrameRotated` 旋转适配
- 坐标转换：`x = (clientX - rect.x) * dpr`

### 7.4 共享组件

| 文件 | 说明 |
|------|------|
| `pal/input/input-source.ts` | 输入源定义（InputSourcePosition、InputSourceOrientation 等） |
| `pal/input/keycodes.ts` | 键码枚举（KeyCode） |
| `pal/input/touch-manager.ts` | 触摸管理器（TouchManager） |

---

## 8. audio 模块 — 音频播放

### 8.1 公共接口

```typescript
export class AudioPlayer {
    static maxAudioChannel: number;
    src: string;
    type: AudioType;
    state: AudioState;
    loop: boolean;
    volume: number;
    duration: number;
    currentTime: number;

    static load(url: string): Promise<AudioPlayer>;
    destroy(): void;
    play(): void;
    pause(): void;
    stop(): void;
    seek(time: number): void;
    on(event: string, callback: Function): void;
    off(event: string, callback?: Function): void;
}
```

### 8.2 Native 平台实现

**文件：** `pal/audio/native/player.ts`

- 直接使用 `jsb.AudioEngine`（C++ AudioEngine 的 JSB 绑定）
- 音频类型为 `AudioType.NATIVE_AUDIO`
- 支持 PCM 数据读取（`audioEngine.getOriginalPCMBuffer`）
- 使用 `@enqueueOperation` 装饰器实现操作队列

### 8.3 Web 平台实现

**文件：** `pal/audio/web/player.ts`

- 内部委托给 `AudioPlayerDOM`（`<audio>` 元素）或 `AudioPlayerWeb`（Web Audio API）
- 根据 `AudioContextAgent.support` 和 `audioLoadMode` 选择实现
- 音频类型为 `AudioType.DOM_AUDIO` 或 `AudioType.WEB_AUDIO`

### 8.4 Minigame 平台实现

**文件：** `pal/audio/minigame/player.ts`

- 使用小游戏 SDK 的 `createInnerAudioContext()` API
- 音频类型为 `AudioType.DOM_AUDIO`

### 8.5 AudioType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `DOM_AUDIO` | DOM Audio / 小游戏音频 |
| 1 | `WEB_AUDIO` | Web Audio API |
| 2 | `NATIVE_AUDIO` | 原生音频引擎 |

---

## 9. screen-adapter 模块 — 屏幕适配

### 9.1 公共接口

```typescript
export const screenAdapter: ScreenAdapter;
```

| 属性/方法 | 类型 | 说明 |
|----------|------|------|
| `devicePixelRatio` | number | 设备像素比 |
| `windowSize` | Size | 窗口尺寸 |
| `orientation` | Orientation | 屏幕方向 |
| `safeAreaEdge` | SafeAreaEdge | 安全区域边距 |
| `isFrameRotated` | boolean | 是否旋转 |
| `supportsFullScreen` | boolean | 是否支持全屏 |
| `requestFullScreen()` | Promise<void> | 请求全屏 |
| `exitFullScreen()` | void | 退出全屏 |

### 9.2 Native 平台实现

**文件：** `pal/screen-adapter/native/screen-adapter.ts`

- `devicePixelRatio` 通过 `jsb.device.getDevicePixelRatio()` 获取
- `windowSize` 通过 `jsb.window.innerWidth/Height` 获取
- `orientation` 通过 `jsb.device.getDeviceOrientation()` 获取
- `safeAreaEdge` 通过 `jsb.device.getSafeAreaEdge()` 获取
- `supportsFullScreen = false`（原生平台不支持全屏操作）

### 9.3 Web 平台实现

**文件：** `pal/screen-adapter/web/screen-adapter.ts`

- 完全基于 DOM/CSS 操作
- `supportsFullScreen = true`
- 支持全屏 API（`requestFullscreen()`）
- 窗口类型判断：SubFrame / BrowserWindow / Fullscreen

### 9.4 共享枚举

**文件：** `pal/screen-adapter/enum-type/`

| 枚举 | 值 | 说明 |
|------|-----|------|
| `Orientation` | PORTRAIT, LANDSCAPE_LEFT, LANDSCAPE_RIGHT, AUTO | 屏幕方向 |

---

## 10. pacer 模块 — 帧率控制

### 10.1 公共接口

```typescript
export class Pacer {
    requestFrame(callback: (dt: number) => void): void;
    setTargetFrameRate(fps: number): void;
    getTargetFrameRate(): number;
}
```

### 10.2 平台差异

| 平台 | 实现 | 说明 |
|------|------|------|
| Native | `pacer-native.ts` | 使用 `requestAnimationFrame` + `jsb.setPreferredFramesPerSecond()` |
| Web | `pacer-web.ts` | 自行实现帧率控制逻辑，基于 `requestAnimationFrame` + 时间差计算；Editor 模式下使用 `setTimeout` |
| Minigame | `pacer-minigame.ts` | 使用 `requestAnimationFrame` |

---

## 11. wasm 模块 — WebAssembly 加载

### 11.1 公共接口

```typescript
export function loadWasm(wasmUrl: string): Promise<WebAssembly.Instance>;
```

### 11.2 平台差异

| 平台 | 实现 | 说明 |
|------|------|------|
| Native | `wasm-native.ts` | 使用 `native.fileUtils.getDataFromFile()` 从文件系统读取 wasm 二进制；Editor 中通过 `Editor.Message.request('engine', 'query-engine-info')` 获取原生路径 |
| Web | `wasm-web.ts` | 使用 `fetch()` 或 `require('fs')` (Editor) 加载 wasm；Preview 模式通过 `/engine_external/` 代理 |
| Minigame | `wasm-minigame.ts` | 使用 `WebAssembly.instantiate()` 加载；WASM 文件通过 `wx.getFileSystemManager().readFile()` 读取 |

---

## 12. minigame 模块 — 小游戏适配

详见 [minigame-platform.md](../minigame-platform.md)。

核心要点：
- 每个小游戏平台有独立的适配文件
- 核心模式是 `cloneObject(minigame, sdkGlobal)` + polyfill
- 非小游戏构建使用 `non-minigame.ts` 空实现

---

## 13. 共享类型与枚举

### 13.1 enum-type 目录

多个 PAL 模块有 `enum-type/` 子目录，存放跨平台共享的类型定义：

| 模块 | 枚举类型 |
|------|---------|
| `system-info/enum-type/` | Platform, OS, BrowserType, NetworkType, Language, Feature |
| `screen-adapter/enum-type/` | Orientation |
| `audio/type.ts` | AudioType, AudioState |

### 13.2 共享工具

**文件：** `pal/utils.ts`

```typescript
export function cloneObject<T>(target: T, source: any): T;
```

将源对象的所有方法/属性克隆到目标对象。

---

## 14. 隐含知识与常见陷阱

1. **`checkPalIntegrity` 是编译期校验** — 运行时为空函数，仅依赖 TypeScript 类型系统
2. **接口兼容性必须保持** — 移除某平台的功能时，保留属性为 stub（返回默认值），而非删除
3. **PAL 别名在构建时解析** — `pal/xxx` 路径在构建时通过 Rollup alias 解析，不是运行时动态选择
4. **Native 平台坐标 Y 轴翻转** — `y = windowSize.height - clientY * dpr`，与 Web 平台不同
5. **Native 平台不支持全屏** — `screenAdapter.supportsFullScreen = false`
6. **Web 平台音频有两种实现** — DOM Audio 和 Web Audio，根据浏览器支持自动选择
7. **`non-minigame.ts` 必须导出完整接口** — 否则非小游戏构建会类型错误
8. **`env` 模块有 runtime 子平台** — 华为/OPPO/VIVO 使用 `ral` 运行时，有独立的 env 实现
9. **Native 平台触摸有缓存机制** — `TouchEventCache` 在帧内批量派发，避免一帧内多次触发
10. **共享枚举放在 `enum-type/` 目录** — 不是 `types/` 或 `common/`，遵循引擎约定

---

## 15. 关键文件索引

| 文件 | 职责 |
|------|------|
| `pal/integrity-check.ts` | 接口一致性校验 |
| `pal/utils.ts` | 共享工具函数 |
| `pal/env/native/env.ts` | Native 环境模块 |
| `pal/env/web/env.ts` | Web 环境模块 |
| `pal/env/minigame/env.ts` | 小游戏环境模块 |
| `pal/system-info/native/system-info.ts` | Native 系统信息 |
| `pal/system-info/web/system-info.ts` | Web 系统信息 |
| `pal/system-info/minigame/system-info.ts` | 小游戏系统信息 |
| `pal/system-info/enum-type/` | 共享枚举定义 |
| `pal/input/native/` | Native 输入实现 |
| `pal/input/web/` | Web 输入实现 |
| `pal/input/minigame/` | 小游戏输入实现 |
| `pal/input/input-source.ts` | 共享输入源 |
| `pal/input/keycodes.ts` | 共享键码 |
| `pal/input/touch-manager.ts` | 共享触摸管理 |
| `pal/audio/native/player.ts` | Native 音频 |
| `pal/audio/web/player.ts` | Web 音频 |
| `pal/audio/minigame/player.ts` | 小游戏音频 |
| `pal/screen-adapter/native/` | Native 屏幕适配 |
| `pal/screen-adapter/web/` | Web 屏幕适配 |
| `pal/screen-adapter/minigame/` | 小游戏屏幕适配 |
| `pal/pacer/pacer-native.ts` | Native 帧率控制 |
| `pal/pacer/pacer-web.ts` | Web 帧率控制 |
| `pal/pacer/pacer-minigame.ts` | 小游戏帧率控制 |
| `pal/wasm/wasm-native.ts` | Native WASM 加载 |
| `pal/wasm/wasm-web.ts` | Web WASM 加载 |
| `pal/wasm/wasm-minigame.ts` | 小游戏 WASM 加载 |
| `vite/platforms/native/platform.config.ts` | Native 平台 PAL 别名配置 |
| `vite/platforms/web/platform.config.ts` | Web 平台 PAL 别名配置 |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
