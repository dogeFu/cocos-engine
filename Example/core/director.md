# Director — 导演系统

## 概述

`director` 是游戏的全局管理者，负责场景管理、游戏主循环控制、定时器调度等。它是单例对象，直接导入使用。

## 导入方式

```typescript
import { director } from 'cc';
```

## 基础用法

### 场景操作

```typescript
const currentScene = director.getScene();

director.loadScene('Level1');
director.preloadScene('Level2');
director.runScene(new Scene());
```

### 游戏暂停与恢复

```typescript
director.pause();
director.resume();
```

### 帧率控制

```typescript
director.getDeltaTime();
director.getTotalFrames();
director.getTotalTime();
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `totalFrames` | `number` | 总帧数（只读） |
| `deltaTime` | `number` | 上一帧耗时（秒，只读） |
| `totalTime` | `number` | 游戏运行总时间（秒，只读） |

## 核心方法

| 方法 | 说明 |
|------|------|
| `loadScene(sceneName, onLaunched?)` | 加载并运行场景 |
| `preloadScene(sceneName, onProgress?, onLoaded?)` | 预加载场景 |
| `runScene(scene)` | 运行场景（下一帧生效） |
| `runSceneImmediate(scene)` | 立即运行场景 |
| `getScene()` | 获取当前场景 |
| `pause()` | 暂停游戏 |
| `resume()` | 恢复游戏 |
| `addPersistRootNode(node)` | 添加持久化节点 |
| `removePersistRootNode(node)` | 移除持久化节点 |
| `isPersistRootNode(node)` | 是否为持久化节点 |

## 事件系统

### 场景生命周期事件

```typescript
director.on(director.EventName.LOAD_SCENE_START, (scene: Scene) => {
}, this);

director.on(director.EventName.LOAD_SCENE_END, (scene: Scene) => {
}, this);

director.on(director.EventName.AFTER_SCENE_LAUNCH, (scene: Scene) => {
}, this);
```

### 帧循环事件

```typescript
director.on(director.EventName.BEFORE_UPDATE, () => {
}, this);

director.on(director.EventName.AFTER_UPDATE, () => {
}, this);

director.on(director.EventName.BEFORE_RENDER, () => {
}, this);

director.on(director.EventName.AFTER_RENDER, () => {
}, this);
```

## 进阶用法

### 持久化节点管理

```typescript
@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager | null = null;

    onLoad() {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        director.addPersistRootNode(this.node);
    }
}
```

### 自定义游戏循环控制

```typescript
@ccclass('GamePauseController')
export class GamePauseController extends Component {
    private _paused = false;

    public togglePause() {
        if (this._paused) {
            director.resume();
            this._paused = false;
        } else {
            director.pause();
            this._paused = true;
        }
    }
}
```

### 场景切换动画

```typescript
@ccclass('SceneTransition')
export class SceneTransition extends Component {
    public transitionTo(sceneName: string) {
        director.preloadScene(sceneName, (err) => {
            if (err) return;
            this.playTransitionAnimation(() => {
                director.loadScene(sceneName);
            });
        });
    }

    private playTransitionAnimation(callback: () => void) {
        tween(this.node)
            .to(0.5, { scale: new Vec3(0, 0, 0) })
            .call(callback)
            .start();
    }
}
```

## 注意事项

- `director.pause()` 会停止所有组件的 `update`/`lateUpdate` 调用
- `loadScene` 是异步操作，场景切换在当前帧结束后执行
- 持久化节点不宜过多，会影响场景切换性能
- `BEFORE_RENDER` 事件中不要修改场景结构
