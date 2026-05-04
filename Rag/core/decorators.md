# 引擎装饰器完整参考

> Cocos Creator 引擎装饰器系统的完整参考。涵盖所有 30 个装饰器的功能、参数、使用方式、编辑器显示效果、内部工作机制、序列化行为、DEV/生产环境差异。

---

## 目录

1. [装饰器体系概览](#1-装饰器体系概览)
2. [内部工作机制](#2-内部工作机制)
3. [类装饰器](#3-类装饰器)
4. [@property 属性装饰器](#4-property-属性装饰器)
5. [类型装饰器](#5-类型装饰器)
6. [序列化装饰器](#6-序列化装饰器)
7. [编辑器属性装饰器](#7-编辑器属性装饰器)
8. [继承与覆盖装饰器](#8-继承与覆盖装饰器)
9. [装饰器协作流程](#9-装饰器协作流程)
10. [DEV 与生产环境差异](#10-dev-与生产环境差异)
11. [构建时装饰器优化](#11-构建时装饰器优化)
12. [隐含知识与常见陷阱](#12-隐含知识与常见陷阱)
13. [关键文件索引](#13-关键文件索引)

---

## 1. 装饰器体系概览

### 1.1 导入方式

```typescript
import { ccclass, property, executeInEditMode, menu, requireComponent } from 'cc.decorator';
```

`cc.decorator` 通过 `tsconfig.json` 的 `paths` 映射到 `cocos/core/data/decorators/index.ts`。

### 1.2 装饰器分类

共 **30 个**装饰器，分为 4 大类：

| 类别 | 数量 | 装饰器 |
|------|------|--------|
| **类装饰器** | 11 | `ccclass`、`executeInEditMode`、`menu`、`playOnFocus`、`inspector`、`icon`、`help`、`requireComponent`、`executionOrder`、`disallowMultiple`、`uniquelyReferenced` |
| **属性核心装饰器** | 2 | `property`、`override` |
| **类型装饰器** | 5 | `type`、`integer`、`float`、`boolean`、`string` |
| **序列化装饰器** | 3 | `serializable`、`formerlySerializedAs`、`editorOnly` |
| **编辑器属性装饰器** | 9 | `editable`、`visible`、`readOnly`、`displayName`、`tooltip`、`group`、`range`、`slide`、`displayOrder`、`unit`、`radian`、`multiline`、`disallowAnimation`、`radioGroup`、`rangeMin`、`rangeMax`、`rangeStep` |

> 注：`integer`/`float`/`boolean`/`string` 是 `@type` 的语法糖；`rangeMin`/`rangeMax`/`rangeStep` 是 `@range` 的拆分形式。

### 1.3 完整装饰器速查表

| 装饰器 | 类型 | 必须参数 | 编辑器效果 | 生产环境保留 |
|--------|------|---------|-----------|------------|
| `@ccclass` | 类 | 可选 name | 注册到组件菜单 | ✅ |
| `@property` | 属性 | 可选 options/type | Inspector 中显示 | ✅ |
| `@type` | 属性 | type | 控制属性类型显示 | ✅ |
| `@integer` | 属性 | — | 整数输入框 | ✅ |
| `@float` | 属性 | — | 浮点数输入框 | ✅ |
| `@boolean` | 属性 | — | 复选框 | ✅ |
| `@string` | 属性 | — | 文本输入框 | ✅ |
| `@serializable` | 属性 | — | 参与序列化 | ✅ |
| `@formerlySerializedAs` | 属性 | name | 反序列化兼容 | ✅ |
| `@editorOnly` | 属性 | — | 构建时剔除 | ❌ |
| `@editable` | 属性 | — | Inspector 可编辑 | ❌ |
| `@visible` | 属性 | condition | 控制显示/隐藏 | ❌ |
| `@readOnly` | 属性 | — | Inspector 只读 | ❌ |
| `@displayName` | 属性 | text | 替代属性名显示 | ❌ |
| `@tooltip` | 属性 | text | 鼠标悬停提示 | ❌ |
| `@group` | 属性 | name/opts | Inspector 分组 | ❌ |
| `@range` | 属性 | [min,max,step] | 数值范围限制 | ❌ |
| `@rangeMin` | 属性 | min | 最小值限制 | ❌ |
| `@rangeMax` | 属性 | max | 最大值限制 | ❌ |
| `@rangeStep` | 属性 | step | 步进值 | ❌ |
| `@slide` | 属性 | — | 滑动条 | ❌ |
| `@displayOrder` | 属性 | n | 排列顺序 | ❌ |
| `@unit` | 属性 | name | 数值单位显示 | ❌ |
| `@radian` | 属性 | — | 角度转弧度 | ❌ |
| `@multiline` | 属性 | — | 多行文本框 | ❌ |
| `@disallowAnimation` | 属性 | — | 禁止动画编辑 | ❌ |
| `@radioGroup` | 属性 | — | 单选按钮组 | ❌ |
| `@override` | 属性 | — | 覆盖基类属性 | ✅ |
| `@executeInEditMode` | 类 | 可选 bool | 编辑器中执行 | ❌ |
| `@menu` | 类 | path | 添加到组件菜单 | ❌ |
| `@playOnFocus` | 类 | 可选 bool | 选中时 60FPS | ❌ |
| `@inspector` | 类 | url | 自定义检查器 | ❌ |
| `@icon` | 类 | url | 自定义图标 | ❌ |
| `@help` | 类 | url | 帮助文档链接 | ❌ |
| `@requireComponent` | 类 | type(s) | 自动添加依赖 | ✅ |
| `@executionOrder` | 类 | priority | 生命周期顺序 | ✅ |
| `@disallowMultiple` | 类 | 可选 bool | 禁止重复添加 | ❌ |
| `@uniquelyReferenced` | 类 | — | 唯一引用序列化 | ✅ |

---

## 2. 内部工作机制

### 2.1 缓存机制

所有装饰器通过 `__ccclassCache__` 键在构造函数上缓存数据：

```typescript
// cocos/core/data/decorators/utils.ts
export const CACHE_KEY = '__ccclassCache__';
```

由于 TypeScript/Babel 装饰器的执行顺序是**属性装饰器先于类装饰器**，所以 `@property`、`@tooltip` 等属性装饰器先执行并将数据写入 `CACHE_KEY`，然后 `@ccclass` 统一收集并清除缓存。

### 2.2 智能装饰器工厂

引擎提供三个核心工厂函数：

**`makeSmartClassDecorator`**：创建支持 `@x` 和 `@x(arg)` 两种语法的类装饰器：

```typescript
// @ccclass 和 @ccclass('name') 都合法
export const ccclass = makeSmartClassDecorator<string>((constructor, name) => { ... });
```

**`makeEditorClassDecoratorFn`**：创建必须传参数的编辑器类装饰器：

```typescript
// @menu('path') 必须传参数
export const menu = makeEditorClassDecoratorFn('menu');
```

**`makeSmartEditorClassDecorator`**：结合上述两者，创建智能编辑器类装饰器：

```typescript
// @executeInEditMode 和 @executeInEditMode(true) 都合法
export const executeInEditMode = makeSmartEditorClassDecorator('executeInEditMode', true);
```

### 2.3 数据存储结构

**ClassStash**（类级别缓存）：

```typescript
interface ClassStash {
    default?: unknown;        // 提取的默认值对象
    proto?: {
        properties?: Record<PropertyKey, PropertyStash>;  // 属性暂存
        editor?: Record<string, unknown>;                 // 编辑器属性暂存
    };
    errorProps?: Record<PropertyKey, true>;  // 错误属性记录
}
```

**PropertyStash**（属性级别缓存）：

```typescript
interface PropertyStash extends IExposedAttributes {
    default?: unknown;
    get?: () => unknown;
    set?: (value: unknown) => void;
    _short?: unknown;            // 简写标记
    __internalFlags: number;     // 内部标记位
}
```

**PropertyStashInternalFlag**（内部标记枚举）：

| 标志 | 值 | 说明 |
|------|-----|------|
| `STANDALONE` | `1 << 0` | 使用了独立属性装饰器（如 `@editable`、`@serializable`） |
| `IMPLICIT_VISIBLE` | `1 << 1` | 隐式可见（使用编辑器装饰器后自动可见） |
| `IMPLICIT_SERIALIZABLE` | `1 << 2` | 隐式可序列化 |

### 2.4 属性元数据存储格式

所有属性最终以 `属性名$_$属性键` 的格式存储在类的 `__attrs__` 对象中：

```typescript
// 属性 "fov" 的元数据
constructor.__attrs__['fov$_$type'] = 'Float';
constructor.__attrs__['fov$_$min'] = 0;
constructor.__attrs__['fov$_$max'] = 100;
constructor.__attrs__['fov$_$step'] = 1;
constructor.__attrs__['fov$_$slide'] = true;
constructor.__attrs__['fov$_$visible'] = true;
constructor.__attrs__['fov$_$serializable'] = true;
```

分隔符定义：`DELIMETER = '$_$'`

---

## 3. 类装饰器

### 3.1 @ccclass

**功能**：将标准类声明为 CCClass，注册到引擎的类系统。

**使用方式**：

```typescript
@ccclass('ClassName')
class MyClass extends Component { }

// 或不传名称（使用类名）
@ccclass
class MyClass extends Component { }
```

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 否 | 类的序列化名称，用于反序列化时查找类 |

**内部流程**：

1. 获取父类（`getSuper`）
2. 构建 `proto` 对象（`name`、`extends`、`ctor`）
3. 从 `constructor[CACHE_KEY]` 中取出其他装饰器缓存的数据，合并到 `proto`
4. 清除缓存（`constructor[CACHE_KEY] = undefined`）
5. 调用 `CCClass(proto)` 完成类的注册
6. DEV 模式下验证所有方法

**类 ID 系统**：

- `@ccclass('ClassName')` 传入的名称通过 `js.setClassName()` 注册到 `_nameToClass` 表
- 同时自动作为 class ID 注册到 `_idToClass` 表
- 序列化时通过 `getClassId()` 获取 ID 写入数据
- 反序列化时通过 `getClassById()` 查找构造函数
- 脚本组件使用压缩 UUID 作为 class ID

**判断是否为 CCClass**：

```typescript
CCClass._isCCClass(constructor)  // 检查 constructor.__ctors__ 标记
```

### 3.2 @executeInEditMode

**功能**：允许 Component 在编辑器模式下执行生命周期方法。

```typescript
@ccclass('CameraCtrl')
@executeInEditMode
export class CameraCtrl extends Component { }
```

**参数**：可选 `boolean`，默认 `true`。

**编辑器效果**：组件在编辑器场景中也会执行 `update`、`lateUpdate` 等生命周期方法。

**注意**：必须配合 `@ccclass` 使用，且仅对 Component 子类有效。

### 3.3 @menu

**功能**：将组件添加到编辑器"添加组件"菜单的指定路径。

```typescript
@ccclass('CameraCtrl')
@menu('Rendering/CameraCtrl')
export class CameraCtrl extends Component { }
```

**参数**：必填，菜单路径字符串，使用 `/` 分隔层级。

**编辑器效果**：在 Inspector 的"添加组件"菜单中出现 `Rendering > CameraCtrl` 选项。

### 3.4 @playOnFocus

**功能**：选中节点时提高编辑器刷新频率到 60 FPS。

```typescript
@ccclass('PreviewCtrl')
@executeInEditMode
@playOnFocus
export class PreviewCtrl extends Component { }
```

**参数**：可选 `boolean`，默认 `true`。

**注意**：必须配合 `@executeInEditMode` 使用。

### 3.5 @inspector

**功能**：自定义属性检查器中渲染组件的 UI 页面。

```typescript
@ccclass('CameraCtrl')
@inspector('packages://inspector/inspectors/comps/camera-ctrl.js')
export class CameraCtrl extends Component { }
```

**参数**：必填，检查器页面 URL 字符串。

### 3.6 @icon

**功能**：自定义组件在编辑器中显示的图标。

```typescript
@ccclass('MyComponent')
@icon('packages://my-package/icon.png')
export class MyComponent extends Component { }
```

**参数**：必填，图标 URL 字符串。

### 3.7 @help

**功能**：指定组件的帮助文档 URL，Inspector 中会显示帮助图标。

```typescript
@ccclass('MyComponent')
@help('https://docs.cocos.com/creator/manual/en/')
export class MyComponent extends Component { }
```

**参数**：必填，帮助文档 URL 字符串。

### 3.8 @requireComponent

**功能**：声明组件依赖的其他组件，缺失时自动添加。

```typescript
@ccclass('CameraCtrl')
@requireComponent([Camera, Widget])
export class CameraCtrl extends Component { }
```

**参数**：必填，组件构造函数或构造函数数组。

**运行时行为**：添加此组件时，如果节点上没有依赖的组件，会自动创建并添加。

**注意**：此装饰器在生产环境也保留，因为影响运行时行为。

### 3.9 @executionOrder

**功能**：设置组件生命周期方法的执行优先级。

```typescript
@ccclass('EarlyUpdate')
@executionOrder(-100)
export class EarlyUpdate extends Component { }
```

**参数**：必填，数字。值越小越先执行。

**注意**：此装饰器在生产环境也保留，因为影响运行时调度顺序。

### 3.10 @disallowMultiple

**功能**：禁止同一节点上添加多个相同类型的组件。

```typescript
@ccclass('CameraCtrl')
@disallowMultiple
export class CameraCtrl extends Component { }
```

**参数**：可选 `boolean`，默认 `true`。

**编辑器效果**：Inspector 中"添加组件"菜单对已存在的组件变灰。

### 3.11 @uniquelyReferenced

**功能**：标记类为"被唯一引用"，序列化时同一实例的不同引用会被当作不同对象。

```typescript
@ccclass('MyData')
@uniquelyReferenced
export class MyData { }
```

**参数**：无。

**序列化行为**：默认情况下，多个引用指向同一对象时，序列化后只保存一份，反序列化后所有引用指向同一对象。使用 `@uniquelyReferenced` 后，每个引用独立序列化，反序列化后指向不同对象。

---

## 4. @property 属性装饰器

### 4.1 四种调用形式

```typescript
// 形式1: 无参数直接装饰
@property
speed = 0;

// 形式2: 空选项
@property()
speed = 0;

// 形式3: 传入类型
@property(CCFloat)
speed = 0;

// 形式4: 传入选项对象
@property({ type: CCFloat, min: 0, max: 100, slide: true })
speed = 0;
```

### 4.2 完整选项列表（IExposedAttributes）

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `any` | 自动推断 | 属性类型 |
| `visible` | `boolean \| (() => boolean)` | 自动判断 | 是否在 Inspector 中显示 |
| `displayName` | `string` | 属性名 | Inspector 中显示的名称 |
| `displayOrder` | `number` | — | Inspector 中的排列顺序 |
| `tooltip` | `string` | — | 鼠标悬停提示（支持 `i18n:` 前缀） |
| `group` | `string \| { name, id?, displayOrder?, style? }` | — | Inspector 分组 |
| `multiline` | `boolean` | false | 多行文本框 |
| `readonly` | `boolean \| { deep?: boolean }` | false | 只读；`deep` 递归只读 |
| `min` | `number \| (() => number)` | — | 数值最小值 |
| `max` | `number \| (() => number)` | — | 数值最大值 |
| `step` | `number` | — | 滑动条步长 |
| `range` | `number[]` | — | 范围 `[min, max]` 或 `[min, max, step]` |
| `slide` | `boolean` | false | 提供滑动条 |
| `serializable` | `boolean` | true | 是否参与序列化 |
| `formerlySerializedAs` | `string` | — | 曾用名（反序列化兼容） |
| `editorOnly` | `boolean` | false | 仅编辑器环境生效 |
| `override` | `boolean` | false | 覆盖基类同名属性 |
| `animatable` | `boolean` | true | 是否可参与动画编辑 |
| `unit` | `string` | — | 计量单位（如 `'deg'`、`'m/s'`） |
| `radian` | `boolean` | false | 编辑器赋值前将角度转弧度 |
| `radioGroup` | `boolean` | false | 枚举显示为单选按钮组 |
| `userData` | `Record<string, any>` | — | 用户自定义数据 |

### 4.3 类型推断规则

| 简写形式 | 转换结果 |
|----------|----------|
| `@property(CCInteger)` | `{ type: CCInteger }` |
| `@property(CCFloat)` | `{ type: CCFloat }` |
| `@property(CCBoolean)` | `{ type: CCBoolean }` |
| `@property(CCString)` | `{ type: CCString }` |
| `@property(Vec3)` | `{ default: new Vec3(), type: Vec3 }`（ValueType 子类） |
| `@property(Node)` | `{ default: null, type: Node }`（引用类型） |
| `@property([Vec3])` | `{ default: [], type: Vec3 }`（数组类型） |
| `@property(MyEnum)` | 枚举类型，Inspector 显示下拉框 |
| `@property(BitMask(MyEnum))` | BitMask 类型，Inspector 显示多选框 |

### 4.4 类型在 parseAttributes 中的最终解析

| 输入类型 | 存储格式 | Inspector 控件 |
|---------|---------|---------------|
| `CCInteger` | `type='Integer'` | 整数输入框 |
| `CCFloat` | `type='Float'` | 浮点数输入框 |
| `CCBoolean` | `type='Boolean'` | 复选框 |
| `CCString` | `type='String'` | 文本输入框 |
| 枚举对象 | `type='Enum', enumList=[...]` | 下拉框 / 单选按钮组 |
| BitMask 对象 | `type='BitMask', bitmaskList=[...]` | 多选框 |
| 构造函数 | `type='Object', ctor=TypeConstructor` | 对象引用选择器 |

### 4.5 默认值提取机制

1. **TypeScript 初始化器**：`@property speed = 0;` 中的 `0` 通过初始化器函数提取
2. **Babel class field initializer**：通过 `descriptorOrInitializer.initializer` 提取
3. **对象类型延迟初始化**：对象类型的默认值保存为初始化器函数（延迟执行），避免所有实例共享同一引用
4. **ValueType 子类**：简写形式自动实例化（如 `@property(Vec3)` → `default: new Vec3()`）
5. **引用类型**：简写形式默认为 `null`（如 `@property(Node)` → `default: null`）

### 4.6 属性可见性判定

```
是否指定了 visible？
├── 是 → 使用指定值
└── 否 → 是否使用了独立装饰器（STANDALONE 标记）？
    ├── 是 → 检查 IMPLICIT_VISIBLE 标记
    │   ├── 有 IMPLICIT_VISIBLE → 可见
    │   └── 无 → 不可见
    └── 否 → 属性名是否以 _ 开头？
        ├── 是 → 不可见
        └── 否 → 可见
```

### 4.7 序列化可见性判定

```
是否指定了 serializable？
├── serializable === false → 不序列化
└── 其他 → 是否使用了独立装饰器（STANDALONE 标记）？
    ├── 是 → 检查 IMPLICIT_SERIALIZABLE 标记
    │   ├── 有 IMPLICIT_SERIALIZABLE → 序列化
    │   └── 无 → 不序列化
    └── 否 → 默认序列化
```

### 4.8 getter/setter 属性

```typescript
@property({
    type: CCFloat,
})
get speed(): number {
    return this._speed;
}
set speed(value: number) {
    this._speed = value;
}
```

getter/setter 属性通过 `defineGetSet` 注册，不支持默认值提取。

---

## 5. 类型装饰器

### 5.1 @type

**功能**：标记属性类型，本质上是 `@property({type})` 的简写。

```typescript
@type(Vec3)
position = new Vec3();

@type([SpriteFrame])
frames = [];
```

### 5.2 @integer

**功能**：标记属性为整数，等于 `@type(CCInteger)`。

```typescript
@integer
count = 0;
```

**Inspector**：整数输入框，不支持小数。

### 5.3 @float

**功能**：标记属性为浮点数，等于 `@type(CCFloat)`。

```typescript
@float
speed = 1.5;
```

**Inspector**：浮点数输入框。

### 5.4 @boolean

**功能**：标记属性为布尔值，等于 `@type(CCBoolean)`。

```typescript
@boolean
enabled = true;
```

**Inspector**：复选框。

### 5.5 @string

**功能**：标记属性为字符串，等于 `@type(CCString)`。

```typescript
@string
name = '';
```

**Inspector**：文本输入框。

---

## 6. 序列化装饰器

### 6.1 @serializable

**功能**：标记属性参与序列化/反序列化。

```typescript
@serializable
data = null;
```

**使用场景**：与独立属性装饰器（如 `@editable`）配合使用时，需要显式标记可序列化。

**内部行为**：设置 `IMPLICIT_SERIALIZABLE` 标记。

### 6.2 @formerlySerializedAs

**功能**：指定属性的曾用序列化名称，用于属性重命名后的向后兼容。

```typescript
@formerlySerializedAs('oldName')
newName = '';
```

**使用场景**：重构时重命名属性，但需要兼容旧版序列化数据。

**内部行为**：反序列化时，如果找不到 `newName` 字段，会尝试用 `oldName` 读取。

### 6.3 @editorOnly

**功能**：标记属性仅在编辑器环境中生效，构建时会被剔除。

```typescript
@editorOnly
editorHelper = null;
```

**使用场景**：仅编辑器使用的辅助数据，不需要打包到运行时。

---

## 7. 编辑器属性装饰器

### 7.1 @editable

**功能**：标记属性可编辑，设置 `IMPLICIT_VISIBLE` 标记。

```typescript
@editable
myField = '';
```

### 7.2 @visible

**功能**：设置属性在编辑器中的显示条件。

```typescript
@visible(true)
alwaysShow = '';

@visible(false)
alwaysHide = '';

@visible(() => this.showAdvanced)
conditional = '';
```

**参数**：`boolean | (() => boolean)`

### 7.3 @readOnly

**功能**：设置属性在编辑器中为只读。

```typescript
@readOnly
readonlyValue = 42;
```

### 7.4 @displayName

**功能**：设置属性在编辑器中的显示名称。

```typescript
@displayName('Field of View')
fov = 45;
```

### 7.5 @tooltip

**功能**：设置属性在编辑器中的工具提示。

```typescript
@tooltip('i18n:ENGINE.components.camera.fov')
fov = 45;
```

**i18n 支持**：以 `i18n:` 开头的字符串会自动扩展为 `i18n:ENGINE.xxx`。

### 7.6 @group

**功能**：设置属性在属性检查器上的分组。

```typescript
@group({ name: 'Physics', id: 'physics', displayOrder: 1 })
@type(RigidBody)
body = null;
```

**参数**：`string | { name: string; id?: string; displayOrder?: number; style?: string }`

### 7.7 @range / @rangeMin / @rangeMax / @rangeStep

**功能**：设置数值属性的范围。

```typescript
@range([0, 100, 1])
value = 50;

// 等价于
@rangeMin(0)
@rangeMax(100)
@rangeStep(1)
value = 50;
```

**`@range` 参数**：`[min, max]` 或 `[min, max, step]` 数组。

**`@rangeMin` / `@rangeMax`**：支持 `number | (() => number)`，可动态计算。

### 7.8 @slide

**功能**：在编辑器中提供滑动条来调节值。

```typescript
@range([0, 100])
@slide
value = 50;
```

### 7.9 @displayOrder

**功能**：设置属性在编辑器中的显示顺序。

```typescript
@displayOrder(1)
first = '';

@displayOrder(2)
second = '';
```

### 7.10 @unit

**功能**：设置属性的计量单位，在 Inspector 数值旁显示。

```typescript
@unit('deg')
angle = 45;

@unit('m/s')
velocity = 10;
```

### 7.11 @radian

**功能**：编辑器赋值前将角度值转换为弧度。

```typescript
@radian
angle = Math.PI / 4;  // 编辑器中显示 45°，内部存储弧度
```

### 7.12 @multiline

**功能**：允许在编辑器中多行显示字符串。

```typescript
@multiline
description = '';
```

### 7.13 @disallowAnimation

**功能**：设置属性不参与编辑器动画交互。

```typescript
@disallowAnimation
helperValue = 0;
```

### 7.14 @radioGroup

**功能**：在编辑器中将枚举类型显示为一组单选按钮而非下拉框。

```typescript
@radioGroup
@type(Enum(MyEnum))
mode = MyEnum.OptionA;
```

---

## 8. 继承与覆盖装饰器

### 8.1 @override

**功能**：标记属性覆盖基类中的同名属性。

```typescript
class Base extends Component {
    @property({ type: CCFloat })
    speed = 10;
}

class Derived extends Base {
    @property({ type: CCFloat, override: true })
    speed = 20;  // 覆盖基类 speed
}
```

**DEV 模式警告**：如果基类已定义同名属性但未设置 `override: true`，会发出警告。

---

## 9. 装饰器协作流程

### 9.1 完整执行顺序

```
执行顺序（属性装饰器先于类装饰器）：

  @ccclass('MyClass')              ← 类装饰器最后执行
  @requireComponent(Sprite)        ← 写入 cache.proto.editor.requireComponent
  @executeInEditMode               ← 写入 cache.proto.editor.executeInEditMode
  class MyClass extends Component {

      @property({type: CCFloat})   ← 写入 cache.proto.properties.speed
      @tooltip('Speed value')      ← 追加到 cache.proto.properties.speed.tooltip
      @range([0, 100])            ← 追加到 cache.proto.properties.speed.range
      speed = 0;                   ← Babel/TS 传入 initializer

      @serializable                ← 写入 cache.proto.properties.data + IMPLICIT_SERIALIZABLE
      data = null;
  }

@ccclass 执行时：
  1. 读取 constructor[CACHE_KEY]（即 __ccclassCache__）
  2. 将 cache.proto 合并到 proto（包含 properties 和 editor）
  3. 清除缓存
  4. 调用 CCClass({ name, extends, ctor, properties, editor })
     4a. define() → doDefine() → js.setClassName() → 注册到类系统
     4b. declareProperties() → 解析属性 → 生成 __props__ 和 __values__
     4c. Component._registerEditorProps() → 设置编辑器属性
```

### 9.2 独立装饰器模式 vs @property 模式

**@property 模式**（默认可序列化、默认可见）：

```typescript
@ccclass('MyComp')
class MyComp extends Component {
    @property({ type: CCFloat, min: 0 })
    speed = 0;  // 默认可序列化、默认可见
}
```

**独立装饰器模式**（必须显式标记序列化和可见性）：

```typescript
@ccclass('MyComp')
class MyComp extends Component {
    @type(CCFloat)
    @serializable       // 必须显式标记
    @editable           // 必须显式标记可见
    @rangeMin(0)
    speed = 0;
}
```

### 9.3 属性声明最终处理

`CCClass` → `declareProperties()` → 对每个属性：

1. **`preprocessAttrs`**：调用 `getFullFormOfProperty` 转换简写形式
2. **`defineProp`**（普通属性）：设置默认值、属性描述符、属性元数据
3. **`defineGetSet`**（getter/setter 属性）：设置 getter/setter 描述符
4. **`parseAttributes`**：解析所有属性选项，写入 `__attrs__`

---

## 10. DEV 与生产环境差异

| 装饰器 | DEV 环境 | 生产环境 |
|--------|---------|---------|
| `executeInEditMode` | `makeSmartEditorClassDecorator(...)` | `emptySmartClassDecorator` |
| `menu` | `makeEditorClassDecoratorFn(...)` | `emptyDecoratorFn` |
| `playOnFocus` | `makeSmartEditorClassDecorator(...)` | `emptySmartClassDecorator` |
| `inspector` | `makeEditorClassDecoratorFn(...)` | `emptyDecoratorFn` |
| `icon` | `makeEditorClassDecoratorFn(...)` | `emptyDecoratorFn` |
| `help` | `makeEditorClassDecoratorFn(...)` | `emptyDecoratorFn` |
| `disallowMultiple` | `makeSmartEditorClassDecorator(...)` | `emptySmartClassDecorator` |
| `tooltip` | `setPropertyStashWithImplicitI18n(...)` | `emptyDecoratorFn` |
| `visible` | 设置 visible 属性 | `emptyDecoratorFn` |
| `readOnly` | 设置 readonly 属性 | `emptyDecoratorFn` |
| `displayName` | 设置 displayName 属性 | `emptyDecoratorFn` |
| `group` | 设置 group 属性 | `emptyDecoratorFn` |
| `range` | 设置 range 属性 | `emptyDecoratorFn` |
| `slide` | 设置 slide 属性 | `emptyDecoratorFn` |
| `editable` | 设置 IMPLICIT_VISIBLE | `emptyDecoratorFn` |
| `requireComponent` | `makeEditorClassDecoratorFn(...)` | ✅ 保留 |
| `executionOrder` | `makeEditorClassDecoratorFn(...)` | ✅ 保留 |
| `property` | 完整功能 | ✅ 保留（但编辑器选项无效果） |
| `serializable` | 完整功能 | ✅ 保留 |
| `formerlySerializedAs` | 完整功能 | ✅ 保留 |
| `override` | 完整功能 | ✅ 保留 |

**关键区别**：`requireComponent` 和 `executionOrder` 在生产环境也保留，因为它们影响运行时行为。

---

## 11. 构建时装饰器优化

### 11.1 字段装饰器（24 个）

构建时可优化（内联或简化）：

`property`、`serializable`、`type`、`ccclass`、`tooltip`、`displayGroupName`、`formerlySerializedAs`、`visible`、`range`、`slide`、`step`、`multiline`、`textarea`、`readOnly`、`writeOnly`、`displayName`、`group`、`unit`、`radix`、`min`、`max`、`override`、`editable`、`disallowMultiple`

### 11.2 编辑器装饰器（19 个）

生产构建时直接移除：

`executeInEditMode`、`menu`、`inspector`、`icon`、`help`、`playOnFocus`、`requireComponent`、`disallowMultiple`、`executionOrder`、`addDecorator`、`hideInInspector`、`customDecorator`、`mixins`、`updateInEditor`、`header`、`spacer`、`restrictTemplate`、`canBeDeleted`、`confirmBeforeDelete`

> 注：部分装饰器名仅存在于 ccbuild 的 Babel 预设中，不在引擎 `cc.decorator` 中直接导出。

---

## 12. 隐含知识与常见陷阱

1. **装饰器执行顺序** — 属性装饰器先于类装饰器，`@ccclass` 必须最后执行
2. **`@ccclass` 必须在所有属性装饰器之上** — 否则属性装饰器无法找到缓存
3. **以 `_` 开头的属性默认不可见** — 除非使用 `@visible(true)` 或编辑器装饰器
4. **对象类型默认值延迟初始化** — 避免所有实例共享同一引用
5. **`@property` 不等于 `@serializable`** — `@property` 默认可序列化且可见，`@serializable` 仅标记序列化
6. **独立装饰器模式需要显式标记** — 使用 `@editable`/`@serializable` 时必须同时标记可见性和序列化性
7. **`@range` 会被拆解** — `[min, max, step]` 拆解为 `min`、`max`、`step` 三个独立属性
8. **`readonly` 不是 `readOnly`** — 选项对象中用 `readonly`，独立装饰器用 `@readOnly`
9. **`@editorOnly` 在构建时剔除** — 运行时代码中不包含此属性的值
10. **`@override` 防止属性覆盖警告** — DEV 模式下未设置时会发出警告
11. **`min`/`max` 支持动态计算** — 可传入 `() => number` 函数
12. **`tooltip` 支持 i18n 前缀** — `i18n:xxx` 会自动扩展
13. **`@requireComponent` 在生产环境保留** — 影响运行时组件添加行为
14. **`@executionOrder` 在生产环境保留** — 影响运行时调度顺序
15. **`CCInteger`/`CCFloat`/`CCBoolean`/`CCString` 是原始类型包装** — 不是 JS 原生类型
16. **原生 JS 类型会自动转换** — `Number` → `CCFloat`、`String` → `CCString`（会发出警告）
17. **`_short` 标记影响类型检查** — 简写形式不注册运行时类型检查器
18. **`__values__` 是可序列化属性列表** — 只有在此列表中的属性才会被序列化
19. **`@uniquelyReferenced` 影响序列化行为** — 同一对象的多个引用会分别序列化
20. **`@formerlySerializedAs` 仅影响反序列化** — 序列化时仍使用新名称

---

## 13. 关键文件索引

| 文件 | 职责 |
|------|------|
| `cocos/core/data/decorators/index.ts` | `cc.decorator` 模块入口 |
| `cocos/core/data/decorators/ccclass.ts` | `@ccclass` 装饰器 |
| `cocos/core/data/decorators/property.ts` | `@property` 装饰器 |
| `cocos/core/data/decorators/type.ts` | `@type`、`@integer`、`@float`、`@boolean`、`@string` |
| `cocos/core/data/decorators/serializable.ts` | `@serializable`、`@formerlySerializedAs`、`@editorOnly`、`@uniquelyReferenced` |
| `cocos/core/data/decorators/editable.ts` | `@executeInEditMode`、`@menu`、`@playOnFocus`、`@inspector`、`@icon`、`@help` 及所有属性级编辑器装饰器 |
| `cocos/core/data/decorators/component.ts` | `@requireComponent`、`@executionOrder`、`@disallowMultiple` |
| `cocos/core/data/decorators/override.ts` | `@override` |
| `cocos/core/data/decorators/utils.ts` | 智能装饰器工厂、缓存机制 |
| `cocos/core/data/class-stash.ts` | `ClassStash`、`PropertyStash`、`PropertyStashInternalFlag` |
| `cocos/core/data/class.ts` | `CCClass` 核心实现、`declareProperties`、`parseAttributes` |
| `cocos/core/data/utils/attribute-defines.ts` | `IExposedAttributes` 接口定义 |
| `cocos/core/data/utils/attribute.ts` | 属性元数据系统、`CCInteger/CCFloat/CCBoolean/CCString` |
| `cocos/core/data/utils/preprocess-class.ts` | 简写形式转换、`getFullFormOfProperty` |
| `cocos/core/data/serialization-metadata.ts` | 序列化元数据 |
| `cocos/core/utils/js-typed.ts` | 类 ID/名称注册系统 |
| `cocos/scene-graph/component.ts` | `Component._registerEditorProps` |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*
