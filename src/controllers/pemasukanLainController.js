const mongoose = require("mongoose");
const PemasukanLain = require("../models/PemasukanLain");
const Semester = require("../models/Semester");

function validatePemasukanLainInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Body request harus berupa object JSON";
  }

  if (typeof body.judul !== "string" || body.judul.trim().length === 0) {
    return "Field judul wajib diisi dan harus berupa teks";
  }

  if (typeof body.kategori !== "string" || body.kategori.trim().length === 0) {
    return "Field kategori wajib diisi dan harus berupa teks";
  }

  if (
    typeof body.nominal !== "number" ||
    !Number.isFinite(body.nominal) ||
    body.nominal < 0
  ) {
    return "Field nominal wajib diisi dan harus berupa angka nol atau lebih";
  }

  if (body.semesterId !== undefined && body.semesterId !== null) {
    if (!mongoose.isValidObjectId(body.semesterId)) {
      return "Field semesterId tidak valid";
    }
  }

  if (body.tanggalMasuk !== undefined && body.tanggalMasuk !== null) {
    const d = new Date(body.tanggalMasuk);
    if (Number.isNaN(d.getTime())) {
      return "Field tanggalMasuk harus berupa tanggal yang valid";
    }
  }

  return null;
}

async function getPemasukanLain(req, res, next) {
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

    const data = await PemasukanLain.find(filter)
      .sort({ tanggalMasuk: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      message: "Data pemasukan lain berhasil diambil",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createPemasukanLain(req, res, next) {
  try {
    const validationError = validatePemasukanLainInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    let semesterId = req.body.semesterId;
    if (!semesterId) {
      const activeSemester = await Semester.findOne({ isAktif: true });
      if (!activeSemester) {
        return res.status(400).json({
          success: false,
          message:
            "Field semesterId wajib diisi karena tidak ada semester aktif",
        });
      }
      semesterId = activeSemester._id;
    } else {
      const semesterExists = await Semester.findById(semesterId);
      if (!semesterExists) {
        return res.status(404).json({
          success: false,
          message: "Semester tidak ditemukan",
        });
      }
    }

    const data = await PemasukanLain.create({
      semesterId,
      judul: req.body.judul.trim(),
      kategori: req.body.kategori.trim(),
      nominal: req.body.nominal,
      tanggalMasuk: req.body.tanggalMasuk
        ? new Date(req.body.tanggalMasuk)
        : new Date(),
      keterangan: req.body.keterangan ? req.body.keterangan.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Pemasukan lain berhasil dicatat",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePemasukanLain(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID pemasukan lain tidak valid",
      });
    }

    const data = await PemasukanLain.findByIdAndDelete(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data pemasukan lain tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      message: "Pemasukan lain berhasil dihapus",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPemasukanLain,
  deletePemasukanLain,
  getPemasukanLain,
  validatePemasukanLainInput,
};
