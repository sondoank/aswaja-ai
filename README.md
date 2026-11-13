# 🕌 AswajaAI — Prototipe Sistem AI Islam & Nahdlatul Ulama (Hybrid RAG)

Prototipe sistem tanya-jawab keislaman ala ChatGPT yang dirancang khusus untuk **masyarakat umum** dengan haluan **Ahlussunnah wal Jama'ah An-Nahdliyah (Nahdlatul Ulama)**.

## ✨ Fitur Utama Prototipe
1. **Antarmuka Web seperti ChatGPT (`public/index.html` & `public/app.js`):**
   - Riwayat percakapan otomatis tersimpan.
   - 6 kartu pertanyaan populer siap pakai (Tahlilan, Akad Nikah Online, Qunut Subuh, Paylater/Pinjol, Khittah & Aswaja, Metodologi Bahtsul Masail).
   - Tipografi teks Arab (*ibarah kitab* & hadis) dengan font *Amiri*.
   - **Kartu Rujukan Terverifikasi** di bagian bawah setiap jawaban AI.
2. **Mesin Hybrid RAG (`server.js`):**
   - **Pencarian Lokal (BM25 / Keyword-Tag Scoring):** Mencari materi di dalam `data/knowledge_base.json` yang berisi rujukan *Kutubul Mu'tabarah* (Kitab Kuning) & Keputusan *Bahtsul Masail NU*.
   - **Pencarian Langsung Situs Resmi `nu.or.id`:** Jika pertanyaan belum ada di database lokal, sistem otomatis mencari artikel relevan dari portal resmi **NU Online (`nu.or.id`)**.
   - **Dual-Mode (Lokal & Gemini 2.5 Flash):** Dapat langsung digunakan **tanpa API Key** (menggunakan *Smart Local RAG Synthesizer*), dan dapat dihubungkan dengan **Google Gemini API Key** melalui menu **⚙️ Pengaturan AI** di pojok kiri bawah.
3. **Manajemen Pustaka & Upload Referensi Kitab:**
   - Lihat seluruh daftar kitab & keputusan LBM di menu **📚 Pustaka Kitab & LBM NU**.
   - Tambahkan materi kitab/keputusan Bahtsul Masail baru atau impor file `.txt`/`.md` melalui menu **➕ Tambah Kitab / Referensi Baru**.

## 🚀 Cara Menjalankan
```bash
node server.js
```
Lalu buka browser di: **http://localhost:3000**

