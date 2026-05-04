# Slider — 滑动条

## 概述

`Slider` 是滑动条组件，用于在一定范围内选择数值。常用于音量调节、亮度调节、进度控制等场景。

## 导入方式

```typescript
import { Slider, Node } from 'cc';
```

## 基础用法

### 创建滑动条

```typescript
const sliderNode = new Node('Slider');
const slider = sliderNode.addComponent(Slider);
slider.progress = 0.5;
slider.direction = Slider.Direction.HORIZONTAL;
```

### 监听滑动事件

```typescript
slider.node.on('slide', (slider: Slider) => {
    const value = slider.progress;
}, this);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `progress` | `number` | 当前进度（0-1） |
| `direction` | `Slider.Direction` | 滑动方向 |
| `handle` | `Node \| null` | 滑块手柄节点 |
| `slideEvents` | `EventHandler[]` | 滑动事件处理器 |

## Direction 枚举

| 值 | 说明 |
|-----|------|
| `HORIZONTAL` | 水平方向 |
| `VERTICAL` | 垂直方向 |

## 进阶用法

### 音量控制

```typescript
@ccclass('VolumeControl')
export class VolumeControl extends Component {
    @property({ type: Slider })
    public slider: Slider | null = null;

    @property({ type: Label })
    public valueLabel: Label | null = null;

    @property({ type: AudioSource })
    public audioSource: AudioSource | null = null;

    start() {
        this.slider?.node.on('slide', this.onSlide, this);
    }

    private onSlide(slider: Slider) {
        const volume = slider.progress;
        if (this.audioSource) {
            this.audioSource.volume = volume;
        }
        if (this.valueLabel) {
            this.valueLabel.string = `${Math.round(volume * 100)}%`;
        }
    }
}
```

### 自定义范围映射

```typescript
@ccclass('RangeSlider')
export class RangeSlider extends Component {
    @property({ type: Slider })
    public slider: Slider | null = null;

    public minValue: number = 10;
    public maxValue: number = 100;

    start() {
        this.slider?.node.on('slide', this.onSlide, this);
    }

    private onSlide(slider: Slider) {
        const value = this.minValue + slider.progress * (this.maxValue - this.minValue);
    }

    public setValue(value: number) {
        if (!this.slider) return;
        const progress = (value - this.minValue) / (this.maxValue - this.minValue);
        this.slider.progress = Math.clamp(progress, 0, 1);
    }
}
```

## 注意事项

- `progress` 值范围为 0-1，超出范围会被自动裁剪
- `handle` 节点是滑块的可拖拽部分，必须有 `UITransform` 组件
- 滑动条的背景和填充效果需要通过 `Sprite` 组件自行实现
- `slide` 事件在拖拽过程中持续触发
