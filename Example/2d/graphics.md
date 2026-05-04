# Graphics — 绘图组件

## 概述

`Graphics` 提供了 2D 矢量绘图 API，可以绘制线条、矩形、圆形、贝塞尔曲线等图形。适用于自定义 UI 形状、图表、涂鸦板等场景。

## 导入方式

```typescript
import { Graphics, Color, Node } from 'cc';
```

## 基础用法

### 绘制矩形

```typescript
const g = this.getComponent(Graphics);
g.clear();
g.fillColor = new Color(255, 0, 0, 255);
g.fillRect(0, 0, 200, 100);
g.strokeColor = new Color(0, 0, 0, 255);
g.lineWidth = 2;
g.strokeRect(0, 0, 200, 100);
```

### 绘制圆形

```typescript
g.fillColor = new Color(0, 128, 255, 255);
g.circle(100, 100, 50);
g.fill();
g.strokeColor = new Color(0, 0, 0, 255);
g.stroke();
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `fillColor` | `Color` | 填充颜色 |
| `strokeColor` | `Color` | 描边颜色 |
| `lineWidth` | `number` | 线条宽度 |
| `miterLimit` | `number` | 斜接限制 |

## 绘图方法

### 路径操作

| 方法 | 签名 | 说明 |
|------|------|------|
| `moveTo` | `(x, y) => void` | 移动画笔到指定点 |
| `lineTo` | `(x, y) => void` | 画线到指定点 |
| `bezierCurveTo` | `(c1x, c1y, c2x, c2y, x, y) => void` | 三次贝塞尔曲线 |
| `quadraticCurveTo` | `(cx, cy, x, y) => void` | 二次贝塞尔曲线 |
| `arc` | `(cx, cy, r, startAngle, endAngle, counterclockwise?) => void` | 圆弧 |
| `ellipse` | `(cx, cy, rx, ry) => void` | 椭圆 |
| `circle` | `(cx, cy, r) => void` | 圆形 |
| `rect` | `(x, y, w, h) => void` | 矩形路径 |
| `roundRect` | `(x, y, w, h, r) => void` | 圆角矩形路径 |
| `close` | `() => void` | 闭合路径 |

### 渲染操作

| 方法 | 签名 | 说明 |
|------|------|------|
| `fill` | `() => void` | 填充当前路径 |
| `stroke` | `() => void` | 描边当前路径 |
| `fillRect` | `(x, y, w, h) => void` | 填充矩形 |
| `strokeRect` | `(x, y, w, h) => void` | 描边矩形 |
| `clear` | `() => void` | 清除所有绘制内容 |

## 进阶用法

### 绘制折线图

```typescript
@ccclass('LineChart')
export class LineChart extends Component {
    @property({ type: [Number] })
    public data: number[] = [];

    start() {
        this.drawChart();
    }

    private drawChart() {
        const g = this.getComponent(Graphics);
        if (!g || this.data.length < 2) return;

        g.clear();
        g.strokeColor = new Color(0, 200, 0, 255);
        g.lineWidth = 2;

        const width = 400;
        const height = 200;
        const maxVal = Math.max(...this.data);
        const stepX = width / (this.data.length - 1);

        g.moveTo(0, (this.data[0] / maxVal) * height);
        for (let i = 1; i < this.data.length; i++) {
            g.lineTo(i * stepX, (this.data[i] / maxVal) * height);
        }
        g.stroke();
    }
}
```

### 绘制圆角矩形

```typescript
g.fillColor = new Color(100, 100, 100, 255);
g.roundRect(0, 0, 200, 80, 10);
g.fill();
```

### 绘制自定义路径

```typescript
g.strokeColor = new Color(255, 0, 0, 255);
g.lineWidth = 3;
g.moveTo(50, 50);
g.bezierCurveTo(100, 150, 200, 0, 250, 100);
g.stroke();
```

### 绘制饼图

```typescript
@ccclass('PieChart')
export class PieChart extends Component {
    drawPie(data: { value: number; color: Color }[]) {
        const g = this.getComponent(Graphics);
        if (!g) return;

        g.clear();
        const total = data.reduce((sum, d) => sum + d.value, 0);
        let startAngle = 0;

        for (const item of data) {
            const sweepAngle = (item.value / total) * Math.PI * 2;
            g.fillColor = item.color;
            g.moveTo(0, 0);
            g.arc(0, 0, 100, startAngle, startAngle + sweepAngle, false);
            g.close();
            g.fill();
            startAngle += sweepAngle;
        }
    }
}
```

## 注意事项

- Graphics 的坐标系以节点锚点为原点
- `fill` 和 `stroke` 会渲染当前路径，渲染后路径不会自动清除
- 调用 `clear` 会清除所有绘制内容并重置路径
- `moveTo` 开始新路径，`lineTo` 等方法在当前路径上添加线段
- Graphics 每帧重绘，适合动态图形；静态图形建议使用 Sprite 以提升性能
- 复杂图形会增加 Draw Call，注意性能影响
