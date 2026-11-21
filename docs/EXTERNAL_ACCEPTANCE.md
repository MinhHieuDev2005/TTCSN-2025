# Nghiệm thu VNPay và Cloudinary

Local provider credentials exist in the ignored backend configuration. Blank Docker
environment variables do not mean the project has no credentials. See
[the live check dated 2026-11-21](PROVIDER_CHECK_20261121.md) for verified results
and remaining provider-side blockers. Do not use real-money payments or the original catalog for acceptance tests.

## Cấu hình

Bổ sung vào file env private của demo đang kiểm tra:

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `VNP_TMN_CODE`, `VNP_HASH_SECRET` của merchant sandbox được cấp.
- `VNP_RETURN_URL`: frontend test với đường dẫn `/payment/vnpay-return`.

Không commit/gửi secret qua ảnh chụp/log. Dùng đúng env của volume hiện có,
không sinh lại password/JWT. Ví dụ với demo mới theo SYNTHETIC_DEMO:

```powershell
docker compose --env-file backups/synthetic-demo.env -p creatshop-synthetic-demo -f CreaTShop-server/creatshop/docker-compose.demo.yml -f CreaTShop-server/creatshop/docker-compose.providers.yml config --quiet
docker compose --env-file backups/synthetic-demo.env -p creatshop-synthetic-demo -f CreaTShop-server/creatshop/docker-compose.demo.yml -f CreaTShop-server/creatshop/docker-compose.providers.yml up -d --no-deps springboot
py -3.11 CreaTShop-ai/check_providers.py creatshop-synthetic-demo-springboot-1
```

Không render `compose config` thiếu `--quiet`: output chứa secret. Overlay
chỉ đổi môi trường backend, không đổi volume/seed. Checker chỉ báo có/thiếu
biến, không gửi giao dịch và không xác nhận credentials hợp lệ.

## VNPay: các ca cần bằng chứng thật

1. Chuẩn bị frontend/backend test và callback mà nhà cung cấp truy cập được.
   IPN trỏ đến `/api/v1/vnpay/ipn`, không phải return UI. Không tự công khai
   DB/customer snapshot qua tunnel. Chỉ dùng phương tiện thanh toán sandbox.
2. Tạo đơn test, ghi số tiền server, mã đơn/thanh toán và tồn kho trước/sau.
   Hoàn tất giao dịch, kiểm tra IPN thật và return; đối chiếu DB/UI.
3. Kiểm tra tải lại return/callback lặp không giữ/hoàn kho lần hai; hủy/thất
   bại/chữ ký sai không được thành công. Tiền đến sau đơn hủy cần đối soát,
   không tự khôi phục đơn giao hàng.
4. Lưu thời điểm, mã giao dịch test, trạng thái và log che bí mật từng ca.
   Regression cục bộ không thay bằng chứng kết nối merchant thực tế.

## Cloudinary: các ca cần bằng chứng thật

1. Dùng admin DB test tạo sản phẩm và upload ảnh fixture qua giao diện/API
   quản trị. Không thay ảnh hoặc sản phẩm catalog gốc.
2. Kiểm tra response, bản ghi DB, URL HTTPS đọc được và nội dung đúng fixture;
   kiểm tra cập nhật ảnh/ảnh biến thể nếu sử dụng.
3. Thử file không hợp lệ/quá giới hạn và người không có quyền; kiểm tra lỗi
   và dữ liệu không bị sửa ngoài ý muốn.
4. Lưu public ID, kết quả đọc lại và kế hoạch dọn tài nguyên test. Không xóa
   ảnh không do bài test tạo. URL ảnh cũ đọc được không chứng minh upload đạt.

Chỉ chuyển “chưa nghiệm thu” sang “đạt” khi có bằng chứng thực tế tương ứng.
