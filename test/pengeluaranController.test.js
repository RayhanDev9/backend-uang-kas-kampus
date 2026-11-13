const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  validatePengeluaranInput,
} = require("../src/controllers/pengeluaranController");

test("accepts valid pengeluaran input", () => {
  const input = {
    semesterId: new mongoose.Types.ObjectId().toString(),
    judul: "Fotokopi Modul Praktikum Jaringan",
    kategori: "Akademik & Materi",
    nominal: 75000,
    tanggalPengeluaran: "2024-10-15",
    penanggungJawab: "Budi Santoso (Sie Perlengkapan)",
    keterangan: "Fotokopi 35 set modul untuk pertemuan lab ke-4",
    buktiNotaUrl: "https://example.com/nota.jpg",
  };
  assert.equal(validatePengeluaranInput(input), null);
});

test("rejects missing judul, penanggungJawab, or invalid nominal", () => {
  assert.equal(
    validatePengeluaranInput({
      penanggungJawab: "Budi",
      nominal: 50000,
    }),
    "Field judul wajib diisi dan harus berupa teks"
  );

  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      nominal: 50000,
    }),
    "Field penanggungJawab wajib diisi dan harus berupa teks"
  );

  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      penanggungJawab: "Budi",
      nominal: 0,
    }),
    "Field nominal wajib diisi dan minimal Rp 1"
  );

  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      penanggungJawab: "Budi",
      nominal: -5000,
    }),
    "Field nominal wajib diisi dan minimal Rp 1"
  );

  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      penanggungJawab: "Budi",
      nominal: "50000",
    }),
    "Field nominal wajib diisi dan minimal Rp 1"
  );
});

test("validates kategori when provided", () => {
  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      penanggungJawab: "Budi",
      nominal: 15000,
      kategori: "KategoriSalah",
    }),
    "Field kategori pengeluaran tidak valid"
  );

  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      penanggungJawab: "Budi",
      nominal: 15000,
      kategori: "Perlengkapan Kelas",
    }),
    null
  );
});

test("validates semesterId and tanggalPengeluaran when provided", () => {
  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      penanggungJawab: "Budi",
      nominal: 15000,
      semesterId: "not-an-object-id",
    }),
    "Field semesterId tidak valid"
  );

  assert.equal(
    validatePengeluaranInput({
      judul: "Beli Spidol",
      penanggungJawab: "Budi",
      nominal: 15000,
      tanggalPengeluaran: "invalid-date",
    }),
    "Field tanggalPengeluaran harus berupa tanggal yang valid"
  );
});
