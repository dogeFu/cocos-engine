# Scene — 场景管理

## 概述

`Scene` 是场景图的根节点，继承自 `Node`。所有游戏对象都以节点的形式组织在场景树中。场景通过 `director` 进行加载、切换和运行。

## 导入方式

```typescript
import { Scene, director } from 'cc';
```

## 基础用法

### 获取当前场景

```typescript
const scene = director.getScene();
```

### 添加节点到场景

```typescript
const node = new Node('MyNode');
director.getScene().addChild(node);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 场景名称 |
| `globals` | `Root.IInfo` | 全局渲染信息 |
| `renderScene` | `RenderScene` | 渲染场景对象 |

## 场景加载与切换

### 通过 director 加载场景

```typescript
director.loadScene('MainMenu', (err) => {
    if (err) {
        return;
    }
});

director.preloadScene('Level2', (err) => {
    if (err) {
        return;
    }
});

director.loadScene('Level2');
```

### 运行场景

```typescript
director.runSceneImmediate(new Scene('NewScene'));
director.runScene(new Scene('NewScene'));
```

## 场景事件

```typescript
director.on(director.EventName.LOAD_SCENE_START, (scene: Scene) => {
}, this);

director.on(director.EventName.LOAD_SCENE_END, (scene: Scene) => {
}, this);

director.on(director.EventName.AFTER_SCENE_LAUNCH, (scene: Scene) => {
}, this);
```

## 进阶用法

### 遍历场景节点

```typescript
const scene = director.getScene();
for (let i = 0; i < scene.childrenCount; i++) {
    const child = scene.children[i];
}
```

### 场景持久化节点

```typescript
director.addPersistRootNode(dontDestroyNode);

director.removePersistRootNode(dontDestroyNode);

const isPersist = director.isPersistRootNode(dontDestroyNode);
```

> 持久化节点在场景切换时不会被销毁，适合用于全局管理器、音频控制器等。

### 场景加载进度

```typescript
director.preloadScene('BigLevel', (completedCount, totalCount, item) => {
    const progress = completedCount / totalCount;
}, (err) => {
    if (!err) {
        director.loadScene('BigLevel');
    }
});
```

## 注意事项

- 场景是节点树的根，不要手动销毁场景
- `loadScene` 是异步操作，加载完成后自动切换场景
- 持久化节点在场景切换时保留，但只能设置根节点
- 使用 `preloadScene` 预加载可减少场景切换时的卡顿
