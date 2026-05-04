# Animation — 动画组件

## 概述

`Animation` 是通用动画组件，用于播放基于属性关键帧的动画。支持动画剪辑管理、交叉淡入淡出、动画事件等功能。适用于 UI 动画、2D 帧动画、3D 属性动画等场景。

## 导入方式

```typescript
import { Animation, AnimationClip, AnimationState, Node, SpriteFrame } from 'cc';
```

## 基础用法

### 播放动画

```typescript
const animation = node.getComponent(Animation);
if (animation) {
    animation.play('idle');
    animation.play();
}
```

### 交叉淡入淡出

```typescript
animation.crossFade('run', 0.3);
```

### 暂停与恢复

```typescript
animation.pause();
animation.resume();
animation.stop();
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `clips` | `(AnimationClip \| null)[]` | 管理的动画剪辑 |
| `defaultClip` | `AnimationClip \| null` | 默认动画剪辑 |
| `playOnLoad` | `boolean` | 是否自动播放 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `play` | `(name?) => void` | 播放动画 |
| `crossFade` | `(name, duration?) => void` | 交叉淡入淡出 |
| `pause` | `() => void` | 暂停所有动画 |
| `resume` | `() => void` | 恢复所有动画 |
| `stop` | `() => void` | 停止所有动画 |
| `getState` | `(name) => AnimationState \| null` | 获取动画状态 |
| `createState` | `(clip, name?) => AnimationState` | 创建动画状态 |
| `addClip` | `(clip, name?) => AnimationState` | 添加动画剪辑 |
| `removeClip` | `(clip, force?) => void` | 移除动画剪辑 |

## 事件

| 事件 | 说明 |
|------|------|
| `play` | 动画开始播放 |
| `stop` | 动画停止 |
| `pause` | 动画暂停 |
| `resume` | 动画恢复 |
| `lastframe` | 动画最后一帧 |
| `finished` | 动画播放完成 |

## 进阶用法

### 动画事件监听

```typescript
animation.on(Animation.EventType.FINISHED, (state: AnimationState) => {
    if (state.name === 'attack') {
        animation.crossFade('idle', 0.2);
    }
}, this);

animation.on(Animation.EventType.PLAY, (state: AnimationState) => {
}, this);

animation.on(Animation.EventType.LASTFRAME, (state: AnimationState) => {
}, this);
```

### 从 SpriteFrame 序列创建动画

```typescript
const clip = AnimationClip.createWithSpriteFrames(spriteFrames, 10);
clip.name = 'walk';
clip.wrapMode = AnimationClip.WrapMode.LOOP;
animation.addClip(clip);
animation.play('walk');
```

### 动画状态控制

```typescript
const state = animation.getState('run');
if (state) {
    state.speed = 1.5;
    state.wrapMode = AnimationClip.WrapMode.LOOP;
    state.repeatCount = Infinity;
    state.weight = 1.0;
    state.setTime(0.5);
}
```

### 动画剪辑中的事件

```typescript
const clip = new AnimationClip();
clip.events = [
    {
        frame: 0.5,
        func: 'onAttackHit',
        params: ['right_hand'],
    },
    {
        frame: 1.0,
        func: 'onAttackEnd',
        params: [],
    },
];
clip.duration = 1.5;
animation.addClip(clip);
animation.play(clip.name);
```

对应组件方法：

```typescript
@ccclass('AnimationEventHandler')
export class AnimationEventHandler extends Component {
    public onAttackHit(hand: string) {
    }

    public onAttackEnd() {
    }
}
```

### WrapMode 枚举

| 值 | 说明 |
|-----|------|
| `DEFAULT` | 默认（使用剪辑设置） |
| `NORMAL` | 正常播放一次 |
| `LOOP` | 循环播放 |
| `PING_PONG` | 来回播放 |
| `REVERSE` | 反向播放 |
| `LOOP_REVERSE` | 反向循环 |

## 注意事项

- `Animation` 与 `SkeletalAnimation` 不同：`Animation` 用于属性关键帧动画，`SkeletalAnimation` 用于骨骼蒙皮动画
- `crossFade` 在过渡期间会同时播放两个动画
- 动画事件函数需要在同一节点的组件中定义
- `playOnLoad` 为 `true` 时，组件加载后自动播放 `defaultClip`
- `getState` 返回 `null` 表示该动画状态不存在，需要先 `addClip`
