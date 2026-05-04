# Camera — 摄像机

## 概述

`Camera` 是 3D/2D 渲染的核心组件，定义了场景的观察视角。支持透视投影和正交投影，提供屏幕坐标与世界坐标的转换方法。

## 导入方式

```typescript
import { Camera, Node, Vec3, Color, Rect } from 'cc';
```

## 基础用法

### 获取摄像机组件

```typescript
const camera = this.node.getComponent(Camera);
```

### 透视投影

```typescript
camera.projection = Camera.ProjectionType.PERSPECTIVE;
camera.fov = 60;
camera.near = 0.1;
camera.far = 1000;
```

### 正交投影

```typescript
camera.projection = Camera.ProjectionType.ORTHO;
camera.orthoHeight = 360;
camera.near = 0.1;
camera.far = 2000;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `priority` | `number` | 渲染优先级（0-65535） |
| `visibility` | `number` | 可见层级掩码 |
| `clearFlags` | `Camera.ClearFlag` | 清除标志 |
| `clearColor` | `Color` | 清除颜色 |
| `clearDepth` | `number` | 清除深度 |
| `clearStencil` | `number` | 清除模板值 |
| `projection` | `Camera.ProjectionType` | 投影类型 |
| `fovAxis` | `Camera.FOVAxis` | FOV 固定轴 |
| `fov` | `number` | 视场角（度） |
| `orthoHeight` | `number` | 正交高度 |
| `near` | `number` | 近裁剪面 |
| `far` | `number` | 远裁剪面 |
| `rect` | `Rect` | 视口矩形（0-1 归一化） |
| `targetTexture` | `RenderTexture \| null` | 渲染到纹理 |
| `aperture` | `CameraAperture` | 光圈 |
| `shutter` | `CameraShutter` | 快门 |
| `iso` | `CameraISO` | ISO |
| `usePostProcess` | `boolean` | 启用后处理 |
| `postProcess` | `PostProcess \| null` | 后处理组件 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `screenPointToRay` | `(x, y, out?) => geometry.Ray` | 屏幕点转射线 |
| `worldToScreen` | `(worldPos, out?) => Vec3` | 世界坐标转屏幕坐标 |
| `screenToWorld` | `(screenPos, out?) => Vec3` | 屏幕坐标转世界坐标 |
| `convertToUINode` | `(wpos, uiNode, out?) => Vec3` | 世界坐标转 UI 节点本地坐标 |

## ClearFlag 枚举

| 值 | 说明 |
|-----|------|
| `SKYBOX` | 清除为天空盒 |
| `SOLID_COLOR` | 清除为纯色 |
| `DEPTH_ONLY` | 仅清除深度 |
| `DONT_CLEAR` | 不清除 |

## ProjectionType 枚举

| 值 | 说明 |
|-----|------|
| `PERSPECTIVE` | 透视投影 |
| `ORTHO` | 正交投影 |

## 进阶用法

### 屏幕坐标转世界坐标

```typescript
const worldPos = new Vec3();
camera.screenToWorld(new Vec3(screenX, screenY, 0), worldPos);
```

### 屏幕射线检测

```typescript
import { geometry, PhysicsSystem } from 'cc';

const ray = new geometry.Ray();
camera.screenPointToRay(screenX, screenY, ray);

if (PhysicsSystem.instance.raycast(ray)) {
    const results = PhysicsSystem.instance.raycastResults;
    for (const result of results) {
        const hitPoint = result.hitPoint;
        const hitNormal = result.hitNormal;
        const collider = result.collider;
    }
}
```

### 世界坐标转 UI 坐标

```typescript
const uiPos = new Vec3();
camera.convertToUINode(worldPosition, uiNode, uiPos);
```

### 渲染到纹理

```typescript
camera.targetTexture = renderTexture;
```

### 多摄像机分屏

```typescript
const topCamera = topNode.getComponent(Camera);
const bottomCamera = bottomNode.getComponent(Camera);

if (topCamera) {
    topCamera.rect = new Rect(0, 0.5, 1, 0.5);
    topCamera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
}

if (bottomCamera) {
    bottomCamera.rect = new Rect(0, 0, 1, 0.5);
    bottomCamera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
}
```

### 摄像机跟随

```typescript
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node })
    public target: Node | null = null;

    @property({ type: Number })
    public followSpeed: number = 5;

    @property({ type: Vec3 })
    public offset: Vec3 = new Vec3(0, 10, -10);

    lateUpdate(dt: number) {
        if (!this.target) return;
        const targetPos = new Vec3();
        Vec3.add(targetPos, this.target.worldPosition, this.offset);
        Vec3.lerp(this.node.worldPosition, this.node.worldPosition, targetPos, dt * this.followSpeed);
        this.node.setWorldPosition(this.node.worldPosition);
    }
}
```

## 注意事项

- `priority` 值越小越先渲染，UI 摄像机通常设较大值
- `visibility` 通过位掩码控制摄像机渲染哪些层的节点
- `rect` 使用归一化坐标（0-1），(0,0) 为左下角
- 透视投影下 `fov` 为垂直视场角（度），`fovAxis` 可切换为水平
- `screenPointToRay` 返回的射线可用于物理射线检测
- 正交投影的 `orthoHeight` 是视口半高，单位为世界坐标
