# 💻 Frontend UI/UX Architecture & Specifications (`fe.md`)

Dokumen spesifikasi teknis antarmuka Vue 3, TanStack Query, dan Tailwind CSS untuk aplikasi **KasKita**. Dokumen ini mencakup desain antarmuka dasbor publik dan Ruang Bendahara, **fitur Matriks Absensi Mingguan (Tampilan Tabel Excel) untuk Semester 1 & 2**, tombol toggle tampilan, pemisahan data non-iuran, modul pengeluaran & pengembalian kas (Refund - Opsi 1), serta laci riwayat audit.

---

## 📌 Ringkasan Solusi Desain Frontend

1. **Dual Tampilan Tabel dengan Toggle Cerdas**:
   * Pada semester mingguan (Semester 1 & 2), tersedia segmented button toggle di atas tabel:
     * **`[📋 Tampilan Ringkas]`**: Menampilkan kolom standar (No, NIM, Nama, Total Bayar, Status, Aksi).
     * **`[📊 Tampilan Matriks Mingguan]`**: Menampilkan tabel bergaya spreadsheet Excel dengan kolom tanggal pertemuan (07/03 s/d 27/06), indikator centang hijau `✓` dan strip `-`.
   * **Semester 3 ke Atas**: Tombol toggle **otomatis disembunyikan** karena semester tersebut menganut sistem sekali bayar/flat sehingga hanya menampilkan tampilan ringkas.
2. **Perbedaan Hak Akses (Publik vs Bendahara)**:
   * **Mahasiswa / Publik (`DashboardView.vue`)**: Tabel matriks bersifat *Read-Only* (hanya baca) agar mahasiswa bisa mengecek absensi bayarnya secara transparan.
   * **Bendahara (`AdminView.vue`)**: Sel pada tabel matriks bersifat *Interactive/Clickable*. Bendahara dapat mengklik sel pertemuan untuk langsung mengubah status centang bayar (didukung otentikasi PIN dan pembaruan UI instan).
3. **Pemisahan Dana Non-Iuran (Zero Contamination)**:
   * Uang masuk di luar absensi (Sisa Kas Lalu, Seminar, Danus) ditampilkan pada **Mini-Tabel / Kartu Rangkuman Terpisah** di bawah tabel utama agar tabel absensi mahasiswa tetap rapi dan akurat secara matematis.
4. **Penyajian Transparan Pengembalian Kas (Refund - Opsi 1)**:
   * Menampilkan kartu saldo riil bendahara (Rp 0 di Sem 1, Rp 90.000 di Sem 2, Rp 149.000 di Sem 3 aktif).
   * Menampilkan badge informasi pengembalian dana pada kartu pengeluaran (*"Rp 470.000 dikembalikan ke mahasiswa"*).
5. **Autentikasi Rahasia Bendahara & Token LocalStorage (Opsi B)**:
   * **Sembunyikan Pintu Masuk Publik**: Tombol `[Ruang Bendahara]` di Navbar disembunyikan secara default untuk umum/mahasiswa.
   * **Pintu Rahasia Footer**: Di bagian footer paling bawah terdapat teks/ikon kecil samar (`🔒 Akses Bendahara`). Ketika diklik, modal input PIN terbuka.
   * **Persistent Token**: Setelah login sukses, token sesi disimpan di `localStorage.setItem('bendahara_token', token)`. Tombol `[Ruang Bendahara]` otomatis muncul di Navbar.
   * **Bebas Ketik PIN Berulang**: Seluruh operasi di Ruang Bendahara (centang absensi, tambah kas, catat belanja/refund) otomatis mengonsumsi token dari `localStorage`.
   * **Tombol Logout**: Bendahara dapat keluar kapan saja; token dibersihkan dan tombol di Navbar kembali lenyap.

---

## 1. Struktur Komponen Frontend (`src/`)

```text
src/
├── composables/
│   ├── useAuth.js              (BARU: State login bendahara, simpan/hapus token localStorage)
│   ├── useKas.js               (Query data kas, ringkasan saldo & rincian refund)
│   ├── useKasMatrix.js         (Query matriks mingguan & mutasi update centang pertemuan)
│   ├── useSemester.js          (State global semester aktif & daftar semester)
│   ├── usePemasukanLain.js     (Query & mutasi dana non-iuran)
│   ├── usePengeluaran.js       (Query & mutasi belanja kas & pengembalian kas / refund)
│   └── useHistory.js           (Query timeline audit mutasi)
├── components/
│   ├── Navbar.vue              (Menu tautan langsung ke /riwayat)
│   ├── Footer.vue              (Footer dengan link rahasia "🔒 Akses Bendahara")
│   ├── AuthModal.vue           (Modal input PIN login bendahara)
│   ├── TransactionDetailModal.vue (BARU: Modal rincian nota & jejak audit transaksi)
│   ├── SemesterSwitcher.vue    (Dropdown pemilih semester aktif/arsip)
│   ├── StatCards.vue           (3 Kartu: Saldo Bersih Riil, Total Pemasukan, Total Pengeluaran & Refund)
│   ├── KasTable.vue            (Tabel ringkas: No, NIM, Nama, Nominal, Status)
│   ├── KasMatrixTable.vue      (Tabel matriks mingguan bergaya Excel dengan frozen columns)
│   ├── PemasukanLainTable.vue  (Mini-tabel terpisah untuk dana non-iuran)
│   ├── KasFormModal.vue        (Modal tambah/edit data mahasiswa)
│   └── KasImportModal.vue      (Modal upload file Excel/CSV)
└── views/
    ├── DashboardView.vue       (Dasbor publik: StatCards, Toggle Tampilan, KasTable / KasMatrixTable)
    ├── HistoryView.vue         (BARU: Halaman penuh riwayat mutasi kas ala rekening koran)
    ├── AdminView.vue           (Ruang Bendahara: Mode edit matriks, Tab Pengeluaran, Tombol Logout)
    └── InfoView.vue            (Petunjuk pembayaran transfer, nomor rekening & QRIS)
```

---

## 2. Spesifikasi Komponen Matriks Mingguan (`KasMatrixTable.vue`)

Komponen ini dirancang untuk menyajikan rekapitulasi pembayaran per pertemuan mingguan seperti file Excel resmi kelas.

### A. Fitur Layout & Responsivitas (Spreadsheet Feel):
1. **Frozen / Sticky Column**:
   - Kolom `No`, `NIM`, dan `Nama Mahasiswa` dibuat `sticky left-0` dengan latar belakang solid (`bg-white` / `bg-slate-50`) dan bayangan tipis (`shadow-sm` atau border pemisah).
   - Saat pengguna menggeser tabel ke kanan (horizontal scroll) untuk melihat pertemuan ke-10 hingga 14, identitas nama mahasiswa tetap terlihat di sisi kiri.
2. **Header Pertemuan Tanggal**:
   - Setiap kolom pertemuan menampilkan:
     - Tanggal pertemuan (contoh: `07/03`, `14/03`, `21/03`, `28/03`).
     - Sub-label kecil di bawahnya: `P1`, `P2`, `P3`, dst.
3. **Indikator Status Bayar pada Sel (Cell Indicators)**:
   - **Jika Sudah Bayar (`bayar: true`)**:
     - Ditampilkan simbol centang hijau tebal: **`✓`**
     - Desain visual: Badge bulat atau kotak lembut `bg-emerald-50 text-emerald-600 font-bold border border-emerald-200 text-center`.
     - Tooltip saat hover: *"Pertemuan 1 (07/03): Lunas Rp 5.000"*.
   - **Jika Belum Bayar (`bayar: false`)**:
     - Ditampilkan tanda strip abu-abu: **`-`**
     - Desain visual: Teks `text-slate-300 font-medium text-center`.
     - Tooltip saat hover: *"Pertemuan 1 (07/03): Belum Bayar"*.
4. **Kolom Total & Status Akhir**:
   - Kolom `Total Bayar`: Jumlah uang yang sudah disetor mahasiswa (contoh: `Rp 70.000`).
   - Kolom `Status`: Badge status pelunasan (`Lunas` warna hijau zamrud atau `Belum Lunas` warna amber).
5. **Baris Rangkuman Bawah (Summary Footer Row)**:
   - Baris paling bawah tabel menghitung rekapitulasi otomatis setiap pertemuan:
     - **Jumlah Mahasiswa Bayar**: Menampilkan angka kehadiran kas (contoh: `31 mhs`).
     - **Total Uang Masuk**: Menampilkan subtotal kas pertemuan (contoh: `Rp 155.000`).

---

### B. Interaktivitas Mode Edit Bendahara (di Ruang Bendahara):

Saat komponen `KasMatrixTable.vue` digunakan di dalam `AdminView.vue` (Ruang Bendahara):
* **Mode Interaktif Aktif**: Setiap sel pertemuan dapat diklik langsung oleh bendahara.
* **Aksi Klik**:
  1. Menampilkan animasi transisi cepat / indikator loading halus pada sel yang diklik.
  2. Mengirim request mutasi `PUT /api/kas/:id/pertemuan` dengan header `x-admin-pin`.
  3. Menggunakan **Optimistic UI Update**: Nilai sel langsung beralih (`✓` $\leftrightarrow$ `-`), total bayar dan status lunas langsung diperbarui tanpa menunggu jeda jaringan.
  4. Jika mutasi gagal (misal koneksi terputus atau PIN salah), nilai sel otomatis dikembalikan ke status sebelumnya (rollback) dan menampilkan toast notifikasi error.

---

## 3. Spesifikasi Tombol Toggle Tampilan

Diletakkan di bagian header atas tabel pada `DashboardView.vue` dan `AdminView.vue`:

```html
<!-- Segmented Control Button (Hanya tampil jika tipeIuran === 'MINGGUAN') -->
<div v-if="semester?.tipeIuran === 'MINGGUAN'" class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
  <button 
    @click="viewMode = 'ringkas'"
    :class="viewMode === 'ringkas' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'"
    class="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all"
  >
    <List class="w-4 h-4" />
    <span>Tampilan Ringkas</span>
  </button>
  <button 
    @click="viewMode = 'matriks'"
    :class="viewMode === 'matriks' ? 'bg-emerald-600 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'"
    class="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all"
  >
    <TableProperties class="w-4 h-4" />
    <span>Tampilan Matriks Mingguan</span>
  </button>
</div>
```

### Logika Tampilan Berdasarkan Semester:
* **Jika Semester = Ganjil 2025/2026 atau Genap 2025/2026 (`tipeIuran: "MINGGUAN"`)**:
  - Tombol toggle aktif dan dapat ditekan.
  - Default tampilan awal: `viewMode = 'matriks'` (agar mahasiswa langsung melihat matriks seperti file Excel aslinya).
* **Jika Semester = Ganjil 2026/2027 atau semester masa depan (`tipeIuran: "SEKALI_BAYAR"`)**:
  - Tombol toggle **tidak dirender / disembunyikan**.
  - Tampilan otomatis terkunci pada `viewMode = 'ringkas'`.

---

## 4. Pemisahan Dana Non-Iuran (`PemasukanLainTable.vue`)

Untuk menjaga agar tabel absensi mahasiswa tidak terkontaminasi oleh dana non-iuran:
1. Diletakkan tepat di bawah tabel kas utama dengan judul pemisah:
   * **`💰 Dana Masuk Non-Iuran (Luar Absensi Mahasiswa)`**
2. Ditampilkan dalam bentuk tabel kompak atau kartu info elegan:
   * **Kolom**: No, Sumber Dana / Judul, Kategori, Tanggal Masuk, Nominal, Catatan / PIC.
   * **Contoh Data Nyata**:
     - *Sisa Saldo Kas Semester Lalu* $\rightarrow$ `Rp 90.000` (dialihkan ke Semester 3)
     - *Sisa Dana Kegiatan Seminar* $\rightarrow$ `Rp 15.000`
3. Rangkuman ini menegaskan bahwa total saldo kas kelas berasal dari:
   $$\text{Total Kas Masuk} = \text{Total Iuran Absensi Mahasiswa} + \text{Total Dana Non-Iuran}$$

---

## 5. Spesifikasi Kartu Metrik Kas & Refund (`StatCards.vue`)

Menampilkan 3 kartu metrik utama dengan kalkulasi akurat:

1. **Kartu 1 (Saldo Bersih Kas Riil - Emerald Gradient)**:
   - Menghitung sisa kas fisik di tangan bendahara:
     $$\text{Saldo Kas Bersih} = \text{Total Pemasukan} - (\text{Belanja Operasional} + \text{Uang Dikembalikan})$$
   - Pada **Semester Ganjil 2025/2026**: Menampilkan **Rp 0** (dana sisa kas Rp 1.319.000 sudah dikembalikan ke mahasiswa).
   - Pada **Semester Genap 2025/2026**: Menampilkan **Rp 90.000** (sisa kas bersih setelah dikurangi belanja operasional dan refund Rp 470.000).
   - Pada **Semester Ganjil 2026/2027**: Menampilkan **Rp 149.000** (kas berjalan saat ini).

2. **Kartu 2 (Total Pemasukan - Clean White)**:
   - Menampilkan total penerimaan kas (Iuran Mahasiswa + Dana Non-Iuran).
   - Menampilkan indikator mahasiswa lunas dan target kas kelas.

3. **Kartu 3 (Total Pengeluaran & Rincian Pengembalian - Clean White & Rose/Teal Accents)**:
   - Menampilkan akumulasi total kas keluar.
   - Dilengkapi sub-info transparan:
     - *"Belanja Operasional: Rp X"*
     - *"Dikembalikan ke Mahasiswa: Rp Y"* (berwarna teal/biru transparan jika terdapat refund).

---

## 6. Composable Matriks Mingguan (`useKasMatrix.js`)

```javascript
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import api from "@/services/api";

export function useKasMatrix(semesterIdRef) {
  const queryClient = useQueryClient();

  const matrixQuery = useQuery({
    queryKey: ["kas-matrix", semesterIdRef],
    queryFn: async () => {
      const res = await api.get(`/kas/matrix?semesterId=${semesterIdRef.value}`);
      return res.data;
    },
    enabled: () => !!semesterIdRef.value,
  });

  const togglePertemuan = useMutation({
    mutationFn: async ({ kasId, pertemuanKe, bayar, pin }) => {
      const res = await api.put(
        `/kas/${kasId}/pertemuan`,
        { pertemuanKe, bayar },
        { headers: { "x-admin-pin": pin } }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kas-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["kas"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  return {
    matrixData: matrixQuery.data,
    isLoading: matrixQuery.isLoading,
    isError: matrixQuery.isError,
    togglePertemuan,
  };
}
```

---

## 7. Spesifikasi Autentikasi Bendahara & Pintu Rahasia Footer (Opsi B)

### A. Composable Autentikasi (`src/composables/useAuth.js`)
Mengelola state token di `localStorage` dan status reaktif:

```javascript
import { ref, computed } from "vue";
import api from "@/services/api";

const TOKEN_KEY = "kaskita_bendahara_token";
const token = ref(localStorage.getItem(TOKEN_KEY) || null);
const isAuthModalOpen = ref(false);

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);

  async function login(pin) {
    const res = await api.post("/auth/login", { pin });
    if (res.data?.success && res.data?.token) {
      token.value = res.data.token;
      localStorage.setItem(TOKEN_KEY, res.data.token);
      isAuthModalOpen.value = false;
      return true;
    }
    return false;
  }

  function logout() {
    token.value = null;
    localStorage.removeItem(TOKEN_KEY);
    // Jika sedang di halaman /admin, redirect ke /
    if (window.location.pathname.startsWith("/admin")) {
      window.location.href = "/";
    }
  }

  function openLoginModal() {
    isAuthModalOpen.value = true;
  }

  function closeLoginModal() {
    isAuthModalOpen.value = false;
  }

  return {
    token,
    isAuthenticated,
    isAuthModalOpen,
    login,
    logout,
    openLoginModal,
    closeLoginModal,
  };
}
```

---

### B. Injeksi Token Otomatis pada Axios (`src/api/axios.js` atau `api.js`)
Setiap request ke backend secara otomatis mengikutsertakan header autentikasi tanpa mengharuskan komponen mengoper PIN manual:

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kaskita_bendahara_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers["x-admin-pin"] = token; // Dukungan ganda untuk kompatibilitas
  }
  return config;
});
```

---

### C. Komponen Pintu Rahasia Footer (`src/components/Footer.vue`)
Diletakkan di bagian paling bawah layout aplikasi (`App.vue`):

* **Tampilan untuk Mahasiswa / Publik (Belum Login)**:
  - Berisi teks copyright kelas: `"© 2026 KasKita • Transparansi Kas Kelas"`.
  - Di sampingnya terdapat teks/link samar:
    ```html
    <button 
      @click="openLoginModal" 
      class="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
      title="Akses Pengurus Kelas"
    >
      <Lock class="w-3.5 h-3.5" />
      <span>Akses Bendahara</span>
    </button>
    ```
* **Tampilan saat Bendahara Aktif (Sudah Login)**:
  - Menampilkan status aktif dengan badge hijau halus:
    ```html
    <div class="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>Bendahara Aktif</span>
      <button @click="logout" class="ml-1 text-emerald-800 hover:underline font-semibold">Keluar</button>
    </div>
    ```

---

### D. Komponen Modal Input PIN (`src/components/AuthModal.vue`)
* Muncul saat link rahasia di footer diklik.
* **Fitur**:
  - Input password/PIN numerik dengan tombol lihat/sembunyikan PIN (*eye icon*).
  - Validasi error langsung dengan pesan ramah jika PIN keliru.
  - Saat menekan tombol Enter, form langsung melakukan submit.
  - Begitu berhasil, modal otomatis tertutup dan toast notifikasi sukses muncul: *"Selamat datang, Bendahara Kelas!"*.
  - Tombol `[Ruang Bendahara]` di Navbar seketika muncul.

---

### E. Dinamika Tautan Navbar (`src/components/Navbar.vue`)
Menu `links` difilter berdasarkan status autentikasi:

```javascript
const { isAuthenticated } = useAuth();

const links = computed(() => {
  const baseLinks = [
    { to: '/', label: 'Ringkasan', icon: LayoutDashboard },
    { to: '/info', label: 'Cara Bayar', icon: Info },
  ];

  // Hanya munculkan Ruang Bendahara jika bendahara sudah login
  if (isAuthenticated.value) {
    baseLinks.push({ to: '/admin', label: 'Ruang Bendahara', icon: ShieldCheck });
  }

  return baseLinks;
});
```

---

### F. Proteksi Route Guard (`src/router/index.js`)
Mencegah pengguna umum mengakses `/admin` secara langsung:

```javascript
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("kaskita_bendahara_token");
  if (to.path.startsWith("/admin") && !token) {
    // Alihkan ke beranda publik jika belum login
    next({ path: "/" });
  } else {
    next();
  }
});
```

---

### G. Penyederhanaan Ruang Bendahara (`AdminView.vue`)
* Menghilangkan field input PIN manual di atas tabel matriks yang sebelumnya wajib diisi berulang kali.
* Menambahkan tombol **`[🚪 Keluar / Logout]`** di header Ruang Bendahara.
* Semua aksi (centang pertemuan, edit kas, tambah pengeluaran/refund) langsung berjalan mulus menggunakan token yang tersimpan di `localStorage`.

---

## 8. Spesifikasi Halaman Penuh Riwayat Mutasi (`HistoryView.vue` - `/riwayat`)

Menjadikan riwayat sebagai halaman penuh independen dengan tata letak lapang bergaya buku kas / rekening koran modern.

### A. 4 Kartu Metrik Ringkasan (*Top Summary Bar*):
1. **Total Mutasi**: Jumlah log transaksi tercatat pada semester aktif.
2. **Akumulasi Uang Masuk**: Total kas masuk (`+ Rp 1.825.000` warna hijau zamrud).
3. **Akumulasi Uang Keluar**: Total belanja peralatan/operasional kelas (`- Rp 1.265.000` warna merah rose).
4. **Total Uang Dikembalikan**: Uang sisa kas yang dibagikan kembali (`↺ Rp 470.000` warna biru teal).

---

### B. Segmented Filter Kategori (*Quick Pills*):
Tersedia 5 tab pemilih cepat di bagian atas:
* **`[🌟 Semua Mutasi]`**: Menampilkan seluruh riwayat lengkap secara kronologis.
* **`[🟢 Uang Masuk / Iuran]`**: Menyaring pembayaran iuran kas dan dana non-iuran.
* **`[🔴 Belanja Operasional]`**: Menyaring pengeluaran perlengkapan, spidol, konsumsi, dan materi kelas.
* **`[🔵 Pengembalian Kas]`**: Menyaring khusus pembagian uang refund sisa kas ke mahasiswa.
* **`[⚙️ Log Perubahan Status]`**: Menyaring riwayat saat bendahara mengubah absensi mingguan.

---

### C. Toolbar Pencarian, Filter Bulan & Tombol Cetak:
* **Input Search Real-Time**: Pencarian berdasarkan nama mahasiswa, masked NIM (`251******01`), nama barang belanjaan, atau PIC bendahara.
* **Filter Dropdown Bulan**: Memilih rentang bulan spesifik (contoh: *"Maret 2026"*, *"April 2026"*, *"Semua Bulan"*).
* **Tombol Cetak / Simpan PDF**: Memicu `window.print()` dengan CSS `@media print` khusus agar menghasilkan cetakan dokumen buku kas rapi tanpa elemen navigasi website.

---

### D. Tampilan Mutasi dengan Header Tanggal (*Sticky Date Grouping*):
Transaksi dikelompokkan secara rapi per hari/tanggal kalender:
* **Format Header Tanggal**: `📅 Sabtu, 27 Juni 2026 • 3 Transaksi`
* **Format Baris 3 Bagian (Three-Column Clean Row)**:
  1. **Sisi Kiri**:
     - Ikon transaksi (hijau koin untuk iuran, merah panah keluar untuk belanja, teal putar balik untuk refund).
     - Nama mahasiswa atau judul keperluan belanja.
     - Masked NIM (`251******01`) atau nama penanggung jawab (PIC).
  2. **Sisi Tengah**:
     - Keterangan mutasi (contoh: *"Iuran Pertemuan 1 s/d 14"*, *"Beli Spidol & Tinta"*).
     - Badge kategori berwarna lembut.
  3. **Sisi Kanan**:
     - **Nominal Arus Kas Tebal**:
       - Masuk: `+ Rp 70.000` (Hijau tebal).
       - Keluar Belanja: `- Rp 20.000` (Merah tebal).
       - Refund: `↺ Rp 19.000` (Teal tebal).
     - Waktu transaksi / jam pencatatan.

---

### E. Modal Dialog Rincian Transaksi (`TransactionDetailModal.vue`):
* Mengklik salah satu baris mutasi akan membuka modal detail berformat struk/nota digital:
  - ID Log Transaksi & Waktu presisi.
  - Nama Mahasiswa / PIC Penanggung Jawab.
  - Snapshot status sebelum $\rightarrow$ sesudah perubahan.
  - Catatan lengkap bendahara.

---

## 9. Rangkuman Pengalaman Pengguna (UX Checklist)

| Fitur / Alur | Pengguna Publik / Mahasiswa | Bendahara (Ruang Bendahara) |
|---|---|---|
| **Tombol di Navbar** | Hanya `Ringkasan`, `Cara Bayar`, `Riwayat Kas` | Muncul tambahan tombol `[Ruang Bendahara]` |
| **Akses Login** | Pintu masuk tersembunyi (hanya link kecil di footer) | Klik `Akses Bendahara` di footer $\rightarrow$ Masukkan PIN |
| **Penyimpanan Login** | Tidak memiliki sesi login | Token tersimpan di `localStorage` (tidak perlu login ulang) |
| **Melihat Halaman Riwayat** | Halaman luas `/riwayat` dengan filter tab & date grouping | Halaman luas `/riwayat` dengan audit trail lengkap |
| **Eksekusi Aksi Admin** | Terkunci sepenuhnya | Langsung klik simpan/centang tanpa mengetik PIN ulang |
| **Melihat Absensi Mingguan** | Tersedia melalui toggle `[📊 Tampilan Matriks Mingguan]` (Read-Only) | Tampilan Matriks interaktif (Klik sel untuk update) |
| **Selesai Bertugas** | - | Klik `[Keluar / Logout]` $\rightarrow$ tombol di Navbar lenyap kembali |
