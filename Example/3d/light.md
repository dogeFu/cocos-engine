# Light — 灯光系统

## 概述

Cocos Creator 提供了多种灯光类型：`DirectionalLight`（平行光）、`PointLight`（点光源）、`SpotLight`（聚光灯）、`SphereLight`（球形光）。灯光是 3D 场景渲染的核心要素。

## 导入方式

```typescript
import { DirectionalLight, PointLight, SpotLight, SphereLight, Light, Color, Node } from 'cc';
```

## DirectionalLight — 平行光

平行光模拟无限远处的光源（如太阳），光线方向一致，没有衰减。

```typescript
const lightNode = new Node('DirLight');
const light = lightNode.addComponent(DirectionalLight);
light.color = new Color(255, 255, 255, 255);
light.illuminance = 65000;
light.useColorTemperature = true;
light.colorTemperature = 6550;
```

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `illuminance` | `number` | 照度（lux） |
| `shadowEnabled` | `boolean` | 启用阴影 |
| `shadowPcf` | `PCFType` | PCF 阴影类型 |
| `shadowBias` | `number` | 阴影偏移 |
| `shadowNormalBias` | `number` | 阴影法线偏移 |
| `shadowSaturation` | `number` | 阴影饱和度（0-1） |
| `shadowDistance` | `number` | 阴影距离 |
| `shadowFixedArea` | `boolean` | 固定阴影区域 |
| `enableCSM` | `boolean` | 启用级联阴影 |

## PointLight — 点光源

点光源从一个点向四周发射光线，有距离衰减。

```typescript
const lightNode = new Node('PointLight');
const light = lightNode.addComponent(PointLight);
light.color = new Color(255, 200, 150, 255);
light.luminousFlux = 1700;
light.range = 50;
```

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `luminousFlux` | `number` | 光通量（流明） |
| `luminance` | `number` | 亮度（坎德拉/平方米） |
| `term` | `PhotometricTerm` | 光度学单位 |
| `range` | `number` | 光照范围 |

## SpotLight — 聚光灯

聚光灯从一点沿锥形方向发射光线，有角度和距离衰减。

```typescript
const lightNode = new Node('SpotLight');
const light = lightNode.addComponent(SpotLight);
light.color = new Color(255, 255, 200, 255);
light.luminousFlux = 4000;
light.range = 30;
light.spotAngle = 60;
light.angleAttenuationStrength = 1;
```

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `luminousFlux` | `number` | 光通量 |
| `range` | `number` | 光照范围 |
| `spotAngle` | `number` | 聚光角度（2-180度） |
| `angleAttenuationStrength` | `number` | 角度衰减强度（0-1） |
| `shadowEnabled` | `boolean` | 启用阴影 |
| `shadowPcf` | `PCFType` | PCF 阴影类型 |

## SphereLight — 球形光

球形光是有体积的点光源，光照更加柔和。

```typescript
const lightNode = new Node('SphereLight');
const light = lightNode.addComponent(SphereLight);
light.color = new Color(255, 255, 255, 255);
light.luminousFlux = 1700;
light.size = 1;
light.range = 50;
```

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `luminousFlux` | `number` | 光通量 |
| `size` | `number` | 光源大小 |
| `range` | `number` | 光照范围 |

## Light 基类公共属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `color` | `Color` | 灯光颜色 |
| `useColorTemperature` | `boolean` | 使用色温 |
| `colorTemperature` | `number` | 色温（1000-15000K） |
| `type` | `LightType` | 灯光类型（只读） |
| `baked` | `boolean` | 是否烘焙 |
| `visibility` | `number` | 可见性 |

## 进阶用法

### 日夜循环

```typescript
@ccclass('DayNightCycle')
export class DayNightCycle extends Component {
    @property({ type: DirectionalLight })
    public sunLight: DirectionalLight | null = null;

    @property({ type: Number })
    public cycleDuration: number = 60;

    update(dt: number) {
        if (!this.sunLight) return;
        const t = (game.totalTime % this.cycleDuration) / this.cycleDuration;
        const angle = t * Math.PI * 2;
        this.node.setRotationFromEuler(angle * (180 / Math.PI), 0, 0);

        const intensity = Math.max(0, Math.cos(angle));
        this.sunLight.illuminance = intensity * 65000;
        this.sunLight.color = new Color(
            255,
            Math.round(200 + intensity * 55),
            Math.round(150 + intensity * 105),
            255
        );
    }
}
```

### 闪光灯效果

```typescript
@ccclass('FlashEffect')
export class FlashEffect extends Component {
    private _light: PointLight | null = null;

    start() {
        this._light = this.getComponent(PointLight);
    }

    public flash(duration: number = 0.1) {
        if (!this._light) return;
        this._light.luminousFlux = 50000;
        tween(this._light)
            .to(duration, { luminousFlux: 0 })
            .start();
    }
}
```

## 注意事项

- 平行光通常用于主光源（太阳/月亮），场景中建议只有一个平行光
- 点光源和聚光灯数量越多，性能开销越大
- `range` 值越大，光照计算范围越大，注意性能影响
- 阴影是昂贵的渲染特性，仅在需要时启用
- `useColorTemperature` 可以模拟更真实的光照色温
- 平行光的方向由节点的旋转决定
