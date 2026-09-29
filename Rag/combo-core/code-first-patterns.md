# 代码优先开发最佳实践

> Combo 代码优先模式下的正确姿势和常见陷阱。源码参考：[combo-core API reference](overview.md)

---

## 1. 引擎内置资产：正确使用方式

### 错误做法

```typescript
import { builtinResMgr, Texture2D, SpriteFrame } from 'cc';

// builtinResMgr 是 Editor 内部 API，运行时行为未定义
const tex = builtinResMgr.get<Texture2D>('white-texture');
const sf = new SpriteFrame();
sf.texture = tex;
```

**问题**：
- `builtinResMgr` 是 Editor 内部管理器，在运行时可能未完全初始化
- 手动 `new SpriteFrame()` + 只设置 `.texture` 不设置 `_rect`/`_originalSize`，渲染时触发 DynamicAtlas 重新打包导致 `texSubImage2D` WebGL 错误
- 这不是公共 API，在不同引擎版本间行为不稳定

### 正确做法

**方式 A：使用 combo-core 工具函数**

```typescript
import { whiteSpriteFrame } from '@combo/core';

// 返回 packable=false 的安全 SpriteFrame
const sf = whiteSpriteFrame();
```

**方式 B：使用引擎公有 API**

```typescript
import { Texture2D, SpriteFrame } from 'cc';

const sf = SpriteFrame.createWithImageSource(Texture2D.whiteTexture)!;
sf.packable = false;  // 防止 DynamicAtlas 干扰
```

**方式 C：通过 assetManifest 引用内部资产**

```typescript
import { loadAsset } from '@combo/core';
import { assetManifest } from './generated/assetManifest';

const effect = await loadAsset(assetManifest.internal.effectsBuiltinUnlit);
```

**方式 D：使用 @combo/core 的自动资源加载**

```typescript
import { Sprite } from 'cc';
import { Scene, Node } from '@combo/core';
import { assetManifest } from './generated/assetManifest';

const scene = new Scene('Main');
scene.node('Canvas', (canvas) => {
  canvas.component(Sprite, {
    spriteFrame: assetManifest.internal.someSpriteFrame, // 自动异步加载
  });
});
scene.run();
```

`component()` 的 setup 中包含 `AssetRef` 时，自动注册到 Scene 的 ResourceLoader → 加载完成赋值。

---

## 2. 染色 Sprite 的正确创建

### 错误做法

```typescript
const tex = builtinResMgr.get<Texture2D>('white-texture')!;
const sf = new SpriteFrame();
sf.texture = tex;  // 缺少 _rect, _originalSize
```

### 正确做法

```typescript
import { SpriteFrame, Sprite, Color } from 'cc';
import { whiteSpriteFrame } from '@combo/core';

const sf = whiteSpriteFrame();

node.component(Sprite, {
  spriteFrame: sf,
  color: new Color(70, 130, 220, 255),
  sizeMode: Sprite.SizeMode.CUSTOM,
});
```

---

## 3. 简单形状使用 Graphics

如果只需要绘制纯色矩形等简单形状，使用 `Graphics` 组件绕过纹理加载：

```typescript
import { Graphics, Color } from 'cc';

node.component(Graphics, (g) => {
  g.rect(-32, -32, 64, 64);
  g.fillColor = new Color(230, 80, 80, 255);
  g.fill();
});
```

**优点**：不需要纹理资源、不触发 DynamicAtlas、适合装饰性形状。
**限制**：Button 组件依赖 Sprite 组件作为 transition target，不能直接用 Graphics 替代。

---

## 4. Button 的最佳实践

### 正确做法

```typescript
import { Sprite, Button, Color } from 'cc';
import { whiteSpriteFrame } from '@combo/core';

node
  .setContentSize(220, 60)
  .component(Sprite, {
    spriteFrame: whiteSpriteFrame(),
    color: new Color(70, 130, 220, 255),
    sizeMode: Sprite.SizeMode.CUSTOM,
  })
  .component(Button, (b) => {
    b.interactable = true;
    b.transition = Button.Transition.SCALE;
  });
```

---

## 5. Prefab 复用模式

```typescript
import { Prefab, Node } from '@combo/core';
import { Sprite, Button, Color, Label } from 'cc';
import { whiteSpriteFrame } from '@combo/core';

class ColoredButton extends Prefab {
  constructor(
    private label: string,
    private color: Color,
  ) {
    super('ColoredButton');
  }

  protected build(root: Node): void {
    root
      .setContentSize(220, 60)
      .component(Sprite, {
        spriteFrame: whiteSpriteFrame(),
        color: this.color,
        sizeMode: Sprite.SizeMode.CUSTOM,
      })
      .component(Button, { transition: Button.Transition.SCALE })
      .node('Label', (label) => {
        label.component(Label, { string: this.label, fontSize: 24 });
      });
  }
}

// 使用
scene.prefab(new ColoredButton('Click Me', new Color(70, 130, 220, 255)));
```

---

## 6. 资源加载进度展示

```typescript
const scene = new Scene('LoadingScene');
scene.pace({ perFrame: 5, concurrency: 10 });

// 展示 loading 画面
let loadingBar: Node;
scene.node('LoadingBar', (bar) => {
  loadingBar = bar;
  bar.setContentSize(0, 20);
  bar.component(Sprite, { spriteFrame: whiteSpriteFrame(), color: Color.GREEN });
});

scene.assets
  .onProgress((done, total) => {
    loadingBar.setContentSize(300 * (done / total), 20);
  })
  .onComplete(() => {
    console.log('Loading complete, transitioning...');
  });

scene.load(); // 异步加载
```

---

## 7. 决策流程图

```
需要显示一个图形？
├─ 纯色矩形/圆形等简单形状 → Graphics.drawRect/fill
├─ 带纹理的 Sprite
│  ├─ 引擎内置纹理（white-texture 等）
│  │  └─ whiteSpriteFrame() 或 Texture2D.whiteTexture → packable = false
│  ├─ 用户项目资产（图片等）
│  │  └─ assetManifest.main.xxx → loadAsset() → SpriteFrame.createWithImageSource
│  └─ 运行时生成的纹理
│     └─ new Texture2D() → image 赋值 → SpriteFrame.createWithImageSource
└─ 复杂组合 → Prefab 封装

需要一个交互组件？
├─ Button → Sprite + Button 组件，packable = false
└─ 自定义手势 → 原生 touch/鼠标事件
```

---

## 8. 常见陷阱速查表

| 陷阱 | 表现 | 根因 | 修复 |
|------|------|------|------|
| `texSubImage2D` 错误 | WebGL 报错，纹理显示异常 | DynamicAtlas 重新打包内置纹理 | `spriteFrame.packable = false` |
| Sprite 不显示 | 空白或洋红色块 | SpriteFrame 创建不完整 | 用 `createWithImageSource()` 或 `whiteSpriteFrame()` |
| builtinResMgr 返回 undefined | `get()` 抛出 TypeError | 运行时未初始化 Editor 管理器 | 改用 `Texture2D.whiteTexture` 或 `whiteSpriteFrame()` |
| 资源加载卡住 | `loadAsset()` 不 resolve | bundle 未注册在 `projectBundles` | 检查 settings.json 生成 |
| 节点显示位置异常 | 坐标不对 | Camera 未正确关联 Canvas | 设置 `canvas.cameraComponent = camera` |
| Button 交互无效 | 点击无响应 | Button 缺少 Sprite 组件 | 先添加 Sprite 组件 |
| layer 层级错乱 | UI 显示在 3D 后面 | Camera 的 `clearFlags` 设置不当 | 设置 `camera.clearFlags = SOLID_COLOR` |
| 图片显示模糊 | 纹理缩放失真 | 被图集压缩 | `spriteFrame.packable = false` |
