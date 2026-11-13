# Backend API Kas Kampus

## Tujuan

REST API untuk mengelola transaksi kas mahasiswa menggunakan Express.js dan MongoDB dengan Mongoose. API menyediakan ringkasan pembayaran, melindungi operasi bendahara menggunakan PIN, dan disiapkan untuk deployment sebagai Vercel Serverless Function.

## Teknologi

- Node.js dan Express.js
- MongoDB (lokal untuk pengembangan, MongoDB Atlas untuk deployment)
- Mongoose
- `cors`, `dotenv`
- Vercel Serverless Functions

## Struktur Proyek

```text
backend/
├── api/
│   └── index.js
├── src/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   └── Kas.js
│   ├── controllers/
│   │   └── kasController.js
│   ├── routes/
│   │   └── kasRoutes.js
│   └── middlewares/
│       └── authPin.js
├── .env.example
├── .gitignore
├── vercel.json
├── package.json
└── README.md
```

## Menjalankan Secara Lokal

1. Pastikan Node.js 18+ dan MongoDB lokal atau Atlas tersedia.
2. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` dan ubah `ADMIN_PIN` menjadi nilai rahasia.
3. Pasang dependensi dengan `npm install`.
4. Jalankan server dengan `npm start` (port default `3000`, dapat diubah melalui `PORT`).
5. Jalankan tes dengan `npm test`.

`api/index.js` juga mengekspor aplikasi Express untuk digunakan Vercel. File `.env` tidak disertakan; `.env.example` hanya berisi contoh konfigurasi.

## Endpoint dan Kontrak API

#### `GET /api/kas` — publik

- Ambil daftar kas.
- Dukung filter opsional `?status=` dan pencarian `?search=` pada NIM atau nama.
- Filter hanya memengaruhi `data`; ringkasan selalu dihitung dari seluruh koleksi.
- Sertakan ringkasan:
  - `totalSaldo`: jumlah nominal dengan status `Lunas`
  - `totalLunas`: jumlah NIM unik yang memiliki transaksi berstatus `Lunas`
  - `totalBelumLunas`: jumlah NIM unik yang memiliki transaksi berstatus `Belum Lunas`
- Bentuk respons:

```json
{
  "success": true,
  "summary": {
    "totalSaldo": 0,
    "totalLunas": 0,
    "totalBelumLunas": 0
  },
  "data": []
}
```

#### `POST /api/kas` — memerlukan `x-admin-pin`

- Validasi `nim`, `nama`, `periode`, `nominal`, dan `status`.
- `nominal` harus angka nol atau lebih, dan `status` hanya menerima `Lunas` atau `Belum Lunas`.
- Simpan transaksi baru dan kembalikan data yang tersimpan.
- Bentuk respons sukses: `{ "success": true, "message": "...", "data": {} }`.

#### `PUT /api/kas/:id` — memerlukan `x-admin-pin`

- Validasi ID dan setiap field yang dikirim.
- Field yang dikirim harus dikenal dan valid; pembaruan parsial didukung.
- Perbarui data yang ditemukan; tangani kasus ID tidak ditemukan.
- Bentuk respons sukses: `{ "success": true, "message": "...", "data": {} }`.

#### `DELETE /api/kas/:id` — memerlukan `x-admin-pin`

- Validasi ID dan hapus data yang ditemukan.
- Bentuk respons sukses: `{ "success": true, "message": "Data kas berhasil dihapus" }`.

Untuk kegagalan, API mengembalikan `{ "success": false, "message": "..." }` dengan status HTTP yang sesuai (misalnya `400` untuk input tidak valid, `401` untuk PIN salah, dan `404` untuk data tidak ditemukan). `ADMIN_PIN` yang belum dikonfigurasi menghasilkan `500`; koneksi database yang gagal menghasilkan `503`.

## Rencana Penggunaan API oleh Frontend

### 1. Konfigurasi alamat API

- Simpan base URL backend pada konfigurasi environment frontend, bukan tersebar di komponen.
- Saat frontend dan backend berjalan di komputer yang sama, gunakan `http://localhost:3000/api`.
- Untuk deployment backend saat ini, gunakan `https://backend-uang-kas-kampus.vercel.app/api`.
- Jika frontend dibuka dari perangkat lain dalam jaringan lokal, gunakan alamat IP komputer backend dan pastikan port server dapat diakses.

Contoh file `.env` pada proyek frontend lokal:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Di Vercel, buka proyek frontend → **Settings → Environment Variables**, lalu buat `VITE_API_BASE_URL` dengan value `https://backend-uang-kas-kampus.vercel.app/api` untuk **Production**. Setelah mengubah variabel tersebut, redeploy frontend agar nilainya masuk ke build.

### 2. Buat fungsi komunikasi API

- Buat satu helper/service untuk request ke backend agar komponen tidak mengulang URL dan penanganan respons.
- Helper membaca JSON, memeriksa `response.ok`, dan menampilkan pesan `message` dari API apabila request gagal.
- Untuk request dengan body, kirim header `Content-Type: application/json`.
- Untuk operasi bendahara, tambahkan header `x-admin-pin`; jangan menyimpan PIN di source code, local storage, atau environment variable frontend.

### 3. Muat daftar dan ringkasan kas

- Saat halaman kas dibuka, panggil `GET /kas`.
- Simpan `data` untuk tabel/daftar transaksi.
- Tampilkan `summary.totalSaldo`, `summary.totalLunas`, dan `summary.totalBelumLunas` pada kartu ringkasan.
- Tampilkan state loading, kondisi daftar kosong, dan pesan error.
- Saat filter status atau pencarian berubah, panggil kembali `GET /kas?status=...&search=...`. Bangun query dengan `URLSearchParams` agar parameter ter-encode dengan benar.
- Ringkasan pada respons tetap untuk seluruh koleksi, sedangkan filter hanya membatasi isi `data`.

### 4. Tambah transaksi kas

- Sediakan formulir untuk NIM, nama, periode, nominal, dan status.
- Validasi dasar di browser untuk membantu pengguna, namun tetap tangani validasi backend.
- Kirim `POST /kas` dengan header `x-admin-pin` dan body JSON sesuai kontrak.
- Setelah berhasil, perbarui daftar dan ringkasan dengan memuat ulang `GET /kas`, lalu tampilkan notifikasi sukses.

### 5. Ubah atau hapus transaksi

- Gunakan `_id` dari item respons sebagai ID pada `PUT /kas/:id` dan `DELETE /kas/:id`.
- Untuk edit, kirim hanya field yang berubah; backend mendukung update parsial.
- Minta konfirmasi sebelum menghapus, lalu kirim PIN melalui header.
- Setelah berhasil, muat ulang daftar dan ringkasan.

### 6. Tangani kegagalan dan akses

- `400`: tampilkan pesan validasi atau koreksi input/parameter.
- `401`: minta pengguna memasukkan kembali PIN yang benar.
- `404`: beri tahu bahwa data sudah tidak ditemukan, lalu muat ulang daftar.
- `500` atau `503`: tampilkan pesan gangguan server/database dan sediakan aksi coba lagi.
- Request `GET` bersifat publik; `POST`, `PUT`, dan `DELETE` memerlukan PIN.

> **Keamanan:** header PIN yang dikirim dari browser dapat dilihat pada Developer Tools jaringan browser. Perlindungan PIN sederhana ini sesuai integrasi dasar, tetapi bukan pengganti autentikasi sesi/token untuk aplikasi publik. Jangan menyimpan PIN secara permanen di frontend.

## Konfigurasi dan Deployment Vercel

### Backend

1. Hubungkan repository backend `backend-uang-kas-kampus` ke Vercel sebagai proyek tersendiri. Root Directory tetap di root repository (folder yang berisi `package.json`, `api/`, dan `vercel.json`).
2. Pada proyek backend, buka **Settings → Environment Variables** dan tambahkan:
   - `DATABASE_URL`: connection string MongoDB Atlas lengkap, termasuk nama database.
   - `ADMIN_PIN`: PIN rahasia untuk operasi bendahara.
3. Pilih environment **Production**, simpan, lalu deploy atau redeploy agar variabel diterapkan.
4. URL API produksi: `https://backend-uang-kas-kampus.vercel.app/api`.
5. Uji `https://backend-uang-kas-kampus.vercel.app/api/kas`. Endpoint root `/` tidak digunakan sebagai API dan dapat mengembalikan `Endpoint tidak ditemukan`.

### Frontend

1. Di proyek frontend Vercel, atur `VITE_API_BASE_URL` menjadi `https://backend-uang-kas-kampus.vercel.app/api` untuk Production.
2. Redeploy frontend setelah menyimpan environment variable.
3. Pastikan frontend memanggil `/kas` relatif terhadap base URL, sehingga request akhirnya menuju `https://backend-uang-kas-kampus.vercel.app/api/kas`.

### Keamanan

- Jangan commit `.env`, connection string, password database, atau PIN ke GitHub.
- Simpan `DATABASE_URL` dan `ADMIN_PIN` hanya pada konfigurasi environment backend. Jangan masukkan keduanya ke frontend.
- Jika kredensial pernah dibagikan atau terlihat di screenshot/chat, ganti password database dan PIN, lalu perbarui environment variable Vercel dan redeploy.
- Batasi IP pada MongoDB Atlas Network Access sesuai kebutuhan; hindari akses terbuka jika tidak diperlukan.

## Konfigurasi Environment

Untuk menjalankan backend lokal dengan MongoDB lokal, isi `.env` (bukan `.env.example`) seperti berikut:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/uang_kas_kampus
ADMIN_PIN=ganti-dengan-pin-lokal
PORT=3000
```

Untuk pengembangan yang terhubung ke Atlas, gunakan connection string Atlas pada `DATABASE_URL`. Untuk production, atur URI Atlas dan PIN khusus melalui Environment Variables proyek backend Vercel.

## Catatan Kontrak

- Kontrak endpoint dan format respons di atas menjadi acuan integrasi frontend.
- Ringkasan memakai NIM unik per kategori. Apabila NIM memiliki transaksi dalam kedua status, NIM tersebut dihitung pada kedua kategori; `totalSaldo` menjumlahkan nominal semua transaksi lunas.
- `tanggalBayar` mengikuti default model (waktu saat penyimpanan) jika tidak dikirim, termasuk untuk transaksi `Belum Lunas`.

---

## 🚀 Roadmap Pengembangan: Multi-Semester, Pemasukan Lain, History & Excel

Rencana implementasi Database dan REST API untuk 4 fitur baru:

### 🗄️ 1. Database (MongoDB & Mongoose)
- [ ] **Model `Semester` (`src/models/Semester.js`)**: `nama`, `kode` (unique), `isAktif` (boolean), `targetKasPerMhs`, `tanggalMulai`, `tanggalSelesai`.
- [ ] **Update Model `Kas` (`src/models/Kas.js`)**: Tambahkan `semesterId` (ref `Semester`, indexed), `metodePembayaran` (Transfer/QRIS/Tunai).
- [ ] **Model `PemasukanLain` (`src/models/PemasukanLain.js`)**: `semesterId`, `judul`, `kategori` (Sisa Semester Lalu, Sponsor, Danus, Donasi, Lainnya), `nominal`, `tanggalMasuk`, `keterangan`.
- [ ] **Model `PaymentHistory` (`src/models/PaymentHistory.js`)**: `kasId`, `semesterId`, `nama`, `nim`, `aksi` (CREATE, UPDATE_STATUS, UPDATE_NOMINAL, DELETE, IMPORT_EXCEL), `nominal`, `statusLama`, `statusBaru`, `waktu`.
- [ ] **Script Migrasi**: Buat data semester default untuk menampung data kas lama yang belum memiliki `semesterId`.

### ⚙️ 2. Backend (Express.js REST API)
- [ ] **Install Packages**: `npm i multer xlsx exceljs`.
- [ ] **API Master Semester**:
  - `GET /api/semesters` (List all)
  - `GET /api/semesters/active` (Semester aktif)
  - `POST /api/semesters` (Buat semester baru, PIN required)
  - `PUT /api/semesters/:id/activate` (Set aktif, PIN required)
- [ ] **Update API Kas**:
  - Dukung filter `?semesterId=...` (default: semester aktif).
  - Update `summary` kalkulasi: `totalSaldo = totalKasLunas + totalPemasukanLain`.
- [ ] **API Pemasukan Lain**:
  - `GET /api/pemasukan-lain?semesterId=...`
  - `POST /api/pemasukan-lain` (PIN required)
  - `DELETE /api/pemasukan-lain/:id` (PIN required)
- [ ] **API History / Audit Trail**:
  - `GET /api/history?semesterId=...`
  - Auto-logging pada fungsi create, update, delete, dan import kas.
- [ ] **API Import & Export Excel**:
  - `GET /api/kas/template` (Download blank Excel template)
  - `GET /api/kas/export?semesterId=...&format=xlsx` (Download report Excel .xlsx)
  - `POST /api/kas/import` (Upload multipart file .xlsx / .csv dengan batch insert, PIN required)
