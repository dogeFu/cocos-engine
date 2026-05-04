# Game — 游戏主循环

## 概述

`game` 是引擎的入口单例，负责初始化引擎、驱动主循环、管理游戏配置。通常不需要直接操作 `game`，但了解其 API 有助于控制游戏启动流程和帧率。

## 导入方式

```typescript
import { game } from 'cc';
```

## 基础用法

### 游戏事件

```typescript
game.on(game.EVENT_HIDE, () => {
});

game.on(game.EVENT_SHOW, () => {
});

game.on(game.EVENT_RESTART, () => {
});
```

### 帧率设置

```typescript
game.frameRate = 60;
const fps = game.frameRate;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `frameRate` | `number` | 目标帧率 |
| `time` | `number` | 游戏运行总时间（秒） |
| `stepTime` | `number` | 上一帧耗时（秒） |
| `isPaused` | `boolean` | 游戏是否暂停（只读） |
| `isPlaying` | `boolean` | 游戏是否运行中（只读） |
| `config` | `GameConfig` | 游戏配置 |

## 核心方法

| 方法 | 说明 |
|------|------|
| `init(config?)` | 初始化游戏 |
| `run()` | 运行游戏主循环 |
| `pause()` | 暂停游戏 |
| `resume()` | 恢复游戏 |
| `restart()` | 重启游戏 |
| `close()` | 关闭游戏 |
| `on(type, callback, target?)` | 注册事件 |
| `off(type, callback?, target?)` | 取消事件 |

## 事件常量

| 事件 | 说明 |
|------|------|
| `game.EVENT_HIDE` | 游戏进入后台 |
| `game.EVENT_SHOW` | 游戏回到前台 |
| `game.EVENT_RESTART` | 游戏重启 |
| `game.EVENT_GAME_INITED` | 游戏初始化完成 |

## 进阶用法

### 处理应用前后台切换

```typescript
game.on(game.EVENT_HIDE, () => {
    director.pause();
});

game.on(game.EVENT_SHOW, () => {
    director.resume();
});
```

### 游戏初始化回调

```typescript
game.on(game.EVENT_GAME_INITED, () => {
});
```

### 适配不同帧率

```typescript
game.frameRate = 30;
```

## 注意事项

- `game` 是引擎自动创建和管理的单例，不要手动实例化
- `game.pause()` 与 `director.pause()` 效果不同：`game.pause()` 停止整个主循环
- 在小游戏平台，`EVENT_HIDE`/`EVENT_SHOW` 对应小程序的 `onHide`/`onShow`
- 修改 `frameRate` 在不同平台表现可能不同
