# Toggle — 开关组件

## 概述

`Toggle` 继承自 `Button`，在按钮基础上增加了选中/未选中状态。`ToggleContainer` 用于管理一组 Toggle，实现单选/多选功能。

## 导入方式

```typescript
import { Toggle, ToggleContainer, Node, Sprite, SpriteFrame, EventHandler } from 'cc';
```

## 基础用法

### 创建开关

```typescript
const toggleNode = new Node('MyToggle');
const sprite = toggleNode.addComponent(Sprite);
const toggle = toggleNode.addComponent(Toggle);
toggle.isChecked = false;
```

### 监听选中状态变化

```typescript
toggle.node.on('toggle', (toggle: Toggle) => {
    const checked = toggle.isChecked;
}, this);
```

### 单选组

```typescript
const containerNode = new Node('ToggleGroup');
const container = containerNode.addComponent(ToggleContainer);
container.allowSwitchOff = false;

const toggle1 = createToggle('Option1');
const toggle2 = createToggle('Option2');
const toggle3 = createToggle('Option3');

containerNode.addChild(toggle1.node);
containerNode.addChild(toggle2.node);
containerNode.addChild(toggle3.node);
```

## Toggle 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `isChecked` | `boolean` | 是否选中 |
| `toggleGroup` | `ToggleGroup \| null` | 所属开关组 |
| `checkMark` | `Sprite \| null` | 选中标记精灵 |
| `checkEvents` | `EventHandler[]` | 选中状态变化事件 |

## ToggleContainer 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `allowSwitchOff` | `boolean` | 是否允许取消选中（单选模式下） |
| `checkEvents` | `EventHandler[]` | 选中变化事件 |

## 进阶用法

### 自定义开关外观

```typescript
@ccclass('CustomToggle')
export class CustomToggle extends Component {
    @property({ type: Sprite })
    public background: Sprite | null = null;

    @property({ type: Sprite })
    public checkmark: Sprite | null = null;

    @property({ type: SpriteFrame })
    public checkedFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    public uncheckedFrame: SpriteFrame | null = null;

    start() {
        const toggle = this.getComponent(Toggle);
        if (toggle) {
            toggle.checkMark = this.checkmark;
            toggle.node.on('toggle', this.onToggle, this);
        }
    }

    private onToggle(toggle: Toggle) {
        if (this.background && this.checkedFrame && this.uncheckedFrame) {
            this.background.spriteFrame = toggle.isChecked
                ? this.checkedFrame
                : this.uncheckedFrame;
        }
    }
}
```

### 动态创建选项卡

```typescript
@ccclass('TabBar')
export class TabBar extends Component {
    @property({ type: Prefab })
    public tabPrefab: Prefab | null = null;

    @property({ type: [String] })
    public tabNames: string[] = [];

    start() {
        const container = this.node.addComponent(ToggleContainer);
        container.allowSwitchOff = false;

        for (const name of this.tabNames) {
            if (!this.tabPrefab) continue;
            const tabNode = instantiate(this.tabPrefab);
            const label = tabNode.getComponentInChildren(Label);
            if (label) label.string = name;
            const toggle = tabNode.getComponent(Toggle);
            if (toggle) {
                toggle.toggleGroup = container;
            }
            this.node.addChild(tabNode);
        }
    }
}
```

## 注意事项

- Toggle 继承自 Button，拥有 Button 的所有属性和方法
- `ToggleContainer` 实现单选逻辑，同一时刻只有一个 Toggle 被选中
- `allowSwitchOff = false` 时，必须选中一个选项
- `checkMark` 是选中时显示的精灵，通常放在 Toggle 节点的子节点上
- 选中状态变化时触发 `toggle` 事件
