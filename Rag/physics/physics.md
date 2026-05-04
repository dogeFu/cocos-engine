# Cocos Creator 引擎 — 物理系统

> 面向 AI 辅助编程的中文参考文档。覆盖 3D 物理和 2D 物理系统。

---

## 目录

1. [cocos/physics/ — 3D 物理系统](#1-cocosphysics--3d-物理系统)
2. [cocos/physics-2d/ — 2D 物理系统](#2-cocosphysics-2d--2d-物理系统)

---

## 1. cocos/physics/ — 3D 物理系统

### 1.1 架构概览

3D 物理系统采用接口-实现分离架构：

- **框架层**（`cocos/physics/framework/`）：定义物理接口和组件
- **后端实现**：
  - `cocos/physics/cannon/` — Cannon.js（开源物理引擎）
  - `cocos/physics/bullet/` — Bullet（原生物理引擎，通过 JSB）
  - `cocos/physics/physx/` — PhysX（NVIDIA 物理引擎，通过 JSB）
  - `cocos/physics/simple/` — 简单物理（仅射线检测）

**后端选择：** 通过 `settings.querySettings('physics', 'physicsEngine')` 配置。

### 1.2 PhysicsSystem（`cocos/physics/framework/physics-system.ts`）

3D 物理系统单例。以优先级 0 注册为 `director` 的系统。

**单例：** `PhysicsSystem.instance`

#### 关键属性

- `allowSleep`：是否允许物理体休眠
- `fixedTimeStep`：固定时间步长（默认 1/60）
- `maxSubSteps`：最大子步数（默认 1）
- `gravity`：全局重力（`Vec3`，默认 (0, -10, 0)）
- `autoSimulation`：是否自动模拟
- `defaultMaterial`：默认物理材质

#### 关键方法

- `step(dt)`：执行物理模拟步进
- `raycast(worldRay, mask?, maxDistance?, queryTrigger?)`：射线检测
- `raycastClosest(worldRay, mask?, maxDistance?, queryTrigger?)`：射线检测（最近）
- `sweep(box, worldRay, mask?, maxDistance?, queryTrigger?)`：扫描检测
- `overlap(box, mask?)`：重叠检测
- `flush()`：刷新物理查询结果

#### 隐含知识

- 物理模拟在 `director.tick()` 的 `BEFORE_PHYSICS` 和 `AFTER_PHYSICS` 事件之间执行
- `autoSimulation = false` 时需要手动调用 `step()`
- `fixedTimeStep` 和 `maxSubSteps` 控制物理模拟的精度
- 射线检测的结果在 `PhysicsSystem.instance.raycastResults` 中

### 1.3 RigidBody（`cocos/physics/framework/components/rigid-body.ts`）

3D 刚体组件。

#### 关键属性

- `type`：`ERigidBodyType` — 刚体类型
- `mass`：质量
- `allowSleep`：是否允许休眠
- `linearDamping`：线性阻尼
- `angularDamping`：角阻尼
- `linearFactor`：线性因子（约束各轴运动）
- `angularFactor`：角因子（约束各轴旋转）
- `useGravity`：是否受重力影响
- `isSleeping`（只读）：是否正在休眠
- `isStatic`（只读）：是否为静态体

#### ERigidBodyType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `DYNAMIC` | 动态刚体（受力和碰撞影响） |
| 1 | `STATIC` | 静态刚体（不移动，如地面） |
| 2 | `KINEMATIC` | 运动学刚体（不受力，通过代码控制） |

#### 关键方法

- `applyForce(force, relativePoint?)`：施加力
- `applyImpulse(impulse, relativePoint?)`：施加冲量
- `applyTorque(torque)`：施加扭矩
- `applyLocalForce(force, relativePoint?)`：施加本地力
- `applyLocalImpulse(impulse, relativePoint?)`：施加本地冲量
- `applyLocalTorque(torque)`：施加本地扭矩
- `wakeUp()`：唤醒
- `sleep()`：休眠
- `setLinearVelocity(value)` / `getLinearVelocity()`：设置/获取线速度
- `setAngularVelocity(value)` / `getAngularVelocity()`：设置/获取角速度
- `setGroup(value)` / `getGroup()`：设置/获取碰撞组
- `addGroup(group)` / `removeGroup(group)`：添加/移除碰撞组

#### 隐含知识

- 动态刚体质量为 0 时会被视为静态体
- `linearFactor` 和 `angularFactor` 是 `Vec3`，值为 0 时锁定对应轴
- 休眠的刚体不参与物理模拟，节省性能
- `applyForce` 是持续力，`applyImpulse` 是瞬时冲量
- 碰撞组使用位掩码，最多 32 组

### 1.4 碰撞器组件

所有碰撞器继承基类 `Collider`（`cocos/physics/framework/components/collider.ts`）。

#### Collider 基类

- `attachedRigidBody`：关联的刚体
- `material`：物理材质
- `isTrigger`：是否为触发器
- `shape`：内部形状对象

#### BoxCollider（`cocos/physics/framework/components/colliders/box-collider.ts`）

- `size`：`Vec3` — 盒子尺寸

#### SphereCollider（`cocos/physics/framework/components/colliders/sphere-collider.ts`）

- `radius`：`number` — 球体半径

#### CylinderCollider（`cocos/physics/framework/components/colliders/cylinder-collider.ts`）

- `radius`：`number` — 圆柱半径
- `height`：`number` — 圆柱高度
- `direction`：`ColliderDirection` — 轴向

#### CapsuleCollider（`cocos/physics/framework/components/colliders/capsule-collider.ts`）

- `radius`：`number` — 胶囊半径
- `height`：`number` — 胶囊高度
- `direction`：`ColliderDirection` — 轴向

#### ConeCollider（`cocos/physics/framework/components/colliders/cone-collider.ts`）

- `radius`：`number` — 圆锥半径
- `height`：`number` — 圆锥高度
- `direction`：`ColliderDirection` — 轴向

#### MeshCollider（`cocos/physics/framework/components/colliders/mesh-collider.ts`）

- `mesh`：`Mesh` — 碰撞网格
- `convex`：`boolean` — 是否为凸包

**注意：** MeshCollider 仅在 Bullet 和 PhysX 后端支持。Cannon.js 不支持。

#### SimplexCollider（`cocos/physics/framework/components/colliders/simplex-collider.ts`）

- `shapeType`：`ESimplexColliderType` — 形状类型（TETRAHEDRON 等）
- `vertices`：`Vec3[]` — 顶点数组

#### TerrainCollider（`cocos/physics/framework/components/colliders/terrain-collider.ts`）

- `terrain`：`TerrainAsset` — 地形资源
- `holes`：`boolean[]` — 洞数组

### 1.5 物理材质（`cocos/physics/framework/physics-material.ts`）

- `friction`：摩擦系数（0-1）
- `restitution`：弹性系数（0-1）

### 1.6 碰撞回调

碰撞事件通过 `Collider` 组件分发：

| 事件 | 说明 |
|---|---|
| `onCollisionEnter` | 碰撞开始 |
| `onCollisionStay` | 碰撞持续 |
| `onCollisionExit` | 碰撞结束 |

触发器事件：

| 事件 | 说明 |
|---|---|
| `onTriggerEnter` | 触发器进入 |
| `onTriggerStay` | 触发器持续 |
| `onTriggerExit` | 触发器退出 |

**注册方式：**

```ts
// 碰撞回调
let collider = this.getComponent(Collider);
collider.on('onCollisionEnter', (event: ICollisionEvent) => {
    // event.otherCollider — 另一个碰撞器
    // event.selfCollider — 当前碰撞器
}, this);
```

### 1.7 射线检测

```ts
const worldRay = new geometry.Ray(origin, direction);
const mask = PhysicsSystem.PhysicsGroup.DEFAULT;
const maxDistance = 100;
const queryTrigger = true;

// 检测所有命中
PhysicsSystem.instance.raycast(worldRay, mask, maxDistance, queryTrigger);
const results = PhysicsSystem.instance.raycastResults;

// 检测最近命中
PhysicsSystem.instance.raycastClosest(worldRay, mask, maxDistance, queryTrigger);
const result = PhysicsSystem.instance.raycastClosestResult;
```

#### RaycastResult

- `collider`：命中的碰撞器
- `distance`：命中距离
- `hitPoint`：命中点（世界坐标）
- `hitNormal`：命中法线

### 1.8 碰撞矩阵

碰撞矩阵定义哪些碰撞组之间会碰撞。通过项目设置配置。

```ts
// 运行时修改
PhysicsSystem.instance.setCollisionGroup(group1, group2, true); // 启用碰撞
PhysicsSystem.instance.setCollisionGroup(group1, group2, false); // 禁用碰撞
```

### 1.9 隐含知识

- 物理引擎后端在引擎初始化时选择，运行时不可切换
- Cannon.js 是纯 JS 实现，性能最低但兼容性最好
- Bullet 通过 JSB 调用原生代码，性能中等
- PhysX 性能最好，但仅支持原生平台
- 简单物理后端（simple）仅支持射线检测，不支持碰撞模拟
- 物理模拟和渲染不在同一线程（原生平台），存在一帧延迟
- `isTrigger = true` 的碰撞器不参与物理响应，仅触发事件
- 碰撞器需要与 RigidBody 在同一节点上才能参与物理模拟

---

## 2. cocos/physics-2d/ — 2D 物理系统

### 2.1 架构概览

2D 物理系统采用 **策略模式 + 注册机制** 的架构，通过 `PhysicsSelector` 实现后端切换，框架层与后端实现完全解耦。

**目录结构：**

```
physics-2d/
├── spec/           — 接口定义层（IPhysicsWorld, IRigidBody2D, IJoint2D 等）
├── framework/      — 框架层（PhysicsSystem2D, PhysicsSelector, 组件定义）
│   ├── components/
│   │   ├── colliders/   — 碰撞体组件
│   │   └── joints/      — 关节组件（9 种）
│   └── physics-selector.ts  — 核心选择器
├── builtin/        — 内置简易后端（仅碰撞检测，无物理模拟）
├── box2d/          — Box2D JS 后端（@cocos/box2d）
├── box2d-wasm/     — Box2D WASM 后端
└── box2d-jsb/      — Box2D JSB 后端（原生平台）
```

### 2.2 PhysicsSelector 机制

**文件：** `cocos/physics-2d/framework/physics-selector.ts`

`PhysicsSelector` 是后端选择器单例，管理物理引擎的注册和切换：

| 属性 | 说明 |
|------|------|
| `id` | 当前使用的后端 ID |
| `wrapper` | 当前后端的包装对象（包含各类构造函数） |
| `backend` | 所有已注册后端的映射表 |
| `physicsWorld` | 当前物理世界实例 |

**核心方法：**

| 方法 | 功能 |
|------|------|
| `register(id, wrapper)` | 注册后端，初始化前注册的最后一个自动成为当前后端 |
| `switchTo(id)` | 切换后端，会重建物理世界 |
| `createPhysicsWorld()` | 通过 `new selector.wrapper.PhysicsWorld()` 创建物理世界 |
| `createRigidBody()` | builtin 返回空壳对象，其他后端通过 wrapper 创建 |
| `createShape(type)` | 通过延迟初始化的代理对象按类型创建碰撞体 |
| `createJoint(type)` | builtin 返回空壳 ENTIRE_JOINT，其他后端通过 wrapper 创建 |

**空壳模式：** `ENTIRE_WORLD`、`EntireBody`、`ENTIRE_SHAPE`、`ENTIRE_JOINT` 都是所有方法返回 `0` 的空对象，builtin 后端使用这些空壳。

### 2.3 三个后端的注册与差异

| 后端 | 注册 ID | PhysicsWorld 类 | RigidBody | Joint |
|------|---------|----------------|-----------|-------|
| builtin | `'builtin'` | `BuiltinPhysicsWorld` | null（空壳） | null（空壳） |
| box2d | `'box2d'` | `b2PhysicsWorld` | `b2RigidBody2D` | `b2Joint` |
| box2d-wasm | `'box2d-wasm'` | `B2PhysicsWorld` | `B2RigidBody2D` | `B2Joint` |
| box2d-jsb | `'box2d-jsb'` | `b2PhysicsWorld` | `b2RigidBody2D` | `b2Joint` |

**builtin 后端：** 只有碰撞检测（`BuiltinPhysicsWorld`），没有物理模拟。`RigidBody` 和所有 `Joint` 均为 null。碰撞通过 `BuiltinContact` 类手动判断 AABB/形状重叠。

**box2d 后端：** 使用 `@cocos/box2d`（纯 JS 版 Box2D），`b2PhysicsWorld` 内部持有 `b2.World` 实例。

**box2d-wasm 后端：** 使用 WASM 编译的 Box2D（`B2` 命名空间），通过 `addImplPtrReference`/`removeImplPtrReference` 维护 TS 对象与 WASM 指针的映射。额外提供 `loadWasmModuleBox2D()` 异步加载函数。

**box2d-jsb 后端：** 注册 ID 为 `'box2d-jsb'`，用于原生平台 JSB 绑定，底层通过 JSB 桥接调用 C++ Box2D。

### 2.4 关节实现体系

基类 `Joint2D`（`cocos/physics-2d/framework/components/joints/joint-2d.ts`）继承自 `Component`，核心属性：
- `anchor` / `connectedAnchor`：关节在本地/连接刚体空间的位置
- `collideConnected`：是否开启碰撞
- `connectedBody`：连接的刚体

9 种关节组件：

| 组件 | TYPE | 特有属性 |
|------|------|----------|
| DistanceJoint2D | DISTANCE | maxLength, autoCalcDistance |
| SpringJoint2D | SPRING | distance, frequency, dampingRatio |
| FixedJoint2D | FIXED | frequency, dampingRatio |
| MouseJoint2D | MOUSE | target, frequency, dampingRatio, maxForce |
| RelativeJoint2D | RELATIVE | maxForce, maxTorque, linearOffset, angularOffset, correctionFactor |
| SliderJoint2D | SLIDER | enableLimit, lowerLimit, upperLimit, enableMotor, maxMotorForce, motorSpeed |
| WheelJoint2D | WHEEL | enableMotor, maxMotorTorque, motorSpeed, frequency, dampingRatio |
| HingeJoint2D | HINGE | enableMotor, maxMotorTorque, motorSpeed, enableLimit, lowerAngle, upperAngle |

**生命周期：** `onLoad` → `createJoint(this.TYPE)` → `_joint.initialize(this)` → `onEnable` → `_joint.onEnable()`

### 2.5 PhysicsSystem2D（`cocos/physics-2d/framework/physics-system.ts`）

2D 物理系统单例。

**单例：** `PhysicsSystem2D.instance`

#### 关键属性

- `gravity`：全局重力（`Vec2`，默认 (0, -10)）
- `fixedTimeStep`：固定时间步长
- `velocityIterations`：速度迭代次数
- `positionIterations`：位置迭代次数
- `autoSimulation`：是否自动模拟
- `allowSleep`：是否允许休眠

#### 关键方法

- `step(dt, velocityIterations?, positionIterations?)`：执行物理模拟步进
- `raycast(p1, p2, type?)`：2D 射线检测
- `testPoint(point)`：点测试
- `testAABB(rect)`：AABB 测试

### 2.3 RigidBody2D（`cocos/physics-2d/framework/components/rigid-body-2d.ts`）

2D 刚体组件。

#### 关键属性

- `type`：`ERigidBody2DType` — 刚体类型
- `allowSleep`：是否允许休眠
- `gravityScale`：重力缩放
- `linearDamping`：线性阻尼
- `angularDamping`：角阻尼
- `linearVelocity`：线速度
- `angularVelocity`：角速度
- `fixedRotation`：是否固定旋转
- `bullet`：是否为高速物体

#### ERigidBody2DType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `DYNAMIC` | 动态刚体 |
| 1 | `STATIC` | 静态刚体 |
| 2 | `KINEMATIC` | 运动学刚体 |

#### 关键方法

- `applyForce(force, point?, wake?)`：施加力
- `applyForceToCenter(force, wake?)`：向中心施加力
- `applyTorque(torque, wake?)`：施加扭矩
- `applyLinearImpulse(impulse, point?, wake?)`：施加线性冲量
- `applyLinearImpulseToCenter(impulse, wake?)`：向中心施加线性冲量
- `applyAngularImpulse(impulse, wake?)`：施加角冲量
- `wakeUp()`：唤醒
- `sleep()`：休眠

### 2.4 碰撞器组件

#### Collider2D 基类（`cocos/physics-2d/framework/components/colliders/collider-2d.ts`）

- `density`：密度
- `sensor`：是否为传感器
- `friction`：摩擦系数
- `restitution`：弹性系数
- `offset`：偏移
- `apply()`：应用修改

#### BoxCollider2D（`cocos/physics-2d/framework/components/colliders/box-collider-2d.ts`）

- `size`：`Size` — 盒子尺寸

#### CircleCollider2D（`cocos/physics-2d/framework/components/colliders/circle-collider-2d.ts`）

- `radius`：`number` — 半径

#### PolygonCollider2D（`cocos/physics-2d/framework/components/colliders/polygon-collider-2d.ts`）

- `points`：`Vec2[]` — 多边形顶点

#### EdgeCollider2D（`cocos/physics-2d/framework/components/colliders/edge-collider-2d.ts`）

- `points`：`Vec2[]` — 边的端点

### 2.5 关节组件

| 关节 | 文件 | 说明 |
|---|---|---|
| `DistanceJoint2D` | `joints/distance-joint-2d.ts` | 距离关节 |
| `RevoluteJoint2D` | `joints/revolute-joint-2d.ts` | 旋转关节 |
| `PrismaticJoint2D` | `joints/prismatic-joint-2d.ts` | 棱柱关节 |
| `WeldJoint2D` | `joints/weld-joint-2d.ts` | 焊接关节 |
| `WheelJoint2D` | `joints/wheel-joint-2d.ts` | 轮子关节 |
| `MouseJoint2D` | `joints/mouse-joint-2d.ts` | 鼠标关节 |
| `MotorJoint2D` | `joints/motor-joint-2d.ts` | 马达关节 |
| `RelativeJoint2D` | `joints/relative-joint-2d.ts` | 相对关节 |

### 2.6 碰撞回调

2D 物理碰撞回调与 3D 类似：

```ts
let collider = this.getComponent(Collider2D);
collider.on('onBeginContact', (event: IPhysics2DContactEvent) => {
    // event.selfCollider — 当前碰撞器
    // event.otherCollider — 另一个碰撞器
}, this);
```

| 事件 | 说明 |
|---|---|
| `onBeginContact` | 接触开始 |
| `onEndContact` | 接触结束 |
| `onPreSolve` | 求解前 |
| `onPostSolve` | 求解后 |

### 2.7 隐含知识

- 2D 物理使用 Box2D 引擎，坐标系为 Y 轴向上
- `gravityScale` 可以单独控制每个刚体的重力，3D 物理没有此属性
- `bullet = true` 启用连续碰撞检测（CCD），适用于高速物体
- `sensor = true` 等同于 3D 的 `isTrigger`
- 修改碰撞器属性后需要调用 `apply()` 才能生效
- Box2D WASM 版本比 JS 版本性能更好
- 2D 物理的射线检测使用线段（p1 到 p2），不是射线
