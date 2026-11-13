require("dotenv").config();
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/db");
const Semester = require("../src/models/Semester");
const Kas = require("../src/models/Kas");
const PemasukanLain = require("../src/models/PemasukanLain");
const Pengeluaran = require("../src/models/Pengeluaran");
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

  // 2. Bersihkan & Isi Data Kas Mahasiswa
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
      nominal: 200000,
      tanggalMasuk: new Date("2024-09-02"),
      keterangan: "Sisa kas yang ditransfer dari periode kepengurusan lama",
      dicatatOleh: "Bendahara",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Keuntungan Bazar Makanan Dies Natalis",
      kategori: "Dana Usaha",
      nominal: 150000,
      tanggalMasuk: new Date("2024-09-20"),
      keterangan: "Laba bersih jualan risol dan es teh saat bazar kampus",
      dicatatOleh: "Divisi Danus",
    },
  ];

  await PemasukanLain.insertMany(dataPemasukanLain);
  const totalPemasukanLainNominal = dataPemasukanLain.reduce((acc, c) => acc + c.nominal, 0);
  console.log(`✓ Berhasil memasukkan ${dataPemasukanLain.length} data pemasukan lain (Rp ${totalPemasukanLainNominal.toLocaleString("id-ID")}).`);

  // 4. Bersihkan & Isi Data Pengeluaran Kas (Cash Out / Belanja Kelas)
  console.log("\n4. Mengisi mock data pengeluaran kas (Cash Out / Belanja Kelas)...");
  await Pengeluaran.deleteMany({ semesterId: semesterGanjil._id });

  const dataPengeluaran = [
    {
      semesterId: semesterGanjil._id,
      judul: "Fotokopi Modul Praktikum Jaringan",
      kategori: "Akademik & Materi",
      nominal: 75000,
      tanggalPengeluaran: new Date("2024-10-05"),
      penanggungJawab: "Budi Santoso (Sie Perlengkapan)",
      keterangan: "Fotokopi 35 set materi untuk pertemuan lab ke-4",
      buktiNotaUrl: "https://example.com/nota-fotokopi.jpg",
      dicatatOleh: "Bendahara",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Beli Spidol Whiteboard & Penghapus",
      kategori: "Perlengkapan Kelas",
      nominal: 35000,
      tanggalPengeluaran: new Date("2024-10-12"),
      penanggungJawab: "Dimas Pratama",
      keterangan: "Pengadaan spidol 3 warna dan refill tinta",
      buktiNotaUrl: "",
      dicatatOleh: "Bendahara",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Kabel HDMI & Converter Type-C Proyektor",
      kategori: "Perlengkapan Kelas",
      nominal: 85000,
      tanggalPengeluaran: new Date("2024-10-25"),
      penanggungJawab: "Ahmad Fadhil",
      keterangan: "Kabel HDMI 3 meter untuk presentasi kelas di gedung B",
      buktiNotaUrl: "",
      dicatatOleh: "Bendahara",
    },
    {
      semesterId: semesterGanjil._id,
      judul: "Konsumsi Rapat Evaluasi Kelas",
      kategori: "Acara & Konsumsi",
      nominal: 55000,
      tanggalPengeluaran: new Date("2024-11-02"),
      penanggungJawab: "Citra Lestari",
      keterangan: "Snack dan minuman rapat pengurus kelas",
      buktiNotaUrl: "",
      dicatatOleh: "Bendahara",
    },
  ];

  await Pengeluaran.insertMany(dataPengeluaran);
  const totalPengeluaranNominal = dataPengeluaran.reduce((acc, c) => acc + c.nominal, 0);
  console.log(`✓ Berhasil memasukkan ${dataPengeluaran.length} data pengeluaran kas (Rp ${totalPengeluaranNominal.toLocaleString("id-ID")}).`);

  // 5. Bersihkan & Isi Data Riwayat / Audit Trail
  console.log("\n5. Mengisi mock data audit history (PaymentHistory)...");
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
      aksi: "EXPENSE_CREATE",
      semesterId: semesterGanjil._id,
      nama: "Budi Santoso",
      nominal: 75000,
      keterangan: "Pengeluaran kas: Fotokopi Modul Praktikum Jaringan (Akademik & Materi)",
      waktu: new Date(now - 4 * hari),
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
      aksi: "EXPENSE_CREATE",
      semesterId: semesterGanjil._id,
      nama: "Dimas Pratama",
      nominal: 35000,
      keterangan: "Pengeluaran kas: Beli Spidol Whiteboard & Penghapus (Perlengkapan Kelas)",
      waktu: new Date(now - 2 * hari),
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
      aksi: "EXPENSE_CREATE",
      semesterId: semesterGanjil._id,
      nama: "Ahmad Fadhil",
      nominal: 85000,
      keterangan: "Pengeluaran kas: Kabel HDMI & Converter Type-C Proyektor (Perlengkapan Kelas)",
      waktu: new Date(now - 12 * jam),
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

  const totalKasLunas = 30 * 50000;
  const totalPemasukan = totalKasLunas + totalPemasukanLainNominal;
  const saldoBersih = totalPemasukan - totalPengeluaranNominal;

  console.log("\n=======================================================");
  console.log("🎉 SELURUH MOCK DATA BERHASIL DIISI KE MONGODB ATLAS!");
  console.log("=======================================================");
  console.log(`• Semester Aktif      : ${semesterGanjil.nama} (${semesterGanjil.kode})`);
  console.log(`• Mahasiswa Terdaftar : 35 orang`);
  console.log(`• Total Kas Lunas     : Rp ${totalKasLunas.toLocaleString("id-ID")} (30 orang)`);
  console.log(`• Kas Belum Lunas     : 5 orang`);
  console.log(`• Pemasukan Lain      : Rp ${totalPemasukanLainNominal.toLocaleString("id-ID")} (2 transaksi)`);
  console.log(`• TOTAL PEMASUKAN     : Rp ${totalPemasukan.toLocaleString("id-ID")}`);
  console.log(`• TOTAL PENGELUARAN   : Rp ${totalPengeluaranNominal.toLocaleString("id-ID")} (4 transaksi)`);
  console.log(`• SALDO KAS BERSIH    : Rp ${saldoBersih.toLocaleString("id-ID")}`);
  console.log(`• Riwayat Mutasi      : ${sampleHistories.length} log aktivitas`);
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
