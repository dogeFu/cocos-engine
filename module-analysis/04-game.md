# Game 游戏生命周期管理模块分析

## 模块作用

Game 模块是 Cocos Creator 引擎的启动入口和生命周期管理中心,负责引擎的初始化、游戏循环、场景切换、暂停恢复等核心流程。它协调所有引擎子系统的初始化顺序,管理游戏的运行状态,是整个引擎的"心脏"。

### 主要功能领域

1. **引擎初始化** - 分阶段初始化所有引擎模块
2. **游戏循环** - 驱动整个游戏的帧更新流程
3. **生命周期管理** - 管理游戏的暂停、恢复、重启、退出
4. **场景管理** - 通过 Director 管理场景加载和切换
5. **事件系统** - 提供游戏生命周期事件的分发机制
6. **配置管理** - 加载和管理游戏配置

## 设计理念

### 1. 分阶段初始化流程

Game 模块采用分阶段的初始化流程,确保各模块按正确的依赖顺序初始化。

**初始化阶段:**

```
┌─────────────────────────────────────────────────────────┐
│  1. Base Module Initialization                          │
│     - Debug settings                                    │
│     - System info (sys)                                 │
│     - Settings                                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. Infrastructure Module Initialization                │
│     - Macro                                             │
│     - Canvas & Screen                                   │
│     - GFX Device                                        │
│     - Asset Manager                                     │
│     - Layers                                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. Subsystem Module Initialization                     │
│     - Effect Settings                                   │
│     - Render Pipeline                                   │
│     - Director                                          │
│     - Builtin Resources                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. Project Data Initialization                         │
│     - Plugin Scripts                                    │
│     - Project Bundles                                   │
│     - CCE Scripts                                       │
│     - Preload Assets                                    │
└─────────────────────────────────────────────────────────┘
```

**设计优势:**
- 清晰的依赖关系
- 便于扩展和定制
- 支持异步初始化
- 错误隔离和定位

**实现原理:**
```typescript
public init(config: IGameConfig): Promise<void> {
    return Promise.resolve()
        // Base 模块初始化
        .then(() => {
            this.emit(Game.EVENT_PRE_BASE_INIT);
            return this.onPreBaseInitDelegate.dispatch();
        })
        .then(() => sys.init())
        .then(() => settings.init(config.settingsPath, config.overrideSettings))
        .then(() => {
            this.emit(Game.EVENT_POST_BASE_INIT);
            return this.onPostBaseInitDelegate.dispatch();
        })
        
        // Infrastructure 模块初始化
        .then(() => {
            this.emit(Game.EVENT_PRE_INFRASTRUCTURE_INIT);
            return this.onPreInfrastructureInitDelegate.dispatch();
        })
        .then(() => deviceManager.init(this.canvas, bindingMappingInfo))
        .then(() => {
            assetManager.init();
            builtinResMgr.init();
            Layers.init();
        })
        .then(() => {
            this.emit(Game.EVENT_POST_INFRASTRUCTURE_INIT);
            return this.onPostInfrastructureInitDelegate.dispatch();
        })
        
        // Subsystem 和 Project 初始化...
}
```

### 2. 异步委托系统

Game 模块使用 AsyncDelegate 实现灵活的初始化扩展机制。

**设计理念:**
- 允许外部代码注入初始化逻辑
- 支持异步操作
- 保证执行顺序

**委托类型:**
```typescript
// 基础模块初始化前后的委托
public readonly onPreBaseInitDelegate: AsyncDelegate<...>;
public readonly onPostBaseInitDelegate: AsyncDelegate<...>;

// 基础设施初始化前后的委托
public readonly onPreInfrastructureInitDelegate: AsyncDelegate<...>;
public readonly onPostInfrastructureInitDelegate: AsyncDelegate<...>;

// 子系统初始化前后的委托
public readonly onPreSubsystemInitDelegate: AsyncDelegate<...>;
public readonly onPostSubsystemInitDelegate: AsyncDelegate<...>;

// 项目数据初始化前后的委托
public readonly onPreProjectInitDelegate: AsyncDelegate<...>;
public readonly onPostProjectInitDelegate: AsyncDelegate<...>;
```

**使用示例:**
```typescript
// 在基础模块初始化后添加自定义逻辑
game.onPostBaseInitDelegate.add(() => {
    console.log('Base modules initialized');
    return Promise.resolve();
});

// 在子系统初始化前加载自定义配置
game.onPreSubsystemInitDelegate.add(async () => {
    await loadCustomConfig();
});
```

### 3. 游戏循环与帧率控制

Game 模块通过 Pacer 实现精确的帧率控制和游戏循环。

**核心概念:**
- **帧率设置**: 可配置的目标帧率
- **帧时间**: 每帧的期望时间间隔
- **增量时间**: 实际的帧间隔时间
- **固定帧率模式**: 使用固定增量时间

**Pacer 设计:**
```typescript
class Pacer {
    public targetFrameRate: number = 60;
    public onTick: () => void;
    
    private _tick(): void {
        // 使用 requestAnimationFrame 或 setTimeout 驱动
        requestAnimationFrame(() => {
            this.onTick();
            if (this._running) {
                this._tick();
            }
        });
    }
}
```

**游戏循环流程:**
```typescript
private _updateCallback(): void {
    if (!this._inited) return;
    
    // 计算增量时间
    const dt = this._calculateDT(false);
    
    // 更新启动画面或加载场景
    if (SplashScreen.instance && !SplashScreen.instance.isFinished) {
        SplashScreen.instance.update(dt);
    } else if (this._shouldLoadLaunchScene) {
        // 加载启动场景
        director.loadScene(launchScene, () => {
            director.startAnimation();
            this.onStart?.();
        });
    } else {
        // 驱动 Director 更新
        director.tick(dt);
    }
}
```

### 4. 事件驱动的生命周期

Game 模块定义了完整的生命周期事件,允许外部代码响应游戏状态变化。

**生命周期事件:**
```typescript
// 游戏状态事件
EVENT_HIDE = 'game_on_hide';              // 游戏进入后台
EVENT_SHOW = 'game_on_show';              // 游戏回到前台
EVENT_PAUSE = 'game_on_pause';            // 游戏暂停
EVENT_RESUME = 'game_on_resume';          // 游戏恢复
EVENT_CLOSE = 'game_on_close';            // 游戏关闭
EVENT_RESTART = 'game_on_restart';        // 游戏重启

// 初始化事件
EVENT_PRE_BASE_INIT = 'pre_base_init';
EVENT_POST_BASE_INIT = 'post_base_init';
EVENT_PRE_INFRASTRUCTURE_INIT = 'pre_infrastructure_init';
EVENT_POST_INFRASTRUCTURE_INIT = 'post_infrastructure_init';
EVENT_PRE_SUBSYSTEM_INIT = 'pre_subsystem_init';
EVENT_POST_SUBSYSTEM_INIT = 'post_subsystem_init';
EVENT_PRE_PROJECT_INIT = 'pre_project_init';
EVENT_POST_PROJECT_INIT = 'post_project_init';

// 引擎事件
EVENT_ENGINE_INITED = 'engine_inited';    // 引擎初始化完成
EVENT_RENDERER_INITED = 'renderer_inited'; // 渲染器初始化完成
EVENT_GAME_INITED = 'game_inited';        // 游戏初始化完成
```

**事件使用:**
```typescript
// 监听游戏初始化完成
game.on(Game.EVENT_GAME_INITED, () => {
    console.log('Game initialized');
});

// 监听游戏进入后台
game.on(Game.EVENT_HIDE, () => {
    // 暂停游戏逻辑
    // 保存游戏状态
});

// 监听游戏回到前台
game.on(Game.EVENT_SHOW, () => {
    // 恢复游戏逻辑
});
```

### 5. 暂停与恢复机制

Game 模块实现了完整的暂停和恢复机制,区分引擎暂停和用户暂停。

**两种暂停:**
- **用户暂停**: 调用 `game.pause()` 主动暂停
- **引擎暂停**: 系统事件(如进入后台)触发的暂停

**暂停范围:**
```typescript
public pause(): void {
    // 暂停游戏主循环
    this._paused = true;
    this._pacer?.stop();
    this.emit(Game.EVENT_PAUSE);
}

public resume(): void {
    // 恢复游戏主循环
    input._clearEvents();  // 清除输入事件
    this._paused = false;
    this._pacer?.start();
    this.emit(Game.EVENT_RESUME);
}
```

**暂停与 Director.pause() 的区别:**
- `game.pause()`: 暂停游戏逻辑、渲染、输入事件(部分平台)
- `director.pause()`: 仅暂停游戏逻辑更新,渲染继续

### 6. 配置系统设计

Game 模块使用 Settings 系统管理引擎和游戏配置。

**配置分类:**
```typescript
enum SettingsCategory {
    SCREEN = 'screen',           // 屏幕设置
    RENDERING = 'rendering',     // 渲染设置
    PHYSICS = 'physics',         // 物理设置
    ANIMATION = 'animation',     // 动画设置
    ASSETS = 'assets',           // 资源设置
    SCRIPTING = 'scripting',     // 脚本设置
    LAUNCH = 'launch',           // 启动设置
    PROFILING = 'profiling',     // 性能分析设置
}
```

**配置覆盖机制:**
```typescript
interface IGameConfig {
    overrideSettings: Partial<{
        [k in Settings.Category[keyof Settings.Category]]: Record<string, any>
    }>
}

// 使用示例
game.init({
    overrideSettings: {
        [SettingsCategory.SCREEN]: {
            frameRate: 60,
            orientation: 'landscape',
        },
        [SettingsCategory.RENDERING]: {
            renderMode: 2,  // WebGL
            msaa: 4,
        },
    }
});
```

## 核心组件详解

### 1. Game 类

**职责:**
- 引擎启动入口
- 初始化流程管理
- 游戏循环驱动
- 生命周期事件分发

**关键属性:**
- `canvas`: 游戏画布
- `container`: 画布容器
- `frame`: 画布外框
- `renderType`: 渲染器类型
- `frameRate`: 目标帧率
- `deltaTime`: 上一帧增量时间
- `totalTime`: 游戏总运行时间
- `inited`: 是否初始化完成

**关键方法:**
- `init()`: 初始化引擎
- `run()`: 运行游戏
- `pause()`: 暂停游戏
- `resume()`: 恢复游戏
- `restart()`: 重启游戏
- `end()`: 退出游戏
- `step()`: 执行一帧(调试用)

### 2. Director 类

**职责:**
- 场景管理
- 游戏循环调度
- 系统管理
- 常驻节点管理

**关键属性:**
- `_scene`: 当前运行的场景
- `_scheduler`: 调度器
- `_compScheduler`: 组件调度器
- `_nodeActivator`: 节点激活器
- `_systems`: 系统列表
- `_persistRootNodes`: 常驻根节点

**关键方法:**
- `loadScene()`: 加载场景
- `runScene()`: 运行场景
- `preloadScene()`: 预加载场景
- `getScene()`: 获取当前场景
- `pause()`: 暂停逻辑更新
- `tick()`: 执行一帧更新

### 3. Pacer 类

**职责:**
- 帧率控制
- 游戏循环驱动
- 帧时间计算

**实现方式:**
- Web 平台: 使用 `requestAnimationFrame`
- 原生平台: 使用平台特定的定时器

### 4. SplashScreen 启动画面

**职责:**
- 显示启动画面
- 加载进度反馈
- 平滑过渡到游戏场景

## 代码示例

### 基本启动流程

```typescript
import { game, Game } from 'cc';

// 配置游戏
const config: IGameConfig = {
    debugMode: DebugMode.INFO,
    overrideSettings: {
        [SettingsCategory.SCREEN]: {
            frameRate: 60,
            exactFitScreen: true,
        },
        [SettingsCategory.RENDERING]: {
            renderMode: 2,  // WebGL
        },
    }
};

// 初始化并运行游戏
game.init(config).then(() => {
    game.run(() => {
        console.log('Game started!');
    });
});
```

### 监听生命周期事件

```typescript
import { game, Game } from 'cc';

// 游戏初始化完成
game.on(Game.EVENT_GAME_INITED, () => {
    console.log('Game initialized');
});

// 游戏进入后台
game.on(Game.EVENT_HIDE, () => {
    console.log('Game hidden');
    // 保存游戏状态
    saveGameState();
});

// 游戏回到前台
game.on(Game.EVENT_SHOW, () => {
    console.log('Game shown');
    // 恢复游戏状态
    restoreGameState();
});

// 游戏暂停
game.on(Game.EVENT_PAUSE, () => {
    console.log('Game paused');
    // 暂停音频
    audio.pauseAll();
});

// 游戏恢复
game.on(Game.EVENT_RESUME, () => {
    console.log('Game resumed');
    // 恢复音频
    audio.resumeAll();
});
```

### 使用初始化委托

```typescript
import { game } from 'cc';

// 在基础模块初始化后添加自定义逻辑
game.onPostBaseInitDelegate.add(async () => {
    console.log('Loading custom config...');
    await loadCustomConfig();
});

// 在子系统初始化前注册自定义系统
game.onPreSubsystemInitDelegate.add(() => {
    console.log('Registering custom system...');
    director.registerSystem('CustomSystem', new CustomSystem(), 100);
    return Promise.resolve();
});

// 在项目数据初始化后加载自定义资源
game.onPostProjectInitDelegate.add(async () => {
    console.log('Loading custom assets...');
    await loadCustomAssets();
});
```

### 控制游戏状态

```typescript
import { game, director } from 'cc';

// 暂停游戏
function pauseGame() {
    game.pause();
}

// 恢复游戏
function resumeGame() {
    game.resume();
}

// 重启游戏
function restartGame() {
    game.restart().then(() => {
        console.log('Game restarted');
    });
}

// 退出游戏
function exitGame() {
    game.end();
}

// 设置帧率
game.frameRate = 30;  // 30 FPS
game.frameRate = 60;  // 60 FPS

// 获取帧时间
console.log('Frame time:', game.frameTime, 'ms');
console.log('Delta time:', game.deltaTime, 's');
```

### 场景管理

```typescript
import { director, Director } from 'cc';

// 加载场景
director.loadScene('MainScene', (err) => {
    if (err) {
        console.error('Failed to load scene:', err);
        return;
    }
    console.log('Scene loaded');
});

// 预加载场景
director.preloadScene('Level2', (err) => {
    if (err) {
        console.error('Failed to preload scene:', err);
        return;
    }
    console.log('Scene preloaded');
});

// 监听场景事件
director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, (scene) => {
    console.log('Before scene launch:', scene.name);
});

director.on(Director.EVENT_AFTER_SCENE_LAUNCH, (scene) => {
    console.log('After scene launch:', scene.name);
});

// 获取当前场景
const currentScene = director.getScene();
console.log('Current scene:', currentScene?.name);
```

### 常驻节点管理

```typescript
import { director, Node } from 'cc';

// 添加常驻根节点
const persistNode = new Node('PersistNode');
director.addPersistRootNode(persistNode);

// 检查是否是常驻节点
if (director.isPersistRootNode(persistNode)) {
    console.log('This is a persist root node');
}

// 移除常驻节点
director.removePersistRootNode(persistNode);
```

## 模块关联

### 上游依赖

Game 模块依赖以下基础模块:

1. **Core**
   - 使用事件系统分发生命周期事件
   - 使用调度器管理定时任务
   - 使用 Settings 管理配置

2. **Platform**
   - 使用 systemInfo 获取系统信息
   - 使用 Pacer 驱动游戏循环

3. **GFX**
   - 使用 deviceManager 初始化图形设备

4. **Asset**
   - 使用 assetManager 加载资源
   - 使用 builtinResMgr 加载内置资源

### 下游依赖

Game 模块是引擎的入口,被以下模块依赖:

1. **Director**
   - 由 Game 初始化和管理
   - 接收 Game 的帧更新驱动

2. **Scene Graph**
   - 通过 Director 管理场景

3. **Rendering**
   - 由 Game 初始化渲染管线

4. **所有子系统**
   - Physics, Animation, UI 等在 Game 初始化过程中启动

### 模块交互流程

```
Application Entry Point
    ↓
game.init(config)
    ↓
┌─────────────────────────────────────────┐
│  Base Initialization                     │
│  - Debug, Sys, Settings                  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Infrastructure Initialization           │
│  - GFX, Asset, Screen, Layers            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Subsystem Initialization                │
│  - Director, Rendering, Physics, etc     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Project Initialization                  │
│  - Scripts, Bundles, Assets              │
└─────────────────────────────────────────┘
    ↓
game.run()
    ↓
┌─────────────────────────────────────────┐
│  Game Loop (每帧)                         │
│  - Calculate Delta Time                  │
│  - director.tick(dt)                     │
│    - Update Systems                      │
│    - Update Components                   │
│    - Physics Simulation                  │
│    - Render                              │
└─────────────────────────────────────────┘
```

## 设计模式应用

### 1. 单例模式 (Singleton Pattern)
- `game` 和 `director` 都是单例
- 确保全局唯一的游戏实例
- 便于全局访问

### 2. 模板方法模式 (Template Method Pattern)
- `init()` 方法定义了初始化的骨架
- 各阶段的具体实现由子模块完成
- 支持通过委托扩展

### 3. 观察者模式 (Observer Pattern)
- 生命周期事件系统
- 允许外部代码响应状态变化
- 解耦事件发送者和接收者

### 4. 状态模式 (State Pattern)
- 游戏状态管理(运行、暂停、后台等)
- 不同状态下的行为差异

### 5. 命令模式 (Command Pattern)
- `step()` 方法实现单步执行
- 支持调试和回放

### 6. 委托模式 (Delegate Pattern)
- AsyncDelegate 实现初始化扩展
- 将部分逻辑委托给外部代码

## 性能优化策略

### 1. 分阶段初始化
- 避免一次性加载所有模块
- 按需初始化,减少启动时间
- 支持异步加载

### 2. 帧率控制
- 精确的帧时间计算
- 支持动态调整帧率
- 避免过度渲染

### 3. 增量时间计算
- 使用 `performance.now()` 高精度计时
- 处理调试时的长时间暂停
- 支持固定帧率模式

### 4. 资源预加载
- 启动时预加载关键资源
- 分批加载,避免卡顿
- 显示加载进度

## 扩展性设计

### 1. 自定义初始化流程
通过委托系统扩展初始化流程:

```typescript
// 添加自定义初始化阶段
game.onPostInfrastructureInitDelegate.add(async () => {
    // 初始化自定义系统
    await initializeCustomSystem();
});
```

### 2. 自定义游戏循环
可以接管游戏循环:

```typescript
// 停止自动循环
game.pause();

// 手动控制帧更新
function customLoop() {
    game.step();
    requestAnimationFrame(customLoop);
}
customLoop();
```

### 3. 自定义配置
扩展配置系统:

```typescript
// 添加自定义配置项
settings.overrideSettings['custom'] = {
    myCustomSetting: 'value',
};

// 读取自定义配置
const value = settings.querySettings('custom', 'myCustomSetting');
```

### 4. 自定义生命周期
监听和响应生命周期事件:

```typescript
// 游戏进入后台时保存状态
game.on(Game.EVENT_HIDE, () => {
    saveGameState();
});

// 游戏回到前台时恢复状态
game.on(Game.EVENT_SHOW, () => {
    restoreGameState();
});
```

## 总结

Game 模块是 Cocos Creator 引擎的核心控制器,其设计体现了以下核心思想:

1. **分阶段初始化**: 清晰的模块依赖和初始化顺序,确保系统稳定启动
2. **事件驱动**: 完善的生命周期事件系统,便于外部代码响应状态变化
3. **异步委托**: 灵活的扩展机制,支持自定义初始化逻辑
4. **精确控制**: 帧率控制和增量时间计算,确保游戏运行流畅
5. **状态管理**: 完整的暂停、恢复、重启机制,应对各种运行场景

理解 Game 模块的设计理念,对于掌握 Cocos Creator 的整体架构、实现自定义启动流程、优化游戏性能都至关重要。Game 模块是引擎的"心脏",驱动着整个游戏的生命周期。
