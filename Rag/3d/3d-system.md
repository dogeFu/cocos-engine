# Cocos Creator 引擎 — 3D 渲染系统

> 面向 AI 辅助编程的中文参考文档。覆盖 3D 模型、灯光、相机、几何体基元。

---

## 目录

1. [cocos/3d/ — 3D 渲染组件](#1-cocos3d--3d-渲染组件)
2. [cocos/primitive/ — 几何体基元工厂](#2-cocosprimitive--几何体基元工厂)

---

## 1. cocos/3d/ — 3D 渲染组件

### 1.1 MeshRenderer（`cocos/3d/framework/mesh-renderer.ts`）

3D 网格渲染器组件。是最常用的 3D 渲染组件。

#### 关键属性

- `mesh`：`Mesh` — 渲染的网格
- `materials`：`Material[]` — 材质数组（每个子网格对应一个材质）
- `material`：`Material` — 第一个材质（快捷访问）
- `sharedMaterial`：`Material` — 共享材质
- `shadowCastingMode`：`ShadowCastingMode` — 阴影投射模式
- `receiveShadow`：`boolean` — 是否接收阴影
- `meshLayout`：`number` — 顶点布局
- `lightmap`：`Texture2D` — 光照贴图
- `bakeSettings`：`ModelBakeSettings` — 烘焙设置

#### ShadowCastingMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `OFF` | 不投射阴影 |
| 1 | `ON` | 投射阴影 |
| 2 | `DOUBLE_SIDED` | 双面投射阴影 |
| 3 | `SHADOWS_ONLY` | 仅渲染阴影 |

#### 关键方法

- `setInstancedAttribute(name, value)`：设置实例化属性值
- `onMaterialModified(index, material)`：材质修改回调
- `onRebuildPSO(index, material)`：重建管线状态对象
- `updateMaterialForInstancedAttribute(material)`：更新实例化属性的材质

#### 隐含知识

- `MeshRenderer` 内部创建一个 `Model` 对象并注册到 `RenderScene`
- 修改 `mesh` 属性会重建所有 SubModel
- 修改材质会触发 PSO（管线状态对象）重建
- `setInstancedAttribute` 仅在启用实例化渲染时有效
- 材质数组长度必须与网格的子网格数量匹配

### 1.2 SkinnedMeshRenderer（`cocos/3d/skeletal-animation/skinned-mesh-renderer.ts`）

骨骼动画网格渲染器。继承自 `MeshRenderer`。

#### 关键属性

- `skeleton`：`Skeleton` — 骨骼资源
- `skinningRoot`：`Node` — 骨骼根节点
- `joints`：`Node[]` — 关节节点数组
- `bindposes`：`Mat4[]` — 绑定姿态矩阵

#### 隐含知识

- 骨骼动画使用 GPU 蒙皮（通过 uniform buffer 传递骨骼矩阵）
- 最多支持 56 个骨骼（受 uniform buffer 大小限制）
- `bindposes` 是模型空间到骨骼空间的变换矩阵
- 骨骼矩阵在每帧的 `update()` 中更新

### 1.3 SkinnedMeshBatchRenderer（`cocos/3d/skeletal-animation/skinned-mesh-batch-renderer.ts`）

骨骼动画合批渲染器。将多个骨骼网格合并渲染。

#### 关键属性

- `meshes`：`Mesh[]` — 合并的网格数组
- `skeleton`：`Skeleton` — 共享骨骼
- `skinningRoot`：`Node` — 骨骼根节点
- `joints`：`Node[]` — 关节节点数组
- `batchedJoint`：`Mat4[]` — 合批骨骼矩阵

#### 隐含知识

- 合批要求所有网格共享同一骨骼
- 合批后只有一个 Draw Call
- 适用于大量相同骨骼的模型（如人群）

### 1.4 灯光组件

#### DirectionalLight（`cocos/3d/framework/directional-light.ts`）

方向光组件。

- `color`：灯光颜色
- `useColorTemperature`：是否使用色温
- `colorTemperature`：色温值
- `illuminance`：照度（勒克斯）
- `shadowEnabled`：是否启用阴影
- `shadowPcf`：PCF 柔化等级
- `shadowBias`：阴影偏移
- `shadowNormalBias`：法线偏移
- `shadowSaturation`：阴影饱和度
- `shadowDistance`：阴影距离
- `shadowInvisibleOcclusionRange`：不可见遮挡范围

**关键：** 场景中只有一个方向光可以作为"主灯光"（`RenderScene.mainLight`）。第一个启用的方向光自动成为主灯光。

#### SphereLight（`cocos/3d/framework/sphere-light.ts`）

球面光源组件。

- `range`：光照范围
- `illuminance`：照度
- `luminanceHDR` / `luminanceLDR`：亮度（HDR/LDR）
- `attenuation`：衰减系数

#### SpotLight（`cocos/3d/framework/spot-light.ts`）

聚光灯组件。

- `range`：光照范围
- `spotAngle`：聚光角度（度）
- `illuminance`：照度
- `attenuation`：衰减系数
- `luminanceHDR` / `luminanceLDR`：亮度

#### PointLight（`cocos/3d/framework/point-light.ts`）

点光源组件。

- `range`：光照范围
- `illuminance`：照度
- `attenuation`：衰减系数
- `luminanceHDR` / `luminanceLDR`：亮度

#### RangedDirectionalLight（`cocos/3d/framework/ranged-directional-light.ts`）

范围方向光组件。

- `range`：光照范围
- `illuminance`：照度

### 1.5 Camera 组件（`cocos/3d/framework/camera-component.ts`）

3D 相机组件。封装 `render-scene` 的 `Camera`。

#### 关键属性

- `projection`：`CameraProjection` — 投影类型（透视/正交）
- `fov`：视场角（度）
- `fovAxis`：`CameraFOVAxis` — FOV 轴（垂直/水平）
- `orthoHeight`：正交投影半高
- `nearClip` / `farClip`：近/远裁剪面
- `clearColor`：清除颜色
- `clearFlags`：`ClearFlag` — 清除标志
- `visibility`：可见层掩码
- `priority`：渲染优先级
- `targetTexture`：渲染到纹理（RTT）
- `cameraType`：`CameraType` — 相机类型
- `aperture`：`CameraAperture` — 光圈
- `shutter`：`CameraShutter` — 快门
- `iso`：`CameraISO` — ISO

#### CameraType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `DEFAULT` | 默认 |
| 1 | `ORBIT` | 轨道相机 |
| 2 | `FREE` | 自由相机 |

#### 关键方法

- `screenPointToRay(screenPos, out?)`：屏幕坐标转射线
- `screenToWorld(screenPos, out?)`：屏幕坐标转世界坐标
- `worldToScreen(worldPos, out?)`：世界坐标转屏幕坐标
- `worldMatrixToScreen(worldMatrix, out?, width?, height?)`：世界矩阵转屏幕矩阵
- `raycast(screenPos)`：屏幕坐标射线检测

#### 隐含知识

- Camera 组件在 `onLoad()` 中创建 `render-scene` 的 `Camera` 对象
- `targetTexture` 设置后，相机渲染到纹理而非屏幕
- `visibility` 掩码与 `Node.layer` 进行按位与操作，匹配的节点才可见
- `priority` 越小的相机越先渲染
- `clearFlags` 默认为 `SOL_COLOR | DEPTH | STENCIL`

### 1.6 Mesh 资源（`cocos/3d/assets/mesh.ts`）

3D 网格资源。继承 `Asset`。

#### 关键属性

- `struct`：`MeshStruct` — 网格结构信息
- `data`：`ArrayBuffer` — 顶点/索引原始数据
- `hash`：`number` — 网格哈希值
- `minPosition` / `maxPosition`：包围盒极值
- `subMeshes`：`SubMesh[]` — 子网格数组

#### 关键方法

- `readAttribute(idx, attrName)`：读取顶点属性
- `getVertexBuffer(idx)`：获取顶点缓冲区
- `getIndexBuffer(idx)`：获取索引缓冲区
- `getStruct(idx)`：获取子网格结构
- `merge(other, offset?, matrix?)`：合并网格
- `destroy()`：销毁网格

#### 隐含知识

- Mesh 的顶点数据在首次访问时从 `data` 解析
- `merge()` 可以在运行时合并多个网格，用于动态合批
- 网格的包围盒从 `minPosition`/`maxPosition` 计算
- 修改顶点数据后需要调用 `markAsDirty()` 触发重建

### 1.7 SubMesh（`cocos/3d/assets/sub-mesh.ts`）

子网格。包含一个绘制调用的数据。

- `vertexBuffers`：`Buffer[]` — 顶点缓冲区
- `indexBuffer`：`Buffer` — 索引缓冲区
- `primitiveMode`：`PrimitiveMode` — 图元类型
- `inputAssembler`：`InputAssembler` — 输入装配器

### 1.8 LODGroup（`cocos/3d/misc/lod-group.ts`）

LOD（Level of Detail）组组件。

#### 关键属性

- `lodCount`：LOD 层级数
- `localBoundaryBox`：本地包围盒
- `objectSize`：对象尺寸
- `fadeMode`：`LODFadeMode` — 淡入淡出模式
- `animateCrossFade`：是否使用动画过渡

#### LOD 层级

每个 LOD 层级包含：
- `screenUsagePercentage`：屏幕占比阈值
- `renderers`：`MeshRenderer[]` — 该层级的渲染器

#### 隐含知识

- LOD 选择基于对象在屏幕上的占比
- 过渡模式支持 `CROSS_FADE` 和 `PERCENTAGE_FADE`
- LOD 缓存在 `RenderScene.update()` 中更新

### 1.9 ReflectionProbe（`cocos/3d/misc/reflection-probe.ts`）

反射探针组件，用于捕获场景的反射信息。

#### 关键属性

- `resolution`：反射贴图分辨率
- `clearFlags`：`ClearFlag` — 清除标志
- `backgroundColor`：背景颜色
- `distance`：影响距离
- `cubemap`：`TextureCube` — 反射立方体贴图
- `probeType`：`ReflectionProbeType` — 探针类型
- `ambient`：环境光贡献
- `intensity`：反射强度

#### 隐含知识

- 反射探针通过渲染 6 个方向的相机生成 Cubemap
- Model 的 `reflectionProbeType` 属性决定使用哪个探针
- 反射探针的烘焙结果存储在 `cubemap` 属性中

### 1.10 GI 光照探针系统（`cocos/gi/light-probe/`）

GI 光照探针系统允许在场景中采样间接光照。

#### 核心模块

| 类 | 文件 | 说明 |
|----|------|------|
| `SH` | `cocos/gi/light-probe/sh.ts` | 球谐函数（L2 阶，9 个基函数） |
| `Delaunay` | `cocos/gi/light-probe/delaunay.ts` | Bowyer-Watson 3D 四面体剖分 |
| `LightProbesData` | `cocos/gi/light-probe/light-probe.ts` | 核心插值逻辑 |
| `LightProbeGroup` | `cocos/gi/light-probe/light-probe-group.ts` | 场景组件 |

#### 球谐函数（SH）

使用 **L2 阶（9 个基函数）** 的球谐函数表示光照，RGB 三通道共 27 个浮点数。

核心方法：
- `project(samples, values)` — 将辐射度函数投影到 SH 系数（蒙特卡洛积分）
- `convolveCosine(radianceCoefficients)` — 从辐射度 SH 系数计算辐照度 SH 系数
- `reduceRinging(coefficients, lambda)` — 减少振铃效应
- `shaderEvaluate(normal, coefficients)` — 在着色器中重建光照函数

#### Delaunay 四面体剖分

使用 **Bowyer-Watson 算法** 构建 3D Delaunay 四面体剖分：

- `Vertex` — 探针点，包含位置、法线和 SH 系数
- `Tetrahedron` — 四面体，包含 4 个顶点索引、4 个邻居索引、变换矩阵
- `CircumSphere` — 外接球，用于判断点是否在球内
- `vertex3 = -1` 表示外部单元（凸包外的虚拟四面体）

#### 插值逻辑

- 内部四面体：直接使用重心坐标插值 4 个顶点的 SH 系数
- 外部单元：沿法线方向外推，需要求解三次/二次方程确定外推距离

#### LightProbeGroup 组件

```typescript
@ccclass('cc.LightProbeGroup')
@disallowMultiple
@executeInEditMode
export class LightProbeGroup extends Component {
    @serializable protected _probes: Vec3[] = [];
    @serializable protected _method = PlaceMethod.UNIFORM;
    public generateLightProbes(): void { ... }
}
```

#### 隐含知识

- 光照探针的四面体剖分是预计算的，在场景加载时执行
- 球谐系数在 GPU 上使用 `SH9` 函数重建
- Model 通过 `useLightProbe` 属性启用光照探针
- `reduceRinging` 的 `lambda` 参数控制振铃抑制强度

---

## 2. cocos/primitive/ — 几何体基元工厂

### 2.1 概览

`cocos/primitive/` 提供常用几何体的工厂函数，用于程序化创建网格。

### 2.2 工厂函数

所有函数返回 `IGeometry` 对象，可通过 `utils.MeshUtils.createMesh(geo)` 转换为 `Mesh` 资源。

| 函数 | 文件 | 说明 |
|---|---|---|
| `box(options?)` | `cocos/primitive/box.ts` | 立方体 |
| `sphere(options?)` | `cocos/primitive/sphere.ts` | 球体 |
| `cylinder(options?)` | `cocos/primitive/cylinder.ts` | 圆柱体 |
| `cone(options?)` | `cocos/primitive/cone.ts` | 圆锥体 |
| `torus(options?)` | `cocos/primitive/torus.ts` | 圆环 |
| `plane(options?)` | `cocos/primitive/plane.ts` | 平面 |
| `quad(options?)` | `cocos/primitive/quad.ts` | 四边形 |
| `capsule(options?)` | `cocos/primitive/capsule.ts` | 胶囊体 |
| `terrain(options?)` | `cocos/primitive/terrain.ts` | 地形 |

### 2.3 IGeometry 接口

```ts
interface IGeometry {
    positions: number[];      // 顶点位置 [x,y,z, x,y,z, ...]
    normals?: number[];       // 法线
    uvs?: number[];           // UV 坐标
    colors?: number[];        // 顶点颜色
    tangents?: number[];      // 切线
    indices?: number[];       // 索引
    minPos?: Vec3;            // 包围盒最小值
    maxPos?: Vec3;            // 包围盒最大值
    boundingRadius?: number;  // 包围球半径
}
```

### 2.4 createMesh 工具

`cocos/3d/misc/create-mesh.ts` 提供 `createMesh(geo)` 函数，将 `IGeometry` 转换为 `Mesh` 资源。

```ts
import { primitives } from 'cc';
const mesh = utils.MeshUtils.createMesh(primitives.box());
```

### 2.5 隐含知识

- 所有基元函数的 `options` 参数控制细分级别
- 球体的 `segments` 参数越大越圆滑，但顶点数越多
- 圆柱体的 `sides` 控制侧面细分数
- 生成的网格不包含光照贴图 UV
- `createMesh` 创建的网格是独立的 `Mesh` 资源，需要手动管理生命周期
