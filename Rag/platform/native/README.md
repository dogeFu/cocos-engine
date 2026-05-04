# Cocos Creator 引擎 — 原生平台 RAG 文档索引

> 原生平台相关文档集中管理。涵盖平台抽象层（PAL）、JSB 绑定、C++ 引擎架构、原生构建配置等。

---

## 文档列表

| 文档 | 覆盖内容 | 说明 |
|---|---|---|
| [pal-architecture.md](pal-architecture.md) | `pal/` 平台抽象层 | PAL 架构设计、接口一致性校验、各模块平台差异、路径别名解析机制 |
| [jsb-binding.md](jsb-binding.md) | JSB 绑定层 | JSB 工作原理、jsb 全局对象、反射调用（Android/iOS/OH）、jsb.bridge 双向通信、装饰器补丁、.jsb.ts 替换 |
| [cpp-engine.md](cpp-engine.md) | `native/cocos/` C++ 引擎 | C++ 引擎目录结构、平台抽象、渲染后端、数学库、网络、插件系统 |
| [native-build.md](native-build.md) | CMake 构建 | 原生构建配置、CMake 选项、平台检测、JS 引擎选择、图形后端选择 |

---

## 架构总览

```
┌──────────────────────────────────────────────────────┐
│              引擎业务层 (cocos/)                       │
│   import { systemInfo } from 'pal/system-info'       │
│   import { screenAdapter } from 'pal/screen-adapter' │
├──────────────────────────────────────────────────────┤
│           PAL 接口层 (pal/xxx 路径别名)                 │
│   编译期类型校验 (checkPalIntegrity)                    │
├──────────┬──────────┬──────────┬─────────────────────┤
│  native/ │   web/   │minigame/ │  runtime/           │
│  jsb.*   │ DOM API  │  wx/ral  │  ral.*              │
├──────────┴──────────┴──────────┴─────────────────────┤
│              原生 C++ 层 (native/cocos/)              │
│   platform/ → android/ios/mac/win32/ohos/...         │
│   bindings/jswrapper/ → v8/napi/jsvm/sm              │
└──────────────────────────────────────────────────────┘
```

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
