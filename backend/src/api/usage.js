const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

// GET /api/usage - Get usage statistics from CodeWhale
router.get("/", async (req, res) => {
  try {
    const data = await cw.getUsage({
      since: req.query.since,
      until: req.query.until,
      group_by: req.query.group_by || "day",
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
