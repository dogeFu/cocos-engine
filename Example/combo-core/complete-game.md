# 完整最小游戏 — Tap to Score

> 一个完整的可运行 2D 点击得分游戏，展示 `@combo/core` 的 Scene + startApplication 模式。
>
> 功能：点击屏幕得分，分数实时更新。

## 完整代码（单文件 main.ts）

```typescript
import { startApplication, Scene } from '@combo/core';
import {
  Label, Sprite, Button, Color, Canvas, input, Input,
} from 'cc';
import { camera2D, whiteSpriteFrame } from '@combo/core';

// ─── State ────────────────────────────────────────────
let score = 0;
let scoreLabel: Label | null = null;

// ─── Scene ────────────────────────────────────────────
const scene = new Scene('TapToScore');
scene.pace({ perFrame: 5 });

scene.node('Canvas', (canvas) => {
  canvas.component(Canvas, {
    designResolution: { width: 640, height: 960 },
  }).setPosition(320, 480);

  // 2D Camera（ORTHO, solid-color clear, z=1000）
  camera2D(canvas, {
    orthoHeight: 960,
    clearColor: new Color(44, 62, 80, 255),
  });

  // Title
  canvas.node('Title', (n) => {
    n.setPosition(320, 800).component(Label, {
      string: 'Tap to Score!',
      fontSize: 40,
      color: Color.WHITE,
    });
  });

  // Score display
  canvas.node('Score', (n) => {
    n.setPosition(320, 680);
    scoreLabel = n.getComponent(Label) ?? n.addComponent(Label);
    scoreLabel.string = 'Score: 0';
    scoreLabel.fontSize = 64;
    scoreLabel.color = new Color(255, 215, 0, 255);  // Gold
  });

  // Tap area — a colored rectangle filling the lower half
  canvas.node('TapArea', (n) => {
    n.setContentSize(640, 500).setAnchorPoint(0.5, 0.5)
      .setPosition(320, 300)
      .component(Sprite, {
        spriteFrame: whiteSpriteFrame(),
        color: new Color(70, 130, 220, 255),  // Steel blue
        sizeMode: Sprite.SizeMode.CUSTOM,
      })
      .component(Button, {
        interactable: true,
        transition: Button.Transition.SCALE,
      });
  });

  // Instruction text
  canvas.node('Hint', (n) => {
    n.setPosition(320, 50).component(Label, {
      string: 'Tap anywhere to score!',
      fontSize: 20,
      color: new Color(180, 200, 220, 200),
    });
  });
});

// ─── Input ────────────────────────────────────────────
input.on(Input.EventType.TOUCH_START, () => {
  score += 10;
  if (scoreLabel) {
    scoreLabel.string = `Score: ${score}`;
  }
});

// ─── Start ────────────────────────────────────────────
startApplication({ scene });
```

## 代码说明

### 逐段解释

| 部分 | 说明 |
|------|------|
| **导入** | 从 `@combo/core` 导入 `startApplication`, `Scene`；从 `cc` 导入引擎组件；从 `@combo/core` 导入工具函数 |
| **State** | 用模块级变量管理 game state。`scoreLabel` 保存组件引用用于更新 UI |
| **Scene** | `new Scene('TapToScore')` 创建场景。`scene.pace()` 配置资源加载帧节流 |
| **Canvas** | `Canvas` 组件设置设计分辨率。`setPosition(320, 480)` 匹配 `640x960` 设计分辨率 |
| **Camera** | `camera2D()` 一键创建 2D 正交 Camera。ORTHO 投影、solid-color 清除、z=1000 |
| **Title/Score/Hint** | `Label` 组件显示文本。Score 标签通过 `getComponent()` + `addComponent()` 获取引用 |
| **TapArea** | `Sprite` + `Button` 组合提供视觉反馈。`whiteSpriteFrame()` 提供白色纹理，通过 `color` 染色 |
| **Input** | `input.on(TOUCH_START)` 注册全局触摸事件，每次触摸 +10 分 |
| **Start** | `startApplication({ scene })` 启动引擎并运行场景 |

### 关键模式

1. **Scene + startApplication** — 标准的 Combo 应用入口模式
2. **fluent API** — `n.setContentSize(...).setAnchorPoint(...).setPosition(...).component(...)` 链式调用
3. **工具函数** — `camera2D()`、`whiteSpriteFrame()` 封装常见引擎初始化逻辑
4. **组件引用** — `component()` 返回 `this`（Node），用 `getComponent()` 获取引用
5. **全局输入** — 使用 `cc.input` 直接注册，不依赖组件生命周期

### 运行方式

```bash
# 确保 combo-cli 项目已初始化，将此文件作为 src/main.ts
# combo-cli build 后生成可运行的 web 构建
npx combo-cli build
# 在浏览器中打开预览
```
