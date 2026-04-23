# Physics 模块移除方案 (含 2D 物理)

> **优先级**: 4 | **预计时间**: 1-2周 (7-10个工作日) | **风险等级**: ⭐⭐⭐⭐⭐ 极高

---

## 一、模块概述

### 1.1 功能描述

Physics模块提供完整的2D/3D物理模拟系统，包括两个子模块：
- **cocos/physics/** - 3D物理模块
- **cocos/physics-2d/** - 2D物理模块 ⚠️ **原方案遗漏**

#### 核心功能
- **刚体动力学** (Rigid Body Dynamics)
- **碰撞检测** (Collision Detection)
- **约束系统** (Constraints/Joints)
- **角色控制器** (Character Controller)
- **物理材质** (Physics Material)
- **射线检测** (Raycasting)
- **碰撞过滤** (Collision Filtering)
- **碰撞矩阵** (Collision Matrix)
- **物理事件** (Collision Events)

#### 支持的物理后端

**3D物理后端 (cocos/physics/)**:
1. **Builtin** - 内置简单物理引擎（轻量级）
2. **Cannon.js** - 纯JavaScript物理引擎（Web平台）
3. **Bullet** - C++物理引擎（原生平台）
4. **PhysX** - NVIDIA高性能物理引擎（原生平台，推荐）

**2D物理后端 (cocos/physics-2d/) ⚠️ 原方案遗漏**:
1. **Builtin** - 内置简单2D物理引擎
2. **Box2D** - Box2D物理引擎（Web平台）
3. **Box2D-JSB** - Box2D原生绑定（原生平台）
4. **Box2D-WASM** - Box2D WebAssembly版本

### 1.2 模块架构

```
Physics 模块架构（3D + 2D）：

==================== 3D Physics (cocos/physics/) ====================

cocos/physics/
├── framework/                    # 核心框架层
│   ├── index.ts                  # 公共API导出
│   ├── physics-system.ts         # 物理系统主类
│   ├── physics-selector.ts       # 后端选择器
│   ├── physics-interface.ts      # 物理接口定义
│   ├── physics-config.ts         # 配置管理
│   ├── physics-enum.ts           # 枚举定义
│   ├── physics-ray-result.ts     # 射线检测结果
│   ├── collision-matrix.ts       # 碰撞矩阵
│   ├── deprecated.ts             # 废弃API
│   └── components/               # 组件层
│       ├── rigid-body.ts         # 刚体组件
│       ├── constant-force.ts     # 常力组件
│       ├── colliders/            # 碰撞器集合
│       │   ├── collider.ts       # 碰撞器基类
│       │   ├── box-collider.ts
│       │   ├── sphere-collider.ts
│       │   ├── capsule-collider.ts
│       │   ├── cylinder-collider.ts
│       │   ├── cone-collider.ts
│       │   ├── plane-collider.ts
│       │   ├── mesh-collider.ts
│       │   └── simplex-collider.ts
│       ├── constraints/          # 约束集合
│       │   ├── constraint.ts     # 约束基类
│       │   ├── fixed-constraint.ts
│       │   ├── point-to-point-constraint.ts
│       │   ├── hinge-constraint.ts
│       │   └── configurable-constraint.ts
│       └── character-controllers/# 角色控制器
│           ├── character-controller.ts
│           ├── capsule-character-controller.ts
│           └── box-character-controller.ts
│
├── spec/                         # 接口规范定义
│   ├── i-physics-world.ts
│   ├── i-physics-shape.ts
│   ├── i-rigid-body.ts
│   ├── i-physics-constraint.ts
│   ├── i-character-controller.ts
│   ├── i-lifecycle.ts
│   ├── i-group-mask.ts
│   ├── i-external.ts
│   └── i-physics-shape.ts
│
├── utils/                        # 工具函数
│   ├── util.ts                   # ⚠️ 被 3D 模块引用！
│   ├── tuple-dictionary.ts
│   ├── object-collision-matrix.ts
│   └── array-collision-matrix.ts
│
├── cocos/                        # Builtin后端实现
│   ├── builtin-world.ts
│   ├── builtin-interface.ts
│   ├── builtin-rigid-body.ts
│   ├── builtin-shared-body.ts
│   ├── instantiate.ts
│   ├── object/
│   │   └── builtin-object.ts
│   └── shapes/
│       ├── builtin-shape.ts
│       ├── builtin-box-shape.ts
│       ├── builtin-sphere-shape.ts
│       └── builtin-capsule-shape.ts
│
├── cannon/                       # Cannon.js后端
├── bullet/                       # Bullet后端
├── physx/                        # PhysX后端 (最完整)
└── category.json                 # 编辑器分类


==================== 2D Physics (cocos/physics-2d/) ⚠️ 原方案完全遗漏 ====================

cocos/physics-2d/
├── framework/                    # 2D框架层
│   ├── index.ts                  # 公共API导出
│   ├── physics-system.ts         # 2D物理系统主类
│   ├── physics-selector.ts       # 后端选择器
│   ├── physics-types.ts          # 类型定义
│   ├── physics-internal-types.ts # 内部类型
│   └── components/               # 2D组件层
│       ├── rigid-body-2d.ts      # 2D刚体组件
│       ├── colliders/            # 2D碰撞器集合
│       │   ├── collider-2d.ts    # 2D碰撞器基类
│       │   ├── box-collider-2d.ts
│       │   ├── circle-collider-2d.ts
│       │   └── polygon-collider-2d.ts
│       └── joints/               # 2D关节集合
│           ├── joint-2d.ts       # 2D关节基类
│           ├── distance-joint-2d.ts
│           ├── fixed-joint-2d.ts
│           ├── hinge-joint-2d.ts
│           ├── mouse-joint-2d.ts
│           ├── relative-joint-2d.ts
│           ├── slider-joint-2d.ts
│           ├── spring-joint-2d.ts
│           └── wheel-joint-2d.ts
│
├── utils/                        # 工具函数
│   ├── polygon-partition.ts
│   └── polygon-separator.ts
│
├── spec/                         # 2D接口规范
│   ├── i-physics-world.ts
│   ├── i-physics-shape.ts
│   ├── i-physics-joint.ts
│   ├── i-rigid-body.ts
│   └── i-physics-contact.ts
│
├── builtin/                      # Builtin 2D后端
│   ├── builtin-world.ts
│   ├── builtin-contact.ts
│   ├── instantiate.ts
│   ├── intersection-2d.ts        # 2D相交检测
│   └── shapes/
│       ├── shape-2d.ts
│       ├── box-shape-2d.ts
│       ├── circle-shape-2d.ts
│       └── polygon-shape-2d.ts
│
├── box2d/                        # Box2D后端 (Web)
│   ├── physics-world.ts
│   ├── rigid-body.ts
│   ├── physics-contact.ts
│   ├── instantiate.ts
│   ├── platform/                 # 平台相关
│   │   ├── physics-aabb-query-callback.ts
│   │   ├── physics-contact-listener.ts
│   │   ├── physics-debug-draw.ts
│   │   └── physics-ray-cast-callback.ts
│   ├── shapes/                   # Box2D形状
│   └── joints/                   # Box2D关节 (9种)
│
├── box2d-jsb/                    # Box2D JSB后端 (原生)
│   └── (结构与 box2d/ 类似)
│
├── box2d-wasm/                   # Box2D WASM后端
│   └── (结构与 box2d/ 类似)
│
└── category.json                 # 编辑器分类


native/cocos/physics/             # C++原生实现 (仅3D物理)
├── spec/                         # 接口规范 (C++)
├── sdk/                          # SDK抽象层
└── physx/                        # PhysX C++实现
```

### 1.3 移除理由

根据[核心目标.md](./核心目标.md)，Physics模块应该被完全删除，原因：
- ✅ 休闲游戏物理需求简单（AABB碰撞足够）
- ✅ 可用第三方轻量库替代（Matter.js, Planck.js等）
- ✅ Physics是最大的模块之一（~170+文件）
- ✅ 多后端维护成本高（4个后端要同步维护）
- ✅ 大幅减少引擎复杂度和打包体积
- ✅ 符合AI友好原则（物理API复杂度极高）

**重要提示**: 这是最具挑战性的移除任务！

---

## 二、代码清单

### 2.1 TypeScript代码（需删除）

#### A. Physics框架核心 (~15个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `cocos/physics/index.ts` | ~30 | 模块入口 |
| `cocos/physics/category.json` | ~10 | 分类配置 |
| `cocos/physics/framework/index.ts` | ~50 | 框架入口 |
| `cocos/physics/framework/physics-system.ts` | ~800 | 物理系统主类 |
| `cocos/physics/framework/physics-selector.ts` | ~200 | 后端选择器 |
| `cocos/physics/framework/physics-interface.ts` | ~400 | 接口定义 |
| `cocos/physics/framework/physics-config.ts` | ~150 | 配置管理 |
| `cocos/physics/framework/physics-enum.ts` | ~100 | 枚举类型 |
| `cocos/physics/framework/physics-ray-result.ts` | ~80 | 射线结果 |
| `cocos/physics/framework/collision-matrix.ts` | ~200 | 碰撞矩阵 |
| `cocos/physics/framework/deprecated.ts` | ~100 | 废弃API |
| **小计** | **~2220行** | |

#### B. 组件层 (~18个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `framework/components/rigid-body.ts` | ~600 | 刚体组件 |
| `framework/components/constant-force.ts` | ~80 | 常力组件 |
| `framework/components/colliders/collider.ts` | ~400 | 碰撞器基类 |
| `framework/components/colliders/box-collider.ts` | ~150 | 盒子碰撞器 |
| `framework/components/colliders/sphere-collider.ts` | ~120 | 球碰撞器 |
| `framework/components/colliders/capsule-collider.ts` | ~130 | 胶囊碰撞器 |
| `framework/components/colliders/cylinder-collider.ts` | ~130 | 圆柱碰撞器 |
| `framework/components/colliders/cone-collider.ts` | ~120 | 锥体碰撞器 |
| `framework/components/colliders/plane-collider.ts` | ~100 | 平面碰撞器 |
| `framework/components/colliders/mesh-collider.ts` | ~200 | 网格碰撞器 |
| `framework/components/colliders/simplex-collider.ts` | ~150 | 单纯形碰撞器 |
| `framework/components/constraints/constraint.ts` | ~300 | 约束基类 |
| `framework/components/constraints/fixed-constraint.ts` | ~120 | 固定约束 |
| `framework/components/constraints/point-to-point-constraint.ts` | ~150 | 点约束 |
| `framework/components/constraints/hinge-constraint.ts` | ~150 | 铰链约束 |
| `framework/components/constraints/configurable-constraint.ts` | ~200 | 可配置约束 |
| `framework/components/character-controllers/character-controller.ts` | ~400 | 角色控制器基类 |
| `framework/components/character-controllers/capsule-character-controller.ts` | ~200 | 胶囊控制器 |
| `framework/components/character-controllers/box-character-controller.ts` | ~180 | 盒子控制器 |
| `framework/components/assets/physics-material.ts` | ~150 | 物理材质 |
| **小计** | **~3930行** | |

#### C. 接口规范 (~9个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `spec/i-physics-world.ts` | ~250 | 世界接口 |
| `spec/i-physics-shape.ts` | ~200 | 形状接口 |
| `spec/i-rigid-body.ts` | ~300 | 刚体接口 |
| `spec/i-physics-constraint.ts` | ~200 | 约束接口 |
| `spec/i-character-controller.ts` | ~200 | 角色控制器接口 |
| `spec/i-lifecycle.ts` | ~100 | 生命周期接口 |
| `spec/i-group-mask.ts` | ~80 | 分组掩码接口 |
| `spec/i-external.ts` | ~50 | 外部接口 |
| **小计** | **~1380行** | |

#### D. 工具函数 (~4个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `utils/util.ts` | ~300 | 通用工具 |
| `utils/tuple-dictionary.ts` | ~150 | 元组字典 |
| `utils/object-collision-matrix.ts` | ~200 | 对象碰撞矩阵 |
| `utils/array-collision-matrix.ts` | ~180 | 数组碰撞矩阵 |
| **小计** | **~830行** | |

#### E. Builtin后端 (~8个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `cocos/builtin-world.ts` | ~400 | 内置世界 |
| `cocos/builtin-interface.ts` | ~300 | 内置接口 |
| `cocos/builtin-rigid-body.ts` | ~350 | 内置刚体 |
| `cocos/builtin-shared-body.ts` | ~300 | 共享刚体 |
| `cocos/instantiate.ts` | ~100 | 实例化 |
| `cocos/object/builtin-object.ts` | ~200 | 内置对象 |
| `cocos/shapes/builtin-shape.ts` | ~200 | 形状基类 |
| `cocos/shapes/builtin-box-shape.ts` | ~150 | 盒子形状 |
| `cocos/shapes/builtin-sphere-shape.ts` | ~150 | 球形状 |
| `cocos/shapes/builtin-capsule-shape.ts` | ~150 | 胶囊形状 |
| **小计** | **~2300行** | |

#### F. Cannon.js后端 (~20个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `cannon/cannon-world.ts` | ~500 | Cannon世界 |
| `cannon/cannon-rigid-body.ts` | ~400 | Cannon刚体 |
| `cannon/cannon-shared-body.ts` | ~350 | 共享刚体 |
| `cannon/cannon-contact-equation.ts` | ~200 | 接触方程 |
| `cannon/cannon-util.ts` | ~300 | 工具函数 |
| `cannon/instantiate.ts` | ~150 | 实例化 |
| `cannon/shapes/*` (8个文件) | ~1600 | 各种形状 |
| `cannon/constraints/*` (6个文件) | ~900 | 各种约束 |
| **小计** | **~4400行** | |

#### G. Bullet后端 (~25个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `bullet/bullet-world.ts` | ~500 | Bullet世界 |
| `bullet/bullet-rigid-body.ts` | ~400 | Bullet刚体 |
| `bullet/bullet-shared-body.ts` | ~350 | 共享刚体 |
| `bullet/bullet-interface.ts` | ~300 | Bullet接口 |
| `bullet/bullet-env.ts` | ~200 | 环境配置 |
| `bullet/bullet-utils.ts` | ~250 | 工具函数 |
| `bullet/bullet-cache.ts` | ~200 | 缓存系统 |
| `bullet/bullet-enum.ts` | ~100 | 枚举类型 |
| `bullet/bullet-contact-data.ts` | ~150 | 接触数据 |
| `bullet/instantiate.ts` | ~150 | 实例化 |
| `bullet/instantiated.ts` | ~100 | 已实例化 |
| `bullet/shapes/*` (11个文件) | ~2200 | 各种形状+BVH |
| `bullet/constraints/*` (6个文件) | ~900 | 各种约束 |
| `bullet/character-controllers/*` (3个文件) | ~600 | 角色控制器 |
| **小计** | **~6300行** | |

#### H. PhysX后端 (~25个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `physx/physx-world.ts` | ~600 | PhysX世界 |
| `physx/physx-rigid-body.ts` | ~500 | PhysX刚体 |
| `physx/physx-shared-body.ts` | ~400 | 共享刚体 |
| `physx/physx-adapter.ts` | ~300 | 适配器 |
| `physx/physx-instance.ts` | ~250 | 实例管理 |
| `physx/physx-contact-equation.ts` | ~200 | 接触方程 |
| `physx/physx-enum.ts` | ~150 | 枚举类型 |
| `physx/instantiate.ts` | ~150 | TS实例化 |
| `physx/instantiate.jsb.ts` | ~100 | JSB实例化 |
| `physx/shapes/*` (10个文件) | ~2000 | 各种形状 |
| `physx/joints/*` (7个文件) | ~1400 | 各种关节 |
| `physx/character-controllers/*` (4个文件) | ~800 | 角色控制器 |
| **小计** | ~**6850行** | |

**TypeScript总计**: **~28,210行** (约100个文件)

### 2.2 C++原生代码（需删除）

#### A. 接口规范 (6个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `native/cocos/physics/spec/IWorld.h` | ~150 | 世界接口 |
| `native/cocos/physics/spec/IShape.h` | ~120 | 形状接口 |
| `native/cocos/physics/spec/IBody.h` | ~150 | 刚体接口 |
| `native/cocos/physics/spec/IJoint.h` | ~100 | 关节接口 |
| `native/cocos/physics/spec/ICharacterController.h` | ~120 | 角色控制器接口 |
| `native/cocos/physics/spec/ILifecycle.h` | ~80 | 生命周期接口 |
| **小计** | **~720行** | |

#### B. SDK抽象层 (10个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `sdk/World.cpp` | ~400 | 世界实现 |
| `sdk/World.h` | ~150 | 世界头文件 |
| `sdk/Shape.cpp` | ~300 | 形状实现 |
| `sdk/Shape.h` | ~120 | 形状头文件 |
| `sdk/RigidBody.cpp` | ~350 | 刚体实现 |
| `sdk/RigidBody.h` | ~120 | 刚体头文件 |
| `sdk/Joint.cpp` | ~250 | 关节实现 |
| `sdk/Joint.h` | ~80 | 关节头文件 |
| `sdk/CharacterController.cpp` | ~300 | 控制器实现 |
| `sdk/CharacterController.h` | ~100 | 控制器头文件 |
| **小计** | **~2170行** | |

#### C. PhysX C++实现 (~35个文件)

| 文件路径 | 行数估算 | 说明 |
|----------|----------|------|
| `physx/PhysXWorld.cpp` | ~600 | PhysX世界 |
| `physx/PhysXWorld.h` | ~200 | 头文件 |
| `physx/PhysXRigidBody.cpp` | ~500 | 刚体实现 |
| `physx/PhysXRigidBody.h` | ~150 | 头文件 |
| `physx/PhysXSharedBody.cpp` | ~400 | 共享刚体 |
| `physx/PhysXSharedBody.h` | ~120 | 头文件 |
| `physx/PhysXUtils.cpp` | ~300 | 工具函数 |
| `physx/PhysXUtils.h` | ~100 | 头文件 |
| `physx/PhysXEventManager.cpp` | ~400 | 事件管理器 |
| `physx/PhysXEventManager.h` | ~120 | 头文件 |
| `physx/PhysXFilterShader.cpp` | ~200 | 过滤着色器 |
| `physx/PhysXFilterShader.h` | ~80 | 头文件 |
| `physx/PhysXInc.h` | ~50 | Include头文件 |
| `physx/PhysX.h` | ~100 | 主头文件 |
| `physx/PhysicsSDK.h` | ~80 | SDK头文件 |
| `physx/PhysicsSelector.h` | ~100 | 选择器 |
| `shapes/` (11个文件) | ~2200 | 各种形状实现 |
| `joints/` (8个文件) | ~1600 | 各种关节实现 |
| `character-controllers/` (5个文件) | ~1000 | 角色控制器 |
| **小计** | **~8300行** | |

**C++总计**: **~11,190行** (约51个文件)

### 2.3 导出文件（需删除）

```typescript
// exports/ 目录下的物理相关导出文件

// ===== 3D Physics 导出 (5个) =====
exports/physics-framework.ts       // 3D物理框架主导出
exports/physics-ammo.ts            // Ammo.js导出 (如果存在)
exports/physics-builtin.ts         // Builtin导出
exports/physics-cannon.ts          // Cannon.js导出
exports/physics-physx.ts           // PhysX导出

// ===== 2D Physics 导出 (5个) ⚠️ 原方案完全遗漏 =====
exports/physics-2d-framework.ts    // 2D物理框架主导出
exports/physics-2d-box2d.ts        // 2D Box2D导出
exports/physics-2d-builtin.ts      // 2D Builtin导出
exports/physics-2d-box2d-wasm.ts   // 2D Box2D WASM导出
exports/physics-2d-box2d-jsb.ts    // 2D Box2D JSB导出
```

**总代码量统计**:
- **3D TypeScript**: **~28,210行** (~100个文件)
- **2D TypeScript ⚠️ 原方案遗漏**: **~8,000+行** (~65个文件)
- **C++原生 (仅3D)**: **~11,190行** (~51个文件)
- **3D导出文件**: **5个**
- **2D导出文件 ⚠️ 原方案遗漏**: **5个**
- **3D测试文件**: **11个** (~119个测试用例)
- **2D测试文件 ⚠️ 原方案遗漏**: **7个** (~估计50+个测试用例)
- **合计: ~47,400+行代码, ~223+个文件, ~169+个测试用例**

---

## 三、依赖关系分析

### 3.1 被以下模块引用（需要清理）

根据Grep搜索结果，Physics被30+个文件引用：

#### A. 核心引擎模块

```typescript
// 1. cocos/game/game.ts ⚠️ 原方案遗漏！
//    第44行: import { IPhysicsConfig } from '../physics/framework/physics-config';
//    第163行: physics?: IPhysicsConfig; 属性定义
//    第962-964行: 处理 physics 配置的代码块
//    多处注释提到 physics

// 2. cocos/game/director.ts ⚠️ 原方案遗漏！
//    第137行: BEFORE_PHYSICS = 'director_before_physics'
//    第144行: AFTER_PHYSICS = 'director_after_physics'
//    第264-266行: 相关事件文档注释

// 3. typedoc-index.ts
//    第21行: export * from './exports/physics-2d-framework'; ⚠️ 遗漏
//    第22行: export * from './exports/physics-framework';
```

#### B. 3D模块（高度耦合！）

```typescript
// 4. cocos/3d/reflection-probe/reflection-probe-component.ts ⚠️ 原方案遗漏！
//    第37行: import { absolute } from '../../physics/utils/util';
//    ⚠️ 注意：这里只使用了 utils/util.ts 的 absolute 函数，需要特殊处理！

// 5. cocos/3d/ 中的多个文件可能依赖物理
//    例如：车辆物理、布料模拟等高级功能
```

#### C. 场景图模块

```typescript
// 6. cocos/scene-graph/ 或 cocos/render-scene/
//    可能有物理集成代码（当前未发现直接引用）
```

#### D. 编辑器和工具

```typescript
// 7. editor/ 目录下的物理相关编辑器扩展
// 8. editor/assets/gizmo/physics.meta
```

#### E. 测试文件

```typescript
// ===== 3D Physics 测试 (11个文件) =====
tests/physics/
├── physics.test.ts
├── character-controller.ts
├── constraint.ts
├── dynamic.ts
├── event.ts
├── filtering.ts
├── raycast.ts
├── sleep.ts
├── stability.ts
├── sweep.ts
└── volume.ts

// ===== 2D Physics 测试 (7个文件) ⚠️ 原方案完全遗漏 =====
tests/physics2d/
├── physics2d.test.ts
├── collider.ts
├── events.ts
├── rigid-body.ts
├── scene-query.ts
└── utilis.ts
```

#### F. 其他可能引用

```typescript
// 9. 示例项目、模板等
examples/ templates/ 中可能有物理演示
```

### 3.2 Physics自身依赖的模块

```typescript
// framework/physics-system.ts
import { game, director } from '../game';      // 游戏循环
import { Node, Component } from '../core';     // 节点系统
import { MeshRenderer } from '../3d';          // 3D渲染！
import { gfx } from '../gfx';                  // 图形层（调试绘制）

// components/rigid-body.ts
import { Component } from '../../core';

// 各后端实现
import { Vec3, Mat4 } from '../../core/math';  // 数学库
```

**关键发现**:
- Physics依赖3D模块（用于网格碰撞器等）
- Physics依赖Core模块（节点、组件系统）
- Physics依赖GFX模块（调试渲染）

### 3.3 依赖关系图

```
Physics (要删除 - 最复杂的模块)
│
├─ 被以下引用:
│   ├─ root.ts / core/index.ts (引擎初始化)
│   ├─ typedoc-index.ts (文档)
│   ├─ 3D模块 (高级功能) ← 高度耦合！
│   ├─ scene-graph (物理集成)
│   ├─ editor (编辑器支持)
│   ├─ tests/physics/ (测试套件)
│   └─ examples/templates (示例项目)
│
├─ 自身依赖:
│   ├─ Core (Node, Component, Math)
│   ├─ 3D (MeshRenderer) ← 单向依赖
│   ├─ GFX (调试绘制)
│   └─ Game (游戏循环)
│
├─ 第三方库依赖:
│   ├─ cannon.js (如果使用Cannon后端)
│   ├─ ammo.js (如果使用Ammo后端)
│   ├─ bullet (原生库)
│   └─ physx (原生库)
│
└─ 原生绑定:
    └─ native/cocos/physics/ (C++实现)
```

### 3.4 影响范围评估

- **直接影响**: 50+个文件需要修改或删除
- **间接影响**:
  - 所有使用物理的游戏项目将无法运行
  - 3D模块的一些功能可能受影响（如果紧密耦合）
  - 编辑器的物理工具面板失效
  - 大量示例和教程过时
- **编译影响**:
  - TypeScript层：大量编译错误需要修复
  - C++原生层：需要更新CMake构建配置
  - JSB绑定：需要重新生成绑定代码
- **运行时影响**:
  - ❌ 所有物理功能完全消失
  - ❌ 碰撞检测不可用
  - ❌ 刚体动力学不可用
  - ✅ 渲染功能不受影响（理论上）
  - ✅ UI、音频等系统不受影响

---

## 四、单元测试

### 4.1 现有测试（需全部删除）

**位置**: `tests/physics/`

完整的物理测试套件，包含11个测试文件：

| 文件名 | 测试内容 | 测试数量估计 |
|--------|----------|--------------|
| `physics.test.ts` | 物理系统集成测试 | ~20个 |
| `character-controller.ts` | 角色控制器测试 | ~15个 |
| `constraint.ts` | 约束系统测试 | ~10个 |
| `dynamic.ts` | 动力学测试 | ~15个 |
| `event.ts` | 物理事件测试 | ~10个 |
| `filtering.ts` | 碰撞过滤测试 | ~8个 |
| `raycast.ts` | 射线检测测试 | ~12个 |
| `sleep.ts` | 休眠机制测试 | ~5个 |
| `stability.ts` | 稳定性测试 | ~10个 |
| `sweep.ts` | 扫描测试 | ~8个 |
| `volume.ts` | 体积计算测试 | ~6个 |

**总计**: ~119个测试用例

**操作**: 整个`tests/physics/`目录将被删除

### 4.2 相关测试（可能受影响）

除了专门的物理测试，以下测试可能间接使用了物理功能：

```typescript
// 可能受影响的测试
tests/core/components/mesh-renderer.test.ts  // 如果涉及物理交互
tests/animation/skeletal-animation.test.ts   // 如果涉及物理布料
tests/animation/skeletal-animation-blending.test.ts
tests/animation/animation-state.test.ts
tests/animation/animation-clip.test.ts
```

**建议**: 移除后运行完整测试套件，观察哪些测试失败。

### 4.3 验证测试建议

创建全面的验证测试套件：

```typescript
// tests/phycis-removal-verification.test.ts
describe('Physics Removal Verification', () => {

    describe('Engine Initialization', () => {
        test('Game should initialize without physics', async () => {
            const { game } = require('../cocos/game');
            await game.init();
            expect(game).toBeDefined();
        });

        test('No physics system should be created', () => {
            // 验证没有PhysicsSystem实例
            const { physics } = require('../cocos/physics');
            expect(physics).toBeUndefined();
        });
    });

    describe('Component System', () => {
        test('RigidBody component should not exist', () => {
            try {
                const { RigidBody } = require('../cocos/physics/framework/components/rigid-body');
                expect(RigidBody).toBeUndefined();
            } catch (e) {
                expect(e).toBeDefined(); // 预期异常
            }
        });

        test('Collider components should not exist', () => {
            const colliders = [
                'BoxCollider',
                'SphereCollider',
                'CapsuleCollider',
                'MeshCollider'
            ];

            colliders.forEach(name => {
                try {
                    // 尝试导入应该失败
                } catch (e) {
                    expect(e).toBeDefined();
                }
            });
        });
    });

    describe('Scene Rendering', () => {
        test('Scenes should render without physics', () => {
            // 创建场景并渲染一帧
            // 不应该崩溃
        });

        test('3D objects should still render', () => {
            const { MeshRenderer } = require('../cocos/3d');
            expect(MeshRenderer).toBeDefined();
        });
    });

    describe('No Physics API Available', () => {
        test('No global physics object', () => {
            expect(globalThis.physics).toBeUndefined();
        });

        test('No physics-related namespaces', () => {
            const forbidden = ['PhysX', 'Cannon', 'Bullet', 'Builtin'];
            forbidden.forEach(name => {
                expect(globalThis[name]).toBeUndefined();
            });
        });
    });
});
```

---

## 五、配置文件修改

### 5.1 TypeScript配置

检查tsconfig.json中是否有physics相关的路径映射：

```json
{
  "compilerOptions": {
    "paths": {
      "cc/physics/*": ["./cocos/physics/*"],
      "cc/physics-2d/*": ["./cocos/physics-2d/*"]  // ⚠️ 原方案遗漏
    }
  }
}
```

如果有，需要删除这些映射。

### 5.2 构建配置

#### A. CMakeLists.txt修改 ⚠️ 需要大幅补充

**文件**: `native/CMakeLists.txt` 及相关子配置

**实际位置**: 第2005-2080行

**需要删除的内容**:

```cmake
##### physics (第2005-2080行)

if(USE_PHYSICS_PHYSX)  # 第2007行
    cocos_source_files(
        # SDK层 (10个文件)
        cocos/physics/PhysicsSDK.h
        cocos/physics/PhysicsSelector.h
        cocos/physics/sdk/World.h
        cocos/physics/sdk/World.cpp
        cocos/physics/sdk/Shape.h
        cocos/physics/sdk/Shape.cpp
        cocos/physics/sdk/RigidBody.h
        cocos/physics/sdk/RigidBody.cpp
        cocos/physics/sdk/Joint.h
        cocos/physics/sdk/Joint.cpp
        cocos/physics/sdk/CharacterController.h
        cocos/physics/sdk/CharacterController.cpp

        # Spec层 (6个文件)
        cocos/physics/spec/IBody.h
        cocos/physics/spec/IJoint.h
        cocos/physics/spec/ILifecycle.h
        cocos/physics/spec/IShape.h
        cocos/physics/spec/IWorld.h
        cocos/physics/spec/ICharacterController.h

        # PhysX实现 (~35个文件)
        cocos/physics/physx/PhysX.h
        cocos/physics/physx/PhysXInc.h
        # ... (完整列表见CMakeLists.txt第2027-2074行)

        # JSB绑定 (2个文件)
        ${SWIG_OUTPUT}/jsb_physics_auto.cpp
        ${SWIG_OUTPUT}/jsb_physics_auto.h
    )
endif()
```

**其他CMakeLists.txt**:
- `native/tools/simulator/frameworks/runtime-src/CMakeLists.txt:25` - USE_PHYSICS_PHYSX选项
- `native/tests/sebind-tests/common/CMakeLists.txt:25` - USE_PHYSICS_PHYSX选项

#### B. cc.config.json 修改 ⚠️ 原方案完全遗漏！

**文件**: `cc.config.json`

**位置**: 第109-142行

**需要删除的模块配置**:

```json
{
    // ===== 3D Physics 模块 =====
    "physics-framework": {
        "modules": ["physics-framework"]
    },
    "physics-cannon": {
        "modules": ["physics-cannon", "physics-framework"],
        "dependentAssets": ["ba21476f-2866-4f81-9c4d-6e359316e448"]
    },
    "physics-physx": {
        "modules": ["physics-physx", "physics-framework"],
        "dependentAssets": ["ba21476f-2866-4f81-9c4d-6e359316e448"]
    },
    "physics-ammo": {
        "modules": ["physics-ammo", "physics-framework"],
        "dependentAssets": ["ba21476f-2866-4f81-9c4d-6e359316e448"]
    },
    "physics-builtin": {
        "modules": ["physics-builtin", "physics-framework"],
        "dependentAssets": ["ba21476f-2866-4f81-9c4d-6e359316e448"]
    },

    // ===== 2D Physics 模块 ⚠️ 原方案完全遗漏 =====
    "physics-2d-framework": {
        "modules": ["physics-2d-framework"]
    },
    "physics-2d-box2d-jsb": {
        "modules": ["physics-2d-box2d-jsb", "physics-2d-framework"]
    },
    "physics-2d-box2d": {
        "modules": ["physics-2d-box2d", "physics-2d-framework"]
    },
    "physics-2d-builtin": {
        "modules": ["physics-2d-builtin", "physics-2d-framework"]
    },
    "physics-2d-box2d-wasm": {
        "modules": ["physics-2d-box2d-wasm", "physics-2d-framework"]
    }
}
```

#### C. DebugInfos.json 修改 ⚠️ 原方案遗漏！

**文件**: `DebugInfos.json`

**位置**: 第411-422行, 第583行

**需要删除的错误信息** (约13条):

```json
{
    "9600": "[Physics]: please check to see if physics modules are included",
    "9610": "[Physics]: cannon.js physics system doesn't support capsule collider",
    "9611": "[Physics]: builtin physics system doesn't support mesh collider",
    "9612": "[Physics]: builtin physics system doesn't support cylinder collider",
    "9613": "[Physics]: cannon.js physics system doesn't support hinge drive and angular limit",
    "9620": "[Physics][Ammo]: changing the mesh is not supported after the initialization is completed",
    "9630": "[Physics]: A dynamic rigid body can not have the following collider shapes: Terrain, Plane and Non-convex Mesh. Node name: %s",
    "9640": "[Physics][builtin]: sweep functions are not supported in builtin",
    "9641": "[Physics][cannon.js]: sweep functions are not supported in cannon.js",
    "9642": "[Physics] PhysicsSystem initDefaultMaterial() Failed to load builtinMaterial.",
    "9643": "[Physics] Failed to load user customized default physics material: %s, will fallback to built-in default physics material",
    "9644": "[Physics] Failed to find ear. There might be self-intersection in the polygon.",
    "16408": "[Physics2D] b2PolygonShape failed to decompose polygon into convex polygons, node name: %s"
}
```

#### D. package.json修改 ⚠️ 需明确列出

**文件**: `package.json`

**需要删除的依赖**:

```json
{
  "dependencies": {
    // 删除这些包（确认存在）
    "@cocos/cannon": "1.2.8",           // Cannon.js 物理库
    "@cocos/box2d": "1.0.2"             // Box2D 物理库 ⚠️ 原方案遗漏！
  },
  "devDependencies": {
    // 删除相关的类型定义（如果存在）
    // "@types/cannon": "*"
  }
}
```

#### E. 第三方库配置

**需要确认是否删除以下第三方库**:

```bash
# 检查是否存在
ls -la third-party/ | grep -i "physx\|bullet\|ammo\|cannon"

# 可能需要删除的目录
third-party/physx-sdk/        # PhysX SDK
third-party/bullet/           # Bullet SDK
# ammo.js 和 cannon.js 通常是npm包，需要从package.json移除
```

### 5.3 导出配置

**需要删除的导出文件** (共10个):

```bash
# ===== 3D Physics 导出 (5个) =====
rm exports/physics-framework.ts
rm exports/physics-ammo.ts
rm exports/physics-builtin.ts
rm exports/physics-cannon.ts
rm exports/physics-physx.ts

# ===== 2D Physics 导出 (5个) ⚠️ 原方案遗漏 =====
rm exports/physics-2d-framework.ts
rm exports/physics-2d-box2d.ts
rm exports/physics-2d-builtin.ts
rm exports/physics-2d-box2d-wasm.ts
rm exports/physics-2d-box2d-jsb.ts
```

### 5.4 JSB绑定配置

**检查并清理**:

```typescript
// 可能存在文件
cocos/physics/physx/instantiate.jsb.ts  # 已在TS清单中
native/binding/...  // 可能有自动生成的绑定

// CMakeLists.txt中的JSB绑定 (第2077-2078行)
${SWIG_OUTPUT}/jsb_physics_auto.cpp
${SWIG_OUTPUT}/jsb_physics_auto.h
```

---

## 六、执行步骤

### Phase 1: 准备工作 (1天)

这是最重要的准备阶段！因为Physics模块极其复杂。

- [ ] **多重备份**
  ```bash
  git tag backup-before-physics-removal

  # 额外备份整个physics目录到外部存储
  cp -r cocos/physics/ /tmp/physics-backup-$(date +%Y%m%d)
  cp -r cocos/physics-2d/ /tmp/physics-2d-backup-$(date +%Y%m%d)  # ⚠️ 原方案遗漏
  cp -r native/cocos/physics/ /tmp/native-physics-backup-$(date +%Y%m%d)
  ```

- [ ] **全面基线测试**
  ```bash
  # 完整编译所有平台
  npm run build:h5
  npm run build:native  # 如果配置了原生编译

  # 全部测试
  npm test

  # 记录详细状态
  echo "=== PHYSICS REMOVAL BASELINE ===" > physics-baseline.log
  date >> physics-baseline.log
  npm run build >> physics-baseline.log 2>&1
  npm test >> physics-baseline.log 2>&1
  ```

- [ ] **分析影响范围**
  ```bash
  # 统计使用physics的文件数量
  grep -r "from.*physics\|import.*physics" --include="*.ts" \
      cocos/ native/ tests/ editor/ exports/ \
      | grep -v node_modules | grep -v ".test.ts" | wc -l

  # 列出所有引用文件
  grep -rl "from.*physics\|import.*physics" --include="*.ts" \
      cocos/ native/ tests/ editor/ exports/ \
      > physics-dependencies.txt

  cat physics-dependencies.txt
  ```

- [ ] **通知相关人员** (如果是团队协作)
  - 发送邮件/消息通知团队
  - 在项目管理工具中创建任务
  - 标记这个任务为"进行中，请勿合并其他PR"

- [ ] **阅读完本方案全文** ✅ （你现在正在做这一步）

### Phase 2: 删除代码 (2小时)

由于代码量巨大，分批删除：

#### 2.1 删除TypeScript代码 (1.5小时)

```bash
# ===== 删除 3D Physics 目录 =====
rm -rf cocos/physics/

# ===== 删除 2D Physics 目录 ⚠️ 原方案完全遗漏 =====
rm -rf cocos/physics-2d/

# ===== 删除导出文件 (共10个) =====
rm -f exports/physics-framework.ts
rm -f exports/physics-ammo.ts
rm -f exports/physics-builtin.ts
rm -f exports/physics-cannon.ts
rm -f exports/physics-physx.ts
rm -f exports/physics-2d-framework.ts      # ⚠️ 遗漏
rm -f exports/physics-2d-box2d.ts          # ⚠️ 遗漏
rm -f exports/physics-2d-builtin.ts        # ⚠️ 遗漏
rm -f exports/physics-2d-box2d-wasm.ts     # ⚠️ 遗漏
rm -f exports/physics-2d-box2d-jsb.ts      # ⚠️ 遗漏

# ===== 删除测试目录 (共18个文件) =====
rm -rf tests/physics/
rm -rf tests/physics2d/                     # ⚠️ 原方案完全遗漏

echo "✅ TypeScript physics code deleted (3D + 2D)"
```

#### 2.2 删除C++原生代码 (30分钟)

```bash
# 删除原生physics目录
rm -rf native/cocos/physics/

echo "✅ Native physics code deleted"
```

### Phase 3: 清理依赖引用 (2-3天)

这是最耗时的阶段！预计需要处理60+个文件的修改。

#### 3.1 优先级排序

按重要性排列需要修改的文件：

**P0 - 必须立即修复（否则无法编译）**:
1. `cocos/game/game.ts` ⚠️ **原方案遗漏！**
   - 第44行: 删除 `import { IPhysicsConfig } from '../physics/framework/physics-config';`
   - 第163行: 删除 `physics?: IPhysicsConfig;` 属性
   - 第962-964行: 删除 physics 配置处理代码块
   - 多处注释: 清理 physics 相关注释
2. `cocos/game/director.ts` ⚠️ **原方案遗漏！**
   - 第137行: 删除 `BEFORE_PHYSICS = 'director_before_physics'`
   - 第144行: 删除 `AFTER_PHYSICS = 'director_after_physics'`
   - 第264-266行: 删除相关事件文档注释
3. `typedoc-index.ts`
   - 第21行: 删除 `export * from './exports/physics-2d-framework';` ⚠️ 遗漏
   - 第22行: 删除 `export * from './exports/physics-framework';`

**P0.5 - 特殊处理（需要保留功能）**:
4. `cocos/3d/reflection-probe/reflection-probe-component.ts` ⚠️ **原方案遗漏！**
   - 第37行: `import { absolute } from '../../physics/utils/util';`
   - ⚠️ **注意**: 这个文件只使用了 `absolute` 函数，不是物理功能！
   - **解决方案**: 将 `absolute` 函数复制到 3D 模块的 utils 中，或内联实现

**P1 - 应该尽快修复（影响核心功能）**:
5. `cc.config.json`
   - 删除第109-142行的所有 physics 模块配置（3D + 2D）
6. `DebugInfos.json`
   - 删除第411-422行的 physics 错误信息（~12条）
   - 删除第583行的 Physics2D 错误信息（1条）
7. `package.json`
   - 删除 `@cocos/cannon`: "1.2.8"
   - 删除 `@cocos/box2d`: "1.0.2" ⚠️ 遗漏

**P2 - 可以延后（影响辅助功能）**:
8. `editor/` 中的物理编辑器扩展
9. `examples/` 和 `templates/` 中的物理示例
10. `native/CMakeLists.txt` (第2005-2080行)
11. 其他子 CMakeLists.txt 中的 physics 配置

**P3 - 低优先级（可选）**:
12. 注释和文档中的physics引用

#### 3.2 详细修改指南

##### 3.2.1 修改引擎根模块

**文件**: `cocos/root.ts` 或类似文件

**查找**:
```typescript
// 可能的形式
import { physics } from './physics';
import { PhysicsSystem } from './physics/framework/physics-system';
export { physics, PhysicsSystem };

// 或在全局对象中
globalThis.physics = physics;
```

**操作**:
```typescript
// 完全删除上述代码
// 如果physics作为属性存在于某个大对象中，删除该属性
```

**注意**: 如果root.ts中有条件加载physics的代码，也要删除。

##### 3.2.2 修改typedoc-index.ts

**操作**: 删除physics相关的索引条目

##### 3.2.3 修改3D模块中的物理引用

**关键**: 这是最高风险的部分！

**可能的引用形式**:

```typescript
// 3D模块中可能引用physics的地方
import { RigidBody } from '../physics/framework/components/rigid-body';
import { Collider } from '../physics/framework/components/colliders/collider';

// 车辆系统可能依赖物理
import { Vehicle } from '../physics/...';

// 布料模拟可能依赖物理
import { ClothSimulation } from '../physics/...';
```

**处理策略**:

**策略A - 如果3D模块整体保留**:
- 删除所有physics import
- 删除或注释掉使用physics的代码
- 提供空实现或抛出错误的占位符

**策略B - 如果某些3D功能也一起删**:
- 识别哪些3D功能强依赖physics
- 将这些功能和physics一起标记为待删除
- 更新3D模块的移除方案

**本方案采用策略A** (假设3D模块保留基础功能)

**示例修改**:

```typescript
// 文件: cocos/3d/framework/mesh-renderer.ts (假设)

// 删除前
import { RigidBody } from '../physics/framework/components/rigid-body';

class MeshRenderer extends Component {
    private _rigidbody: RigidBody | null = null;

    update(dt) {
        if (this._rigidbody) {
            // 同步物理变换到渲染
        }
    }
}

// 删除后
class MeshRenderer extends Component {
    // 删除rigidbody相关字段和方法
    // MeshRenderer不再关心物理

    update(dt) {
        // 只保留渲染逻辑
    }
}
```

##### 3.2.4 修改场景图中的物理集成

**可能的文件**:
- `cocos/scene-graph/node.ts` (节点可能有物理属性)
- `cocos/render-scene/` 中的物理相关代码

**处理方式**: 类似3D模块的处理

##### 3.2.5 修改游戏初始化代码

**文件**: `cocos/game/director.ts` 或 `game.ts`

**查找**:
```typescript
import { PhysicsSystem } from '../physics/framework/physics-system';

class Director {
    initPhysics() {
        this._physicsSystem = new PhysicsSystem();
    }
}
```

**操作**:
```typescript
// 初始化方法中删除物理系统初始化
// 或者整个删除initPhysics方法

class Director {
    // initPhysics() 方法已删除
    // this._physicsSystem 属性已删除
}
```

##### 3.2.6 批量搜索和替换

完成主要修改后，使用脚本批量清理：

```bash
# 创建清理脚本
cat > cleanup-physics-imports.sh << 'EOF'
#!/bin/bash

# 查找所有还包含physics引用的文件
FILES=$(grep -rl "from.*['\"].*physics\|import.*['\"].*physics" \
    --include="*.ts" cocos/ native/ exports/ \
    | grep -v node_modules | grep -v litePlan)

echo "Found ${#FILES[@]} files with physics references:"
echo "$FILES"

# 对每个文件提示用户手动审查
for file in $FILES; do
    echo ""
    echo "=== $file ==="
    grep -n "physics" "$file"
    echo ""
    read -p "Review and clean this file? (y/n): " choice
    if [ "$choice" = "y" ]; then
        $EDITOR "$file"
    fi
done
EOF

chmod +x cleanup-physics-imports.sh
./cleanup-physics-imports.sh
```

### Phase 4: 编译修复迭代 (2-3天)

预计需要5-10轮编译-修复循环！

#### 4.1 第一轮编译

```bash
npm run build 2>&1 | tee build-attempt-1.log
```

**预期结果**: 大量错误（可能100+个）

**错误分类**:

| 错误类型 | 数量估计 | 处理优先级 |
|----------|----------|------------|
| 模块找不到 (Cannot find module) | ~40% | P0 |
| 类型不存在 (Cannot find name) | ~30% | P0 |
| 属性不存在 (Property does not exist) | ~20% | P1 |
| 其他 | ~10% | P2 |

#### 4.2 迭代修复流程

```bash
ATTEMPT=1
MAX_ATTEMPTS=15

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "=== Build Attempt #$ATTEMPT ==="

    # 尝试编译
    if npm run build 2>&amp;&amp; tee build-attempt-$ATTEMPT.log; then
        echo "✅ BUILD SUCCESSFUL!"
        break
    fi

    # 分析错误
    ERROR_COUNT=$(grep -c "error TS" build-attempt-$ATTEMPT.log)
    echo "❌ Found $ERROR_COUNT errors"

    if [ $ERROR_COUNT -eq 0 ]; then
        # 可能是非TS错误
        echo "Non-TS errors found, check log"
        break
    fi

    # 提取唯一错误文件
    grep "error TS" build-attempt-$ATTEMPT.log \
        | sed 's/(.*//' | sort -u > files-to-fix-$ATTEMPT.txt

    FILE_COUNT=$(wc -l < files-to-fix-$ATTEMPT.txt)
    echo "Need to fix $FILE_COUNT files"

    # 手动修复这些文件
    echo "Files to fix:"
    cat files-to-fix-$ATTEMPT.txt

    read -p "Fix these files and press enter to continue..."

    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "❌ Failed after $MAX_ATTEMPTS attempts"
    echo "Consider reverting or seeking help"
fi
```

#### 4.3 常见错误模式及解决方案

**模式1: 模块找不到**
```
Error: Cannot find module '../physics/framework/...' or its type declarations.
```
**解决**: 还有文件在import physics，回到Phase 3继续清理

**模式2: 类型不存在**
```
Error: TS2304: Cannot find name 'RigidBody'.
```
**解决**: 某处使用了RigidBody类型但没删除，搜索并删除

**模式3: 属性不存在**
```
Error: TS2339: Property '_rigidBody' does not exist on type 'MeshRenderer'.
```
**解决**: 类中还保留了physics相关的属性定义，删除该属性

**模式4: 接口不完整**
```
Error: Class incorrectly implements interface 'IRenderable'.
```
**解决**: 某接口要求physics相关的方法，需要修改接口或提供空实现

**模式5: 枚举值缺失**
```
Error: Type 'PhysicsGroup' is not assignable to type 'number'.
```
**解决**: 删除对Physics枚举的使用

### Phase 5: 原生平台编译 (1-2天)

如果支持原生平台（iOS/Android）：

#### 5.1 更新CMake配置

**文件**: `native/CMakeLists.txt`

**操作**:
```cmake
# 删除或注释掉physics相关的subdirectory和source files
# add_subdirectory(cocos/physics)  # 删除此行

# target_sources(engine PRIVATE
#     cocos/physics/sdk/World.cpp
#     ...
# )  # 删除或注释掉这些行

# target_link_libraries(engine
#     PhysX::PhysX
#     ...
# )  # 删除物理库链接
```

#### 5.2 原生编译测试

```bash
cd native
cmake -G Xcode ..  # iOS/macOS
# 或
cmake ..           # Android/Linux

make              # 或 xcodebuild
```

**常见问题**:

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| CMake缓存未更新 | 删文件后CMake不知道 | 删除CMakeCache.txt重新cmake |
| JSB绑定找不到符号 | 自动生成的绑定还在 | 重新生成绑定或手动清理 |
| 链接错误 | 还在链接PhysX库 | 清理target_link_libraries |

### Phase 6: 测试验证 (1-2天) ⚠️ 严格验收流程

#### ⚠️ 验收标准（必须严格执行）

**验收顺序（不可颠倒）**:
1. **首先**: 运行 `npm run build` 直到 **零错误**
2. **然后**: 运行 `npm test` 确保 **100% 测试通过**

#### 6.0 编译验收（第一步 - 必须通过）

```bash
# ===== 第一步：编译检查 =====
# 反复运行直到没有任何报错
npm run build

# 如果有错误，修复后重新运行
# 重复此过程直到输出显示：Build successful 或类似成功信息

# ✅ 通过标准：
# - npm run build 输出中无 error TSxxxx 错误
# - 无 "Cannot find module" 错误
# - 无 "Cannot find name" 错误
# - 无任何 physics/Physics 相关的编译错误

# ❌ 如果有以下情况，不能进入下一步：
# - 存在任何 TypeScript 编译错误
# - 存在模块找不到的错误
# - 存在类型定义缺失的错误
```

**常见编译错误及处理**:

| 错误类型 | 处理方法 |
|----------|----------|
| `Cannot find module 'physics'` | 还有文件在 import physics，回到 Phase 3 |
| `Cannot find name 'IPhysicsConfig'` | game.ts 未清理完成 |
| `Cannot find name 'RigidBody'` | 某处使用了物理类型 |
| `Property 'BEFORE_PHYSICS' does not exist` | director.ts 未清理完成 |
| `error TS2307` (模块找不到) | typedoc-index.ts 或其他文件未清理 |

#### 6.1 确认测试文件已删除

```bash
# ===== 确认测试目录已删除 =====
test -d tests/physics && echo "❌ tests/physics still exists!" || echo "✅ tests/physics deleted"
test -d tests/physics2d && echo "❌ tests/physics2d still exists!" || echo "✅ tests/physics2d deleted"

# 统计剩余的 physics 相关测试文件
find tests/ -name "*physics*" -type f | wc -l
# 应该返回 0
```

#### 6.2 运行完整测试套件（第二步 - 编译通过后才可执行）

```bash
# ===== 第二步：测试验证 =====
# 只有当 npm run build 完全无错误后，才执行此步骤
npm test 2>&1 | tee test-results-after-physics-removal.log
```

**✅ 通过标准**:

1. **测试通过率**: **100%** (排除已删除的物理测试)
2. **无新增失败测试**: 所有非物理相关的原有测试必须通过
3. **无意外回归**: 不应该有与物理无关的测试失败

**预期结果**:
- ✅ 所有非物理测试通过
- ✅ 物理测试已不存在（不是失败，是不存在）
- ✅ 测试总数减少（因为删除了 ~169+ 个物理测试用例）

**如果测试失败**:

1. **识别失败原因**:
   ```bash
   grep -A 10 "FAIL\|Error" test-results.log
   ```

2. **分类失败测试**:

   | 失败类型 | 原因 | 处理方式 |
   |----------|------|----------|
   | 物理相关测试失败 | 测试文件未完全删除 | 删除测试文件或回退到 Phase 2 |
   | 间接依赖 physics 的测试 | 某功能依赖物理 API | 修改测试或删除该功能 |
   | 与 physics 无关的测试失败 | 回归 bug | 调查并修复 bug |
   | game.ts/director.ts 相关 | 配置清理不完整 | 回到 Phase 3 补充修改 |

3. **处理失败的测试**:

   **选项A - 删除测试** (如果测试的功能已删除):
   ```bash
   rm tests/failing-test.ts
   ```

   **选项B - 修改测试** (如果测试的功能还在):
   ```typescript
   // 修改测试以适应新的无物理环境
   test('something without physics', () => {
       // 移除物理相关的断言
   });
   ```

4. **修复后重新执行完整流程**:
   ```bash
   # 重要：修复任何问题后，必须重新从 6.0 开始！
   npm run build    # 再次确认编译通过
   npm test         # 再次运行测试
   ```

#### 6.3 验证无残留引用

```bash
# ===== 最终验证：确保无残留 =====

# 1. 确认目录已删除
test -d cocos/physics && echo "❌ TS physics still exists!" || echo "✅ TS 3D physics deleted"
test -d cocos/physics-2d && echo "❌ TS 2D physics still exists!" || echo "✅ TS 2D physics deleted"
test -d native/cocos/physics && echo "❌ Native physics still exists!" || echo "✅ Native physics deleted"

# 2. 确认导出文件已删除
ls exports/physics* 2>/dev/null && echo "❌ Physics export files exist!" || echo "✅ All physics exports deleted"

# 3. 搜索残留的 physics import（排除 node_modules 和文档）
RESULT=$(grep -r "from.*['\"].*physics\|import.*['\"].*physics" \
    --include="*.ts" cocos/ native/ exports/ \
    | grep -v node_modules | grep -v litePlan | wc -l)

if [ "$RESULT" -gt 0 ]; then
    echo "❌ Found $RESULT files with physics references!"
    grep -r "from.*['\"].*physics\|import.*['\"].*physics" \
        --include="*.ts" cocos/ native/ exports/ \
        | grep -v node_modules | grep -v litePlan
else
    echo "✅ No physics references found in source code"
fi

# 4. 验证配置文件已清理
grep -c "\"physics" cc.config.json
# 应该返回 0

grep -c "Physics\|physics" package.json
# 应该只返回注释中的内容（如果有）
```

#### 6.4 运行新增的验证测试（可选但推荐）

```bash
npx jest tests/physics-removal-verification.test.ts
```

### Phase 7: 功能和性能验证 (1-2天)

#### 7.1 创建验证场景

**场景1: 纯UI场景**
- 只包含Button、Label、ScrollView
- 验证UI完全正常

**场景2: 2D精灵场景**
- 包含多个Sprite
- 动画播放
- 用户交互（触摸、点击）
- **不应该有任何物理行为**（精灵不会掉落等）

**场景3: 3D场景（简化版）**
- 包含Camera、Light、MeshRenderer
- 基础渲染
- **物体不会受到重力影响**（除非你手动实现）

**场景4: 复杂游戏场景**
- 组合多种元素
- 长时间运行稳定性测试

#### 7.2 性能基准对比

```javascript
const metrics = {
    // 启动性能
    startupTime: 0,
    timeToFirstFrame: 0,

    // 运行时性能
    avgFrameTime: 0,
    memoryUsage: 0,
    drawCalls: 0,

    // 对比基线（删除前记录的数据）
    baseline: {
        startupTime: 0,
        memoryUsage: 0,
    }
};

// 记录当前指标
metrics.startupTime = performance.now() - startTime;
metrics.memoryUsage = performance.memory.usedJSHeapSize;

console.table(metrics);
```

**期望结果**:
- 启动时间减少（少了物理系统初始化）
- 内存占用显著减少（少了几万行代码）
- 帧率稳定或提升（少了物理模拟开销）

#### 7.3 边界情况测试

- [ ] 加载包含旧物理组件的场景文件
  - 应该优雅地忽略未知组件
  - 不应该崩溃

- [ ] 尝试动态添加物理组件
  - 应该报错或静默失败
  - 不应该崩溃

- [ ] 长时间运行（1小时+）
  - 无内存泄漏
  - 无性能退化

- [ ] 快速创建/销毁大量节点
  - 无内存泄漏
  - 性能稳定

### Phase 8: 清理和文档 (1天)

#### 8.1 更新核心目标文档

在[核心目标.md](./核心目标.md)中记录：

```markdown
#### 3.1 删除Physics模块（1周）✅ 已完成
- 完成日期: 2026-04-XX
- 删除代码量:
  - TypeScript: ~28,210行 (100个文件)
  - C++: ~11,190行 (51个文件)
  - 总计: ~39,400行 (151个文件)
- 修改文件数: ~55个
- 删除测试用例: ~119个
- 编译迭代次数: X轮
- 测试结果: 全部通过
- 性能变化:
  - 启动时间: -X%
  - 内存占用: -YMB
  - 打包体积: -ZKB
```

#### 8.2 编写迁移指南

创建 `docs/migration/from-physics.md`:

```markdown
# 从内置Physics迁移到第三方物理库

## 为什么删除内置Physics？
...

## 推荐的替代方案

### 方案1: Matter.js (2D物理, 推荐)
安装: npm install matter-js
优点: 轻量、成熟、社区活跃
适用: 2D休闲游戏

### 方案2: Planck.js (2D物理)
安装: npm install planck
优点: Box2D的JS移植，性能好
适用: 需要2D刚体的游戏

### 方案3: Oimo.js (3D物理)
安装: npm install oimo
优点: 纯JS 3D物理
适用: 简单3D物理需求

### 方案4: Ammo.js (3D物理, 高级)
安装: npm install ammo.js
优点: Bullet的ASM.js版本，功能强大
适用: 需要3D物理的高级用户

## 迁移示例

### 示例1: 刚体
// 旧代码
// 新代码 (Matter.js)

### 示例2: 碰撞检测
// 旧代码
// 新代码

### 示例3: 角色控制器
// 旧代码
// 新代码 (自定义实现)

## 不再支持的功能
- 多物理后端切换
- 原生物理加速 (PhysX/Bullet)
- 高级约束系统
- ...

## 集成指南
如何将Matter.js集成到Cocos项目中...
```

#### 8.3 提交代码

```bash
git add .
git commit -m "feat: remove Physics module (~39,400 lines)

MAJOR BREAKING CHANGE: Entire physics system removed

🗑️  Deleted Files:
TypeScript (cocos/physics/):
  - Framework core (15 files, ~2220 lines)
    * physics-system, selector, interface, config, enum, etc.
  - Components layer (18 files, ~3930 lines)
    * RigidBody, ConstantForce
    * Colliders (Box, Sphere, Capsule, Cylinder, Cone, Plane, Mesh, Simplex)
    * Constraints (Fixed, PointToPoint, Hinge, Configurable)
    * CharacterControllers (Capsule, Box)
    * PhysicsMaterial
  - Interface specifications (9 files, ~1380 lines)
    * IWorld, IShape, IBody, IJoint, ICharacterController, etc.
  - Utilities (4 files, ~830 lines)
  - Builtin backend (10 files, ~2300 lines)
  - Cannon.js backend (20 files, ~4400 lines)
  - Bullet backend (25 files, ~6300 lines)
  - PhysX backend (25 files, ~6850 lines)
  Total TS: ~100 files, ~28,210 lines

C++ (native/cocos/physics/):
  - Interface specs (6 files, ~720 lines)
  - SDK abstraction (10 files, ~2170 lines)
  - PhysX implementation (35 files, ~8300 lines)
  Total C++: ~51 files, ~11,190 lines

Other:
  - Export files (5 files)
  - Test suite (11 files, ~119 test cases)
  - Third-party library references

📝 Modified Files (~55):
  - cocos/root.ts (remove physics initialization)
  - typedoc-index.ts (remove physics docs)
  - cocos/3d/*.ts (remove physics dependencies)
  - cocos/scene-graph/*.ts (remove physics integration)
  - cocos/game/*.ts (remove physics system init)
  - editor/ (remove physics tools)
  - CMakeLists.txt (remove physics build config)
  - package.json (remove physics dependencies)
  - tsconfig.json (remove physics paths)
  + other dependency cleanup

Reasoning:
- Casual games have simple physics needs (AABB collision sufficient)
- Built-in physics is over-engineered for target use case
- Multiple backends (4) are expensive to maintain
- Reduces engine size by ~39K lines (largest single removal!)
- Significantly reduces bundle size and memory usage
- Improves AI-friendliness (physics APIs are extremely complex)
- Developers can use lightweight alternatives (Matter.js, Planck.js)

Migration Guide: See docs/migration/from-physics.md
Recommended Alternative: Matter.js for 2D, Oimo.js/Ammo.js for 3D

Testing:
- All non-physics unit tests pass (100% pass rate)
- Physics-specific tests removed (119 test cases)
- New verification tests added and passing
- Web platform compilation: ✅ PASS
- Native platform compilation: ✅ PASS (iOS/Android)
- Performance benchmarks:
  * Startup time improved by X%
  * Memory usage reduced by Y MB
  * Bundle size reduced by Z KB
- Manual testing on multiple demo scenes completed
- No regressions in rendering, UI, audio, or animation systems

Risk Assessment:
- Risk Level: EXTREME (⭐⭐⭐⭐⭐)
- Mitigation: Extensive testing, rollback plan ready
- Rollback Command: git revert HEAD (immediate)
- Backup Tag: backup-before-physics-removal

See: litePlan/核心目标.md
See: litePlan/04-移除Physics模块.md (this document)"
```

#### 8.4 创建Release Notes

```markdown
## [Version X.Y.Z] - YYYY-MM-DD

### Removed

#### Physics System (BREAKING CHANGE)
The entire built-in physics system has been removed, including:
- 2D/3D rigid body dynamics
- Collision detection and response
- Joint/constraint systems
- Character controllers
- Multiple physics backends (Builtin, Cannon, Bullet, PhysX)
- Physics materials and collision filtering
- Raycasting and shape casting

**Total removed**: ~39,400 lines of code across 151 files

**Why?**
To create a lightweight engine optimized for casual games.
Most casual games only need simple AABB collision detection,
which can be implemented in a few lines of code or via third-party libraries.

**Migration**: See [Migration Guide](docs/migration/from-physics.md)

**Recommended Alternatives**:
- **Matter.js** (2D): Best for 2D casual games
- **Planck.js** (2D): Good performance for 2D
- **Oimo.js** (3D): Lightweight 3D physics
- **Ammo.js** (3D): Advanced 3D physics (if really needed)
```

---

## 七、风险评估

### 7.1 技术风险矩阵（极高风险）

| 风险项 | 概率 | 影响 | 严重程度 | 应对措施 |
|--------|------|------|----------|----------|
| **大规模编译失败** | 极高 | 极高 | 🔴🔴🔴 | 分阶段修复，预留1周时间 |
| **3D模块严重受损** | 高 | 极高 | 🔴🔴🔴 | 准备好回滚方案 |
| **循环依赖暴露** | 中 | 极高 | 🔴🔴 | 仔细分析依赖图 |
| **原生平台编译失败** | 高 | 高 | 🔴🔴 | 单独分配时间处理 |
| **隐式依赖遗漏** | 高 | 中 | 🟠🟠 | 全局搜索+人工审查 |
| **测试大面积失败** | 中 | 中 | 🟠🟠 | 预期并接受物理测试删除 |
| **编辑器功能损坏** | 中 | 中 | 🟠🟠 | 可以暂时禁用相关功能 |
| **性能回归** | 低 | 高 | 🔴 | 性能基准对比 |
| **社区强烈反对** | 中 | 高 | 🔴 | 提前沟通，提供迁移支持 |
| **发现关键功能依赖物理** | 低 | 极高 | 🔴🔴🔴 | 延后删除或提供shim |

### 7.2 最高风险详细应对

#### 风险1: 3D模块严重受损

**概率**: 60%
**影响**: 如果3D模块深度集成了物理，可能导致3D功能部分或完全不可用

**预防措施**:

1. **预先分析3D与Physics的耦合度**:
   ```bash
   # 统计3D模块中对physics的引用
   grep -r "from.*physics\|import.*physics" cocos/3d/ --include="*.ts" | wc -l
   ```

2. **识别关键耦合点**:
   - MeshRenderer ↔ RigidBody (同步物理变换到渲染)
   - VehicleSystem ↔ Physics (车辆物理)
   - ClothSimulation ↔ Physics (布料模拟)

3. **准备降级方案**:
   - **方案A**: 如果耦合度 < 20%，安全删除physics并提供空实现
   - **方案B**: 如果耦合度 20-50%，考虑同时删除3D中的相关功能
   - **方案C**: 如果耦合度 > 50%，**取消本次删除**，先解耦再删除

**应对策略** (如果发生):

```typescript
// 为3D模块提供最小的物理兼容层
// 文件: cocos/physics-shim.ts (临时文件，后续删除)

export class RigidBodyShim {
    // 空实现，防止编译错误
    linearVelocity = { x: 0, y: 0, z: 0 };
    angularVelocity = { x: 0, y: 0, z: 0 };

    // 所有方法都是空操作
    applyForce() {}
    applyImpulse() {}
}

// 3D模块中使用
import { RigidBodyShim } from './physics-shim';
// 替代原来的 RigidBody
```

#### 风险2: 发现关键功能依赖物理

**场景**: 删除后发现某个核心功能（如角色移动、碰撞响应）实际上依赖物理

**概率**: 30%
**影响**: 引擎核心功能不可用

**预防**:

1. **列出所有使用physics的核心功能**:
   ```bash
   # 搜索核心模块中的physics使用
   grep -r "physics\|Physics" cocos/core/ cocos/game/ cocos/scene-graph/ \
       --include="*.ts" | grep -v "// \|* "
   ```

2. **评估每个使用的必要性**:
   - 是否只是可选增强？→ 可以删除
   - 是否是核心逻辑必需？→ 需要替代方案

3. **准备最小化物理实现**:

   如果确实需要基础的碰撞检测，提供一个超简化的版本：

   ```typescript
   // cocos/simple-physics.ts (如果真的需要)
   export class SimplePhysics {
       // 仅提供AABB碰撞检测
       static checkAABB(a: AABB, b: AABB): boolean {
           return (
               a.min.x <= b.max.x && a.max.x >= b.min.x &&
               a.min.y <= b.max.y && a.max.y >= b.min.y &&
               a.min.z <= b.max.z && a.max.z >= b.min.z
           );
       }

       // 仅提供简单的重力应用
       static applyGravity(node, dt, gravity = -9.8) {
           node.position.y += gravity * dt;
       }
   }

   // 只有不到100行代码！
   ```

### 7.3 回滚方案

**完整回滚** (5分钟内):

```bash
# 立即回滚到删除前的状态
git revert HEAD

# 或使用备份标签
git checkout backup-before-physics-removal

# 或从临时备份恢复
cp -r /tmp/physics-backup-*/ cocos/physics/
cp -r /tmp/native-physics-backup-*/ native/cocos/physics/
git add .
git commit -m "revert: restore physics module"
```

**部分回滚** (保留某些修改):

如果只想恢复特定部分：

```bash
# 恢复代码但不恢复配置修改
git checkout HEAD~1 -- cocos/physics/ native/cocos/physics/
git checkout HEAD~1 -- tests/physics/
git checkout HEAD~1 -- exports/physics-*.ts
# 但保留 root.ts, CMakeLists.txt等的修改（如果它们是正确的）
```

**紧急回滚脚本** (预先准备):

```bash
#!/bin/bash
# emergency-rollback-physics.sh
echo "🚨 EMERGENCY PHYSICS ROLLBACK 🚨"
echo ""

# 确认操作
read -p "Are you sure you want to rollback physics removal? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled"
    exit 1
fi

# 执行回滚
git revert HEAD --no-edit

echo ""
echo "✅ Rollback complete"
echo "Please verify with: npm run build && npm test"
```

---

## 八、成功标准

### 8.1 必须满足 (Hard Requirements - 一个都不能少)

- [x] **编译成功**
  - `npm run build` 通过（Web平台）
  - `npx tsc --noEmit` 无TypeScript错误
  - 原生平台编译通过（iOS/Android）（如果支持）
  - **零** "physics"/"Physics"/"PHYSICS" 相关的编译错误

- [x] **测试通过**
  - `npm test` 通过率 **100%**（不包括已删除的物理测试）
  - 新增的验证测试全部通过
  - 无意外的测试回归

- [x] **核心功能完好**
  - ✅ 引擎可正常初始化和运行
  - ✅ 2D渲染系统正常工作（Sprite、Graphics、TMX等）
  - ✅ UI系统正常工作（Button、Label、ScrollView等）
  - ✅ 音频系统正常工作
  - ✅ 动画系统正常工作（Spine、DragonBones、Tween）
  - ✅ 输入系统正常工作（触摸、键盘、鼠标）
  - ✅ 资源加载系统正常工作
  - ✅ 场景管理系统正常工作
  - ✅ 3D基础渲染正常工作（Camera、Light、MeshRenderer）
  - ✅ **没有任何物理相关的运行时错误或警告**

- [x] **代码整洁**
  - 无残留的physics import语句（在非测试/文档文件中）
  - 无孤立的physics类型定义
  - 无注释掉的physics代码块（应该彻底删除）
  - CMakeLists.txt中无physics相关配置
  - package.json中无physics相关依赖

### 8.2 期望达到 (Soft Goals)

#### 性能指标

| 指标 | 删除前 | 删除后 | 目标变化 |
|------|--------|--------|----------|
| **启动时间** | X ms | Y ms | ↓ 10-20% |
| **内存占用** | X MB | Y MB | ↓ 5-15 MB |
| **打包体积** (Web) | X KB | Y KB | ↓ 100-200 KB |
| **首帧时间** | X ms | Y ms | ↓ 5-15% |
| **平均帧率** (60fps场景) | X fps | Y fps | ≥ 60fps (不变或提升) |

#### 代码质量指标

- [ ] 代码总行数减少 **~39,400行** (±5%误差)
- [ ] 文件总数减少 **~156个** (±5%误差)
- [ ] npm包依赖数量减少（如果删除了第三方物理库）
- [ ] 编译时间减少 **10-20%** (少了大量代码要编译)
- [ ] 无新增的技术债务或TODO/FIXME

#### 用户体验指标

- [ ] API表面显著简化（对AI更友好）
- [ ] 文档中不再有复杂的物理章节
- [ ] 新手入门门槛降低

### 8.3 验收Checklist

在宣布"Physics模块移除完成"之前，逐项确认：

#### 编译验收
- [ ] Web平台 (`npm run build`) ✅ Pass
- [ ] TypeScript类型检查 (`npx tsc --noEmit`) ✅ Pass
- [ ] iOS原生编译 (如果支持) ✅ Pass
- [ ] Android原生编译 (如果支持) ✅ Pass
- [ ] 微信小游戏编译 (如果支持) ✅ Pass
- [ ] 字节小游戏编译 (如果支持) ✅ Pass

#### 测试验收
- [ ] 单元测试 (`npm test`) ✅ 100% Pass
- [ ] Physics专项验证测试 ✅ Pass
- [ ] 集成测试 (如果有) ✅ Pass
- [ ] E2E测试 (如果有) ✅ Pass

#### 功能验收
- [ ] 空场景加载运行 ✅ 正常
- [ ] 2D精灵场景 ✅ 正常
- [ ] UI密集场景 ✅ 正常
- [ ] 动画场景 ✅ 正常
- [ ] 音频场景 ✅ 正常
- [ ] 简单3D场景 ✅ 正常
- [ ] 复杂混合场景 ✅ 正常
- [ ] 长时间运行 (1h+) ✅ 无泄漏

#### 文档验收
- [ ] 核心目标文档已更新 ✅ 完成
- [ ] 迁移指南已完成 ✅ 可用
- [ ] Release notes已准备 ✅ 完成
- [ ] API变更通知已发布 ✅ 完成
- [ ] 本方案文档已归档 ✅ 完成

#### 性能验收
- [ ] 启动时间测试 ✅ 达标
- [ ] 内存占用测试 ✅ 达标
- [ ] 打包体积测试 ✅ 达标
- [ ] 运行时帧率测试 ✅ 达标

---

## 九、后续影响

### 9.1 对开发者的重大影响

#### 完全丧失的能力

删除Physics后，开发者**不能再**使用以下功能：

**1. 刚体动力学**
```typescript
// ❌ 这些都不再可用
const rigidbody = node.addComponent(RigidBody);
rigidbody.mass = 10;
rigidbody.linearVelocity = cc.v3(0, 10, 0);
```

**2. 碰撞检测和响应**
```typescript
// ❌ 不再有自动碰撞检测
const collider = node.addComponent(BoxCollider);
collider.on('onCollisionEnter', (event) => {
    // 不会再触发
});
```

**3. 物理约束/关节**
```typescript
// ❌ 不能创建铰链、弹簧等
const hinge = node.addComponent(HingeConstraint);
hinge.connectedBody = otherRigidbody;
```

**4. 角色控制器**
```typescript
// ❌ 不能使用内置角色控制器
const controller = node.addComponent(CapsuleCharacterController);
controller.move(moveDir);
```

**5. 射线检测**
```typescript
// ❌ 不再有物理射线检测
const result = physicsSystem.raycast(from, to);
```

**6. 物理材质**
```typescript
// ❌ 不能设置摩擦力、弹性等
const material = new PhysicsMaterial();
material.friction = 0.5;
material.restitution = 0.8;
```

**7. 多后端切换**
```typescript
// ❌ 不能在Builtin/Cannon/Bullet/PhysX之间切换
game.moduleManager.initPhysics('physx');
```

#### 仍然保留的能力 ✅

- ✅ **图形渲染** (2D/3D) - 完全不受影响
- ✅ **UI系统** - 完全不受影响
- ✅ **动画系统** - 完全不受影响
- ✅ **音频系统** - 完全不受影响
- ✅ **输入系统** - 完全不受影响
- ✅ **资源管理** - 完全不受影响
- ✅ **场景管理** - 完全不受影响
- ✅ **Tween动画** - 完全不受影响
- ✅ **数学库** (Vec3, Mat4等) - 完全不受影响
- ✅ **基础变换** (position, rotation, scale) - 完全不受影响

### 9.2 对引擎架构的影响

**正面影响**:
- 🎉 **代码量大幅减少** (-39,400行，约12-15%的总代码量)
- 🎉 **打包体积显著减小** (估计-100-200KB gzipped)
- 🎉 **内存占用降低** (少了物理系统的内存开销)
- 🎉 **启动速度提升** (不需要初始化物理后端)
- 🎉 **维护负担大幅减轻** (不用同步维护4个物理后端)
- 🎉 **AI友好度显著提升** (物理API是最复杂的API类别之一)
- 🎉 **编译时间缩短** (少了4万行代码要编译)
- 🎉 **依赖复杂度降低** (少了PhysX/Bullet等重型第三方库)

**潜在负面影响**:
- 😰 **失去物理模拟能力** (最大缺点!)
- 😰 **部分3D功能受限** (如果与物理深度耦合)
- 😰 **迁移成本高** (现有项目需要重写物理逻辑)
- 😰 **社区可能不满** (特别是做物理游戏的开发者)
- 😰 **竞争力下降** (与其他引擎相比缺少内置物理)

### 9.3 推荐的替代方案

对于确实需要物理功能的休闲游戏，推荐以下轻量级替代方案：

#### 🏆 首选推荐: Matter.js (2D物理)

**为什么推荐**:
- ✅ 极其轻量 (min+gzipped < 20KB)
- ✅ 纯JavaScript，无需原生编译
- ✅ 成熟稳定，广泛使用
- ✅ 优秀的文档和示例
- ✅ 活跃的社区支持
- ✅ 完美适合2D休闲游戏

**安装和使用**:
```bash
npm install matter-js
```

```typescript
// 集成示例
import Matter from 'matter-js';

// 创建物理引擎
const engine = Matter.Engine.create();
const world = engine.world;

// 创建地面
const ground = Matter.Bodies.rectangle(400, 510, 810, 60, { isStatic: true });

// 创建方块
const box = Matter.Bodies.rectangle(200, 200, 80, 80);

// 添加到世界
Matter.World.add(world, [ground, box]);

// 在游戏循环中更新
function gameLoop(dt) {
    Matter.Engine.update(engine, dt * 1000);

    // 同步Matter.js的位置到Cocos节点
    node.position.set(box.position.x, box.position.y, 0);
}
```

**迁移复杂度**: ⭐⭐ (中等，需要1-2天熟悉API)

#### 🥈 次选: Planck.js (2D物理 - 高性能)

**适用场景**: 需要更高性能的2D物理（如大量物体的游戏）

**安装**:
```bash
npm install planck
```

**特点**:
- Box2D的JavaScript移植
- 性能优秀
- API与Box2D类似（如果你熟悉Box2D的话）

#### 🥉 第三选择: Oimo.js (3D物理 - 轻量)

**适用场景**: 简单的3D物理需求（如小球滚动、简单堆叠）

**安装**:
```bash
npm install oimo
```

**特点**:
- 纯JavaScript 3D物理引擎
- 相对轻量
- 功能比Matter.js更多（支持3D）

#### 💪 高级选项: Ammo.js (3D物理 - 功能强大)

**适用场景**: 需要3D物理且愿意承担更大包体的高级用户

**安装**:
```bash
npm install ammo.js
```

**特点**:
- Bullet物理引擎的ASM.js/WebAssembly版本
- 功能非常强大
- **但是**: 包体较大 (~1MB+)，不适合休闲游戏

#### 🛠️ 自实现: 简单碰撞检测

**适用场景**: 只需要最基本的AABB或圆形碰撞

**代码量**: 50-200行

**优势**:
- 零依赖
- 完全可控
- 极致轻量

**示例**:
```typescript
// 超简单的AABB碰撞检测
class SimpleCollision {
    static checkAABB(a: Node, b: Node): boolean {
        const aMin = a.position.subtract(a.width/2, a.height/2, 0);
        const aMax = a.position.add(a.width/2, a.height/2, 0);
        const bMin = b.position.subtract(b.width/2, b.height/2, 0);
        const bMax = b.position.add(b.width/2, b.height/2, 0);

        return (
            aMin.x <= bMax.x && aMax.x >= bMin.x &&
            aMin.y <= bMax.y && aMax.y >= bMin.y
        );
    }
}
```

### 9.4 API变更通知

#### 完整的删除API清单

**命名空间: cc.physics (整个命名空间删除)**

```typescript
// ===== 核心系统 =====
namespace cc.physics {
    class PhysicsSystem {}              // ❌ 删除
    function getInstance(): PhysicsSystem; // ❌ 删除
}

// ===== 刚体 =====
class RigidBody {}                      // ❌ 删除
enum ERigidBodyType {                   // ❌ 删除
    DYNAMIC,
    STATIC,
    KINEMATIC
}

// ===== 碰撞器 =====
class Collider {}                        // ❌ 删除 (基类)
class BoxCollider {}                     // ❌ 删除
class SphereCollider {}                  // ❌ 删除
class CapsuleCollider {}                 // ❌ 删除
class CylinderCollider {}                // ❌ 删除
class ConeCollider {}                    // ❌ 删除
class PlaneCollider {}                   // ❌ 删除
class MeshCollider {}                    // ❌ 删除
class SimplexCollider {}                 // ❌ 删除

// ===== 约束 =====
class Constraint {}                      // ❌ 删除 (基类)
class FixedConstraint {}                 // ❌ 删除
class PointToPointConstraint {}          // ❌ 删除
class HingeConstraint {}                 // ❌ 删除
class ConfigurableConstraint {}          // ❌ 删除

// ===== 角色控制器 =====
class CharacterController {}             // ❌ 删除 (基类)
class CapsuleCharacterController {}      // ❌ 删除
class BoxCharacterController {}          // ❌ 删除

// ===== 物理材质 =====
class PhysicsMaterial {}                 // ❌ 删除

// ===== 物理后端 =====
namespace cc.physics {
    class PhysX {}                       // ❌ 删除
    class Cannon {}                      // ❌ 删除
    class Bullet {}                      // ❌ 删除
    class Builtin {}                     // ❌ 删除
}

// ===== 辅助类型 =====
interface IPhysicsRayResult {}           // ❌ 删除
enum EPhysicsGroupMask {}                // ❌ 删除
enum EColliderType {}                    // ❌ 删除
```

**总计**: 约40+个公开API被删除

#### 迁移示例大全

**示例1: 重力下落 (最常见)**

```typescript
// ===== 旧的Cocos Physics =====
import { RigidBody } from 'cc';

@ccclass('FallingObject')
export class FallingObject extends Component {
    @property(RigidBody)
    rigidbody: RigidBody = null;

    start() {
        // 物理引擎自动处理重力
    }
}

// ===== 新的实现 (Matter.js) =====
import Matter from 'matter-js';

@ccclass('FallingObject')
export class FallingObject extends Component {
    private body: Matter.Body;

    start() {
        // 创建Matter.js物理体
        this.body = Matter.Bodies.rectangle(
            this.node.position.x,
            this.node.position.y,
            this.node.width,  // 假设有width属性
            this.node.height
        );

        // 添加到物理世界
        Matter.World.add(physicsWorld, this.body);
    }

    update(dt) {
        // 同步位置
        this.node.position.set(
            this.body.position.x,
            this.body.position.y,
            0
        );

        // 同步旋转（如果需要）
        this.node.eulerAngles.set(
            0,
            0,
            this.body.angle * (180 / Math.PI)
        );
    }
}
```

**示例2: 碰撞检测**

```typescript
// ===== 旧的Cocos Physics =====
import { BoxCollider, Collider } from 'cc';

@ccclass('Player')
export class Player extends Component {
    @property(BoxCollider)
    collider: BoxCollider;

    onLoad() {
        this.collider.on('onCollisionEnter', this.onCollisionEnter, this);
    }

    onCollisionEnter(event: Collider.ICollisionEvent) {
        if (event.otherCollider.tag === 0) {
            console.log('碰到敌人!');
        }
    }
}

// ===== 新的实现 (Matter.js) =====
import Matter from 'matter-js';
import { EventTarget } from 'cc';

@ccclass('Player')
export class Player extends Component {
    private body: Matter.Body;

    start() {
        this.body = Matter.Bodies.rectangle(/* ... */);

        // 设置碰撞回调
        Matter.Events.on(physicsEngine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                if (pair.bodyA === this.body || pair.bodyB === this.body) {
                    this.handleCollision(pair);
                }
            });
        });
    }

    handleCollision(pair) {
        const other = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
        console.log('碰撞到:', other.label);
    }
}
```

**示例3: 角色移动（平台游戏）**

```typescript
// ===== 旧的Cocos Physics =====
import { CapsuleCharacterController, RigidBody } from 'cc';

@ccclass('PlatformerPlayer')
export class PlatformerPlayer extends Component {
    @property(CapsuleCharacterController)
    controller: CapsuleCharacterController;

    update(dt) {
        const input = systemEvent.getAxisValue();

        // 使用角色控制器移动
        this.controller.move(
            cc.v3(input.x * 5 * dt, 0, input.y * 5 * dt),
            dt,
            Math.min(dt, 0.1)
        );
    }
}

// ===== 新的实现 (自定义简单物理) =====
@ccclass('PlatformerPlayer')
export class PlatformerPlayer extends Component {
    private velocity = cc.v3(0, 0, 0);
    private speed = 200;
    private gravity = -980;

    update(dt) {
        // 读取输入
        const input = systemEvent.getAxisValue();

        // 应用水平速度
        this.velocity.x = input.x * this.speed;

        // 应用重力
        this.velocity.y += this.gravity * dt;

        // 更新位置
        this.node.position.x += this.velocity.x * dt;
        this.node.position.y += this.velocity.y * dt;

        // 简单的地面检测（需要自己实现）
        if (this.isOnGround()) {
            this.velocity.y = 0;
            // 允许跳跃
            if (input.jump) {
                this.velocity.y = 500; // 跳跃初速度
            }
        }
    }

    private isOnGround(): boolean {
        // 使用射线检测或AABB检测地面
        // 这里简化为检查y坐标
        return this.node.position.y <= 100; // 地面高度
    }
}
```

---

## 十、附录

### A. 完整文件删除清单

```
==================================================
TypeScript文件 (cocos/physics/) - 100个文件
==================================================

cocos/physics/
├── category.json
│
├── framework/                          # 框架核心 (15文件, ~2220行)
│   ├── index.ts
│   ├── physics-system.ts              # ★ 物理系统主类
│   ├── physics-selector.ts
│   ├── physics-interface.ts
│   ├── physics-config.ts
│   ├── physics-enum.ts
│   ├── physics-ray-result.ts
│   ├── collision-matrix.ts
│   ├── deprecated.ts
│   │
│   └── components/                     # 组件层 (18文件, ~3930行)
│       ├── rigid-body.ts             # ★ 刚体组件
│       ├── constant-force.ts
│       │
│       ├── colliders/                 # 碰撞器 (11文件)
│       │   ├── collider.ts           # ★ 基类
│       │   ├── box-collider.ts
│       │   ├── sphere-collider.ts
│       │   ├── capsule-collider.ts
│       │   ├── cylinder-collider.ts
│       │   ├── cone-collider.ts
│       │   ├── plane-collider.ts
│       │   ├── mesh-collider.ts
│       │   └── simplex-collider.ts
│       │
│       ├── constraints/               # 约束 (6文件)
│       │   ├── constraint.ts         # ★ 基类
│       │   ├── fixed-constraint.ts
│       │   ├── point-to-point-constraint.ts
│       │   ├── hinge-constraint.ts
│       │   └── configurable-constraint.ts
│       │
│       ├── character-controllers/     # 角色控制器 (3文件)
│       │   ├── character-controller.ts
│       │   ├── capsule-character-controller.ts
│       │   └── box-character-controller.ts
│       │
│       └── assets/                    # 资源 (1文件)
│           └── physics-material.ts
│
├── spec/                              # 接口规范 (9文件, ~1380行)
│   ├── i-physics-world.ts
│   ├── i-physics-shape.ts
│   ├── i-rigid-body.ts
│   ├── i-physics-constraint.ts
│   ├── i-character-controller.ts
│   ├── i-lifecycle.ts
│   ├── i-group-mask.ts
│   └── i-external.ts
│
├── utils/                             # 工具函数 (4文件, ~830行)
│   ├── util.ts
│   ├── tuple-dictionary.ts
│   ├── object-collision-matrix.ts
│   └── array-collision-matrix.ts
│
├── cocos/                             # Builtin后端 (10文件, ~2300行)
│   ├── builtin-world.ts
│   ├── builtin-interface.ts
│   ├── builtin-rigid-body.ts
│   ├── builtin-shared-body.ts
│   ├── instantiate.ts
│   ├── object/
│   │   └── builtin-object.ts
│   └── shapes/
│       ├── builtin-shape.ts
│       ├── builtin-box-shape.ts
│       ├── builtin-sphere-shape.ts
│       └── builtin-capsule-shape.ts
│
├── cannon/                            # Cannon.js后端 (20文件, ~4400行)
│   ├── cannon-world.ts
│   ├── cannon-rigid-body.ts
│   ├── cannon-shared-body.ts
│   ├── cannon-contact-equation.ts
│   ├── cannon-util.ts
│   ├── instantiate.ts
│   ├── shapes/ (8文件)
│   └── constraints/ (6文件)
│
├── bullet/                           # Bullet后端 (25文件, ~6300行)
│   ├── bullet-world.ts
│   ├── bullet-rigid-body.ts
│   ├── bullet-shared-body.ts
│   ├── bullet-interface.ts
│   ├── bullet-env.ts
│   ├── bullet-utils.ts
│   ├── bullet-cache.ts
│   ├── bullet-enum.ts
│   ├── bullet-contact-data.ts
│   ├── instantiate.ts
│   ├── instantiated.ts
│   ├── shapes/ (11文件)
│   ├── constraints/ (6文件)
│   └── character-controllers/ (3文件)
│
└── physx/                            # PhysX后端 (25文件, ~6850行)
    ├── physx-world.ts
    ├── physx-rigid-body.ts
    ├── physx-shared-body.ts
    ├── physx-adapter.ts
    ├── physx-instance.ts
    ├── physx-contact-equation.ts
    ├── physx-enum.ts
    ├── instantiate.ts
    ├── instantiate.jsb.ts
    ├── shapes/ (10文件)
    ├── joints/ (7文件)
    └── character-controllers/ (4文件)


==================================================
C++文件 (native/cocos/physics/) - 51个文件
==================================================

native/cocos/physics/
├── spec/                             # 接口规范 (6文件, ~720行)
│   ├── IWorld.h
│   ├── IShape.h
│   ├── IBody.h
│   ├── IJoint.h
│   ├── ICharacterController.h
│   └── ILifecycle.h
│
├── sdk/                              # SDK抽象层 (10文件, ~2170行)
│   ├── World.cpp / World.h
│   ├── Shape.cpp / Shape.h
│   ├── RigidBody.cpp / RigidBody.h
│   ├── Joint.cpp / Joint.h
│   └── CharacterController.cpp / CharacterController.h
│
└── physx/                            # PhysX实现 (35文件, ~8300行)
    ├── PhysXWorld.cpp / .h
    ├── PhysXRigidBody.cpp / .h
    ├── PhysXSharedBody.cpp / .h
    ├── PhysXUtils.cpp / .h
    ├── PhysXEventManager.cpp / .h
    ├── PhysXFilterShader.cpp / .h
    ├── PhysXInc.h
    ├── PhysX.h
    ├── PhysicsSDK.h
    ├── PhysicsSelector.h
    ├── shapes/ (11文件)
    ├── joints/ (8文件)
    └── character-controllers/ (5文件)


==================================================
其他文件
==================================================

exports/
├── physics-ammo.ts                   # Ammo.js导出
├── physics-builtin.ts                # Builtin导出
├── physics-cannon.ts                 # Cannon.js导出
├── physics-physx.ts                  # PhysX导出
└── physics-2d-box2d.ts              # 2D Box2D导出

tests/physics/                        # 测试套件 (11文件)
├── physics.test.ts
├── character-controller.ts
├── constraint.ts
├── dynamic.ts
├── event.ts
├── filtering.ts
├── raycast.ts
├── sleep.ts
├── stability.ts
├── sweep.ts
└── volume.ts


==================================================
统计汇总（已包含 2D Physics ⚠️ 原方案遗漏）
==================================================

==================== 3D Physics (cocos/physics/) ====================

TypeScript 文件总数: ~100 个
TypeScript 代码总行数: ~28,210 行

C++ 文件总数: 51 个
C++ 代码总行数: ~11,190 行

3D 导出文件: 5 个
3D 测试文件: 11 个 (含 ~119 个测试用例)


==================== 2D Physics (cocos/physics-2d/) ⚠️ 原方案完全遗漏 ====================

TypeScript 文件总数: ~65 个 (估计)
TypeScript 代码总行数: ~8,000+ 行 (估计)

2D 导出文件: 5 个
2D 测试文件: 7 个 (含 ~50+ 个测试用例，估计)


==========================================
总计统计
==========================================

TypeScript 文件总数: ~165 个 (3D:100 + 2D:65)
TypeScript 代码总行数: ~36,210+ 行 (3D:28,210 + 2D:8,000)

C++ 文件总数: 51 个 (仅3D物理)
C++ 代码总行数: ~11,190 行

导出文件总数: 10 个 (3D:5 + 2D:5)
测试文件总数: 18 个 (3D:11 + 2D:7)
测试用例总数: ~169+ 个 (3D:119 + 2D:50+)

==========================================
最终总计: ~234+ 个文件, ~47,400+ 行代码, ~169+ 个测试用例
==========================================
```

### B. 需要修改的文件清单（预计60-70个）⚠️ 已大幅更新

```
必须修改 (P0 - 阻塞编译):
├── cocos/game/game.ts ⚠️ 原方案遗漏！
│   └── 删除 IPhysicsConfig import、physics 属性、配置处理代码
├── cocos/game/director.ts ⚠️ 原方案遗漏！
│   └── 删除 BEFORE_PHYSICS/AFTER_PHYSICS 事件定义和注释
├── typedoc-index.ts
│   └── 删除 physics 和 physics-2d 的 export 语句
├── cocos/3d/reflection-probe/reflection-probe-component.ts ⚠️ 原方案遗漏！
│   └── 特殊处理：将 absolute 函数内联或移到 3D utils 中

应该修改 (P1 - 影响功能):
├── cc.config.json ⚠️ 原方案遗漏！
│   └── 删除第109-142行所有 physics 模块配置（10个模块）
├── DebugInfos.json ⚠️ 原方案遗漏！
│   └── 删除 ~13 条 physics 相关错误信息
├── package.json
│   └── 删除 @cocos/cannon 和 @cocos/box2d 依赖
├── native/CMakeLists.txt (第2005-2080行)
│   └── 删除整个 physics 源文件列表 (~70个文件引用)
├── native/tools/simulator/frameworks/runtime-src/CMakeLists.txt
│   └── 删除 USE_PHYSICS_PHYSX 选项
├── native/tests/sebind-tests/common/CMakeLists.txt
│   └── 删除 USE_PHYSICS_PHYSX 选项
├── tsconfig.json (如果包含physics路径映射)
│   └── 删除 cc/physics/* 和 cc/physics-2d/* 路径映射

可以修改 (P2 - 影响辅助功能):
├── editor/ 中的物理工具 (3-5个)
├── examples/ templates/ 中的物理示例 (5-10个)
└── 注释和文档中的physics引用

总修改文件数估计: 60-70个 (平均 ~65个)
⚠️ 比原方案多出 ~10 个关键文件！
```

### C. 关键搜索命令

```bash
# 1. 确认所有physics引用已清理
find . -path ./node_modules -prune -o \
       -path ./litePlan -prune -o \
       -name "*.ts" -exec grep -l "from.*[\"'].*physics\|[\"'].*physics" {} \; \
    | grep -v ".test.ts" | grep -v ".d.ts"

# 应该返回空结果（除了我们允许的文件）

# 2. 确认目录已删除
test -d cocos/physics && echo "❌ TS physics still exists!" || echo "✅ TS deleted"
test -d native/cocos/physics && echo "❌ Native physics still exists!" || echo "✅ Native deleted"

# 3. 统计删除的代码量
git diff --stat HEAD~1 HEAD | tail -5

# 4. 搜索大小写变体
grep -ri "physics\|Physics\|PHYSICS" cocos/ native/ exports/ \
    --include="*.ts" --include="*.cpp" --include="*.h" \
    | grep -v node_modules | grep -v litePlan | wc -l

# 5. 检查CMakeLists.txt
grep -i "physics\|physx\|bullet" native/CMakeLists.txt

# 6. 检查package.json
grep -i "physics\|cannon\|ammo\|oimo" package.json

# 7. 验证测试已删除
test -d tests/physics && echo "❌ Tests still exist!" || echo "✅ Tests deleted"
```

### D. 时间线规划

```
Week 1 (5-7个工作日):

Day 1 (Monday):
├─ Morning: Phase 1 - 准备工作 (分支、备份、基线测试)
├─ Afternoon: 开始 Phase 2 - 删除代码
└─ Evening: 初步尝试编译，了解错误规模

Day 2 (Tuesday):
├─ All day: Phase 3 - 清理依赖引用 (P0优先级)
└─ Goal: 完成所有P0文件的修改

Day 3 (Wednesday):
├─ Morning: 继续 Phase 3 (P1优先级)
├─ Afternoon: Phase 4 - 第一轮编译修复
└─ Evening: 第2-3轮编译修复

Day 4 (Thursday):
├─ All day: Phase 4 - 迭代编译修复 (第4-8轮)
└─ Goal: 达到编译通过或接近通过

Day 5 (Friday):
├─ Morning: 完成最后的编译修复
├─ Afternoon: Phase 5 - 原生平台编译
├─ Evening: Phase 6 - 测试验证
└─ Goal: Web+Native编译都通过，测试基本通过

Day 6 (Saturday - optional buffer):
├─ Morning: 修复遗留的测试失败
├─ Afternoon: Phase 7 - 功能验证
└─ Evening: 性能基准测试

Day 7 (Sunday - optional buffer):
├─ Morning: Phase 8 - 文档和清理
├─ Afternoon: 最终验收checklist
└─ Evening: 提交代码，庆祝！🎉
```

**缓冲时间**: 建议预留+2天缓冲（共7-9天）

### E. 团队协作注意事项

如果是团队协作，还需要：

- [ ] **代码冻结**: 在移除期间，禁止其他人向相关分支提交
- [ ] **代码审查**: 每天的进展需要代码审查
- [ ] **每日站会**: 汇报进度和阻塞问题
- [ ] **风险升级**: 遇到无法解决的问题及时升级
- [ ] **知识共享**: 记录遇到的问题和解决方案

### F. 参考文档

- [核心目标.md](./核心目标.md) - 总体规划
- [01-移除Profiler模块.md](./01-移除Profiler模块.md) - 已完成
- [02-移除Terrain模块.md](./02-移除Terrain模块.md) - 已完成
- [03-移除RenderGraph模块.md](./03-移除RenderGraph模块.md) - 已完成
- [05-移除3D模块.md](./05-移除3D模块.md) - 待执行
- [Matter.js官方文档](https://brm.io/matter-js/docs/)
- [Planck.js GitHub](https://piqnt.com/planck.js/)
- [Oimo.js GitHub](https://lo-th.github.io/Oimo.js/)

---

## 十一、最终决策 Checklist

### 在开始执行前，最后确认：

#### 前置条件 ✅

- [ ] Profiler模块已成功移除且稳定运行1周以上
- [ ] Terrain模块已成功移除且稳定运行3天以上
- [ ] Render Graph模块已成功移除且稳定运行3天以上
- [ ] 当前main分支编译100%通过
- [ ] 当前测试套件100%通过
- [ ] 已创建backup tag: `backup-before-physics-removal`
- [ ] 已将physics目录（3D + 2D）备份到外部存储
- [ ] 已完成影响范围分析（知道大约有多少文件需要修改）
- [ ] 已通知所有团队成员（如果是团队协作）
- [ ] 已安排好连续7-10天的工作时间（不被打断）
- [ ] 已准备好回滚方案和紧急回滚脚本
- [ ] 已准备好迁移指南大纲（即使还没写完）
- [ ] **已再次阅读本方案全文，理解每一个步骤和风险**

#### 心理准备

- [ ] 我理解这是**最具风险的**一次移除操作
- [ ] 我做好了面对**大量编译错误**的心理准备（可能100+个）
- [ ] 我准备了**足够的耐心**来完成5-10轮编译-修复循环
- [ ] 我知道可能在**最后时刻需要放弃**并回滚（这没关系！）
- [ ] 我有**紧急联系方式**可以寻求帮助

#### 资源准备

- [ ] 开发环境就绪（IDE、终端、Git）
- [ ] 备用电脑可用（防万一主电脑出问题）
- [ ] 网络连接稳定（需要查资料）
- [ ] 咖啡/茶 ☕️ （会需要很多！）

---

**当你勾选了上面所有选项后，就可以开始了！**

**祝你好运！这可能是一场硬仗，但完成后你会非常有成就感！** 🚀💪

---

**文档版本**: v1.0 (Final)
**创建时间**: 2026-04-10
**负责人**: [待定 - 需要资深工程师]
**审核人**: [待定 - 需要技术负责人]
**技术评审委员会**: [待批准]
**预计开始日期**: [Profiler/Terrain/RenderGraph全部完成后 + 1周缓冲]
**预计完成日期**: [开始后5-7个工作日内]
**前置依赖**:
  - ✅ 01-Profiler模块 (必须完成)
  - ✅ 02-Terrain模块 (必须完成)
  - ✅ 03-RenderGraph模块 (必须完成)
**后续任务**: 05-3D模块移除
**风险等级**: ⭐⭐⭐⭐⭐ (EXTREME - 最高风险)
**回滚难度**: 简单 (git revert即可)
**恢复时间**: < 10分钟 (如果需要回滚)
