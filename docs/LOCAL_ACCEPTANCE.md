# Hướng dẫn nghiệm thu local - ngày 13/11/2026

## Đã hoàn thành

- Sao lưu `localhost:3306/creatshopdb3` vào `backups/creatshopdb3-20261113-144536-20a31c09.sql` (Git bỏ qua tệp này).
- Khôi phục bản sao lưu trên MySQL riêng, kiểm tra bản cập nhật enum giữ nguyên số lượng thanh toán theo từng trạng thái và bổ sung `REFUND_REQUIRED` (cần hoàn tiền).
- Áp dụng bản cập nhật đã kiểm chứng vào `creatshopdb3` local. Số lượng thanh toán theo từng trạng thái không đổi; không tạo đơn, hủy đơn hay thanh toán trên cơ sở dữ liệu ứng dụng trong quá trình kiểm tra.
- Chạy 15 nhóm kiểm thử hồi quy ba lần trên MySQL 8.0.44 với mức cô lập REPEATABLE-READ, thêm một lần sau khi khôi phục bản sao lưu: tất cả đều đạt.
- Sửa lỗi tạo trùng đơn khi xử lý đồng thời chỉ xuất hiện trên MySQL: khóa bản ghi thanh toán trước khi đọc người dùng/địa chỉ để tránh thiết lập ảnh chụp dữ liệu nhất quán quá sớm. Chỉ kiểm thử bằng H2 không phát hiện được lỗi này.
- Đã dừng các phiên bản MySQL dùng riêng cho kiểm thử; không dừng hoặc cấu hình lại dịch vụ MySQL có sẵn.

Nhật ký chi tiết: `CreaTShop-server/creatshop/target/mysql-integration.log` và `CreaTShop-server/creatshop/target/mysql-backup-restore.log`. Bộ kiểm thử chủ động chạy tình huống tài khoản bị khóa và thanh toán cần hoàn tiền; thông báo ERROR dự kiến trong các tình huống này không đồng nghĩa với kiểm thử thất bại.

## Còn lại: thanh toán thực tế trên sandbox

Cấu hình VNPay local trỏ tới cổng sandbox, với đường dẫn trình duyệt quay về là `http://localhost:5173/payment/vnpay-return`. Mã merchant và khóa ký đã có tại local nhưng chưa được xác thực với VNPay. Không gửi khóa bí mật vào cuộc trò chuyện hoặc đưa vào commit.

Chạy backend trong một cửa sổ PowerShell:

```powershell
cd D:\creatshop\TTCSN-2025\CreaTShop-server\creatshop
./mvnw.cmd spring-boot:run
```

Chạy frontend trong cửa sổ khác:

```powershell
cd D:\creatshop\TTCSN-2025\CreaTShop-Client
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mở `http://localhost:5173`, dùng tài khoản khách hàng riêng cho kiểm thử. Thao tác trên giao diện sẽ tạo đơn và thay đổi tồn kho; hãy dùng sản phẩm thử nghiệm và ghi lại số lượng ban đầu. Khởi động backend cũng kích hoạt tác vụ hết hạn thanh toán VNPay đang chờ, bao gồm các đơn tồn đọng từ trước.

1. Tạo đơn COD (thanh toán khi nhận hàng), kiểm tra tồn kho giảm đúng một lần. Hủy đơn, kiểm tra tồn kho hoàn lại đúng một lần. Tạo đơn COD khác, dùng tài khoản quản trị chuyển sang Delivered (đã giao), rồi xác nhận thanh toán; trạng thái thanh toán phải thành COMPLETED.
2. Tạo đơn VNPay. Chỉ dùng thẻ/OTP thử nghiệm do VNPay cung cấp, không dùng thẻ thật. Sau khi thành công, kiểm tra trạng thái thanh toán ở backend là COMPLETED và tồn kho chỉ bị trừ một lần. Tải lại trang kết quả, kiểm tra không bị trừ thêm.
3. Hủy trên màn hình thanh toán sandbox, kiểm tra đơn được hủy và tồn kho hoàn lại một lần. Thông báo thanh toán thành công đến sau khi đơn đã hủy phải đưa thanh toán về REFUND_REQUIRED, không cho phép giao hàng; cần đối soát/hoàn tiền thủ công trong VNPay.
4. Bỏ dở một phiên thanh toán VNPay mới, không quay về ứng dụng. Sau 20 phút và lần chạy tác vụ định kỳ kế tiếp (thông thường trong vòng 60 giây), kiểm tra đơn bị hủy và tồn kho được hoàn lại. Thanh toán COD và thanh toán đã hoàn tất phải giữ nguyên.
5. Trong phiên trình duyệt khác, dùng tài khoản quản trị khóa khách hàng đang đăng nhập. Yêu cầu API cần xác thực tiếp theo của khách hàng phải bị từ chối, kể cả khi dùng token cũ.

Kiểm thử thông báo thanh toán có chữ ký hiện chạy tại local, không kết nối VNPay. Để kiểm chứng IPN thực tế giữa các máy chủ, cần cung cấp `/api/v1/vnpay/ipn` qua địa chỉ HTTPS của backend mà VNPay truy cập được và đăng ký trong cấu hình merchant. Trình duyệt quay về localhost thành công không chứng minh IPN bên ngoài hoạt động. Không công khai cơ sở dữ liệu phát triển hoặc chia sẻ khóa ký khi thiết lập kết nối.

Ghi lại mã đơn, kết quả và ảnh chụp cho từng tình huống. Nếu có lỗi, chỉ chia sẻ mã đơn và thông báo lỗi đã loại bỏ thông tin nhạy cảm; không gửi mật khẩu, token hoặc thông tin thẻ.

## Sau khi nghiệm thu đạt

Rà soát và commit thay đổi trên `bugfix/payment-stock-security`, đẩy `develop` và nhánh sửa lỗi lên remote, rồi mở PR vào `develop`. Yêu cầu cả hai job CI thành công trước khi gộp. Cấu hình bảo vệ nhánh GitHub và chạy CI trên remote vẫn cần người quản lý kho mã thực hiện; chưa có thay đổi nào được tự động commit hoặc push.
