# Physics 物理系统模块分析

## 模块作用

Physics 模块是 Cocos Creator 的物理引擎集成层,提供物理模拟、碰撞检测、射线检测等功能。它支持多种物理后端(Cannon.js、Ammo.js、Builtin),为游戏提供真实的物理交互体验。

### 主要功能领域

1. **刚体物理** - RigidBody 组件实现物理运动
2. **碰撞检测** - 各种碰撞器组件
3. **物理材质** - 摩擦力、弹性等物理属性
4. **射线检测** - Raycast 检测场景中的物体
5. **物理约束** - Joint 约束系统
6. **物理事件** - 碰撞触发事件

## 设计理念

### 1. 多后端架构

Physics 模块采用抽象层设计,支持多种物理引擎后端。

**后端类型:**
- **Builtin**: 内置轻量级物理引擎
- **Cannon.js**: 开源 JavaScript 物理引擎
- **Ammo.js**: Bullet 物理引擎的 WebAssembly 移植

**抽象层设计:**
```typescript
interface IPhysicsWorld {
    step(dt: number): void;
    raycast(ray: Ray, options: RaycastOptions): PhysicsRayResult[];
    addBody(body: RigidBody): void;
    removeBody(body: RigidBody): void;
}

// 不同后端实现
class CannonWorld implements IPhysicsWorld { }
class AmmoWorld implements IPhysicsWorld { }
class BuiltinWorld implements IPhysicsWorld { }
```

### 2. 组件化物理系统

Physics 模块使用组件模式,将物理功能封装为组件。

**核心组件:**
- `RigidBody`: 刚体组件
- `Collider`: 碰撞器基类
- `BoxCollider`: 盒形碰撞器
- `SphereCollider`: 球形碰撞器
- `CapsuleCollider`: 胶囊碰撞器

**组件协作:**
```typescript
// 添加物理组件
const rigidBody = node.addComponent(RigidBody);
rigidBody.type = RigidBody.Type.DYNAMIC;
rigidBody.mass = 1.0;

const collider = node.addComponent(BoxCollider);
collider.size = new Vec3(1, 1, 1);
collider.material = physicsMaterial;
```

### 3. 物理材质系统

Physics 模块使用物理材质定义碰撞属性。

**材质属性:**
```typescript
class PhysicsMaterial {
    friction: number;      // 摩擦系数
    restitution: number;   // 弹性系数
}

// 使用物理材质
const material = new PhysicsMaterial();
material.friction = 0.5;
material.restitution = 0.3;

collider.material = material;
```

### 4. 碰撞事件系统

Physics 模块提供完整的碰撞事件回调。

**事件类型:**
- `onCollisionEnter`: 碰撞开始
- `onCollisionStay`: 碰撞持续
- `onCollisionExit`: 碰撞结束
- `onTriggerEnter`: 触发器进入
- `onTriggerStay`: 触发器持续
- `onTriggerExit`: 触发器退出

**事件处理:**
```typescript
class PlayerController extends Component {
    onCollisionEnter(event: ICollisionEvent) {
        const other = event.otherCollider;
        console.log('Collision with:', other.node.name);
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        const other = event.otherCollider;
        if (other.node.name === 'Coin') {
            // 收集金币
            this.collectCoin(other.node);
        }
    }
}
```

### 5. 射线检测系统

Physics 模块提供强大的射线检测功能。

**射线检测类型:**
- `raycast`: 检测所有碰撞体
- `raycastClosest`: 检测最近的碰撞体
- `raycastAll`: 检测所有碰撞点

**射线检测:**
```typescript
// 射线检测
const ray = geometry.ray.create(0, 0, 0, 0, 0, 1);
const results = physics.raycast(ray, 0xffffffff, 100);

for (const result of results) {
    console.log('Hit:', result.collider.node.name);
    console.log('Distance:', result.distance);
    console.log('Point:', result.hitPoint);
}

// 检测最近的碰撞体
const closest = physics.raycastClosest(ray, 0xffffffff, 100);
if (closest) {
    console.log('Closest hit:', closest.collider.node.name);
}
```

## 核心组件详解

### 1. RigidBody 刚体组件

**职责:**
- 物理运动模拟
- 质量、速度、力等物理属性
- 运动类型控制

**刚体类型:**
- `STATIC`: 静态刚体(不移动)
- `DYNAMIC`: 动态刚体(受力和碰撞影响)
- `KINEMATIC`: 运动学刚体(不受力,可控制移动)

**关键属性:**
- `mass`: 质量
- `velocity`: 线速度
- `angularVelocity`: 角速度
- `linearDamping`: 线性阻尼
- `angularDamping`: 角度阻尼

### 2. Collider 碰撞器组件

**职责:**
- 定义碰撞形状
- 处理碰撞检测
- 触发碰撞事件

**碰撞器类型:**
- `BoxCollider`: 盒形碰撞器
- `SphereCollider`: 球形碰撞器
- `CapsuleCollider`: 胶囊碰撞器
- `CylinderCollider`: 圆柱碰撞器
- `MeshCollider`: 网格碰撞器

### 3. PhysicsWorld 物理世界

**职责:**
- 管理物理模拟
- 协调刚体和碰撞器
- 执行物理步进

**关键方法:**
- `step()`: 执行物理模拟
- `raycast()`: 射线检测
- `syncSceneToPhysics()`: 同步场景到物理
- `syncPhysicsToScene()`: 同步物理到场景

## 代码示例

### 基本物理模拟

```typescript
import { RigidBody, BoxCollider, Vec3 } from 'cc';

// 添加刚体
const rigidBody = node.addComponent(RigidBody);
rigidBody.type = RigidBody.Type.DYNAMIC;
rigidBody.mass = 1.0;

// 添加碰撞器
const collider = node.addComponent(BoxCollider);
collider.size = new Vec3(1, 1, 1);

// 施加力
rigidBody.applyForce(new Vec3(0, 100, 0));

// 施加冲量
rigidBody.applyImpulse(new Vec3(10, 0, 0));

// 设置速度
rigidBody.linearVelocity = new Vec3(5, 0, 0);
```

### 碰撞处理

```typescript
import { Collider, ICollisionEvent } from 'cc';

class PlayerController extends Component {
    start() {
        const collider = this.getComponent(Collider);
        
        // 监听碰撞事件
        collider.on('onCollisionEnter', this.onCollisionEnter, this);
        collider.on('onCollisionExit', this.onCollisionExit, this);
    }
    
    onCollisionEnter(event: ICollisionEvent) {
        console.log('Collision enter:', event.otherCollider.node.name);
    }
    
    onCollisionExit(event: ICollisionEvent) {
        console.log('Collision exit:', event.otherCollider.node.name);
    }
}
```

### 触发器

```typescript
import { Collider } from 'cc';

// 设置为触发器
const collider = node.getComponent(Collider);
collider.isTrigger = true;

// 监听触发器事件
collider.on('onTriggerEnter', (event) => {
    console.log('Trigger enter:', event.otherCollider.node.name);
});
```

### 射线检测

```typescript
import { physics, geometry, Vec3 } from 'cc';

// 从相机发射射线
const ray = camera.screenPointToRay(touchPos.x, touchPos.y);

// 检测所有碰撞体
const results = physics.raycast(ray, 0xffffffff, 100);
for (const result of results) {
    console.log('Hit:', result.collider.node.name);
    console.log('Point:', result.hitPoint);
    console.log('Normal:', result.hitNormal);
}

// 检测最近的碰撞体
const closest = physics.raycastClosest(ray, 0xffffffff, 100);
if (closest) {
    console.log('Closest:', closest.collider.node.name);
}
```

## 模块关联

### 上游依赖

Physics 模块依赖:
- **Core**: 数学库、事件系统
- **Scene Graph**: 节点系统、组件系统
- **Game**: 游戏循环驱动物理更新

### 下游依赖

Physics 模块被以下模块使用:
- **3D**: 3D 对象的物理交互
- **2D**: 2D 物理系统
- **Input**: 射线检测交互

## 性能优化策略

### 1. 碰撞器优化
- 使用简单碰撞器代替网格碰撞器
- 合理设置碰撞层级
- 使用触发器减少物理计算

### 2. 物理步进优化
- 固定时间步长
- 减少物理迭代次数
- 使用插值平滑运动

### 3. 空间分割
- 使用空间分割加速碰撞检测
- 减少碰撞对数量

## 总结

Physics 模块是 Cocos Creator 物理交互的基础,其设计体现了:

1. **多后端支持**: 灵活选择物理引擎
2. **组件化设计**: 物理功能封装为组件
3. **事件驱动**: 完整的碰撞事件系统
4. **射线检测**: 强大的交互检测能力
5. **性能优化**: 多层次的优化策略

理解 Physics 模块的设计理念,对于实现真实的物理交互至关重要。
