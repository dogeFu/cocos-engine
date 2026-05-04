# Decorator — 装饰器系统

## 概述

装饰器是 Cocos Creator 定义组件行为的核心机制。通过装饰器，引擎可以识别类为 CCClass、声明属性类型和编辑器展示方式、设置组件依赖关系等。所有装饰器通过 `_decorator` 命名空间导出。

## 导入方式

```typescript
import { _decorator } from 'cc';
const { ccclass, property, requireComponent, executionOrder, disallowMultiple,
        executeInEditMode, menu, playOnFocus, inspector, icon, help,
        type, integer, float } = _decorator;
```

## ccclass — 声明 CCClass

将标准 TypeScript 类注册为 Cocos Creator 可识别的 CCClass，是创建组件的必要装饰器。

```typescript
@ccclass('MyComponent')
export class MyComponent extends Component {
}
```

`ccclass` 参数说明：

```typescript
@ccclass({
    name: 'MyComponent',
    executionOrder: 0,
    disallowMultiple: false,
    menu: 'Custom/MyComponent',
})
export class MyComponent extends Component {
}
```

## property — 声明属性

将类属性声明为可序列化、可在编辑器中编辑的 CCClass 属性。

### 基础用法

```typescript
@ccclass('PropertyDemo')
export class PropertyDemo extends Component {
    @property
    public simpleValue: number = 0;

    @property({ type: Number })
    public typedValue: number = 0;

    @property({ type: String })
    public stringValue: string = '';

    @property({ type: Boolean })
    public boolValue: boolean = false;
}
```

### 引用类型属性

```typescript
@ccclass('ReferenceDemo')
export class ReferenceDemo extends Component {
    @property({ type: Node })
    public targetNode: Node | null = null;

    @property({ type: SpriteFrame })
    public icon: SpriteFrame | null = null;

    @property({ type: AnimationClip })
    public clip: AnimationClip | null = null;

    @property({ type: [Node] })
    public nodeList: Node[] = [];

    @property({ type: [SpriteFrame] })
    public frames: SpriteFrame[] = [];
}
```

### 属性完整选项

```typescript
@ccclass('FullPropertyDemo')
export class FullPropertyDemo extends Component {
    @property({
        type: Number,
        tooltip: '移动速度',
        displayName: 'Speed',
        group: { name: 'Movement', id: 'movement' },
        range: [0, 100, 1],
        slide: true,
        unit: 'm/s',
        radian: false,
        multiline: false,
        displayOrder: 1,
        visible: true,
        readOnly: false,
        formerlySerializedAs: 'oldSpeed',
    })
    public speed: number = 10;

    @property({
        visible(this: FullPropertyDemo) {
            return this.speed > 0;
        },
    })
    public showWhenMoving: boolean = true;
}
```

### 属性选项说明

| 选项 | 类型 | 说明 |
|------|------|------|
| `type` | `Function` | 属性类型构造函数 |
| `tooltip` | `string` | 编辑器中的提示文字 |
| `displayName` | `string` | 编辑器中显示的名称 |
| `group` | `{ name, id }` | 属性分组 |
| `range` | `[min, max, step]` | 数值范围与步进 |
| `slide` | `boolean` | 使用滑动条 |
| `unit` | `string` | 计量单位 |
| `radian` | `boolean` | 弧度制（编辑器显示角度） |
| `multiline` | `boolean` | 多行文本输入 |
| `displayOrder` | `number` | 显示顺序 |
| `visible` | `boolean \| (this) => boolean` | 是否可见 |
| `readOnly` | `boolean` | 只读 |
| `formerlySerializedAs` | `string` | 旧序列化名称（重命名兼容） |
| `serializable` | `boolean` | 是否可序列化（默认 true） |
| `editorOnly` | `boolean` | 仅编辑器使用 |
| `override` | `boolean` | 覆盖父类属性定义 |

## requireComponent — 组件依赖

确保节点上存在指定组件，若不存在则自动添加。

```typescript
@ccclass('PhysicsMover')
@requireComponent(RigidBody)
@requireComponent(BoxCollider)
export class PhysicsMover extends Component {
    start() {
        const body = this.getComponent(RigidBody)!;
        const collider = this.getComponent(BoxCollider)!;
    }
}
```

## executionOrder — 执行优先级

控制组件生命周期回调的执行顺序，数值越小越先执行。

```typescript
@ccclass('InputHandler')
@executionOrder(-100)
export class InputHandler extends Component {
    update(dt: number) {
    }
}

@ccclass('GameLogic')
@executionOrder(0)
export class GameLogic extends Component {
    update(dt: number) {
    }
}

@ccclass('CameraController')
@executionOrder(100)
export class CameraController extends Component {
    lateUpdate(dt: number) {
    }
}
```

## disallowMultiple — 禁止多实例

禁止同一节点上添加多个相同类型的组件。

```typescript
@ccclass('GameManager')
@disallowMultiple
export class GameManager extends Component {
}
```

## executeInEditMode — 编辑器模式执行

允许组件在编辑器模式下也执行生命周期回调。

```typescript
@ccclass('EditorPreview')
@executeInEditMode
export class EditorPreview extends Component {
    update(dt: number) {
    }
}
```

## menu — 组件菜单路径

在编辑器的"添加组件"菜单中指定自定义路径。

```typescript
@ccclass('CustomButton')
@menu('UI/CustomButton')
export class CustomButton extends Component {
}
```

## playOnFocus — 聚焦高帧率

编辑器中选中该组件所在节点时，以正常帧率运行场景。

```typescript
@ccclass('ParticlePreview')
@playOnFocus
export class ParticlePreview extends Component {
}
```

## inspector — 自定义检查器

指定编辑器中使用的自定义检查器页面。

```typescript
@ccclass('CustomInspectorDemo')
@inspector('packages://custom-inspector/inspector.js')
export class CustomInspectorDemo extends Component {
}
```

## icon — 组件图标

指定组件在编辑器中显示的图标。

```typescript
@ccclass('MyComponent')
@icon('packages://my-package/icon.png')
export class MyComponent extends Component {
}
```

## help — 帮助文档

指定组件的帮助文档 URL。

```typescript
@ccclass('MyComponent')
@help('https://docs.cocos.com/creator/3.8/manual/')
export class MyComponent extends Component {
}
```

## 类型快捷装饰器

### type — 标记属性类型

```typescript
@ccclass('TypeDemo')
export class TypeDemo extends Component {
    @type([Node])
    public nodes: Node[] = [];

    @type(SpriteFrame)
    public frame: SpriteFrame | null = null;

    @type(Enum({ A: 1, B: 2, C: 3 }))
    public category: number = 1;
}
```

### integer — 整数类型

```typescript
@ccclass('IntegerDemo')
export class IntegerDemo extends Component {
    @integer
    public count: number = 0;
}
```

### float — 浮点数类型

```typescript
@ccclass('FloatDemo')
export class FloatDemo extends Component {
    @float
    public rate: number = 0.5;
}
```

## 装饰器组合示例

```typescript
@ccclass('PlayerController')
@requireComponent(RigidBody)
@disallowMultiple
@executionOrder(-10)
@menu('Game/PlayerController')
@help('https://docs.example.com/player')
export class PlayerController extends Component {
    @property({ type: Number, tooltip: '移动速度', range: [0, 500, 1] })
    public moveSpeed: number = 200;

    @property({ type: Number, tooltip: '跳跃力度', range: [0, 1000, 1] })
    public jumpForce: number = 400;

    @property({ type: Node, tooltip: '地面检测点' })
    public groundCheck: Node | null = null;

    @property({ type: [AnimationClip], tooltip: '动画列表' })
    public clips: AnimationClip[] = [];
}
```

## 注意事项

- `@ccclass` 是必须的装饰器，没有它引擎无法识别该类
- `@property` 装饰的属性才能在编辑器中显示和序列化
- 引用类型（Node、Asset 等）必须通过 `type` 选项指定类型
- 数组类型使用 `type: [ClassType]` 语法
- `@requireComponent` 只保证依赖存在，不保证依赖的配置正确
- `@executionOrder` 仅影响同一节点上不同组件的执行顺序
- 装饰器顺序不影响功能，但建议 `@ccclass` 放在最前面
