# Inception Labs Automation Farm 🚀

[![Node.js](https://img.shields.io/badge/Node.js-v16+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-Extra_Stealth-00D8A2?style=for-the-badge&logo=puppeteer&logoColor=white)](https://github.com/berstend/puppeteer-extra)
[![Chrome CDP](https://img.shields.io/badge/Chrome-CDP_Protocol-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chromedevtools.github.io/devtools-protocol/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

Otomatisasi registrasi akun dan pembuatan (generate) API Key untuk platform [Inception Labs AI](https://platform.inceptionlabs.ai/) menggunakan Puppeteer Extra Stealth yang terhubung langsung ke sesi Chrome melalui **Chrome DevTools Protocol (CDP)**.

---

## 🌟 Fitur Utama

- **Stealth & Anti-Detection**: Terintegrasi dengan `puppeteer-extra-plugin-stealth` dan CDP port `9222` untuk meminimalkan deteksi bot dan Cloudflare challenges.
- **Auto Clean State**: Otomatis membersihkan cookies, cache, local storage, dan session storage antar akun untuk menjaga kebersihan sesi.
- **Automated API Key Generation**: Otomatis masuk ke dashboard API keys, membuat key baru dengan nama random, dan menyimpannya ke berkas `apikey.txt`.
- **Auto Queue Management**: Akun yang telah berhasil diproses akan langsung dihapus dari antrean `akun.txt` sehingga tidak terjadi duplikasi pengerjaan.
- **Human-like Delay**: Dilengkapi jeda acak (*random delay*) dan pengetikan realistis untuk mengurangi risiko checkpoint/blokir.

---

## 📁 Struktur Direktori

```text
inception/
├── .gitignore             # Berkas filter agar akun & apikey tidak ter-upload ke Git
├── akun.example.txt       # Template format input akun
├── apikey.txt             # Berkas output penyimpan API key (auto-generated)
├── create-account.js      # Script utama otomatisasi Puppeteer
├── package.json           # Definisi dependencies & script npm
└── README.md              # Dokumentasi proyek
```

---

## 📋 Prasyarat

Sebelum menjalankan proyek ini, pastikan Anda telah menginstal:

1. **[Node.js](https://nodejs.org/)** (versi 16.x atau lebih baru)
2. **Google Chrome Browser**

---

## ⚙️ Instalasi & Persiapan

### 1. Clone Repository

```bash
git clone https://github.com/zahirnurdin1/inceptionfarm.git
cd inceptionfarm
```

### 2. Install Dependencies

Jalankan perintah berikut di direktori proyek:

```bash
npm install
```

### 3. Siapkan Akun

Buat atau isi file `akun.txt` di root direktori proyek dengan format `email|password`, satu akun per baris:

```text
user1@gmail.com|Password123!
user2@gmail.com|Password123!
```

> 💡 Anda dapat merujuk ke file `akun.example.txt` sebagai contoh format.

---

## 🚀 Cara Menjalankan

### Langkah 1: Buka Google Chrome dengan Remote Debugging

Script ini mengontrol browser Chrome yang berjalan dengan port debugging `9222`.

#### 💻 Windows (Command Prompt / PowerShell):
Tutup semua jendela Chrome yang sedang berjalan, kemudian jalankan:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-dev-profile"
```
*(Atau sesuaikan direktori instalasi Chrome Anda jika berbeda)*

### Langkah 2: Jalankan Script Otomatisasi

Buka terminal baru di folder proyek, lalu jalankan:

```bash
npm start
```
atau:
```bash
node create-account.js
```

Script akan:
1. Menghubungkan ke browser Chrome via `http://127.0.0.1:9222`.
2. Membaca daftar akun dari `akun.txt`.
3. Membuka halaman pendaftaran dan memverifikasi browser.
4. Mendaftarkan akun dan menunggu konfirmasi.
5. Masuk ke halaman pembuatan API key dan mengekstrak key yang baru dibuat.
6. Menyimpan API Key ke `apikey.txt` dan menghapus baris akun yang sukses dari `akun.txt`.

---

## 🔒 Catatan Keamanan

- File `akun.txt` dan `apikey.txt` sudah otomatis dimasukkan ke `.gitignore`. **Jangan pernah membagikan atau mengunggah data kredensial pribadi Anda ke repository publik.**
- Selalu gunakan profil Chrome terpisah (seperti `--user-data-dir="C:\chrome-dev-profile"`) saat menjalankan remote debugging untuk menjaga keamanan data browser pribadi Anda.

---

## 📄 Lisensi

Proyek ini dibuat untuk tujuan pembelajaran, pengujian, dan otomatisasi pribadi.
Didistribusikan di bawah lisensi MIT.
