# UITransform — UI 变换

## 概述

`UITransform` 是 2D UI 节点的核心组件，定义了节点的尺寸（contentSize）和锚点（anchorPoint）。所有 2D 渲染组件（Sprite、Label 等）都依赖 UITransform 确定布局范围。

## 导入方式

```typescript
import { UITransform, Node, Size, Vec2 } from 'cc';
```

## 基础用法

### 设置节点尺寸

```typescript
const uiTransform = node.getComponent(UITransform);
if (uiTransform) {
    uiTransform.contentSize = new Size(200, 100);
}
```

### 设置锚点

```typescript
uiTransform.anchorPoint = new Vec2(0.5, 0.5);
uiTransform.anchorPoint = new Vec2(0, 1);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `contentSize` | `Size` | 节点内容尺寸 |
| `anchorPoint` | `Vec2` | 锚点（0-1） |
| `width` | `number` | 宽度 |
| `height` | `number` | 高度 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `convertToNodeSpaceAR` | `(worldPoint, out?) => Vec3` | 世界坐标转节点本地坐标 |
| `convertToWorldSpaceAR` | `(localPoint, out?) => Vec3` | 节点本地坐标转世界坐标 |
| `getBoundingBoxToWorld` | `() => Rect` | 获取世界坐标包围盒 |
| `setContentSize` | `(size: Size) => void` | 设置内容尺寸 |
| `setAnchorPoint` | `(point: Vec2) => void` | 设置锚点 |

## 进阶用法

### 坐标转换

```typescript
const uiTransform = node.getComponent(UITransform);
if (uiTransform) {
    const worldPos = new Vec3(100, 200, 0);
    const localPos = new Vec3();
    uiTransform.convertToNodeSpaceAR(worldPos, localPos);

    const localPoint = new Vec3(50, 25, 0);
    const worldPoint = new Vec3();
    uiTransform.convertToWorldSpaceAR(localPoint, worldPoint);
}
```

### 获取世界包围盒

```typescript
const uiTransform = node.getComponent(UITransform);
if (uiTransform) {
    const bbox = uiTransform.getBoundingBoxToWorld();
    const contains = bbox.contains(new Vec2(100, 100));
}
```

### 动态调整尺寸

```typescript
@ccclass('AutoSize')
export class AutoSize extends Component {
    @property({ type: Label })
    public label: Label | null = null;

    update() {
        if (!this.label) return;
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.width = this.label.node.getComponent(UITransform)!.width + 20;
            uiTransform.height = this.label.node.getComponent(UITransform)!.height + 10;
        }
    }
}
```

### 锚点对齐

```typescript
uiTransform.anchorPoint = new Vec2(0.5, 0.5);
uiTransform.anchorPoint = new Vec2(0, 0);
uiTransform.anchorPoint = new Vec2(1, 1);
uiTransform.anchorPoint = new Vec2(0.5, 0);
```

## 注意事项

- 所有需要接收触摸事件的 2D 节点必须有 `UITransform` 组件
- `contentSize` 决定了触摸响应区域和布局大小
- `anchorPoint` 影响节点的定位基准点，默认为 (0.5, 0.5) 即中心
- 修改 `contentSize` 不会自动调整子节点位置
- `convertToNodeSpaceAR` / `convertToWorldSpaceAR` 是 UI 坐标转换的标准方法
