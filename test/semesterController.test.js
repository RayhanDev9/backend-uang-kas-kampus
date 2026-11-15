const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateSemesterInput,
} = require("../src/controllers/semesterController");

test("accepts valid semester input", () => {
  const input = {
    nama: "Semester Ganjil 2024/2025",
    kode: "2024-1",
    isAktif: true,
    targetKasPerMhs: 50000,
    tanggalMulai: "2024-09-01",
    tanggalSelesai: "2025-01-31",
  };
  assert.equal(validateSemesterInput(input), null);
});

test("rejects missing nama or kode in semester", () => {
  assert.equal(
    validateSemesterInput({ kode: "2024-1" }),
    "Field nama wajib diisi dan harus berupa teks"
  );
  assert.equal(
    validateSemesterInput({ nama: "Semester Ganjil 2024/2025" }),
    "Field kode wajib diisi dan harus berupa teks"
  );
  assert.equal(
    validateSemesterInput({ nama: "   ", kode: "2024-1" }),
    "Field nama wajib diisi dan harus berupa teks"
  );
});

test("rejects invalid targetKasPerMhs in semester", () => {
  assert.equal(
    validateSemesterInput({
      nama: "Semester 1",
      kode: "2024-1",
      targetKasPerMhs: -1000,
    }),
    "Field targetKasPerMhs harus berupa angka nol atau lebih"
  );
  assert.equal(
    validateSemesterInput({
      nama: "Semester 1",
      kode: "2024-1",
      targetKasPerMhs: "50000",
    }),
    "Field targetKasPerMhs harus berupa angka nol atau lebih"
  );
});

test("validates dates properly in semester", () => {
  assert.equal(
    validateSemesterInput({
      nama: "Semester 1",
      kode: "2024-1",
      tanggalMulai: "invalid-date",
    }),
    "Field tanggalMulai harus berupa tanggal yang valid"
  );
  assert.equal(
    validateSemesterInput({
      nama: "Semester 1",
      kode: "2024-1",
      tanggalSelesai: "invalid-date",
    }),
    "Field tanggalSelesai harus berupa tanggal yang valid"
  );
});

test("validates tipeIuran and daftarPertemuan in semester", () => {
  assert.equal(
    validateSemesterInput({
      nama: "Semester 1",
      kode: "2024-1",
      tipeIuran: "INVALID_TIPE",
    }),
    "Field tipeIuran harus MINGGUAN atau SEKALI_BAYAR"
  );

  assert.equal(
    validateSemesterInput({
      nama: "Semester 1",
      kode: "2024-1",
      tipeIuran: "MINGGUAN",
      daftarPertemuan: "bukan array",
    }),
    "Field daftarPertemuan harus berupa array"
  );

  assert.equal(
    validateSemesterInput({
      nama: "Semester 1",
      kode: "2024-1",
      tipeIuran: "MINGGUAN",
      daftarPertemuan: [
        { pertemuanKe: 1, tanggal: "07/03" },
        { pertemuanKe: 2, tanggal: "14/03" },
      ],
    }),
    null
  );
});
