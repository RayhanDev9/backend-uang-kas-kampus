const express = require("express");
const { getAnalyticsSummary } = require("../controllers/analyticsController");

const router = express.Router();

router.get("/summary", getAnalyticsSummary);

module.exports = router;
