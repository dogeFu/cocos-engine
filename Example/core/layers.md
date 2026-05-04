# Layers — 层级系统

## 概述

`Layers` 系统用于将节点分配到不同的逻辑层，常用于控制摄像机可见性、物理碰撞过滤等。每个节点都有一个 `layer` 属性，摄像机通过 `visibility` 属性决定渲染哪些层的节点。

## 导入方式

```typescript
import { Layers } from 'cc';
```

## 基础用法

### 设置节点层级

```typescript
node.layer = Layers.Enum.UI_2D;
node.layer = Layers.Enum.DEFAULT;
node.layer = Layers.Enum.PROFILER;
```

### 摄像机层级过滤

```typescript
const camera = cameraNode.getComponent(Camera);
if (camera) {
    camera.visibility = Layers.Enum.DEFAULT | Layers.Enum.UI_2D;
}
```

## 内置层级

| 层级 | 值 | 说明 |
|------|-----|------|
| `Layers.Enum.IGNORE_RAYCAST` | 1 << 0 | 忽略射线检测 |
| `Layers.Enum.GIZMO` | 1 << 1 | 编辑器 Gizmo |
| `Layers.Enum.DEFAULT` | 1 << 2 | 默认层 |
| `Layers.Enum.UI_2D` | 1 << 3 | 2D UI 层 |
| `Layers.Enum.PROFILER` | 1 << 4 | 性能分析器 |
| `Layers.Enum.RAYCAST` | 1 << 22 | 射线检测层 |

## 层级操作工具方法

### makeMask — 创建层级掩码

```typescript
const mask = Layers.makeMask([Layers.Enum.DEFAULT, Layers.Enum.UI_2D]);
camera.visibility = mask;
```

### add / remove — 添加/移除层级

```typescript
Layers.add(node, Layers.Enum.UI_2D);
Layers.remove(node, Layers.Enum.DEFAULT);
```

### 判断层级

```typescript
const isInLayer = (node.layer & Layers.Enum.UI_2D) !== 0;
```

## 进阶用法

### 多层组合

```typescript
const gameLayer = 1 << 5;
const effectLayer = 1 << 6;

node.layer = Layers.Enum.DEFAULT | gameLayer;

camera.visibility = Layers.makeMask([Layers.Enum.DEFAULT, gameLayer]);
```

### 物理碰撞过滤

```typescript
import { PhysicsSystem } from 'cc';

const playerGroup = 1 << 0;
const enemyGroup = 1 << 1;
const wallGroup = 1 << 2;

const rigidBody = node.getComponent(RigidBody);
if (rigidBody) {
    rigidBody.group = playerGroup;
}
```

### 射线检测层级过滤

```typescript
const ray = geometry.Ray.create(0, 0, 0, 0, 0, -1);
const mask = Layers.makeMask([Layers.Enum.DEFAULT]);
const maxDistance = 100;

if (PhysicsSystem.instance.raycast(ray, mask, maxDistance)) {
    const result = PhysicsSystem.instance.raycastClosestResult;
}
```

## 注意事项

- 层级使用位掩码（bitmask）实现，最多支持 32 个层级
- 节点的 `layer` 默认为 `Layers.Enum.DEFAULT`
- UI 节点应设置为 `Layers.Enum.UI_2D`，否则可能不被 UI 摄像机渲染
- `IGNORE_RAYCAST` 层的节点不会被射线检测命中
- 自定义层级使用 `1 << n`（n 为 0-31）来定义
