# Demo sạch với dữ liệu tổng hợp

Bản mới dùng project `creatshop-synthetic-demo`, frontend cổng **15174**,
backend **19081**, DB `creatshop_demo`. Không dùng snapshot khách hàng, không
thay thế môi trường 15173 và không đụng database ứng dụng chính.

Schema 16 bảng và seed 12 sản phẩm/11 biến thể được version trong
`CreaTShop-server/creatshop/database/demo/`. Có sản phẩm hết hàng và chưa có
biến thể để kiểm tra trường hợp biên. Tên/mô tả/giá/tồn kho đều là fixture,
không có tuyên bố về hàng thật. Ảnh SVG do dự án tạo nằm trong frontend,
không phụ thuộc CDN, có nhãn SYNTHETIC DEMO / NOT FOR SALE.
Không có tài khoản/password dùng chung trong seed.

## Khởi tạo trên máy mới

Cần Docker, Python 3.11 và cache Hugging Face đã tải đúng revision theo
`docs/AI_DISCOVERY.md`. Model dùng offline; build image lần đầu vẫn cần mạng.
Nếu build frontend ngoài Docker, dùng Node 22.12 trở lên cho Vite 7. Dockerfile
dùng Node 22 Alpine; không dùng lại hướng dẫn Node 18 của phiên bản cũ.
Chạy từ root repo:

```powershell
py -3.11 CreaTShop-ai/prepare_demo.py backups/synthetic-demo.env
docker compose --env-file backups/synthetic-demo.env -f CreaTShop-server/creatshop/docker-compose.demo.yml -p creatshop-synthetic-demo up -d --build --wait --wait-timeout 300
```

Nếu cache ở nơi khác thêm `--cache <duong-dan-hub>` khi prepare. Công cụ kiểm
tra có các file model/tokenizer/config tại revision cần dùng, không tự chứng
thực checksum weights hay tải model. Secrets được sinh ngẫu nhiên, không in ra
terminal và không ghi đè env cũ. Không chia sẻ env hoặc thay key/password khi
volume đã có dữ liệu. Trên máy hiện tại đã khởi tạo bằng file riêng
`backups/ai-acceptance-20261116-111819/completion-20261120/demo.env`; dùng đúng
file đó để start/stop lại, không chạy prepare để thay thế.

Mở `http://127.0.0.1:15174`, tự đăng ký tài khoản rồi thử tìm kiếm, chọn biến
thể, đặt COD và hủy. Dữ liệu địa chỉ/điện thoại là fixture; không giao hàng
và không thanh toán thật. Tài khoản admin đã chuẩn bị trên máy hiện tại có
thông tin tại `backups/ai-acceptance-20261116-111819/completion-20261120/demo-admin.json`.
Đây là bí mật local, không nằm trong ZIP. Trên máy khác, muốn có admin phải
tạo tài khoản riêng và cấp ROLE_ADMIN bằng thao tác quản trị được kiểm soát
chỉ trên DB demo mới; không cung cấp cơ chế tự nâng quyền qua API.

Schema init và seed chỉ chạy khi volume trống. Không import đè vào DB đang
có đơn. Giữ nguyên volume khi dừng:

```powershell
docker compose --env-file backups/synthetic-demo.env -f CreaTShop-server/creatshop/docker-compose.demo.yml -p creatshop-synthetic-demo stop
```

Không chạy `down -v` hoặc prune nếu cần giữ dữ liệu. DB/model không publish
cổng host; frontend/backend chỉ bind loopback. Đây không phải cấu hình public
Internet; merchant keys, Cloudinary và OAuth đều để trống.

## Kiểm thử giao diện thật

```powershell
$env:SYNTHETIC_DEMO='1'
$env:EVIDENCE_DIR='<thu-muc-bang-chung-moi>'
node CreaTShop-Client/tests/docker.browser.mjs
```

Cần Chrome và Playwright; có thể đặt PLAYWRIGHT_MODULE tới module ESM đã cài.
Test chỉ chọn được 15173 hoặc 15174, kiểm tra marker Nginx trước khi ghi dữ
liệu; không hỗ trợ URL tùy ý trỏ nhầm hệ thống chính. API không bị mock, tài
nguyên ngoài bị chặn. Test tạo tài khoản/địa chỉ/đơn COD hủy tổng hợp.

Ngày 20/11/2026 đã build backend từ `mvn clean install` trong container và
frontend bằng `npm ci`/Vite, bootstrap volume trống, index 12/12 và chạy 9 ca
API đúng mode cùng 10 nhóm browser E2E thành công. Việc này kiểm tra bootstrap
schema/fixture trên máy hiện tại, không phải thử trên máy vật lý độc lập hay
cam kết dependency/base image bất biến. Chi tiết nằm trong
`docs/COMPLETION_20261120.md`.
