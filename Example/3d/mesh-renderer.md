# MeshRenderer — 网格渲染器

## 概述

`MeshRenderer` 是 3D 网格渲染组件，用于渲染 3D 模型。需要配合 `Mesh` 资源和 `Material` 材质使用。支持阴影投射/接收、Morph 变形、GPU 实例化等高级特性。

## 导入方式

```typescript
import { MeshRenderer, Mesh, Material, Node } from 'cc';
```

## 基础用法

### 设置网格和材质

```typescript
const meshRenderer = node.getComponent(MeshRenderer);
if (meshRenderer) {
    meshRenderer.mesh = meshAsset;
    meshRenderer.setMaterial(materialAsset, 0);
}
```

### 阴影控制

```typescript
meshRenderer.shadowCastingMode = MeshRenderer.ShadowCastingMode.ON;
meshRenderer.receiveShadow = MeshRenderer.ShadowReceivingMode.ON;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `mesh` | `Mesh \| null` | 网格资源 |
| `model` | `Model \| null` | 渲染模型（只读） |
| `shadowCastingMode` | `ShadowCastingMode` | 阴影投射模式 |
| `receiveShadow` | `ShadowReceivingMode` | 阴影接收模式 |
| `shadowBias` | `number` | 局部阴影偏移 |
| `shadowNormalBias` | `number` | 局部阴影法线偏移 |
| `enableMorph` | `boolean` | 启用 Morph 变形 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `getWeight` | `(subMeshIndex, shapeIndex) => number` | 获取 Morph 权重 |
| `setWeight` | `(weight, subMeshIndex, shapeIndex) => void` | 设置 Morph 权重 |
| `setWeights` | `(weights, subMeshIndex) => void` | 设置子网格所有 Morph 权重 |
| `setInstancedAttribute` | `(name, value) => void` | 设置 GPU 实例化属性 |
| `setMaterial` | `(mat, index) => void` | 设置子网格材质 |
| `getMaterial` | `(index) => Material \| null` | 获取子网格材质 |
| `setSharedMaterial` | `(mat, index) => void` | 设置共享材质 |

## ShadowCastingMode 枚举

| 值 | 说明 |
|-----|------|
| `OFF` | 不投射阴影 |
| `ON` | 投射阴影 |

## ShadowReceivingMode 枚举

| 值 | 说明 |
|-----|------|
| `OFF` | 不接收阴影 |
| `ON` | 接收阴影 |

## 进阶用法

### 动态加载模型

```typescript
@ccclass('ModelLoader')
export class ModelLoader extends Component {
    start() {
        const bundle = assetManager.getBundle('resources');
        bundle!.load<Mesh>('models/character', Mesh, (err, mesh) => {
            if (err) return;
            const meshRenderer = this.getComponent(MeshRenderer);
            if (meshRenderer) {
                meshRenderer.mesh = mesh;
            }
        });
    }
}
```

### Morph 变形（表情动画）

```typescript
const meshRenderer = node.getComponent(MeshRenderer);
if (meshRenderer) {
    meshRenderer.enableMorph = true;
    meshRenderer.setWeight(0.5, 0, 0);
    meshRenderer.setWeight(0.3, 0, 1);
}
```

### GPU 实例化属性

```typescript
meshRenderer.setInstancedAttribute('a_instance_color', [1, 0, 0, 1]);
meshRenderer.setInstancedAttribute('a_instance_offset', [10, 0, 5]);
```

### 多材质子网格

```typescript
meshRenderer.setMaterial(material0, 0);
meshRenderer.setMaterial(material1, 1);
meshRenderer.setMaterial(material2, 2);
```

## 注意事项

- `MeshRenderer` 需要节点有 `UITransform` 或在 3D 场景中
- 一个 Mesh 可以有多个子网格，每个子网格可以设置不同材质
- `setMaterial` 会克隆材质，`setSharedMaterial` 共享材质实例
- Morph 变形需要 Mesh 资源包含 Morph 数据
- GPU 实例化需要材质开启 instancing 支持
- 阴影需要在场景灯光中启用阴影
