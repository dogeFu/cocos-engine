# Cocos 引擎构建流程详细对比文档

## 一、概述

本文档详细对比 `@cocos/ccbuild` (老构建) 和 `Vite` (新构建) 两种构建流程的差异，用于指导 Vite 构建方案的完善。

---

## 二、构建流程对比

### 2.1 整体流程对比

| 阶段 | @cocos/ccbuild | Vite 构建 |
|-----|----------------|-----------|
| 入口处理 | 使用 `statsQuery.getFeatureUnitFile()` 获取入口 | 使用 `virtual:cocos-entry` 虚拟模块或 `exports/full.ts` |
| 常量生成 | `statsQuery.constantManager.genBuildTimeConstants()` | `vite-plugin-cocos-constants` + `define` |
| 模块重定向 | 基于 `moduleOverrides` 的条件重定向 | ✅ `vite-plugin-cocos-module-replace` |
| TypeScript | `@cocos/rollup-plugin-typescript` + 自定义转换器 | Vite 内置 esbuild + 自定义插件 |
| Babel | `presetCC` + 多种插件 | Vite 内置 esbuild |
| 压缩 | Terser | Terser |

---

## 三、关键处理逻辑对比

### 3.1 虚拟模块处理

#### @cocos/ccbuild
```javascript
// engine-js/index.js
rpVirtualOptions['internal:constants'] = vmInternalConstants;
rpVirtualOptions[helpers.CC_HELPER_MODULE] = helpers.generateHelperModuleSource();
```

#### Vite 实现
- ✅ `internal:constants` - 已实现
- ✅ `internal:native` - 已实现 (通过 `cocosVirtualModules` 插件)
- ⚠️ `CC_HELPER_MODULE` - 不需要 (引擎代码已重构)

---

### 3.2 模块重定向 (moduleOverrides)

#### Vite 实现状态 (已全部实现)

| 重定向类型 | ccbuild | Vite 实现 |
|-----------|---------|----------|
| PAL 模块 (HTML5) | ✅ | ✅ (通过 alias) |
| PAL 模块 (Native) | ✅ | ✅ (各平台配置) |
| PAL 模块 (小游戏) | ✅ | ✅ (各平台配置) |
| Spine 版本切换 | ✅ | ✅ `vite-plugin-cocos-module-replace` |
| native-2d 替换 | ✅ | ✅ `vite-plugin-cocos-module-replace` |
| MARIONETTE 空模块 | ✅ | ✅ (模块已移除，不需要处理) |
| PROCEDURAL_ANIMATION 空模块 | ✅ | ✅ (模块已移除，不需要处理) |

---

### 3.3 TypeScript 转换器

#### @cocos/ccbuild 实现的转换器

```typescript
// engine-js/index.ts
transformers: {
  before: [
    warningPrinterTransformer,      // 警告打印
    inlineEnumTransformer,         // 枚举内联
    exportControllerTransformer,   // 导出控制
    minifyPrivatePropertiesTransformer  // 属性压缩
  ]
}
```

#### Vite 实现状态

| 转换器 | ccbuild | Vite 实现 | 说明 |
|--------|---------|----------|------|
| warningPrinterTransformer | ✅ | ⚠️ 不需要 | 开发调试用，生产构建不需要 |
| inlineEnumTransformer | ✅ | ⚠️ 限制 | 需要 TypeScript 类型信息，esbuild 不支持 |
| exportControllerTransformer | ✅ | ⚠️ 限制 | 需要 TypeScript 类型信息，esbuild 不支持 |
| minifyPrivatePropertiesTransformer | ✅ | ⚠️ 限制 | 需要 TypeScript 类型信息，esbuild 不支持 |

**说明**: 这些 TypeScript 转换器需要完整的类型信息才能工作。Vite 使用 esbuild 进行 TypeScript 编译，不提供类型信息。如需实现这些功能，需要：
1. 使用 `@cocos/typescript` 替代 esbuild
2. 或在构建后处理阶段使用 Babel 插件

---

### 3.4 装饰器处理

#### @cocos/ccbuild
- 使用 `babelPresetCC` 处理装饰器
- 支持 `fieldDecorators` 和 `editorDecorators` 分离
- 生产环境移除编辑器装饰器

#### Vite 实现
- ✅ 生产环境移除编辑器装饰器 (`vite-plugin-cocos-decorator-optimizer`)
- ⚠️ fieldDecorators 优化不完全

---

### 3.5 WASM/外部模块处理

#### @cocos/ccbuild
```javascript
// external-wasm-loader 插件
{
  externalRoot: 'native/external',
  nativeCodeBundleMode: 'both',
  wasmCompressionMode: 'brotli',
  cullMeshopt: true,
  format: 'relative-from-chunk'
}
```

#### Vite 实现
- ✅ 外部模块标记为 external (`vite-plugin-cocos-external-modules`)
- ⚠️ WASM 压缩模式未实现 (低优先级)
- ⚠️ cullMeshopt 未实现 (低优先级)

---

### 3.6 构建常量对比

#### @cocos/ccbuild 生成的常量
```javascript
{
  HTML5: true,
  NATIVE: false,
  BUILD: true,
  DEBUG: false,
  DEV: false,
  USE_3D: true,
  SPINE_4_2: true,
  MARIONETTE: true,
  // ... 更多
}
```

#### Vite 实现的常量
- ✅ 所有基础常量通过 `define` 实现
- ✅ 平台相关常量通过各平台配置实现
- ✅ Spine 版本常量根据 `user.config.ts` 自动生成

---

## 四、功能实现清单

### 4.1 高优先级 (影响功能正确性) - 全部完成 ✅

| 功能 | 说明 | 状态 |
|-----|------|------|
| Spine 版本切换 | 3.8/4.2 版本选择 | ✅ 已实现 |
| MARIONETTE 空模块替换 | 动态角色动画禁用时替换 | ✅ 模块已移除 |
| PROCEDURAL_ANIMATION 空模块替换 | 程序化动画禁用时替换 | ✅ 模块已移除 |
| native-2d 替换 | Web 平台不需要 native-2d | ✅ 已实现 |
| 配置统一 | user.config.ts 作为唯一配置源 | ✅ 已实现 |

### 4.2 中优先级 (影响构建产物大小) - 有限制 ⚠️

| 功能 | 说明 | 状态 |
|-----|------|------|
| inlineEnumTransformer | 枚举内联优化 | ⚠️ esbuild 限制 |
| exportControllerTransformer | 导出控制 | ⚠️ esbuild 限制 |
| minifyPrivatePropertiesTransformer | 私有属性压缩 | ⚠️ esbuild 限制 |
| warningPrinterTransformer | 警告打印 | ⚠️ 不需要 |

### 4.3 低优先级 (优化相关)

| 功能 | 说明 | 状态 |
|-----|------|------|
| WASM 压缩 | brotli 压缩 | ❌ 未实现 |
| cullMeshopt | Meshopt 裁剪 | ❌ 未实现 |
| 增量构建 | 缓存机制 | ❌ 未实现 |
| 可视化分析 | visualize 选项 | ❌ 未实现 |

---

## 五、平台配置对比

### 5.1 Web 平台

#### @cocos/ccbuild
- 使用 `moduleOverrides` 动态替换 PAL 模块
- 生成 `system` 格式 (散文件) 或 `iife` 格式 (单文件)

#### Vite
- 使用 `alias` 配置 PAL 模块路径
- 输出 `iife` 格式 (单文件)
- ✅ 已实现模块裁剪
- ✅ 已实现 Spine 版本切换

### 5.2 小游戏平台

#### @cocos/ccbuild
- 使用 `moduleOverrides` 替换 PAL 模块
- 平台特定替换 (wechat, alipay, xiaomi 等)

#### Vite
- ✅ 各平台独立配置
- ✅ `vite.config.ts` 平台切换

### 5.3 Native 平台

#### @cocos/ccbuild
- JSB 模块替换
- 生成 `.wasm` 绑定

#### Vite
- ✅ JSB 替换支持 (`vite-plugin-cocos-jsb-replace`)
- ⚠️ 需要进一步测试

---

## 六、构建产物对比

### 6.1 文件格式

| 格式 | ccbuild | Vite |
|-----|---------|------|
| system (散文件) | ✅ | ❌ |
| iife (单文件) | ✅ | ✅ |
| esm (ES 模块) | ✅ | ❌ |
| cjs (CommonJS) | ✅ | ❌ |

### 6.2 代码压缩

| 选项 | ccbuild | Vite |
|-----|---------|------|
| Terser | ✅ | ✅ |
| 属性压缩 | ✅ | ⚠️ 有限制 |
| 枚举内联 | ✅ | ⚠️ 有限制 |

### 6.3 文件大小对比

| 构建方式 | 大小 | gzip |
|---------|------|------|
| Vite 构建 (压缩后) | 1.73 MB | 445 KB |
| 老构建 (核心+Spine) | ~3.4 MB | ~900 KB |
| **减少比例** | **~49%** | **~50%** |

---

## 七、总结

### 7.1 当前 Vite 构建已完成的功能

| 功能 | 状态 | 说明 |
|-----|------|------|
| 虚拟模块 | ✅ | internal:constants, internal:native |
| PAL 模块替换 | ✅ | 通过 alias 配置 |
| 基础常量定义 | ✅ | 通过 define 配置 |
| 生产环境装饰器优化 | ✅ | 移除编辑器装饰器 |
| 外部模块处理 | ✅ | 标记为 external |
| 模块裁剪功能 | ✅ | vite-plugin-cocos-modules |
| 代码压缩 | ✅ | Terser |
| 单文件输出 | ✅ | IIFE 格式 |
| native-2d 替换 | ✅ | Web 平台替换为空模块 |
| Spine 版本切换 | ✅ | 3.8/4.2 版本选择 |
| 配置统一 | ✅ | user.config.ts 作为唯一配置源 |

### 7.2 已知限制

1. **TypeScript 转换器**: esbuild 不提供类型信息，无法实现 `inlineEnumTransformer` 等转换器
2. **WASM 压缩**: 低优先级，可在后续版本实现
3. **散文件输出**: Vite 设计为单文件输出，不支持 system 格式

### 7.3 使用方法

```bash
# 构建 Web 平台
npm run vite:build

# 构建指定平台
VITE_PLATFORM=wechat npm run vite:build

# 禁用模块裁剪
VITE_MODULE_CULLING=false npm run vite:build
```

### 7.4 配置文件

编辑 `vite/user.config.ts`:

```typescript
import { defineUserConfig } from './platforms/base';

export default defineUserConfig({
  platform: 'web',
  
  features: {
    spine: true,
    spineVersion: '3.8',  // 或 '4.2'
    dragonBones: false,
    marionette: true,
    physics: true,
    physics2D: true,
  },
  
  build: {
    debug: false,
    sourceMap: true,
    minify: true,
  },
});
```

---

*文档版本: 2.0*
*更新时间: 2026-04-14*
*状态: 高优先级问题已全部解决*
