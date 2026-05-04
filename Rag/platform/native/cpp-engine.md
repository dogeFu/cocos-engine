# C++ 引擎架构

> Cocos Creator 引擎 C++ 原生层（native/cocos/）的完整架构参考。涵盖目录结构、平台抽象层、渲染后端、数学库、网络、音频引擎、插件系统等核心模块。

---

## 目录

1. [C++ 引擎概览](#1-c-引擎概览)
2. [目录结构](#2-目录结构)
3. [平台抽象层（platform/）](#3-平台抽象层platform)
4. [渲染后端（renderer/）](#4-渲染后端renderer)
5. [数学库（math/）](#5-数学库math)
6. [基础库（base/）](#6-基础库base)
7. [核心模块（core/）](#7-核心模块core)
8. [应用入口（application/）](#8-应用入口application)
9. [音频引擎（audio/）](#9-音频引擎audio)
10. [网络模块（network/）](#10-网络模块network)
11. [2D 渲染器（2d/）](#11-2d-渲染器2d)
12. [3D 资源（3d/）](#12-3d-资源3d)
13. [引擎核心（engine/）](#13-引擎核心engine)
14. [插件系统（plugins/）](#14-插件系统plugins)
15. [性能分析（profiler/）](#15-性能分析profiler)
16. [隐含知识与常见陷阱](#16-隐含知识与常见陷阱)
17. [关键文件索引](#17-关键文件索引)

---

## 1. C++ 引擎概览

`native/cocos/` 是引擎的 C++ 实现，与 TypeScript 层通过 JSB（JavaScript Binding）桥接。C++ 层负责：

- **高性能渲染**：GFX 抽象层、渲染管线、2D/3D 渲染器
- **平台适配**：Android/iOS/macOS/Windows/Linux/OHOS/OpenHarmony
- **音频播放**：跨平台音频引擎
- **网络通信**：HTTP/WebSocket/SocketIO
- **JSB 桥接**：V8/JSVM/NAPI/SpiderMonkey 绑定

### 与 TypeScript 层的关系

```
TypeScript 层 (cocos/)          C++ 层 (native/cocos/)
├── Node.ts                      ├── scene/Node.h
├── Camera.ts                    ├── renderer/Camera.h
├── Material.ts                  ├── renderer/Material.h
├── Batcher2D.ts                 ├── 2d/Batcher2d.h
├── AudioPlayer.ts               ├── audio/AudioEngine.h
└── ...                          └── ...
        ↕ JSB 桥接
```

TypeScript 层的 `.jsb.ts` 文件直接调用 C++ 对象方法，绕过 TS 层模拟，获得更好的性能。

---

## 2. 目录结构

```
native/cocos/
├── 2d/                # 2D 渲染器
│   └── Batcher2d.h/cpp
├── 3d/                # 3D 资源
│   ├── Mesh.h/cpp
│   ├── Skeleton.h/cpp
│   └── Morph.h/cpp
├── application/       # 应用入口
│   ├── CocosApplication.h/cpp
│   └── BaseGame.h/cpp
├── audio/             # 音频引擎
│   ├── android/       # OpenSL ES 实现
│   ├── apple/         # CoreAudio 实现 (.mm)
│   ├── oalsoft/       # OpenAL Soft 实现
│   ├── ohos/          # OHOS 音频实现
│   └── include/       # 公共头文件
├── base/              # 基础库
│   ├── memory/        # 内存管理
│   ├── thread/        # 线程/锁
│   └── containers/    # 容器（Vector、Map 等）
├── bindings/          # JSB 绑定层
│   ├── jswrapper/     # JS 引擎封装
│   │   ├── v8/        # V8 引擎适配
│   │   ├── sm/        # SpiderMonkey 适配
│   │   ├── jsvm/      # JSVM 适配（HarmonyOS）
│   │   └── napi/      # NAPI 适配（OpenHarmony）
│   ├── manual/        # 手动绑定
│   └── sebind/        # 自动绑定框架
├── core/              # 核心模块
│   ├── assets/        # 资产管理
│   ├── event/         # 事件系统
│   ├── geometry/      # 几何体（AABB、OBB、Sphere 等）
│   ├── scene-graph/   # 场景图
│   └── utils/         # 工具类
├── engine/            # 引擎核心
│   ├── Engine.h/cpp
│   └── EngineEvents.h
├── math/              # 数学库
│   ├── Vec2.h/cpp
│   ├── Vec3.h/cpp
│   ├── Vec4.h/cpp
│   ├── Mat3.h/cpp
│   ├── Mat4.h/cpp
│   ├── Quat.h/cpp
│   ├── Color.h/cpp
│   └── MathUtil.h
├── network/           # 网络
│   ├── HttpClient.h/cpp
│   ├── WebSocket.h/cpp
│   └── SocketIO.h/cpp
├── platform/          # 平台抽象层
│   ├── android/       # Android（JNI）
│   ├── ios/           # iOS (.mm)
│   ├── mac/           # macOS (.mm)
│   ├── ohos/          # 鸿蒙
│   ├── openharmony/   # OpenHarmony
│   ├── win32/         # Windows
│   ├── linux/         # Linux
│   ├── qnx/           # QNX
│   ├── apple/         # Apple 通用
│   ├── java/          # Java JNI 桥接
│   └── empty/         # 空实现（Server 模式）
├── renderer/          # 渲染器
│   ├── gfx-metal/     # Metal 后端
│   ├── gfx-vulkan/    # Vulkan 后端
│   ├── gfx-gles2/     # OpenGL ES 2.0 后端
│   ├── gfx-gles3/     # OpenGL ES 3.0 后端
│   └── core/          # 渲染核心
├── plugins/           # 插件系统
└── profiler/          # 性能分析
```

---

## 3. 平台抽象层（platform/）

### 3.1 架构

C++ 侧的平台抽象与 TypeScript PAL 层对应：

```
BasePlatform (平台基类)
├── UniversalPlatform (通用平台实现)
├── AndroidPlatform
├── IOSPlatform
├── MacPlatform
├── Win32Platform
├── LinuxPlatform
├── OHOSPlatform
├── OpenHarmonyPlatform
└── QNXPlatform
```

### 3.2 平台模块接口

每个平台包含 `modules/` 子目录，提供以下接口：

| 模块 | 头文件 | 说明 |
|------|--------|------|
| Battery | `Battery.h` | 电池信息（电量、充电状态） |
| Network | `Network.h` | 网络状态（WiFi/蜂窝/无网络） |
| Screen | `Screen.h` | 屏幕信息（尺寸、DPI、方向） |
| System | `System.h` | 系统信息（OS、语言、地区） |

### 3.3 Android 平台

**目录：** `native/cocos/platform/android/`

- 通过 JNI 与 Java 层通信
- `JniHelper` 类封装 JNI 调用
- `AppActivity` 是 Android 主 Activity
- 音频使用 OpenSL ES
- 渲染使用 OpenGL ES 3.0

### 3.4 iOS/macOS 平台

**目录：** `native/cocos/platform/ios/`、`native/cocos/platform/mac/`

- 使用 Objective-C++（`.mm` 文件）
- 音频使用 CoreAudio / AVAudioEngine
- iOS 渲染使用 Metal
- macOS 渲染使用 Metal

### 3.5 Windows 平台

**目录：** `native/cocos/platform/win32/`

- 使用 Win32 API
- 渲染使用 OpenGL ES 3.0（通过 ANGLE）或 Vulkan

### 3.6 OHOS / OpenHarmony 平台

**目录：** `native/cocos/platform/ohos/`、`native/cocos/platform/openharmony/`

- OHOS 使用 JSVM 引擎
- OpenHarmony 使用 NAPI
- 渲染使用 OpenGL ES 3.0

### 3.7 空实现（Server 模式）

**目录：** `native/cocos/platform/empty/`

当 `USE_SERVER_MODE=ON` 时使用空实现，不依赖任何平台 API。

---

## 4. 渲染后端（renderer/）

### 4.1 GFX 抽象层

C++ GFX 抽象层与 TypeScript GFX 层对应，提供跨平台的图形 API 封装：

```
GFX 设备接口 (gfx::Device)
├── gfx-metal/     # Metal 后端（macOS/iOS）
├── gfx-vulkan/    # Vulkan 后端（Windows/Android）
├── gfx-gles2/     # OpenGL ES 2.0 后端
└── gfx-gles3/     # OpenGL ES 3.0 后端
```

### 4.2 各平台默认渲染后端

| 平台 | 默认后端 | 说明 |
|------|---------|------|
| iOS | Metal | — |
| macOS | Metal | — |
| Android | GLES 3.0 | 可选 Vulkan |
| Windows | GLES 3.0 (ANGLE) | 可选 Vulkan |
| OHOS | GLES 3.0 | — |
| OpenHarmony | GLES 3.0 | — |

### 4.3 渲染核心

**目录：** `native/cocos/renderer/core/`

| 组件 | 说明 |
|------|------|
| PassInstance | 渲染 Pass 实例 |
| ProgramLib | 着色器程序库 |
| ProgramUtils | 着色器工具 |
| RenderQueue | 渲染队列 |
| SceneCulling | 场景剔除 |

---

## 5. 数学库（math/）

### 5.1 核心类型

| 类型 | 文件 | 说明 |
|------|------|------|
| `Vec2` | `Vec2.h/cpp` | 2D 向量 |
| `Vec3` | `Vec3.h/cpp` | 3D 向量 |
| `Vec4` | `Vec4.h/cpp` | 4D 向量 |
| `Mat3` | `Mat3.h/cpp` | 3x3 矩阵 |
| `Mat4` | `Mat4.h/cpp` | 4x4 矩阵 |
| `Quat` | `Quat.h/cpp` | 四元数 |
| `Color` | `Color.h/cpp` | 颜色（RGBA） |
| `MathUtil` | `MathUtil.h` | 数学工具函数 |

### 5.2 与 TypeScript 层的对应

C++ 数学类型与 TypeScript 层一一对应，通过 JSB 桥接。TypeScript 层的操作最终可能调用 C++ 实现（.jsb.ts 模式）。

### 5.3 性能优化

- 数学函数使用 SIMD 指令优化（SSE/NEON）
- 矩阵运算使用列主序存储（与 GPU 一致）
- 静态常量（ZERO、ONE、IDENTITY 等）使用 `Object.freeze` 防止修改

---

## 6. 基础库（base/）

### 6.1 内存管理

**目录：** `native/cocos/base/memory/`

- 引用计数基类 `Ref`
- 智能指针 `SharedPtr`
- 内存池 `MemoryPool`

### 6.2 线程

**目录：** `native/cocos/base/thread/`

| 类 | 说明 |
|----|------|
| `Thread` | 线程封装 |
| `Mutex` | 互斥锁 |
| `ConditionVariable` | 条件变量 |
| `ThreadPool` | 线程池 |

### 6.3 容器

**目录：** `native/cocos/base/containers/`

| 类 | 说明 |
|----|------|
| `Vector<T>` | 动态数组 |
| `Map<K,V>` | 有序映射 |
| `HashMap<K,V>` | 哈希映射 |
| `Set<T>` | 有序集合 |

---

## 7. 核心模块（core/）

### 7.1 资产管理

**目录：** `native/cocos/core/assets/`

| 类 | 说明 |
|----|------|
| `Asset` | 资产基类 |
| `Texture2D` | 2D 纹理 |
| `Shader` | 着色器 |
| `Material` | 材质 |

### 7.2 事件系统

**目录：** `native/cocos/core/event/`

| 类 | 说明 |
|----|------|
| `EventDispatcher` | 事件分发器 |
| `EventListener` | 事件监听器 |

### 7.3 几何体

**目录：** `native/cocos/core/geometry/`

| 类 | 说明 |
|----|------|
| `AABB` | 轴对齐包围盒 |
| `OBB` | 有向包围盒 |
| `Sphere` | 球体 |
| `Ray` | 射线 |
| `Frustum` | 视锥体 |
| `Plane` | 平面 |

### 7.4 场景图

**目录：** `native/cocos/core/scene-graph/`

| 类 | 说明 |
|----|------|
| `Node` | 场景节点 |
| `Scene` | 场景 |
| `Component` | 组件基类 |

---

## 8. 应用入口（application/）

### 8.1 CocosApplication

**文件：** `native/cocos/application/CocosApplication.h/cpp`

引擎的主入口类，管理应用生命周期：

```cpp
class CocosApplication {
    void init();           // 初始化引擎
    void run();            // 运行主循环
    void pause();          // 暂停
    void resume();         // 恢复
    void close();          // 关闭
};
```

### 8.2 BaseGame

**文件：** `native/cocos/application/BaseGame.h/cpp`

游戏基类，提供游戏循环和帧率控制：

```cpp
class BaseGame {
    void setFPS(int fps);
    int getFPS() const;
    void tick();           // 单帧执行
};
```

---

## 9. 音频引擎（audio/）

### 9.1 架构

```
AudioEngine (公共接口)
├── android/     # OpenSL ES 实现
├── apple/       # CoreAudio 实现 (.mm)
├── oalsoft/     # OpenAL Soft 实现
├── ohos/        # OHOS 音频实现
└── include/     # 公共头文件
```

### 9.2 平台实现

| 平台 | 实现 | 说明 |
|------|------|------|
| Android | OpenSL ES | 低延迟音频 |
| iOS/macOS | CoreAudio / AVAudioEngine | Apple 原生音频 |
| Windows | OpenAL Soft | 跨平台音频库 |
| Linux | OpenAL Soft | 跨平台音频库 |
| OHOS | OHOS Audio | 鸿蒙音频 API |

### 9.3 AudioEngine API

```cpp
class AudioEngine {
    static int play2d(const std::string& filePath, bool loop = false, float volume = 1.0f);
    static void pause(int audioID);
    static void resume(int audioID);
    static void stop(int audioID);
    static void setVolume(int audioID, float volume);
    static void setLoop(int audioID, bool loop);
    static float getDuration(int audioID);
    static float getCurrentTime(int audioID);
    static AudioState getState(int audioID);
    static void setMaxAudioInstance(int max);
    static void uncache(const std::string& filePath);
    static void uncacheAll();
};
```

---

## 10. 网络模块（network/）

### 10.1 HttpClient

**文件：** `native/cocos/network/HttpClient.h/cpp`

```cpp
class HttpClient {
    static HttpClient* getInstance();
    void send(HttpRequest* request);
    void sendImmediate(HttpRequest* request);
    void setTimeoutForConnect(int value);
    void setTimeoutForRead(int value);
};
```

### 10.2 WebSocket

**文件：** `native/cocos/network/WebSocket.h/cpp`

```cpp
class WebSocket {
    bool init(const std::string& url, const std::vector<std::string>& protocols = {});
    void send(const std::string& message);
    void close();
    void closeAsync(int code, const std::string& reason);
};
```

### 10.3 SocketIO

**文件：** `native/cocos/network/SocketIO.h/cpp`

```cpp
class SocketIO {
    static SIOClient* connect(const std::string& uri);
    void send(const std::string& eventName, const std::string& data);
    void disconnect();
};
```

---

## 11. 2D 渲染器（2d/）

### 11.1 Batcher2d

**文件：** `native/cocos/2d/Batcher2d.h/cpp`

C++ 侧的 2D 批次渲染器，与 TypeScript 层的 Batcher2D 对应：

```cpp
class Batcher2d {
    void draw(Scene* scene);
    void flush();
    void updateUBOs(int stride);
    void commitComp();
};
```

在 `.jsb.ts` 模式下，TypeScript 层的 2D 渲染直接调用 C++ Batcher2d。

---

## 12. 3D 资源（3d/）

### 12.1 Mesh

**文件：** `native/cocos/3d/Mesh.h/cpp`

```cpp
class Mesh {
    void setVertexData(float* data, int length);
    void setIndexData(uint16_t* data, int length);
    void setSubMesh(int index, int start, int count);
    AABB getAABB() const;
};
```

### 12.2 Skeleton

**文件：** `native/cocos/3d/Skeleton.h/cpp`

骨骼数据，用于骨骼动画。

### 12.3 Morph

**文件：** `native/cocos/3d/Morph.h/cpp`

变形目标数据，用于 BlendShape/Morph 动画。

---

## 13. 引擎核心（engine/）

### 13.1 Engine

**文件：** `native/cocos/engine/Engine.h/cpp`

C++ 侧的引擎核心类：

```cpp
class Engine {
    static Engine* getInstance();
    void init();
    void tick();
    void pause();
    void resume();
    void close();
    Renderer* getRenderer() const;
};
```

### 13.2 EngineEvents

**文件：** `native/cocos/engine/EngineEvents.h`

引擎事件定义：

| 事件 | 说明 |
|------|------|
| `EVENT_INIT` | 引擎初始化完成 |
| `EVENT_PAUSE` | 引擎暂停 |
| `EVENT_RESUME` | 引擎恢复 |
| `EVENT_CLOSE` | 引擎关闭 |
| `EVENT_TICK` | 每帧触发 |

---

## 14. 插件系统（plugins/）

### 14.1 概述

**目录：** `native/cocos/plugins/`

C++ 插件系统允许第三方库以插件形式集成到引擎中。

### 14.2 插件注册

```cpp
class Plugin {
    virtual void onInit() = 0;
    virtual void onDestroy() = 0;
    virtual void onUpdate(float dt) = 0;
};

class PluginManager {
    static PluginManager* getInstance();
    void registerPlugin(Plugin* plugin);
    void unregisterPlugin(Plugin* plugin);
};
```

---

## 15. 性能分析（profiler/）

### 15.1 概述

**目录：** `native/cocos/profiler/`

C++ 侧的性能分析工具，与 TypeScript 层的 Profiler 对应。

### 15.2 性能指标

| 指标 | 说明 |
|------|------|
| FPS | 帧率 |
| Frame Time | 帧时间 |
| Draw Calls | Draw Call 数 |
| Triangles | 三角形数 |
| Vertices | 顶点数 |
| Memory | 内存使用 |

---

## 16. 隐含知识与常见陷阱

1. **C++ 与 TS 数学类型一一对应** — 通过 JSB 桥接，TS 层的 Vec3 操作可能调用 C++ 实现
2. **渲染后端按平台选择** — 不是运行时切换，而是编译时选择（CMake 配置）
3. **Android 使用 JNI** — Java 与 C++ 通信通过 JNI，有性能开销
4. **iOS/macOS 使用 Objective-C++** — `.mm` 文件混合 Objective-C 和 C++
5. **Server 模式使用空实现** — `platform/empty/` 不依赖任何平台 API
6. **音频引擎平台差异大** — Android 用 OpenSL ES，Apple 用 CoreAudio，其他用 OpenAL
7. **Batcher2d 是 C++ 优化** — 2D 渲染在原生平台使用 C++ Batcher2d，性能优于 TS 实现
8. **Mesh 数据在 C++ 管理** — 网格数据存储在 C++ 侧，TS 层通过 JSB 访问
9. **`Ref` 是引用计数基类** — C++ 对象继承 `Ref` 实现引用计数管理
10. **线程安全** — C++ 侧的线程/锁封装确保多线程安全
11. **容器类不是 STL** — 使用引擎自定义容器（`Vector`、`Map` 等），与 `cc::Vector` 命名区分
12. **GFX 设备是单例** — 每个平台只有一个 GFX 设备实例

---

## 17. 关键文件索引

| 文件/目录 | 职责 |
|----------|------|
| `native/cocos/platform/` | C++ 平台抽象层 |
| `native/cocos/platform/android/` | Android 平台实现 |
| `native/cocos/platform/ios/` | iOS 平台实现 |
| `native/cocos/platform/mac/` | macOS 平台实现 |
| `native/cocos/platform/win32/` | Windows 平台实现 |
| `native/cocos/platform/ohos/` | 鸿蒙平台实现 |
| `native/cocos/platform/openharmony/` | OpenHarmony 平台实现 |
| `native/cocos/renderer/gfx-metal/` | Metal 渲染后端 |
| `native/cocos/renderer/gfx-vulkan/` | Vulkan 渲染后端 |
| `native/cocos/renderer/gfx-gles3/` | OpenGL ES 3.0 渲染后端 |
| `native/cocos/math/` | 数学库 |
| `native/cocos/base/` | 基础库（内存、线程、容器） |
| `native/cocos/core/` | 核心模块（资产、事件、几何、场景图） |
| `native/cocos/application/` | 应用入口 |
| `native/cocos/audio/` | 音频引擎 |
| `native/cocos/network/` | 网络模块 |
| `native/cocos/2d/` | 2D 渲染器 |
| `native/cocos/3d/` | 3D 资源 |
| `native/cocos/engine/` | 引擎核心 |
| `native/cocos/bindings/` | JSB 绑定层 |
| `native/cocos/plugins/` | 插件系统 |
| `native/cocos/profiler/` | 性能分析 |
| `native/CMakeLists.txt` | 主构建文件 |
| `native/cmake/predefine.cmake` | 平台检测与宏定义 |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
