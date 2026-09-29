# Prefab — 预制体

> `@combo/core` 的 `Prefab` 抽象类和 `buildPrefab()` 工厂函数，提供代码定义的节点模板。

## 导入方式

```typescript
import { Prefab, buildPrefab } from '@combo/core';
```

## 两种定义方式

### 方式 A：继承抽象类（推荐，适合复杂预制体）

```typescript
import { Prefab, Node } from '@combo/core';
import { Sprite, Button, Label, Color } from 'cc';
import { whiteSpriteFrame } from '@combo/core';

class MenuButton extends Prefab {
  constructor(
    private text: string,
    private bgColor: Color = new Color(70, 130, 220, 255),
  ) {
    super('MenuButton');
  }

  protected build(root: Node): void {
    root
      .setContentSize(220, 60)
      .setAnchorPoint(0.5, 0.5)
      .component(Sprite, {
        spriteFrame: whiteSpriteFrame(),
        color: this.bgColor,
        sizeMode: Sprite.SizeMode.CUSTOM,
      })
      .component(Button, { transition: Button.Transition.SCALE })
      .node('Text', (label) => {
        label.component(Label, {
          string: this.text,
          fontSize: 28,
          color: Color.WHITE,
        });
      });
  }
}

// 使用
scene.prefab(new MenuButton('Start Game'));
scene.prefab(new MenuButton('Settings', new Color(100, 100, 100, 255)));
```

### 方式 B：函数式工厂（适合简单预制体）

```typescript
import { buildPrefab } from '@combo/core';

const HealthBar = buildPrefab('HealthBar', (root) => {
  root.setContentSize(200, 20).setAnchorPoint(0.5, 0.5);
  root.component(Sprite, {
    spriteFrame: whiteSpriteFrame(),
    color: Color.GREEN,
    sizeMode: Sprite.SizeMode.CUSTOM,
  });
  root.node('Fill', (fill) => {
    fill.setContentSize(180, 16).setAnchorPoint(0, 0.5).setPosition(-90, 0);
    fill.component(Sprite, {
      spriteFrame: whiteSpriteFrame(),
      color: Color.RED,
      sizeMode: Sprite.SizeMode.CUSTOM,
    });
  });
});

// 使用
scene.prefab(HealthBar);
```

## 添加到不同容器

```typescript
// 添加到 Scene
scene.prefab(new MenuButton('Play'));

// 添加到 Node
const uiRoot = new Node('UI');
uiRoot.prefab(new MenuButton('Play'));
scene.append(uiRoot);
```

## 实例化流程

`Prefab.instantiate(parent?)` 的内部流程：

1. 创建 `new Node(name)` — 根节点
2. 如果传入了 `parent`，添加到父节点
3. 调用 `this.build(root)` — 由具体子类实现的节点树构建
4. 设置 `root.active = true`
5. 返回 root

```typescript
// 手动实例化（不自动添加到父节点）
const button = new MenuButton('Play').instantiate();
someNode.addChild(button);

// 传入父节点（instantiate 内部 addChild）
const button2 = new MenuButton('Quit').instantiate(someNode);
```

## 设计模式建议

- **参数化构造**：Prefab 构造函数接收可配置参数（文本、颜色、尺寸等），`build()` 中使用这些参数构造节点树
- **组件复用**：Prefab 内部可使用子 Prefab（root.node('Child', ...).prefab(innerPrefab)）
- **单一职责**：每个 Prefab 只负责一个 UI 组件或游戏对象的布局和基础逻辑，不要在内嵌业务逻辑
