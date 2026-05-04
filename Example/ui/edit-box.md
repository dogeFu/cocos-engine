# EditBox — 输入框

## 概述

`EditBox` 是文本输入组件，支持单行和多行文本输入、密码模式、多种键盘类型等。适用于用户名、密码、搜索框等输入场景。

## 导入方式

```typescript
import { EditBox, Node } from 'cc';
```

## 基础用法

### 创建输入框

```typescript
const node = new Node('InputField');
const editBox = node.addComponent(EditBox);
editBox.string = '';
editBox.placeholder = '请输入内容';
editBox.maxLength = 20;
```

### 监听输入事件

```typescript
editBox.node.on(EditBox.EventType.EDITING_DID_END, () => {
    const text = editBox.string;
}, this);

editBox.node.on(EditBox.EventType.EDITING_DID_BEGIN, () => {
}, this);

editBox.node.on(EditBox.EventType.TEXT_CHANGED, (editBox: EditBox) => {
    const text = editBox.string;
}, this);
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `string` | `string` | 输入文本内容 |
| `placeholder` | `string` | 占位提示文本 |
| `fontColor` | `Color` | 文本颜色 |
| `placeholderColor` | `Color` | 占位文本颜色 |
| `backgroundColor` | `Color` | 背景颜色 |
| `inputFlag` | `EditBox.InputFlag` | 输入标志 |
| `inputMode` | `EditBox.InputMode` | 输入模式 |
| `returnType` | `EditBox.KeyboardReturnType` | 键盘返回键类型 |
| `maxLength` | `number` | 最大字符数 |
| `tabIndex` | `number` | Tab 索引 |

## 核心方法

| 方法 | 说明 |
|------|------|
| `focus()` | 聚焦输入框 |
| `blur()` | 失焦输入框 |

## InputFlag 枚举

| 值 | 说明 |
|-----|------|
| `DEFAULT` | 默认 |
| `PASSWORD` | 密码模式 |
| `SENSITIVE` | 敏感信息 |
| `INITIAL_CAPS_WORD` | 单词首字母大写 |
| `INITIAL_CAPS_SENTENCE` | 句首大写 |
| `INITIAL_CAPS_ALL_CHARACTERS` | 全部大写 |
| `LOWERCASE_ALL_CHARACTERS` | 全部小写 |

## InputMode 枚举

| 值 | 说明 |
|-----|------|
| `ANY` | 任意输入 |
| `EMAIL_ADDR` | 邮箱地址 |
| `NUMERIC` | 数字 |
| `PHONE_NUMBER` | 电话号码 |
| `URL` | URL 地址 |
| `DECIMAL` | 小数 |
| `SINGLE_LINE` | 单行文本 |

## KeyboardReturnType 枚举

| 值 | 说明 |
|-----|------|
| `DEFAULT` | 默认 |
| `DONE` | 完成 |
| `SEND` | 发送 |
| `SEARCH` | 搜索 |
| `GO` | 前往 |
| `NEXT` | 下一个 |

## 事件类型

| 事件 | 说明 |
|------|------|
| `EDITING_DID_BEGIN` | 开始编辑 |
| `EDITING_DID_END` | 结束编辑 |
| `TEXT_CHANGED` | 文本变化 |
| `EDITING_RETURN` | 按下返回键 |

## 进阶用法

### 密码输入框

```typescript
editBox.inputFlag = EditBox.InputFlag.PASSWORD;
editBox.inputMode = EditBox.InputMode.SINGLE_LINE;
editBox.placeholder = '请输入密码';
editBox.maxLength = 16;
```

### 数字输入框

```typescript
editBox.inputMode = EditBox.InputMode.NUMERIC;
editBox.returnType = EditBox.KeyboardReturnType.DONE;
editBox.placeholder = '请输入数量';
```

### 搜索框

```typescript
editBox.inputMode = EditBox.InputMode.SINGLE_LINE;
editBox.returnType = EditBox.KeyboardReturnType.SEARCH;
editBox.placeholder = '搜索...';

editBox.node.on(EditBox.EventType.EDITING_RETURN, () => {
    this.performSearch(editBox.string);
}, this);
```

### 程序控制聚焦

```typescript
editBox.focus();
editBox.blur();
```

## 注意事项

- EditBox 在不同平台上的表现可能不同（尤其是原生平台）
- `maxLength` 为 0 表示不限制长度
- 密码模式下输入内容显示为 `*`
- `focus()`/`blur()` 在原生平台上可能需要特殊处理
- 键盘类型影响移动端弹出的软键盘样式
