# Cocos 引擎验证架构设计文档

## 一、核心目标

验证 Vite 构建产物与 `@cocos/ccbuild` 构建产物的**完全一致性**，包括：

1. **API 接口一致性** - 对外导出的类、函数、常量完全一致
2. **业务使用一致性** - 游戏业务代码无需修改即可运行
3. **平台差异一致性** - Web、小游戏、Native 等平台行为一致
4. **运行时行为一致性** - 数学计算、渲染、动画等行为一致

---

## 二、验证架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────┐
│         Validation Framework            │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────┐  ┌───────────┐  ┌──────┐│
│  │ API Test  │  │ Perf Test │  │ E2E  ││
│  │  test.html│  │perf-test  │  │Game  ││
│  └───────────┘  └───────────┘  └──────┘│
│                                         │
│  ┌───────────┐  ┌───────────┐  ┌──────┐│
│  │ Platform  │  │ Behavior  │  │Compat││
│  │  Tests    │  │  Tests    │  │Tests ││
│  └───────────┘  └───────────┘  └──────┘│
│                                         │
└─────────────────────────────────────────┘
```

### 2.2 测试分类

| 测试类型 | 文件 | 目的 | 优先级 |
|---------|------|------|--------|
| API 对比测试 | `test.html` | 验证对外接口一致性 | P0 |
| 性能测试 | `perf-test.html` | 验证加载性能 | P1 |
| 平台差异测试 | `platform-test.html` | 验证平台行为 | P0 |
| 行为一致性测试 | `behavior-test.html` | 验证运行时行为 | P1 |
| 兼容性测试 | `compat-test.html` | 验证业务代码兼容 | P0 |

---

## 三、API 对比测试设计

### 3.1 测试范围

```
核心模块 (必须 100% 通过)
├── 数学库 (Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Color)
├── 工具类 (EventTarget, Pool, Utils)
├── 场景图 (Node, Scene, Component, Director)
├── 2D 组件 (Sprite, Label, Mask, Graphics, Button 等)
├── 3D 组件 (Camera, Light, MeshRenderer 等)
├── 资源系统 (Asset, Texture2D, SpriteFrame, Material)
├── 动画系统 (Animation, Tween)
├── 输入系统 (Input, EventMouse, EventKeyboard)
├── 物理系统 (RigidBody, Collider)
├── 音频系统 (AudioSource, AudioClip)
├── GFX 系统 (Device, Buffer, Texture, Shader)
├── 游戏系统 (Game, sys)
├── 序列化 (deserialize, instantiate)
└── 版本信息 (VERSION, cclegacy)
```

### 3.2 测试方法

#### 基础测试

```javascript
// 1. 检查导出是否存在
checkExport(cc, 'Vec3', 'class');

// 2. 检查实例化
testClassInstance(cc, 'Vec3', (Vec3) => {
    const v = new Vec3(1, 2, 3);
    assert(v.x === 1 && v.y === 2 && v.z === 3);
});

// 3. 检查静态方法
testStaticMethod(cc, 'Vec3', 'cross', (Vec3) => {
    const a = new Vec3(1, 0, 0);
    const b = new Vec3(0, 1, 0);
    const c = Vec3.cross(new Vec3(), a, b);
    assert(c.z === 1);
});
```

#### 深度测试

```javascript
// 检查类的方法签名
testClassMethods(cc, 'Node', [
    'setPosition',
    'getPosition',
    'addChild',
    'removeFromParent',
    'getComponent',
    'addComponent',
    // ...
]);

// 检查属性访问器
testClassProperties(cc, 'Node', {
    position: 'object',
    rotation: 'object',
    scale: 'object',
    active: 'boolean',
    // ...
});
```

---

## 四、平台差异测试设计

### 4.1 平台模块对比

```javascript
// pal (Platform Abstraction Layer) 模块验证
const platformTests = [
    {
        name: 'pal/audio',
        tests: [
            'AudioPlayer class exists',
            'play() method works',
            'pause() method works',
            'volume property works',
        ]
    },
    {
        name: 'pal/screen-adapter',
        tests: [
            'getDevicePixelRatio() returns correct value',
            'setFrameSize() works',
            'orientation property works',
        ]
    },
    {
        name: 'pal/system-info',
        tests: [
            'getNetworkType() returns valid value',
            'getBatteryLevel() returns valid value',
            'platform property is correct',
        ]
    },
    {
        name: 'pal/input',
        tests: [
            'Input class exists',
            'EventMouse class exists',
            'EventTouch class exists',
            'EventKeyboard class exists',
        ]
    },
];
```

### 4.2 小游戏平台特殊测试

```javascript
// 微信小游戏平台
const wechatTests = [
    'wx.onShow callback works',
    'wx.onHide callback works',
    'sharedCanvas (开放域) 支持',
    'wx.createImage() 支持',
    'localStorage 支持',
    'Audio 支持 (wx.createInnerAudioContext)',
];

// 支付宝小游戏平台
const alipayTests = [
    'my.onShow callback works',
    'my.onHide callback works',
    'localStorage 支持',
    'Audio 支持',
];
```

---

## 五、行为一致性测试设计

### 5.1 数学计算一致性

```javascript
// 数学库精确性测试
const mathTests = [
    {
        name: 'Vec3.cross',
        test: () => {
            const a = new cc.Vec3(1, 0, 0);
            const b = new cc.Vec3(0, 1, 0);
            const c = cc.Vec3.cross(new cc.Vec3(), a, b);
            assert(Math.abs(c.x - 0) < 0.001);
            assert(Math.abs(c.y - 0) < 0.001);
            assert(Math.abs(c.z - 1) < 0.001);
        }
    },
    {
        name: 'Mat4.perspective',
        test: () => {
            const m = new cc.Mat4();
            cc.Mat4.perspective(m, Math.PI / 4, 16/9, 0.1, 100);
            // 检查投影矩阵值
        }
    },
    {
        name: 'Quat.fromEuler',
        test: () => {
            const q = new cc.Quat();
            cc.Quat.fromEuler(q, 0, 90, 0);
            // 检查四元数转换
        }
    },
];
```

### 5.2 渲染一致性

```javascript
// 渲染测试需要 WebGL 环境
const renderTests = [
    {
        name: 'Sprite 渲染',
        setup: () => createSpriteNode(),
        test: (node) => {
            // 检查渲染结果
        }
    },
    {
        name: 'Label 渲染',
        setup: () => createLabelNode(),
        test: (node) => {
            // 检查文本渲染
        }
    },
];
```

### 5.3 动画一致性

```javascript
// 动画系统测试
const animationTests = [
    {
        name: 'Tween 动画',
        test: () => {
            return new Promise((resolve, reject) => {
                const obj = { x: 0 };
                cc.tween(obj)
                    .to(0.1, { x: 100 })
                    .call(() => {
                        assert(Math.abs(obj.x - 100) < 0.001);
                        resolve();
                    })
                    .start();
            });
        }
    },
    {
        name: 'Animation 组件',
        test: () => {
            // 检查动画播放
        }
    },
];
```

---

## 六、兼容性测试设计

### 6.1 业务代码兼容性

```javascript
// 常见业务代码模式测试
const businessTests = [
    {
        name: '创建节点并添加组件',
        code: `
            const node = new cc.Node('MyNode');
            node.addComponent(cc.Sprite);
            node.setPosition(100, 200);
        `,
        expected: '无错误'
    },
    {
        name: '资源加载',
        code: `
            cc.resources.load('prefab/test', cc.Prefab, (err, prefab) => {
                if (err) throw err;
                const node = cc.instantiate(prefab);
                cc.director.getScene().addChild(node);
            });
        `,
        expected: '无错误'
    },
    {
        name: '事件系统',
        code: `
            node.on(cc.Node.EventType.TOUCH_START, (event) => {
                console.log('touch');
            });
        `,
        expected: '无错误'
    },
    {
        name: 'Tween 链式调用',
        code: `
            cc.tween(node)
                .to(1, { position: cc.v3(100, 100, 0) })
                .by(1, { scale: 2 })
                .start();
        `,
        expected: '无错误'
    },
];
```

### 6.2 第三方插件兼容性

```javascript
// 常见第三方插件测试
const pluginTests = [
    'DragonBones 插件',
    'Spine 插件',
    'TiledMap 插件',
    '物理引擎插件',
];
```

---

## 七、自动化测试设计

### 7.1 CI/CD 集成

```yaml
# .github/workflows/vite-build-test.yml
name: Vite Build Validation

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run vite:build
      
  test-api:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run vite:test:api
      
  test-platform:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run vite:test:platform
      
  test-compat:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run vite:test:compat
```

### 7.2 测试报告

```
vite-test-report/
├── api-report.html        # API 对比报告
├── platform-report.html   # 平台差异报告
├── behavior-report.html   # 行为一致性报告
├── compat-report.html     # 兼容性报告
└── perf-report.html       # 性能报告
```

---

## 八、现有测试扩展计划

### 8.1 test.html 扩展

```javascript
// 当前 test.html 已经覆盖：
// - 核心数学类
// - 核心工具类
// - 场景图
// - 2D/3D 组件
// - 资源系统
// - 动画系统
// - Tween
// - 物理系统
// - 音频系统
// - 输入系统
// - 游戏系统
// - GFX 系统
// - 渲染系统
// - Spine
// - DragonBones
// - 粒子系统
// - 序列化
// - 几何体
// - 版本信息
// - 功能测试

// 需要扩展：
// - 平台 API 对比 (PAL 模块)
// - 小游戏平台特殊 API
// - Native 平台特殊 API
// - 属性访问器测试
// - 方法签名测试
// - 枚举值一致性测试
```

### 8.2 新增测试文件

| 文件 | 目的 | 状态 |
|-----|------|------|
| `test.html` | API 对比测试 | ✅ 已存在 |
| `perf-test.html` | 性能测试 | ✅ 已存在 |
| `platform-test.html` | 平台差异测试 | ⚠️ 待创建 |
| `behavior-test.html` | 行为一致性测试 | ⚠️ 待创建 |
| `compat-test.html` | 兼容性测试 | ⚠️ 待创建 |

---

## 九、验证标准

### 9.1 通过标准

| 测试类型 | 通过率要求 | 说明 |
|---------|-----------|------|
| API 对比 | 100% | 必须完全一致 |
| 平台差异 | 100% | 必须一致 |
| 行为一致性 | > 99% | 允许极小误差 (浮点精度) |
| 兼容性 | 100% | 业务代码必须兼容 |
| 性能 | 优于或等于 | 文件大小、加载时间 |

### 9.2 失败处理

```
如果测试失败：
1. 记录失败的 API/平台/行为
2. 分析失败原因
3. 修复 Vite 构建配置
4. 重新运行测试
5. 更新验证报告
```

---

## 十、实施步骤

### Phase 1: 基础验证 (当前)

- [x] 基础 API 对比测试 (`test.html`)
- [x] 性能测试 (`perf-test.html`)

### Phase 2: 平台验证 (待实现)

- [ ] 创建 `platform-test.html`
- [ ] 添加 PAL 模块测试
- [ ] 添加小游戏平台测试
- [ ] 添加 Native 平台测试

### Phase 3: 行为验证 (待实现)

- [ ] 创建 `behavior-test.html`
- [ ] 添加数学计算测试
- [ ] 添加渲染测试
- [ ] 添加动画测试

### Phase 4: 兼容性验证 (待实现)

- [ ] 创建 `compat-test.html`
- [ ] 添加业务代码测试
- [ ] 添加第三方插件测试

### Phase 5: 自动化 (待实现)

- [ ] 集成 CI/CD
- [ ] 自动生成报告
- [ ] 失败告警

---

## 十一、总结

当前已有的测试基础设施已经覆盖了**核心 API 对比**和**性能测试**。

**下一步工作**：
1. 扩展 `test.html` 添加平台 API 测试
2. 创建 `platform-test.html` 验证平台差异
3. 创建 `behavior-test.html` 验证运行时行为
4. 创建 `compat-test.html` 验证业务兼容性

**验证标准**：
- API 对比：100% 通过
- 平台差异：100% 通过
- 行为一致性：> 99% 通过
- 兼容性：100% 通过

---

*文档版本: 1.0*
*更新时间: 2026-04-16*
