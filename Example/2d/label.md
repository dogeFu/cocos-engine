# Label — 文本组件

## 概述

`Label` 是文本渲染组件，用于显示文字内容。支持多种对齐方式、溢出模式、字体样式等。是 UI 开发中最常用的组件之一。

## 导入方式

```typescript
import { Label, Node, Font } from 'cc';
```

## 基础用法

### 创建文本

```typescript
const node = new Node('MyLabel');
const label = node.addComponent(Label);
label.string = 'Hello World';
label.fontSize = 24;
label.horizontalAlign = Label.HorizontalAlign.CENTER;
label.verticalAlign = Label.VerticalAlign.CENTER;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `string` | `string` | 文本内容 |
| `horizontalAlign` | `Label.HorizontalAlign` | 水平对齐 |
| `verticalAlign` | `Label.VerticalAlign` | 垂直对齐 |
| `fontSize` | `number` | 字体大小 |
| `lineHeight` | `number` | 行高 |
| `overflow` | `Label.Overflow` | 溢出模式 |
| `enableWrapText` | `boolean` | 是否自动换行 |
| `font` | `Font \| null` | 自定义字体 |
| `isBold` | `boolean` | 是否粗体 |
| `isItalic` | `boolean` | 是否斜体 |
| `isUnderline` | `boolean` | 是否下划线 |
| `underlineHeight` | `number` | 下划线高度 |
| `cacheMode` | `Label.CacheMode` | 缓存模式 |
| `color` | `Color` | 文本颜色 |

## HorizontalAlign 枚举

| 值 | 说明 |
|-----|------|
| `LEFT` | 左对齐 |
| `CENTER` | 居中对齐 |
| `RIGHT` | 右对齐 |

## VerticalAlign 枚举

| 值 | 说明 |
|-----|------|
| `TOP` | 顶部对齐 |
| `CENTER` | 居中对齐 |
| `BOTTOM` | 底部对齐 |

## Overflow 枚举

| 值 | 说明 |
|-----|------|
| `NONE` | 无处理 |
| `CLAMP` | 裁剪 |
| `SHRINK` | 自动缩小字体 |
| `RESIZE_HEIGHT` | 自动调整高度 |

## CacheMode 枚举

| 值 | 说明 |
|-----|------|
| `NONE` | 不缓存 |
| `BITMAP` | 位图缓存 |
| `CHAR` | 字符缓存 |

## 进阶用法

### 自动换行文本

```typescript
label.enableWrapText = true;
label.overflow = Label.Overflow.RESIZE_HEIGHT;
label.string = '这是一段很长的文本，会自动换行显示。节点高度会根据文本内容自动调整。';
```

### 自动缩小字体

```typescript
label.overflow = Label.Overflow.SHRINK;
label.fontSize = 32;
label.enableWrapText = true;
```

> `SHRINK` 模式下，当文本超出节点范围时，字体会自动缩小以适应。

### 使用自定义字体

```typescript
const bundle = assetManager.getBundle('resources');
bundle!.load<Font>('fonts/custom-font', Font, (err, font) => {
    if (err) return;
    label.font = font;
});
```

### 富文本样式

```typescript
label.isBold = true;
label.isItalic = false;
label.isUnderline = true;
label.fontSize = 28;
label.lineHeight = 36;
```

### 动态更新文本

```typescript
@ccclass('ScoreDisplay')
export class ScoreDisplay extends Component {
    private _label: Label | null = null;
    private _score: number = 0;

    start() {
        this._label = this.getComponent(Label);
        this.updateDisplay();
    }

    public addScore(points: number) {
        this._score += points;
        this.updateDisplay();
    }

    private updateDisplay() {
        if (this._label) {
            this._label.string = `Score: ${this._score}`;
        }
    }
}
```

### 缓存模式优化

```typescript
label.cacheMode = Label.CacheMode.CHAR;
```

> `CHAR` 模式缓存每个字符的渲染结果，适合频繁更新但字符集有限的文本（如数字计分器）。

## 注意事项

- `RESIZE_HEIGHT` 模式下节点高度会自动调整，适合多行文本
- `SHRINK` 模式有性能开销，不适合大量文本
- `enableWrapText` 需要节点有固定宽度才能生效
- `cacheMode` 为 `BITMAP` 时，文本变化会重新生成位图
- `CHAR` 缓存模式不支持自定义字体和特殊样式
- 频繁更新文本内容时，考虑使用 `CHAR` 缓存模式提升性能
