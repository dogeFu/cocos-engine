# primitives — 几何体创建

## 概述

`primitives` 命名空间提供了创建基础 3D 几何体的工具函数，可以程序化生成 Box、Sphere、Cylinder、Cone、Capsule、Torus、Plane 等基本形状的 `Mesh` 数据。

## 导入方式

```typescript
import { primitives, Mesh, utils } from 'cc';
```

## 基础用法

### 创建立方体

```typescript
const boxInfo = primitives.box(1, 1, 1);
const mesh = Mesh.create(boxInfo);
meshRenderer.mesh = mesh;
```

### 创建球体

```typescript
const sphereInfo = primitives.sphere(0.5, 32, 32);
const mesh = Mesh.create(sphereInfo);
meshRenderer.mesh = mesh;
```

### 创建圆柱体

```typescript
const cylinderInfo = primitives.cylinder(0.5, 0.5, 2, 32);
const mesh = Mesh.create(cylinderInfo);
meshRenderer.mesh = mesh;
```

## 可用函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `box` | `(width?, length?, height?, opts?) => IGeometry` | 立方体 |
| `sphere` | `(radius?, segments?, stacks?, opts?) => IGeometry` | 球体 |
| `cylinder` | `(radiusTop?, radiusBottom?, height?, segments?, opts?) => IGeometry` | 圆柱体 |
| `cone` | `(radius?, height?, segments?, opts?) => IGeometry` | 圆锥体 |
| `capsule` | `(radius?, height?, segments?, opts?) => IGeometry` | 胶囊体 |
| `torus` | `(radius?, tube?, segments?, tubeSegments?, opts?) => IGeometry` | 圆环 |
| `plane` | `(width?, length?, uSegments?, vSegments?, opts?) => IGeometry` | 平面 |

## 进阶用法

### 创建不同大小的几何体

```typescript
const smallBox = primitives.box(0.5, 0.5, 0.5);
const bigSphere = primitives.sphere(5, 64, 64);
const flatCylinder = primitives.cylinder(2, 2, 0.5, 32);
```

### 使用 utils 命名空间

```typescript
import { utils } from 'cc';

const mesh = utils.MeshUtils.createMesh(primitives.box(1, 1, 1));
```

### 动态创建场景物体

```typescript
@ccclass('PrimitiveCreator')
export class PrimitiveCreator extends Component {
    start() {
        this.createGround();
        this.createPillar(new Vec3(-3, 2, 0));
        this.createPillar(new Vec3(3, 2, 0));
        this.createSphere(new Vec3(0, 4, 0), 1);
    }

    private createGround() {
        const node = new Node('Ground');
        const renderer = node.addComponent(MeshRenderer);
        const mesh = Mesh.create(primitives.box(10, 0.1, 10));
        renderer.mesh = mesh;
        director.getScene().addChild(node);
    }

    private createPillar(pos: Vec3) {
        const node = new Node('Pillar');
        node.setPosition(pos);
        const renderer = node.addComponent(MeshRenderer);
        const mesh = Mesh.create(primitives.cylinder(0.5, 0.5, 4, 16));
        renderer.mesh = mesh;
        director.getScene().addChild(node);
    }

    private createSphere(pos: Vec3, radius: number) {
        const node = new Node('Sphere');
        node.setPosition(pos);
        const renderer = node.addComponent(MeshRenderer);
        const mesh = Mesh.create(primitives.sphere(radius, 32, 32));
        renderer.mesh = mesh;
        director.getScene().addChild(node);
    }
}
```

## 注意事项

- `primitives` 函数返回的是 `IGeometry` 数据，需要通过 `Mesh.create()` 转换为 `Mesh`
- `segments`/`stacks` 参数控制细分程度，值越大越平滑但顶点越多
- 程序化创建的几何体没有 UV 和材质信息，需要手动设置材质
- 复杂模型建议使用 3D 建模工具制作后导入，而非程序化生成
- `Mesh.create()` 创建的网格不会被资源管理器管理，需要手动释放
