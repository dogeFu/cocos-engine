# RigidBody2D — 2D 刚体

## 概述

`RigidBody2D` 是 2D 物理刚体组件，赋予 2D 节点物理属性。支持动态、静态、运动学和动画四种类型。

## 导入方式

```typescript
import { RigidBody2D, Vec2 } from 'cc';
```

## 基础用法

### 添加 2D 刚体

```typescript
const rigidBody2D = node.addComponent(RigidBody2D);
rigidBody2D.type = RigidBody2D.Type.Dynamic;
rigidBody2D.gravityScale = 1;
rigidBody2D.linearVelocity = new Vec2(0, 0);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `group` | `number` | 物理分组 |
| `enabledContactListener` | `boolean` | 启用碰撞回调 |
| `bullet` | `boolean` | 高速物体（防穿透） |
| `type` | `ERigidBody2DType` | 刚体类型 |
| `allowSleep` | `boolean` | 允许休眠 |
| `gravityScale` | `number` | 重力缩放 |
| `linearDamping` | `number` | 线性阻尼 |
| `angularDamping` | `number` | 角阻尼 |
| `linearVelocity` | `Vec2` | 线性速度 |
| `angularVelocity` | `number` | 角速度（弧度/秒） |
| `fixedRotation` | `boolean` | 固定旋转 |
| `awakeOnLoad` | `boolean` | 加载时唤醒 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `isAwake` | `() => boolean` | 是否清醒 |
| `wakeUp` | `() => void` | 唤醒 |
| `sleep` | `() => void` | 休眠 |
| `getMass` | `() => number` | 获取质量 |
| `applyForce` | `(force, point, wake) => void` | 施加力 |
| `applyForceToCenter` | `(force, wake) => void` | 施加力到中心 |
| `applyTorque` | `(torque, wake) => void` | 施加扭矩 |
| `applyLinearImpulse` | `(impulse, point, wake) => void` | 施加线性冲量 |
| `applyLinearImpulseToCenter` | `(impulse, wake) => void` | 施加线性冲量到中心 |
| `applyAngularImpulse` | `(impulse, wake) => void` | 施加角冲量 |
| `getLinearVelocityFromWorldPoint` | `(worldPoint, out) => Out` | 获取世界点的速度 |
| `getLocalVector`/`getWorldVector` | 坐标转换 | 本地/世界向量转换 |
| `getLocalPoint`/`getWorldPoint` | 坐标转换 | 本地/世界点转换 |
| `getLocalCenter`/`getWorldCenter` | 获取质心 | 本地/世界质心 |
| `getInertia` | `() => number` | 获取转动惯量 |

## ERigidBody2DType 枚举

| 值 | 说明 |
|-----|------|
| `Dynamic` | 动态刚体 |
| `Static` | 静态刚体 |
| `Kinematic` | 运动学刚体 |
| `Animated` | 动画刚体 |

## 进阶用法

### 平台角色控制

```typescript
@ccclass('PlatformPlayer')
export class PlatformPlayer extends Component {
    private _body: RigidBody2D | null = null;
    @property({ type: Number })
    public moveSpeed: number = 200;
    @property({ type: Number })
    public jumpForce: number = 400;

    start() {
        this._body = this.getComponent(RigidBody2D);
    }

    public moveLeft() {
        if (this._body) {
            this._body.linearVelocity = new Vec2(-this.moveSpeed, this._body.linearVelocity.y);
        }
    }

    public moveRight() {
        if (this._body) {
            this._body.linearVelocity = new Vec2(this.moveSpeed, this._body.linearVelocity.y);
        }
    }

    public jump() {
        if (this._body) {
            this._body.applyLinearImpulseToCenter(new Vec2(0, this.jumpForce), true);
        }
    }
}
```

### 零重力物体

```typescript
rigidBody2D.gravityScale = 0;
rigidBody2D.linearDamping = 0.5;
```

### 固定旋转

```typescript
rigidBody2D.fixedRotation = true;
```

### 启用碰撞回调

```typescript
rigidBody2D.enabledContactListener = true;
```

> 必须设置 `enabledContactListener = true` 才能接收碰撞事件。

## 注意事项

- 2D 刚体需要配合 2D 碰撞体使用
- `enabledContactListener` 必须为 `true` 才能接收碰撞/触发回调
- `bullet = true` 用于高速物体防止穿透，有性能开销
- `gravityScale` 为 0 时不受重力影响，为负值时反向
- `Animated` 类型刚体适合与动画系统配合使用
- `applyLinearImpulse` 是瞬时冲量，`applyForce` 是持续力
