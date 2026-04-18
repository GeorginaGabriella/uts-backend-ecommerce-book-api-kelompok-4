# E-Commerce Book API

Project ini adalah backend sederhana untuk aplikasi e-commerce buku yang dibuat untuk tugas kuliah. API ini dibangun menggunakan `Node.js`, `Express.js`, dan `MongoDB` dengan tujuan utama untuk mengatur proses belanja user, khususnya bagian `Order` dan `Checkout`.

Nama repository: `uts-backend-ecommerce-book-api-kelompok-4`

## Tujuan Project

Project ini dibuat untuk memenuhi kebutuhan backend pada sistem toko buku online, seperti:

- Menyimpan data user
- Menyimpan data produk buku
- Mengelola cart
- Melakukan checkout
- Menyimpan histori order user
- Membatalkan order sebelum pembayaran

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT

## Fitur Utama

- Login menggunakan token JWT
- Endpoint order dilindungi authentication
- Checkout dari cart menjadi order
- Validasi cart kosong
- Validasi stok produk saat checkout
- Clear cart setelah order berhasil dibuat
- Melihat detail order
- Melihat daftar order aktif
- Melihat riwayat order dengan filter status dan pagination
- Cancel order hanya untuk order dengan status `PENDING_PAYMENT`
- Unit testing untuk helper, middleware, dan order controller

## Struktur Folder

```bash
src/
├── app.js
├── server.js
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
└── utils/

test/
├── controllers/
├── helpers/
├── middleware/
└── utils/
```

## Cara Menjalankan Project

1. Clone repository ini

```bash
git clone https://github.com/GeorginaGabriella/uts-backend-ecommerce-book-api-kelompok-4.git
cd uts-backend-ecommerce-book-api-kelompok-4
```

2. Install dependency

```bash
npm install
```

3. Buat file `.env`

Isi file `.env` kurang lebih seperti ini:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ecommerce-db
JWT_SECRET=your_jwt_secret
```

4. Jalankan project

Untuk mode biasa:

```bash
npm start
```

Untuk mode development:

```bash
npm run dev
```

Server akan berjalan di:

```bash
http://localhost:5000
```

## Scripts

```bash
npm start
npm run dev
npm test
```

## Endpoint Order

Semua endpoint di bawah ini membutuhkan header:

```http
Authorization: Bearer <token>
```

### 1. Create Order

`POST /orders`

Digunakan untuk checkout cart user menjadi order baru.

Response success:

```json
{
  "success": true,
  "message": "Order created successfully",
  "orderId": "ORD17764748862874199",
  "status": "PENDING_PAYMENT"
}
```

### 2. Get All Active Orders

`GET /orders`

Digunakan untuk melihat semua order aktif milik user.

### 3. Get Order Detail

`GET /orders/:id`

Digunakan untuk melihat detail satu order berdasarkan `id` atau `orderNumber`.

### 4. Get Order History

`GET /orders/history`

Optional query:

- `status`
- `page`
- `limit`

Contoh:

```bash
GET /orders/history?status=PENDING_PAYMENT&page=1&limit=10
```

### 5. Cancel Order

`PUT /orders/:id/cancel`

Order hanya bisa dibatalkan jika statusnya masih `PENDING_PAYMENT`.

## Contoh Flow Checkout

1. User login dan mendapatkan token
2. User menambahkan buku ke cart
3. User melakukan request `POST /orders`
4. Sistem mengecek isi cart
5. Sistem mengecek stok produk
6. Sistem membuat order
7. Cart user dikosongkan
8. Sistem mengembalikan `orderId`

## Testing

Project ini sudah memiliki unit test untuk beberapa bagian penting, yaitu:

- `responseHandler`
- `authMiddleware`
- `orderController`

Untuk menjalankan test:

```bash
npm test
```

## Catatan

- Project ini masih tahap pengembangan backend dasar
- Payment gateway belum diintegrasikan
- Fitur seperti `SHIPPED`, `DELIVERED`, invoice PDF, dan notifikasi masih bisa dikembangkan lagi ke depannya

## Penutup

Backend ini dibuat sebagai bagian dari tugas kuliah dan difokuskan pada implementasi alur order dan checkout di e-commerce buku. Harapannya project ini bisa jadi dasar yang cukup rapi untuk dikembangkan lagi ke modul lain seperti payment, shipping, dan notifikasi.
