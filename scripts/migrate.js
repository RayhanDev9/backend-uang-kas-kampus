require("dotenv").config();
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/db");
const Semester = require("../src/models/Semester");
const Kas = require("../src/models/Kas");
const PemasukanLain = require("../src/models/PemasukanLain");
const Pengeluaran = require("../src/models/Pengeluaran");
const PaymentHistory = require("../src/models/PaymentHistory");

async function migrate() {
  console.log("Menghubungkan ke database MongoDB Atlas...");
  await connectDatabase();
  console.log("✓ Terhubung ke database:", mongoose.connection.name);

  // 1. Pastikan index untuk setiap model terbuat
  console.log("\n1. Membuat index koleksi...");
  await Promise.all([
    Semester.syncIndexes(),
    Kas.syncIndexes(),
    PemasukanLain.syncIndexes(),
    Pengeluaran.syncIndexes(),
    PaymentHistory.syncIndexes(),
  ]);
  console.log("✓ Seluruh index berhasil disinkronkan.");

  // 2. Cek apakah ada semester aktif
  console.log("\n2. Memeriksa master semester...");
  let activeSemester = await Semester.findOne({ isAktif: true });

  // 3. Migrasi data kas lama yang belum memiliki semesterId
  console.log("\n3. Memeriksa data kas lama tanpa semesterId...");
  const unlinkedKasCount = await Kas.countDocuments({
    $or: [{ semesterId: { $exists: false } }, { semesterId: null }],
  });

  if (unlinkedKasCount > 0) {
    console.log(`Ditemukan ${unlinkedKasCount} data kas lama yang belum terhubung ke semester.`);

    if (!activeSemester) {
      console.log('Membuat semester default "Semester 1 - Arsip"...');
      activeSemester = await Semester.create({
        nama: "Semester 1 - Arsip",
        kode: "ARSIP-1",
        isAktif: true,
        targetKasPerMhs: 0,
      });
      console.log(`✓ Semester default dibuat dengan ID: ${activeSemester._id}`);
    }

    const updateResult = await Kas.updateMany(
      { $or: [{ semesterId: { $exists: false } }, { semesterId: null }] },
      { $set: { semesterId: activeSemester._id } }
    );
    console.log(`✓ Berhasil memigrasikan ${updateResult.modifiedCount} data kas ke semester "${activeSemester.nama}".`);
  } else {
    console.log("✓ Semua data kas sudah terhubung dengan semester.");

    // Jika belum ada semester sama sekali di database, buat 1 semester default aktif
    const totalSemesters = await Semester.countDocuments();
    if (totalSemesters === 0) {
      console.log("Database belum memiliki semester. Membuat semester aktif pertama...");
      activeSemester = await Semester.create({
        nama: "Semester Ganjil 2024/2025",
        kode: "2024-1",
        isAktif: true,
        targetKasPerMhs: 50000,
        tanggalMulai: new Date(),
      });
      console.log(`✓ Semester pertama dibuat: "${activeSemester.nama}" (${activeSemester.kode})`);
    }
  }

  // 4. Pastikan hanya ada 1 semester aktif (Aturan 1 db.md)
  console.log("\n4. Memvalidasi integritas semester aktif (Aturan 1 db.md)...");
  const activeSemesters = await Semester.find({ isAktif: true });
  if (activeSemesters.length > 1) {
    console.log(`Ditemukan ${activeSemesters.length} semester aktif. Merapikan agar hanya 1 yang aktif...`);
    // Pertahankan yang terbaru
    const newestActive = activeSemesters[0];
    await Semester.updateMany({ _id: { $ne: newestActive._id } }, { isAktif: false });
    console.log(`✓ Hanya semester "${newestActive.nama}" yang sekarang aktif.`);
  } else if (activeSemesters.length === 1) {
    console.log(`✓ Tepat 1 semester aktif: "${activeSemesters[0].nama}".`);
  }

  console.log("\n=== MIGRASI SELESAI DENGAN SUKSES ===");
}

if (require.main === module) {
  migrate()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Terjadi kesalahan saat migrasi:", error);
      mongoose.disconnect().finally(() => process.exit(1));
    });
}

module.exports = migrate;
