# Core 核心模块分析

## 模块作用

Core 模块是 Cocos Creator 引擎的基石,为整个引擎提供最基础的基础设施。它包含了类型系统、数学库、事件系统、调度器、内存管理等核心功能,是所有其他模块的依赖基础。

### 主要功能领域

1. **类型系统** - 提供装饰器驱动的类定义和属性系统
2. **数学库** - 向量、矩阵、四元数、颜色等数学运算
3. **事件系统** - 观察者模式的实现,支持事件分发和处理
4. **调度系统** - 定时器和帧更新管理
5. **几何工具** - 包围盒、射线、平面等几何计算
6. **内存管理** - 对象池、缓存数组等性能优化工具
7. **平台抽象** - 跨平台的调试、日志、系统信息接口

## 设计理念

### 1. 装饰器驱动的元编程

Core 模块采用装饰器(Decorator)模式来实现元编程,这是 Cocos Creator 最核心的设计理念之一。

**设计思想:**
- 使用 `@ccclass` 和 `@property` 装饰器声明类的元数据
- 在编译时或运行时收集属性信息,用于序列化、编辑器显示等
- 将声明式配置与命令式逻辑分离

**核心实现:**
```typescript
@classdec
export default class MyComponent extends Component {
    @property({type: CCInteger})
    public speed: number = 10;
    
    @property({type: Node})
    public target: Node | null = null;
}
```

装饰器系统通过 `CCClass` 实现:
- 属性验证和类型检查
- 默认值处理
- 序列化配置
- 编辑器集成

### 2. 对象生命周期管理

`CCObject` 是引擎中大部分对象的基类,实现了统一的生命周期管理。

**设计原则:**
- **延迟销毁**: 对象调用 `destroy()` 后不会立即销毁,而是在帧末统一处理
- **状态标记**: 使用位标记(`_objFlags`)管理对象状态
- **引用清理**: 销毁时自动清理对象属性,防止内存泄漏

**关键机制:**
```typescript
enum CCObjectFlags {
    Destroyed = 1 << 0,          // 已销毁
    ToDestroy = 1 << 2,          // 待销毁
    DontSave = 1 << 3,           // 不序列化
    EditorOnly = 1 << 4,         // 仅编辑器使用
    // ... 更多标记
}
```

### 3. 事件系统的 Mixin 设计

事件系统采用 Mixin 模式,通过 `Eventify` 函数为任意类添加事件能力。

**设计优势:**
- 避免多重继承的复杂性
- 灵活组合,按需添加功能
- 保持类型安全

**实现原理:**
```typescript
class MyClass extends Eventify(BaseClass) {
    // 自动拥有 on, off, emit 等事件方法
}

const obj = new MyClass();
obj.on('custom-event', (data) => console.log(data));
obj.emit('custom-event', { message: 'Hello' });
```

### 4. 调度器的优先级队列

调度器(Scheduler)管理所有定时更新任务,采用优先级队列设计。

**核心设计:**
- 三个优先级列表: `_updatesNegList`(负优先级)、`_updates0List`(零优先级)、`_updatesPosList`(正优先级)
- 支持时间缩放(timeScale)实现慢动作/快进效果
- 对象池优化,减少内存分配

**更新流程:**
```typescript
update(dt: number) {
    dt *= this._timeScale;  // 应用时间缩放
    
    // 按优先级顺序执行
    this._updatesNegList.forEach(entry => entry.target.update(dt));
    this._updates0List.forEach(entry => entry.target.update(dt));
    this._updatesPosList.forEach(entry => entry.target.update(dt));
    
    // 处理自定义定时器
    this._arrayForTimers.forEach(element => {
        element.timers.forEach(timer => timer.update(dt));
    });
}
```

### 5. 数学库的不可变设计

数学类型(Vec2, Vec3, Mat4等)采用可变设计,但提供静态方法创建新实例。

**设计权衡:**
- **性能优先**: 避免频繁创建对象,提供原地修改方法
- **便捷性**: 提供 `v2()`, `v3()` 等工厂函数快速创建临时对象
- **类型安全**: TypeScript 类型系统确保正确使用

**使用模式:**
```typescript
const pos = v3(1, 2, 3);           // 创建临时向量
pos.add(v3(4, 5, 6));              // 原地修改
const newPos = v3().add(pos);      // 创建新向量

const matrix = mat4();
Mat4.translate(matrix, matrix, v3(1, 0, 0));  // 原地修改矩阵
```

### 6. 内存池优化

针对频繁创建销毁的对象,提供对象池(`Pool`)和缓存数组(`CachedArray`)。

**设计目标:**
- 减少 GC 压力
- 提高内存复用率
- 适用于高频使用的临时对象

**典型应用:**
```typescript
const pool = new Pool<Vec3>(() => new Vec3(), 100);

const temp = pool.alloc();  // 从池中获取
temp.set(1, 2, 3);
// 使用完毕
pool.free(temp);            // 归还到池中
```

## 核心组件详解

### 1. CCClass 类系统

**职责:**
- 管理类的继承关系
- 处理属性定义和验证
- 支持序列化和反序列化
- 集成编辑器元数据

**关键属性:**
- `__props__`: 所有属性列表
- `__values__`: 需要序列化的属性列表
- 属性特性: `default`, `type`, `visible`, `serializable` 等

### 2. CCObject 对象基类

**职责:**
- 统一的对象生命周期管理
- 销毁队列管理
- 状态标记系统

**关键方法:**
- `destroy()`: 标记对象待销毁
- `_destroyImmediate()`: 立即销毁(内部使用)
- `_destruct()`: 清理对象属性

### 3. Scheduler 调度器

**职责:**
- 管理帧更新回调
- 管理定时器
- 支持暂停/恢复
- 时间缩放控制

**关键方法:**
- `scheduleUpdate()`: 注册帧更新
- `schedule()`: 注册定时器
- `unschedule()`: 取消定时器
- `pauseTarget()` / `resumeTarget()`: 暂停/恢复

### 4. Eventify 事件系统

**职责:**
- 提供事件监听和分发能力
- 支持一次性监听
- 支持目标移除

**关键方法:**
- `on()`: 注册监听器
- `once()`: 注册一次性监听器
- `off()`: 移除监听器
- `emit()`: 触发事件

### 5. 数学库

**向量类:**
- `Vec2`: 2D 向量
- `Vec3`: 3D 向量
- `Vec4`: 4D 向量
- `Quat`: 四元数

**矩阵类:**
- `Mat3`: 3x3 矩阵
- `Mat4`: 4x4 矩阵

**其他:**
- `Color`: 颜色表示
- `Size`: 尺寸
- `Rect`: 矩形区域

### 6. 几何工具

**包围体:**
- `AABB`: 轴对齐包围盒
- `OBB`: 方向包围盒
- `Sphere`: 包围球

**射线和几何:**
- `Ray`: 射线
- `Plane`: 平面
- `Line`: 直线
- `Frustum`: 视锥体

## 代码示例

### 定义自定义组件

```typescript
import { _decorator, Component, Node, CCInteger } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: CCInteger, tooltip: '移动速度' })
    public speed: number = 10;
    
    @property({ type: Node, tooltip: '目标节点' })
    public target: Node | null = null;
    
    private _isMoving: boolean = false;
    
    start() {
        this._isMoving = true;
    }
    
    update(dt: number) {
        if (this._isMoving && this.target) {
            const direction = v3();
            Vec3.subtract(direction, this.target.worldPosition, this.node.worldPosition);
            direction.normalize();
            this.node.translate(direction.multiplyScalar(this.speed * dt));
        }
    }
}
```

### 使用事件系统

```typescript
import { EventTarget } from 'cc';

const eventTarget = new EventTarget();

// 注册监听
eventTarget.on('player-die', (score: number) => {
    console.log(`Game Over! Final Score: ${score}`);
});

// 触发事件
eventTarget.emit('player-die', 1000);

// 一次性监听
eventTarget.once('level-complete', () => {
    console.log('Level completed for the first time!');
});
```

### 使用调度器

```typescript
import { director } from 'cc';

const scheduler = director.getScheduler();

// 注册帧更新
scheduler.scheduleUpdate(this, 0, false);

// 注册定时器(每2秒执行一次,重复3次,延迟1秒开始)
scheduler.schedule((dt) => {
    console.log(`Timer ticked: ${dt}`);
}, this, 2, 3, 1, false);

// 取消定时器
scheduler.unschedule(callback, this);
```

### 使用对象池

```typescript
import { Pool, Vec3 } from 'cc';

const vec3Pool = new Pool<Vec3>(
    () => new Vec3(),  // 创建函数
    100                // 最大池大小
);

// 使用对象
const tempPos = vec3Pool.alloc();
tempPos.set(1, 2, 3);
// ... 使用 tempPos
vec3Pool.free(tempPos);  // 归还
```

### 几何计算

```typescript
import { geometry, Vec3 } from 'cc';
const { ray, AABB } = geometry;

// 创建射线
const rayInstance = ray.create(0, 0, 0, 0, 0, 1);

// 创建包围盒
const aabbInstance = new AABB();
aabbInstance.setCenter(v3(0, 0, 0));
aabbInstance.setHalfExtents(v3(1, 1, 1));

// 射线与包围盒相交测试
const distance = new Float32Array(1);
if (AABB.intersectRay(aabbInstance, rayInstance, distance)) {
    console.log(`Intersection at distance: ${distance[0]}`);
}
```

## 模块关联

### 上游依赖

Core 模块是引擎的最底层模块,不依赖其他业务模块,仅依赖:
- **TypeScript 运行时**: 类型系统和装饰器
- **平台常量**: `internal:constants` 提供编译时常量

### 下游依赖

几乎所有引擎模块都依赖 Core:

1. **Scene Graph (场景图)**
   - `Node` 继承自 `CCObject`
   - 使用事件系统处理节点事件
   - 使用数学库处理变换

2. **Game (游戏管理)**
   - 使用调度器管理游戏循环
   - 使用事件系统处理游戏事件

3. **GFX (图形接口)**
   - 使用数学库处理图形变换
   - 使用几何工具进行碰撞检测

4. **Animation (动画系统)**
   - 使用数学库进行插值计算
   - 使用调度器驱动动画更新

5. **UI (UI系统)**
   - 使用 `Vec2`, `Size`, `Rect` 处理布局
   - 使用事件系统处理用户交互

6. **Physics (物理系统)**
   - 使用几何工具进行碰撞检测
   - 使用数学库处理物理计算

7. **Rendering (渲染系统)**
   - 使用矩阵和向量处理渲染变换
   - 使用几何工具进行视锥裁剪

### 模块交互流程

```
Game Loop (游戏循环)
    ↓
Scheduler (调度器) [Core]
    ↓
┌───────────────┬──────────────┬─────────────┐
│               │              │             │
Animation    Physics       Rendering      UI
    │            │              │           │
    └────────────┴──────────────┴───────────┘
                    ↓
            Math Library [Core]
                    ↓
            Event System [Core]
```

## 设计模式应用

### 1. 装饰器模式 (Decorator Pattern)
- 用于类和属性定义
- 动态添加元数据和功能

### 2. 对象池模式 (Object Pool Pattern)
- `Pool`, `CachedArray` 实现
- 优化高频对象的创建销毁

### 3. 观察者模式 (Observer Pattern)
- `Eventify` 实现
- 解耦事件发送者和接收者

### 4. 单例模式 (Singleton Pattern)
- `director.getScheduler()` 提供全局调度器
- 确保关键系统唯一性

### 5. Mixin 模式
- `Eventify` 函数实现
- 灵活组合功能,避免多重继承

### 6. 状态模式 (State Pattern)
- `CCObjectFlags` 管理对象状态
- 位运算实现高效状态切换

## 性能优化策略

### 1. 内存优化
- 对象池减少 GC 压力
- 延迟销毁避免频繁内存操作
- 位标记减少内存占用

### 2. 计算优化
- 数学运算原地修改,避免创建临时对象
- 缓存计算结果
- JIT 编译优化(通过 `SUPPORT_JIT` 标记)

### 3. 调度优化
- 优先级队列减少排序开销
- 标记删除,避免遍历时修改列表
- 时间缩放统一处理

## 扩展性设计

### 1. 自定义装饰器
开发者可以基于 `CCClass` 创建自定义装饰器:

```typescript
export function customProperty(options: any) {
    return function(target: any, propertyKey: string) {
        // 自定义逻辑
        CCClass.Attr.setClassAttr(target.constructor, propertyKey, 'custom', options);
    };
}
```

### 2. 自定义 System
继承 `System` 类创建自定义系统:

```typescript
export class MyCustomSystem extends System {
    constructor() {
        super();
        this._id = 'MyCustomSystem';
        this._priority = System.Priority.MEDIUM;
    }
    
    update(dt: number) {
        // 自定义更新逻辑
    }
}

// 注册到 Director
director.registerSystem(MyCustomSystem.ID, new MyCustomSystem(), System.Priority.MEDIUM);
```

### 3. 扩展数学库
可以基于现有数学类创建扩展:

```typescript
export class MathExtensions {
    static lerpVec3(from: Vec3, to: Vec3, t: number, out: Vec3): Vec3 {
        out.x = from.x + (to.x - from.x) * t;
        out.y = from.y + (to.y - from.y) * t;
        out.z = from.z + (to.z - from.z) * t;
        return out;
    }
}
```

## 总结

Core 模块是 Cocos Creator 引擎的基石,其设计体现了以下核心思想:

1. **元编程优先**: 通过装饰器实现声明式开发,降低复杂度
2. **性能至上**: 对象池、位标记、原地修改等优化策略
3. **灵活组合**: Mixin 模式避免继承地狱
4. **生命周期管理**: 统一的对象创建销毁流程
5. **跨平台抽象**: 平台差异封装在底层

这些设计理念贯穿整个引擎架构,为上层模块提供了稳定、高效、易用的基础设施。理解 Core 模块的设计思想,对于深入掌握 Cocos Creator 引擎至关重要。
