# Collider2D — 2D 碰撞体

## 概述

2D 碰撞体定义了物体在 2D 物理世界中的形状，与 `RigidBody2D` 配合使用。提供 Box、Circle、Polygon 三种基本碰撞体。

## 导入方式

```typescript
import { BoxCollider2D, CircleCollider2D, PolygonCollider2D, Collider2D, Vec2, Size } from 'cc';
```

## 基础用法

### 盒体碰撞体

```typescript
const collider = node.addComponent(BoxCollider2D);
collider.size = new Size(100, 50);
collider.offset = new Vec2(0, 0);
collider.density = 1;
collider.friction = 0.5;
collider.restitution = 0.3;
```

### 圆形碰撞体

```typescript
const collider = node.addComponent(CircleCollider2D);
collider.radius = 50;
collider.offset = new Vec2(0, 0);
```

### 多边形碰撞体

```typescript
const collider = node.addComponent(PolygonCollider2D);
collider.points = [new Vec2(-50, -25), new Vec2(50, -25), new Vec2(50, 25), new Vec2(-50, 25)];
collider.offset = new Vec2(0, 0);
```

## Collider2D 基类属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `tag` | `number` | 碰撞标签 |
| `group` | `number` | 物理分组 |
| `density` | `number` | 密度（默认 1.0） |
| `sensor` | `boolean` | 是否为传感器（无物理响应） |
| `friction` | `number` | 摩擦系数（0-1） |
| `restitution` | `number` | 弹性系数（0-1） |
| `offset` | `Vec2` | 位置偏移 |
| `body` | `RigidBody2D \| null` | 绑定的刚体（只读） |
| `worldAABB` | `Rect` | 世界 AABB（只读） |

## 各碰撞体特有属性

### BoxCollider2D

| 属性 | 类型 | 说明 |
|------|------|------|
| `size` | `Size` | 盒体尺寸 |

### CircleCollider2D

| 属性 | 类型 | 说明 |
|------|------|------|
| `radius` | `number` | 半径 |

### PolygonCollider2D

| 属性 | 类型 | 说明 |
|------|------|------|
| `points` | `Vec2[]` | 顶点数组 |

## 碰撞事件

```typescript
const collider = node.getComponent(BoxCollider2D);
if (collider) {
    collider.on('onCollisionEnter', (self: Collider2D, other: Collider2D) => {
    }, this);

    collider.on('onCollisionStay', (self: Collider2D, other: Collider2D) => {
    }, this);

    collider.on('onCollisionExit', (self: Collider2D, other: Collider2D) => {
    }, this);
}
```

## 触发器事件

```typescript
collider.sensor = true;

collider.on('onBeginContact', (self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) => {
}, this);

collider.on('onEndContact', (self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) => {
}, this);

collider.on('onPreSolve', (self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) => {
}, this);

collider.on('onPostSolve', (self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) => {
}, this);
```

## 进阶用法

### 拾取区域

```typescript
@ccclass('PickupArea2D')
export class PickupArea2D extends Component {
    start() {
        const collider = this.getComponent(CircleCollider2D);
        if (collider) {
            collider.sensor = true;
            collider.on('onBeginContact', this.onBeginContact, this);
        }
    }

    private onBeginContact(self: Collider2D, other: Collider2D) {
        const otherNode = other.node;
    }
}
```

### 地面碰撞

```typescript
@ccclass('Ground2D')
export class Ground2D extends Component {
    start() {
        const body = this.getComponent(RigidBody2D);
        if (body) {
            body.type = RigidBody2D.Type.Static;
        }
        const collider = this.getComponent(BoxCollider2D);
        if (collider) {
            collider.friction = 0.8;
            collider.restitution = 0;
        }
    }
}
```

### 动态修改碰撞体

```typescript
const boxCollider = node.getComponent(BoxCollider2D);
if (boxCollider) {
    boxCollider.size = new Size(200, 100);
    boxCollider.apply();
}
```

## 注意事项

- 碰撞事件需要 `RigidBody2D` 的 `enabledContactListener = true`
- `sensor = true` 时碰撞体不产生物理响应，只触发接触事件
- `density` 影响刚体质量，质量 = 密度 × 面积
- `friction` 为 0 时完全光滑，为 1 时最大摩擦
- `restitution` 为 0 时无弹性，为 1 时完全弹性
- 修改碰撞体属性后需要调用 `apply()` 使更改生效
- `PolygonCollider2D` 的顶点必须是凸多边形
