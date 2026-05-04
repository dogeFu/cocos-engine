# Event — 事件系统

## 概述

Cocos Creator 采用事件驱动架构，`EventTarget` 是事件系统的基类。`Node` 继承自 `EventTarget`，因此所有节点都可以发送和监听事件。引擎还提供了系统级事件（输入、物理碰撞等）。

## 导入方式

```typescript
import { EventTarget, Event, Node, input, Input, SystemEvent } from 'cc';
```

## 基础用法

### 独立事件目标

```typescript
const emitter = new EventTarget();

emitter.on('my-event', (arg1: string, arg2: number) => {
}, this);

emitter.emit('my-event', 'hello', 42);

emitter.off('my-event', callback, this);
```

### 节点事件

```typescript
const node = new Node('EventNode');

node.on('custom-event', (data: { score: number }) => {
}, this);

node.emit('custom-event', { score: 100 });
```

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `on` | `(type, callback, target?, once?) => void` | 注册事件监听 |
| `once` | `(type, callback, target?) => void` | 注册一次性监听 |
| `off` | `(type, callback?, target?) => void` | 取消事件监听 |
| `emit` | `(type, ...args) => void` | 发送事件 |
| `targetOff` | `(target) => void` | 移除目标的所有监听 |
| `removeAll` | `() => void` | 移除所有监听 |

## 节点内置事件

### 层级变化事件

```typescript
node.on(Node.EventType.CHILD_ADDED, (child: Node) => {
}, this);

node.on(Node.EventType.CHILD_REMOVED, (child: Node) => {
}, this);

node.on(Node.EventType.PARENT_CHANGED, (parent: Node | null) => {
}, this);

node.on(Node.EventType.SIBLING_ORDER_CHANGED, () => {
}, this);

node.on(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, (node: Node) => {
}, this);
```

### 触摸事件

```typescript
node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
    const location = event.getUILocation();
    event.propagationStopped = true;
}, this);

node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
    const delta = event.getUIDelta();
}, this);

node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
    const location = event.getUILocation();
}, this);

node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
}, this);
```

### 鼠标事件

```typescript
node.on(Node.EventType.MOUSE_DOWN, (event: EventMouse) => {
    const button = event.getButton();
    const location = event.getUILocation();
    event.propagationStopped = true;
}, this);

node.on(Node.EventType.MOUSE_MOVE, (event: EventMouse) => {
    const delta = event.getUIDelta();
}, this);

node.on(Node.EventType.MOUSE_UP, (event: EventMouse) => {
}, this);

node.on(Node.EventType.MOUSE_WHEEL, (event: EventMouse) => {
    const scrollY = event.getScrollY();
}, this);

node.on(Node.EventType.MOUSE_ENTER, (event: EventMouse) => {
}, this);

node.on(Node.EventType.MOUSE_LEAVE, (event: EventMouse) => {
}, this);
```

## 输入系统事件

### 键盘事件

```typescript
import { input, Input, EventKeyboard, KeyCode } from 'cc';

input.on(Input.EventType.KEY_DOWN, (event: EventKeyboard) => {
    if (event.keyCode === KeyCode.SPACE) {
    }
}, this);

input.on(Input.EventType.KEY_UP, (event: EventKeyboard) => {
}, this);
```

### 全局触摸/鼠标事件

```typescript
input.on(Input.EventType.TOUCH_START, (event: EventTouch) => {
}, this);

input.on(Input.EventType.TOUCH_MOVE, (event: EventTouch) => {
}, this);

input.on(Input.EventType.TOUCH_END, (event: EventTouch) => {
}, this);

input.on(Input.EventType.MOUSE_DOWN, (event: EventMouse) => {
}, this);

input.on(Input.EventType.MOUSE_MOVE, (event: EventMouse) => {
}, this);

input.on(Input.EventType.MOUSE_WHEEL, (event: EventMouse) => {
}, this);
```

### 设备方向传感器

```typescript
input.on(Input.EventType.DEVICEMOTION, (event: EventDeviceMotion) => {
    const acc = event.acc;
}, this);
```

## 进阶用法

### 事件冒泡与拦截

触摸事件和鼠标事件支持冒泡机制：事件从触发节点向父节点逐级传递。

```typescript
child.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
    event.propagationStopped = true;
}, this);

parent.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
}, this);
```

### 自定义事件系统

```typescript
@ccclass('EventBus')
export class EventBus extends Component {
    private static _instance: EventTarget | null = null;

    public static get instance(): EventTarget {
        if (!EventBus._instance) {
            EventBus._instance = new EventTarget();
        }
        return EventBus._instance;
    }
}

EventBus.instance.emit('score-changed', 100);
EventBus.instance.on('score-changed', (score: number) => {
}, this);
```

### 组件间事件通信

```typescript
@ccclass('DamageDealer')
export class DamageDealer extends Component {
    public attack(target: Node) {
        target.emit('on-damage', 25);
    }
}

@ccclass('DamageReceiver')
export class DamageReceiver extends Component {
    @property({ type: Number })
    public health: number = 100;

    onLoad() {
        this.node.on('on-damage', this.onDamage, this);
    }

    private onDamage(amount: number) {
        this.health -= amount;
        if (this.health <= 0) {
            this.node.emit('on-death');
        }
    }

    onDestroy() {
        this.node.off('on-damage', this.onDamage, this);
    }
}
```

### once 一次性监听

```typescript
node.once('level-complete', () => {
}, this);
```

### 批量清理事件

```typescript
onDestroy() {
    this.node.targetOff(this);
    input.targetOff(this);
}
```

## EventTouch 常用属性与方法

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `touch` | `Touch` | 触摸对象 |
| `getUILocation()` | `Vec2` | 获取 UI 坐标 |
| `getUIDelta()` | `Vec2` | 获取 UI 坐标偏移 |
| `getWorldLocation()` | `Vec2` | 获取世界坐标 |
| `propagationStopped` | `boolean` | 是否停止冒泡 |
| `swallowed` | `boolean` | 是否吞噬事件 |

## EventMouse 常用属性与方法

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `getButton()` | `number` | 鼠标按钮（0=左, 1=中, 2=右） |
| `getScrollY()` | `number` | 滚轮滚动量 |
| `getUILocation()` | `Vec2` | 获取 UI 坐标 |
| `getUIDelta()` | `Vec2` | 获取 UI 坐标偏移 |
| `propagationStopped` | `boolean` | 是否停止冒泡 |

## 注意事项

- 注册事件时传入 `target` 参数，方便后续通过 `targetOff` 批量移除
- `off` 时必须传入与 `on` 相同的回调函数引用和 target
- 触摸/鼠标事件支持冒泡，自定义事件不支持冒泡
- 在 `onDestroy` 中清理事件监听，避免内存泄漏
- `emit` 传递的参数数量不限，但回调函数签名需匹配
- `propagationStopped = true` 只阻止冒泡，不阻止同级监听
