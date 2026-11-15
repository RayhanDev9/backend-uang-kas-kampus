const test = require("node:test");
const assert = require("node:assert/strict");
const { getHistory, formatBulanIndo } = require("../src/controllers/historyController");

test("formatBulanIndo: formats YYYY-MM into Indonesian month names", () => {
  assert.equal(formatBulanIndo("2026-06"), "Juni 2026");
  assert.equal(formatBulanIndo("2026-03"), "Maret 2026");
  assert.equal(formatBulanIndo("2025-10"), "Oktober 2025");
  assert.equal(formatBulanIndo("2025-01"), "Januari 2025");
  assert.equal(formatBulanIndo(""), "");
  assert.equal(formatBulanIndo(null), null);
});

test("getHistory: rejects invalid semesterId with HTTP 400", async () => {
  let statusCode = 0;
  let responseData = null;
  const req = {
    query: { semesterId: "invalid-semester-id-123" },
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

  await getHistory(req, res, () => {});
  assert.equal(statusCode, 400);
  assert.equal(responseData.success, false);
  assert.match(responseData.message, /ID semester tidak valid/);
});
