# Gói bàn giao mã nguồn — 20/11/2026

> Cập nhật 21/11/2026: xem [READINESS_20261121](https://github.com/MinhHieuDev2005/TTCSN-2025/blob/6135771912fe00bb9cd696c30cbedc04e19f3314/docs/READINESS_20261121.md) cho trạng thái mới và
> `docs/EXTERNAL_ACCEPTANCE.md` cho tích hợp ngoài. Số liệu/gói ngày 20/11
> dưới đây là bằng chứng lịch sử, không phải gói bàn giao mới nhất.

**Cập nhật sau:** gói completion mới đã bổ sung schema/seed/ảnh local tổng hợp,
benchmark gợi ý và bản thảo báo cáo. Xem `docs/SYNTHETIC_DEMO.md` và
[COMPLETION_20261120](https://github.com/MinhHieuDev2005/TTCSN-2025/blob/6135771912fe00bb9cd696c30cbedc04e19f3314/docs/COMPLETION_20261120.md). Các mô tả “không có dữ liệu demo” bên dưới áp
dụng gói handover đầu tiên, không phải bản completion mới.

## Phạm vi và kết quả rà soát catalog

Gói ZIP được tạo từ working tree hiện tại, không phải Git release hay clean
build đã kiểm chứng trên máy khác. Gồm client/server/AI, tests, tài liệu,
migrations, schema MySQL chỉ cấu trúc và OpenAPI xuất từ Docker thử nghiệm.
Không chứa Git history, snapshot khách hàng, cấu hình local, secret OAuth,
file env, model weights, node_modules, venv hoặc target/build output.
Compose production gốc và SQL init cũ không được đóng gói để tránh đưa dữ liệu
gốc hoặc cấu hình volume chưa được nghiệm thu sang máy mới.

Rà soát chỉ đọc catalog trên Docker: cả 25 sản phẩm demo đã chọn vẫn có giá
dương và biến thể màu/size còn hàng. Kiểm tra 61 URL ảnh chính, ảnh động và ảnh
biến thể còn hàng: 59 trả về MIME/signature ảnh phù hợp, 2 request thất bại.
Không kết luận URL hỏng từ lỗi request. Kết quả chi tiết giữ riêng trong
`backups/ai-acceptance-20261116-111819/handover-20261120/catalog-audit.json`.
Đây là kiểm tra khả dụng kỹ thuật, không xác nhận ảnh đúng sản phẩm, quyền
sử dụng ảnh hoặc độ chính xác chất liệu/công dụng. Những phần đó còn cần chủ
dữ liệu xác minh. Không sửa dữ liệu hay tạo thông tin sản phẩm suy đoán.

## Cấu trúc bổ sung trong ZIP

- `handover/schema.sql`: 16 bảng, chỉ DDL, không có bản ghi khách hàng hay
  password hash; đã loại giá trị AUTO_INCREMENT phản ánh số liệu đang dùng.
- `handover/openapi.json`: tài liệu OpenAPI gồm 50 paths từ image backend đang
  chạy; có thể nhập vào công cụ đọc OpenAPI/Postman. Image chưa rebuild ở đợt
  bàn giao nên đây không phải kiểm chứng sinh API từ một clean build mới.
- `handover/manifest.json`: danh sách file và SHA256 để đối chiếu sau giải nén.
- [ACCEPTANCE_20261120](https://github.com/MinhHieuDev2005/TTCSN-2025/blob/6135771912fe00bb9cd696c30cbedc04e19f3314/docs/ACCEPTANCE_20261120.md): kiểm thử chức năng thực tế và giới hạn.
- `docs/AI_ASSISTED_RESULTS.md`: đánh giá relevance bằng nhãn AI, tách riêng
  đánh giá người dùng thật. Các bằng chứng private được nhắc trong tài liệu
  không đi kèm ZIP; không thể tái chạy phép đo frozen chỉ từ gói public này.

Exporter dùng allowlist và kiểm tra mẫu credential phổ biến. Đây không phải
cam kết tuyệt đối không có thông tin nhạy cảm; đã kiểm tra bổ sung đối chiếu
các giá trị bí mật trong cấu hình riêng trên máy trước khi phát gói. Không
tự động upload gói lên Internet hoặc coi là đã được duyệt công khai.

## Cài trên máy mới

Cần Java 17, Node 22.12 trở lên/npm, MySQL 8, Python 3.11 và công cụ tương ứng; Docker là
tùy chọn cho triển khai. Xem phiên bản yêu cầu thực tế trong pom/package files.
Model runtime cần cache đúng revision trong `docs/AI_DISCOVERY.md`; dependency
và base images chưa pin đầy đủ nên không hứa build bit-reproducible.

1. Giải nén vào thư mục mới, không ghi đè bản đang hoạt động. Kiểm tra SHA256
   của ZIP bằng `Get-FileHash -Algorithm SHA256 <duong-dan-zip>` rồi đối chiếu
   checksum bên ngoài gói. Manifest bên trong giúp kiểm tra từng file nhưng
   tự nó không phải chữ ký chứng minh nguồn phát hành.
2. Tạo database MySQL mới và tài khoản riêng chỉ có quyền trên database đó.
   Import `handover/schema.sql` **chỉ vào database trống**. Có thể dùng MySQL
   client: `mysql -u <user> -p <new_database>`, rồi `source handover/schema.sql;`.
   Không chạy trên database chính và không chạy migrations lần nữa trên schema
   mới đã đầy đủ. Database cũ cần kế hoạch migration/backup riêng.
3. Copy `CreaTShop-server/creatshop/src/main/resources/application.properties.example`
   sang `CreaTShop-server/creatshop/config/application.properties`, cấu hình DB
   mới và JWT key riêng. Không dùng lại key từ máy nguồn; xem
   `docs/BACKEND_CONFIG.md`. Giữ `ddl-auto=validate`.
4. Trong thư mục backend chạy `./mvnw.cmd -DskipTests package`, sau đó
   `java -jar target/creatshop-0.0.1-SNAPSHOT.jar`. Lệnh package này không thay
   thế chạy regression tests trong `scripts/test-backend.ps1`.
5. Trong client chạy `npm ci`; đặt biến `VITE_API_URL` đúng backend mới theo
   `README.md`, rồi `npm run dev`. Cấu hình CORS/FRONTEND_URL phải khớp origin.
6. Ban đầu có thể để AI tắt và xác nhận keyword fallback; sau đó cài/chạy model
   theo `docs/AI_DISCOVERY.md`, bật AI và kiểm tra index. Không gọi fallback là
   thành công semantic. Chạy unit tests theo các tài liệu nghiệm thu.

**Database trong gói không có dữ liệu demo, tài khoản hay sản phẩm.** Đăng ký
tài khoản riêng mới và chuẩn bị catalog được cấp quyền/fixture tổng hợp trước
khi demo mua hàng. Không có mật khẩu admin dùng chung; thiết lập admin chỉ
trên DB mới theo quy trình quản trị có kiểm soát. Không nhập snapshot private
để tiện demo. Vì không có catalog, chưa thể dùng gói này như bản one-click
demo trên máy mới. Demo đã nghiệm thu vẫn ở cổng 15173 trên máy hiện tại.

Compose thử nghiệm đi kèm cần env/cache/snapshot riêng đã duyệt; file env của
máy nguồn không đi kèm. Không trỏ compose đó vào snapshot có khách hàng thật.
VNPay/Cloudinary/OAuth chỉ bật sau khi có cấu hình sandbox riêng và kiểm thử;
không coi dữ liệu/credentials thiếu là production-ready.

## Tạo lại gói trên máy nguồn

```powershell
py -3.11 -m unittest discover -s CreaTShop-ai -p 'test_*.py'
py -3.11 CreaTShop-ai/export_handover.py backups/ai-acceptance-20261116-111819/handover-20261120 backups/ai-acceptance-20261116-111819/handover-20261120/creatshop-handover-rerun.zip
```

Output phải là file mới. Exporter không đọc hoặc nhúng SQL init/dump cũ và chỉ
nhận schema/OpenAPI đã xuất riêng; không tự sao chép cả repo. Khi chia sẻ chỉ
chọn đúng file ZIP và checksum đã duyệt, tuyệt đối không gửi thư mục backups
cha. Nếu sửa mã nguồn hoặc tài liệu, tạo gói và kiểm tra lại checksum/bí mật.
