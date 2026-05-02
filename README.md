# 策略检索与评估平台

这是一个从零搭建的最小可用研究平台，目标不是直接回测，而是完成以下两步：

1. 根据你输入的策略描述检索全网相似策略。
2. 对检索结果进行可行性分析和打分，筛选哪些值得进入下一轮真实回测。

## 当前原型包含什么

- 一个本地静态页面界面
- 策略描述输入区
- 自然语言策略拆解区
- 数据源设计展示区
- 候选策略结果卡片
- 研究优先级评分逻辑
- 是否进入下一轮研究的建议结论

当前版本已经切成“前端展示 + 本地后端服务”的结构：

1. 输入策略描述
2. 提取市场、频率、风格、核心信号、范围约束
3. 根据结构化字段生成联网检索语句
4. 调用搜索提供方抓取候选网页摘要
5. 调用 DeepSeek 进行研究优先级评分
6. 输出可行性分析和进入下一轮的建议

如果没有配置联网搜索或 DeepSeek，系统会自动退回本地模式。

## 文件说明

- `index.html`: 页面结构
- `styles.css`: 页面样式
- `app.js`: 页面交互入口
- `data/strategy-library.js`: 本地策略样本库
- `lib/strategy-engine.js`: 拆解、匹配、评分引擎
- `server.js`: 本地 HTTP 服务与 API 入口
- `services/search-service.js`: 联网搜索适配层
- `services/deepseek-service.js`: DeepSeek 打分服务
- `.env.example`: 环境变量模板

## 环境变量

把 `.env.example` 的内容复制成 `.env`，然后填写你自己的配置。

### DeepSeek

- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-v4-flash`
- `DEEPSEEK_API_KEY=你的密钥`

### 搜索提供方

当前支持两种：

- `SEARCH_PROVIDER=searxng`
  需要 `SEARXNG_BASE_URL`
- `SEARCH_PROVIDER=tavily`
  需要 `TAVILY_API_KEY`

如果你先不配搜索提供方，可以把它设成 `mock`，这时系统只走本地回退逻辑。

## 启动方式

在项目目录执行：

```powershell
node server.js
```

然后打开：

```text
http://localhost:3000
```

## 当前设计说明

### 为什么不能只给 DeepSeek Key

DeepSeek 负责理解、分析、打分，但它本身不是通用网页搜索引擎。
所以“联网搜索”还需要一个单独的搜索来源，例如：

- SearXNG 实例
- Tavily Search API

### 为什么不把 Key 写进前端

如果把 API Key 直接写进浏览器端代码，任何打开页面的人都能看到。
因此当前实现改成：

- 浏览器只提交策略描述
- 本地后端读取环境变量
- 后端统一请求搜索源和 DeepSeek

## 这个平台真正落地时的推荐流程

### 1. 策略输入标准化

把用户输入的自然语言策略，拆成结构化字段：

- 市场：A股 / 美股 / 期货 / 加密
- 频率：日频 / 小时级 / 分钟级
- 风格：趋势 / 均值回归 / 多因子 / 事件驱动
- 核心信号：动量、成交量、波动率、基本面、行业轮动等
- 约束条件：持仓周期、调仓频率、风控条件、选股范围

### 2. 数据源检索层

后续建议接入三类数据源：

- 社区内容源：TradingView、Reddit、知乎、CSDN、Medium、Substack
- 量化平台源：JoinQuant、Ricequant、FMZ、BigQuant、QuantConnect
- 论文和研报源：SSRN、arXiv、NBER、券商研报目录

### 3. 候选策略归一化

把检索结果统一抽取成：

- 标题
- 来源链接
- 市场
- 策略风格
- 核心逻辑摘要
- 是否包含明确规则
- 是否能拿到所需数据
- 是否疑似过拟合或陈旧

### 4. 评分层

建议评分维度：

- 原创性
- 可实现性
- 数据可得性
- 拥挤度风险
- 研究价值

注意这里的评分目标不是预测收益，而是判断“是否值得进入真实回测”。

## 下一步最值得做的事情

如果你继续推进，最合理的顺序是：

1. 先确定评分标准和字段结构。
2. 再确定第一批真实数据源。
3. 最后再做抓取、清洗、检索和人工复核流程。

## 本地预览

现在建议通过 `node server.js` 启动后访问页面，而不是直接双击 `index.html`。
