const mongoose = require("mongoose");
const Kas = require("../models/Kas");

const allowedFields = new Set([
  "nim",
  "nama",
  "periode",
  "nominal",
  "status",
  "tanggalBayar",
]);
const requiredFields = ["nim", "nama", "periode", "nominal", "status"];
const validStatuses = new Set(["Lunas", "Belum Lunas"]);

function validateKasInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Body request harus berupa object JSON";
  }

  const keys = Object.keys(body);
  if (keys.some((key) => !allowedFields.has(key))) {
    return "Body request berisi field yang tidak didukung";
  }
  if (keys.length === 0) {
    return "Body request tidak boleh kosong";
  }
  if (!partial) {
    const missingField = requiredFields.find(
      (field) => !Object.prototype.hasOwnProperty.call(body, field)
    );
    if (missingField) {
      return `Field ${missingField} wajib diisi`;
    }
  }

  for (const field of ["nim", "nama", "periode"]) {
    if (
      Object.prototype.hasOwnProperty.call(body, field) &&
      (typeof body[field] !== "string" || body[field].trim().length === 0)
    ) {
      return `Field ${field} harus berupa teks dan tidak boleh kosong`;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "nominal") &&
    (typeof body.nominal !== "number" ||
      !Number.isFinite(body.nominal) ||
      body.nominal < 0)
  ) {
    return "Field nominal harus berupa angka nol atau lebih";
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "status") &&
    !validStatuses.has(body.status)
  ) {
    return "Field status harus Lunas atau Belum Lunas";
  }

  if (Object.prototype.hasOwnProperty.call(body, "tanggalBayar")) {
    const date = new Date(body.tanggalBayar);
    if (
      (typeof body.tanggalBayar !== "string" &&
        typeof body.tanggalBayar !== "number" &&
        !(body.tanggalBayar instanceof Date)) ||
      Number.isNaN(date.getTime())
    ) {
      return "Field tanggalBayar harus berupa tanggal yang valid";
    }
  }

  return null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getKas(req, res, next) {
  try {
    const filter = {};
    if (req.query.status !== undefined) {
      if (
        typeof req.query.status !== "string" ||
        !validStatuses.has(req.query.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Query status harus Lunas atau Belum Lunas",
        });
      }
      filter.status = req.query.status;
    }

    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string") {
        return res.status(400).json({
          success: false,
          message: "Query search harus berupa teks",
        });
      }
      const search = req.query.search.trim();
      if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ nim: pattern }, { nama: pattern }];
      }
    }

    const [data, summaryResult] = await Promise.all([
      Kas.find(filter).sort({ createdAt: -1, _id: -1 }).lean(),
      Kas.aggregate([
        {
          $group: {
            _id: "$nim",
            paidTotal: {
              $sum: {
                $cond: [{ $eq: ["$status", "Lunas"] }, "$nominal", 0],
              },
            },
            hasPaid: {
              $max: { $cond: [{ $eq: ["$status", "Lunas"] }, 1, 0] },
            },
            hasUnpaid: {
              $max: {
                $cond: [{ $eq: ["$status", "Belum Lunas"] }, 1, 0],
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSaldo: { $sum: "$paidTotal" },
            totalLunas: { $sum: "$hasPaid" },
            totalBelumLunas: { $sum: "$hasUnpaid" },
          },
        },
        {
          $project: {
            _id: 0,
            totalSaldo: 1,
            totalLunas: 1,
            totalBelumLunas: 1,
          },
        },
      ]),
    ]);

    const summary = summaryResult[0] || {
      totalSaldo: 0,
      totalLunas: 0,
      totalBelumLunas: 0,
    };

    return res.json({ success: true, summary, data });
  } catch (error) {
    return next(error);
  }
}

async function createKas(req, res, next) {
  try {
    const validationError = validateKasInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const data = await Kas.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Data kas berhasil ditambahkan",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateKas(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID kas tidak valid",
      });
    }

    const validationError = validateKasInput(req.body, { partial: true });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const data = await Kas.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data kas tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      message: "Data kas berhasil diperbarui",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteKas(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID kas tidak valid",
      });
    }

    const data = await Kas.findByIdAndDelete(req.params.id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data kas tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      message: "Data kas berhasil dihapus",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createKas,
  deleteKas,
  getKas,
  updateKas,
  validateKasInput,
};
