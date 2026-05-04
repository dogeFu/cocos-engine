# Cocos Creator Engine API Examples

Cocos Creator 引擎 v3.8.8 对外接口使用示例与说明文档。

## 目录结构

### [core/](./core/) — 核心基础

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [node.md](./core/node.md) | 节点系统 | `Node` |
| [component.md](./core/component.md) | 组件与生命周期 | `Component` |
| [decorator.md](./core/decorator.md) | 装饰器系统 | `ccclass`, `property`, `requireComponent` 等 |
| [event.md](./core/event.md) | 事件系统 | `EventTarget`, `Event` |
| [math.md](./core/math.md) | 数学库 | `Vec2`, `Vec3`, `Vec4`, `Mat3`, `Mat4`, `Quat`, `Color`, `Rect`, `Size` |
| [scene.md](./core/scene.md) | 场景管理 | `Scene` |
| [director.md](./core/director.md) | 导演系统 | `director` |
| [game.md](./core/game.md) | 游戏主循环 | `game` |
| [asset-manager.md](./core/asset-manager.md) | 资源管理 | `assetManager`, `Asset` |
| [prefab.md](./core/prefab.md) | 预制体 | `Prefab`, `instantiate` |
| [serialization.md](./core/serialization.md) | 序列化 | `deserialize`, `instantiate` |
| [layers.md](./core/layers.md) | 层级系统 | `Layers` |
| [object-pool.md](./core/object-pool.md) | 节点池 | `NodePool` |

### [ui/](./ui/) — UI 组件

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [widget.md](./ui/widget.md) | 对齐挂件 | `Widget` |
| [layout.md](./ui/layout.md) | 布局组件 | `Layout` |
| [button.md](./ui/button.md) | 按钮组件 | `Button` |
| [toggle.md](./ui/toggle.md) | 开关组件 | `Toggle`, `ToggleContainer` |
| [scroll-view.md](./ui/scroll-view.md) | 滚动视图 | `ScrollView` |
| [edit-box.md](./ui/edit-box.md) | 输入框 | `EditBox` |
| [slider.md](./ui/slider.md) | 滑动条 | `Slider` |
| [progress-bar.md](./ui/progress-bar.md) | 进度条 | `ProgressBar` |
| [page-view.md](./ui/page-view.md) | 翻页视图 | `PageView` |
| [safe-area.md](./ui/safe-area.md) | 安全区域 | `SafeArea` |

### [2d/](./2d/) — 2D 渲染

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [sprite.md](./2d/sprite.md) | 精灵组件 | `Sprite` |
| [label.md](./2d/label.md) | 文本组件 | `Label` |
| [canvas.md](./2d/canvas.md) | 画布组件 | `Canvas` |
| [ui-transform.md](./2d/ui-transform.md) | UI 变换 | `UITransform` |
| [mask.md](./2d/mask.md) | 遮罩组件 | `Mask` |
| [graphics.md](./2d/graphics.md) | 绘图组件 | `Graphics` |
| [rich-text.md](./2d/rich-text.md) | 富文本组件 | `RichText` |
| [ui-opacity.md](./2d/ui-opacity.md) | 透明度组件 | `UIOpacity` |
| [sprite-frame.md](./2d/sprite-frame.md) | 精灵帧 | `SpriteFrame` |
| [particle-2d.md](./2d/particle-2d.md) | 2D 粒子 | `ParticleSystem2D` |

### [3d/](./3d/) — 3D 渲染

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [camera.md](./3d/camera.md) | 摄像机 | `Camera` |
| [mesh-renderer.md](./3d/mesh-renderer.md) | 网格渲染器 | `MeshRenderer` |
| [light.md](./3d/light.md) | 灯光系统 | `DirectionalLight`, `PointLight`, `SpotLight`, `SphereLight` |
| [primitive.md](./3d/primitive.md) | 几何体创建 | `primitives` |
| [skeletal-animation.md](./3d/skeletal-animation.md) | 骨骼动画 | `SkeletalAnimation`, `SkeletalAnimationState` |

### [animation/](./animation/) — 动画系统

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [animation-component.md](./animation/animation-component.md) | 动画组件 | `Animation` |
| [animation-clip.md](./animation/animation-clip.md) | 动画剪辑 | `AnimationClip` |
| [animation-state.md](./animation/animation-state.md) | 动画状态 | `AnimationState` |
| [tween.md](./animation/tween.md) | 缓动动画 | `tween`, `Tween` |

### [physics/](./physics/) — 物理系统

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [physics-system.md](./physics/physics-system.md) | 3D 物理系统 | `PhysicsSystem` |
| [rigid-body.md](./physics/rigid-body.md) | 3D 刚体 | `RigidBody` |
| [collider-3d.md](./physics/collider-3d.md) | 3D 碰撞体 | `BoxCollider`, `SphereCollider`, `CapsuleCollider` 等 |
| [physics-2d-system.md](./physics/physics-2d-system.md) | 2D 物理系统 | `PhysicsSystem2D` |
| [rigid-body-2d.md](./physics/rigid-body-2d.md) | 2D 刚体 | `RigidBody2D` |
| [collider-2d.md](./physics/collider-2d.md) | 2D 碰撞体 | `BoxCollider2D`, `CircleCollider2D`, `PolygonCollider2D` |

### [audio/](./audio/) — 音频系统

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [audio-source.md](./audio/audio-source.md) | 音频源 | `AudioSource` |

### [particle/](./particle/) — 3D 粒子系统

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [particle-system.md](./particle/particle-system.md) | 粒子系统 | `ParticleSystem` |

### [input/](./input/) — 输入系统

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [input.md](./input/input.md) | 输入管理 | `input`, `Input`, `EventKeyboard`, `EventMouse` |

### [rendering/](./rendering/) — 渲染管线

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [rendering-overview.md](./rendering/rendering-overview.md) | 渲染管线概览 | `Pipeline`, `DebugView` |

### [extensions/](./extensions/) — 扩展模块

| 文件 | 说明 | 主要类/接口 |
|------|------|-------------|
| [spine.md](./extensions/spine.md) | Spine 动画 | `sp` |
| [dragon-bones.md](./extensions/dragon-bones.md) | 龙骨动画 | `dragonBones` |
| [tiled-map.md](./extensions/tiled-map.md) | TiledMap 地图 | `TiledMap`, `TiledTile` |
| [video.md](./extensions/video.md) | 视频播放 | `VideoPlayer` |
| [webview.md](./extensions/webview.md) | 网页视图 | `WebView` |

## 导入约定

所有示例基于以下导入约定：

```typescript
import {
    Node, Component, _decorator, Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Color,
    Rect, Size, Scene, director, game, assetManager, Asset, Prefab, instantiate,
    Layers, NodePool, UITransform, Canvas, Camera, Sprite, Label, Widget,
    Layout, Button, Animation, AnimationClip, tween, RigidBody, PhysicsSystem,
    input, Input, AudioSource, sys, screen, view, debug
} from 'cc';

const { ccclass, property } = _decorator;
```
