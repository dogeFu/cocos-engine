# Animation 动画系统模块分析

## 模块作用

Animation 模块是 Cocos Creator 的动画系统核心,负责管理游戏中的所有动画效果。它提供了完整的动画解决方案,包括关键帧动画、骨骼动画、动画状态机、动画混合、动画事件等功能,支持从简单的精灵动画到复杂的角色动画系统。

### 主要功能领域

1. **关键帧动画** - 基于时间轴的属性动画
2. **骨骼动画** - 支持复杂的角色动画
3. **动画状态机** - Marionette 系统实现动画逻辑
4. **动画混合** - 多动画之间的平滑过渡
5. **动画事件** - 动画播放过程中的事件触发
6. **动画轨道** - Track 系统管理动画属性

## 设计理念

### 1. 轨道系统架构

Animation 模块采用轨道(Track)系统组织动画数据,每个轨道控制一个或多个属性的动画。

**轨道层次结构:**

```
AnimationClip (动画剪辑)
├── Track 1 (轨道 1 - 位置)
│   ├── Channel X (X 分量)
│   │   └── Curve (曲线)
│   ├── Channel Y (Y 分量)
│   │   └── Curve (曲线)
│   └── Channel Z (Z 分量)
│       └── Curve (曲线)
├── Track 2 (轨道 2 - 旋转)
│   └── QuatTrack (四元数轨道)
└── Track 3 (轨道 3 - 缩放)
    └── VectorTrack (向量轨道)
```

**设计优势:**
- **灵活性**: 每个属性独立控制,支持部分动画
- **可扩展**: 可以添加自定义轨道类型
- **高效性**: 只更新需要的属性

**实现原理:**
```typescript
// 轨道基类
abstract class Track {
    path: TrackPath;  // 轨道路径
    
    abstract channels(): Channel[];
    abstract createEval(): TrackEval;
}

// 向量轨道
class VectorTrack extends Track {
    channels(): [RealTrack, RealTrack, RealTrack] {
        return [this._x, this._y, this._z];
    }
    
    createEval(): TrackEval {
        return new VectorTrackEval(this);
    }
}

// 使用示例
const track = new VectorTrack();
track.path = new TrackPath()
    .toNode('Player')
    .toProperty('position');
```

### 2. 动画曲线与插值

Animation 模块使用曲线(Curve)系统实现关键帧之间的平滑插值。

**插值类型:**
- **Linear**: 线性插值
- **Step**: 阶梯插值(无插值)
- **Cubic Spline**: 三次样条插值
- **Bezier**: 贝塞尔曲线插值

**曲线实现:**
```typescript
class RealCurve {
    private _keyframes: Keyframe[] = [];
    
    // 添加关键帧
    addKey(time: number, value: number, interpolation?: Interpolation): void {
        this._keyframes.push({ time, value, interpolation });
        this._keyframes.sort((a, b) => a.time - b.time);
    }
    
    // 采样曲线
    evaluate(time: number): number {
        // 二分查找关键帧
        const index = binarySearchEpsilon(this._keyframes, time);
        
        if (index < 0) {
            return this._keyframes[0].value;
        }
        
        if (index >= this._keyframes.length - 1) {
            return this._keyframes[this._keyframes.length - 1].value;
        }
        
        // 插值计算
        const from = this._keyframes[index];
        const to = this._keyframes[index + 1];
        const ratio = (time - from.time) / (to.time - from.time);
        
        return this._interpolate(from, to, ratio);
    }
}
```

### 3. 动画状态管理

Animation 模块使用 AnimationState 管理单个动画的播放状态。

**状态属性:**
```typescript
class AnimationState extends Playable {
    // 时间控制
    time: number;              // 当前时间
    speed: number;             // 播放速度
    duration: number;          // 动画时长
    
    // 循环控制
    wrapMode: WrapMode;        // 循环模式
    repeatCount: number;       // 重复次数
    
    // 混合控制
    weight: number;            // 混合权重
    blendMode: BlendMode;      // 混合模式
    
    // 状态标记
    isPlaying: boolean;        // 是否播放中
    isPaused: boolean;         // 是否暂停
}
```

**循环模式:**
```typescript
enum WrapMode {
    Default = 0,        // 默认(使用剪辑设置)
    Normal = 1,         // 正常播放
    Loop = 2,           // 循环播放
    PingPong = 3,       // 来回播放
    Reverse = 4,        // 反向播放
    LoopReverse = 5,    // 反向循环
}
```

**时间计算:**
```typescript
// 计算当前时间对应的动画状态
function updateAnimationState(state: AnimationState, dt: number): void {
    state.time += dt * state.speed;
    
    // 处理循环
    if (state.wrapMode === WrapMode.Loop) {
        state.time = state.time % state.duration;
    } else if (state.wrapMode === WrapMode.PingPong) {
        const iterations = Math.floor(state.time / state.duration);
        if (iterations % 2 === 1) {
            state.time = state.duration - (state.time % state.duration);
        }
    }
    
    // 检查是否完成
    if (state.time >= state.duration * state.repeatCount) {
        state.isPlaying = false;
        state.emit('finished');
    }
}
```

### 4. 动画混合系统

Animation 模块支持多个动画同时播放并进行混合。

**混合类型:**
- **Override**: 覆盖混合(后播放的覆盖先播放的)
- **Additive**: 叠加混合(动画效果叠加)

**混合实现:**
```typescript
class AnimationBlender {
    private _blendStack: AnimationState[] = [];
    
    // 添加动画到混合栈
    addAnimation(state: AnimationState): void {
        this._blendStack.push(state);
        this._blendStack.sort((a, b) => b.weight - a.weight);
    }
    
    // 计算混合结果
    blend(result: Pose): void {
        let totalWeight = 0;
        
        for (const state of this._blendStack) {
            if (state.weight <= 0) continue;
            
            const pose = state.getCurrentPose();
            
            if (totalWeight === 0) {
                // 第一个动画,直接复制
                Pose.copy(result, pose);
            } else {
                // 混合动画
                const ratio = state.weight / (totalWeight + state.weight);
                Pose.lerp(result, result, pose, ratio);
            }
            
            totalWeight += state.weight;
        }
    }
}
```

### 5. Marionette 骨骼动画系统

Animation 模块包含 Marionette 子系统,实现了完整的骨骼动画解决方案。

**核心概念:**

1. **Animation Graph (动画图)**
   - 可视化的动画逻辑编辑器
   - 状态机驱动的动画切换

2. **Motion (运动)**
   - 动画剪辑的包装
   - 支持混合和过渡

3. **State Machine (状态机)**
   - 动画状态的定义
   - 状态转换条件

4. **Pose Graph (姿态图)**
   - 姿态混合和修改
   - IK(反向动力学)支持

**状态机设计:**
```typescript
class AnimationStateMachine {
    private _states: Map<string, MotionState> = new Map();
    private _transitions: Transition[] = [];
    private _currentState: MotionState | null = null;
    
    // 更新状态机
    update(dt: number): void {
        if (!this._currentState) return;
        
        // 检查转换条件
        for (const transition of this._transitions) {
            if (transition.from === this._currentState.name) {
                if (this._checkConditions(transition.conditions)) {
                    this._transitionTo(transition.to);
                    break;
                }
            }
        }
        
        // 更新当前状态
        this._currentState.update(dt);
    }
    
    // 状态转换
    private _transitionTo(stateName: string): void {
        const newState = this._states.get(stateName);
        if (!newState) return;
        
        // 开始过渡
        this._crossFade(this._currentState, newState, transitionDuration);
        this._currentState = newState;
    }
}
```

**动画混合:**
```typescript
// 1D 混合(根据速度混合)
class AnimationBlend1D extends Motion {
    private _motions: { threshold: number, motion: Motion }[] = [];
    
    evaluate(speed: number): Pose {
        // 找到相邻的两个动画
        const [lower, upper] = this._findNeighbors(speed);
        
        // 计算混合权重
        const weight = (speed - lower.threshold) / (upper.threshold - lower.threshold);
        
        // 混合姿态
        const pose1 = lower.motion.evaluate();
        const pose2 = upper.motion.evaluate();
        
        return Pose.lerp(pose1, pose2, weight);
    }
}

// 2D 混合(根据方向和速度混合)
class AnimationBlend2D extends Motion {
    private _motions: { position: Vec2, motion: Motion }[] = [];
    
    evaluate(position: Vec2): Pose {
        // 使用重心坐标计算混合权重
        const weights = this._calculateBarycentricWeights(position);
        
        // 混合多个姿态
        const result = Pose.create();
        for (let i = 0; i < this._motions.length; ++i) {
            const pose = this._motions[i].motion.evaluate();
            Pose.add(result, pose, weights[i]);
        }
        
        return result;
    }
}
```

### 6. 动画事件系统

Animation 模块支持在动画播放过程中触发事件。

**事件类型:**
```typescript
interface AnimationEvent {
    frame: number;      // 触发帧
    func: string;       // 函数名
    params: string[];   // 参数列表
}
```

**事件触发:**
```typescript
class AnimationClip {
    private _events: AnimationEvent[] = [];
    
    // 添加事件
    addEvent(event: AnimationEvent): void {
        this._events.push(event);
        this._events.sort((a, b) => a.frame - b.frame);
    }
    
    // 触发事件
    triggerEvents(fromTime: number, toTime: number): void {
        for (const event of this._events) {
            if (event.frame >= fromTime && event.frame < toTime) {
                this._emitEvent(event);
            }
        }
    }
    
    private _emitEvent(event: AnimationEvent): void {
        // 调用组件方法
        invokeComponentMethodsEngagedInAnimationEvent(
            this._targetNode,
            event.func,
            event.params
        );
    }
}
```

## 核心组件详解

### 1. AnimationClip 动画剪辑

**职责:**
- 存储动画数据
- 管理动画轨道
- 定义动画参数(时长、帧率、循环模式)

**关键属性:**
- `duration`: 动画时长
- `sample`: 帧率
- `speed`: 播放速度
- `wrapMode`: 循环模式
- `tracks`: 轨道列表

**关键方法:**
- `addTrack()`: 添加轨道
- `removeTrack()`: 移除轨道
- `createWithSpriteFrames()`: 从精灵帧创建动画

### 2. AnimationState 动画状态

**职责:**
- 管理单个动画的播放状态
- 控制播放、暂停、停止
- 处理循环和速度

**关键属性:**
- `time`: 当前时间
- `speed`: 播放速度
- `weight`: 混合权重
- `wrapMode`: 循环模式
- `repeatCount`: 重复次数

**关键方法:**
- `play()`: 播放
- `pause()`: 暂停
- `resume()`: 恢复
- `stop()`: 停止
- `update()`: 更新

### 3. Animation Component 动画组件

**职责:**
- 管理多个 AnimationState
- 提供简单的动画播放接口
- 处理动画列表

**关键属性:**
- `clips`: 动画剪辑列表
- `defaultClip`: 默认动画剪辑

**关键方法:**
- `play()`: 播放动画
- `pause()`: 暂停动画
- `stop()`: 停止动画
- `crossFade()`: 混合过渡
- `getState()`: 获取动画状态

### 4. Track 轨道系统

**职责:**
- 定义动画属性路径
- 管理关键帧曲线
- 执行属性更新

**轨道类型:**
- `VectorTrack`: 向量轨道(位置、缩放)
- `QuatTrack`: 四元数轨道(旋转)
- `ColorTrack`: 颜色轨道
- `ObjectTrack`: 对象轨道(精灵帧等)
- `RealTrack`: 实数轨道

### 5. Pose 姿态系统

**职责:**
- 存储骨骼变换数据
- 支持姿态混合
- 应用到骨骼节点

**关键属性:**
- `transforms`: 变换数组
- `joints`: 关节信息

**关键方法:**
- `lerp()`: 线性插值
- `add()`: 叠加
- `apply()`: 应用到节点

## 代码示例

### 基本动画播放

```typescript
import { Animation, AnimationClip } from 'cc';

// 获取动画组件
const animation = node.getComponent(Animation);

// 播放默认动画
animation.play();

// 播放指定动画
animation.play('walk');

// 播放动画并设置循环
const state = animation.getState('run');
state.wrapMode = AnimationClip.WrapMode.Loop;
state.repeatCount = Infinity;
animation.play('run');

// 暂停动画
animation.pause('walk');

// 恢复动画
animation.resume('walk');

// 停止动画
animation.stop('walk');
```

### 动画混合过渡

```typescript
import { Animation } from 'cc';

const animation = node.getComponent(Animation);

// 从当前动画混合过渡到新动画
animation.crossFade('jump', 0.3);  // 0.3秒过渡时间

// 播放动画并设置权重
const runState = animation.getState('run');
runState.weight = 0.5;
animation.play('run');

const walkState = animation.getState('walk');
walkState.weight = 0.5;
animation.play('walk');
```

### 动画事件

```typescript
import { Animation, AnimationClip } from 'cc';

// 创建动画剪辑
const clip = new AnimationClip();
clip.duration = 2.0;
clip.name = 'attack';

// 添加动画事件
clip.events = [
    {
        frame: 0.5,           // 第0.5秒触发
        func: 'onAttackHit',  // 函数名
        params: ['enemy'],    // 参数
    },
    {
        frame: 1.5,
        func: 'onAttackEnd',
        params: [],
    }
];

// 在组件中定义事件处理函数
class PlayerController extends Component {
    onAttackHit(target: string) {
        console.log(`Attack hit: ${target}`);
        // 处理攻击命中逻辑
    }
    
    onAttackEnd() {
        console.log('Attack ended');
        // 处理攻击结束逻辑
    }
}
```

### 创建关键帧动画

```typescript
import { AnimationClip, VectorTrack, TrackPath } from 'cc';

// 创建动画剪辑
const clip = new AnimationClip();
clip.name = 'move';
clip.duration = 2.0;

// 创建位置轨道
const positionTrack = new VectorTrack();
positionTrack.path = new TrackPath().toProperty('position');

// 添加关键帧
const xCurve = positionTrack.channels()[0].curve;
xCurve.addKey(0.0, 0);      // 起点
xCurve.addKey(1.0, 10);     // 中点
xCurve.addKey(2.0, 0);      // 终点

const yCurve = positionTrack.channels()[1].curve;
yCurve.addKey(0.0, 0);
yCurve.addKey(1.0, 5);
yCurve.addKey(2.0, 0);

// 添加轨道到剪辑
clip.addTrack(positionTrack);

// 添加到动画组件
const animation = node.getComponent(Animation);
animation.addClip(clip);
animation.play('move');
```

### 使用 Marionette 动画图

```typescript
import { AnimationController } from 'cc';

// 获取动画控制器组件
const controller = node.getComponent(AnimationController);

// 设置动画变量
controller.setValue('speed', 5.0);
controller.setValue('isJumping', false);

// 触发状态转换
controller.setTrigger('attack');

// 获取当前状态
const currentState = controller.getCurrentState();
console.log('Current state:', currentState);
```

### 骨骼动画

```typescript
import { SkeletalAnimation } from 'cc';

// 获取骨骼动画组件
const skeletalAnim = node.getComponent(SkeletalAnimation);

// 播放骨骼动画
skeletalAnim.play('idle');

// 混合多个骨骼动画
const runState = skeletalAnim.getState('run');
runState.weight = 0.7;
skeletalAnim.play('run');

const walkState = skeletalAnim.getState('walk');
walkState.weight = 0.3;
skeletalAnim.play('walk');

// 获取骨骼节点
const skeleton = skeletalAnim.skeleton;
const boneNode = skeleton.getBoneNode('Hand_L');
```

## 模块关联

### 上游依赖

Animation 模块依赖以下基础模块:

1. **Core**
   - 使用事件系统
   - 使用数学库进行插值计算
   - 使用调度器驱动动画更新

2. **Scene Graph**
   - 动画目标节点
   - 组件系统

3. **Asset**
   - 加载动画剪辑资源

### 下游依赖

Animation 模块被以下模块依赖:

1. **2D/3D**
   - 使用动画系统驱动对象动画

2. **UI**
   - UI 元素的动画效果

3. **Spine**
   - Spine 动画集成

### 模块交互流程

```
Game Loop
    ↓
Director.tick(dt)
    ↓
AnimationManager.update(dt)
    ↓
┌─────────────────────────────────────────┐
│  AnimationState.update(dt)              │
│  - 更新时间                              │
│  - 计算循环                              │
│  - 触发事件                              │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Track.evaluate(time)                   │
│  - 采样曲线                              │
│  - 计算插值                              │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Apply to Target                        │
│  - 更新节点属性                          │
│  - 更新骨骼姿态                          │
└─────────────────────────────────────────┘
```

## 设计模式应用

### 1. 状态模式 (State Pattern)
- AnimationState 管理动画状态
- 状态机驱动的动画切换

### 2. 组合模式 (Composite Pattern)
- AnimationClip 包含多个 Track
- Track 包含多个 Channel

### 3. 策略模式 (Strategy Pattern)
- 不同的插值算法
- 不同的混合模式

### 4. 观察者模式 (Observer Pattern)
- 动画事件系统
- 状态变化通知

### 5. 解释器模式 (Interpreter Pattern)
- TrackPath 解析属性路径
- Pose Graph 执行姿态计算

## 性能优化策略

### 1. 曲线优化
- 关键帧压缩
- 曲线简化
- 延迟计算

### 2. 混合优化
- 权重为0的动画跳过
- 批量混合计算
- 缓存混合结果

### 3. 更新优化
- 只更新活跃动画
- 按需采样
- LOD 系统

### 4. 内存优化
- 姿态对象池
- 共享动画数据
- 增量更新

## 扩展性设计

### 1. 自定义轨道类型
可以创建自定义轨道:

```typescript
class CustomTrack extends Track {
    channels(): Channel[] {
        return [this._customChannel];
    }
    
    createEval(): TrackEval {
        return new CustomTrackEval(this);
    }
}
```

### 2. 自定义插值算法
可以实现自定义插值:

```typescript
class CustomInterpolation implements Interpolation {
    interpolate(from: number, to: number, ratio: number): number {
        // 自定义插值逻辑
        return customValue;
    }
}
```

### 3. 自定义混合模式
可以扩展混合模式:

```typescript
class CustomBlendMode implements BlendMode {
    blend(target: Pose, source: Pose, weight: number): void {
        // 自定义混合逻辑
    }
}
```

## 总结

Animation 模块是 Cocos Creator 动画系统的核心,其设计体现了以下核心思想:

1. **轨道系统**: 灵活的动画数据组织方式,支持任意属性动画
2. **状态管理**: 完善的动画状态控制,支持循环、速度、混合等
3. **Marionette 系统**: 强大的骨骼动画解决方案,支持状态机和动画图
4. **动画混合**: 多动画同时播放和平滑过渡
5. **事件系统**: 动画驱动的逻辑交互

理解 Animation 模块的设计理念,对于掌握 Cocos Creator 的动画系统、实现自定义动画效果、优化动画性能都至关重要。Animation 模块为整个引擎提供了强大而灵活的动画能力。
