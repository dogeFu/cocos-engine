# Node — 节点系统

## 概述

`Node` 是 Cocos Creator 场景图的基础单元。每个节点拥有变换（位置、旋转、缩放）、可以挂载组件、可以组织为树形层级结构。节点本身不包含渲染逻辑，渲染能力通过挂载的组件实现。

## 导入方式

```typescript
import { Node } from 'cc';
```

## 基础用法

### 创建节点

```typescript
const node = new Node('MyNode');
```

### 添加到场景

```typescript
import { director } from 'cc';

const node = new Node('MyNode');
director.getScene().addChild(node);
```

### 操作子节点

```typescript
const parent = new Node('Parent');
const child = new Node('Child');

parent.addChild(child);

const index = parent.children.indexOf(child);
parent.removeChild(child);
parent.insertChild(child, 0);
parent.removeChildByIndex(0);
parent.removeAllChildren();
parent.destroyAllChildren();
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 节点名称 |
| `parent` | `Node \| null` | 父节点 |
| `children` | `Node[]` | 子节点数组（只读） |
| `childrenCount` | `number` | 子节点数量（只读） |
| `active` | `boolean` | 节点是否激活 |
| `activeInHierarchy` | `boolean` | 在层级中是否激活（自身和所有祖先都激活） |
| `layer` | `number` | 节点所属层级 |
| `worldPosition` | `Vec3` | 世界坐标位置 |
| `worldRotation` | `Quat` | 世界坐标旋转 |
| `worldScale` | `Vec3` | 世界坐标缩放 |
| `position` | `Vec3` | 本地坐标位置 |
| `rotation` | `Quat` | 本地坐标旋转 |
| `eulerAngles` | `Vec3` | 本地欧拉角（角度制） |
| `scale` | `Vec3` | 本地缩放 |
| `uuid` | `string` | 唯一标识符（只读） |
| `scene` | `Scene \| null` | 所属场景（只读） |
| `components` | `Component[]` | 挂载的组件数组（只读） |
| `isValid` | `boolean` | 对象是否有效（未销毁） |

## 核心方法

### 变换操作

```typescript
const node = new Node('TransformDemo');

node.setPosition(1, 2, 3);
node.getPosition();

node.setRotationFromEuler(0, 90, 0);
node.setRotation(new Quat());

node.setScale(2, 2, 2);

node.setWorldPosition(10, 0, 5);
node.setWorldRotationFromEuler(0, 45, 0);

node.translate(new Vec3(1, 0, 0));
node.rotate(new Quat().setEulerAngles(0, 10, 0));
```

### 坐标转换

```typescript
const out = new Vec3();

node.convertToNodeSpaceAR(worldPos, out);
node.convertToWorldSpaceAR(localPos, out);

const uiTransform = node.getComponent(UITransform);
if (uiTransform) {
    uiTransform.convertToNodeSpaceAR(worldPos, out);
    uiTransform.convertToWorldSpaceAR(localPos, out);
}
```

### 组件操作

```typescript
const sprite = node.addComponent(Sprite);
const existingSprite = node.getComponent(Sprite);
const allSprites = node.getComponents(Sprite);
const childSprite = node.getComponentInChildren(Sprite);
const allChildSprites = node.getComponentsInChildren(Sprite);
```

### 查找节点

```typescript
const child = node.getChildByName('TargetChild');
const childByPath = node.getChildByPath('Parent/Child/GrandChild');

import { find } from 'cc';
const found = find('Canvas/MyNode');
```

### 兄弟节点操作

```typescript
node.setSiblingIndex(2);
node.getSiblingIndex();

node.removeFromParent();
```

## 进阶用法

### 节点激活控制

```typescript
const node = new Node('ToggleNode');

node.active = false;
node.active = true;

if (node.activeInHierarchy) {
}
```

> `active` 控制自身激活状态，`activeInHierarchy` 表示在层级中是否真正激活（需要自身和所有祖先都激活）。

### 遍历子节点

```typescript
for (let i = 0; i < node.childrenCount; i++) {
    const child = node.children[i];
}
```

### 层级系统

```typescript
import { Layers } from 'cc';

node.layer = Layers.Enum.UI_2D;
node.layer = Layers.Enum.DEFAULT;
node.layer = Layers.Enum.PROFILER;

const layer = Layers.makeMask([Layers.Enum.DEFAULT, Layers.Enum.UI_2D]);
node.layer = layer;
```

### 节点销毁

```typescript
node.destroy();

if (!node.isValid) {
}
```

> `destroy()` 不会立即移除节点，而是在当前帧末尾执行。如需立即移除，先调用 `removeFromParent()`。

### 事件监听

```typescript
node.on(Node.EventType.CHILD_ADDED, (child: Node) => {
}, this);

node.on(Node.EventType.CHILD_REMOVED, (child: Node) => {
}, this);

node.on(Node.EventType.SIBLING_ORDER_CHANGED, () => {
}, this);

node.on(Node.EventType.PARENT_CHANGED, (parent: Node | null) => {
}, this);

node.on(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, (node: Node) => {
}, this);
```

## 注意事项

- 节点的 `position`、`rotation`、`scale` 是本地变换，相对于父节点
- 修改 `worldPosition` 等世界属性时，引擎会自动计算并更新本地变换
- `addChild` 会自动将节点从原父节点移除
- `destroy()` 是异步操作，同一帧内节点仍然有效
- 频繁创建/销毁节点时，考虑使用 `NodePool` 进行对象池管理
