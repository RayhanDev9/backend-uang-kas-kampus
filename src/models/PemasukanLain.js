const mongoose = require("mongoose");

const pemasukanLainSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    judul: {
      type: String,
      required: [true, "Judul pemasukan wajib diisi"],
      trim: true,
    },
    kategori: {
      type: String,
      required: [true, "Kategori pemasukan wajib diisi"],
      enum: {
        values: [
          "Sisa Semester Lalu",
          "Dana Usaha",
          "Sponsor",
          "Donasi",
          "Lainnya",
        ],
        message: "Kategori tidak valid",
      },
      default: "Lainnya",
    },
    nominal: {
      type: Number,
      required: [true, "Nominal wajib diisi"],
      min: [1, "Nominal minimal Rp 1"],
    },
    tanggalMasuk: {
      type: Date,
      default: Date.now,
    },
    keterangan: {
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

pemasukanLainSchema.index({ semesterId: 1, tanggalMasuk: -1 });

module.exports =
  mongoose.models.PemasukanLain ||
  mongoose.model("PemasukanLain", pemasukanLainSchema);
