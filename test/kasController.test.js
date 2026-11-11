const test = require("node:test");
const assert = require("node:assert/strict");
const { validateKasInput } = require("../src/controllers/kasController");

const validKas = {
  nim: "231011400010",
  nama: "Budi Santoso",
  periode: "Minggu 1 - November",
  nominal: 10000,
  status: "Lunas",
};

test("accepts a valid Kas record", () => {
  assert.equal(validateKasInput(validKas), null);
});

test("rejects a missing required field on create", () => {
  const { nim, ...input } = validKas;
  assert.equal(validateKasInput(input), "Field nim wajib diisi");
});

test("rejects invalid payment status", () => {
  assert.equal(
    validateKasInput({ ...validKas, status: "Pending" }),
    "Field status harus Lunas atau Belum Lunas"
  );
});

test("rejects negative and non-numeric amounts", () => {
  assert.equal(
    validateKasInput({ ...validKas, nominal: -1 }),
    "Field nominal harus berupa angka nol atau lebih"
  );
  assert.equal(
    validateKasInput({ ...validKas, nominal: "10000" }),
    "Field nominal harus berupa angka nol atau lebih"
  );
});

test("allows a non-empty partial update", () => {
  assert.equal(validateKasInput({ nominal: 15000 }, { partial: true }), null);
});

test("rejects empty or unsupported update fields", () => {
  assert.equal(
    validateKasInput({}, { partial: true }),
    "Body request tidak boleh kosong"
  );
  assert.equal(
    validateKasInput({ unknown: true }, { partial: true }),
    "Body request berisi field yang tidak didukung"
  );
});
