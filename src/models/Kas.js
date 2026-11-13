const mongoose = require("mongoose");

const kasSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    nim: {
      type: String,
      required: [true, "NIM wajib diisi"],
      trim: true,
    },
    nama: {
      type: String,
      required: [true, "Nama wajib diisi"],
      trim: true,
    },
    periode: {
      type: String,
      required: [true, "Periode wajib diisi"],
      trim: true,
    },
    nominal: {
      type: Number,
      required: [true, "Nominal wajib diisi"],
      min: [0, "Nominal tidak boleh negatif"],
    },
    status: {
      type: String,
      required: [true, "Status wajib diisi"],
      enum: {
        values: ["Lunas", "Belum Lunas"],
        message: "Status harus Lunas atau Belum Lunas",
      },
    },
    metodePembayaran: {
      type: String,
      enum: ["Transfer", "QRIS", "Tunai"],
      default: "Transfer",
    },
    tanggalBayar: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index untuk mempercepat pencarian data kas per semester & riwayat
kasSchema.index({ semesterId: 1, nim: 1, periode: 1 });

module.exports =
  mongoose.models.Kas || mongoose.model("Kas", kasSchema);
