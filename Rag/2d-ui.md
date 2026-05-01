# Cocos Creator Engine: 2D Rendering, UI, TiledMap & Particle-2D Module Reference

> Auto-generated from engine source for AI-assisted scripting.  
> Engine path root: `cocos/`  
> All file paths are relative to the engine root unless stated otherwise.

---

## Table of Contents

1. [2D Rendering System (`cocos/2d/`)](#1-2d-rendering-system-cocos2d)
   - [1.1 Architecture Overview](#11-architecture-overview)
   - [1.2 Sprite Component](#12-sprite-component)
   - [1.3 Label Component](#13-label-component)
   - [1.4 Mask Component](#14-mask-component)
   - [1.5 Graphics Component](#15-graphics-component)
   - [1.6 RichText Component](#16-richtext-component)
   - [1.7 UITransform](#17-uitransform)
   - [1.8 SpriteFrame & SpriteAtlas](#18-spriteframe--spriteatlas)
   - [1.9 Assembler System](#19-assembler-system)
   - [1.10 Batcher2D -- The Rendering Core](#110-batcher2d----the-rendering-core)
   - [1.11 Dynamic Atlas System](#111-dynamic-atlas-system)
   - [1.12 Stencil & Mask Rendering](#112-stencil--mask-rendering)
   - [1.13 UIStaticBatch](#113-uistaticbatch)
2. [UI Components (`cocos/ui/`)](#2-ui-components-cocosui)
   - [2.1 Widget & WidgetManager](#21-widget--widgetmanager)
   - [2.2 Layout](#22-layout)
   - [2.3 ScrollView](#23-scrollview)
   - [2.4 PageView](#24-pageview)
   - [2.5 Button](#25-button)
   - [2.6 Toggle & ToggleContainer](#26-toggle--togglecontainer)
   - [2.7 Slider](#27-slider)
   - [2.8 ProgressBar](#28-progressbar)
   - [2.9 EditBox](#29-editbox)
   - [2.10 SafeArea](#210-safearea)
   - [2.11 BlockInputEvents](#211-blockinputevents)
   - [2.12 ScrollBar](#212-scrollbar)
3. [TiledMap (`cocos/tiledmap/`)](#3-tiledmap-cocostiledmap)
4. [ParticleSystem2D (`cocos/particle-2d/`)](#4-particlesystem2d-cocosparticle-2d)
5. [File Path Index](#5-file-path-index)

---

## 1. 2D Rendering System (`cocos/2d/`)

### 1.1 Architecture Overview

The 2D rendering pipeline follows this flow:

```
RenderRoot2D (entry point) 
  -> Batcher2D.update() 
    -> walk(node tree) 
      -> UIRenderer.fillBuffers() / commitComp() 
        -> Assembler generates vertex data into StaticVBAccessor / MeshBuffer
          -> DrawBatch2D submitted to scene
```

**Key architectural facts:**

- Every 2D scene needs at least one `RenderRoot2D` component (typically on a Canvas root node). It registers itself with `Batcher2D.addScreen()` on enable (`cocos/2d/framework/render-root-2d.ts:44`).
- `Batcher2D` walks the node tree depth-first, collecting renderers into draw batches. Batches are merged when they share the same material, texture, and stencil state (`cocos/2d/renderer/batcher-2d.ts:273-320`).
- All UI vertex data is in **world coordinates** (the transform is baked into vertices for Sprites/Labels), except for Graphics and UIModel which use local-space `Model` objects (`cocos/2d/renderer/batcher-2d.ts:416-428`).
- The `@executionOrder(110)` on all 2D components ensures they update after transform calculations.

### 1.2 Sprite Component

**File:** `cocos/2d/components/sprite.ts`  
**Class:** `cc.Sprite extends UIRenderer` (line 171)

#### Sprite Types (`SpriteType` enum, line 47)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `SIMPLE` | Single quad rendering. 4 vertices, 6 indices. |
| 1 | `SLICED` | 9-slice/scale-9 grid. 16 vertices, 54 indices. Corners don't stretch. |
| 2 | `TILED` | Tiled fill. Repeats the sprite across the area. |
| 3 | `FILLED` | Fill progress (horizontal, vertical, or radial). |

#### Fill Types (`FillType` enum, line 94)

Only active when `type === SpriteType.FILLED`:
- `HORIZONTAL = 0` -- left-to-right fill
- `VERTICAL = 1` -- bottom-to-top fill
- `RADIAL = 2` -- radial/clock fill (uses `fillCenter`, `fillStart`, `fillRange`)

#### Size Modes (`SizeMode` enum, line 128)

- `CUSTOM = 0` -- Use the node's existing UITransform size.
- `TRIMMED = 1` -- Auto-resize to spriteFrame.rect (trimmed, transparent pixels removed). **This is the default.**
- `RAW = 2` -- Auto-resize to spriteFrame.originalSize (full original dimensions).

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `spriteFrame` | `SpriteFrame \| null` | 204 | The displayed frame. Setting it triggers `_applySpriteFrame` which handles texture changes, atlas UV updates, and material switches. |
| `spriteAtlas` | `SpriteAtlas \| null` | 185 | Atlas reference for `changeSpriteFrameFromAtlas()`. |
| `type` | `SpriteType` | 236 | Changing type calls `_flushAssembler()` to switch the assembler. |
| `fillType` | `FillType` | 262 | Only effective for `FILLED` type. |
| `fillCenter` | `Vec2` | 293 | Center point for radial fill. |
| `fillStart` | `number` | 317 | Start angle [0, 1] for fill. |
| `fillRange` | `number` | 345 | Fill extent [-1, 1]. Positive = counterclockwise. |
| `trim` | `boolean` | 375 | Only visible when type is SIMPLE. Whether to use trimmed rect. |
| `sizeMode` | `SizeMode` | 424 | Controls auto-resize behavior. |
| `grayscale` | `boolean` | 397 | Grayscale rendering mode. Changes material define. |

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `changeSpriteFrameFromAtlas` | 527 | `(name: string): void` | Quick switch by name. Requires `spriteAtlas` to be set. Warns if no atlas. |
| `_render` | 580 | `(render: IBatcher): void` | Called by Batcher2D. Calls `render.commitComp(this, ...)` to submit draw data. |
| `_canRender` | 584 | `(): boolean` | Returns false if no spriteFrame or texture. |
| `_flushAssembler` | 597 | `(): void` | Picks the correct assembler based on type, creates RenderData if needed. |

#### Hidden Gotchas

- **SLICED + UV_UPDATED:** When type is SLICED, the Sprite listens for `SpriteFrameEvent.UV_UPDATED` events to recompute UVs when cap insets change (line 499). This listener is removed when type changes away from SLICED.
- **RenderTexture special material:** If the spriteFrame's texture is a `RenderTexture`, a special material with `SAMPLE_FROM_RT: true` is created automatically (line 566-578).
- **Alpha-separated materials:** ETC1/PVRTC textures automatically switch to alpha-separated material mode to handle transparency (line 546-563).
- **SizeMode default is TRIMMED**, not CUSTOM. This means setting a Sprite with no explicit size will auto-resize the node to the trimmed sprite rect dimensions.

### 1.3 Label Component

**File:** `cocos/2d/components/label.ts`  
**Class:** `cc.Label extends UIRenderer` (line 180)

#### Label Font Modes

The Label uses different assemblers depending on its font type and cache mode. This is selected at `cocos/2d/assembler/label/index.ts:34-44`:

| Condition | Assembler | Description |
|-----------|-----------|-------------|
| `font instanceof BitmapFont` | `bmfont` | Bitmap font rendering. Uses pre-rendered character atlas. |
| `cacheMode === CacheMode.CHAR` | `letter` | Character-level caching. Each character is individually cached into a 1024x1024 dynamic atlas. |
| Default (TTF / system font) | `ttf` | Full-text TTF rendering. Renders entire string to a canvas, then uploads as texture. |

#### Cache Modes (`CacheMode` enum, line 143)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `NONE` | No caching. Each label renders independently. |
| 1 | `BITMAP` | Renders the label to an image and packs it into the dynamic atlas for batching. Good for static text. Disabled on some platforms (WeChat Mini Game, Chrome). |
| 2 | `CHAR` | Splits text into individual characters, each cached in a 1024x1024 atlas. Good for frequently changing text with limited character set. Cannot use shadow effect in this mode. |

#### Overflow Modes (`Overflow` enum, line 108)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `NONE` | No restriction. Content can overflow. |
| 1 | `CLAMP` | Clips content that exceeds bounds. |
| 2 | `SHRINK` | Dynamically reduces font size to fit. CPU-intensive on refresh. |
| 3 | `RESIZE_HEIGHT` | Width is fixed, height auto-expands. |

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `string` | `string` | 219 | The text content. null/undefined coerced to ''. |
| `horizontalAlign` | `HorizontalTextAlignment` | 246 | LEFT, CENTER, RIGHT |
| `verticalAlign` | `VerticalTextAlignment` | 266 | TOP, CENTER, BOTTOM |
| `fontSize` | `number` | 301 | Default: 40 |
| `lineHeight` | `number` | 320 | Default: 40. Should be >= fontSize for clean rendering. |
| `font` | `Font \| null` | 462 | Setting to null switches to system font. Setting a BitmapFont switches assembler. |
| `fontFamily` | `string` | 440 | System font name. Default: 'Arial'. Only used when useSystemFont is true. |
| `useSystemFont` | `boolean` | 405 | Default: true. |
| `cacheMode` | `CacheMode` | 498 | Default: NONE. |
| `overflow` | `Overflow` | 365 | Default: NONE. |
| `enableWrapText` | `boolean` | 385 | Auto word-wrap. Default: true. |
| `spacingX` | `number` | 344 | Character spacing. Only for BMFont. |
| `enableOutline` | `boolean` | 605 | Outline effect. TTF/system only, not BitmapFont. |
| `outlineColor` | `Color` | 624 | Default: black. |
| `outlineWidth` | `number` | 640 | Default: 2. |
| `enableShadow` | `boolean` | 659 | Shadow effect. TTF/system only. Disabled in CHAR cache mode. |
| `shadowColor` | `Color` | 675 | Default: black. |
| `shadowOffset` | `Vec2` | 697 | Default: (2, 2). |
| `shadowBlur` | `number` | 716 | Default: 2. |
| `isBold` | `boolean` | 527 | |
| `isItalic` | `boolean` | 547 | |
| `isUnderline` | `boolean` | 567 | |
| `underlineHeight` | `number` | 587 | Default: 2. |

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `updateRenderData` | 961 | `(force = false): void` | Call to force re-layout. `force=true` flushes assembler and re-applies font texture. |
| `_applyFontTexture` | 1036 | `(): void` | Internal. Creates/updates the texture based on cache mode and font type. |

#### Hidden Gotchas

- **Setting font to null auto-enables system font** (line 472: `this._isSystemFontUsed = !value`).
- **Shadow is incompatible with CHAR cache mode** (line 657: `visible` check).
- **Outline is incompatible with BitmapFont** (line 603: `visible` check).
- **Color handling differs between TTF and BitmapFont:** For TTF labels, the entity color alpha is used but RGB is set to 255 (line 992: `tempColor.set(255, 255, 255, color.a)`). For BitmapFont, the full color is passed through.
- **lineHeight must be >= fontSize** or text will clip vertically.

### 1.4 Mask Component

**File:** `cocos/2d/components/mask.ts`  
**Class:** `cc.Mask extends Component` (line 116)

**Important:** Mask extends `Component`, NOT `UIRenderer`. It internally creates either a `Sprite` or `Graphics` sub-component on the same node.

#### Mask Types (`MaskType` enum, line 65)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `GRAPHICS_RECT` | Rectangle mask using Graphics component. |
| 1 | `GRAPHICS_ELLIPSE` | Ellipse mask using Graphics. Segments property controls smoothness. |
| 2 | `GRAPHICS_STENCIL` | Custom shape mask via Graphics drawing commands. |
| 3 | `SPRITE_STENCIL` | Image-based mask using a Sprite's alpha channel. |

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `type` | `MaskType` | 137 | Changing type removes the old sub-component and creates a new one. |
| `inverted` | `boolean` | 181 | Reverses the mask. Uses `Stage.ENTER_LEVEL_INVERTED`. |
| `segments` | `number` | 205 | Ellipse smoothness. Range [3, 10000]. Default: 64. |
| `alphaThreshold` | `number` | 259 | Only for SPRITE_STENCIL. Pixels with alpha below this are clipped. Default: 0.1. |
| `subComp` | `Sprite \| Graphics \| null` | 279 | Read-only. Returns the internal rendering sub-component. |

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `isHit` | 338 | `(worldPt: Vec2): boolean` | Hit-test against the mask shape. Used by UITransform._maskTest. |

#### Hidden Gotchas

- **Mask creates sub-components on the same node.** Changing `type` between SPRITE_STENCIL and GRAPHICS types will destroy the old sub-component and create a new one (line 141-170).
- **Mask children are clipped via stencil buffer,** not via geometric testing. The `isHit` method is only for touch/click testing.
- **`alphaThreshold` only works with SPRITE_STENCIL** (line 254: visibility check).
- **NodeEventProcessor._maskComp is set to Mask** (line 695), integrating Mask with the engine's event propagation system for hit testing.

### 1.5 Graphics Component

**File:** `cocos/2d/components/graphics.ts`  
**Class:** `cc.Graphics extends UIRenderer` (line 62)

Provides a Canvas-like drawing API. Uses a `scene.Model` for rendering (local-space, like 3D objects), unlike Sprites/Labels which use world-space vertex data.

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `lineWidth` | `number` | 72 | Default: 1 |
| `strokeColor` | `Readonly<Color>` | 137 | Default: black |
| `fillColor` | `Readonly<Color>` | 159 | Default: white |
| `lineJoin` | `LineJoin` | 93 | MITER, BEVEL, or ROUND |
| `lineCap` | `LineCap` | 114 | BUTT, ROUND, or SQUARE |
| `miterLimit` | `number` | 180 | Default: 10 |

#### Drawing Methods (Canvas-like API)

All drawing methods delegate to `this.impl`:

| Method | Line | Signature |
|--------|------|-----------|
| `moveTo` | 310 | `(x, y): void` |
| `lineTo` | 330 | `(x, y): void` |
| `bezierCurveTo` | 358 | `(c1x, c1y, c2x, c2y, x, y): void` |
| `quadraticCurveTo` | 382 | `(cx, cy, x, y): void` |
| `arc` | 411 | `(cx, cy, r, startAngle, endAngle, counterclockwise): void` |
| `ellipse` | 435 | `(cx, cy, rx, ry): void` |
| `circle` | 457 | `(cx, cy, r): void` |
| `rect` | 481 | `(x, y, w, h): void` |
| `roundRect` | 507 | `(x, y, w, h, r): void` |
| `fillRect` | 531 | `(x, y, w, h): void` -- convenience for rect + fill |
| `fill` | 604 | `(): void` -- fills the current path |
| `stroke` | 587 | `(): void` -- strokes the current path |
| `clear` | 543 | `(): void` -- erases all drawn content |
| `close` | 572 | `(): void` -- closes the current path |

#### Hidden Gotchas

- **Graphics uses a Model (not vertex data committed via commitComp).** This means it goes through `commitModel` (line 704), which breaks batching with other UI elements.
- **Drawing coordinates are in local space** relative to the Graphics node's anchor point.
- **You must call `stroke()` or `fill()` after defining a path** for anything to render.
- **`clear()` also resets `_isDrawing`** (line 549), so nothing renders until you draw again.

### 1.6 RichText Component

**File:** `cocos/2d/components/rich-text.ts`  
**Class:** `cc.RichText extends Component` (line 157)

RichText is a composite component. It parses HTML-like tags and creates child Label and Sprite nodes dynamically.

#### Supported HTML Tags

Parsed by `HtmlTextParser` (`cocos/2d/utils/html-text-parser.ts`):

| Tag | Attributes | Description |
|-----|-----------|-------------|
| `<color>` | color (hex or name) | Text color |
| `<size>` | size (number) | Font size |
| `<b>` | -- | Bold |
| `<i>` | -- | Italic |
| `<u>` | -- | Underline |
| `<outline>` | color, width | Text outline |
| `<img>` | src, width, height, align, offset | Inline image from imageAtlas |
| `<br/>` | -- | Line break |
| `<on>` | click, param | Click event handler |

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `string` | `string` | 166 | HTML-formatted text content. |
| `horizontalAlign` | `HorizontalTextAlignment` | 186 | |
| `verticalAlign` | `VerticalTextAlignment` | 206 | |
| `fontSize` | `number` | 230 | Default font size for segments. |
| `fontColor` | `Color` | 252 | Default color (used when no `<color>` tag). |
| `fontFamily` | `string` | 272 | Default: 'Arial'. |
| `font` | `TTFFont \| null` | 290 | Custom TTF font asset. |
| `maxWidth` | `number` | 368 | 0 = no limit. When > 0, text wraps at this width. |
| `lineHeight` | `number` | 390 | Default: 40. |
| `imageAtlas` | `SpriteAtlas \| null` | 412 | Required for `<img>` tags. src values map to spriteFrame names. |
| `handleTouchEvent` | `boolean` | 435 | Whether to intercept touch events. Default: true. |
| `cacheMode` | `CacheMode` | 349 | Cache mode for child labels. |

#### Hidden Gotchas

- **RichText extends Component, NOT UIRenderer.** It manages rendering by creating child Label/Sprite nodes. This means it has higher overhead than a single Label.
- **Child nodes are pooled and reused** (line 58-78: `labelPool`, `imagePool`). Children have `DontSave | HideInHierarchy` flags.
- **Long strings are split at 2048px width** (line 600-607) to avoid texture size limits.
- **Click events on segments** require `handleTouchEvent = true` and use the `<on click="handlerName" param="value">` tag pattern. The handler is called on all components of the RichText node (line 771-786).
- **Image scaling:** `<img>` images auto-scale to match `lineHeight` unless explicit height is given (line 1015-1023).
- **Layout is recalculated entirely on string change.** `_updateRichText()` parses HTML, creates segments, calculates positions.

### 1.7 UITransform

**File:** `cocos/2d/framework/ui-transform.ts`  
**Class:** `cc.UITransform extends Component` (line 55)

The fundamental 2D transform component. Every UI node needs one. Provides content size, anchor point, and hit testing.

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `contentSize` | `Readonly<Size>` | 69 | Default: (100, 100). Emits `SIZE_CHANGED`. |
| `width` | `number` | 95 | Shortcut for contentSize.width. |
| `height` | `number` | 121 | Shortcut for contentSize.height. |
| `anchorPoint` | `Readonly<Vec2>` | 151 | Default: (0.5, 0.5) = center. Emits `ANCHOR_CHANGED`. |
| `anchorX` / `anchorY` | `number` | 172 / 192 | Individual anchor accessors. |
| `priority` | `number` | 216 | **Deprecated since v3.1.** Rendering priority within siblings. |

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `setContentSize` | 301 | `(size: Size): void` or `(width, height): void` | Overload. Uses `approx()` for epsilon comparison. |
| `setAnchorPoint` | 382 | `(point: Vec2): void` or `(x, y): void` | Overload. |
| `hitTest` | 460 | `(screenPoint: Vec2, windowId = 0): boolean` | Screen-space hit test. Converts screen -> world -> local, then checks bounds + mask chain. |
| `isHit` | 413 | `(uiPoint: Vec2): boolean` | **Deprecated since v3.5.** UI-space hit test. |
| `convertToNodeSpaceAR` | 550 | `(worldPoint: Vec3, out?): Vec3` | Converts world point to local node space (anchor-relative). |
| `convertToWorldSpaceAR` | 578 | `(nodePoint: Vec3, out?): Vec3` | Converts local point to world space. |
| `getBoundingBox` | 604 | `(): Rect` | AABB in parent space (self only, no children). |
| `getBoundingBoxToWorld` | 625 | `(): Rect` | AABB in world space including active children. |
| `getBoundingBoxTo` | 672 | `(targetMat: Mat4): Rect` | AABB in arbitrary target coordinate system. |
| `getComputeAABB` | 718 | `(out?): geometry.AABB` | For raycasting. |

#### Hidden Gotchas

- **Default content size is 100x100** (line 260). If no UITransform size is explicitly set, this is what you get.
- **Anchor point default is (0.5, 0.5)** -- center. This differs from some frameworks where default is (0, 0).
- **hitTest uses camera projection** to convert screen to world coordinates (line 467-477). It iterates all cameras and tests against each.
- **Mask chain testing:** `hitTest` calls `_maskTest` which walks up the node hierarchy checking against any Mask components in the `maskList` (line 500-529).
- **Sibling sorting is deferred** -- priority changes are collected into `priorityChangeNodeMap` and applied after the frame update via `DirectorEvent.AFTER_UPDATE` (line 820).

### 1.8 SpriteFrame & SpriteAtlas

**SpriteFrame:** `cocos/2d/assets/sprite-frame.ts`  
**SpriteAtlas:** `cocos/2d/assets/sprite-atlas.ts`

#### SpriteFrame (`ISpriteFrameInitInfo` interface, line 111)

Key fields when creating a SpriteFrame:
- `texture` -- The source TextureBase
- `rect` -- The sub-rect within the texture
- `offset` -- Offset from original center to trimmed center
- `originalSize` -- Original image size before trimming
- `borderTop/borderBottom/borderLeft/borderRight` -- 9-slice cap insets (for SLICED mode)
- `packable` -- Whether the frame can be packed into dynamic atlas

#### SpriteAtlas (`cc.SpriteAtlas extends Asset`, line 49)

| Method | Signature | Notes |
|--------|-----------|-------|
| `getTexture` | `(): TextureBase \| null` | Returns the texture of the first spriteFrame. |
| `getSpriteFrame` | `(name: string): SpriteFrame \| null` | Lookup by name. |
| `getSpriteFrames` | `(): ISpriteFrameList` | Returns all sprite frames. |

### 1.9 Assembler System

Assemblers generate vertex/index data for renderers. Each renderable component has a static `Assembler` manager.

#### Sprite Assembler (`cocos/2d/assembler/sprite/index.ts`)

| SpriteType | Assembler | File | Vertex Count |
|-----------|-----------|------|-------------|
| SIMPLE | `simple` | `cocos/2d/assembler/sprite/simple.ts` | 4 |
| SLICED | `sliced` | `cocos/2d/assembler/sprite/sliced.ts` | 16 |
| TILED | `tiled` | `cocos/2d/assembler/sprite/tiled.ts` | Varies |
| FILLED (H/V) | `barFilled` | `cocos/2d/assembler/sprite/bar-filled.ts` | 4 |
| FILLED (radial) | `radialFilled` | `cocos/2d/assembler/sprite/radial-filled.ts` | Varies |

The `Simple` assembler calls `dynamicAtlasManager.packToDynamicAtlas()` before generating vertices (`cocos/2d/assembler/sprite/simple.ts:55`), enabling dynamic atlas batching.

#### Label Assembler (`cocos/2d/assembler/label/index.ts`)

| Condition | Assembler | File |
|-----------|-----------|------|
| BitmapFont | `bmfont` | `cocos/2d/assembler/label/bmfont.ts` |
| CHAR cache | `letter` | `cocos/2d/assembler/label/letter.ts` |
| Default (TTF) | `ttf` | `cocos/2d/assembler/label/ttf.ts` |

### 1.10 Batcher2D -- The Rendering Core

**File:** `cocos/2d/renderer/batcher-2d.ts`  
**Class:** `Batcher2D implements IBatcher` (line 88)

#### Batching Logic

The batcher merges draw calls when these conditions are met (line 453):
1. Same `dataHash` on the RenderData (same vertex data)
2. Same `material`
3. Same `depthStencilStateStage` (stencil state for masks)
4. Same texture and sampler

When any condition changes, `autoMergeBatches()` is called to finalize the current batch and start a new one.

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `addScreen` | 227 | `(comp: RenderRoot2D): void` | Registers a render root. |
| `removeScreen` | 242 | `(comp: RenderRoot2D): void` | Unregisters a render root. |
| `update` | 273 | `(): void` | Main update loop. Walks all screens, collects batches, submits to scene. |
| `walk` | 906 | `(node: Node, level?): void` | Depth-first tree traversal. Handles opacity cascading and render collection. |
| `commitComp` | 429 | `(comp, renderData, frame, assembler, transform): void` | Main entry for UI component rendering. Handles batch merging. |
| `commitModel` | 599 | `(comp, model, mat): void` | For Graphics/UIModel (local-space rendering). |
| `autoMergeBatches` | 678 | `(renderComp?): void` | Finalizes current batch into a DrawBatch2D. |
| `switchBufferAccessor` | 384 | `(attributes?): StaticVBAccessor` | Switches vertex buffer format. |
| `forceMergeBatches` | 787 | `(material, frame, renderComp): void` | Force-merge with specific material/texture. |

#### Opacity Cascading

The `walk()` method (line 906) cascades opacity down the tree:
- `selfOpacity = render.color.a / 255 * uiProps.localOpacity`
- Final opacity = parentOpacity * selfOpacity
- Opacity is written into the vertex buffer via `updateOpacity()` when dirty (line 848-867).

#### Hidden Gotchas

- **Batches are per-frame** -- they are cleared every frame in `reset()` (line 340-377).
- **Static batches persist** across frames (line 348: `if (batch.isStatic) continue`).
- **The walk is depth-first, breadth-ordered** -- siblings with lower `siblingIndex` render first.
- **Mask creates a stencil clear model** and pushes/pops stencil state during walk (line 1034-1074).

### 1.11 Dynamic Atlas System

**File:** `cocos/2d/utils/dynamic-atlas/atlas-manager.ts`  
**Class:** `DynamicAtlasManager extends System` (line 45)

Automatically packs small sprite frames into shared atlas textures at runtime for better batching.

#### Key Properties

| Property | Default | Notes |
|----------|---------|-------|
| `enabled` | `false` | Disabled when `macro.CLEANUP_IMAGE_CACHE` is true. |
| `maxAtlasCount` | 5 | Maximum number of atlas textures. |
| `textureSize` | 2048 | Atlas texture dimensions (square). |
| `maxFrameSize` | 512 | Maximum size of individual sprites that can be packed. |
| `textureBleeding` | true | Adds 1px padding to prevent texture bleeding. |

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `insertSpriteFrame` | 183 | `(spriteFrame): {x, y, texture} \| null` | Packs a sprite. Returns atlas coordinates or null. |
| `packToDynamicAtlas` | 286 | `(comp, frame): void` | Convenience. Packs and updates the spriteFrame's atlas info. |
| `deleteAtlasSpriteFrame` | 240 | `(spriteFrame): void` | Removes a sprite from the atlas. |
| `reset` | 222 | `(): void` | Destroys all atlases. Called on scene load. |

#### Hidden Gotchas

- **Only LINEAR-filtered textures** are accepted (line 196-198). Nearest-filtered (pixel art) sprites are excluded.
- **Only packable, non-original sprites** are accepted. Sprites already in an atlas (`spriteFrame.original` is set) are skipped.
- **The first sprite frame's sampler settings** define the atlas's filter mode. Subsequent sprites with different settings are rejected.
- **Dynamic atlas is per-scene** -- `reset()` is called on `DirectorEvent.BEFORE_SCENE_LAUNCH` (line 77, 162).
- **Chrome and WeChat Mini Game** may have dynamic atlas disabled.

### 1.12 Stencil & Mask Rendering

**File:** `cocos/2d/renderer/stencil-manager.ts`

The `StencilManager` manages a stack-based stencil state machine for mask rendering:

| Stage | Value | Description |
|-------|-------|-------------|
| `DISABLED` | 0 | No stencil testing. |
| `CLEAR` | 1 | Clear the stencil buffer. |
| `ENTER_LEVEL` | 2 | Start a new mask level. |
| `ENABLED` | 3 | Inside a masked area. |
| `EXIT_LEVEL` | 4 | Exit a mask level. |
| `CLEAR_INVERTED` | 5 | Clear with inverted mask. |
| `ENTER_LEVEL_INVERTED` | 6 | Enter inverted mask. |

**How it works:**
1. When `Batcher2D.walk()` encounters a renderer with `stencilStage === ENTER_LEVEL`, it calls `_insertMaskBatch()` (line 1034).
2. This creates a stencil clear model, pushes the mask stack, and enters the mask.
3. Subsequent renderers get `ENABLED` stage from `StencilManager.sharedManager.stage`.
4. When the mask node's children are done walking, `exitMask()` is called to pop the stack.

### 1.13 UIStaticBatch

**File:** `cocos/2d/components/ui-static-batch.ts`  
**Class:** `cc.UIStaticBatch extends UIRenderer` (line 57)

**Deprecated since v3.4.1.** The engine now has improved dynamic batching that makes manual static batching unnecessary.

- Place on the root node of all nodes to be batched.
- Only Sprites and Labels participate.
- Must manually call `markAsDirty()` to collect batch data.
- After collection, child node changes are ignored.

---

## 2. UI Components (`cocos/ui/`)

### 2.1 Widget & WidgetManager

**Widget:** `cocos/ui/widget.ts`  
**WidgetManager:** `cocos/ui/widget-manager.ts`

The Widget system provides **automatic anchoring/resizing** of nodes relative to their parent (or a target node).

#### AlignMode (`cocos/ui/widget.ts:123`)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `ONCE` | Align once on first enable, then disable Widget. Good for one-time positioning. |
| 1 | `ALWAYS` | Continuously re-align every frame. |
| 2 | `ON_WINDOW_RESIZE` | Align once on enable, then again only when window resizes. |

#### AlignFlags (`cocos/ui/widget.ts:157`)

Bitwise flags for horizontal/vertical alignment:
- `TOP = 1`, `MID = 2`, `BOT = 4`, `LEFT = 8`, `CENTER = 16`, `RIGHT = 32`
- `HORIZONTAL = LEFT | CENTER | RIGHT`
- `VERTICAL = TOP | MID | BOT`

#### Widget Key Properties

| Property | Type | Notes |
|----------|------|-------|
| `target` | `Node \| null` | Reference node for alignment (default: parent). |
| `alignFlags` | `number` | Bitwise combination of AlignFlags. |
| `left`, `right`, `top`, `bottom` | `number` | Edge offsets. |
| `horizontalCenter`, `verticalCenter` | `number` | Center offsets. |
| `isAbsLeft`, `isAbsRight`, etc. | `boolean` | Whether offsets are absolute (pixels) or percentage of target. |
| `alignMode` | `AlignMode` | ONCE, ALWAYS, or ON_WINDOW_RESIZE. |

#### Alignment Logic (`widget-manager.ts:45-135`)

The `align()` function computes the node's position and size based on:
1. Target size (from UITransform or visibleRect for root Scene nodes)
2. Widget offsets (left, right, top, bottom)
3. Anchor point of both widget node and target
4. Whether it's a stretch (HORIZONTAL + both LEFT+RIGHT set) or fixed-size alignment

**Hidden Gotcha:** When `alignFlags` includes both LEFT and RIGHT, the node stretches horizontally to fill the target (minus offsets). Same for TOP+BOTTOM vertically.

### 2.2 Layout

**File:** `cocos/ui/layout.ts`  
**Class:** `cc.Layout extends Component` (line ~200)

Container component that arranges children automatically.

#### Layout Types (`LayoutType` enum, line 43)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `NONE` | No layout. Children positioned manually. |
| 1 | `HORIZONTAL` | Left-to-right (or right-to-left) arrangement. |
| 2 | `VERTICAL` | Top-to-bottom (or bottom-to-top) arrangement. |
| 3 | `GRID` | Grid arrangement. |

#### Resize Modes (`LayoutResizeMode` enum, line 78)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `NONE` | No resize. |
| 1 | `CONTAINER` | Container grows to fit all children. |
| 2 | `CHILDREN` | Children resize to fit container. |

#### Grid Constraints (`LayoutConstraint` enum, line 170)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `NONE` | Free layout. |
| 1 | `FIXED_ROW` | Fixed number of rows. |
| 2 | `FIXED_COL` | Fixed number of columns. |

#### Key Properties

| Property | Type | Notes |
|----------|------|-------|
| `type` | `LayoutType` | NONE, HORIZONTAL, VERTICAL, GRID. |
| `resizeMode` | `LayoutResizeMode` | How container/children resize. |
| `spacingX` / `spacingY` | `number` | Gap between children. |
| `horizontalDirection` | `LayoutHorizontalDirection` | LEFT_TO_RIGHT (0) or RIGHT_TO_LEFT (1). |
| `verticalDirection` | `LayoutVerticalDirection` | BOTTOM_TO_TOP (0) or TOP_TO_BOTTOM (1). |
| `gridType` | `LayoutAxisDirection` | HORIZONTAL or VERTICAL (for GRID layout). |
| `constraint` | `LayoutConstraint` | NONE, FIXED_ROW, FIXED_COL (for GRID). |
| `startIndex` | `number` | Starting child index for grid constraint. |

#### Key Methods

| Method | Line | Notes |
|--------|------|-------|
| `updateLayout` | 702 | `(force = false): void` -- Force layout recalculation. Usually automatic. |

#### Hidden Gotchas

- **Layout results need one frame to propagate** unless you call `updateLayout()` manually.
- **Child scaling and rotation are NOT considered** by the layout calculations.
- **Only direct children with UITransform** are included in layout calculations.

### 2.3 ScrollView

**File:** `cocos/ui/scroll-view.ts`  
**Class:** `cc.ScrollView extends ViewGroup` (line 253)

#### ScrollView Events (`ScrollViewEventType`, line 123)

| Event | String | Description |
|-------|--------|-------------|
| `SCROLL_TO_TOP` | `'scroll-to-top'` | Hit top boundary |
| `SCROLL_TO_BOTTOM` | `'scroll-to-bottom'` | Hit bottom boundary |
| `SCROLL_TO_LEFT` | `'scroll-to-left'` | Hit left boundary |
| `SCROLL_TO_RIGHT` | `'scroll-to-right'` | Hit right boundary |
| `SCROLL_BEGAN` | `'scroll-began'` | Scrolling started |
| `SCROLL_ENDED` | `'scroll-ended'` | Auto-scroll finished |
| `SCROLLING` | `'scrolling'` | Currently scrolling |
| `BOUNCE_TOP` / `BOUNCE_BOTTOM` / `BOUNCE_LEFT` / `BOUNCE_RIGHT` | `'bounce-*'` | Bouncing at boundary |
| `SCROLL_ENG_WITH_THRESHOLD` | `'scroll-ended-with-threshold'` | Almost stopped |
| `TOUCH_UP` | `'touch-up'` | User released touch |

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `content` | `Node \| null` | 317 | The scrollable content node. **Must be a child of the viewport.** |
| `horizontal` | `boolean` | 344 | Enable horizontal scrolling. Default: true. |
| `vertical` | `boolean` | 386 | Enable vertical scrolling. Default: true. |
| `horizontalScrollBar` | `ScrollBar \| null` | 355 | Optional horizontal scrollbar. |
| `verticalScrollBar` | `ScrollBar \| null` | 398 | Optional vertical scrollbar. |
| `brake` | `number` | 281 | Deceleration factor [0-1]. 1 = instant stop, 0 = never stop. Default: 0.5. |
| `elastic` | `boolean` | 293 | Allow overscroll bounce. Default: true. |
| `inertia` | `boolean` | 305 | Enable inertial scrolling. Default: true. |
| `bounceDuration` | `number` | 267 | Bounce-back animation duration. Default: 1. |
| `cancelInnerEvents` | `boolean` | 431 | Cancel touch events on children when scrolling. Default: true. |
| `scrollEvents` | `ComponentEventHandler[]` | 444 | Event callbacks. |

#### Key Scroll Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `scrollToTop` | 537 | `(timeInSecond?, attenuated?): void` | Scroll to top boundary. |
| `scrollToBottom` | 517 | `(timeInSecond?, attenuated?): void` | Scroll to bottom boundary. |
| `scrollToLeft` | 557 | `(timeInSecond?, attenuated?): void` | Scroll to left boundary. |
| `scrollToRight` | 577 | `(timeInSecond?, attenuated?): void` | Scroll to right boundary. |
| `scrollToOffset` | 681 | `(offset: Vec2, timeInSecond?, attenuated?): void` | Scroll to specific pixel offset. |
| `scrollTo` | 791 | `(target, timeInSecond?, attenuated?): void` | Scroll to make target node visible. |
| `getScrollOffset` | -- | `(): Vec2` | Get current scroll offset. |
| `isScrolling` | -- | `(): boolean` | Whether currently scrolling. |
| `isAutoScrolling` | -- | `(): boolean` | Whether auto-scroll animation is playing. |

#### Hidden Gotchas

- **content must be a child of the viewport node** (the node with ScrollView). The viewport is `content.parent` (line 450-456).
- **Scroll boundaries are calculated from the difference** between content size and viewport size.
- **`cancelInnerEvents`** means the ScrollView will call `event.propagationStopped = true` when it determines a scroll gesture is happening, preventing button clicks etc. inside the scroll area.
- **ScrollEvents use ComponentEventHandler** -- they call named methods on specified components.

### 2.4 PageView

**File:** `cocos/ui/page-view.ts`  
**Class:** `cc.PageView extends ScrollView` (line 103)

Page-based scrolling container.

#### Key Properties

| Property | Type | Notes |
|----------|------|-------|
| `sizeMode` | `SizeMode` | Unified (0) or Free (1). |
| `direction` | `PageViewDirection` | HORIZONTAL (0) or VERTICAL (1). |
| `scrollThreshold` | `number` | Drag threshold to trigger page turn. |
| `pageTurningEventThreshold` | `number` | |
| `indicator` | `PageViewIndicator \| null` | Page indicator dots. |

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `addPage` | 445 | `(page: Node): void` | Add a page node as child of content. |
| `removePage` | 495 | `(page: Node): void` | Remove a page. |
| `scrollToPage` | 551 | `(idx: number, timeInSecond = 0.3): void` | Scroll to page by index. |
| `getCurrentPage` | -- | `(): Node \| null` | Get currently visible page. |
| `getPageCount` | -- | `(): number` | Total page count. |

### 2.5 Button

**File:** `cocos/ui/button.ts`  
**Class:** `cc.Button extends Component` (line 191)

#### Transition Types (line 65)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `NONE` | No visual transition. |
| 1 | `COLOR` | Change target node color. |
| 2 | `SPRITE` | Change target Sprite's spriteFrame. |
| 3 | `SCALE` | Change target node scale. |

#### Button States (line 96)

- `NORMAL` -- Default state
- `HOVER` -- Mouse hover (PC only)
- `PRESSED` -- Touch/mouse down
- `DISABLED` -- Interactable = false

#### Key Properties

| Property | Type | Notes |
|----------|------|-------|
| `target` | `Node \| null` | Node whose properties are modified during transitions. |
| `transition` | `Transition` | NONE, COLOR, SPRITE, or SCALE. |
| `normalColor` / `hoverColor` / `pressedColor` / `disabledColor` | `Color` | Color transition values. |
| `normalSprite` / `hoverSprite` / `pressedSprite` / `disabledSprite` | `SpriteFrame` | Sprite transition values. |
| `hoverScale` / `pressedScale` | `number` | Scale transition values. Default pressedScale: 1.2. |
| `duration` | `number` | Transition animation duration. |
| `interactable` | `boolean` | Whether the button can be interacted with. |
| `clickEvents` | `ComponentEventHandler[]` | Click event callbacks. |

#### Event

Button dispatches `'click'` on its **node** (not the component). Listen via:
```ts
button.node.on(Button.EventType.CLICK, callback);
```

### 2.6 Toggle & ToggleContainer

**Toggle:** `cocos/ui/toggle.ts` (line 53)  
**Class:** `cc.Toggle extends Button`

Toggle is a Button that can be checked/unchecked. Works with ToggleContainer for radio-button behavior.

### 2.7 Slider

**File:** `cocos/ui/slider.ts` (line 79)  
**Class:** `cc.Slider extends Component`

A horizontal slider bar. Has `progress` property [0-1] and `slideEvents` callbacks.

### 2.8 ProgressBar

**File:** `cocos/ui/progress-bar.ts` (line 102)  
**Class:** `cc.ProgressBar extends Component`

Displays progress visually. Has `progress` property [0-1], `mode` (HORIZONTAL/VERTICAL/FILLED), and `barSprite` reference.

### 2.9 EditBox

**File:** `cocos/ui/editbox/edit-box.ts`  
**Class:** `cc.EditBox extends Component` (line 92)

Text input component. Uses platform-specific `EditBoxImpl`.

#### Input Modes (`cocos/ui/editbox/types.ts:64`)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `ANY` | Any text including newlines. |
| 1 | `EMAIL_ADDR` | Email input. |
| 2 | `NUMERIC` | Integer input. |
| 3 | `PHONE_NUMBER` | Phone number. |
| 4 | `URL` | URL input. |
| 5 | `DECIMAL` | Decimal number. |
| 6 | `SINGLE_LINE` | Any text except newlines. |

#### Input Flags (`cocos/ui/editbox/types.ts:102`)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `PASSWORD` | Password input (hidden text). |
| 1 | `SENSITIVE` | Sensitive data (no autocomplete). |
| 2 | `INITIAL_CAPS_WORD` | Auto-capitalize words. |
| 3 | `INITIAL_CAPS_SENTENCE` | Auto-capitalize sentences. |
| 4 | `INITIAL_CAPS_ALL_CHARACTERS` | All uppercase. |
| 5 | `DEFAULT` | No special handling. |

#### Keyboard Return Types (`cocos/ui/editbox/types.ts:31`)

DEFAULT, DONE, SEND, SEARCH, GO, NEXT

#### Key Properties

| Property | Type | Notes |
|----------|------|-------|
| `string` | `string` | Input text value. |
| `placeholder` | `string` | Placeholder text. |
| `textLabel` | `Label \| null` | The Label for displaying input text. |
| `placeholderLabel` | `Label \| null` | The Label for placeholder. |
| `backgroundLabel` | `Sprite \| null` | Background sprite (for visual feedback). |
| `inputMode` | `InputMode` | Type of keyboard to show. |
| `inputFlag` | `InputFlag` | Text processing flag (password, etc). |
| `returnType` | `KeyboardReturnType` | Keyboard button label. |
| `maxLength` | `number` | Maximum character count (-1 = unlimited). |
| `string` | `string` | Current input text. |

#### Events

- `editing-did-began` -- Editing started
- `editing-did-ended` -- Editing ended
- `text-changed` -- Text content changed
- `editing-return` -- Return key pressed

### 2.10 SafeArea

**File:** `cocos/ui/safe-area.ts`  
**Class:** `cc.SafeArea extends Component` (line ~60)

Automatically adjusts node layout to fit within device safe areas (notch phones like iPhone X). Internally uses `sys.getSafeAreaRect()` and the Widget component.

### 2.11 BlockInputEvents

**File:** `cocos/ui/block-input-events.ts`  
**Class:** `cc.BlockInputEvents extends Component` (line 51)

A no-API component. When added to a node, it blocks all touch/mouse events within the node's bounds. Useful as a modal background.

**Blocked events:** TOUCH_START, TOUCH_END, TOUCH_MOVE, MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP, MOUSE_ENTER, MOUSE_LEAVE, MOUSE_WHEEL.

### 2.12 ScrollBar

**File:** `cocos/ui/scroll-bar.ts`

Visual scrollbar indicator used by ScrollView. Has a `scrollBar` sprite and direction properties.

---

## 3. TiledMap (`cocos/tiledmap/`)

### Key Files

| File | Class | Description |
|------|-------|-------------|
| `cocos/tiledmap/tiled-map.ts` | `TiledMap extends Component` | Main component for rendering TMX tile maps. |
| `cocos/tiledmap/tiled-layer.ts` | `TiledLayer` | Individual tile layer rendering. |
| `cocos/tiledmap/tiled-object-group.ts` | `TiledObjectGroup` | Object group data accessor. |
| `cocos/tiledmap/tiled-tile.ts` | `TiledTile` | Individual tile node for custom behavior. |
| `cocos/tiledmap/tiled-map-asset.ts` | `TiledMapAsset extends Asset` | TMX map asset. |
| `cocos/tiledmap/tmx-xml-parser.ts` | `TMXMapInfo` | TMX XML parser. |
| `cocos/tiledmap/tiled-types.ts` | Various enums/types | Orientation, TileFlag, TMXObjectType, etc. |
| `cocos/tiledmap/tiled-utils.ts` | Utility functions | Texture grid filling, texel offset utils. |

### TiledMap Component (`tiled-map.ts:58`)

#### Orientation (static)

- `ORTHO` -- Orthogonal (standard grid)
- `HEX` -- Hexagonal
- `ISO` -- Isometric
- `STAGGERED` -- Staggered isometric

#### Key Properties

| Property | Type | Line | Notes |
|----------|------|------|-------|
| `tmxAsset` | `TiledMapAsset` | 99 | The TMX map asset to render. |
| `enableCulling` | `boolean` | 122 | Auto-culling of off-screen tiles. Disable for rotated/skewed maps or when using camera. |

#### Key Methods

| Method | Line | Signature | Notes |
|--------|------|-----------|-------|
| `getMapSize` | 149 | `(): Size` | Map dimensions in tiles. |
| `getTileSize` | -- | `(): Size` | Individual tile pixel size. |
| `getLayer` | -- | `(name): TiledLayer \| null` | Get layer by name. |
| `getObjectGroup` | -- | `(name): TiledObjectGroup \| null` | Get object group by name. |
| `getAllLayers` | -- | `(): TiledLayer[]` | Get all layers. |
| `getProperty` | -- | `(name): any` | Get map property. |
| `getTilePropertiesAt` | -- | `(gid): any` | Get properties for a tile GID. |
| `setTileGIDAt` | -- | `(gid, pos, flags?): void` | Set tile GID at grid position. |
| `removeTileAt` | -- | `(pos): void` | Remove tile at position. |

#### Hidden Gotchas

- **Culling must be disabled** when the map uses skew, rotation, or camera movement, otherwise tiles may disappear (line 117).
- **cleanupImageCache** (line 134) controls whether texture caches are cleaned up.

---

## 4. ParticleSystem2D (`cocos/particle-2d/`)

### Key Files

| File | Class | Description |
|------|-------|-------------|
| `cocos/particle-2d/particle-system-2d.ts` | `ParticleSystem2D extends UIRenderer` | Main particle system component. |
| `cocos/particle-2d/particle-simulator-2d.ts` | `Simulator` | Core simulation logic (lifecycle, physics, rendering). |
| `cocos/particle-2d/particle-asset.ts` | `ParticleAsset extends Asset` | Particle plist configuration asset. |
| `cocos/particle-2d/particle-system-2d-assembler.ts` | Assembler | Generates particle mesh data. |
| `cocos/particle-2d/define.ts` | Enums | EmitterMode, PositionType, constants. |
| `cocos/particle-2d/motion-streak-2d.ts` | `MotionStreak2D` | Trail/streak effect component. |

### ParticleSystem2D Component (`particle-system-2d.ts:176`)

#### Emitter Modes (`define.ts:56`)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `GRAVITY` | Uses gravity, speed, radial and tangential acceleration. |
| 1 | `RADIUS` | Uses radius-based rotation. Creates spiral effects. |

#### Position Types (`define.ts:74`)

| Value | Name | Description |
|-------|------|-------------|
| 0 | `FREE` | Particles are in world space. Don't move with emitter. (fire, steam) |
| 1 | `RELATIVE` | Particles move with parent but not with emitter node. |
| 2 | `GROUPED` | Particles follow the emitter node. (no trailing) |

#### Constants

| Name | Value | Notes |
|------|-------|-------|
| `DURATION_INFINITY` | -1 | Emitter lives forever. |
| `START_SIZE_EQUAL_TO_END_SIZE` | -1 | Start and end sizes are equal. |
| `START_RADIUS_EQUAL_TO_END_RADIUS` | -1 | Start and end radii are equal. |

#### Key Properties (ParticleSystem2D)

| Property | Notes |
|----------|-------|
| `custom` | Whether to use custom properties instead of the particle file. |
| `file` | ParticleAsset (.plist) file. |
| `texture` | SpriteFrame for particle texture. |
| `particleCount` | Current number of living particles (read-only). |
| `emissionRate` | Particles emitted per second. |
| `life` / `lifeVar` | Particle lifetime and variance. |
| `startSize` / `endSize` / `startSizeVar` / `endSizeVar` | Particle size animation. |
| `startColor` / `endColor` / `startColorVar` / `endColorVar` | Color animation. |
| `startSpin` / `endSpin` / `startSpinVar` / `endSpinVar` | Rotation animation. |
| `angle` / `angleVar` | Emission angle and variance (degrees). |
| `speed` / `speedVar` | Initial speed and variance. |
| `gravity` | Gravity vector (GRAVITY mode). |
| `radialAccel` / `radialAccelVar` | Radial acceleration (GRAVITY mode). |
| `tangentialAccel` / `tangentialAccelVar` | Tangential acceleration (GRAVITY mode). |
| `startRadius` / `endRadius` / `startRadiusVar` / `endRadiusVar` | Radius animation (RADIUS mode). |
| `rotatePerS` / `rotatePerSVar` | Rotation speed (RADIUS mode). |
| `posType` | PositionType enum value. |
| `emitterMode` | EmitterMode enum value. |
| `duration` | Emitter duration (-1 = infinite). |
| `maxParticles` | Maximum particle count. |
| `srcBlendFactor` / `dstBlendFactor` | Blend mode for rendering. |
| `playOnLoad` | Auto-play when enabled. |
| `autoRemoveOnFinish` | Remove node when particles are done. |

#### Key Methods

| Method | Notes |
|--------|-------|
| `resetSystem()` | Restart the particle system from the beginning. |
| `stopSystem()` | Stop emitting new particles. Living particles continue. |
| `isFull()` | Whether particle count has reached maxParticles. |
| `start()` / `stop()` / `pause()` / `resume()` | Playback control. |

#### Hidden Gotchas

- **ParticleSystem2D extends UIRenderer,** so it participates in the 2D batching pipeline.
- **Compatible with Particle Designer** (http://particledesigner.71squared.com/) plist files.
- **The `custom` flag** must be true to modify properties at runtime. Otherwise, values are read from the `.plist` file.
- **MotionStreak2D** is a separate component (`cocos/particle-2d/motion-streak-2d.ts`) that creates trailing effects.

---

## 5. File Path Index

### 2D Core

| Component | Path | Key Line(s) |
|-----------|------|-------------|
| Sprite | `cocos/2d/components/sprite.ts` | class: 171, SpriteType: 47, FillType: 94, SizeMode: 128 |
| Label | `cocos/2d/components/label.ts` | class: 180, CacheMode: 143, Overflow: 108 |
| Mask | `cocos/2d/components/mask.ts` | class: 116, MaskType: 65, isHit: 338 |
| Graphics | `cocos/2d/components/graphics.ts` | class: 62, moveTo: 310, fill: 604 |
| RichText | `cocos/2d/components/rich-text.ts` | class: 157, ISegment: 133 |
| UITransform | `cocos/2d/framework/ui-transform.ts` | class: 55, hitTest: 460, setContentSize: 301 |
| UIRenderer | `cocos/2d/framework/ui-renderer.ts` | class: ~50, InstanceMaterialType: 62 |
| RenderRoot2D | `cocos/2d/framework/render-root-2d.ts` | class: 43 |
| SpriteFrame | `cocos/2d/assets/sprite-frame.ts` | ISpriteFrameInitInfo: 111 |
| SpriteAtlas | `cocos/2d/assets/sprite-atlas.ts` | class: 49, getSpriteFrame: ~80 |
| BitmapFont | `cocos/2d/assets/bitmap-font.ts` | |
| TTFFont | `cocos/2d/assets/ttf-font.ts` | |
| Font | `cocos/2d/assets/font.ts` | |

### 2D Rendering

| Component | Path | Key Line(s) |
|-----------|------|-------------|
| Batcher2D | `cocos/2d/renderer/batcher-2d.ts` | class: 88, update: 273, walk: 906, commitComp: 429 |
| StencilManager | `cocos/2d/renderer/stencil-manager.ts` | class: 86, Stage enum: 35 |
| DrawBatch2D | `cocos/2d/renderer/draw-batch.ts` | |
| StaticVBAccessor | `cocos/2d/renderer/static-vb-accessor.ts` | |
| RenderData | `cocos/2d/renderer/render-data.ts` | |
| IBatcher | `cocos/2d/renderer/i-batcher.ts` | |

### 2D Assemblers

| Assembler | Path | Key Line(s) |
|-----------|------|-------------|
| Sprite assembler index | `cocos/2d/assembler/sprite/index.ts` | getAssembler: 40 |
| Simple | `cocos/2d/assembler/sprite/simple.ts` | createData: 44, updateRenderData: 52 |
| Sliced | `cocos/2d/assembler/sprite/sliced.ts` | createData: 45 |
| Tiled | `cocos/2d/assembler/sprite/tiled.ts` | |
| BarFilled | `cocos/2d/assembler/sprite/bar-filled.ts` | |
| RadialFilled | `cocos/2d/assembler/sprite/radial-filled.ts` | |
| Label assembler index | `cocos/2d/assembler/label/index.ts` | getAssembler: 34 |
| TTF assembler | `cocos/2d/assembler/label/ttf.ts` | |
| BMFont assembler | `cocos/2d/assembler/label/bmfont.ts` | |
| Letter assembler | `cocos/2d/assembler/label/letter.ts` | |
| TextProcessing | `cocos/2d/assembler/label/text-processing.ts` | |

### 2D Utils

| Utility | Path | Key Line(s) |
|---------|------|-------------|
| DynamicAtlasManager | `cocos/2d/utils/dynamic-atlas/atlas-manager.ts` | class: 45, insertSpriteFrame: 183 |
| Atlas | `cocos/2d/utils/dynamic-atlas/atlas.ts` | |
| HtmlTextParser | `cocos/2d/utils/html-text-parser.ts` | class: 72 |
| text-utils | `cocos/2d/utils/text-utils.ts` | fragmentText, isUnicodeCJK |
| font-loader | `cocos/2d/utils/font-loader.ts` | |

### UI Components

| Component | Path | Key Line(s) |
|-----------|------|-------------|
| Widget | `cocos/ui/widget.ts` | class: ~150, AlignMode: 123, AlignFlags: 157 |
| WidgetManager | `cocos/ui/widget-manager.ts` | align function: 45 |
| Layout | `cocos/ui/layout.ts` | class: ~200, LayoutType: 43, updateLayout: 702 |
| ScrollView | `cocos/ui/scroll-view.ts` | class: 253, EventType: 123, scrollToTop: 537 |
| PageView | `cocos/ui/page-view.ts` | class: 103, addPage: 445, scrollToPage: 551 |
| Button | `cocos/ui/button.ts` | class: 191, Transition enum: 65 |
| Toggle | `cocos/ui/toggle.ts` | class: 53 (extends Button) |
| ToggleContainer | `cocos/ui/toggle-container.ts` | |
| Slider | `cocos/ui/slider.ts` | class: 79 |
| ProgressBar | `cocos/ui/progress-bar.ts` | class: 102 |
| EditBox | `cocos/ui/editbox/edit-box.ts` | class: 92 |
| EditBox types | `cocos/ui/editbox/types.ts` | InputMode: 64, InputFlag: 102, KeyboardReturnType: 31 |
| ScrollBar | `cocos/ui/scroll-bar.ts` | |
| SafeArea | `cocos/ui/safe-area.ts` | |
| BlockInputEvents | `cocos/ui/block-input-events.ts` | class: 51 |
| View | `cocos/ui/view.ts` | |
| ViewGroup | `cocos/ui/view-group.ts` | |
| PageViewIndicator | `cocos/ui/page-view-indicator.ts` | |
| SubContextView | `cocos/ui/sub-context-view.ts` | |
| UITracker | `cocos/ui/ui-coordinate-tracker.ts` | |

### TiledMap

| Component | Path | Key Line(s) |
|-----------|------|-------------|
| TiledMap | `cocos/tiledmap/tiled-map.ts` | class: 58, getMapSize: 149 |
| TiledLayer | `cocos/tiledmap/tiled-layer.ts` | |
| TiledObjectGroup | `cocos/tiledmap/tiled-object-group.ts` | |
| TiledTile | `cocos/tiledmap/tiled-tile.ts` | |
| TiledMapAsset | `cocos/tiledmap/tiled-map-asset.ts` | |
| TMXMapInfo | `cocos/tiledmap/tmx-xml-parser.ts` | |
| tiled-types | `cocos/tiledmap/tiled-types.ts` | Orientation, TileFlag, TMXObjectType |
| tiled-utils | `cocos/tiledmap/tiled-utils.ts` | fillTextureGrids |

### Particle2D

| Component | Path | Key Line(s) |
|-----------|------|-------------|
| ParticleSystem2D | `cocos/particle-2d/particle-system-2d.ts` | class: 176 |
| Simulator | `cocos/particle-2d/particle-simulator-2d.ts` | |
| ParticleAsset | `cocos/particle-2d/particle-asset.ts` | |
| define | `cocos/particle-2d/define.ts` | EmitterMode: 56, PositionType: 74 |
| MotionStreak2D | `cocos/particle-2d/motion-streak-2d.ts` | |
| PNGReader | `cocos/particle-2d/png-reader.ts` | |
| TIFFReader | `cocos/particle-2d/tiff-reader.ts` | |

---

> **End of 2d-ui.md** -- Generated from Cocos Creator engine source code.
