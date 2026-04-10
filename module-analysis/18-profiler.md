# Profiler 性能分析模块分析

## 模块作用

Profiler 模块是 Cocos Creator 的性能分析工具,用于监控和分析游戏运行时的性能数据。它提供 FPS、内存、Draw Call、渲染时间等关键性能指标的实时显示,帮助开发者发现和解决性能问题。

### 主要功能领域

1. **FPS 监控** - 实时帧率显示
2. **内存监控** - 内存使用情况
3. **渲染统计** - Draw Call、三角形数等
4. **性能分析** - 各模块耗时分析
5. **调试信息** - 详细的调试数据

## 设计理念

### 1. 性能数据采集

Profiler 模块通过多种方式采集性能数据。

**数据采集方式:**
- **帧时间**: 记录每帧耗时
- **内存快照**: 定期采样内存
- **渲染统计**: 统计渲染数据
- **自定义采样**: 支持自定义性能点

**数据采集实现:**
```typescript
class Profiler {
    private _frameTime: number = 0;
    private _fps: number = 0;
    private _frameCount: number = 0;
    private _lastTime: number = 0;
    
    update(dt: number): void {
        this._frameTime = dt;
        this._frameCount++;
        
        const now = performance.now();
        if (now - this._lastTime >= 1000) {
            this._fps = this._frameCount;
            this._frameCount = 0;
            this._lastTime = now;
        }
    }
    
    getFPS(): number {
        return this._fps;
    }
    
    getFrameTime(): number {
        return this._frameTime;
    }
}
```

### 2. 性能数据显示

Profiler 模块提供多种方式显示性能数据。

**显示方式:**
- **屏幕显示**: 在游戏画面上显示
- **控制台输出**: 输出到控制台
- **文件导出**: 导出性能报告

**屏幕显示实现:**
```typescript
class ProfilerDisplay {
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    
    draw(): void {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        
        // 绘制 FPS
        this._ctx.fillStyle = 'white';
        this._ctx.font = '14px Arial';
        this._ctx.fillText(`FPS: ${profiler.getFPS()}`, 10, 20);
        
        // 绘制内存
        this._ctx.fillText(`Memory: ${profiler.getMemory()} MB`, 10, 40);
        
        // 绘制 Draw Call
        this._ctx.fillText(`Draw Calls: ${profiler.getDrawCalls()}`, 10, 60);
    }
}
```

### 3. 性能分析工具

Profiler 模块提供多种性能分析工具。

**分析工具:**
- **时间线**: 时间轴视图
- **火焰图**: 函数调用栈
- **内存快照**: 内存分配情况
- **渲染分析**: 渲染管线分析

**时间线实现:**
```typescript
class PerformanceTimeline {
    private _entries: PerformanceEntry[] = [];
    
    startMeasure(name: string): void {
        performance.mark(`${name}-start`);
    }
    
    endMeasure(name: string): void {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const entries = performance.getEntriesByName(name);
        this._entries.push(entries[entries.length - 1]);
    }
    
    getAverageTime(name: string): number {
        const entries = this._entries.filter(e => e.name === name);
        const total = entries.reduce((sum, e) => sum + e.duration, 0);
        return total / entries.length;
    }
}
```

### 4. 内存监控

Profiler 模块实现内存使用监控。

**内存监控:**
```typescript
class MemoryProfiler {
    getMemoryUsage(): MemoryInfo {
        if (performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            };
        }
        return null;
    }
    
    getMemoryMB(): number {
        const memory = this.getMemoryUsage();
        return memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;
    }
}
```

### 5. 渲染统计

Profiler 模块统计渲染相关数据。

**渲染统计:**
```typescript
class RenderProfiler {
    private _drawCalls: number = 0;
    private _triangles: number = 0;
    private _vertices: number = 0;
    
    addDrawCall(triangles: number, vertices: number): void {
        this._drawCalls++;
        this._triangles += triangles;
        this._vertices += vertices;
    }
    
    reset(): void {
        this._drawCalls = 0;
        this._triangles = 0;
        this._vertices = 0;
    }
    
    getStats(): RenderStats {
        return {
            drawCalls: this._drawCalls,
            triangles: this._triangles,
            vertices: this._vertices,
        };
    }
}
```

## 核心组件详解

### 1. Profiler 性能分析器

**职责:**
- 采集性能数据
- 管理性能统计
- 提供查询接口

**关键属性:**
- `fps`: 帧率
- `frameTime`: 帧时间
- `memory`: 内存使用

### 2. PerformanceCounter 性能计数器

**职责:**
- 统计特定性能指标
- 计算平均值、最大值、最小值

**关键属性:**
- `name`: 计数器名称
- `value`: 当前值
- `average`: 平均值

### 3. ProfilerDisplay 性能显示

**职责:**
- 渲染性能数据
- 提供可视化界面

**关键方法:**
- `draw()`: 绘制性能数据
- `toggle()`: 切换显示

## 代码示例

### 基本性能监控

```typescript
import { profiler } from 'cc';

// 启用性能分析
profiler.showStats = true;

// 获取 FPS
const fps = profiler.getFPS();
console.log('FPS:', fps);

// 获取帧时间
const frameTime = profiler.getFrameTime();
console.log('Frame Time:', frameTime, 'ms');

// 获取内存
const memory = profiler.getMemory();
console.log('Memory:', memory, 'MB');
```

### 自定义性能计数器

```typescript
import { profiler } from 'cc';

// 创建性能计数器
const counter = profiler.createCounter('CustomOperation');

// 开始计时
counter.start();

// 执行操作
doSomething();

// 结束计时
counter.end();

// 获取平均时间
const avgTime = counter.getAverageTime();
console.log('Average Time:', avgTime, 'ms');
```

### 渲染统计

```typescript
import { profiler } from 'cc';

// 获取渲染统计
const stats = profiler.getRenderStats();
console.log('Draw Calls:', stats.drawCalls);
console.log('Triangles:', stats.triangles);
console.log('Vertices:', stats.vertices);

// 获取各阶段耗时
const renderTime = profiler.getRenderTime();
const updateTime = profiler.getUpdateTime();
const physicsTime = profiler.getPhysicsTime();

console.log('Render Time:', renderTime, 'ms');
console.log('Update Time:', updateTime, 'ms');
console.log('Physics Time:', physicsTime, 'ms');
```

### 性能分析报告

```typescript
import { profiler } from 'cc';

// 生成性能报告
function generatePerformanceReport(): string {
    const report = {
        fps: profiler.getFPS(),
        frameTime: profiler.getFrameTime(),
        memory: profiler.getMemory(),
        renderStats: profiler.getRenderStats(),
        timing: {
            update: profiler.getUpdateTime(),
            render: profiler.getRenderTime(),
            physics: profiler.getPhysicsTime(),
        },
    };
    
    return JSON.stringify(report, null, 2);
}

// 导出性能报告
function exportPerformanceReport(): void {
    const report = generatePerformanceReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'performance-report.json';
    a.click();
    
    URL.revokeObjectURL(url);
}
```

## 模块关联

### 上游依赖

Profiler 模块依赖:
- **Core**: 对象管理
- **Game**: 游戏循环
- **Rendering**: 渲染统计

### 下游依赖

Profiler 模块被以下模块使用:
- **Game**: 性能监控
- **Editor**: 编辑器性能分析

## 性能优化策略

### 1. 采样优化
- 降低采样频率
- 按需采集数据

### 2. 显示优化
- 缓存渲染数据
- 减少绘制调用

### 3. 内存优化
- 限制历史数据
- 定期清理缓存

## 总结

Profiler 模块是 Cocos Creator 性能分析的核心工具,其设计体现了:

1. **数据采集**: 多种性能数据采集方式
2. **实时显示**: 实时性能监控
3. **分析工具**: 丰富的性能分析工具
4. **内存监控**: 完整的内存使用统计
5. **渲染统计**: 详细的渲染数据分析

理解 Profiler 模块的设计理念,对于优化游戏性能、发现性能瓶颈至关重要。
