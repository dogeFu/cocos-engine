# Prefab — 预制体

## 概述

`Prefab`（预制体）是节点树的模板，可以反复实例化出相同的节点结构。预制体是 Cocos Creator 复用游戏对象的核心机制，广泛用于 UI 元素、敌人、子弹等需要大量复用的场景。

## 导入方式

```typescript
import { Prefab, instantiate, Node } from 'cc';
```

## 基础用法

### 从预制体创建实例

```typescript
@ccclass('PrefabDemo')
export class PrefabDemo extends Component {
    @property({ type: Prefab })
    public enemyPrefab: Prefab | null = null;

    createEnemy() {
        if (!this.enemyPrefab) return;
        const enemy = instantiate(this.enemyPrefab);
        this.node.addChild(enemy);
    }
}
```

### 动态加载预制体

```typescript
@ccclass('DynamicPrefabLoader')
export class DynamicPrefabLoader extends Component {
    start() {
        const bundle = assetManager.getBundle('resources');
        bundle!.load<Prefab>('prefabs/enemy', Prefab, (err, prefab) => {
            if (err) return;
            const enemy = instantiate(prefab);
            this.node.addChild(enemy);
        });
    }
}
```

## 核心方法

| 方法 | 说明 |
|------|------|
| `instantiate(prefab)` | 从预制体创建节点实例 |

## instantiate 详解

`instantiate` 是通用的克隆函数，不仅可以克隆预制体，还可以克隆任意节点：

```typescript
const newNode = instantiate(originalNode);
const newPrefab = instantiate(originalPrefab);
```

### 克隆节点

```typescript
const template = new Node('Template');
template.addComponent(Sprite);

const clone1 = instantiate(template);
const clone2 = instantiate(template);
this.node.addChild(clone1);
this.node.addChild(clone2);
```

## 进阶用法

### 对象池 + 预制体

```typescript
import { NodePool } from 'cc';

@ccclass('BulletManager')
export class BulletManager extends Component {
    @property({ type: Prefab })
    public bulletPrefab: Prefab | null = null;

    private _pool: NodePool = new NodePool('Bullet');

    public spawnBullet(): Node | null {
        if (!this.bulletPrefab) return null;

        let bullet: Node;
        if (this._pool.size() > 0) {
            bullet = this._pool.get()!;
        } else {
            bullet = instantiate(this.bulletPrefab);
        }

        this.node.addChild(bullet);
        return bullet;
    }

    public recycleBullet(bullet: Node) {
        bullet.removeFromParent();
        this._pool.put(bullet);
    }
}
```

### 批量创建

```typescript
@ccclass('GridCreator')
export class GridCreator extends Component {
    @property({ type: Prefab })
    public cellPrefab: Prefab | null = null;

    @property({ type: Number })
    public rows: number = 5;

    @property({ type: Number })
    public cols: number = 5;

    @property({ type: Number })
    public spacing: number = 10;

    start() {
        if (!this.cellPrefab) return;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = instantiate(this.cellPrefab);
                cell.setPosition(c * this.spacing, r * this.spacing, 0);
                this.node.addChild(cell);
            }
        }
    }
}
```

### 预制体实例初始化

```typescript
@ccclass('EnemySpawner')
export class EnemySpawner extends Component {
    @property({ type: Prefab })
    public enemyPrefab: Prefab | null = null;

    spawnEnemy(health: number, speed: number, position: Vec3) {
        if (!this.enemyPrefab) return;

        const enemy = instantiate(this.enemyPrefab);
        enemy.setPosition(position);

        const controller = enemy.getComponent(EnemyController);
        if (controller) {
            controller.init(health, speed);
        }

        this.node.addChild(enemy);
    }
}

@ccclass('EnemyController')
export class EnemyController extends Component {
    private _health: number = 0;
    private _speed: number = 0;

    public init(health: number, speed: number) {
        this._health = health;
        this._speed = speed;
    }
}
```

## 注意事项

- `instantiate` 创建的实例与原预制体独立，修改实例不影响预制体
- 预制体通过 `@property({ type: Prefab })` 在编辑器中引用
- 动态加载预制体需要先通过 `assetManager` 加载资源
- 频繁创建/销毁预制体实例时，务必使用 `NodePool` 进行优化
- `instantiate` 会深拷贝整个节点树和所有组件，开销较大
