# CreaTShop - TTCSN 2025

CreaTShop là project web thương mại điện tử cho cửa hàng thời trang. Hệ thống gồm ứng dụng client React và server Spring Boot, hỗ trợ người dùng mua hàng, quản lý giỏ hàng, đặt hàng, thanh toán, đồng thời có khu vực admin để quản lý sản phẩm, danh mục, đơn hàng và người dùng.

## Mục Lục

- [Tổng quan chức năng](#tổng-quan-chức-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Cài đặt và chạy project](#cài-đặt-và-chạy-project)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [API chính](#api-chính)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Phân quyền và bảo mật](#phân-quyền-và-bảo-mật)
- [Kiểm thử và build](#kiểm-thử-và-build)
- [Ghi chú phát triển](#ghi-chú-phát-triển)

## Tổng Quan Chức Năng

### Phía khách hàng

- Đăng ký tài khoản và đăng nhập bằng JWT.
- Xem trang chủ, danh mục, danh sách sản phẩm và chi tiết sản phẩm.
- Chọn biến thể sản phẩm theo màu, size và số lượng.
- Thêm, sửa, xóa sản phẩm trong giỏ hàng.
- Quản lý thông tin cá nhân và địa chỉ giao hàng.
- Tạo phương thức thanh toán, đặt hàng và xem lịch sử đơn hàng.
- Tích hợp luồng thanh toán VNPay sandbox.

### Phía quản trị

- Dashboard tổng quan.
- Quản lý sản phẩm và biến thể sản phẩm, bao gồm upload hình ảnh.
- Quản lý danh mục theo nhóm `MEN`, `WOMEN`, `BOY`, `GIRL`.
- Quản lý đơn hàng và cập nhật trạng thái đơn hàng.
- Quản lý người dùng, bao gồm khóa/mở khóa tài khoản.

## Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|:--|:--|
| Frontend | React 18, Vite, React Router, Redux Toolkit |
| UI và form | Tailwind CSS, SCSS, Formik, Yup, Swiper, React Icons, React Hot Toast |
| Gọi API | Axios |
| Biểu đồ | Chart.js, React Chart.js 2 |
| Backend | Java, Spring Boot 3.3.3 |
| Backend modules | Spring Web, Spring Data JPA, Spring Security, Validation |
| Auth | JWT với `io.jsonwebtoken` |
| Database | MySQL 8 |
| Mapping | MapStruct |
| Upload ảnh | Cloudinary |
| API docs | Springdoc OpenAPI / Swagger UI |
| Đóng gói | Docker, Docker Compose, Nginx |

## Cấu Trúc Thư Mục

```text
TTCSN-2025/
├── CreaTShop-Client/
│   ├── src/
│   │   ├── api/                 # Axios clients và API modules
│   │   ├── assets/              # Hình ảnh giao diện
│   │   ├── common/              # Header, footer, layout dùng chung
│   │   ├── components/          # Component sản phẩm, shop, admin, slider
│   │   ├── constants/           # API path và localStorage keys
│   │   ├── hook/                # Custom hooks auth/cart
│   │   ├── layout/              # MainLayout và AdminDashboard
│   │   ├── pages/               # Các trang người dùng/admin
│   │   └── redux/               # Redux store
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
│
├── CreaTShop-server/
│   └── creatshop/
│       ├── db/init/init.sql      # Script khởi tạo database và dữ liệu mẫu
│       ├── src/main/java/com/example/creatshop/
│       │   ├── config/           # CORS, Cloudinary, OpenAPI, VNPay
│       │   ├── constant/         # Endpoint, enum, message key
│       │   ├── controller/       # REST controllers
│       │   ├── domain/           # Entity, DTO, mapper
│       │   ├── exception/        # Global exception handling
│       │   ├── job/state/        # State pattern cho trạng thái đơn hàng
│       │   ├── repository/       # Spring Data repositories
│       │   ├── security/         # JWT filter và security config
│       │   ├── service/          # Service interfaces
│       │   ├── service/impl/     # Business logic
│       │   └── util/             # JWT, Cloudinary, VNPay helpers
│       ├── src/main/resources/
│       │   ├── application.properties
│       │   └── i18n/             # Message đa ngôn ngữ
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── pom.xml
│
└── README.md
```

## Kiến Trúc Hệ Thống

```text
Browser
  ↓
React/Vite Client
  ↓ Axios, Bearer JWT
Spring Boot REST API (/api/v1)
  ├── Spring Security + JWT
  ├── Service layer
  ├── Spring Data JPA
  ├── Cloudinary upload
  ├── VNPay sandbox
  ↓
MySQL
```

Client gọi API thông qua biến môi trường `VITE_API_URL`. Server cung cấp REST API với prefix `/api/v1`, trả về dữ liệu theo dạng `GlobalResponse` gồm `meta` và `data`.

## Cài Đặt Và Chạy Project

### Yêu cầu

- Node.js 18+ và npm.
- JDK 17.
- Mở project từ thư mục `TTCSN-2025` hoặc trực tiếp file backend `pom.xml`; không mở thư mục cha bên ngoài repository.
- Maven hoặc Maven Wrapper có sẵn trong server.
- Docker và Docker Compose nếu muốn chạy bằng container.
- MySQL 8 nếu chạy server trực tiếp trên máy.

### Chạy backend bằng Docker

```bash
cd CreaTShop-server/creatshop
docker compose up -d --build
```

Docker Compose sẽ khởi động:

- MySQL tại port `3307`.
- Spring Boot API tại port `8080`.
- Script `db/init/init.sql` được mount vào container MySQL để khởi tạo database/dữ liệu mẫu.

### Chạy backend trực tiếp

Sau khi clone, tạo file cấu hình local từ file mẫu rồi cập nhật thông tin MySQL:

```powershell
Copy-Item CreaTShop-server\creatshop\src\main\resources\application.properties.example CreaTShop-server\creatshop\src\main\resources\application.properties
```

```bash
cd CreaTShop-server/creatshop
./mvnw spring-boot:run
```

Trên Windows có thể dùng:

```powershell
cd CreaTShop-server\creatshop
.\mvnw.cmd spring-boot:run
```

API mặc định chạy tại:

```text
http://localhost:8080/api/v1
```

Swagger UI:

```text
http://localhost:8080/swagger-ui/index.html
```

### Chạy frontend

Tạo file `CreaTShop-Client/.env`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

Sau đó chạy:

```bash
cd CreaTShop-Client
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

### Chạy frontend bằng Docker

```bash
cd CreaTShop-Client
docker compose up -d --build
```

Container frontend dùng Nginx và expose ra port `5173`.

## Cấu Hình Môi Trường

### Frontend

| Biến | Ý nghĩa | Giá trị local gợi ý |
|:--|:--|:--|
| `VITE_API_URL` | Base URL của backend API | `http://localhost:8080/api/v1` |

### Backend

Những cấu hình quan trọng nằm trong `application.properties` hoặc biến môi trường Docker:

| Cấu hình | Ý nghĩa |
|:--|:--|
| `spring.datasource.url` | JDBC URL tới MySQL |
| `spring.datasource.username` | User MySQL |
| `spring.datasource.password` | Mật khẩu MySQL |
| `spring.jpa.hibernate.ddl-auto` | Chế độ cập nhật schema |
| `auth.token.jwtSecret` | Secret ký JWT |
| `auth.token.expirationInMils` | Thời gian hết hạn access token |
| `cloudinary.cloud_name` | Cloudinary cloud name |
| `cloudinary.api_key` | Cloudinary API key |
| `cloudinary.api_secret` | Cloudinary API secret |
| `vnp.tmn-code` | Merchant code VNPay |
| `vnp.hash-secret` | Secret VNPay |
| `vnp.url` | URL thanh toán VNPay |
| `vnp.return-url` | URL callback sau thanh toán |

Lưu ý: các secret như JWT, Cloudinary và VNPay nên được đưa ra biến môi trường khi deploy, không nên commit giá trị production vào repository.

## API Chính

Base URL:

```text
http://localhost:8080/api/v1
```

### Authentication

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `POST` | `/auths/login` | Public | Đăng nhập, trả về JWT và roles |

### Users

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `POST` | `/users` | Public | Đăng ký người dùng |
| `GET` | `/users/me` | Authenticated | Lấy thông tin người dùng hiện tại |
| `PUT` | `/users` | Authenticated | Cập nhật thông tin người dùng hiện tại |
| `GET` | `/users` | Admin | Lấy danh sách người dùng |
| `PUT` | `/users/{userId}?isLocked=true/false` | Admin | Khóa hoặc mở khóa tài khoản |

### Categories

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `GET` | `/categories` | Public | Lấy danh sách danh mục |
| `GET` | `/categories/{categoryId}` | Public | Lấy chi tiết danh mục |
| `POST` | `/categories` | Admin | Tạo danh mục |
| `PUT` | `/categories/{id}` | Admin | Cập nhật danh mục |
| `DELETE` | `/categories/{id}` | Admin | Xóa danh mục |

### Products

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `GET` | `/products` | Public | Lấy danh sách sản phẩm |
| `GET` | `/products/{productId}` | Public | Lấy chi tiết sản phẩm |
| `POST` | `/products` | Admin | Tạo sản phẩm bằng `multipart/form-data` |
| `PUT` | `/products/{productId}` | Admin | Cập nhật sản phẩm bằng `multipart/form-data` |
| `DELETE` | `/products/{productId}` | Admin | Xóa sản phẩm |

### Product variants

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `GET` | `/variants` | Public | Lấy tất cả biến thể |
| `GET` | `/variants/{variantId}` | Public | Lấy biến thể theo ID |
| `GET` | `/variants/product/{productId}` | Public | Lấy biến thể theo sản phẩm |
| `POST` | `/variants/{productId}` | Admin | Tạo biến thể bằng `multipart/form-data` |
| `PUT` | `/variants/{variantId}` | Admin | Cập nhật biến thể bằng `multipart/form-data` |
| `DELETE` | `/variants/{variantId}` | Admin | Xóa biến thể |

### Cart

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `POST` | `/carts` | Authenticated | Thêm sản phẩm vào giỏ |
| `GET` | `/carts` | Authenticated | Lấy giỏ hàng của người dùng |
| `GET` | `/carts/{cartItemId}` | Authenticated | Lấy item trong giỏ |
| `PUT` | `/carts/{cartItemId}` | Authenticated | Cập nhật số lượng/item |
| `DELETE` | `/carts/{cartItemId}` | Authenticated | Xóa item khỏi giỏ |

### Addresses

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `POST` | `/addresses` | Authenticated | Thêm địa chỉ |
| `GET` | `/addresses` | Authenticated | Lấy danh sách địa chỉ |
| `GET` | `/addresses/{addressId}` | Authenticated | Lấy địa chỉ theo ID |
| `PUT` | `/addresses/{addressId}` | Authenticated | Cập nhật địa chỉ |
| `DELETE` | `/addresses/{addressId}` | Authenticated | Xóa địa chỉ |

### Payments và VNPay

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `POST` | `/payments` | Authenticated | Tạo bản ghi thanh toán |
| `PUT` | `/payments/{paymentId}` | Authenticated | Cập nhật trạng thái thanh toán |
| `GET` | `/vnpay/create-payment?amount={amount}&bankCode={bankCode}` | Public | Tạo URL thanh toán VNPay |
| `GET` | `/vnpay/return` | Public | Xử lý callback VNPay |

### Orders

| Method | Endpoint | Quyền | Mô tả |
|:--|:--|:--|:--|
| `POST` | `/orders` | Authenticated | Tạo đơn hàng |
| `GET` | `/orders` | Authenticated | Lấy đơn hàng của người dùng hiện tại |
| `GET` | `/orders/{orderId}` | Authenticated | Lấy chi tiết/trạng thái đơn hàng |
| `PUT` | `/orders/{paymentId}` | Authenticated | Hủy đơn theo payment ID |
| `PUT` | `/orders/{orderId}/status` | Admin | Chuyển đơn sang trạng thái tiếp theo |
| `PUT` | `/orders/{orderId}/status/prev` | Authenticated | Chuyển đơn về trạng thái trước |

## Cơ Sở Dữ Liệu

Database chính là MySQL. File `CreaTShop-server/creatshop/db/init/init.sql` tạo database `creatshopdb3`, schema và dữ liệu mẫu.

Các bảng chính:

| Bảng | Ý nghĩa |
|:--|:--|
| `roles` | Vai trò `ROLE_ADMIN`, `ROLE_USER` |
| `users` | Tài khoản người dùng |
| `carts` | Giỏ hàng của người dùng |
| `cart_items` | Sản phẩm trong giỏ |
| `categories` | Danh mục sản phẩm |
| `products` | Sản phẩm |
| `product_info` | Biến thể sản phẩm |
| `addresses` | Địa chỉ giao hàng |
| `payment_details` | Thông tin thanh toán |
| `order_details` | Đơn hàng |
| `order_item` | Chi tiết sản phẩm trong đơn |

Trạng thái đơn hàng:

```text
Processing -> Shipped -> Delivered
```

Trạng thái thanh toán:

```text
PENDING, COMPLETED, FAILED, CANCELED
```

## Phân Quyền Và Bảo Mật

- Server dùng Spring Security với JWT stateless.
- Sau khi đăng nhập, client lưu thông tin auth trong `localStorage` và gửi header:

```text
Authorization: Bearer <token>
```

- API `GET` danh mục, sản phẩm và biến thể được public.
- API giỏ hàng, địa chỉ, đơn hàng và thanh toán cần đăng nhập.
- API tạo/sửa/xóa danh mục, sản phẩm, biến thể và một số API người dùng/đơn hàng cần role `ADMIN`.
- Mật khẩu người dùng được encode bằng `PasswordEncoder`.
- Tài khoản có trạng thái `ACTIVE` hoặc `BANNED`; tài khoản bị banned không được đăng nhập.

## Kiểm Thử Và Build

### Frontend

```bash
cd CreaTShop-Client
npm run lint
npm run build
```

### Backend

```bash
cd CreaTShop-server/creatshop
./mvnw test
./mvnw clean install
```

Trên Windows:

```powershell
cd CreaTShop-server\creatshop
.\mvnw.cmd test
.\mvnw.cmd clean install
```

## Ghi Chú Phát Triển

- `CreaTShop-Client/docker-compose.yml` đọc file `.env`; trong repo hiện có file `env`, nên khi chạy Docker frontend cần đảm bảo đúng tên file môi trường.
- Backend yêu cầu JDK 17. Sau khi đổi Project SDK/JAVA_HOME, hãy reload Maven project trước khi chạy.
- Backend đang cấu hình CORS cho tất cả origin. Khi deploy thật, nên giới hạn origin theo domain frontend.
- API upload sản phẩm/biến thể dùng `multipart/form-data`; client cần dùng axios instance upload riêng.
- Swagger UI là nơi nhanh nhất để kiểm tra request/response của server sau khi backend chạy.
