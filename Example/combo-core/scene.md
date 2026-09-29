# Scene — 场景管理

> `@combo/core` 的 `Scene` 类继承自 `cc.Scene`，提供链式 API 构建节点树和管理资源加载。

## 导入方式

```typescript
import { Scene } from '@combo/core';
```

## 基础用法

### 创建场景

```typescript
const scene = new Scene('MainScene');
```

构造函数参数为场景名称（可选，默认 `'Scene'`）。

### 添加子节点

```typescript
scene.node('Canvas', (canvas) => {
  canvas.setPosition(320, 480);
  canvas.component(Canvas, {
    designResolution: { width: 640, height: 960 },
  });
});
```

`node()` 的第一个参数是节点名称（可选），第二个参数是 `NodeBuilder` 回调。在回调中对节点进行链式配置。

### 多层嵌套

```typescript
scene
  .node('Canvas', (canvas) => {
    canvas.setPosition(320, 480).component(Canvas, {
      designResolution: { width: 640, height: 960 },
    });
    canvas.node('ScoreLabel', (label) => {
      label.setPosition(0, 400).component(Label, {
        string: 'Score: 0',
        fontSize: 48,
        color: Color.WHITE,
      });
    });
  });
```

### 添加已有节点

```typescript
const existingNode = new cc.Node('ExternalNode');
scene.append(existingNode);
```

### 实例化 Prefab

```typescript
const healthBar = new HealthBar();
scene.prefab(healthBar);
```

## 场景全局配置

```typescript
scene.setupGlobals((g) => {
  g.ambient.skyColor = new Color(128, 128, 128, 255);
  g.ambient.skyIllum = 10000;
  g.shadows.enabled = true;
  g.shadows.distance = 100;
  g.fog.enabled = false;
});
```

## 启动场景

### 同步启动（主动加载无默认场景切换过渡）

```typescript
scene.run();
```

调用链：`resourceLoader.ensureStarted()` + `director.runSceneImmediate()`。

### 异步加载（带过渡动画）

```typescript
await scene.load((progress) => {
  console.log(`Loading: ${Math.round(progress * 100)}%`);
});
```

场景切换使用 `runScene()`，返回 `Promise<this>`，所有资源加载完成后 resolve。

## 资源加载进度观察

```typescript
scene
  .pace({ perFrame: 3, concurrency: 8 })  // 配置加载速度
  .node('Canvas', (canvas) => { /* ... */ });

scene.assets
  .onProgress((done, total) => {
    const pct = (done / total) * 100;
    updateLoadingBar(pct);
  })
  .onComplete(() => {
    console.log('All assets loaded');
  });

scene.run();
```

## 完整用例

```typescript
import { Scene } from '@combo/core';
import { Label, Color } from 'cc';
import { camera2D } from '@combo/core';

const scene = new Scene('Game');
scene
  .pace({ perFrame: 5 })
  .setupGlobals((g) => {
    g.ambient.skyColor = new Color(200, 200, 200, 255);
  })
  .node('Canvas', (canvas) => {
    canvas.component(Canvas, { designResolution: { width: 640, height: 960 } });
    camera2D(canvas, { orthoHeight: 960 });
    canvas.node('Title', (title) => {
      title.setPosition(320, 800).component(Label, {
        string: 'Hello Combo!',
        fontSize: 48,
        color: Color.WHITE,
      });
    });
  })
  .run();
```
