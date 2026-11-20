# Tổng kết hoàn thiện ngày 20/11/2026

## Phần đã bổ sung

1. Benchmark gợi ý với dữ liệu tổng hợp có seed và temporal split, real model
   embedding, baseline popularity và Precision/Recall/NDCG@5/@10. Dataset,
   vectors, kết quả từng người dùng và checksum được bàn giao công khai trong
   docs/experiments; không nhập người dùng/đơn giả vào dữ liệu đánh giá thật.
2. Bộ schema/seed/ảnh local cho demo sạch: 12 sản phẩm, 11 biến thể, không
   khách hàng thật hay mật khẩu admin mặc định. Database/volume/project mới
   hoàn toàn tách biệt, không cần snapshot private để bắt đầu.
3. Build frontend và backend trong Docker, khởi tạo volume trống và kiểm tra
   toàn luồng thật. Backend Dockerfile chạy Maven clean install; frontend
   dùng npm ci/Vite. Không xóa/rebuild target của native backend đang chạy.
4. Sửa 16 lỗi lint: import thừa, PropTypes, đăng ký Swiper module đúng vị trí,
   API currentUser không còn gọi hook ngoài React/không log token/không export
   nhầm từ Promise. Hai cảnh báo Fast Refresh còn lại được giữ nguyên, không
   tắt lint rule để che cảnh báo.
5. Bản thảo báo cáo kỹ thuật gồm yêu cầu, use case, kiến trúc, ERD, thuật toán,
   thực nghiệm, giới hạn và nguồn tham khảo. Không tạo khảo sát/phỏng vấn giả.
6. Khi kiểm tra npm ci của gói sạch phát hiện 32 dependency advisories. Đã
   cập nhật lock trong phạm vi tương thích, chuyển Vite 7/React plugin 5 và
   Swiper 12, xóa react-drag-drop-files không được mã nguồn sử dụng cùng chuỗi
   dependency liên quan. Npm audit sau sửa báo 0 vulnerabilities, lưu tóm tắt
   trong `docs/experiments/frontend-audit-20261120.json`. Không dùng --force.
   Đây chỉ là audit dependency npm tại thời điểm chạy, không chứng minh toàn
   bộ hệ thống an toàn hoặc đã audit Maven/Python/supply chain.

## Kết quả xác minh

| Hạng mục | Kết quả đợt này |
| --- | --- |
| Python checks | 25 tests đạt, gồm tái tính benchmark và bảo vệ env không ghi đè |
| Frontend unit | 10 file tests đạt |
| Full frontend lint | Exit 0; 0 errors, 2 Fast Refresh warnings |
| Npm audit sau cập nhật | 0 vulnerabilities trong dependency graph được npm kiểm tra |
| Backend config | Public defaults, secret injection, external config đạt |
| Backend regression | 32 nhóm đạt, gồm tiền/tồn kho/cạnh tranh/callback |
| Discovery H2/HTTP | 107 assertions đạt với encoder giả lập |
| Customer HTTP | 50 assertions đạt, có IPN/test signature/replay |
| Chat HTTP/SSE | 67 checks đạt |
| Social auth | 14 checks đạt với mock provider |
| Demo sạch/MySQL mới | Schema validate, index 12/12, 9 ca search đúng mode/no fallback |
| Browser demo sạch | 10 nhóm E2E đạt, gồm COD/hủy/hoàn kho/mobile/SSE |
| Admin demo | Đăng ký account tổng hợp, cấp quyền trong DB demo riêng, login ROLE_ADMIN và đọc AI status đạt |

Browser demo sạch: 0 JS errors, 0 unexpected API failures, 0 forbidden targets;
4 phản hồi 429 chat SSE do điều hướng nhanh, sau đó xác nhận stream 200 phục
hồi. 18 request tài nguyên ngoài bị chặn; ảnh sản phẩm fixture là SVG local.
Không dùng E2E để chứng minh dịch vụ ảnh ngoài hoặc chất lượng relevance.
Không build/thử trên máy vật lý khác; clean bootstrap trong container mới
trên máy hiện tại không phải chứng nhận tương thích mọi môi trường.
Vite vẫn cảnh báo bundle trên 500 kB và asset men.jpg khoảng 4.39 MB; build
thành công nhưng chưa coi là đã tối ưu tải trang. Không tắt cảnh báo để che
giới hạn. Frontend sau cập nhật dependency đã được rebuild và kiểm tra riêng
trong thư mục bằng chứng post-dependency-update.

Log private ở `backups/ai-acceptance-20261116-111819/completion-20261120/`:
build.log, backend-*.log, synthetic-api.json và frontend-92856b5cbea2.json.
File demo.env/demo-admin.json là bí mật, không được chia sẻ. Demo mới ở
`http://127.0.0.1:15174`, demo catalog sao chép cũ vẫn ở 15173.
Không thay đổi database chính hoặc thông tin cấu hình frontend chính.

## Đối chiếu phiếu giao đề tài

| Kết quả yêu cầu | Bằng chứng và mức đáp ứng |
| --- | --- |
| Web/customer/admin/API/DB | Đã triển khai, bootstrap/schema và kiểm thử chức năng |
| Nghiệp vụ thương mại điện tử | Đã triển khai/kiểm thử chính; COD thật trong môi trường test, VNPay integration ngoài còn chờ |
| Cá nhân hóa | Code + HTTP isolation + benchmark tổng hợp có baseline; chưa chứng minh chất lượng người dùng thật |
| Tìm kiếm ngữ nghĩa | Real model + API/E2E + đánh giá AI-assisted; chưa có nhãn người chấm độc lập |
| Auth/quyền/ảnh/thanh toán/triển khai | Auth/quyền/Docker đã kiểm tra; Cloudinary/VNPay live sandbox và public deployment chưa nghiệm thu |
| Tests/đánh giá/tài liệu/báo cáo | Đã bổ sung source, schema/seed, API, hướng dẫn, hai thực nghiệm và bản thảo báo cáo; còn phê duyệt học thuật/hình thức nộp |

## Phần không thể thay bằng dữ liệu tự tạo

- **VNPay sandbox/IPN:** cần merchant sandbox hợp lệ và secret được cấp cho
  merchant, callback HTTPS mà VNPay truy cập được, giao dịch test và đối soát
  trạng thái/stock. Không thể tự sinh key rồi gọi đó là thanh toán thật đã đạt.
  Regression đã kiểm thử chữ ký/callback/idempotence cục bộ với test secret,
  nhưng không chứng minh đường kết nối tới nhà cung cấp.
- **Cloudinary:** cần cloud/API key/secret riêng được phép dùng, upload ảnh
  fixture rồi kiểm tra HTTPS và quản lý tài nguyên test. Không dùng bí mật
  cấu hình chính hay tự tạo tài khoản trả phí. SVG local chứng minh demo không
  phụ thuộc CDN, không thay thế kiểm thử upload Cloudinary.
- **Đánh giá người thật:** 48 hồ sơ mô phỏng không biến thành 48 người tham
  gia. Nhãn AI-assisted không được đổi thành human-reviewed. Cần thống nhất
  với giảng viên nếu dùng toàn bộ kết quả tự động/tổng hợp.
- **Nộp chính thức/production:** cần duyệt báo cáo, format/chữ ký/tài liệu
  tham khảo theo trường; TLS/domain/secrets/backup ngoài máy nếu triển khai
  public. Không tuyên bố hoàn thành an toàn/bảo mật tuyệt đối.

Không còn thiếu dữ liệu để chạy demo sạch hoặc tái lập benchmark tổng hợp.
Các mục chờ còn lại là quyền truy cập dịch vụ ngoài và xác nhận học thuật,
không được lấp bằng số liệu hoặc credentials giả.
