# PRODUCT REQUIREMENT DOCUMENT (PRD)
## SISTEM PENGGAJIAN (PAYROLL SYSTEM) AUTOMATION

---

## 1. DOKUMENTASI DOKUMEN
* **Nama Proyek:** Sistem Penggajian Karyawan Otomatis (Payroll Core Engine)
* **Versi:** 1.0.0
* **Tanggal:** 29 Mei 2026
* **Status:** Approved / Ready for Development
* **Penulis:** Senior Technical Consultant & Product Strategist

---

## 2. RINGKASAN EKSEKUTIF & TUJUAN
Sistem Penggajian ini dirancang untuk mengotomatisasi seluruh proses perhitungan kompensasi karyawan, pemotongan pajak (PPh 21 sesuai skema TER terbaru), iuran wajib (BPJS Ketenagakerjaan dan Kesehatan), serta distribusi slip gaji dan integrasi perbankan.

### Tujuan Utama:
1.  **Akurasi 100%:** Menghilangkan kesalahan manusia (*human error*) dalam kalkulasi komponen gaji dan potongan hukum.
2.  **Kepatuhan Regulasi:** Mengikuti regulasi ketenagakerjaan Indonesia (UU Cipta Kerja) dan aturan perpajakan terbaru (Skema TER PPh 21).
3.  **Efisiensi Waktu:** Memangkas waktu pemrosesan payroll bulanan dari hari menjadi hitungan menit.
4.  **Transparansi:** Menyediakan akses slip gaji yang mendetail dan mudah dipahami oleh karyawan melalui modul *Self-Service*.

---

## 3. PENGGUNA SISTEM (USER PERSONAS & ROLES)

| Role | Deskripsi | Hak Akses Utama |
| :--- | :--- | :--- |
| **Super Admin / IT Tech** | Pengelola infrastruktur sistem. | Manajemen konfigurasi basis data, audit log, manajemen hak akses *role-based*. |
| **HR Payroll Specialist** | Operator harian operasional payroll. | Input data master karyawan, konfigurasi absensi, input variabel bonus/insentif. |
| **Finance / Accounting** | Verifikator dan eksekutor dana. | Verifikasi kalkulasi payroll, persetujuan biaya, eksekusi ekspor *bank transfer file*. |
| **Management / Direksi** | Pemutus kebijakan tertinggi. | *Approval dashboard*, laporan pengeluaran gaji bulanan (*analytical report*). |
| **Karyawan** | Penerima manfaat akhir. | Melihat/mengunduh slip gaji (PDF), melihat riwayat penggajian pribadi. |

---

## 4. ARSITEKTUR FITUR & PERSYARATAN FUNGSIONAL (FUNCTIONAL REQUIREMENTS)

### EPIC 1: Manajemen Master Data & Komponen Gaji
* **FR-1.1: Manajemen Profil Karyawan**
    * Sistem harus mampu menyimpan data dasar: NIK, Nama, Jabatan, Status Karyawan (PKWT/PKWTT), Status Pernikahan/Tanggungan Pajak (PTKP: TK/0-TK/3, K/0-K/3, K/I/0-K/I/3), Nomor Rekening Bank, BPJS KS ID, BPJS TK ID.
* **FR-1.2: Konfigurasi Komponen Gaji Tetap**
    * Input Gaji Pokok (Basic Salary).
    * Tunjangan Tetap (Tunjangan Jabatan, Tunjangan Keluarga, dll).
* **FR-1.3: Konfigurasi Komponen Gaji Tidak Tetap (Variabel)**
    * Tunjangan Transportasi/Makan (berdasarkan kehadiran aktual).
    * Insentif Performa, Bonus, dan Tunjangan Hari Raya (THR).

### EPIC 2: Engine Kalkulasi Potongan Hukum (Indonesian Compliance)
* **FR-2.1: Otomatisasi BPJS Kesehatan**
    * Sistem memotong 1% dari gaji karyawan (maksimal batas atas Rp 12.000.000).
    * Sistem menghitung beban perusahaan 4%.
* **FR-2.2: Otomatisasi BPJS Ketenagakerjaan**
    * Jaminan Hari Tua (JHT): Karyawan 2%, Perusahaan 3.7%.
    * Jaminan Pensiun (JP): Karyawan 1%, Perusahaan 2% (sesuai ceiling terbaru).
    * Jaminan Kecelakaan Kerja (JKK): Perusahaan 0.24% - 1.74% (tergantung tingkat risiko).
    * Jaminan Kematian (JKM): Perusahaan 0.3%.
* **FR-2.3: Modul Pajak PPh 21 (Skema Tarif Efektif Rata-Rata / TER)**
    * Sistem otomatis mengkategorikan karyawan ke dalam Kategori TER (A, B, atau C) berdasarkan status PTKP.
    * Sistem menghitung potongan PPh 21 Masa (Januari-November) menggunakan persentase TER dikalikan Gaji Bruto Bulanan.
    * Sistem menghitung kalkulasi *Disetahunkan* pada bulan Desember (menggunakan tarif Pasal 17 ayat (1) huruf a UU PPh) dan menghitung selisihnya otomatis.

### EPIC 3: Pemrosesan Gaji (Payroll Processing Engine)
* **FR-3.1: Integrasi Data Absensi & Lembur**
    * Sistem menerima input data kehadiran (Total Hari Kerja, Keterlambatan, Absen Tanpa Alasan).
    * Kalkulasi Upah Lembur otomatis sesuai formula regulasi pemerintah:
        * Jam pertama: 1.5 x Upah Per Jam (Gaji/173).
        * Jam berikutnya: 2 x Upah Per Jam.
* **FR-3.2: Batch Payroll Processing**
    * Fitur untuk memproses payroll seluruh karyawan atau per departemen sekaligus dalam satu klik (*Generate Payroll execution*).

### EPIC 4: Alur Kerja Persetujuan (Approval Workflow)
* **FR-4.1: Pengajuan Payroll**
    * HR Payroll Specialist mengajukan draf payroll bulanan yang telah di-generate.
* **FR-4.2: Notifikasi & Review Verifikasi**
    * Sistem mengirimkan notifikasi ke Dashboard Finance untuk pengecekan nominal anggaran.
* **FR-4.3: Final Approval**
    * Direksi/Management melakukan persetujuan akhir (*Approve/Reject* dengan catatan). Jika di-approve, status payroll terkunci (*Locked*) dan tidak bisa diubah kembali.

### EPIC 5: Pencairan & Pelaporan (Disbursal & Reporting)
* **FR-5.1: Ekspor Bank Bank-Clearing File (Corporate Payroll)**
    * Sistem mampu menghasilkan berkas enkripsi .TXT atau .CSV format khusus sesuai format *Bulk Transfer* perbankan utama (BCA, Mandiri, BRI, BNI).
* **FR-5.2: Automated Payslip Distribution**
    * Generate Slip Gaji berformat PDF terenkripsi (password: tanggal lahir karyawan YYYYMMDD).
    * Pengiriman otomatis ke email karyawan atau dapat diunduh via Portal Karyawan secara mandiri setelah tanggal *payday*.

---

## 5. PERSYARATAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)

### 1. Keamanan & Proteksi Data (Security)
* **NFR-1.1:** Data *Gaji* dan *Pajak* harus dienkripsi pada tingkat basis data menggunakan AES-256.
* **NFR-1.2:** Protokol komunikasi wajib menggunakan HTTPS dengan sertifikat TLS minimal v1.3.
* **NFR-1.3:** Implementasi MFA (Multi-Factor Authentication) untuk semua akun dengan *role* HR, Finance, dan Admin.

### 2. Performa (Performance & Scalability)
* **NFR-2.1:** Proses kalkulasi *Batch Payroll* untuk 1.000 karyawan tidak boleh memakan waktu lebih dari 60 detik.
* **NFR-2.2:** Waktu respons halaman dashboard (Query Data) maksimal 2 detik pada kondisi jaringan normal.

### 3. Ketersediaan (Availability)
* **NFR-2.3:** SLA (Service Level Agreement) sistem adalah 99.9% uptime per bulan.

---

## 6. INTEGRASI SISTEM (INTEGRATION POINTS)
1.  **Mesin / Aplikasi Absensi (Frictionless Integration):** Sinkronisasi data kehadiran via REST API setiap pukul 23:59 WIB.
2.  **Core Bank API:** Modul opsional untuk integrasi langsung (Direct Host-to-Host) dengan sistem kliring bank untuk transfer otomatis terintegrasi.
3.  **Sistem Akuntansi (ERP):** Integrasi pengiriman jurnal otomatis (Debit: Beban Gaji Karyawan, Kredit: Kas/Bank) setelah proses payroll berstatus *Disbursed*.

---

## 7. MATRIKS VALIDASI DATA (DATA VALIDATION RULE)

| Field Data | Jenis Validasi | Konsekuensi Kegagalan |
| :--- | :--- | :--- |
| **Nomor Rekening** | Harus berupa angka, tidak boleh ada karakter khusus/huruf. | Gagalkan proses simpan data karyawan. |
| **Status PTKP** | Wajib memilih dari dropdown opsi resmi (TK/0 - K/3). | Nilai default dialihkan otomatis ke TK/0 (Pajak Tertinggi). |
| **Gaji Pokok** | Tidak boleh bernilai 0 atau negatif. | Blokir eksekusi kalkulasi payroll. |

---

## 8. KETENTUAN HUKUM & AUDIT LOG
* Setiap aktivitas perubahan nominal komponen gaji, pengubahan status approval, dan ekspor data bank harus dicatat secara absolut di dalam sistem **Audit Trail** (Log mencakup: User ID, Timestamp, IP Address, Nilai Lama, Nilai Baru). Data log ini bersifat *Read-Only* dan tidak dapat dihapus bahkan oleh Super Admin sekalipun demi kepatuhan audit keuangan perusahaan.

## 9. Setiap pekerjaan di push & commit langsung ke
 https://github.com/ayahbaik2020-afk/project_payroll.git