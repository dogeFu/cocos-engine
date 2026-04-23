# Cocos Engine Native 模块架构文档

本文档详细描述了 Cocos Creator 引擎 C++ 层的模块结构、第三方库依赖、JS 绑定接口以及 TypeScript 层关联代码。

---

## 一、C++ 层模块结构

### 1. 核心模块 (native/cocos)

| 模块目录 | 功能描述 | CMake 模块名 |
|---------|---------|-------------|
| `base/` | 基础工具库：日志、内存管理、线程池、调度器、数据结构 | cclog, ccutils, ccfilesystem |
| `math/` | 数学库：Vec2/3/4, Mat3/4, Quaternion, Color, 几何计算 | ccmath |
| `core/` | 核心系统：事件总线、几何体、场景图、资源管理 | - |
| `engine/` | 引擎核心：Engine, BaseEngine, EngineEvents | - |
| `application/` | 应用层：Application, BaseGame | - |
| `bindings/` | JS 绑定层：jswrapper, manual bindings, sebind | ccbindings |
| `renderer/` | 渲染器：GFX 抽象层、FrameGraph、Pipeline | - |
| `platform/` | 平台抽象：Windows/macOS/iOS/Android/Linux/OHOS | - |
| `network/` | 网络模块：HTTP, WebSocket, SocketIO, Downloader | - |
| `audio/` | 音频系统：跨平台音频播放、解码 | - |
| `primitive/` | 基础几何体：Box, Sphere, Capsule, Cylinder 等 | - |
| `profiler/` | 性能分析：Profiler, DebugRenderer, GameStats | - |
| `plugins/` | 插件系统：EventBus | - |
| `gi/` | 全局光照：LightProbe, SH, Delaunay | - |
| `2d/` | 2D 渲染：Batcher2d, RenderEntity, UIMeshBuffer | - |
| `3d/` | 3D 资源：Mesh, Skeleton, Morph, SkinningModel | - |
| `editor-support/` | 编辑器支持：Spine/DragonBones 中间件 | - |

### 2. 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (CocosApplication, BaseGame)                                │
├─────────────────────────────────────────────────────────────┤
│                    Engine Layer                              │
│  (Engine, BaseEngine, EngineEvents)                          │
├─────────────────────────────────────────────────────────────┤
│                    Binding Layer                             │
│  (jswrapper/v8, sebind, manual bindings)                     │
├─────────────────────────────────────────────────────────────┤
│                    Core Systems                              │
│  (scene-graph, event, geometry, memop)                       │
├─────────────────────────────────────────────────────────────┤
│                    Renderer Layer                            │
│  (gfx-base, gfx-metal/vulkan/gles3, frame-graph)            │
├─────────────────────────────────────────────────────────────┤
│                    Platform Layer                            │
│  (platform/*, audio, network)                                │
├─────────────────────────────────────────────────────────────┤
│                    Base Layer                                │
│  (math, base, threading, memory)                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. CMake 编译选项 (模块开关)

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `USE_SE_V8` | ON | 使用 V8 JavaScript 引擎 |
| `USE_SE_SM` | OFF | 使用 SpiderMonkey 引擎 |
| `USE_SE_NAPI` | OFF | 使用 NAPI 接口 |
| `USE_SE_JSVM` | OFF | 使用 JSVM 接口 |
| `USE_V8_DEBUGGER` | ON | 启用 V8 调试器 |
| `USE_SOCKET` | ON | 启用 WebSocket/SocketIO |
| `USE_AUDIO` | ON | 启用音频系统 |
| `USE_EDIT_BOX` | ON | 启用 EditBox |
| `USE_VIDEO` | ON | 启用视频播放 |
| `USE_WEBVIEW` | ON | 启用 WebView |
| `USE_MIDDLEWARE` | ON | 启用中间件 |
| `USE_DRAGONBONES` | ON | 启用 DragonBones |
| `USE_SPINE_3_8` | ON | 启用 Spine 3.8 |
| `USE_SPINE_4_2` | OFF | 启用 Spine 4.2 |
| `USE_BOX2D_JSB` | OFF | 启用 Box2D JSB |
| `USE_WEBSOCKET_SERVER` | OFF | 启用 WebSocket 服务端 |
| `USE_JOB_SYSTEM_TASKFLOW` | OFF | 使用 Taskflow 任务系统 |
| `USE_JOB_SYSTEM_TBB` | OFF | 使用 TBB 任务系统 |
| `USE_XR` | OFF | 启用 XR 模块 |
| `USE_AR_MODULE` | OFF | 启用 AR 模块 |
| `USE_PLUGINS` | ON | 启用插件系统 |
| `USE_OCCLUSION_QUERY` | ON | 启用遮挡查询 |
| `USE_DEBUG_RENDERER` | ON | 启用调试渲染器 |
| `USE_GEOMETRY_RENDERER` | ON | 启用几何渲染器 |
| `USE_WEBP` | ON | 启用 WebP 支持 |
| `USE_GOOGLE_BILLING` | OFF | 启用 Google 计费 |
| `USE_GOOGLE_PLAY_GAMES` | OFF | 启用 Google Play Games |
| `USE_GAMEPAD` | ON | 启用手柄支持 |

---

## 二、第三方库依赖

### 1. JavaScript 引擎

| 库名 | 版本 | 平台 | 用途 |
|------|------|------|------|
| V8 | 11.6.189.22 | 全平台 | JavaScript 执行引擎 |

### 2. 网络库

| 库名 | 版本 | 平台 | 用途 |
|------|------|------|------|
| libcurl | 7.52.1~7.83.1 | Win/Mac/Linux | HTTP 客户端 |
| OpenSSL | 1.1.1g~1.1.1q | 全平台 | SSL/TLS 加密 |
| libwebsockets | 2.1.0~4.3.0 | 全平台 | WebSocket 实现 |
| libuv | 1.13.1~1.44.1 | 全平台 | 异步 I/O |

### 3. 图像/音频库

| 库名 | 版本 | 平台 | 用途 |
|------|------|------|------|
| libpng | 1.6.37 | 全平台 | PNG 图片解码 |
| libjpeg | 9c~9d | 全平台 | JPEG 图片解码 |
| WebP | - | 全平台 | WebP 图片解码 |
| FreeType | 2.10.0~2.12.1 | 全平台 | 字体渲染 |
| mpg123 | 1.29.3 | Win/Linux | MP3 解码 |
| Ogg/Vorbis | - | Android/OHOS | 音频解码 |

### 4. 多媒体/输入

| 库名 | 版本 | 平台 | 用途 |
|------|------|------|------|
| SDL2 | 2.0.10~2.28.1 | Win/Mac/Linux | 窗口/输入管理 |
| OpenAL | - | Win/Mac/Linux | 音频输出 |

### 5. 并行计算

| 库名 | 版本 | 平台 | 用途 |
|------|------|------|------|
| TBB | 2020.2~2020.3 | Win/Mac/iOS/Android/Linux | 并行任务调度 |

### 6. 工具库

| 库名 | 版本 | 用途 |
|------|------|------|
| zlib | 1.2.12 | 压缩解压 |
| RapidJSON | 1.1.0 | JSON 解析 |
| Boost | 多模块 | C++ 工具库 |
| simdutf | 5.3.0 | UTF 编码转换 |
| glslang | 11.5.0 | GLSL 着色器编译 |
| SPIRV-Cross | 2021.1.15 | SPIRV 跨平台 |
| SWIG | cocos-v1.1.6 | 绑定代码生成 |

### 7. 物理引擎

| 库名 | 版本 | 用途 |
|------|------|------|
| Box2D | 内置 | 2D 物理引擎 |
| PhysX | 内置 | 3D 物理引擎 |

### 8. 动画运行时

| 库名 | 版本 | 用途 |
|------|------|------|
| Spine | 3.8/4.2 | 骨骼动画 |
| DragonBones | 内置 | 骨骼动画 |

---

## 三、JS 绑定代码结构

### 1. 绑定层目录结构

```
native/cocos/bindings/
├── jswrapper/           # JS 引擎抽象层
│   ├── v8/              # V8 引擎实现
│   │   ├── Class.cpp/h
│   │   ├── Object.cpp/h
│   │   ├── ScriptEngine.cpp/h
│   │   └── debugger/    # V8 调试器
│   ├── sm/              # SpiderMonkey 实现
│   ├── napi/            # NAPI 实现
│   ├── jsvm/            # JSVM 实现
│   └── SeApi.h          # 统一 API
├── manual/              # 手动绑定代码
│   ├── jsb_*_manual.cpp/h
│   └── jsb_module_register.cpp
├── auto/                # 自动生成绑定 (SWIG)
│   └── jsb_*_auto.cpp/h
├── sebind/              # 绑定辅助库
│   └── sebind.h
├── dop/                 # 数据导向编程
│   └── jsb_dop.cpp/h
└── utils/               # 绑定工具
    └── BindingUtils.cpp/h
```

### 2. 自动绑定模块 (SWIG 生成)

| 绑定文件 | 对应模块 |
|---------|---------|
| `jsb_cocos_auto.h` | 引擎核心 |
| `jsb_gfx_auto.h` | GFX 图形抽象层 |
| `jsb_scene_auto.h` | 场景系统 |
| `jsb_assets_auto.h` | 资源管理 |
| `jsb_geometry_auto.h` | 几何体 |
| `jsb_pipeline_auto.h` | 渲染管线 |
| `jsb_render_auto.h` | 渲染器 |
| `jsb_network_auto.h` | 网络 |
| `jsb_audio_auto.h` | 音频 |
| `jsb_2d_auto.h` | 2D 模块 |
| `jsb_gi_auto.h` | 全局光照 |
| `jsb_extension_auto.h` | 扩展 |
| `jsb_spine_*_auto.h` | Spine 动画 |
| `jsb_dragonbones_auto.h` | DragonBones |
| `jsb_box2d_auto.h` | Box2D 物理 |
| `jsb_xr_auto.h` | XR 模块 |
| `jsb_ar_auto.h` | AR 模块 |
| `jsb_video_auto.h` | 视频播放 |
| `jsb_webview_auto.h` | WebView |
| `jsb_google_billing_auto.h` | Google 计费 |
| `jsb_google_play_auto.h` | Google Play Games |

### 3. 手动绑定模块

| 绑定文件 | 功能描述 |
|---------|---------|
| `jsb_global.cpp` | 全局变量和函数 |
| `jsb_cocos_manual.cpp` | 引擎核心手动绑定 |
| `jsb_gfx_manual.cpp` | GFX 手动绑定 |
| `jsb_scene_manual.cpp` | 场景手动绑定 |
| `jsb_assets_manual.cpp` | 资源手动绑定 |
| `jsb_geometry_manual.cpp` | 几何体手动绑定 |
| `jsb_pipeline_manual.cpp` | 渲染管线手动绑定 |
| `jsb_network_manual.cpp` | 网络手动绑定 |
| `jsb_audio_manual.cpp` | 音频手动绑定 |
| `jsb_spine_manual.cpp` | Spine 手动绑定 |
| `jsb_dragonbones_manual.cpp` | DragonBones 手动绑定 |
| `jsb_box2d_manual.cpp` | Box2D 手动绑定 |
| `jsb_websocket.cpp` | WebSocket 绑定 |
| `jsb_socketio.cpp` | SocketIO 绑定 |
| `jsb_websocket_server.cpp` | WebSocket 服务端 |
| `jsb_xmlhttprequest.cpp` | XMLHttpRequest 绑定 |
| `jsb_platform_*.cpp` | 平台相关绑定 |
| `JavaScriptJavaBridge.cpp` | Java 桥接 (Android/OHOS) |
| `JavaScriptObjCBridge.mm` | ObjC 桥接 (iOS/macOS) |
| `JavaScriptArkTsBridge.cpp` | ArkTS 桥接 (OpenHarmony) |

### 4. 模块注册流程

```cpp
// jsb_module_register.cpp
bool jsb_register_all_modules() {
    se::ScriptEngine *se = se::ScriptEngine::getInstance();
    
    // 核心模块
    se->addRegisterCallback(jsb_register_global_variables);
    se->addRegisterCallback(register_all_engine);
    se->addRegisterCallback(register_all_cocos_manual);
    se->addRegisterCallback(register_platform_bindings);
    
    // GFX
    se->addRegisterCallback(register_all_gfx);
    se->addRegisterCallback(register_all_gfx_manual);
    
    // 网络
    se->addRegisterCallback(register_all_network);
    se->addRegisterCallback(register_all_network_manual);
    se->addRegisterCallback(register_all_xmlhttprequest);
    
    // 资源和场景
    se->addRegisterCallback(register_all_assets);
    se->addRegisterCallback(register_all_pipeline);
    se->addRegisterCallback(register_all_geometry);
    se->addRegisterCallback(register_all_scene);
    se->addRegisterCallback(register_all_render);
    se->addRegisterCallback(register_all_native2d);
    
    // 条件模块
    #if CC_USE_AUDIO
    se->addRegisterCallback(register_all_audio);
    #endif
    
    #if CC_USE_SOCKET
    se->addRegisterCallback(register_all_websocket);
    se->addRegisterCallback(register_all_socketio);
    #endif
    
    #if CC_USE_MIDDLEWARE
    se->addRegisterCallback(register_all_editor_support);
    #if CC_USE_SPINE
    se->addRegisterCallback(register_all_spine);
    #endif
    #if CC_USE_DRAGONBONES
    se->addRegisterCallback(register_all_dragonbones);
    #endif
    #endif
    
    return true;
}
```

---

## 四、TypeScript 层关联代码

### 1. JSB 文件分布

TypeScript 层通过 `*.jsb.ts` 文件与 C++ 层对接：

| 目录 | JSB 文件数 | 主要绑定内容 |
|------|-----------|-------------|
| `cocos/gfx/` | 3 | GFX 图形抽象层 |
| `cocos/asset/assets/` | 12 | 资源类型 (Texture, Material, Mesh 等) |
| `cocos/scene-graph/` | 5 | 场景图 (Node, Scene, Layers) |
| `cocos/render-scene/` | 10 | 渲染场景 (Camera, Model, Pass) |
| `cocos/rendering/` | 5 | 渲染管线 |
| `cocos/3d/` | 5 | 3D 模型 (Skinning, Morph) |
| `cocos/2d/` | 1 | 2D 渲染 |
| `cocos/spine/` | 1 | Spine 动画 |
| `cocos/dragon-bones/` | 1 | DragonBones 动画 |
| `cocos/gi/` | 2 | 全局光照 |

### 2. JSB 文件列表

```
cocos/
├── gfx/
│   ├── index.jsb.ts
│   ├── base/pipeline-state.jsb.ts
│   └── base/pipeline-sub-state.jsb.ts
├── asset/assets/
│   ├── asset.jsb.ts
│   ├── texture-2d.jsb.ts
│   ├── texture-base.jsb.ts
│   ├── texture-cube.jsb.ts
│   ├── material.jsb.ts
│   ├── effect-asset.jsb.ts
│   ├── image-asset.jsb.ts
│   ├── scene-asset.jsb.ts
│   ├── render-texture.jsb.ts
│   ├── simple-texture.jsb.ts
│   ├── text-asset.jsb.ts
│   ├── buffer-asset.jsb.ts
│   └── rendering-sub-mesh.jsb.ts
├── scene-graph/
│   ├── node.jsb.ts
│   ├── scene.jsb.ts
│   ├── scene-globals.jsb.ts
│   ├── layers.jsb.ts
│   ├── index.jsb.ts
│   └── utils.jsb.ts
├── render-scene/
│   ├── scene/camera.jsb.ts
│   ├── scene/model.jsb.ts
│   ├── scene/submodel.jsb.ts
│   ├── scene/reflection-probe.jsb.ts
│   ├── scene/index.jsb.ts
│   ├── core/pass.jsb.ts
│   ├── core/render-scene.jsb.ts
│   ├── core/render-window.jsb.ts
│   ├── core/program-lib.jsb.ts
│   ├── core/material-instance.jsb.ts
│   └── core/native-pools.jsb.ts
├── rendering/
│   ├── index.jsb.ts
│   ├── render-pipeline.jsb.ts
│   ├── render-stage.jsb.ts
│   ├── geometry-renderer.jsb.ts
│   └── legacy/index.jsb.ts
├── 3d/
│   ├── assets/mesh.jsb.ts
│   ├── assets/skeleton.jsb.ts
│   ├── models/skinning-model.jsb.ts
│   ├── models/morph-model.jsb.ts
│   ├── models/baked-skinning-model.jsb.ts
│   └── misc/create-mesh.jsb.ts
├── 2d/renderer/
│   └── native-2d.jsb.ts
├── spine/
│   └── index.jsb.ts
├── dragon-bones/
│   └── index.jsb.ts
├── gi/light-probe/
│   ├── light-probe.jsb.ts
│   └── delaunay.jsb.ts
└── root.jsb.ts
```

### 3. JSB 绑定模式

TypeScript 层通过 `jsb` 全局对象访问 C++ 对象：

```typescript
// 典型 JSB 绑定模式
declare const jsb: any;

export class Node extends SceneNode {
    private _jsb: any;
    
    constructor() {
        super();
        this._jsb = new jsb.Node();
    }
    
    get worldPosition(): Vec3 {
        const pos = this._jsb.worldPosition;
        return new Vec3(pos.x, pos.y, pos.z);
    }
    
    set worldPosition(value: Vec3) {
        this._jsb.worldPosition = value;
    }
}
```

### 4. TS 与 C++ 类型映射

| TypeScript 类型 | C++ 类型 |
|-----------------|----------|
| `Vec2/Vec3/Vec4` | `cc::Vec2/Vec3/Vec4` |
| `Mat3/Mat4` | `cc::Mat3/Mat4` |
| `Quaternion` | `cc::Quaternion` |
| `Color` | `cc::Color` |
| `AABB/OBB/Plane/Ray` | `cc::AABB/OBB/Plane/Ray` |
| `Texture2D` | `cc::Texture2D` |
| `Material` | `cc::Material` |
| `Mesh` | `cc::Mesh` |
| `Node` | `cc::Node` |
| `Scene` | `cc::Scene` |
| `Camera` | `cc::Camera` |
| `Model` | `cc::Model` |

---

## 五、模块裁剪指南

### 1. 可安全移除的模块

| 模块 | CMake 选项 | 影响 |
|------|-----------|------|
| XR | `USE_XR=OFF` | 移除 XR 相关功能 |
| AR | `USE_AR_MODULE=OFF` | 移除 AR 功能 |
| Spine 4.2 | `USE_SPINE_4_2=OFF` | 使用 Spine 3.8 |
| DragonBones | `USE_DRAGONBONES=OFF` | 移除龙骨动画 |
| WebSocket Server | `USE_WEBSOCKET_SERVER=OFF` | 移除 WS 服务端 |
| Debug Renderer | `USE_DEBUG_RENDERER=OFF` | 移除调试渲染 |
| Geometry Renderer | `USE_GEOMETRY_RENDERER=OFF` | 移除几何渲染 |
| Google Billing | `USE_GOOGLE_BILLING=OFF` | 移除 Google 计费 |
| Google Play Games | `USE_GOOGLE_PLAY_GAMES=OFF` | 移除 Play Games |

### 2. 裁剪后需要同步修改的文件

1. **CMakeLists.txt** - 关闭对应 `USE_*` 选项
2. **jsb_module_register.cpp** - 移除对应模块注册
3. **TS 层 *.jsb.ts** - 移除对应绑定文件
4. **exports/*.ts** - 移除对应导出

### 3. 验证裁剪结果

```bash
# 1. 运行单元测试
cd native/tests/unit-test
mkdir build && cd build && cmake .. && make && ./src/CocosTest

# 2. 运行模块测试
cd native/tests/module-tests && ./run-test-mac.sh

# 3. 构建模拟器
cd native && npx gulp gen-simulator
```

---

## 六、文件统计

### C++ 层

| 目录 | 文件数 | 代码行数估算 |
|------|--------|-------------|
| `native/cocos/base/` | ~60 | ~15,000 |
| `native/cocos/math/` | ~30 | ~8,000 |
| `native/cocos/core/` | ~50 | ~12,000 |
| `native/cocos/renderer/` | ~100 | ~30,000 |
| `native/cocos/bindings/` | ~80 | ~20,000 |
| `native/cocos/platform/` | ~100 | ~15,000 |
| `native/cocos/network/` | ~30 | ~8,000 |
| `native/cocos/audio/` | ~50 | ~10,000 |

### TypeScript 层

| 目录 | JSB 文件数 |
|------|-----------|
| `cocos/gfx/` | 3 |
| `cocos/asset/` | 12 |
| `cocos/scene-graph/` | 5 |
| `cocos/render-scene/` | 10 |
| `cocos/rendering/` | 5 |
| `cocos/3d/` | 5 |
| `cocos/2d/` | 1 |
| `cocos/spine/` | 1 |
| `cocos/dragon-bones/` | 1 |
| `cocos/gi/` | 2 |
| **总计** | **55** |

---

## 七、参考链接

- [native/CMakeLists.txt](file:///Users/kay/Git/cocos-engine/native/CMakeLists.txt) - 主构建配置
- [native/cocos/bindings/manual/jsb_module_register.cpp](file:///Users/kay/Git/cocos-engine/native/cocos/bindings/manual/jsb_module_register.cpp) - 模块注册
- [native/external/versions.txt](file:///Users/kay/Git/cocos-engine/native/external/versions.txt) - 第三方库版本
- [native/README.md](file:///Users/kay/Git/cocos-engine/native/README.md) - 构建说明
