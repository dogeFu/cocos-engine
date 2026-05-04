# Cocos Creator 引擎 — 音频与缓动系统

> 面向 AI 辅助编程的中文参考文档。覆盖音频播放、AudioManager、Tween 缓动 API。

---

## 目录

1. [cocos/audio/ — 音频系统](#1-cocosaudio--音频系统)
2. [cocos/tween/ — 缓动系统](#2-cocostween--缓动系统)

---

## 1. cocos/audio/ — 音频系统

### 1.1 架构概览

音频系统提供 2D 和 3D 音频播放功能。

**核心类：**
- `AudioSource`（`cocos/audio/audio-source.ts`）— 音频源组件
- `AudioClip`（`cocos/audio/audio-clip.ts`）— 音频剪辑资源
- `AudioManager`（`pal/audio/`）— 平台相关的音频管理器

**平台抽象：**
- `pal/audio/web/` — Web 平台实现
- `pal/audio/native/` — 原生平台实现
- `pal/audio/minigame/` — 小游戏平台实现

### 1.2 AudioSource（`cocos/audio/audio-source.ts`）

音频源组件。控制音频播放。

#### 关键属性

- `clip`：`AudioClip` — 音频剪辑
- `loop`：`boolean` — 是否循环
- `playOnAwake`：`boolean` — 是否自动播放
- `volume`：`number` — 音量（0-1）
- `mute`：`boolean` — 是否静音
- `pitch`：`number` — 音调（0.5-2.0）
- `pan`：`number` — 声道平衡（-1 到 1）
- `time`：`number` — 当前播放时间（秒）
- `duration`（只读）：音频时长
- `playing`（只读）：是否正在播放
- `spatialBlend`：`number` — 空间混合（0=2D, 1=3D）
- `maxDistance`：`number` — 最大衰减距离
- `minDistance`：`number` — 最小衰减距离

#### 关键方法

- `play()`：播放
- `pause()`：暂停
- `stop()`：停止
- `resume()`：恢复
- `playOneShot(clip, volumeScale?)`：播放一次（不中断当前播放）
- `setVolume(v)`：设置音量
- `setPitch(v)`：设置音调

#### 隐含知识

- `playOneShot` 创建独立的音频实例，不影响当前播放状态
- 3D 音频需要 `spatialBlend > 0` 且节点在 3D 空间中
- Web 平台音频需要用户交互后才能播放（浏览器自动播放策略）
- `time` 属性设置可能不精确（受缓冲区影响）
- `stop()` 后 `time` 重置为 0，`pause()` 保持当前时间

### 1.3 AudioClip（`cocos/audio/audio-clip.ts`）

音频剪辑资源。继承 `Asset`。

#### 关键属性

- `_nativeAsset`：`AudioBuffer | string` — 原生音频数据
- `duration`：`number` — 时长（秒）
- `sampleRate`：`number` — 采样率
- `loadMode`：`AudioClip.LoadMode` — 加载模式

#### LoadMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `DOM_AUDIO` | DOM Audio 元素（Web 平台） |
| 1 | `WEB_AUDIO` | Web Audio API（Web 平台） |
| 2 | `NATIVE_AUDIO` | 原生音频（原生平台） |

#### 隐含知识

- `DOM_AUDIO` 模式使用 HTML5 `<audio>` 元素，兼容性最好
- `WEB_AUDIO` 模式使用 Web Audio API，支持更多音频处理
- 原生平台使用 `NATIVE_AUDIO`，通过 JSB 调用原生音频 API
- 音频资源在加载时解码，大文件可能延迟

### 1.4 AudioManager

音频管理器是平台相关的，负责音频上下文管理。

**Web 平台：**
- 使用 `AudioContext`（Web Audio API）
- 需要在用户交互后 `resume()` AudioContext
- 支持 `AudioBufferSourceNode` 和 `MediaElementAudioSourceNode`

**原生平台：**
- 使用 `audio.jsb` 提供的原生 API
- 支持更多音频格式
- 内存管理由原生层处理

---

## 2. cocos/tween/ — 缓动系统

### 2.1 Tween 概览

Tween 系统提供链式 API 创建补间动画。不依赖动画剪辑，适合简单的属性动画。

**关键文件：**
- `cocos/tween/tween.ts` — Tween 主类
- `cocos/tween/action/` — Action 体系（底层实现）

### 2.2 Tween API

#### 创建 Tween

```ts
tween(target)
    .to(duration, props, opts?)
    .by(duration, props, opts?)
    .delay(duration)
    .call(callback)
    .target(target)
    .start()
```

#### 关键方法

| 方法 | 说明 |
|---|---|
| `to(duration, props, opts?)` | 补间到目标值（绝对值） |
| `by(duration, props, opts?)` | 补间增量值（相对值） |
| `delay(duration)` | 延迟 |
| `call(callback)` | 回调 |
| `target(target)` | 切换目标 |
| `start()` | 开始执行 |
| `stop()` | 停止 |
| `clone()` | 克隆 |
| `union()` | 合并所有动作 |
| `repeat(times, nestedTween?)` | 重复 |
| `repeatForever(nestedTween?)` | 永远重复 |
| `sequence(nestedTween?)` | 顺序执行 |
| `parallel(nestedTween?)` | 并行执行 |

#### 选项参数（opts）

```ts
{
    easing?: string | ((t: number) => number); // 缓动函数
    progress?: (start, end, current, ratio) => void; // 自定义插值
    onComplete?: () => void; // 完成回调
}
```

### 2.3 缓动函数（Easing）

内置缓动函数（`cocos/tween/easing.ts`）：

| 类别 | 函数 |
|---|---|
| 线性 | `linear` |
| 二次 | `quadIn`, `quadOut`, `quadInOut` |
| 三次 | `cubicIn`, `cubicOut`, `cubicInOut` |
| 四次 | `quartIn`, `quartOut`, `quartInOut` |
| 五次 | `quintIn`, `quintOut`, `quintInOut` |
| 正弦 | `sineIn`, `sineOut`, `sineInOut` |
| 指数 | `expoIn`, `expoOut`, `expoInOut` |
| 圆形 | `circIn`, `circOut`, `circInOut` |
| 弹性 | `elasticIn`, `elasticOut`, `elasticInOut` |
| 回弹 | `backIn`, `backOut`, `backInOut` |
| 弹跳 | `bounceIn`, `bounceOut`, `bounceInOut` |
| 平滑 | `smooth` |
| 渐入 | `fade` |

### 2.4 Action 体系（`cocos/tween/action/`）

Tween 的底层实现基于 Action 体系。

**核心类：**
- `Action`（`action.ts`）— 动作基类
- `FiniteTimeAction`（`action.ts`）— 有限时间动作
- `ActionInterval`（`action-interval.ts`）— 时间间隔动作
- `ActionInstant`（`action-instant.ts`）— 瞬时动作
- `ActionEase`（`action-ease.ts`）— 缓动动作
- `RepeatForever`（`action.ts`）— 永远重复
- `Sequence`（`action.ts`）— 顺序动作
- `Spawn`（`action.ts`）— 并行动作
- `Repeat`（`action.ts`）— 重复动作

**Tween 到 Action 的映射：**

| Tween 方法 | Action 类型 |
|---|---|
| `to()` / `by()` | `TTweenAction` |
| `delay()` | `DelayTime` |
| `call()` | `CallFunc` |
| `sequence()` | `Sequence` |
| `parallel()` | `Spawn` |
| `repeat()` | `Repeat` |
| `repeatForever()` | `RepeatForever` |

### 2.5 Tween 执行流程

1. `tween(target).to(...).start()` 创建 `TweenAction` 并注册到 `TweenSystem`
2. `TweenSystem`（以优先级 100 注册为 director 系统）在每帧 `update(dt)` 中更新所有活跃的 Tween
3. 每帧调用 `TweenAction.step(dt)` 更新进度
4. 进度通过缓动函数计算当前值
5. 将当前值设置到目标对象的属性上

### 2.6 隐含知识与陷阱

1. **`to()` 是绝对值，`by()` 是相对值** — 最常见的混淆。`to(1, {x: 100})` 将 x 补间到 100，`by(1, {x: 100})` 将 x 增加 100。
2. **必须调用 `start()`** — 创建 Tween 后不调用 `start()` 不会执行。
3. **`stop()` 需要目标对象** — `tween(target).stop()` 停止该目标的所有 Tween。
4. **节点销毁不会自动停止 Tween** — 需要在 `onDestroy()` 中手动调用 `tween(this.node).stop()`。
5. **`repeat()` 的嵌套 Tween** — `repeat(3, tween(target).to(1, {x: 100}))` 会重复执行嵌套的 Tween 3 次。
6. **缓动函数名称区分大小写** — `bounceOut` 不是 `BounceOut`。
7. **自定义 progress 函数** — 可以通过 `opts.progress` 自定义插值逻辑，例如颜色插值。
8. **Tween 不支持 Yoyo 模式** — 需要手动使用 `sequence()` + 反向 Tween 实现。
9. **多个 Tween 可以同时作用于同一目标** — 但如果修改相同属性，结果不可预测。
10. **`union()` 合并所有动作** — 将多个动作合并为一个，减少内部开销。
