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
- Saat deployment, gunakan URL backend Vercel, misalnya `https://nama-project.vercel.app/api`.
- Jika frontend dibuka dari perangkat lain dalam jaringan lokal, gunakan alamat IP komputer backend dan pastikan port server dapat diakses.

Contoh variabel untuk Vite:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

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

- Atur `DATABASE_URL`, `ADMIN_PIN`, dan konfigurasi lain yang dibutuhkan melalui environment variables Vercel.
- Jangan memasukkan `.env` atau rahasia ke repositori.
- Deploy folder backend ke Vercel, lalu uji endpoint pada URL deployment.
- Bagikan URL API dan contoh kontrak request/response kepada tim frontend.

## Konfigurasi Environment

Contoh nama variabel yang digunakan (isi nilai lokal di `.env`, bukan di repositori):

```env
DATABASE_URL=mongodb://127.0.0.1:27017/uang_kas_kampus
ADMIN_PIN=ganti-dengan-pin-lokal
PORT=3000
```

Untuk production, gunakan connection string MongoDB Atlas dan PIN khusus melalui pengaturan environment Vercel.

## Catatan Kontrak

- Kontrak endpoint dan format respons di atas menjadi acuan integrasi frontend.
- Ringkasan memakai NIM unik per kategori. Apabila NIM memiliki transaksi dalam kedua status, NIM tersebut dihitung pada kedua kategori; `totalSaldo` menjumlahkan nominal semua transaksi lunas.
- `tanggalBayar` mengikuti default model (waktu saat penyimpanan) jika tidak dikirim, termasuk untuk transaksi `Belum Lunas`.
