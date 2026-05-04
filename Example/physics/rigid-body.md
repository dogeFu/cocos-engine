# RigidBody — 3D 刚体

## 概述

`RigidBody` 是 3D 物理刚体组件，赋予节点物理属性（质量、速度、阻尼等）。刚体分为动态（DYNAMIC）、静态（STATIC）和运动学（KINEMATIC）三种类型。

## 导入方式

```typescript
import { RigidBody, Vec3 } from 'cc';
```

## 基础用法

### 添加刚体

```typescript
const rigidBody = node.addComponent(RigidBody);
rigidBody.type = RigidBody.Type.DYNAMIC;
rigidBody.mass = 1;
rigidBody.useGravity = true;
```

### 施加力

```typescript
rigidBody.applyForce(new Vec3(0, 100, 0));
rigidBody.applyLocalForce(new Vec3(0, 100, 0));
```

### 施加冲量

```typescript
rigidBody.applyImpulse(new Vec3(10, 0, 0));
rigidBody.applyLocalImpulse(new Vec3(10, 0, 0));
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `group` | `number` | 物理分组 |
| `type` | `ERigidBodyType` | 刚体类型 |
| `mass` | `number` | 质量（动态刚体） |
| `allowSleep` | `boolean` | 允许自动休眠 |
| `linearDamping` | `number` | 线性阻尼（0-1） |
| `angularDamping` | `number` | 角阻尼（0-1） |
| `useGravity` | `boolean` | 使用重力 |
| `linearFactor` | `Vec3` | 线性速度因子 |
| `angularFactor` | `Vec3` | 角速度因子 |
| `isAwake` | `boolean` | 是否清醒（只读） |
| `isSleeping` | `boolean` | 是否休眠（只读） |
| `isStatic` | `boolean` | 是否静态（只读） |
| `isDynamic` | `boolean` | 是否动态（只读） |
| `isKinematic` | `boolean` | 是否运动学（只读） |
| `useCCD` | `boolean` | 连续碰撞检测 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `applyForce` | `(force, relativePoint?) => void` | 施加力（世界坐标） |
| `applyLocalForce` | `(force, localPoint?) => void` | 施加力（本地坐标） |
| `applyImpulse` | `(impulse, relativePoint?) => void` | 施加冲量（世界坐标） |
| `applyLocalImpulse` | `(impulse, localPoint?) => void` | 施加冲量（本地坐标） |
| `applyTorque` | `(torque) => void` | 施加扭矩（世界坐标） |
| `applyLocalTorque` | `(torque) => void` | 施加扭矩（本地坐标） |
| `wakeUp` | `() => void` | 唤醒刚体 |
| `sleep` | `() => void` | 休眠刚体 |
| `clearState` | `() => void` | 清除力和速度 |
| `clearForces` | `() => void` | 清除力 |
| `clearVelocity` | `() => void` | 清除速度 |
| `getLinearVelocity` | `(out) => void` | 获取线性速度 |
| `setLinearVelocity` | `(value) => void` | 设置线性速度 |
| `getAngularVelocity` | `(out) => void` | 获取角速度 |
| `setAngularVelocity` | `(value) => void` | 设置角速度 |

## ERigidBodyType 枚举

| 值 | 说明 |
|-----|------|
| `DYNAMIC` | 动态刚体，受力和碰撞影响 |
| `STATIC` | 静态刚体，不移动，用于墙壁、地面 |
| `KINEMATIC` | 运动学刚体，通过代码控制移动，不受力影响 |

## 进阶用法

### 角色跳跃

```typescript
@ccclass('PlayerPhysics')
export class PlayerPhysics extends Component {
    private _rigidBody: RigidBody | null = null;
    @property({ type: Number })
    public jumpForce: number = 400;

    start() {
        this._rigidBody = this.getComponent(RigidBody);
    }

    public jump() {
        if (!this._rigidBody) return;
        this._rigidBody.applyForce(new Vec3(0, this.jumpForce, 0));
    }
}
```

### 限制轴向运动

```typescript
rigidBody.linearFactor = new Vec3(1, 1, 0);
rigidBody.angularFactor = new Vec3(0, 0, 1);
```

> `linearFactor` 为 0 的轴不会被力影响，`angularFactor` 为 0 的轴不会旋转。

### 获取/设置速度

```typescript
const velocity = new Vec3();
rigidBody.getLinearVelocity(velocity);

rigidBody.setLinearVelocity(new Vec3(5, 0, 0));

const angularVel = new Vec3();
rigidBody.getAngularVelocity(angularVel);
rigidBody.setAngularVelocity(new Vec3(0, 2, 0));
```

### 连续碰撞检测（高速物体）

```typescript
rigidBody.useCCD = true;
```

> `useCCD` 适用于高速移动的物体（如子弹），防止穿透。

### 碰撞分组

```typescript
rigidBody.group = 1 << 0;
rigidBody.addGroup(1 << 1);
rigidBody.removeGroup(1 << 0);
```

## 注意事项

- 动态刚体需要至少一个碰撞体组件才能参与物理模拟
- 静态刚体不需要质量，不受力影响
- 运动学刚体通过 `setLinearVelocity` 或直接修改节点位置来移动
- `applyForce` 是持续力，`applyImpulse` 是瞬时冲量
- `linearDamping` 和 `angularDamping` 用于模拟阻力
- 修改刚体属性后可能需要调用 `wakeUp` 唤醒刚体
