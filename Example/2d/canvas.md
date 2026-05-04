# Canvas — 画布组件

## 概述

`Canvas` 是 2D UI 的根组件，负责管理 UI 渲染的摄像机和设计分辨率适配。每个 2D 场景通常有一个 Canvas 节点作为 UI 根节点。

## 导入方式

```typescript
import { Canvas, Camera, Size } from 'cc';
```

## 基础用法

### 获取 Canvas

```typescript
const canvas = this.node.getComponent(Canvas);
```

### 设置设计分辨率

```typescript
const canvas = this.node.getComponent(Canvas);
if (canvas) {
    canvas.designResolution = new Size(1280, 720);
    canvas.fitHeight = true;
    canvas.fitWidth = false;
}
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `cameraComponent` | `Camera \| null` | 关联的 UI 摄像机 |
| `designResolution` | `Size` | 设计分辨率 |
| `fitHeight` | `boolean` | 适配高度 |
| `fitWidth` | `boolean` | 适配宽度 |

## 进阶用法

### 多 Canvas 布局

```typescript
const mainCanvas = mainCanvasNode.getComponent(Canvas);
const hudCanvas = hudCanvasNode.getComponent(Canvas);
const overlayCanvas = overlayCanvasNode.getComponent(Canvas);

if (mainCanvas) {
    mainCanvas.cameraComponent = mainCamera;
}
if (hudCanvas) {
    hudCanvas.cameraComponent = hudCamera;
}
```

### 设计分辨率适配策略

```typescript
canvas.fitWidth = true;
canvas.fitHeight = false;
canvas.designResolution = new Size(1920, 1080);
```

> - `fitWidth = true, fitHeight = false`：优先适配宽度，高度可能裁剪
> - `fitWidth = false, fitHeight = true`：优先适配高度，宽度可能裁剪
> - `fitWidth = true, fitHeight = true`：同时适配，显示完整内容但可能有黑边
> - `fitWidth = false, fitHeight = false`：不适配，使用设计分辨率

### 获取 Canvas 关联的摄像机

```typescript
const canvas = this.node.getComponent(Canvas);
if (canvas && canvas.cameraComponent) {
    const camera = canvas.cameraComponent;
}
```

## 注意事项

- 每个场景通常只需要一个 Canvas，但也可以有多个（如分屏、HUD 叠加）
- Canvas 节点应该位于场景的 UI 层级根部
- `designResolution` 决定了 UI 布局的参考分辨率
- `fitWidth` 和 `fitHeight` 同时为 `true` 时，使用 `SHOW_ALL` 适配策略
- Canvas 自动创建和管理关联的 Camera 节点
