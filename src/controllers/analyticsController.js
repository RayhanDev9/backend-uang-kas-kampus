const mongoose = require("mongoose");
const Kas = require("../models/Kas");
const Semester = require("../models/Semester");
const Pengeluaran = require("../models/Pengeluaran");
const PemasukanLain = require("../models/PemasukanLain");

function formatBulanIndo(ym) {
  if (!ym || typeof ym !== "string") return ym;
  const [year, month] = ym.split("-");
  const monthNames = {
    "01": "Januari",
    "02": "Februari",
    "03": "Maret",
    "04": "April",
    "05": "Mei",
    "06": "Juni",
    "07": "Juli",
    "08": "Agustus",
    "09": "September",
    "10": "Oktober",
    "11": "November",
    "12": "Desember",
  };
  return `${monthNames[month] || month} ${year}`;
}

async function getAnalyticsSummary(req, res, next) {
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
      if (!currentSemester) {
        currentSemester = await Semester.findOne().sort({ createdAt: -1 }).lean();
      }
    }

    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Semester tidak ditemukan",
      });
    }

    const semesterId = currentSemester._id;

    const [students, pengeluaranList, pemasukanLainList] = await Promise.all([
      Kas.find({ semesterId }).lean(),
      Pengeluaran.find({ semesterId }).lean(),
      PemasukanLain.find({ semesterId }).lean(),
    ]);

    // 1. Payment Progress (Statistik Kepatuhan Pembayaran)
    const totalMahasiswa = students.length;
    const targetKasPerMhs = currentSemester.targetKasPerMhs || 50000;
    const lunasCount = students.filter((s) => s.status === "Lunas").length;
    const belumLunasCount = totalMahasiswa - lunasCount;
    const persentaseLunas =
      totalMahasiswa > 0
        ? Number(((lunasCount / totalMahasiswa) * 100).toFixed(1))
        : 0;
    const totalKasTerkumpul = students.reduce(
      (sum, s) => sum + (s.nominal || 0),
      0
    );
    const totalTargetKas = totalMahasiswa * targetKasPerMhs;
    const totalTertunggak = Math.max(0, totalTargetKas - totalKasTerkumpul);

    const paymentProgress = {
      totalMahasiswa,
      targetKasPerMhs,
      lunasCount,
      belumLunasCount,
      persentaseLunas,
      totalKasTerkumpul,
      totalTargetKas,
      totalTertunggak,
    };

    // 2. Breakdown Pengeluaran per Kategori (Donut Chart Data)
    const totalPengeluaran = pengeluaranList.reduce(
      (sum, p) => sum + (p.nominal || 0),
      0
    );
    const catMap = new Map();
    pengeluaranList.forEach((p) => {
      const cat = p.kategori || "Lainnya";
      catMap.set(cat, (catMap.get(cat) || 0) + (p.nominal || 0));
    });

    const expenseByCategory = Array.from(catMap.entries())
      .map(([kategori, nominal]) => ({
        kategori,
        nominal,
        persentase:
          totalPengeluaran > 0
            ? Number(((nominal / totalPengeluaran) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.nominal - a.nominal);

    // 3. Tren Arus Kas Bulanan (Monthly Cashflow Bar Chart Data)
    const monthMap = new Map();

    function getMonthBucket(ym) {
      if (!monthMap.has(ym)) {
        monthMap.set(ym, {
          month: ym,
          label: formatBulanIndo(ym),
          pemasukan: 0,
          pengeluaran: 0,
        });
      }
      return monthMap.get(ym);
    }

    // Pemasukan Lain per bulan
    pemasukanLainList.forEach((p) => {
      if (p.tanggalMasuk) {
        try {
          const ym = new Date(p.tanggalMasuk).toISOString().substring(0, 7);
          getMonthBucket(ym).pemasukan += p.nominal || 0;
        } catch {
          // ignore
        }
      }
    });

    // Pemasukan Kas Mahasiswa per bulan
    const startYear = currentSemester.tanggalMulai
      ? new Date(currentSemester.tanggalMulai).getFullYear()
      : 2025;
    const endYear = currentSemester.tanggalSelesai
      ? new Date(currentSemester.tanggalSelesai).getFullYear()
      : startYear;

    students.forEach((s) => {
      if (Array.isArray(s.detailMingguan) && s.detailMingguan.length > 0) {
        s.detailMingguan.forEach((d) => {
          if (d.bayar) {
            let ym = null;
            if (d.tanggal && typeof d.tanggal === "string" && d.tanggal.includes("/")) {
              const parts = d.tanggal.split("/");
              const monthNum = parseInt(parts[1], 10);
              if (!Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                const yr =
                  endYear > startYear && monthNum < 6 ? endYear : startYear;
                ym = `${yr}-${String(monthNum).padStart(2, "0")}`;
              }
            } else if (s.tanggalBayar) {
              try {
                ym = new Date(s.tanggalBayar).toISOString().substring(0, 7);
              } catch {
                // ignore
              }
            }
            if (ym) {
              getMonthBucket(ym).pemasukan +=
                d.nominal || currentSemester.nominalPerMinggu || 5000;
            }
          }
        });
      } else if (s.nominal > 0) {
        let ym = `${startYear}-10`;
        if (s.tanggalBayar) {
          try {
            ym = new Date(s.tanggalBayar).toISOString().substring(0, 7);
          } catch {
            // ignore
          }
        }
        getMonthBucket(ym).pemasukan += s.nominal;
      }
    });

    // Pengeluaran per bulan
    pengeluaranList.forEach((p) => {
      if (p.tanggalPengeluaran) {
        try {
          const ym = new Date(p.tanggalPengeluaran).toISOString().substring(0, 7);
          getMonthBucket(ym).pengeluaran += p.nominal || 0;
        } catch {
          // ignore
        }
      }
    });

    const monthlyTrend = Array.from(monthMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return res.json({
      success: true,
      semester: {
        _id: currentSemester._id,
        nama: currentSemester.nama,
        kode: currentSemester.kode,
        isAktif: currentSemester.isAktif,
      },
      paymentProgress,
      expenseByCategory,
      monthlyTrend,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAnalyticsSummary,
  formatBulanIndo,
};
