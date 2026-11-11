const test = require("node:test");
const assert = require("node:assert/strict");
const authPin = require("../src/middlewares/authPin");

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("rejects a missing or incorrect admin PIN", () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "123456";

  try {
    for (const providedPin of [undefined, "654321"]) {
      const req = { get: () => providedPin };
      const res = createResponse();
      let nextCalled = false;

      authPin(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(nextCalled, false);
    }
  } finally {
    if (originalPin === undefined) {
      delete process.env.ADMIN_PIN;
    } else {
      process.env.ADMIN_PIN = originalPin;
    }
  }
});

test("allows a matching admin PIN", () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "123456";

  try {
    const req = { get: () => "123456" };
    const res = createResponse();
    let nextCalled = false;

    authPin(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
  } finally {
    if (originalPin === undefined) {
      delete process.env.ADMIN_PIN;
    } else {
      process.env.ADMIN_PIN = originalPin;
    }
  }
});
