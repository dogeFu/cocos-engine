# AudioSource — 音频源

## 概述

`AudioSource` 是音频播放组件，支持播放、暂停、停止、循环、音量控制等。可以播放 `AudioClip` 资源或一次性播放音效。

## 导入方式

```typescript
import { AudioSource, AudioClip, Node } from 'cc';
```

## 基础用法

### 播放音频

```typescript
const audioSource = node.addComponent(AudioSource);
audioSource.clip = audioClip;
audioSource.volume = 0.5;
audioSource.loop = true;
audioSource.play();
```

### 一次性播放音效

```typescript
audioSource.playOneShot(clip, 1.0);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `clip` | `AudioClip \| null` | 音频剪辑 |
| `loop` | `boolean` | 循环播放 |
| `playOnAwake` | `boolean` | 启用时自动播放 |
| `volume` | `number` | 音量（0-1） |
| `currentTime` | `number` | 当前播放时间（秒） |
| `duration` | `number` | 总时长（只读） |
| `state` | `AudioState` | 当前状态（只读） |
| `playing` | `boolean` | 是否正在播放（只读） |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `play` | `() => void` | 播放/恢复 |
| `pause` | `() => void` | 暂停 |
| `stop` | `() => void` | 停止 |
| `playOneShot` | `(clip, volumeScale?) => void` | 一次性播放 |

## AudioState 枚举

| 值 | 说明 |
|-----|------|
| `INIT` | 初始状态 |
| `PLAYING` | 播放中 |
| `PAUSED` | 已暂停 |
| `STOPPED` | 已停止 |

## 进阶用法

### 音频管理器

```typescript
@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager | null = null;
    private _musicSource: AudioSource | null = null;
    private _sfxSource: AudioSource | null = null;

    public static get instance(): AudioManager {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }

    start() {
        this._musicSource = this.node.addComponent(AudioSource);
        this._musicSource.loop = true;

        this._sfxSource = this.node.addComponent(AudioSource);
        this._sfxSource.loop = false;
    }

    public playMusic(clip: AudioClip) {
        if (this._musicSource) {
            this._musicSource.clip = clip;
            this._musicSource.play();
        }
    }

    public playSFX(clip: AudioClip, volume: number = 1.0) {
        this._sfxSource?.playOneShot(clip, volume);
    }

    public setMusicVolume(volume: number) {
        if (this._musicSource) {
            this._musicSource.volume = volume;
        }
    }

    public stopMusic() {
        this._musicSource?.stop();
    }

    public pauseMusic() {
        this._musicSource?.pause();
    }

    public resumeMusic() {
        this._musicSource?.play();
    }
}
```

### 淡入淡出

```typescript
@ccclass('AudioFader')
export class AudioFader extends Component {
    private _source: AudioSource | null = null;

    start() {
        this._source = this.getComponent(AudioSource);
    }

    public fadeIn(duration: number = 1) {
        if (!this._source) return;
        this._source.volume = 0;
        this._source.play();
        tween(this._source)
            .to(duration, { volume: 1 })
            .start();
    }

    public fadeOut(duration: number = 1) {
        if (!this._source) return;
        tween(this._source)
            .to(duration, { volume: 0 })
            .call(() => this._source?.stop())
            .start();
    }
}
```

### 动态加载音频

```typescript
const bundle = assetManager.getBundle('resources');
bundle!.load<AudioClip>('audio/bgm', AudioClip, (err, clip) => {
    if (err) return;
    audioSource.clip = clip;
    audioSource.play();
});
```

## 注意事项

- `playOneShot` 适合短音效，不会打断当前播放的音频
- `play`/`pause`/`stop` 操作的是 `clip` 属性指定的音频
- `playOneShot` 无法暂停或停止，播放完毕自动结束
- `volume` 范围为 0-1
- Web 平台音频播放需要用户交互后才能开始（浏览器策略）
- `currentTime` 设置播放位置在某些平台上可能有延迟
