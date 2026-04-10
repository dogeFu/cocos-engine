# Input 输入系统模块分析

## 模块作用

Input 模块是 Cocos Creator 的输入管理系统,负责处理所有用户输入,包括触摸、鼠标、键盘、游戏手柄、加速度计等。它提供统一的输入接口,支持跨平台的输入事件处理,是游戏交互的基础。

### 主要功能领域

1. **触摸输入** - 触摸事件和手势识别
2. **鼠标输入** - 鼠标点击、移动、滚轮
3. **键盘输入** - 按键事件和组合键
4. **游戏手柄** - 手柄按键和摇杆
5. **加速度计** - 设备运动感应
6. **自定义输入** - 输入映射和虚拟按键

## 设计理念

### 1. 事件驱动的输入系统

Input 模块采用事件驱动架构,所有输入通过事件系统分发。

**事件类型:**
- `TOUCH_START`: 触摸开始
- `TOUCH_MOVE`: 触摸移动
- `TOUCH_END`: 触摸结束
- `MOUSE_DOWN`: 鼠标按下
- `MOUSE_MOVE`: 鼠标移动
- `MOUSE_UP`: 鼠标释放
- `KEY_DOWN`: 键盘按下
- `KEY_UP`: 键盘释放

**事件分发:**
```typescript
// 监听触摸事件
input.on(Input.EventType.TOUCH_START, (event: EventTouch) => {
    const location = event.getUILocation();
    console.log('Touch at:', location);
});

// 监听键盘事件
input.on(Input.EventType.KEY_DOWN, (event: EventKeyboard) => {
    if (event.keyCode === KeyCode.SPACE) {
        console.log('Space key pressed');
    }
});
```

### 2. 输入事件优先级

Input 模块支持事件优先级和事件拦截。

**优先级机制:**
```typescript
// 高优先级监听器
input.on(Input.EventType.TOUCH_START, (event) => {
    event.propagationStopped = true;  // 停止传播
}, this, 100);  // 优先级 100

// 低优先级监听器
input.on(Input.EventType.TOUCH_START, (event) => {
    // 不会被调用,因为事件已被拦截
}, this, 0);
```

### 3. 触摸事件系统

Input 模块实现了完整的触摸事件处理。

**触摸信息:**
```typescript
class EventTouch extends Event {
    getTouches(): Touch[];           // 获取所有触摸点
    getUILocation(): Vec2;           // 获取 UI 坐标
    getUILocationX(): number;        // 获取 UI X 坐标
    getUILocationY(): number;        // 获取 UI Y 坐标
    getDelta(): Vec2;                // 获取移动增量
    getStartLocation(): Vec2;        // 获取起始位置
}
```

**多点触控:**
```typescript
input.on(Input.EventType.TOUCH_START, (event: EventTouch) => {
    const touches = event.getTouches();
    console.log('Touch count:', touches.length);
    
    for (const touch of touches) {
        const location = touch.getUILocation();
        console.log(`Touch ${touch.id} at:`, location);
    }
});
```

### 4. 键盘输入系统

Input 模块提供完整的键盘输入支持。

**键盘事件:**
```typescript
// 监听按键按下
input.on(Input.EventType.KEY_DOWN, (event: EventKeyboard) => {
    const keyCode = event.keyCode;
    console.log('Key down:', keyCode);
    
    // 检测组合键
    if (event.keyCode === KeyCode.CTRL && event.keyCode === KeyCode.C) {
        console.log('Ctrl+C pressed');
    }
});

// 监听按键释放
input.on(Input.EventType.KEY_UP, (event: EventKeyboard) => {
    console.log('Key up:', event.keyCode);
});
```

**按键状态查询:**
```typescript
// 检查按键是否按下
if (input.getKey(KeyCode.W)) {
    // W 键被按下
    player.moveForward();
}

// 检查按键是否刚按下
if (input.getKeyDown(KeyCode.SPACE)) {
    // 空格键刚按下
    player.jump();
}

// 检查按键是否刚释放
if (input.getKeyUp(KeyCode.ESCAPE)) {
    // ESC 键刚释放
    game.pause();
}
```

### 5. 鼠标输入系统

Input 模块支持鼠标的所有输入事件。

**鼠标事件:**
```typescript
// 鼠标按下
input.on(Input.EventType.MOUSE_DOWN, (event: EventMouse) => {
    const button = event.getButton();
    const location = event.getUILocation();
    console.log(`Mouse button ${button} at:`, location);
});

// 鼠标移动
input.on(Input.EventType.MOUSE_MOVE, (event: EventMouse) => {
    const delta = event.getDelta();
    const location = event.getUILocation();
    console.log('Mouse moved:', delta);
});

// 鼠标滚轮
input.on(Input.EventType.MOUSE_WHEEL, (event: EventMouse) => {
    const scrollY = event.getScrollY();
    console.log('Scroll:', scrollY);
});
```

## 核心组件详解

### 1. Input 输入管理器

**职责:**
- 管理所有输入事件
- 分发输入事件
- 维护输入状态

**关键方法:**
- `on()`: 注册事件监听
- `off()`: 移除事件监听
- `getKey()`: 查询按键状态
- `getKeyDown()`: 查询按键刚按下
- `getKeyUp()`: 查询按键刚释放

### 2. EventTouch 触摸事件

**职责:**
- 封装触摸信息
- 提供触摸坐标转换
- 支持多点触控

**关键属性:**
- `touches`: 触摸点列表
- `touch`: 当前触摸点

### 3. EventKeyboard 键盘事件

**职责:**
- 封装键盘信息
- 提供按键码

**关键属性:**
- `keyCode`: 按键码
- `isPressed`: 是否按下

### 4. EventMouse 鼠标事件

**职责:**
- 封装鼠标信息
- 提供鼠标位置和按钮

**关键属性:**
- `button`: 鼠标按钮
- `scrollY`: 滚轮值

## 代码示例

### 触摸控制

```typescript
import { input, Input, EventTouch, Vec2 } from 'cc';

class PlayerController extends Component {
    private _touchStartPos: Vec2 = new Vec2();
    
    start() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }
    
    onTouchStart(event: EventTouch) {
        this._touchStartPos = event.getUILocation();
    }
    
    onTouchMove(event: EventTouch) {
        const location = event.getUILocation();
        const delta = location.subtract(this._touchStartPos);
        
        // 根据滑动方向移动角色
        if (Math.abs(delta.x) > Math.abs(delta.y)) {
            if (delta.x > 0) this.moveRight();
            else this.moveLeft();
        } else {
            if (delta.y > 0) this.moveUp();
            else this.moveDown();
        }
    }
    
    onTouchEnd(event: EventTouch) {
        this.stopMove();
    }
}
```

### 键盘控制

```typescript
import { input, Input, KeyCode } from 'cc';

class PlayerController extends Component {
    update(dt: number) {
        // 持续检测按键状态
        if (input.getKey(KeyCode.W) || input.getKey(KeyCode.ARROW_UP)) {
            this.moveForward(dt);
        }
        if (input.getKey(KeyCode.S) || input.getKey(KeyCode.ARROW_DOWN)) {
            this.moveBackward(dt);
        }
        if (input.getKey(KeyCode.A) || input.getKey(KeyCode.ARROW_LEFT)) {
            this.moveLeft(dt);
        }
        if (input.getKey(KeyCode.D) || input.getKey(KeyCode.ARROW_RIGHT)) {
            this.moveRight(dt);
        }
        
        // 检测按键刚按下
        if (input.getKeyDown(KeyCode.SPACE)) {
            this.jump();
        }
    }
}
```

### 鼠标交互

```typescript
import { input, Input, EventMouse } from 'cc';

class MouseController extends Component {
    start() {
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }
    
    onMouseDown(event: EventMouse) {
        const button = event.getButton();
        if (button === EventMouse.BUTTON_LEFT) {
            this.onLeftClick(event.getUILocation());
        } else if (button === EventMouse.BUTTON_RIGHT) {
            this.onRightClick(event.getUILocation());
        }
    }
    
    onMouseMove(event: EventMouse) {
        const location = event.getUILocation();
        this.updateCursor(location);
    }
    
    onMouseWheel(event: EventMouse) {
        const scrollY = event.getScrollY();
        this.zoom(scrollY > 0 ? 1.1 : 0.9);
    }
}
```

## 模块关联

### 上游依赖

Input 模块依赖:
- **Core**: 事件系统、数学库
- **Platform**: 平台输入接口

### 下游依赖

Input 模块被以下模块使用:
- **UI**: UI 交互
- **Physics**: 射线检测交互
- **Game**: 游戏控制

## 性能优化策略

### 1. 事件池化
- 复用事件对象
- 减少内存分配

### 2. 事件过滤
- 按需监听事件
- 及时移除监听器

### 3. 事件节流
- 限制高频事件处理
- 使用节流和防抖

## 总结

Input 模块是 Cocos Creator 交互系统的基础,其设计体现了:

1. **事件驱动**: 统一的事件分发机制
2. **跨平台**: 支持多种输入设备
3. **优先级**: 灵活的事件处理顺序
4. **易用性**: 简洁的 API 设计
5. **扩展性**: 支持自定义输入设备

理解 Input 模块的设计理念,对于实现流畅的游戏交互至关重要。
