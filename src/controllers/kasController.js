const mongoose = require("mongoose");
const Kas = require("../models/Kas");
const Semester = require("../models/Semester");
const PemasukanLain = require("../models/PemasukanLain");
const Pengeluaran = require("../models/Pengeluaran");
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
  "refund",
  "detailMingguan",
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

  if (
    Object.prototype.hasOwnProperty.call(body, "refund") &&
    (typeof body.refund !== "number" ||
      !Number.isFinite(body.refund) ||
      body.refund < 0)
  ) {
    return "Field refund harus berupa angka nol atau lebih";
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "detailMingguan") &&
    !Array.isArray(body.detailMingguan)
  ) {
    return "Field detailMingguan harus berupa array";
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

    const [data, kasSummaryResult, pemasukanLainResult, pengeluaranResult] =
      await Promise.all([
        Kas.find(filter).sort({ createdAt: -1, _id: -1 }).lean(),
        Kas.aggregate([
          { $match: semesterFilter },
          {
            $group: {
              _id: null,
              totalKas: { $sum: "$nominal" },
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
        Pengeluaran.aggregate([
          { $match: semesterFilter },
          {
            $group: {
              _id: null,
              totalPengeluaran: { $sum: "$nominal" },
              totalPengeluaranOperasional: {
                $sum: {
                  $cond: [
                    { $ne: ["$kategori", "Pengembalian Kas"] },
                    "$nominal",
                    0,
                  ],
                },
              },
              totalUangDikembalikan: {
                $sum: {
                  $cond: [
                    { $eq: ["$kategori", "Pengembalian Kas"] },
                    "$nominal",
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const kasSummary = kasSummaryResult[0] || {
      totalKas: 0,
      totalKasLunas: 0,
      totalLunas: 0,
      totalBelumLunas: 0,
    };
    const totalPemasukanLain =
      pemasukanLainResult[0]?.totalPemasukanLain || 0;
    const totalPengeluaran =
      pengeluaranResult[0]?.totalPengeluaran || 0;
    const totalPengeluaranOperasional =
      pengeluaranResult[0]?.totalPengeluaranOperasional || 0;
    const totalUangDikembalikan =
      pengeluaranResult[0]?.totalUangDikembalikan || 0;
    const totalKasMasuk = kasSummary.totalKas || 0;
    const totalPemasukan = totalKasMasuk + totalPemasukanLain;
    const saldoBersih = totalPemasukan - totalPengeluaran;
    const totalSaldo = saldoBersih; // Alias untuk konsistensi
    const targetKasPerMhs = currentSemester?.targetKasPerMhs || 0;
    const totalMahasiswa = kasSummary.totalLunas + kasSummary.totalBelumLunas;
    const targetKasTotal = totalMahasiswa * targetKasPerMhs;

    const summary = {
      totalKas: totalKasMasuk,
      totalKasLunas: kasSummary.totalKasLunas,
      totalPemasukanLain,
      totalPemasukan,
      totalPengeluaran,
      totalPengeluaranOperasional,
      totalUangDikembalikan,
      saldoBersih,
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

async function getKasMatrix(req, res, next) {
  try {
    let currentSemester = null;

    if (req.query.semesterId) {
      if (!mongoose.isValidObjectId(req.query.semesterId)) {
        return res.status(400).json({
          success: false,
          message: "ID semester tidak valid",
        });
      }
      currentSemester = await Semester.findById(req.query.semesterId).lean();
    } else {
      currentSemester = await Semester.findOne({ isAktif: true }).lean();
    }

    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Semester tidak ditemukan",
      });
    }

    const tipeIuran = currentSemester.tipeIuran || "SEKALI_BAYAR";
    let daftarPertemuan = Array.isArray(currentSemester.daftarPertemuan) && currentSemester.daftarPertemuan.length > 0
      ? currentSemester.daftarPertemuan
      : [];

    const students = await Kas.find({ semesterId: currentSemester._id })
      .sort({ nim: 1, nama: 1, _id: 1 })
      .lean();

    // Jika semester bertipe MINGGUAN namun daftarPertemuan di semester belum diset,
    // sintesiskan dari data detailMingguan mahasiswa jika ada.
    if (daftarPertemuan.length === 0 && tipeIuran === "MINGGUAN") {
      const pertemuanMap = new Map();
      students.forEach((s) => {
        (s.detailMingguan || []).forEach((d) => {
          if (!pertemuanMap.has(d.pertemuanKe)) {
            pertemuanMap.set(d.pertemuanKe, {
              pertemuanKe: d.pertemuanKe,
              tanggal: d.tanggal || `P${d.pertemuanKe}`,
              label: `Pertemuan ${d.pertemuanKe}`,
            });
          }
        });
      });

      if (pertemuanMap.size > 0) {
        daftarPertemuan = Array.from(pertemuanMap.values()).sort(
          (a, b) => a.pertemuanKe - b.pertemuanKe
        );
      }
    }

    const targetKasPerMhs = currentSemester.targetKasPerMhs || 0;
    const nominalPerMinggu = currentSemester.nominalPerMinggu || 5000;

    const rows = students.map((mhs, idx) => {
      const detailMap = new Map();
      (mhs.detailMingguan || []).forEach((d) => {
        detailMap.set(d.pertemuanKe, d);
      });

      const fullDetailMingguan = daftarPertemuan.map((p) => {
        const item = detailMap.get(p.pertemuanKe);
        return {
          pertemuanKe: p.pertemuanKe,
          tanggal: p.tanggal,
          bayar: item ? Boolean(item.bayar) : false,
          nominal:
            item && typeof item.nominal === "number"
              ? item.nominal
              : nominalPerMinggu,
        };
      });

      const totalPertemuanBayar = fullDetailMingguan.filter((d) => d.bayar).length;

      return {
        _id: mhs._id,
        no: idx + 1,
        nim: mhs.nim,
        nama: mhs.nama,
        nominal: mhs.nominal,
        targetKas: targetKasPerMhs,
        status: mhs.status,
        totalPertemuanBayar,
        detailMingguan: fullDetailMingguan,
      };
    });

    const totalPerMinggu = daftarPertemuan.map((p) => {
      let jumlahBayar = 0;
      let totalUang = 0;
      rows.forEach((r) => {
        const d = r.detailMingguan.find((item) => item.pertemuanKe === p.pertemuanKe);
        if (d && d.bayar) {
          jumlahBayar += 1;
          totalUang += d.nominal || nominalPerMinggu;
        }
      });
      return {
        pertemuanKe: p.pertemuanKe,
        tanggal: p.tanggal,
        jumlahBayar,
        totalUang,
      };
    });

    const grandTotalKas = rows.reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    return res.json({
      success: true,
      semester: {
        _id: currentSemester._id,
        nama: currentSemester.nama,
        kode: currentSemester.kode,
        isAktif: currentSemester.isAktif,
        tipeIuran,
        targetKasPerMhs,
        nominalPerMinggu,
      },
      daftarPertemuan,
      rows,
      totalPerMinggu,
      grandTotalKas,
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePertemuan(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID kas tidak valid",
      });
    }

    const { pertemuanKe, bayar, nominal } = req.body;

    if (
      pertemuanKe === undefined ||
      typeof pertemuanKe !== "number" ||
      !Number.isInteger(pertemuanKe) ||
      pertemuanKe < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Field pertemuanKe harus berupa bilangan bulat positif >= 1",
      });
    }

    if (bayar === undefined || typeof bayar !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Field bayar harus berupa boolean (true atau false)",
      });
    }

    if (
      nominal !== undefined &&
      (typeof nominal !== "number" || !Number.isFinite(nominal) || nominal < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Field nominal harus berupa angka nol atau lebih",
      });
    }

    const kas = await Kas.findById(req.params.id);
    if (!kas) {
      return res.status(404).json({
        success: false,
        message: "Data kas mahasiswa tidak ditemukan",
      });
    }

    const semester = await Semester.findById(kas.semesterId);
    const nominalDefault =
      nominal !== undefined
        ? nominal
        : semester?.nominalPerMinggu || 5000;

    let tanggalDefault = `P${pertemuanKe}`;
    if (semester && Array.isArray(semester.daftarPertemuan)) {
      const matchP = semester.daftarPertemuan.find(
        (p) => p.pertemuanKe === pertemuanKe
      );
      if (matchP && matchP.tanggal) {
        tanggalDefault = matchP.tanggal;
      }
    }

    if (!Array.isArray(kas.detailMingguan)) {
      kas.detailMingguan = [];
    }

    const existingIndex = kas.detailMingguan.findIndex(
      (d) => d.pertemuanKe === pertemuanKe
    );

    if (existingIndex >= 0) {
      kas.detailMingguan[existingIndex].bayar = bayar;
      if (nominal !== undefined) {
        kas.detailMingguan[existingIndex].nominal = nominal;
      }
    } else {
      kas.detailMingguan.push({
        pertemuanKe,
        tanggal: tanggalDefault,
        bayar,
        nominal: nominalDefault,
      });
    }

    kas.detailMingguan.sort((a, b) => a.pertemuanKe - b.pertemuanKe);

    // Hitung ulang nominal kas dari total pertemuan yang telah dibayar
    const totalBaru = kas.detailMingguan.reduce(
      (sum, item) => sum + (item.bayar ? item.nominal : 0),
      0
    );
    const nominalLama = kas.nominal;
    kas.nominal = totalBaru;

    // Evaluasi status lunas otomatis terhadap target semester
    const target = semester?.targetKasPerMhs || 0;
    const statusLama = kas.status;
    if (target > 0) {
      kas.status = totalBaru >= target ? "Lunas" : "Belum Lunas";
    }

    await kas.save();

    // Catat riwayat audit di PaymentHistory
    try {
      await PaymentHistory.create({
        aksi: "UPDATE_STATUS",
        semesterId: kas.semesterId,
        kasId: kas._id,
        nim: kas.nim,
        nama: kas.nama,
        nominal: kas.nominal,
        nominalLama,
        nominalBaru: totalBaru,
        statusLama,
        statusBaru: kas.status,
        keterangan: `Update absensi pertemuan ke-${pertemuanKe} (${
          bayar ? "LUNAS / ✓" : "BATAL / -"
        }) oleh Bendahara`,
        waktu: new Date(),
      });
    } catch (historyError) {
      console.error(
        "Gagal mencatat history update pertemuan:",
        historyError.message
      );
    }

    return res.json({
      success: true,
      message: `Absensi pertemuan ${pertemuanKe} untuk ${kas.nama} berhasil diperbarui`,
      data: kas,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createKas,
  deleteKas,
  getKas,
  getKasMatrix,
  updateKas,
  updatePertemuan,
  validateKasInput,
};
