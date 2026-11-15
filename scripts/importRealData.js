require("dotenv").config();
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const connectDatabase = require("../src/config/db");
const Semester = require("../src/models/Semester");
const Kas = require("../src/models/Kas");
const PemasukanLain = require("../src/models/PemasukanLain");
const Pengeluaran = require("../src/models/Pengeluaran");
const PaymentHistory = require("../src/models/PaymentHistory");

// Data Mahasiswa Semester 1 (01TPLE009)
// Total bayar dihitung dari Pertemuan Sesi 1 (max 30.000) + Sesi 2 (max 50.000)
const rawMhsSem1 = [
  { no: 1, nama: "ACHMAD ROBBANI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 2, nama: "ALBERTUS GALIH DEWANTORO", bayarSesi1: 30000, bayarSesi2: 20000, refund: 11000 },
  { no: 3, nama: "ALFAHRAS LIFAJRI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 4, nama: "ANDRE DWI ARIFIN", bayarSesi1: 0, bayarSesi2: 0, refund: 0 },
  { no: 5, nama: "ARDHIKA SATYA PRAMESWARA", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 6, nama: "ARKA WAHYUNEGORO", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 7, nama: "ELANG TEGAR PRATAMA", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 8, nama: "FAJAR INDRA SYUHADA", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 9, nama: "FAUZAN NAJMI ARTANSYAH", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 10, nama: "FAZRI WIRA HADI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 11, nama: "FITRIANI ZULFA PUTRI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 12, nama: "HUDA SETIABUDI", bayarSesi1: 30000, bayarSesi2: 10000, refund: 1000 },
  { no: 13, nama: "IJEN", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 14, nama: "MAHARANI SEPTIYANTI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 15, nama: "MUHAMAD RAYHAN", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 16, nama: "MUHAMAD RIO", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 17, nama: "MUHAMMAD ALFARIZI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 18, nama: "MUHAMMAD DAFFA RABBANNII", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 19, nama: "MUHAMMAD HAFIZ HIMAWAN", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 20, nama: "MUHAMMAD NUR FADHILLAH", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 21, nama: "MUHAMMAD RIDWAN", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 22, nama: "RAIKAL FAREL JULIANSYAH", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 23, nama: "RASYA FADILLAH", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 24, nama: "RAZWA BARA", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 25, nama: "RUSSEL RIZKI PRATAMA", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 26, nama: "SAHRUL RAMADHAN", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 27, nama: "SANDI", bayarSesi1: 30000, bayarSesi2: 25000, refund: 16000 },
  { no: 28, nama: "SANDY ISMAWAN", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 29, nama: "SANJAI MANGASI SIREGAR", bayarSesi1: 30000, bayarSesi2: 40000, refund: 31000 },
  { no: 30, nama: "SULTAN ALAMSYAH", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 31, nama: "SYALWA KHUMAINI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 32, nama: "TARUNA TRI SAHID", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
  { no: 33, nama: "WIJI LESTARI", bayarSesi1: 30000, bayarSesi2: 50000, refund: 45000 },
];

const pengeluaranSem1 = [
  { tanggal: "2025-09-20", judul: "Beli Spidol", kategori: "Perlengkapan Kelas", nominal: 18000, pic: "Bendahara" },
  { tanggal: "2025-09-27", judul: "Print Matkul Algoritma", kategori: "Akademik & Materi", nominal: 100000, pic: "Sie Akademik" },
  { tanggal: "2025-10-04", judul: "Fotocopy matkul b.inggris", kategori: "Akademik & Materi", nominal: 30000, pic: "Sie Akademik" },
  { tanggal: "2025-10-09", judul: "Beli Kabel + Colokan", kategori: "Perlengkapan Kelas", nominal: 326000, pic: "Sie Perlengkapan" },
  { tanggal: "2025-11-08", judul: "Beli Tinta Spidol", kategori: "Perlengkapan Kelas", nominal: 23000, pic: "Bendahara" },
  { tanggal: "2025-11-22", judul: "Beli Aqua + klip", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2025-11-29", judul: "Beli Aqua + amplop", kategori: "Acara & Konsumsi", nominal: 4000, pic: "Bendahara" },
  { tanggal: "2025-12-29", judul: "Sumbangan untuk ortu rio", kategori: "Sosial & Santunan", nominal: 500000, pic: "Sie Sosial" },
  { tanggal: "2025-12-06", judul: "Beli Aqua", kategori: "Acara & Konsumsi", nominal: 9000, pic: "Bendahara" },
  { tanggal: "2025-12-13", judul: "beli aqua", kategori: "Acara & Konsumsi", nominal: 9000, pic: "Bendahara" },
  { tanggal: "2025-12-13", judul: "Beli Spidol", kategori: "Perlengkapan Kelas", nominal: 20000, pic: "Bendahara" },
  { tanggal: "2025-12-20", judul: "Survei", kategori: "Lainnya", nominal: 100000, pic: "Ketua Kelas" },
];

// Data Mahasiswa Semester 2 (02TPLE009)
const rawMhsSem2 = [
  { no: 1, nama: "ACHMAD ROBBANI", bayar: 5000, refund: 0 },
  { no: 2, nama: "ANDRE JEREMIA", bayar: 70000, refund: 19000 },
  { no: 3, nama: "ARDHIKA SATYA PRAMESWARA", bayar: 60000, refund: 19000 },
  { no: 4, nama: "ARKA WAHYUNEGORO", bayar: 70000, refund: 19000 },
  { no: 5, nama: "ALFARAS", bayar: 70000, refund: 19000 },
  { no: 6, nama: "DANU SATYA", bayar: 70000, refund: 19000 },
  { no: 7, nama: "ELANG TEGAR PRATAMA", bayar: 15000, refund: 0 },
  { no: 8, nama: "FAJAR INDRA SYUHADA", bayar: 70000, refund: 19000 },
  { no: 9, nama: "FAJJRI ARIEF", bayar: 55000, refund: 19000 },
  { no: 10, nama: "FAUZAN NAJMI ARTANSYAH", bayar: 70000, refund: 19000 },
  { no: 11, nama: "FITRIANI ZULFA PUTRI", bayar: 70000, refund: 19000 },
  { no: 12, nama: "LUTFIANDI BUDIMANSYAH", bayar: 0, refund: 0 },
  { no: 13, nama: "MAHARANI SEPTIYANTI", bayar: 10000, refund: 0 },
  { no: 14, nama: "MUHAMAD RAYHAN", bayar: 70000, refund: 19000 },
  { no: 15, nama: "MUHAMAD RIFAL", bayar: 70000, refund: 19000 },
  { no: 16, nama: "MUHAMAD RIO", bayar: 70000, refund: 19000 },
  { no: 17, nama: "MUHAMMAD ALFARIZI", bayar: 70000, refund: 19000 },
  { no: 18, nama: "MUHAMMAD DAFFA RABBANNII", bayar: 70000, refund: 19000 },
  { no: 19, nama: "MUHAMMAD HAFIZ HIMAWAN", bayar: 70000, refund: 19000 },
  { no: 20, nama: "MUHAMMAD NUR FADHILLAH", bayar: 70000, refund: 19000 },
  { no: 21, nama: "MUHAMMAD RIDWAN", bayar: 70000, refund: 19000 },
  { no: 22, nama: "RAFLI FAHREZI", bayar: 70000, refund: 19000 },
  { no: 23, nama: "RAIKAL FAREL JULIANSYAH", bayar: 55000, refund: 19000 },
  { no: 24, nama: "RASYA FADILLAH", bayar: 60000, refund: 19000 },
  { no: 25, nama: "RAZWA BARA RUSMANA", bayar: 0, refund: 0 },
  { no: 26, nama: "RUSSEL RIZKI PRATAMA", bayar: 70000, refund: 19000 },
  { no: 27, nama: "SAHRUL RAMADHAN", bayar: 55000, refund: 19000 },
  { no: 28, nama: "SANDY ISMAWAN", bayar: 70000, refund: 19000 },
  { no: 29, nama: "SULTAN ALAMSYAH", bayar: 70000, refund: 19000 },
  { no: 30, nama: "SYALWA KHUMAINI", bayar: 40000, refund: 0 },
  { no: 31, nama: "TARUNA TRI SAHID", bayar: 0, refund: 0 },
  { no: 32, nama: "WIJI LESTARI", bayar: 70000, refund: 19000 },
  { no: 33, nama: "WISNU MAHARDIKA", bayar: 70000, refund: 19000 },
];

const pengeluaranSem2 = [
  { tanggal: "2026-04-04", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-04-04", judul: "Print absen", kategori: "Akademik & Materi", nominal: 5000, pic: "Sekretaris" },
  { tanggal: "2026-04-11", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-04-15", judul: "Pengharum ruangan", kategori: "Perlengkapan Kelas", nominal: 18000, pic: "Sie Perlengkapan" },
  { tanggal: "2026-04-18", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-04-25", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 16000, pic: "Bendahara" },
  { tanggal: "2026-05-02", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-05-07", judul: "print rangkuman mk komputer masyarakat", kategori: "Akademik & Materi", nominal: 98000, pic: "Sie Akademik" },
  { tanggal: "2026-05-09", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 20000, pic: "Bendahara" },
  { tanggal: "2026-05-16", judul: "sumbangan untuk rio", kategori: "Sosial & Santunan", nominal: 300000, pic: "Sie Sosial" },
  { tanggal: "2026-05-16", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 20000, pic: "Bendahara" },
  { tanggal: "2026-05-23", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 20000, pic: "Bendahara" },
  { tanggal: "2026-05-30", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 16000, pic: "Bendahara" },
  { tanggal: "2026-06-06", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 20000, pic: "Bendahara" },
  { tanggal: "2026-06-13", judul: "Beli air buat dosen", kategori: "Acara & Konsumsi", nominal: 20000, pic: "Bendahara" },
  { tanggal: "2026-06-13", judul: "sumbangan untuk sultan", kategori: "Sosial & Santunan", nominal: 300000, pic: "Sie Sosial" },
  { tanggal: "2026-06-20", judul: "Beli air sama spidol", kategori: "Perlengkapan Kelas", nominal: 44000, pic: "Bendahara" },
  { tanggal: "2026-06-23", judul: "sumbangan untuk rasya", kategori: "Sosial & Santunan", nominal: 300000, pic: "Sie Sosial" },
  { tanggal: "2026-06-27", judul: "beli air", kategori: "Acara & Konsumsi", nominal: 20000, pic: "Bendahara" },
];

// Data Mahasiswa Semester 3 (Aktif)
const rawMhsSem3 = [
  { no: 1, nama: "AHMAD SYAUQI", bayar: 10000 },
  { no: 2, nama: "AL DANI", bayar: 10000 },
  { no: 3, nama: "ANDRE JEREMIA", bayar: 20000 },
  { no: 4, nama: "ARDHIKA SATYA PRAMESWARA", bayar: 10000 },
  { no: 5, nama: "ARKA WAHYUNEGORO", bayar: 10000 },
  { no: 6, nama: "DANU SATYA", bayar: 10000 },
  { no: 7, nama: "DIMAS BAYU TIRTA", bayar: 10000 },
  { no: 8, nama: "DONY KURNIAWAN", bayar: 10000 },
  { no: 9, nama: "FAIZ HISAM", bayar: 10000 },
  { no: 10, nama: "FAJAR INDRA SYUHADA", bayar: 10000 },
  { no: 11, nama: "FAUZAN NAJMI ARTANSYAH", bayar: 10000 },
  { no: 12, nama: "FITRIANI ZULFA PUTRI", bayar: 10000 },
  { no: 13, nama: "MUHAMAD RAYHAN", bayar: 10000 },
  { no: 14, nama: "MUHAMAD RIFAL", bayar: 10000 },
  { no: 15, nama: "MUHAMAD RIO", bayar: 10000 },
  { no: 16, nama: "MUHAMAD ZAKIATUL AKBAR", bayar: 10000 },
  { no: 17, nama: "MUHAMMAD ALFARIZI", bayar: 10000 },
  { no: 18, nama: "MUHAMMAD DAFFA RABBANNII", bayar: 10000 },
  { no: 19, nama: "MUHAMMAD HAFIZ HIMAWAN", bayar: 10000 },
  { no: 20, nama: "MUHAMMAD NUR FADHILLAH", bayar: 0 },
  { no: 21, nama: "MUHAMMAD RIDWAN", bayar: 10000 },
  { no: 22, nama: "RAFLI FAHREZI", bayar: 10000 },
  { no: 23, nama: "RAIHAN ADDO GIBRAN PRIADI", bayar: 10000 },
  { no: 24, nama: "RAIKAL FARREL JULIANSYAH", bayar: 10000 },
  { no: 25, nama: "RASYA PADILLAH", bayar: 0 },
  { no: 26, nama: "REZA NICO SAPUTRA", bayar: 10000 },
  { no: 27, nama: "RUSSEL RIZKI PRATAMA", bayar: 10000 },
  { no: 28, nama: "SAHRUL RAMADHAN", bayar: 20000 },
  { no: 29, nama: "SANDY ISMAWAN", bayar: 10000 },
  { no: 30, nama: "SITI LIYANI", bayar: 10000 },
  { no: 31, nama: "SULTAN ALAMSYAH", bayar: 10000 },
  { no: 32, nama: "WIJI LESTARI", bayar: 10000 },
  { no: 33, nama: "WISNU MAHARDIKA", bayar: 10000 },
];

const pengeluaranSem3 = [
  { tanggal: "2026-09-05", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 16000, pic: "Bendahara" },
  { tanggal: "2026-09-12", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 16000, pic: "Bendahara" },
  { tanggal: "2026-09-19", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 18000, pic: "Bendahara" },
  { tanggal: "2026-09-26", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-10-03", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-10-10", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-10-10", judul: "BELI SPIDOL", kategori: "Perlengkapan Kelas", nominal: 50000, pic: "Bendahara" },
  { tanggal: "2026-10-17", judul: "BELI MINUM DOSEN TISU", kategori: "Acara & Konsumsi", nominal: 17000, pic: "Bendahara" },
  { tanggal: "2026-10-17", judul: "SUMBANGAN AHMAD SYAUQI", kategori: "Sosial & Santunan", nominal: 60000, pic: "Sie Sosial" },
  { tanggal: "2026-10-24", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-10-24", judul: "BELI KLIP KERTAS", kategori: "Perlengkapan Kelas", nominal: 5000, pic: "Bendahara" },
  { tanggal: "2026-10-31", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-11-07", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-11-14", judul: "BELI MINUM DOSEN", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2026-11-14", judul: "BELI KLIP KERTAS", kategori: "Perlengkapan Kelas", nominal: 5000, pic: "Bendahara" },
];

function generateMaskedNim(no) {
  const pad = String(no).padStart(2, "0");
  return `251******${pad}`;
}

async function runImport() {
  console.log("Menghubungkan ke MongoDB Atlas...");
  await connectDatabase();
  console.log("✓ Terhubung ke MongoDB Atlas:", mongoose.connection.name);

  console.log("\nMembersihkan database lama...");
  await Promise.all([
    Semester.deleteMany({}),
    Kas.deleteMany({}),
    PemasukanLain.deleteMany({}),
    Pengeluaran.deleteMany({}),
    PaymentHistory.deleteMany({}),
  ]);

  // 1. Buat 3 Semester
  console.log("\n1. Membuat 3 Master Semester...");
  const sem1 = await Semester.create({
    nama: "Semester 1 (01TPLE009)",
    kode: "2025-1",
    isAktif: false,
    targetKasPerMhs: 80000,
    tanggalMulai: new Date("2025-09-20"),
    tanggalSelesai: new Date("2026-01-31"),
  });

  const sem2 = await Semester.create({
    nama: "Semester 2 (02TPLE009)",
    kode: "2026-1",
    isAktif: false,
    targetKasPerMhs: 70000,
    tanggalMulai: new Date("2026-03-07"),
    tanggalSelesai: new Date("2026-07-04"),
  });

  const sem3 = await Semester.create({
    nama: "Semester 3 (02TPLE009)",
    kode: "2026-2",
    isAktif: true,
    targetKasPerMhs: 10000,
    tanggalMulai: new Date("2026-07-07"),
    tanggalSelesai: new Date("2026-12-31"),
  });
  console.log("✓ Semester 1, 2, dan 3 berhasil dibuat. Semester 3 berstatus AKTIF.");

  // ================= SEMESTER 1 =================
  console.log("\n2. Mengisi data Semester 1...");
  const kasSem1 = rawMhsSem1.map((m) => {
    const totalBayar = m.bayarSesi1 + m.bayarSesi2;
    const isLunas = totalBayar >= 80000;
    return {
      semesterId: sem1._id,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      periode: "September - Desember 2025",
      nominal: totalBayar,
      status: isLunas ? "Lunas" : "Belum Lunas",
      metodePembayaran: "Tunai",
      tanggalBayar: new Date("2025-10-15"),
    };
  });
  await Kas.insertMany(kasSem1);

  await PemasukanLain.create({
    semesterId: sem1._id,
    judul: "Uang sisa pembayaran seminar agama",
    kategori: "Lainnya",
    nominal: 15000,
    tanggalMasuk: new Date("2025-11-15"),
    dicatatOleh: "Bendahara",
    keterangan: "Sisa pembayaran seminar agama kelas",
  });

  const pengeluaran1Data = pengeluaranSem1.map((p) => ({
    semesterId: sem1._id,
    judul: p.judul,
    kategori: p.kategori,
    nominal: p.nominal,
    tanggalPengeluaran: new Date(p.tanggal),
    penanggungJawab: p.pic,
    dicatatOleh: "Bendahara",
  }));
  await Pengeluaran.insertMany(pengeluaran1Data);

  // ================= SEMESTER 2 =================
  console.log("\n3. Mengisi data Semester 2...");
  const kasSem2 = rawMhsSem2.map((m) => {
    const isLunas = m.bayar >= 70000;
    return {
      semesterId: sem2._id,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      periode: "Maret - Juli 2026",
      nominal: m.bayar,
      status: isLunas ? "Lunas" : "Belum Lunas",
      metodePembayaran: "Tunai",
      tanggalBayar: new Date("2026-04-18"),
    };
  });
  await Kas.insertMany(kasSem2);

  const pengeluaran2Data = pengeluaranSem2.map((p) => ({
    semesterId: sem2._id,
    judul: p.judul,
    kategori: p.kategori,
    nominal: p.nominal,
    tanggalPengeluaran: new Date(p.tanggal),
    penanggungJawab: p.pic,
    dicatatOleh: "Bendahara",
  }));
  await Pengeluaran.insertMany(pengeluaran2Data);

  // ================= SEMESTER 3 (AKTIF) =================
  console.log("\n4. Mengisi data Semester 3 (Aktif)...");
  const kasSem3 = rawMhsSem3.map((m) => {
    const isLunas = m.bayar >= 10000;
    return {
      semesterId: sem3._id,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      periode: "Juli - Desember 2026",
      nominal: m.bayar,
      status: isLunas ? "Lunas" : "Belum Lunas",
      metodePembayaran: "Tunai",
      tanggalBayar: new Date("2026-09-19"),
    };
  });
  await Kas.insertMany(kasSem3);

  // Pemasukan Lain Semester 3:
  // Sisa Semester 1 & 2 = 90.000 + Kas UTS 310.000 + Kas UAS 20.000
  const pemasukanSem3Data = [
    {
      semesterId: sem3._id,
      judul: "KAS SEMESTER 2 & 1 (Sisa Saldo Lalu)",
      kategori: "Sisa Semester Lalu",
      nominal: 90000,
      tanggalMasuk: new Date("2026-07-07"),
      dicatatOleh: "Bendahara",
      keterangan: "Sisa saldo kas semester 1 dan semester 2 yang dialihkan ke semester 3",
    },
    {
      semesterId: sem3._id,
      judul: "Kas Masuk UTS",
      kategori: "Dana Usaha",
      nominal: 310000,
      tanggalMasuk: new Date("2026-09-19"),
      dicatatOleh: "Bendahara",
      keterangan: "Kas tambahan periode Ujian Tengah Semester",
    },
    {
      semesterId: sem3._id,
      judul: "Kas Masuk UAS",
      kategori: "Dana Usaha",
      nominal: 20000,
      tanggalMasuk: new Date("2026-10-20"),
      dicatatOleh: "Bendahara",
      keterangan: "Kas tambahan periode Ujian Akhir Semester",
    },
  ];
  await PemasukanLain.insertMany(pemasukanSem3Data);

  const pengeluaran3Data = pengeluaranSem3.map((p) => ({
    semesterId: sem3._id,
    judul: p.judul,
    kategori: p.kategori,
    nominal: p.nominal,
    tanggalPengeluaran: new Date(p.tanggal),
    penanggungJawab: p.pic,
    dicatatOleh: "Bendahara",
  }));
  await Pengeluaran.insertMany(pengeluaran3Data);

  // Buat Log Riwayat Audit
  const sampleHistories = [
    {
      semesterId: sem3._id,
      aksi: "IMPORT_EXCEL",
      nama: "Bendahara",
      keterangan: "Import data kas mahasiswa kelas 02TPLE009",
      waktu: new Date("2026-07-07"),
    },
    {
      semesterId: sem3._id,
      aksi: "CREATE",
      nim: "251******03",
      nama: "ANDRE JEREMIA",
      nominal: 20000,
      statusBaru: "Lunas",
      keterangan: "Pembayaran kas mahasiswa Rp 20.000",
      waktu: new Date("2026-09-19"),
    },
    {
      semesterId: sem3._id,
      aksi: "EXPENSE_CREATE",
      nama: "Bendahara",
      nominal: 50000,
      keterangan: "Pengeluaran kas: BELI SPIDOL (Perlengkapan Kelas)",
      waktu: new Date("2026-10-10"),
    },
    {
      semesterId: sem3._id,
      aksi: "EXPENSE_CREATE",
      nama: "Sie Sosial",
      nominal: 60000,
      keterangan: "Pengeluaran kas: SUMBANGAN AHMAD SYAUQI (Sosial & Santunan)",
      waktu: new Date("2026-10-17"),
    },
  ];
  await PaymentHistory.insertMany(sampleHistories);

  console.log("\n=======================================================");
  console.log("🎉 SELURUH DATA REAL TELAH BERHASIL DI-IMPORT KE ATLAS!");
  console.log("=======================================================");
  console.log("• Semester 1: 33 Mahasiswa, 12 Pengeluaran, 1 Pemasukan Lain");
  console.log("• Semester 2: 33 Mahasiswa, 19 Pengeluaran, Saldo Sisa Di-refund & Sisa 90k ke Sem 3");
  console.log("• Semester 3: 33 Mahasiswa, 15 Pengeluaran, Sisa Lalu Rp 90k + Kas UTS/UAS");
  console.log("• Format NIM: 251******01 s/d 251******33");
  console.log("=======================================================\n");

  // ================= GENERATE FILE EXCEL RAPI =================
  console.log("Membuat file Excel rapi: data-kas-kampus-rapi.xlsx ...");
  const workbook = new ExcelJS.Workbook();

  const applyHeader = (sheet, bgColor = "FF059669") => {
    sheet.getRow(1).height = 25;
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
  };

  // Sheet 1: Ringkasan Saldo Antar Semester
  const wsSummary = workbook.addWorksheet("Ringkasan Kas");
  wsSummary.columns = [
    { header: "Keterangan Semester", key: "desc", width: 32 },
    { header: "Total Pemasukan", key: "in", width: 20 },
    { header: "Total Pengeluaran", key: "out", width: 20 },
    { header: "Pengembalian (Refund)", key: "ref", width: 24 },
    { header: "Sisa Saldo Kas", key: "balance", width: 20 },
    { header: "Status / Catatan", key: "status", width: 35 },
  ];
  applyHeader(wsSummary, "FF1E293B");

  const summaryData = [
    {
      desc: "Semester 1 (01TPLE009)",
      in: 2470000,
      out: 1151000,
      ref: 1319000,
      balance: 0,
      status: "Selesai - Sisa dana 100% dibagikan kembali ke mahasiswa",
    },
    {
      desc: "Semester 2 (02TPLE009)",
      in: 1825000,
      out: 1265000,
      ref: 494000,
      balance: 66000,
      status: "Selesai - Sisa tabel 560k dibagi refund 494k, sisa 90k ke Sem 3",
    },
    {
      desc: "Semester 3 (02TPLE009 - AKTIF)",
      in: 750000,
      out: 271000,
      ref: 0,
      balance: 479000,
      status: "Aktif Berjalan (Saldo lalu 90k + Kas 330k + UTS 310k + UAS 20k)",
    },
  ];
  summaryData.forEach((item) => {
    const row = wsSummary.addRow(item);
    row.getCell("in").numFmt = '"Rp" #,##0';
    row.getCell("out").numFmt = '"Rp" #,##0';
    row.getCell("ref").numFmt = '"Rp" #,##0';
    row.getCell("balance").numFmt = '"Rp" #,##0';
  });

  // Sheet 2: Semester 3 (Aktif)
  const wsSem3 = workbook.addWorksheet("Semester 3 (Aktif)");
  wsSem3.columns = [
    { header: "No", key: "no", width: 8 },
    { header: "NIM", key: "nim", width: 20 },
    { header: "Nama Mahasiswa", key: "nama", width: 32 },
    { header: "Total Bayar", key: "bayar", width: 18 },
    { header: "Status", key: "status", width: 18 },
  ];
  applyHeader(wsSem3);
  rawMhsSem3.forEach((m) => {
    const row = wsSem3.addRow({
      no: m.no,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      bayar: m.bayar,
      status: m.bayar >= 10000 ? "Lunas" : "Belum Lunas",
    });
    row.getCell("bayar").numFmt = '"Rp" #,##0';
  });

  // Sheet 3: Pengeluaran Semester 3
  const wsOut3 = workbook.addWorksheet("Pengeluaran Semester 3");
  wsOut3.columns = [
    { header: "Tanggal", key: "tgl", width: 18 },
    { header: "Keperluan", key: "judul", width: 32 },
    { header: "Kategori", key: "kat", width: 22 },
    { header: "Nominal", key: "nom", width: 18 },
    { header: "PIC", key: "pic", width: 20 },
  ];
  applyHeader(wsOut3, "FFE11D48");
  pengeluaranSem3.forEach((p) => {
    const row = wsOut3.addRow({
      tgl: p.tanggal,
      judul: p.judul,
      kat: p.kategori,
      nom: p.nominal,
      pic: p.pic,
    });
    row.getCell("nom").numFmt = '"Rp" #,##0';
  });

  // Sheet 4: Pemasukan Lain Semester 3
  const wsIn3 = workbook.addWorksheet("Pemasukan Lain Sem 3");
  wsIn3.columns = [
    { header: "Tanggal", key: "tgl", width: 18 },
    { header: "Keterangan", key: "judul", width: 35 },
    { header: "Kategori", key: "kat", width: 22 },
    { header: "Nominal", key: "nom", width: 18 },
  ];
  applyHeader(wsIn3, "FF2563EB");
  pemasukanSem3Data.forEach((p) => {
    const row = wsIn3.addRow({
      tgl: p.tanggalMasuk.toISOString().split("T")[0],
      judul: p.judul,
      kat: p.kategori,
      nom: p.nominal,
    });
    row.getCell("nom").numFmt = '"Rp" #,##0';
  });

  // Sheet 5: Semester 2
  const wsSem2 = workbook.addWorksheet("Semester 2 (02TPLE009)");
  wsSem2.columns = [
    { header: "No", key: "no", width: 8 },
    { header: "NIM", key: "nim", width: 20 },
    { header: "Nama Mahasiswa", key: "nama", width: 32 },
    { header: "Total Bayar", key: "bayar", width: 18 },
    { header: "Pengembalian (Refund)", key: "ref", width: 22 },
  ];
  applyHeader(wsSem2);
  rawMhsSem2.forEach((m) => {
    const row = wsSem2.addRow({
      no: m.no,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      bayar: m.bayar,
      ref: m.refund,
    });
    row.getCell("bayar").numFmt = '"Rp" #,##0';
    row.getCell("ref").numFmt = '"Rp" #,##0';
  });

  // Sheet 6: Pengeluaran Semester 2
  const wsOut2 = workbook.addWorksheet("Pengeluaran Semester 2");
  wsOut2.columns = [
    { header: "Tanggal", key: "tgl", width: 18 },
    { header: "Keperluan", key: "judul", width: 35 },
    { header: "Kategori", key: "kat", width: 22 },
    { header: "Nominal", key: "nom", width: 18 },
    { header: "PIC", key: "pic", width: 20 },
  ];
  applyHeader(wsOut2, "FFE11D48");
  pengeluaranSem2.forEach((p) => {
    const row = wsOut2.addRow({
      tgl: p.tanggal,
      judul: p.judul,
      kat: p.kategori,
      nom: p.nominal,
      pic: p.pic,
    });
    row.getCell("nom").numFmt = '"Rp" #,##0';
  });

  // Sheet 7: Semester 1
  const wsSem1 = workbook.addWorksheet("Semester 1 (01TPLE009)");
  wsSem1.columns = [
    { header: "No", key: "no", width: 8 },
    { header: "NIM", key: "nim", width: 20 },
    { header: "Nama Mahasiswa", key: "nama", width: 32 },
    { header: "Total Bayar", key: "bayar", width: 18 },
    { header: "Pengembalian (Refund)", key: "ref", width: 22 },
  ];
  applyHeader(wsSem1);
  rawMhsSem1.forEach((m) => {
    const row = wsSem1.addRow({
      no: m.no,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      bayar: m.bayarSesi1 + m.bayarSesi2,
      ref: m.refund,
    });
    row.getCell("bayar").numFmt = '"Rp" #,##0';
    row.getCell("ref").numFmt = '"Rp" #,##0';
  });

  // Sheet 8: Pengeluaran Semester 1
  const wsOut1 = workbook.addWorksheet("Pengeluaran Semester 1");
  wsOut1.columns = [
    { header: "Tanggal", key: "tgl", width: 18 },
    { header: "Keperluan", key: "judul", width: 35 },
    { header: "Kategori", key: "kat", width: 22 },
    { header: "Nominal", key: "nom", width: 18 },
    { header: "PIC", key: "pic", width: 20 },
  ];
  applyHeader(wsOut1, "FFE11D48");
  pengeluaranSem1.forEach((p) => {
    const row = wsOut1.addRow({
      tgl: p.tanggal,
      judul: p.judul,
      kat: p.kategori,
      nom: p.nominal,
      pic: p.pic,
    });
    row.getCell("nom").numFmt = '"Rp" #,##0';
  });

  await workbook.xlsx.writeFile("data-kas-kampus-rapi.xlsx");
  console.log("✓ File data-kas-kampus-rapi.xlsx berhasil disimpan!");
}

if (require.main === module) {
  runImport()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Terjadi kesalahan:", err);
      mongoose.disconnect().finally(() => process.exit(1));
    });
}
