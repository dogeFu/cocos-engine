# Scene Graph 场景图系统模块分析

## 模块作用

Scene Graph(场景图)模块是 Cocos Creator 的核心架构,负责管理游戏场景中的所有对象及其层级关系。它实现了经典的场景图数据结构,将游戏世界组织为一个树形结构,每个节点可以包含子节点和组件,形成完整的场景层次。

### 主要功能领域

1. **节点管理** - Node 类实现场景中的基本实体
2. **层级结构** - 父子关系管理和场景树遍历
3. **变换系统** - 本地坐标和世界坐标的转换
4. **组件系统** - 组件的挂载、生命周期管理
5. **场景管理** - Scene 类管理整个场景的生命周期
6. **层系统** - Layers 系统用于分组和筛选节点

## 设计理念

### 1. 组合模式 (Composite Pattern)

Scene Graph 模块的核心设计理念是组合模式,将对象组合成树形结构以表示"部分-整体"的层次结构。

**设计优势:**
- 统一处理单个节点和节点组合
- 递归遍历整棵场景树
- 灵活添加和删除节点

**树形结构:**
```
Scene (根节点)
├── Node1
│   ├── Node1_1
│   └── Node1_2
├── Node2
│   └── Node2_1
└── Node3
```

**实现原理:**
```typescript
class Node extends CCObject {
    protected _parent: Node | null = null;
    protected _children: Node[] = [];
    
    // 添加子节点
    addChild(child: Node): void {
        child._parent = this;
        this._children.push(child);
        child._setSiblingIndex(this._children.length - 1);
    }
    
    // 移除子节点
    removeChild(child: Node): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
            child._parent = null;
        }
    }
}
```

### 2. 组件模式 (Component Pattern)

Node 采用组件模式,将功能分离到独立的组件中,实现"组合优于继承"的设计原则。

**设计理念:**
- Node 本身只负责层级和变换
- 功能通过组件(Component)扩展
- 一个节点可以有多个组件

**组件生命周期:**
```
Node 激活
    ↓
Component.onLoad()
    ↓
Component.start()
    ↓
Component.update(dt)  // 每帧
    ↓
Component.lateUpdate(dt)
    ↓
Node 销毁
    ↓
Component.onDestroy()
```

**使用示例:**
```typescript
// 添加组件
const sprite = node.addComponent(Sprite);
const rigidBody = node.addComponent(RigidBody);

// 获取组件
const sprite = node.getComponent(Sprite);
const allSprites = node.getComponentsInChildren(Sprite);
```

### 3. 变换系统设计

Node 维护两套坐标系统:本地坐标(Local)和世界坐标(World)。

**核心概念:**
- **本地变换**: 相对于父节点的位置、旋转、缩放
- **世界变换**: 相对于场景根节点的绝对变换
- **变换继承**: 子节点继承父节点的变换

**变换更新机制:**
```typescript
class Node {
    protected _pos: Vec3;           // 本地位置
    protected _rot: Quat;           // 本地旋转
    protected _scale: Vec3;         // 本地缩放
    protected _mat: Mat4;           // 本地变换矩阵
    protected _worldPos: Vec3;      // 世界位置
    protected _worldRot: Quat;      // 世界旋转
    protected _worldScale: Vec3;    // 世界缩放
    protected _worldMat: Mat4;      // 世界变换矩阵
    protected _dirtyFlags: number;  // 脏标记
    
    // 设置本地位置
    setPosition(x: number, y: number, z: number): void {
        this._pos.set(x, y, z);
        this._dirtyFlags |= TransformBit.POSITION;
        this.invalidateChildren();
    }
    
    // 获取世界位置
    getWorldPosition(out: Vec3): Vec3 {
        this.updateWorldTransform();
        return Vec3.copy(out, this._worldPos);
    }
    
    // 更新世界变换
    updateWorldTransform(): void {
        if (this._dirtyFlags) {
            if (this._parent) {
                // 组合父节点的世界变换
                Mat4.fromRTS(this._mat, this._rot, this._pos, this._scale);
                Mat4.multiply(this._worldMat, this._parent._worldMat, this._mat);
            } else {
                Mat4.copy(this._worldMat, this._mat);
            }
            this._dirtyFlags = 0;
        }
    }
}
```

**脏标记机制:**
- 使用位标记记录哪些变换需要更新
- 避免不必要的矩阵计算
- 延迟更新,按需计算

### 4. 激活状态管理

Node 实现了完善的激活状态管理系统,区分自身激活状态和层级激活状态。

**两种激活状态:**
- `active`: 节点自身的激活状态
- `activeInHierarchy`: 在场景中的实际激活状态(受父节点影响)

**状态传播:**
```typescript
set active(value: boolean) {
    if (this._active !== value) {
        this._active = value;
        const parent = this._parent;
        if (parent && parent._activeInHierarchy) {
            // 父节点激活,触发子节点激活/反激活
            director._nodeActivator.activateNode(this, value);
        }
    }
}

get activeInHierarchy(): boolean {
    return this._activeInHierarchy;
}
```

**激活流程:**
```
Node.active = true
    ↓
检查父节点是否激活
    ↓
激活所有组件 (onLoad, start)
    ↓
递归激活所有激活的子节点
```

### 5. 场景树遍历

Scene Graph 提供了高效的场景树遍历机制。

**深度优先遍历:**
```typescript
walk(callback: (node: Node) => void): void {
    const stack: Node[] = [this];
    while (stack.length > 0) {
        const node = stack.pop()!;
        callback(node);
        // 逆序入栈,保证顺序遍历
        for (let i = node._children.length - 1; i >= 0; i--) {
            stack.push(node._children[i]);
        }
    }
}
```

**递归遍历:**
```typescript
walkRecursive(callback: (node: Node) => void): void {
    callback(this);
    for (const child of this._children) {
        child.walkRecursive(callback);
    }
}
```

### 6. 层系统设计

Layers 系统使用位掩码实现节点的分组和筛选。

**设计理念:**
- 使用 32 位整数存储层信息
- 每个位代表一个层
- 支持多层级组合

**内置层:**
```typescript
const layerList = {
    NONE: 0,
    IGNORE_RAYCAST: (1 << 20),  // 忽略射线检测
    GIZMOS: (1 << 21),          // 编辑器辅助
    EDITOR: (1 << 22),          // 编辑器专用
    UI_3D: (1 << 23),           // 3D UI
    SCENE_GIZMO: (1 << 24),     // 场景辅助
    UI_2D: (1 << 25),           // 2D UI
    PROFILER: (1 << 28),        // 性能分析
    DEFAULT: (1 << 30),         // 默认层
    ALL: 0xffffffff,            // 所有层
};
```

**使用场景:**
```typescript
// 设置节点层
node.layer = Layers.Enum.UI_2D | Layers.Enum.DEFAULT;

// 创建包含式过滤器
const mask = Layers.makeMaskInclude([Layers.Enum.UI_2D]);

// 创建排除式过滤器
const excludeMask = Layers.makeMaskExclude([Layers.Enum.IGNORE_RAYCAST]);

// 检测层
if (node.layer & mask) {
    // 节点在指定层中
}
```

## 核心组件详解

### 1. Node 节点类

**职责:**
- 场景中的基本实体
- 管理层级关系
- 维护变换信息
- 管理组件生命周期

**关键属性:**
- `name`: 节点名称
- `uuid`: 唯一标识符
- `parent`: 父节点
- `children`: 子节点数组
- `active`: 自身激活状态
- `activeInHierarchy`: 层级激活状态
- `layer`: 节点层
- `position`, `rotation`, `scale`: 本地变换
- `worldPosition`, `worldRotation`, `worldScale`: 世界变换

**关键方法:**
- `addChild()`: 添加子节点
- `removeChild()`: 移除子节点
- `addComponent()`: 添加组件
- `getComponent()`: 获取组件
- `setPosition()`, `setRotation()`, `setScale()`: 设置本地变换
- `getWorldPosition()`, `getWorldRotation()`, `getWorldScale()`: 获取世界变换
- `walk()`: 遍历子树

### 2. Scene 场景类

**职责:**
- 场景的根节点
- 管理场景生命周期
- 关联渲染场景
- 管理场景全局设置

**关键属性:**
- `renderScene`: 关联的渲染场景
- `globals`: 场景全局设置(光照、雾效等)
- `autoReleaseAssets`: 是否自动释放资源

**关键方法:**
- `_load()`: 加载场景
- `_activate()`: 激活场景
- `destroy()`: 销毁场景

### 3. Component 组件基类

**职责:**
- 定义组件生命周期
- 提供节点访问接口
- 管理组件状态

**生命周期方法:**
```typescript
class Component {
    onLoad(): void {}       // 加载时调用
    start(): void {}        // 第一次 update 之前调用
    update(dt: number): void {}  // 每帧更新
    lateUpdate(dt: number): void {}  // 延迟更新
    onDestroy(): void {}    // 销毁时调用
    onEnable(): void {}     // 激活时调用
    onDisable(): void {}    // 反激活时调用
}
```

### 4. Layers 层管理器

**职责:**
- 管理节点层定义
- 提供层过滤工具
- 支持自定义层

**关键方法:**
- `addLayer()`: 添加自定义层
- `deleteLayer()`: 删除自定义层
- `makeMaskInclude()`: 创建包含式过滤器
- `makeMaskExclude()`: 创建排除式过滤器
- `nameToLayer()`: 层名转层值
- `layerToName()`: 层值转层名

## 代码示例

### 创建场景结构

```typescript
import { Node, Scene, director } from 'cc';

// 创建场景
const scene = new Scene('MainScene');

// 创建节点层级
const rootNode = new Node('Root');
const playerNode = new Node('Player');
const weaponNode = new Node('Weapon');

// 构建层级关系
scene.addChild(rootNode);
rootNode.addChild(playerNode);
playerNode.addChild(weaponNode);

// 设置变换
rootNode.setPosition(0, 0, 0);
playerNode.setPosition(10, 0, 0);
weaponNode.setPosition(1, 0, 0);  // 相对于 Player

// 获取世界位置
const worldPos = v3();
weaponNode.getWorldPosition(worldPos);
console.log('Weapon world position:', worldPos);  // (11, 0, 0)
```

### 组件系统使用

```typescript
import { Component, Sprite, RigidBody } from 'cc';

// 自定义组件
class PlayerController extends Component {
    public speed: number = 10;
    
    start() {
        console.log('Player started');
    }
    
    update(dt: number) {
        // 每帧更新逻辑
        this.node.translate(v3(this.speed * dt, 0, 0));
    }
}

// 使用组件
const player = new Node('Player');
const controller = player.addComponent(PlayerController);
controller.speed = 20;

const sprite = player.addComponent(Sprite);
sprite.spriteFrame = someSpriteFrame;

const rigidBody = player.addComponent(RigidBody);
rigidBody.type = RigidBody.Type.DYNAMIC;

// 获取组件
const ctrl = player.getComponent(PlayerController);
const allSprites = player.getComponentsInChildren(Sprite);
```

### 节点查找和遍历

```typescript
// 查找节点
const player = find('Canvas/Player');
const child = node.getChildByName('Weapon');
const childByPath = node.getChildByPath('Body/Hand/Weapon');

// 遍历子节点
node.children.forEach(child => {
    console.log(child.name);
});

// 深度遍历
scene.walk((node) => {
    console.log('Visiting:', node.name);
    // 处理节点
});

// 查找组件
const camera = node.getComponentInChildren(Camera);
const allLights = node.getComponentsInTree(Light);
```

### 层系统使用

```typescript
import { Layers } from 'cc';

// 设置节点层
node.layer = Layers.Enum.DEFAULT | Layers.Enum.UI_2D;

// 射线检测时过滤层
const mask = Layers.makeMaskInclude([Layers.Enum.DEFAULT]);
const ray = geometry.ray.create(0, 0, 0, 0, 0, 1);
const results = physics.raycast(ray, mask);

// 渲染时排除层
const excludeMask = Layers.makeMaskExclude([Layers.Enum.IGNORE_RAYCAST]);
camera.cullingMask = excludeMask;

// 添加自定义层
Layers.addLayer('Enemy', 10);
node.layer = Layers.Enum.Enemy;
```

### 节点激活控制

```typescript
// 激活/反激活节点
node.active = false;  // 反激活节点及其子节点

// 检查激活状态
if (node.activeInHierarchy) {
    console.log('Node is active in scene');
}

// 动态创建和销毁节点
function spawnEnemy() {
    const enemy = new Node('Enemy');
    enemy.addComponent(EnemyController);
    scene.addChild(enemy);
    
    // 3秒后销毁
    setTimeout(() => {
        enemy.destroy();
    }, 3000);
}
```

## 模块关联

### 上游依赖

Scene Graph 模块依赖以下基础模块:

1. **Core**
   - 继承 `CCObject`,使用对象生命周期管理
   - 使用事件系统处理节点事件
   - 使用数学库进行变换计算
   - 使用调度器驱动组件更新

2. **Serialization**
   - 场景和节点的序列化/反序列化
   - Prefab 系统支持

### 下游依赖

Scene Graph 是引擎的核心模块,被以下模块依赖:

1. **Game**
   - Director 使用 Scene 管理场景切换
   - 游戏循环驱动场景更新

2. **Rendering**
   - 渲染场景关联到 Scene
   - 渲染器遍历场景树进行渲染

3. **2D/3D**
   - 2D 和 3D 组件挂载到 Node
   - 使用变换系统定位对象

4. **UI**
   - UI 组件基于 Node 实现
   - UI 布局系统依赖场景图

5. **Physics**
   - 物理组件挂载到 Node
   - 物理世界与场景图同步

6. **Animation**
   - 动画系统驱动 Node 变换
   - 动画组件挂载到 Node

### 模块交互流程

```
Game Loop
    ↓
Director
    ↓
Scene Graph
    ├─ Node Activation
    ├─ Component Lifecycle
    ├─ Transform Update
    └─ Event Dispatch
        ↓
    ┌───────┬───────┬───────┐
    │ 2D    │ 3D    │ UI    │
    └───────┴───────┴───────┘
        ↓
    Rendering
```

## 设计模式应用

### 1. 组合模式 (Composite Pattern)
- Node 和 Scene 形成树形结构
- 统一处理单个节点和节点组合

### 2. 组件模式 (Component Pattern)
- Node 持有多个 Component
- 功能通过组件扩展,而非继承

### 3. 观察者模式 (Observer Pattern)
- 节点事件系统
- 组件生命周期回调

### 4. 迭代器模式 (Iterator Pattern)
- `walk()` 方法遍历场景树
- 统一的遍历接口

### 5. 状态模式 (State Pattern)
- 激活状态管理
- 组件状态机

## 性能优化策略

### 1. 变换缓存
- 使用脏标记延迟计算
- 缓存世界变换矩阵
- 避免重复计算

### 2. 批量更新
- 批量激活/反激活节点
- 批量更新组件

### 3. 空间分割
- 场景树自然形成空间分割
- 支持视锥裁剪

### 4. 对象池
- 节点和组件池化
- 减少内存分配

## 扩展性设计

### 1. 自定义组件
开发者可以创建自定义组件:

```typescript
@ccclass('CustomComponent')
export class CustomComponent extends Component {
    @property({ type: CCFloat })
    public customValue: number = 0;
    
    start() {
        // 初始化逻辑
    }
    
    update(dt: number) {
        // 更新逻辑
    }
}
```

### 2. 自定义节点行为
可以通过继承 Node 创建特殊节点:

```typescript
export class SpecialNode extends Node {
    constructor(name: string) {
        super(name);
        // 特殊初始化
    }
    
    customMethod() {
        // 自定义方法
    }
}
```

### 3. 自定义层
可以添加自定义层用于分组:

```typescript
// 添加自定义层
Layers.addLayer('Enemy', 10);
Layers.addLayer('Player', 11);

// 使用自定义层
enemyNode.layer = Layers.Enum.Enemy;
playerNode.layer = Layers.Enum.Player;
```

## 总结

Scene Graph 模块是 Cocos Creator 的核心架构,其设计体现了以下核心思想:

1. **组合优于继承**: 通过组件模式实现功能扩展,保持 Node 类的简洁
2. **树形结构**: 使用组合模式组织场景对象,形成自然的层级关系
3. **变换系统**: 双层坐标系统和脏标记机制,高效处理空间变换
4. **生命周期管理**: 完善的激活状态和组件生命周期管理
5. **性能优化**: 缓存、延迟计算、批量更新等策略提升性能

理解 Scene Graph 模块的设计理念,对于掌握 Cocos Creator 的整体架构、实现自定义组件、优化场景性能都至关重要。Scene Graph 为整个引擎提供了坚实的场景管理基础,是游戏世界的骨架。
