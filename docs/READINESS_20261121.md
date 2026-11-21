# Chốt bàn giao ngày 21/11/2026

## Phạm vi

Catalog gốc: 149 sản phẩm, project `creatshop-docker-test`, cổng 15173/19080.
Không thay bằng demo. Demo tổng hợp cổng 15174 là môi trường riêng để cài mới.
Đã có web/admin/API/DB, phân quyền, COD, tìm kiếm hybrid embedding và gợi ý
sản phẩm theo đặc trưng/hành vi. PR #17 đã merge; develop 73909f9 có CI đạt.

## Cài đặt an toàn

- Máy mới: theo SYNTHETIC_DEMO.md; seed tổng hợp và named volume riêng.
- Máy có catalog: dùng đúng env/project đã tạo, chỉ start container hiện có;
  không sinh env mới hoặc import seed để thay cửa hàng.
- Không dùng Compose legacy để cài mới: volume khai báo chưa được mount.
  Không tự đổi mount database có dữ liệu mà chưa backup và chuyển dữ liệu.
- Giữ volume khi dừng; không đưa snapshot/env private vào ZIP.
- VNPay/Cloudinary bật riêng bằng overlay, theo EXTERNAL_ACCEPTANCE.md.

## Còn mở trước nghiệm thu

| Mục | Điều kiện đóng |
| --- | --- |
| VNPay sandbox | Cần merchant/secret được cấp, callback test và bằng chứng giao dịch/IPN thật |
| Cloudinary | Cần tài khoản test hợp lệ và bằng chứng upload/đọc lại qua API |
| Đánh giá AI | Ghi đúng AI-assisted/synthetic, baseline và giới hạn; thống nhất phương pháp với giảng viên |
| Báo cáo | Cần mẫu trường, tài liệu tham khảo thực sự sử dụng và duyệt học thuật; không tạo khảo sát/chữ ký giả |

Container catalog chưa có credentials ngoài khi kiểm tra. check_providers.py
chỉ báo có/thiếu cấu hình, không xác nhận kết nối. Không coi dữ liệu mô phỏng
là người tham gia thật. Hosting công khai/tiền thật không mặc định bắt buộc.

## Bằng chứng và gói

Exporter export_handover.py tạo ZIP source/tests/docs, schema-only, OpenAPI,
demo seed/ảnh local và manifest SHA256. Không có secrets, dữ liệu khách hàng,
node_modules hoặc model weights. Gói và log private ở backups/handover-20261121-*.

Quy trình kiểm tra: xác minh CRC/manifest, giải nén vào thư mục mới, tạo env
cho DB demo trống, build/start và chạy browser COD/cancel cùng AI smoke tests.
Log ghi từng kết quả; không coi đây là nghiệm thu dịch vụ ngoài hoặc chất
lượng người dùng thật. Checksum không phải chữ ký số; không tự công khai gói.

Nội dung báo cáo: THESIS_TECHNICAL_REPORT.md. Kết quả AI và giới hạn:
AI_CURRENT_CATALOG_REVIEW_20261120.md, SYNTHETIC_RECOMMENDATION_RESULTS.md.

## Kết quả kiểm tra gói ngày 21/11

- ZIP candidate: CRC và toàn bộ manifest SHA256 đạt, giải nén vào thư mục mới.
- Từ bản giải nén: Docker build frontend/backend đạt, bootstrap volume mới;
  model offline dùng cache đã có. Không tuyên bố cài được khi thiếu cache.
- Schema-only xuất từ backend hiện có import vào DB trống riêng: đủ 16 bảng.
- Backend từ source giải nén: configuration, 32 regression groups, 119
  discovery assertions, 50 customer HTTP, 67 chat và 14 social-auth checks đạt.
  Discovery dùng fake encoder trong unit/HTTP checks; smoke Docker dùng model thật.
- Python: 28 tests đạt cả source và bản giải nén; frontend 11 utility files đạt.
- Browser thật trên bản giải nén: 10 nhóm đạt, gồm hybrid search, đăng ký/login,
  sản phẩm/tương tự/cá nhân hóa, COD, hủy hoàn kho, mobile và session isolation.
  Toàn bộ tài khoản/đơn ở đây là fixture, không dùng làm dữ liệu đánh giá AI thật.
- Catalog gốc: 149/149 embeddings và 9 search smoke cases đạt; fingerprint
  products/product_info/categories không đổi, trang đầu 12 sản phẩm còn hàng.
- Overlay nhà cung cấp: từ chối thiếu biến, config hợp lệ với fixture; không
  deploy credentials fixture và không gửi request nhà cung cấp để giả nghiệm thu.

Bằng chứng private của lần này: `backups/handover-20261121-113842/`.
Package cuối được xuất lại sau cập nhật tài liệu; kiểm tra checksum/manifest
lại. Build/E2E áp dụng mã ứng dụng trong candidate, không phải test độc lập
trên máy vật lý khác. Gói không bao gồm model weights hoặc private evidence.
