export const taxonomy = {
  markets: ["加密长尾现货", "加密永续合约", "跨现货-永续"],
  frequencies: ["1h", "4h", "15m"],
  styles: ["协整配对", "统计套利", "资金费率增强", "事件风险规避"]
};

export const strategyLibrary = [
  {
    id: 1,
    title: "长尾代币协整对滚动筛选",
    source: "arXiv / GitHub",
    market: "加密长尾现货",
    frequency: "1h",
    style: "协整配对",
    signals: ["协整", "价差 z-score", "滚动窗口"],
    scope: ["Top 50-500 代币池", "周度重筛", "样本外盲测"],
    originality: 71,
    feasibility: 82,
    dataAvailability: 79,
    crowdingRisk: 34,
    researchValue: 88,
    note: "适合作为基础框架，但需要额外过滤流动性骤降和项目基本面失真导致的伪协整。"
  },
  {
    id: 2,
    title: "资金费率分层下的跨合约配对套利",
    source: "SSRN / 研究博客",
    market: "跨现货-永续",
    frequency: "4h",
    style: "资金费率增强",
    signals: ["资金费率", "价差回归", "基差"],
    scope: ["现货-永续配对", "中频持有", "费率异常过滤"],
    originality: 67,
    feasibility: 78,
    dataAvailability: 84,
    crowdingRisk: 45,
    researchValue: 83,
    note: "逻辑较完整，但执行层需要对交易所费率、借币成本和换仓冲击做更细估算。"
  },
  {
    id: 3,
    title: "Orderbook 深度约束下的长尾均值回复",
    source: "GitHub / Medium",
    market: "加密永续合约",
    frequency: "15m",
    style: "统计套利",
    signals: ["orderbook 深度", "微观结构", "均值回复"],
    scope: ["盘口过滤", "高滑点惩罚", "短周期再平衡"],
    originality: 74,
    feasibility: 69,
    dataAvailability: 64,
    crowdingRisk: 39,
    researchValue: 81,
    note: "研究价值高，但对盘口级数据和执行质量要求非常高，更适合先做逻辑盲审。"
  },
  {
    id: 4,
    title: "叙事簇联动下的长尾配对剔除模型",
    source: "Substack / 自研笔记",
    market: "加密长尾现货",
    frequency: "4h",
    style: "事件风险规避",
    signals: ["Narrative Driver", "事件过滤", "联动风险"],
    scope: ["主题簇分层", "新闻事件剔除", "Rug Pull 黑名单"],
    originality: 79,
    feasibility: 76,
    dataAvailability: 61,
    crowdingRisk: 28,
    researchValue: 90,
    note: "很适合作为 Agent 4 的归因增强层，能解释看似模型失效、实则风险事件驱动的回撤。"
  },
  {
    id: 5,
    title: "卡尔曼滤波动态对冲比率配对交易",
    source: "论文摘要 / Quant 社区",
    market: "加密永续合约",
    frequency: "1h",
    style: "协整配对",
    signals: ["卡尔曼滤波", "动态 hedge ratio", "残差回归"],
    scope: ["动态参数更新", "滚动回归", "手续费敏感"],
    originality: 73,
    feasibility: 72,
    dataAvailability: 77,
    crowdingRisk: 41,
    researchValue: 86,
    note: "数学上较严谨，但若执行环境无法提供稳定低费率，实盘可行性会被显著削弱。"
  }
];
