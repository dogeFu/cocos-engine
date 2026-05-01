# Vite 构建系统

> Cocos Creator 引擎的 Vite/Rollup 构建架构、插件体系、输出格式及与原始 SystemJS 构建的行为差异分析。

---

## 1. 架构概览

### 构建流程

```
user.config.ts (用户配置)
    ↓ loadUserConfig()
platforms/<name>/platform.config.ts (平台配置)
    ↓ loadPlatformConfig()
    ↓ mergeConfig(user, platform)
vite.config.ts (主配置)
    ↓ 组装插件链 → Rollup 构建 → IIFE 输出 cc.js
```

### 配置合并

- **`vite/platforms/base.ts`** — 配置框架，定义 `UserConfig`、`PlatformConfig`、`BuildConfig` 接口
- `mergeConfig()` 合并用户偏好与平台约束：验证不支持的特性（报错）、强制关闭禁用特性（警告）、合并构建常量
- `loadUserConfig()` 支持环境变量覆盖（`VITE_ENGINE_FEATURES`、`VITE_ENGINE_BUILD`）和 `jiti` 加载 TypeScript 配置文件
- **`vite/user.config.ts`** — 用户构建配置（spine v3.8、2D physics、skeletal animation 等）
- **`vite/platforms/web/platform.config.ts`** — Web 平台配置（HTML5=true、NATIVE=false、PAL 别名等）

---

## 2. 插件体系

### 插件执行顺序

```
cocosModules → cocosVirtualModules → cocos-internal-bridge → cocosDelayStaticInit
→ cocosModuleReplace → cocosJsbReplace → cocosDecoratorOptimizer → cocosExternalModules
```

### 2.1 cocosModules（模块裁剪）

**文件：** `vite/plugins/vite-plugin-cocos-modules.ts`
**钩子：** `config`、`resolveId`、`load`、`buildStart`

根据特性配置（spine、dragonBones、physics、marionette 等）决定包含哪些引擎子系统。维护 ~30+ 模块的导出注册表和依赖图。生成虚拟入口模块 `virtual:cocos-entry`，仅 re-export 启用的模块。

- `config` 钩子设置 Vite `define` 值
- 生成的入口文件会强制导出某些输入类型以防止 dev 模式下被 tree-shake
- 设置 `VITE_MODULE_CULLING=false` 可禁用，回退到 `exports/full.ts` 完整入口

### 2.2 cocosVirtualModules（虚拟常量模块）

**文件：** `vite/plugins/vite-plugin-cocos-constants.ts`
**钩子：** `resolveId`、`load`

提供两个虚拟模块：
- `internal:constants` — 导出所有构建时常量（HTML5、NATIVE、DEBUG 等）
- `internal:native` — native 平台导出真实绑定实现，web 平台导出空对象

使用 Rollup `\0` 前缀约定标记虚拟模块 ID。

### 2.3 cocos-internal-bridge（cc.internal 桥接）

**文件：** 内联于 `vite/config/vite.config.ts`
**钩子：** `transform`

解决 IIFE 格式下 `ccinternal` 属性丢失问题。在 `global-exports.ts` 源码中 `cclegacy.internal = {}` 之后注入 `window._ccInternal = cclegacy.internal`，使所有后续的 `cclegacy.internal.X = X` 赋值修改同一个被全局引用的对象。Footer 在覆盖 `window.cc` 后从 `window._ccInternal` 恢复。

### 2.4 cocosDelayStaticInit（静态常量内联）

**文件：** `vite/plugins/vite-plugin-cocos-delay-static-init.ts`
**钩子：** `renderChunk`（enforce: pre）

将 `freezeVec2(...)`、`freezeVec3(...)`、`freezeColor(...)` 等辅助函数调用替换为内联的 `Object.freeze(new Vec2(...))` 表达式，然后删除辅助函数定义。减少包体积优化。

目标常量：ZERO、ONE、NEG_ONE、UNIT_XYZW、RIGHT、UP、FORWARD、IDENTITY、WHITE、GRAY、BLACK、TRANSPARENT、RED、GREEN、BLUE、CYAN、MAGENTA、YELLOW。

### 2.5 cocosModuleReplace（平台模块替换）

**文件：** `vite/plugins/vite-plugin-cocos-module-replace.ts`
**钩子：** `resolveId`（enforce: pre）

平台感知的模块替换：
- Web/小游戏平台：`native-2d.ts` → `native-2d-empty.ts`（空桩）
- Spine：根据 `spineVersion` 选择 `spine-version-3.8.ts` 或 `spine-version-4.2.ts`

仅处理相对路径导入（`../`、`./`）。

### 2.6 cocosJsbReplace（JSB 替换）

**文件：** `vite/plugins/vite-plugin-cocos-jsb-replace.ts`
**钩子：** `resolveId`（enforce: pre）

Native 平台专用。将 JSB（JavaScript Binding）模块的 import 重定向到替代实现。仅在 `enabled=true`（构建 native）时激活。

### 2.7 cocosDecoratorOptimizer（装饰器优化）

**文件：** `vite/plugins/vite-plugin-cocos-decorator-optimizer.ts`
**钩子：** `transform`（enforce: post）

通过正则匹配移除 TypeScript/JavaScript 装饰器：
- 生产模式：移除编辑器装饰器（`@menu`、`@inspector`、`@tooltip`）及其参数
- `optimize` 标志：移除字段装饰器（`@property`、`@ccclass`、`@serializable`）

### 2.8 cocosExternalModules（外部 WASM 模块）

**文件：** `vite/plugins/vite-plugin-cocos-external-modules.ts`
**钩子：** `resolveId`、`load`（enforce: pre）

处理 `external:emscripten/...` 导入，支持：
- `.wasm` — WebAssembly 二进制
- `.wasm.js` — Emscripten JS 粘合代码
- `.asm.js` — ASM.js 回退
- `.js.mem` — ASM.js 内存初始化器

根据 `nativeCodeBundleMode` 裁剪不需要的格式（0=仅 ASMJS，1=仅 WASM）。WASM 和 `.js.mem` 作为 Rollup asset 发射，通过 `import.meta.ROLLUP_FILE_URL_` 引用。

---

## 3. 输出格式

### IIFE 输出

```js
var cc = (function(t) {
    "use strict";
    // 所有引擎模块代码
    t.Vec3 = Vec3;
    t.Node = Node;
    // ...
    return t;
})({});
// Rollup footer
if (typeof window !== "undefined" && window.cc) {
    Object.getOwnPropertyNames(cc).forEach(function(k) {
        try { if (!(k in window.cc)) window.cc[k] = cc[k]; } catch(e) {}
    });
} else { window.cc = cc; }
// cc.internal 恢复
if (typeof window !== "undefined" && window._ccInternal && window.cc && !window.cc.internal) {
    window.cc.internal = window._ccInternal;
}
```

- 格式：IIFE，`name: 'cc'`
- 入口：`virtual:cocos-entry`（模块裁剪启用时）或 `exports/full.ts`
- Tree-shake：`preset: 'safest'`，`moduleSideEffects: 'no-external'`
- esbuild：`experimentalDecorators: true`，`useDefineForClassFields: false`，`emitDecoratorMetadata: true`
- Sourcemap：默认开启

### Footer 合并逻辑

Rollup IIFE 的 `name: 'cc'` 使返回值赋给 `var cc`。但引擎 IIFE 内部设置 `window.cc = cclegacy`。Footer 将模块命名空间的属性合并到 `window.cc`（不覆盖已有属性），确保向后兼容。

---

## 4. IIFE 与 SystemJS 行为差异

原始构建使用 SystemJS（模块加载器），Vite 构建使用 Rollup IIFE。两者在以下场景存在行为差异。

### 4.1 window.cc 对象差异（已修复）

| SystemJS | IIFE |
|----------|------|
| `window.cc = cclegacy`，`cc` 就是 `cclegacy` 本身 | `window.cc` 先被设为 `cclegacy`，后被 footer 覆盖为模块命名空间 |
| `cc.internal` 可用 | `cc.internal` 丢失（已通过 bridge 修复） |
| `cc._global`、`cc.ccwindow` 可用 | 可能同样丢失，需逐一验证 |

**风险等级：** 高（已确认 `internal` 丢失，已修复）

### 4.2 循环依赖时序

| SystemJS | IIFE |
|----------|------|
| 每个模块独立闭包，`require()` 同步触发依赖执行 | 所有代码按 Rollup 排列顺序线性执行 |
| A require B → B 执行 → B require A 拿到部分导出 | 如果 A 在 B 前面，B 执行时 A 的导出变量可能是 `undefined` |

- 函数内延迟读取：两者都安全
- 模块顶层读取：SystemJS 拿到部分导出，IIFE 可能拿到 `undefined`

**风险等级：** 低 — Cocos 引擎大部分循环依赖使用延迟读取

### 4.3 导出绑定方式

| SystemJS | IIFE |
|----------|------|
| `require` 返回实时绑定（getter） | `t.X = X` 是值拷贝 |

- 类/函数（引用类型）：无影响
- 原始类型的 `let` 变量且有重新赋值：IIFE 拿到旧值

**风险等级：** 极低 — 引擎很少导出可变原始值

### 4.4 副作用执行顺序

| SystemJS | IIFE |
|----------|------|
| 按依赖图拓扑排序 | 按 Rollup 模块排列顺序（通常后序遍历） |

大多数情况一致。无依赖关系但有隐式顺序假设的模块可能出现差异。

**风险等级：** 低 — 需要无依赖关系的隐式顺序假设

### 4.5 this 指向

| SystemJS | IIFE |
|----------|------|
| 模块顶层 `this` = 模块对象或 `undefined` | IIFE 严格模式下 `this` = `undefined` |

**风险等级：** 极低 — 引擎不依赖模块顶层 `this`

### 4.6 动态 import()

IIFE 是同步打包，不支持真正的动态 `import()`。引擎代码中的 `import()` 表达式会被 Rollup 保留或报错，行为与 SystemJS 的 `System.import()` 不同。

**风险等级：** 低 — 引擎核心不依赖动态 import

### 4.7 eval / new Function

IIFE 内部变量被压缩重命名，`eval` 无法访问。如果有代码依赖 `eval` 访问全局 `cc` 对象上的属性，属性名是否一致取决于导出完整性。

**风险等级：** 极低

---

## 5. 关键文件索引

| 文件 | 职责 |
|------|------|
| `vite/config/vite.config.ts` | 主构建配置，组装插件链和输出选项 |
| `vite/platforms/base.ts` | 配置合并框架（UserConfig + PlatformConfig） |
| `vite/platforms/web/platform.config.ts` | Web 平台配置和 PAL 别名 |
| `vite/user.config.ts` | 用户特性选择（spine、physics 等） |
| `vite/plugins/vite-plugin-cocos-modules.ts` | 模块裁剪和特性门控（最复杂） |
| `vite/plugins/vite-plugin-cocos-constants.ts` | 虚拟常量模块 |
| `vite/plugins/vite-plugin-cocos-external-modules.ts` | WASM/ASM.js 外部模块处理 |
| `vite/plugins/vite-plugin-cocos-module-replace.ts` | 平台模块替换（Spine 版本、native-2d） |
| `vite/plugins/vite-plugin-cocos-jsb-replace.ts` | Native JSB 模块替换 |
| `vite/plugins/vite-plugin-cocos-decorator-optimizer.ts` | 装饰器移除/优化 |
| `vite/plugins/vite-plugin-cocos-delay-static-init.ts` | 数学常量内联优化 |
| `cocos/core/global-exports.ts` | `cclegacy` 和 `cc.internal` 初始化源 |

---

*基于 cocos-engine 当前分支的 Vite 构建实现整理。*
