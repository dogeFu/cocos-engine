# Input — 输入系统

## 概述

`input` 是全局输入管理器，负责处理键盘、鼠标、触摸和设备传感器等输入事件。所有输入事件通过 `input.on()` 注册监听。

## 导入方式

```typescript
import { input, Input, EventKeyboard, EventMouse, EventTouch, KeyCode } from 'cc';
```

## 基础用法

### 键盘事件

```typescript
input.on(Input.EventType.KEY_DOWN, (event: EventKeyboard) => {
    switch (event.keyCode) {
        case KeyCode.KEY_W:
            break;
        case KeyCode.KEY_A:
            break;
        case KeyCode.KEY_S:
            break;
        case KeyCode.KEY_D:
            break;
        case KeyCode.SPACE:
            break;
    }
}, this);

input.on(Input.EventType.KEY_UP, (event: EventKeyboard) => {
}, this);
```

### 鼠标事件

```typescript
input.on(Input.EventType.MOUSE_DOWN, (event: EventMouse) => {
    const button = event.getButton();
    const location = event.getUILocation();
}, this);

input.on(Input.EventType.MOUSE_MOVE, (event: EventMouse) => {
    const delta = event.getUIDelta();
    const location = event.getUILocation();
}, this);

input.on(Input.EventType.MOUSE_UP, (event: EventMouse) => {
}, this);

input.on(Input.EventType.MOUSE_WHEEL, (event: EventMouse) => {
    const scrollY = event.getScrollY();
}, this);
```

### 触摸事件

```typescript
input.on(Input.EventType.TOUCH_START, (event: EventTouch) => {
    const location = event.getUILocation();
    const id = event.getID();
}, this);

input.on(Input.EventType.TOUCH_MOVE, (event: EventTouch) => {
    const delta = event.getUIDelta();
}, this);

input.on(Input.EventType.TOUCH_END, (event: EventTouch) => {
}, this);

input.on(Input.EventType.TOUCH_CANCEL, (event: EventTouch) => {
}, this);
```

## 事件类型

### Input.EventType

| 事件 | 说明 |
|------|------|
| `KEY_DOWN` | 键盘按下 |
| `KEY_UP` | 键盘抬起 |
| `MOUSE_DOWN` | 鼠标按下 |
| `MOUSE_MOVE` | 鼠标移动 |
| `MOUSE_UP` | 鼠标抬起 |
| `MOUSE_WHEEL` | 鼠标滚轮 |
| `TOUCH_START` | 触摸开始 |
| `TOUCH_MOVE` | 触摸移动 |
| `TOUCH_END` | 触摸结束 |
| `TOUCH_CANCEL` | 触摸取消 |
| `DEVICEMOTION` | 设备运动 |

## EventKeyboard 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `keyCode` | `KeyCode` | 按键码 |

## EventMouse 方法

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| `getButton()` | `number` | 鼠标按钮（0=左,1=中,2=右） |
| `getScrollY()` | `number` | 滚轮量 |
| `getUILocation()` | `Vec2` | UI 坐标 |
| `getUIDelta()` | `Vec2` | UI 坐标偏移 |
| `getWorldLocation()` | `Vec2` | 世界坐标 |

## EventTouch 方法

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| `getID()` | `number` | 触摸 ID |
| `getUILocation()` | `Vec2` | UI 坐标 |
| `getUIDelta()` | `Vec2` | UI 坐标偏移 |
| `getWorldLocation()` | `Vec2` | 世界坐标 |

## 进阶用法

### 完整输入控制器

```typescript
@ccclass('InputController')
export class InputController extends Component {
    private _keys: Set<number> = new Set();

    start() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(event: EventKeyboard) {
        this._keys.add(event.keyCode);
    }

    private onKeyUp(event: EventKeyboard) {
        this._keys.delete(event.keyCode);
    }

    public isKeyDown(keyCode: number): boolean {
        return this._keys.has(keyCode);
    }

    update(dt: number) {
        const speed = 5;
        const direction = new Vec3();
        if (this.isKeyDown(KeyCode.KEY_W)) direction.z -= 1;
        if (this.isKeyDown(KeyCode.KEY_S)) direction.z += 1;
        if (this.isKeyDown(KeyCode.KEY_A)) direction.x -= 1;
        if (this.isKeyDown(KeyCode.KEY_D)) direction.x += 1;

        if (direction.length() > 0) {
            Vec3.normalize(direction, direction);
            Vec3.scale(direction, direction, speed * dt);
            this.node.translate(direction);
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }
}
```

### 设备方向传感器

```typescript
input.on(Input.EventType.DEVICEMOTION, (event: EventDeviceMotion) => {
    const acc = event.acc;
    const x = acc.x;
    const y = acc.y;
    const z = acc.z;
}, this);
```

### 清理事件监听

```typescript
onDestroy() {
    input.targetOff(this);
}
```

## 注意事项

- `input` 是全局单例，事件在所有节点之前触发
- 节点级触摸事件（`node.on(Node.EventType.TOUCH_START)`）有冒泡机制，`input` 事件没有
- 键盘事件在移动端可能不可用
- 鼠标事件在触摸设备上会转换为触摸事件
- 使用 `targetOff(this)` 可以批量移除指定 target 的所有监听
- `EventTouch.getID()` 在多点触控时区分不同触摸点
