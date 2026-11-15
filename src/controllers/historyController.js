const mongoose = require("mongoose");
const PaymentHistory = require("../models/PaymentHistory");
const Semester = require("../models/Semester");

const refundRegex = /pengembalian/i;

function escapeRegex(val) {
  return val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

async function getHistory(req, res, next) {
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
      semesterFilter = {
        semesterId: new mongoose.Types.ObjectId(req.query.semesterId),
      };
    } else {
      currentSemester = await Semester.findOne({ isAktif: true }).lean();
      if (currentSemester) {
        semesterFilter = { semesterId: currentSemester._id };
      }
    }

    const filter = { ...semesterFilter };

    // 1. Filter Kategori Mutasi
    const kategori = (req.query.kategori || "all").toLowerCase();
    if (kategori === "pemasukan") {
      filter.aksi = { $in: ["CREATE", "IMPORT_EXCEL"] };
    } else if (kategori === "pengeluaran") {
      filter.aksi = "EXPENSE_CREATE";
      filter.$and = [
        {
          $or: [
            { "dataSnapshot.kategori": { $exists: false } },
            { "dataSnapshot.kategori": { $ne: "Pengembalian Kas" } },
          ],
        },
        { keterangan: { $not: refundRegex } },
      ];
    } else if (kategori === "refund") {
      filter.aksi = "EXPENSE_CREATE";
      filter.$or = [
        { "dataSnapshot.kategori": "Pengembalian Kas" },
        { keterangan: refundRegex },
      ];
    } else if (kategori === "status") {
      filter.aksi = { $in: ["UPDATE_STATUS", "UPDATE_NOMINAL", "DELETE"] };
    }

    // 2. Filter Pencarian Real-Time (Nama, NIM, atau Keterangan)
    if (req.query.search && typeof req.query.search === "string") {
      const searchTrim = req.query.search.trim();
      if (searchTrim) {
        const pattern = new RegExp(escapeRegex(searchTrim), "i");
        filter.$or = [
          { nama: pattern },
          { nim: pattern },
          { keterangan: pattern },
        ];
      }
    }

    // 3. Filter Bulan (Format: YYYY-MM)
    if (req.query.bulan && typeof req.query.bulan === "string") {
      const bulanTrim = req.query.bulan.trim();
      if (/^\d{4}-\d{2}$/.test(bulanTrim)) {
        const [yearStr, monthStr] = bulanTrim.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

        filter.waktu = {
          $gte: startDate,
          $lt: endDate,
        };
      }
    }

    // 4. Hitung Summary Terkonsolidasi untuk Semester Terpilih
    const allSemesterLogs = await PaymentHistory.find(semesterFilter).lean();

    let totalKasMasuk = 0;
    let totalPengeluaranOperasional = 0;
    let totalUangDikembalikan = 0;
    const monthsSet = new Set();

    allSemesterLogs.forEach((item) => {
      if (item.waktu) {
        try {
          const ym = new Date(item.waktu).toISOString().substring(0, 7);
          monthsSet.add(ym);
        } catch {
          // ignore invalid date
        }
      }

      const isRefund =
        item?.dataSnapshot?.kategori === "Pengembalian Kas" ||
        (item?.keterangan && refundRegex.test(item.keterangan));

      if (item.aksi === "CREATE" || item.aksi === "IMPORT_EXCEL") {
        totalKasMasuk += item.nominal || 0;
      } else if (item.aksi === "EXPENSE_CREATE") {
        if (isRefund) {
          totalUangDikembalikan += item.nominal || 0;
        } else {
          totalPengeluaranOperasional += item.nominal || 0;
        }
      }
    });

    const daftarBulan = Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((ym) => ({
        key: ym,
        label: formatBulanIndo(ym),
      }));

    const summary = {
      totalMutasi: allSemesterLogs.length,
      totalKasMasuk,
      totalPengeluaranOperasional,
      totalUangDikembalikan,
    };

    // 5. Eksekusi Query dengan Paginasi
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 100, 500));
    const skip = (page - 1) * limit;

    const [totalData, rawData] = await Promise.all([
      PaymentHistory.countDocuments(filter),
      PaymentHistory.find(filter)
        .sort({ waktu: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const data = rawData.map((item) => {
      const isRefund =
        item?.dataSnapshot?.kategori === "Pengembalian Kas" ||
        (item?.keterangan && refundRegex.test(item.keterangan));

      let jenis = "LAINNYA";
      if (item.aksi === "CREATE" || item.aksi === "IMPORT_EXCEL") {
        jenis = "PEMASUKAN";
      } else if (item.aksi === "EXPENSE_CREATE") {
        jenis = isRefund ? "REFUND" : "PENGELUARAN";
      } else if (
        item.aksi === "UPDATE_STATUS" ||
        item.aksi === "UPDATE_NOMINAL" ||
        item.aksi === "DELETE"
      ) {
        jenis = "STATUS";
      }

      return {
        ...item,
        isRefund,
        jenis,
      };
    });

    return res.json({
      success: true,
      message: "Data history berhasil diambil",
      summary,
      daftarBulan,
      pagination: {
        totalData,
        page,
        limit,
        totalPages: Math.ceil(totalData / limit),
      },
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHistory,
  formatBulanIndo,
};
