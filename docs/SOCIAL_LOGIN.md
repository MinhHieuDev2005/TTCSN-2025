# Đăng nhập Google / Facebook

Đã tích hợp OAuth2 Authorization Code bằng Spring Security; Google dùng OpenID Connect.
Đăng nhập mật khẩu vẫn giữ nguyên. Nút Google/Facebook chỉ hoạt động khi backend đã có đủ Client ID và Client Secret của nhà cung cấp đó.

## 1. Cơ sở dữ liệu

Sao lưu cơ sở dữ liệu, chọn đúng database rồi chạy **một lần** file
`CreaTShop-server/creatshop/database/20261115-social-login.sql` trong MySQL Workbench hoặc công cụ quản trị đang dùng.
Migration tạo bảng `social_identities`, không sửa tài khoản hoặc đơn hàng hiện có.
Nếu bảng đã tồn tại do Hibernate `update` tự tạo trước đó, không chạy lại `CREATE TABLE`: kiểm tra và đổi collation của `provider` thành `ascii_bin`, `subject` thành `utf8mb4_bin`, giữ khóa duy nhất `(provider, subject)` và khóa ngoại tới `users(id)`.
Dùng `ddl-auto=validate` khi triển khai; không dựa vào `update` để quản lý schema production.

## 2. Tạo ứng dụng Google và Facebook

### Google

- Trong Google Cloud Console, tạo/cấu hình OAuth consent screen và OAuth client loại **Web application**.
- Đăng ký chính xác redirect URI: `http://localhost:8080/login/oauth2/code/google`.
- Quyền yêu cầu: `openid`, `profile`, `email`. Nếu ứng dụng ở chế độ thử nghiệm, thêm tài khoản thử nghiệm trong console.
- Lấy Client ID / Client Secret, lưu ở backend, không đưa vào biến `VITE_*` hoặc commit lên Git.

### Facebook

- Trong Meta for Developers, tạo ứng dụng phù hợp và cấu hình **Facebook Login**.
- Đăng ký chính xác redirect URI: `http://localhost:8080/login/oauth2/code/facebook`.
- Quyền yêu cầu: `public_profile`, `email`. Tài khoản phải thuộc nhóm được phép thử khi app còn ở chế độ phát triển.
- Lấy App ID / App Secret dùng cho backend. Khi công khai app, hoàn tất các điều kiện xét duyệt/quyền truy cập mà console yêu cầu.
- Mặc định endpoint Graph API là `v23.0`; đặt `FACEBOOK_GRAPH_VERSION` theo phiên bản còn được hỗ trợ và cấu hình app, không coi đây là phiên bản mới nhất.
- Nếu Facebook không trả email hoặc người dùng từ chối quyền email, hệ thống báo rõ và không tạo tài khoản thiếu email.

## 3. Chạy local bằng PowerShell

Mở terminal backend, nhập khóa thật thay cho các giá trị mẫu:

```powershell
cd D:\creatshop\TTCSN-2025\CreaTShop-server\creatshop
$env:FRONTEND_URL = 'http://localhost:5173'
$env:OAUTH2_BASE_URL = 'http://localhost:8080'
$env:GOOGLE_CLIENT_ID = '<google-client-id>'
$env:GOOGLE_CLIENT_SECRET = '<google-client-secret>'
$env:FACEBOOK_CLIENT_ID = '<facebook-app-id>'
$env:FACEBOOK_CLIENT_SECRET = '<facebook-app-secret>'
$env:FACEBOOK_GRAPH_VERSION = 'v23.0'
$env:SERVER_SERVLET_SESSION_COOKIE_HTTP_ONLY = 'true'
$env:SERVER_SERVLET_SESSION_COOKIE_SAME_SITE = 'lax'
.\mvnw.cmd -DskipTests package
java -jar .\target\creatshop-0.0.1-SNAPSHOT.jar --spring.jpa.hibernate.ddl-auto=validate
```

Chỉ cấu hình Google hoặc Facebook nếu muốn bật riêng một nhà cung cấp. Biến môi trường phải nằm trong terminal/process thực sự khởi động backend.
Nếu cổng 8080 đang bận, dừng đúng backend cũ trước khi chạy bản mới, không mở chồng hai backend.
Nếu chạy cổng khác, đổi `OAUTH2_BASE_URL`, `VITE_API_URL` và các redirect URI trong console cho khớp.

Frontend dùng `VITE_API_URL=http://localhost:8080/api/v1` và chạy ở `http://localhost:5173`.
Không trộn `localhost` và `127.0.0.1`: phiên OAuth cần cookie cùng hostname và frontend origin phải khớp chính xác.
Không cần đưa Client Secret vào frontend; backend trả trạng thái khả dụng qua `/api/v1/auths/social/providers`.

Production dùng HTTPS, frontend/backend cùng site (ví dụ `shop.example.com` / `api.example.com` hoặc reverse proxy).
Đặt `SERVER_SERVLET_SESSION_COOKIE_SECURE=true`, `SERVER_SERVLET_SESSION_COOKIE_HTTP_ONLY=true`,
`SERVER_SERVLET_SESSION_COOKIE_SAME_SITE=lax`; cập nhật hai origin và redirect URI HTTPS trong console.
Frontend và API khác site cần thiết kế cookie/CSRF riêng, chưa hỗ trợ trong luồng này.
Không bật log DEBUG/TRACE cho HTTP client, Spring Security/OAuth hoặc ghi cookie, token, Client Secret vào log.

## 4. Quy tắc tài khoản

- Định danh bằng cặp nhà cung cấp + ID người dùng, không dùng email làm khóa liên kết.
- Đăng nhập lần đầu tạo khách hàng `ROLE_USER` và giỏ hàng; không bao giờ tự cấp quyền quản trị.
- Email trùng tài khoản cũ sẽ bị từ chối kèm hướng dẫn đăng nhập bằng phương thức gốc, không tự gộp tài khoản.
- Tài khoản bị khóa không được đăng nhập, kể cả bị khóa sau callback nhưng trước khi đổi JWT.
- JWT không xuất hiện trên URL. Phiên chờ chỉ tồn tại 60 giây, đổi được một lần, chỉ chấp nhận frontend origin đã cấu hình.
- Mật khẩu tài khoản mới được sinh ngẫu nhiên, không phải mật khẩu Google/Facebook. Chưa có chức năng liên kết tài khoản hay đặt mật khẩu cho tài khoản social; chỉ thêm khi có luồng xác minh danh tính riêng.

## 5. Kiểm thử

`scripts/test-backend.ps1` chạy kiểm tra OAuth với nhà cung cấp mô phỏng trên HTTP local và H2 riêng biệt, không gọi Google/Facebook thật hay sửa database local.
`CreaTShop-Client/tests/socialLogin.browser.mjs` kiểm tra giao diện responsive, chuyển hướng, lỗi callback và đổi phiên một lần bằng API mô phỏng.

Sau khi cấu hình khóa thật, cần thử cả hai nhà cung cấp bằng tài khoản thử nghiệm: đăng nhập mới/cũ, từ chối quyền, tài khoản bị khóa, quay về trang giỏ hàng và thử lại với email đã tồn tại.
Các bài kiểm tra mô phỏng không thay thế việc xác nhận cấu hình và chính sách của ứng dụng Google/Meta thật.
