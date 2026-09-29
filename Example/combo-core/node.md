# Node — 节点构建

> `@combo/core` 的 `Node` 类继承自 `cc.Node`，提供 Fluent API 用于链式配置。

## 导入方式

```typescript
import { Node } from '@combo/core';
```

## 基础用法

### 创建节点

```typescript
const node = new Node('MyNode');
```

### 位置变换

```typescript
// 使用三个数字
node.setPosition(320, 240, 0);

// 等比缩放（y 省略则等于 x，z 默认为 1）
node.setScale(2);     // scale = (2, 2, 1)
node.setScale(1, 2);  // scale = (1, 2, 1)

// 欧拉角旋转
node.setRotationFromEuler(0, 45, 0);
```

### 激活状态

```typescript
node.setActive(true);
node.setActive(false);
```

### UI 变换（自动添加 UITransform / UIOpacity）

```typescript
// 自动添加 UITransform 组件并设置尺寸
node.setContentSize(200, 60);
node.setAnchorPoint(0.5, 0.5);

// 自动添加 UIOpacity 组件并设置透明度
node.setOpacity(128);  // 半透明（0-255）
```

## 组件管理

### 使用函数设置（适合需要逻辑操作）

```typescript
node.component(Sprite, (s) => {
  s.spriteFrame = sf;
  s.color = new Color(255, 0, 0, 255);
  s.sizeMode = Sprite.SizeMode.CUSTOM;
});
```

### 使用 Partial 对象设置（适合批量属性赋值）

```typescript
node.component(Sprite, {
  spriteFrame: sf,
  color: new Color(70, 130, 220, 255),
  sizeMode: Sprite.SizeMode.CUSTOM,
});
```

### 含 AssetRef 的组件属性自动加载

```typescript
import { assetManifest } from './generated/assetManifest';

node.component(Sprite, {
  spriteFrame: assetManifest.internal.someSpriteFrame,  // AssetRef → 异步加载
  color: Color.RED,                                     // 普通值 → 同步赋值
});
```

当 setup 中包含 `AssetRef` 值时，Node 会自动注册到 Scene 的 ResourceLoader，加载完成后将 asset 赋值到组件对应属性。

### 获取组件引用

```typescript
node.component(Sprite, { /* ... */ });
const sprite = node.getComponent(Sprite)!;  // 获取组件引用
```

当前 `component()` 返回 `this`（Node），获取组件实例需要后续调用 `getComponent()`。

## 构建节点树

### 嵌套子节点

```typescript
const root = new Node('Root');
root.node('ChildA', (a) => {
  a.setPosition(100, 0);
  a.node('Grandchild', (gc) => {
    gc.setPosition(0, 50);
  });
});
root.node('ChildB', (b) => {
  b.setPosition(-100, 0);
});
```

### 添加已有节点

```typescript
const existing = new cc.Node('External');
root.append(existing);
```

### 设置父节点

```typescript
child.setParent(newParent);
// 自动触发 _flushPendingAssetRefs()，处理延迟绑定的资源引用
```

## 实例化 Prefab

```typescript
root.prefab(new HealthBar());
```

## 链式调用示例

完整的链式模式：

```typescript
node
  .setPosition(320, 480, 0)
  .setScale(1.5)
  .setContentSize(200, 60)
  .setAnchorPoint(0.5, 0.5)
  .setOpacity(255)
  .component(Sprite, { spriteFrame: whiteSpriteFrame() })
  .component(Button, { transition: Button.Transition.SCALE })
  .node('Label', (label) => {
    label.component(Label, { string: 'Click Me', fontSize: 24 });
  });
```

每个配置方法返回 `this`，可以一直链式调用下去。
