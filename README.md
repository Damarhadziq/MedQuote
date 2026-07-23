# MedQuote

MedQuote adalah aplikasi satu halaman untuk detailer obat mengelola etalase
produk, menyusun penawaran harga kepada dokter, menyimpan riwayat, dan membuat
PDF formal.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Aplikasi otomatis menggunakan Mode Demo ketika variabel Supabase belum diisi.
Gunakan akun contoh yang sudah tampil pada halaman masuk untuk mencoba seluruh
alur. Data demo disimpan hanya di browser perangkat tersebut.

## Menghubungkan Supabase

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
3. Jalankan `supabase/schema.sql` melalui SQL Editor Supabase.
4. Buat pengguna melalui Supabase Auth.
5. Jika diperlukan, jalankan `supabase/seed.sql` untuk menambahkan produk contoh
   kepada pengguna pertama.

Row Level Security pada skema memastikan pengguna hanya dapat membaca dan
mengubah produk serta penawaran miliknya sendiri.

## Pemeriksaan

```bash
npx tsc --noEmit
npm run lint
npm run build
node scripts/generate-sample-pdf.mjs
```

Contoh PDF tersimpan di `output/pdf/`.
