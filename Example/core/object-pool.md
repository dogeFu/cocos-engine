# NodePool — 节点池

## 概述

`NodePool` 是 Cocos Creator 提供的对象池实现，用于缓存和复用节点，避免频繁的创建和销毁操作带来的性能开销。适用于子弹、敌人、特效等需要大量频繁创建/销毁的场景。

## 导入方式

```typescript
import { NodePool, Node, Prefab, instantiate } from 'cc';
```

## 基础用法

### 创建节点池

```typescript
const pool = new NodePool('Enemy');
```

### 存入和取出节点

```typescript
const enemy = instantiate(enemyPrefab);
pool.put(enemy);

if (pool.size() > 0) {
    const reusedEnemy = pool.get()!;
} else {
    const newEnemy = instantiate(enemyPrefab);
}
```

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `get` | `() => Node \| null` | 从池中获取节点 |
| `put` | `(node: Node) => void` | 将节点放回池中 |
| `size` | `() => number` | 池中节点数量 |
| `clear` | `() => void` | 清空节点池 |

## 进阶用法

### 完整的节点池管理器

```typescript
@ccclass('PoolManager')
export class PoolManager extends Component {
    @property({ type: Prefab })
    public bulletPrefab: Prefab | null = null;

    @property({ type: Number })
    public preloadCount: number = 10;

    private _bulletPool: NodePool = new NodePool('Bullet');

    start() {
        this.preload();
    }

    private preload() {
        if (!this.bulletPrefab) return;
        for (let i = 0; i < this.preloadCount; i++) {
            const node = instantiate(this.bulletPrefab);
            this._bulletPool.put(node);
        }
    }

    public spawnBullet(): Node | null {
        let bullet: Node;
        if (this._bulletPool.size() > 0) {
            bullet = this._bulletPool.get()!;
        } else {
            if (!this.bulletPrefab) return null;
            bullet = instantiate(this.bulletPrefab);
        }
        this.node.addChild(bullet);
        return bullet;
    }

    public despawnBullet(bullet: Node) {
        bullet.removeFromParent();
        this._bulletPool.put(bullet);
    }

    onDestroy() {
        this._bulletPool.clear();
    }
}
```

### 节点回收时的清理

```typescript
@ccclass('PooledBullet')
export class PooledBullet extends Component {
    private _velocity: Vec3 = new Vec3();

    public init(direction: Vec3, speed: number) {
        Vec3.normalize(this._velocity, direction);
        Vec3.scale(this._velocity, this._velocity, speed);
        this.node.active = true;
    }

    update(dt: number) {
        const delta = new Vec3();
        Vec3.scale(delta, this._velocity, dt);
        this.node.translate(delta);
    }

    public recycle(pool: NodePool) {
        this.node.removeFromParent();
        this.node.active = true;
        pool.put(this.node);
    }

    unuse() {
    }

    reuse() {
    }
}
```

### 多类型对象池

```typescript
@ccclass('MultiPoolManager')
export class MultiPoolManager extends Component {
    private _pools: Map<string, NodePool> = new Map();

    public getPool(name: string): NodePool {
        if (!this._pools.has(name)) {
            this._pools.set(name, new NodePool(name));
        }
        return this._pools.get(name)!;
    }

    public spawn(name: string, prefab: Prefab): Node | null {
        const pool = this.getPool(name);
        if (pool.size() > 0) {
            const node = pool.get()!;
            this.node.addChild(node);
            return node;
        }
        const node = instantiate(prefab);
        this.node.addChild(node);
        return node;
    }

    public despawn(name: string, node: Node) {
        const pool = this.getPool(name);
        node.removeFromParent();
        pool.put(node);
    }

    public clearAll() {
        this._pools.forEach((pool) => pool.clear());
        this._pools.clear();
    }
}
```

### unuse / reuse 回调

节点被放入池中时调用 `unuse`，从池中取出时调用 `reuse`：

```typescript
@ccclass('PoolableObject')
export class PoolableObject extends Component {
    unuse() {
        this.node.active = false;
    }

    reuse(...args: unknown[]) {
        this.node.active = true;
    }
}
```

## 注意事项

- `put` 前必须先 `removeFromParent`，否则节点仍挂在场景中
- 节点池不会自动扩容，`get` 在池为空时返回 `null`
- `clear` 会销毁池中所有节点
- 建议在场景初始化时预创建一定数量的节点（预热）
- 节点放回池中后，其所有组件的状态需要手动重置
- `unuse`/`reuse` 是约定方法，需要组件自行实现
