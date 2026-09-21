# CEK VIP ZAKIYA CASTER

Starter realtime VIP tracker.

## Fitur
- Customer dapat mencari nama atau ID ML.
- Data customer realtime tanpa refresh.
- Admin login menggunakan Firebase Authentication.
- Admin dapat tambah/edit/hapus customer.
- Admin dapat +1/+5/+10 dan -1/-5/-10 VIP.
- Sisa VIP dihitung dari `totalVip`.
- Lama penyimpanan dihitung dari `createdAt`.

## Setup Firebase
1. Buat project di Firebase.
2. Aktifkan Firestore Database.
3. Aktifkan Authentication → Email/Password.
4. Buat akun admin.
5. Tambahkan Web App.
6. Salin konfigurasi ke `firebase-config.js`.
7. Terapkan `firestore.rules`.

## Catatan keamanan
Untuk versi produksi, rules sebaiknya membatasi write hanya ke UID admin tertentu, bukan semua akun yang berhasil login. Setelah UID admin dibuat, ubah bagian `allow create, update, delete` menjadi pengecekan `request.auth.uid`.
