# AI 自动化测试与修复框架使用指南

## 概述

AI 自动化测试框架允许 AI 读取 HTML 测试页面，感知错误，自动修复，并持续迭代直到所有测试通过。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     测试页面 (HTML)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ai-test-framework.js (核心框架)                    │   │
│  │  - 捕获 console.error                               │   │
│  │  - 捕获 uncaught errors                             │   │
│  │  - 捕获 promise rejections                          │   │
│  │  - 记录测试结果                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ai-auto-fix.js (AI 修复工作流)                     │   │
│  │  - 获取失败报告                                     │   │
│  │  - 分析失败原因                                     │   │
│  │  - 生成修复建议                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent                                │
│  1. 加载测试页面                                            │
│  2. 读取 window.AI_TEST_FRAMEWORK.getAIReport()             │
│  3. 分析失败原因                                            │
│  4. 修复源代码                                              │
│  5. 重新构建                                                │
│  6. 重新加载页面                                            │
│  7. 重复直到所有测试通过                                    │
└─────────────────────────────────────────────────────────────┘
```

## 全局 API

### AI_TEST_FRAMEWORK (核心框架)

```javascript
// 获取完整测试结果
window.AI_TEST_FRAMEWORK.getResults()

// 获取失败报告（结构化）
window.AI_TEST_FRAMEWORK.getFailureReport()

// 获取 AI 友好的失败分析报告（含根因分析）
window.AI_TEST_FRAMEWORK.getAIReport()

// 检查测试是否完成
window.AI_TEST_FRAMEWORK.isComplete()

// 获取测试摘要
window.AI_TEST_FRAMEWORK.getSummary()

// 记录单个测试结果
window.AI_TEST_FRAMEWORK.recordTest(section, name, status, detail)

// 标记测试运行完成
window.AI_TEST_FRAMEWORK.markComplete()
```

### AI_AUTO_FIX (自动修复工作流)

```javascript
// 启动自动修复循环
window.AI_AUTO_FIX.startFixCycle(testPageUrl)

// 获取当前失败信息
window.AI_AUTO_FIX.getFailures()

// 获取修复日志
window.AI_AUTO_FIX.getFixLog()

// 获取修复摘要
window.AI_AUTO_FIX.getSummary()
```

## AI 修复流程

### 第一步：加载测试页面

AI 打开测试页面（如 `http://localhost:8080/vite/test.html`），等待测试运行完成。

### 第二步：读取失败报告

```javascript
// 在浏览器控制台或通过自动化脚本读取
const report = window.AI_TEST_FRAMEWORK.getAIReport();
console.log(JSON.stringify(report, null, 2));
```

### 第三步：分析失败原因

报告包含：
- `failureAnalysis.bySection`: 按测试分组的失败
- `failureAnalysis.byType`: 按失败类型分组（missing_api, wrong_value, type_mismatch, runtime_error）
- `errorAnalysis`: 运行时错误分析
- `recommendations`: AI 修复建议

### 第四步：修复源代码

根据失败分析，AI 修改对应的源文件。

### 第五步：重新构建

```bash
npm run build:vite
```

### 第六步：重新测试

重新加载测试页面，检查失败是否修复。

### 第七步：迭代

重复第二步到第六步，直到所有测试通过或达到最大迭代次数。

## 失败类型分类

| 类型 | 说明 | 修复方向 |
|------|------|---------|
| `missing_api` | API 不存在或未导出 | 检查模块导出、public API |
| `wrong_value` | 值不匹配 | 检查算法实现、计算逻辑 |
| `type_mismatch` | 类型错误 | 检查类型定义、返回值类型 |
| `runtime_error` | 运行时错误 | 检查堆栈跟踪，修复代码逻辑 |
| `other` | 其他类型 | 人工分析 |

## 修复日志格式

每次修复都会在 `window.AI_AUTO_FIX.state.fixLog` 中记录：

```javascript
{
  timestamp: "2024-01-01T12:00:00.000Z",
  iteration: 1,
  type: "ITERATION",
  message: "Iteration 1: 5 failures",
  details: {
    categories: {
      "Math Tests": { count: 2, failures: [...] },
      "Event Tests": { count: 3, failures: [...] }
    }
  }
}
```

## 使用示例

### 手动模式

1. 打开测试页面
2. 等待测试完成
3. 在控制台运行：
   ```javascript
   const report = window.AI_TEST_FRAMEWORK.getAIReport();
   console.log(JSON.stringify(report, null, 2));
   ```
4. AI 分析失败原因
5. 修改代码
6. 重新构建
7. 刷新页面
8. 重复直到通过

### 自动模式

```javascript
// 启动自动修复循环
window.AI_AUTO_FIX.startFixCycle('/vite/test.html');

// 查看修复日志
const log = window.AI_AUTO_FIX.getFixLog();
console.log('Fix log:', log);
```

## 测试页面

| 页面 | 测试内容 |
|------|---------|
| `test.html` | API 完整性测试 |
| `platform-test.html` | 平台抽象层测试 |
| `behavior-test.html` | 行为一致性测试 |

## 配置

```javascript
// 在 ai-auto-fix.js 中配置
window.AI_AUTO_FIX.config = {
    maxIterations: 10,        // 最大迭代次数
    testPages: [              // 测试页面列表
        '/vite/test.html',
        '/vite/platform-test.html',
        '/vite/behavior-test.html'
    ]
};
```

## 注意事项

1. 每次修复后必须重新构建才能看到效果
2. 某些失败可能需要多次迭代才能修复
3. 修复日志会记录所有尝试，便于回溯
4. AI 报告会自动生成修复建议，但需要人工验证

## 故障排除

### 测试页面不加载
检查服务器是否运行：`npm run serve`

### 测试超时
增加 `waitForTests` 超时时间

### 构建失败
检查构建日志：`npm run build:vite 2>&1 | tee build.log`
