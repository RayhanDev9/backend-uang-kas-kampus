# ⚙️ Backend API Architecture & Specifications (`be.md`)

Dokumen spesifikasi teknis REST API Node.js & Express.js untuk backend **KasKita**. Dokumen ini mencakup arsitektur modul, kontrak API multi-semester, manajemen iuran kas mahasiswa (**termasuk Modul Matriks Absensi Mingguan & Edit Bendahara untuk Semester 1 & 2**), pemisahan dana non-iuran, sistem pengeluaran kas & pengembalian kas (Refund - Opsi 1), riwayat audit mutasi, dan ekspor Excel multi-sheet.

---

## 📌 Ringkasan Solusi Desain Backend

1. **Dukungan Dual-Mode Iuran**:
   * **Semester 1 & 2 (`tipeIuran: "MINGGUAN"`)**: Mendukung endpoint matriks mingguan (`GET /api/kas/matrix`) dan endpoint edit centang per pertemuan oleh bendahara (`PUT /api/kas/:id/pertemuan`).
   * **Semester 3 ke Atas (`tipeIuran: "SEKALI_BAYAR"`)**: Iuran tunggal/flat (UTS/UAS) menggunakan endpoint standar `/api/kas` tanpa kompleksitas kolom mingguan.
2. **Sinkronisasi Otomatis Integritas Data**:
   * Setiap kali bendahara mencentang/membatalkan status bayar pertemuan mahasiswa via `PUT /api/kas/:id/pertemuan`, sistem secara otomatis:
     $$\text{nominal} = \sum_{\text{detailMingguan}} (\text{bayar} == \text{true} \times \text{nominalPertemuan})$$
     $$\text{status} = (\text{nominal} \ge \text{targetKasPerMhs}) \ ? \ \text{"Lunas"} : \text{"Belum Lunas"}$$
   * Membuat log audit otomatis di `PaymentHistory` agar setiap perubahan riwayat terlacak.
3. **Pemisahan Uang Non-Iuran (Zero Contamination)**:
   * Uang masuk di luar iuran mingguan (Sisa Saldo Kas Lalu, Sponsor, Dana Usaha, Sisa Seminar) dikelola murni oleh controller `pemasukanLainController.js` agar tabel absensi mingguan tetap 100% murni memuat data mahasiswa.
4. **Modul Pengembalian Kas (Refund - Opsi 1)**:
   * Pengembalian sisa kas kelas di akhir semester dicatat sebagai dokumen `Pengeluaran` kategori `"Pengembalian Kas"`.
   * Saldo bersih kas dihitung secara real-time:
     $$\text{Saldo Bersih} = \text{Total Pemasukan} - (\text{Belanja Operasional} + \text{Uang Dikembalikan})$$

---

## 1. Struktur Modul Backend (`src/`)

```text
src/
├── config/
│   └── db.js                    (Koneksi MongoDB Atlas Mongoose)
├── models/
│   ├── Semester.js              (Tipe iuran MINGGUAN / SEKALI_BAYAR, daftar pertemuan)
│   ├── Kas.js                   (Data kas mahasiswa, detail mingguan, refund)
│   ├── PemasukanLain.js         (Dana non-iuran: sisa kas lalu, sponsor, seminar)
│   ├── Pengeluaran.js           (Belanja kelas & Pengembalian Kas / Refund)
│   └── PaymentHistory.js        (Audit trail mutasi kas & log perubahan status)
├── middlewares/
│   ├── authPin.js               (Verifikasi header x-admin-pin & Authorization Bearer token)
│   └── upload.js                (Multer memory storage untuk upload file Excel/CSV)
├── controllers/
│   ├── authController.js        (BARU: Login bendahara & verifikasi token sesi)
│   ├── semesterController.js    (CRUD semester & aktivasi semester aktif)
│   ├── kasController.js         (CRUD kas, summary saldo, matriks mingguan & update pertemuan)
│   ├── pemasukanLainController.js (CRUD dana non-iuran)
│   ├── pengeluaranController.js (Validasi pengeluaran & pengembalian kas)
│   ├── historyController.js     (Timeline log mutasi & audit trail)
│   └── excelController.js       (Export Excel multi-sheet & batch import)
└── routes/
    ├── authRoutes.js            (/api/auth: login & verify)
    ├── semesterRoutes.js        (/api/semesters)
    ├── kasRoutes.js             (/api/kas)
    ├── pemasukanLainRoutes.js   (/api/pemasukan-lain)
    ├── pengeluaranRoutes.js     (/api/pengeluaran)
    ├── historyRoutes.js         (/api/history)
    └── excelRoutes.js           (/api/excel)
```

---

## 2. Kontrak Endpoint REST API

### A. Modul Autentikasi Bendahara (`/api/auth`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/login` | Publik | Validasi PIN bendahara & penerbitan token sesi |
| `GET` | `/api/auth/verify` | Publik (dengan Token) | Verifikasi keabsahan token yang tersimpan di `localStorage` |

#### 1. Endpoint: `POST /api/auth/login`
* **Request Body**:
  ```json
  {
    "pin": "123456"
  }
  ```
* **Logika Backend**:
  1. Validasi input: `pin` harus berupa string tidak kosong.
  2. Periksa kecocokan PIN menggunakan `timingSafeEqual` terhadap `process.env.ADMIN_PIN`.
  3. Jika PIN salah: kembalikan HTTP 401:
     ```json
     {
       "success": false,
       "message": "PIN bendahara salah"
     }
     ```
  4. Jika PIN benar:
     - Terbitkan token autentikasi sesi (token terenkripsi / hash berbasis secret & timestamp).
     - Kembalikan HTTP 200:
     ```json
     {
       "success": true,
       "message": "Login bendahara berhasil",
       "token": "kaskita_auth_session_hash_token...",
       "role": "bendahara",
       "expiresAt": "2026-12-16T00:00:00.000Z"
     }
     ```

#### 2. Endpoint: `GET /api/auth/verify`
* **Header**: `Authorization: Bearer <token>` atau `x-admin-pin: <PIN>`
* **Fungsi**: Dipanggil frontend saat inisialisasi aplikasi untuk memvalidasi apakah token di `localStorage` masih sah atau sudah kedaluwarsa/tidak cocok.
* **Response**:
  ```json
  {
    "success": true,
    "valid": true,
    "role": "bendahara"
  }
  ```

---

### B. Modul Semester (`/api/semesters`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/semesters` | Publik | Ambil daftar semua semester (diurutkan kronologis) |
| `GET` | `/api/semesters/active` | Publik | Ambil semester yang sedang aktif |
| `POST` | `/api/semesters` | Bendahara (`x-admin-pin`) | Buat semester baru (menentukan `tipeIuran` & `daftarPertemuan`) |
| `PUT` | `/api/semesters/:id/activate` | Bendahara (`x-admin-pin`) | Aktifkan semester terpilih (menonaktifkan semester lain) |

#### Format Payload Pembuatan Semester Mingguan (`POST /api/semesters`):
```json
{
  "nama": "Semester Genap 2025/2026",
  "kode": "2025-GENAP",
  "tipeIuran": "MINGGUAN",
  "targetKasPerMhs": 70000,
  "tanggalMulai": "2026-03-01",
  "tanggalSelesai": "2026-06-30",
  "daftarPertemuan": [
    { "pertemuanKe": 1, "tanggal": "07/03", "label": "Pertemuan 1" },
    { "pertemuanKe": 2, "tanggal": "14/03", "label": "Pertemuan 2" },
    { "pertemuanKe": 3, "tanggal": "21/03", "label": "Pertemuan 3" },
    { "pertemuanKe": 4, "tanggal": "28/03", "label": "Pertemuan 4" },
    { "pertemuanKe": 5, "tanggal": "04/04", "label": "Pertemuan 5" },
    { "pertemuanKe": 6, "tanggal": "11/04", "label": "Pertemuan 6" },
    { "pertemuanKe": 7, "tanggal": "18/04", "label": "Pertemuan 7" },
    { "pertemuanKe": 8, "tanggal": "25/04", "label": "Pertemuan 8" },
    { "pertemuanKe": 9, "tanggal": "02/05", "label": "Pertemuan 9" },
    { "pertemuanKe": 10, "tanggal": "09/05", "label": "Pertemuan 10" },
    { "pertemuanKe": 11, "tanggal": "16/05", "label": "Pertemuan 11" },
    { "pertemuanKe": 12, "tanggal": "23/05", "label": "Pertemuan 12" },
    { "pertemuanKe": 13, "tanggal": "30/05", "label": "Pertemuan 13" },
    { "pertemuanKe": 14, "tanggal": "06/06", "label": "Pertemuan 14" }
  ]
}
```

---

### B. Modul Kas & Matriks Mingguan (`/api/kas`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/kas` | Publik | Ambil daftar kas ringkas + summary saldo terkonsolidasi |
| `GET` | `/api/kas/matrix` | Publik | **Ambil struktur matriks absensi mingguan per tanggal** |
| `POST` | `/api/kas` | Bendahara (`x-admin-pin`) | Tambah data kas mahasiswa baru |
| `PUT` | `/api/kas/:id` | Bendahara (`x-admin-pin`) | Update data profil kas mahasiswa |
| `PUT` | `/api/kas/:id/pertemuan` | Bendahara (`x-admin-pin`) | **Toggle / Update status centang bayar per pertemuan** |
| `DELETE` | `/api/kas/:id` | Bendahara (`x-admin-pin`) | Hapus data kas mahasiswa |

---

#### 1. Endpoint: `GET /api/kas/matrix` (Spesifikasi Matriks Mingguan)
* **Query Parameter**: `semesterId` (opsional, default ke semester aktif).
* **Fungsi**: Menyajikan data tabel bergaya spreadsheet/excel berisi daftar tanggal pertemuan dan status bayar setiap mahasiswa.
* **Format Response**:
```json
{
  "success": true,
  "semester": {
    "_id": "6af9a5738e46238d695eebee",
    "nama": "Semester Genap 2025/2026",
    "kode": "2025-GENAP",
    "tipeIuran": "MINGGUAN",
    "targetKasPerMhs": 70000,
    "nominalPerMinggu": 5000
  },
  "daftarPertemuan": [
    { "pertemuanKe": 1, "tanggal": "07/03", "label": "Pertemuan 1" },
    { "pertemuanKe": 2, "tanggal": "14/03", "label": "Pertemuan 2" },
    { "pertemuanKe": 3, "tanggal": "21/03", "label": "Pertemuan 3" }
  ],
  "rows": [
    {
      "_id": "6734123456789abcdef00001",
      "no": 1,
      "nim": "251******01",
      "nama": "ADITYA PRATAMA",
      "nominal": 70000,
      "targetKas": 70000,
      "status": "Lunas",
      "totalPertemuanBayar": 14,
      "detailMingguan": [
        { "pertemuanKe": 1, "tanggal": "07/03", "bayar": true, "nominal": 5000 },
        { "pertemuanKe": 2, "tanggal": "14/03", "bayar": true, "nominal": 5000 },
        { "pertemuanKe": 3, "tanggal": "21/03", "bayar": true, "nominal": 5000 }
      ]
    },
    {
      "_id": "6734123456789abcdef00002",
      "no": 2,
      "nim": "251******02",
      "nama": "ALFIAN NUR HIDAYAT",
      "nominal": 25000,
      "targetKas": 70000,
      "status": "Belum Lunas",
      "totalPertemuanBayar": 5,
      "detailMingguan": [
        { "pertemuanKe": 1, "tanggal": "07/03", "bayar": true, "nominal": 5000 },
        { "pertemuanKe": 2, "tanggal": "14/03", "bayar": true, "nominal": 5000 },
        { "pertemuanKe": 3, "tanggal": "21/03", "bayar": false, "nominal": 5000 }
      ]
    }
  ],
  "totalPerMinggu": [
    { "pertemuanKe": 1, "tanggal": "07/03", "jumlahBayar": 31, "totalUang": 155000 },
    { "pertemuanKe": 2, "tanggal": "14/03", "jumlahBayar": 29, "totalUang": 145000 },
    { "pertemuanKe": 3, "tanggal": "21/03", "jumlahBayar": 25, "totalUang": 125000 }
  ],
  "grandTotalKas": 1470000
}
```

---

#### 2. Endpoint: `PUT /api/kas/:id/pertemuan` (Update/Edit Absensi Mingguan oleh Bendahara)
* **Header Wajib**: `x-admin-pin: <PIN_BENDAHARA>`
* **Parameter**: `id` (ObjectId dari dokumen `Kas`)
* **Request Body**:
```json
{
  "pertemuanKe": 3,
  "bayar": true,
  "nominal": 5000
}
```
* **Logika Pemrosesan Backend**:
  1. Verifikasi PIN admin melalui middleware `authPin`.
  2. Cari dokumen `Kas` berdasarkan `id`. Jika tidak ditemukan, kembalikan HTTP 404.
  3. Cek apakah elemen `pertemuanKe` sudah ada dalam array `detailMingguan`:
     - Jika ada: update nilai `bayar` dan `nominal`.
     - Jika belum ada: tambahkan object baru ke array `detailMingguan`.
  4. Hitung ulang total nominal kas mahasiswa:
     $$\text{kas.nominal} = \sum_{item \in kas.detailMingguan} (item.bayar \ ? \ item.nominal : 0)$$
  5. Periksa status pelunasan:
     - Ambil `targetKasPerMhs` dari semester terkait.
     - Jika $\text{kas.nominal} \ge \text{targetKasPerMhs}$, set `kas.status = "Lunas"`.
     - Jika tidak, set `kas.status = "Belum Lunas"`.
  6. Simpan dokumen `Kas`.
  7. Catat entri riwayat ke `PaymentHistory`:
     - `aksi`: `"UPDATE_STATUS"`
     - `nama`: `kas.nama`
     - `nim`: `kas.nim`
     - `nominal`: `kas.nominal`
     - `statusBaru`: `kas.status`
     - `keterangan`: `Update Pertemuan ke-${pertemuanKe} (${bayar ? 'LUNAS / ✓' : 'BATAL / -'}) oleh Bendahara`
  8. Kembalikan data kas terbaru beserta status sukses.

---

### C. Modul Pemasukan Non-Iuran (`/api/pemasukan-lain`)
Memastikan uang kas di luar iuran mingguan tidak mengotori tabel matriks absensi mingguan:

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/pemasukan-lain?semesterId=...` | Publik | Ambil daftar sumber dana non-iuran |
| `POST` | `/api/pemasukan-lain` | Bendahara (`x-admin-pin`) | Catat dana masuk non-iuran (Sisa Kas Lalu, Seminar, Danus) |
| `DELETE` | `/api/pemasukan-lain/:id` | Bendahara (`x-admin-pin`) | Hapus catatan dana non-iuran |

* **Kategori yang Didukung**:
  1. `"Sisa Semester Lalu"` (misal: Sisa Kas Semester 2 Rp 90.000 dialihkan ke Semester 3)
  2. `"Dana Usaha"` (penjualan atribut kelas, makanan)
  3. `"Sumbangan / Donasi"`
  4. `"Sisa Seminar / Workshop"` (misal: Sisa Dana Seminar Rp 15.000)
  5. `"Lainnya"`

---

### D. Modul Pengeluaran & Pengembalian Kas / Refund (`/api/pengeluaran`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/pengeluaran?semesterId=...` | Publik | Ambil riwayat pengeluaran kas kelas |
| `POST` | `/api/pengeluaran` | Bendahara (`x-admin-pin`) | Catat belanja operasional atau pengembalian sisa kas |
| `DELETE` | `/api/pengeluaran/:id` | Bendahara (`x-admin-pin`) | Batalkan catatan pengeluaran / refund |

#### Aturan Bisnis & Validasi Pengembalian Kas (Refund):
1. **Kategori Khusus**: `"Pengembalian Kas"`.
2. **Pencegahan Defisit Kas**:
   Sebelum transaksi disimpan, backend menghitung:
   $$\text{Saldo Tersedia} = \text{Total Pemasukan Riil} - \text{Total Pengeluaran Saat Ini}$$
   Jika $\text{nominal} > \text{Saldo Tersedia}$, tolak request dengan error HTTP 400: `"Nominal pengembalian/pengeluaran melebihi sisa saldo kas yang ada"`.
3. **Audit Trail**: Pembuatan dan penghapusan pengeluaran dicatat otomatis di `PaymentHistory` dengan kode `EXPENSE_CREATE` dan `EXPENSE_DELETE`.

---

### E. Modul Audit History & Mutasi Lengkap (`/api/history`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/history` | Publik | Ambil riwayat audit mutasi lengkap dengan filter & summary |

#### Query Parameters:
* `semesterId`: ID semester (opsional, default semester aktif).
* `kategori`: Filter jenis mutasi (`all`, `pemasukan`, `pengeluaran`, `refund`, `status`).
* `search`: Teks pencarian (NIM, Nama mahasiswa, keterangan belanja, PIC).
* `bulan`: Filter bulan (format: `YYYY-MM`, contoh: `2026-03`).
* `limit`: Jumlah data per request (default `100`, maksimal `500`).
* `page`: Halaman data untuk paginasi (default `1`).

#### Format Respons Terkonsolidasi:
```json
{
  "success": true,
  "summary": {
    "totalMutasi": 51,
    "totalKasMasuk": 1825000,
    "totalPengeluaranOperasional": 1265000,
    "totalUangDikembalikan": 470000
  },
  "daftarBulan": [
    { "key": "2026-06", "label": "Juni 2026" },
    { "key": "2026-05", "label": "Mei 2026" },
    { "key": "2026-04", "label": "April 2026" },
    { "key": "2026-03", "label": "Maret 2026" }
  ],
  "totalData": 51,
  "data": [
    {
      "_id": "6734123...",
      "aksi": "EXPENSE_CREATE",
      "nim": "-",
      "nama": "Pengembalian Sisa Kas ke Mahasiswa (Refund)",
      "nominal": 470000,
      "kategori": "Pengembalian Kas",
      "keterangan": "Pembagian sisa kas kepada 25 mahasiswa",
      "waktu": "2026-06-27T10:00:00.000Z"
    }
  ]
}
```

---

### F. Modul Export & Import File Excel (`/api/excel`)

* **Endpoint**: `GET /api/excel/export?semesterId=...`
* Menghasilkan file `.xlsx` dengan format multi-sheet komprehensif:
  1. **Sheet 1 — Matriks Absensi Mingguan** *(Khusus Semester MINGGUAN)*:
     - Header baris 1-3: Judul Laporan Kas Kelas & Nama Semester.
     - Kolom tabel: `[No, NIM, Nama, 07/03, 14/03, 21/03, ..., Total Bayar, Target, Status]`.
     - Nilai sel mingguan diisi simbol `✓` (jika bayar) dan `-` (jika belum).
     - Baris total di bagian bawah: Total Mahasiswa Bayar dan Total Uang per pertemuan.
  2. **Sheet 2 — Iuran Kas Ringkas**: Format tabular standar (NIM, Nama, Nominal, Status, Tanggal).
  3. **Sheet 3 — Pemasukan Non-Iuran**: Rincian dana dari sisa saldo semester lalu, sponsor, seminar.
  4. **Sheet 4 — Laporan Belanja & Refund**: Rincian pengeluaran operasional serta baris pengembalian uang kas ke mahasiswa.
  5. **Sheet 5 — Rekapitulasi Kas**: Summary Total Kas Masuk, Total Belanja Operasional, Total Uang Dikembalikan, dan Sisa Saldo Bersih Kas.

---

## 3. Matriks Perbandingan Fitur: Semester 1 & 2 vs Semester 3+

| Aspek | Semester 1 & 2 (01TPLE009 & 02TPLE009) | Semester 3 ke Atas (02TPLE009 Berjalan) |
|---|---|---|
| **`tipeIuran`** | `"MINGGUAN"` | `"SEKALI_BAYAR"` |
| **Penyimpanan di DB** | Array `detailMingguan` terisi per tanggal pertemuan | `detailMingguan: []` (kosong) |
| **Endpoint Matriks** | Aktif (`/api/kas/matrix`) | Mengembalikan status fallback bahwa semester ini flat |
| **Tampilan di Frontend** | Mendukung Toggle: `[📋 Ringkas]` & `[📊 Matriks Mingguan]` | Hanya `[📋 Ringkas]` (Toggle otomatis disembunyikan) |
| **Fitur Edit Bendahara** | Klik centang per pertemuan per baris mahasiswa | Input/edit nominal dan status lunas langsung |
| **Pemisahan Non-Iuran** | Tetap di `PemasukanLain` | Tetap di `PemasukanLain` |
| **Pengembalian Kas** | Sisa kas dibagikan kembali di akhir semester | Berlaku sesuai kebijakan kelas |

---

## 4. Keamanan & Penanganan Error

1. **Autentikasi PIN**:
   - Seluruh mutasi data (`POST`, `PUT`, `DELETE`) dilindungi header `x-admin-pin`.
   - Menggunakan perbandingan timing-safe atau validasi string terpusat di `authPin.js`.
2. **Sanitasi Input**:
   - Validasi nilai `pertemuanKe` harus berupa bilangan bulat positif $\ge 1$.
   - Validasi nilai `nominal` tidak boleh negatif.
   - Pengecekan masked NIM: Konsistensi format `251******01` s/d `251******33`.
3. **Response Standar Konsisten**:
   ```json
   {
     "success": false,
     "message": "Pesan deskriptif kesalahan"
   }
   ```

---

## 5. Rencana Pengujian Otomatis (Unit & Integration Tests)

1. `GET /api/kas/matrix`:
   - Menguji apakah semester dengan `tipeIuran: "MINGGUAN"` menghasilkan struktur `daftarPertemuan`, `rows`, dan `totalPerMinggu` yang valid.
   - Menguji bahwa semester dengan `tipeIuran: "SEKALI_BAYAR"` ditangani dengan aman tanpa crash.
2. `PUT /api/kas/:id/pertemuan`:
   - Menguji update pertemuan dari false menjadi true dan perhitungan otomatis `kas.nominal` serta `kas.status`.
   - Menguji update pertemuan dari true menjadi false (pembatalan).
   - Menguji penolakan jika header `x-admin-pin` tidak disertakan atau salah (HTTP 401).
   - Menguji pencatatan audit log otomatis di koleksi `PaymentHistory`.
3. `GET /api/excel/export`:
   - Memverifikasi file Excel yang dihasilkan memiliki sheet matriks mingguan saat mengekspor Semester 1 dan 2.
