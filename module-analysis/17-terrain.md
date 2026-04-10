# Terrain 地形系统模块分析

## 模块作用

Terrain 模块是 Cocos Creator 的地形系统,用于创建和管理大型户外地形。它支持高度图、分层纹理、植被系统等功能,适用于开放世界、赛车、策略等需要大面积地形的游戏类型。

### 主要功能领域

1. **地形生成** - 基于高度图生成地形
2. **纹理混合** - 多层纹理混合
3. **LOD 系统** - 远近细节层次
4. **植被系统** - 草地、树木等植被
5. **地形编辑** - 实时编辑地形

## 设计理念

### 1. 高度图系统

Terrain 模块使用高度图定义地形起伏。

**高度图概念:**
- 灰度图像表示高度
- 黑色为最低点,白色为最高点
- 支持实时编辑

**高度图实现:**
```typescript
class Terrain {
    heightMap: Float32Array;  // 高度数据
    size: number;              // 地形尺寸
    maxHeight: number;         // 最大高度
    
    // 获取高度
    getHeight(x: number, z: number): number {
        const index = z * this.size + x;
        return this.heightMap[index] * this.maxHeight;
    }
    
    // 设置高度
    setHeight(x: number, z: number, height: number): void {
        const index = z * this.size + x;
        this.heightMap[index] = height / this.maxHeight;
        this._dirty = true;
    }
}
```

### 2. 分层纹理系统

Terrain 模块支持多层纹理混合,实现丰富的地形效果。

**纹理层:**
- **Base Layer**: 基础层
- **Detail Layer**: 细节层
- **Splat Map**: 混合贴图

**纹理混合:**
```typescript
class TerrainLayer {
    diffuseTexture: Texture2D;    // 漫反射贴图
    normalTexture: Texture2D;     // 法线贴图
    tileSize: number;              // 平铺大小
    
    // 混合权重
    getBlendWeight(x: number, z: number): number {
        // 从 Splat Map 读取权重
        return this.splatMap.getPixel(x, z);
    }
}
```

### 3. LOD 系统

Terrain 模块实现 LOD(Level of Detail)系统,优化渲染性能。

**LOD 层级:**
```typescript
class TerrainLOD {
    levels: LODLevel[] = [
        { distance: 0, resolution: 256 },   // 近距离高精度
        { distance: 100, resolution: 128 }, // 中距离中精度
        { distance: 200, resolution: 64 },  // 远距离低精度
    ];
    
    // 根据距离选择 LOD
    selectLOD(distance: number): number {
        for (let i = 0; i < this.levels.length; ++i) {
            if (distance < this.levels[i].distance) {
                return i;
            }
        }
        return this.levels.length - 1;
    }
}
```

### 4. 植被系统

Terrain 模块支持在地形上种植植被。

**植被类型:**
- **Grass**: 草地
- **Trees**: 树木
- **Rocks**: 岩石

**植被分布:**
```typescript
class TerrainVegetation {
    density: number;          // 密度
    minDistance: number;      // 最小距离
    maxDistance: number;      // 最大距离
    
    // 生成植被
    generate(): void {
        for (let i = 0; i < this.density; ++i) {
            const x = Math.random() * terrain.size;
            const z = Math.random() * terrain.size;
            const y = terrain.getHeight(x, z);
            
            this.placeVegetation(x, y, z);
        }
    }
}
```

## 核心组件详解

### 1. Terrain 组件

**职责:**
- 管理地形数据
- 渲染地形
- 处理 LOD

**关键属性:**
- `size`: 地形尺寸
- `maxHeight`: 最大高度
- `layers`: 纹理层
- `lodBias`: LOD 偏移

### 2. TerrainLayer 地形层

**职责:**
- 定义纹理属性
- 管理混合权重

**关键属性:**
- `diffuseTexture`: 漫反射贴图
- `normalTexture`: 法线贴图
- `tileSize`: 平铺大小

### 3. TerrainBlock 地形块

**职责:**
- 管理地形的一个区块
- 处理 LOD 切换

**关键属性:**
- `x`, `z`: 区块坐标
- `lodLevel`: LOD 级别
- `mesh`: 网格数据

## 代码示例

### 创建地形

```typescript
import { Terrain, TerrainLayer } from 'cc';

// 创建地形组件
const terrain = node.addComponent(Terrain);
terrain.size = 256;
terrain.maxHeight = 100;

// 加载高度图
terrain.loadHeightMap('textures/heightmap.png');

// 添加纹理层
const baseLayer = new TerrainLayer();
baseLayer.diffuseTexture = grassTexture;
baseLayer.tileSize = 10;
terrain.addLayer(baseLayer);

const detailLayer = new TerrainLayer();
detailLayer.diffuseTexture = rockTexture;
detailLayer.tileSize = 20;
terrain.addLayer(detailLayer);

// 重建地形网格
terrain.rebuild();
```

### 编辑地形

```typescript
// 提升地形
function raiseTerrain(terrain: Terrain, x: number, z: number, radius: number, strength: number) {
    for (let i = -radius; i <= radius; ++i) {
        for (let j = -radius; j <= radius; ++j) {
            const distance = Math.sqrt(i * i + j * j);
            if (distance <= radius) {
                const currentHeight = terrain.getHeight(x + i, z + j);
                const falloff = 1 - (distance / radius);
                const newHeight = currentHeight + strength * falloff;
                terrain.setHeight(x + i, z + j, newHeight);
            }
        }
    }
    terrain.rebuild();
}

// 平滑地形
function smoothTerrain(terrain: Terrain, x: number, z: number, radius: number) {
    let totalHeight = 0;
    let count = 0;
    
    for (let i = -radius; i <= radius; ++i) {
        for (let j = -radius; j <= radius; ++j) {
            totalHeight += terrain.getHeight(x + i, z + j);
            count++;
        }
    }
    
    const avgHeight = totalHeight / count;
    terrain.setHeight(x, z, avgHeight);
    terrain.rebuild();
}
```

### 植被生成

```typescript
import { Terrain, Prefab, instantiate } from 'cc';

// 生成草地
function generateGrass(terrain: Terrain, grassPrefab: Prefab, density: number) {
    for (let i = 0; i < density; ++i) {
        const x = Math.random() * terrain.size;
        const z = Math.random() * terrain.size;
        const y = terrain.getHeight(x, z);
        
        const grass = instantiate(grassPrefab);
        grass.setPosition(x, y, z);
        terrain.node.addChild(grass);
    }
}

// 生成树木
function generateTrees(terrain: Terrain, treePrefab: Prefab, count: number) {
    for (let i = 0; i < count; ++i) {
        const x = Math.random() * terrain.size;
        const z = Math.random() * terrain.size;
        const y = terrain.getHeight(x, z);
        
        // 检查坡度
        const normal = terrain.getNormal(x, z);
        if (normal.y > 0.8) {  // 只在平坦处种树
            const tree = instantiate(treePrefab);
            tree.setPosition(x, y, z);
            terrain.node.addChild(tree);
        }
    }
}
```

## 模块关联

### 上游依赖

Terrain 模块依赖:
- **Core**: 数学库、对象管理
- **Scene Graph**: 节点系统、组件系统
- **3D**: 3D 渲染
- **Rendering**: 渲染管线
- **Asset**: 资源加载

### 下游依赖

Terrain 模块被以下模块使用:
- **Game**: 游戏地形

## 性能优化策略

### 1. LOD 系统
- 根据距离调整细节
- 减少远处顶点数

### 2. 分块渲染
- 只渲染可见区块
- 视锥剔除

### 3. 纹理流式加载
- 按需加载纹理
- 减少内存占用

### 4. 植被剔除
- 远距离剔除植被
- 减少绘制调用

## 总结

Terrain 模块是 Cocos Creator 地形系统的核心,其设计体现了:

1. **高度图系统**: 基于高度图的地形生成
2. **分层纹理**: 多层纹理混合
3. **LOD 系统**: 远近细节优化
4. **植被系统**: 丰富的植被支持
5. **实时编辑**: 动态地形编辑

理解 Terrain 模块的设计理念,对于创建大型户外场景至关重要。
