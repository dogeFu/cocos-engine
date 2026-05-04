# Component — 组件与生命周期

## 概述

`Component` 是 Cocos Creator 的核心设计模式。所有游戏逻辑都通过组件实现，组件挂载到节点上，与节点组合形成完整的功能实体。组件拥有严格的生命周期回调，引擎在特定时机自动调用。

## 导入方式

```typescript
import { Component, _decorator } from 'cc';
const { ccclass, property } = _decorator;
```

## 基础用法

### 定义自定义组件

```typescript
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: Number })
    public speed: number = 100;

    start() {
    }

    update(deltaTime: number) {
        this.node.translate(new Vec3(0, 0, this.speed * deltaTime));
    }
}
```

### 添加与获取组件

```typescript
const player = new Node('Player');
const controller = player.addComponent(PlayerController);

const existing = player.getComponent(PlayerController);
const allComponents = player.getComponents(PlayerController);
const childComponent = player.getComponentInChildren(PlayerController);
const allChildComponents = player.getComponentsInChildren(PlayerController);
```

## 生命周期

组件生命周期按以下顺序执行：

```
onLoad → onEnable → start → update → lateUpdate → onDisable → onDestroy
```

### onLoad

节点首次激活时调用，仅在生命周期内调用一次。适合初始化操作。

```typescript
@ccclass('MyComponent')
export class MyComponent extends Component {
    private _rigidBody: RigidBody | null = null;

    onLoad() {
        this._rigidBody = this.getComponent(RigidBody);
    }
}
```

### onEnable / onDisable

组件的 `enabled` 属性或节点的 `active` 属性变化时触发。

```typescript
@ccclass('VisibilityController')
export class VisibilityController extends Component {
    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(event: EventKeyboard) {
    }
}
```

### start

组件第一次 `update` 之前调用，仅在生命周期内调用一次。适合需要依赖其他组件初始化完成的逻辑。

```typescript
@ccclass('GameController')
export class GameController extends Component {
    @property({ type: PlayerController })
    public player: PlayerController | null = null;

    start() {
        this.player?.node.setPosition(0, 0, 0);
    }
}
```

### update

每帧调用，参数为距上一帧的时间间隔（秒）。

```typescript
@ccclass('Rotator')
export class Rotator extends Component {
    @property({ type: Number })
    public rotateSpeed: number = 90;

    update(deltaTime: number) {
        const euler = this.node.eulerAngles;
        this.node.setRotationFromEuler(
            euler.x,
            euler.y + this.rotateSpeed * deltaTime,
            euler.z
        );
    }
}
```

### lateUpdate

所有组件的 `update` 执行完毕后调用。适合需要依赖其他组件 `update` 结果的逻辑（如摄像机跟随）。

```typescript
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node })
    public target: Node | null = null;

    lateUpdate(deltaTime: number) {
        if (!this.target) return;
        const targetPos = this.target.worldPosition;
        this.node.setWorldPosition(targetPos.x, targetPos.y + 10, targetPos.z);
    }
}
```

### onDestroy

组件销毁时调用，适合清理资源。

```typescript
@ccclass('ResourceManager')
export class ResourceManager extends Component {
    private _timer: number = 0;

    onLoad() {
        this._timer = setInterval(() => {}, 1000);
    }

    onDestroy() {
        clearInterval(this._timer);
    }
}
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `node` | `Node` | 挂载的节点（只读） |
| `enabled` | `boolean` | 组件是否启用 |
| `enabledInHierarchy` | `boolean` | 在层级中是否启用（只读） |
| `isValid` | `boolean` | 对象是否有效（只读） |
| `name` | `string` | 组件名称 |
| `uuid` | `string` | 唯一标识符（只读） |

## 核心方法

| 方法 | 说明 |
|------|------|
| `addComponent<T>(classType)` | 添加组件 |
| `getComponent<T>(classType)` | 获取组件 |
| `getComponents<T>(classType)` | 获取所有同类型组件 |
| `getComponentInChildren<T>(classType)` | 在子节点中查找组件 |
| `getComponentsInChildren<T>(classType)` | 在子节点中查找所有同类型组件 |
| `destroy()` | 销毁组件 |

## 进阶用法

### 组件启用/禁用控制

```typescript
const sprite = node.getComponent(Sprite);
if (sprite) {
    sprite.enabled = false;
    sprite.enabled = true;
}
```

> 禁用组件不会禁用节点，只是停止 `update`/`lateUpdate` 调用和触发 `onEnable`/`onDisable`。

### schedule 定时器

```typescript
@ccclass('SchedulerDemo')
export class SchedulerDemo extends Component {
    start() {
        this.schedule(this.onTick, 1);
        this.scheduleOnce(this.onDelay, 2);
        this.schedule(this.onRepeat, 0.5, 3);
    }

    private onTick() {
    }

    private onDelay() {
    }

    private onRepeat() {
    }

    stopAll() {
        this.unschedule(this.onTick);
        this.unscheduleAllCallbacks();
    }
}
```

### 组件间通信

```typescript
@ccclass('HealthComponent')
export class HealthComponent extends Component {
    @property({ type: Number })
    public maxHealth: number = 100;

    private _currentHealth: number = 100;

    public takeDamage(amount: number) {
        this._currentHealth -= amount;
        if (this._currentHealth <= 0) {
            this.node.emit('on-death');
        }
    }
}

@ccclass('EnemyAI')
export class EnemyAI extends Component {
    start() {
        this.node.on('on-death', this.onDeath, this);
    }

    private onDeath() {
        this.node.destroy();
    }
}
```

## 注意事项

- `onLoad` 在 `start` 之前调用，适合获取其他组件引用
- `update` 和 `lateUpdate` 仅在组件 `enabled` 且节点 `activeInHierarchy` 时调用
- `destroy()` 是异步操作，同一帧内组件仍然有效
- 组件不能独立存在，必须挂载到节点上
- 同一节点上不能添加多个相同类型的组件（除非该组件标记了 `@disallowMultiple(false)`）
