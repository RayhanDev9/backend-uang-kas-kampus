const mongoose = require("mongoose");
const Kas = require("../models/Kas");
const Semester = require("../models/Semester");
const PemasukanLain = require("../models/PemasukanLain");
const PaymentHistory = require("../models/PaymentHistory");

const allowedFields = new Set([
  "nim",
  "nama",
  "periode",
  "nominal",
  "status",
  "tanggalBayar",
  "semesterId",
  "metodePembayaran",
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

  if (
    Object.prototype.hasOwnProperty.call(body, "semesterId") &&
    body.semesterId !== null &&
    body.semesterId !== undefined
  ) {
    if (!mongoose.isValidObjectId(body.semesterId)) {
      return "Field semesterId tidak valid";
    }
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
    let currentSemester = null;
    let semesterFilter = {};

    if (req.query.semesterId) {
      if (!mongoose.isValidObjectId(req.query.semesterId)) {
        return res.status(400).json({
          success: false,
          message: "ID semester tidak valid",
        });
      }
      currentSemester = await Semester.findById(req.query.semesterId).lean();
      semesterFilter = { semesterId: new mongoose.Types.ObjectId(req.query.semesterId) };
    } else {
      currentSemester = await Semester.findOne({ isAktif: true }).lean();
      if (currentSemester) {
        semesterFilter = { semesterId: currentSemester._id };
      }
    }

    const filter = { ...semesterFilter };

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

    const [data, kasSummaryResult, pemasukanLainResult] = await Promise.all([
      Kas.find(filter).sort({ createdAt: -1, _id: -1 }).lean(),
      Kas.aggregate([
        { $match: semesterFilter },
        {
          $group: {
            _id: null,
            totalKasLunas: {
              $sum: {
                $cond: [{ $eq: ["$status", "Lunas"] }, "$nominal", 0],
              },
            },
            totalLunas: {
              $sum: {
                $cond: [{ $eq: ["$status", "Lunas"] }, 1, 0],
              },
            },
            totalBelumLunas: {
              $sum: {
                $cond: [{ $eq: ["$status", "Belum Lunas"] }, 1, 0],
              },
            },
          },
        },
      ]),
      PemasukanLain.aggregate([
        { $match: semesterFilter },
        {
          $group: {
            _id: null,
            totalPemasukanLain: { $sum: "$nominal" },
          },
        },
      ]),
    ]);

    const kasSummary = kasSummaryResult[0] || {
      totalKasLunas: 0,
      totalLunas: 0,
      totalBelumLunas: 0,
    };
    const totalPemasukanLain =
      pemasukanLainResult[0]?.totalPemasukanLain || 0;
    const totalSaldo = kasSummary.totalKasLunas + totalPemasukanLain;
    const targetKasPerMhs = currentSemester?.targetKasPerMhs || 0;
    const totalMahasiswa = kasSummary.totalLunas + kasSummary.totalBelumLunas;
    const targetKasTotal = totalMahasiswa * targetKasPerMhs;

    const summary = {
      totalKasLunas: kasSummary.totalKasLunas,
      totalPemasukanLain,
      totalSaldo,
      totalLunas: kasSummary.totalLunas,
      totalBelumLunas: kasSummary.totalBelumLunas,
      targetKasTotal,
    };

    const semesterData = currentSemester
      ? {
          _id: currentSemester._id,
          nama: currentSemester.nama,
          kode: currentSemester.kode,
          isAktif: currentSemester.isAktif,
        }
      : null;

    return res.json({
      success: true,
      summary,
      semester: semesterData,
      data,
    });
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

    const payload = { ...req.body };
    if (!payload.semesterId) {
      const activeSemester = await Semester.findOne({ isAktif: true });
      if (activeSemester) {
        payload.semesterId = activeSemester._id;
      }
    }

    const data = await Kas.create(payload);

    try {
      await PaymentHistory.create({
        aksi: "CREATE",
        semesterId: data.semesterId,
        kasId: data._id,
        nim: data.nim,
        nama: data.nama,
        nominal: data.nominal,
        statusBaru: data.status,
        keterangan: `Pencatatan kas baru untuk ${data.nama} (${data.nim})`,
        waktu: new Date(),
      });
    } catch (historyError) {
      console.error("Gagal mencatat history CREATE:", historyError.message);
    }

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

    const oldKas = await Kas.findById(req.params.id);
    if (!oldKas) {
      return res.status(404).json({
        success: false,
        message: "Data kas tidak ditemukan",
      });
    }

    const data = await Kas.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    try {
      if (req.body.status !== undefined && oldKas.status !== data.status) {
        await PaymentHistory.create({
          aksi: "UPDATE_STATUS",
          semesterId: data.semesterId,
          kasId: data._id,
          nim: data.nim,
          nama: data.nama,
          nominal: data.nominal,
          statusLama: oldKas.status,
          statusBaru: data.status,
          keterangan: `Status kas untuk ${data.nama} diubah dari ${oldKas.status} menjadi ${data.status}`,
          waktu: new Date(),
        });
      }

      if (
        req.body.nominal !== undefined &&
        oldKas.nominal !== data.nominal
      ) {
        await PaymentHistory.create({
          aksi: "UPDATE_NOMINAL",
          semesterId: data.semesterId,
          kasId: data._id,
          nim: data.nim,
          nama: data.nama,
          nominal: data.nominal,
          nominalLama: oldKas.nominal,
          nominalBaru: data.nominal,
          statusLama: data.status,
          statusBaru: data.status,
          keterangan: `Nominal kas untuk ${data.nama} diubah dari Rp${oldKas.nominal.toLocaleString("id-ID")} menjadi Rp${data.nominal.toLocaleString("id-ID")}`,
          waktu: new Date(),
        });
      }

      if (
        (req.body.status === undefined || oldKas.status === data.status) &&
        (req.body.nominal === undefined || oldKas.nominal === data.nominal)
      ) {
        await PaymentHistory.create({
          aksi: "UPDATE",
          semesterId: data.semesterId,
          kasId: data._id,
          nim: data.nim,
          nama: data.nama,
          nominal: data.nominal,
          statusBaru: data.status,
          keterangan: `Data kas untuk ${data.nama} diperbarui`,
          waktu: new Date(),
        });
      }
    } catch (historyError) {
      console.error("Gagal mencatat history UPDATE:", historyError.message);
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

    try {
      await PaymentHistory.create({
        aksi: "DELETE",
        semesterId: data.semesterId,
        kasId: data._id,
        nim: data.nim,
        nama: data.nama,
        nominal: data.nominal,
        statusLama: data.status,
        keterangan: `Data kas ${data.nama} (${data.nim}) sebesar Rp${data.nominal.toLocaleString("id-ID")} dihapus`,
        waktu: new Date(),
        dataSnapshot: {
          nim: data.nim,
          nama: data.nama,
          periode: data.periode,
          nominal: data.nominal,
          status: data.status,
        },
      });
    } catch (historyError) {
      console.error("Gagal mencatat history DELETE:", historyError.message);
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
