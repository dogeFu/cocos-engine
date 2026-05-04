# Cocos Creator 引擎 — 场景图内部机制

> 面向 AI 辅助编程的中文参考文档。覆盖 Director 生命周期、NodeActivator、ComponentScheduler、CCClass 属性存储、Node 变换系统、组件生命周期管理。

---

## 目录

1. [Director 生命周期](#1-director-生命周期)
2. [NodeActivator — 组件激活/停用管理器](#2-nodeactivator--组件激活停用管理器)
3. [ComponentScheduler — 组件生命周期调度器](#3-componentscheduler--组件生命周期调度器)
4. [CCClass 属性存储与描述符系统](#4-ccclass-属性存储与描述符系统)
5. [Node 变换系统](#5-node-变换系统)
6. [组件注册与生命周期管理](#6-组件注册与生命周期管理)
7. [隐含知识与常见陷阱](#7-隐含知识与常见陷阱)
8. [关键文件索引](#8-关键文件索引)

---

## 1. Director 生命周期

**文件：** `cocos/game/director.ts`

`Director` 继承自 `EventTarget`，是整个引擎的游戏循环管理器。通过 `Director.instance` 导出为全局 `director` 对象。

### 关键数据成员

| 属性 | 类型 | 说明 |
|------|------|------|
| `_compScheduler` | `ComponentScheduler` | 组件生命周期调度 |
| `_nodeActivator` | `NodeActivator` | 节点激活/停用管理 |
| `_invalid` | `boolean` | 是否停止主循环 |
| `_paused` | `boolean` | 是否暂停逻辑更新 |
| `_root` | `Root \| null` | 渲染根节点 |
| `_scene` | `Scene \| null` | 当前逻辑场景 |
| `_totalFrames` | `number` | 总帧数 |
| `_scheduler` | `Scheduler` | 用户定时器调度器 |
| `_systems` | `System[]` | 注册的系统列表 |
| `_persistRootNodes` | `Record<string, Node>` | 常驻根节点 |

### tick() 主循环

```
BEGIN_FRAME 事件
  → input._frameDispatchEvents()  // 输入事件派发
  → [未暂停时]:
     BEFORE_UPDATE 事件
     → _compScheduler.startPhase()    // 组件 start 调用
     → _compScheduler.updatePhase(dt) // 组件 update 调用
     → systems[i].update(dt)          // 所有注册系统 update
     → _compScheduler.lateUpdatePhase(dt) // 组件 lateUpdate 调用
     AFTER_UPDATE 事件
     → CCObject._deferredDestroy()    // 延迟销毁对象
     → systems[i].postUpdate(dt)      // 所有注册系统 postUpdate
  BEFORE_DRAW 事件
  → uiRendererManager.updateAllDirtyRenderers()  // UI 渲染器更新
  → _root!.frameMove(dt)             // 渲染管线帧推进
  AFTER_DRAW 事件
  → Node.resetHasChangedFlags()      // 重置变换脏标记
  → Node.clearNodeArray()            // 清理临时节点数组
  → scalableContainerManager.update(dt)  // 内存池管理
  END_FRAME 事件
  _totalFrames++
```

### 系统管理

- `registerSystem(name, sys, priority)` — 注册系统，按优先级排序
- `unregisterSystem(sys)` — 注销系统
- `getSystem(name)` — 按名称获取系统
- `Scheduler` 默认以优先级 200 注册

### 场景切换流程

`runScene()` 通过 `END_FRAME` 事件延迟到帧末执行 `runSceneImmediate()`：

1. `scene._load()` — 初始化场景
2. 处理常驻节点（重新挂载或替换）
3. 销毁旧场景
4. `CCObject._deferredDestroy()` — 执行延迟销毁
5. `scene._activate()` — 激活新场景
6. `startAnimation()` — 启动动画

---

## 2. NodeActivator — 组件激活/停用管理器

**文件：** `cocos/scene-graph/node-activator.ts`

### ActivateTask 结构

```typescript
interface ActivateTask {
    preload: UnsortedInvoker;   // __preload 调用（无排序）
    onLoad: OneOffInvoker;      // onLoad 调用（一次性，按 executionOrder 排序）
    onEnable: OneOffInvoker;    // onEnable 调用（一次性，按 executionOrder 排序）
}
```

任务对象使用对象池 `Pool<ActivateTask>` 管理，最大池大小为 4。

### activateNode 流程

**激活（active=true）：**
1. 从对象池获取 `ActivateTask`
2. 压入 `_activatingStack`
3. `_activateNodeRecursively(node, preload, onLoad, onEnable)` — 递归激活
4. 依次调用 `task.preload.invoke()` → `task.onLoad.invoke()` → `task.onEnable.invoke()`
5. 弹出栈，归还对象池

**停用（active=false）：**
1. `_deactivateNodeRecursively(node)` — 递归停用
2. 遍历栈中所有任务，调用 `cancelInactive()` 取消已不再激活的组件

### _activateNodeRecursively 递归激活

```
1. 检查 Deactivating 标志，防止在停用过程中重新激活（避免死循环）
2. node._setActiveInHierarchy(true)
3. 遍历 node.components，对每个组件调用 activateComp()
4. 递归处理所有 active 的子节点
5. node._onPostActivated(true)
```

### activateComp 组件激活

组件激活的完整生命周期调用链：

```
1. 检查 IsPreloadStarted 标志 → 若未开始，标记并调用 __preload
2. 检查 IsOnLoadStarted 标志 → 若未开始，标记并调用 onLoad
   - 调用后设置 IsOnLoadCalled 标志
3. 如果组件 _enabled 且节点 activeInHierarchy:
   → compScheduler.enableComp(comp, onEnableInvoker)
```

### _deactivateNodeRecursively 递归停用

```
1. 设置 Deactivating 标志
2. node._setActiveInHierarchy(false)
3. 遍历组件，对 enabled 的组件调用 compScheduler.disableComp()
4. 递归处理子节点
5. node._onPostActivated(false)
6. 清除 Deactivating 标志
```

### 编辑器模式特殊处理

在 `EDITOR` 条件下，`activateComp` 和 `destroyComp` 方法被原型替换：
- 使用 try-catch 包装所有生命周期调用
- 检查 `_executeInEditMode` 标志决定是否执行
- 增加 `onFocusInEditor` / `onLostFocusInEditor` 调用
- 增加 `resetInEditor` 支持

---

## 3. ComponentScheduler — 组件生命周期调度器

**文件：** `cocos/scene-graph/component-scheduler.ts`

### 三级队列架构

| 调度器 | 类型 | 用途 |
|--------|------|------|
| `startInvoker` | `OneOffInvoker` | start 回调（一次性） |
| `updateInvoker` | `ReusableInvoker` | update 回调（每帧） |
| `lateUpdateInvoker` | `ReusableInvoker` | lateUpdate 回调（每帧） |

### LifeCycleInvoker 的三分区设计

每个 Invoker 内部维护三个 `MutableForwardIterator`：

```typescript
protected _zero: MutableForwardIterator;  // executionOrder === 0 (默认)
protected _neg: MutableForwardIterator;   // executionOrder < 0
protected _pos: MutableForwardIterator;   // executionOrder > 0
```

**执行顺序：** `_neg` → `_zero` → `_pos`，在每个分区内按 `executionOrder` 排序。

### OneOffInvoker vs ReusableInvoker

- **OneOffInvoker**（用于 start/onLoad/onEnable）：每次 `invoke()` 后清空数组，`_neg` 和 `_pos` 在调用前排序
- **ReusableInvoker**（用于 update/lateUpdate）：组件注册时通过 `sortedIndex()` 二分查找插入到正确位置，不清空数组，每帧反复调用

### JIT 优化

当 `SUPPORT_JIT` 为 true 时，使用 `createInvokeImplJit()` 动态生成函数体：

```javascript
var a=it.array;for(it.i=0;it.i<a.length;++it.i){var c=a[it.i];c.start();c._objFlags|=IsStartCalled}
```

避免了每次迭代中的属性查找和类型检查，提升性能。

### 延迟调度机制

```typescript
private _deferredComps: any[] = [];  // 延迟调度的组件列表
private _updating: boolean = false;  // 是否正在更新中
```

当在 `_updating` 期间有新组件被启用：
- 不立即调度，而是加入 `_deferredComps`
- 在 `startPhase()` 末尾和 `lateUpdatePhase()` 末尾调用 `_startForNewComps()`
- `_startForNewComps()` 先执行 `_deferredSchedule()` 再调用 `startInvoker.invoke()`

### enableComp / disableComp 流程

**enableComp：**
1. 检查 IsOnEnableCalled 标志
2. 若有 onEnable 方法：有 invoker 则加入队列，无 invoker 则直接调用
3. 调用 `_onEnabled(comp)`：scheduler.resumeTarget + 设置标志 + 调度或延迟调度

**disableComp：**
1. 检查 IsOnEnableCalled 标志
2. 调用 onDisable
3. 调用 `_onDisabled(comp)`：scheduler.pauseTarget + 清除标志 + 从所有 Invoker 中移除

### CCObjectFlags 生命周期标志

| 标志 | 含义 |
|------|------|
| `IsPreloadStarted` | `__preload` 已开始调用 |
| `IsOnLoadStarted` | `onLoad` 已开始调用 |
| `IsOnLoadCalled` | `onLoad` 已调用完成 |
| `IsOnEnableCalled` | `onEnable` 已调用 |
| `IsStartCalled` | `start` 已调用 |
| `Deactivating` | 正在停用中 |

---

## 4. CCClass 属性存储与描述符系统

**文件：** `cocos/core/data/class.ts`, `cocos/core/data/utils/attribute.ts`, `cocos/core/data/class-stash.ts`

### 属性存储机制 — `__attrs__` 扁平化字典

CCClass 的属性元数据存储在构造函数的 `__attrs__` 对象上，使用**扁平化键值对**格式：

```
属性名 + "$_$" + 属性键 = 属性值
```

例如：
```javascript
cls.__attrs__ = {
    "speed$_$type": "Float",
    "speed$_$default": 0,
    "speed$_$tooltip": "i18n:speed",
    "speed$_$serializable": true,
    "speed$_$visible": true,
}
```

分隔符定义在 `attribute.ts`：`export const DELIMETER = '$_$';`

### `__attrs__` 继承链

`createAttrs()` 函数沿继承链创建 `__attrs__` 对象，使用 `Object.create(superAttrs)` 实现原型链继承：

```typescript
function createAttrsSingle(owner, superAttrs?) {
    const attrs = superAttrs ? Object.create(superAttrs) : {};
    value(owner, '__attrs__', attrs);
    return attrs;
}
```

子类的 `__attrs__` 原型指向父类的 `__attrs__`，子类属性覆盖父类同名属性。

### `__props__` 和 `__values__`

- `cls.__props__`：所有已注册的属性名数组（含继承的）
- `cls.__values__`：可序列化的属性名子集（`serializable !== false`）

### PropertyStash — 装饰器中间存储

`PropertyStash` 接口用于在 `@property` 装饰器和 `@ccclass` 装饰器之间传递属性元数据：

```typescript
export interface PropertyStash extends IExposedAttributes {
    default?: unknown;
    get?: () => unknown;
    set?: (value: unknown) => void;
    _short?: unknown;          // 旧式简写标记
    __internalFlags: number;   // 内部标志位
}

export enum PropertyStashInternalFlag {
    STANDALONE = 1 << 0,           // 独立装饰器标记
    IMPLICIT_VISIBLE = 1 << 1,     // 隐式可见
    IMPLICIT_SERIALIZABLE = 1 << 2, // 隐式可序列化
}
```

### parseAttributes 属性解析流程

`parseAttributes()` 函数将 `PropertyStash` 中的属性写入 `__attrs__`：

1. **type 解析**：原始类型（Integer/Float/Boolean/String）→ 直接存储；Enum/BitMask → 特殊处理；构造函数 → 存为 `Object` 类型 + `ctor`
2. **default**：存储默认值
3. **serializable**：根据 `STANDALONE` 模式和显式设置决定
4. **visible**：下划线开头的属性默认不可见；`STANDALONE` 模式下根据 `IMPLICIT_VISIBLE` 标志决定
5. **编辑器属性**：displayName, displayOrder, tooltip, range, slide 等
6. **formerlySerializedAs**：重命名属性的反向兼容

### CCClass 标记

通过 `__ctors__` 标记判断是否为 CCClass：

```typescript
js.value(ctor, CCCLASS_TAG, true, true);  // CCCLASS_TAG = '__ctors__'

CCClass._isCCClass = function(constructor) {
    return constructor?.hasOwnProperty?.(CCCLASS_TAG);
};
```

---

## 5. Node 变换系统

**文件：** `cocos/scene-graph/node.ts`, `cocos/scene-graph/node-enum.ts`

### TransformBit 脏标记枚举

```typescript
enum TransformBit {
    NONE     = 0,
    POSITION = 1 << 0,   // 位置改变
    ROTATION = 1 << 1,   // 旋转改变
    SCALE    = 1 << 2,   // 缩放改变
    SKEW     = 1 << 3,   // 斜切改变
    RS       = ROTATION | SCALE,
    RSS      = ROTATION | SCALE | SKEW,
    TRS      = POSITION | ROTATION | SCALE,
    TRS_MASK = ~TRS,
}
```

### 变换数据存储

Node 同时维护本地和世界两套变换数据：

```typescript
// 本地变换（序列化存储）
protected _lpos = new Vec3();           // 本地位置
protected _lrot = new Quat();           // 本地旋转（四元数）
protected _lscale = new Vec3(1, 1, 1);  // 本地缩放
protected _euler = new Vec3();          // 欧拉角缓存

// 世界变换（运行时计算）
public _pos: Vec3;    // 世界位置
public _rot: Quat;    // 世界旋转
public _scale: Vec3;  // 世界缩放
public _mat: Mat4;    // 世界矩阵

// 脏标记
protected _transformFlags = TransformBit.TRS | TransformBit.SKEW;  // 初始为全部 dirty
```

### invalidateChildren — 脏标记传播

当节点的本地变换发生变化时，调用 `invalidateChildren(dirtyBit)` 递归标记自身和所有子节点：

- 子节点自动附加 `TransformBit.POSITION`，因为父节点的任何变换都会影响子节点的世界位置
- 只标记尚未被标记的节点（避免重复工作）
- 使用 `dirtyNodes` 数组避免递归栈溢出

### updateWorldTransform — 世界矩阵更新

采用**从根到叶的批量更新**策略：

1. 从当前节点向上遍历到第一个非 dirty 的祖先
2. 将路径上所有 dirty 节点压入 dirtyNodes 数组
3. 从数组末尾（根节点）开始向下更新：
   - 仅位置 dirty: `Vec3.transformMat4` + 更新矩阵平移分量
   - 旋转/缩放 dirty: `Mat4.fromSRT()` 构建本地矩阵 → `Mat4.multiply()` 与父矩阵相乘
   - 根节点（无父节点）: 直接拷贝本地值
4. 清除 `_transformFlags = TransformBit.NONE`

### hasChangedFlags — 帧级变换变更追踪

使用**版本号机制**实现帧级脏标记自动重置：

```typescript
protected _flagChangeVersion = 0;
protected _hasChangedFlags = 0;

get hasChangedFlags(): number {
    return this._flagChangeVersion === globalFlagChangeVersion ? this._hasChangedFlags : 0;
}
```

- `globalFlagChangeVersion` 是全局递增的版本号
- 每帧末尾 `Node.resetHasChangedFlags()` 递增全局版本号
- 旧帧的 `_flagChangeVersion` 不再等于全局版本号，`hasChangedFlags` 自动返回 0
- 避免了遍历所有节点重置标志的开销

### 变换 setter 的统一模式

所有变换属性的 setter 都遵循相同模式：

```typescript
public setPosition(val): void {
    Vec3.copy(this._lpos, val);           // 1. 修改本地值
    this.invalidateChildren(TransformBit.POSITION);  // 2. 传播脏标记
    if (this._eventMask & TRANSFORM_ON) {
        this.emit(TRANSFORM_CHANGED, TransformBit.POSITION);  // 3. 发送变换事件
    }
}
```

`_eventMask` 中的 `TRANSFORM_ON` 位标记表示是否有监听器注册了 `TRANSFORM_CHANGED` 事件，避免无监听器时的无效 emit 调用。

---

## 6. 组件注册与生命周期管理

**文件：** `cocos/scene-graph/component.ts`

### 组件生命周期完整调用链

```
节点激活 (node.active = true)
  → NodeActivator.activateNode(node, true)
    → _activateNodeRecursively
      → 对每个 Component:
         activateComp:
           1. __preload()         [IsPreloadStarted]
           2. onLoad()            [IsOnLoadStarted → IsOnLoadCalled]
           3. enableComp:
              - onEnable()        [IsOnEnableCalled]
              - _onEnabled:
                · scheduler.resumeTarget(comp)
                · scheduleImmediate/deferred:
                  → startInvoker.add()    (如果有 start 方法)
                  → updateInvoker.add()   (如果有 update 方法)
                  → lateUpdateInvoker.add() (如果有 lateUpdate 方法)

每帧 tick:
  startPhase:
    → startInvoker.invoke()    → start()   [IsStartCalled]
  updatePhase:
    → updateInvoker.invoke()   → update(dt)
  systems.update(dt)
  lateUpdatePhase:
    → lateUpdateInvoker.invoke() → lateUpdate(dt)

节点停用 (node.active = false)
  → NodeActivator.activateNode(node, false)
    → _deactivateNodeRecursively
      → 对每个 enabled Component:
         compScheduler.disableComp:
           - onDisable()
           - _onDisabled:
             · scheduler.pauseTarget(comp)
             · 从 start/update/lateUpdateInvoker 中移除

组件销毁 (component.destroy())
  → CCObject.destroy() 标记销毁
  → _onPreDestroy():
     1. unscheduleAllCallbacks()
     2. NodeActivator.destroyComp():
        - disableComp (确保 onDisable 被调用)
        - onDestroy() [仅当 IsOnLoadCalled 时]
     3. node._removeComponent(this)
```

### Component 关键静态属性

| 属性 | 说明 |
|------|------|
| `_executionOrder` | 执行顺序（默认 0） |
| `_requireComponent` | 依赖组件（自动添加） |
| `_executeInEditMode` | 是否在编辑器中执行 |
| `_playOnFocus` | 是否在聚焦时播放 |
| `_disallowMultiple` | 是否禁止同一节点多个实例 |

### enabled 属性的运行时切换

```typescript
set enabled(value) {
    if (this._enabled !== value) {
        this._enabled = value;
        if (this.node.activeInHierarchy) {
            const compScheduler = legacyCC.director._compScheduler;
            if (value) {
                compScheduler.enableComp(this);   // 触发 onEnable + 调度
            } else {
                compScheduler.disableComp(this);  // 触发 onDisable + 取消调度
            }
        }
    }
}
```

### addComponent 流程

1. 获取/验证构造函数
2. 检查是否为 Component 子类
3. 检查 `_disallowMultiple`（编辑器下）
4. 检查 `_requireComponent` 依赖，自动添加缺失的依赖组件
5. `new constructor()` 创建组件实例
6. `component.node = this` — 绑定节点
7. `this._components.push(component)`
8. 如果节点 activeInHierarchy：`NodeActivator.activateComp(component)` — 立即激活
9. 编辑器下调用 `resetInEditor()`
10. 发送 COMPONENT_ADDED 事件

---

## 7. 隐含知识与常见陷阱

1. **Deactivating 标志防止死循环** — 在停用过程中尝试激活同一节点会被忽略
2. **onLoad 在 onEnable 之前** — 组件激活的顺序是 __preload → onLoad → onEnable
3. **start 是延迟执行的** — start 不在 onLoad 后立即执行，而是等到下一帧的 startPhase
4. **OneOffInvoker 每次 invoke 后清空** — start 只调用一次，调用后从队列中移除
5. **ReusableInvoker 不清空** — update/lateUpdate 每帧都调用，组件注册后一直留在队列中
6. **JIT 优化仅 SUPPORT_JIT 时启用** — 小游戏平台（MINIGAME）SUPPORT_JIT=false，使用标准循环
7. **延迟调度避免在 update 中添加组件的竞态** — 新启用的组件在当前帧的 lateUpdate 末尾才调度
8. **`__attrs__` 使用原型链继承** — 子类属性覆盖父类同名属性，但不会删除父类属性
9. **`$_$` 分隔符是硬编码的** — 属性名不能包含 `$_$` 子串
10. **下划线开头的属性默认不可见** — `_privateProp` 在编辑器中默认隐藏
11. **Node 变换采用惰性求值** — setter 只设脏标记，getter 时才从根到叶批量计算世界矩阵
12. **hasChangedFlags 使用版本号自动重置** — 不需要手动清除，每帧自动过期
13. **子节点自动附加 POSITION 脏标记** — 父节点的任何变换都会影响子节点的世界位置
14. **addComponent 立即激活** — 如果节点已激活，新添加的组件会立即走完 __preload → onLoad → onEnable 流程
15. **onDestroy 仅在 IsOnLoadCalled 时调用** — 如果组件在 onLoad 之前就被销毁，onDestroy 不会被调用

---

## 8. 关键文件索引

| 模块 | 文件路径 |
|------|---------|
| Director | `cocos/game/director.ts` |
| NodeActivator | `cocos/scene-graph/node-activator.ts` |
| ComponentScheduler | `cocos/scene-graph/component-scheduler.ts` |
| Component | `cocos/scene-graph/component.ts` |
| Node | `cocos/scene-graph/node.ts` |
| Node Enum | `cocos/scene-graph/node-enum.ts` |
| CCClass | `cocos/core/data/class.ts` |
| Attribute | `cocos/core/data/utils/attribute.ts` |
| ClassStash | `cocos/core/data/class-stash.ts` |
| SceneGlobals | `cocos/scene-graph/scene-globals.ts` |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
