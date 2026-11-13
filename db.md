# 🗄️ Database Architecture & Rules (`db.md`)

Dokumen spesifikasi teknis basis data MongoDB & Mongoose untuk proyek **KasKita**, mencakup koleksi multi-semester, pemasukan non-kas, riwayat transaksi, dan audit trail.

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
                ├───────────────────────────────┼───────────────────────────────┐
                ▼                               ▼                               ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│              Kas                │ │         PemasukanLain           │ │         PaymentHistory          │
├─────────────────────────────────┤ ├─────────────────────────────────┤ ├─────────────────────────────────┤
│ _id             : ObjectId      │ │ _id             : ObjectId      │ │ _id             : ObjectId      │
│ semesterId      : ObjectId(FK)  │ │ semesterId      : ObjectId(FK)  │ │ semesterId      : ObjectId(FK)  │
│ nim             : String        │ │ judul           : String        │ │ kasId           : ObjectId(opt) │
│ nama            : String        │ │ kategori        : Enum          │ │ nama            : String        │
│ periode         : String        │ │ nominal         : Number        │ │ nim             : String        │
│ nominal         : Number        │ │ tanggalMasuk    : Date          │ │ aksi            : Enum          │
│ status          : Enum          │ │ keterangan      : String        │ │ nominal         : Number        │
│ metodeBayar     : Enum          │ │ dicatatOleh     : String        │ │ statusLama      : String        │
│ tanggalBayar    : Date          │ └─────────────────────────────────┘ │ statusBaru      : String        │
└─────────────────────────────────┘                                     │ waktu           : Date          │
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

### B. Pembaruan Koleksi `Kas` (`src/models/Kas.js`)
Menambahkan referensi semester dan metode pembayaran pada data iuran mahasiswa.

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

// Compound index untuk mempercepat pencarian data kas per semester & pencegahan duplikasi
kasSchema.index({ semesterId: 1, nim: 1, periode: 1 });

module.exports = mongoose.models.Kas || mongoose.model("Kas", kasSchema);
```

---

### C. Koleksi `PemasukanLain` (`src/models/PemasukanLain.js`)
Mencatat pemasukan kelas di luar uang kas rutin mahasiswa.

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

### D. Koleksi `PaymentHistory` (`src/models/PaymentHistory.js`)
Audit trail otomatis untuk mencatat riwayat perubahan status kas dan mutasi uang.

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
      enum: ["CREATE", "UPDATE_STATUS", "UPDATE_NOMINAL", "DELETE", "IMPORT_EXCEL"],
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
2. **Kalkulasi Saldo Terkonsolidasi**:
   $$\text{Total Saldo Kelas} = \sum (\text{Nominal Kas Lunas}) + \sum (\text{Nominal Pemasukan Lain})$$
3. **Migrasi Data Lama (Backward Compatibility)**:
   - Jika ada data dokumen `Kas` yang belum memiliki `semesterId`, sistem akan otomatis membuat semester `"Semester 1 - Arsip"` dengan `isAktif: true` dan melakukan `updateMany({ semesterId: { $exists: false } }, { $set: { semesterId: defaultSemester._id } })`.
4. **Immutability History**:
   Dokumen di koleksi `PaymentHistory` bersifat *append-only* (hanya boleh dibuat/dibaca, tidak boleh diubah atau dihapus oleh bendahara).
