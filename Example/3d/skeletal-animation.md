# SkeletalAnimation — 骨骼动画

## 概述

`SkeletalAnimation` 是骨骼动画组件，用于播放基于骨骼的 3D 动画（如角色动画）。支持动画混合、叠加、交叉淡入淡出等高级功能。

## 导入方式

```typescript
import { SkeletalAnimation, AnimationClip, Node } from 'cc';
```

## 基础用法

### 播放骨骼动画

```typescript
const skeletalAnim = node.getComponent(SkeletalAnimation);
if (skeletalAnim) {
    skeletalAnim.play('idle');
}
```

### 交叉淡入淡出

```typescript
skeletalAnim.crossFade('run', 0.3);
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
| `pause` | `() => void` | 暂停 |
| `resume` | `() => void` | 恢复 |
| `stop` | `() => void` | 停止 |
| `getState` | `(name) => AnimationState \| null` | 获取动画状态 |

## 进阶用法

### 角色动画控制器

```typescript
@ccclass('CharacterAnimation')
export class CharacterAnimation extends Component {
    private _anim: SkeletalAnimation | null = null;

    start() {
        this._anim = this.getComponent(SkeletalAnimation);
        this.playIdle();
    }

    public playIdle() {
        this._anim?.crossFade('idle', 0.2);
    }

    public playWalk() {
        this._anim?.crossFade('walk', 0.2);
    }

    public playRun() {
        this._anim?.crossFade('run', 0.2);
    }

    public playAttack() {
        this._anim?.crossFade('attack', 0.1);
    }

    public playDeath() {
        this._anim?.crossFade('death', 0.3);
    }
}
```

### 动画事件监听

```typescript
skeletalAnim.on(SkeletalAnimation.EventType.FINISHED, (state: AnimationState) => {
    if (state.name === 'attack') {
        this.playIdle();
    }
}, this);

skeletalAnim.on(SkeletalAnimation.EventType.PLAY, (state: AnimationState) => {
}, this);
```

### 动画状态控制

```typescript
const state = skeletalAnim.getState('run');
if (state) {
    state.speed = 1.5;
    state.wrapMode = AnimationClip.WrapMode.LOOP;
    state.weight = 1.0;
}
```

## 注意事项

- 骨骼动画需要模型包含骨骼数据和蒙皮信息
- `crossFade` 的 `duration` 参数控制过渡时间（秒）
- 骨骼动画与 `Animation` 组件不同，`SkeletalAnimation` 专门用于骨骼蒙皮动画
- 动画剪辑通常由 3D 建模工具导出，不建议程序化创建
- 多个动画同时播放时，通过 `weight` 控制混合权重
