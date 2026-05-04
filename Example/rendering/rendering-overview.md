# Rendering — 渲染管线概览

## 概述

Cocos Creator 的渲染管线负责将场景中的 3D/2D 内容绘制到屏幕上。引擎提供了可编程的渲染管线架构，支持自定义渲染流程、后处理效果和调试视图。

## 导入方式

```typescript
import { Pipeline, DebugView, Root, renderer } from 'cc';
```

## 核心概念

### 渲染流程

1. **Culling** — 剔除不可见物体
2. **Shadow Map** — 生成阴影贴图
3. **Render Passes** — 执行渲染通道
4. **Post Process** — 后处理效果
5. **Present** — 呈现到屏幕

### Pipeline

渲染管线管理渲染流程的各个阶段。

```typescript
const pipeline = Root.instance?.pipeline;
if (pipeline) {
    const renderPasses = pipeline.pipelineRenderData;
}
```

### DebugView

调试视图用于可视化渲染中间结果。

```typescript
const camera = this.node.getComponent(Camera);
if (camera) {
    const debugView = camera.camera?.debugView;
    if (debugView) {
        debugView.singleMode = DebugView.SingleMode.NORMAL;
    }
}
```

### DebugView.SingleMode 枚举

| 值 | 说明 |
|-----|------|
| `NONE` | 无调试 |
| `NORMAL` | 法线 |
| `DEPTH` | 深度 |
| `STENCIL` | 模板 |
| `OVERDRAW` | 过度绘制 |
| `WIREFRAME` | 线框 |
| `LIGHTING` | 光照 |
| `UV` | UV 坐标 |

## renderer 命名空间

`renderer` 命名空间导出渲染场景相关的类型：

```typescript
import { renderer } from 'cc';

const scene = renderer.scene;
```

## 进阶用法

### 启用线框模式

```typescript
const camera = this.node.getComponent(Camera);
if (camera && camera.camera?.debugView) {
    camera.camera.debugView.singleMode = DebugView.SingleMode.WIREFRAME;
}
```

### 查看过度绘制

```typescript
camera.camera.debugView.singleMode = DebugView.SingleMode.OVERDRAW;
```

### 关闭调试视图

```typescript
camera.camera.debugView.singleMode = DebugView.SingleMode.NONE;
```

## 注意事项

- 渲染管线是引擎内部系统，通常不需要直接操作
- `DebugView` 仅在开发阶段使用，发布时需要关闭
- 自定义渲染管线需要深入了解 GFX 接口
- 后处理效果通过 `Camera.usePostProcess` 和 `PostProcess` 组件启用
- 渲染管线的具体实现取决于 GFX 后端（WebGL/WebGL2/WebGPU）
