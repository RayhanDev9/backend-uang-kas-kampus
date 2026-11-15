const test = require("node:test");
const assert = require("node:assert/strict");
const { getAnalyticsSummary, formatBulanIndo } = require("../src/controllers/analyticsController");

test("analytics formatBulanIndo: formats YYYY-MM into Indonesian month names", () => {
  assert.equal(formatBulanIndo("2025-09"), "September 2025");
  assert.equal(formatBulanIndo("2025-10"), "Oktober 2025");
  assert.equal(formatBulanIndo("2026-11"), "November 2026");
  assert.equal(formatBulanIndo(""), "");
  assert.equal(formatBulanIndo(null), null);
});

test("getAnalyticsSummary: rejects invalid semesterId with HTTP 400", async () => {
  let statusCode = 0;
  let responseData = null;
  const req = {
    query: { semesterId: "invalid-id-xyz" },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  await getAnalyticsSummary(req, res, () => {});
  assert.equal(statusCode, 400);
  assert.equal(responseData.success, false);
  assert.match(responseData.message, /ID semester tidak valid/);
});
