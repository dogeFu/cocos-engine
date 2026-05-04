# Cocos Creator 引擎 — 动画系统

> 面向 AI 辅助编程的中文参考文档。覆盖动画剪辑、状态机、骨骼动画、混合、遮罩。

---

## 目录

1. [架构概览](#1-架构概览)
2. [Animation 组件](#2-animation-组件)
3. [AnimationClip 动画剪辑](#3-animationclip-动画剪辑)
4. [AnimationState 动画状态](#4-animationstate-动画状态)
5. [动画轨道与曲线](#5-动画轨道与曲线)
6. [骨骼动画](#6-骨骼动画)
7. [动画混合与遮罩](#7-动画混合与遮罩)
8. [隐含知识与陷阱](#8-隐含知识与陷阱)

---

## 1. 架构概览

动画系统（`cocos/animation/`）提供完整的动画解决方案：

- **Animation 组件**：用户接口层，管理动画剪辑和状态
- **AnimationClip**：动画数据容器
- **AnimationState**：运行时动画状态
- **AnimationController**：动画状态机（Mecanim 风格）
- **骨骼动画**：`cocos/3d/skeletal-animation/` — 骨骼蒙皮动画

**关键文件索引：**

| 文件 | 说明 |
|---|---|
| `cocos/animation/animation-clip.ts` | 动画剪辑 |
| `cocos/animation/animation-state.ts` | 动画状态 |
| `cocos/animation/animation-component.ts` | Animation 组件 |
| `cocos/animation/animation-controller.ts` | 动画控制器 |
| `cocos/animation/track/` | 轨道系统 |
| `cocos/animation/curve/` | 曲线系统 |
| `cocos/3d/skeletal-animation/skeletal-animation.ts` | 骨骼动画组件 |
| `cocos/3d/skeletal-animation/skeleton.ts` | 骨骼资源 |
| `cocos/3d/skeletal-animation/joint.ts` | 关节 |

---

## 2. Animation 组件

### 2.1 Animation（`cocos/animation/animation-component.ts`）

动画组件。管理动画剪辑的播放。

#### 关键属性

- `clips`：`AnimationClip[]` — 关联的动画剪辑数组
- `defaultClip`：`AnimationClip` — 默认动画剪辑
- `playOnLoad`：`boolean` — 是否自动播放
- `currentClip`（只读）：当前播放的剪辑
- `wrapMode`：`WrapMode` — 默认循环模式

#### 关键方法

- `play(name?, startTime?)`：播放动画。本质是 `crossFade(name, 0)`。
- `playAdditive(name?, startTime?)`：叠加播放动画
- `stop()`：停止所有动画
- `pause()`：暂停所有动画
- `resume()`：恢复所有动画
- `crossFade(name, duration?)`：交叉淡入淡出
- `getState(name)`：获取动画状态
- `addClip(clip)`：添加动画剪辑
- `removeClip(clip)`：移除动画剪辑
- `getClips()`：获取所有剪辑
- `on(type, callback, target?)`：注册动画事件

#### WrapMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `DEFAULT` | 默认（使用剪辑设置） |
| 1 | `ONCE` | 播放一次 |
| 2 | `LOOP` | 循环 |
| 3 | `PING_PONG` | 往返 |
| 4 | `CLAMP` | 钳位 |

---

## 3. AnimationClip 动画剪辑

### 3.1 AnimationClip（`cocos/animation/animation-clip.ts`）

动画数据容器。包含轨道、事件和元数据。

#### 关键属性

- `duration`：`number` — 时长（秒）
- `sampleRate`：`number` — 采样率（帧/秒，默认 60）
- `speed`：`number` — 播放速度
- `wrapMode`：`WrapMode` — 循环模式
- `tracks`：`Track[]` — 动画轨道数组
- `events`：`AnimationEvent[]` — 动画事件数组
- `hash`：`number` — 哈希值
- `keys`：`number[]` — 关键帧时间数组

#### 关键方法

- `createTrack(path, component?)`：创建新轨道
- `addEvent(event)`：添加动画事件
- `removeEvent(event)`：移除动画事件
- `updateHash()`：更新哈希值

### 3.2 AnimationEvent

```ts
interface AnimationEvent {
    frame: number;      // 触发帧
    func: string;       // 回调函数名
    params: any[];      // 回调参数
}
```

动画事件在指定帧触发，调用节点上组件的指定方法。

---

## 4. AnimationState 动画状态

### 4.1 AnimationState（`cocos/animation/animation-state.ts`）

运行时动画状态。管理单个动画剪辑的播放。

#### 关键属性

- `clip`：`AnimationClip` — 关联的剪辑
- `name`：`string` — 状态名称
- `duration`：`number` — 时长（考虑速度）
- `speed`：`number` — 播放速度
- `weight`：`number` — 混合权重（0-1）
- `wrapMode`：`WrapMode` — 循环模式
- `time`：`number` — 当前时间
- `currentTime`：`number` — 当前时间（考虑速度）
- `isPlaying`（只读）：是否正在播放
- `isPaused`（只读）：是否暂停
- `isStill`（只读）：是否静止（未播放或已结束）
- `blendWeight`：`number` — 混合权重
- `blendStateBuffer`：`BlendStateBuffer` — 混合状态缓冲

#### 关键方法

- `play()`：播放
- `pause()`：暂停
- `resume()`：恢复
- `stop()`：停止
- `step()`：步进一帧
- `destroy()`：销毁状态

#### 隐含知识

- `AnimationState` 在首次 `play()` 时创建
- `weight` 用于混合多个动画状态
- `speed` 为负值时倒放
- `time` 可以手动设置以跳转到指定时间

---

## 5. 动画轨道与曲线

### 5.1 Track（`cocos/animation/track/`）

动画轨道。定义动画影响的属性路径和曲线。

#### 轨道类型

| 类型 | 类名 | 说明 |
|---|---|---|
| 数值轨道 | `RealTrack` | 浮点数属性 |
| 向量轨道 | `VectorTrack` | Vec2/Vec3/Vec4 属性 |
| 四元数轨道 | `QuatTrack` | 旋转属性 |
| 颜色轨道 | `ColorTrack` | 颜色属性 |
| 尺寸轨道 | `SizeTrack` | 尺寸属性 |
| 对象轨道 | `ObjectTrack` | 对象引用属性 |

#### 轨道路径

轨道通过路径定位目标属性：

```
"position"          — 节点的 position 属性
"rotation"          — 节点的 rotation 属性
"/spine/head/position" — 子节点路径
"Sprite.color"      — 组件属性
```

### 5.2 曲线（`cocos/animation/curve/`）

动画曲线。存储关键帧和插值方式。

#### 关键帧

```ts
interface Keyframe {
    time: number;       // 时间
    value: number;      // 值
    inTangent?: number; // 入切线
    outTangent?: number; // 出切线
}
```

#### 插值方式

- **线性插值**：关键帧之间线性过渡
- **三次插值**：使用 Hermite 基函数，支持切线控制
- **常量插值**：关键帧之间保持常量（阶跃）
- **三次样条**：自动计算切线的平滑曲线

---

## 6. 骨骼动画

### 6.1 SkeletalAnimation（`cocos/3d/skeletal-animation/skeletal-animation.ts`）

骨骼动画组件。继承 `Animation`。

#### 关键属性

- `skeleton`：`Skeleton` — 骨骼资源
- `clips`：`AnimationClip[]` — 骨骼动画剪辑
- `sockets`：`Socket[]` — 挂点数组
- `blendShapeWeights`：`number[]` — 混合变形权重

#### Socket（挂点）

```ts
interface Socket {
    path: string;       // 骨骼路径
    target: Node;       // 挂载的目标节点
}
```

挂点允许将节点附加到骨骼上，跟随骨骼运动。

### 6.2 Skeleton（`cocos/3d/skeletal-animation/skeleton.ts`）

骨骼资源。包含骨骼层级和绑定姿态。

#### 关键属性

- `joints`：`Joint[]` — 关节数组
- `bindposes`：`Mat4[]` — 绑定姿态矩阵
- `hash`：`number` — 哈希值

### 6.3 Joint

关节数据。

- `name`：`string` — 关节名称
- `parent`：`number` — 父关节索引（-1 为根）
- `inverseBindPose`：`Mat4` — 逆绑定姿态矩阵

### 6.4 骨骼矩阵计算

每帧的骨骼矩阵更新流程：

1. 从骨骼层级计算每个关节的世界矩阵
2. 乘以逆绑定姿态矩阵：`jointMatrix = worldMatrix * inverseBindPose`
3. 将所有关节矩阵上传到 GPU uniform buffer

**限制：** 最多支持 56 个骨骼关节（受 uniform buffer 大小限制）。

### 6.5 混合变形（Blend Shape / Morph Target）

骨骼动画支持混合变形，用于面部表情等。

- `blendShapeWeights`：每个混合变形的权重（0-1）
- 混合变形数据存储在 Mesh 的顶点偏移中
- GPU 蒙皮时应用混合变形

---

## 7. 动画混合与遮罩

### 7.1 CrossFade（交叉淡入淡出）

`crossFade(name, duration)` 在指定时间内从当前动画平滑过渡到新动画。

**工作原理：**
1. 创建新的 `AnimationState`
2. 在 `duration` 时间内，新动画权重从 0 渐变到 1
3. 旧动画权重从 1 渐变到 0
4. 过渡期间两个动画同时播放并混合

**关键：** `play(name)` 本质是 `crossFade(name, 0)`，即无过渡的立即切换。它会先 `clear()` 停止所有其他状态。

### 7.2 BlendState（混合状态）

`BlendStateBuffer`（`cocos/animation/blend-state.ts`）管理多个动画状态的混合。

- 每个属性维护一个混合值
- 多个动画状态按权重叠加
- 支持加法混合（`playAdditive`）

### 7.3 AnimationMask（动画遮罩）

动画遮罩允许只播放动画的特定部分。

```ts
const mask = new AnimationMask();
mask.addJointPath("spine/head", true);  // 只影响头部
state.setMask(mask);
```

**用途：**
- 上半身/下半身分离动画
- 只播放手臂动画，不影响腿部
- 叠加动画时限制影响范围

---

## 8. 隐含知识与陷阱

1. **`play()` 会停止所有其他状态** — `play()` 本质是 `crossFade(name, 0)`，会先 `clear()` 停止所有其他状态。如果需要同时播放多个动画，使用 `playAdditive()`。
2. **CrossFade 期间旧状态仍在更新** — 过渡期间旧动画继续推进时间，不会冻结。
3. **骨骼数量限制** — 最多 56 个骨骼关节。超过此限制的骨骼不会被正确蒙皮。
4. **挂点更新在动画之后** — Socket 的变换在动画更新之后计算，可能有延迟。
5. **AnimationClip 的 sampleRate** — 影响关键帧的精度。默认 60fps。
6. **动画事件在帧边界触发** — 事件只在帧更新时检查，不会在两帧之间触发。
7. **wrapMode.PING_PONG** — 往返模式下，偶数次循环是倒放。
8. **speed = 0 不会暂停** — 设置 `speed = 0` 会使动画静止，但状态仍然是"播放中"。使用 `pause()` 才是真正的暂停。
9. **权重混合的归一化** — 多个动画状态的权重之和不要求为 1，引擎会自动归一化。
10. **轨道路径区分大小写** — 路径中的属性名必须与实际属性名完全匹配。
11. **骨骼动画的 GPU 蒙皮** — 骨骼矩阵通过 uniform buffer 传递给着色器，在 GPU 上执行蒙皮计算。
12. **混合变形需要 Mesh 支持** — Mesh 必须包含混合变形数据（顶点偏移量），否则 `blendShapeWeights` 无效。
