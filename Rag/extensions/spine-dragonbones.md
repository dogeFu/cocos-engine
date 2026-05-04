# Cocos Creator 引擎 — Spine 与 DragonBones 骨骼动画

> 面向 AI 辅助编程的中文参考文档。覆盖 Spine 和 DragonBones 运行时集成、缓存模式、骨骼挂点、WASM 加速。

---

## 目录

1. [Spine 运行时](#1-spine-运行时)
2. [DragonBones 运行时](#2-dragonbones-运行时)
3. [隐含知识与陷阱](#3-隐含知识与陷阱)

---

## 1. Spine 运行时

### 1.1 架构概览

Spine 运行时（`cocos/spine/`）集成 Spine 骨骼动画系统。

**核心类：**
- `SpineSkeleton`（`cocos/spine/skeleton.ts`）— Spine 骨骼组件
- `SpineSkeletonData`（`cocos/spine/skeleton-data.ts`）— Spine 骨骼数据资源
- `SpineAnimation` — 动画状态

**Spine 运行时版本：** 集成 Spine Runtime 4.x

### 1.2 SpineSkeleton 组件

#### 关键属性

- `skeletonData`：`SpineSkeletonData` — 骨骼数据
- `defaultSkin`：`string` — 默认皮肤
- `defaultAnimation`：`string` — 默认动画
- `loop`：`boolean` — 是否循环
- `premultipliedAlpha`：`boolean` — 预乘 Alpha
- `timeScale`：`number` — 时间缩放
- `premultipliedAlpha`：`boolean` — 预乘 Alpha
- `useTint`：`boolean` — 是否使用染色
- `enableBatch`：`boolean` — 是否启用合批

#### 关键方法

- `setAnimation(trackIndex, name, loop)`：设置动画
- `addAnimation(trackIndex, name, loop, delay?)`：添加动画
- `setEmptyAnimation(trackIndex, mixDuration?)`：清空动画轨道
- `setMix(fromName, toName, duration)`：设置混合时间
- `setSkin(skinName)`：设置皮肤
- `setAttachment(slotName, attachmentName)`：设置附件
- `findBone(name)`：查找骨骼
- `findSlot(name)`：查找插槽
- `getState()`：获取动画状态
- `getSkeleton()`：获取骨骼对象

### 1.3 缓存模式

Spine 支持三种缓存模式，通过 `cacheMode` 属性设置：

| 模式 | 说明 |
|---|---|
| `REALTIME` | 实时模式，每帧计算骨骼 |
| `SHARED_CACHE` | 共享缓存，相同动画共享缓存 |
| `PRIVATE_CACHE` | 私有缓存，每个实例独立缓存 |

**缓存模式选择：**
- `REALTIME`：适合需要动态修改骨骼的场合
- `SHARED_CACHE`：适合大量相同动画的场合（如人群）
- `PRIVATE_CACHE`：适合需要独立缓存的场合

### 1.4 骨骼挂点

Spine 支持将 Cocos 节点挂载到骨骼上。

```ts
const socket = new sp.SpineSocket("boneName", targetNode);
spine.sockets.push(socket);
```

**工作原理：**
1. 每帧读取骨骼的世界变换
2. 将变换应用到挂载的节点上
3. 节点跟随骨骼运动

### 1.5 合批

`enableBatch = true` 时，Spine 使用动态图集合批渲染。

**合批条件：**
- 相同材质
- 相同纹理（或同一动态图集）
- 相同混合模式

**限制：**
- 合批模式下不支持 `useTint`
- 合批模式下不支持预乘 Alpha
- 附件纹理必须参与动态图集

---

## 2. DragonBones 运行时

### 2.1 架构概览

DragonBones 运行时（`cocos/dragon-bones/`）集成 DragonBones 骨骼动画系统。

**核心类：**
- `DragonBones`（`cocos/dragon-bones/`）— DragonBones 组件
- `DragonBonesAsset` — 骨骼数据资源
- `DragonBonesAtlasAsset` — 图集资源

### 2.2 ArmatureDisplay 组件

#### 关键属性

- `dragonAsset`：`DragonBonesAsset` — 骨骼数据
- `dragonAtlasAsset`：`DragonBonesAtlasAsset` — 图集数据
- `armatureName`：`string` — 骨架名称
- `animationName`：`string` — 动画名称
- `timeScale`：`number` — 时间缩放
- `playTimes`：`number` — 播放次数

#### 关键方法

- `playAnimation(name, playTimes?)`：播放动画
- `stopAnimation()`：停止动画
- `fadeAnimation(name, duration, playTimes?)`：淡入动画
- `getArmature()`：获取骨架对象
- `getAnimation()`：获取动画状态
- `setSkin(skinName)`：设置皮肤
- `setSlot(slotName)`：设置插槽

### 2.3 事件系统

DragonBones 事件通过 Cocos 事件系统分发：

| 事件 | 说明 |
|---|---|
| `COMPLETE` | 动画完成 |
| `LOOP_COMPLETE` | 循环完成 |
| `START` | 动画开始 |
| `FRAME_EVENT` | 帧事件 |
| `SOUND_EVENT` | 声音事件 |

### 2.4 骨骼挂点

DragonBones 也支持骨骼挂点：

```ts
const socket = new dragonBones.DragonBonesSocket("boneName", targetNode);
armature.sockets.push(socket);
```

---

## 3. 隐含知识与陷阱

1. **Spine 皮肤必须在动画之前设置** — 先设动画后设皮肤会导致渲染异常。正确顺序：`setSkin()` → `setAnimation()`。
2. **Spine WASM 加速** — Spine 运行时支持 WASM 加速。如果浏览器支持 WASM，自动使用 WASM 版本。
3. **DragonBones 不支持 WASM** — DragonBones 运行时仅使用 JS 实现。
4. **缓存模式的内存开销** — `SHARED_CACHE` 和 `PRIVATE_CACHE` 会缓存动画帧数据，增加内存使用。
5. **Spine 合批的限制** — 合批模式下不支持染色和预乘 Alpha。
6. **骨骼挂点的延迟** — 挂点更新在骨骼动画更新之后，可能有延迟。
7. **Spine 和 DragonBones 不能同时使用** — 在同一个节点上不能同时挂载 Spine 和 DragonBones 组件。
8. **Spine 附件替换** — `setAttachment()` 可以运行时替换插槽的附件（换装系统）。
9. **DragonBones 的多骨架** — 一个 DragonBones 组件可以包含多个骨架，通过 `armatureName` 切换。
10. **Spine 的混合时间** — `setMix()` 设置两个动画之间的混合时间，影响过渡平滑度。
11. **Spine 动画轨道** — Spine 支持多轨道动画，不同轨道可以同时播放不同动画。
12. **内存管理** — Spine/DragonBones 的骨骼数据较大，不使用时应及时释放。
