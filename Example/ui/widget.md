# Widget — 对齐挂件

## 概述

`Widget` 是 UI 对齐系统的核心组件，用于将节点相对于父节点的边缘或中心进行对齐。常用于实现 UI 元素在不同屏幕尺寸下的自适应布局。

## 导入方式

```typescript
import { Widget, Node } from 'cc';
```

## 基础用法

### 添加 Widget 组件

```typescript
const node = new Node('UIElement');
const widget = node.addComponent(Widget);
```

### 对齐到父节点边缘

```typescript
widget.isAlignTop = true;
widget.top = 10;

widget.isAlignBottom = true;
widget.bottom = 10;

widget.isAlignLeft = true;
widget.left = 20;

widget.isAlignRight = true;
widget.right = 20;
```

### 对齐到父节点中心

```typescript
widget.isAlignHorizontalCenter = true;
widget.isAlignVerticalCenter = true;
```

### 拉伸填满父节点

```typescript
widget.isAlignLeft = true;
widget.isAlignRight = true;
widget.isAlignTop = true;
widget.isAlignBottom = true;
widget.left = 0;
widget.right = 0;
widget.top = 0;
widget.bottom = 0;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `isAlignTop` | `boolean` | 是否对齐上边 |
| `isAlignBottom` | `boolean` | 是否对齐下边 |
| `isAlignLeft` | `boolean` | 是否对齐左边 |
| `isAlignRight` | `boolean` | 是否对齐右边 |
| `isAlignHorizontalCenter` | `boolean` | 是否水平居中 |
| `isAlignVerticalCenter` | `boolean` | 是否垂直居中 |
| `top` | `number` | 上边距 |
| `bottom` | `number` | 下边距 |
| `left` | `number` | 左边距 |
| `right` | `number` | 右边距 |
| `isStretchWidth` | `boolean` | 是否水平拉伸（只读） |
| `isStretchHeight` | `boolean` | 是否垂直拉伸（只读） |
| `alignMode` | `AlignMode` | 对齐模式 |
| `target` | `Node \| null` | 对齐目标节点（默认为父节点） |

## AlignMode 枚举

| 值 | 说明 |
|-----|------|
| `AlignMode.ONCE` | 仅对齐一次 |
| `AlignMode.ALWAYS` | 每帧对齐 |
| `AlignMode.ON_WINDOW_RESIZE` | 窗口大小变化时对齐 |

## 进阶用法

### 顶部状态栏

```typescript
const statusBar = new Node('StatusBar');
const widget = statusBar.addComponent(Widget);
widget.isAlignTop = true;
widget.isAlignLeft = true;
widget.isAlignRight = true;
widget.top = 0;
widget.left = 0;
widget.right = 0;
```

### 居中弹窗

```typescript
const dialog = new Node('Dialog');
const widget = dialog.addComponent(Widget);
widget.isAlignHorizontalCenter = true;
widget.isAlignVerticalCenter = true;
```

### 底部按钮栏

```typescript
const bottomBar = new Node('BottomBar');
const widget = bottomBar.addComponent(Widget);
widget.isAlignBottom = true;
widget.isAlignLeft = true;
widget.isAlignRight = true;
widget.bottom = 20;
widget.left = 20;
widget.right = 20;
```

### 自定义对齐目标

```typescript
widget.target = customParentNode;
widget.isAlignTop = true;
widget.top = 10;
```

### 运行时更新对齐

```typescript
widget.isAlignTop = true;
widget.top = 50;
widget.updateAlignment();
```

## 注意事项

- Widget 需要父节点有 `UITransform` 组件才能正确计算对齐
- 同时设置左右对齐会水平拉伸，同时设置上下对齐会垂直拉伸
- `alignMode` 设为 `ALWAYS` 会每帧计算对齐，可能影响性能
- 对齐目标默认为父节点，可通过 `target` 属性修改
- 修改 Widget 属性后如需立即生效，调用 `updateAlignment()`
