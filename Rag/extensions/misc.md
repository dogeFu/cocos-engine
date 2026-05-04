# Cocos Creator 引擎 — 其他模块

> 面向 AI 辅助编程的中文参考文档。覆盖视频、WebView、性能分析器、MissingScript、射线检测工具等。

---

## 目录

1. [视频与 WebView](#1-视频与-webview)
2. [性能分析器](#2-性能分析器)
3. [MissingScript](#3-missingscript)
4. [射线检测工具](#4-射线检测工具)
5. [其他工具](#5-其他工具)

> **注意：** 原生绑定（JSB）相关内容已迁移至 [native/jsb-binding.md](native/jsb-binding.md)。

---

## 1. 视频与 WebView

### 1.1 VideoPlayer（`cocos/video/video-player.ts`）

视频播放组件。

#### 关键属性

- `resourceType`：`VideoPlayer.ResourceType` — 资源类型
- `remoteURL`：`string` — 远程 URL
- `clip`：`VideoClip` — 视频剪辑
- `playOnAwake`：`boolean` — 是否自动播放
- `volume`：`number` — 音量（0-1）
- `mute`：`boolean` — 是否静音
- `loop`：`boolean` — 是否循环
- `fullScreenOnAwake`：`boolean` — 是否全屏
- `keepAspectRatio`：`boolean` — 保持宽高比

#### ResourceType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `LOCAL` | 本地资源 |
| 1 | `REMOTE` | 远程资源 |

#### 关键方法

- `play()`：播放
- `pause()`：暂停
- `stop()`：停止
- `getDuration()`：获取时长
- `getCurrentTime()`：获取当前时间
- `seekTo(time)`：跳转到指定时间
- `isPlaying()`：是否正在播放

#### 隐含知识

- Web 平台使用 HTML5 `<video>` 元素
- 原生平台使用原生视频播放器
- 视频播放需要用户交互后才能开始（浏览器自动播放策略）
- `fullScreenOnAwake` 在某些平台上可能不生效

### 1.2 WebView（`cocos/web-view/web-view.ts`）

WebView 组件。在游戏中嵌入网页。

#### 关键属性

- `url`：`string` — 网页 URL
- `webViewEvents`：`WebView.EventType[]` — 事件数组

#### 关键方法

- `loadURL(url)`：加载 URL
- `evaluateJS(str)`：执行 JavaScript
- `setJavascriptInterfaceScheme(scheme)`：设置 JS 接口协议
- `canGoBack()` / `canGoForward()`：是否可后退/前进
- `goBack()` / `goForward()`：后退/前进
- `reload()`：重新加载

#### 隐含知识

- Web 平台上 WebView 是一个 `<iframe>` 元素
- 原生平台使用原生 WebView 控件
- `evaluateJS` 可以从 Cocos 调用 WebView 中的 JS
- 跨域限制：WebView 中的网页不能直接访问 Cocos 的资源

---

## 2. 性能分析器

### 2.1 Profiler（`cocos/profiler/profiler.ts`）

性能分析器。提供运行时性能统计。

**单例：** `profiler`

#### 关键属性

- `isRunning`：是否正在运行
- `frameTime`：帧时间
- `fps`：帧率
- `drawCalls`：Draw Call 数
- `triCount`：三角形数
- `vertexCount`：顶点数

#### 关键方法

- `start()`：开始性能分析
- `stop()`：停止性能分析
- `reset()`：重置统计
- `addProfilerDetail(title, value)`：添加自定义统计项
- `removeProfilerDetail(title)`：移除自定义统计项

#### 隐含知识

- Profiler 在编辑器中默认开启
- 运行时可通过 `profiler.start()` 手动开启
- 性能数据每帧更新
- 自定义统计项会显示在 Profiler 面板中

---

## 3. MissingScript

### 3.1 MissingScript（`cocos/misc/missing-script.ts`）

当场景中引用了不存在的脚本组件时，使用 `MissingScript` 替代。

#### 关键属性

- `compiledInfo`：`any` — 编译信息（保留原始脚本的数据）
- `error`：`string` — 错误信息

#### 隐含知识

- `MissingScript` 保留原始脚本的序列化数据
- 重新安装脚本后，`MissingScript` 会被替换回原始组件
- 不要手动删除 `MissingScript`，否则数据会丢失

---

## 4. 射线检测工具

### 4.1 geometry.Ray（`cocos/core/geometry/ray.ts`）

射线类。

```ts
const ray = new Ray(origin, direction);
```

### 4.2 射线与几何体相交测试

`cocos/core/geometry/intersect.ts` 提供射线与各种几何体的相交测试：

| 函数 | 说明 |
|---|---|
| `rayAABB(ray, aabb)` | 射线与 AABB |
| `rayOBB(ray, obb)` | 射线与 OBB |
| `raySphere(ray, sphere)` | 射线与球体 |
| `rayPlane(ray, plane)` | 射线与平面 |
| `rayTriangle(ray, triangle)` | 射线与三角形 |
| `rayMesh(ray, mesh)` | 射线与网格 |
| `rayCapsule(ray, capsule)` | 射线与胶囊体 |

### 4.3 屏幕坐标转射线

```ts
const camera = this.getComponent(Camera);
const ray = new geometry.Ray();
camera.screenPointToRay(screenPos, ray);
```

---

## 5. 其他工具

### 5.1 Renderer 基类 — 三层材质体系（`cocos/misc/renderer.ts`）

`Renderer` 是所有渲染组件的基类（3D 的 `MeshRenderer` 和 2D 的 `UIRenderer` 均继承此类），管理**三层材质概念**。

#### 三个材质层

| 层级 | 属性/方法 | 说明 |
|------|-----------|------|
| **共享材质** | `sharedMaterials` / `getSharedMaterial(idx)` | 所有使用同一材质资源的组件共享，修改影响全局 |
| **材质实例** | `materials` / `getMaterialInstance(idx)` | 为当前组件独立创建的 `MaterialInstance`，修改仅影响当前组件 |
| **渲染材质** | `getRenderMaterial(idx)` | 实际用于渲染的材质，优先使用材质实例，否则使用共享材质 |

#### 内部数据结构

```typescript
_materials: (Material | null)[]          // 共享材质数组（直接引用材质资源）
_materialInstances: (MaterialInstance | null)[]  // 材质实例数组（独立副本）
```

#### 关键方法流程

- `getMaterialInstance(idx)`：如果 `_materialInstances[idx]` 不存在，基于 `_materials[idx]` 创建 `MaterialInstance`
- `setSharedMaterial(material, index)`：设置共享材质，如果已有材质实例则销毁实例
- `setMaterialInstance(matInst, index)`：如果传入的是 `MaterialInstance`（有 parent），直接存储；否则委托给 `setSharedMaterial`
- `getRenderMaterial(index)`：返回 `_materialInstances[index] || _materials[index]`

#### 材质实例创建

```typescript
_matInsInfo.parent = this._materials[idx]!;
_matInsInfo.owner = this;
_matInsInfo.subModelIdx = idx;
const instantiated = new MaterialInstance(_matInsInfo);
```

#### 隐含知识

- 修改 `material` 属性会自动创建材质实例，修改仅影响当前组件
- 修改 `sharedMaterial` 会影响所有使用该材质的组件
- `getRenderMaterial` 返回实际渲染使用的材质，是材质实例或共享材质
- 材质实例的 `onPassStateChange` 会通知所属的 `Renderer` 重建 PSO

### 5.2 screen（`cocos/core/platform/screen.ts`）

屏幕管理。

**单例：** `screen`

- `windowSize`：窗口尺寸
- `deviceOrientation`：设备方向
- `dpiScale`：DPI 缩放
- `adaptResolution()`：适配分辨率
- `requestFullscreen()`：请求全屏
- `exitFullscreen()`：退出全屏

### 5.2 sys（`cocos/core/platform/sys.ts`）

系统信息。

**单例：** `sys`

- `os`：操作系统
- `browserType`：浏览器类型
- `isNative`：是否原生平台
- `isMobile`：是否移动设备
- `language`：系统语言
- `platform`：平台标识
- `capabilities`：设备能力

### 5.3 settings（`cocos/core/platform/settings.ts`）

项目设置。

- `querySettings(category, key)`：查询设置
- `overrideSettings(category, key, value)`：覆盖设置

### 5.4 debug（`cocos/core/platform/debug.ts`）

调试工具。

- `log(msg)`：日志输出
- `warn(msg)`：警告输出
- `error(msg)`：错误输出
- `assert(condition, msg)`：断言
- `logID(id, ...args)`：按 ID 输出日志
- `warnID(id, ...args)`：按 ID 输出警告
- `errorID(id, ...args)`：按 ID 输出错误

**关键：** 不要使用 `console.log`，使用 `debug.log` 或 `logID`/`warnID`/`errorID`。

### 5.5 macro（`cocos/core/platform/macro.ts`）

全局宏配置。

- `ENABLE_MULTI_TOUCH`：是否启用多点触控
- `TOUCH_TIMEOUT`：触摸超时
- `ENABLE_WEBGL_ANTIALIAS`：是否启用 WebGL 抗锯齿
- `CLEANUP_IMAGE_AFTER_LOAD`：加载后清理图片数据
- `ENABLE_TILEDMAP_CULLING`：是否启用 TiledMap 剔除

### 5.6 隐含知识

- `screen.windowSize` 返回逻辑尺寸，`screen.devicePixelRatio` 返回设备像素比
- `sys.isNative` 在原生平台为 true，Web 平台为 false
- `settings` 的值在引擎初始化时从项目配置加载
- `debug.log` 在发布版本中可能被移除（取决于构建配置）
- `macro` 的值在引擎初始化时设置，运行时修改可能不生效
