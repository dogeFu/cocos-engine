# TiledMap — TiledMap 地图

## 概述

`TiledMap` 组件用于渲染 Tiled Map Editor 创建的地图，支持正交和等距视角、多层地图、对象层等功能。

## 导入方式

```typescript
import { TiledMap, TiledTile, TiledLayer, Node } from 'cc';
```

## 基础用法

### 获取 TiledMap 组件

```typescript
const tiledMap = node.getComponent(TiledMap);
```

### 获取地图层

```typescript
const layer = tiledMap.getLayer('Ground');
const allLayers = tiledMap.getLayers();
```

### 获取地图属性

```typescript
const mapSize = tiledMap.getMapSize();
const tileSize = tiledMap.getTileSize();
const orientation = tiledMap.getOrientation();
```

## TiledMap 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `getLayer` | `(name) => TiledLayer \| null` | 获取地图层 |
| `getLayers` | `() => TiledLayer[]` | 获取所有层 |
| `getMapSize` | `() => Size` | 获取地图大小（格子数） |
| `getTileSize` | `() => Size` | 获取格子大小（像素） |
| `getOrientation` | `() => number` | 获取地图方向 |
| `getObjectGroup` | `(name) => TMXObjectGroup \| null` | 获取对象组 |

## TiledLayer 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `getTileAt` | `(x, y) => TiledTile \| null` | 获取格子 |
| `setTileAt` | `(x, y, tile) => void` | 设置格子 |
| `removeTileAt` | `(x, y) => void` | 移除格子 |
| `getLayerSize` | `() => Size` | 获取层大小 |
| `getNode` | `(x, y) => Node \| null` | 获取格子节点 |

## 进阶用法

### 动态修改地图格子

```typescript
const layer = tiledMap.getLayer('Ground');
if (layer) {
    const tile = layer.getTileAt(5, 3);
    if (tile) {
        tile.gid = 10;
    }
}
```

### 获取对象层数据

```typescript
const objectGroup = tiledMap.getObjectGroup('Collisions');
if (objectGroup) {
    const objects = objectGroup.getObjects();
    for (const obj of objects) {
        const x = obj.x;
        const y = obj.y;
        const width = obj.width;
        const height = obj.height;
        const type = obj.type;
    }
}
```

### 遍历地图层

```typescript
const layers = tiledMap.getLayers();
for (const layer of layers) {
    const layerName = layer.layerName;
    const layerSize = layer.getLayerSize();
}
```

## 注意事项

- TiledMap 资源需要在编辑器中正确导入（.tmx + .tsx + 图片）
- 地图方向支持正交（ORTHO）和等距（ISO）
- `getTileAt` 的坐标是格子坐标，不是像素坐标
- 修改格子后地图会自动重新渲染
- 对象层用于存储非格子数据（如碰撞区域、出生点等）
- 大型地图可能有性能问题，建议合理使用层和格子数
