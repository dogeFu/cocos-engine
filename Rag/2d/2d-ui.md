# Cocos Creator 引擎 — 2D 渲染与 UI 系统

> 面向 AI 辅助编程的中文参考文档。覆盖 2D 渲染、UI 组件、TiledMap、2D 粒子。

---

## 目录

1. [cocos/2d/ — 2D 渲染系统](#1-cocos2d--2d-渲染系统)
2. [cocos/ui/ — UI 组件系统](#2-cocosui--ui-组件系统)
3. [cocos/tiledmap/ — TiledMap 地图系统](#3-cocostiledmap--tiledmap-地图系统)
4. [cocos/particle-2d/ — 2D 粒子系统](#4-cocosparticle-2d--2d-粒子系统)

---

## 1. cocos/2d/ — 2D 渲染系统

### 1.1 架构概览

2D 渲染系统基于 Batcher2D 中间层，将 2D 渲染数据合批后提交给底层渲染管线。

**核心类：**
- `Batcher2D`（`cocos/2d/renderer/batcher-2d.ts`）— 2D 渲染批处理器
- `UIRenderer`（`cocos/2d/framework/ui-renderer.ts`）— 所有 2D 渲染组件的基类
- `RenderEntity`（`cocos/2d/renderer/render-entity.ts`）— 渲染实体

### 1.2 Batcher2D（`cocos/2d/renderer/batcher-2d.ts`）

Batcher2D 是 2D 渲染的核心中间层，负责：
1. 收集所有 UIRenderer 的渲染数据
2. 按材质/纹理合批
3. 生成 DrawBatch2D 提交给 RenderScene

**单例：** 通过 `director.root.uiBatcher` 访问。

#### 关键方法

- `updateAllDirtyRenderers()`（第 463 行）：遍历所有脏 UIRenderer，调用 `updateAssembler()`。
- `flush()`：提交所有待处理的渲染批次。
- `commitComp(renderData, material, texture, renderEntity)`：提交单个渲染组件的数据。
- `autoMergeBatches(renderEntity)`：自动合批相同材质的渲染数据。

#### 合批规则

2D 渲染的合批条件：
1. **相同材质** — 使用相同的 Material 实例
2. **相同纹理** — 使用相同的 Texture（或同一动态图集）
3. **相同渲染层级** — 相同的 `stencilStage`（模板缓冲阶段）
4. **顶点数不超限** — 单批次顶点数不超过 `MAX_VERTEX_COUNT`（65535）
5. **无中断** — 中间没有不同材质的渲染对象

#### 渲染流程

```
UIRenderer.updateAssembler()
  → 填充 RenderData（顶点、索引）
  → Batcher2D.commitComp()
    → 自动合批或创建新批次
    → 生成 DrawBatch2D
    → 提交到 RenderScene.batches
```

### 1.3 UIRenderer（`cocos/2d/framework/ui-renderer.ts`）

所有 2D 渲染组件的基类（Sprite、Label、Mask、Graphics 等）。

#### 关键属性

- `material`：主材质
- `sharedMaterial`：共享材质（修改影响所有使用者）
- `materials`：材质数组（多材质支持）
- `color`：渲染颜色
- `renderData`：渲染数据（顶点/索引缓冲）
- `assembler`：装配器（负责填充顶点数据）
- `dstBlendFactor`：目标混合因子

#### 关键方法

- `updateAssembler(render)`：调用装配器填充渲染数据。
- `postUpdateAssembler(render)`：后处理渲染数据。
- `destroyRenderData()`：销毁渲染数据。
- `requestRenderData(vertexCount, indexCount)`：请求新的渲染数据。
- `setMaterial(material, index)`：设置指定索引的材质。

#### 脏标记

UIRenderer 使用脏标记系统避免不必要的更新：

| 标志 | 说明 |
|---|---|
| `RENDER_DATA_DIRTY` | 渲染数据需要更新 |
| `VERTEX_DIRTY` | 顶点数据需要更新 |
| `INDEX_DIRTY` | 索引数据需要更新 |
| `MATERIAL_DIRTY` | 材质需要更新 |
| `COLOR_DIRTY` | 颜色需要更新 |
| `NODE_DIRTY` | 节点变换需要更新 |
| `TRANSFORM_DIRTY` | 世界变换需要更新 |
| `UI_RENDER_DIRTY` | 任何渲染相关数据需要更新 |

### 1.4 Sprite（`cocos/2d/framework/sprite.ts`）

2D 精灵渲染组件。

#### 关键属性

- `spriteFrame`：`SpriteFrame` — 精灵帧
- `type`：`SpriteType` — 精灵类型
- `sizeMode`：`SizeMode` — 尺寸模式
- `trim`：`boolean` — 是否裁剪透明区域
- `fillType`：`FillType` — 填充类型（仅 FILL 模式）
- `fillCenter`：`Vec2` — 填充中心
- `fillStart`：`number` — 填充起始角度
- `fillRange`：`number` — 填充范围
- `isFlipX` / `isFlipY`：翻转

#### SpriteType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `SIMPLE` | 普通精灵 |
| 1 | `SLICED` | 九宫格切片 |
| 2 | `TILED` | 平铺 |
| 3 | `FILLED` | 填充 |

#### SizeMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `CUSTOM` | 自定义尺寸 |
| 1 | `TRIMMED` | 匹配裁剪后尺寸 |
| 2 | `RAW` | 匹配原始尺寸 |

#### 隐含知识

- 九宫格切片（SLICED）使用 `SpriteFrame.insetLeft/Top/Right/Bottom` 定义九宫格边距
- 平铺模式（TILED）会重复纹理，可能产生大量顶点
- 填充模式（FILLED）支持圆形/条形填充动画
- 修改 `spriteFrame` 会触发材质更新和渲染数据重建

### 1.5 Label（`cocos/2d/framework/label.ts`）

2D 文本渲染组件。

#### 关键属性

- `string`：文本内容
- `horizontalAlign`：水平对齐
- `verticalAlign`：垂直对齐
- `fontSize`：字体大小
- `fontFamily`：字体族
- `lineHeight`：行高
- `overflow`：`Overflow` — 溢出模式
- `enableWrapText`：是否自动换行
- `font`：`Font` — 位图字体
- `isBold` / `isItalic` / `isUnderline`：文本样式
- `cacheMode`：`CacheMode` — 缓存模式
- `spacingX`：字符间距

#### Overflow 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `NONE` | 无溢出处理 |
| 1 | `CLAMP` | 裁剪 |
| 2 | `SHRINK` | 自动缩小 |
| 3 | `RESIZE_HEIGHT` | 自动调整高度 |

#### CacheMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `NONE` | 不缓存，每帧重新渲染 |
| 1 | `BITMAP` | 缓存为位图（适合静态文本） |
| 2 | `CHAR` | 按字符缓存（适合频繁变化的文本） |

#### 隐含知识

- **CHAR 缓存模式**使用字符图集（`LetterAtlas`），将每个字符渲染到共享图集中。适合频繁变化的数字文本（如分数、计时器）。
- **BITMAP 缓存模式**将整个 Label 渲染为一张位图。适合不变化的文本。修改文本内容需要手动调用 `markForUpdateRenderData()` 重建。
- 系统字体（无 `font` 属性）使用 Canvas 2D API 渲染，性能低于位图字体。
- `enableWrapText` 在 `CLAMP` 溢出模式下默认为 true。
- `SHRINK` 模式通过二分搜索找到合适的字体大小，可能影响性能。

### 1.6 Mask（`cocos/2d/framework/mask.ts`）

遮罩组件。使用模板缓冲实现裁剪效果。

#### 关键属性

- `type`：`MaskType` — 遮罩类型
- `spriteFrame`：遮罩精灵帧（IMAGE_STENCIL 模式）
- `inverted`：是否反转遮罩
- `segments`：圆形遮罩的段数（GRAPHICS 模式）

#### MaskType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `RECT` | 矩形遮罩 |
| 1 | `ELLIPSE` | 椭圆遮罩 |
| 2 | `GRAPHICS_STENCIL` | 自定义图形遮罩 |
| 3 | `IMAGE_STENCIL` | 图片遮罩 |

#### 模板缓冲机制

Mask 使用模板缓冲实现裁剪：

1. **Mask 节点**：渲染到模板缓冲，递增模板值
2. **子节点**：在模板测试中检查模板值，仅渲染模板值匹配的区域
3. **Mask 退出**：恢复模板值

**关键：** 每个 Mask 层级会增加模板缓冲的 `stencilStage`。嵌套 Mask 会导致合批中断，因为不同的 `stencilStage` 无法合批。

### 1.7 Graphics（`cocos/2d/framework/graphics.ts`）

矢量绘图组件。提供 Canvas 2D 风格的绘图 API。

#### 关键方法

- `moveTo(x, y)` / `lineTo(x, y)`：路径操作
- `bezierCurveTo(c1x, c1y, c2x, c2y, x, y)`：贝塞尔曲线
- `quadraticCurveTo(cx, cy, x, y)`：二次贝塞尔曲线
- `arc(cx, cy, r, startAngle, endAngle, counterclockwise)`：圆弧
- `ellipse(cx, cy, rx, ry)`：椭圆
- `circle(cx, cy, r)`：圆
- `rect(x, y, w, h)`：矩形
- `roundRect(x, y, w, h, r)`：圆角矩形
- `fill()` / `stroke()`：填充/描边
- `fillRect(x, y, w, h)` / `strokeRect(x, y, w, h)`：快捷矩形
- `clear()`：清空所有路径

#### 隐含知识

- Graphics 使用三角化算法（`earcut`）将路径转换为三角形
- 复杂路径可能产生大量顶点，影响性能
- `lineWidth`、`strokeColor`、`fillColor` 在 `stroke()`/`fill()` 调用时采样
- 每次调用 `fill()`/`stroke()` 都会生成新的子路径

### 1.8 动态图集（Dynamic Atlas）

动态图集将小纹理合并到大图集中，减少 Draw Call。

**关键文件：**
- `cocos/2d/renderer/dynamic-atlas.ts` — 动态图集管理器
- `cocos/2d/renderer/dynamic-atlas/texture-atlas.ts` — 纹理图集
- `cocos/2d/renderer/dynamic-atlas/texture-atlas-manager.ts` — 图集管理器

#### 工作原理

1. 当 Sprite 使用小纹理（< `MAX_RECT_WIDTH`）渲染时
2. 动态图集将小纹理合并到 2048x2048 的大图集中
3. Sprite 的 UV 坐标被重映射到图集中的位置
4. 相同图集中的 Sprite 可以合批

#### 限制

- 纹理尺寸超过 `MAX_RECT_WIDTH`（默认 512）不参与动态图集
- 使用了 `Repeat` 寻址模式的纹理不参与
- 使用了压缩格式的纹理不参与
- 已参与动态图集的纹理修改后需要手动调用 `dynamicAtlasManager.deleteAtlasTexture(texture)` 刷新
- 动态图集在内存受限时会自动释放

#### API

- `dynamicAtlasManager.enabled = true/false`：启用/禁用动态图集
- `dynamicAtlasManager.reset()`：重置所有图集
- `dynamicAtlasManager.deleteAtlasTexture(texture)`：从图集中移除纹理

### 1.9 RenderEntity（`cocos/2d/renderer/render-entity.ts`）

渲染实体，管理 2D 渲染的顶点和索引数据。

#### RenderEntityType

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `STATIC` | 静态（不频繁更新） |
| 1 | `DYNAMIC` | 动态（每帧更新） |
| 2 | `MIDDLE` | 中等频率更新 |

### 1.10 UITransform（`cocos/2d/framework/ui-transform.ts`）

2D 节点的变换组件。提供尺寸和锚点。

#### 关键属性

- `contentSize`：`Size` — 内容尺寸
- `anchorPoint`：`Vec2` — 锚点（默认 0.5, 0.5）

#### 关键方法

- `convertToNodeSpaceAR(worldPoint)`：世界坐标转本地坐标
- `convertToWorldSpaceAR(localPoint)`：本地坐标转世界坐标
- `getWorldToWorldTransform(out?)`：世界到世界变换矩阵
- `convertToNodeSpace(worldPoint)`：世界坐标转本地坐标（无偏移）
- `convertToWorldSpace(localPoint)`：本地坐标转世界坐标（无偏移）

**关键：** 每个 2D 节点必须有 UITransform 组件。没有它，布局和渲染无法正常工作。

---

## 2. cocos/ui/ — UI 组件系统

### 2.1 Widget（`cocos/ui/widget.ts`）

对齐组件。将节点对齐到父节点的边缘。

#### 关键属性

- `isAlignTop` / `isAlignBottom` / `isAlignLeft` / `isAlignRight`：是否对齐各边
- `isAlignHorizontalCenter` / `isAlignVerticalCenter`：是否对齐中心
- `isStretchWidth` / `isStretchHeight`：是否拉伸（同时设置两边对齐）
- `top` / `bottom` / `left` / `right`：对齐偏移
- `horizontalCenter` / `verticalCenter`：中心偏移
- `target`：对齐目标（默认为父节点）
- `alignMode`：`AlignMode` — 对齐时机

#### AlignMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `ONCE` | 仅初始化时对齐 |
| 1 | `ALWAYS` | 每帧对齐 |
| 2 | `ON_WINDOW_RESIZE` | 窗口尺寸变化时对齐 |

#### 隐含知识

- Widget 在 `onEnable()` 和 `onRestore()` 时标记脏，在 `lateUpdate()` 中执行对齐
- Widget 对齐在所有布局计算之前执行
- 如果节点同时有 Widget 和 Layout，Widget 先执行
- `target` 为 null 时默认对齐到父节点的 UITransform

### 2.2 Layout（`cocos/ui/layout.ts`）

布局组件。自动排列子节点。

#### 关键属性

- `type`：`Type` — 布局类型
- `resizeMode`：`ResizeMode` — 尺寸调整模式
- `horizontalDirection`：水平排列方向
- `verticalDirection`：垂直排列方向
- `paddingLeft/Right/Top/Bottom`：内边距
- `spacingX` / `spacingY`：子节点间距
- `startAxis`：`AxisDirection` — 起始轴（GRID 模式）
- `affectedByScale`：是否受子节点缩放影响
- `constraint`：`Constraint` — 约束（GRID 模式）

#### Type 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `NONE` | 无布局 |
| 1 | `HORIZONTAL` | 水平布局 |
| 2 | `VERTICAL` | 垂直布局 |
| 3 | `GRID` | 网格布局 |

#### ResizeMode 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `NONE` | 不调整 |
| 1 | `CHILDREN` | 调整子节点尺寸 |
| 2 | `CONTAINER` | 调整容器尺寸 |

#### 隐含知识

- Layout 在 `lateUpdate()` 中执行布局计算
- 布局计算会修改子节点的位置和尺寸
- `affectedByScale = true` 会降低性能，因为需要计算每个子节点的缩放后尺寸
- 嵌套 Layout 的执行顺序是从内到外
- Layout 的 `_doLayout()` 使用脏标记避免不必要的重算

### 2.3 ScrollView（`cocos/ui/scroll-view.ts`）

滚动视图组件。

#### 关键属性

- `content`：`Node` — 可滚动的内容节点
- `horizontal` / `vertical`：是否允许水平/垂直滚动
- `inertia`：是否有惯性
- `brake`：制动系数（0-1）
- `elastic`：是否有回弹效果
- `bounceDuration`：回弹动画时长
- `horizontalScrollBar` / `verticalScrollBar`：滚动条
- `cancelInnerEvents`：滚动时是否取消内部触摸事件

#### 隐含知识

- ScrollView 通过 `scrollThreshold` 判断是滚动还是点击
- 惯性滚动使用 `brake` 系数衰减速度
- 回弹效果使用 Tween 动画
- `cancelInnerEvents = true` 时，滚动开始后子节点的触摸事件会被取消

### 2.4 Button（`cocos/ui/button.ts`）

按钮组件。

#### 关键属性

- `interactable`：是否可交互
- `transition`：`Transition` — 过渡类型
- `normalColor` / `pressedColor` / `hoverColor` / `disabledColor`：颜色状态
- `normalSprite` / `pressedSprite` / `hoverSprite` / `disabledSprite`：精灵状态
- `target`：过渡效果目标节点
- `clickEvents`：点击事件数组

#### Transition 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `NONE` | 无过渡 |
| 1 | `COLOR` | 颜色过渡 |
| 2 | `SPRITE` | 精灵过渡 |
| 3 | `SCALE` | 缩放过渡 |

### 2.5 EditBox（`cocos/ui/editbox.ts`）

文本输入框组件。

#### 关键属性

- `string`：输入文本
- `inputMode`：`InputMode` — 输入模式
- `inputFlag`：`InputFlag` — 输入标志
- `returnType`：`KeyboardReturnType` — 回车键类型
- `maxLength`：最大长度
- `placeholder`：占位文本
- `placeholderColor`：占位文本颜色
- `textLabel`：文本 Label
- `placeholderLabel`：占位文本 Label
- `background`：背景节点

#### 隐含知识

- EditBox 在原生平台使用原生输入框覆盖在 WebView 上
- `inputMode` 决定弹出的键盘类型（数字、邮箱等）
- `inputFlag` 控制密码模式等
- EditBox 的 `stayOnTop` 属性控制原生输入框是否始终在最上层

### 2.6 其他 UI 组件

| 组件 | 文件 | 说明 |
|---|---|---|
| `ProgressBar` | `cocos/ui/progress-bar.ts` | 进度条 |
| `Slider` | `cocos/ui/slider.ts` | 滑动条 |
| `Toggle` | `cocos/ui/toggle.ts` | 切换按钮 |
| `ToggleContainer` | `cocos/ui/toggle-container.ts` | 单选按钮组 |
| `PageView` | `cocos/ui/page-view.ts` | 翻页视图 |
| `SafeArea` | `cocos/ui/safe-area.ts` | 安全区域适配 |

---

## 3. cocos/tiledmap/ — TiledMap 地图系统

### 3.1 模块结构

| 文件 | 职责 |
|------|------|
| `tiled-map.ts` | 主组件 `TiledMap`，加载 TMX 资源并构建图层 |
| `tiled-map-asset.ts` | 资源类 `TiledMapAsset`，存储 TMX XML、SpriteFrame 等 |
| `tiled-layer.ts` | 图层渲染组件 `TiledLayer`，继承自 `UIRenderer` |
| `tiled-object-group.ts` | 对象组组件 `TiledObjectGroup` |
| `tiled-tile.ts` | 单个瓦片控制组件 `TiledTile` |
| `tiled-types.ts` | 类型定义：枚举、接口、数据结构 |
| `tmx-xml-parser.ts` | TMX XML 解析器 `TMXMapInfo` |
| `assembler/simple.ts` | 渲染组装器，顶点填充和裁剪遍历 |

### 3.2 TiledMapAsset — 资源容器

继承自 `Asset`，是 TMX 地图资源的容器：

| 属性 | 说明 |
|------|------|
| `tmxXmlStr` | TMX XML 字符串 |
| `tsxFiles` | `TextAsset[]` — 外部 tileset 文件内容 |
| `tsxFileNames` | 外部 tileset 文件名 |
| `spriteFrames` | `SpriteFrame[]` — 瓦片精灵帧数组 |
| `imageLayerSpriteFrame` | 图像层精灵帧 |

TMX 文件以 XML 字符串形式存储，图片资源以 `SpriteFrame[]` 形式存储，通过名称映射关联。

### 3.3 TMXMapInfo — XML 解析器

**文件：** `cocos/tiledmap/tmx-xml-parser.ts`

解析流程：`initWithXML()` → `parseXMLString()` → 按 `<map>` → `<tileset>` → `<layer>` / `<objectgroup>` / `<imagelayer>` 顺序解析。

**Tile 数据解码支持 4 种格式：**

| 格式 | 解码方式 |
|------|----------|
| base64 + gzip | `codec.unzipBase64AsArray()` |
| base64 + zlib | `zlib.Inflate` + `uint8ArrayToUint32Array()` |
| base64 无压缩 | `codec.Base64.decodeAsArray()` |
| CSV | 逗号分隔直接解析 |
| XML | 逐个 `<tile gid="...">` 解析 |

### 3.4 TiledLayer — 图层渲染与裁剪

**文件：** `cocos/tiledmap/tiled-layer.ts`

继承自 `UIRenderer`，是渲染的核心。

**三种地图方向：**

| 方向 | 位置计算 | 说明 |
|------|----------|------|
| ORTHO | `_positionForOrthoAt()` | 简单网格坐标映射 |
| ISO | `_positionForIsoAt()` | 菱形坐标变换 |
| HEX | `_positionForHexAt()` | 根据 staggerAxis/staggerIndex 计算偏移 |

**瓦片裁剪（Culling）机制：**

1. `updateCulling()` 获取渲染相机，将屏幕坐标转换为 layer 本地坐标
2. `updateViewPort()` 根据视口计算 `_cullingRect`（leftDown / rightTop 的行列）
3. `_positionToRowCol()` 将像素坐标转为行列号（支持三种方向）
4. ISO 地图额外保留 2 行缓冲

**相机监听：** `_reinstallCamera()` 监听相机节点的 `TRANSFORM_CHANGED` 和 `SIZE_CHANGED` 事件，自动触发裁剪更新。

**用户节点系统：** 支持通过 `addUserNode()` / `removeUserNode()` 添加自定义节点，节点位置变化时自动更新网格归属。

### 3.5 TiledObjectGroup — 对象组

**文件：** `cocos/tiledmap/tiled-object-group.ts`

支持的对象类型：

| 类型 | 实现 |
|------|------|
| RECT | 矩形 |
| ELLIPSE | 椭圆 |
| POLYGON | 多边形 |
| POLYLINE | 折线 |
| IMAGE | 通过 gid 引用瓦片图片，创建 Sprite 节点 |
| TEXT | 创建 Label 节点 |

ISO 坐标转换：对象坐标从 TMX 坐标系（y 向下）转为引擎坐标系（y 向上），等距地图额外做菱形坐标变换。

### 3.6 Assembler — 渲染组装器

**文件：** `cocos/tiledmap/assembler/simple.ts`

**核心函数 `traverseGrids()`：**
- 根据 `RenderOrder`（RightDown/LeftDown/RightUp/LeftUp）决定遍历方向
- 只遍历裁剪矩形内的瓦片
- 纹理切换时调用 `packRenderData()` 打包当前批次
- 每个瓦片填充 4 个顶点（pos + uv + color = 9 float/vertex）
- 支持瓦片翻转（水平/垂直/对角线）通过 `_flipTexture()` 交换 UV 坐标
- 顶点数超过 `MaxGridsLimit`（65535/6 ≈ 10922）时自动分批

### 3.7 动画系统

`TiledMap.lateUpdate(dt)` 驱动瓦片动画：动画通过替换 `texGrids` 中 GID 对应的 `TiledGrid` 实现，所有引用该 GID 的瓦片自动更新。

### 3.8 隐含知识

- TMX 地图支持三种方向：正交（ORTHO）、等距（ISO）、六边形（HEX）
- 瓦片裁剪基于相机视口计算，每帧自动更新
- 用户节点通过 `TiledUserNodeData` 组件关联到网格坐标
- 动画瓦片通过替换 `texGrids` 中的 `TiledGrid` 实现全局更新
- ISO 地图的裁剪需要额外 2 行缓冲以避免边缘空白

---

## 4. cocos/particle-2d/ — 2D 粒子系统

### 4.1 ParticleSystem2D（`cocos/particle-2d/particle-system-2d.ts`）

2D 粒子系统组件。

#### 关键属性

- `file`：粒子配置文件（plist 格式）
- `spriteFrame`：粒子纹理
- `preview`：是否在编辑器中预览
- `playOnLoad`：是否自动播放

#### 关键方法

- `play()`：播放
- `pause()`：暂停
- `stop()`：停止
- `clear()`：清除所有粒子
- `rate`：发射速率

### 4.2 粒子属性

2D 粒子使用 plist 格式配置，支持以下属性：

- **生命周期**：粒子存活时间
- **发射速率**：每秒发射数量
- **数量限制**：最大粒子数
- **发射角度**：粒子初始方向
- **速度**：粒子初始速度
- **重力**：粒子受到的重力
- **径向加速度**：向发射中心的加速度
- **切向加速度**：绕发射中心的加速度
- **颜色**：起始/结束颜色
- **大小**：起始/结束大小
- **旋转**：起始/结束旋转
- **混合模式**：加法/标准

### 4.3 隐含知识

- 2D 粒子使用 `cc.ParticleAsset`（plist 格式），与 3D 粒子系统完全不同
- 2D 粒子不支持模块化配置，所有参数在 plist 文件中定义
- 2D 粒子的渲染使用 Sprite 的合批机制
- `gravity` 模式使用重力和加速度，`radius` 模式使用径向/切向加速度
