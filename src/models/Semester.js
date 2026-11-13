const mongoose = require("mongoose");

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
    targetKasPerMhs: {
      type: Number,
      default: 0,
      min: [0, "Target kas tidak boleh negatif"],
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
