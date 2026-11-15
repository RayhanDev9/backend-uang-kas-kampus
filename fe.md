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

---

## 1. Struktur Komponen Frontend (`src/`)

```text
src/
├── composables/
│   ├── useKas.js               (Query data kas, ringkasan saldo & rincian refund)
│   ├── useKasMatrix.js         (Query matriks mingguan & mutasi update centang pertemuan)
│   ├── useSemester.js          (State global semester aktif & daftar semester)
│   ├── usePemasukanLain.js     (Query & mutasi dana non-iuran)
│   ├── usePengeluaran.js       (Query & mutasi belanja kas & pengembalian kas / refund)
│   └── useHistory.js           (Query timeline audit mutasi)
├── components/
│   ├── Navbar.vue              (SemesterSwitcher, link navigasi & pemicu HistoryDrawer)
│   ├── SemesterSwitcher.vue    (Dropdown pemilih semester aktif/arsip)
│   ├── StatCards.vue           (3 Kartu: Saldo Bersih Riil, Total Pemasukan, Total Pengeluaran & Refund)
│   ├── KasTable.vue            (Tabel ringkas: No, NIM, Nama, Nominal, Status)
│   ├── KasMatrixTable.vue      (BARU: Tabel matriks mingguan bergaya Excel dengan frozen columns)
│   ├── PemasukanLainTable.vue  (BARU: Mini-tabel terpisah untuk dana non-iuran)
│   ├── KasFormModal.vue        (Modal tambah/edit data mahasiswa)
│   ├── HistoryDrawer.vue       (Laci timeline audit mutasi masuk, belanja & refund)
│   └── KasImportModal.vue      (Modal upload file Excel/CSV)
└── views/
    ├── DashboardView.vue       (Dasbor publik: StatCards, Toggle Tampilan, KasTable / KasMatrixTable)
    ├── AdminView.vue           (Ruang Bendahara: Mode edit matriks, Tab Pengeluaran, Non-Kas, Semester)
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

## 7. Rangkuman Pengalaman Pengguna (UX Checklist)

| Fitur / Alur | Pengguna Publik / Mahasiswa | Bendahara (Ruang Bendahara) |
|---|---|---|
| **Melihat Absensi Mingguan** | Tersedia melalui toggle `[📊 Tampilan Matriks Mingguan]` | Tersedia melalui toggle `[📊 Tampilan Matriks Mingguan]` |
| **Mengedit Centang Mingguan** | Terkunci (Read-Only) | Klik langsung pada sel pertemuan (PIN auth) |
| **Melihat Dana Non-Iuran** | Terlihat jelas di mini-tabel di bawah absensi | Terlihat di mini-tabel + Tab Manajemen Non-Kas |
| **Melihat Sisa Kas Dikembalikan** | Terlihat transparan di Kartu Pengeluaran & Riwayat | Terlihat di Kartu, Riwayat & Tab Pengeluaran |
| **Semester 3 ke Atas** | Otomatis tampilan ringkas tanpa kolom mingguan | Input iuran langsung nominal/status |
