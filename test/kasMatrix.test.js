const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  getKasMatrix,
  updatePertemuan,
} = require("../src/controllers/kasController");

test("updatePertemuan: rejects invalid kas ObjectId", async () => {
  let statusCode = 0;
  let responseData = null;
  const req = {
    params: { id: "invalid-id" },
    body: { pertemuanKe: 1, bayar: true },
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

  await updatePertemuan(req, res, () => {});
  assert.equal(statusCode, 400);
  assert.equal(responseData.success, false);
  assert.match(responseData.message, /ID kas tidak valid/);
});

test("updatePertemuan: rejects invalid or non-integer pertemuanKe", async () => {
  const validId = new mongoose.Types.ObjectId().toString();

  const testCases = [
    { pertemuanKe: 0, bayar: true },
    { pertemuanKe: -2, bayar: true },
    { pertemuanKe: "1", bayar: true },
    { pertemuanKe: 1.5, bayar: true },
    { bayar: true },
  ];

  for (const body of testCases) {
    let statusCode = 0;
    let responseData = null;
    const req = {
      params: { id: validId },
      body,
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

    await updatePertemuan(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /pertemuanKe/);
  }
});

test("updatePertemuan: rejects non-boolean bayar", async () => {
  const validId = new mongoose.Types.ObjectId().toString();

  const testCases = [
    { pertemuanKe: 1, bayar: "true" },
    { pertemuanKe: 1, bayar: 1 },
    { pertemuanKe: 1 },
  ];

  for (const body of testCases) {
    let statusCode = 0;
    let responseData = null;
    const req = {
      params: { id: validId },
      body,
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

    await updatePertemuan(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /bayar/);
  }
});

test("updatePertemuan: rejects negative nominal", async () => {
  const validId = new mongoose.Types.ObjectId().toString();
  let statusCode = 0;
  let responseData = null;
  const req = {
    params: { id: validId },
    body: { pertemuanKe: 1, bayar: true, nominal: -5000 },
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

  await updatePertemuan(req, res, () => {});
  assert.equal(statusCode, 400);
  assert.equal(responseData.success, false);
  assert.match(responseData.message, /nominal/);
});

test("getKasMatrix: rejects invalid semesterId query param", async () => {
  let statusCode = 0;
  let responseData = null;
  const req = {
    query: { semesterId: "not-a-valid-id" },
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

  await getKasMatrix(req, res, () => {});
  assert.equal(statusCode, 400);
  assert.equal(responseData.success, false);
  assert.match(responseData.message, /ID semester tidak valid/);
});
