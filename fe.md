# 💻 Frontend UI/UX Architecture & Rules (`fe.md`)

Dokumen spesifikasi teknis antarmuka Vue 3, TanStack Query, dan Tailwind CSS untuk aplikasi **KasKita**, mencakup pengelolaan state multi-semester, pemasukan non-kas, **pengeluaran kas kelas (termasuk modul Pengembalian Kas / Refund - Opsi 1)**, riwayat transaksi, dan modul import/export Excel.

---

## 1. Arsitektur Komponen & State Management

```text
src/
├── composables/
│   ├── useKas.js             (Query & Mutation kas mahasiswa, summary saldo & rincian refund)
│   ├── useSemester.js        (Global state semester aktif, list semester, & switch semester)
│   ├── usePemasukanLain.js   (Query & Mutation pemasukan non-kas, saldo sisa, sponsor)
│   ├── usePengeluaran.js     (Query & Mutation belanja kelas & pengembalian kas / refund)
│   └── useHistory.js         (Query timeline log audit riwayat pembayaran & pengeluaran)
├── components/
│   ├── Navbar.vue            (SemesterSwitcher & tombol pemicu HistoryDrawer)
│   ├── SemesterSwitcher.vue  (Dropdown pemilih semester aktif/arsip)
│   ├── StatCards.vue         (Saldo Bersih Kas + Total Pemasukan + Total Pengeluaran & Refund)
│   ├── KasTable.vue          (Dual view desktop table dengan No. urut & mobile cards)
│   ├── KasFormModal.vue      (Modal input data kas mahasiswa)
│   ├── HistoryDrawer.vue     (Slide-over drawer timeline audit mutasi masuk, belanja & refund)
│   └── KasImportModal.vue    (Modal drag-and-drop upload .xlsx/.csv & preview baris)
└── views/
    ├── DashboardView.vue     (Integrasi switcher semester, banner arsip, tombol export & history)
    ├── AdminView.vue         (Tab Kas, Tab Non-Kas, Tab Pengeluaran, Tab Semester, Export/Import)
    └── InfoView.vue          (Informasi transfer 1-click copy & QRIS preview)
```

---

## 2. Composable Pengeluaran (`src/composables/usePengeluaran.js`)

Mengelola pemanggilan API untuk pencatatan uang keluar (belanja operasional maupun pengembalian kas):
* `pengeluaranQuery({ semesterId, search, kategori })`: Mengambil daftar pengeluaran dari `GET /api/pengeluaran`.
* `totalPengeluaran`: Nilai komputasi $\sum \text{nominal pengeluaran}$ pada semester aktif.
* `createPengeluaran({ payload, pin })`: Mutasi `POST /api/pengeluaran` dengan header `x-admin-pin`.
* `deletePengeluaran({ id, pin })`: Mutasi `DELETE /api/pengeluaran/:id` dengan header `x-admin-pin`.
* **Invalidasi Reaktif**: Saat pengeluaran atau refund dicatat/dihapus, query `['pengeluaran']`, `['kas']`, dan `['history']` otomatis di-refetch seketika.

---

## 3. Spesifikasi UI Fitur Pengeluaran & Pengembalian Kas (Opsi 1)

### A. Kartu Ringkasan Saldo Kas (`StatCards.vue`)

Menampilkan 3 kartu metrik utama yang transparan dan mencerminkan kas riil:

1. **Kartu 1 (Hero Gradient Emerald - Saldo Bersih Kas Riil)**:
   - Menampilkan uang kas fisik yang benar-benar tersisa di bendahara:
     $$\text{Saldo Kas Bersih} = \text{Total Pemasukan} - (\text{Belanja Operasional} + \text{Uang Dikembalikan})$$
   - **Efek Realistis di UI**:
     - Pada **Semester Ganjil 2025/2026**: Menampilkan **Rp 0** (karena sisa dana 100% sudah dikembalikan ke mahasiswa).
     - Pada **Semester Genap 2025/2026**: Menampilkan **Rp 90.000** (sisa uang nyata yang dialihkan ke Semester 3).
     - Pada **Semester Ganjil 2026/2027 (Aktif)**: Menampilkan **Rp 149.000** (kas berjalan saat ini).

2. **Kartu 2 (Total Pemasukan)**:
   - Menampilkan total dana masuk (Iuran Mahasiswa + Sisa Semester Lalu/Pemasukan Lain).
   - Menampilkan jumlah mahasiswa lunas dan progress persentase target kas.

3. **Kartu 3 (Total Pengeluaran & Rincian Pengembalian)**:
   - Menampilkan total seluruh dana kas yang telah keluar.
   - **Sub-info Transparan**:
     - Menampilkan rincian: *"Belanja: Rp X | Dikembalikan: Rp Y"*.
     - Jika ada pengembalian kas (refund), tampilkan badge info halus bernuansa biru/teal:
       `"Rp 470.000 dikembalikan ke mahasiswa"`.

---

### B. Tab Pengeluaran di Ruang Bendahara (`AdminView.vue`)

Pada Tab **"Pengeluaran (Belanja Kelas)"**, bendahara dapat mencatat belanja operasional maupun pengembalian kas sisa semester:

1. **Formulir Pengeluaran**:
   - **Judul Keperluan**: Input teks (contoh: *"Pengembalian Sisa Kas Mahasiswa (Semester Selesai)"*, *"Beli Air Minum Dosen"*).
   - **Kategori**: Dropdown pilihan:
     1. `Pengembalian Kas` *(Khusus untuk pembagian sisa kas kembali ke mahasiswa)*
     2. `Perlengkapan Kelas`
     3. `Acara & Konsumsi`
     4. `Akademik & Materi`
     5. `Sosial & Santunan`
     6. `Lainnya`
   - **Nominal (Rp)**: Validasi angka minimal Rp 1. Tampilkan peringatan jika melebihi saldo kas yang ada.
   - **Tanggal**: Date picker.
   - **Penanggung Jawab**: Nama bendahara atau perwakilan kelas.
   - **Keterangan**: Rincian pembagian (misal: *"Dibagikan kepada 26 mahasiswa yang melunasi iuran"*).

2. **Tabel Pengeluaran**:
   - Baris dengan kategori `Pengembalian Kas` diberi badge khusus berwarna Cyan/Teal agar terlihat jelas dan berbeda dengan belanja peralatan (Rose/Amber).

---

### C. Drawer Riwayat Audit Transaksi (`HistoryDrawer.vue`)

- Setiap pengeluaran refund ditampilkan di timeline:
  - Ikon: **`HandCoins`** atau **`RotateCcw`** dengan latar `bg-teal-50 text-teal-700`.
  - Judul: `"Pengembalian Sisa Kas ke Mahasiswa"`.
  - Nominal: `"- Rp 470.000"`.
  - Keterangan audit: Dibuat oleh Bendahara.

---

## 4. Aturan Pengalaman Pengguna (UX Rules)

1. **Pencegahan Defisit Kas**:
   Formulir pengeluaran akan menolak nominal yang melebihi saldo kas riil yang tersedia saat itu.
2. **Keterangan Transparansi untuk Mahasiswa**:
   Di dasbor publik (`DashboardView.vue`), mahasiswa dapat melihat dengan jelas bahwa saldo kas yang berkurang bukan karena boros, melainkan karena telah dikembalikan ke rekening/dompet mahasiswa di akhir semester.
