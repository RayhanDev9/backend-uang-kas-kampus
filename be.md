# ⚙️ Backend API Architecture & Rules (`be.md`)

Dokumen spesifikasi teknis REST API Node.js & Express.js untuk backend **KasKita**, mencakup kontrak endpoint multi-semester, pemasukan non-kas, **pengeluaran kas (cash out / belanja kelas)**, pemrosesan Excel/CSV, audit history, dan keamanan.

---

## 1. Dependensi

Jalankan di direktori `backend/`:
```bash
npm install multer xlsx exceljs
```

---

## 2. Struktur Modul Backend (`src/`)

```text
src/
├── config/
│   └── db.js
├── models/
│   ├── Semester.js
│   ├── Kas.js
│   ├── PemasukanLain.js
│   ├── Pengeluaran.js         (BARU: Cash Out / Belanja Kelas)
│   └── PaymentHistory.js      (Audit Trail Kas & Pengeluaran)
├── middlewares/
│   ├── authPin.js             (Verifikasi header x-admin-pin)
│   └── upload.js              (Multer memory storage untuk file excel/csv)
├── controllers/
│   ├── semesterController.js
│   ├── kasController.js
│   ├── pemasukanLainController.js
│   ├── pengeluaranController.js (BARU)
│   ├── historyController.js
│   └── excelController.js
└── routes/
    ├── semesterRoutes.js
    ├── kasRoutes.js
    ├── pemasukanLainRoutes.js
    ├── pengeluaranRoutes.js     (BARU)
    ├── historyRoutes.js
    └── excelRoutes.js
```

---

## 3. Kontrak Endpoint REST API

### A. Modul Semester (`/api/semesters`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/semesters` | Publik | Ambil semua daftar semester |
| `GET` | `/api/semesters/active` | Publik | Ambil semester yang sedang aktif |
| `POST` | `/api/semesters` | Bendahara (`x-admin-pin`) | Buat semester baru |
| `PUT` | `/api/semesters/:id/activate` | Bendahara (`x-admin-pin`) | Aktifkan semester terpilih |

---

### B. Modul Kas (`/api/kas`) — Ringkasan Saldo Terkonsolidasi

* **`GET /api/kas?semesterId=...&status=...&search=...`**
* **Kalkulasi `summary` mencakup uang masuk dan pengeluaran**:
  ```json
  {
    "summary": {
      "totalKasLunas": 1500000,
      "totalPemasukanLain": 350000,
      "totalPemasukan": 1850000,
      "totalPengeluaran": 250000,
      "saldoBersih": 1600000,
      "totalSaldo": 1600000,
      "totalLunas": 30,
      "totalBelumLunas": 5,
      "targetKasTotal": 1750000
    },
    "semester": { ... },
    "data": [ ... ]
  }
  ```

---

### C. Modul Pemasukan Lain (`/api/pemasukan-lain`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/pemasukan-lain?semesterId=...` | Publik | Daftar pemasukan non-kas (sisa semester lalu, dll) |
| `POST` | `/api/pemasukan-lain` | Bendahara (`x-admin-pin`) | Catat pemasukan non-kas baru |
| `DELETE` | `/api/pemasukan-lain/:id` | Bendahara (`x-admin-pin`) | Hapus catatan pemasukan lain |

---

### D. Modul Pengeluaran / Belanja Kas (`/api/pengeluaran`) — [BARU: CASH OUT]

Modul untuk mencatat uang kas yang ditarik dan dibelanjakan untuk keperluan kelas:

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/pengeluaran?semesterId=...&kategori=...&search=...` | Publik | Ambil daftar belanja/pengeluaran kas kelas |
| `POST` | `/api/pengeluaran` | Bendahara (`x-admin-pin`) | Catat penarikan/pengeluaran uang kas |
| `DELETE` | `/api/pengeluaran/:id` | Bendahara (`x-admin-pin`) | Hapus / batalkan catatan pengeluaran |

**Format Request POST `/api/pengeluaran`:**
```json
{
  "semesterId": "6734abc...",
  "judul": "Fotokopi Modul Praktikum Jaringan",
  "kategori": "Akademik & Materi",
  "nominal": 75000,
  "tanggalPengeluaran": "2024-10-15",
  "penanggungJawab": "Budi Santoso (Sie Perlengkapan)",
  "keterangan": "Fotokopi 35 set modul untuk pertemuan lab ke-4",
  "buktiNotaUrl": "https://res.cloudinary.com/.../nota.jpg"
}
```

**Aturan Bisnis Backend (Business Logic)**:
1. **Validasi Saldo**: Sebelum menyimpan pengeluaran, periksa apakah $\text{Saldo Kas} \ge \text{Nominal Pengeluaran}$. Jika kas tidak cukup, kembalikan response peringatan defisit kas (HTTP 400).
2. **Auto-Logging Audit**: Begitu pengeluaran disimpan, sistem otomatis mencatat dokumen baru di `PaymentHistory` dengan aksi `EXPENSE_CREATE`.
3. **Rollback saat Delete**: Jika catatan pengeluaran dihapus, saldo otomatis kembali bertambah dan dicatat di `PaymentHistory` dengan aksi `EXPENSE_DELETE`.

---

### E. Modul Audit History (`/api/history`)

* **`GET /api/history?semesterId=...&limit=50`** (Publik)
* Mengembalikan log mutasi lengkap:
  * Pembuatan kas (`CREATE`)
  * Perubahan status lunas (`UPDATE_STATUS`)
  * Penghapusan kas (`DELETE`)
  * Impor data massal (`IMPORT_EXCEL`)
  * **Penarikan uang belanja (`EXPENSE_CREATE`)**
  * **Pembatalan belanja (`EXPENSE_DELETE`)**

---

### F. Modul Export & Import File Excel/CSV

* `GET /api/kas/template`: Mengunduh template Excel (`.xlsx`).
* `GET /api/kas/export?semesterId=...&format=xlsx`: 
  * Menghasilkan file Excel multi-sheet:
    * **Sheet 1 (Iuran Kas Mahasiswa)**: Daftar mahasiswa, NIM, nominal, status lunas.
    * **Sheet 2 (Pemasukan Non-Kas)**: Rincian sisa semester lalu, sponsor, danus.
    * **Sheet 3 (Laporan Pengeluaran Kas)**: Rincian belanja kelas, kategori, nominal, dan penanggung jawab.
    * **Sheet Ringkasan**: Rekapitulasi Total Pemasukan - Total Pengeluaran = Saldo Kas Akhir.
* `POST /api/kas/import`: Batch upload data kas mahasiswa dari file `.xlsx` atau `.csv` (`x-admin-pin`).
