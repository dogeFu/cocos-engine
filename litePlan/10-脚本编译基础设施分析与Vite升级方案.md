# Cocos Engine 脚本编译基础设施分析与 Vite 升级方案

> 分析时间：2026-04-12
> 分析范围：Cocos Creator Engine v3.8.8 完整构建管线、运行时模块加载系统、跨平台产物
> 分析方法：源码级深度阅读 + 构建产物逆向分析

---

## 一、结论

### 1.1 核心判断

当前 Cocos 引擎的脚本编译基础设施存在 **5 个系统性问题**，其中 SystemJS 运行时模块加载器是最大的时代包袱。升级到 Vite 是可行且值得做的，但需要分阶段推进，小游戏平台是最大挑战。

### 1.2 关键数字

| 指标 | 当前值 | 说明 |
|------|--------|------|
| 构建工具链 | `@cocos/ccbuild` (外部闭源包) | 引擎仓库内无法直接修改 |
| Rollup 插件数 | 15 个 | 调试困难，耦合严重 |
| 自定义 TS Transformer | 4 个 | 枚举内联、导出控制、私有属性混淆等 |
| Babel 预设 | 2 个 (功能重叠) | `@cocos/babel-preset-cc` + `@cocos/creator-programming-babel-preset-cc` |
| 运行时模块系统 | SystemJS | 2015 年技术，现代浏览器已原生支持 ESM |
| 条件编译常量 | 30+ | 通过 `internal:constants` 虚拟模块注入 |
| 模块覆盖规则 | 10+ 条 | 通过 `cc.config.json` 的 `moduleOverrides` |
| `.jsb.ts` 替换文件 | ~30 个 | Native 平台专用实现 |
| PAL 虚拟模块 | 8 个 | audio/env/system-info/screen-adapter/input/pacer/wasm/minigame |
| 引擎压缩产物 | 3MB+ (单文件) | `_virtual_cc-*.js` |
| SystemJS 运行时 | ~15KB | `system.bundle.js` |
| 适配器构建 | Browserify + Babelify + Gulp | 与引擎构建完全不同的技术栈 |

### 1.3 推荐路线

**渐进式迁移：先 Web 平台验证 Vite，再扩展到小游戏和 Native。采用热插拔平台配置模式——每个平台独立管理自己的配置，引擎构建流程统一，区别只是平台不同。可以接受不兼容原 SystemJS 产物格式，但必须保证各平台运行正常。**

---

## 二、当前架构全景

### 2.1 编译管线

```
TypeScript 源码 (cocos/, pal/, exports/)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│              @cocos/ccbuild (外部包, Rollup 管线)             │
│                                                               │
│  1. StatsQuery 解析 cc.config.json                            │
│     ├─ 计算构建时常量 (buildTimeConstants)                      │
│     ├─ 评估模块覆盖 (moduleOverrides)                           │
│     └─ 生成虚拟模块源码 (internal:constants, cc 入口)           │
│                                                               │
│  2. Rollup 插件链 (15个, 按顺序)                               │
│     ├─ 1.  remove-deprecated-features                         │
│     ├─ 2.  external-wasm-loader                               │
│     ├─ 3.  module-overrides (路径重定向)                        │
│     ├─ 4.  @rollup/plugin-virtual (虚拟模块)                   │
│     ├─ 5.  module-query-plugin                                │
│     ├─ 6.  ts-paths (cc.decorator 解析)                        │
│     ├─ 7.  @cocos/rollup-plugin-node-resolve                  │
│     ├─ 8.  @rollup/plugin-json                                │
│     ├─ 9.  @rollup/plugin-commonjs                            │
│     ├─ 10. [可选] enum-scanner                                │
│     ├─ 11. @cocos/rollup-plugin-typescript (TS编译)            │
│     │      └─ 自定义 Transformer:                              │
│     │         ├─ warningPrinterTransformer                     │
│     │         ├─ inlineEnumTransformer (枚举内联)               │
│     │         ├─ exportControllerTransformer (条件编译)         │
│     │         └─ minifyPrivatePropertiesTransformer (属性混淆)  │
│     ├─ 12. @rollup/plugin-babel (Babel转换)                    │
│     │      └─ @cocos/creator-programming-babel-preset-cc       │
│     │         ├─ 装饰器转换 (legacy)                            │
│     │         ├─ 字段装饰器优化 (构建时移除)                     │
│     │         └─ 编辑器装饰器移除                                │
│     ├─ 13. [可选] systemjs-named-register                     │
│     ├─ 14. [可选] @cocos/rollup-plugin-terser                 │
│     └─ 15. [可选] rollup-plugin-visualizer                    │
│                                                               │
│  3. 输出: System.register() 格式                               │
│     moduleFormat: 'system'                                    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
  bin/dev/cc/ (未压缩) 或 bin/dev/cc-min/ (压缩)
```

### 2.2 运行时加载架构 (Web 平台)

```
index.html
  ├─ <script src="src/polyfills.bundle.js">     ← globalThis 等 polyfill
  ├─ <script src="src/system.bundle.js">        ← SystemJS 运行时 (~15KB)
  ├─ <script src="src/import-map.json">         ← 模块映射 {"cc": "./../cocos-js/cc.js"}
  └─ System.import('./index.js')
       │
       ▼
  index.js (System.register)
    └─ System.import('cc')  ←── import-map 映射
         │
         ▼
  cocos-js/cc.js (System.register)
    └─ 依赖 _virtual_cc-*.js (3MB+ 引擎核心，所有模块合并为单文件)
         │
         ▼
  cocos-js/spine-*.js, bullet.*.js 等 (可选模块)

  应用代码: src/chunks/bundle.js (System.register)
    └─ 包含 Babel helpers + 游戏脚本
```

### 2.3 跨平台加载差异

| 平台 | 模块系统 | 脚本加载方式 | importMap 获取 | 远程脚本 |
|------|---------|-------------|---------------|---------|
| **Web** | SystemJS + ES Module | `<script>` 标签注入 | 内联到 HTML | 支持 |
| **Native** | SystemJS + jsb `require()` | `require()` / `eval()` | `jsb.fileUtils` 读取 | 支持(预览) |
| **鸿蒙** | ES Module 映射表 + SystemJS | `oh.loadModule()` | 构建时内联 | 不支持 |
| **小游戏** | SystemJS + 平台 `require` | `__wxRequire` / `require` | `require()` 加载 | 禁止 |
| **运行时** | SystemJS + `require()` | `require()` | `require()` 加载 | 禁止 |

### 2.4 条件编译系统

```
┌─────────────────────────────────────────────────────────────┐
│                  cc.config.json (配置中心)                     │
│                                                               │
│  constants (30+ 个)                                           │
│  ├─ 平台常量: HTML5, NATIVE, JSB, ANDROID, IOS, ...          │
│  ├─ 小游戏常量: WECHAT, XIAOMI, ALIPAY, BYTEDANCE, ...       │
│  ├─ 开发模式: EDITOR, PREVIEW, BUILD, DEBUG, DEV, TEST       │
│  └─ 内部常量: USE_3D, WEBGPU, SUPPORT_JIT, ...               │
│                                                               │
│  features (30+ 个)                                            │
│  ├─ base, 3d, 2d, animation, ui, audio, ...                  │
│  ├─ physics-framework, physics-builtin, ...                   │
│  ├─ spine-3.8, spine-4.2, dragon-bones                       │
│  └─ 每个feature定义: modules, overrideConstants, deps         │
│                                                               │
│  moduleOverrides (10+ 条规则)                                  │
│  ├─ test: "true" → internal:native 映射                       │
│  ├─ test: "NATIVE" → ~30个 .jsb.ts 文件替换                   │
│  ├─ test: "HTML5" → PAL 模块映射到 web/ 实现                  │
│  ├─ test: "NATIVE" → PAL 模块映射到 native/ 实现              │
│  ├─ test: "MINIGAME" → PAL 模块映射到 minigame/ 实现          │
│  ├─ test: "RUNTIME_BASED" → PAL 模块映射到 runtime/ 实现      │
│  ├─ test: "!MARIONETTE" → 替换为空模块                         │
│  └─ test: "SPINE_3_8/4_2" → 替换 Spine 版本实现               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
  @cocos/ccbuild StatsQuery 在构建时求值
        │
        ▼
  internal:constants 虚拟模块 (注入常量值)
  + moduleOverrides (替换模块路径)
  + Dead Code Elimination (移除不可达代码)
```

### 2.5 PAL 平台抽象层

```
pal/ (Platform Abstraction Layer)
├── audio/           → @types/pal/audio.d.ts
│   ├── web/player.ts
│   ├── native/player.ts
│   └── minigame/player.ts
├── env/             → @types/pal/env.d.ts
│   ├── web/env.ts        ← DOM <script> 加载
│   ├── native/env.ts     ← jsb require / eval / oh.loadModule
│   ├── minigame/env.ts   ← 平台特定 require 变体
│   └── runtime/env.ts    ← require()
├── system-info/     → @types/pal/system-info.d.ts
├── screen-adapter/  → @types/pal/screen-adapter.d.ts
├── input/           → @types/pal/input.d.ts
├── pacer/           → @types/pal/pacer.d.ts
├── wasm/            → @types/pal/wasm.d.ts
└── minigame/        → @types/pal/minigame.d.ts
    ├── wechat.ts, alipay.ts, bytedance.ts, ...
    └── non-minigame.ts (Web/Native 使用)

统一接口: loadJsFile(path: string): Promise<void>
           findCanvas(): { frame, container, canvas }

类型校验: pal/integrity-check.ts checkPalIntegrity<T>()
```

### 2.6 构建产物结构 (Web Desktop)

```
build/web-desktop/
├── index.html                    ← 入口 HTML
├── index.js                      ← System.register, 启动 Application
├── application.js                ← System.register, Application 类
├── style.css
├── cocos-js/                     ← 引擎编译产物
│   ├── cc.js                     ← System.register, 引擎主入口 (重导出)
│   ├── _virtual_cc-CArsJ5Rl.js   ← System.register, 引擎核心 (3MB+)
│   ├── spine-*.js                ← Spine 运行时
│   ├── bullet.*.js               ← 物理引擎 (asm.js / wasm)
│   └── assets/                   ← wasm/bin 等二进制资源
├── src/
│   ├── system.bundle.js          ← SystemJS 运行时
│   ├── polyfills.bundle.js       ← polyfill (globalThis 等)
│   ├── import-map.json           ← {"imports":{"cc":"./../cocos-js/cc.js"}}
│   ├── settings.json             ← 构建设置
│   ├── effect.bin                ← 着色器
│   └── chunks/
│       └── bundle.js             ← System.register, 游戏脚本
└── assets/                       ← 游戏资源 (bundle 结构)
    ├── internal/
    │   ├── config.json
    │   ├── index.js
    │   └── import/
    ├── main/
    │   ├── config.json
    │   ├── index.js
    │   └── import/
    └── resources/
```

---

## 三、核心问题诊断

### 问题 1：SystemJS 是最大的时代包袱

**严重程度：高**

SystemJS 是一个运行时模块加载器，需要在浏览器中解析和执行模块依赖关系。这是 2015 年的技术方案，当时浏览器不支持 ES Module，需要 polyfill。

**具体问题**：

1. **运行时开销**：`system.bundle.js` 约 15KB，每次 `System.import()` 都需要运行时解析
2. **启动延迟**：`System.import('cc')` 是异步操作，增加了首帧时间
3. **不必要的抽象**：现代浏览器已原生支持 `<script type="module">` + `import`，无需运行时加载器
4. **import-map.json 额外请求**：Web 平台需要额外的网络请求加载 import map
5. **调试体验差**：System.register 格式的代码可读性远不如原生 ESM

**对比**：Vite 生产模式直接输出原生 ES Module，零运行时开销，浏览器原生解析。

### 问题 2：构建管线过度封装

**严重程度：高**

核心构建逻辑封装在 `@cocos/ccbuild` 外部包中（独立 GitHub 仓库 `cocos/cocos-ccbuild`），引擎仓库内无法直接修改。

**具体问题**：

1. **15 个 Rollup 插件链**：调试困难，任何一个插件的 bug 都难以定位
2. **两个功能重叠的 Babel 预设**：
   - `@cocos/babel-preset-cc` (v2.2.0) — Jest 测试用
   - `@cocos/creator-programming-babel-preset-cc` (v1.0.1-alpha.5) — 构建用
   - 两者功能高度重叠，只是构建版多了装饰器优化和辅助函数外部化
3. **适配器构建割裂**：使用完全不同的技术栈（Browserify + Babelify + Gulp），与引擎构建无关
4. **ccbuild 职责过重**：常量注入、模块覆盖、装饰器优化、枚举内联、私有属性混淆……全部耦合在一起
5. **无法利用现代工具链**：因为 ccbuild 封装了 Rollup，无法使用 Vite 的 HMR、按需编译等能力

### 问题 3：条件编译系统笨重

**严重程度：中**

`cc.config.json` 定义了 30+ 个常量 + 10+ 条模块覆盖规则，通过 `internal:constants` 虚拟模块在构建时注入。

**具体问题**：

1. **每个平台构建需要完整的 ccbuild 管线**：无法利用 Vite 的 `define` + `import.meta.env` 等现代方案
2. **`.jsb.ts` 替换粒度太粗**：约 30 个文件级替换，无法做更细粒度的条件编译
3. **PAL 虚拟模块映射是自建系统**：本质上是一个自建的模块解析系统，与 `resolve.alias` 功能重复
4. **常量表达式求值复杂**：支持 `$EDITOR || $PREVIEW || $TEST` 这样的表达式，增加了构建系统的复杂度

### 问题 4：构建产物体积和性能

**严重程度：中**

**具体问题**：

1. **单文件 3MB+**：`_virtual_cc-*.js` 包含整个引擎的所有模块，即使只用了部分功能
2. **Tree-shaking 不够自动化**：依赖 `cc.config.json` 的 `noSideEffectFiles` 手动标记（仅 11 个文件）
3. **没有利用 code splitting**：引擎和应用代码完全分离，无法做跨边界优化
4. **SystemJS 格式开销**：每个模块的 `System.register` 包装增加了产物体积
5. **polyfill.bundle.js**：包含 globalThis 等 polyfill，现代浏览器不需要

### 问题 5：开发体验差

**严重程度：高**

**具体问题**：

1. **没有 HMR**：修改任何代码都需要重新构建
2. **没有按需编译**：`npm run build:dev` 需要完整构建整个引擎
3. **构建速度慢**：15 个插件 + Babel + TypeScript 全量编译
4. **调试困难**：System.register 格式的产物可读性差
5. **aicocos 已尝试绕过**：aicocos 子项目使用 Rollup 编程式 API 做项目打包，但仍是独立体系

---

## 四、Vite 升级方案

### 4.1 设计原则

1. **Web 平台优先**：Vite 原生支持 ES Module，Web 平台收益最大
2. **渐进式迁移**：不一次性替换，先在 Web 平台验证，再扩展到其他平台
3. **保持 PAL 架构**：平台抽象层的设计是合理的，只需改变模块解析方式
4. **接受不兼容**：可以放弃 SystemJS 产物格式，但必须保证各平台运行正常
5. **插件化迁移**：将 ccbuild 的功能拆解为独立的 Vite 插件，降低耦合

### 4.2 核心设计：分层配置系统

#### 设计原则

**用户配置与平台配置分离，平台配置可以"劫持"用户配置中与平台不兼容的部分。**

当前 `cc.config.json` 的 `moduleOverrides` 有 4 个根本性问题：

1. **不可类型检查** — `test` 是字符串表达式，需要自定义求值器，写错了构建时才报错
2. **不可发现** — 想知道"微信小游戏到底用了哪些 PAL 实现？"，你得读懂 10+ 条 `test` 表达式
3. **关注点混合** — 平台差异（PAL 映射）、功能开关（MARIONETTE）、版本选择（SPINE_3_8）全部混在一起
4. **平台之间隐式互斥** — HTML5/NATIVE/MINIGAME 四条规则互斥，但互斥关系靠求值顺序保证

分层配置系统将配置分为三层：

```
┌─────────────────────────────────────────────────────────────┐
│  第一层：用户配置 (user.config.ts)                            │
│  — 与平台无关的开关和选项                                      │
│  — 用户完全控制，所有平台行为一致                               │
│  — 例如：DEBUG、sourceMap、功能开关（spine、physics）          │
└─────────────────────────────────────────────────────────────┘
                              ↓ 合并 + 验证
┌─────────────────────────────────────────────────────────────┐
│  第二层：平台配置 (platforms/<name>/platform.config.ts)       │
│  — 平台必须的配置（不可被用户覆盖）                             │
│  — 平台默认值（可被用户覆盖）                                   │
│  — 平台约束（验证用户配置是否合法）                             │
│  — 例如：PAL 映射、输出格式、平台常量                           │
└─────────────────────────────────────────────────────────────┘
                              ↓ 生成
┌─────────────────────────────────────────────────────────────┐
│  第三层：最终构建配置 (BuildConfig)                            │
│  — 合并后的完整配置，直接传给 Vite                              │
└─────────────────────────────────────────────────────────────┘
```

#### 合并规则

```
平台必须配置 > 用户配置 > 平台默认配置

平台可以：
1. 覆盖用户配置中与平台不兼容的部分（劫持）
2. 拒绝不兼容的用户配置（报错）
3. 为用户未指定的选项提供默认值
```

#### 目录结构

```
cocos-engine/
├── user.config.ts                 ← 用户配置入口（功能开关、构建选项）
│
├── platforms/
│   ├── base.ts                    ← 配置类型定义 + 合并逻辑
│   ├── web/
│   │   ├── platform.config.ts     ← Web 平台配置
│   │   └── tsconfig.json          ← Web 平台 TS 配置
│   ├── native/
│   │   ├── platform.config.ts
│   │   └── tsconfig.json
│   ├── wechat/
│   │   ├── platform.config.ts
│   │   └── tsconfig.json
│   └── ...
│
├── vite.config.ts                 ← 统一构建入口
└── cc.config.json                 ← 保留 features 定义，移除 moduleOverrides
```

#### 类型定义

```typescript
// platforms/base.ts
import type { AliasOptions } from 'vite';

/**
 * 用户配置 — 与平台无关的开关和选项
 * 用户完全控制，所有平台行为一致
 */
export interface UserConfig {
  // 功能开关（用户可控）
  features: {
    spine: boolean;           // 是否启用 Spine
    spineVersion: '3.8' | '4.2';
    dragonBones: boolean;
    marionette: boolean;      // 是否启用 Marionette 动画系统
    physics: boolean;         // 是否启用物理
    physics2D: boolean;
    // ... 其他功能开关
  };
  
  // 构建选项（用户可控）
  build: {
    debug: boolean;           // DEBUG 模式
    sourceMap: boolean;       // 是否生成 sourceMap
    minify: boolean;          // 是否压缩
  };
  
  // 目标平台
  platform: string;
}

/**
 * 平台配置 — 平台特有的配置
 */
export interface PlatformConfig {
  name: string;
  
  // 平台必须的配置（不可被用户覆盖）
  required: {
    constants: Record<string, boolean | number>;  // 平台常量（如 HTML5, NATIVE, WECHAT）
    alias: AliasOptions;                          // PAL 模块映射
    output: {                                     // 输出格式
      format: 'es' | 'cjs' | 'iife';
      preserveModules?: boolean;
    };
  };
  
  // 平台默认值（可被用户覆盖）
  defaults: {
    features?: Partial<UserConfig['features']>;   // 功能默认值
    build?: Partial<UserConfig['build']>;         // 构建默认值
  };
  
  // 平台约束（验证用户配置是否合法）
  constraints?: {
    // 不支持的功能（用户开启会报错）
    unsupportedFeatures?: string[];
    // 必须关闭的功能（用户开启会被强制关闭，发出警告）
    forcedOffFeatures?: string[];
    // 必须的输出格式（用户指定其他格式会被覆盖）
    requiredOutputFormat?: 'es' | 'cjs' | 'iife';
  };
  
  // JSB 替换（仅 Native 平台）
  jsbReplacements?: Record<string, string>;
  
  // 平台特有的后处理
  postBuild?: (outputDir: string, finalConfig: BuildConfig) => Promise<void>;
}

/**
 * 最终构建配置 — 合并后的完整配置
 */
export interface BuildConfig {
  constants: Record<string, boolean | number>;
  features: UserConfig['features'];
  alias: AliasOptions;
  output: PlatformConfig['required']['output'];
  build: UserConfig['build'];
  jsbReplacements?: Record<string, string>;
}

/**
 * 合并用户配置和平台配置
 */
export function mergeConfig(
  userConfig: UserConfig, 
  platformConfig: PlatformConfig
): BuildConfig {
  const { required, defaults, constraints } = platformConfig;
  
  // 1. 验证用户配置是否符合平台约束
  if (constraints?.unsupportedFeatures) {
    for (const feature of constraints.unsupportedFeatures) {
      if (userConfig.features[feature]) {
        throw new Error(
          `[${platformConfig.name}] 不支持功能 "${feature}"，请在 user.config.ts 中关闭它`
        );
      }
    }
  }
  
  // 2. 合并功能开关：用户配置 > 平台默认
  const features = {
    ...defaults.features,
    ...userConfig.features,
  };
  
  // 3. 处理强制关闭的功能（平台劫持）
  if (constraints?.forcedOffFeatures) {
    for (const feature of constraints.forcedOffFeatures) {
      if (features[feature]) {
        console.warn(
          `[${platformConfig.name}] 强制关闭功能 "${feature}"，该平台不支持`
        );
        features[feature] = false;
      }
    }
  }
  
  // 4. 合并构建选项：用户配置 > 平台默认
  const build = {
    ...defaults.build,
    ...userConfig.build,
  };
  
  // 5. 输出格式：平台必须 > 用户配置
  const output = constraints?.requiredOutputFormat
    ? { ...required.output, format: constraints.requiredOutputFormat }
    : required.output;
  
  // 6. 生成最终常量：平台常量 + 功能开关转换的常量
  const constants = {
    ...required.constants,
    ...featuresToConstants(features),
    DEBUG: build.debug,
    BUILD: !build.debug,
  };
  
  return {
    constants,
    features,
    alias: required.alias,
    output,
    build,
    jsbReplacements: platformConfig.jsbReplacements,
  };
}

/**
 * 功能开关转换为常量
 */
function featuresToConstants(features: UserConfig['features']): Record<string, boolean> {
  return {
    SPINE_3_8: features.spine && features.spineVersion === '3.8',
    SPINE_4_2: features.spine && features.spineVersion === '4.2',
    MARIONETTE: features.marionette,
    // ... 其他功能到常量的映射
  };
}

export function defineUserConfig(config: UserConfig): UserConfig {
  return config;
}

export function definePlatformConfig(config: PlatformConfig): PlatformConfig {
  return config;
}
```

#### 用户配置示例

```typescript
// user.config.ts
import { defineUserConfig } from './platforms/base';

export default defineUserConfig({
  platform: 'wechat',  // 目标平台
  
  features: {
    spine: true,
    spineVersion: '3.8',
    dragonBones: false,
    marionette: false,   // Marionette 动画系统，小游戏平台可能不支持
    physics: false,
    physics2D: true,
  },
  
  build: {
    debug: false,
    sourceMap: true,
    minify: true,
  },
});
```

#### 平台配置示例

```typescript
// platforms/wechat/platform.config.ts
import { definePlatformConfig } from '../base';

export default definePlatformConfig({
  name: 'wechat',
  
  // 平台必须的配置（不可被用户覆盖）
  required: {
    constants: {
      HTML5: true,
      NATIVE: false,
      WECHAT: true,
      MINIGAME: true,
      JSB: false,
      SUPPORT_JIT: false,  // 小游戏不支持 JIT
    },
    alias: {
      'pal/audio': 'pal/audio/minigame/player.ts',
      'pal/env': 'pal/env/minigame/env.ts',
      'pal/system-info': 'pal/system-info/minigame/system-info.ts',
      'pal/screen-adapter': 'pal/screen-adapter/minigame/screen-adapter.ts',
      'pal/input': 'pal/input/minigame/index.ts',
      'pal/pacer': 'pal/pacer/pacer-minigame.ts',
      'pal/wasm': 'pal/wasm/wasm-minigame.ts',
      'pal/minigame': 'pal/minigame/wechat.ts',
      'cc.decorator': 'cocos/core/data/decorators/index.ts',
    },
    output: {
      format: 'cjs',
      preserveModules: true,
    },
  },
  
  // 平台默认值（可被用户覆盖）
  defaults: {
    features: {
      marionette: false,   // 默认关闭，小游戏性能有限
    },
    build: {
      minify: true,        // 默认压缩
      sourceMap: false,    // 默认不生成 sourceMap
    },
  },
  
  // 平台约束
  constraints: {
    // 强制关闭的功能（用户开启会被强制关闭，发出警告）
    forcedOffFeatures: ['marionette'],  // 小游戏不支持 Marionette
    // 必须的输出格式
    requiredOutputFormat: 'cjs',
  },
  
  postBuild: async (outputDir, finalConfig) => {
    // 微信特有后处理：修复 require 路径、生成 game.js 入口
  },
});
```

```typescript
// platforms/native/platform.config.ts
import { definePlatformConfig } from '../base';

export default definePlatformConfig({
  name: 'native',
  
  required: {
    constants: {
      HTML5: false,
      NATIVE: true,
      JSB: true,
      SUPPORT_JIT: true,
    },
    alias: {
      'pal/audio': 'pal/audio/native/player.ts',
      'pal/env': 'pal/env/native/env.ts',
      'pal/system-info': 'pal/system-info/native/system-info.ts',
      'pal/screen-adapter': 'pal/screen-adapter/native/screen-adapter.ts',
      'pal/input': 'pal/input/native/index.ts',
      'pal/pacer': 'pal/pacer/pacer-native.ts',
      'pal/wasm': 'pal/wasm/wasm-native.ts',
      'pal/minigame': 'pal/minigame/non-minigame.ts',
      'cc.decorator': 'cocos/core/data/decorators/index.ts',
    },
    output: {
      format: 'cjs',
      preserveModules: true,
    },
  },
  
  defaults: {
    features: {
      marionette: true,   // Native 平台默认开启
    },
    build: {
      minify: true,
      sourceMap: true,
    },
  },
  
  // 无约束，Native 平台支持所有功能
  
  // JSB 替换（仅 Native 平台）
  jsbReplacements: {
    'cocos/gfx/index.ts': 'cocos/gfx/index.jsb.ts',
    'cocos/scene-graph/node.ts': 'cocos/scene-graph/node.jsb.ts',
    'cocos/rendering/index.ts': 'cocos/rendering/index.jsb.ts',
    // ... 约 30 个
  },
});
```

```typescript
// platforms/web/platform.config.ts
import { definePlatformConfig } from '../base';

export default definePlatformConfig({
  name: 'web',
  
  required: {
    constants: {
      HTML5: true,
      NATIVE: false,
      JSB: false,
      SUPPORT_JIT: true,
    },
    alias: {
      'pal/audio': 'pal/audio/web/player.ts',
      'pal/env': 'pal/env/web/env.ts',
      'pal/system-info': 'pal/system-info/web/system-info.ts',
      'pal/screen-adapter': 'pal/screen-adapter/web/screen-adapter.ts',
      'pal/input': 'pal/input/web/index.ts',
      'pal/pacer': 'pal/pacer/pacer-web.ts',
      'pal/wasm': 'pal/wasm/wasm-web.ts',
      'pal/minigame': 'pal/minigame/non-minigame.ts',
      'cc.decorator': 'cocos/core/data/decorators/index.ts',
    },
    output: {
      format: 'es',  // Web 平台使用原生 ESM
    },
  },
  
  defaults: {
    features: {
      marionette: true,
    },
    build: {
      sourceMap: true,
    },
  },
  
  // 无约束，Web 平台支持所有功能
});
```

#### 统一构建入口

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { mergeConfig, type UserConfig, type BuildConfig } from './platforms/base';
import { cocosConstants } from './plugins/vite-plugin-cocos-constants';
import { cocosJsbReplace } from './plugins/vite-plugin-cocos-jsb-replace';

// 1. 加载用户配置
const userConfig: UserConfig = require('./user.config').default;

// 2. 加载平台配置
const platformConfig = require(`./platforms/${userConfig.platform}/platform.config`).default;

// 3. 合并配置
const finalConfig: BuildConfig = mergeConfig(userConfig, platformConfig);

// 4. 生成 Vite 配置
export default defineConfig({
  resolve: {
    alias: finalConfig.alias,
  },
  plugins: [
    cocosConstants(finalConfig.constants),
    cocosJsbReplace({ replacements: finalConfig.jsbReplacements }),
  ],
  build: {
    sourcemap: finalConfig.build.sourceMap,
    minify: finalConfig.build.minify,
    rollupOptions: {
      input: 'exports/base.ts',
      output: {
        format: finalConfig.output.format,
        dir: `bin/${userConfig.platform}`,
        preserveModules: finalConfig.output.preserveModules,
      }
    }
  }
});
```

#### 构建命令

```bash
# 方式 1：修改 user.config.ts 中的 platform 字段，然后构建
vite build

# 方式 2：命令行指定平台（覆盖 user.config.ts）
vite build --platform wechat

# 方式 3：同时指定多个选项
vite build --platform wechat --features.spine=true --build.minify=false
```

#### 配置优先级总结

| 配置项 | 来源 | 优先级 | 说明 |
|--------|------|--------|------|
| 平台常量 (HTML5, NATIVE, WECHAT) | 平台 `required.constants` | 最高 | 用户无法修改 |
| PAL 映射 | 平台 `required.alias` | 最高 | 用户无法修改 |
| 输出格式 | 平台 `constraints.requiredOutputFormat` > 用户 > 平台默认 | 平台可劫持 | 小游戏强制 CJS |
| 功能开关 | 用户 > 平台默认 | 用户优先 | 但平台可强制关闭 |
| sourceMap/minify | 用户 > 平台默认 | 用户优先 | 用户完全控制 |
| DEBUG/BUILD | 用户 `build.debug` | 用户控制 | 自动转换 |

#### 对比：当前模式 vs 分层配置模式

| 维度 | 当前 `cc.config.json` 模式 | 分层配置模式 |
|------|--------------------------|-------------|
| **用户配置** | 无独立概念，散落在各处 | `user.config.ts`，与平台无关 |
| **平台配置** | 与功能开关混合 | `platforms/<name>/platform.config.ts`，独立目录 |
| **配置优先级** | 隐式，靠求值顺序 | 显式，`平台必须 > 用户 > 平台默认` |
| **平台约束** | 无，构建时可能出错 | 显式声明，合并时验证 |
| **平台劫持** | 无 | 支持，可强制关闭不兼容功能 |
| **类型安全** | JSON 字符串 | TypeScript，完整类型检查 |
| **新增平台** | 修改 cc.config.json | 创建新目录，无需修改引擎代码 |

### 4.3 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                   Vite 升级方案架构                            │
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │  Web 平台      │  │  小游戏平台    │  │  Native 平台   │   │
│  │  (Vite 原生)   │  │  (Vite + CJS) │  │  (Vite + JSB) │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                  │                   │            │
│          ▼                  ▼                   ▼            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Vite 核心构建层                            │    │
│  │                                                       │    │
│  │  vite.config.ts                                       │    │
│  │  ├─ define: { internal:constants 注入 }               │    │
│  │  ├─ resolve.alias: { PAL 模块映射 }                   │    │
│  │  ├─ plugins: [                                        │    │
│  │  │   vite-plugin-cocos-constants,                     │    │
│  │  │   vite-plugin-cocos-module-override,               │    │
│  │  │   vite-plugin-cocos-jsb-replace,                   │    │
│  │  │   vite-plugin-cocos-decorator-optimizer,           │    │
│  │  │   vite-plugin-cocos-enum-inline,                   │    │
│  │  │   ...                                              │    │
│  │  ]                                                    │    │
│  │  └─ build.rollupOptions: { ... }                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 各平台具体策略

> 各平台的完整配置已在 4.2 节展示。这里补充各平台的关键差异和注意事项。

#### A. Web 平台 — Vite 原生 ESM

**开发模式**：

- 直接使用 Vite dev server，零构建启动
- `internal:constants` 通过 Vite 插件注入
- PAL 模块通过 `resolve.alias` 映射
- 装饰器通过 Vite 内置的 esbuild 处理（或 Babel 插件）
- HMR 开箱即用

**生产构建**：

- 输出原生 ES Module，无需 SystemJS
- Rollup（Vite 底层）的 tree-shaking 自动生效
- 代码分割自动优化
- 移除 `system.bundle.js`、`import-map.json`、`polyfills.bundle.js`

**产物对比**：

```
当前 (SystemJS):                          迁移后 (ESM):
index.html                                index.html
├─ polyfills.bundle.js (15KB)             ├─ <script type="module" src="index.js">
├─ system.bundle.js (15KB)                │
├─ import-map.json (额外请求)             │  无需 polyfills
├─ <script> System.import('./index.js')   │  无需 SystemJS
│                                          │  无需 import-map
├─ cocos-js/                              ├─ cocos-js/
│  ├─ cc.js (System.register)             │  ├─ cc.js (ESM, tree-shaken)
│  └─ _virtual_cc-*.js (3MB+)            │  └─ 按需分割的 chunks
├─ src/chunks/bundle.js (System.register) ├─ src/
└─ ...                                    └─ ...
```

**关键配置**（完整配置见 `platforms/web/platform.config.ts`）：

- `output.format: 'es'` — 原生 ESM 输出
- `constants.HTML5: true, constants.NATIVE: false`
- PAL alias 全部指向 `pal/*/web/` 实现
- 无 `jsbReplacements`

**产物对比**：

**核心挑战**：小游戏平台不支持 ES Module，只支持 CommonJS `require()`。

**解决方案**：

- Vite 构建输出 `cjs` 格式（Rollup 支持 `output.format: 'cjs'`）
- 每个小游戏平台的 `require` 行为差异（`__wxRequire`、路径前缀等），通过**构建后处理脚本**统一处理
- 移除 SystemJS 依赖，直接用 `require()` 加载

**各平台 require 差异**：

| 平台 | require 方式 | 路径前缀 | 特殊处理 |
|------|-------------|---------|---------|
| 微信 | `__wxRequire(path)` | 无 | 启动时保存原始 require |
| 小米 | `require('../../path')` | `../../` | 相对路径前缀 |
| 百度 | `require('../path')` | `../` | 保存 `__baiduRequire` |
| 淘宝小游戏 | `globalThis.__taobaoRequire(path)` | 无 | 自定义 require |
| 淘宝创意 | 不支持动态 require | N/A | 返回 undefined |
| 字节 | `require('.' + urlNoSchema)` | `.` | 支持 requirePlugin |

**关键配置**（完整配置见 `platforms/wechat/platform.config.ts`）：

- `output.format: 'cjs'` — CJS 输出
- `output.preserveModules: true` — 保留模块结构，不合并为单文件
- `constants.WECHAT: true, constants.MINIGAME: true`
- PAL alias 指向 `pal/*/minigame/` 实现
- `pal/minigame` 指向 `pal/minigame/wechat.ts`
- `postBuild` 钩子处理 require 路径修复和入口生成

**构建后处理**：

```typescript
// scripts/postprocess-minigame.ts
// 1. 修复 require 路径前缀
// 2. 生成 game.js 入口
// 3. 生成 platform-specific 适配代码
// 4. 处理分包配置
```

#### C. Native 平台 — Vite + JSB require

**核心挑战**：Native 平台使用 jsb 的 `require()` 加载脚本，且需要 `.jsb.ts` 文件替换。

**解决方案**：

- 构建输出 `cjs` 格式，每个模块一个文件（与当前 SystemJS 模式类似）
- `.jsb.ts` 替换通过 Vite 插件在构建时完成
- `jsb.fileUtils.getStringFromFile` 读取 importMap 的逻辑需要替换为直接的 `require()` 调用链
- 鸿蒙平台的 `commonJSModuleMap` 通过构建后处理自动生成

**Native 模板启动流程变化**：

```
当前:
  require("system.bundle.js")           ← 加载 SystemJS
  System.warmup({ importMap, defaultHandler: require })
  System.import('cc')                   ← SystemJS 异步加载

迁移后:
  const cc = require('./cocos-js/cc')   ← 直接 require，同步加载
  const { Application } = require('./application')
  new Application().init(cc).start()
```

**鸿蒙平台特殊处理**：

```typescript
// 构建后处理：自动生成 commonJSModuleMap
function generateHarmonyModuleMap(outputDir: string): Record<string, Function> {
  const map: Record<string, Function> = {};
  // 扫描输出目录，为每个模块生成映射条目
  for (const file of fs.readdirSync(outputDir)) {
    map[`/src/cocos-js/${file}`] = () => import(`./src/cocos-js/${file}`);
  }
  return map;
}
```

### 4.5 关键技术迁移点

#### 1. `internal:constants` → Vite 插件

**当前机制**：

```typescript
// 源码中
import { JSB, DEBUG, BUILD } from 'internal:constants';

// 构建时由 @cocos/ccbuild 生成虚拟模块:
// const JSB = false;
// const DEBUG = false;
// const BUILD = true;
// export { JSB, DEBUG, BUILD };
```

**迁移方案**：编写 `vite-plugin-cocos-constants` 插件

```typescript
// plugins/vite-plugin-cocos-constants.ts
export function cocosConstants(constants: Record<string, boolean | number>) {
  return {
    name: 'cocos-constants',
    resolveId(id: string) {
      if (id === 'internal:constants') return id;
      return null;
    },
    load(id: string) {
      if (id === 'internal:constants') {
        const lines = Object.entries(constants).map(
          ([key, value]) => `export const ${key} = ${JSON.stringify(value)};`
        );
        return lines.join('\n');
      }
      return null;
    }
  };
}
```

**效果**：与当前 ccbuild 行为一致，但实现更简洁透明。Rollup 的 dead code elimination 会自动移除不可达代码。

#### 2. PAL 虚拟模块 → `resolve.alias`

**当前机制**：`cc.config.json` 的 `moduleOverrides` + `@types/pal/*.d.ts` 类型声明

**迁移方案**：直接用 `resolve.alias`

```typescript
// vite.config.ts
resolve: {
  alias: {
    'pal/audio': 'pal/audio/web/player.ts',   // Web
    // 'pal/audio': 'pal/audio/minigame/player.ts',  // 小游戏
    // 'pal/audio': 'pal/audio/native/player.ts',    // Native
  }
}
```

TypeScript 类型通过 `tsconfig.json` 的 `paths` 和 `@types/pal/*.d.ts` 保持不变。

#### 3. `.jsb.ts` 替换 → Vite 插件

**当前机制**：`cc.config.json` 定义约 30 个 `.jsb.ts` 替换规则

**迁移方案**：编写 `vite-plugin-cocos-jsb-replace` 插件

```typescript
// plugins/vite-plugin-cocos-jsb-replace.ts
const JSB_REPLACEMENTS: Record<string, string> = {
  'cocos/gfx/index.ts': 'cocos/gfx/index.jsb.ts',
  'cocos/scene-graph/node.ts': 'cocos/scene-graph/node.jsb.ts',
  'cocos/rendering/index.ts': 'cocos/rendering/index.jsb.ts',
  // ... 约 30 个替换
};

export function cocosJsbReplace(options: { native: boolean }) {
  return {
    name: 'cocos-jsb-replace',
    resolveId(source: string) {
      if (!options.native) return null;
      const replacement = JSB_REPLACEMENTS[source];
      if (replacement) return path.resolve(engineRoot, replacement);
      return null;
    }
  };
}
```

#### 4. 装饰器优化 → Vite 插件

**当前机制**：`cc.config.json` 的 `optimizeDecorators` 配置

**迁移方案**：编写 `vite-plugin-cocos-decorator-optimizer` 插件，在 Babel 转换阶段实现

- 字段装饰器优化：构建时将 `@property` 等装饰器转换为直接的属性描述
- 编辑器装饰器移除：构建时移除 `@executeInEditMode`、`@menu`、`@tooltip` 等

逻辑与当前 ccbuild 一致，只是从 ccbuild 内部移到 Vite 插件。

#### 5. TypeScript Transformer → Vite 插件

**当前 4 个自定义 Transformer**：

| Transformer | 功能 | 迁移方案 |
|-------------|------|---------|
| `inlineEnumTransformer` | 枚举内联优化 | `@rollup/plugin-typescript` 的 `transformers` 选项，或迁移为 Babel 插件 |
| `exportControllerTransformer` | 条件编译导出控制 | 合并到 `cocos-constants` 插件 |
| `minifyPrivatePropertiesTransformer` | 私有属性混淆 | 独立 Vite 插件，仅 release 模式启用 |
| `warningPrinterTransformer` | 构造函数警告 | 可移除，或迁移为 esbuild 插件 |

#### 6. `cc.decorator` 路径映射

**当前**：`tsconfig.json` 的 `paths` + `@cocos/rollup-plugin-typescript` 内部处理

**迁移后**：`resolve.alias` 直接映射

```typescript
resolve: {
  alias: {
    'cc.decorator': path.resolve(__dirname, 'cocos/core/data/decorators/index.ts'),
  }
}
```

### 4.6 ccbuild 功能拆解映射

| ccbuild 功能 | Vite 对应方案 | 实现方式 |
|-------------|-------------|---------|
| 常量注入 (`internal:constants`) | `vite-plugin-cocos-constants` | 虚拟模块 + `define` |
| 模块覆盖 (`moduleOverrides`) | `resolve.alias` + `vite-plugin-cocos-module-override` | 路径别名 + 插件 |
| `.jsb.ts` 替换 | `vite-plugin-cocos-jsb-replace` | `resolveId` 钩子 |
| 装饰器优化 | `vite-plugin-cocos-decorator-optimizer` | Babel 插件 |
| 枚举内联 | `vite-plugin-cocos-enum-inline` | TS Transformer 或 Babel 插件 |
| 私有属性混淆 | `vite-plugin-cocos-minify-private` | Babel 插件，仅 release |
| Tree-shaking 标记 | Vite/Rollup 原生 | `moduleSideEffects` 配置 |
| 代码压缩 | Vite 内置 (esbuild/terser) | `build.minify` |
| 声明文件生成 | `vite-plugin-dts` 或保留 `dtsBundler` | 独立步骤 |
| SystemJS 输出 | **移除** | 输出 ESM (Web) / CJS (小游戏/Native) |
| importMap 生成 | **移除** (Web) / 构建后处理 (小游戏/Native) | 不再需要 |

---

## 五、新老构建共存方案

> **核心原则**：新老构建系统完全隔离，互不影响。新构建使用独立的命令、配置、输出目录，验证完全通过后再移除老构建。

### 5.1 目录结构设计

```
cocos-engine/
├── bin/
│   ├── dev/                      ← 老构建产物 (ccbuild)
│   │   ├── cc/                   ← 未压缩 (SystemJS)
│   │   └── cc-min/               ← 压缩 (SystemJS)
│   │
│   ├── vite/                     ← 新构建产物 (Vite) [新增]
│   │   ├── web/                  ← Web 平台 (ESM)
│   │   │   ├── dev/              ← 开发模式
│   │   │   └── prod/             ← 生产模式
│   │   ├── wechat/               ← 微信小游戏 (CJS)
│   │   ├── native/               ← Native 平台 (CJS)
│   │   └── ...                   ← 其他平台
│   │
│   └── adapter/                  ← 适配器产物 (保持不变)
│
├── vite/                         ← Vite 构建配置目录 [新增]
│   ├── config/
│   │   ├── vite.config.ts        ← Vite 主配置
│   │   └── vite.base.config.ts   ← 基础配置
│   │
│   ├── platforms/                ← 平台配置目录
│   │   ├── base.ts               ← 配置类型定义 + 合并逻辑
│   │   ├── web/
│   │   │   └── platform.config.ts
│   │   ├── wechat/
│   │   │   └── platform.config.ts
│   │   ├── native/
│   │   │   └── platform.config.ts
│   │   └── ...
│   │
│   ├── plugins/                  ← 自定义 Vite 插件
│   │   ├── vite-plugin-cocos-constants.ts
│   │   ├── vite-plugin-cocos-jsb-replace.ts
│   │   ├── vite-plugin-cocos-decorator-optimizer.ts
│   │   ├── vite-plugin-cocos-enum-inline.ts
│   │   └── vite-plugin-cocos-minify-private.ts
│   │
│   ├── scripts/                  ← 构建脚本
│   │   ├── build.ts              ← 统一构建入口
│   │   ├── postprocess/          ← 构建后处理
│   │   │   ├── minigame.ts       ← 小游戏后处理
│   │   │   └── native.ts         ← Native 后处理
│   │   └── verify/               ← 验证脚本
│   │       ├── compare-output.ts ← 产物对比
│   │       └── runtime-test.ts   ← 运行时测试
│   │
│   └── user.config.ts            ← 用户配置入口
│
├── scripts/                      ← 老构建脚本 (保持不变)
│   ├── build-h5-minified.js
│   ├── build-h5-source.js
│   └── build-adapter.js
│
└── package.json                  ← 新增 vite:* 命令
```

### 5.2 npm scripts 命令设计

```json
{
  "scripts": {
    "==================== 老构建命令 (保持不变) ====================": "",
    "build": "npm run build:min && npm run build:declaration",
    "build:dev": "npm run build:debug-infos && node ./scripts/build-h5-source",
    "build:min": "npm run build:debug-infos && node ./scripts/build-h5-minified",
    "build:adapter": "node ./scripts/build-adapter.js",
    "build:declaration": "npm run build:const && node ./scripts/build-declarations",

    "==================== 新构建命令 (Vite) ====================": "",
    "vite:dev": "vite build --config vite/config/vite.config.ts --mode development",
    "vite:build": "vite build --config vite/config/vite.config.ts --mode production",
    
    "vite:dev:web": "vite build --config vite/config/vite.config.ts --mode development --platform web",
    "vite:build:web": "vite build --config vite/config/vite.config.ts --mode production --platform web",
    
    "vite:dev:wechat": "vite build --config vite/config/vite.config.ts --mode development --platform wechat",
    "vite:build:wechat": "vite build --config vite/config/vite.config.ts --mode production --platform wechat",
    
    "vite:dev:native": "vite build --config vite/config/vite.config.ts --mode development --platform native",
    "vite:build:native": "vite build --config vite/config/vite.config.ts --mode production --platform native",

    "==================== 验证命令 ====================": "",
    "vite:verify": "ts-node vite/scripts/verify/runtime-test.ts",
    "vite:compare": "ts-node vite/scripts/verify/compare-output.ts",
    "vite:test": "npm run vite:build:web && npm run vite:verify",

    "==================== 清理命令 ====================": "",
    "vite:clean": "rimraf bin/vite",
    "vite:clean:cache": "rimraf node_modules/.vite",

    "==================== 开发服务器 ====================": "",
    "vite:preview": "vite preview --config vite/config/vite.config.ts",
    "vite:serve": "vite --config vite/config/vite.config.ts"
  }
}
```

### 5.3 配置文件设计

#### 5.3.1 Vite 主配置文件

```typescript
// vite/config/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { loadPlatformConfig, mergeConfig, loadUserConfig } from './platforms/base';
import { cocosConstants } from './plugins/vite-plugin-cocos-constants';
import { cocosJsbReplace } from './plugins/vite-plugin-cocos-jsb-replace';
import { cocosDecoratorOptimizer } from './plugins/vite-plugin-cocos-decorator-optimizer';

interface CliOptions {
  platform?: string;
  mode?: string;
}

export default defineConfig(async ({ mode, command }) => {
  const cliOptions: CliOptions = parseCliArgs();
  const platform = cliOptions.platform || process.env.VITE_PLATFORM || 'web';
  
  const userConfig = await loadUserConfig();
  userConfig.platform = platform;
  
  const platformConfig = await loadPlatformConfig(platform);
  const finalConfig = mergeConfig(userConfig, platformConfig);
  
  const isProduction = mode === 'production';
  const outputDir = resolve(__dirname, '../../bin/vite', platform, isProduction ? 'prod' : 'dev');
  
  return {
    mode,
    
    resolve: {
      alias: {
        ...finalConfig.alias,
        'cc.decorator': resolve(__dirname, '../../cocos/core/data/decorators/index.ts'),
      },
    },
    
    define: Object.fromEntries(
      Object.entries(finalConfig.constants).map(([k, v]) => [k, JSON.stringify(v)])
    ),
    
    plugins: [
      cocosConstants(finalConfig.constants),
      cocosJsbReplace({ 
        replacements: finalConfig.jsbReplacements,
        enabled: platform === 'native' 
      }),
      cocosDecoratorOptimizer({
        optimize: isProduction,
        removeEditorDecorators: isProduction,
      }),
    ],
    
    build: {
      outDir: outputDir,
      emptyOutDir: true,
      sourcemap: finalConfig.build.sourceMap,
      minify: finalConfig.build.minify ? 'terser' : false,
      
      rollupOptions: {
        input: resolve(__dirname, '../../exports/base.ts'),
        output: {
          format: finalConfig.output.format,
          preserveModules: finalConfig.output.preserveModules,
          entryFileNames: '[name].js',
          chunkFileNames: '[name]-[hash].js',
        },
      },
    },
    
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      },
    },
  };
});

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform' && args[i + 1]) {
      options.platform = args[i + 1];
      i++;
    }
  }
  
  return options;
}
```

#### 5.3.2 用户配置文件

```typescript
// vite/user.config.ts
import { defineUserConfig } from './platforms/base';

export default defineUserConfig({
  platform: 'web',
  
  features: {
    spine: true,
    spineVersion: '3.8',
    dragonBones: false,
    marionette: true,
    physics: true,
    physics2D: true,
  },
  
  build: {
    debug: false,
    sourceMap: true,
    minify: false,
  },
});
```

#### 5.3.3 平台配置文件示例

```typescript
// vite/platforms/web/platform.config.ts
import { definePlatformConfig } from '../base';

export default definePlatformConfig({
  name: 'web',
  
  required: {
    constants: {
      HTML5: true,
      NATIVE: false,
      JSB: false,
      SUPPORT_JIT: true,
    },
    alias: {
      'pal/audio': 'pal/audio/web/player.ts',
      'pal/env': 'pal/env/web/env.ts',
      'pal/system-info': 'pal/system-info/web/system-info.ts',
      'pal/screen-adapter': 'pal/screen-adapter/web/screen-adapter.ts',
      'pal/input': 'pal/input/web/index.ts',
      'pal/pacer': 'pal/pacer/pacer-web.ts',
      'pal/wasm': 'pal/wasm/wasm-web.ts',
      'pal/minigame': 'pal/minigame/non-minigame.ts',
    },
    output: {
      format: 'es',
    },
  },
  
  defaults: {
    features: {
      marionette: true,
    },
    build: {
      sourceMap: true,
    },
  },
});
```

### 5.4 输出产物对比

| 维度 | 老构建 (ccbuild) | 新构建 (Vite) |
|------|-----------------|--------------|
| **输出目录** | `bin/dev/cc/` 或 `bin/dev/cc-min/` | `bin/vite/{platform}/{dev\|prod}/` |
| **模块格式** | SystemJS (`System.register`) | ESM (Web) / CJS (小游戏/Native) |
| **文件数量** | 单文件 `_virtual_cc-*.js` (3MB+) | 按需分割的多文件 |
| **运行时依赖** | `system.bundle.js` (15KB) | 无 (Web) / 无 (小游戏/Native) |
| **import-map** | 需要 `import-map.json` | 不需要 |
| **polyfills** | `polyfills.bundle.js` | 不需要 (现代浏览器) |

### 5.5 验证流程设计

#### 5.5.1 自动化验证脚本

```typescript
// vite/scripts/verify/runtime-test.ts
import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

interface VerifyResult {
  platform: string;
  passed: boolean;
  checks: CheckResult[];
  summary: string;
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

async function verifyBuild(platform: string): Promise<VerifyResult> {
  const outputDir = resolve(__dirname, '../../../bin/vite', platform, 'prod');
  const checks: CheckResult[] = [];
  
  checks.push(await checkOutputExists(outputDir));
  checks.push(await checkEntryFile(outputDir, platform));
  checks.push(await checkModuleFormat(outputDir, platform));
  checks.push(await checkFileSize(outputDir, platform));
  checks.push(await checkNoSystemJS(outputDir));
  
  const passed = checks.every(c => c.passed);
  
  return {
    platform,
    passed,
    checks,
    summary: passed ? `✅ ${platform} 验证通过` : `❌ ${platform} 验证失败`,
  };
}

async function checkOutputExists(outputDir: string): Promise<CheckResult> {
  const exists = existsSync(outputDir);
  return {
    name: '输出目录存在',
    passed: exists,
    message: exists ? `输出目录: ${outputDir}` : `输出目录不存在: ${outputDir}`,
  };
}

async function checkEntryFile(outputDir: string, platform: string): Promise<CheckResult> {
  const entryFile = join(outputDir, 'base.js');
  const exists = existsSync(entryFile);
  return {
    name: '入口文件存在',
    passed: exists,
    message: exists ? `入口文件: ${entryFile}` : `入口文件不存在: ${entryFile}`,
  };
}

async function checkModuleFormat(outputDir: string, platform: string): Promise<CheckResult> {
  const entryFile = join(outputDir, 'base.js');
  if (!existsSync(entryFile)) {
    return { name: '模块格式检查', passed: false, message: '入口文件不存在' };
  }
  
  const content = readFileSync(entryFile, 'utf-8');
  const isESM = content.includes('export ');
  const isCJS = content.includes('module.exports') || content.includes('exports.');
  
  const expectedESM = platform === 'web';
  const passed = expectedESM ? isESM : isCJS;
  
  return {
    name: '模块格式检查',
    passed,
    message: `期望: ${expectedESM ? 'ESM' : 'CJS'}, 实际: ${isESM ? 'ESM' : isCJS ? 'CJS' : '未知'}`,
  };
}

async function checkFileSize(outputDir: string, platform: string): Promise<CheckResult> {
  const oldOutputDir = resolve(__dirname, '../../../bin/dev/cc-min');
  const oldSize = getDirectorySize(oldOutputDir);
  const newSize = getDirectorySize(outputDir);
  
  const ratio = newSize / oldSize;
  const passed = ratio <= 1.1;
  
  return {
    name: '产物大小对比',
    passed,
    message: `新构建: ${(newSize / 1024 / 1024).toFixed(2)}MB, 老构建: ${(oldSize / 1024 / 1024).toFixed(2)}MB, 比例: ${(ratio * 100).toFixed(1)}%`,
  };
}

async function checkNoSystemJS(outputDir: string): Promise<CheckResult> {
  const files = getAllJsFiles(outputDir);
  let hasSystemRegister = false;
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('System.register')) {
      hasSystemRegister = true;
      break;
    }
  }
  
  return {
    name: '无 SystemJS 格式',
    passed: !hasSystemRegister,
    message: hasSystemRegister ? '发现 System.register 格式' : '未发现 SystemJS 格式',
  };
}

async function main() {
  const platforms = ['web', 'wechat', 'native'];
  const results: VerifyResult[] = [];
  
  for (const platform of platforms) {
    console.log(`\n验证 ${platform} 平台...`);
    const result = await verifyBuild(platform);
    results.push(result);
    
    console.log(`\n${result.summary}`);
    for (const check of result.checks) {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}: ${check.message}`);
    }
  }
  
  const allPassed = results.every(r => r.passed);
  console.log(`\n${'='.repeat(50)}`);
  console.log(allPassed ? '✅ 所有平台验证通过' : '❌ 部分平台验证失败');
  console.log(`${'='.repeat(50)}`);
  
  process.exit(allPassed ? 0 : 1);
}

main();
```

#### 5.5.2 产物对比脚本

```typescript
// vite/scripts/verify/compare-output.ts
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, basename } from 'path';

interface FileComparison {
  file: string;
  oldSize: number;
  newSize: number;
  ratio: number;
}

async function compareOutputs(platform: string): Promise<void> {
  const oldDir = resolve(__dirname, '../../../bin/dev/cc-min');
  const newDir = resolve(__dirname, '../../../bin/vite', platform, 'prod');
  
  const oldFiles = getJsFiles(oldDir);
  const newFiles = getJsFiles(newDir);
  
  console.log(`\n产物对比: ${platform}`);
  console.log('='.repeat(60));
  
  const comparisons: FileComparison[] = [];
  
  for (const oldFile of oldFiles) {
    const name = basename(oldFile);
    const oldSize = statSync(oldFile).size;
    
    const newFile = newFiles.find(f => basename(f) === name);
    if (newFile) {
      const newSize = statSync(newFile).size;
      comparisons.push({
        file: name,
        oldSize,
        newSize,
        ratio: newSize / oldSize,
      });
    }
  }
  
  comparisons.sort((a, b) => b.ratio - a.ratio);
  
  console.log('\n文件大小对比 (按变化比例排序):');
  console.log('-'.repeat(60));
  printf('%-40s %10s %10s %8s\n', '文件名', '老构建', '新构建', '比例');
  console.log('-'.repeat(60));
  
  for (const c of comparisons) {
    const ratioStr = c.ratio > 1.05 ? `🔴 ${(c.ratio * 100).toFixed(1)}%` :
                      c.ratio < 0.95 ? `🟢 ${(c.ratio * 100).toFixed(1)}%` :
                      `⚪ ${(c.ratio * 100).toFixed(1)}%`;
    printf('%-40s %10s %10s %8s\n', 
      c.file.slice(0, 40), 
      formatBytes(c.oldSize), 
      formatBytes(c.newSize),
      ratioStr
    );
  }
  
  const totalOld = comparisons.reduce((sum, c) => sum + c.oldSize, 0);
  const totalNew = comparisons.reduce((sum, c) => sum + c.newSize, 0);
  const totalRatio = totalNew / totalOld;
  
  console.log('-'.repeat(60));
  printf('%-40s %10s %10s %8s\n', '总计', formatBytes(totalOld), formatBytes(totalNew), 
    totalRatio > 1 ? `🔴 ${(totalRatio * 100).toFixed(1)}%` : `🟢 ${(totalRatio * 100).toFixed(1)}%`
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function getJsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.js')) {
      files.push(join(dir, file));
    }
  }
  return files;
}

const platform = process.argv[2] || 'web';
compareOutputs(platform);
```

### 5.6 迁移检查清单

#### Phase 1: Web 平台验证

| 检查项 | 命令 | 预期结果 | 状态 |
|--------|------|---------|------|
| 新构建命令可用 | `npm run vite:build:web` | 构建成功，无错误 | ⬜ |
| 输出目录正确 | `ls bin/vite/web/prod` | 存在 `base.js` 等文件 | ⬜ |
| 模块格式正确 | `head bin/vite/web/prod/base.js` | 包含 `export` 语句 | ⬜ |
| 无 SystemJS 格式 | `grep -r "System.register" bin/vite/web/prod` | 无匹配 | ⬜ |
| 产物大小合理 | `npm run vite:compare web` | 总大小 ≤ 老构建的 110% | ⬜ |
| 运行时测试通过 | `npm run vite:verify` | 所有检查项通过 | ⬜ |
| 开发服务器可用 | `npm run vite:serve` | 服务器启动成功 | ⬜ |
| HMR 可用 | 修改源码，观察浏览器 | 自动刷新 | ⬜ |

#### Phase 2: 小游戏平台验证

| 检查项 | 命令 | 预期结果 | 状态 |
|--------|------|---------|------|
| 微信小游戏构建 | `npm run vite:build:wechat` | 构建成功 | ⬜ |
| CJS 格式正确 | `head bin/vite/wechat/prod/base.js` | 包含 `module.exports` | ⬜ |
| require 路径正确 | 检查输出文件中的 require | 路径格式正确 | ⬜ |
| 微信开发者工具运行 | 导入到开发者工具 | 运行正常 | ⬜ |
| 其他小游戏平台 | 逐一验证 | 运行正常 | ⬜ |

#### Phase 3: Native 平台验证

| 检查项 | 命令 | 预期结果 | 状态 |
|--------|------|---------|------|
| Native 构建 | `npm run vite:build:native` | 构建成功 | ⬜ |
| JSB 替换正确 | 检查输出文件 | `.jsb.ts` 内容被使用 | ⬜ |
| Android 打包 | Android Studio 打包 | 打包成功 | ⬜ |
| Android 运行 | 安装到设备 | 运行正常 | ⬜ |
| iOS 打包 | Xcode 打包 | 打包成功 | ⬜ |
| iOS 运行 | 安装到设备 | 运行正常 | ⬜ |

#### Phase 4: 清理与切换

| 检查项 | 命令 | 预期结果 | 状态 |
|--------|------|---------|------|
| 所有平台验证通过 | `npm run vite:verify` | 全部通过 | ⬜ |
| CI/CD 适配 | 运行 CI 流程 | 全部通过 | ⬜ |
| 文档更新 | 检查文档 | 文档已更新 | ⬜ |
| 移除老构建命令 | 编辑 package.json | 移除 `build:dev` 等 | ⬜ |
| 移除 ccbuild 依赖 | `npm uninstall @cocos/ccbuild` | 依赖移除成功 | ⬜ |
| 移除老构建脚本 | 删除 `scripts/build-h5-*.js` | 删除成功 | ⬜ |

### 5.7 回退机制

如果新构建出现问题，可以立即回退到老构建：

```bash
# 方式 1：直接使用老构建命令
npm run build:dev    # 老构建，输出到 bin/dev/cc/
npm run build:min    # 老构建，输出到 bin/dev/cc-min/

# 方式 2：切换默认构建命令
# 编辑 package.json，将 build 命令改回老构建
{
  "scripts": {
    "build": "npm run build:min && npm run build:declaration"
  }
}

# 方式 3：使用环境变量切换
export USE_LEGACY_BUILD=true
npm run build
```

### 5.8 最终切换方案

当所有验证通过后，执行以下步骤切换到新构建：

```bash
# 1. 更新 package.json 中的默认命令
# 将 build 相关命令改为 vite 命令

# 2. 移除 ccbuild 依赖
npm uninstall @cocos/ccbuild

# 3. 删除老构建脚本
rm scripts/build-h5-minified.js
rm scripts/build-h5-source.js

# 4. 清理老构建产物
rm -rf bin/dev/cc bin/dev/cc-min

# 5. 更新文档
# 更新 README.md 中的构建说明

# 6. 提交更改
git add .
git commit -m "feat: migrate from ccbuild to Vite build system"
```

---

## 六、迁移路线图

### Phase 0：基础设施搭建 (1 周)

**目标**：搭建 Vite 构建基础设施，确保新老构建可以共存

**任务清单**：

- [ ] 安装 Vite 及相关依赖
- [ ] 创建 `vite/` 目录结构
- [ ] 创建 `vite/config/vite.config.ts` 主配置
- [ ] 创建 `vite/platforms/base.ts` 配置类型定义
- [ ] 创建 `vite/platforms/web/platform.config.ts` Web 平台配置
- [ ] 添加 `vite:*` npm scripts
- [ ] 验证 `npm run vite:build:web` 命令可用（即使构建失败）

**验收标准**：

- ✅ `npm run vite:build:web` 命令可执行（即使构建失败）
- ✅ 新构建产物输出到 `bin/vite/` 目录
- ✅ 老构建命令 `npm run build:dev` 仍然可用

### Phase 1：Web 平台验证 (2-3 周)

**目标**：用 Vite 构建 Web 平台引擎，验证产物可运行

**任务清单**：

- [ ] 创建 `vite.config.ts`
- [ ] 实现 `vite-plugin-cocos-constants`
- [ ] 实现 `vite-plugin-cocos-jsb-replace`
- [ ] 实现 `vite-plugin-cocos-decorator-optimizer`
- [ ] 配置 `resolve.alias` (PAL 映射 + cc.decorator)
- [ ] 验证 Web 平台构建产物可运行
- [ ] 性能对比测试（启动时间、构建时间、产物大小）

**验收标准**：

- ✅ Vite 构建的引擎可在 Web 平台正常启动
- ✅ 游戏脚本可正常加载和执行
- ✅ HMR 在开发模式下可用
- ✅ 产物大小不大于当前 SystemJS 产物

### Phase 2：小游戏平台适配 (2-3 周)

**目标**：用 Vite 构建小游戏平台引擎，验证 CJS 输出可运行

**任务清单**：

- [ ] CJS 输出格式验证
- [ ] 微信小游戏 require 适配（`__wxRequire`）
- [ ] 构建后处理脚本（路径前缀、入口生成）
- [ ] 其他小游戏平台逐一验证（百度、字节、支付宝等）
- [ ] 适配器构建统一到 Vite 管线（替代 Browserify）
- [ ] 分包配置适配

**验收标准**：

- ✅ 微信小游戏可正常启动和运行
- ✅ 至少 2 个其他小游戏平台可运行
- ✅ 适配器不再使用 Browserify

### Phase 3：Native 平台适配 (2-3 周)

**目标**：用 Vite 构建 Native 平台引擎，验证 JSB require 可运行

**任务清单**：

- [ ] CJS 多文件输出 + require 链验证
- [ ] `.jsb.ts` 替换验证
- [ ] Native 模板启动流程简化（移除 SystemJS）
- [ ] 鸿蒙 `commonJSModuleMap` 自动生成
- [ ] Native 预览模式适配

**验收标准**：

- ✅ Android/iOS 可正常打包和运行
- ✅ 鸿蒙平台可正常打包和运行
- ✅ Native 预览模式可用

### Phase 4：清理与优化 (1-2 周)

**目标**：移除旧构建系统依赖，统一工具链

**任务清单**：

- [ ] 移除 `@cocos/ccbuild` 依赖
- [ ] 移除 SystemJS 运行时
- [ ] 统一两个 Babel 预设
- [ ] 更新构建脚本和文档
- [ ] CI/CD 适配
- [ ] 性能回归测试

**验收标准**：

- ✅ 不再依赖 `@cocos/ccbuild`
- ✅ 所有平台构建产物大小 ≤ 迁移前
- ✅ 构建速度 ≥ 迁移前
- ✅ CI/CD 全部通过

---

## 七、风险评估

### 7.1 技术风险

| 风险 | 等级 | 影响 | 缓解措施 |
|------|------|------|---------|
| 小游戏平台 CJS 兼容性 | **高** | 小游戏无法运行 | 先在微信小游戏验证，它是最大的小游戏平台；保留双构建系统作为回退 |
| 鸿蒙平台 ES Module 映射 | 中 | 鸿蒙平台无法运行 | 构建后处理脚本自动生成 `commonJSModuleMap`；参考 aicocos 已有实现 |
| 装饰器优化行为差异 | 中 | 运行时行为不一致 | 逐个对比 ccbuild 和 Vite 插件的输出；编写装饰器测试用例 |
| Tree-shaking 行为差异 | 中 | 产物体积增大 | 对比构建产物大小；手动标记 `moduleSideEffects` |
| 枚举内联行为差异 | 低 | 运行时值不一致 | 对比 ccbuild 和 Vite 插件的输出；保留枚举内联测试 |
| 私有属性混淆差异 | 低 | 属性名不一致 | 仅 release 模式启用；对比混淆结果 |

### 7.2 工程风险

| 风险 | 等级 | 影响 | 缓解措施 |
|------|------|------|---------|
| Cocos Creator 编辑器集成 | **高** | 编辑器无法使用新构建系统 | 编辑器的引擎预览和构建流程需要同步修改；先不修改编辑器，只修改引擎构建 |
| `@cocos/ccbuild` 闭源 | 中 | 无法参考内部实现 | 通过构建产物逆向分析；保留 ccbuild 作为回退 |
| 多平台测试覆盖 | 中 | 部分平台未验证 | 优先覆盖 Web + 微信小游戏 + Android；其他平台逐步验证 |
| 回归 bug | 中 | 已有功能异常 | 保留旧构建系统作为回退；每个 Phase 完成后做全量回归测试 |

### 7.3 回退策略

如果某个平台迁移失败，可以保留双构建系统：

```json
{
  "scripts": {
    "build:web": "vite build --config vite.config.ts",
    "build:minigame": "vite build --config vite.minigame.config.ts",
    "build:native": "vite build --config vite.native.config.ts",
    "build:legacy": "node ./scripts/build-h5-minified",
    "build:legacy:adapter": "node ./scripts/build-adapter"
  }
}
```

---

## 八、aicocos 作为试验田

### 8.1 为什么 aicocos 是最佳试验田

aicocos 子项目已经使用了 Rollup 编程式 API + SystemJS 输出，是迁移 Vite 的最佳起点：

1. **已有 Rollup 基础**：aicocos 的 `src/cli/index.ts` 直接使用 Rollup API 打包项目代码
2. **已有 SystemJS 输出**：`bundle.write({ format: "system" })`，迁移到 ESM 只需改格式
3. **项目结构简单**：比主引擎简单得多，更容易验证
4. **不影响主引擎**：aicocos 是独立子项目，迁移失败不影响主引擎

### 8.2 aicocos 迁移步骤

1. 将 `rollup` 替换为 `vite`
2. 将 `format: "system"` 改为 `format: "es"` (Web) / `format: "cjs"` (小游戏/Native)
3. 将 `intro: renderScriptPackagePrelude()` 改为 Vite 插件
4. 验证 Web 平台可运行
5. 验证小游戏平台可运行

---

## 九、与 litePlan 其他方案的关系

### 9.1 与 "01-独立运行引擎方案" 的关系

独立运行方案的核心判断是"引擎编译必须依赖 `@cocos/ccbuild`"。本方案的目标正是**打破这个依赖**，用 Vite 替代 ccbuild。

迁移完成后，独立运行方案中的"Compatibility Layer"可以大幅简化：

- 不再需要 SystemJS 运行时
- 不再需要 import-map.json
- 引擎编译不再依赖 ccbuild
- 脚本构建链路更简单

### 9.2 与 "08-Native模块架构" 的关系

Native 模块架构中的 JSB 绑定层（`*.jsb.ts` 文件）在 Vite 方案中通过 `vite-plugin-cocos-jsb-replace` 插件处理，行为与当前 ccbuild 一致。

C++ 层的构建（CMake）不受影响，Vite 只替代 TypeScript 层的构建。

### 8.3 对模块裁剪的影响

Vite 的 tree-shaking 比 ccbuild 更强大（Rollup 原生支持），裁剪模块后可以更精确地移除死代码。当前 ccbuild 的 `noSideEffectFiles` 手动标记可以被 Rollup 的自动分析替代。

---

## 十、不推荐的方案

### 10.1 不推荐：一次性全量替换 ccbuild

原因：

1. 风险太高，所有平台同时受影响
2. 无法逐步验证，出问题难以定位
3. 编辑器集成需要同步修改，工作量大

### 9.2 不推荐：保留 SystemJS 但换用 Vite 开发模式

原因：

1. 开发模式用 ESM，生产模式用 SystemJS，行为不一致
2. 增加了维护两套构建配置的负担
3. 没有真正解决 SystemJS 的运行时开销问题

### 10.3 不推荐：只迁移开发模式，不迁移生产构建

原因：

1. 开发/生产行为不一致，容易出 bug
2. 生产构建仍然是 ccbuild，没有真正摆脱依赖
3. HMR 和生产构建的产物差异可能导致问题

---

## 十一、最终建议

### 11.1 一句话版本

**用 Vite 替代 @cocos/ccbuild，采用热插拔平台配置模式——每个平台独立管理自己的 platform.config.ts 和 tsconfig.json，引擎构建流程统一，区别只是平台不同；Web 平台输出原生 ESM，小游戏和 Native 平台输出 CJS；先在 aicocos 验证，再逐步推广到主引擎。**

### 11.2 最关键的执行原则

1. **热插拔平台配置** — 平台差异是"配置选择"而不是"条件分支"，每个平台一个配置目录
2. **先 aicocos，后主引擎** — 小范围验证，降低风险
3. **先 Web，后小游戏，最后 Native** — 平台难度递增
4. **保留 ccbuild 作为回退** — 直到所有平台验证通过
5. **插件化拆解** — 每个 ccbuild 功能对应一个独立 Vite 插件
6. **构建产物对比** — 每个 Phase 完成后对比产物大小和行为

### 11.3 预期收益

| 指标 | 当前 | 迁移后 (预期) | 改善 |
|------|------|-------------|------|
| Web 启动时间 | 基线 | -20%~40% | 移除 SystemJS 运行时开销 |
| 开发模式启动 | 全量构建 (~30s) | Vite 即时 (<1s) | 按需编译 |
| HMR | 不支持 | 支持 | 开发效率大幅提升 |
| 构建配置可维护性 | ccbuild 闭源 | Vite 插件开源 | 完全可控 |
| Tree-shaking | 手动标记 | Rollup 自动 | 更精确的死代码移除 |
| 产物格式 | System.register | ESM/CJS | 更现代，更小 |

---

_文档更新时间：2026-04-12（v3：新增分层配置系统，用户配置与平台配置分离）_
