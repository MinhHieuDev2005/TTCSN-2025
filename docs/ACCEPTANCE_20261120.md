# Nghiệm thu Docker ngày 20/11/2026

## Phạm vi

Khởi động lại bốn container hiện có của project `creatshop-docker-test` bằng
`docker compose start --wait --wait-timeout 300` với compose thử nghiệm riêng.
Không build lại image, migrate database chính, thay cấu hình frontend chính,
xóa volume hoặc import đè SQL. Đây là nghiệm thu các image đã build trước đó,
không phải xác nhận một clean build mới từ toàn bộ working tree.

Frontend thử nghiệm: `http://127.0.0.1:15173`; backend: `127.0.0.1:19080`.
MySQL/model không publish cổng host. Kiểm tra script xác nhận volume MySQL riêng
`creatshop-docker-test_test-mysql-data`, binding loopback và đúng project.
Sau chạy, bốn container vẫn hoạt động; MySQL và embeddings healthy.

## Kết quả

| Nhóm | Kết quả |
| --- | --- |
| Embedding/index thật | 149/149, pending 0, không có lỗi index |
| Search API | 9/9: 3 truy vấn × keyword/semantic/hybrid, đúng mode, không fallback |
| Phân quyền API | Anonymous không truy cập được admin AI và gợi ý cá nhân |
| Sản phẩm tương tự | Có kết quả, không chứa sản phẩm nguồn |
| Browser E2E thật | 10/10 nhóm đạt, không mock API |
| Python unittest | 20 tests đạt |
| Node unit tests | 10 file tests đạt |
| Whitespace diff | `git diff --check` đạt; còn cảnh báo LF/CRLF ở messages_vn.properties |

Các nhóm browser đã chạy:
1. Deep link SPA và tìm kiếm hybrid qua proxy cùng origin.
2. Đăng ký/đăng nhập giao diện bằng tài khoản tổng hợp riêng.
3. Không cho mua sản phẩm thiếu biến thể; lọc còn hàng trả biến thể mua được.
4. Xem sản phẩm, xem tương tự, chọn biến thể và thêm giỏ thật.
5. Hiển thị gợi ý cá nhân sau tương tác của tài khoản thử.
6. Đặt một đơn COD, kiểm tra tạo đơn, xóa giỏ và giảm đúng tồn kho.
7. Hủy đơn qua giao diện, kiểm tra trạng thái hủy và hoàn tồn kho ban đầu.
8. Mobile 390px không tràn ngang, tải lại deep link hoạt động.
9. Chat SSE kết nối lại thành công sau chuỗi chuyển trang/tải lại nhanh.
10. Xóa phiên trả giỏ về đăng nhập; anonymous gọi cart API bị từ chối.

Browser ghi nhận 0 lỗi JavaScript, 0 API lỗi ngoài dự kiến và 0 truy cập sang
localhost khác. Có **4 phản hồi 429 của chat SSE** do giới hạn kết nối khi
điều hướng liên tục; test theo dõi riêng và chờ xác nhận kết nối SSE 200 phục
hồi. Không báo “không có HTTP lỗi” hoặc bỏ giới hạn bảo vệ để làm test xanh.

## Bằng chứng và tái chạy

Bằng chứng private tại:
`backups/ai-acceptance-20261116-111819/acceptance-20261120/`

- `api-verification.json`: thời điểm UTC, index, mode, ID kết quả, latency từng
  request và image digest. Đây không phải benchmark tải hay chứng nhận SLA.
- `frontend-00ade1b98e2b.json`: 10 nhóm, số lỗi và các giới hạn.
- `frontend-mobile.png`: ảnh giao diện mobile thực tế, đã xem kiểm tra bố cục.

Hướng dẫn khởi động/dừng và lệnh kiểm tra nằm trong `docs/DEMO_HANDOVER.md`.
Khi tái chạy, chọn thư mục/file bằng chứng mới để không ghi đè. Browser cần
Chrome và Playwright; lần này dùng module ESM đã cài trong npm cache trên máy.
Không đưa thư mục backups cha vào gói công khai vì có snapshot và bí mật.

## Chưa được chứng minh

Browser chặn 142 request tài nguyên ngoài; ảnh mobile hiển thị placeholder.
Không dùng lần chạy này để khẳng định CDN ảnh hoạt động hoặc ảnh đúng sản phẩm.
Chỉ COD được dùng, không thực hiện thanh toán online, giao hàng, OAuth hoặc
upload Cloudinary thật. Tài khoản/địa chỉ/đơn COD đã hủy và tương tác tổng hợp
được giữ trong bản sao Docker, phải loại khỏi dữ liệu đánh giá người dùng thật.

Gợi ý cá nhân được xác nhận về luồng hiển thị, không chứng minh độ phù hợp.
Kết quả relevance AI-assisted và 10 nhãn chưa xác định vẫn được báo cáo riêng
trong `docs/AI_ASSISTED_RESULTS.md`; E2E không xác nhận các nhãn đó.
Không chạy lại full frontend lint trong đợt này; lần trước còn 16 lỗi và
2 cảnh báo ngoài phạm vi AI, chưa được sửa hoặc coi là đạt.

## Bước còn lại trước bàn giao

Kiểm duyệt ảnh/nội dung catalog, kiểm thử tích hợp thanh toán sandbox/IPN và
lưu ảnh, chuẩn bị dữ liệu bàn giao đã ẩn danh, clean build/pin dependency và
kế hoạch triển khai/backup ngoài máy. Không dùng compose thử nghiệm này như
phê duyệt production hay thay thế đánh giá bảo mật và tải đầy đủ.
