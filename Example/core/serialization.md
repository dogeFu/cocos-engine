# Serialization — 序列化

## 概述

Cocos Creator 提供了序列化和反序列化机制，用于将对象转换为可存储/传输的格式，以及从格式还原对象。`deserialize` 用于将 JSON 数据还原为引擎对象，`instantiate` 用于深拷贝对象。

## 导入方式

```typescript
import { deserialize, instantiate, _decorator } from 'cc';
const { ccclass, property } = _decorator;
```

## 基础用法

### deserialize — 反序列化

将序列化的 JSON 字符串或对象还原为引擎对象。

```typescript
const jsonStr = '[{"__type__":"cc.Node","_name":"MyNode","_components":[]}]';
const nodes = deserialize(jsonStr);
```

### instantiate — 深拷贝

```typescript
const original = new Node('Original');
original.addComponent(Sprite);

const clone = instantiate(original);
```

## 可序列化属性

只有通过 `@property` 装饰的属性才会被序列化：

```typescript
@ccclass('SerializableDemo')
export class SerializableDemo extends Component {
    @property({ type: Number })
    public health: number = 100;

    @property({ type: String })
    public playerName: string = '';

    @property({ type: Node })
    public target: Node | null = null;

    public tempValue: number = 0;
}
```

## 序列化控制

### serializable — 控制是否序列化

```typescript
@ccclass('SerializationControl')
export class SerializationControl extends Component {
    @property({ type: Number, serializable: true })
    public savedValue: number = 0;

    @property({ type: Number, serializable: false })
    public runtimeValue: number = 0;
}
```

### editorOnly — 仅编辑器序列化

```typescript
@ccclass('EditorOnlyDemo')
export class EditorOnlyDemo extends Component {
    @property({ type: Number, editorOnly: true })
    public editorData: number = 0;

    @property({ type: Number })
    public runtimeData: number = 0;
}
```

### formerlySerializedAs — 重命名兼容

```typescript
@ccclass('RenameDemo')
export class RenameDemo extends Component {
    @property({ type: Number, formerlySerializedAs: 'oldSpeed' })
    public speed: number = 10;
}
```

## 进阶用法

### 自定义序列化格式

```typescript
@ccclass('CustomSerialize')
export class CustomSerialize extends Component {
    @property({ type: Number })
    public x: number = 0;

    @property({ type: Number })
    public y: number = 0;

    public toJSON() {
        return {
            x: this.x,
            y: this.y,
        };
    }
}
```

### 运行时动态加载场景数据

```typescript
@ccclass('SceneLoader')
export class SceneLoader extends Component {
    public loadFromData(jsonData: string) {
        try {
            const nodes = deserialize(jsonData);
            if (Array.isArray(nodes)) {
                for (const node of nodes) {
                    this.node.addChild(node as Node);
                }
            }
        } catch (e) {
        }
    }
}
```

## 注意事项

- 只有 `@property` 装饰的属性才会被序列化，普通属性在运行时存在但不会保存
- 引用类型（Node、Asset 等）序列化时存储的是 UUID 引用，不是对象本身
- `deserialize` 主要用于引擎内部，普通开发中较少直接使用
- `formerlySerializedAs` 用于属性重命名后的向后兼容
- `editorOnly` 属性在构建时会被移除，不会包含在发布版本中
