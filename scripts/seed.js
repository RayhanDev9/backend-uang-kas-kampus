require("dotenv").config();
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/db");
const Semester = require("../src/models/Semester");
const Kas = require("../src/models/Kas");
const PemasukanLain = require("../src/models/PemasukanLain");
const PaymentHistory = require("../src/models/PaymentHistory");

const daftarMahasiswa = [
  { nim: "231011400001", nama: "Ahmad Fadhil", status: "Lunas", metode: "Transfer" },
  { nim: "231011400002", nama: "Budi Santoso", status: "Lunas", metode: "QRIS" },
  { nim: "231011400003", nama: "Citra Lestari", status: "Lunas", metode: "Tunai" },
  { nim: "231011400004", nama: "Dimas Pratama", status: "Lunas", metode: "QRIS" },
  { nim: "231011400005", nama: "Eka Saputra", status: "Belum Lunas", metode: "Tunai" },
  { nim: "231011400006", nama: "Fajar Ramadhan", status: "Lunas", metode: "Transfer" },
  { nim: "231011400007", nama: "Gita Permata", status: "Lunas", metode: "QRIS" },
  { nim: "231011400008", nama: "Hendra Wijaya", status: "Lunas", metode: "Transfer" },
  { nim: "231011400009", nama: "Indah Puspita", status: "Lunas", metode: "QRIS" },
  { nim: "231011400010", nama: "Joko Prasetyo", status: "Belum Lunas", metode: "Tunai" },
  { nim: "231011400011", nama: "Kartika Dewi", status: "Lunas", metode: "Transfer" },
  { nim: "231011400012", nama: "Lutfi Hakim", status: "Lunas", metode: "QRIS" },
  { nim: "231011400013", nama: "Muhammad Rizky", status: "Lunas", metode: "Tunai" },
  { nim: "231011400014", nama: "Nabila Putri", status: "Lunas", metode: "QRIS" },
  { nim: "231011400015", nama: "Oktavianus Dani", status: "Belum Lunas", metode: "Transfer" },
  { nim: "231011400016", nama: "Putri Maharani", status: "Lunas", metode: "Transfer" },
  { nim: "231011400017", nama: "Qori Anggraini", status: "Lunas", metode: "QRIS" },
  { nim: "231011400018", nama: "Rayhan Alamsyah", status: "Lunas", metode: "QRIS" },
  { nim: "231011400019", nama: "Siti Aminah", status: "Lunas", metode: "Transfer" },
  { nim: "231011400020", nama: "Teguh Hidayat", status: "Lunas", metode: "Tunai" },
  { nim: "231011400021", nama: "Utami Wulandari", status: "Lunas", metode: "QRIS" },
  { nim: "231011400022", nama: "Vina Panduwinata", status: "Belum Lunas", metode: "Transfer" },
  { nim: "231011400023", nama: "Wahyu Setiawan", status: "Lunas", metode: "Tunai" },
  { nim: "231011400024", nama: "Xaverius Kevin", status: "Lunas", metode: "Transfer" },
  { nim: "231011400025", nama: "Yoga Pratama", status: "Lunas", metode: "QRIS" },
  { nim: "231011400026", nama: "Zahra Aurelia", status: "Lunas", metode: "Transfer" },
  { nim: "231011400027", nama: "Aditya Nugraha", status: "Lunas", metode: "Tunai" },
  { nim: "231011400028", nama: "Bella Safira", status: "Lunas", metode: "QRIS" },
  { nim: "231011400029", nama: "Candra Kurniawan", status: "Belum Lunas", metode: "Transfer" },
  { nim: "231011400030", nama: "Dina Mariana", status: "Lunas", metode: "QRIS" },
  { nim: "231011400031", nama: "Erwin Kurnia", status: "Lunas", metode: "Tunai" },
  { nim: "231011400032", nama: "Fitri Handayani", status: "Lunas", metode: "Transfer" },
  { nim: "231011400033", nama: "Gilang Ramadhan", status: "Lunas", metode: "QRIS" },
  { nim: "231011400034", nama: "Hana Soraya", status: "Lunas", metode: "Transfer" },
  { nim: "231011400035", nama: "Irfan Maulana", status: "Lunas", metode: "Tunai" },
];

async function seedData() {
  console.log("Menghubungkan ke MongoDB Atlas...");
  await connectDatabase();
  console.log("✓ Terhubung ke MongoDB Atlas:", mongoose.connection.name);

  // 1. Buat / Perbarui Semester
  console.log("\n1. Menyiapkan master semester...");
  await Semester.updateMany({}, { isAktif: false });

  let semesterGanjil = await Semester.findOne({ kode: "2024-1" });
  if (!semesterGanjil) {
    semesterGanjil = await Semester.create({
      nama: "Semester Ganjil 2024/2025",
      kode: "2024-1",
      isAktif: true,
      targetKasPerMhs: 50000,
      tanggalMulai: new Date("2024-09-01"),
      tanggalSelesai: new Date("2025-01-31"),
    });
    console.log("✓ Semester aktif dibuat:", semesterGanjil.nama);
  } else {
    semesterGanjil.isAktif = true;
    semesterGanjil.targetKasPerMhs = 50000;
    await semesterGanjil.save();
    console.log("✓ Semester aktif diperbarui:", semesterGanjil.nama);
  }

  let semesterGenap = await Semester.findOne({ kode: "2023-2" });
  if (!semesterGenap) {
    semesterGenap = await Semester.create({
      nama: "Semester Genap 2023/2024",
      kode: "2023-2",
      isAktif: false,
      targetKasPerMhs: 40000,
      tanggalMulai: new Date("2024-02-01"),
      tanggalSelesai: new Date("2024-07-31"),
    });
    console.log("✓ Semester arsip dibuat:", semesterGenap.nama);
  }

  // 2. Bersihkan & Isi Data Kas untuk Semester Aktif
  console.log("\n2. Mengisi mock data kas mahasiswa pada semester aktif...");
  await Kas.deleteMany({ semesterId: semesterGanjil._id });

  const nominalTarget = semesterGanjil.targetKasPerMhs;
  const kasRecords = daftarMahasiswa.map((mhs, idx) => {
    const tanggalBayar = new Date();
    tanggalBayar.setDate(tanggalBayar.getDate() - (idx % 15));

    return {
      semesterId: semesterGanjil._id,
      nim: mhs.nim,
      nama: mhs.nama,
      periode: "September - Januari",
      nominal: mhs.status === "Lunas" ? nominalTarget : 0,
      status: mhs.status,
      metodePembayaran: mhs.metode,
      tanggalBayar,
    };
  });

  await Kas.insertMany(kasRecords);
  console.log(`✓ Berhasil memasukkan ${kasRecords.length} data kas (30 Lunas, 5 Belum Lunas).`);

  // 3. Bersihkan & Isi Data Pemasukan Lain
  console.log("\n3. Mengisi mock data pemasukan lain...");
  await PemasukanLain.deleteMany({ semesterId: semesterGanjil._id });

  const dataPemasukanLain = [
    {
      semesterId: semesterGanjil._id,
      judul: "Sisa Saldo Kas Semester Genap Lalu",
      kategori: "Sisa Semester Lalu",
      nominal: 450000,
      tanggalMasuk: new Date("2024-09-02"),
      keterangan: "Sisa kas yang ditransfer dari periode kepengurusan lama",
      dicatatOleh: "Bendahara",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Keuntungan Bazar Makanan Dies Natalis",
      kategori: "Dana Usaha",
      nominal: 350000,
      tanggalMasuk: new Date("2024-09-20"),
      keterangan: "Laba bersih jualan risol dan es teh saat bazar kampus",
      dicatatOleh: "Divisi Danus",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Sponsorship Makrab dari PT Alumni Tech",
      kategori: "Sponsor",
      nominal: 500000,
      tanggalMasuk: new Date("2024-10-05"),
      keterangan: "Dukungan dana kegiatan malam keakraban kelas",
      dicatatOleh: "Bendahara",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Donasi Dosen Pembimbing Akademik",
      kategori: "Donasi",
      nominal: 200000,
      tanggalMasuk: new Date("2024-10-18"),
      keterangan: "Bantuan dana kas dari Pak Dosen untuk kegiatan kelas",
      dicatatOleh: "Ketua Kelas",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Kembalian Belanja Spidol & Map Kelas",
      kategori: "Lainnya",
      nominal: 25000,
      tanggalMasuk: new Date("2024-11-01"),
      keterangan: "Sisa pembelian perlengkapan kuliah di fotokopi kampus",
      dicatatOleh: "Bendahara",
    },
  ];

  await PemasukanLain.insertMany(dataPemasukanLain);
  console.log(`✓ Berhasil memasukkan ${dataPemasukanLain.length} data pemasukan lain.`);

  // 4. Bersihkan & Isi Data Riwayat / Audit Trail
  console.log("\n4. Mengisi mock data audit history (PaymentHistory)...");
  await PaymentHistory.deleteMany({ semesterId: semesterGanjil._id });

  const now = Date.now();
  const menit = 60 * 1000;
  const jam = 60 * menit;
  const hari = 24 * jam;

  const sampleHistories = [
    {
      aksi: "IMPORT_EXCEL",
      semesterId: semesterGanjil._id,
      nama: "Bendahara (Import Excel)",
      keterangan: "Import 35 data mahasiswa baru untuk Semester Ganjil 2024/2025",
      waktu: new Date(now - 7 * hari),
    },
    {
      aksi: "CREATE",
      semesterId: semesterGanjil._id,
      nim: "231011400001",
      nama: "Ahmad Fadhil",
      nominal: 50000,
      statusBaru: "Lunas",
      keterangan: "Pencatatan kas baru via Transfer Bank",
      waktu: new Date(now - 5 * hari),
    },
    {
      aksi: "UPDATE_STATUS",
      semesterId: semesterGanjil._id,
      nim: "231011400002",
      nama: "Budi Santoso",
      nominal: 50000,
      statusLama: "Belum Lunas",
      statusBaru: "Lunas",
      keterangan: "Status kas untuk Budi Santoso diubah menjadi Lunas (scan QRIS)",
      waktu: new Date(now - 3 * hari),
    },
    {
      aksi: "UPDATE_STATUS",
      semesterId: semesterGanjil._id,
      nim: "231011400019",
      nama: "Siti Aminah",
      nominal: 50000,
      statusLama: "Belum Lunas",
      statusBaru: "Lunas",
      keterangan: "Status kas untuk Siti Aminah diubah menjadi Lunas (bayar tunai)",
      waktu: new Date(now - 1 * hari),
    },
    {
      aksi: "UPDATE_NOMINAL",
      semesterId: semesterGanjil._id,
      nim: "231011400004",
      nama: "Dimas Pratama",
      nominal: 50000,
      nominalLama: 40000,
      nominalBaru: 50000,
      statusBaru: "Lunas",
      keterangan: "Penyesuaian target kas semester dari Rp40.000 menjadi Rp50.000",
      waktu: new Date(now - 4 * jam),
    },
    {
      aksi: "DELETE",
      semesterId: semesterGanjil._id,
      nim: "231011400099",
      nama: "Siswa Duplikat Testing",
      nominal: 50000,
      statusLama: "Belum Lunas",
      keterangan: "Data kas uji coba dihapus oleh bendahara",
      waktu: new Date(now - 30 * menit),
    },
  ];

  await PaymentHistory.insertMany(sampleHistories);
  console.log(`✓ Berhasil memasukkan ${sampleHistories.length} riwayat mutasi / audit history.`);

  console.log("\n=======================================================");
  console.log("🎉 SELURUH MOCK DATA BERHASIL DIISI KE MONGODB ATLAS!");
  console.log("=======================================================");
  console.log(`• Semester Aktif      : ${semesterGanjil.nama} (${semesterGanjil.kode})`);
  console.log(`• Mahasiswa Terdaftar : 35 orang`);
  console.log(`• Kas Lunas           : 30 orang (Rp 1.500.000)`);
  console.log(`• Kas Belum Lunas     : 5 orang`);
  console.log(`• Pemasukan Lain      : 5 transaksi (Rp 1.525.000)`);
  console.log(`• Total Saldo Kelas   : Rp 3.025.000`);
  console.log(`• Riwayat Mutasi      : 6 log aktivitas`);
  console.log("=======================================================\n");
}

if (require.main === module) {
  seedData()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Gagal mengisi mock data:", err);
      mongoose.disconnect().finally(() => process.exit(1));
    });
}

module.exports = seedData;
