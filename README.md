# 📚 E-Commerce Book API (Backend Project UTS)

REST API backend untuk sistem e-commerce buku dan majalah menggunakan Node.js, Express, dan MongoDB.  
Sistem ini mendukung fitur autentikasi, user management, product management, cart, order, dan payment.

---

## 👨‍👩‍👧‍👦 Team Members

- Georgina Gabriella – Authentication, User Profile, Wishlist  
- Garini Cinkalisty – Product Management, Reviews, Recommendations  
- Celine Aurora Anastasia – Cart Module  
- Felicia Angeline – Order & Checkout Module  
- Fransiska – Payment & Admin Confirmation Module  

---

## 🚀 Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs
- Multer (file upload)
- Cloudinary (image storage)

---

## ⚙️ Installation & Setup

### 1. Clone repository
```bash
git clone https://github.com/GeorginaGabriella/uts-backend-ecommerce-book-api-kelompok-4.git
````

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Buat file `.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 4. Run server

```bash
node server.js
```

atau:

```bash
npx nodemon server.js
```

---

## 📡 Base URL

```
http://localhost:5000/api
```

---

# 🔐 AUTHENTICATION - Georgina Gabriella

| Method | Endpoint       | Deskripsi       |
| ------ | -------------- | --------------- |
| POST   | /auth/register | Registrasi user |
| POST   | /auth/login    | Login user      |
| POST   | /auth/logout   | Logout user     |

---

## 👤 USER PROFILE

| Method | Endpoint               | Deskripsi             |
| ------ | ---------------------- | --------------------- |
| GET    | /users/profile         | Ambil data user login |
| PUT    | /users/profile         | Update profile        |
| PUT    | /users/change-password | Ganti password        |

---

## ❤️ WISHLIST

| Method | Endpoint                | Deskripsi       |
| ------ | ----------------------- | --------------- |
| POST   | /users/wishlist         | Tambah wishlist |
| GET    | /users/wishlist         | Lihat wishlist  |
| DELETE | /users/wishlist/:bookId | Hapus wishlist  |

---

## 📍 ADDRESS

| Method | Endpoint                      | Deskripsi        |
| ------ | ----------------------------- | ---------------- |
| POST   | /users/address                | Tambah alamat    |
| GET    | /users/address                | Lihat alamat     |
| PUT    | /users/address/:index         | Update alamat    |
| DELETE | /users/address/:index         | Hapus alamat     |
| PUT    | /users/address/:index/primary | Set alamat utama |

---

# 📦 PRODUCT - Garini Cinkalisty

| Method | Endpoint      | Deskripsi     |
| ------ | ------------- | ------------- |
| POST   | /products     | Tambah produk |
| GET    | /products     | List produk   |
| GET    | /products/:id | Detail produk |
| PUT    | /products/:id | Update produk |
| DELETE | /products/:id | Hapus produk  |

---

## ⭐ REVIEWS

| Method | Endpoint              | Deskripsi     |
| ------ | --------------------- | ------------- |
| POST   | /products/:id/reviews | Tambah review |

---

## 🎯 RECOMMENDATION

| Method | Endpoint                  | Deskripsi      |
| ------ | ------------------------- | -------------- |
| GET    | /products/recommendations | Produk terbaik |
| GET    | /products/latest          | Produk terbaru |
| GET    | /products/categories      | List kategori  |

---

# 🛒 CART - Celine Aurora Anastasia 

| Method | Endpoint         | Deskripsi       |
| ------ | ---------------- | --------------- |
| POST   | /cart            | Tambah ke cart  |
| GET    | /cart            | Lihat cart      |
| PUT    | /cart/:productId | Update quantity |
| DELETE | /cart/:productId | Hapus item      |
| DELETE | /cart            | Clear cart      |

---

# 📦 ORDER - Felicia Angeline

| Method | Endpoint           | Deskripsi       |
| ------ | ------------------ | --------------- |
| POST   | /orders            | Checkout        |
| GET    | /orders            | List order user |
| GET    | /orders/history    | Riwayat order   |
| GET    | /orders/:id        | Detail order    |
| PUT    | /orders/:id/cancel | Cancel order    |

---

# 💳 PAYMENT (Fransiska)

| Method | Endpoint               | Deskripsi               |
| ------ | ---------------------- | ----------------------- |
| POST   | /payments              | Inisialisasi pembayaran |
| GET    | /payments/:orderId     | Cek status pembayaran   |
| POST   | /payments/re-verify    | Verifikasi ulang        |
| PUT    | /payments/confirm      | Konfirmasi admin        |
| GET    | /payments/admin/orders | Semua order (admin)     |

---

# 🔐 AUTH SYSTEM

* JWT Token wajib untuk endpoint protected
* Role:

  * USER
  * ADMIN

---

# 📁 PROJECT STRUCTURE

```
controllers/
models/
routes/
middleware/
utils/
config/
server.js
app.js
```

---

# 🧠 FEATURES

✔ Authentication (JWT)
✔ User Profile System
✔ Wishlist System
✔ Product Management
✔ Review System
✔ Cart System
✔ Order System
✔ Payment System
✔ Admin Role System

---

# 🎯 PURPOSE

Project ini dibuat untuk memenuhi UTS Backend Programming dengan implementasi REST API e-commerce modern.

---

# 📌 AUTHOR

Kelompok 4 – UTS Backend Programming
Universitas Tarumanagara – 2026