# ParticleSystem2D — 2D 粒子系统

## 概述

`ParticleSystem2D` 是 2D 粒子组件，用于创建各种 2D 视觉效果，如烟雾、火焰、爆炸、飘雪等。支持从 plist 文件加载粒子配置。

## 导入方式

```typescript
import { ParticleSystem2D, Node, SpriteFrame } from 'cc';
```

## 基础用法

### 创建 2D 粒子

```typescript
const node = new Node('Particle2D');
const particle = node.addComponent(ParticleSystem2D);
particle.file = particlePlist;
particle.playOnLoad = true;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `file` | `JsonAsset \| null` | 粒子配置文件（plist JSON） |
| `spriteFrame` | `SpriteFrame \| null` | 粒子纹理 |
| `playOnLoad` | `boolean` | 是否自动播放 |
| `autoRemoveOnFinish` | `boolean` | 播放完毕后自动移除节点 |
| `rate` | `number` | 发射频率 |
| `particlesCount` | `number` | 当前粒子数（只读） |
| `active` | `boolean` | 是否激活 |
| `totalParticles` | `number` | 最大粒子数 |

## 核心方法

| 方法 | 说明 |
|------|------|
| `play()` | 播放粒子 |
| `stop()` | 停止粒子 |
| `clear()` | 清除所有粒子 |
| `pause()` | 暂停粒子 |
| `resume()` | 恢复粒子 |

## 进阶用法

### 动态加载粒子配置

```typescript
const bundle = assetManager.getBundle('resources');
bundle!.load<JsonAsset>('particles/fire', JsonAsset, (err, asset) => {
    if (err) return;
    particle.file = asset;
    particle.play();
});
```

### 手动控制播放

```typescript
@ccclass('ParticleController')
export class ParticleController extends Component {
    private _particle: ParticleSystem2D | null = null;

    start() {
        this._particle = this.getComponent(ParticleSystem2D);
    }

    public playEffect() {
        if (this._particle) {
            this._particle.clear();
            this._particle.play();
        }
    }

    public stopEffect() {
        this._particle?.stop();
    }
}
```

### 自动销毁

```typescript
particle.autoRemoveOnFinish = true;
particle.totalParticles = 50;
particle.play();
```

> `autoRemoveOnFinish = true` 时，粒子播放完毕后节点会被自动销毁，适合一次性特效。

## 注意事项

- 2D 粒子使用 plist 格式配置，需要通过工具（如 Particle Designer）生成
- `totalParticles` 控制最大粒子数，值越大性能开销越高
- `autoRemoveOnFinish` 会销毁节点，不适合循环播放的粒子
- 2D 粒子与 3D 粒子系统（`ParticleSystem`）是不同的组件
- `spriteFrame` 为粒子设置纹理，不设置则使用配置文件中的纹理
