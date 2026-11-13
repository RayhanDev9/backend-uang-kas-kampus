# ⚙️ Backend API Architecture & Rules (`be.md`)

Dokumen spesifikasi teknis REST API Node.js & Express.js untuk backend **KasKita**, mencakup kontrak endpoint, pemrosesan Excel/CSV, audit history, dan keamanan.

---

## 1. Dependensi Tambahan

Jalankan di direktori `backend/`:
```bash
npm install multer xlsx exceljs
```

* `multer`: Menangani upload file multipart (`multipart/form-data`) ke memori buffer.
* `xlsx` (*SheetJS*): Membaca file `.xlsx` dan `.csv` hasil upload secara efisien.
* `exceljs`: Menghasilkan (*generate*) file Excel `.xlsx` dengan pewarnaan header, format currency IDR, auto-width kolom, dan font yang rapi saat diekspor.

---

## 2. Struktur Modul Backend (`src/`)

```text
src/
├── config/
│   └── db.js
├── models/
│   ├── Semester.js        (Baru)
│   ├── Kas.js             (Diperbarui)
│   ├── PemasukanLain.js   (Baru)
│   └── PaymentHistory.js  (Baru)
├── middlewares/
│   ├── authPin.js         (Verifikasi header x-admin-pin)
│   └── upload.js          (Multer memory storage untuk file excel/csv)
├── controllers/
│   ├── semesterController.js   (Baru)
│   ├── kasController.js        (Diperbarui)
│   ├── pemasukanLainController.js (Baru)
│   ├── historyController.js    (Baru)
│   └── excelController.js      (Baru)
└── routes/
    ├── semesterRoutes.js       (Baru)
    ├── kasRoutes.js            (Diperbarui)
    ├── pemasukanLainRoutes.js  (Baru)
    ├── historyRoutes.js        (Baru)
    └── excelRoutes.js          (Baru)
```

---

## 3. Kontrak Endpoint REST API

### A. Modul Semester (`/api/semesters`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/semesters` | Publik | Ambil semua daftar semester (diurutkan tanggal terbaru) |
| `GET` | `/api/semesters/active` | Publik | Ambil satu semester yang sedang aktif |
| `POST` | `/api/semesters` | Bendahara (`x-admin-pin`) | Buat semester baru |
| `PUT` | `/api/semesters/:id/activate` | Bendahara (`x-admin-pin`) | Jadikan semester ini aktif (dan nonaktifkan lainnya) |

**Format Request POST `/api/semesters`:**
```json
{
  "nama": "Semester Ganjil 2024/2025",
  "kode": "2024-1",
  "isAktif": true,
  "targetKasPerMhs": 50000,
  "tanggalMulai": "2024-09-01",
  "tanggalSelesai": "2025-01-31"
}
```

---

### B. Modul Kas (`/api/kas`) — Diperbarui

* **`GET /api/kas?semesterId=...&status=...&search=...`**
  * Jika parameter `semesterId` tidak dikirim oleh client, backend otomatis mengambil data dari **semester yang sedang aktif**.
  * **Kalkulasi `summary` diperbarui**:
    ```json
    {
      "summary": {
        "totalKasLunas": 1500000,
        "totalPemasukanLain": 350000,
        "totalSaldo": 1850000,
        "totalLunas": 30,
        "totalBelumLunas": 5,
        "targetKasTotal": 1750000
      },
      "semester": {
        "_id": "6734abc...",
        "nama": "Semester Ganjil 2024/2025",
        "kode": "2024-1",
        "isAktif": true
      },
      "data": [ ... ]
    }
    ```

---

### C. Modul Pemasukan Lain (`/api/pemasukan-lain`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/pemasukan-lain?semesterId=...` | Publik | Daftar pemasukan non-kas pada semester terpilih |
| `POST` | `/api/pemasukan-lain` | Bendahara (`x-admin-pin`) | Catat uang masuk non-kas (sisa semester lalu, dll) |
| `DELETE` | `/api/pemasukan-lain/:id` | Bendahara (`x-admin-pin`) | Hapus catatan pemasukan lain |

**Format Request POST `/api/pemasukan-lain`:**
```json
{
  "semesterId": "6734abc...",
  "judul": "Sisa Saldo Kas Semester Genap Lalu",
  "kategori": "Sisa Semester Lalu",
  "nominal": 450000,
  "tanggalMasuk": "2024-09-02",
  "keterangan": "Sisa kas yang ditransfer dari periode kepengurusan lama"
}
```

---

### D. Modul Audit History (`/api/history`)

* **`GET /api/history?semesterId=...&limit=50`** (Publik)
  * Menampilkan urutan log mutasi dan perubahan status kas secara kronologis (terbaru di atas).

* **Aturan Logging Otomatis di Backend**:
  Setiap kali controller kas mengeksekusi operasi berikut, sistem wajib membuat dokumen di `PaymentHistory`:
  1. `createKas` $\rightarrow$ Catat aksi `CREATE`.
  2. `updateKas` $\rightarrow$ Jika status berubah, catat `UPDATE_STATUS` (`statusLama` & `statusBaru`). Jika nominal berubah, catat `UPDATE_NOMINAL`.
  3. `deleteKas` $\rightarrow$ Catat aksi `DELETE` beserta snapshot nama dan nominal.
  4. `importKas` $\rightarrow$ Catat aksi `IMPORT_EXCEL` dengan total baris data yang berhasil dimasukkan.

---

### E. Modul Export & Import File Excel/CSV

#### 1. Download Template Excel
* **`GET /api/kas/template`**
* Mengembalikan file template `.xlsx` yang sudah diformat dengan baris contoh:
  * Kolom: `NIM`, `Nama Mahasiswa`, `Periode`, `Nominal`, `Status` (Lunas / Belum Lunas).
  * Baris 2 berisi petunjuk format (misal: "Contoh: 2401020035 | Budi Santoso | Minggu 1 | 10000 | Lunas").

#### 2. Export Data Kas (.xlsx)
* **`GET /api/kas/export?semesterId=...&format=xlsx`**
* Menghasilkan file download Excel bernama `Laporan-Kas-[NamaSemester]-[Tanggal].xlsx`.
* **Spesifikasi Tampilan Excel (`exceljs`)**:
  * Header tabel berwarna Emerald (`#059669`) dengan teks putih tebal.
  * Kolom `NIM` diformat sebagai **Text** agar angka tidak berubah menjadi notasi saintifik.
  * Kolom `Nominal` diformat dengan *accounting currency* (`"Rp" #,##0`).
  * Kolom `Status` diberi warna latar halus (Hijau untuk Lunas, Kuning untuk Belum Lunas).
  * Di bagian bawah, terdapat baris **Total Kas Terkumpul** dengan fungsi formula `=SUM(...)`.

#### 3. Upload & Batch Import Data (.xlsx / .csv)
* **`POST /api/kas/import`** (Memerlukan header `x-admin-pin`)
* **Request Body**: `multipart/form-data` dengan field:
  * `file`: Berkas `.xlsx` atau `.csv` (maksimal 5MB).
  * `semesterId`: ID semester tujuan.
* **Aturan Pemrosesan Backend (`xlsx` SheetJS)**:
  1. Baca buffer file melalui `xlsx.read(req.file.buffer, { type: 'buffer' })`.
  2. Parse sheet pertama menjadi format JSON.
  3. Validasi setiap baris:
     - Jika baris kosong, lewati (*skip*).
     - NIM dan Nama wajib terisi.
     - Nominal harus berupa angka valid $\ge 0$.
     - Status harus berupa `"Lunas"` atau `"Belum Lunas"` (default jika kosong: `"Belum Lunas"`).
  4. Lakukan penyimpanan massal menggunakan `Kas.insertMany(validRecords)`.
  5. Buat entri log di `PaymentHistory` untuk audit import.
  6. Return respons jumlah data yang sukses dan daftar baris yang dilewati (jika ada).

---

## 4. Standar Respons & Error Backend

Setiap endpoint mengembalikan struktur respons JSON konsisten:
```json
// Berhasil
{
  "success": true,
  "message": "Data berhasil diproses",
  "data": { ... }
}

// Gagal
{
  "success": false,
  "message": "PIN bendahara tidak valid atau salah.",
  "errors": [ ... ]
}
```
