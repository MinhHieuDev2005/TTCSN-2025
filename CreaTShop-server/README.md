# CreaTShop Server - Technical Documentation

## 1. Tổng quan hệ thống

CreaTShop Server là backend REST API cho hệ thống thương mại điện tử thời trang/giày dép. Dự án được xây dựng bằng Java và Spring Boot theo kiến trúc MVC nhiều lớp, cung cấp API cho ứng dụng frontend React/Vite và khu vực quản trị.

Backend chịu trách nhiệm xác thực người dùng bằng JWT, quản lý sản phẩm, danh mục, biến thể sản phẩm, giỏ hàng, địa chỉ giao hàng, thanh toán, đơn hàng, tích hợp Cloudinary để upload hình ảnh và VNPay sandbox để tạo URL thanh toán.

### 1.1. Công nghệ sử dụng

| Thành phần | Công nghệ |
|:--|:--|
| Ngôn ngữ | Java |
| Framework | Spring Boot 3.3.3 |
| Kiến trúc | MVC, REST API, service/repository layer |
| Web/API | Spring Web |
| Security | Spring Security, JWT `io.jsonwebtoken` |
| Database | MySQL 8 |
| ORM | Spring Data JPA, Hibernate |
| Validation | Jakarta Bean Validation |
| Mapping DTO | MapStruct |
| Upload ảnh | Cloudinary |
| Payment gateway | VNPay sandbox |
| API Documentation | Springdoc OpenAPI / Swagger UI |
| Build | Maven / Maven Wrapper |
| Container | Docker, Docker Compose |

### 1.2. Kiến trúc tổng quan

```text
Frontend React/Vite
        |
        | HTTP/JSON, multipart/form-data, Authorization: Bearer <token>
        v
Spring Boot REST API (/api/v1)
        |
        +-- Controller layer: nhận request, validate payload, trả HTTP status
        +-- Security layer: JWT filter, role-based access control
        +-- Service layer: business logic, xử lý đơn hàng, thanh toán, upload ảnh
        +-- Mapper layer: chuyển đổi Entity <-> DTO
        +-- Repository layer: Spring Data JPA
        |
        +-- Cloudinary: lưu ảnh sản phẩm/biến thể
        +-- VNPay: tạo URL thanh toán sandbox
        v
MySQL 8
```

### 1.3. Các module nghiệp vụ chính

| Module | Vai trò |
|:--|:--|
| Authentication | Đăng nhập, phát hành JWT, kiểm tra tài khoản bị khóa |
| User | Đăng ký, cập nhật hồ sơ, lấy thông tin cá nhân, khóa/mở khóa tài khoản |
| Category | CRUD danh mục theo nhóm `MEN`, `WOMEN`, `BOY`, `GIRL` |
| Product | CRUD sản phẩm, upload ảnh tĩnh/động lên Cloudinary |
| Variant | CRUD biến thể sản phẩm theo màu, size, số lượng, ảnh |
| Cart | Thêm, xem, sửa, xóa item trong giỏ hàng |
| Address | Quản lý địa chỉ giao hàng của người dùng |
| Payment | Tạo và cập nhật trạng thái thanh toán |
| Order | Tạo đơn hàng, hủy đơn, xem đơn, chuyển trạng thái đơn |
| VNPay | Tạo URL thanh toán và nhận callback return |

## 2. Yêu cầu môi trường

| Công cụ | Phiên bản khuyến nghị | Ghi chú |
|:--|:--|:--|
| JDK | 17 | Dockerfile dùng OpenJDK 17; `pom.xml` khai báo `java.version=17` |
| Maven | 3.8+ | Có thể dùng Maven Wrapper `mvnw`/`mvnw.cmd` trong repo |
| MySQL | 8.0 | Docker Compose dùng image `mysql:8.0` |
| Docker | 24+ | Dùng nếu chạy database và app bằng container |
| Docker Compose | v2+ | Dùng lệnh `docker compose` |

> Backend được build bằng Java 17. IntelliJ Project SDK, Maven importer và Run configuration phải cùng dùng JDK 17.

## 3. Cài đặt và chạy dự án local

Thư mục backend chính:

```text
CreaTShop-server/creatshop
```

### 3.1. Chạy bằng Docker Compose

Docker Compose sẽ khởi động MySQL và Spring Boot API. Script `db/init/init.sql` được mount vào MySQL để tạo database `creatshopdb3`, schema và dữ liệu mẫu.

```powershell
cd CreaTShop-server\creatshop
docker compose up -d --build
```

Kiểm tra container:

```powershell
docker compose ps
```

Dừng môi trường:

```powershell
docker compose down
```

Endpoint sau khi chạy:

```text
API Base URL : http://localhost:8080/api/v1
Swagger UI  : http://localhost:8080/swagger-ui/index.html
OpenAPI JSON: http://localhost:8080/v3/api-docs
MySQL       : localhost:3307
```

### 3.2. Chạy trực tiếp bằng Maven Wrapper

Yêu cầu MySQL local đã chạy. Sau khi clone, tạo file cấu hình local từ template:

```powershell
Copy-Item src\main\resources\application.properties.example src\main\resources\application.properties
```

Sau đó cập nhật user/password MySQL trong `application.properties` nếu khác giá trị mặc định.

```powershell
cd CreaTShop-server\creatshop
.\mvnw.cmd spring-boot:run
```

Nếu dùng Git Bash/Linux/macOS:

```bash
cd CreaTShop-server/creatshop
./mvnw spring-boot:run
```

### 3.3. Build và test

```powershell
cd CreaTShop-server\creatshop
.\mvnw.cmd test
.\mvnw.cmd clean install
```

### 3.4. Cấu hình kết nối frontend

Frontend nên trỏ tới base URL:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

Khi gọi API yêu cầu xác thực, frontend gửi header:

```http
Authorization: Bearer <accessToken>
```

## 4. Cấu hình môi trường backend

Các cấu hình chính nằm trong:

```text
CreaTShop-server/creatshop/src/main/resources/application.properties
```

| Key | Ý nghĩa |
|:--|:--|
| `spring.datasource.url` | JDBC URL tới MySQL |
| `spring.datasource.username` | Tên đăng nhập MySQL |
| `spring.datasource.password` | Mật khẩu MySQL |
| `spring.jpa.hibernate.ddl-auto` | Cách Hibernate cập nhật schema |
| `auth.token.jwtSecret` | Secret ký JWT |
| `auth.token.expirationInMils` | Thời gian hết hạn access token |
| `auth.token.refreshInMils` | Thời gian refresh token dự kiến |
| `cloudinary.cloud_name` | Cloudinary cloud name |
| `cloudinary.api_key` | Cloudinary API key |
| `cloudinary.api_secret` | Cloudinary API secret |
| `vnp.tmn-code` | Merchant code VNPay |
| `vnp.hash-secret` | Secret hash VNPay |
| `vnp.url` | URL thanh toán VNPay sandbox |
| `vnp.return-url` | URL frontend nhận kết quả thanh toán |

Không nên dùng secret production trực tiếp trong file properties đã commit. Khi deploy, nên chuyển JWT secret, Cloudinary secret, VNPay secret và thông tin database sang biến môi trường hoặc secret manager.

## 5. Cấu trúc thư mục cốt lõi

```text
CreaTShop-server/
└── creatshop/
    ├── db/
    │   └── init/
    │       └── init.sql                 # Tạo schema và seed data MySQL
    ├── src/main/java/com/example/creatshop/
    │   ├── config/                      # Cloudinary, OpenAPI, VNPay, security beans
    │   ├── constant/                    # Endpoint, enum, message keys
    │   ├── controller/                  # REST controllers
    │   ├── domain/
    │   │   ├── dto/
    │   │   │   ├── global/              # GlobalResponse, Meta
    │   │   │   ├── request/             # Request DTO
    │   │   │   └── response/            # Response DTO
    │   │   ├── entity/                  # JPA entities
    │   │   └── mapper/                  # MapStruct mappers
    │   ├── exception/                   # Custom exception và GlobalExceptionHandler
    │   ├── job/state/                   # State pattern cho trạng thái đơn hàng
    │   ├── repository/                  # Spring Data JPA repositories
    │   ├── security/
    │   │   └── jwt/                     # JWT filter, auth entry point
    │   ├── service/                     # Service interfaces
    │   ├── service/impl/                # Business logic
    │   ├── util/                        # JWT, Cloudinary, VNPay, enum helpers
    │   └── CreatshopApplication.java
    ├── src/main/resources/
    │   ├── application.properties
    │   └── i18n/                        # messages_en.properties, messages_vn.properties
    ├── Dockerfile
    ├── docker-compose.yml
    ├── mvnw / mvnw.cmd
    └── pom.xml
```

## 6. Chuẩn response và lỗi

Tất cả API nghiệp vụ dùng response wrapper:

```json
{
  "meta": {
    "status": "SUCCESS",
    "message": "Optional message"
  },
  "data": {}
}
```

| Field | Kiểu | Ý nghĩa |
|:--|:--|:--|
| `meta.status` | `SUCCESS` hoặc `ERROR` | Trạng thái nghiệp vụ |
| `meta.message` | `string` | Message lỗi/thành công, có thể vắng mặt |
| `data` | object/array/string/null | Payload trả về |

### 6.1. Mã lỗi thường gặp

| HTTP status | Trường hợp |
|:--|:--|
| `400 Bad Request` | Validation fail, dữ liệu không hợp lệ, entity không tồn tại theo custom exception hiện tại |
| `403 Forbidden` | Không có quyền, token không hợp lệ, tài khoản bị khóa |
| `404 Not Found` | Một số annotation Swagger mô tả 404, nhưng `GlobalExceptionHandler` hiện map nhiều `NotFoundException` về 400 |
| `500 Internal Server Error` | Lỗi ngoài các exception handler hiện có |

Ví dụ validation error:

```json
{
  "meta": {
    "status": "ERROR",
    "message": "Validation failed"
  },
  "data": {
    "username": "Username must not be blank",
    "password": "Password format is invalid"
  }
}
```

## 7. Authentication và phân quyền

Server dùng Spring Security stateless với JWT.

| Nhóm API | Quyền |
|:--|:--|
| `POST /auths/login` | Public |
| `POST /users` | Public |
| `GET /categories/**` | Public |
| `GET /products/**` | Public |
| `GET /variants/**` | Public |
| `/carts/**` | Authenticated |
| `/addresses/**` | Authenticated |
| `/orders/**` | Authenticated, riêng chuyển trạng thái next yêu cầu `ROLE_ADMIN` |
| `/payments/**` | Authenticated |
| Ghi/xóa category/product/variant | `ROLE_ADMIN` |
| `GET /users`, `PUT /users/{userId}` | `ROLE_ADMIN` |

Đăng nhập thành công trả về:

```json
{
  "meta": {
    "status": "SUCCESS"
  },
  "data": {
    "accessToken": "<jwt>",
    "type": "Bearer",
    "roles": "ROLE_USER"
  }
}
```

## 8. API endpoints quan trọng

Base URL:

```text
http://localhost:8080/api/v1
```

### 8.1. Authentication

| Method | Endpoint | Quyền | Request | Response |
|:--|:--|:--|:--|:--|
| `POST` | `/auths/login` | Public | `LoginRequest` | `AuthResponse` |

`LoginRequest`

```json
{
  "username": "nguyenvana1",
  "password": "Password123!"
}
```

`AuthResponse.data`

```json
{
  "accessToken": "<jwt>",
  "type": "Bearer",
  "roles": "ROLE_USER"
}
```

### 8.2. Users

| Method | Endpoint | Quyền | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|
| `POST` | `/users` | Public | `UserRequest` | `UserResponse` | Đăng ký tài khoản |
| `GET` | `/users/me` | Authenticated | - | `UserResponse` | Lấy hồ sơ người dùng hiện tại |
| `PUT` | `/users` | Authenticated | `UserUpdateRequest` | `UserResponse` | Cập nhật hồ sơ người dùng hiện tại |
| `GET` | `/users` | `ROLE_ADMIN` | - | `UserResponse[]` | Lấy danh sách người dùng |
| `PUT` | `/users/{userId}?isLocked=true` | `ROLE_ADMIN` | Query `isLocked` | `UserResponse` | Khóa/mở khóa tài khoản |

`UserRequest`

```json
{
  "firstName": "Nguyen",
  "lastName": "Van A",
  "username": "nguyenvana",
  "password": "Password123!",
  "email": "nguyenvana@example.com",
  "phoneNumber": "0901234567",
  "dateOfBirth": "1999-01-20"
}
```

`UserResponse.data`

```json
{
  "id": "uuid",
  "username": "nguyenvana",
  "firstName": "Nguyen",
  "lastName": "Van A",
  "email": "nguyenvana@example.com",
  "phoneNumber": "0901234567",
  "dateOfBirth": "1999-01-20T00:00:00.000+00:00",
  "status": "ACTIVE",
  "address": []
}
```

### 8.3. Categories

| Method | Endpoint | Quyền | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|
| `GET` | `/categories` | Public | - | `CategoryTypeResponse[]` | Lấy danh mục, group theo type |
| `GET` | `/categories/{categoryId}` | Public | - | `CategoryResponse` | Lấy chi tiết danh mục |
| `POST` | `/categories` | `ROLE_ADMIN` | `CategoryRequest` | `CategoryResponse` | Tạo danh mục |
| `PUT` | `/categories/{id}` | `ROLE_ADMIN` | `CategoryRequest` | `CategoryResponse` | Cập nhật danh mục |
| `DELETE` | `/categories/{id}` | `ROLE_ADMIN` | - | `string` | Xóa danh mục |

`CategoryRequest`

```json
{
  "name": "Giay the thao",
  "description": "Danh muc giay the thao nam",
  "type": "MEN"
}
```

Giá trị `type` hợp lệ:

```text
MEN, WOMEN, BOY, GIRL
```

### 8.4. Products

| Method | Endpoint | Quyền | Content-Type | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|:--|
| `GET` | `/products` | Public | - | - | `ProductResponse[]` | Lấy danh sách sản phẩm |
| `GET` | `/products/{productId}` | Public | - | - | `ProductResponse` | Lấy chi tiết sản phẩm |
| `POST` | `/products` | `ROLE_ADMIN` | `multipart/form-data` | `ProductRequest` | `ProductResponse` | Tạo sản phẩm |
| `PUT` | `/products/{productId}` | `ROLE_ADMIN` | `multipart/form-data` | `ProductRequest` | `ProductResponse` | Cập nhật sản phẩm |
| `DELETE` | `/products/{productId}` | `ROLE_ADMIN` | - | - | `string` | Xóa sản phẩm |

`ProductRequest` dùng `multipart/form-data`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|:--|:--|:--|:--|
| `name` | string | Có | 3-100 ký tự |
| `price` | number | Có | Tối thiểu `0.1` |
| `staticImg` | file | Có khi tạo | Ảnh tĩnh |
| `dynamicImg` | file | Có khi tạo | Ảnh động/hover |
| `categoryId` | number | Có | ID danh mục |
| `variants` | array | Không | Danh sách biến thể kèm ảnh |

Ví dụ tạo sản phẩm bằng PowerShell:

```powershell
curl.exe -X POST "http://localhost:8080/api/v1/products" `
  -H "Authorization: Bearer <token>" `
  -F "name=Bitis Hunter Demo" `
  -F "price=850000" `
  -F "categoryId=1" `
  -F "staticImg=@C:\tmp\static.jpg" `
  -F "dynamicImg=@C:\tmp\dynamic.jpg"
```

`ProductResponse.data`

```json
{
  "id": 1,
  "name": "Bitis Hunter Demo",
  "price": 850000.0,
  "imageStaticUrl": "https://res.cloudinary.com/.../static.jpg",
  "imageDynamicUrl": "https://res.cloudinary.com/.../dynamic.jpg",
  "variants": []
}
```

### 8.5. Product variants

| Method | Endpoint | Quyền | Content-Type | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|:--|
| `GET` | `/variants` | Public | - | - | `ProductVariantResponse[]` | Lấy tất cả biến thể |
| `GET` | `/variants/{variantId}` | Public | - | - | `ProductVariantResponse` | Lấy biến thể theo ID |
| `GET` | `/variants/product/{productId}` | Public | - | - | `ProductVariantResponse[]` | Lấy biến thể theo sản phẩm |
| `POST` | `/variants/{productId}` | `ROLE_ADMIN` | `multipart/form-data` | `ProductVariantRequest` | `ProductVariantResponse` | Tạo biến thể |
| `PUT` | `/variants/{variantId}` | `ROLE_ADMIN` | `multipart/form-data` | `ProductVariantRequest` | `ProductVariantResponse` | Cập nhật biến thể |
| `DELETE` | `/variants/{variantId}` | `ROLE_ADMIN` | - | - | `string` | Xóa biến thể |

`ProductVariantRequest`

| Field | Kiểu | Bắt buộc | Ghi chú |
|:--|:--|:--|:--|
| `color` | string | Có | Tối đa 50 ký tự |
| `size` | string | Có | Tối đa 100 ký tự |
| `quantity` | number | Có | Tối thiểu 1 |
| `image` | file | Có khi tạo | Ảnh biến thể |

```powershell
curl.exe -X POST "http://localhost:8080/api/v1/variants/1" `
  -H "Authorization: Bearer <token>" `
  -F "color=Black" `
  -F "size=42" `
  -F "quantity=10" `
  -F "image=@C:\tmp\variant.jpg"
```

### 8.6. Cart

| Method | Endpoint | Quyền | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|
| `POST` | `/carts` | Authenticated | `CartItemRequest` | `CartItemResponse` | Thêm item vào giỏ |
| `GET` | `/carts` | Authenticated | - | `CartItemResponse[]` | Lấy giỏ hàng hiện tại |
| `GET` | `/carts/{cartItemId}` | Authenticated | - | `CartItemResponse` | Lấy item theo ID |
| `PUT` | `/carts/{cartItemId}` | Authenticated | `CartItemRequest` | `CartItemResponse` | Cập nhật số lượng |
| `DELETE` | `/carts/{cartItemId}` | Authenticated | - | `string` | Xóa item khỏi giỏ |

`CartItemRequest`

```json
{
  "productId": 1,
  "variantId": 1,
  "quantity": 2
}
```

`CartItemResponse.data`

```json
{
  "id": 10,
  "productDetail": {
    "id": 1,
    "name": "Bitis Hunter Demo",
    "color": "Black",
    "size": "42",
    "quantity": 8,
    "imageUrl": "https://res.cloudinary.com/.../variant.jpg"
  },
  "productResponse": {
    "id": 1,
    "name": "Bitis Hunter Demo",
    "price": 850000.0,
    "imageStaticUrl": "https://...",
    "imageDynamicUrl": "https://...",
    "variants": []
  },
  "quantity": 2
}
```

### 8.7. Addresses

| Method | Endpoint | Quyền | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|
| `POST` | `/addresses` | Authenticated | `AddressRequest` | `AddressResponse` | Thêm địa chỉ |
| `GET` | `/addresses` | Authenticated | - | `AddressResponse[]` | Lấy danh sách địa chỉ |
| `GET` | `/addresses/{addressId}` | Authenticated | - | `AddressResponse` | Lấy địa chỉ theo ID |
| `PUT` | `/addresses/{addressId}` | Authenticated | `AddressRequest` | `AddressResponse` | Cập nhật địa chỉ |
| `DELETE` | `/addresses/{addressId}` | Authenticated | - | `string` | Xóa địa chỉ |

`AddressRequest`

```json
{
  "firstName": "Nguyen",
  "lastName": "Van A",
  "country": "Vietnam",
  "city": "Ho Chi Minh",
  "district": "Quan 1",
  "commune": "Ben Nghe",
  "addressDetail": "123 Le Loi",
  "description": "Giao gio hanh chinh",
  "phoneNumber": "0901234567"
}
```

### 8.8. Payments

| Method | Endpoint | Quyền | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|
| `POST` | `/payments` | Authenticated | `PaymentRequest` | `PaymentResponse` | Tạo payment detail |
| `PUT` | `/payments/{paymentId}` | Authenticated | `PaymentRequest` | `PaymentResponse` | Cập nhật trạng thái |

`PaymentRequest`

```json
{
  "amount": 1700000,
  "provider": "COD",
  "status": "PENDING"
}
```

Trạng thái hợp lệ:

```text
PENDING, COMPLETED, FAILED, CANCELED
```

Lưu ý: Khi tạo payment, service hiện set trạng thái về `PENDING` bất kể `status` trong request.

### 8.9. Orders

| Method | Endpoint | Quyền | Request | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|
| `POST` | `/orders` | Authenticated | `OrderRequest` | `OrderDetailResponse` | Tạo đơn hàng |
| `GET` | `/orders` | Authenticated | - | `OrderDetailResponse[]` | Lấy đơn của user hiện tại |
| `GET` | `/orders/{orderId}` | Authenticated | - | `OrderDetailResponse` | Lấy chi tiết/trạng thái đơn |
| `PUT` | `/orders/{paymentId}` | Authenticated | - | `PaymentResponse` | Hủy đơn theo payment ID |
| `PUT` | `/orders/{orderId}/status` | `ROLE_ADMIN` | - | `OrderDetailResponse` | Chuyển sang trạng thái kế tiếp |
| `PUT` | `/orders/{orderId}/status/prev` | Authenticated | - | `OrderDetailResponse` | Chuyển về trạng thái trước |

`OrderRequest`

```json
{
  "paymentId": 1,
  "orderItems": [
    {
      "productId": 1,
      "variantId": 1,
      "quantity": 2
    }
  ]
}
```

Luồng trạng thái đơn hàng:

```text
Processing -> Shipped -> Delivered
```

Khi tạo đơn, hệ thống trừ tồn kho của từng `ProductVariant`. Khi hủy đơn có payment `PENDING`, hệ thống cộng lại tồn kho và chuyển payment sang `CANCELED`.

### 8.10. VNPay

| Method | Endpoint | Quyền | Query params | Response | Mô tả |
|:--|:--|:--|:--|:--|:--|
| `GET` | `/vnpay/create-payment` | Public | `amount`, `bankCode?` | `VNPayResponseDTO` | Tạo URL thanh toán VNPay |
| `GET` | `/vnpay/return` | Public | VNPay callback params | `Object` | Nhận kết quả return |

Ví dụ:

```text
GET /api/v1/vnpay/create-payment?amount=1700000&bankCode=NCB
```

`VNPayResponseDTO.data`

```json
{
  "code": "ok",
  "message": "success",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
}
```

## 9. Data model chính

| Entity | Bảng | Quan hệ chính |
|:--|:--|:--|
| `Role` | `roles` | 1 role có nhiều user |
| `User` | `users` | N-1 role, 1-1 cart, 1-N address, 1-N order |
| `Cart` | `carts` | 1-1 user, 1-N cart item |
| `CartItem` | `cart_items` | N-1 cart, N-1 product, N-1 product variant |
| `Category` | `categories` | 1-N product |
| `Product` | `products` | N-1 category, 1-N product variant |
| `ProductVariant` | `product_info` | N-1 product |
| `Address` | `addresses` | N-1 user |
| `PaymentDetail` | `payment_details` | 1-1 order detail |
| `OrderDetail` | `order_details` | N-1 user, 1-N order item |
| `OrderItem` | `order_item` | N-1 order, N-1 product, N-1 variant |

## 10. Ghi chú tích hợp cho Frontend

- API trả về wrapper `GlobalResponse`, frontend nên đọc dữ liệu ở `response.data.data`.
- Với API upload sản phẩm/biến thể, dùng `FormData` và `Content-Type: multipart/form-data`.
- Với API cần đăng nhập, luôn gửi `Authorization: Bearer <token>`.
- `GET /categories`, `GET /products`, `GET /variants` có thể gọi trước khi đăng nhập.
- `dateOfBirth` là `Date`; frontend nên gửi định dạng ISO như `YYYY-MM-DD`.
- Password phải có 8-16 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt theo pattern hiện tại.
- Số điện thoại phải bắt đầu bằng `0` và có tổng 10-15 chữ số.

## 11. Checklist vận hành/deploy

- Đổi `spring.datasource.*` sang cấu hình database production.
- Đưa JWT secret, Cloudinary secret và VNPay secret ra biến môi trường.
- Giới hạn CORS theo domain frontend production thay vì cho phép mọi origin.
- Kiểm tra lại `spring.jpa.hibernate.ddl-auto`; production thường không nên dùng `update` nếu đã có migration rõ ràng.
- Kiểm thử luồng tạo payment -> tạo order -> trừ tồn kho -> hủy order -> hoàn tồn kho.
- Kiểm thử quyền `ROLE_ADMIN` cho API quản trị.
