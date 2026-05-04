# Button — 按钮组件

## 概述

`Button` 组件用于响应点击事件，支持多种过渡效果（颜色变化、精灵切换、缩放）。通常与 `Sprite` 组件配合使用。

## 导入方式

```typescript
import { Button, Node, Sprite, Color, SpriteFrame, EventHandler } from 'cc';
```

## 基础用法

### 创建按钮

```typescript
const btnNode = new Node('MyButton');
const sprite = btnNode.addComponent(Sprite);
const button = btnNode.addComponent(Button);
```

### 设置过渡效果

```typescript
button.transition = Button.Transition.COLOR;
button.normalColor = new Color(255, 255, 255, 255);
button.pressedColor = new Color(200, 200, 200, 255);
button.hoverColor = new Color(230, 230, 230, 255);
button.disabledColor = new Color(150, 150, 150, 255);
```

### 监听点击事件

```typescript
btnNode.on(Node.EventType.TOUCH_END, () => {
}, this);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `interactable` | `boolean` | 是否可交互 |
| `transition` | `Button.Transition` | 过渡类型 |
| `target` | `Node \| null` | 过渡效果目标节点 |
| `normalColor` | `Color` | 正常状态颜色 |
| `pressedColor` | `Color` | 按下状态颜色 |
| `hoverColor` | `Color` | 悬停状态颜色 |
| `disabledColor` | `Color` | 禁用状态颜色 |
| `normalSprite` | `SpriteFrame \| null` | 正常状态精灵 |
| `pressedSprite` | `SpriteFrame \| null` | 按下状态精灵 |
| `hoverSprite` | `SpriteFrame \| null` | 悬停状态精灵 |
| `disabledSprite` | `SpriteFrame \| null` | 禁用状态精灵 |
| `duration` | `number` | 颜色过渡时间（秒） |
| `zoomScale` | `number` | 缩放过渡的目标缩放值 |
| `clickEvents` | `EventHandler[]` | 点击事件处理器列表 |

## Transition 枚举

| 值 | 说明 |
|-----|------|
| `NONE` | 无过渡效果 |
| `COLOR` | 颜色过渡 |
| `SPRITE` | 精灵切换 |
| `SCALE` | 缩放过渡 |

## 进阶用法

### 缩放过渡

```typescript
button.transition = Button.Transition.SCALE;
button.zoomScale = 0.9;
button.duration = 0.1;
```

### 精灵过渡

```typescript
button.transition = Button.Transition.SPRITE;
button.normalSprite = normalFrame;
button.pressedSprite = pressedFrame;
button.hoverSprite = hoverFrame;
button.disabledSprite = disabledFrame;
```

### 使用 EventHandler

```typescript
const handler = new EventHandler();
handler.target = this.node;
handler.component = 'GameController';
handler.handler = 'onButtonClick';
handler.customEventData = 'level1';

button.clickEvents.push(handler);
```

对应组件方法：

```typescript
@ccclass('GameController')
export class GameController extends Component {
    onButtonClick(event: Event, customEventData: string) {
    }
}
```

### 禁用/启用按钮

```typescript
button.interactable = false;
button.interactable = true;
```

### 自定义点击效果

```typescript
@ccclass('CustomButtonEffect')
export class CustomButtonEffect extends Component {
    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.on(Node.EventType.TOUCH_END, this.onRelease, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onRelease, this);
    }

    private onPress() {
        tween(this.node)
            .to(0.1, { scale: new Vec3(0.9, 0.9, 1) })
            .start();
    }

    private onRelease() {
        tween(this.node)
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
```

## 注意事项

- Button 需要节点上有 `UITransform` 才能接收触摸事件
- `target` 默认为按钮节点自身，可指定子节点作为过渡效果目标
- `COLOR` 过渡需要目标节点有 `Sprite` 或 `Label` 组件
- `SPRITE` 过渡需要目标节点有 `Sprite` 组件
- `interactable = false` 时按钮不再响应触摸，但节点仍然可以接收其他事件
- `zoomScale` 值小于 1 为缩小效果，大于 1 为放大效果
