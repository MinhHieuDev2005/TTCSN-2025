# Rà soát quản lý sản phẩm - cập nhật 14/11/2026

## Đã xử lý

- Danh sách chính hiển thị mỗi sản phẩm một dòng: mã, ảnh/tên, danh mục, số biến thể, giá chung và tổng tồn kho. Phân trang theo sản phẩm; sản phẩm chưa có biến thể vẫn có dòng riêng.
- Mở chi tiết sản phẩm để xem thông tin chung và toàn bộ biến thể, thêm/sửa/xóa biến thể hoặc sửa sản phẩm cha. Hiển thị giá chung áp dụng cho mọi biến thể. Tổng tồn tự cập nhật sau khi tải lại dữ liệu; xóa biến thể cuối vẫn giữ màn chi tiết sản phẩm. Quay lại danh sách giữ bộ lọc và trang đã chọn. Hộp thoại hỗ trợ bàn phím, Escape và giữ focus bằng `dialog` của trình duyệt; chuyển giữa danh sách/chi tiết đặt focus vào tiêu đề.
- Tìm theo tên, mã SP/biến thể, màu, cỡ; lọc danh mục, màu, cỡ, tồn kho, khoảng giá. Các điều kiện màu/cỡ/tồn kho phải cùng khớp trên một biến thể, không ghép điều kiện từ nhiều biến thể khác nhau. Lọc hết hàng bao gồm sản phẩm có ít nhất một biến thể hết hàng hoặc chưa có biến thể; không đồng nghĩa tổng tồn bằng 0. Tổng tồn luôn tính mọi biến thể, kể cả khi lọc; hiển thị số biến thể khớp khi chỉ một phần khớp. Sắp xếp tồn kho dựa trên tổng tồn. Đổi bộ lọc về trang 1. Hiện tại lọc/phân trang tại client, không phải API phân trang phía server.
- API trả thêm `categoryId`, lưu đúng thay đổi danh mục và giữ ảnh cũ khi cập nhật không kèm ảnh. Tạo mới vẫn bắt buộc ảnh; ảnh tối đa 5 MB, tổng request tối đa 30 MB.
- Cho tồn kho về 0; chặn số âm. Sửa biến thể yêu cầu `expectedQuantity` và khóa bản ghi: từ chối biểu mẫu cũ nếu tồn kho đã thay đổi, tránh ghi đè tồn kho vừa bán. Đổi tên sản phẩm không cập nhật lại các cột tồn kho không thay đổi.
- Không xóa sản phẩm/biến thể đã được đơn hàng hoặc giỏ hàng tham chiếu. Xóa biến thể cuối không tự xóa sản phẩm gốc.

## Tình trạng các vấn đề đã rà soát

1. **Đã sửa - dữ liệu lúc mua:** đơn mới lưu `unitPrice`, `productName`, `variantColor`, `variantSize` từ backend. Tổng đơn tính bằng chính đơn giá đã lưu. Màn quản trị và lịch sử khách hàng không lấy thông tin hiện tại của danh mục để giả làm dữ liệu lúc mua. Đơn cũ thiếu snapshot được đánh dấu rõ; không tự suy ra hay cập nhật giá cũ.
2. **Đã sửa - biến thể trùng:** ràng buộc duy nhất `uk_product_color_size` ở database chặn cả request đồng thời; áp dụng cho tạo riêng, sửa và tạo nhiều biến thể trong sản phẩm. Chuẩn hóa màu về chữ thường, cỡ về chữ hoa, bỏ khoảng trắng đầu/cuối. Vi phạm trả lỗi nghiệp vụ và rollback, không thay đổi tồn kho hay để lại sản phẩm tạo dở.
3. **Quy mô dữ liệu:** danh sách sản phẩm vẫn tải toàn bộ và truy vấn biến thể riêng cho từng sản phẩm. Khi danh mục lớn, chuyển tìm kiếm/lọc/phân trang sang API và tối ưu truy vấn; chưa cần đổi kiến trúc cho bộ dữ liệu nhỏ của đồ án.

Hai lỗi ưu tiên đã có bản sửa và kiểm thử. Điểm quy mô dữ liệu vẫn ngoài phạm vi; không coi các kiểm thử này là chứng nhận toàn hệ thống không còn lỗi.

## Kiểm chứng

- `node CreaTShop-Client/tests/adminProducts.test.mjs`: mỗi sản phẩm một dòng; bộ lọc cùng một biến thể; tổng tồn không bị giới hạn theo bộ lọc; số biến thể khớp; khoảng giá, tồn kho 0, sắp xếp, phân trang và không sửa dữ liệu gốc.
- `./scripts/test-backend.ps1`: 21 nhóm hồi quy trên H2, gồm kiểm tra multipart thực tế qua controller, phân biệt tạo/sửa, danh mục, tồn kho, sửa đồng thời với checkout và xóa an toàn.
- `./scripts/test-mysql.ps1 -Repeat 2`: 21 nhóm trên hai lần chạy MySQL riêng, mức cô lập REPEATABLE-READ. Không dùng cơ sở dữ liệu ứng dụng.
- Kiểm thử trình duyệt với API giả cho giao diện hai cấp: bộ lọc không ghép nhầm biến thể, tổng tồn, màn chi tiết hiện mọi biến thể, sửa danh mục/đổi tên, cập nhật tồn kho về 0 không kèm ảnh, lỗi xóa bản ghi được tham chiếu, thêm/xóa biến thể cuối, giữ bộ lọc/trang khi quay lại, reset trang khi đổi bộ lọc, focus/Escape và không tràn trang ở 390/768/1024/1440 px. Ba bộ kiểm tra frontend, ESLint các file liên quan và build đạt. Không ghi vào dữ liệu thật; upload Cloudinary thật chưa được kiểm chứng trong các bài kiểm thử này. Đợt tổ chức lại giao diện không đổi backend/schema và không cần migration mới.

Kiểm tra tích hợp chỉ đọc sau khi đổi giao diện: API local trả 179 sản phẩm, danh sách đếm theo sản phẩm; mở chi tiết và đối chiếu tổng tồn, đổi nhãn tiếng Việt và kiểm tra màn hình 390 px thành công. Các request ghi bị chặn trong kiểm tra này; không thay đổi dữ liệu thật.

Migration đã được áp dụng lên database local ngày 14/11/2026; xem biên bản triển khai cuối tài liệu. Các môi trường khác vẫn cần thực hiện quy trình bên dưới.


## Triển khai hai bản sửa ngày 14/11/2026

1. Tạm dừng ghi dữ liệu và dừng backend; tạo backup mới, kiểm tra khôi phục trên database riêng. Không chỉ dựa vào backup cũ.
2. Rà soát trước khi chạy migration:

```sql
SELECT product_id, LOWER(TRIM(color)), UPPER(TRIM(size)), COUNT(*), GROUP_CONCAT(id)
FROM product_info
GROUP BY product_id, LOWER(TRIM(color)), UPPER(TRIM(size)) HAVING COUNT(*) > 1;
SELECT id FROM product_info
WHERE product_id IS NULL OR color IS NULL OR size IS NULL OR TRIM(color) = '' OR TRIM(size) = '';
```

3. Chạy một lần `CreaTShop-server/creatshop/database/20261114-unique-variants.sql`, rồi `CreaTShop-server/creatshop/database/20261114-order-snapshots.sql` bằng MySQL client có hỗ trợ `DELIMITER`. Nếu trùng/thiếu thuộc tính, migration dừng trước khi sửa dữ liệu; xử lý thủ công sau khi đối chiếu giỏ hàng và đơn hàng, không tự xóa/gộp ID. MySQL DDL không rollback toàn bộ được: giữ backup và không chạy lặp mù quáng sau lỗi giữa chừng.
4. Khởi động backend mới, build/tải lại frontend. Không chạy lẫn backend cũ và mới vì phiên bản cũ không ghi snapshot. Giữ nguyên giá trị NULL của snapshot đơn cũ nếu không có chứng từ lịch sử đáng tin cậy.

Kiểm thử bổ sung: snapshot không đổi sau khi sửa danh mục; đơn cũ không bị điền dữ liệu giả; trùng khác chữ hoa/thường/khoảng trắng; sửa trùng rollback tồn kho; tạo hoặc sửa đồng thời về cùng tổ hợp chỉ một request thành công; tạo sản phẩm có biến thể trùng rollback toàn bộ. Script MySQL kiểm tra cả migration từ schema cũ, chặn dữ liệu trùng trước khi sửa và bảo toàn ID/tồn kho. Kiểm tra trình duyệt dùng API giả, không ghi dữ liệu thật.

Ở lần kiểm tra ban đầu, đã khôi phục backup ngày 13/11/2026 vào MySQL riêng và chạy thành công hai migration mới cùng 21 nhóm hồi quy, chưa thay đổi database ứng dụng. Build frontend và ESLint các file frontend liên quan đạt; build vẫn có cảnh báo kích thước bundle và Sass/Browserslist đã tồn tại.

## Biên bản triển khai local 14/11/2026

- Đã dừng backend cũ trước khi backup; không dừng dịch vụ MySQL cổng 3306. Kiểm tra dữ liệu thực tế không có tổ hợp biến thể trùng hoặc thiếu thuộc tính.
- Backup mới: `backups/creatshopdb3-20261114-114322-28d7a352.sql`. SHA256: `35e75c6c7144f007be972773a6573c0f267967b90c9934b2ec0bed497bd59578`. Backup chứa dữ liệu riêng tư, đã được Git bỏ qua; không đưa vào commit.
- Khôi phục backup mới trên MySQL riêng cổng 3308, chạy migration và 21 nhóm hồi quy thành công; tiến trình MySQL kiểm thử đã dừng.
- Áp dụng thành công `20261114-unique-variants.sql` và `20261114-order-snapshots.sql` lên `creatshopdb3`. Đối chiếu trước/sau: số bản ghi của cả 11 bảng, ID/tồn kho biến thể, ID/tổng tiền đơn hàng giữ nguyên; bốn cột snapshot của đơn cũ vẫn NULL. Ràng buộc duy nhất ba cột đã có hiệu lực.
- Đã build và khởi động backend bằng JAR mới, với `--spring.jpa.hibernate.ddl-auto=validate` để chỉ xác nhận schema, không tự sửa schema lúc khởi động. Log: `CreaTShop-server/creatshop/target/deployment-backend.log`; PID được lưu trong `CreaTShop-server/creatshop/target/deployment-backend.pid`. Chỉ chạy một backend tại cổng 8080; thay đổi mã nguồn tiếp theo cần build/restart JAR hoặc dừng JAR trước khi dùng Maven/IDE.
- Kiểm tra sau triển khai: API sản phẩm HTTP 200, trả `categoryId` của DTO mới; API đơn quản trị từ chối truy cập không đăng nhập với HTTP 401; frontend Vite cổng 5173 HTTP 200. Không tạo đơn hay sửa hàng thật để thử nghiệp vụ; các thao tác ghi được kiểm thử trên database riêng. Tải lại trình duyệt để nhận frontend mới. Chưa commit/push.
