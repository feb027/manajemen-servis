# Web Aplikasi Manajemen Servis

Aplikasi web ini dibangun untuk memenuhi tugas Ujian Akhir Semester (UAS) mata kuliah Sistem Informasi, Program Studi Informatika, Semester 4.

## Deskripsi

Aplikasi ini bertujuan untuk membantu mengelola proses servis (misalnya barang elektronik, kendaraan, dll.). Fitur-fiturnya dirancang untuk memfasilitasi alur kerja dari penerimaan barang servis hingga penyelesaiannya, melibatkan berbagai peran pengguna seperti Resepsionis, Teknisi, dan Admin.

## Fitur Utama

Berdasarkan analisis kode, berikut beberapa fitur yang kemungkinan tersedia:

*   **Autentikasi Pengguna:** Sistem login untuk pengguna.
*   **Manajemen Role:** Peran pengguna yang berbeda (Admin, Resepsionis, Teknisi) dengan hak akses yang berbeda.
*   **Dashboard Sesuai Role:** Tampilan dashboard yang disesuaikan untuk setiap peran (Resepsionis, Teknisi, Admin).
*   **Manajemen Inventaris:** Kemungkinan untuk mengelola stok barang atau suku cadang.
*   **Manajemen Pelanggan:** Kemungkinan untuk mengelola data pelanggan.
*   **Manajemen Order Servis:** (Tersirat dari nama proyek dan peran) Proses penerimaan, pengerjaan, dan penyelesaian order servis.
*   **Visualisasi Data:** Penggunaan chart (Chart.js, Recharts) untuk menampilkan data atau statistik.
*   **Ekspor/Impor Data:** Kemungkinan fitur ekspor ke PDF (jsPDF) atau Excel/CSV (xlsx, papaparse).
*   **Cetak Data:** Fitur untuk mencetak informasi tertentu (react-to-print).
*   **Pengaturan:** Halaman pengaturan untuk profil pengguna dan mungkin tampilan.

## Teknologi yang Digunakan

*   **Frontend:**
    *   React 19
    *   Vite (Build Tool)
    *   React Router DOM (Routing)
    *   Tailwind CSS & Headless UI (Styling & UI Components)
    *   Chart.js, Recharts, react-chartjs-2 (Charting)
    *   React Icons (Ikon)
    *   React Hot Toast (Notifikasi)
    *   React Select (Dropdown/Select Input)
    *   date-fns (Utilitas Tanggal)
*   **Backend/BaaS:**
    *   Supabase (Database, Autentikasi)
*   **Lainnya:**
    *   ESLint (Linting)
    *   jsPDF, jspdf-autotable (Generasi PDF)
    *   xlsx, papaparse (Manipulasi Excel/CSV)
    *   react-to-print (Fungsi Cetak)

## Instalasi dan Setup

1.  **Clone Repository:**
    ```bash
    git clone <URL_REPOSITORY_ANDA>
    cd manajemen-servis
    ```
2.  **Install Dependensi:**
    ```bash
    npm install
    ```
3.  **Konfigurasi Environment Variables:**
    *   Buat file `.env` di root proyek.
    *   Tambahkan kredensial Supabase Anda:
      ```env
      VITE_SUPABASE_URL=URL_SUPABASE_ANDA
      VITE_SUPABASE_ANON_KEY=ANON_KEY_SUPABASE_ANDA
      ```
    *   Ganti `URL_SUPABASE_ANDA` dan `ANON_KEY_SUPABASE_ANDA` dengan nilai dari proyek Supabase Anda.

## Menjalankan Aplikasi

1.  **Development Server:**
    ```bash
    npm run dev
    ```
    Aplikasi akan berjalan di `http://localhost:5173` (atau port lain jika 5173 sudah digunakan).

2.  **Build untuk Produksi:**
    ```bash
    npm run build
    ```
    Hasil build akan ada di direktori `dist/`.

3.  **Preview Build Produksi:**
    ```bash
    npm run preview
    ```

## Kontributor

*   Febnawan Fatur Rochman
*   Renasya Malkahaq

---
