# 🗄️ Database Architecture & Rules (`db.md`)

Dokumen spesifikasi teknis basis data MongoDB & Mongoose untuk proyek **KasKita**, mencakup koleksi multi-semester, pemasukan non-kas, **pengeluaran / penarikan kas (cash out)**, riwayat transaksi, dan audit trail.

---

## 1. Diagram Relasi Entitas (ERD)

```
┌─────────────────────────────────┐
│           Semester              │
├─────────────────────────────────┤
│ _id                 : ObjectId  │◄────────────┐
│ nama                : String    │             │
│ kode                : String(UQ)│             │
│ isAktif             : Boolean   │             │
│ targetKasPerMhs     : Number    │             │
│ tanggalMulai        : Date      │             │
│ tanggalSelesai      : Date      │             │
└───────────────┬─────────────────┘             │
                │ 1:N                           │
                ├───────────────────────────────┼───────────────────────────────┬───────────────────────────────┐
                ▼                               ▼                               ▼                               ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│              Kas                │ │         PemasukanLain           │ │          Pengeluaran            │ │         PaymentHistory          │
│        (Uang Masuk Mhs)         │ │       (Uang Masuk Non-Kas)      │ │     (Uang Keluar/Belanja)       │ │          (Audit Trail)          │
├─────────────────────────────────┤ ├─────────────────────────────────┤ ├─────────────────────────────────┤ ├─────────────────────────────────┤
│ _id             : ObjectId      │ │ _id             : ObjectId      │ │ _id             : ObjectId      │ │ _id             : ObjectId      │
│ semesterId      : ObjectId(FK)  │ │ semesterId      : ObjectId(FK)  │ │ semesterId      : ObjectId(FK)  │ │ semesterId      : ObjectId(FK)  │
│ nim             : String        │ │ judul           : String        │ │ judul           : String        │ │ kasId           : ObjectId(opt) │
│ nama            : String        │ │ kategori        : Enum          │ │ kategori        : Enum          │ │ pengeluaranId   : ObjectId(opt) │
│ periode         : String        │ │ nominal         : Number        │ │ nominal         : Number        │ │ nama            : String        │
│ nominal         : Number        │ │ tanggalMasuk    : Date          │ │ tanggalKeluar   : Date          │ │ nim             : String        │
│ status          : Enum          │ │ keterangan      : String        │ │ penanggungJwb   : String        │ │ aksi            : Enum          │
│ metodeBayar     : Enum          │ │ dicatatOleh     : String        │ │ keterangan      : String        │ │ nominal         : Number        │
│ tanggalBayar    : Date          │ └─────────────────────────────────┘ │ buktiNotaUrl    : String(opt)   │ │ statusLama      : String        │
└─────────────────────────────────┘                                     └─────────────────────────────────┘ │ statusBaru      : String        │
                                                                                                            │ waktu           : Date          │
                                                                                                            └─────────────────────────────────┘
```

---

## 2. Definisi Skema Mongoose

### A. Koleksi `Semester` (`src/models/Semester.js`)
Menampung master data periode akademik untuk memisahkan data kas per semester.

```javascript
const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema(
  {
    nama: {
      type: String,
      required: [true, "Nama semester wajib diisi"],
      trim: true,
      // Contoh: "Semester Ganjil 2024/2025"
    },
    kode: {
      type: String,
      required: [true, "Kode semester wajib diisi"],
      unique: true,
      trim: true,
      uppercase: true,
      // Contoh: "2024-1"
    },
    isAktif: {
      type: Boolean,
      default: false,
      index: true,
    },
    targetKasPerMhs: {
      type: Number,
      default: 0,
      min: [0, "Target kas tidak boleh negatif"],
    },
    tanggalMulai: {
      type: Date,
    },
    tanggalSelesai: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Semester || mongoose.model("Semester", semesterSchema);
```

---

### B. Koleksi `Kas` (`src/models/Kas.js`)
Data iuran wajib rutin per mahasiswa.

```javascript
const mongoose = require("mongoose");

const kasSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    nim: {
      type: String,
      required: [true, "NIM wajib diisi"],
      trim: true,
    },
    nama: {
      type: String,
      required: [true, "Nama wajib diisi"],
      trim: true,
    },
    periode: {
      type: String,
      required: [true, "Periode wajib diisi"],
      trim: true,
    },
    nominal: {
      type: Number,
      required: [true, "Nominal wajib diisi"],
      min: [0, "Nominal tidak boleh negatif"],
    },
    status: {
      type: String,
      required: [true, "Status wajib diisi"],
      enum: {
        values: ["Lunas", "Belum Lunas"],
        message: "Status harus Lunas atau Belum Lunas",
      },
    },
    metodePembayaran: {
      type: String,
      enum: ["Transfer", "QRIS", "Tunai"],
      default: "Transfer",
    },
    tanggalBayar: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

kasSchema.index({ semesterId: 1, nim: 1, periode: 1 });

module.exports = mongoose.models.Kas || mongoose.model("Kas", kasSchema);
```

---

### C. Koleksi `PemasukanLain` (`src/models/PemasukanLain.js`)
Mencatat uang masuk di luar iuran mahasiswa (sisa semester lalu, sponsor, danus).

```javascript
const mongoose = require("mongoose");

const pemasukanLainSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    judul: {
      type: String,
      required: [true, "Judul pemasukan wajib diisi"],
      trim: true,
      // Contoh: "Sisa Saldo Kas Semester 2", "Dana Usaha Bazar Dies Natalis"
    },
    kategori: {
      type: String,
      required: [true, "Kategori pemasukan wajib diisi"],
      enum: {
        values: ["Sisa Semester Lalu", "Dana Usaha", "Sponsor", "Donasi", "Lainnya"],
        message: "Kategori tidak valid",
      },
      default: "Lainnya",
    },
    nominal: {
      type: Number,
      required: [true, "Nominal wajib diisi"],
      min: [1, "Nominal minimal Rp 1"],
    },
    tanggalMasuk: {
      type: Date,
      default: Date.now,
    },
    keterangan: {
      type: String,
      trim: true,
    },
    dicatatOleh: {
      type: String,
      default: "Bendahara",
    },
  },
  { timestamps: true }
);

pemasukanLainSchema.index({ semesterId: 1, tanggalMasuk: -1 });

module.exports = mongoose.models.PemasukanLain || mongoose.model("PemasukanLain", pemasukanLainSchema);
```

---

### D. Koleksi `Pengeluaran` (`src/models/Pengeluaran.js`) — [BARU: CASH OUT]
Mencatat penarikan atau pengeluaran dana kas kelas untuk belanja/kebutuhan kelas.

```javascript
const mongoose = require("mongoose");

const pengeluaranSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    judul: {
      type: String,
      required: [true, "Keperluan / judul pengeluaran wajib diisi"],
      trim: true,
      // Contoh: "Fotokopi Modul Praktikum Algoritma", "Beli Spidol & Kabel HDMI"
    },
    kategori: {
      type: String,
      required: [true, "Kategori pengeluaran wajib diisi"],
      enum: {
        values: [
          "Akademik & Materi",
          "Perlengkapan Kelas",
          "Acara & Konsumsi",
          "Sosial & Santunan",
          "Lainnya",
        ],
        message: "Kategori pengeluaran tidak valid",
      },
      default: "Perlengkapan Kelas",
    },
    nominal: {
      type: Number,
      required: [true, "Nominal pengeluaran wajib diisi"],
      min: [1, "Nominal pengeluaran minimal Rp 1"],
    },
    tanggalPengeluaran: {
      type: Date,
      default: Date.now,
    },
    penanggungJawab: {
      type: String,
      required: [true, "Penanggung jawab/penerima uang wajib diisi"],
      trim: true,
      // Contoh: "Budi (Sie Perlengkapan)", "Ketua Kelas"
    },
    keterangan: {
      type: String,
      trim: true,
    },
    buktiNotaUrl: {
      type: String,
      trim: true,
      // URL gambar struk / nota pembelanjaan (opsional)
    },
    dicatatOleh: {
      type: String,
      default: "Bendahara",
    },
  },
  { timestamps: true }
);

pengeluaranSchema.index({ semesterId: 1, tanggalPengeluaran: -1 });

module.exports = mongoose.models.Pengeluaran || mongoose.model("Pengeluaran", pengeluaranSchema);
```

---

### E. Koleksi `PaymentHistory` (`src/models/PaymentHistory.js`)
Audit trail otomatis untuk mutasi kas (uang masuk maupun keluar).

```javascript
const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: [true, "Semester wajib ditentukan"],
      index: true,
    },
    kasId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kas",
      required: false,
    },
    pengeluaranId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pengeluaran",
      required: false,
    },
    nama: {
      type: String,
      required: true,
      trim: true,
    },
    nim: {
      type: String,
      trim: true,
    },
    aksi: {
      type: String,
      required: true,
      enum: [
        "CREATE", 
        "UPDATE_STATUS", 
        "UPDATE_NOMINAL", 
        "DELETE", 
        "IMPORT_EXCEL", 
        "EXPENSE_CREATE", 
        "EXPENSE_DELETE"
      ],
    },
    nominal: {
      type: Number,
    },
    statusLama: {
      type: String,
    },
    statusBaru: {
      type: String,
    },
    keterangan: {
      type: String,
    },
    waktu: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

paymentHistorySchema.index({ semesterId: 1, waktu: -1 });

module.exports = mongoose.models.PaymentHistory || mongoose.model("PaymentHistory", paymentHistorySchema);
```

---

## 3. Aturan & Integritas Basis Data (Rules)

1. **Aturan Semester Aktif Tunggal**:
   Hanya boleh ada **tepat satu** dokumen di koleksi `Semester` yang memiliki `isAktif: true`. Setiap operasi aktivasi semester harus menonaktifkan semester lainnya terlebih dahulu (`Semester.updateMany({}, { isAktif: false })`).

2. **Kalkulasi Saldo Kas Bersih (Net Real Balance)**:
   $$\text{Total Pemasukan} = \sum (\text{Nominal Kas Lunas}) + \sum (\text{Nominal Pemasukan Lain})$$
   $$\text{Total Pengeluaran} = \sum (\text{Nominal Pengeluaran})$$
   $$\text{Saldo Kas Riil Saat Ini} = \text{Total Pemasukan} - \text{Total Pengeluaran}$$

3. **Validasi Defisit (Pencegahan Saldo Negatif)**:
   Saat membuat dokumen `Pengeluaran` baru, backend disarankan memvalidasi apakah $\text{Nominal Pengeluaran} \le \text{Saldo Kas Riil}$ untuk mencegah kas bon / defisit yang tidak terotorisasi.

4. **Immutability History**:
   Dokumen di koleksi `PaymentHistory` bersifat *append-only* (hanya boleh dibuat/dibaca, tidak boleh diubah atau dihapus oleh bendahara).
