# Kế hoạch triển khai thanh toán khi nhận hàng (COD)

Tài liệu này dùng để bám theo khi bổ sung chức năng **thanh toán khi nhận hàng** cho dự án CreaTShop.

## 1. Mục tiêu

Thêm phương thức thanh toán **COD - Cash On Delivery** vào luồng checkout.

Người dùng có thể chọn "Thanh toán khi nhận hàng", tạo đơn hàng ngay mà không cần chuyển sang VNPay. Trạng thái thanh toán ban đầu là `PENDING`. Khi đơn giao thành công và khách đã trả tiền, admin hoặc hệ thống cập nhật thanh toán thành `COMPLETED`.

## Trạng thái triển khai hiện tại

Đã triển khai trong code:

- [x] Backend validate provider thanh toán `COD`/`VNPAY`.
- [x] Backend tự set payment mới về `PENDING`.
- [x] Backend cho phép tạo order với payment COD.
- [x] Backend chặn dùng lại một payment cho nhiều order.
- [x] Backend chặn tạo order khi payment không còn `PENDING`.
- [x] Backend tính lại tổng tiền order và cập nhật amount cho payment.
- [x] Backend bắt buộc order có `addressId` và lưu địa chỉ giao hàng vào đơn.
- [x] Backend trừ tồn kho khi tạo order và hoàn tồn kho khi hủy order.
- [x] Backend thêm API admin xác nhận COD: `PUT /api/v1/payments/{paymentId}/confirm-cod`.
- [x] Backend chỉ cho xác nhận COD sau khi order đã `Delivered`.
- [x] Frontend cart gửi provider `COD` đúng định dạng backend.
- [x] Frontend checkout gửi payload `orderItems` đúng với `OrderRequest`.
- [x] Frontend checkout bắt chọn hoặc thêm địa chỉ giao hàng trước khi đặt.
- [x] Frontend chặn đặt hàng khi giỏ rỗng.
- [x] Frontend COD đặt hàng thành công sẽ chuyển sang trang lịch sử đơn hàng.
- [x] Frontend VNPay tạo order có địa chỉ trước khi redirect và cập nhật kết quả khi quay lại.
- [x] Frontend admin quản lý order, chuyển trạng thái order và xác nhận COD.
- [x] Frontend user xem lịch sử đơn hàng và hủy đơn khi payment còn `PENDING`.

Còn nên làm tiếp:

- [x] Bổ sung màn hình admin quản lý order/COD đầy đủ.
- [x] Bổ sung trang lịch sử đơn hàng cho user.
- [ ] Hoàn thiện lại flow VNPay tạo payment/order sau khi thanh toán thành công.
- [ ] Viết test tự động cho service thanh toán và đơn hàng.

## 2. Hiện trạng liên quan

Backend hiện đã có các phần có thể tận dụng:

| Thành phần | Hiện trạng |
|:--|:--|
| Entity thanh toán | `PaymentDetail` |
| Request thanh toán | `PaymentRequest` |
| Response thanh toán | `PaymentResponse` |
| Service thanh toán | `PaymentServiceImpl` |
| API thanh toán | `PaymentController` |
| Trạng thái thanh toán | `PENDING`, `COMPLETED`, `FAILED`, `CANCELED` |
| Entity đơn hàng | `OrderDetail`, `OrderItem` |
| Service đơn hàng | `OrderDetailServiceImpl` |
| Trạng thái đơn hàng | `Processing`, `Shipped`, `Delivered` |
| VNPay | Đã có flow riêng qua `VNPayController` |

## 3. Quy tắc nghiệp vụ COD

| Tình huống | Quy tắc |
|:--|:--|
| User chọn COD khi checkout | Tạo `PaymentDetail` với `provider = COD`, `status = PENDING` |
| Tạo đơn hàng COD | Tạo `OrderDetail`, trừ tồn kho biến thể sản phẩm |
| Đơn COD đang chờ xử lý | Payment vẫn là `PENDING` |
| Đơn COD bị hủy | Payment chuyển `CANCELED`, hoàn lại tồn kho |
| Đơn COD giao thành công | Order chuyển `Delivered` |
| Khách đã trả tiền khi nhận hàng | Payment chuyển `COMPLETED` |
| Payment đã `COMPLETED` | Không cho hủy đơn theo flow thông thường |

## 4. Luồng COD mong muốn

```text
User chọn sản phẩm
        |
        v
Thêm vào giỏ hàng
        |
        v
Checkout
        |
        v
Chọn phương thức: COD
        |
        v
POST /api/v1/payments
provider = COD, status = PENDING
        |
        v
POST /api/v1/orders
paymentId + orderItems
        |
        v
Order status = Processing
Payment status = PENDING
        |
        v
Admin xử lý giao hàng
        |
        v
Order status = Shipped
        |
        v
Order status = Delivered
        |
        v
Payment status = COMPLETED
```

## 5. Checklist triển khai Backend

### 5.1. Bổ sung enum/provider thanh toán

- [x] Tạo enum mới `PaymentProvider`.

Gợi ý:

```java
public enum PaymentProvider {
    COD,
    VNPAY
}
```

- [ ] Cân nhắc đổi `PaymentDetail.provider` từ `String` sang enum.
- [ ] Nếu chưa muốn đổi database mapping, giữ `String provider` nhưng validate chỉ nhận `COD`, `VNPAY`.

Khuyến nghị ít rủi ro:

- Giai đoạn đầu giữ `provider` là `String`.
- Thêm class/enum để validate logic.
- Sau khi ổn định mới refactor database mapping nếu cần.

### 5.2. Cập nhật validation cho `PaymentRequest`

File liên quan:

```text
CreaTShop-server/creatshop/src/main/java/com/example/creatshop/domain/dto/request/PaymentRequest.java
```

Công việc:

- [x] Validate `provider` chỉ nhận giá trị hợp lệ.
- [ ] Với COD, frontend gửi:

```json
{
  "amount": 1700000,
  "provider": "COD",
  "status": "PENDING"
}
```

- [ ] Với VNPay, frontend hoặc backend có thể dùng:

```json
{
  "amount": 1700000,
  "provider": "VNPAY",
  "status": "PENDING"
}
```

### 5.3. Cập nhật `PaymentServiceImpl.createPayment`

File liên quan:

```text
CreaTShop-server/creatshop/src/main/java/com/example/creatshop/service/impl/PaymentServiceImpl.java
```

Công việc:

- [x] Nếu `provider = COD`, tạo payment với `status = PENDING`.
- [x] Không gọi VNPay trong flow COD.
- [x] Không tin tưởng `status` từ client khi tạo mới; backend tự set `PENDING`.
- [x] Trả về `PaymentResponse` có `id` để frontend dùng tạo order.

Kết quả mong muốn:

```json
{
  "meta": {
    "status": "SUCCESS"
  },
  "data": {
    "id": 1,
    "amount": 1700000,
    "provider": "COD",
    "status": "PENDING",
    "createdAt": "2026-06-01T10:00:00",
    "updatedAt": "2026-06-01T10:00:00"
  }
}
```

### 5.4. Cập nhật `OrderDetailServiceImpl.createOrder`

File liên quan:

```text
CreaTShop-server/creatshop/src/main/java/com/example/creatshop/service/impl/OrderDetailServiceImpl.java
```

Công việc:

- [x] Cho phép tạo order với payment COD.
- [x] Kiểm tra payment tồn tại.
- [x] Kiểm tra payment chưa gắn với order khác.
- [x] Kiểm tra payment đang `PENDING`.
- [x] Kiểm tra tồn kho từng variant.
- [x] Tính tổng tiền từ dữ liệu sản phẩm phía backend.
- [x] Lưu địa chỉ giao hàng vào `OrderDetail`.
- [x] Trừ tồn kho khi tạo order thành công.
- [x] Set order status ban đầu là `Processing`.
- [x] Gắn `PaymentDetail` với `OrderDetail`.

Rule quan trọng:

```text
1 payment chỉ nên gắn với 1 order.
```

### 5.5. Cập nhật hủy đơn COD

File liên quan:

```text
CreaTShop-server/creatshop/src/main/java/com/example/creatshop/service/impl/OrderDetailServiceImpl.java
```

Công việc:

- [x] Chỉ cho hủy nếu payment status là `PENDING`.
- [x] Nếu hủy, set payment status thành `CANCELED`.
- [x] Hoàn lại số lượng tồn kho cho từng variant trong order.
- [x] Không cho hủy nếu payment đã `COMPLETED`.

### 5.6. Xác nhận khách đã thanh toán COD

Có 2 hướng xử lý.

#### Hướng A: Tự động hoàn tất payment khi order Delivered

Khi admin chuyển order sang `Delivered`, nếu payment provider là `COD`, backend tự set:

```text
PaymentStatus.COMPLETED
```

Ưu điểm:

- Ít API hơn.
- Flow đơn giản.

Nhược điểm:

- Không tách riêng được trường hợp đã giao nhưng chưa thu tiền.

#### Hướng B: Thêm API xác nhận COD riêng

Thêm API:

```text
PUT /api/v1/payments/{paymentId}/confirm-cod
```

Quyền:

```text
ROLE_ADMIN
```

Công việc:

- [x] Kiểm tra payment tồn tại.
- [x] Kiểm tra `provider = COD`.
- [x] Kiểm tra status hiện tại là `PENDING`.
- [x] Chỉ cho xác nhận khi order đã `Delivered`.
- [x] Set status thành `COMPLETED`.
- [x] Trả về `PaymentResponse`.

Khuyến nghị:

```text
Chọn Hướng B nếu muốn nghiệp vụ rõ ràng và dễ kiểm soát trong admin.
```

## 6. API cần thêm hoặc cập nhật

### 6.1. Tạo payment COD

Endpoint hiện có:

```text
POST /api/v1/payments
```

Request:

```json
{
  "amount": 1700000,
  "provider": "COD",
  "status": "PENDING"
}
```

Response:

```json
{
  "meta": {
    "status": "SUCCESS"
  },
  "data": {
    "id": 1,
    "amount": 1700000,
    "provider": "COD",
    "status": "PENDING"
  }
}
```

### 6.2. Tạo order dùng payment COD

Endpoint hiện có:

```text
POST /api/v1/orders
```

Request:

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

Response:

```json
{
  "meta": {
    "status": "SUCCESS"
  },
  "data": {
    "id": 1,
    "status": "Processing",
    "payment": {
      "id": 1,
      "provider": "COD",
      "status": "PENDING"
    },
    "orderItems": []
  }
}
```

### 6.3. Xác nhận COD đã thanh toán

Endpoint đề xuất:

```text
PUT /api/v1/payments/{paymentId}/confirm-cod
```

Response:

```json
{
  "meta": {
    "status": "SUCCESS"
  },
  "data": {
    "id": 1,
    "amount": 1700000,
    "provider": "COD",
    "status": "COMPLETED"
  }
}
```

## 7. Checklist triển khai Frontend

### 7.1. Checkout page

- [x] Thêm lựa chọn phương thức thanh toán:

```text
Thanh toán khi nhận hàng
```

- [x] Khi user chọn COD, không redirect sang VNPay.
- [x] Khi submit checkout:
  - [x] Tính tổng tiền.
  - [x] Chọn hoặc thêm địa chỉ giao hàng.
  - [x] Gọi `POST /payments` với `provider = COD`.
  - [x] Lấy `paymentId` từ response.
  - [x] Gọi `POST /orders` với `paymentId`, `addressId` và `orderItems`.
  - [x] Hiển thị thông báo đặt hàng thành công và chuyển sang `/my-order`.

### 7.2. Hiển thị trạng thái cho user

- [x] Nếu `payment.provider = COD` và `payment.status = PENDING`, hiển thị:

```text
Thanh toán khi nhận hàng - Chờ thanh toán
```

- [x] Nếu `payment.status = COMPLETED`, hiển thị:

```text
Đã thanh toán
```

- [x] Nếu `payment.status = CANCELED`, hiển thị:

```text
Đã hủy
```

### 7.3. Admin order management

- [x] Hiển thị phương thức thanh toán: `COD` hoặc `VNPAY`.
- [x] Hiển thị trạng thái thanh toán.
- [x] Hiển thị địa chỉ giao hàng của đơn.
- [x] Thêm nút xác nhận thanh toán COD nếu chọn Hướng B:

```text
Xác nhận đã thu tiền
```

- [x] Nút này chỉ bật khi:

```text
provider = COD
status = PENDING
order status = Delivered
```

## 8. Checklist test

### 8.1. Backend test thủ công bằng Swagger/Postman

- [ ] Login lấy JWT.
- [ ] Tạo payment COD.
- [ ] Tạo order bằng payment COD.
- [ ] Kiểm tra tồn kho variant bị trừ.
- [ ] Hủy order COD khi payment đang `PENDING`.
- [ ] Kiểm tra tồn kho variant được hoàn lại.
- [ ] Xác nhận COD đã thanh toán.
- [ ] Không cho hủy order khi payment đã `COMPLETED`.
- [ ] Không cho tạo order nếu payment không tồn tại.
- [ ] Không cho tạo order nếu payment đã gắn với order khác.

### 8.2. Frontend test

- [ ] User chọn COD ở checkout.
- [ ] User chọn hoặc thêm địa chỉ giao hàng ở checkout.
- [ ] User đặt hàng thành công không bị chuyển sang VNPay.
- [ ] Sau khi đặt COD thành công, hệ thống chuyển sang trang lịch sử đơn.
- [ ] Trang lịch sử đơn hiển thị đúng trạng thái COD.
- [ ] Trang lịch sử đơn hiển thị đúng địa chỉ giao hàng.
- [ ] Admin thấy đơn COD.
- [ ] Admin thấy địa chỉ giao hàng của đơn COD.
- [ ] Admin chuyển trạng thái đơn.
- [ ] Admin xác nhận đã thu tiền nếu có API riêng.

## 9. Thứ tự triển khai khuyến nghị

1. Backend: thêm validate `provider = COD/VNPAY`.
2. Backend: cập nhật `createPayment` cho COD.
3. Backend: siết rule trong `createOrder`.
4. Backend: cập nhật hủy đơn và hoàn tồn kho.
5. Backend: thêm API xác nhận COD nếu chọn Hướng B.
6. Frontend: thêm option COD ở checkout.
7. Frontend: gọi flow tạo payment COD rồi tạo order.
8. Admin: hiển thị provider/status payment.
9. Admin: thêm nút xác nhận đã thu tiền nếu cần.
10. Test end-to-end.
11. Cập nhật tài liệu API/README.

## 10. Tiêu chí hoàn thành

Chức năng COD được xem là hoàn thành khi:

- [x] User có thể chọn thanh toán khi nhận hàng.
- [x] User đặt đơn COD thành công.
- [x] Payment COD được tạo với trạng thái `PENDING`.
- [x] Order COD được tạo với trạng thái `Processing`.
- [x] Order COD có địa chỉ giao hàng.
- [x] Tồn kho bị trừ khi tạo order.
- [x] Tồn kho được hoàn lại khi hủy order COD.
- [x] Payment COD chuyển được sang `COMPLETED` khi khách đã trả tiền.
- [x] Frontend hiển thị đúng phương thức và trạng thái thanh toán.
- [x] Admin quản lý được đơn COD.
- [x] Flow VNPay có địa chỉ giao hàng và xử lý kết quả quay về.

## 11. Kết quả kiểm tra hiện tại

- Frontend: `npm run build` đã chạy thành công.
- Backend: đã bổ sung `.mvn/wrapper/maven-wrapper.properties`.
- Backend: `.\mvnw.cmd -q -DskipTests compile` đã chạy thành công.
- Backend: `.\mvnw.cmd -q test` đã chạy thành công.

## 12. Ghi chú kỹ thuật

- Không nên phá flow VNPay hiện tại. COD nên được thêm như một provider mới.
- Không nên tin `status` từ frontend khi tạo payment mới. Backend nên tự set `PENDING`.
- Nên có rule chặn 1 payment gắn nhiều order.
- Nên cân nhắc đổi `PaymentDetail.provider` sang enum ở giai đoạn refactor sau.
- Nếu dùng Vite frontend, sau khi sửa `.env` hoặc logic checkout cần build lại frontend khi chạy Docker.
