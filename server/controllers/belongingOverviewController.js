// server/controllers/belongingOverviewController.js
const { getCohortOverview } = require("../models/belongingOverviewModel");

const CACHE_MS = 60 * 1000;
let cache = { at: 0, data: null };

// GET /api/guidance/belonging/overview[?refresh=1]
async function getBelongingOverviewController(req, res) {
  try {
    if (req.user.role !== "guidance" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const forceRefresh = req.query.refresh === "1";
    const fresh = cache.data && Date.now() - cache.at < CACHE_MS;

    if (!forceRefresh && fresh) {
      return res.json(cache.data);
    }

    const data = await getCohortOverview();
    cache = { at: Date.now(), data };

    res.json(data);
  } catch (err) {
    console.error("getBelongingOverviewController error:", err);
    res
      .status(500)
      .json({ message: "Server error while building the belonging overview." });
  }
}

module.exports = { getBelongingOverviewController };
