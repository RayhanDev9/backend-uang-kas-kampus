const mongoose = require("mongoose");
const Pengeluaran = require("../models/Pengeluaran");
const Semester = require("../models/Semester");
const Kas = require("../models/Kas");
const PemasukanLain = require("../models/PemasukanLain");
const PaymentHistory = require("../models/PaymentHistory");

const VALID_KATEGORI = [
  "Akademik & Materi",
  "Perlengkapan Kelas",
  "Acara & Konsumsi",
  "Sosial & Santunan",
  "Lainnya",
];
const validKategori = new Set(VALID_KATEGORI);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validatePengeluaranInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Body request harus berupa object JSON";
  }

  if (typeof body.judul !== "string" || body.judul.trim().length === 0) {
    return "Field judul wajib diisi dan harus berupa teks";
  }

  if (
    body.kategori !== undefined &&
    body.kategori !== null &&
    !validKategori.has(String(body.kategori).trim())
  ) {
    return "Field kategori pengeluaran tidak valid";
  }

  if (
    typeof body.nominal !== "number" ||
    !Number.isFinite(body.nominal) ||
    body.nominal < 1
  ) {
    return "Field nominal wajib diisi dan minimal Rp 1";
  }

  if (
    typeof body.penanggungJawab !== "string" ||
    body.penanggungJawab.trim().length === 0
  ) {
    return "Field penanggungJawab wajib diisi dan harus berupa teks";
  }

  if (body.semesterId !== undefined && body.semesterId !== null) {
    if (!mongoose.isValidObjectId(body.semesterId)) {
      return "Field semesterId tidak valid";
    }
  }

  if (
    body.tanggalPengeluaran !== undefined &&
    body.tanggalPengeluaran !== null
  ) {
    const d = new Date(body.tanggalPengeluaran);
    if (Number.isNaN(d.getTime())) {
      return "Field tanggalPengeluaran harus berupa tanggal yang valid";
    }
  }

  return null;
}

async function getPengeluaran(req, res, next) {
  try {
    const filter = {};
    let semesterIdObj = null;

    if (req.query.semesterId) {
      if (!mongoose.isValidObjectId(req.query.semesterId)) {
        return res.status(400).json({
          success: false,
          message: "ID semester tidak valid",
        });
      }
      semesterIdObj = new mongoose.Types.ObjectId(req.query.semesterId);
      filter.semesterId = req.query.semesterId;
    } else {
      const activeSemester = await Semester.findOne({ isAktif: true });
      if (activeSemester) {
        semesterIdObj = activeSemester._id;
        filter.semesterId = activeSemester._id;
      }
    }

    if (req.query.kategori && req.query.kategori.trim()) {
      filter.kategori = req.query.kategori.trim();
    }

    if (req.query.search && typeof req.query.search === "string") {
      const search = req.query.search.trim();
      if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");
        filter.$or = [
          { judul: pattern },
          { penanggungJawab: pattern },
          { keterangan: pattern },
        ];
      }
    }

    const data = await Pengeluaran.find(filter)
      .sort({ tanggalPengeluaran: -1, createdAt: -1 })
      .lean();

    // Hitung total pengeluaran untuk semester yang dipilih
    let totalPengeluaran = 0;
    if (semesterIdObj) {
      const agg = await Pengeluaran.aggregate([
        { $match: { semesterId: semesterIdObj } },
        { $group: { _id: null, total: { $sum: "$nominal" } } },
      ]);
      totalPengeluaran = agg[0]?.total || 0;
    } else {
      totalPengeluaran = data.reduce((acc, curr) => acc + curr.nominal, 0);
    }

    return res.json({
      success: true,
      message: "Data pengeluaran berhasil diambil",
      summary: {
        totalPengeluaran,
        count: data.length,
      },
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function createPengeluaran(req, res, next) {
  try {
    const validationError = validatePengeluaranInput(req.body);
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

    const semesterIdObj = new mongoose.Types.ObjectId(semesterId);

    // Hitung saldo kas saat ini untuk validasi defisit kas
    const [kasSummaryResult, pemasukanLainResult, pengeluaranResult] =
      await Promise.all([
        Kas.aggregate([
          { $match: { semesterId: semesterIdObj, status: "Lunas" } },
          { $group: { _id: null, total: { $sum: "$nominal" } } },
        ]),
        PemasukanLain.aggregate([
          { $match: { semesterId: semesterIdObj } },
          { $group: { _id: null, total: { $sum: "$nominal" } } },
        ]),
        Pengeluaran.aggregate([
          { $match: { semesterId: semesterIdObj } },
          { $group: { _id: null, total: { $sum: "$nominal" } } },
        ]),
      ]);

    const totalKasLunas = kasSummaryResult[0]?.total || 0;
    const totalPemasukanLain = pemasukanLainResult[0]?.total || 0;
    const totalPengeluaranLama = pengeluaranResult[0]?.total || 0;
    const totalPemasukan = totalKasLunas + totalPemasukanLain;
    const sisaSaldo = totalPemasukan - totalPengeluaranLama;

    if (req.body.nominal > sisaSaldo) {
      return res.status(400).json({
        success: false,
        message: `Saldo kas tidak mencukupi untuk pengeluaran ini. Sisa saldo saat ini: Rp${sisaSaldo.toLocaleString(
          "id-ID"
        )}. Nominal pengeluaran yang diajukan: Rp${req.body.nominal.toLocaleString(
          "id-ID"
        )}`,
      });
    }

    const data = await Pengeluaran.create({
      semesterId,
      judul: req.body.judul.trim(),
      kategori: req.body.kategori.trim(),
      nominal: req.body.nominal,
      tanggalPengeluaran: req.body.tanggalPengeluaran
        ? new Date(req.body.tanggalPengeluaran)
        : new Date(),
      penanggungJawab: req.body.penanggungJawab.trim(),
      keterangan: req.body.keterangan ? req.body.keterangan.trim() : "",
      buktiNotaUrl: req.body.buktiNotaUrl ? req.body.buktiNotaUrl.trim() : "",
    });

    try {
      await PaymentHistory.create({
        aksi: "EXPENSE_CREATE",
        semesterId: data.semesterId,
        pengeluaranId: data._id,
        nama: data.penanggungJawab,
        nim: "-",
        nominal: data.nominal,
        keterangan: `Pengeluaran [${data.kategori}] "${data.judul}" oleh ${data.penanggungJawab}`,
        dataSnapshot: {
          judul: data.judul,
          kategori: data.kategori,
          nominal: data.nominal,
          penanggungJawab: data.penanggungJawab,
        },
        waktu: new Date(),
      });
    } catch (historyError) {
      console.error(
        "Gagal mencatat history EXPENSE_CREATE:",
        historyError.message
      );
    }

    return res.status(201).json({
      success: true,
      message: "Pengeluaran kas berhasil dicatat",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePengeluaran(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID pengeluaran tidak valid",
      });
    }

    const data = await Pengeluaran.findByIdAndDelete(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data pengeluaran tidak ditemukan",
      });
    }

    try {
      await PaymentHistory.create({
        aksi: "EXPENSE_DELETE",
        semesterId: data.semesterId,
        pengeluaranId: data._id,
        nama: data.penanggungJawab,
        nim: "-",
        nominal: data.nominal,
        keterangan: `Pembatalan pengeluaran "${data.judul}" sebesar Rp${data.nominal.toLocaleString(
          "id-ID"
        )}`,
        dataSnapshot: {
          judul: data.judul,
          kategori: data.kategori,
          nominal: data.nominal,
          penanggungJawab: data.penanggungJawab,
        },
        waktu: new Date(),
      });
    } catch (historyError) {
      console.error(
        "Gagal mencatat history EXPENSE_DELETE:",
        historyError.message
      );
    }

    return res.json({
      success: true,
      message: "Pengeluaran kas berhasil dihapus",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPengeluaran,
  deletePengeluaran,
  getPengeluaran,
  validatePengeluaranInput,
};
