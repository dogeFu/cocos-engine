# 原生构建配置

> Cocos Creator 引擎原生平台 CMake 构建系统的完整参考。涵盖构建选项、平台检测、JS 引擎选择、图形后端选择、功能开关等。

---

## 目录

1. [构建系统概览](#1-构建系统概览)
2. [CMakeLists.txt 主构建文件](#2-cmakeliststxt-主构建文件)
3. [平台检测（predefine.cmake）](#3-平台检测predefinecmake)
4. [JS 引擎选择](#4-js-引擎选择)
5. [图形后端选择](#5-图形后端选择)
6. [功能开关](#6-功能开关)
7. [编辑器特性配置](#7-编辑器特性配置)
8. [构建产物](#8-构建产物)
9. [隐含知识与常见陷阱](#9-隐含知识与常见陷阱)
10. [关键文件索引](#10-关键文件索引)

---

## 1. 构建系统概览

Cocos Creator 原生平台使用 CMake 构建系统，编译 C++ 引擎代码并打包为原生应用。

### 构建流程

```
编辑器构建
    ↓ 生成 CMake 配置
    ↓ 选择平台（Android/iOS/macOS/Windows/OHOS）
    ↓ 选择特性（物理/Spine/XR 等）
CMake 配置
    ↓ 检测平台
    ↓ 选择 JS 引擎（V8/JSVM/NAPI）
    ↓ 选择图形后端（Metal/GLES3/Vulkan）
    ↓ 应用功能开关
编译
    ↓ 编译 C++ 引擎
    ↓ 编译 JSB 绑定
    ↓ 打包 JS 引擎
链接
    ↓ 链接原生库
    ↓ 生成 APK/IPA/APP/EXE
```

### 两阶段构建

1. **TypeScript 编译**：Vite/Rollup 编译 TS 引擎代码为 `cc.js`（IIFE 格式）
2. **C++ 编译**：CMake 编译 C++ 引擎代码，链接 JS 引擎和平台库

---

## 2. CMakeLists.txt 主构建文件

**文件：** `native/CMakeLists.txt`

### 2.1 顶层选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `USE_SE_V8` | BOOL | ON | 使用 V8 JS 引擎 |
| `USE_SE_SM` | BOOL | OFF | 使用 SpiderMonkey JS 引擎 |
| `USE_SE_NAPI` | BOOL | OFF | 使用 NAPI（OpenHarmony） |
| `USE_SE_JSVM` | BOOL | OFF | 使用 JSVM（HarmonyOS） |
| `USE_AUDIO` | BOOL | ON | 启用音频 |
| `USE_SOCKET` | BOOL | ON | 启用网络 |
| `USE_SPINE` | BOOL | ON | 启用 Spine |
| `USE_XR` | BOOL | OFF | 启用 XR |
| `USE_SERVER_MODE` | BOOL | OFF | 服务器模式 |
| `USE_GAMEPAD` | BOOL | ON | 启用手柄 |
| `USE_JOB_SYSTEM_TASK_FLOW` | BOOL | OFF | 使用 TaskFlow 任务系统 |
| `CC_USE_VULKAN` | BOOL | OFF | 使用 Vulkan |
| `CC_USE_GLES3` | BOOL | ON | 使用 OpenGL ES 3.0 |
| `CC_USE_GLES2` | BOOL | OFF | 使用 OpenGL ES 2.0 |
| `CC_USE_METAL` | BOOL | OFF | 使用 Metal |

### 2.2 JS 引擎互斥

V8、SpiderMonkey、NAPI、JSVM 四个 JS 引擎选项互斥，只能选择一个：

```cmake
if(USE_SE_V8)
    # 使用 V8
elseif(USE_SE_SM)
    # 使用 SpiderMonkey
elseif(USE_SE_NAPI)
    # 使用 NAPI (OpenHarmony)
elseif(USE_SE_JSVM)
    # 使用 JSVM (HarmonyOS)
endif()
```

### 2.3 图形后端互斥

Vulkan、GLES3、GLES2、Metal 四个图形后端选项互斥（按平台）：

```cmake
if(ANDROID)
    set(CC_USE_GLES3 ON)
elseif(IOS OR MACOSX)
    set(CC_USE_METAL ON)
elseif(OHOS)
    set(CC_USE_GLES3 ON)
endif()
```

---

## 3. 平台检测（predefine.cmake）

**文件：** `native/cmake/predefine.cmake`

### 3.1 平台 ID 映射

```cmake
set(CC_PLATFORM_IOS          1)
set(CC_PLATFORM_WINDOWS      2)
set(CC_PLATFORM_ANDROID      3)
set(CC_PLATFORM_MACOS        4)
set(CC_PLATFORM_OHOS         5)
set(CC_PLATFORM_LINUX        6)
set(CC_PLATFORM_QNX          7)
set(CC_PLATFORM_NX           8)
set(CC_PLATFORM_EMSCRIPTEN   9)
set(CC_PLATFORM_OPENHARMONY  10)
```

### 3.2 平台检测逻辑

```cmake
if(ANDROID)
    set(PLATFORM_NAME android)
    set(CC_PLATFORM ${CC_PLATFORM_ANDROID})
elseif(IOS)
    set(PLATFORM_NAME ios)
    set(CC_PLATFORM ${CC_PLATFORM_IOS})
elseif(MACOSX)
    set(PLATFORM_NAME mac)
    set(CC_PLATFORM ${CC_PLATFORM_MACOS})
elseif(WIN32)
    set(PLATFORM_NAME win32)
    set(CC_PLATFORM ${CC_PLATFORM_WINDOWS})
elseif(OHOS)
    set(PLATFORM_NAME ohos)
    set(CC_PLATFORM ${CC_PLATFORM_OHOS})
elseif(OPENHARMONY)
    set(PLATFORM_NAME openharmony)
    set(CC_PLATFORM ${CC_PLATFORM_OPENHARMONY})
endif()
```

### 3.3 架构检测

```cmake
if(ANDROID)
    # 支持 armeabi-v7a, arm64-v8a, x86, x86_64
    set(ANDROID_ABI ${ANDROID_ABI})
elseif(IOS)
    # 支持 arm64, x86_64 (模拟器)
    set(CMAKE_OSX_ARCHITECTURES ${ARCHS})
endif()
```

---

## 4. JS 引擎选择

### 4.1 引擎对比

| 引擎 | 适用平台 | 特点 |
|------|---------|------|
| **V8** | Android, Windows, macOS, Linux | 性能最好，体积最大 |
| **SpiderMonkey** | 旧版兼容 | 已弃用 |
| **JSVM** | HarmonyOS | 华为自研 JS 引擎 |
| **NAPI** | OpenHarmony | Node-API 兼容接口 |

### 4.2 V8 配置

```cmake
if(USE_SE_V8)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/bindings/jswrapper/v8)
    # V8 库路径
    set(V8_DIR ${ENGINE_ROOT}/external/v8)
    # V8 快照（加速启动）
    set(V8_SNAPSHOT true)
endif()
```

### 4.3 JSVM 配置

```cmake
if(USE_SE_JSVM)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/bindings/jswrapper/jsvm)
    # JSVM SDK 路径
    set(JSVM_SDK_DIR ${OHOS_SDK_DIR}/jsvm)
endif()
```

### 4.4 NAPI 配置

```cmake
if(USE_SE_NAPI)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/bindings/jswrapper/napi)
    # NAPI SDK 路径
    set(NAPI_SDK_DIR ${OPENHARMONY_SDK_DIR}/napi)
endif()
```

---

## 5. 图形后端选择

### 5.1 各平台默认后端

| 平台 | 默认后端 | 可选后端 |
|------|---------|---------|
| iOS | Metal | — |
| macOS | Metal | — |
| Android | GLES 3.0 | Vulkan |
| Windows | GLES 3.0 (ANGLE) | Vulkan |
| OHOS | GLES 3.0 | — |
| OpenHarmony | GLES 3.0 | — |
| NX (Switch) | Vulkan | — |

### 5.2 GLES3 配置

```cmake
if(CC_USE_GLES3)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/renderer/gfx-gles3)
    # EGL 配置
    set(EGL_DIR ${ENGINE_ROOT}/external/egl)
endif()
```

### 5.3 Metal 配置

```cmake
if(CC_USE_METAL)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/renderer/gfx-metal)
    # Metal 框架（系统自带）
    find_library(METAL_FRAMEWORK Metal)
endif()
```

### 5.4 Vulkan 配置

```cmake
if(CC_USE_VULKAN)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/renderer/gfx-vulkan)
    # Vulkan SDK 路径
    set(VULKAN_SDK_DIR ${ENGINE_ROOT}/external/vulkan)
endif()
```

---

## 6. 功能开关

### 6.1 音频

```cmake
if(USE_AUDIO)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/audio)
    # Android: OpenSL ES
    # iOS/macOS: CoreAudio
    # Windows/Linux: OpenAL Soft
endif()
```

### 6.2 网络

```cmake
if(USE_SOCKET)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/network)
    # HttpClient, WebSocket, SocketIO
endif()
```

### 6.3 Spine

```cmake
if(USE_SPINE)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../spine)
    # Spine C++ 运行时
endif()
```

### 6.4 XR

```cmake
if(USE_XR)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/xr)
    # XR 扩展现实
endif()
```

### 6.5 服务器模式

```cmake
if(USE_SERVER_MODE)
    # 使用空平台实现
    set(CC_PLATFORM_IMPL empty)
    # 不编译渲染器
    set(USE_AUDIO OFF)
    set(USE_SOCKET OFF)
endif()
```

### 6.6 手柄

```cmake
if(USE_GAMEPAD)
    # 编译手柄输入支持
    add_definitions(-DCC_USE_GAMEPAD=1)
endif()
```

---

## 7. 编辑器特性配置

### 7.1 render-config.json

**文件：** `editor/engine-features/render-config.json`

编辑器中各功能特性的 UI 展示配置，包含：

| 字段 | 说明 |
|------|------|
| `label` | UI 显示名称 |
| `description` | 功能描述 |
| `category` | 分类（render/physics/...） |
| `dependencies` | 依赖的其他特性 |
| `cmakeConfig` | CMake 配置映射 |
| `flags` | 构建标志 |
| `envCondition` | 环境条件表达式 |

### 7.2 cmakeConfig 映射

编辑器特性到 CMake 选项的映射：

| 特性 | cmakeConfig | 说明 |
|------|------------|------|
| PhysX 物理 | `USE_PHYSICS_PHYSX` | CMake 选项 |
| Box2D JSB | `USE_BOX2D_JSB` | CMake 选项 |
| Spine 3.8 | `USE_SPINE_3_8` | CMake 选项 |
| Spine 4.2 | `USE_SPINE_4_2` | CMake 选项 |

### 7.3 flags 映射

特性到构建标志的映射：

| 特性 | flags | 说明 |
|------|-------|------|
| Spine | `LOAD_SPINE_MANUALLY` | 手动加载 Spine WASM |
| Box2D | `LOAD_BOX2D_MANUALLY` | 手动加载 Box2D WASM |
| Bullet | `LOAD_BULLET_MANUALLY` | 手动加载 Bullet WASM |
| PhysX | `LOAD_PHYSX_MANUALLY` | 手动加载 PhysX WASM |

### 7.4 环境条件

```json
{
    "envCondition": "$NATIVE"        // 仅原生平台
}
```

```json
{
    "envCondition": "$HTML5"         // 仅 Web 平台
}
```

```json
{
    "envCondition": "$ANDROID"       // 仅 Android
}
```

---

## 8. 构建产物

### 8.1 Android

```
build/android/
├── app/
│   ├── build/outputs/apk/
│   │   ├── debug/app-debug.apk
│   │   └── release/app-release.apk
│   └── src/main/
│       ├── jniLibs/           # 原生库
│       │   ├── armeabi-v7a/
│       │   │   └── libcocos.so
│       │   └── arm64-v8a/
│       │       └── libcocos.so
│       └── assets/
│           └── src/           # JS 代码
│               └── cc.js
└── proj/
    └── CMakeLists.txt
```

### 8.2 iOS

```
build/ios/
├── <Project>.xcodeproj
├── <Project>/
│   ├── Classes/              # C++ 代码
│   └── Resources/
│       └── src/              # JS 代码
│           └── cc.js
└── native/
    └── <Project>.app
```

### 8.3 Windows

```
build/win64/
├── <Project>.sln
├── Debug/
│   ├── <Project>.exe
│   └── cc.js
└── Release/
    ├── <Project>.exe
    └── cc.js
```

### 8.4 macOS

```
build/mac/
├── <Project>.xcodeproj
├── <Project>.app/
│   └── Contents/
│       ├── MacOS/
│       │   └── <Project>     # 可执行文件
│       └── Resources/
│           └── src/          # JS 代码
│               └── cc.js
```

---

## 9. 隐含知识与常见陷阱

1. **JS 引擎选项互斥** — V8/SpiderMonkey/JSVM/NAPI 只能选一个，默认 V8
2. **图形后端按平台自动选择** — iOS/macOS 自动选 Metal，Android 自动选 GLES3
3. **`USE_SERVER_MODE` 会关闭音频和网络** — 服务器模式不需要这些功能
4. **编辑器特性配置有两套** — `render-config.json`（编辑器 UI）和 `cc.config.json`（TS 层）是独立的
5. **`cmakeConfig` 映射是编辑器到 CMake 的桥梁** — 编辑器中勾选特性会设置对应的 CMake 选项
6. **Android 架构必须指定** — `ANDROID_ABI` 决定编译目标架构
7. **V8 快照加速启动** — `V8_SNAPSHOT=true` 预编译 JS 代码，减少启动时间
8. **iOS 必须使用 Metal** — Apple 已弃用 OpenGL ES，iOS 只支持 Metal
9. **OHOS 和 OpenHarmony 是不同平台** — OHOS 使用 JSVM，OpenHarmony 使用 NAPI
10. **`cc.js` 是 TS 编译产物** — C++ 引擎加载 `cc.js` 并通过 JSB 执行
11. **热更新仅原生平台** — `jsb.AssetsManager` 仅在 C++ 编译的产物中可用
12. **NX (Switch) 使用 Vulkan** — 任天堂 Switch 平台仅支持 Vulkan

---

## 10. 关键文件索引

| 文件 | 职责 |
|------|------|
| `native/CMakeLists.txt` | 主构建文件 |
| `native/cmake/predefine.cmake` | 平台检测与宏定义 |
| `native/cmake/scripts/` | 构建辅助脚本 |
| `editor/engine-features/render-config.json` | 编辑器特性配置 |
| `cc.config.json` | TS 层特性配置 |
| `vite/platforms/native/platform.config.ts` | Native 平台 Vite 配置 |
| `vite/plugins/vite-plugin-cocos-jsb-replace.ts` | JSB 替换插件 |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
