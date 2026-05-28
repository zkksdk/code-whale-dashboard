const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

// GET /api/analytics - Proxy to CodeWhale /v1/usage
router.get("/", async (req, res) => {
  try {
    const { days, group_by } = req.query;
    const usage = await cw.getUsage({
      group_by: group_by || "day",
    });
    
    const totals = usage.totals || {};
    const buckets = usage.buckets || [];

    res.json({
      success: true,
      data: {
        totalCost: totals.cost_usd || 0,
        totalTokens: (totals.input_tokens || 0) + (totals.output_tokens || 0),
        sessionCount: totals.turns || 0,
        period: { days: parseInt(days) || 30, from: usage.since, to: usage.until },
        daily: (group_by || "day") === "day" ? buckets.map(b => ({
          date: b.key,
          prompt_tokens: b.input_tokens || 0,
          completion_tokens: b.output_tokens || 0,
          cost: b.cost_usd || 0,
          requests: b.turns || 0,
        })) : [],
        byModel: buckets.map(b => ({
          model: b.key,
          prompt_tokens: b.input_tokens || 0,
          completion_tokens: b.output_tokens || 0,
          cost: b.cost_usd || 0,
          requests: b.turns || 0,
        })),
        // Raw usage data for detailed views
        usage: {
          totals,
          buckets,
          group_by: usage.group_by,
        },
      },
    });
  } catch (err) {
    res.json({ success: true, data: { totalCost: 0, totalTokens: 0, sessionCount: 0, daily: [], byModel: [] } });
  }
});

// GET /api/analytics/costs - Cost breakdown
router.get("/costs", async (req, res) => {
  try {
    const usage = await cw.getUsage({ group_by: "model" });
    const records = (usage.buckets || []).map(b => ({
      model: b.key,
      prompt_tokens: b.input_tokens || 0,
      completion_tokens: b.output_tokens || 0,
      cost: b.cost_usd || 0,
      date: new Date().toISOString().split("T")[0],
    }));
    res.json({ success: true, data: records });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;