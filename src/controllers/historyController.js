const mongoose = require("mongoose");
const PaymentHistory = require("../models/PaymentHistory");
const Semester = require("../models/Semester");

async function getHistory(req, res, next) {
  try {
    const filter = {};

    if (req.query.semesterId) {
      if (!mongoose.isValidObjectId(req.query.semesterId)) {
        return res.status(400).json({
          success: false,
          message: "ID semester tidak valid",
        });
      }
      filter.semesterId = req.query.semesterId;
    } else {
      const activeSemester = await Semester.findOne({ isAktif: true });
      if (activeSemester) {
        filter.semesterId = activeSemester._id;
      }
    }

    const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 200));

    const data = await PaymentHistory.find(filter)
      .sort({ waktu: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      message: "Data history berhasil diambil",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHistory,
};
