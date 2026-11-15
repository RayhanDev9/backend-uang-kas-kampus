require("dotenv").config();
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const connectDatabase = require("../src/config/db");
const Semester = require("../src/models/Semester");
const Kas = require("../src/models/Kas");
const PemasukanLain = require("../src/models/PemasukanLain");
const Pengeluaran = require("../src/models/Pengeluaran");
const PaymentHistory = require("../src/models/PaymentHistory");

// ==========================================
// 1. DATA MAHASISWA KELAS SATU
// File: laporan_kas_kelas_01tple009.md
// Semester Ganjil 2025/2026 (01TPLE009)
// ==========================================
const rawMhsSem1 = [
  { no: 1, nama: "ACHMAD ROBBANI", bayar: 50000, refund: 45000 },
  { no: 2, nama: "ALBERTUS GALIH DEWANTORO", bayar: 20000, refund: 11000 },
  { no: 3, nama: "ALFAHRAS LIFAJRI", bayar: 50000, refund: 45000 },
  { no: 4, nama: "ANDRE DWI ARIFIN", bayar: 0, refund: 0 },
  { no: 5, nama: "ARDHIKA SATYA PRAMESWARA", bayar: 50000, refund: 45000 },
  { no: 6, nama: "ARKA WAHYUNEGORO", bayar: 50000, refund: 45000 },
  { no: 7, nama: "ELANG TEGAR PRATAMA", bayar: 50000, refund: 45000 },
  { no: 8, nama: "FAJAR INDRA SYUHADA", bayar: 50000, refund: 45000 },
  { no: 9, nama: "FAUZAN NAJMI ARTANSYAH", bayar: 50000, refund: 45000 },
  { no: 10, nama: "FAZRI WIRA HADI", bayar: 50000, refund: 45000 },
  { no: 11, nama: "FITRIANI ZULFA PUTRI", bayar: 50000, refund: 45000 },
  { no: 12, nama: "HUDA SETIABUDI", bayar: 10000, refund: 1000 },
  { no: 13, nama: "IJEN", bayar: 50000, refund: 45000 },
  { no: 14, nama: "MAHARANI SEPTIYANTI", bayar: 50000, refund: 45000 },
  { no: 15, nama: "MUHAMAD RAYHAN", bayar: 50000, refund: 45000 },
  { no: 16, nama: "MUHAMAD RIO", bayar: 50000, refund: 45000 },
  { no: 17, nama: "MUHAMMAD ALFARIZI", bayar: 50000, refund: 45000 },
  { no: 18, nama: "MUHAMMAD DAFFA RABBANNII", bayar: 50000, refund: 45000 },
  { no: 19, nama: "MUHAMMAD HAFIZ HIMAWAN", bayar: 50000, refund: 45000 },
  { no: 20, nama: "MUHAMMAD NUR FADHILLAH", bayar: 50000, refund: 45000 },
  { no: 21, nama: "MUHAMMAD RIDWAN", bayar: 50000, refund: 45000 },
  { no: 22, nama: "RAIKAL FAREL JULIANSYAH", bayar: 50000, refund: 45000 },
  { no: 23, nama: "RASYA FADILLAH", bayar: 50000, refund: 45000 },
  { no: 24, nama: "RAZWA BARA", bayar: 50000, refund: 45000 },
  { no: 25, nama: "RUSSEL RIZKI PRATAMA", bayar: 50000, refund: 45000 },
  { no: 26, nama: "SAHRUL RAMADHAN", bayar: 50000, refund: 45000 },
  { no: 27, nama: "SANDI", bayar: 25000, refund: 16000 },
  { no: 28, nama: "SANDY ISMAWAN", bayar: 50000, refund: 45000 },
  { no: 29, nama: "SANJAI MANGASI SIREGAR", bayar: 40000, refund: 31000 },
  { no: 30, nama: "SULTAN ALAMSYAH", bayar: 50000, refund: 45000 },
  { no: 31, nama: "SYALWA KHUMAINI", bayar: 50000, refund: 45000 },
  { no: 32, nama: "TARUNA TRI SAHID", bayar: 50000, refund: 45000 },
  { no: 33, nama: "WIJI LESTARI", bayar: 50000, refund: 45000 },
];

const pengeluaranSem1 = [
  { tanggal: "2025-09-20", judul: "Beli Spidol", kategori: "Perlengkapan Kelas", nominal: 18000, pic: "Bendahara" },
  { tanggal: "2025-09-27", judul: "Print Matkul Algoritma", kategori: "Akademik & Materi", nominal: 100000, pic: "Sie Akademik" },
  { tanggal: "2025-10-04", judul: "Fotocopy matkul b.inggris", kategori: "Akademik & Materi", nominal: 30000, pic: "Sie Akademik" },
  { tanggal: "2025-10-09", judul: "Beli Kabel + Colokan", kategori: "Perlengkapan Kelas", nominal: 326000, pic: "Sie Perlengkapan" },
  { tanggal: "2025-11-08", judul: "Beli Tinta Spidol", kategori: "Perlengkapan Kelas", nominal: 23000, pic: "Bendahara" },
  { tanggal: "2025-11-22", judul: "Beli Aqua + klip", kategori: "Acara & Konsumsi", nominal: 12000, pic: "Bendahara" },
  { tanggal: "2025-11-29", judul: "Beli Aqua + amplop", kategori: "Acara & Konsumsi", nominal: 4000, pic: "Bendahara" },
  { tanggal: "2025-12-06", judul: "Beli Aqua", kategori: "Acara & Konsumsi", nominal: 9000, pic: "Bendahara" },
  { tanggal: "2025-12-13", judul: "beli aqua", kategori: "Acara & Konsumsi", nominal: 9000, pic: "Bendahara" },
  { tanggal: "2025-12-13", judul: "Beli Spidol", kategori: "Perlengkapan Kelas", nominal: 20000, pic: "Bendahara" },
  { tanggal: "2025-12-20", judul: "Survei", kategori: "Lainnya", nominal: 100000, pic: "Ketua Kelas" },
  { tanggal: "2025-12-29", judul: "Sumbangan untuk ortu rio", kategori: "Sosial & Santunan", nominal: 500000, pic: "Sie Sosial" },
  { tanggal: "2025-12-29", judul: "Pengembalian Sisa Kas ke Mahasiswa (Refund)", kategori: "Pengembalian Kas", nominal: 1319000, pic: "Bendahara (Syalwa & Wiji)" },
];

// ==========================================
// 2. DATA MAHASISWA KELAS DUA
// File: laporan_kas_kelas_02tple009_semester_2.md
// Semester Genap 2025/2026 (02TPLE009)
// ==========================================
const rawMhsSem2 = [
  { no: 1, nama: "ACHMAD ROBBANI", bayar: 5000, refund: 0 },
  { no: 2, nama: "ANDRE JEREMIA", bayar: 70000, refund: 19000 },
  { no: 3, nama: "ARDHIKA SATYA PRAMESWARA", bayar: 60000, refund: 9000 },
  { no: 4, nama: "ARKA WAHYUNEGORO", bayar: 70000, refund: 19000 },
  { no: 5, nama: "ALFARAS", bayar: 70000, refund: 19000 },
  { no: 6, nama: "DANU SATYA", bayar: 70000, refund: 19000 },
  { no: 7, nama: "ELANG TEGAR PRATAMA", bayar: 15000, refund: 0 },
  { no: 8, nama: "FAJAR INDRA SYUHADA", bayar: 70000, refund: 19000 },
  { no: 9, nama: "FAJJRI ARIEF", bayar: 55000, refund: 4000 },
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
  { no: 23, nama: "RAIKAL FAREL JULIANSYAH", bayar: 55000, refund: 4000 },
  { no: 24, nama: "RASYA FADILLAH", bayar: 60000, refund: 9000 },
  { no: 25, nama: "RAZWA BARA RUSMANA", bayar: 0, refund: 0 },
  { no: 26, nama: "RUSSEL RIZKI PRATAMA", bayar: 70000, refund: 19000 },
  { no: 27, nama: "SAHRUL RAMADHAN", bayar: 55000, refund: 4000 },
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
  { tanggal: "2026-06-27", judul: "Pengembalian Sisa Kas ke Mahasiswa (Refund)", kategori: "Pengembalian Kas", nominal: 470000, pic: "Bendahara Kelas" },
];

// ==========================================
// 3. DATA MAHASISWA KELAS TIGA
// File: laporan_kas_kelas_semester_3.md
// Semester Ganjil 2026/2027 (02TPLE009 - AKTIF)
// ==========================================
const rawMhsSem3 = [
  { no: 1, nama: "AHMAD SYAUQI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 2, nama: "AL DANI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 3, nama: "ANDRE JEREMIA", bayarUts: 10000, bayarUas: 10000, bayar: 20000 },
  { no: 4, nama: "ARDHIKA SATYA PRAMESWARA", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 5, nama: "ARKA WAHYUNEGORO", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 6, nama: "DANU SATYA", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 7, nama: "DIMAS BAYU TIRTA", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 8, nama: "DONY KURNIAWAN", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 9, nama: "FAIZ HISAM", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 10, nama: "FAJAR INDRA SYUHADA", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 11, nama: "FAUZAN NAJMI ARTANSYAH", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 12, nama: "FITRIANI ZULFA PUTRI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 13, nama: "MUHAMAD RAYHAN", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 14, nama: "MUHAMAD RIFAL", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 15, nama: "MUHAMAD RIO", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 16, nama: "MUHAMAD ZAKIATUL AKBAR", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 17, nama: "MUHAMMAD ALFARIZI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 18, nama: "MUHAMMAD DAFFA RABBANNII", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 19, nama: "MUHAMMAD HAFIZ HIMAWAN", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 20, nama: "MUHAMMAD NUR FADHILLAH", bayarUts: 0, bayarUas: 0, bayar: 0 },
  { no: 21, nama: "MUHAMMAD RIDWAN", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 22, nama: "RAFLI FAHREZI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 23, nama: "RAIHAN ADDO GIBRAN PRIADI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 24, nama: "RAIKAL FARREL JULIANSYAH", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 25, nama: "RASYA PADILLAH", bayarUts: 0, bayarUas: 0, bayar: 0 },
  { no: 26, nama: "REZA NICO SAPUTRA", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 27, nama: "RUSSEL RIZKI PRATAMA", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 28, nama: "SAHRUL RAMADHAN", bayarUts: 10000, bayarUas: 10000, bayar: 20000 },
  { no: 29, nama: "SANDY ISMAWAN", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 30, nama: "SITI LIYANI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 31, nama: "SULTAN ALAMSYAH", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 32, nama: "WIJI LESTARI", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
  { no: 33, nama: "WISNU MAHARDIKA", bayarUts: 10000, bayarUas: 0, bayar: 10000 },
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

  // 1. Buat 3 Master Semester sesuai penamaan file .md
  console.log("\n1. Membuat 3 Master Semester...");
  const daftarPertemuanSem1 = [
    { pertemuanKe: 1, tanggal: "11/10", label: "Pertemuan 1" },
    { pertemuanKe: 2, tanggal: "18/10", label: "Pertemuan 2" },
    { pertemuanKe: 3, tanggal: "25/10", label: "Pertemuan 3" },
    { pertemuanKe: 4, tanggal: "01/11", label: "Pertemuan 4" },
    { pertemuanKe: 5, tanggal: "08/11", label: "Pertemuan 5" },
    { pertemuanKe: 6, tanggal: "15/11", label: "Pertemuan 6" },
    { pertemuanKe: 7, tanggal: "22/11", label: "Pertemuan 7" },
    { pertemuanKe: 8, tanggal: "29/11", label: "Pertemuan 8" },
    { pertemuanKe: 9, tanggal: "06/12", label: "Pertemuan 9" },
    { pertemuanKe: 10, tanggal: "13/12", label: "Pertemuan 10" },
  ];

  const daftarPertemuanSem2 = [
    { pertemuanKe: 1, tanggal: "07/03", label: "Pertemuan 1" },
    { pertemuanKe: 2, tanggal: "14/03", label: "Pertemuan 2" },
    { pertemuanKe: 3, tanggal: "21/03", label: "Pertemuan 3" },
    { pertemuanKe: 4, tanggal: "28/03", label: "Pertemuan 4" },
    { pertemuanKe: 5, tanggal: "04/04", label: "Pertemuan 5" },
    { pertemuanKe: 6, tanggal: "11/04", label: "Pertemuan 6" },
    { pertemuanKe: 7, tanggal: "18/04", label: "Pertemuan 7" },
    { pertemuanKe: 8, tanggal: "25/04", label: "Pertemuan 8" },
    { pertemuanKe: 9, tanggal: "02/05", label: "Pertemuan 9" },
    { pertemuanKe: 10, tanggal: "09/05", label: "Pertemuan 10" },
    { pertemuanKe: 11, tanggal: "16/05", label: "Pertemuan 11" },
    { pertemuanKe: 12, tanggal: "23/05", label: "Pertemuan 12" },
    { pertemuanKe: 13, tanggal: "30/05", label: "Pertemuan 13" },
    { pertemuanKe: 14, tanggal: "06/06", label: "Pertemuan 14" },
  ];

  const sem1 = await Semester.create({
    nama: "Semester Ganjil 2025/2026",
    kode: "2025-GANJIL",
    isAktif: false,
    tipeIuran: "MINGGUAN",
    nominalPerMinggu: 5000,
    daftarPertemuan: daftarPertemuanSem1,
    targetKasPerMhs: 50000,
    tanggalMulai: new Date("2025-09-20"),
    tanggalSelesai: new Date("2025-12-29"),
  });

  const sem2 = await Semester.create({
    nama: "Semester Genap 2025/2026",
    kode: "2025-GENAP",
    isAktif: false,
    tipeIuran: "MINGGUAN",
    nominalPerMinggu: 5000,
    daftarPertemuan: daftarPertemuanSem2,
    targetKasPerMhs: 70000,
    tanggalMulai: new Date("2026-03-07"),
    tanggalSelesai: new Date("2026-06-27"),
  });

  const sem3 = await Semester.create({
    nama: "Semester Ganjil 2026/2027",
    kode: "2026-GANJIL",
    isAktif: true,
    tipeIuran: "SEKALI_BAYAR",
    nominalPerMinggu: 0,
    daftarPertemuan: [],
    targetKasPerMhs: 20000,
    tanggalMulai: new Date("2026-07-07"),
    tanggalSelesai: new Date("2026-11-14"),
  });
  console.log("✓ Semester 1 (Ganjil 2025/2026), 2 (Genap 2025/2026), dan 3 (Ganjil 2026/2027 Aktif) berhasil dibuat.");

  // ================= SEMESTER 1 =================
  console.log("\n2. Mengisi data Semester Ganjil 2025/2026 (01TPLE009)...");
  const kasSem1 = rawMhsSem1.map((m) => {
    const isLunas = m.bayar >= 50000;
    const paidWeeks = Math.min(10, Math.floor(m.bayar / 5000));
    const detailMingguan = daftarPertemuanSem1.map((p) => ({
      pertemuanKe: p.pertemuanKe,
      tanggal: p.tanggal,
      bayar: p.pertemuanKe <= paidWeeks,
      nominal: 5000,
    }));

    return {
      semesterId: sem1._id,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      periode: "11 Okt – 20 Des 2025",
      nominal: m.bayar,
      status: isLunas ? "Lunas" : "Belum Lunas",
      metodePembayaran: "Tunai",
      refund: m.refund || 0,
      detailMingguan,
      tanggalBayar: new Date("2025-11-15"),
    };
  });
  await Kas.insertMany(kasSem1);

  // Pemasukan Lain Semester 1:
  // Kas Masuk Periode Awal (Rp 960.000) + Sisa Seminar Agama (Rp 15.000)
  const pemasukanSem1Data = [
    {
      semesterId: sem1._id,
      judul: "Kas Masuk Periode Awal (20 Sept – 04 Okt 2025)",
      kategori: "Dana Usaha",
      nominal: 960000,
      tanggalMasuk: new Date("2025-10-04"),
      dicatatOleh: "Bendahara",
      keterangan: "Akumulasi kas masuk sesi 1 kelas (3 pertemuan x Rp 320.000)",
    },
    {
      semesterId: sem1._id,
      judul: "Uang sisa pembayaran seminar agama",
      kategori: "Lainnya",
      nominal: 15000,
      tanggalMasuk: new Date("2025-11-15"),
      dicatatOleh: "Bendahara",
      keterangan: "Sisa pembayaran seminar agama kelas",
    },
  ];
  await PemasukanLain.insertMany(pemasukanSem1Data);

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
  console.log("\n3. Mengisi data Semester Genap 2025/2026 (02TPLE009)...");
  const kasSem2 = rawMhsSem2.map((m) => {
    const isLunas = m.bayar >= 70000;
    const paidWeeks = Math.min(14, Math.floor(m.bayar / 5000));
    const detailMingguan = daftarPertemuanSem2.map((p) => ({
      pertemuanKe: p.pertemuanKe,
      tanggal: p.tanggal,
      bayar: p.pertemuanKe <= paidWeeks,
      nominal: 5000,
    }));

    return {
      semesterId: sem2._id,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      periode: "07 Mar – 27 Jun 2026",
      nominal: m.bayar,
      status: isLunas ? "Lunas" : "Belum Lunas",
      metodePembayaran: "Tunai",
      refund: m.refund || 0,
      detailMingguan,
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
  console.log("\n4. Mengisi data Semester Ganjil 2026/2027 (Aktif)...");
  const kasSem3 = rawMhsSem3.map((m) => {
    const isLunas = m.bayar >= 20000;
    return {
      semesterId: sem3._id,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      periode: "Semester Ganjil 2026/2027",
      nominal: m.bayar,
      status: isLunas ? "Lunas" : "Belum Lunas",
      metodePembayaran: "Tunai",
      tanggalBayar: m.bayarUas > 0 ? new Date("2026-10-20") : new Date("2026-09-19"),
    };
  });
  await Kas.insertMany(kasSem3);

  // Pemasukan Lain Semester 3:
  // HANYA Saldo Awal Sisa Kas Semester Lalu (Rp 90.000). Tidak ada duplikasi Kas UTS/UAS!
  const pemasukanSem3Data = [
    {
      semesterId: sem3._id,
      judul: "KAS SEMESTER 2&1 (Saldo Awal)",
      kategori: "Sisa Semester Lalu",
      nominal: 90000,
      tanggalMasuk: new Date("2026-07-07"),
      dicatatOleh: "Bendahara",
      keterangan: "Sisa saldo kas semester 1 dan semester 2 yang dialihkan ke semester 3",
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

  // ================= GENERATE PAYMENT HISTORY LENGKAP =================
  console.log("\n5. Mengisi audit riwayat (PaymentHistory) untuk seluruh semester...");
  const allHistory = [];

  // History Semester 1
  allHistory.push({
    semesterId: sem1._id,
    aksi: "IMPORT_EXCEL",
    nama: "Bendahara",
    keterangan: "Inisialisasi buku kas kelas Semester Ganjil 2025/2026 (01TPLE009)",
    waktu: new Date("2025-09-20"),
  });
  rawMhsSem1.forEach((m) => {
    if (m.bayar > 0) {
      allHistory.push({
        semesterId: sem1._id,
        aksi: "CREATE",
        nim: generateMaskedNim(m.no),
        nama: m.nama,
        nominal: m.bayar,
        statusBaru: m.bayar >= 50000 ? "Lunas" : "Belum Lunas",
        keterangan: `Pembayaran iuran kas mahasiswa ${m.nama} (Rp ${m.bayar.toLocaleString("id-ID")})`,
        waktu: new Date("2025-11-15"),
      });
    }
  });
  pengeluaranSem1.forEach((p) => {
    allHistory.push({
      semesterId: sem1._id,
      aksi: "EXPENSE_CREATE",
      nama: p.pic,
      nominal: p.nominal,
      keterangan: `Pengeluaran kas: ${p.judul} (${p.kategori})`,
      waktu: new Date(p.tanggal),
    });
  });

  // History Semester 2
  allHistory.push({
    semesterId: sem2._id,
    aksi: "IMPORT_EXCEL",
    nama: "Bendahara",
    keterangan: "Inisialisasi buku kas kelas Semester Genap 2025/2026 (02TPLE009)",
    waktu: new Date("2026-03-07"),
  });
  rawMhsSem2.forEach((m) => {
    if (m.bayar > 0) {
      allHistory.push({
        semesterId: sem2._id,
        aksi: "CREATE",
        nim: generateMaskedNim(m.no),
        nama: m.nama,
        nominal: m.bayar,
        statusBaru: m.bayar >= 70000 ? "Lunas" : "Belum Lunas",
        keterangan: `Pembayaran iuran kas mahasiswa ${m.nama} (Rp ${m.bayar.toLocaleString("id-ID")})`,
        waktu: new Date("2026-04-18"),
      });
    }
  });
  pengeluaranSem2.forEach((p) => {
    allHistory.push({
      semesterId: sem2._id,
      aksi: "EXPENSE_CREATE",
      nama: p.pic,
      nominal: p.nominal,
      keterangan: `Pengeluaran kas: ${p.judul} (${p.kategori})`,
      waktu: new Date(p.tanggal),
    });
  });

  // History Semester 3 (Aktif)
  allHistory.push({
    semesterId: sem3._id,
    aksi: "IMPORT_EXCEL",
    nama: "Bendahara",
    nominal: 90000,
    keterangan: "Inisialisasi saldo awal kas semester 2&1 dialihkan ke semester 3",
    waktu: new Date("2026-07-07"),
  });
  rawMhsSem3.forEach((m) => {
    if (m.bayar > 0) {
      allHistory.push({
        semesterId: sem3._id,
        aksi: "CREATE",
        nim: generateMaskedNim(m.no),
        nama: m.nama,
        nominal: m.bayar,
        statusBaru: m.bayar >= 20000 ? "Lunas" : "Belum Lunas",
        keterangan: m.bayarUas > 0
          ? `Pembayaran iuran kas mahasiswa ${m.nama} (Kas UTS Rp10.000 + Kas UAS Rp10.000)`
          : `Pembayaran iuran kas mahasiswa ${m.nama} (Kas UTS Rp10.000)`,
        waktu: m.bayarUas > 0 ? new Date("2026-10-20") : new Date("2026-09-19"),
      });
    }
  });
  pengeluaranSem3.forEach((p) => {
    allHistory.push({
      semesterId: sem3._id,
      aksi: "EXPENSE_CREATE",
      nama: p.pic,
      nominal: p.nominal,
      keterangan: `Pengeluaran kas: ${p.judul} (${p.kategori})`,
      waktu: new Date(p.tanggal),
    });
  });

  await PaymentHistory.insertMany(allHistory);
  console.log(`✓ Total ${allHistory.length} riwayat audit berhasil disimpan ke PaymentHistory!`);

  console.log("\n=======================================================");
  console.log("🎉 SELURUH DATA DARI FILE .MD BERHASIL DISINKRONISASI!");
  console.log("=======================================================");
  console.log("• Semester Ganjil 2025/2026 (01TPLE009): 33 Mhs, Masuk 2.470k, Keluar 1.151k, Saldo Riil 1.319k (Refund Selesai)");
  console.log("• Semester Genap 2025/2026 (02TPLE009): 33 Mhs, Masuk 1.825k, Keluar 1.265k, Saldo Buku 560k, Sisa 90k ke Sem 3");
  console.log("• Semester Ganjil 2026/2027 (Aktif): 33 Mhs, Saldo Awal 90k, Kas Mhs 330k, Total Masuk 420k, Keluar 271k, Saldo Akhir 149k");
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
    { header: "Keterangan Semester", key: "desc", width: 34 },
    { header: "Total Pemasukan", key: "in", width: 20 },
    { header: "Total Pengeluaran", key: "out", width: 20 },
    { header: "Pengembalian (Refund)", key: "ref", width: 24 },
    { header: "Sisa Saldo Kas", key: "balance", width: 20 },
    { header: "Status / Catatan", key: "status", width: 45 },
  ];
  applyHeader(wsSummary, "FF1E293B");

  const summaryData = [
    {
      desc: "Semester Ganjil 2025/2026",
      in: 2470000,
      out: 1151000,
      ref: 1319000,
      balance: 0,
      status: "Selesai - Sisa dana 100% dibagikan kembali ke mahasiswa",
    },
    {
      desc: "Semester Genap 2025/2026",
      in: 1825000,
      out: 1265000,
      ref: 410000,
      balance: 150000,
      status: "Selesai - Sisa tabel 560k, dikembalikan, sisa nyata bendahara 90k ke Sem 3",
    },
    {
      desc: "Semester Ganjil 2026/2027 (AKTIF)",
      in: 420000,
      out: 271000,
      ref: 0,
      balance: 149000,
      status: "Aktif Berjalan (Saldo awal 90k + Kas Mhs 330k - Pengeluaran 271k)",
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
  const wsSem3 = workbook.addWorksheet("Semester Ganjil 2026-2027");
  wsSem3.columns = [
    { header: "No", key: "no", width: 8 },
    { header: "NIM", key: "nim", width: 20 },
    { header: "Nama Mahasiswa", key: "nama", width: 32 },
    { header: "Kas UTS", key: "uts", width: 16 },
    { header: "Kas UAS", key: "uas", width: 16 },
    { header: "Total Bayar", key: "bayar", width: 18 },
    { header: "Status", key: "status", width: 18 },
  ];
  applyHeader(wsSem3);
  rawMhsSem3.forEach((m) => {
    const row = wsSem3.addRow({
      no: m.no,
      nim: generateMaskedNim(m.no),
      nama: m.nama,
      uts: m.bayarUts,
      uas: m.bayarUas,
      bayar: m.bayar,
      status: m.bayar >= 20000 ? "Lunas" : "Belum Lunas",
    });
    row.getCell("uts").numFmt = '"Rp" #,##0';
    row.getCell("uas").numFmt = '"Rp" #,##0';
    row.getCell("bayar").numFmt = '"Rp" #,##0';
  });

  // Sheet 3: Pengeluaran Semester 3
  const wsOut3 = workbook.addWorksheet("Pengeluaran Sem Ganjil 26-27");
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
  const wsSem2 = workbook.addWorksheet("Semester Genap 2025-2026");
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
  const wsOut2 = workbook.addWorksheet("Pengeluaran Sem Genap 25-26");
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
  const wsSem1 = workbook.addWorksheet("Semester Ganjil 2025-2026");
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
      bayar: m.bayar,
      ref: m.refund,
    });
    row.getCell("bayar").numFmt = '"Rp" #,##0';
    row.getCell("ref").numFmt = '"Rp" #,##0';
  });

  // Sheet 8: Pengeluaran Semester 1
  const wsOut1 = workbook.addWorksheet("Pengeluaran Sem Ganjil 25-26");
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
