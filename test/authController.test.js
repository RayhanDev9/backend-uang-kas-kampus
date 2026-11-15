const test = require("node:test");
const assert = require("node:assert/strict");
const {
  login,
  verify,
  generateAuthToken,
  isValidTokenOrPin,
} = require("../src/controllers/authController");
const authPin = require("../src/middlewares/authPin");

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

test("login: successfully authenticates valid PIN and returns auth token", async () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "998877";

  try {
    const req = { body: { pin: "998877" } };
    const res = createMockResponse();

    await login(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.role, "bendahara");
    assert.ok(typeof res.body.token === "string" && res.body.token.length > 20);
    assert.equal(res.body.token, generateAuthToken("998877"));
  } finally {
    process.env.ADMIN_PIN = originalPin;
  }
});

test("login: rejects incorrect PIN with HTTP 401", async () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "998877";

  try {
    const req = { body: { pin: "112233" } };
    const res = createMockResponse();

    await login(req, res, () => {});

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /PIN bendahara salah/);
  } finally {
    process.env.ADMIN_PIN = originalPin;
  }
});

test("login: rejects missing or empty PIN with HTTP 400", async () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "998877";

  try {
    for (const body of [{}, { pin: "" }, { pin: "   " }, null]) {
      const req = { body };
      const res = createMockResponse();

      await login(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /wajib diisi/);
    }
  } finally {
    process.env.ADMIN_PIN = originalPin;
  }
});

test("verify: accepts valid token in Authorization Bearer header", async () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "998877";

  try {
    const validToken = generateAuthToken("998877");
    const req = {
      get(header) {
        if (header.toLowerCase() === "authorization") {
          return `Bearer ${validToken}`;
        }
        return null;
      },
    };
    const res = createMockResponse();

    await verify(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.valid, true);
    assert.equal(res.body.role, "bendahara");
  } finally {
    process.env.ADMIN_PIN = originalPin;
  }
});

test("verify: accepts valid plain PIN in x-admin-pin header", async () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "998877";

  try {
    const req = {
      get(header) {
        if (header.toLowerCase() === "x-admin-pin") {
          return "998877";
        }
        return null;
      },
    };
    const res = createMockResponse();

    await verify(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.valid, true);
  } finally {
    process.env.ADMIN_PIN = originalPin;
  }
});

test("verify: rejects invalid or expired token with HTTP 401", async () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "998877";

  try {
    const req = {
      get() {
        return "Bearer random_fake_token_123456";
      },
    };
    const res = createMockResponse();

    await verify(req, res, () => {});

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.valid, false);
  } finally {
    process.env.ADMIN_PIN = originalPin;
  }
});

test("authPin middleware: allows request with valid Bearer token", () => {
  const originalPin = process.env.ADMIN_PIN;
  process.env.ADMIN_PIN = "998877";

  try {
    const validToken = generateAuthToken("998877");
    const req = {
      get(header) {
        if (header.toLowerCase() === "authorization") {
          return `Bearer ${validToken}`;
        }
        return null;
      },
    };
    const res = createMockResponse();
    let nextCalled = false;

    authPin(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200); // status was never set to error
  } finally {
    process.env.ADMIN_PIN = originalPin;
  }
});
