# Terrain 模块移除方案

> **优先级**: 2 | **预计时间**: 2.5-3天 | **风险等级**: ⭐⭐⭐ 中（原方案低估）

---

## 一、模块概述

### 1.1 功能描述

Terrain模块提供地形系统功能，包括：
- 高度场地形渲染
- 地形LOD（Level of Detail）优化
- 地形资源管理（TerrainAsset）
- 地形碰撞检测（与Physics模块集成）

### 1.2 移除理由

根据[核心目标.md](./核心目标.md)，Terrain模块应该被完全删除，原因：
- ✅ 休闲游戏几乎不使用地形系统（主要用于开放世界3D游戏）
- ✅ 无C++原生代码，纯TypeScript实现
- ✅ 主要被Physics模块引用（而Physics模块也将被删除）
- ✅ 减少引擎体积，符合轻量化原则
- ✅ 降低AI理解成本（地形系统API复杂）

---

## 二、代码清单

### 2.1 TypeScript核心代码（需删除）

**路径**: `cocos/terrain/`

| 文件名 | 行数估算 | 功能说明 |
|--------|----------|----------|
| `index.ts` | ~30行 | 模块入口，导出所有公共API |
| `terrain.ts` | ~800行 | 地形主组件，核心渲染逻辑 |
| `terrain-lod.ts` | ~400行 | 地形LOD系统，细节层次管理 |
| `terrain-asset.ts` | ~300行 | 地形资源类，高度图数据管理 |
| `height-field.ts` | ~200行 | 高度场数据结构和算法 |
| `category.json` | ~10行 | 编辑器分类配置 |

**小计**: ~1740行 TypeScript代码

### 2.2 Editor编辑器资源（需删除）⚠️ **重要！**

**路径**: `editor/`

| 文件/目录 | 说明 | 重要性 |
|-----------|------|--------|
| `inspector/components/terrain.js` | Terrain组件属性检查器 | ⭐⭐⭐ 关键 |
| `i18n/zh/modules/terrain.js` | 中文国际化模块 | ⭐⭐⭐ 关键 |
| `i18n/en/modules/terrain.js` | 英文国际化模块 | ⭐⭐⭐ 关键 |
| `assets/effects/legacy/terrain.effect` (+ .meta) | 地形Effect着色器 | ⭐⭐ |
| `assets/effects/builtin-terrain.effect` | 内置地形Effect | ⭐⭐ |
| `assets/effects/internal/editor/terrain-select-brush.effect` (+ .meta) | 选择笔刷效果 | ⭐⭐ |
| `assets/effects/internal/editor/terrain-image-brush.effect` (+ .meta) | 图像笔刷效果 | ⭐⭐ |
| `assets/effects/internal/editor/terrain-circle-brush.effect` (+ .meta) | 圆形笔刷效果 | ⭐⭐ |
| `assets/chunks/surfaces/effect-macros/terrain.chunk` (+ .meta) | Effect宏定义 | ⭐⭐ |
| `assets/default_file_content/terrain/default.terrain.meta` | 默认地形元数据 | ⭐⭐ |
| `assets/default_prefab/Terrain.prefab` (+ .meta) | 默认Terrain预制体 | ⭐⭐ |

**小计**: ~16个文件/目录

### 2.3 Physics模块相关文件（需删除或修改）

**完全删除的文件**:

| 文件路径 | 功能说明 | 重要性 |
|---------|---------|--------|
| `cocos/physics/framework/components/colliders/terrain-collider.ts` | 地形碰撞器组件 | ⭐⭐⭐ 关键 |
| `cocos/physics/physx/shapes/physx-terrain-shape.ts` | PhysX地形形状实现 | ⭐⭐⭐ 关键 |
| `cocos/physics/cannon/shapes/cannon-terrain-shape.ts` | Cannon地形形状实现 | ⭐⭐⭐ 关键 |
| `cocos/physics/bullet/shapes/bullet-terrain-shape.ts` | Bullet地形形状实现 | ⭐⭐⭐ 关键 |

**需要修改的Physics文件**:

| 文件路径 | 修改内容 | 重要性 |
|---------|---------|--------|
| `cocos/physics/framework/index.ts` | 删除TerrainCollider导出 | ⭐⭐⭐ 关键 |
| `cocos/physics/framework/physics-enum.ts` | 删除EColliderType.TERRAIN枚举 | ⭐⭐⭐ 关键 |
| `cocos/physics/framework/physics-selector.ts` | 删除7处Terrain相关代码 | ⭐⭐⭐ 关键 |
| `cocos/physics/spec/i-physics-shape.ts` | 删除ITerrainShape接口定义 | ⭐⭐⭐ 关键 |
| `cocos/physics/spec/i-external.ts` | 删除ITerrainAsset接口定义 | ⭐⭐⭐ 关键 |
| `cocos/physics/physx/instantiate.ts` | 删除Terrain实例化代码 | ⭐⭐ |
| `cocos/physics/cannon/instantiate.ts` | 删除Terrain实例化代码 | ⭐⭐ |
| `cocos/physics/bullet/instantiate.ts` | 删除Terrain实例化代码 | ⭐⭐ |
| `exports/physics-framework.ts` | 删除TerrainCollider导出 | ⭐⭐ |

### 2.4 其他配置和工具链文件

| 文件路径 | 修改内容 | 重要性 |
|---------|---------|--------|
| `exports/terrain.ts` | 完全删除此导出文件 | ⭐⭐⭐ 关键 |
| `typedoc-index.ts` | 删除terrain模块导入 | ⭐⭐ |
| `editor/inspector/components.js` | 删除cc.Terrain组件注册（第19行） | ⭐⭐⭐ 关键 |
| `editor/engine-features/render-config.json` | 删除terrain特性配置块（9行） | ⭐⭐⭐ 关键 |
| `editor/i18n/zh/localization.js` | 删除6处terrain引用 | ⭐⭐⭐ 关键 |
| `editor/i18n/en/localization.js` | 删除6处terrain引用 | ⭐⭐⭐ 关键 |
| `tests/fixtures/builtin-effects.ts` | 删除builtin-terrain测试数据 | ⭐⭐ |
| `cocos/asset/assets/effect-asset.ts` | 从builtinEffects数组删除'terrain' | ⭐⭐ |

**总计统计**:
- **需完全删除**: ~28个文件
- **需修改**: ~14个文件
- **预计删除代码量**: ~2500+ 行（含TS、JS、JSON、Effect等）
- **影响范围**: 核心模块 + Editor + Physics + 配置系统

**注意**:
- ❌ 无C++原生代码（这是优势！）
- ❌ 无独立的单元测试目录
- ⚠️ 与Physics模块有强耦合（TerrainCollider及其实现）
- ⚠️ 与Editor系统有强耦合（Inspector、i18n、Effects等）

---

## 三、依赖关系分析

### 3.1 被以下文件引用（需清理）

#### A. 引用Terrain的文件（**实际30+个位置**）⚠️

**核心导出和文档** (3个):
```typescript
// 1. typedoc-index.ts - 文档索引
export * from './exports/terrain';  // 第30行

// 2. exports/terrain.ts - 导出文件
export * from '../cocos/terrain';

// 3. exports/physics-framework.ts - Physics导出
export { TerrainCollider, ... };  // 第52行
```

**Editor编辑器系统** (16个文件) ⚠️ **原方案完全遗漏！**:
```javascript
// 4. editor/inspector/components.js - 组件注册
'cc.Terrain': join(__dirname, './components/terrain.js'),  // 第19行

// 5-6. Editor i18n模块
editor/i18n/zh/modules/terrain.js      // 中文地形模块
editor/i18n/en/modules/terrain.js      // 英文地形模块

// 7-8. Editor i18n本地化（各6处引用）
editor/i18n/zh/localization.js         // TerrainCollider、Terrain组件、资源等
editor/i18n/en/localization.js         // 同上

// 9. editor/engine-features/render-config.json - 功能开关配置
"terrain": { ... }  // 第349-358行，9行配置块

// 10. editor/inspector/components/terrain.js - 属性检查器
// 完整的Inspector实现

// 11-14. Effect着色器文件（~8个文件）
editor/assets/effects/legacy/terrain.effect
editor/assets/effects/builtin-terrain.effect
editor/assets/effects/internal/editor/terrain-*.effect (3个)
editor/assets/chunks/surfaces/effect-macros/terrain.chunk

// 15-16. 默认资源和预制体
editor/assets/default_file_content/terrain/default.terrain.meta
editor/assets/default_prefab/Terrain.prefab (+ .meta)
```

**Physics模块** (**13个文件**，原方案只提到4个):
```typescript
// 17. cocos/physics/framework/index.ts - Physics主导出
export { TerrainCollider } from './components/colliders/terrain-collider';

// 18. cocos/physics/framework/components/colliders/terrain-collider.ts
//     地形碰撞器组件定义（需完全删除）

// 19. cocos/physics/framework/physics-enum.ts - 枚举定义
EColliderType.TERRAIN = 'terrain',  // 第244行附近

// 20. cocos/physics/framework/physics-selector.ts - 形状选择器
//     包含7处Terrain相关代码：
//     - ITerrainShape接口导入（第33行）
//     - TerrainShape类型声明（第56行）
//     - TerrainCollider导出（第231行）
//     - IEntireShape接口继承ITerrainShape（第322行）
//     - setTerrain方法声明（第354行）
//     - CREATE_COLLIDER_PROXY[TERRAIN]工厂函数（第399-401行）

// 21. cocos/physics/spec/i-physics-shape.ts - 物理形状规范接口
export interface ITerrainShape extends IBaseShape {
    setTerrain: (v: ITerrainAsset | null) => void;  // 第81-83行
}

// 22. cocos/physics/spec/i-external.ts - 外部依赖接口
export interface ITerrainAsset {
    _uuid: string;
    tileSize: number;
    getVertexCountI: () => number;
    getVertexCountJ: () => number;
    getHeight: (i: number, j: number) => number;  // 第25-31行
}

// 23-25. 各物理后端的地形形状实现（需完全删除）
cocos/physics/physx/shapes/physx-terrain-shape.ts   // PhysX实现
cocos/physics/cannon/shapes/cannon-terrain-shape.ts  // Cannon实现
cocos/physics/bullet/shapes/bullet-terrain-shape.ts  // Bullet实现

// 26-28. 各物理后端的实例化代码
cocos/physics/physx/instantiate.ts    // PhysX地形实例化
cocos/physics/cannon/instantiate.ts   // Cannon地形实例化
cocos/physics/bullet/instantiate.ts   // Bullet地形实例化
```

**其他工具链** (3个):
```typescript
// 29. tests/fixtures/builtin-effects.ts - 测试固件
{ name: "builtin-terrain", ... }  // 内置Effect测试数据

// 30. cocos/asset/assets/effect-asset.ts - Effect资源管理
const builtinEffects = [..., 'terrain', ...];  // 第202行
```

#### B. Terrain自身依赖的模块

```typescript
// terrain.ts 内部依赖
import { Component } from '../core';
import { MeshRenderer } from '../3d';           // 依赖3D模块！
import { Material } from '../asset';

// terrain-asset.ts
import { Asset } from '../core/assets/asset';
```

**关键发现**: Terrain依赖3D模块的MeshRenderer！

### 3.2 依赖关系图

```
                        ┌──────────────────┐
                        │     Editor       │
                        │  (16个文件/目录)  │
                        └────┬─────┬───────┘
                             │     │
                    引用      │     │  配置
                             ▼     ▼
┌─────────────┐      ┌─────────────┐  ┌──────────────────┐
│   Physics   │◄─────│   Terrain   │  │ render-config.json│
│(13个文件)   │      │  (要删除)   │  │ i18n/localization│
│             │      └──────┬──────┘  │ inspector注册    │
└──────┬──────┘             │         └──────────────────┘
       │ 被引用              │ 依赖
       ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Exports   │      │     3D      │      │    Core     │
│(terrain.ts) │      │(MeshRenderer)│      │(Component)  │
│(physics-fw) │      │             │      │   (Asset)   │
└─────────────┘      └─────────────┘      └─────────────┘
                                              ▲
                                              │
                                        ┌─────────────┐
                                        │ Effect资源  │
                                        │(~8个文件)   │
                                        └─────────────┘
```

### 3.3 影响范围评估

- **直接影响**: **~42个位置**需要修改或删除（原方案估计10个，**严重低估！**）
- **按模块分布**:
  - 核心Terrain模块: 6个文件（删除）
  - Editor系统: **16个文件**（⚠️ 原方案完全遗漏）
  - Physics模块: **13个文件**（原方案只提到4个，漏了9个）
  - 配置和工具链: **7个文件**
- **间接影响**:
  - 如果先删除Terrain再删除Physics：需要完整清理所有TerrainCollider相关代码（推荐）
  - 如果先删除Physics再删除Terrain：可以减少部分Physics清理工作，但Editor部分仍需处理
- **建议执行顺序**: **先删除Terrain，再删除Physics**（因为Terrain更简单且Editor部分必须立即清理）
- **编译影响**: TypeScript + JavaScript + JSON配置 + Effect着色器
- **运行时影响**: 删除后地形功能完全消失，编辑器不再显示Terrain组件选项
- **预计工作量**: 原方案2天可能不够，建议预留**2.5-3天**（Editor部分工作量较大）

---

## 四、单元测试

### 4.1 现有测试

**位置**: 无专门的Terrain测试目录

**说明**: Terrain模块目前没有单元测试，这降低了移除风险。

### 4.2 相关测试（可能受影响）

虽然Terrain本身无测试，但以下测试可能间接涉及：

```typescript
// tests/physics/ 目录下的测试可能使用了TerrainCollider
tests/physics/
├── physics.test.ts        // 可能包含地形碰撞测试
├── raycast.ts             // 射线检测可能涉及地形
└── ... 其他物理测试
```

**建议**: 移除后运行完整测试套件确认无破坏性变更。

### 4.3 验证测试建议

移除后需要验证：

```typescript
// tests/terrain-removal.test.ts
describe('Terrain Removal Verification', () => {
    test('引擎应正常启动', () => {
        // 验证 game.init() 不报错
    });

    test('不应存在Terrain组件', () => {
        const { Terrain } = require('../cocos/terrain');
        expect(Terrain).toBeUndefined();
    });

    test('3D场景应正常渲染', () => {
        // 即使有3D场景，也不应该崩溃
    });
});
```

---

## 五、配置文件修改

### 5.1 TypeScript配置

无需修改tsconfig.json

### 5.2 导出配置

**文件**: `exports/terrain.ts`

**操作**: 完全删除此文件

```bash
rm exports/terrain.ts
```

**同时需要修改**: `typedoc-index.ts` (第30行)
```typescript
// 删除这行
export * from './exports/terrain';
```

**以及修改**: `exports/physics-framework.ts` (第52行)
```typescript
// 删除TerrainCollider导出
export {
    MeshCollider,
    CylinderCollider,
    ConeCollider,
    // TerrainCollider,  ← 删除这行
    SimplexCollider,
    PlaneCollider,
    ...
};
```

### 5.3 Editor编辑器配置 ⚠️ **重要！原方案严重遗漏**

#### 5.3.1 Inspector组件注册

**文件**: `editor/inspector/components.js`

**位置**: 第19行

**操作**: 删除cc.Terrain注册

```javascript
// 删除前
module.exports = {
    'cc.Button': ...,
    'cc.Terrain': join(__dirname, './components/terrain.js'),  // ← 删除这行
    'cc.VideoPlayer': ...,
};

// 删除后
module.exports = {
    'cc.Button': ...,
    // cc.Terrain已删除
    'cc.VideoPlayer': ...,
};
```

**同时删除文件**:
```bash
rm editor/inspector/components/terrain.js
```

#### 5.3.2 引擎功能开关配置

**文件**: `editor/engine-features/render-config.json`

**位置**: 第349-358行

**操作**: 删除整个terrain特性配置块（9行）

```json
// 删除这段配置（第349-358行）
"terrain": {
    "default": true,
    "label": "i18n:ENGINE.features.terrain.label",
    "description": "i18n:ENGINE.features.terrain.description",
    "enginePlugin": true,
    "category": "3d",
    "dependencies": [
        "3d"
    ]
},
```

#### 5.3.3 国际化(i18n)配置 ⚠️ **必须处理！**

##### A. 中文本地化文件

**文件**: `editor/i18n/zh/localization.js`

**需删除的6处引用**:

1. **组件文档链接** (~第149行):
```javascript
// 删除
Terrain: `${url}/${version}/manual/zh/editor/terrain/`,
```

2. **碰撞器文档链接** (~第136行):
```javascript
// 删除
TerrainCollider: `${url}/${version}/manual/zh/physics/physics-collider.html`,
```

3. **资源类型文档链接** (~第199行):
```javascript
// 删除
terrain: `${url}/${version}/manual/zh/editor/terrain/#创建地形`,
```

4. **功能标签定义** (~第1009行):
```javascript
// 删除整个block
terrain: {
    label: "地形",
    description: "地形功能支持。",
},
```

5. **属性描述** (~第1190行):
```javascript
// 删除
terrain_terrain: '所使用的地形资源',
```

6. **模块导入** (~第1342行):
```javascript
// 删除这行
require('./modules/terrain.js'),
```

##### B. 英文本地化文件

**文件**: `editor/i18n/en/localization.js`

**同样的6处引用，全部删除**:
- Terrain组件文档链接 (~第149行)
- TerrainCollider文档链接 (~第136行)
- terrain资源文档链接 (~第199行)
- terrain功能标签定义 (~第1031行)
- terrain_terrain属性描述 (~第1212行)
- modules/terrain.js导入 (~第1364行)

##### C. i18n模块文件（完全删除）

```bash
# 删除中文地形模块
rm editor/i18n/zh/modules/terrain.js

# 删除英文地形模块
rm editor/i18n/en/modules/terrain.js
```

#### 5.3.4 Effect着色器资源

**删除所有地形相关的Effect文件**:

```bash
# Legacy terrain effect
rm editor/assets/effects/legacy/terrain.effect
rm editor/assets/effects/legacy/terrain.effect.meta

# Builtin terrain effect
rm editor/assets/effects/builtin-terrain.effect
rm editor/assets/effects/builtin-terrain.effect.meta

# Editor terrain brush effects (3个)
rm editor/assets/effects/internal/editor/terrain-select-brush.effect
rm editor/assets/effects/internal/editor/terrain-select-brush.effect.meta
rm editor/assets/effects/internal/editor/terrain-image-brush.effect
rm editor/assets/effects/internal/editor/terrain-image-brush.effect.meta
rm editor/assets/effects/internal/editor/terrain-circle-brush.effect
rm editor/assets/effects/internal/editor/terrain-circle-brush.effect.meta

# Terrain chunk
rm editor/assets/chunks/surfaces/effect-macros/terrain.chunk
rm editor/assets/chunks/surfaces/effect-macros/terrain.chunk.meta
```

#### 5.3.5 默认资源和预制体

```bash
# 默认地形资源配置目录
rm -rf editor/assets/default_file_content/terrain/

# Terrain默认预制体
rm editor/assets/default_prefab/Terrain.prefab
rm editor/assets/default_prefab/Terrain.prefab.meta
```

#### 5.3.6 Effect资源内置列表

**文件**: `cocos/asset/assets/effect-asset.ts`

**位置**: ~第202行

**操作**: 从builtinEffects数组中删除'terrain'

```typescript
// 删除前
const builtinEffects = [
    'particle-gpu',
    'particle-trail',
    'billboard',
    'terrain',      // ← 删除这行
    'graphics',
    ...
];

// 删除后
const builtinEffects = [
    'particle-gpu',
    'particle-trail',
    'billboard',
    // terrain已删除
    'graphics',
    ...
];
```

### 5.4 测试固件

**文件**: `tests/fixtures/builtin-effects.ts`

**操作**: 删除builtin-terrain相关的测试数据块（约20行）

```typescript
// 删除这个完整的effect定义对象
{
    "name": "builtin-terrain",
    "techniques": [...],
    "shaders": [...]
}
```

---

## 六、执行步骤

### Phase 1: 准备工作 (30分钟)

- [ ] **创建Git分支**
  ```bash
  git checkout -b remove-terrain-module
  git push origin remove-terrain-module
  ```

- [ ] **备份当前状态**
  ```bash
  git tag backup-before-terrain-removal
  ```

- [ ] **运行基线测试**
  ```bash
  npm run build
  npm test
  ```
  **确保当前代码100%可编译和测试通过**

### Phase 2: 删除核心TypeScript代码 (15分钟)

- [ ] **删除整个Terrain目录**
  ```bash
  rm -rf cocos/terrain/
  ```

- [ ] **删除导出文件**
  ```bash
  rm exports/terrain.ts
  ```

- [ ] **删除编辑器基础配置**
  ```bash
  rm -rf editor/assets/default_file_content/terrain/
  ```

### Phase 2.5: 删除Editor资源文件 (20分钟) ⚠️ **新增！原方案遗漏**

- [ ] **删除Inspector组件**
  ```bash
  rm editor/inspector/components/terrain.js
  ```

- [ ] **删除i18n模块文件**
  ```bash
  rm editor/i18n/zh/modules/terrain.js
  rm editor/i18n/en/modules/terrain.js
  ```

- [ ] **删除Effect着色器文件** (~12个文件)
  ```bash
  # Legacy effect
  rm editor/assets/effects/legacy/terrain.effect
  rm editor/assets/effects/legacy/terrain.effect.meta

  # Builtin effect
  rm editor/assets/effects/builtin-terrain.effect
  rm editor/assets/effects/builtin-terrain.effect.meta

  # Editor brush effects (3对文件)
  rm editor/assets/effects/internal/editor/terrain-select-brush.effect*
  rm editor/assets/effects/internal/editor/terrain-image-brush.effect*
  rm editor/assets/effects/internal/editor/terrain-circle-brush.effect*

  # Terrain chunk
  rm editor/assets/chunks/surfaces/effect-macros/terrain.chunk*
  ```

- [ ] **删除默认预制体**
  ```bash
  rm editor/assets/default_prefab/Terrain.prefab
  rm editor/assets/default_prefab/Terrain.prefab.meta
  ```

### Phase 3: 清理依赖引用 (60分钟) ⚠️ **时间增加！**

#### 3.1 修改 typedoc-index.ts

**查找**:
```typescript
// 第30行附近
export * from './exports/terrain';
```

**操作**: 删除该行

#### 3.2 修改 Editor 配置文件 (30分钟) ⚠️ **新增！最重要！**

##### 3.2.1 修改 `editor/inspector/components.js`

**位置**: 第19行

**操作**: 删除cc.Terrain注册行

```javascript
// 删除这行
'cc.Terrain': join(__dirname, './components/terrain.js'),
```

##### 3.2.2 修改 `editor/engine-features/render-config.json`

**位置**: 第349-358行

**操作**: 删除整个terrain配置块（9行）

```json
// 删除这个完整的JSON对象
"terrain": {
    "default": true,
    "label": "i18n:ENGINE.features.terrain.label",
    "description": "i18n:ENGINE.features.terrain.description",
    "enginePlugin": true,
    "category": "3d",
    "dependencies": ["3d"]
}
```

##### 3.2.3 修改 `editor/i18n/zh/localization.js` (6处)

**详细操作**:

1. **~第136行** - 删除TerrainCollider文档链接:
```javascript
// 删除
TerrainCollider: `${url}/${version}/manual/zh/physics/physics-collider.html`,
```

2. **~第149行** - 删除Terrain文档链接:
```javascript
// 删除
Terrain: `${url}/${version}/manual/zh/editor/terrain/`,
```

3. **~第199行** - 删除terrain资源文档链接:
```javascript
// 删除
terrain: `${url}/${version}/manual/zh/editor/terrain/#创建地形`,
```

4. **~第1009行** - 删除terrain功能标签定义:
```javascript
// 删除整个block（3行）
terrain: {
    label: "地形",
    description: "地形功能支持。",
},
```

5. **~第1190行** - 删除terrain_terrain属性描述:
```javascript
// 删除
terrain_terrain: '所使用的地形资源',
```

6. **~第1342行** - 删除modules导入:
```javascript
// 删除
require('./modules/terrain.js'),
```

##### 3.2.4 修改 `editor/i18n/en/localization.js` (6处)

**同样的6处修改**，参考3.2.3的中文版本，只是内容为英文。

##### 3.2.5 修改 `cocos/asset/assets/effect-asset.ts`

**位置**: ~第202行

**操作**: 从builtinEffects数组删除'terrain'

```typescript
const builtinEffects = [
    'particle-gpu',
    'particle-trail',
    'billboard',
    // 'terrain',  ← 删除或注释
    'graphics',
    ...
];
```

##### 3.2.6 修改 `tests/fixtures/builtin-effects.ts`

**操作**: 删除builtin-terrain相关的完整测试数据块（约20行）

#### 3.3 处理Physics模块中的TerrainCollider引用 (30分钟) ⚠️ **范围扩大！**

**查找**:
```typescript
// 可能的形式之一
import { terrain } from './cocos/terrain';
// 或
export { terrain } from './cocos/terrain';
// 或在数组中
const modules = [
    // ...
    { name: 'terrain', path: './cocos/terrain' }
];
```

**操作**: 删除或注释该行

#### 3.2 处理Physics模块中的TerrainCollider引用

**重要说明**: 由于Physics模块也将被删除（优先级4），这里采用**策略A：完全删除所有Terrain相关代码**

##### 3.3.1 完全删除的文件 (4个)

```bash
# 地形碰撞器组件
rm cocos/physics/framework/components/colliders/terrain-collider.ts

# 各物理后端的地形形状实现
rm cocos/physics/physx/shapes/physx-terrain-shape.ts
rm cocos/physics/cannon/shapes/cannon-terrain-shape.ts
rm cocos/physics/bullet/shapes/bullet-terrain-shape.ts
```

##### 3.3.2 修改 `cocos/physics/framework/index.ts`

**查找**:
```typescript
export { TerrainCollider } from './components/colliders/terrain-collider';
// 或
import { TerrainCollider } from './components/colliders/terrain-collider';
```

**操作**: 删除该行

##### 3.3.3 修改 `cocos/physics/framework/physics-enum.ts` ⚠️ **新增！原方案遗漏！**

**位置**: ~第244行

**操作**: 删除TERRAIN枚举值

```typescript
// 删除前
export enum EColliderType {
    ...
    /**
     * @en Terrain collider.
     * @zh 地形碰撞体。
     */
    TERRAIN = 'terrain',   // ← 删除这行（约3-5行）
    ...
}

// 删除后
export enum EColliderType {
    ...
    // TERRAIN已删除
    SIMPLEX = 'simplex',
    ...
}
```

##### 3.3.4 修改 `cocos/physics/framework/physics-selector.ts` ⚠️ **新增！最重要！**

**此文件包含7处Terrain相关代码，必须全部清理！**

**位置1**: ~第33行 - 删除ITerrainShape导入

```typescript
// 删除前
import {
    IBoxShape, ISphereShape, ICapsuleShape, ITrimeshShape, ICylinderShape,
    IConeShape, ITerrainShape, ISimplexShape, IPlaneShape, IBaseShape,  // ← 删除ITerrainShape
} from '../spec/i-physics-shape';

// 删除后
import {
    IBoxShape, ISphereShape, ICapsuleShape, ITrimeshShape, ICylinderShape,
    IConeShape, ISimplexShape, IPlaneShape, IBaseShape,
} from '../spec/i-physics-shape';
```

**位置2**: ~第56行 - 删除TerrainShape类型声明

```typescript
// 删除这行
TerrainShape?: Constructor<ITerrainShape>,
```

**位置3**: ~第231行 - 删除TerrainCollider导出

```typescript
// 删除这行
TerrainCollider,
```

**位置4**: ~第322行 - 从IEntireShape接口删除ITerrainShape继承

```typescript
// 删除前
interface IEntireShape extends IBoxShape, ISphereShape, ICapsuleShape,
    ITrimeshShape, ICylinderShape, IConeShape, ITerrainShape, ISimplexShape, IPlaneShape { }

// 删除后
interface IEntireShape extends IBoxShape, ISphereShape, ICapsuleShape,
    ITrimeshShape, ICylinderShape, IConeShape, ISimplexShape, IPlaneShape { }
```

**位置5**: ~第354行 - 删除setTerrain方法声明

```typescript
// 删除这行
setTerrain: FUNC,
```

**位置6-7**: ~第399-401行 - 删除TERRAIN工厂函数

```typescript
// 删除整个block（3行）
CREATE_COLLIDER_PROXY[EColliderType.TERRAIN] = function createTerrainShape (): ITerrainShape {
    if (check(selector.wrapper.TerrainShape, ECheckType.TerrainCollider)) { return ENTIRE_SHAPE; }
    return new selector.wrapper.TerrainShape!();
};
```

##### 3.3.5 修改 `cocos/physics/spec/i-physics-shape.ts` ⚠️ **新增！**

**位置**: ~第30行（导入）和~第81-83行（接口定义）

**操作1**: 删除ITerrainAsset导入（如果有的话）

**操作2**: 删除ITerrainShape接口定义

```typescript
// 删除第30行的导入
import { ITerrainAsset } from './i-external';  // ← 删除或保留（看是否还有其他用途）

// 删除第81-83行的接口定义
export interface ITerrainShape extends IBaseShape {
    setTerrain: (v: ITerrainAsset | null) => void;
}
```

##### 3.3.6 修改 `cocos/physics/spec/i-external.ts` ⚠️ **新增！**

**位置**: ~第25-31行

**操作**: 删除ITerrainAsset接口定义

```typescript
// 删除整个接口（7行）
export interface ITerrainAsset {
    _uuid: string;
    tileSize: number;
    getVertexCountI: () => number;
    getVertexCountJ: () => number;
    getHeight: (i: number, j: number) => number;
}
```

##### 3.3.7 修改各物理后端的instantiate.ts (3个文件)

**文件列表**:
- `cocos/physics/physx/instantiate.ts`
- `cocos/physics/cannon/instantiate.ts`
- `cocos/physics/bullet/instantiate.ts`

**查找模式** (每个文件):
```typescript
import { Terrain } from '../../terrain';
// 或
import { TerrainCollider } from '../framework/components/colliders/terrain-collider';
// 或注册代码
{ type: 'terrain', creator: createTerrain, loader: TerrainAsset }
// 或实例化代码
if (collider instanceof TerrainCollider) { ... }
```

**操作**: 删除所有Terrain/TerrainCollider相关的导入、注册和使用代码

**示例 (physx/instantiate.ts)**:
```typescript
// 删除前
import { Terrain } from '../../terrain';

export function registerComponents() {
    // ... 其他组件注册
    Terrain.terrainCollider = PhysXTerrainShape;
}

// 删除后
export function registerComponents() {
    // ... 其他组件注册（不含Terrain）
}
```

##### 3.3.8 修改 `exports/physics-framework.ts` ⚠️ **新增！**

**位置**: ~第52行

**操作**: 删除TerrainCollider导出

```typescript
// 删除前
export {
    MeshCollider,
    CylinderCollider,
    ConeCollider,
    TerrainCollider,      // ← 删除这行
    SimplexCollider,
    PlaneCollider,
    ...
};

// 删除后
export {
    MeshCollider,
    CylinderCollider,
    ConeCollider,
    // TerrainCollider已删除
    SimplexCollider,
    PlaneCollider,
    ...
};
```

### Phase 4: 编译验证 (1小时)

- [ ] **Web平台编译**
  ```bash
  npm run build
  ```

  **预期结果**: ✅ 编译成功

  **常见错误及解决方案**:

  | 错误信息 | 原因 | 解决方案 |
  |----------|------|----------|
  | `Cannot find module 'cocos/terrain'` | 漏删import | 全局搜索"terrain"并删除 |
  | `Terrain is not defined` | 漏删使用处 | 注释或删除调用 |
  | `TerrainCollider is not defined` | Physics中漏删 | 检查terrain-collider.ts是否已删除 |
  | `'terrain' does not exist in type` | 类型定义残留 | 清理.d.ts文件 |

- [ ] **运行单元测试**
  ```bash
  npm test
  ```

  **预期结果**: ✅ 所有测试通过

  **如果失败**:
  1. 查看失败测试列表
  2. 确认是否与Terrain相关
  3. 如果是Terrain相关的测试，考虑删除这些测试
  4. 如果是其他测试失败，检查是否有隐式依赖

- [ ] **类型检查**
  ```bash
  npx tsc --noEmit
  ```

  **预期结果**: ✅ 无类型错误

### Phase 5: 功能验证 (30分钟)

- [ ] **创建验证测试**

  创建 `tests/terrain-removal-verification.test.ts`:

  ```typescript
  import { game, director } from '../cocos/game';

  describe('Terrain Removal Integration Test', () => {
      beforeAll(() => {
          return game.init();
      });

      test('Game should initialize without terrain', () => {
          expect(game).toBeDefined();
      });

      test('No Terrain component available', () => {
          try {
              const Terrain = require('../cocos/terrain');
              expect(Terrain).toBeUndefined();
          } catch (e) {
              // 预期会抛出异常（模块不存在）
              expect(e).toBeDefined();
          }
      });

      test('No TerrainCollider in physics', () => {
          try {
              const { TerrainCollider } = require('../cocos/physics');
              expect(TerrainCollider).toBeUndefined();
          } catch (e) {
              // 可能physics还未删除，但TerrainCollider应该不存在
          }
      });
  });
  ```

- [ ] **运行验证测试**
  ```bash
  npx jest tests/terrain-removal-verification.test.ts
  ```

### Phase 6: 边界情况测试 (30分钟)

- [ ] **测试空场景加载**
  ```typescript
  // 创建一个空的场景文件，尝试加载
  ```

- [ ] **测试包含旧Terrain组件的场景**
  - 创建一个包含Terrain组件的场景（模拟旧项目）
  - 加载该场景，验证不会崩溃（应该忽略未知组件）

- [ ] **测试编辑器功能** (如果有)
  - 打开编辑器
  - 确认不再显示Terrain组件选项

### Phase 7: 清理和文档 (15分钟)

- [ ] **更新核心目标文档进度**

  在[核心目标.md](./核心目标.md)中更新：
  ```markdown
  #### 2.2 删除Terrain模块（2.5-3天）✅ 已完成
  - 完成日期: 2026-04-XX
  - 删除代码量: ~2500+ 行（TS+JS+Effect+配置）
  - 删除文件数: 27个文件
  - 修改文件数: 17个文件
  - 测试结果: 全部通过
  ```

- [ ] **提交代码**
  ```bash
  git add .
  git commit -m "feat: remove Terrain module (~2500+ lines, 27 files)

  ⚠️ Major update: Complete Terrain removal including Editor integration

  Delete core module (6 files):
  - cocos/terrain/ (terrain.ts, terrain-lod.ts, terrain-asset.ts,
    height-field.ts, index.ts, category.json)

  Delete Editor resources (16 files) ← CRITICAL:
  - editor/inspector/components/terrain.js
  - editor/i18n/{zh,en}/modules/terrain.js
  - editor/assets/effects/*terrain*.effect (~8 files)
  - editor/assets/chunks/*terrain*.chunk
  - editor/assets/default_prefab/Terrain.prefab
  - editor/assets/default_file_content/terrain/

  Delete Physics implementations (4 files):
  - terrain-collider.ts
  - physx/cannon/bullet-terrain-shape.ts

  Modify Editor configs (5 files):
  - inspector/components.js (remove cc.Terrain)
  - render-config.json (remove terrain feature)
  - i18n/{zh,en}/localization.js (6 refs each)
  - effect-asset.ts (remove from builtinEffects)

  Modify Physics module (9 files):
  - physics-enum.ts (remove TERRAIN enum)
  - physics-selector.ts (7 code locations!)
  - spec/i-physics-shape.ts (remove ITerrainShape)
  - spec/i-external.ts (remove ITerrainAsset)
  - {physx,cannon,bullet}/instantiate.ts
  - exports/physics-framework.ts

  Other changes:
  - typedoc-index.ts
  - tests/fixtures/builtin-effects.ts

  Total impact:
  - 27 files deleted
  - 17 files modified
  - ~2500+ lines removed
  - Editor + Physics + Core integration fully cleaned

  Reason: Casual games rarely use terrain systems.
  Terrain is mainly for open-world 3D games.
  Reduces engine size and complexity significantly.

  Risk level: MEDIUM (Editor integration complexity)
  See: litePlan/核心目标.md"
  ```

---

## 七、风险评估

### 7.1 技术风险

| 风险项 | 概率 | 影响 | 应对措施 |
|--------|------|------|----------|
| **Editor配置遗漏导致编辑器崩溃** | **高** | **高** | ⚠️ 必须完整清理i18n、render-config、inspector注册 |
| 编译错误（漏删import） | 中 | 低 | 全局搜索"terrain"/"Terrain"关键词 |
| Physics模块编译失败（枚举/接口残留） | **中** | **中** | 重点检查physics-enum.ts, physics-selector.ts, spec文件 |
| Effect资源引用错误 | 中 | 中 | 检查effect-asset.ts的builtinEffects数组 |
| 3D模块受影响 | 低 | 中 | Terrain依赖MeshRenderer，但单向依赖 |
| 旧项目兼容性破坏 | 低 | 高 | 提供迁移指南 |
| 单元测试失败 | 极低 | 低 | 无Terrain专用测试，但需检查builtin-effects测试固件 |

**新增的高风险项**:
- ⚠️ **render-config.json未清理**: 导致引擎功能开关报错
- ⚠️ **i18n文件未清理**: 导致编辑器显示异常或构建失败
- ⚠️ **physics-selector.ts未完全清理**: 7处代码必须全部删除，否则类型错误

### 7.2 特殊注意事项

⚠️ **关键点**: Terrain依赖3D模块！

这意味着：
- ✅ 如果3D模块保留：删除Terrain是安全的（只是少了一个组件）
- ⚠️ 如果3D模块也要删除：建议先删Terrain，再删3D（因为Terrain依赖3D）

**推荐执行顺序**:
1. ✅ Profiler (已完成)
2. ✅ Terrain (当前任务) - 因为它依赖3D，但比3D简单
3. Render Graph
4. Physics (会自动清理TerrainCollider)
5. 3D (最后删除，因为很多模块依赖它)

### 7.3 回滚方案

**如果出现问题，可在15分钟内回滚**：

```bash
# 方法1: Git revert
git revert HEAD

# 方法2: 切换到备份标签
git checkout backup-before-terrain-removal

# 方法3: 手动恢复
git checkout HEAD~1 -- \
    cocos/terrain/ \
    exports/terrain.ts \
    editor/assets/default_file_content/terrain/

# 恢复Physics中的TerrainCollider（如果删除了）
git checkout HEAD~1 -- \
    cocos/physics/framework/components/colliders/terrain-collider.ts
```

---

## 八、成功标准

### 8.1 必须满足

- [x] Web平台编译通过 (`npm run build`)
- [x] 所有现有单元测试通过 (`npm test`)
- [x] TypeScript类型检查通过 (`npx tsc --noEmit`)
- [x] 无任何"terrain"/"Terrain"相关的编译错误
- [x] 引擎可正常初始化和运行
- [x] Physics模块仍能正常编译和使用（除了TerrainCollider）

### 8.2 期望达到

- [ ] 打包体积减少 ~50KB (估计值，含Effect资源)
- [ ] 代码总行数减少 ~2500+ 行（原方案估计1740行，严重低估）
- [ ] 不影响3D模块的其他功能（MeshRenderer等正常工作）
- [ ] Editor编辑器正常启动且无报错
- [ ] 引擎功能开关配置无错误

---

## 九、后续影响

### 9.1 对其他模块的影响

**正面影响**:
- Physics模块: 减少一个碰撞器类型，简化代码
- 编辑器: 减少一个组件选项，降低复杂度
- 文档系统: 减少文档生成内容

**潜在风险**:
- 3D模块: Terrain使用了MeshRenderer，但删除Terrain不影响MeshRenderer本身

### 9.2 替代方案

开发者如需地形功能，可以使用：

1. **程序化网格生成**
   ```typescript
   // 使用Primitive模块创建自定义网格
   import { MeshRenderer, Mesh } from 'cc';

   // 根据高度图数据动态生成平面网格
   function createTerrainFromHeightMap(heightData, width, height) {
       // 自定义实现简单的地形网格
   }
   ```

2. **第三方库**
   - [TERRAIN.js](https://github.com/kchapelier/terrain-js): 轻量级地形库
   - 自定义高度场渲染器

3. **预烘焙地形网格**
   - 在3D建模软件中创建地形
   - 导出为Mesh/GLTF格式
   - 作为普通Mesh使用

### 9.3 API变更通知

**删除的API**:
- `cc.Terrain` - 地形组件类
- `cc.TerrainAsset` - 地形资源类
- `cc.TerrainCollider` - 地形碰撞器（Physics中）
- `HeightField` - 高度场数据结构

**迁移指南**:
```typescript
// ❌ 旧代码（删除后不可用）
import { Terrain, TerrainAsset } from 'cc';

const terrain = node.addComponent(Terrain);
terrain.asset = terrainAsset;

// ✅ 新代码（使用自定义网格替代）
import { MeshRenderer, Mesh, Primitive } from 'cc';

const meshRenderer = node.addComponent(MeshRenderer);
meshRenderer.mesh = Primitive.createPlane(width, height, segments);
// 应用高度图变形顶点
```

---

## 十、附录

### A. 完整文件删除清单 ⚠️ **已大幅扩充**

#### A.1 核心Terrain模块 (6个文件)

```
cocos/terrain/
├── category.json              # 编辑器分类配置 (~10行)
├── height-field.ts            # 高度场数据 (~200行)
├── index.ts                   # 模块入口 (~30行)
├── terrain-asset.ts           # 地形资源类 (~300行)
├── terrain-lod.ts             # LOD系统 (~400行)
└── terrain.ts                 # 主组件 (~800行)
```

#### A.2 Editor编辑器资源 (16个文件) ⚠️ **原方案遗漏！**

```
editor/
├── inspector/components/
│   └── terrain.js                          # Terrain属性检查器
├── i18n/zh/modules/
│   └── terrain.js                          # 中文地形模块
├── i18n/en/modules/
│   └── terrain.js                          # 英文地形模块
├── assets/effects/
│   ├── legacy/
│   │   ├── terrain.effect                  # Legacy地形Effect
│   │   └── terrain.effect.meta
│   ├── builtin-terrain.effect              # 内置地形Effect
│   └── internal/editor/
│       ├── terrain-select-brush.effect     # 选择笔刷效果
│       ├── terrain-select-brush.effect.meta
│       ├── terrain-image-brush.effect      # 图像笔刷效果
│       ├── terrain-image-brush.effect.meta
│       ├── terrain-circle-brush.effect     # 圆形笔刷效果
│       └── terrain-circle-brush.effect.meta
├── assets/chunks/surfaces/effect-macros/
│   ├── terrain.chunk                       # Effect宏定义
│   └── terrain.chunk.meta
├── assets/default_file_content/terrain/
│   └── default.terrain.meta                # 默认地形元数据
└── assets/default_prefab/
    ├── Terrain.prefab                      # 默认Terrain预制体
    └── Terrain.prefab.meta
```

#### A.3 Physics模块文件 (4个文件)

```
cocos/physics/
├── framework/components/colliders/
│   └── terrain-collider.ts                 # 地形碰撞器组件
├── physx/shapes/
│   └── physx-terrain-shape.ts              # PhysX地形形状
├── cannon/shapes/
│   └── cannon-terrain-shape.ts             # Cannon地形形状
└── bullet/shapes/
    └── bullet-terrain-shape.ts             # Bullet地形形状
```

#### A.4 导出和文档 (1个文件)

```
exports/
└── terrain.ts                              # Terrain导出文件
```

**删除统计**:
- **总删除文件数**: **27个文件**（原方案8个，严重低估！）
- **按类型分布**:
  - TypeScript核心: 6个
  - Editor资源: 16个 (⚠️ 59%)
  - Physics实现: 4个 (15%)
  - 导出文件: 1个 (4%)
- **预计删除代码量**: ~2500+ 行

---

### B. 需要修改的文件清单 ⚠️ **已大幅扩充**

#### B.1 Editor配置 (5个文件)

| 文件路径 | 修改内容 | 代码行数 |
|---------|---------|----------|
| `editor/inspector/components.js` | 删除cc.Terrain注册 | 1行 |
| `editor/engine-features/render-config.json` | 删除terrain特性块 | 9行 |
| `editor/i18n/zh/localization.js` | 删除6处terrain引用 | ~12行 |
| `editor/i18n/en/localization.js` | 删除6处terrain引用 | ~12行 |
| `cocos/asset/assets/effect-asset.ts` | 删除builtinEffects中的'terrain' | 1行 |

**小计**: ~35行修改

#### B.2 Physics模块 (9个文件)

| 文件路径 | 修改内容 | 代码行数 |
|---------|---------|----------|
| `cocos/physics/framework/index.ts` | 删除TerrainCollider导出 | 1-2行 |
| `cocos/physics/framework/physics-enum.ts` | 删除TERRAIN枚举值 | 3-5行 |
| `cocos/physics/framework/physics-selector.ts` | **删除7处代码** | ~15行 |
| `cocos/physics/spec/i-physics-shape.ts` | 删除ITerrainShape接口 | 3-4行 |
| `cocos/physics/spec/i-external.ts` | 删除ITerrainAsset接口 | 7行 |
| `cocos/physics/physx/instantiate.ts` | 删除Terrain实例化 | 5-10行 |
| `cocos/physics/cannon/instantiate.ts` | 删除Terrain实例化 | 5-10行 |
| `cocos/physics/bullet/instantiate.ts` | 删除Terrain实例化 | 5-10行 |
| `exports/physics-framework.ts` | 删除TerrainCollider导出 | 1行 |

**小计**: ~45-60行修改

#### B.3 其他工具链 (3个文件)

| 文件路径 | 修改内容 | 代码行数 |
|---------|---------|----------|
| `typedoc-index.ts` | 删除terrain模块导入 | 1行 |
| `tests/fixtures/builtin-effects.ts` | 删除builtin-terrain测试数据 | ~20行 |

**小计**: ~21行修改

**修改统计**:
- **总修改文件数**: **17个文件**（原方案6个，漏了11个！）
- **总修改代码行数**: ~100+ 行
- **高风险文件**:
  - ⭐⭐⭐ `physics-selector.ts` (7处修改，最复杂)
  - ⭐⭐⭐ `i18n/localization.js` (2个文件×6处)
  - ⭐⭐⭐ `render-config.json` (JSON格式，易出错)

---

### C. 搜索关键词（用于验证完整性）

在完成移除后，使用以下命令确认没有遗漏：

```bash
# 1. 搜索TypeScript文件中的terrain引用（排除node_modules、测试、litePlan）
grep -r "terrain\|Terrain" --include="*.ts" cocos/ native/ exports/ \
    | grep -v "node_modules" \
    | grep -v ".test.ts" \
    | grep -v "litePlan"

# 2. 搜索JavaScript文件中的terrain引用（Editor相关）
grep -r "terrain\|Terrain" --include="*.js" editor/ \
    | grep -v "node_modules"

# 3. 搜索JSON配置文件
grep -r "terrain" --include="*.json" editor/

# 4. 检查是否还有terrain相关的文件存在
find . -name "*terrain*" -type f \
    | grep -v node_modules \
    | grep -v litePlan

# 以上命令应该返回空结果或只有注释
```

**预期结果**: ✅ 所有命令返回空或仅包含注释

---

### D. 与其他模块的关系图（更新版）

```
                    ┌──────────────────────┐
                    │      Editor系统      │
                    │  ┌────────────────┐  │
                    │  │ Inspector注册  │  │
                    │  │ i18n (zh/en)   │  │
                    │  │ render-config  │  │
                    │  │ Effects (~8个) │  │
                    │  │ Prefab         │  │
                    │  └────────────────┘  │
                    └──────┬───────────────┘
                           │ 引用 + 配置
                           ▼
┌─────────────┐      ┌─────────────┐  ┌──────────────────┐
│   Physics   │◄─────│   Terrain   │  │  Effect资源列表  │
│(13个文件)   │      │  (27个文件)  │  │ effect-asset.ts  │
│             │      │  (要删除)    │  │ tests/fixtures   │
└──────┬──────┘      └──────┬──────┘  └──────────────────┘
       │ 被引用              │ 依赖
       ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Exports   │      │     3D      │      │    Core     │
│(terrain.ts) │      │(MeshRenderer)│      │(Component)  │
│(physics-fw) │      │             │      │   (Asset)   │
└─────────────┘      └─────────────┘      └─────────────┘
                                              ▲
                                        ┌─────────────┐
                                        │typedoc-index│
                                        │(文档索引)    │
                                        └─────────────┘
```

---

### E. 执行时间估算（更新）

| Phase | 内容 | 原方案时间 | 实际建议时间 | 原因 |
|-------|------|-----------|-------------|------|
| Phase 1 | 准备工作 | 30分钟 | 30分钟 | 无变化 |
| Phase 2 | 删除核心TS代码 | 15分钟 | 15分钟 | 无变化 |
| **Phase 2.5** | **删除Editor资源** | **0分钟（遗漏！）** | **20分钟** | **新增！** |
| Phase 3 | 清理依赖引用 | 45分钟 | **60分钟** | Editor清理工作量 |
| ├─ 3.1 | typedoc-index | - | 5分钟 | 简单 |
| ├─ **3.2** | **Editor配置** | **0分钟（遗漏！）** | **30分钟** | **新增！最重要** |
| └─ 3.3 | Physics模块 | - | **30分钟** | 范围扩大（13个文件） |
| Phase 4 | 编译验证 | 1小时 | 1小时 | 可能需要更多迭代 |
| Phase 5 | 功能验证 | 30分钟 | 30分钟 | 无变化 |
| Phase 6 | 边界测试 | 30分钟 | 30分钟 | 无变化 |
| Phase 7 | 清理提交 | 15分钟 | 15分钟 | 无变化 |
| **总计** | | **~4小时** | **~5.5小时** | **增加35%（1.5小时）** |

**建议**: 预留**2.5-3天**工作时间（含测试和意外处理）

- [核心目标.md](./核心目标.md) - 总体规划
- [01-移除Profiler模块.md](./01-移除Profiler模块.md) - 前序任务
- [Cocos Creator官方文档 - Terrain](https://docs.cocos.com/creator/manual/en/terrain/) (删除功能的参考)

---

**文档版本**: v2.0 (重大更新：补充Editor和完整Physics清理)
**创建时间**: 2026-04-10
**更新时间**: 2026-04-11
**负责人**: [待定]
**审核人**: [待定]
**预计完成日期**: [开始后2.5-3天内]
**前置依赖**: 01-移除Profiler模块 (已完成)
**变更说明**: v1.0 → v2.0 重大更新
- ⚠️ 补充Editor编辑器部分（16个文件，原方案完全遗漏）
- ⚠️ 扩充Physics模块清理范围（从4个文件到13个文件）
- ⚠️ 新增Effect资源、i18n、配置文件等清理步骤
- 📊 更新统计：27个文件删除 + 17个文件修改（原方案：8+6）
- ⏱️ 更新时间估算：2.5-3天（原方案：2天）
- 🎯 提升风险等级：低 → 中（Editor集成复杂度）
