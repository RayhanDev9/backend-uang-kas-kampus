const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  validatePemasukanLainInput,
} = require("../src/controllers/pemasukanLainController");

test("accepts valid pemasukan lain input", () => {
  const input = {
    semesterId: new mongoose.Types.ObjectId().toString(),
    judul: "Sisa Saldo Kas Semester Genap Lalu",
    kategori: "Sisa Semester Lalu",
    nominal: 450000,
    tanggalMasuk: "2024-09-02",
    keterangan: "Sisa kas yang ditransfer dari periode kepengurusan lama",
  };
  assert.equal(validatePemasukanLainInput(input), null);
});

test("rejects missing judul, kategori, or invalid nominal", () => {
  assert.equal(
    validatePemasukanLainInput({
      kategori: "Donasi",
      nominal: 10000,
    }),
    "Field judul wajib diisi dan harus berupa teks"
  );

  assert.equal(
    validatePemasukanLainInput({
      judul: "Donasi Alumni",
      nominal: 10000,
    }),
    "Field kategori wajib diisi dan harus berupa teks"
  );

  assert.equal(
    validatePemasukanLainInput({
      judul: "Donasi Alumni",
      kategori: "Donasi",
      nominal: -5000,
    }),
    "Field nominal wajib diisi dan harus berupa angka nol atau lebih"
  );

  assert.equal(
    validatePemasukanLainInput({
      judul: "Donasi Alumni",
      kategori: "Donasi",
      nominal: "10000",
    }),
    "Field nominal wajib diisi dan harus berupa angka nol atau lebih"
  );
});

test("validates semesterId and tanggalMasuk when provided", () => {
  assert.equal(
    validatePemasukanLainInput({
      judul: "Donasi Alumni",
      kategori: "Donasi",
      nominal: 10000,
      semesterId: "not-an-object-id",
    }),
    "Field semesterId tidak valid"
  );

  assert.equal(
    validatePemasukanLainInput({
      judul: "Donasi Alumni",
      kategori: "Donasi",
      nominal: 10000,
      tanggalMasuk: "invalid-date",
    }),
    "Field tanggalMasuk harus berupa tanggal yang valid"
  );
});
