# RichText — 富文本组件

## 概述

`RichText` 是富文本组件，支持通过类 HTML 标签在文本中嵌入不同颜色、大小、样式、图片和点击事件。

## 导入方式

```typescript
import { RichText, Node } from 'cc';
```

## 基础用法

### 创建富文本

```typescript
const node = new Node('RichText');
const richText = node.addComponent(RichText);
richText.string = 'Hello <b>World</b>!';
richText.fontSize = 24;
```

### 支持的标签

```typescript
richText.string = '<color=#ff0000>红色文字</color> <color=#00ff00>绿色文字</color>';
richText.string = '<b>粗体</b> <i>斜体</i> <u>下划线</u>';
richText.string = '<size=30>大字</size><size=16>小字</size>';
richText.string = '<outline color=#000000 width=2>描边文字</outline>';
richText.string = '<shadow color=#000000 offset=2,2>阴影文字</shadow>';
richText.string = '点击<on click="handler">这里</on>触发事件';
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `string` | `string` | 富文本内容 |
| `fontSize` | `number` | 默认字体大小 |
| `lineHeight` | `number` | 行高 |
| `horizontalAlign` | `Label.HorizontalAlign` | 水平对齐 |
| `maxWidth` | `number` | 最大宽度（0 为不限制） |
| `handleTouchEvent` | `boolean` | 是否处理触摸事件 |

## 支持的标签列表

| 标签 | 说明 | 示例 |
|------|------|------|
| `<color>` | 文字颜色 | `<color=#ff0000>红色</color>` |
| `<size>` | 字体大小 | `<size=30>大字</size>` |
| `<b>` | 粗体 | `<b>粗体</b>` |
| `<i>` | 斜体 | `<i>斜体</i>` |
| `<u>` | 下划线 | `<u>下划线</u>` |
| `<outline>` | 描边 | `<outline color=#000 width=2>描边</outline>` |
| `<shadow>` | 阴影 | `<shadow color=#000 offset=2,2>阴影</shadow>` |
| `<on>` | 点击事件 | `<on click="handler">点击</on>` |
| `<br>` | 换行 | `第一行<br/>第二行` |

## 进阶用法

### 点击事件处理

```typescript
@ccclass('RichTextDemo')
export class RichTextDemo extends Component {
    start() {
        const richText = this.getComponent(RichText);
        if (richText) {
            richText.string = '点击<on click="onLinkClick">链接</on>查看详情';
        }
    }

    public onLinkClick(event: Event, params: string) {
    }
}
```

### 组合标签

```typescript
richText.string = '<color=#ffff00><b><size=28>重要通知</size></b></color><br/><size=20>请阅读<on click="openDetail">详情</on></size>';
```

### 自动换行

```typescript
richText.maxWidth = 400;
richText.string = '这是一段很长的富文本内容，设置了 maxWidth 后会自动换行显示。';
```

## 注意事项

- 标签必须正确闭合，否则渲染结果不可预期
- `<on>` 标签的 `click` 属性值对应组件上的方法名
- `handleTouchEvent` 为 `true` 时，RichText 会拦截触摸事件
- `maxWidth` 为 0 时不限制宽度，文本不会换行
- 富文本不支持嵌套标签（如 `<b><i>...</i></b>` 可能有兼容问题）
- 频繁更新 `string` 有性能开销，不建议每帧更新
