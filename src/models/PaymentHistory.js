const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    kasId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kas",
      required: false,
    },
    nama: {
      type: String,
      required: true,
      trim: true,
    },
    nim: {
      type: String,
      trim: true,
    },
    aksi: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE_STATUS",
        "UPDATE_NOMINAL",
        "DELETE",
        "IMPORT_EXCEL",
      ],
    },
    nominal: {
      type: Number,
    },
    statusLama: {
      type: String,
    },
    statusBaru: {
      type: String,
    },
    nominalLama: {
      type: Number,
    },
    nominalBaru: {
      type: Number,
    },
    keterangan: {
      type: String,
      trim: true,
    },
    dataSnapshot: {
      type: mongoose.Schema.Types.Mixed,
    },
    waktu: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

paymentHistorySchema.index({ semesterId: 1, waktu: -1 });

module.exports =
  mongoose.models.PaymentHistory ||
  mongoose.model("PaymentHistory", paymentHistorySchema);
