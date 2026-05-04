# PageView — 翻页视图

## 概述

`PageView` 是翻页视图组件，继承自 `ScrollView`，支持按页滚动。常用于引导页、图片轮播、卡片浏览等场景。

## 导入方式

```typescript
import { PageView, Node, UITransform, Size } from 'cc';
```

## 基础用法

### 创建翻页视图

```typescript
const pageViewNode = new Node('PageView');
const pageView = pageViewNode.addComponent(PageView);
pageView.direction = PageView.Direction.HORIZONTAL;

const content = new Node('Content');
const contentTransform = content.addComponent(UITransform);
pageView.content = content;
pageViewNode.addChild(content);
```

### 添加页面

```typescript
const page1 = new Node('Page1');
page1.addComponent(UITransform).contentSize = new Size(800, 600);
content.addChild(page1);

const page2 = new Node('Page2');
page2.addComponent(UITransform).contentSize = new Size(800, 600);
content.addChild(page2);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `currentPageIndex` | `number` | 当前页索引 |
| `sizeMode` | `PageView.SizeMode` | 页面大小模式 |
| `direction` | `PageView.Direction` | 翻页方向 |
| `scrollThreshold` | `number` | 翻页触发阈值（0-1） |
| `pageTurningSpeed` | `number` | 翻页速度 |
| `indicator` | `PageViewIndicator \| null` | 页面指示器 |

## 核心方法

| 方法 | 说明 |
|------|------|
| `setCurrentPageIndex(index)` | 设置当前页 |
| `scrollToPage(index, time?)` | 滚动到指定页 |
| `getPages()` | 获取所有页面节点 |
| `addPage(page)` | 添加页面 |
| `insertPage(page, index)` | 插入页面 |
| `removePage(page)` | 移除页面 |
| `removePageAtIndex(index)` | 按索引移除页面 |

## Direction 枚举

| 值 | 说明 |
|-----|------|
| `HORIZONTAL` | 水平翻页 |
| `VERTICAL` | 垂直翻页 |

## SizeMode 枚举

| 值 | 说明 |
|-----|------|
| `UNIFIED` | 统一大小（与 PageView 相同） |
| `FREE` | 自由大小 |

## 事件类型

| 事件 | 说明 |
|------|------|
| `PAGE_TURNING` | 翻页时触发 |

## 进阶用法

### 监听翻页事件

```typescript
pageView.node.on(PageView.EventType.PAGE_TURNING, (pageView: PageView) => {
    const index = pageView.currentPageIndex;
}, this);
```

### 自动轮播

```typescript
@ccclass('AutoCarousel')
export class AutoCarousel extends Component {
    @property({ type: PageView })
    public pageView: PageView | null = null;

    @property({ type: Number })
    public interval: number = 3;

    private _timer: number = 0;

    update(dt: number) {
        if (!this.pageView) return;
        this._timer += dt;
        if (this._timer >= this.interval) {
            this._timer = 0;
            const pages = this.pageView.getPages();
            const nextIndex = (this.pageView.currentPageIndex + 1) % pages.length;
            this.pageView.scrollToPage(nextIndex, 0.5);
        }
    }
}
```

### 动态添加页面

```typescript
@ccclass('DynamicPages')
export class DynamicPages extends Component {
    @property({ type: PageView })
    public pageView: PageView | null = null;

    @property({ type: Prefab })
    public pagePrefab: Prefab | null = null;

    public addNewPage(data: string) {
        if (!this.pageView || !this.pagePrefab) return;
        const page = instantiate(this.pagePrefab);
        const label = page.getComponentInChildren(Label);
        if (label) label.string = data;
        this.pageView.addPage(page);
    }
}
```

## 注意事项

- PageView 继承自 ScrollView，拥有 ScrollView 的所有属性和方法
- 每个页面节点需要有 `UITransform` 组件
- `scrollThreshold` 控制滑动多少距离触发翻页
- `UNIFIED` 模式下所有页面大小相同，`FREE` 模式下页面大小可不同
- 翻页动画时间由 `pageTurningSpeed` 决定
