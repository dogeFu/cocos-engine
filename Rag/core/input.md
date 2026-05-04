# Cocos Creator 引擎 — 输入系统

> 面向 AI 辅助编程的中文参考文档。覆盖触摸、鼠标、键盘事件和输入分发机制。

---

## 目录

1. [input 全局输入管理器](#1-input-全局输入管理器)
2. [触摸事件](#2-触摸事件)
3. [鼠标事件](#3-鼠标事件)
4. [键盘事件](#4-键盘事件)
5. [加速度计与陀螺仪](#5-加速度计与陀螺仪)
6. [隐含知识与陷阱](#6-隐含知识与陷阱)

---

## 1. input 全局输入管理器

### 1.1 input（`cocos/input/input.ts`）

全局输入管理器。继承 `EventTarget`。

**单例：** `input`

#### InputEventType 枚举

| 事件类型 | 说明 |
|---|---|
| `TOUCH_START` | 触摸开始 |
| `TOUCH_MOVE` | 触摸移动 |
| `TOUCH_END` | 触摸结束 |
| `TOUCH_CANCEL` | 触摸取消 |
| `MOUSE_DOWN` | 鼠标按下 |
| `MOUSE_MOVE` | 鼠标移动 |
| `MOUSE_UP` | 鼠标释放 |
| `MOUSE_WHEEL` | 鼠标滚轮 |
| `KEY_DOWN` | 键盘按下 |
| `KEY_UP` | 键盘释放 |
| `DEVICEMOTION` | 设备运动 |
| `GAMEPAD_CHANGE` | 手柄变化 |
| `GAMEPAD_INPUT` | 手柄输入 |
| `HANDLE_INPUT` | XR 手柄输入 |
| `HANDLE_TOUCH` | XR 手柄触摸 |

#### 关键方法

- `on(type, callback, target?)`：注册输入事件监听
- `off(type, callback?, target?)`：移除监听
- `hasEventListener(type)`：检查是否有监听器

### 1.2 输入分发流程

```
平台事件 → pal/input/ 平台适配层
  → input._dispatchEvent(event)
    → 全局监听器回调
    → 节点级事件分发（触摸/鼠标）
      → 捕获阶段（父到子）
      → 目标阶段
      → 冒泡阶段（子到父）
```

**关键：** `input._frameDispatchEvents()` 在 `director.tick()` 的 `BEGIN_FRAME` 之后调用，确保输入事件在组件 `update()` 之前处理。

---

## 2. 触摸事件

### 2.1 EventTouch（`cocos/input/types/event-touch.ts`）

触摸事件。

#### 关键属性

- `touch`：`Touch | null` — 当前触摸点
- `touches`：`Touch[]` — 所有活跃触摸点
- `changedTouches`：`Touch[]` — 变化的触摸点
- `inputEvent`：`InputEvent` — 原始输入事件

#### 关键方法

- `getTouches()`：获取所有触摸点（仅当前事件的 changedTouches）
- `getAllTouches()`：获取所有活跃触摸点
- `getUILocation(out?)`：获取 UI 坐标
- `getUIStartLocation(out?)`：获取起始 UI 坐标
- `getLocation(out?)`：获取 OpenGL 坐标
- `getStartLocation(out?)`：获取起始 OpenGL 坐标
- `getDelta(out?)`：获取增量
- `getUIDelta(out?)`：获取 UI 增量
- `getPreviousLocation(out?)`：获取上一个位置

### 2.2 Touch（`cocos/input/types/touch.ts`）

触摸点数据。

#### 关键属性

- `id`：`number` — 触摸点 ID
- `x` / `y`：当前坐标
- `prevX` / `prevY`：上一个坐标
- `startX` / `startY`：起始坐标
- `lastModified`：`number` — 最后修改时间

#### 关键方法

- `getLocation(out?)`：获取 OpenGL 坐标
- `getUILocation(out?)`：获取 UI 坐标
- `getDelta(out?)`：获取增量
- `getUIDelta(out?)`：获取 UI 增量
- `getStartLocation(out?)`：获取起始位置
- `getUIStartLocation(out?)`：获取起始 UI 位置
- `getPreviousLocation(out?)`：获取上一个位置
- `getUIPreviousLocation(out?)`：获取上一个 UI 位置

### 2.3 getTouches() vs getAllTouches()

**关键区别：**
- `getTouches()` 返回当前事件的 `changedTouches`（仅变化的触摸点）
- `getAllTouches()` 返回所有活跃的触摸点

在 `TOUCH_START` 事件中：
- `getTouches()` = 新按下的触摸点
- `getAllTouches()` = 所有正在触摸的点

在 `TOUCH_MOVE` 事件中：
- `getTouches()` = 移动的触摸点
- `getAllTouches()` = 所有正在触摸的点

### 2.4 触摸事件冒泡

触摸事件通过场景图冒泡：

1. **命中测试**：从后向前遍历渲染节点，找到第一个包含触摸点的节点
2. **捕获阶段**：从场景根节点到目标节点的路径，依次调用 `onTouchStart` 等
3. **目标阶段**：调用目标节点上的监听器
4. **冒泡阶段**：从目标节点到场景根节点，依次调用监听器

**停止传播：**
- `event.propagationStopped = true`：停止冒泡
- `event.propagationImmediateStopped = true`：立即停止（包括当前节点的其他监听器）

### 2.5 触摸事件分发细节

触摸事件逐个分发 — 每个 changed touch 之间会重置传播状态。这意味着：
- 多点触控时，每个触摸点独立分发
- 一个触摸点的 `propagationStopped` 不影响其他触摸点
- 事件处理顺序与触摸点 ID 顺序一致

---

## 3. 鼠标事件

### 3.1 EventMouse（`cocos/input/types/event-mouse.ts`）

鼠标事件。

#### 关键属性

- `button`：`EventMouse.Button` — 按下的按钮
- `x` / `y`：当前坐标
- `prevX` / `prevY`：上一个坐标
- `scrollX` / `scrollY`：滚轮增量
- `movementX` / `movementY`：鼠标移动增量（指针锁定模式）

#### Button 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `LEFT` | 左键 |
| 1 | `MIDDLE` | 中键 |
| 2 | `RIGHT` | 右键 |
| 3 | `BUTTON_4` | 侧键1 |
| 4 | `BUTTON_5` | 侧键2 |

#### 关键方法

- `getLocation(out?)`：获取 OpenGL 坐标
- `getUILocation(out?)`：获取 UI 坐标
- `getDelta(out?)`：获取增量
- `getUIDelta(out?)`：获取 UI 增量
- `getScrollDelta(out?)`：获取滚轮增量

---

## 4. 键盘事件

### 4.1 EventKeyboard（`cocos/input/types/event-keyboard.ts`）

键盘事件。

#### 关键属性

- `keyCode`：`KeyCode` — 按键码
- `isPressed`：`boolean` — 是否按下（vs 释放）

### 4.2 KeyCode 枚举

`KeyCode`（`cocos/input/types/key-code.ts`）定义了所有键盘按键码。

常用键码：
- `KEY_A` - `KEY_Z`：字母键
- `KEY_0` - `KEY_9`：数字键
- `F1` - `F12`：功能键
- `ARROW_UP/DOWN/LEFT/RIGHT`：方向键
- `SPACE`、`ENTER`、`TAB`、`ESCAPE`：特殊键
- `SHIFT_LEFT/RIGHT`、`CONTROL_LEFT/RIGHT`、`ALT_LEFT/RIGHT`：修饰键

---

## 5. 加速度计与陀螺仪

### 5.1 EventDeviceMotion（`cocos/input/types/event-device-motion.ts`）

设备运动事件。

#### 关键属性

- `acceleration`：`Vec3` — 加速度
- `accelerationIncludingGravity`：`Vec3` — 含重力加速度
- `rotationRate`：`Vec3` — 旋转速率
- `interval`：`number` — 采样间隔

### 5.2 API

```ts
// 启用加速度计
input.setAccelerometerEnabled(true);
input.setAccelerometerInterval(1/60);

// 监听
input.on(InputEventType.DEVICEMOTION, (event: EventDeviceMotion) => {
    const acc = event.accelerationIncludingGravity;
}, this);
```

---

## 6. 隐含知识与陷阱

1. **触摸事件逐个分发** — 每个 changed touch 之间会重置传播状态。多点触控时注意 `getTouches()` vs `getAllTouches()` 的区别。
2. **坐标系统** — `getLocation()` 返回 OpenGL 坐标（左下角原点），`getUILocation()` 返回 UI 坐标（左上角原点）。
3. **输入事件在 update 之前处理** — `input._frameDispatchEvents()` 在 `BEGIN_FRAME` 之后、组件 `update()` 之前调用。
4. **鼠标事件也通过场景图冒泡** — 与触摸事件相同的冒泡机制。
5. **键盘事件不冒泡** — 键盘事件只在全局 `input` 上分发，不通过场景图。
6. **触摸命中测试** — 命中测试基于节点的 UITransform 尺寸和 `priority`（渲染顺序）。
7. **鼠标悬停事件** — `MOUSE_ENTER` 和 `MOUSE_LEAVE` 事件仅在节点有 UITransform 时触发。
8. **加速度计需要用户授权** — iOS 13+ 需要用户授权才能访问加速度计。
9. **手柄事件** — `GAMEPAD_CHANGE` 在手柄连接/断开时触发，`GAMEPAD_INPUT` 在手柄按钮/轴变化时触发。
10. **触摸事件池** — 触摸事件对象使用对象池复用，不要持有引用。
