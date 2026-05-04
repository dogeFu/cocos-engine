# WebView — 网页视图

## 概述

`WebView` 组件用于在游戏中嵌入网页内容，支持加载 URL、执行 JavaScript 和双向通信。

## 导入方式

```typescript
import { WebView, Node } from 'cc';
```

## 基础用法

### 加载网页

```typescript
const webView = node.addComponent(WebView);
webView.url = 'https://example.com';
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `url` | `string` | 网页 URL |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `setJavascriptInterfaceScheme` | `(scheme) => void` | 设置 JS 接口协议 |
| `evaluateJS` | `(str) => void` | 执行 JavaScript |

## 事件类型

| 事件 | 说明 |
|------|------|
| `LOADED` | 网页加载完成 |
| `LOADING` | 网页加载中 |
| `ERROR` | 加载错误 |
| `JS_MESSAGE` | JS 消息回调 |

## 进阶用法

### 监听网页事件

```typescript
webView.on(WebView.EventType.LOADED, () => {
}, this);

webView.on(WebView.EventType.ERROR, () => {
}, this);
```

### 执行 JavaScript

```typescript
webView.evaluateJS('document.title');
webView.evaluateJS('alert("Hello from Cocos!")');
```

### JS 与 Cocos 通信

```typescript
webView.setJavascriptInterfaceScheme('cc');

webView.on(WebView.EventType.JS_MESSAGE, (event) => {
    const message = event.message;
}, this);
```

在网页中发送消息：

```html
<script>
    window.location.href = 'cc://message?data=hello';
</script>
```

## 注意事项

- WebView 在不同平台上的实现和限制不同
- Web 平台上 WebView 使用 iframe 实现
- 原生平台上 WebView 是独立的渲染层，可能遮挡其他 UI
- `evaluateJS` 在网页加载完成后才能执行
- 跨域限制可能影响网页加载
- 小游戏平台可能不支持 WebView
