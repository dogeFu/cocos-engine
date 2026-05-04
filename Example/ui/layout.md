# Layout — 布局组件

## 概述

`Layout` 是自动布局组件，可以自动排列子节点。支持水平布局、垂直布局和网格布局三种模式，常用于列表、网格、按钮组等 UI 场景。

## 导入方式

```typescript
import { Layout, Node } from 'cc';
```

## 基础用法

### 水平布局

```typescript
const container = new Node('HContainer');
const layout = container.addComponent(Layout);
layout.type = Layout.Type.HORIZONTAL;
layout.spacingX = 10;
layout.paddingLeft = 10;
layout.paddingRight = 10;
```

### 垂直布局

```typescript
const container = new Node('VContainer');
const layout = container.addComponent(Layout);
layout.type = Layout.Type.VERTICAL;
layout.spacingY = 5;
layout.paddingTop = 10;
layout.paddingBottom = 10;
```

### 网格布局

```typescript
const grid = new Node('Grid');
const layout = grid.addComponent(Layout);
layout.type = Layout.Type.GRID;
layout.startAxis = Layout.AxisDirection.HORIZONTAL;
layout.spacingX = 10;
layout.spacingY = 10;
layout.paddingLeft = 10;
layout.paddingTop = 10;
```

## 核心属性

### 通用属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `Layout.Type` | 布局类型（NONE/HORIZONTAL/VERTICAL/GRID） |
| `resizeMode` | `Layout.ResizeMode` | 缩放模式（NONE/CONTAINER/CHILDREN） |
| `paddingLeft` | `number` | 左内边距 |
| `paddingRight` | `number` | 右内边距 |
| `paddingTop` | `number` | 上内边距 |
| `paddingBottom` | `number` | 下内边距 |
| `spacingX` | `number` | 水平间距 |
| `spacingY` | `number` | 垂直间距 |
| `affectedByScale` | `boolean` | 是否受子节点缩放影响 |

### 水平/垂直布局属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `horizontalDirection` | `Layout.HorizontalDirection` | 水平排列方向 |
| `verticalDirection` | `Layout.VerticalDirection` | 垂直排列方向 |

### 网格布局属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `startAxis` | `Layout.AxisDirection` | 起始轴方向 |
| `cellSize` | `Size` | 单元格大小 |
| `constraint` | `Layout.Constraint` | 约束模式（NONE/FIXED_ROW/FIXED_COLUMN） |
| `constraintNum` | `number` | 约束数量 |

## 枚举值

### Layout.Type

| 值 | 说明 |
|-----|------|
| `NONE` | 无布局 |
| `HORIZONTAL` | 水平布局 |
| `VERTICAL` | 垂直布局 |
| `GRID` | 网格布局 |

### Layout.ResizeMode

| 值 | 说明 |
|-----|------|
| `NONE` | 不缩放 |
| `CONTAINER` | 容器适应子节点 |
| `CHILDREN` | 子节点适应容器 |

### Layout.HorizontalDirection

| 值 | 说明 |
|-----|------|
| `LEFT_TO_RIGHT` | 从左到右 |
| `RIGHT_TO_LEFT` | 从右到左 |

### Layout.VerticalDirection

| 值 | 说明 |
|-----|------|
| `TOP_TO_BOTTOM` | 从上到下 |
| `BOTTOM_TO_TOP` | 从下到上 |

## 进阶用法

### 动态列表

```typescript
@ccclass('DynamicList')
export class DynamicList extends Component {
    @property({ type: Layout })
    public layout: Layout | null = null;

    @property({ type: Prefab })
    public itemPrefab: Prefab | null = null;

    public addItem(data: string) {
        if (!this.itemPrefab) return;
        const item = instantiate(this.itemPrefab);
        const label = item.getComponentInChildren(Label);
        if (label) {
            label.string = data;
        }
        this.node.addChild(item);
    }

    public removeItem(index: number) {
        if (index < this.node.childrenCount) {
            this.node.removeChildAt(index);
        }
    }
}
```

### 自适应容器大小

```typescript
layout.resizeMode = Layout.ResizeMode.CONTAINER;
layout.type = Layout.Type.VERTICAL;
layout.spacingY = 5;
```

> `CONTAINER` 模式下，容器大小会根据子节点自动调整。

### 手动触发布局更新

```typescript
layout.updateLayout();
```

### 受缩放影响的布局

```typescript
layout.affectedByScale = true;
```

## 注意事项

- Layout 仅对直接子节点生效，不影响孙节点
- `CONTAINER` 模式下容器大小由子节点决定，不适合与 `Widget` 同时使用
- 动态添加/移除子节点后，布局会自动更新
- `GRID` 布局的 `cellSize` 仅在 `CHILDREN` 缩放模式下生效
- 频繁更新布局可能影响性能，可先关闭布局再批量操作子节点
