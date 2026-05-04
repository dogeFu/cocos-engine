# SafeArea — 安全区域

## 概述

`SafeArea` 组件用于适配设备的安全区域（如刘海屏、底部横条等），自动调整节点的 Widget 边距，确保 UI 元素不被系统 UI 遮挡。

## 导入方式

```typescript
import { SafeArea, Node, Widget } from 'cc';
```

## 基础用法

### 添加安全区域组件

```typescript
const safeNode = new Node('SafeAreaRoot');
const widget = safeNode.addComponent(Widget);
widget.isAlignTop = true;
widget.isAlignBottom = true;
widget.isAlignLeft = true;
widget.isAlignRight = true;
const safeArea = safeNode.addComponent(SafeArea);
```

> SafeArea 会自动修改节点上的 `Widget` 组件的边距值，使其避开系统安全区域。

## 核心属性

SafeArea 组件无需手动配置属性，它会自动读取设备安全区域信息并调整 Widget。

## 进阶用法

### 全屏 UI 适配

```typescript
@ccclass('UIRoot')
export class UIRoot extends Component {
    start() {
        const safeArea = this.node.addComponent(SafeArea);
        const widget = this.node.getComponent(Widget);
        if (!widget) {
            const w = this.node.addComponent(Widget);
            w.isAlignTop = true;
            w.isAlignBottom = true;
            w.isAlignLeft = true;
            w.isAlignRight = true;
        }
    }
}
```

### 手动获取安全区域

```typescript
import { sys, screen, view } from 'cc';

const safeArea = screen.safeArea;
if (safeArea) {
    const x = safeArea.x;
    const y = safeArea.y;
    const width = safeArea.width;
    const height = safeArea.height;
}
```

## 注意事项

- SafeArea 组件需要与 `Widget` 组件配合使用
- 安全区域信息由平台提供，不同设备的安全区域不同
- 在没有安全区域的设备上（如普通 PC 浏览器），SafeArea 不会产生任何效果
- SafeArea 在每帧自动更新，窗口大小变化时会重新计算
- 建议将 SafeArea 挂载到 UI 根节点上，所有子 UI 元素放在该节点下
