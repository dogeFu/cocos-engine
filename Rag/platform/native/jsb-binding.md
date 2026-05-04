# JSB 绑定机制

> Cocos Creator 引擎 JSB（JavaScript Binding）绑定层的完整参考。涵盖 JSB 工作原理、jsb 全局对象、反射调用、.jsb.ts 替换机制、手动/自动绑定框架。

---

## 目录

1. [JSB 架构概览](#1-jsb-架构概览)
2. [jsb 全局对象](#2-jsb-全局对象)
3. [JSB 替换机制（.jsb.ts）](#3-jsb-替换机制jsbts)
4. [反射调用](#4-反射调用)
5. [jsb.bridge — ScriptNativeBridge 双向通信](#5-jsbbridge--scriptnativebridge-双向通信)
6. [Native Binding 装饰器补丁机制](#6-native-binding-装饰器补丁机制)
7. [JS 引擎封装（jswrapper）](#7-js-引擎封装jswrapper)
8. [自动绑定框架（sebind）](#8-自动绑定框架sebind)
9. [手动绑定](#9-手动绑定)
10. [C++ 对象生命周期管理](#10-c-对象生命周期管理)
11. [internal:native 虚拟模块](#11-internalnative-虚拟模块)
12. [隐含知识与常见陷阱](#12-隐含知识与常见陷阱)
13. [关键文件索引](#13-关键文件索引)

---

## 1. JSB 架构概览

JSB（JavaScript Binding）是 Cocos Creator 原生平台的核心桥接层，将 JavaScript/TypeScript 与 C++ 引擎连接。

### 架构层次

```
┌─────────────────────────────────────────────────┐
│        TypeScript 引擎层 (cocos/)                │
│   import { Node } from 'cc'                     │
├─────────────────────────────────────────────────┤
│        .jsb.ts 替换层                            │
│   Node.jsb.ts → 直接调用 C++ 对象方法             │
├─────────────────────────────────────────────────┤
│        jsb 全局对象                              │
│   jsb.AudioEngine / jsb.Device / ...            │
├─────────────────────────────────────────────────┤
│        JS 引擎封装 (jswrapper)                   │
│   V8 / SpiderMonkey / JSVM / NAPI               │
├─────────────────────────────────────────────────┤
│        自动绑定 (sebind) + 手动绑定               │
│   C++ 类注册到 JS 环境                           │
├─────────────────────────────────────────────────┤
│        C++ 引擎层 (native/cocos/)                │
│   Node / Renderer / AudioEngine / ...            │
└─────────────────────────────────────────────────┘
```

### 数据流

```
TS 调用 node.setPosition(x, y, z)
    ↓
.jsb.ts: this._obj.setPosition(x, y, z)
    ↓
jswrapper: se::Object::call("setPosition", args)
    ↓
V8/JSVM/NAPI: 执行 C++ Node::setPosition
    ↓
C++ 引擎: 更新节点位置
```

---

## 2. jsb 全局对象

### 2.1 概述

`jsb` 是原生平台注入的全局对象，提供与 C++ 层交互的接口。仅在 `JSB=true`（`NATIVE=true`）时可用。

### 2.2 核心子对象

| 子对象 | 说明 | C++ 对应 |
|--------|------|---------|
| `jsb.AudioEngine` | 音频引擎 | `AudioEngine` |
| `jsb.Device` | 设备信息 | `Device` |
| `jsb.FileUtils` | 文件操作 | `FileUtils` |
| `jsb.AssetsManager` | 热更新 | `AssetsManager` |
| `jsb.EventListenerCustom` | 自定义事件 | `EventListenerCustom` |
| `jsb.input` | 输入系统 | `InputController` |
| `jsb.window` | 窗口管理 | `SystemWindow` |
| `jsb.renderer` | 渲染器 | `Renderer` |
| `jsb.pipeline` | 渲染管线 | `RenderPipeline` |
| `jsb.screen` | 屏幕 | `Screen` |

### 2.3 jsb.AudioEngine

```typescript
const audioEngine = jsb.AudioEngine;
audioEngine.play(url, loop, volume): number;  // 返回 audioID
audioEngine.pause(audioID): void;
audioEngine.resume(audioID): void;
audioEngine.stop(audioID): void;
audioEngine.setVolume(audioID, volume): void;
audioEngine.setLoop(audioID, loop): void;
audioEngine.setCurrentTime(audioID, time): void;
audioEngine.getDuration(audioID): number;
audioEngine.getCurrentTime(audioID): number;
audioEngine.getState(audioID): AudioState;
audioEngine.getOriginalPCMBuffer(url): ArrayBuffer;  // PCM 数据读取
audioEngine.setMaxAudioChannel(max): void;
```

### 2.4 jsb.Device

```typescript
jsb.device.getNetworkType(): number;
jsb.device.getBatteryLevel(): number;
jsb.device.getDevicePixelRatio(): number;
jsb.device.getDeviceOrientation(): number;
jsb.device.getSafeAreaEdge(): { left, top, right, bottom };
jsb.device.getDPI(): number;
jsb.device.getScreenSize(): { width, height };
```

### 2.5 jsb.FileUtils

```typescript
const fileUtils = jsb.FileUtils;
fileUtils.getDataFromFile(path): Uint8Array;
fileUtils.getStringFromFile(path): string;
fileUtils.isFileExist(path): boolean;
fileUtils.isDirectory(path): boolean;
fileUtils.createDirectory(path): boolean;
fileUtils.removeFile(path): boolean;
fileUtils.listFiles(path): string[];
fileUtils.getWritablePath(): string;
```

### 2.6 jsb.window

```typescript
jsb.window.innerWidth: number;
jsb.window.innerHeight: number;
jsb.window.__canvas: any;  // 原生 Canvas 对象
jsb.setPreferredFramesPerSecond(fps): void;
```

### 2.7 jsb.AssetsManager（热更新）

```typescript
const assetsManager = new jsb.AssetsManager(manifestUrl, storagePath, versionCompareHandle);
assetsManager.checkUpdate(): void;
assetsManager.update(): void;
assetsManager.getState(): UpdateState;
assetsManager.getRemoteManifest(): Manifest;
assetsManager.getLocalManifest(): Manifest;
assetsManager.setEventCallback(callback): void;
```

---

## 3. JSB 替换机制（.jsb.ts）

### 3.1 替换原理

在原生平台构建时，部分 TypeScript 文件被替换为 `.jsb.ts` 版本。这些文件直接调用 C++ 对象的方法，而非通过 TypeScript 层模拟，从而获得更好的性能。

### 3.2 替换配置

**文件：** `vite/platforms/native/platform.config.ts` → `jsbReplacements`

```typescript
jsbReplacements: {
    'cocos/rendering/index.ts': 'cocos/rendering/index.jsb.ts',
    'cocos/rendering/render-pipeline.ts': 'cocos/rendering/render-pipeline.jsb.ts',
    'cocos/gfx/index.ts': 'cocos/gfx/index.jsb.ts',
    'cocos/spine/index.ts': 'cocos/spine/index.jsb.ts',
    'cocos/scene-graph/node.ts': 'cocos/scene-graph/node.jsb.ts',
    'cocos/2d/renderer/native-2d.ts': 'cocos/2d/renderer/native-2d.jsb.ts',
    'cocos/physics-2d/box2d/b2lib.ts': 'cocos/physics-2d/box2d/b2lib.jsb.ts',
    'cocos/physics/bullet/bullet-env.ts': 'cocos/physics/bullet/bullet-env.jsb.ts',
    // ... 更多替换
}
```

### 3.3 替换插件

**文件：** `vite/plugins/vite-plugin-cocos-jsb-replace.ts`
**钩子：** `resolveId`（enforce: pre）

仅在 `enabled=true`（构建 native）时激活，将 JSB 模块的 import 重定向到替代实现。

### 3.4 .jsb.ts 文件模式

以 `node.jsb.ts` 为例，与标准 TypeScript 实现的关键区别：

```typescript
// 标准 node.ts — TypeScript 层实现
class Node {
    setPosition(x: number, y: number, z: number): void {
        this._lpos.x = x;
        this._lpos.y = y;
        this._lpos.z = z;
        this._transformFlags |= TransformBit.POSITION;
    }
}

// node.jsb.ts — JSB 直接调用 C++
class Node {
    setPosition(x: number, y: number, z: number): void {
        // 直接调用 C++ 对象方法，绕过 TS 层
        this._obj.setPosition(x, y, z);
    }
}
```

### 3.5 常见 .jsb.ts 替换

| 原文件 | JSB 替换 | 说明 |
|--------|---------|------|
| `cocos/scene-graph/node.ts` | `node.jsb.ts` | 节点操作直接调用 C++ |
| `cocos/gfx/index.ts` | `index.jsb.ts` | GFX 抽象层使用 C++ 实现 |
| `cocos/rendering/render-pipeline.ts` | `render-pipeline.jsb.ts` | 渲染管线使用 C++ 实现 |
| `cocos/2d/renderer/native-2d.ts` | `native-2d.jsb.ts` | 2D 渲染器使用 C++ Batcher2d |
| `cocos/spine/index.ts` | `index.jsb.ts` | Spine 使用 C++ 运行时 |
| `cocos/physics-2d/box2d/b2lib.ts` | `b2lib.jsb.ts` | Box2D 使用 C++ 实现 |
| `cocos/physics/bullet/bullet-env.ts` | `bullet-env.jsb.ts` | Bullet 使用 C++ 实现 |

---

## 4. 反射调用

### 4.1 概述

原生平台支持从 JS 调用 Java（Android）、Objective-C（iOS/macOS）和 ArkTS（OpenHarmony），无需手动编写绑定代码。

### 4.2 平台选择机制

**文件：** `cocos/native-binding/impl.ts`

根据操作系统自动选择桥接实现：

```typescript
Object.defineProperty(globalJsb, 'reflection', {
    get() {
        if (sys.os === sys.OS.ANDROID || sys.os === sys.OS.OHOS) {
            globalJsb.__bridge = new globalThis.JavascriptJavaBridge();
        } else if (sys.os === sys.OS.IOS || sys.os === sys.OS.OSX) {
            globalJsb.__bridge = new globalThis.JavaScriptObjCBridge();
        } else if (sys.os === sys.OS.OPENHARMONY) {
            globalJsb.__bridge = new globalThis.JavaScriptArkTsBridge();
        }
    },
});
```

### 4.3 Android 反射调用（JavascriptJavaBridge）

**文件：** `native/cocos/bindings/manual/JavaScriptJavaBridge.cpp`

核心是 `CallInfo` 类，通过 JNI 签名验证方法并调用：

```typescript
jsb.reflection.callStaticMethod(
    "com/cocos/game/AppActivity",    // Java 类全路径
    "staticMethod",                   // 方法名
    "(Ljava/lang/String;)V",         // JNI 签名
    "param"                           // 参数
);
```

**JNI 签名格式：**

| 类型 | 签名 |
|------|------|
| void | V |
| boolean | Z |
| int | I |
| long | J |
| float | F |
| double | D |
| String | Ljava/lang/String; |
| int[] | [I |

**调用流程：** JS 调用 → C++ 创建 `CallInfo` → 验证签名 → ClassLoader 找到 Java 方法 → JS 参数转 `jvalue` → JNI `CallStaticXXXMethodA` → 返回值转 `se::Value`

### 4.4 iOS/macOS 反射调用（JavaScriptObjCBridge）

**文件：** `native/cocos/bindings/manual/JavaScriptObjCBridge.mm`

使用 `NSInvocation` 实现，**不需要方法签名**：

```typescript
jsb.reflection.callStaticMethod(
    "AppController",    // Objective-C 类名
    "staticMethod:",    // 方法名（含冒号表示有参数）
    "param"             // 参数
);
```

**关键区别：** ObjC 版本通过 `NSMethodSignature` 自动推断参数类型，无需手动提供签名。

### 4.5 OpenHarmony 反射调用（JavaScriptArkTsBridge）

**文件：** `native/cocos/bindings/manual/JavaScriptArkTsBridge.cpp`

通过 NAPI 调用 ArkTS 方法，**支持同步/异步调用**：

```cpp
if (_isSyn) {
    cc::JSFunction::getFunction("executeMethodSync").invoke(callParam);
} else {
    cc::JSFunction::getFunction("executeMethodAsync").invoke(callParam);
}
```

使用 `std::promise` 等待结果返回。

### 4.6 返回值处理

反射调用支持返回基本类型：

```typescript
const result: number = jsb.reflection.callStaticMethod(
    "com/cocos/game/Helper",
    "calculate",
    "(II)I",
    1, 2
);
```

---

## 5. jsb.bridge — ScriptNativeBridge 双向通信

### 5.1 概述

`jsb.bridge` 是一个**不依赖反射**的双向通信通道，允许 JS 与原生（Java/ObjC/ArkTS）之间通过简单的字符串消息进行通信。

### 5.2 C++ 层实现

**文件：** `native/cocos/bindings/manual/JavaScriptJavaBridge.cpp`

```cpp
class ScriptNativeBridge {
public:
    void callByNative(const ccstd::string &arg0, const ccstd::string &arg1);
    inline void setCallback(const JsCallback &cb) { _callback = cb; }
    static ScriptNativeBridge *bridgeCxxInstance;
    se::Value jsCb;
};
```

**注册流程：**
- `sendToNative` 方法在 Android 上调用 `JniHelper::callStaticVoidMethod("com/cocos/lib/JsbBridge", "callByScript", arg0, arg1)`
- 在 iOS/macOS 上调用 `[JsbBridge callByScript:arg0 withArg1:arg1]`
- `onNative` 是一个 JS 回调属性，通过 `defineProperty` 注册 getter/setter

### 5.3 JS 层使用

```typescript
// JS → 原生
jsb.bridge.sendToNative("eventName", "arg");

// 原生 → JS
jsb.bridge.onNative = (arg0: string, arg1: string) => {
    console.log(`Received from native: ${arg0}, ${arg1}`);
};
```

### 5.4 jsbBridgeWrapper — 高级事件封装

**文件：** `cocos/native-binding/impl.ts`

```typescript
const JsbBridgeWrapper = {
    eventMap: new Map(),
    addNativeEventListener(eventName, listener) { ... },
    dispatchEventToNative(eventName, arg) {
        globalJsb.bridge.sendToNative(eventName, arg);
    },
    triggerEvent(eventName, arg) {
        const arr = this.eventMap.get(eventName);
        arr.map((listener) => listener.call(null, arg));
    },
};
```

将 `onNative` 回调自动路由到 `triggerEvent`，实现了事件分发机制。

---

## 6. Native Binding 装饰器补丁机制

### 6.1 概述

C++ 类通过 JSB 绑定到 JS 后，**丢失了 TypeScript 装饰器元数据**（如 `@serializable`, `@type`, `@tooltip` 等）。需要通过补丁函数在运行时重新注入。

### 6.2 decorators.ts — 自动生成的补丁文件

**文件：** `cocos/native-binding/decorators.ts`

文件头部注明 `This file is generated by script, do not modify it manually.`，为每个需要补丁的 C++ 绑定类生成 `patch_XXX` 函数。

**典型模式：**

```typescript
export function patch_cc_LightProbesData(ctx, apply = defaultExec) {
    const { LightProbesData, Vertex, Tetrahedron } = { ...ctx };
    apply(() => { $.type([Vertex])(LightProbesData.prototype, '_probes', () => { return []; }); }, 'type', '_probes');
    apply(() => { $.serializable(LightProbesData.prototype, '_probes', () => { return []; }); }, 'serializable', '_probes');
    apply(() => { $.ccclass('cc.LightProbesData')(LightProbesData); }, 'ccclass', null);
}
```

**关键设计：**
- `apply` 参数允许延迟执行或条件执行（默认立即执行）
- `ctx` 参数传入依赖的类引用，避免循环依赖
- 补丁内容包括：`serializable`、`type`、`tooltip`、`editable`、`visible`、`ccclass` 等

### 6.3 .jsb.ts 文件 — 补丁应用入口

每个有 C++ 原生绑定的模块都有一个 `.jsb.ts` 文件，从 `jsb` 对象获取原生类并应用补丁：

```typescript
// light-probe.jsb.ts
declare const jsb: any;
export const LightProbes: typeof JsbLightProbes = jsb.LightProbes;
_decorator.ccclass('cc.LightProbes')(LightProbes);

export const LightProbesData: typeof JsbLightProbesData = jsb.LightProbesData;
patch_cc_LightProbesData({LightProbesData, Vertex, Tetrahedron});
```

### 6.4 新 C++ 类的 Native Binding 流程

1. **C++ 类实现** — 在 `native/cocos/` 下实现
2. **JSB 绑定注册** — 自动绑定（代码生成）或手动绑定（`se::Class` API）
3. **类型映射注册** — `JSBClassType::registerClass<T>(cls)` 将 C++ RTTI 类型映射到 `se::Class*`
4. **模块注册** — 在 `jsb_module_register.cpp` 中添加 `addRegisterCallback`
5. **TypeScript 声明与补丁** — 在 `cocos/native-binding/` 中声明接口 + 生成 `patch_cc_MyClass` + 创建 `.jsb.ts`
6. **平台条件编译** — 原生平台使用 `.jsb.ts`，Web 平台使用 `.ts`

---

## 7. JS 引擎封装（jswrapper）

**目录：** `native/cocos/bindings/jswrapper/`

jswrapper 封装了四种 JS 引擎，提供统一的 C++ 接口：

| 引擎 | 目录 | 适用平台 |
|------|------|---------|
| **V8** | `v8/` | Android / Windows / macOS / Linux |
| **SpiderMonkey** | `sm/` | 旧版兼容 |
| **JSVM** | `jsvm/` | HarmonyOS |
| **NAPI** | `napi/` | OpenHarmony |

### 7.2 核心抽象类

| 类 | 说明 |
|----|------|
| `se::ScriptEngine` | 脚本引擎，管理 JS 执行环境 |
| `se::Object` | JS 对象封装 |
| `se::Value` | JS 值封装（undefined/null/number/string/boolean/object） |
| `se::Class` | JS 类注册 |
| `se::State` | 函数调用状态（参数、返回值） |
| `se::HandleObject` | 对象生命周期管理 |

### 7.3 对象创建与操作

```cpp
// 创建 JS 对象
se::Object* obj = se::Object::createPlainObject();
obj->setProperty("x", se::Value(100));

// 调用 JS 函数
se::Value func;
obj->getProperty("method", &func);
se::ValueArray args = { se::Value(42) };
func.toObject()->call(args, obj);

// 获取全局对象
se::Object* globalObj = se::ScriptEngine::getInstance()->getGlobalObject();
```

### 7.4 类注册

```cpp
se::Class* cls = se::Class::create("MyClass", globalObj, nullptr, nullptr);
cls->defineFunction("method", _method);
cls->defineProperty("prop", _getter, _setter);
cls->install();
```

---

## 8. 自动绑定框架（sebind）

### 8.1 概述

**目录：** `native/cocos/bindings/sebind/`

sebind 是 C++ 类到 JS 的自动绑定框架，通过模板类 `sebind::class_` 将 C++ 类绑定到 JS。

### 8.2 绑定模式

```cpp
sebind::class_<MyClass>("MyClass")
    .constructor<args...>()
    .property("prop", &MyClass::getProp, &MyClass::setProp)
    .method("method", &MyClass::method)
    .staticMethod("staticMethod", &MyClass::staticMethod)
    .install();
```

### 8.3 支持的类型转换

| C++ 类型 | JS 类型 |
|---------|---------|
| `int`, `float`, `double` | `number` |
| `bool` | `boolean` |
| `std::string` | `string` |
| `se::Object*` | `object` |
| `se::Value` | 任意类型 |
| 枚举 | `number` |

### 8.4 继承关系

```cpp
sebind::class_<Derived>("Derived")
    .inherits<Base>()
    .constructor<args...>()
    .method("derivedMethod", &Derived::derivedMethod)
    .install();
```

---

## 9. 手动绑定

### 9.1 概述

**目录：** `native/cocos/bindings/manual/`

手动绑定用于需要特殊处理的场景，如全局函数、复杂类型转换等。

### 9.2 关键文件

| 文件 | 说明 |
|------|------|
| `jsb_global.cpp` | 全局函数绑定（require、log 等） |
| `jsb_platform.cpp` | 平台相关函数绑定 |
| `jsb_dragonbones.cpp` | DragonBones 手动绑定 |
| `jsb_spine.cpp` | Spine 手动绑定 |
| `jsb_audio_engine.cpp` | 音频引擎手动绑定 |

### 9.3 手动绑定模式

```cpp
static bool jsb_myFunction(se::State& s) {
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc == 1) {
        int arg0 = args[0].toInt32();
        int result = myFunction(arg0);
        s.rval().setInt32(result);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}

// 注册
se::ScriptEngine::getInstance()->addRegisterCallback([](se::Object* global) {
    global->defineFunction("myFunction", _SE(jsb_myFunction));
});
```

---

## 10. C++ 对象生命周期管理

### 10.1 引用计数

JSB 通过引用计数管理 C++ 对象的生命周期：

- C++ 对象通过 `se::Object` 持有
- JS 对象引用 C++ 对象时，`se::Object` 的引用计数 +1
- JS 对象被 GC 回收时，`se::Object` 的引用计数 -1
- 引用计数为 0 时，C++ 对象被销毁

### 10.2 root / unroot

```cpp
// 防止 GC 回收（用于 C++ 持有 JS 对象的场景）
obj->root();

// 允许 GC 回收
obj->unroot();
```

### 10.3 Native 内存管理

- C++ 对象的内存由 C++ 管理（new/delete）
- JS 对象的引用通过 `ref()`/`unref()` 管理
- JSB 绑定对象在 JS 侧被 GC 回收时，自动调用 C++ 侧的 `release()`

---

## 11. internal:native 虚拟模块

### 11.1 概述

`internal:native` 是与 `internal:constants` 类似的虚拟模块，在原生平台导出真实绑定实现，在 Web 平台导出空对象。

### 11.2 构建时生成

**文件：** `vite/plugins/vite-plugin-cocos-constants.ts`

```typescript
// Native 平台
export const native = {
    AudioEngine: jsb.AudioEngine,
    Device: jsb.Device,
    FileUtils: jsb.FileUtils,
    // ...
};

// Web 平台
export const native = {};
```

### 11.3 使用方式

```typescript
import { native } from 'internal:native';

if (native.AudioEngine) {
    // 原生平台音频
    native.AudioEngine.play(url, loop, volume);
}
```

---

## 12. 隐含知识与常见陷阱

1. **JSB 调用有性能开销** — 避免在每帧中频繁调用 JSB，尽量批量处理
2. **`.jsb.ts` 文件必须保持接口兼容** — 替换文件必须导出与原文件相同的类型和函数签名
3. **C++ 对象引用计数** — 如果 C++ 侧持有 JS 对象的引用，必须调用 `root()`，否则 GC 会回收
4. **反射调用的线程安全** — `jsb.reflection.callStaticMethod` 必须在 JS 线程调用
5. **JNI 签名必须正确** — Android 反射调用的 JNI 签名错误会导致运行时崩溃
6. **Objective-C 方法名包含冒号** — 有参数的方法名包含冒号（如 `staticMethod:`），每个参数对应一个冒号
7. **JSB 替换在 cocosModuleReplace 之后** — `cocosJsbReplace` 在 `cocosModuleReplace` 之后执行
8. **`jsb.FileUtils` Web 平台不可用** — 文件操作仅在原生平台可用
9. **热更新仅原生平台支持** — `jsb.AssetsManager` 仅在原生平台可用
10. **V8 是默认 JS 引擎** — Android/Windows/macOS/Linux 使用 V8，HarmonyOS 使用 JSVM，OpenHarmony 使用 NAPI
11. **`internal:native` 在 Web 平台为空对象** — 使用前必须检查属性是否存在
12. **sebind 自动绑定有限制** — 复杂类型转换（如回调函数、结构体数组）仍需手动绑定

---

## 13. 关键文件索引

| 文件 | 职责 |
|------|------|
| `vite/plugins/vite-plugin-cocos-jsb-replace.ts` | JSB 模块替换插件 |
| `vite/plugins/vite-plugin-cocos-constants.ts` | `internal:native` 虚拟模块生成 |
| `vite/platforms/native/platform.config.ts` | Native 平台 JSB 替换配置 |
| `native/cocos/bindings/jswrapper/` | JS 引擎封装（V8/SM/JSVM/NAPI） |
| `native/cocos/bindings/sebind/` | 自动绑定框架 |
| `native/cocos/bindings/manual/` | 手动绑定代码 |
| `native/cocos/bindings/manual/jsb_global.cpp` | 全局函数绑定 |
| `native/cocos/bindings/manual/jsb_platform.cpp` | 平台函数绑定 |
| `native/cocos/bindings/manual/jsb_audio_engine.cpp` | 音频引擎绑定 |
| `native/cocos/bindings/manual/jsb_spine.cpp` | Spine 绑定 |
| `native/cocos/bindings/manual/jsb_dragonbones.cpp` | DragonBones 绑定 |
| `cocos/scene-graph/node.jsb.ts` | 节点 JSB 实现 |
| `cocos/gfx/index.jsb.ts` | GFX JSB 实现 |
| `cocos/rendering/render-pipeline.jsb.ts` | 渲染管线 JSB 实现 |
| `cocos/2d/renderer/native-2d.jsb.ts` | 2D 渲染器 JSB 实现 |
| `cocos/spine/index.jsb.ts` | Spine JSB 实现 |
| `cocos/physics-2d/box2d/b2lib.jsb.ts` | Box2D JSB 实现 |
| `cocos/physics/bullet/bullet-env.jsb.ts` | Bullet JSB 实现 |
| `cocos/native-binding/impl.ts` | jsb.reflection/bridge 懒加载封装 |
| `cocos/native-binding/decorators.ts` | 装饰器补丁（自动生成） |
| `native/cocos/bindings/manual/JavaScriptJavaBridge.cpp` | Android 反射 + ScriptNativeBridge |
| `native/cocos/bindings/manual/JavaScriptObjCBridge.mm` | iOS/macOS 反射 |
| `native/cocos/bindings/manual/JavaScriptArkTsBridge.cpp` | OpenHarmony 反射 |
| `native/cocos/bindings/manual/jsb_module_register.cpp` | 模块注册入口 |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
