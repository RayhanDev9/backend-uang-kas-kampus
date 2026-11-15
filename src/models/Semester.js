const mongoose = require("mongoose");

const pertemuanSubSchema = new mongoose.Schema(
  {
    pertemuanKe: { type: Number, required: true },
    tanggal: { type: String, required: true }, // Format: "07/03" atau "YYYY-MM-DD"
    label: { type: String, default: "" },      // Label opsional: "Pertemuan 1", "UTS", dll
  },
  { _id: false }
);

const semesterSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: [true, "Nama semester wajib diisi"],
      trim: true,
    },
    kode: {
      type: String,
      required: [true, "Kode semester wajib diisi"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    isAktif: {
      type: Boolean,
      default: false,
      index: true,
    },
    tipeIuran: {
      type: String,
      enum: ["MINGGUAN", "SEKALI_BAYAR"],
      default: "SEKALI_BAYAR",
    },
    daftarPertemuan: [pertemuanSubSchema],
    targetKasPerMhs: {
      type: Number,
      default: 0,
      min: [0, "Target kas tidak boleh negatif"],
    },
    nominalPerMinggu: {
      type: Number,
      default: 5000,
      min: [0, "Nominal per minggu tidak boleh negatif"],
    },
    tanggalMulai: {
      type: Date,
    },
    tanggalSelesai: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Semester || mongoose.model("Semester", semesterSchema);
