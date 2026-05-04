# Cocos Creator 引擎 — 核心基础设施

> 面向 AI 辅助编程的中文参考文档。覆盖引擎五大基础模块。

---

## 目录

1. [cocos/game/ — 游戏生命周期](#1-cocosgame--游戏生命周期)
2. [cocos/scene-graph/ — 场景图与节点系统](#2-cocosscene-graph--场景图与节点系统)
3. [cocos/core/ — 核心引擎基础设施](#3-cocoscore--核心引擎基础设施)
4. [cocos/gfx/ — 图形抽象层](#4-cocosgfx--图形抽象层)
5. [cocos/render-scene/ — 渲染场景管理](#5-cocosrender-scene--渲染场景管理)

---

## 1. cocos/game/ — 游戏生命周期

### 1.1 Game（`cocos/game/game.ts`）

`Game` 类是引擎顶层入口。继承 `EventTarget`，负责引导整个引擎启动、通过 `Pacer` 管理主循环、协调所有子系统初始化。

**单例：** `game` — 模块级常量导出（第 1264 行）。也可通过 `cclegacy.game` 访问。

#### 关键事件（静态常量）

| 常量 | 字符串值 | 触发时机 |
|---|---|---|
| `EVENT_PRE_BASE_INIT` | `"pre_base_init"` | 日志/sys/设置初始化之前 |
| `EVENT_POST_BASE_INIT` | `"post_base_init"` | 日志/sys/设置初始化之后 |
| `EVENT_PRE_INFRASTRUCTURE_INIT` | `"pre_infrastructure_init"` | assetManager/gfx/screen 初始化之前 |
| `EVENT_POST_INFRASTRUCTURE_INIT` | `"post_infrastructure_init"` | assetManager/gfx/screen 初始化之后 |
| `EVENT_PRE_SUBSYSTEM_INIT` | `"pre_subsystem_init"` | 物理/动画/渲染初始化之前 |
| `EVENT_POST_SUBSYSTEM_INIT` | `"post_subsystem_init"` | 物理/动画/渲染初始化之后 |
| `EVENT_ENGINE_INITED` | `"engine_inited"` | 引擎完全初始化 |
| `EVENT_PRE_PROJECT_INIT` | `"pre_project_init"` | 项目数据加载之前 |
| `EVENT_POST_PROJECT_INIT` | `"post_project_init"` | 项目数据加载之后 |
| `EVENT_GAME_INITED` | `"game_inited"` | 游戏完全初始化 |
| `EVENT_RENDERER_INITED` | `"renderer_inited"` | GFX 设备就绪 |
| `EVENT_HIDE` / `EVENT_SHOW` | `"game_on_hide"` / `"game_on_show"` | 应用后台/前台切换 |
| `EVENT_PAUSE` / `EVENT_RESUME` | `"game_on_pause"` / `"game_on_resume"` | 游戏暂停/恢复 |
| `EVENT_LOW_MEMORY` | `"game_on_low_memory"` | 内存不足（仅原生平台） |
| `EVENT_RESTART` | `"game_on_restart"` | `game.restart()` 之后 |
| `EVENT_CLOSE` | `"game_on_close"` | 游戏关闭 |

#### 初始化流程（`game.init()`）

`game.init(config)`（第 798 行）返回 `Promise<void>`，严格按以下顺序执行：

1. **Base 阶段**：调试设置、`sys.init()`、平台事件、`settings.init()`
2. **Infrastructure 阶段**：`macro.init()`、canvas/frame 查找、`screen.init()`、`deviceManager.init()`（创建 GFX 设备）、`assetManager.init()`、`builtinResMgr.init()`、`Layers.init()`、Pacer 创建
3. **Subsystem 阶段**：`effectSettings.init()`、脚本包加载、`director.init()`、内置资源加载
4. **Engine Inited**：触发 `EVENT_ENGINE_INITED`
5. **Project 阶段**：加载 JS 插件、项目 Bundle、CCE 脚本、渲染管线设置、预加载资源、启动画面、编译内置材质
6. **Game Inited**：触发 `EVENT_GAME_INITED`

每个阶段都会触发 pre/post 委托事件（`onPreBaseInitDelegate` 等），接受返回 `Promise<void> | void` 的 `AsyncDelegate` 回调。

#### 关键属性

- `game.deltaTime`（第 462 行）：距上一帧的增量时间（秒）。`_useFixedDeltaTime` 为 true 时返回固定 `frameTime/1000`。
- `game.totalTime`（第 472 行）：游戏启动以来的总耗时（毫秒）。
- `game.frameStartTime`（第 480 行）：当前帧开始的时间戳。
- `game.frameTime`（第 488 行）：期望帧时长（毫秒），默认 `1000/60`。
- `game.frameRate`（第 443 行）：获取/设置目标帧率。
- `game.renderType`（第 405 行）：当前渲染后端类型（初始为 -1）。

#### 关键方法

- `game.step()`（第 599 行）：以固定 delta time 推进一帧。适用于确定性测试。
- `game.pause()` / `game.resume()`（第 641、655 行）：暂停/恢复整个游戏循环（逻辑 + 渲染 + 输入）。
- `game.restart()`（第 677 行）：等待 END_FRAME，重置 director，延迟销毁，显示启动画面，触发 EVENT_RESTART。
- `game.end()`（第 705 行）：通过 `systemInfo.close()` 关闭游戏。

#### 内部：主循环（`_updateCallback`，第 1124 行）

Pacer 每帧调用 `_updateCallback`。流程为：

1. 如果启动画面激活，更新启动画面并返回。
2. 如果 `_shouldLoadLaunchScene` 为 true，从设置加载启动场景，然后调用 `director.startAnimation()` 和 `game.onStart()`。
3. 否则调用 `director.tick(game._calculateDT(false))`。

`_calculateDT`（第 1106 行）：如果 delta time 超过 `DEBUG_DT_THRESHOLD`（1 秒），则钳位到 `frameTime/1000` — 防止浏览器标签页后台切换后恢复时出现巨大跳帧。

#### 隐含知识

- `game.on()` 的覆写（第 723 行）**会立即调用回调**，如果对应事件已经触发过（例如在 `EVENT_ENGINE_INITED` 已触发后注册监听，回调会立即执行）。这是非标准 EventTarget 行为。
- `game.frame` 和 `game.container` 自 v3.4.0 起已弃用，使用 `screen` 模块代替。
- `game._isCloning`（第 494 行）在反序列化/实例化期间设置，不要依赖它。

---

### 1.2 Director（`cocos/game/director.ts`）

`Director` 类管理游戏逻辑流：场景管理、帧 tick、组件生命周期调度。继承 `EventTarget`。

**单例：** `director` — 模块级常量导出（第 986 行）。也可通过 `cclegacy.director` 访问。

#### DirectorEvent 枚举（第 66 行）

`director.tick()` 中按顺序触发的所有帧级事件：

`BEGIN_FRAME` -> `BEFORE_UPDATE` -> (start/update/lateUpdate) -> `AFTER_UPDATE` -> `BEFORE_DRAW` -> `AFTER_DRAW` -> `END_FRAME`

附加事件：`INIT`、`RESET`、`BEFORE_SCENE_LOADING`、`BEFORE_SCENE_LAUNCH`、`AFTER_SCENE_LAUNCH`、`BEFORE_PHYSICS`、`AFTER_PHYSICS`、`BEFORE_RENDER`、`AFTER_RENDER`、`BEFORE_COMMIT`。

#### Tick 循环（`director.tick(dt)`，第 821 行）

这是引擎的心脏。每帧执行：

1. 触发 `BEGIN_FRAME`
2. 分发输入事件（`input._frameDispatchEvents()`）
3. 如果未暂停：
   a. 触发 `BEFORE_UPDATE`
   b. `ComponentScheduler.startPhase()` — 对新启用的组件调用 `start()`
   c. `ComponentScheduler.updatePhase(dt)` — 对所有组件调用 `update(dt)`
   d. 更新所有已注册的系统（按优先级排序）
   e. `ComponentScheduler.lateUpdatePhase(dt)` — 调用 `lateUpdate(dt)`
   f. 触发 `AFTER_UPDATE`
   g. `CCObject._deferredDestroy()` — 实际销毁标记为销毁的对象
   h. 后更新所有系统
4. 触发 `BEFORE_DRAW`
5. `uiRendererManager.updateAllDirtyRenderers()`
6. `director.root.frameMove(dt)` — 提交渲染命令
7. 触发 `AFTER_DRAW`
8. `Node.resetHasChangedFlags()` 和 `Node.clearNodeArray()`
9. `scalableContainerManager.update(dt)`
10. 触发 `END_FRAME`
11. 递增 `_totalFrames`

#### 场景管理

- `director.loadScene(sceneName, onLaunched?, onUnloaded?)`（第 560 行）：从已加载的 Bundle 按名称加载场景。如果正在加载其他场景则返回 false。通过 `_loadingScene` 守卫防止并发加载。
- `director.preloadScene(sceneName, onProgress?, onLoaded?)`（第 633 行）：预加载场景数据但不启动。
- `director.runSceneImmediate(scene, onBeforeLoadScene?, onLaunched?)`（第 413 行）：立即启动场景。处理持久节点重新挂载、旧场景销毁、资源自动释放、场景激活。
- `director.runScene(scene, ...)`（第 537 行）：将 `runSceneImmediate` 推迟到 `END_FRAME` 执行。
- `director.getScene()`（第 684 行）：返回当前逻辑 Scene 节点。

#### 持久根节点

- `director.addPersistRootNode(node)`（第 902 行）：使节点在场景切换后存活。节点必须是 Scene 的直接子节点。
- `director.removePersistRootNode(node)`（第 935 行）：取消持久化。
- `director.isPersistRootNode(node)`（第 950 行）：检查持久化状态。

#### 暂停/恢复

- `director.pause()`（第 352 行）：仅暂停游戏逻辑（update/lateUpdate）。渲染继续。
- `director.resume()`（第 666 行）：恢复游戏逻辑。
- 这与 `game.pause()` 不同，后者还会停止渲染和输入。

#### 系统

- `director.registerSystem(name, sys, priority)`（第 755 行）：注册系统，priority 越小越早执行。
- 系统在 tick 循环的 `update(dt)` 和 `postUpdate(dt)` 中按优先级顺序调用。
- Scheduler 注册在优先级 200。

#### 隐含知识

- `director.init()`（第 875 行）使用 `deviceManager.gfxDevice` 创建 `Root` 并初始化。Root 是通向 GFX 层的桥梁。
- `game.restart()` 调用 `director.reset()` 清除一切、移除所有持久节点、重新开始动画。
- 场景切换期间 `runSceneImmediate` 中，旧的持久节点会触发 `SCENE_CHANGED_FOR_PERSISTS` 事件，附带新的渲染场景。

---

## 2. cocos/scene-graph/ — 场景图与节点系统

### 2.1 Node（`cocos/scene-graph/node.ts`）

`Node` 类是 Cocos Creator 场景图的基础实体。继承 `CCObject`，实现 `ISchedulable` 和 `CustomSerializable`。

#### 核心属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `name` | `string` | 节点名称。不能包含 `/`。 |
| `uuid` | `string`（只读） | 唯一标识符 |
| `active` | `boolean` | 本地激活状态。设置时触发激活/停用。 |
| `activeInHierarchy` | `boolean`（只读） | 考虑父链后节点是否真正激活 |
| `parent` | `Node \| null` | 父节点 |
| `children` | `Node[]`（只读） | 直接子节点数组 |
| `components` | `ReadonlyArray<Component>` | 挂载的组件 |
| `scene` | `Scene`（只读） | 节点所属场景 |
| `siblingIndex` | `number` | 在父节点 children 数组中的索引 |

#### 变换方法

所有变换 setter 都有接受向量/四元数或独立标量分量的重载。默认在**本地空间**操作。

- `setPosition(val: Vec3)` 或 `setPosition(x, y, z?)`（第 2422 行）：设置本地位置。标记 `TransformBit.POSITION` 脏标记并调用 `invalidateChildren()`。
- `setRotation(val: Quat)` 或 `setRotation(x, y, z, w)`（第 2473 行）：设置本地旋转（四元数）。标记 `TransformBit.ROTATION` 脏标记。
- `setRotationFromEuler(x, y, z?)`（第 2503 行）：将欧拉角转换为四元数，设置本地旋转。
- `setScale(val: Vec3)` 或 `setScale(x, y, z?)`（第 2550 行）：设置本地缩放。标记 `TransformBit.SCALE` 脏标记。
- `setWorldPosition(val: Vec3)` 或 `setWorldPosition(x, y, z)`（第 2621 行）：通过计算逆父世界变换设置世界位置。
- `setWorldRotation(val: Quat)` 或 `setWorldRotation(x, y, z, w)`（第 2681 行）：设置世界旋转。
- `setWorldScale(val: Vec3)` 或 `setWorldScale(x, y, z)`（第 2745 行）：设置世界缩放。

- `updateWorldTransform()`（第 2311 行）：沿父链向上递归收集脏节点，然后自底向上重算世界矩阵。如果 `_transformFlags` 为零则短路跳过。

#### 层级管理

- `setParent(value, keepWorldTransform?)`（第 492 行）：更改父节点。如果 `keepWorldTransform` 为 true，先更新世界变换。触发 `PARENT_CHANGED`、`CHILD_ADDED`、`CHILD_REMOVED` 事件。需要时触发激活/停用。
- `addChild(child)`（第 624 行）：调用 `child.setParent(this)`。
- `insertChild(child, siblingIndex)`（第 638 行）：设置父节点后设置兄弟索引。
- `removeChild(child)`（第 805 行）：将子节点的 parent 设为 null。
- `removeAllChildren()`（第 816 行）：逆序遍历子节点，将 parent 设为 null。
- `removeFromParent()`（第 794 行）：调用父节点的 removeChild。
- `getChildByName(name)`（第 576 行）：按名称线性搜索。
- `getChildByUuid(uuid)`（第 551 行）：按 uuid 线性搜索。
- `getChildByPath(path)`（第 601 行）：按 `/` 分割路径向下遍历。
- `isChildOf(parent)`（第 833 行）：沿父链向上遍历。

#### 树遍历

- `walk(preFunc, postFunc?)`（第 702 行）：基于栈的（非递归）遍历。首次访问节点时调用 `preFunc`（在子节点之前），所有子节点处理完后调用 `postFunc`。使用共享静态栈（`Node._stacks`）和栈 ID 嵌套。

**陷阱：** 不要在 walk 回调中对任何其他节点调用 walk — 共享栈不支持嵌套遍历。

#### 组件管理

- `addComponent(typeOrClassName)`（第 1062 行）：创建新组件实例，推入 `_components`，触发 `COMPONENT_ADDED`。如果节点在层级中激活，立即激活组件。同时自动添加所需组件（`_requireComponent`）。
- `getComponent(typeOrClassName)`（第 896 行）：对 sealed 类使用 `===` 搜索，否则使用 `instanceof`。
- `getComponents(typeOrClassName)`（第 933 行）：返回所有匹配项。
- `getComponentInChildren(typeOrClassName)`（第 975 行）：深度优先搜索子节点（不搜索自身）。
- `getComponentsInChildren(typeOrClassName)`（第 1016 行）：搜索自身及所有子节点。
- `removeComponent(component)`（第 1183 行）：已弃用 — 调用 `component.destroy()`。

#### 节点事件（`NodeEventType`）

定义在 `cocos/scene-graph/node-event.ts`。关键事件：

| 事件 | 说明 |
|---|---|
| `TRANSFORM_CHANGED` | 位置/旋转/缩放变化。回调接收 `TransformBit`。 |
| `ACTIVE_CHANGED` | 激活状态变化 |
| `ACTIVE_IN_HIERARCHY_CHANGED` | 从最顶层的激活值变化的节点发出 |
| `CHILD_ADDED` / `CHILD_REMOVED` | 子节点添加/移除 |
| `PARENT_CHANGED` | 父节点变化 |
| `COMPONENT_ADDED` / `COMPONENT_REMOVED` | 组件添加/移除 |
| `NODE_DESTROYED` | 节点正在销毁 |
| `TOUCH_START` / `TOUCH_MOVE` / `TOUCH_END` / `TOUCH_CANCEL` | 触摸事件（通过场景图冒泡） |
| `MOUSE_DOWN` / `MOUSE_MOVE` / `MOUSE_UP` / `MOUSE_WHEEL` | 鼠标事件 |
| `MOUSE_ENTER` / `MOUSE_LEAVE` | 鼠标悬停事件 |

**关键：** 触摸和鼠标事件使用 `dispatchEvent()` 通过场景图的捕获/冒泡阶段分发。自定义事件使用 `emit()`，仅分发给同一节点上的监听器（不冒泡）。

#### 事件掩码优化（第 1240-1251 行）

Node 维护 `_eventMask` 位掩码。注册 `TRANSFORM_CHANGED` 监听器时设置 `TRANSFORM_ON` 位（1 << 0）。变换更新时检查此位以避免不必要的事件分发。`ACTIVE_ON`（1 << 1）用于 `ACTIVE_CHANGED`。

#### 节点激活/停用行为

设置 `node.active = true/false`（第 194 行）触发 `director._nodeActivator.activateNode(this, isActive)`。激活器递归遍历子树，对组件调用 `__preload`、`onLoad`、`onEnable`/`onDisable`。

**重要：** 节点的 `activeInHierarchy` 为 true 仅当节点及其所有祖先都激活。非活跃父节点的子节点无论自身 `active` 属性如何都保持非活跃。

#### 节点销毁（第 1367 行，_onPreDestroyBase 第 1493 行）

调用 `node.destroy()` 时：
1. 设置 `Destroying` 标志
2. 停用节点（触发所有组件的 `onDisable`）
3. 从父节点的 children 数组中移除
4. 触发 `NODE_DESTROYED`
5. 销毁事件处理器
6. 递归销毁所有子节点（立即）
7. 销毁所有组件（立即）

实际销毁是延迟的：`node.destroy()` 仅标记节点，`CCObject._deferredDestroy()` 在帧末尾（`AFTER_UPDATE` 之后）执行实际清理。

#### 节点枚举（`cocos/scene-graph/node-enum.ts`）

- `NodeSpace`：`LOCAL`（0）、`WORLD`（1）
- `TransformBit`：`NONE`（0）、`POSITION`（1<<0）、`ROTATION`（1<<1）、`SCALE`（1<<2）、`SKEW`（1<<3）、`RS`、`RSS`、`TRS`、`TRS_MASK`
- `MobilityMode`：`Static`（0）、`Stationary`（1）、`Movable`（2）

---

### 2.2 Component（`cocos/scene-graph/component.ts`）

所有用户脚本的基类。继承 `CCObject`。

#### 生命周期方法（调用顺序）

1. **`__preload()`**（第 566 行）：内部方法。在每个 `onLoad` 之前调用。内置组件用于内部初始化。
2. **`onLoad()`**（第 585 行）：附加到激活节点或节点首次激活时调用。所有 `onLoad` 在任何 `start` 之前完成。
3. **`onEnable()`**（第 620 行）：组件启用且节点在层级中激活时调用。
4. **`start()`**（第 604 行）：所有组件的 `onLoad` 完成后，首次 `update` 之前调用一次。
5. **`update(dt)`**（第 529 行）：每帧调用。`dt` 单位为秒。
6. **`lateUpdate(dt)`**（第 546 行）：所有 `update` 调用之后每帧调用。
7. **`onDisable()`**（第 636 行）：组件禁用或节点变为非活跃时调用。
8. **`onDestroy()`**（第 652 行）：组件正在销毁时调用。

#### 关键属性

- `node`（第 188 行）：组件挂载的节点。由引擎设置，非用户设置。
- `enabled`（第 129 行）：组件是否启用。设置时触发组件调度器的 `enableComp`/`disableComp`。
- `enabledInHierarchy`（第 156 行）：返回 `this._enabled && this.node && this.node.activeInHierarchy`。
- `_id`（第 211 行）：自动生成的唯一 ID，前缀 "Comp"。
- `uuid`（第 105 行）：同 `_id`。

#### 调度器集成

- `schedule(callback, interval?, repeat?, delay?)`（第 450 行）：调度重复回调。使用 `director.getScheduler()`。
- `scheduleOnce(callback, delay?)`（第 483 行）：调度一次性回调。
- `unschedule(callback_fn)`（第 496 行）：移除已调度回调。
- `unscheduleAllCallbacks()`（第 512 行）：移除该组件的所有已调度回调。

#### 隐含知识

- 生命周期方法是 `protected` 且可选的。引擎通过 `internalOnLoad`、`internalStart`、`internalUpdate` 等 getter 属性访问（第 534-658 行）。如果方法不存在于原型上，引擎安全跳过。
- `Component._executionOrder`（第 64 行）：静态属性，默认 0。可通过 `@executeInEditMode` 装饰器选项中的 `executionOrder` 设置。控制 `start`、`update`、`lateUpdate` 的调用顺序（负值 = 更早）。
- `Component._requireComponent`（第 69 行）：添加此组件时自动添加依赖组件。
- `destroy()`（第 379 行）：如果组件在编辑器中有依赖组件，销毁会被阻止。
- `_onPreDestroy()`（第 405 行）：取消所有已调度回调，通过节点激活器调用 `onDestroy`，从节点移除组件。
- 在**编辑器**中，生命周期方法被 try-catch 包裹以防止编辑器崩溃。运行时中错误正常传播。

---

### 2.3 ComponentScheduler（`cocos/scene-graph/component-scheduler.ts`）

管理所有组件生命周期方法的执行，按 `_executionOrder` 排序。

**关键类：** `ComponentScheduler`（第 351 行），由 `director._compScheduler` 持有。

#### 调用器类型

- `OneOffInvoker`（第 137 行）：按 `_executionOrder` 对组件排序一次，全部调用后清空。用于 `start` 和 `onLoad`。
- `ReusableInvoker`（第 175 行）：使用二分插入维护排序顺序。用于 `update` 和 `lateUpdate`。

两者都使用三个桶：`_neg`（order < 0）、`_zero`（order == 0）、`_pos`（order > 0）。`_zero` 中组件按插入顺序执行。

#### 帧阶段

- `startPhase()`（第 473 行）：调用 `startInvoker.invoke()` 然后 `_startForNewComps()`。
- `updatePhase(dt)`（第 503 行）：调用 `updateInvoker.invoke(dt)`。
- `lateUpdatePhase(dt)`（第 512 行）：调用 `lateUpdateInvoker.invoke(dt)`，然后处理延迟组件。

**延迟调度：** 当组件在更新循环期间被启用（`_updating == true`），它被推入 `_deferredComps` 而非立即调度。这些在 `lateUpdatePhase` 之后通过 `_deferredSchedule()` 处理。

#### 隐含知识

- `invokeStart`、`invokeUpdate`、`invokeLateUpdate`（第 274-315 行）在 `SUPPORT_JIT` 为 true 时使用 JIT 编译函数（`createInvokeImplJit`）。生成优化循环代码字符串。回退到 `createInvokeImpl`，包含快速路径 + try-catch 慢速路径。
- 组件在生命周期回调中抛出异常时，引擎捕获它，通过 `legacyCC._throw(e)` 报告，继续执行下一个组件。`ensureFlag` 机制防止对已抛出异常的组件重新调用生命周期方法。

---

### 2.4 NodeActivator（`cocos/scene-graph/node-activator.ts`）

处理节点及其组件的递归激活/停用。

**关键方法：** `activateNode(node, active)`（第 158 行）。

#### 激活流程

激活节点时：
1. 从池中获取 `ActivateTask`（包含 `preload`、`onLoad`、`onEnable` 调用器）。
2. 调用 `_activateNodeRecursively`：
   - 设置 `_activeInHierarchy = true`
   - 对每个组件：调用 `activateComp`，添加到 preload/onLoad/onEnable 调用器
   - 对每个活跃子节点：递归
3. 按顺序调用所有 `preload`、`onLoad`、`onEnable`。

#### 停用流程

停用节点时：
1. 设置 `Deactivating` 标志。
2. 设置 `_activeInHierarchy = false`。
3. 对所有已启用组件调用 `disableComp`（触发 `onDisable`）。
4. 递归停用活跃子节点。
5. 如果某个组件的 `onDisable` 导致重新激活（停用期间节点再次变为活跃），过程优雅中止。
6. 触发 `ACTIVE_IN_HIERARCHY_CHANGED`。

**关键陷阱：** 不能在自身停用期间重新激活节点。`Deactivating` 标志阻止此操作（第 250-258 行，错误 3816）。

#### 隐含知识

- `ActivateTask` 对象使用对象池（最多 4 个）以减少 GC 压力。
- 激活期间，`originCount` 在激活组件之前捕获，因为 `onEnable` 回调中可能添加新组件。
- 停用期间，对栈中所有待处理的激活任务调用 `cancelInactive` 进行防抖 — 在另一个节点激活期间被停用的节点将取消其待处理的生命周期调用。

---

### 2.5 Scene（`cocos/scene-graph/scene.ts`）

`Scene` 继承 `Node`。是场景图的根节点，由 `Director` 管理。

#### 关键属性

- `renderScene`（第 50 行）：对应的 `RenderScene`（来自 render-scene 模块）。
- `globals`（第 55 行）：`SceneGlobals`，包含环境光、阴影、雾效、天空盒、八叉树、皮肤设置。
- `autoReleaseAssets`（第 65 行）：如果为 true，场景切换时自动释放静态引用的资源。

#### 关键方法

- `_load()`（第 175 行）：场景激活前调用。展开预制体实例、应用目标覆盖、批量创建节点、通过 `walk(Node._setScene)` 设置场景引用。
- `_activate(active = true)`（第 194 行）：调用 `director._nodeActivator.activateNode(this, active)` 然后 `this._globals.activate(this)`。
- `destroy()`（第 101 行）：销毁所有子节点（设为非活跃），然后销毁 `RenderScene`。
- `addComponent()` 被覆写为抛出错误（第 125 行）— 不能直接向 Scene 添加组件。

#### 隐含知识

- Scene 在构造函数中设置 `_activeInHierarchy = false`（第 90 行），即初始为非活跃。
- Scene 的 `_updateScene()` 是空操作（第 84 行）— 直接设置 `_scene = this`。
- Scene 的 `updateWorldTransform()` 是空操作（第 160 行）— 场景没有父变换。
- Scene 的 `_onHierarchyChanged` 和 `_onPostActivated` 是空操作（第 132、139 行）。

---

### 2.6 Layers（`cocos/scene-graph/layers.ts`）

用于射线检测、物理和渲染剔除的层管理。以位掩码存储在 `Node.layer` 上。

#### 内置层（位 20-31 保留）

| 名称 | 位 | 值 |
|---|---|---|
| `NONE` | - | 0 |
| `IGNORE_RAYCAST` | 20 | 1 << 20 |
| `GIZMOS` | 21 | 1 << 21 |
| `EDITOR` | 22 | 1 << 22 |
| `UI_3D` | 23 | 1 << 23 |
| `SCENE_GIZMO` | 24 | 1 << 24 |
| `UI_2D` | 25 | 1 << 25 |
| `PROFILER` | 28 | 1 << 28 |
| `DEFAULT` | 30 | 1 << 30 |
| `ALL` | - | 0xffffffff |

用户层使用位 0-19。`Layers.addLayer(name, bitNum)` 在运行时添加自定义层。`Layers.makeMaskInclude([layers])` 和 `Layers.makeMaskExclude([layers])` 创建过滤掩码。

---

## 3. cocos/core/ — 核心引擎基础设施

### 3.1 模块概览

`cocos/core/` 提供所有其他模块使用的基础工具、数据结构和抽象。从 `cocos/core/index.ts` 重新导出。

关键子模块：
- **math/** — Vec2、Vec3、Vec4、Mat3、Mat4、Quat、Color、Rect、Size
- **geometry/** — AABB、OBB、Sphere、Frustum、Ray、Plane、Intersect
- **data/** — CCObject、CCClass、装饰器（`@ccclass`、`@property`、`@serializable`）
- **event/** — EventTarget、Eventify、CallbacksInvoker、AsyncDelegate
- **scheduler/** — 基于时间的回调调度器
- **memop/** — CachedArray、ScalableContainer、Pool
- **utils/** — js（类型工具、数组辅助）、misc
- **platform/** — sys、screen、settings、debug
- **curves/** — 动画曲线、关键帧、缓动
- **algorithm/** — 二分搜索、缓动、murmurhash

### 3.2 CCObject（`cocos/core/data/object.ts`）

所有引擎对象（Node、Component、Asset 等）的基类。

#### CCObjectFlags（第 35 行）

对象状态跟踪的位掩码标志：

| 标志 | 位 | 用途 |
|---|---|---|
| `Destroyed` | 1 << 0 | 对象已销毁 |
| `RealDestroyed` | 1 << 1 | 对象已完全销毁 |
| `ToDestroy` | 1 << 2 | 已排队等待延迟销毁 |
| `DontSave` | 1 << 3 | 不序列化（如运行时添加的子节点） |
| `EditorOnly` | 1 << 4 | 仅编辑器中存在 |
| `Dirty` | 1 << 5 | 需要重新计算 |
| `DontDestroy` | 1 << 6 | 场景加载后持久化 |
| `Destroying` | 1 << 7 | 正在销毁过程中 |
| `Deactivating` | 1 << 8 | 正在停用 |
| `IsOnEnableCalled` | 1 << 11 | onEnable 已被调用 |
| `IsPreloadStarted` | 1 << 13 | __preload 已开始 |
| `IsOnLoadCalled` | 1 << 14 | onLoad 已被调用 |
| `IsOnLoadStarted` | 1 << 15 | onLoad 已开始 |
| `IsStartCalled` | 1 << 16 | start 已被调用 |

`PersistentMask`（第 65 行）定义克隆/序列化后保留的标志。

#### 延迟销毁

`CCObject._deferredDestroy()`（在 `director.tick` 的 `AFTER_UPDATE` 之后调用）处理 `objectsToDestroy` 队列中的所有对象。这意味着 `node.destroy()` 不会立即释放内存 — 实际清理在帧末尾发生。

### 3.3 EventTarget（`cocos/core/event/event-target.ts`）

`EventTarget` 通过 `Eventify(Empty)` 创建（第 42 行）。提供：

- `on(type, callback, target?, once?)`：注册监听器
- `once(type, callback, target?)`：注册一次性监听器
- `off(type, callback?, target?)`：移除监听器
- `emit(type, ...args)`：向所有监听器分发事件
- `hasEventListener(type)`：检查是否存在监听器
- `targetOff(target)`：移除某个目标的所有监听器
- `dispatchEvent(event)`：带捕获/冒泡阶段分发

`AsyncDelegate`（`cocos/core/event/async-delegate.ts`）扩展此模式用于异步回调，`dispatch()` 返回 `Promise<void[]>`。

### 3.4 装饰器

`cocos/core/data/decorators/` 中的关键装饰器：

- `@ccclass(name)`：向 CCClass 系统注册类（序列化、编辑器集成所必需）。
- `@property(typeOrOptions)`：声明可序列化/可编辑属性。
- `@serializable`：标记属性为可序列化（简写）。
- `@editable`：使属性在编辑器检查器中可见。
- `@tooltip(text)`：在编辑器中添加提示文本。
- `@type(constructor)`：指定属性的类型。
- `@visible(bool | () => boolean)`：控制编辑器中的可见性。
- `@range([min, max, step])`：约束数值属性范围。

### 3.5 Scheduler（`cocos/core/scheduler/`）

`Scheduler` 提供基于时间的回调调度。以优先级 200 注册为 `director` 的系统。

- `schedule(callback, target, interval, repeat, delay, paused)`：调度回调。
- `unschedule(callback, target)`：移除特定回调。
- `unscheduleAllForTarget(target)`：移除某个目标的所有回调。
- `pauseTarget(target)` / `resumeTarget(target)`：暂停/恢复某个目标的所有回调。

组件内部使用此调度器实现 `schedule()`/`unschedule()` 方法。

---

## 4. cocos/gfx/ — 图形抽象层

### 4.1 架构

GFX 模块提供硬件无关的图形 API 抽象。支持多个后端：

| 后端 | 目录 | API 目标 |
|---|---|---|
| WebGL 1.0 | `cocos/gfx/webgl/` | `API.WEBGL` |
| WebGL 2.0 | `cocos/gfx/webgl2/` | `API.WEBGL2` |
| WebGPU | `cocos/gfx/webgpu/` | `API.WEBGPU` |
| 原生（Vulkan/Metal/GL） | 通过 JSB 绑定 | `API.VULKAN`、`API.METAL`、`API.GLES2`、`API.GLES3` |
| 空设备（无头） | `cocos/gfx/empty/` | `API.UNKNOWN` |

### 4.2 Device（`cocos/gfx/base/device.ts`）

图形设备的抽象基类。

#### 关键属性

- `gfxAPI`（第 61 行）：当前渲染 API（`API` 枚举）。
- `queue`（第 69 行）：默认命令队列。
- `commandBuffer`（第 77 行）：默认命令缓冲区。
- `swapchainFormat`（第 85 行）：交换链格式（默认 `RGBA8`）。
- `renderer`（第 93 行）：渲染器名称字符串（如 "WebGL 2.0"）。
- `vendor`（第 99 行）：GPU 厂商字符串。
- `numDrawCalls`（第 109 行）：当前 Draw Call 数。
- `numInstances`（第 117 行）：当前实例数。
- `numTris`（第 125 行）：当前三角形数。
- `memoryStatus`（第 133 行）：GPU 内存分配统计。
- `capabilities`（第 141 行）：设备能力（`DeviceCaps`）。
- `bindingMappingInfo`（第 149 行）：描述符绑定布局。

#### 抽象工厂方法

所有 GFX 资源通过设备创建：

- `createCommandBuffer(info)` -> `CommandBuffer`
- `createSwapchain(info)` -> `Swapchain`
- `createBuffer(info)` -> `Buffer`
- `createTexture(info)` -> `Texture`
- `createShader(info)` -> `Shader`
- `createInputAssembler(info)` -> `InputAssembler`
- `createRenderPass(info)` -> `RenderPass`
- `createFramebuffer(info)` -> `Framebuffer`
- `createDescriptorSet(info)` -> `DescriptorSet`
- `createDescriptorSetLayout(info)` -> `DescriptorSetLayout`
- `createPipelineLayout(info)` -> `PipelineLayout`
- `createPipelineState(info)` -> `PipelineState`
- `createQueue(info)` -> `Queue`
- `getSampler(info)` -> `Sampler`（缓存）
- `getGeneralBarrier(info)` -> `GeneralBarrier`（缓存）
- `getTextureBarrier(info)` -> `TextureBarrier`（缓存）
- `getBufferBarrier(info)` -> `BufferBarrier`（缓存）

#### 特性检测

- `hasFeature(feature: Feature)`（第 372 行）：检查 GPU 特性支持。
- `getFormatFeatures(format: Format)`（第 381 行）：检查格式支持级别。
- `getMaxSampleCount(format, usage, flags)`（第 ~397 行）：获取最大 MSAA 采样数。

### 4.3 API 枚举（`cocos/gfx/base/define.ts`，第 88 行）

```
UNKNOWN, GLES2, GLES3, METAL, VULKAN, NVN, WEBGL, WEBGL2, WEBGPU
```

### 4.4 Feature 枚举（`cocos/gfx/base/define.ts`，第 107 行）

```
ELEMENT_INDEX_UINT, INSTANCED_ARRAYS, MULTIPLE_RENDER_TARGETS, BLEND_MINMAX,
COMPUTE_SHADER, INPUT_ATTACHMENT_BENEFIT（已弃用）, SUBPASS_COLOR_INPUT,
SUBPASS_DEPTH_STENCIL_INPUT, RASTERIZATION_ORDER_NOCOHERENT,
MULTI_SAMPLE_RESOLVE_DEPTH_STENCIL, COUNT
```

### 4.5 DeviceManager（`cocos/gfx/device-manager.ts`）

单例 `deviceManager`（第 243 行），管理设备初始化和主交换链。

#### `deviceManager.init(canvas, bindingMappingInfo)`（第 143 行）

1. 从 `settings.querySettings('rendering', 'renderMode')` 确定渲染类型。
2. AUTO 模式优先级：WebGPU（如果可用且非编辑器）> WebGL2 > WebGL > Empty。
3. UC 浏览器强制使用 WebGL1（第 160 行），因为其 WebGL2 实现不符合规范。
4. WebGPU 初始化是异步的（返回 `Promise<boolean>`）。
5. 创建大小为 `screen.windowSize` 的主交换链。

#### 渲染模式（`LegacyRenderMode` 枚举）

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | AUTO | 引擎自动选择（WebGPU > WebGL2 > WebGL） |
| 1 | CANVAS | Canvas 2D（软件渲染） |
| 2 | WEBGL | 强制 WebGL |
| 3 | HEADLESS | 空设备，用于测试 |
| 4 | WEBGPU | 强制 WebGPU |

### 4.6 关键 GFX 概念

**Swapchain**：表示屏幕上的渲染目标。从 canvas 元素创建。提供前/后缓冲区管理。

**CommandBuffer**：记录渲染命令（绘制、分发、拷贝等），稍后在 Queue 上执行。

**Queue**：执行已记录的命令缓冲区。类型：GRAPHICS（默认）、COMPUTE、TRANSFER。

**Render Pass**：描述颜色/深度/模板附件配置和加载/存储操作。

**Framebuffer**：绑定到 Render Pass 的纹理附件集合。

**Pipeline State**：组合着色器、渲染通道、顶点输入、混合、深度/模板和光栅化状态。

**Descriptor Set / Layout**：管理着色器的 uniform buffer、纹理和采样器绑定。

**Input Assembler**：管理绘制调用的顶点缓冲区和索引缓冲区。

#### 隐含知识

- `Device.canvas` 是静态属性（第 191 行），作为 WebGL 设备初始化的 hack — canvas 设置在类上而非实例上。
- 采样器、屏障通过设备上的 `Map<number, ...>` 缓存（去重）。`getSampler` 对相同配置不创建新实例。
- 空后端（`cocos/gfx/empty/`）将所有接口实现为空操作，适用于无头/服务器端测试。
- `enableAutoBarrier(en)`（第 390 行）在 Web 后端上是空操作。

---

## 5. cocos/render-scene/ — 渲染场景管理

### 5.1 RenderScene（`cocos/render-scene/core/render-scene.ts`）

`RenderScene` 由 `Root` 创建，提供所有渲染元素：相机、灯光、模型和 2D 绘制批次。

**创建方式：** `director.root.createScene({})`（在 `Scene` 构造函数中调用，`cocos/scene-graph/scene.ts:92`）。

#### 关键属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `root` | `Root` | 根渲染器 |
| `name` | `string` | 场景名称 |
| `cameras` | `Camera[]` | 所有相机 |
| `mainLight` | `DirectionalLight \| null` | 主方向光 |
| `sphereLights` | `SphereLight[]` | 球面光源 |
| `spotLights` | `SpotLight[]` | 聚光灯 |
| `pointLights` | `PointLight[]` | 点光源 |
| `rangedDirLights` | `RangedDirectionalLight[]` | 范围方向光 |
| `models` | `Model[]` | 所有可渲染模型 |
| `batches` | `DrawBatch2D[]` | 2D 绘制批次 |
| `lodGroups` | `LODGroup[]` | LOD 组 |

#### 关键方法

- `addCamera(cam)`（第 262 行）：附加相机并注册到 LOD 缓存。
- `removeCamera(camera)`（第 272 行）：分离相机。
- `setMainLight(dl)`（第 ~297 行）：设置主方向光。
- `addSphereLight(light)` / `addSpotLight(light)` 等：注册光源。
- `addModel(model)`：注册可渲染模型。
- `addLODGroup(lodGroup)`：注册 LOD 组。
- `update(stamp)`（第 198 行）：更新所有灯光和模型。对每个启用的模型：`updateTransform(stamp)` 然后 `updateUBOs(stamp)`。同时更新 LOD 状态缓存。
- `destroy()`（第 244 行）：移除所有相机、灯光、模型、LOD 组。
- `isCulledByLod(camera, model)`（第 254 行）：检查模型是否被某个相机的 LOD 剔除。

#### 射线检测

- `raycastResults: IRaycastResult[]` — 接口包含 `node: Node` 和 `distance: number`。

### 5.2 Camera（`cocos/render-scene/scene/camera.ts`）

渲染相机。管理投影、视口、清除设置和后处理。

#### 关键枚举

- `CameraFOVAxis`：`VERTICAL`（0）、`HORIZONTAL`（1）
- `CameraProjection`：`ORTHO`（0）、`PERSPECTIVE`（1）
- `CameraAperture`：F1.8 到 F22.0（光圈档位）
- `CameraISO`：ISO100、ISO200、ISO400、ISO800

#### 关键属性

- `width` / `height`：视口尺寸。
- `nearClip` / `farClip`：裁剪平面。
- `fov`：视场角（透视模式，单位为度）。
- `orthoHeight`：正交投影的半高。
- `clearColor`：背景清除颜色。
- `clearFlags`：清除哪些缓冲区（`ClearFlagBit`）。
- `visibility`：用于剔除的层掩码。
- `priority`：渲染顺序。
- `window`：`RenderTarget`（通常是屏幕的 `RenderWindow`）。

### 5.3 RenderWindow（`cocos/render-scene/core/render-window.ts`）

表示渲染目标 — 屏幕上（交换链支持）或离屏（帧缓冲）。

#### 关键属性

- `width` / `height`：预旋转尺寸（竖屏模式）。
- `swapchain`：关联的交换链（如果是屏幕上）。
- `framebuffer`：底层帧缓冲。
- `cameras`：渲染到此窗口的相机。

**注意：** width/height 返回预旋转值。使用 `Camera.width`/`Camera.height` 获取方向化尺寸。

### 5.4 SceneGlobals（`cocos/scene-graph/scene-globals.ts`）

`SceneGlobals` 作为 Scene 的一部分序列化，包含每场景渲染配置：

- `AmbientInfo`：天空颜色、地面反照率、天空照度（HDR/LDR 分开）。
- `ShadowsInfo`：阴影类型、阴影距离、阴影颜色、阴影贴图大小。
- `SkyboxInfo`：环境贴图、环境光照类型、卷积贴图。
- `FogInfo`：雾类型、雾颜色、雾密度、雾起止距离。
- `OctreeInfo`：八叉树最小/最大边界、深度。
- `SkinInfo`：皮肤权重、模糊半径。
- `LightProbeInfo`：光照探针数据。
- `PostSettingsInfo`：色调映射类型等。

所有这些在 `Scene._activate()` 期间通过 `globals.activate(scene)` 激活。

### 5.5 Model（`cocos/render-scene/scene/model.ts`）

渲染场景中的可渲染对象。每个模型包含：

- 变换矩阵（世界、法线）
- 材质和 SubModel
- 包围盒（AABB）
- 可见性掩码
- 启用状态

`updateTransform(stamp)`：从场景图 Node 的变换重新计算世界矩阵。
`updateUBOs(stamp)`：上传 uniform buffer 数据到 GPU。

### 5.6 SubModel（`cocos/render-scene/scene/submodel.ts`）

每个 Model 包含一个或多个 SubModel。SubModel 持有：

- `RenderPipeline` 子状态
- 输入装配器（顶点/索引数据）
- 描述符集
- 绘制调用配置的 `Pass` 对象

### 5.7 灯光类型

所有灯光继承基类 `Light`（`cocos/render-scene/scene/light.ts`）：

| 类 | 文件 | 说明 |
|---|---|---|
| `DirectionalLight` | `scene/directional-light.ts` | 无限远方向光（太阳）。每个场景仅一个"主灯光"。 |
| `SphereLight` | `scene/sphere-light.ts` | 带范围衰减的点状光源 |
| `SpotLight` | `scene/spot-light.ts` | 锥形聚光灯 |
| `PointLight` | `scene/point-light.ts` | 全向点光源 |
| `RangedDirectionalLight` | `scene/ranged-directional-light.ts` | 带范围边界的方向光 |

### 5.8 隐含知识

- `RenderScene.registerCreateFunc(root)`（第 173 行）是静态工厂注册模式。Root 使用此模式创建场景，无需直接依赖 RenderScene。
- `LodStateCache` 是内部类，缓存每相机每帧的 LOD 状态，在 `RenderScene.update()` 中更新。
- 渲染场景的 `update()` 必须使用匹配帧时间的时间戳（`stamp`）调用。模型使用此时间戳进行动画和变换更新。
- 场景切换期间，旧的 RenderScene 通过 `director.root.destroyScene(renderScene)` 销毁。
- `DrawBatch2D` 是 2D 特有的可渲染对象，与 3D `Model` 对象分开管理。
