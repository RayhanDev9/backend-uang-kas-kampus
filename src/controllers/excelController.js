const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");
const Kas = require("../models/Kas");
const Semester = require("../models/Semester");
const PemasukanLain = require("../models/PemasukanLain");
const Pengeluaran = require("../models/Pengeluaran");
const PaymentHistory = require("../models/PaymentHistory");

async function downloadTemplate(req, res, next) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Kas");

    worksheet.columns = [
      { header: "NIM", key: "nim", width: 22 },
      { header: "Nama Mahasiswa", key: "nama", width: 30 },
      { header: "Periode", key: "periode", width: 25 },
      { header: "Nominal", key: "nominal", width: 18 },
      { header: "Status", key: "status", width: 18 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF059669" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const exampleRow = worksheet.addRow({
      nim: "2401020035",
      nama: "Budi Santoso",
      periode: "Minggu 1",
      nominal: 10000,
      status: "Lunas",
    });
    exampleRow.height = 20;

    const nimCell = exampleRow.getCell("nim");
    nimCell.numFmt = "@";
    nimCell.alignment = { vertical: "middle", horizontal: "left" };

    const nominalCell = exampleRow.getCell("nominal");
    nominalCell.numFmt = '"Rp" #,##0';
    nominalCell.alignment = { vertical: "middle", horizontal: "right" };

    const statusCell = exampleRow.getCell("status");
    statusCell.alignment = { vertical: "middle", horizontal: "center" };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Template-Kas.xlsx"'
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return next(error);
  }
}

async function exportKas(req, res, next) {
  try {
    let currentSemester = null;
    let filter = {};

    if (req.query.semesterId) {
      if (!mongoose.isValidObjectId(req.query.semesterId)) {
        return res.status(400).json({
          success: false,
          message: "ID semester tidak valid",
        });
      }
      currentSemester = await Semester.findById(req.query.semesterId).lean();
      filter.semesterId = req.query.semesterId;
    } else {
      currentSemester = await Semester.findOne({ isAktif: true }).lean();
      if (currentSemester) {
        filter.semesterId = currentSemester._id;
      }
    }

    const [kasList, pemasukanLainList, pengeluaranList] = await Promise.all([
      Kas.find(filter).sort({ nim: 1, nama: 1, createdAt: 1 }).lean(),
      PemasukanLain.find(filter).sort({ tanggalMasuk: -1, createdAt: -1 }).lean(),
      Pengeluaran.find(filter).sort({ tanggalPengeluaran: -1, createdAt: -1 }).lean(),
    ]);

    const workbook = new ExcelJS.Workbook();

    const applyHeaderStyle = (worksheet) => {
      const headerRow = worksheet.getRow(1);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF059669" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    };

    // Sheet 1: Iuran Kas Mahasiswa
    const wsKas = workbook.addWorksheet("Iuran Kas Mahasiswa");
    wsKas.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "NIM", key: "nim", width: 22 },
      { header: "Nama Mahasiswa", key: "nama", width: 32 },
      { header: "Periode", key: "periode", width: 25 },
      { header: "Nominal", key: "nominal", width: 20 },
      { header: "Status", key: "status", width: 18 },
      { header: "Tanggal Bayar", key: "tanggalBayar", width: 20 },
    ];
    applyHeaderStyle(wsKas);

    let rowKasIdx = 2;
    for (let i = 0; i < kasList.length; i++) {
      const item = kasList[i];
      const row = wsKas.addRow({
        no: i + 1,
        nim: String(item.nim),
        nama: item.nama,
        periode: item.periode,
        nominal: item.nominal,
        status: item.status,
        tanggalBayar: item.tanggalBayar
          ? new Date(item.tanggalBayar).toLocaleDateString("id-ID")
          : "-",
      });
      row.height = 20;

      const nimCell = row.getCell("nim");
      nimCell.numFmt = "@";
      nimCell.alignment = { vertical: "middle", horizontal: "left" };

      const nominalCell = row.getCell("nominal");
      nominalCell.numFmt = '"Rp" #,##0';
      nominalCell.alignment = { vertical: "middle", horizontal: "right" };

      const statusCell = row.getCell("status");
      statusCell.alignment = { vertical: "middle", horizontal: "center" };
      if (item.status === "Lunas") {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" },
        };
        statusCell.font = { color: { argb: "FF065F46" }, bold: true };
      } else {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF3C7" },
        };
        statusCell.font = { color: { argb: "FF92400E" }, bold: true };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });

      rowKasIdx++;
    }

    const totalRowKas = wsKas.addRow({
      no: "",
      nim: "",
      nama: "Total Kas Terkumpul",
      periode: "",
      nominal:
        kasList.length > 0 ? { formula: `SUM(E2:E${rowKasIdx - 1})` } : 0,
      status: "",
      tanggalBayar: "",
    });
    totalRowKas.height = 24;
    totalRowKas.font = { bold: true };
    totalRowKas.getCell("nominal").numFmt = '"Rp" #,##0';
    totalRowKas.getCell("nominal").alignment = {
      vertical: "middle",
      horizontal: "right",
    };
    totalRowKas.getCell("nama").alignment = {
      vertical: "middle",
      horizontal: "right",
    };

    // Sheet 2: Pemasukan Non-Kas
    const wsPemasukan = workbook.addWorksheet("Pemasukan Non-Kas");
    wsPemasukan.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "Judul Pemasukan", key: "judul", width: 35 },
      { header: "Kategori", key: "kategori", width: 24 },
      { header: "Nominal", key: "nominal", width: 20 },
      { header: "Tanggal Masuk", key: "tanggalMasuk", width: 20 },
      { header: "Dicatat Oleh", key: "dicatatOleh", width: 20 },
      { header: "Keterangan", key: "keterangan", width: 35 },
    ];
    applyHeaderStyle(wsPemasukan);

    let rowPemasukanIdx = 2;
    for (let i = 0; i < pemasukanLainList.length; i++) {
      const item = pemasukanLainList[i];
      const row = wsPemasukan.addRow({
        no: i + 1,
        judul: item.judul,
        kategori: item.kategori,
        nominal: item.nominal,
        tanggalMasuk: item.tanggalMasuk
          ? new Date(item.tanggalMasuk).toLocaleDateString("id-ID")
          : "-",
        dicatatOleh: item.dicatatOleh || "-",
        keterangan: item.keterangan || "-",
      });
      row.height = 20;
      row.getCell("nominal").numFmt = '"Rp" #,##0';
      row.getCell("nominal").alignment = {
        vertical: "middle",
        horizontal: "right",
      };
      rowPemasukanIdx++;
    }

    const totalRowPemasukan = wsPemasukan.addRow({
      no: "",
      judul: "Total Pemasukan Non-Kas",
      kategori: "",
      nominal:
        pemasukanLainList.length > 0
          ? { formula: `SUM(D2:D${rowPemasukanIdx - 1})` }
          : 0,
      tanggalMasuk: "",
      dicatatOleh: "",
      keterangan: "",
    });
    totalRowPemasukan.height = 24;
    totalRowPemasukan.font = { bold: true };
    totalRowPemasukan.getCell("nominal").numFmt = '"Rp" #,##0';
    totalRowPemasukan.getCell("nominal").alignment = {
      vertical: "middle",
      horizontal: "right",
    };

    // Sheet 3: Laporan Pengeluaran Kas
    const wsPengeluaran = workbook.addWorksheet("Laporan Pengeluaran Kas");
    wsPengeluaran.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "Keperluan Belanja", key: "judul", width: 35 },
      { header: "Kategori", key: "kategori", width: 24 },
      { header: "Nominal (Rp)", key: "nominal", width: 20 },
      { header: "Tanggal Belanja", key: "tanggalPengeluaran", width: 20 },
      { header: "Penanggung Jawab", key: "penanggungJawab", width: 25 },
      { header: "Keterangan", key: "keterangan", width: 35 },
    ];
    applyHeaderStyle(wsPengeluaran);

    let rowPengeluaranIdx = 2;
    for (let i = 0; i < pengeluaranList.length; i++) {
      const item = pengeluaranList[i];
      const row = wsPengeluaran.addRow({
        no: i + 1,
        judul: item.judul,
        kategori: item.kategori,
        nominal: item.nominal,
        tanggalPengeluaran: item.tanggalPengeluaran
          ? new Date(item.tanggalPengeluaran).toLocaleDateString("id-ID")
          : "-",
        penanggungJawab: item.penanggungJawab || "-",
        keterangan: item.keterangan || "-",
      });
      row.height = 20;
      row.getCell("nominal").numFmt = '"Rp" #,##0';
      row.getCell("nominal").alignment = {
        vertical: "middle",
        horizontal: "right",
      };
      rowPengeluaranIdx++;
    }

    const totalRowPengeluaran = wsPengeluaran.addRow({
      no: "",
      judul: "Total Pengeluaran Kas",
      kategori: "",
      nominal:
        pengeluaranList.length > 0
          ? { formula: `SUM(D2:D${rowPengeluaranIdx - 1})` }
          : 0,
      tanggalPengeluaran: "",
      penanggungJawab: "",
      keterangan: "",
    });
    totalRowPengeluaran.height = 24;
    totalRowPengeluaran.font = { bold: true };
    totalRowPengeluaran.getCell("nominal").numFmt = '"Rp" #,##0';
    totalRowPengeluaran.getCell("nominal").alignment = {
      vertical: "middle",
      horizontal: "right",
    };

    // Sheet 4: Ringkasan Saldo Kas
    const wsSummary = workbook.addWorksheet("Ringkasan Kas");
    wsSummary.columns = [
      { header: "Komponen Keuangan", key: "komponen", width: 40 },
      { header: "Jumlah (Rp)", key: "jumlah", width: 25 },
    ];
    applyHeaderStyle(wsSummary);

    const sumKasLunas = kasList
      .filter((k) => k.status === "Lunas")
      .reduce((acc, c) => acc + c.nominal, 0);
    const sumPemasukanLain = pemasukanLainList.reduce(
      (acc, c) => acc + c.nominal,
      0
    );
    const sumTotalPemasukan = sumKasLunas + sumPemasukanLain;
    const sumPengeluaran = pengeluaranList.reduce(
      (acc, c) => acc + c.nominal,
      0
    );
    const saldoBersih = sumTotalPemasukan - sumPengeluaran;

    const r1 = wsSummary.addRow({
      komponen: "Total Kas Mahasiswa Lunas",
      jumlah: sumKasLunas,
    });
    r1.getCell("jumlah").numFmt = '"Rp" #,##0';

    const r2 = wsSummary.addRow({
      komponen: "Total Pemasukan Non-Kas",
      jumlah: sumPemasukanLain,
    });
    r2.getCell("jumlah").numFmt = '"Rp" #,##0';

    const r3 = wsSummary.addRow({
      komponen: "TOTAL SEMUA PEMASUKAN",
      jumlah: sumTotalPemasukan,
    });
    r3.font = { bold: true };
    r3.getCell("jumlah").numFmt = '"Rp" #,##0';

    const r4 = wsSummary.addRow({
      komponen: "TOTAL SEMUA PENGELUARAN (CASH OUT)",
      jumlah: sumPengeluaran,
    });
    r4.font = { bold: true, color: { argb: "FFB91C1C" } };
    r4.getCell("jumlah").numFmt = '"Rp" #,##0';

    const r5 = wsSummary.addRow({
      komponen: "SISA SALDO KAS BERSIH SAAT INI",
      jumlah: saldoBersih,
    });
    r5.font = { bold: true, size: 12, color: { argb: "FF047857" } };
    r5.getCell("jumlah").numFmt = '"Rp" #,##0';
    r5.height = 24;

    const dateStr = new Date().toISOString().split("T")[0];
    const semesterName = currentSemester
      ? currentSemester.nama.replace(/[^a-zA-Z0-9_-]/g, "-")
      : "Semua";
    const filename = `Laporan-Kas-${semesterName}-${dateStr}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return next(error);
  }
}

function findValue(row, possibleKeys) {
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const matchedKey = rowKeys.find(
      (k) => k.trim().toLowerCase() === pKey.toLowerCase()
    );
    if (
      matchedKey &&
      row[matchedKey] !== undefined &&
      row[matchedKey] !== null &&
      String(row[matchedKey]).trim() !== ""
    ) {
      return row[matchedKey];
    }
  }
  return undefined;
}

async function importKas(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Berkas file .xlsx atau .csv wajib diunggah",
      });
    }

    let targetSemesterId = req.body.semesterId;
    if (targetSemesterId) {
      if (!mongoose.isValidObjectId(targetSemesterId)) {
        return res.status(400).json({
          success: false,
          message: "ID semester tidak valid",
        });
      }
      const semesterExists = await Semester.findById(targetSemesterId);
      if (!semesterExists) {
        return res.status(404).json({
          success: false,
          message: "Semester tidak ditemukan",
        });
      }
    } else {
      const activeSemester = await Semester.findOne({ isAktif: true });
      if (!activeSemester) {
        return res.status(400).json({
          success: false,
          message:
            "Semester tujuan wajib dipilih karena tidak ada semester aktif",
        });
      }
      targetSemesterId = activeSemester._id;
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({
        success: false,
        message: "Berkas tidak memiliki sheet kerja",
      });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Berkas tidak memuat data baris yang dapat dibaca",
      });
    }

    const validRecords = [];
    const skippedRows = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2;

      const nim = findValue(row, ["NIM", "nim"]);
      const nama = findValue(row, [
        "Nama Mahasiswa",
        "Nama",
        "nama",
        "Nama Lengkap",
      ]);
      const periode = findValue(row, ["Periode", "periode"]) || "Umum";
      const nominalRaw = findValue(row, [
        "Nominal",
        "nominal",
        "Jumlah",
        "jumlah",
      ]);
      const statusRaw = findValue(row, ["Status", "status"]);

      // Abaikan jika baris benar-benar kosong
      if (!nim && !nama && !nominalRaw && !statusRaw) {
        continue;
      }

      // Validasi NIM dan Nama
      if (!nim || !nama || String(nim).trim() === "" || String(nama).trim() === "") {
        skippedRows.push({
          baris: rowNumber,
          alasan: "NIM dan Nama wajib diisi",
          data: row,
        });
        continue;
      }

      // Validasi Nominal
      let parsedNominal = 0;
      if (typeof nominalRaw === "number") {
        parsedNominal = nominalRaw;
      } else if (typeof nominalRaw === "string" && nominalRaw.trim() !== "") {
        const cleaned = nominalRaw
          .replace(/[Rp\s.]/g, "")
          .replace(",", ".");
        parsedNominal = parseFloat(cleaned);
      }

      if (
        typeof parsedNominal !== "number" ||
        Number.isNaN(parsedNominal) ||
        !Number.isFinite(parsedNominal) ||
        parsedNominal < 0
      ) {
        skippedRows.push({
          baris: rowNumber,
          alasan: "Nominal harus berupa angka valid nol atau lebih",
          data: row,
        });
        continue;
      }

      // Validasi Status
      let normalizedStatus = "Belum Lunas";
      if (statusRaw) {
        const lowerStatus = String(statusRaw).toLowerCase().trim();
        if (lowerStatus === "lunas") {
          normalizedStatus = "Lunas";
        } else if (
          lowerStatus === "belum lunas" ||
          lowerStatus === "belum" ||
          lowerStatus === "unpaid"
        ) {
          normalizedStatus = "Belum Lunas";
        } else {
          skippedRows.push({
            baris: rowNumber,
            alasan: "Status harus Lunas atau Belum Lunas",
            data: row,
          });
          continue;
        }
      }

      validRecords.push({
        semesterId: targetSemesterId,
        nim: String(nim).trim(),
        nama: String(nama).trim(),
        periode: String(periode).trim(),
        nominal: parsedNominal,
        status: normalizedStatus,
        tanggalBayar: new Date(),
      });
    }

    if (validRecords.length > 0) {
      await Kas.insertMany(validRecords);

      try {
        await PaymentHistory.create({
          aksi: "IMPORT_EXCEL",
          semesterId: targetSemesterId,
          nama: "Bendahara (Import Excel)",
          keterangan: `Import ${validRecords.length} data kas dari file ${
            req.file.originalname || "Excel"
          }`,
          dataSnapshot: {
            totalData: validRecords.length,
            totalSkipped: skippedRows.length,
            fileName: req.file.originalname,
          },
          waktu: new Date(),
        });
      } catch (historyError) {
        console.error(
          "Gagal mencatat history IMPORT_EXCEL:",
          historyError.message
        );
      }
    }

    return res.json({
      success: true,
      message: `Berhasil mengimpor ${validRecords.length} data kas`,
      data: {
        totalImported: validRecords.length,
        totalSkipped: skippedRows.length,
        skippedRows,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  downloadTemplate,
  exportKas,
  importKas,
};
