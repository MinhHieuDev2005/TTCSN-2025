# Đối chiếu phiếu giao đề tài — 20/11/2026

## Kết luận

Chưa đủ bằng chứng để xác nhận hoàn thành toàn bộ phiếu giao đề tài.
Đã có bản web chạy được với nghiệp vụ chính và hai mô-đun AI; có thể demo
tại http://127.0.0.1:15173 với danh mục 149 sản phẩm hiện có.
Không gán tỷ lệ hoàn thành chủ quan hoặc coi kiểm thử mô phỏng là tích hợp thật.

## Các mục cần đóng trước nghiệm thu

1. VNPay và Cloudinary: bản Docker 15173 hiện không có cấu hình merchant,
   hash secret hoặc cloud/API key/secret. Đây là thông tin kiểm tra trực tiếp
   từ container, chỉ xuất trạng thái có/không, không xuất bí mật. COD đã đạt;
   online payment và upload ảnh thật chưa được nghiệm thu. Cần cấu hình dịch
   vụ được phép dùng, chạy giao dịch sandbox/IPN và upload/download thực tế.
2. Báo cáo tốt nghiệp: có bản thảo kỹ thuật, chưa phải bản nộp đã hoàn thiện
   theo mẫu trường. Nội dung khảo sát hiện là phân tích yêu cầu/tài liệu,
   không có khảo sát thực địa được xác nhận. Cần hoàn thiện và duyệt hồ sơ.
3. Đánh giá AI: search có nhãn AI trên danh mục thật, gợi ý có benchmark tổng
   hợp và kiểm thử luồng; chưa có đánh giá độc lập của người dùng thực.
   Phiếu giao đề tài không bắt buộc cụ thể người thật chấm: không tự đặt thêm
   điều kiện này. Tuy nhiên cần giảng viên chấp nhận phương pháp, giới hạn và
   cách diễn giải, hoặc bổ sung đánh giá nếu phương pháp hiện tại chưa đủ.
4. Hướng dẫn triển khai cũ: README còn lệnh Docker Compose cơ sở. File
   `CreaTShop-server/creatshop/docker-compose.yml` khai báo `mysql-data` nhưng
   chưa mount vào `/var/lib/mysql`; chỉ mount thư mục init. Khi recreate có
   nguy cơ không dùng lại dữ liệu cũ nếu không giữ/gắn đúng volume. Đây không
   phải cấu hình của bản 15173 đang dùng named volume riêng. Không chạy lệnh
   cũ để thay bản đang chạy; cần thống nhất hướng dẫn trước khi bàn giao.
5. Gói ZIP r3 được tạo trước các báo cáo/nhãn và kiểm tra mới nhất; không coi
   nó là snapshot đầy đủ của working tree hiện tại. Cần xuất lại gói cuối,
   kiểm tra giải nén/cài đặt và checksum sau khi chốt các thay đổi.

## Đối chiếu mục tiêu

| Mục | Trạng thái | Bằng chứng / phần còn lại |
| --- | --- | --- |
| 1. Khảo sát, phân tích, thiết kế | Có tài liệu, chưa chốt học thuật | Bản thảo có yêu cầu, use case, kiến trúc, ERD; cần hoàn thiện phương pháp khảo sát và báo cáo |
| 2. Nghiệp vụ, auth, quyền, dữ liệu | Đã triển khai và kiểm thử chính | H2/HTTP/E2E đạt; online payment và upload ngoài chưa nghiệm thu, không chứng nhận an toàn tuyệt đối |
| 3. Nghiên cứu và triển khai hai AI | Đã triển khai | E5 đa ngôn ngữ; gợi ý dùng sản phẩm/hành vi; tìm kiếm keyword/semantic/hybrid |
| 4. Kiểm thử và đánh giá | Có kết quả, giới hạn phải công bố | Chức năng, local load/negative, security regressions, search AI-assisted, recommendation synthetic; chưa có kết luận chất lượng thực tế tổng quát |

## Đối chiếu sáu kết quả dự kiến

| Kết quả | Trạng thái | Điều kiện để chốt |
| --- | --- | --- |
| 1. Web, admin, API, DB | Đạt về triển khai local | Các thành phần tồn tại và bản Docker chạy; OpenAPI 50 paths |
| 2. Các nghiệp vụ mua sắm/quản trị | Đạt phần lớn, chưa toàn bộ | Hoàn tất kiểm tra thanh toán online và các thao tác cần upload ngoài |
| 3. Gợi ý cá nhân hóa | Đạt chức năng; đánh giá có giới hạn | E2E có tương tác và hiển thị; benchmark synthetic không thay kết quả người thật |
| 4. Tìm kiếm ngữ nghĩa | Đạt chức năng; chất lượng chưa thể kết luận rộng | Model thật, 149/149 embeddings, 9 smoke queries; 8 development queries không chứng minh mọi nhu cầu |
| 5. Auth, quyền, ảnh, online payment, đóng gói/triển khai | Chưa đầy đủ | Docker local đạt; upload và online payment ngoài còn thiếu nghiệm thu |
| 6. Tests, đánh giá, tài liệu, báo cáo | Có phần lớn thành phần, chưa chốt | Chốt phương pháp đánh giá, sửa chỉ dẫn cũ, xuất gói cuối và hoàn thiện báo cáo |

Không mặc định đề tài bắt buộc tên miền public hoặc thanh toán tiền thật.
Docker local và sandbox có thể đủ tùy tiêu chí nghiệm thu; public hosting,
TLS và vận hành production là phạm vi riêng nếu được yêu cầu.

## Kiểm tra chạy lại lần này

- Backend: chạy source-mode 6 chương trình check trên main classes/dependency
  classpath đã có, không clean/build lại backend đang chạy. Configuration đạt;
  32 regression groups; 107 discovery assertions (fake encoder); 50 customer
  HTTP assertions; 67 chat checks; 14 social-auth checks (mock providers).
  Các bài này dùng H2 riêng, không đụng database chính. Chúng không thay thế
  một clean backend build mới; Docker clean build trước đó có báo cáo riêng.
- Docker API bản gốc: 149/149 indexed, pending 0, lastError null; 9/9 truy vấn
  đúng requested mode, không fallback; anonymous bị từ chối ở admin/personal;
  similar không chứa sản phẩm nguồn. Không restart container hay migrate DB.
- Browser bản 15173: 10/10 nhóm đạt, 0 JS errors, 0 unexpected API failures;
  6 phản hồi chat SSE 429 rồi kết nối 200 phục hồi. Đã đặt COD bằng tài khoản
  tổng hợp và hủy để hoàn tồn kho. Test account/order/interactions được giữ
  trong DB nghiệm thu, không dùng làm hành vi người thật.
- Browser chặn 155 tài nguyên ngoài: không chứng minh ảnh CDN đang hoạt động.
- Python: 27 tests đạt. Node: 10 test files đạt.
- Frontend lint: 0 errors, 2 Fast Refresh warnings. Production build đạt;
  JS khoảng 920 kB và ảnh men.jpg khoảng 4.39 MB vẫn là cảnh báo tải trang.
- Kiểm thử tải trước đây: 108 warm local requests, concurrency 1/2/4, 13
  negative checks; không chạy lại lần này và không coi là production SLA.

Bằng chứng private của lần audit:
`backups/ai-acceptance-20261116-111819/final-audit-20261120-194208/`.
Nếu timestamp thư mục khác, lấy đường dẫn chính xác từ
`backups/ai-acceptance-20261116-111819/latest-final-audit.txt`.
Không đưa toàn bộ backups vào gói công khai vì chứa dữ liệu/bí mật.

## Cách diễn giải kết quả AI

Search: 120 cặp, 110 có điểm, 10 chưa xác định; nhãn AI được tái sử dụng khi
mọi trường chấm khớp bản hiện tại. Hybrid P@10 liên quan một phần có biên
0.6875–0.7500, nhưng full-match chỉ 0.3500–0.4125. Không gọi đây là tỷ lệ
khách hài lòng, không bịa người chấm. Xem báo cáo AI_CURRENT_CATALOG_REVIEW.

Recommendation: 48 người dùng mô phỏng trên 48 sản phẩm mô phỏng, scorer
tham chiếu offline với real embeddings; không phải đánh giá chất lượng live
API trên 149 sản phẩm. Xem SYNTHETIC_RECOMMENDATION_RESULTS. Hai phép đo này
không chứng minh hệ thống đã đạt chất lượng người dùng thực.
