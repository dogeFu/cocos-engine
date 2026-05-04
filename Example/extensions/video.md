# VideoPlayer — 视频播放

## 概述

`VideoPlayer` 组件用于播放视频资源，支持本地视频和远程 URL 视频。

## 导入方式

```typescript
import { VideoPlayer, Node } from 'cc';
```

## 基础用法

### 播放视频

```typescript
const videoPlayer = node.addComponent(VideoPlayer);
videoPlayer.clip = videoClip;
videoPlayer.play();
```

### 播放远程视频

```typescript
videoPlayer.remoteURL = 'http://example.com/video.mp4';
videoPlayer.play();
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `clip` | `VideoClip \| null` | 视频剪辑 |
| `remoteURL` | `string` | 远程视频 URL |
| `playOnAwake` | `boolean` | 启用时自动播放 |
| `currentTime` | `number` | 当前播放时间 |
| `duration` | `number` | 视频总时长（只读） |
| `volume` | `number` | 音量（0-1） |
| `mute` | `boolean` | 静音 |
| `loop` | `boolean` | 循环播放 |
| `keepAspectRatio` | `boolean` | 保持宽高比 |
| `fullScreenOnAwake` | `boolean` | 启用时全屏 |
| `isPlaying` | `boolean` | 是否播放中（只读） |

## 核心方法

| 方法 | 说明 |
|------|------|
| `play()` | 播放 |
| `pause()` | 暂停 |
| `stop()` | 停止 |
| `seekTo(time)` | 跳转到指定时间 |

## 事件类型

| 事件 | 说明 |
|------|------|
| `READY_TO_PLAY` | 准备好播放 |
| `PLAYING` | 开始播放 |
| `PAUSED` | 暂停 |
| `STOPPED` | 停止 |
| `COMPLETED` | 播放完成 |
| `META_LOADED` | 元数据加载完成 |
| `CLICKED` | 点击 |
| `ERROR` | 错误 |

## 进阶用法

### 监听视频事件

```typescript
videoPlayer.on(VideoPlayer.EventType.READY_TO_PLAY, () => {
}, this);

videoPlayer.on(VideoPlayer.EventType.COMPLETED, () => {
}, this);

videoPlayer.on(VideoPlayer.EventType.ERROR, () => {
}, this);
```

### 控制播放进度

```typescript
videoPlayer.seekTo(10);
const currentTime = videoPlayer.currentTime;
const totalDuration = videoPlayer.duration;
```

## 注意事项

- 视频播放功能在不同平台上的表现可能不同
- Web 平台视频受浏览器自动播放策略限制
- `remoteURL` 和 `clip` 同时设置时，`clip` 优先
- `keepAspectRatio` 为 `true` 时视频保持原始宽高比
- 原生平台视频渲染层级可能与 UI 不同
- 移动端全屏播放时可能隐藏其他 UI 元素
