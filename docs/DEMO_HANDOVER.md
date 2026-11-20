# Demo và bàn giao môi trường AI

## Phạm vi an toàn

Môi trường này là bản sao thử nghiệm Docker, không phải triển khai production.
Chạy lệnh từ thư mục gốc repository. Không dùng compose gốc, không đổi cấu hình
frontend chính và không di chuyển cơ sở dữ liệu chính trong quy trình này.

```powershell
$privateEnv = 'backups/ai-acceptance-20261116-111819/docker-acceptance-20261117/compose.env'
$compose = 'CreaTShop-server/creatshop/docker-compose.test.yml'
docker compose --env-file $privateEnv -f $compose -p creatshop-docker-test up -d --wait --wait-timeout 300
docker compose --env-file $privateEnv -f $compose -p creatshop-docker-test ps
```

Mở `http://127.0.0.1:15173`. Backend riêng dùng cổng `19080`; MySQL và model
không mở cổng host. Bốn dịch vụ cần chạy; MySQL và embeddings cần healthy.
Lần build đầu thêm `--build`: cần Internet tải image/dependency và cache model
đã chuẩn bị. Runtime embeddings dùng cache offline chỉ đọc. Các đường dẫn trong
file env là đường dẫn riêng máy này; không thể sao chép nguyên sang máy khác.

File env, snapshot SQL và thư mục backups chứa dữ liệu khách hàng sao chép,
password hash và bí mật. Không commit, gửi kèm báo cáo hay công khai chúng.
Máy bàn giao khác phải dùng dữ liệu tổng hợp/đã ẩn danh được duyệt, bí mật riêng,
cache model đúng revision và snapshot đã migrate tương thích schema `validate`.
Snapshot init chỉ chạy khi volume trống; thay file SQL không cập nhật volume cũ.

## Danh mục demo đã kiểm tra

Kiểm tra chỉ đọc ngày 17/11/2026: 149 sản phẩm, 55 sản phẩm có giá dương,
ảnh chính và ít nhất một biến thể có màu, size, tồn kho dương; 94 sản phẩm
chưa có biến thể. Không tự tạo biến thể hay suy đoán chất liệu để lấp dữ liệu.

Đã chọn 25 sản phẩm trải theo danh mục hiện có:
`62, 52, 40, 39, 30, 20, 10, 61, 51, 38, 29, 19, 8, 59, 50, 37, 28, 18, 7, 56, 49, 36, 27, 17, 6`.

Danh sách tên, giá, biến thể và tồn kho tại thời điểm kiểm tra nằm trong
`backups/ai-acceptance-20261116-111819/docker-acceptance-20261117/demo-catalog.csv`.
Bằng chứng JSON cùng thư mục: `demo-catalog-audit.json`.
Trong 57 URL ảnh chính/biến thể còn hàng được kiểm tra, 56 trả về nội dung ảnh
có MIME/signature phù hợp, một yêu cầu thất bại. Yêu cầu thất bại không đủ
kết luận URL hỏng. Đây không phải kiểm chứng ảnh đúng sản phẩm hoặc hiển thị
trên mọi trình duyệt; cần xem ảnh trực tiếp trước buổi bảo vệ.
Màu, tên và mô tả hiện có vẫn cần người phụ trách xác nhận; chưa phải catalog
được thẩm định nội dung. Tồn kho và giá có thể đổi sau mỗi lần demo.

## Kịch bản trình bày 10 phút

1. Tự đăng ký tài khoản demo mới trên cổng 15173; không dùng tài khoản khách
   hàng sao chép. Không chiếu mật khẩu, token hoặc dữ liệu người dùng khác.
2. Mở cửa hàng, nhập `giay nam`, bật chỉ còn hàng. So sánh keyword, semantic,
   hybrid; kiểm tra giao diện báo fallback nếu có. Dùng `giay nu di lam`
   để minh họa truy vấn tự nhiên nhưng không hứa kết quả nào cũng mua được.
3. Mở 2-3 sản phẩm, xem sản phẩm tương tự, quay về trang chủ xem gợi ý.
   Người dùng mới có thể nhận popular; không khẳng định cá nhân hóa tốt lên
   chỉ vì danh sách đổi sau vài lượt xem.
4. Chọn biến thể còn hàng, ghi tồn kho ban đầu, thêm một sản phẩm vào giỏ.
   Dùng địa chỉ và điện thoại giả cho môi trường thử nghiệm, đặt COD.
5. Kiểm tra tổng tiền, giỏ được xóa, đơn mới và tồn kho giảm đúng một lần.
   Hủy đơn, kiểm tra trạng thái hủy và tồn kho hoàn đúng một lần.
6. Thử mobile và tải lại đường dẫn chi tiết. Tránh tải lại liên tục gây giới
   hạn chat SSE; nếu gặp 429, chờ kết nối phục hồi thay vì tắt giới hạn.

Không demo thanh toán tiền thật: thông tin VNPay, Cloudinary và OAuth bên ngoài
đang để trống. Dữ liệu demo/đơn hủy không được xem là lịch sử mua thực.

## Kiểm tra và bằng chứng

```powershell
py -3.11 -m unittest discover -s CreaTShop-ai -p 'test_*.py'
Push-Location CreaTShop-Client
node --test tests/*.test.mjs
Pop-Location
```

Kiểm tra API Docker bằng script dưới; tên output phải mới vì script không ghi đè:

```powershell
py -3.11 CreaTShop-ai/check_docker.py $privateEnv backups/ai-acceptance-20261116-111819/docker-acceptance-20261117/api-handover.json
```

Browser E2E thật nằm tại `CreaTShop-Client/tests/docker.browser.mjs`; cần Chrome
và Playwright đã cài. Đặt `PLAYWRIGHT_MODULE` tới module ESM nếu không resolve
được package, `EVIDENCE_DIR` tới thư mục bằng chứng riêng rồi chạy bằng Node.
Script tạo tài khoản, địa chỉ, tương tác và đơn COD hủy trong bản sao Docker;
không chạy nó với hệ thống chính. Test chặn ảnh ngoài nên không thay thế xem ảnh.

Kết quả đã ghi nhận trước đợt bàn giao này: 18 Python tests, 10 file Node tests,
9 ca tìm kiếm API Docker và 10 nhóm browser E2E đạt. Đây là kết quả các lần chạy
đã lưu, không tự động bảo đảm lần khởi động sau vẫn đạt. Full frontend lint còn
16 lỗi, 2 cảnh báo ở mã ngoài phạm vi AI; không ghi toàn dự án lint xanh.

Chưa có đánh giá relevance của con người: worksheet
`backups/ai-acceptance-20261116-111819/pooled-review-20261117/review.html`
còn 120 cặp cần chấm. Mở offline, chấm theo hướng dẫn trong
`docs/AI_EVALUATION.md`, tải JSON xuống để lưu; trình duyệt không tự lưu tiến độ.
Nhãn AI/silver phải báo cáo riêng. Lịch sử đơn giao hiện chỉ có một người dùng,
chưa đủ kết luận chất lượng gợi ý cá nhân hóa hay làm temporal evaluation tin cậy.

## Dừng, phục hồi và bước còn lại

```powershell
docker compose --env-file $privateEnv -f $compose -p creatshop-docker-test stop
```

Không chạy `down -v`, xóa volume hay prune. Volume thử nghiệm là
`creatshop-docker-test_test-mysql-data`. Snapshot private đã có kiểm chứng
dump/restore logic và giữ dữ liệu khi tạo lại container MySQL; chưa kiểm chứng
mất volume/mất máy. Phục hồi phải vào volume/schema mới, kiểm tra dữ liệu rồi
mới quyết định chuyển; không import đè hệ thống chính.

Trước production còn cần: duyệt catalog và ảnh, chấm relevance, dữ liệu tương
tác hợp lệ, xử lý lint tồn đọng, kiểm thử thanh toán sandbox/IPN và lưu ảnh,
TLS/secrets/backup ngoài máy, kế hoạch migration volume và rollback riêng.
Dependency/base image chưa pin đầy đủ. Khi tạo lại backend làm đổi IP container,
có thể cần restart frontend thử nghiệm để Nginx resolve upstream mới.
