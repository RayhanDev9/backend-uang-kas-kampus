const mongoose = require("mongoose");
const Semester = require("../models/Semester");

function validateSemesterInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Body request harus berupa object JSON";
  }

  if (typeof body.nama !== "string" || body.nama.trim().length === 0) {
    return "Field nama wajib diisi dan harus berupa teks";
  }

  if (typeof body.kode !== "string" || body.kode.trim().length === 0) {
    return "Field kode wajib diisi dan harus berupa teks";
  }

  if (
    body.targetKasPerMhs !== undefined &&
    (typeof body.targetKasPerMhs !== "number" ||
      !Number.isFinite(body.targetKasPerMhs) ||
      body.targetKasPerMhs < 0)
  ) {
    return "Field targetKasPerMhs harus berupa angka nol atau lebih";
  }

  if (body.tanggalMulai !== undefined && body.tanggalMulai !== null) {
    const d = new Date(body.tanggalMulai);
    if (Number.isNaN(d.getTime())) {
      return "Field tanggalMulai harus berupa tanggal yang valid";
    }
  }

  if (body.tanggalSelesai !== undefined && body.tanggalSelesai !== null) {
    const d = new Date(body.tanggalSelesai);
    if (Number.isNaN(d.getTime())) {
      return "Field tanggalSelesai harus berupa tanggal yang valid";
    }
  }

  return null;
}

async function getSemesters(req, res, next) {
  try {
    const semesters = await Semester.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      message: "Daftar semester berhasil diambil",
      data: semesters,
    });
  } catch (error) {
    return next(error);
  }
}

async function getActiveSemester(req, res, next) {
  try {
    const semester = await Semester.findOne({ isAktif: true });
    return res.json({
      success: true,
      message: semester
        ? "Semester aktif berhasil diambil"
        : "Tidak ada semester yang sedang aktif",
      data: semester || null,
    });
  } catch (error) {
    return next(error);
  }
}

async function createSemester(req, res, next) {
  try {
    const validationError = validateSemesterInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      nama,
      kode,
      isAktif = false,
      targetKasPerMhs = 0,
      tanggalMulai,
      tanggalSelesai,
    } = req.body;

    const existing = await Semester.findOne({ kode: kode.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Kode semester sudah digunakan",
      });
    }

    if (isAktif) {
      await Semester.updateMany({}, { isAktif: false });
    }

    const semester = await Semester.create({
      nama: nama.trim(),
      kode: kode.trim(),
      isAktif: Boolean(isAktif),
      targetKasPerMhs,
      tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : undefined,
      tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : undefined,
    });

    return res.status(201).json({
      success: true,
      message: "Semester berhasil ditambahkan",
      data: semester,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Kode semester sudah digunakan",
      });
    }
    return next(error);
  }
}

async function activateSemester(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID semester tidak valid",
      });
    }

    const targetSemester = await Semester.findById(id);
    if (!targetSemester) {
      return res.status(404).json({
        success: false,
        message: "Semester tidak ditemukan",
      });
    }

    await Semester.updateMany({ _id: { $ne: id } }, { isAktif: false });
    targetSemester.isAktif = true;
    await targetSemester.save();

    return res.json({
      success: true,
      message: "Semester berhasil diaktifkan",
      data: targetSemester,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  activateSemester,
  createSemester,
  getActiveSemester,
  getSemesters,
  validateSemesterInput,
};
