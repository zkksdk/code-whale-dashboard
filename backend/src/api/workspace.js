const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

// GET /api/workspace
router.get("/", async (req, res) => {
  try { const data = await cw.getWorkspaceStatus(); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
