# Cocos Creator 引擎 — 3D 粒子系统

> 面向 AI 辅助编程的中文参考文档。3D 粒子系统是引擎中独立的大模块，包含发射器、生命周期模块、曲线/渐变数据类型、CPU/GPU 渲染器。

---

## 目录

1. [架构概览](#1-架构概览)
2. [ParticleSystem 组件](#2-particlesystem-组件)
3. [发射器形状](#3-发射器形状)
4. [生命周期模块](#4-生命周期模块)
5. [CurveRange 与 GradientRange](#5-curverange-与-gradientrange)
6. [渲染器](#6-渲染器)
7. [隐含知识与陷阱](#7-隐含知识与陷阱)

---

## 1. 架构概览

3D 粒子系统（`cocos/particle/`）采用模块化设计：

- **ParticleSystem**：顶层组件，管理粒子生命周期
- **ParticleEmitter**：发射器，控制粒子生成
- **ParticleModule**：各种生命周期模块，控制粒子行为
- **ParticleRenderer**：渲染器，控制粒子绘制

**关键文件索引：**

| 文件 | 说明 |
|---|---|
| `cocos/particle/particle-system.ts` | 粒子系统组件 |
| `cocos/particle/particle-emitter.ts` | 发射器 |
| `cocos/particle/particle.ts` | 粒子数据 |
| `cocos/particle/curve-range.ts` | 曲线范围 |
| `cocos/particle/gradient-range.ts` | 渐变范围 |
| `cocos/particle/particle-culler.ts` | 粒子剔除 |
| `cocos/particle/renderer/particle-renderer.ts` | 粒子渲染器 |
| `cocos/particle/renderer/cpu-particle-renderer.ts` | CPU 渲染器 |
| `cocos/particle/renderer/gpu-particle-renderer.ts` | GPU 渲染器 |

---

## 2. ParticleSystem 组件

### 2.1 ParticleSystem（`cocos/particle/particle-system.ts`）

3D 粒子系统主组件。

#### 关键属性

- `capacity`：`number` — 最大粒子数
- `emitter`：`ParticleEmitter` — 发射器
- `renderer`：`ParticleRenderer` — 渲染器
- `modules`：`ParticleModule[]` — 生命周期模块数组
- `duration`：`number` — 播放时长（秒）
- `loop`：`boolean` — 是否循环
- `playOnAwake`：`boolean` — 是否自动播放
- `simulationSpeed`：`number` — 模拟速度倍率
- `simulationSpace`：`SimulationSpace` — 模拟空间
- `startDelay`：`CurveRange` — 启动延迟
- `startLifetime`：`CurveRange` — 初始生命周期
- `startColor`：`GradientRange` — 初始颜色
- `startSize`：`CurveRange` — 初始大小
- `startSpeed`：`CurveRange` — 初始速度
- `startRotation`：`CurveRange` — 初始旋转
- `gravityModifier`：`CurveRange` — 重力修正
- `rateOverTime`：`CurveRange` — 每秒发射数
- `rateOverDistance`：`CurveRange` — 每距离发射数
- `bursts`：`Burst[]` — 爆发数组
- `isPlaying`（只读）：是否正在播放
- `isPaused`（只读）：是否暂停
- `isEmitting`（只读）：是否正在发射

#### SimulationSpace 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `LOCAL` | 本地空间（粒子跟随节点移动） |
| 1 | `WORLD` | 世界空间（粒子独立于节点） |

#### 关键方法

- `play()`：播放
- `pause()`：暂停
- `stop(clear?)`：停止
- `clear()`：清除所有粒子
- `emit(count)`：立即发射指定数量的粒子

#### Burst 结构

```ts
interface Burst {
    time: number;       // 触发时间
    count: CurveRange;  // 发射数量
    cycles: number;     // 循环次数
    interval: number;   // 循环间隔
    repeatProbability: number; // 重复概率
}
```

---

## 3. 发射器形状

### 3.1 EmitterShape 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `BOX` | 盒子 |
| 1 | `CIRCLE` | 圆形 |
| 2 | `CONE` | 圆锥 |
| 3 | `SPHERE` | 球体 |
| 4 | `HEMISPHERE` | 半球 |

### 3.2 发射器属性

- `shapeType`：`EmitterShape` — 形状类型
- `emitFrom`：`EmitLocation` — 发射位置
- `position`：`Vec3` — 发射器位置偏移
- `direction`：`Vec3` — 发射方向
- `angle`：`number` — 发射锥角（度）
- `radius`：`number` — 半径
- `radiusThickness`：`number` — 半径厚度（0-1）
- `arc`：`number` — 弧度
- `arcMode`：`ArcMode` — 弧度模式
- `arcSpread`：`number` — 弧度扩散
- `arcSpeed`：`CurveRange` — 弧度速度
- `boxThickness`：`Vec3` — 盒子厚度
- `length`：`number` — 长度（CONE 模式）
- `scale`：`Vec3` — 缩放

### 3.3 EmitLocation 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `BASE` | 基础面 |
| 1 | `SHELL` | 外壳 |
| 2 | `VOLUME` | 体积 |

### 3.4 ArcMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `RANDOM` | 随机 |
| 1 | `LOOP` | 循环 |
| 2 | `PING_PONG` | 往返 |

---

## 4. 生命周期模块

### 4.1 模块列表

| 模块 | 类名 | 说明 |
|---|---|---|
| 大小随生命 | `SizeOvertimeModule` | 控制粒子大小随时间变化 |
| 速度随生命 | `VelocityOvertimeModule` | 控制粒子速度随时间变化 |
| 力随生命 | `ForceOvertimeModule` | 控制粒子受力随时间变化 |
| 颜色随生命 | `ColorOvertimeModule` | 控制粒子颜色随时间变化 |
| 旋转随生命 | `RotationOvertimeModule` | 控制粒子旋转随时间变化 |
| 纹理动画 | `TextureAnimationModule` | 控制纹理帧动画 |
| 噪声 | `NoiseModule` | 添加噪声运动 |
| 限制速度 | `LimitVelocityOvertimeModule` | 限制粒子最大速度 |
| 继承速度 | `InheritVelocityModule` | 继承发射器速度 |
| 子发射器 | `SubEmitterModule` | 子粒子系统 |
| 拖尾 | `TrailModule` | 粒子拖尾效果 |
| 碰撞 | `CollisionModule` | 粒子碰撞 |
| 颜色随速度 | `ColorBySpeedModule` | 颜色随速度变化 |
| 大小随速度 | `SizeBySpeedModule` | 大小随速度变化 |
| 旋转随速度 | `RotationBySpeedModule` | 旋转随速度变化 |

### 4.2 SizeOvertimeModule

- `enable`：是否启用
- `size`：`CurveRange` — 大小曲线
- `separateAxes`：是否分离轴
- `x` / `y` / `z`：`CurveRange` — 各轴大小曲线

### 4.3 VelocityOvertimeModule

- `enable`：是否启用
- `speed`：`CurveRange` — 速度曲线
- `x` / `y` / `z`：`CurveRange` — 各轴速度
- `speedModifier`：`CurveRange` — 速度修正
- `space`：`CoordinateSpace` — 坐标空间

#### CoordinateSpace 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `LOCAL` | 本地空间 |
| 1 | `WORLD` | 世界空间 |

### 4.4 ForceOvertimeModule

- `enable`：是否启用
- `x` / `y` / `z`：`CurveRange` — 各轴力
- `space`：`CoordinateSpace` — 坐标空间

### 4.5 ColorOvertimeModule

- `enable`：是否启用
- `color`：`GradientRange` — 颜色渐变

### 4.6 RotationOvertimeModule

- `enable`：是否启用
- `x` / `y` / `z`：`CurveRange` — 各轴旋转
- `separateAxes`：是否分离轴

### 4.7 TextureAnimationModule

- `enable`：是否启用
- `numTiles`：`Vec2` — 纹理分块数
- `animation`：`AnimationMode` — 动画模式
- `frameOverTime`：`CurveRange` — 帧随时间曲线
- `startFrame`：`CurveRange` — 起始帧
- `cycleCount`：`number` — 循环次数
- `flipU` / `flipV`：`number` — 翻转概率

#### AnimationMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `WHOLE_SHEET` | 整张纹理 |
| 1 | `SINGLE_ROW` | 单行 |

### 4.8 NoiseModule

- `enable`：是否启用
- `strength`：`CurveRange` — 噪声强度
- `strengthX` / `strengthY` / `strengthZ`：`CurveRange` — 各轴噪声强度
- `frequency`：`number` — 频率
- `scrollSpeed`：`CurveRange` — 滚动速度
- `damping`：`boolean` — 是否阻尼
- `octaves`：`number` — 八度数
- `octaveMultiplier`：`number` — 八度乘数
- `octaveScale`：`number` — 八度缩放
- `quality`：`NoiseQuality` — 噪声质量

### 4.9 TrailModule

- `enable`：是否启用
- `mode`：`TrailMode` — 拖尾模式
- `lifetime`：`CurveRange` — 拖尾生命周期
- `minVertexDistance`：`number` — 最小顶点距离
- `widthRatio`：`CurveRange` — 宽度比例
- `color`：`GradientRange` — 颜色
- `particleRatio`：`number` — 粒子比例
- `dieWithParticles`：`boolean` — 粒子死亡时拖尾消失
- `attachRibbonsToTrail`：`boolean` — 附加丝带

#### TrailMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `PER_PARTICLE` | 每个粒子独立拖尾 |
| 1 | `PER_RIBBON` | 丝带拖尾 |

**关键限制：** Trail 模块仅支持 CPU 渲染器。GPU 渲染器（`useGPU = true`）不支持拖尾。

### 4.10 CollisionModule

- `enable`：是否启用
- `type`：`CollisionType` — 碰撞类型
- `quality`：`CollisionQuality` — 碰撞质量
- `bounce`：`CurveRange` — 弹性
- `lifetimeLoss`：`CurveRange` — 生命损失
- `minKillSpeed`：`number` — 最小死亡速度
- `maxKillSpeed`：`number` — 最大死亡速度
- `collidesWith`：`number` — 碰撞层掩码
- `radiusScale`：`number` — 半径缩放
- `planes`：`Plane[]` — 碰撞平面

#### CollisionType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `PLANES` | 平面碰撞 |
| 1 | `WORLD` | 世界碰撞 |

### 4.11 SubEmitterModule

- `enable`：是否启用
- `subEmitters`：`SubEmitterData[]` — 子发射器数组

#### SubEmitterData

```ts
interface SubEmitterData {
    emitter: ParticleSystem;    // 子粒子系统
    type: SubEmitterType;       // 触发类型
    properties: SubEmitterProperties; // 继承属性
}
```

#### SubEmitterType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `BIRTH` | 粒子出生时触发 |
| 1 | `DEATH` | 粒子死亡时触发 |
| 2 | `COLLISION` | 碰撞时触发 |
| 3 | `CUSTOM` | 自定义触发 |

---

## 5. CurveRange 与 GradientRange

### 5.1 CurveRange（`cocos/particle/curve-range.ts`）

粒子属性的曲线范围值。支持多种模式。

#### CurveRangeMode 枺举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `CONSTANT` | 常量值 |
| 1 | `CURVE` | 曲线 |
| 2 | `TWO_CONSTANTS` | 两个常量（随机插值） |
| 3 | `TWO_CURVES` | 两条曲线（随机插值） |

#### 关键属性

- `mode`：`CurveRangeMode` — 模式
- `constant`：`number` — 常量值
- `constantMin` / `constantMax`：最小/最大常量
- `spline`：`RealCurve` — 曲线
- `splineMin` / `splineMax`：最小/最大曲线
- `multiplier`：`number` — 乘数

#### 采样方法

```ts
// 在指定时间 [0, 1] 采样
const value = curveRange.evaluate(time, rand?);
```

- `CONSTANT` 模式：返回 `constant`
- `CURVE` 模式：在 `spline` 上采样
- `TWO_CONSTANTS` 模式：在 `constantMin` 和 `constantMax` 之间随机
- `TWO_CURVES` 模式：在 `splineMin` 和 `splineMax` 之间随机

### 5.2 GradientRange（`cocos/particle/gradient-range.ts`）

粒子颜色的渐变范围值。

#### GradientRangeMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `COLOR` | 单色 |
| 1 | `GRADIENT` | 渐变 |
| 2 | `TWO_COLORS` | 两个颜色（随机插值） |
| 3 | `TWO_GRADIENTS` | 两个渐变（随机插值） |

#### 关键属性

- `mode`：`GradientRangeMode` — 模式
- `color`：`Color` — 单色
- `colorMin` / `colorMax`：最小/最大颜色
- `gradient`：`ColorGradient` — 渐变
- `gradientMin` / `gradientMax`：最小/最大渐变

### 5.3 ColorGradient（`cocos/particle/gradient-range.ts`）

颜色渐变。由关键帧数组组成。

- `colorKeys`：`{ time: number, color: Color }[]` — 颜色关键帧
- `alphaKeys`：`{ time: number, alpha: number }[]` — 透明度关键帧
- `mode`：`GradientMode` — 渐变模式

---

## 6. 渲染器

### 6.1 ParticleRenderer（`cocos/particle/renderer/particle-renderer.ts`）

粒子渲染器基类。

#### 关键属性

- `renderMode`：`RenderMode` — 渲染模式
- `mesh`：`Mesh` — 网格（MESH 模式）
- `particleMaterial`：`Material` — 粒子材质
- `useGPU`：`boolean` — 是否使用 GPU 渲染
- `stretchedBillboardSpeedScale`：`number` — 拉伸速度缩放
- `stretchedBillboardLengthScale`：`number` — 拉伸长度缩放
- `trail`：`ParticleTrail` — 拖尾配置
- `vertexStream`：`number[]` — 顶点流

#### RenderMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `BILLBOARD` | 公告板（始终面向相机） |
| 1 | `STRETCHED_BILLBOARD` | 拉伸公告板 |
| 2 | `HORIZONTAL_BILLBOARD` | 水平公告板 |
| 3 | `VERTICAL_BILLBOARD` | 垂直公告板 |
| 4 | `MESH` | 网格渲染 |

### 6.2 CPU 粒子渲染器（`cocos/particle/renderer/cpu-particle-renderer.ts`）

CPU 渲染器在 CPU 上更新粒子状态，然后提交给 GPU 渲染。

**特点：**
- 支持所有生命周期模块
- 支持拖尾（Trail）
- 支持碰撞
- 粒子数量受 `capacity` 限制
- 性能受粒子数量影响

### 6.3 GPU 粒子渲染器（`cocos/particle/renderer/gpu-particle-renderer.ts`）

GPU 渲染器使用 Compute Shader 在 GPU 上更新粒子状态。

**特点：**
- 性能更好（大量粒子时）
- **不支持拖尾（Trail）**
- **不支持碰撞**
- **不支持子发射器**
- 需要设备支持 `COMPUTE_SHADER` 特性
- 粒子数据存储在 GPU 缓冲区

---

## 7. 隐含知识与陷阱

1. **Trail 模块仅 CPU** — `useGPU = true` 时拖尾模块不可用。如果同时启用，拖尾会被静默忽略。
2. **GPU 渲染器需要 Compute Shader** — WebGL2 不支持 Compute Shader，GPU 渲染器仅在 WebGPU 和原生平台可用。
3. **CurveRange 采样需要随机数** — `TWO_CONSTANTS` 和 `TWO_CURVES` 模式需要传入随机数生成器。
4. **粒子容量预分配** — `capacity` 决定预分配的粒子内存，运行时不可修改。
5. **Burst 的 repeatProbability** — 0-1 之间的值，控制每次循环是否触发。
6. **SimulationSpace.WORLD 的性能影响** — 世界空间模拟需要额外计算世界变换。
7. **纹理动画需要 SpriteFrame** — 纹理动画模块使用 SpriteFrame 的分块信息。
8. **噪声模块的八度数** — `octaves` 越大噪声越精细，但性能开销越大。
9. **碰撞模块的平面碰撞** — 平面碰撞在世界空间中定义，需要手动设置平面位置和法线。
10. **子发射器的循环引用** — 子发射器不能引用自身，否则会无限递归。
11. **startLifetime 的单位是秒** — 不是帧数。
12. **粒子系统的 update 在物理之后** — 粒子更新在 `AFTER_PHYSICS` 之后执行。
