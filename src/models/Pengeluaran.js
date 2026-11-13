const mongoose = require("mongoose");

const pengeluaranSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    judul: {
      type: String,
      required: [true, "Keperluan / judul pengeluaran wajib diisi"],
      trim: true,
    },
    kategori: {
      type: String,
      required: [true, "Kategori pengeluaran wajib diisi"],
      enum: {
        values: [
          "Akademik & Materi",
          "Perlengkapan Kelas",
          "Acara & Konsumsi",
          "Sosial & Santunan",
          "Lainnya",
        ],
        message: "Kategori pengeluaran tidak valid",
      },
      default: "Perlengkapan Kelas",
    },
    nominal: {
      type: Number,
      required: [true, "Nominal pengeluaran wajib diisi"],
      min: [1, "Nominal pengeluaran minimal Rp 1"],
    },
    tanggalPengeluaran: {
      type: Date,
      default: Date.now,
    },
    penanggungJawab: {
      type: String,
      required: [true, "Penanggung jawab/penerima uang wajib diisi"],
      trim: true,
    },
    keterangan: {
      type: String,
      trim: true,
    },
    buktiNotaUrl: {
      type: String,
      trim: true,
    },
    dicatatOleh: {
      type: String,
      default: "Bendahara",
    },
  },
  { timestamps: true }
);

pengeluaranSchema.index({ semesterId: 1, tanggalPengeluaran: -1 });

module.exports =
  mongoose.models.Pengeluaran ||
  mongoose.model("Pengeluaran", pengeluaranSchema);
