# ScrollView — 滚动视图

## 概述

`ScrollView` 提供可滚动的内容区域，常用于列表、长文本、图片浏览等超出显示范围的 UI 场景。支持水平和垂直滚动、惯性、弹性回弹等效果。

## 导入方式

```typescript
import { ScrollView, Node, UITransform, Size, Layout } from 'cc';
```

## 基础用法

### 创建滚动视图

```typescript
const viewNode = new Node('ScrollView');
const scrollView = viewNode.addComponent(ScrollView);

const content = new Node('Content');
const contentTransform = content.addComponent(UITransform);
contentTransform.contentSize = new Size(400, 1000);
const layout = content.addComponent(Layout);
layout.type = Layout.Type.VERTICAL;
layout.spacingY = 10;

scrollView.content = content;
viewNode.addChild(content);
```

### 滚动到指定位置

```typescript
scrollView.scrollTo(new Vec2(0, 0.5), 0.3);
scrollView.scrollToBottom(0.3);
scrollView.scrollToTop(0.3);
scrollView.scrollToLeft(0.3);
scrollView.scrollToRight(0.3);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `content` | `Node \| null` | 滚动内容节点 |
| `horizontal` | `boolean` | 是否允许水平滚动 |
| `vertical` | `boolean` | 是否允许垂直滚动 |
| `inertia` | `boolean` | 是否启用惯性 |
| `brake` | `number` | 制动系数（0-1），0 为无限惯性 |
| `elastic` | `boolean` | 是否启用弹性回弹 |
| `bounceDuration` | `number` | 回弹持续时间（秒） |
| `cancelInnerEvents` | `boolean` | 是否取消内部触摸事件 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `scrollTo` | `(offset, time?, attenuate?) => void` | 滚动到指定偏移 |
| `scrollToBottom` | `(time?, attenuate?) => void` | 滚动到底部 |
| `scrollToTop` | `(time?, attenuate?) => void` | 滚动到顶部 |
| `scrollToLeft` | `(time?, attenuate?) => void` | 滚动到左边 |
| `scrollToRight` | `(time?, attenuate?) => void` | 滚动到右边 |
| `stopAutoScroll` | `() => void` | 停止自动滚动 |
| `getScrollOffset` | `() => Vec2` | 获取当前滚动偏移 |
| `getMaxScrollOffset` | `() => Vec2` | 获取最大滚动偏移 |
| `isScrolling` | `() => boolean` | 是否正在滚动 |
| `isAutoScrolling` | `() => boolean` | 是否正在自动滚动 |

## 事件

| 事件 | 说明 |
|------|------|
| `scroll-to-top` | 滚动到顶部 |
| `scroll-to-bottom` | 滚动到底部 |
| `scroll-to-left` | 滚动到左边 |
| `scroll-to-right` | 滚动到右边 |
| `scrolling` | 滚动中 |
| `bounce-top` | 顶部回弹 |
| `bounce-bottom` | 底部回弹 |
| `bounce-left` | 左边回弹 |
| `bounce-right` | 右边回弹 |

## 进阶用法

### 监听滚动事件

```typescript
scrollView.node.on('scroll-to-bottom', () => {
    this.loadMoreItems();
}, this);

scrollView.node.on('scrolling', () => {
    const offset = scrollView.getScrollOffset();
    const maxOffset = scrollView.getMaxScrollOffset();
    const progress = offset.y / maxOffset.y;
}, this);
```

### 无限滚动列表

```typescript
@ccclass('InfiniteList')
export class InfiniteList extends Component {
    @property({ type: ScrollView })
    public scrollView: ScrollView | null = null;

    @property({ type: Prefab })
    public itemPrefab: Prefab | null = null;

    private _data: string[] = [];
    private _pageSize: number = 20;
    private _currentPage: number = 0;

    start() {
        this.loadPage(0);
        this.scrollView?.node.on('scroll-to-bottom', this.loadNextPage, this);
    }

    private loadPage(page: number) {
        const newData = this.fetchData(page, this._pageSize);
        this._data.push(...newData);
        this.renderItems();
        this._currentPage = page;
    }

    private loadNextPage() {
        this.loadPage(this._currentPage + 1);
    }

    private renderItems() {
        if (!this.scrollView || !this.itemPrefab) return;
        const content = this.scrollView.content;
        if (!content) return;

        for (const item of this._data) {
            const node = instantiate(this.itemPrefab);
            const label = node.getComponentInChildren(Label);
            if (label) label.string = item;
            content.addChild(node);
        }
    }

    private fetchData(page: number, size: number): string[] {
        return Array.from({ length: size }, (_, i) => `Item ${page * size + i}`);
    }
}
```

## 注意事项

- `content` 节点必须有 `UITransform` 组件，且 `contentSize` 需大于 ScrollView 的视口大小才能滚动
- 水平滚动时 `content` 宽度需大于视口宽度，垂直滚动时高度需大于视口高度
- `elastic` 为 `true` 时，滚动超出边界会自动回弹
- `brake` 值越大，惯性衰减越快
- 动态修改 `content` 子节点后，需要确保 `contentSize` 正确更新
