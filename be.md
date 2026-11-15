# ⚙️ Backend API Architecture & Rules (`be.md`)

Dokumen spesifikasi teknis REST API Node.js & Express.js untuk backend **KasKita**, mencakup kontrak endpoint multi-semester, pemasukan non-kas, **pengeluaran kas (termasuk modul Pengembalian Kas / Refund - Opsi 1)**, pemrosesan Excel/CSV, audit history, dan keamanan.

---

## 1. Dependensi

Jalankan di direktori `beckend/`:
```bash
npm install multer xlsx exceljs
```

---

## 2. Struktur Modul Backend (`src/`)

```text
src/
├── config/
│   └── db.js                  (Koneksi MongoDB Atlas Mongoose)
├── models/
│   ├── Semester.js            (Multi-semester & active flag)
│   ├── Kas.js                 (Iuran kas mahasiswa)
│   ├── PemasukanLain.js       (Sisa kas lalu, sponsor, danus)
│   ├── Pengeluaran.js         (Belanja kelas & Pengembalian Kas / Refund)
│   └── PaymentHistory.js      (Audit trail mutasi masuk & keluar)
├── middlewares/
│   ├── authPin.js             (Verifikasi header x-admin-pin)
│   └── upload.js              (Multer memory storage untuk file excel/csv)
├── controllers/
│   ├── semesterController.js
│   ├── kasController.js       (Perhitungan summary terkonsolidasi & refund breakdown)
│   ├── pemasukanLainController.js
│   ├── pengeluaranController.js (Validasi kategori belanja & Pengembalian Kas)
│   ├── historyController.js
│   └── excelController.js     (Multi-sheet export & batch import)
└── routes/
    ├── semesterRoutes.js      (/api/semesters)
    ├── kasRoutes.js           (/api/kas)
    ├── pemasukanLainRoutes.js (/api/pemasukan-lain)
    ├── pengeluaranRoutes.js   (/api/pengeluaran)
    ├── historyRoutes.js       (/api/history)
    └── excelRoutes.js         (/api/excel)
```

---

## 3. Kontrak Endpoint REST API

### A. Modul Semester (`/api/semesters`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/semesters` | Publik | Ambil semua daftar semester (diurutkan berdasarkan tanggal) |
| `GET` | `/api/semesters/active` | Publik | Ambil semester yang sedang aktif |
| `POST` | `/api/semesters` | Bendahara (`x-admin-pin`) | Buat semester baru |
| `PUT` | `/api/semesters/:id/activate` | Bendahara (`x-admin-pin`) | Aktifkan semester terpilih (menonaktifkan semester lain) |

---

### B. Modul Kas (`/api/kas`) — Ringkasan Saldo Terkonsolidasi & Rincian Refund

* **Endpoint**: `GET /api/kas?semesterId=...&status=...&search=...`
* **Kalkulasi `summary` mencakup rincian Belanja Kelas vs Uang Dikembalikan (Opsi 1)**:
  ```json
  {
    "success": true,
    "summary": {
      "totalKas": 1825000,
      "totalKasLunas": 1470000,
      "totalPemasukanLain": 0,
      "totalPemasukan": 1825000,
      "totalPengeluaran": 1735000,
      "totalPengeluaranOperasional": 1265000,
      "totalUangDikembalikan": 470000,
      "saldoBersih": 90000,
      "totalSaldo": 90000,
      "totalLunas": 21,
      "totalBelumLunas": 12,
      "targetKasTotal": 2310000
    },
    "semester": {
      "_id": "6734abc...",
      "nama": "Semester Genap 2025/2026",
      "kode": "2025-GENAP",
      "isAktif": false,
      "targetKasPerMhs": 70000
    },
    "data": [ ... ]
  }
  ```

> [!TIP]
> Frontend dapat memanfaatkan `totalUangDikembalikan` dan `totalPengeluaranOperasional` untuk memberikan informasi transparan kepada mahasiswa mengenai berapa dana yang dipakai belanja kelas dan berapa dana sisa yang dikembalikan ke kantong mahasiswa.

---

### C. Modul Pemasukan Lain (`/api/pemasukan-lain`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/pemasukan-lain?semesterId=...` | Publik | Ambil daftar pemasukan non-kas |
| `POST` | `/api/pemasukan-lain` | Bendahara (`x-admin-pin`) | Catat pemasukan non-kas (Saldo Lalu, Danus, dll) |
| `DELETE` | `/api/pemasukan-lain/:id` | Bendahara (`x-admin-pin`) | Hapus catatan pemasukan lain |

---

### D. Modul Pengeluaran / Belanja & Pengembalian Kas (`/api/pengeluaran`)

Modul untuk mencatat uang kas yang keluar dari kas bendahara:

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/pengeluaran?semesterId=...&kategori=...&search=...` | Publik | Ambil daftar pengeluaran kas kelas |
| `POST` | `/api/pengeluaran` | Bendahara (`x-admin-pin`) | Catat pengeluaran kas atau pengembalian sisa kas |
| `DELETE` | `/api/pengeluaran/:id` | Bendahara (`x-admin-pin`) | Hapus / batalkan catatan pengeluaran |

#### 1. Kategori Pengeluaran yang Didukung (`kategori`):
1. **`"Pengembalian Kas"`** *(BARU - Opsi 1: Pembagian sisa uang kas kembali ke mahasiswa)*
2. **`"Perlengkapan Kelas"`** *(Spidol, kabel, colokan, pengharum)*
3. **`"Acara & Konsumsi"`** *(Air minum dosen, konsumsi kelas)*
4. **`"Akademik & Materi"`** *(Print absen, fotokopi modul)*
5. **`"Sosial & Santunan"`** *(Sumbangan duka/sakit)*
6. **`"Lainnya"`**

#### 2. Format Request POST `/api/pengeluaran` untuk Pengembalian Kas (Refund):
```json
{
  "semesterId": "6af9a5738e46238d695eebee",
  "judul": "Pengembalian Sisa Kas ke Mahasiswa (Semester Selesai)",
  "kategori": "Pengembalian Kas",
  "nominal": 470000,
  "tanggalPengeluaran": "2026-06-27",
  "penanggungJawab": "Bendahara Kelas",
  "keterangan": "Pembagian pengembalian kas kepada mahasiswa yang telah melunasi iuran",
  "buktiNotaUrl": ""
}
```

#### 3. Aturan Bisnis Backend (Business Rules):
1. **Validasi Saldo Kas (Pencegahan Defisit)**:
   Sebelum menyimpan pengeluaran refund, periksa apakah $\text{Saldo Kas Riil} \ge \text{Nominal Pengembalian}$. Jika kas tidak cukup, kembalikan response HTTP 400.
2. **Pencatatan Audit Trail Otomatis**:
   Pencatatan pengeluaran refund otomatis membuat dokumen di `PaymentHistory` dengan aksi `EXPENSE_CREATE`.
3. **Rollback saat Delete**:
   Jika catatan pengembalian dihapus/dibatalkan, saldo otomatis kembali bertambah dan dicatat di `PaymentHistory` dengan aksi `EXPENSE_DELETE`.

---

### E. Modul Audit History (`/api/history`)

* **`GET /api/history?semesterId=...&limit=50`** (Publik)
* Mengembalikan log mutasi lengkap:
  * Pembuatan kas (`CREATE`)
  * Perubahan status lunas (`UPDATE_STATUS`)
  * Penghapusan kas (`DELETE`)
  * Impor data massal (`IMPORT_EXCEL`)
  * **Penarikan uang belanja operasional (`EXPENSE_CREATE`)**
  * **Pencatatan pengembalian sisa kas (`EXPENSE_CREATE` - kategori Pengembalian Kas)**
  * **Pembatalan belanja / refund (`EXPENSE_DELETE`)**

---

### F. Modul Export & Import File Excel/CSV (`/api/excel`)

* `GET /api/excel/template`: Mengunduh template input data kas mahasiswa.
* `GET /api/excel/export?semesterId=...`:
  * Menghasilkan file Excel multi-sheet terstruktur:
    * **Sheet 1 (Iuran Kas Mahasiswa)**: Daftar mahasiswa, NIM masked, nominal, status lunas.
    * **Sheet 2 (Pemasukan Non-Kas)**: Rincian sisa semester lalu, kas UTS/UAS, danus.
    * **Sheet 3 (Laporan Pengeluaran Kas)**: Rincian belanja kelas dan baris pengembalian kas.
    * **Sheet 4 (Ringkasan Saldo Kas)**: Rekapitulasi Total Kas Masuk, Total Belanja Operasional, Total Uang Dikembalikan, dan Sisa Saldo Kas Bersih.
* `POST /api/excel/import`: Batch import data kas mahasiswa dari file `.xlsx` atau `.csv` (`x-admin-pin`).
