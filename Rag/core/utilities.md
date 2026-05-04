# Cocos Creator 引擎 — 核心工具模块

> 面向 AI 辅助编程的中文参考文档。覆盖内存池、曲线系统、几何模块、值类型、调度器、System 基类、Settings、错误系统、事件系统。

---

## 目录

1. [内存池系统 (memop)](#1-内存池系统-memop)
2. [曲线系统 (curves)](#2-曲线系统-curves)
3. [几何模块 (geometry)](#3-几何模块-geometry)
4. [值类型 (math)](#4-值类型-math)
5. [调度器系统 (scheduler)](#5-调度器系统-scheduler)
6. [System 基类](#6-system-基类)
7. [Settings — 项目设置](#7-settings--项目设置)
8. [错误/调试系统 (debug)](#8-错误调试系统-debug)
9. [事件系统 (event)](#9-事件系统-event)
10. [隐含知识与常见陷阱](#10-隐含知识与常见陷阱)
11. [关键文件索引](#11-关键文件索引)

---

## 1. 内存池系统 (memop)

**目录：** `cocos/core/memop/`

### 1.1 ScalableContainer (基类)

**文件：** `cocos/core/memop/scalable-container.ts`

- 抽象基类，所有可缩放容器的父类
- 构造时自动注册到全局 `scalableContainerManager`
- 抽象方法 `tryShrink()` 供子类实现缩容逻辑
- `destroy()` 时从管理器中移除
- `ScalableContainerManager`：每帧调用 `update(dt)`，默认每 5 秒对管理的所有容器执行一次 `tryShrink()`
- 全局单例 `scalableContainerManager`，由引擎主循环驱动

### 1.2 Pool\<T\>

**文件：** `cocos/core/memop/pool.ts`

传统对象池，支持取用和回收。

**构造函数：** `Pool(ctor, elementsPerBatch, dtor?, shrinkThreshold?)`

| 参数 | 说明 |
|------|------|
| `ctor` | 元素工厂函数 |
| `elementsPerBatch` | 初始大小和扩容增量 |
| `dtor` | 可选析构器 |
| `shrinkThreshold` | 缩容阈值（默认等于 elementsPerBatch） |

**核心方法：**

| 方法 | 说明 |
|------|------|
| `alloc(): T` | 从池中取出对象；池空时自动扩容一个 batch |
| `free(obj: T)` | 放回单个对象 |
| `freeArray(objs: T[])` | 批量放回 |
| `tryShrink()` | 缩容：当空闲对象超过阈值时，释放一半或差额的一半 |
| `destroy()` | 销毁池，调用析构器清理所有对象 |

**内部机制：** 使用 `_freePool` 数组 + `_nextAvail` 索引实现栈式分配，O(1) 的 alloc/free。

### 1.3 RecyclePool\<T\>

**文件：** `cocos/core/memop/recycle-pool.ts`

循环对象池，设计为每次使用都完整复用。

| 方法 | 说明 |
|------|------|
| `add(): T` | 添加元素，容量不足时自动 2 倍扩容 |
| `reset()` | 仅将 count 置 0，不清除数据 |
| `resize(size)` | 手动调整大小 |
| `removeAt(idx)` | 与末尾元素交换后删除（不保证顺序） |
| `tryShrink()` | 当 `data.length >> 2 > count` 时缩容 |

**设计理念：** 没有单独的 get/put，通过 `data` 属性直接访问底层数组，适合每帧完整重写的场景（如渲染批次数据）。

### 1.4 CachedArray\<T\>

**文件：** `cocos/core/memop/cached-array.ts`

适用于常驻数据的缓存数组。

| 方法 | 说明 |
|------|------|
| `push(item)` / `pop()` / `get(idx)` | 基本操作 |
| `clear()` | length 置 0，内部数组不变 |
| `sort()` | 使用构造时传入的比较函数排序 |
| `concat(array)` | 追加另一个数组 |
| `fastRemove(idx)` | 与末尾交换后删除 |

---

## 2. 曲线系统 (curves)

**目录：** `cocos/core/curves/`

### 2.1 KeyframeCurve\<TKeyframeValue\>

**文件：** `cocos/core/curves/keyframe-curve.ts`

通用关键帧曲线基类。

- `_times: number[]`（排序的时间数组）、`_values: TKeyframeValue[]`（对应值数组）
- `addKeyFrame(time, value)` — 使用二分搜索插入，保持时间有序
- `searchKeyframe(time)` — 二分搜索（使用 `binarySearchEpsilon`）
- `assignSorted(times, values)` — 批量赋值（要求已排序）

### 2.2 RealCurve (实数曲线)

**文件：** `cocos/core/curves/curve.ts`

继承 `KeyframeCurve<RealKeyframeValue>`，核心动画曲线。

**RealKeyframeValue 关键帧值：**

| 字段 | 说明 |
|------|------|
| `value` | 帧值 |
| `interpolationMode` | 插值模式（LINEAR / CONSTANT / CUBIC） |
| `tangentWeightMode` | 切线权重模式（NONE / LEFT / RIGHT / BOTH） |
| `rightTangent` / `rightTangentWeight` | 右切线及权重 |
| `leftTangent` / `leftTangentWeight` | 左切线及权重 |
| `easingMethod` | 缓动方法 |

**ExtrapolationMode 外推模式：**

| 模式 | 说明 |
|------|------|
| `LINEAR` | 按前两帧/后两帧的线性趋势 |
| `CLAMP` | 使用首帧/末帧值 |
| `LOOP` | 无限循环 |
| `PING_PONG` | 乒乓循环 |

**evaluate(time) 核心求值：**
1. 空曲线返回 0
2. 时间下溢/上溢 → 按外推模式处理
3. 精确匹配关键帧 → 直接返回值
4. 两帧之间 → `evalBetweenTwoKeyFrames`：CONSTANT 返回前一帧值；LINEAR 使用 lerp + easing；CUBIC 使用三次贝塞尔插值

### 2.3 QuatCurve (四元数曲线)

**文件：** `cocos/core/curves/quat-curve.ts`

- `QuatInterpolationMode`: `SLERP`（球面线性插值）/ `CONSTANT`
- `evaluate(time, quat?)`: 支持 SLERP 插值，使用 `Quat.slerp`

### 2.4 ObjectCurve\<T\>

**文件：** `cocos/core/curves/object-curve.ts`

通用对象曲线，不做插值，直接返回前一帧的值。

### 2.5 Gradient (颜色渐变)

**文件：** `cocos/core/curves/gradient.ts`

- `ColorKey`: `color: Color` + `time: number`
- `AlphaKey`: `alpha: number` + `time: number`
- `GradientMode`: `Blend`（插值）/ `Fixed`（最近帧）
- `evaluateFast(out, time)` — 同时插值 RGB 和 Alpha
- RGB 和 Alpha 独立插值，时间归一化到 [0, 1]

### 2.6 AnimationCurve (旧版动画曲线)

**文件：** `cocos/core/geometry/curve.ts`

- 包装 `RealCurve`，提供旧版 API 兼容
- **OptimizedKey**: 缓存优化，存储多项式系数 `Float32Array(4)`，求值时直接计算 `t^3*a + t^2*b + t*c + d`
- **WrapModeMask**: 旧版循环模式枚举

### 2.7 辅助模块

| 文件 | 说明 |
|------|------|
| `easing-method.ts` | EasingMethod 枚举（LINEAR, QUAD_IN/OUT, CUBIC, SINE, EXPO, CIRC, ELASTIC, BACK, BOUNCE, SMOOTH, FADE 等） |
| `bezier.ts` | 贝塞尔曲线计算，`bezierByTime` 使用 Cardano 算法求解三次方程 |
| `solve-cubic.ts` | 使用 Cardano 公式解三次方程 |
| `real-curve-param.ts` | 枚举定义 `RealInterpolationMode`, `ExtrapolationMode`, `TangentWeightMode` |
| `keys-shared-curves.ts` | `KeySharedRealCurves` 和 `KeySharedQuatCurves` — 优化多曲线共享同一时间轴的场景 |

---

## 3. 几何模块 (geometry)

**目录：** `cocos/core/geometry/`

### 3.1 ShapeType 枚举

```typescript
enum ShapeType {
    SHAPE_RAY = 1 << 0, SHAPE_LINE = 1 << 1, SHAPE_SPHERE = 1 << 2,
    SHAPE_AABB = 1 << 3, SHAPE_OBB = 1 << 4, SHAPE_PLANE = 1 << 5,
    SHAPE_TRIANGLE = 1 << 6, SHAPE_FRUSTUM = 1 << 7,
    SHAPE_FRUSTUM_ACCURATE = 1 << 8, SHAPE_CAPSULE = 1 << 9,
    SHAPE_SPLINE = 1 << 10,
}
```

使用位标志，支持组合检测。

### 3.2 核心几何体

| 类 | 文件 | 属性 | 说明 |
|----|------|------|------|
| Ray | `ray.ts` | `o: Vec3`, `d: Vec3` | 射线：起点 + 方向 |
| Plane | `plane.ts` | `n: Vec3`, `d: number` | 平面：法线 + 距离 |
| AABB | `aabb.ts` | `center: Vec3`, `halfExtents: Vec3` | 轴对齐包围盒 |
| Sphere | `sphere.ts` | `center: Vec3`, `radius: number` | 球体 |
| OBB | `obb.ts` | `center: Vec3`, `halfExtents: Vec3`, `orientation: Mat3` | 方向包围盒 |
| Frustum | `frustum.ts` | `planes: Plane[]`, `vertices: Vec3[]` | 视锥体（6面+8顶点） |
| Capsule | `capsule.ts` | `radius`, `halfHeight`, `axis`, `center`, `rotation` | 胶囊体 |
| Line | `line.ts` | `s: Vec3`, `e: Vec3` | 线段 |
| Triangle | `triangle.ts` | `a/b/c: Vec3` | 三角形 |
| Spline | `spline.ts` | `mode: SplineMode`, `knots: Vec3[]` | 样条曲线 |

### 3.3 Frustum 视锥体

- `createPerspective` — 透视投影视锥体
- `createOrthographic` — 正交投影视锥体
- `update(m, inv)` — 从 View-Projection 矩阵提取 6 个裁剪面（RTR4 方法），并归一化

### 3.4 Spline 样条曲线

**SplineMode：** `LINEAR`（折线）、`BEZIER`（分段贝塞尔）、`CATMULL_ROM`（Catmull-Rom 样条）

- `getPoint(t, index?)` — 在 t ∈ [0,1] 处求值
- `getPoints(num, index?)` — 均匀采样多个点

### 3.5 intersect 模块

**文件：** `cocos/core/geometry/intersect.ts`

提供射线与各种几何体的相交检测：

| 函数 | 说明 |
|------|------|
| `rayPlane(ray, plane)` | 射线与平面 |
| `rayTriangle(ray, triangle)` | 射线与三角形（Moller-Trumbore 算法） |
| `raySphere(ray, sphere)` | 射线与球体 |
| `rayAABB(ray, aabb)` | 射线与 AABB |
| `rayOBB(ray, obb)` | 射线与 OBB |
| `rayCapsule(ray, capsule)` | 射线与胶囊体 |

---

## 4. 值类型 (math)

**目录：** `cocos/core/math/`

### 4.1 MathBase

**文件：** `cocos/core/math/math-base.ts`

继承 `ValueType`，内部使用 `Float64Array`（Web）或 `Float32Array`（JSB）存储数据，提供 `array` 属性访问。

### 4.2 向量类型

所有向量采用 out-parameter 模式（静态方法接受 `out` 参数避免 GC）：

| 类 | 文件 | 常量 | 核心静态方法 |
|----|------|------|-------------|
| Vec2 | `vec2.ts` | ZERO/ONE/UNIT_X/UNIT_Y | add/sub/mul/div/dot/cross/normalize/lerp/rotate/angle |
| Vec3 | `vec3.ts` | ZERO/ONE/UNIT_X/UNIT_Y/UNIT_Z | add/sub/dot/cross/normalize/lerp/transformMat4/transformQuat/slerp |
| Vec4 | `vec4.ts` | ZERO/ONE/UNIT_X/UNIT_Y/UNIT_Z/UNIT_W | add/sub/mul/div/dot/normalize/lerp |

### 4.3 矩阵类型

| 类 | 文件 | 存储 | 核心静态方法 |
|----|------|------|-------------|
| Mat3 | `mat3.ts` | 9 元素列主序 | invert/transpose/multiply/fromQuat/translate/rotate/scale |
| Mat4 | `mat4.ts` | 16 元素列主序 | invert/transpose/multiply/translate/rotate/scale/perspective/orthographic/lookAt |

### 4.4 Quat (四元数)

**文件：** `cocos/core/math/quat.ts`

- 常量: `IDENTITY`, `ZERO`
- 核心静态方法: `slerp/lerp/rotateX/rotateY/rotateZ/fromAxisAngle/toAxisAngle/fromEuler/toEuler/multiply/invert/conjugate/rotateTowards`

### 4.5 Color (颜色)

**文件：** `cocos/core/math/color.ts`

- RGBA 各通道为 [0, 255] 整数
- 常量: `WHITE/GRAY/BLACK/TRANSPARENT/RED/GREEN/BLUE/CYAN/MAGENTA/YELLOW`
- 核心方法: `lerp/clone/copy/fromHEX/toHEX/toRGBValue/toCSS`

### 4.6 Size / Rect

| 类 | 文件 | 属性 | 核心方法 |
|----|------|------|---------|
| Size | `size.ts` | width + height | lerp/equals |
| Rect | `rect.ts` | x + y + width + height | fromMinMax/lerp/contains/intersection/union/transform |

### 4.7 工具函数

**文件：** `cocos/core/math/utils.ts`

| 函数 | 说明 |
|------|------|
| `equals(a, b)` | 近似相等（EPSILON 容差） |
| `approx(a, b, maxDiff?)` | 指定容差的近似比较 |
| `clamp/clamp01` | 值截断 |
| `lerp` | 线性插值 |
| `toRadian/toDegree` | 角度弧度转换 |
| `random/randomRange/randomRangeInt` | 随机数 |
| `pseudoRandom/pseudoRandomRange` | 伪随机（Hull-Dobell 算法） |
| `nextPow2` | 下一个 2 的幂 |
| `repeat/pingPong` | 循环时间计算 |
| `inverseLerp` | 反线性插值 |
| `floatToHalf/halfToFloat` | 半精度浮点转换 |

---

## 5. 调度器系统 (scheduler)

**文件：** `cocos/core/scheduler.ts`

### Scheduler 类

继承 `System`，是引擎的定时调度核心。

**内部数据结构：**

| 属性 | 说明 |
|------|------|
| `_updatesNegList/_updates0List/_updatesPosList` | 三个优先级列表（<0 / =0 / >0） |
| `_hashForUpdates` | 按 target id 索引的 HashUpdateEntry |
| `_hashForTimers` | 按 target id 索引的 HashTimerEntry |
| `_arrayForTimers` | 定时器数组（加速遍历） |

**核心方法：**

| 方法 | 说明 |
|------|------|
| `schedule(callback, target, interval, repeat?, delay?, paused?)` | 注册自定义定时器 |
| `scheduleUpdate(target, priority, paused)` | 注册 update 回调 |
| `unschedule/unscheduleUpdate/unscheduleAllForTarget` | 取消定时器 |
| `update(dt)` | 主循环调用，先执行优先级列表，再遍历自定义定时器 |
| `setTimeScale/getTimeScale` | 时间缩放 |
| `pauseTarget/resumeTarget/isTargetPaused` | 暂停/恢复 |

**ListEntry**：优先级列表节点，包含 `target/priority/paused/markedForDeletion`，使用对象池（MAX_POOL_SIZE=20）。

**CallbackTimer**：轻量定时器，支持间隔、延迟、重复次数、永久运行。

---

## 6. System 基类

**文件：** `cocos/core/system.ts`

```typescript
export class System implements ISchedulable {
    static Priority = { LOW: 0, MEDIUM: 100, HIGH: 200, SCHEDULER: (1 << 31) >>> 0 };
    protected _id = '';
    protected _priority = 0;
    protected _executeInEditMode = false;

    init(): void {}
    update(dt: number): void {}
    postUpdate(dt: number): void {}
    destroy(): void {}

    static sortByPriority(a, b): number { ... }
}
```

由 Director 管理的功能系统基类。`update` 在所有组件 update/lateUpdate 之间调用，`postUpdate` 在 lateUpdate 之后、渲染之前调用。

---

## 7. Settings — 项目设置

**文件：** `cocos/core/platform/settings.ts`

### Settings 类

**SettingsCategory 枚举：** `PATH/ENGINE/ASSETS/SCRIPTING/PHYSICS/RENDERING/LAUNCH/SCREEN/SPLASH_SCREEN/ANIMATION/PROFILING/PLUGINS/XR`

**核心方法：**

| 方法 | 说明 |
|------|------|
| `init(path, overrides)` | 初始化，从 settings.json 加载配置（支持 XHR/fssync/动态 import） |
| `overrideSettings(category, name, value)` | 覆盖配置 |
| `querySettings(category, name)` | 查询配置（优先返回 override，再查 settings） |

**内部：** `_settings` 存储原始配置，`_override` 存储覆盖值。

**全局单例：** `settings = new Settings()`，挂载到 `legacyCC.settings`。

---

## 8. 错误/调试系统 (debug)

**文件：** `cocos/core/platform/debug.ts`

### DebugMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | NONE | 无调试 |
| 1 | VERBOSE | 详细日志 |
| 2 | INFO | 信息 |
| 3 | WARN | 警告 |
| 4 | ERROR | 错误 |
| 5 | INFO_FOR_WEB_PAGE | 网页信息 |
| 6 | WARN_FOR_WEB_PAGE | 网页警告 |
| 7 | ERROR_FOR_WEB_PAGE | 网页错误 |

### 核心函数

| 函数 | 说明 |
|------|------|
| `log/warn/error/debug/assert` | 基础日志输出 |
| `logID/warnID/errorID/debugID/assertID` | 通过错误 ID 输出，从 `DebugInfos` 模块查找错误描述 |
| `_resetDebugSetting(mode)` | 重置调试模式 |
| `_throw(error_)` | 编辑器模式下调用 error()，运行时模式下抛出异常 |
| `getError(errorId, ...param)` | 获取格式化的错误消息 |

**关键：** 不要使用 `console.log`，使用 `debug.log` 或 `logID`/`warnID`/`errorID`。

### 错误 ID 机制

使用 `getTypedFormatter` 工厂函数创建格式化器，DEBUG 模式下从 `debugInfos[id]` 获取完整描述，非 DEBUG 模式下仅输出 ID 和 GitHub 链接。

---

## 9. 事件系统 (event)

**目录：** `cocos/core/event/`

### 9.1 CallbacksInvoker

**文件：** `cocos/core/event/callbacks-invoker.ts`

核心事件调度器。

- `CallbackInfo`：存储单个回调的 `callback/target/once`，使用对象池 `callbackInfoPool`
- `CallbackList`：管理同一事件类型的回调列表，支持 `removeByCallback/removeByTarget/cancel/cancelAll/purgeCanceled`
- `CallbacksInvoker`：
  - `_callbackTable: ICallbackTable` — 事件名到 CallbackList 的映射
  - `on(key, callback, target?, once?)` — 注册事件，去重
  - `off(key, callback?, target?)` — 取消注册
  - `emit(key, arg0-arg4)` — 派发事件，最多 5 个参数；遍历时先处理 once 回调，检查 target 有效性（CCObject 的 isValid），支持嵌套 emit

### 9.2 Eventify 函数

**文件：** `cocos/core/event/eventify.ts`

Mixin 模式，为任意基类添加事件能力：

```typescript
export function Eventify<TBase>(base: Constructor<TBase>): Constructor<TBase & IEventified>
```

- 创建 `Eventified` 类继承 base
- 将 `CallbacksInvoker.prototype` 的所有属性 mixin 到 `Eventified.prototype`
- `Eventified` 自身实现 `once`（调用 `on` + once 标志）和 `targetOff`（调用 `removeAll`）

### 9.3 EventTarget

```typescript
export const EventTarget = Eventify(Empty);
```

### 9.4 AsyncDelegate

**文件：** `cocos/core/event/async-delegate.ts`

异步回调代理：`add(callback)` / `remove(callback)` / `dispatch(...args)` — 使用 `Promise.all` 并行触发所有异步回调。

---

## 10. 隐含知识与常见陷阱

1. **Pool 的 freeArray 不保证顺序** — 回收后内部数组顺序可能变化
2. **RecyclePool.removeAt 与末尾交换** — 不保证元素顺序，如需有序需自行处理
3. **RealCurve CUBIC 插值使用三次贝塞尔** — 需要正确设置左右切线和切线权重
4. **RealCurve 使用 `_flags` 位标志压缩存储** — interpolationMode、tangentWeightMode、easingMethod 压缩在一个字段中
5. **AnimationCurve 的 OptimizedKey 缓存** — 首次求值时计算多项式系数，后续直接使用，但修改关键帧后需手动清除缓存
6. **Frustum.update 从 VP 矩阵提取裁剪面** — 使用 RTR4 方法，需要同时传入 VP 矩阵和其逆矩阵
7. **数学类型使用 out-parameter 模式** — 所有静态方法接受 `out` 参数避免 GC，不要忽略返回值
8. **Color 通道范围 [0, 255]** — 不是 [0, 1]，与 Vec4 不同
9. **Scheduler 的 ListEntry 使用对象池** — MAX_POOL_SIZE=20，超出后不回收
10. **CallbacksInvoker.emit 最多 5 个参数** — 超过需要使用对象包装
11. **Eventify 的 mixin 模式** — 不会覆盖基类已有的同名方法
12. **ScalableContainerManager 每 5 秒缩容** — 可通过修改 `_interval` 调整频率
13. **Settings 的 override 优先级高于 settings.json** — 运行时覆盖会持久存在直到手动清除
14. **debug.log 在发布版本中可能被移除** — 取决于构建配置的 DebugMode

---

## 11. 关键文件索引

| 模块 | 文件路径 |
|------|---------|
| ScalableContainer | `cocos/core/memop/scalable-container.ts` |
| Pool | `cocos/core/memop/pool.ts` |
| RecyclePool | `cocos/core/memop/recycle-pool.ts` |
| CachedArray | `cocos/core/memop/cached-array.ts` |
| RealCurve | `cocos/core/curves/curve.ts` |
| QuatCurve | `cocos/core/curves/quat-curve.ts` |
| ObjectCurve | `cocos/core/curves/object-curve.ts` |
| Gradient | `cocos/core/curves/gradient.ts` |
| AnimationCurve | `cocos/core/geometry/curve.ts` |
| Ray | `cocos/core/geometry/ray.ts` |
| Plane | `cocos/core/geometry/plane.ts` |
| AABB | `cocos/core/geometry/aabb.ts` |
| Sphere | `cocos/core/geometry/sphere.ts` |
| OBB | `cocos/core/geometry/obb.ts` |
| Frustum | `cocos/core/geometry/frustum.ts` |
| Capsule | `cocos/core/geometry/capsule.ts` |
| Spline | `cocos/core/geometry/spline.ts` |
| Intersect | `cocos/core/geometry/intersect.ts` |
| Vec2/3/4 | `cocos/core/math/vec2.ts` / `vec3.ts` / `vec4.ts` |
| Mat3/4 | `cocos/core/math/mat3.ts` / `mat4.ts` |
| Quat | `cocos/core/math/quat.ts` |
| Color | `cocos/core/math/color.ts` |
| Size/Rect | `cocos/core/math/size.ts` / `rect.ts` |
| Utils | `cocos/core/math/utils.ts` |
| Scheduler | `cocos/core/scheduler.ts` |
| System | `cocos/core/system.ts` |
| Settings | `cocos/core/platform/settings.ts` |
| Debug | `cocos/core/platform/debug.ts` |
| CallbacksInvoker | `cocos/core/event/callbacks-invoker.ts` |
| Eventify | `cocos/core/event/eventify.ts` |
| EventTarget | `cocos/core/event/event-target.ts` |
| AsyncDelegate | `cocos/core/event/async-delegate.ts` |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
