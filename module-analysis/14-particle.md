# Particle 粒子系统模块分析

## 模块作用

Particle 模块是 Cocos Creator 的粒子特效系统,用于创建各种视觉效果,如火焰、烟雾、爆炸、魔法效果等。它提供了强大的粒子发射器、影响器和渲染器,支持 CPU 和 GPU 粒子计算,是游戏特效制作的重要工具。

### 主要功能领域

1. **粒子发射** - 粒子的生成和初始化
2. **粒子生命周期** - 粒子的存活时间管理
3. **粒子运动** - 速度、加速度、重力等物理效果
4. **粒子渲染** - 粒子的颜色、大小、旋转等视觉效果
5. **粒子影响器** - 风力、湍流、碰撞等环境影响
6. **粒子系统** - 完整的粒子效果管理

## 设计理念

### 1. 模块化的粒子系统

Particle 模块采用模块化设计,将粒子功能分解为多个独立模块。

**核心模块:**
- **Emitter**: 发射器模块
- **Lifetime**: 生命周期模块
- **Velocity**: 速度模块
- **Force**: 力模块
- **Color**: 颜色模块
- **Size**: 大小模块
- **Rotation**: 旋转模块
- **Texture Sheet**: 纹理动画模块

**模块组合:**
```typescript
// 创建粒子系统
const particleSystem = node.addComponent(ParticleSystem);

// 配置发射器
particleSystem.emitter.rateOverTime = 100;
particleSystem.emitter.shape = EmitterShape.BOX;

// 配置生命周期
particleSystem.lifetime.minLifetime = 1.0;
particleSystem.lifetime.maxLifetime = 2.0;

// 配置速度
particleSystem.velocity.startSpeed = 5.0;
particleSystem.velocity.endSpeed = 0.0;

// 配置颜色
particleSystem.color.startColor = new Color(255, 255, 0, 255);
particleSystem.color.endColor = new Color(255, 0, 0, 0);
```

### 2. 粒子生命周期管理

Particle 模块实现了完整的粒子生命周期管理。

**生命周期阶段:**
```
发射 (Emit)
    ↓
初始化 (Initialize)
    ↓
更新 (Update)
    ↓
渲染 (Render)
    ↓
销毁 (Destroy)
```

**生命周期实现:**
```typescript
class Particle {
    position: Vec3;
    velocity: Vec3;
    color: Color;
    size: number;
    rotation: number;
    lifetime: number;
    age: number;
    
    update(dt: number): void {
        this.age += dt;
        
        // 更新位置
        this.position.add(this.velocity.clone().multiplyScalar(dt));
        
        // 更新颜色
        const ratio = this.age / this.lifetime;
        this.color = Color.lerp(this.startColor, this.endColor, ratio);
        
        // 更新大小
        this.size = Math.lerp(this.startSize, this.endSize, ratio);
        
        // 检查是否死亡
        if (this.age >= this.lifetime) {
            this.isDead = true;
        }
    }
}
```

### 3. 粒子发射器系统

Particle 模块提供多种发射器形状和发射模式。

**发射器形状:**
- **Box**: 盒形发射器
- **Sphere**: 球形发射器
- **Circle**: 圆形发射器
- **Cone**: 锥形发射器
- **Hemisphere**: 半球形发射器

**发射模式:**
```typescript
enum EmissionMode {
    RATE,           // 按时间发射
    BURST,          // 爆发发射
    DISTANCE,       // 按距离发射
}

// 配置发射器
emitter.mode = EmissionMode.RATE;
emitter.rateOverTime = 100;  // 每秒发射100个粒子

// 爆发模式
emitter.addBurst({
    time: 0,        // 触发时间
    count: 50,      // 粒子数量
    cycles: 1,      // 循环次数
    interval: 0.1,  // 间隔时间
});
```

### 4. 粒子影响器系统

Particle 模块支持多种粒子影响器,模拟真实物理效果。

**影响器类型:**
- **Gravity**: 重力影响器
- **Wind**: 风力影响器
- **Vortex**: 漩涡影响器
- **Turbulence**: 湍流影响器
- **Attractor**: 吸引器
- **Collider**: 碰撞器

**影响器实现:**
```typescript
class GravityModifier {
    gravity: Vec3 = new Vec3(0, -9.8, 0);
    
    apply(particle: Particle, dt: number): void {
        particle.velocity.add(this.gravity.clone().multiplyScalar(dt));
    }
}

class WindModifier {
    direction: Vec3;
    strength: number;
    
    apply(particle: Particle, dt: number): void {
        const force = this.direction.clone().multiplyScalar(this.strength);
        particle.velocity.add(force.multiplyScalar(dt));
    }
}
```

### 5. 粒子渲染优化

Particle 模块实现了高效的粒子渲染。

**渲染技术:**
- **GPU 粒子**: 使用 GPU 计算粒子
- **批处理**: 合并多个粒子系统
- **LOD**: 根据距离调整粒子质量

**渲染优化:**
```typescript
// GPU 粒子
particleSystem.useGPU = true;

// 粒子排序
particleSystem.sortMode = ParticleSortMode.DISTANCE;

// 渲染模式
particleSystem.renderMode = ParticleRenderMode.BILLBOARD;
```

## 核心组件详解

### 1. ParticleSystem 粒子系统组件

**职责:**
- 管理粒子生命周期
- 协调各个模块
- 控制粒子播放

**关键属性:**
- `duration`: 持续时间
- `looping`: 是否循环
- `playOnAwake`: 自动播放
- `maxParticles`: 最大粒子数
- `rateOverTime`: 发射速率

### 2. ParticleEmitter 发射器

**职责:**
- 生成粒子
- 定义发射形状
- 控制发射速率

**关键属性:**
- `shape`: 发射形状
- `rateOverTime`: 时间发射率
- `rateOverDistance`: 距离发射率
- `bursts`: 爆发列表

### 3. ParticleModule 粒子模块

**职责:**
- 定义粒子属性
- 控制粒子行为
- 支持曲线编辑

**模块类型:**
- `LifetimeModule`: 生命周期模块
- `VelocityModule`: 速度模块
- `ColorModule`: 颜色模块
- `SizeModule`: 大小模块

## 代码示例

### 创建基本粒子效果

```typescript
import { ParticleSystem, Color, Vec3 } from 'cc';

// 创建粒子系统
const particleSystem = node.addComponent(ParticleSystem);

// 配置发射器
particleSystem.emission.rateOverTime = 100;
particleSystem.shape.type = EmitterShape.CONE;

// 配置生命周期
particleSystem.lifetime.minLifetime = 1.0;
particleSystem.lifetime.maxLifetime = 2.0;

// 配置速度
particleSystem.velocity.startSpeed = 5.0;
particleSystem.velocity.endSpeed = 0.0;

// 配置颜色
particleSystem.color.startColor = new Color(255, 200, 0, 255);
particleSystem.color.endColor = new Color(255, 0, 0, 0);

// 配置大小
particleSystem.size.startSize = 0.5;
particleSystem.size.endSize = 0.1;

// 播放
particleSystem.play();
```

### 创建火焰效果

```typescript
import { ParticleSystem, Color } from 'cc';

const particleSystem = node.addComponent(ParticleSystem);

// 发射器配置
particleSystem.emission.rateOverTime = 50;
particleSystem.shape.type = EmitterShape.CONE;
particleSystem.shape.angle = 25;

// 生命周期
particleSystem.lifetime.minLifetime = 0.5;
particleSystem.lifetime.maxLifetime = 1.5;

// 速度(向上)
particleSystem.velocity.startSpeed = 3.0;
particleSystem.velocity.endSpeed = 1.0;

// 颜色渐变(黄→红→透明)
particleSystem.color.gradient = [
    { time: 0, color: new Color(255, 255, 0, 255) },
    { time: 0.5, color: new Color(255, 100, 0, 200) },
    { time: 1, color: new Color(255, 0, 0, 0) },
];

// 大小渐变
particleSystem.size.startSize = 0.3;
particleSystem.size.endSize = 0.8;

// 重力(向上)
particleSystem.gravityModifier = -0.5;
```

### 创建爆炸效果

```typescript
import { ParticleSystem, Color } from 'cc';

const particleSystem = node.addComponent(ParticleSystem);

// 爆发模式
particleSystem.emission.rateOverTime = 0;
particleSystem.emission.addBurst({
    time: 0,
    count: 100,
    cycles: 1,
});

// 球形发射
particleSystem.shape.type = EmitterShape.SPHERE;
particleSystem.shape.radius = 0.1;

// 短生命周期
particleSystem.lifetime.minLifetime = 0.3;
particleSystem.lifetime.maxLifetime = 0.8;

// 高速向外
particleSystem.velocity.startSpeed = 10.0;
particleSystem.velocity.endSpeed = 0.0;

// 颜色
particleSystem.color.startColor = new Color(255, 150, 0, 255);
particleSystem.color.endColor = new Color(255, 0, 0, 0);

// 播放一次
particleSystem.play();
```

## 模块关联

### 上游依赖

Particle 模块依赖:
- **Core**: 数学库、对象管理
- **Scene Graph**: 节点系统、组件系统
- **Rendering**: 渲染管线
- **GFX**: 图形接口
- **Asset**: 纹理资源加载

### 下游依赖

Particle 模块被以下模块使用:
- **Game**: 游戏特效
- **UI**: UI 特效

## 性能优化策略

### 1. GPU 粒子
- 使用 GPU 计算粒子
- 减少 CPU 开销

### 2. 粒子池
- 复用粒子对象
- 减少内存分配

### 3. 批处理
- 合并粒子系统
- 减少 Draw Call

### 4. LOD 系统
- 根据距离调整粒子质量
- 减少远处粒子数量

## 总结

Particle 模块是 Cocos Creator 特效系统的核心,其设计体现了:

1. **模块化设计**: 功能分解为独立模块,灵活组合
2. **生命周期管理**: 完整的粒子生命周期控制
3. **多样化发射器**: 支持多种发射形状和模式
4. **物理影响器**: 真实的物理效果模拟
5. **性能优化**: GPU 粒子、批处理等优化策略

理解 Particle 模块的设计理念,对于创建高质量的游戏特效至关重要。
