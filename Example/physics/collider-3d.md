# Collider3D — 3D 碰撞体

## 概述

3D 碰撞体定义了物体在物理世界中的形状，与 `RigidBody` 配合使用参与碰撞检测和物理模拟。Cocos Creator 提供了多种碰撞体类型：Box、Sphere、Capsule、Cylinder、Cone、Mesh、Plane、Simplex。

## 导入方式

```typescript
import {
    BoxCollider, SphereCollider, CapsuleCollider,
    CylinderCollider, ConeCollider, MeshCollider,
    PlaneCollider, SimplexCollider, Collider,
    PhysicsMaterial, Vec3
} from 'cc';
```

## 基础用法

### 盒体碰撞体

```typescript
const collider = node.addComponent(BoxCollider);
collider.size = new Vec3(2, 2, 2);
collider.center = new Vec3(0, 0, 0);
```

### 球体碰撞体

```typescript
const collider = node.addComponent(SphereCollider);
collider.radius = 1;
collider.center = new Vec3(0, 0, 0);
```

### 胶囊体碰撞体

```typescript
const collider = node.addComponent(CapsuleCollider);
collider.radius = 0.5;
collider.height = 2;
collider.direction = CapsuleCollider.Axis.Y;
```

## Collider 基类属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `attachedRigidBody` | `RigidBody \| null` | 绑定的刚体（只读） |
| `sharedMaterial` | `PhysicsMaterial \| null` | 共享物理材质 |
| `material` | `PhysicsMaterial \| null` | 物理材质（获取时克隆） |
| `isTrigger` | `boolean` | 是否为触发器 |
| `center` | `Vec3` | 本地空间中心 |
| `shape` | `IBaseShape \| null` | 形状对象（只读） |
| `worldBounds` | `AABB` | 世界 AABB（只读） |
| `boundingSphere` | `Sphere` | 包围球（只读） |

## 各碰撞体特有属性

### BoxCollider

| 属性 | 类型 | 说明 |
|------|------|------|
| `size` | `Vec3` | 盒体尺寸 |

### SphereCollider

| 属性 | 类型 | 说明 |
|------|------|------|
| `radius` | `number` | 半径 |

### CapsuleCollider

| 属性 | 类型 | 说明 |
|------|------|------|
| `radius` | `number` | 半径 |
| `height` | `number` | 高度 |
| `direction` | `Axis` | 朝向轴（X/Y/Z） |

### CylinderCollider

| 属性 | 类型 | 说明 |
|------|------|------|
| `radius` | `number` | 半径 |
| `height` | `number` | 高度 |
| `direction` | `Axis` | 朝向轴 |

### ConeCollider

| 属性 | 类型 | 说明 |
|------|------|------|
| `radius` | `number` | 底面半径 |
| `height` | `number` | 高度 |
| `direction` | `Axis` | 朝向轴 |

### MeshCollider

| 属性 | 类型 | 说明 |
|------|------|------|
| `mesh` | `Mesh \| null` | 网格资源 |

### PlaneCollider

| 属性 | 类型 | 说明 |
|------|------|------|
| `normal` | `Vec3` | 平面法线 |
| `constant` | `number` | 平面常量 |

## 碰撞事件

```typescript
collider.on('onCollisionEnter', (event: ICollisionEvent) => {
    const otherCollider = event.otherCollider;
    const selfCollider = event.selfCollider;
    const contacts = event.contacts;
}, this);

collider.on('onCollisionStay', (event: ICollisionEvent) => {
}, this);

collider.on('onCollisionExit', (event: ICollisionEvent) => {
}, this);
```

## 触发器事件

```typescript
collider.isTrigger = true;

collider.on('onTriggerEnter', (event: ITriggerEvent) => {
    const otherCollider = event.otherCollider;
    const selfCollider = event.selfCollider;
}, this);

collider.on('onTriggerStay', (event: ITriggerEvent) => {
}, this);

collider.on('onTriggerExit', (event: ITriggerEvent) => {
}, this);
```

## 进阶用法

### 物理材质

```typescript
const material = new PhysicsMaterial();
material.friction = 0.5;
material.restitution = 0.3;

collider.sharedMaterial = material;
```

### 触发器检测区域

```typescript
@ccclass('PickupZone')
export class PickupZone extends Component {
    start() {
        const collider = this.getComponent(SphereCollider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
        }
    }

    private onTriggerEnter(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
    }
}
```

### 完整的物理角色

```typescript
@ccclass('PhysicsCharacter')
@requireComponent(RigidBody)
export class PhysicsCharacter extends Component {
    private _rigidBody: RigidBody | null = null;

    start() {
        this._rigidBody = this.getComponent(RigidBody);
        const collider = this.getComponent(CapsuleCollider);
        if (collider) {
            collider.on('onCollisionEnter', this.onCollision, this);
        }
    }

    private onCollision(event: ICollisionEvent) {
    }

    public move(direction: Vec3) {
        if (!this._rigidBody) return;
        const velocity = new Vec3();
        this._rigidBody.getLinearVelocity(velocity);
        velocity.x = direction.x * 5;
        velocity.z = direction.z * 5;
        this._rigidBody.setLinearVelocity(velocity);
    }
}
```

## 注意事项

- 碰撞体需要与 `RigidBody` 配合使用，没有刚体的碰撞体只参与触发器检测
- `isTrigger = true` 时碰撞体不产生物理响应，只触发事件
- `MeshCollider` 性能开销较大，尽量使用基本形状
- 碰撞事件在 `PhysicsSystem.emitEvents()` 后触发
- `material` 获取时会克隆，`sharedMaterial` 直接引用
- 碰撞体的 `center` 是相对于节点的本地偏移
