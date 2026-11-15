# Hướng dẫn nghiệm thu local - ngày 13/11/2026

## Bàn giao sửa logo và kiểm thử lại (15/11/2026)

- Footer bỏ khung nền trắng; dùng logo trong suốt có chữ trắng cho nền tối, giữ màu biểu tượng và giữ nguyên logo header/admin. Kiểm thử logo kiểm tra cả nền ảnh, nền khung bọc và chữ trên nền tối ở 360, 768, 1440 px.
- Chạy lại thành công 10 bộ utility, 10 bộ browser, build frontend và lint file footer. Browser giả lập API, không thay thế nghiệm thu giao diện nối với backend đang chạy.
- Backend đạt 32 nhóm hồi quy H2, 42 kiểm tra HTTP khách hàng, 67 kiểm tra HTTP/SSE chat và 7 nhóm OAuth với nhà cung cấp giả lập. Không kết nối Google/Facebook hoặc VNPay thật trong các bài này.
- Sao lưu mới: `backups/creatshopdb3-20261115-212718-handoff.sql`, kèm checksum `.sql.sha256`; thư mục này được Git bỏ qua. Backup chứa dữ liệu riêng tư: không đẩy Git, gửi vào chat hoặc đưa vào tài liệu công khai; sao chép thêm sang nơi lưu trữ riêng có kiểm soát truy cập.
- Đã khôi phục backup trên MySQL riêng cổng 3308 và kiểm tra migration giữ nguyên trạng thái thanh toán, giá trị tiền, lịch sử đơn. Lần chạy đầu phát hiện schema phục hồi ảnh hưởng fixture hồi quy; đã sửa `scripts/test-mysql.ps1` để mỗi lượt hồi quy dùng database trống riêng, không dùng database vừa phục hồi. Hai lượt sau sửa đều đạt 32 nhóm; instance thử nghiệm đã dừng.
- Nhật ký local: `CreaTShop-server/creatshop/target/handoff-*.log`. Không coi các cảnh báo build hoặc lỗi lint toàn repository đã tồn tại trước đó là đã được sửa; phạm vi lint mới chỉ là file nguồn thay đổi.
- Không chạy migration trên database ứng dụng, không tạo đơn hoặc khởi động lại backend đang phục vụ ở cổng 8080. Backend đang chạy cần được chủ dự án cập nhật trước khi nghiệm thu tích hợp.

## Kết quả kiểm tra lại ngày 15/11/2026

- Logo header, footer và sidebar admin dùng bản tối ưu từ `src/assets/logo.png`; giữ nguyên ảnh gốc, bỏ nền ô caro và khoảng trống dư ở bản hiển thị. Có 6 kiểm tra logo trên desktop/tablet/mobile.
- Backend: 32 nhóm hồi quy H2, 42 kiểm tra HTTP khách hàng, 67 kiểm tra chat và 7 nhóm OAuth đều đạt. MySQL riêng: migration và 32 nhóm hồi quy đều đạt; instance kiểm thử đã dừng.
- Frontend: build, 10 bộ utility và toàn bộ 10 bộ browser đều đạt (admin, logo, khách hàng, phân trang, chat, tự cập nhật, liên hệ, tin tức, OAuth).
- CI phát hiện test chat chưa tự mock `navigator` trên Node 20; đã bổ sung mock/khôi phục descriptor, kiểm tra cả môi trường có và không có global này, không đổi logic chat để che lỗi test.
- Lint các file nguồn thay đổi: 0 lỗi; còn 1 cảnh báo Fast Refresh của context chat. Lint toàn repository vẫn có lỗi cũ ở các file không thay đổi (import React không dùng, khai báo props và hook trong `api/user.api.js`); không coi toàn repository đã sạch lint.
- Build còn cảnh báo kích thước bundle, Browserslist và Sass cũ; không làm thất bại build, không thay dependency ngoài phạm vi để che cảnh báo.
- API trong browser và nhà cung cấp OAuth được mô phỏng; chưa thay thế nghiệm thu Google/Facebook thật hoặc thanh toán VNPay sandbox. Xem `docs/SOCIAL_LOGIN.md` để cấu hình khóa, callback và migration.
- Không tạo đơn, sửa dữ liệu hay tự chạy migration trên database ứng dụng trong đợt kiểm tra này. Không tự khởi động lại backend đang chạy.

## Đã hoàn thành

- Sao lưu `localhost:3306/creatshopdb3` vào `backups/creatshopdb3-20261113-144536-20a31c09.sql` (Git bỏ qua tệp này).
- Khôi phục bản sao lưu trên MySQL riêng, kiểm tra bản cập nhật enum giữ nguyên số lượng thanh toán theo từng trạng thái và bổ sung `REFUND_REQUIRED` (cần hoàn tiền).
- Áp dụng bản cập nhật đã kiểm chứng vào `creatshopdb3` local. Số lượng thanh toán theo từng trạng thái không đổi; không tạo đơn, hủy đơn hay thanh toán trên cơ sở dữ liệu ứng dụng trong quá trình kiểm tra.
- Chạy 15 nhóm kiểm thử hồi quy ba lần trên MySQL 8.0.44 với mức cô lập REPEATABLE-READ, thêm một lần sau khi khôi phục bản sao lưu: tất cả đều đạt.
- Sửa lỗi tạo trùng đơn khi xử lý đồng thời chỉ xuất hiện trên MySQL: khóa bản ghi thanh toán trước khi đọc người dùng/địa chỉ để tránh thiết lập ảnh chụp dữ liệu nhất quán quá sớm. Chỉ kiểm thử bằng H2 không phát hiện được lỗi này.
- Đã dừng các phiên bản MySQL dùng riêng cho kiểm thử; không dừng hoặc cấu hình lại dịch vụ MySQL có sẵn.

Nhật ký chi tiết: `CreaTShop-server/creatshop/target/mysql-integration.log` và `CreaTShop-server/creatshop/target/mysql-backup-restore.log`. Bộ kiểm thử chủ động chạy tình huống tài khoản bị khóa và thanh toán cần hoàn tiền; thông báo ERROR dự kiến trong các tình huống này không đồng nghĩa với kiểm thử thất bại.

## Còn lại: thanh toán thực tế trên sandbox

Cấu hình VNPay local trỏ tới cổng sandbox, với đường dẫn trình duyệt quay về là `http://localhost:5173/payment/vnpay-return`. Mã merchant và khóa ký đã có tại local nhưng chưa được xác thực với VNPay. Không gửi khóa bí mật vào cuộc trò chuyện hoặc đưa vào commit.

Chạy backend trong một cửa sổ PowerShell:

```powershell
cd D:\creatshop\TTCSN-2025\CreaTShop-server\creatshop
./mvnw.cmd spring-boot:run
```

Chạy frontend trong cửa sổ khác:

```powershell
cd D:\creatshop\TTCSN-2025\CreaTShop-Client
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mở `http://localhost:5173`, dùng tài khoản khách hàng riêng cho kiểm thử. Thao tác trên giao diện sẽ tạo đơn và thay đổi tồn kho; hãy dùng sản phẩm thử nghiệm và ghi lại số lượng ban đầu. Khởi động backend cũng kích hoạt tác vụ hết hạn thanh toán VNPay đang chờ, bao gồm các đơn tồn đọng từ trước.

1. Tạo đơn COD (thanh toán khi nhận hàng), kiểm tra tồn kho giảm đúng một lần. Hủy đơn, kiểm tra tồn kho hoàn lại đúng một lần. Tạo đơn COD khác, dùng tài khoản quản trị chuyển sang Delivered (đã giao), rồi xác nhận thanh toán; trạng thái thanh toán phải thành COMPLETED.
2. Tạo đơn VNPay. Chỉ dùng thẻ/OTP thử nghiệm do VNPay cung cấp, không dùng thẻ thật. Sau khi thành công, kiểm tra trạng thái thanh toán ở backend là COMPLETED và tồn kho chỉ bị trừ một lần. Tải lại trang kết quả, kiểm tra không bị trừ thêm.
3. Hủy trên màn hình thanh toán sandbox, kiểm tra đơn được hủy và tồn kho hoàn lại một lần. Thông báo thanh toán thành công đến sau khi đơn đã hủy phải đưa thanh toán về REFUND_REQUIRED, không cho phép giao hàng; cần đối soát/hoàn tiền thủ công trong VNPay.
4. Bỏ dở một phiên thanh toán VNPay mới, không quay về ứng dụng. Sau 20 phút và lần chạy tác vụ định kỳ kế tiếp (thông thường trong vòng 60 giây), kiểm tra đơn bị hủy và tồn kho được hoàn lại. Thanh toán COD và thanh toán đã hoàn tất phải giữ nguyên.
5. Trong phiên trình duyệt khác, dùng tài khoản quản trị khóa khách hàng đang đăng nhập. Yêu cầu API cần xác thực tiếp theo của khách hàng phải bị từ chối, kể cả khi dùng token cũ.

Kiểm thử thông báo thanh toán có chữ ký hiện chạy tại local, không kết nối VNPay. Để kiểm chứng IPN thực tế giữa các máy chủ, cần cung cấp `/api/v1/vnpay/ipn` qua địa chỉ HTTPS của backend mà VNPay truy cập được và đăng ký trong cấu hình merchant. Trình duyệt quay về localhost thành công không chứng minh IPN bên ngoài hoạt động. Không công khai cơ sở dữ liệu phát triển hoặc chia sẻ khóa ký khi thiết lập kết nối.

Ghi lại mã đơn, kết quả và ảnh chụp cho từng tình huống. Nếu có lỗi, chỉ chia sẻ mã đơn và thông báo lỗi đã loại bỏ thông tin nhạy cảm; không gửi mật khẩu, token hoặc thông tin thẻ.

## Kiểm tra tự cập nhật dữ liệu

Các màn dashboard, đơn hàng, sản phẩm, danh mục và người dùng của admin; trang chủ, cửa hàng, chi tiết sản phẩm, giỏ hàng và đơn hàng của khách tự kiểm tra dữ liệu sau mỗi 10 giây kể từ khi lần kiểm tra trước hoàn tất. Đây là đồng bộ gần thời gian thực, không phải cập nhật tức thì.

- Chỉ kiểm tra khi tab đang hiển thị và có mạng. Quay lại tab hoặc kết nối mạng lại sẽ kích hoạt kiểm tra ngay; yêu cầu nền bị treo được hủy sau 15 giây.
- Giữ nguyên bộ lọc, trang hiện tại, lựa chọn màu/size và số lượng. Tạm dừng lúc đang lưu hoặc mở form sửa/xác nhận của admin. Form hồ sơ và thanh toán không bị tự nạp lại; thanh toán vẫn kiểm tra giá/tồn kho trước khi tạo giao dịch.
- Nếu lỗi đồng bộ, giữ dữ liệu đang hiển thị, báo dữ liệu có thể chưa mới và tự thử lại. Không tải lại toàn trang hoặc lặp thông báo toast.
- Dùng hai phiên đăng nhập riêng: khách đặt/hủy đơn, admin quan sát đơn và tồn kho; admin đổi trạng thái, khách quan sát lịch sử đơn. Với tab đang ẩn, quay lại tab trước khi kiểm tra. Mở form sửa rồi chờ hơn 10 giây để xác nhận dữ liệu đang nhập không bị ghi đè.

Kiểm tra tự động không ghi dữ liệu ứng dụng thật:

```powershell
node --test CreaTShop-Client/tests/backgroundRefresh.test.mjs
node CreaTShop-Client/tests/liveUpdates.browser.mjs
```

Bài kiểm tra trình duyệt cần frontend tại cổng 5173 và Playwright có sẵn; có thể đặt `PLAYWRIGHT_MODULE` trỏ tới module Playwright đã cài. Tất cả API trong bài kiểm tra này được giả lập; vẫn cần nghiệm thu hai phiên với backend thật trên dữ liệu thử nghiệm trước khi triển khai.

## Chat khách hàng và cửa hàng

Bản chat kèm thông báo được đóng gói riêng tại `CreaTShop-server/creatshop/target/creatshop-chat-notifications.jar` để không ghi đè JAR đang được backend giữ khóa. Dừng backend cũ bằng Ctrl+C trong terminal của nó trước khi chạy lệnh sau từ thư mục gốc repository (không chạy hai backend cùng cổng):

```powershell
java -jar .\CreaTShop-server\creatshop\target\creatshop-chat-notifications.jar
```

Lệnh dùng cấu hình `ddl-auto=update` hiện tại và sẽ tạo bảng chat khi khởi động. Nếu giữ `ddl-auto=validate`, chạy migration bên dưới trước rồi thêm `--spring.jpa.hibernate.ddl-auto=validate` vào lệnh. Các lần build bình thường sau này cần dừng JAR đang chạy trước khi đóng gói lại; không dùng JAR mặc định từ lần đóng gói thất bại.

- Khách đăng nhập, bấm nút "Nhắn tin với shop" ở góc dưới bên phải hoặc vào `/chat`. Admin vào mục "Tin nhắn" (`/admin/chat`), chọn khách và trả lời. Khách chưa đăng nhập được chuyển tới đăng nhập rồi quay lại cuộc trò chuyện.
- Tin nhắn văn bản tối đa 2.000 ký tự, lưu trong bảng `chat_messages`; lịch sử tải 50 tin/lần và có nút xem tin cũ. Mỗi khách có một cuộc trò chuyện với shop; các quản trị viên cùng dùng hộp thư chung. Không hiển thị giả trạng thái nhân viên đang online; trạng thái đọc chỉ dùng nội bộ cho tài khoản đang xem, không hiển thị dấu đã đọc cho người gửi.
- Nhận sự kiện ngay qua SSE, gửi qua POST có xác thực Bearer. Token không nằm trên URL. SSE chỉ báo có thay đổi, nội dung được đọc lại qua API có kiểm tra quyền. Ngắt mạng sẽ tự kết nối lại và lấy bù tin bị lỡ; giữ nguyên nội dung đang soạn. Gửi lại sau lỗi mạng dùng cùng mã tin để không tạo bản sao; giới hạn một tin mới/giây/người gửi trong cuộc trò chuyện.
- Chạy lại backend sau khi build để có API mới. Với cấu hình `ddl-auto=update` hiện tại, Hibernate tạo bảng mới. Nếu dùng `ddl-auto=validate`, sao lưu rồi chạy migration trên đúng database trước khi khởi động: `CreaTShop-server/creatshop/database/20261115-chat.sql` nếu chưa có bảng tin nhắn, sau đó `CreaTShop-server/creatshop/database/20261115-chat-read.sql` nếu chưa có bảng trạng thái đọc. Không chạy migration hai lần; không sửa/xóa bảng cũ. Các bài kiểm thử không chạy migration hay ghi vào database ứng dụng.
- Khi đưa qua reverse proxy, tắt buffering và caching cho `/api/v1/chat/events`, cho phép request `Authorization`, đặt read timeout ít nhất 90 giây và dùng HTTPS. "Đã kết nối" chỉ là trạng thái kết nối tới hệ thống, không phải nhân viên đang trực.
- Giới hạn hiện tại: một backend, tối đa 500 luồng SSE và 5 luồng/tài khoản; luồng được làm mới định kỳ để kiểm tra lại phiên đăng nhập. Trước khi chạy nhiều backend cần broker sự kiện dùng chung. Chưa có tệp đính kèm, thông báo hệ điều hành/Web Push khi đóng website hoặc chống lặp toast giữa nhiều tab. Mỗi tab đăng nhập dùng một kết nối SSE chung cho toàn ứng dụng.

- Khi đang ở trang khác, khách thấy huy hiệu số tin chưa đọc trên nút nhắn tin; admin thấy số cuộc trò chuyện chưa đọc ở thanh bên. Trong hộp thư admin, tên khách được in đậm và hiện số tin chưa đọc. Tiêu đề tab cũng hiện số đếm (tối đa hiển thị 99+).
- Tin đến mới có thông báo nhỏ có thể bấm để mở đúng cuộc trò chuyện. Không hiện lại thông báo cho lịch sử khi mở trang/kết nối lại, tin tự gửi hoặc cuộc trò chuyện đang xem ở cuối trong tab hiển thị. Thông báo tự hết sau 6 giây; không đưa nội dung tin nhắn vào thông báo. Âm thanh mặc định tắt; bật/tắt bằng biểu tượng loa trong màn chat, chỉ áp dụng trong phiên giao diện hiện tại.
- Chỉ xác nhận đã đọc khi phần cuối tin đến xuất hiện trong vùng cuộn và tab hiển thị trong khoảng 400 ms. Khi đang xem lịch sử, tin mới ở dưới vẫn chưa đọc; nút về tin mới nhất giúp đọc tiếp. Con trỏ đọc được lưu trong `chat_reads` theo từng tài khoản và từng khách; các tab cùng tài khoản được đồng bộ, nhưng mỗi admin có trạng thái đọc riêng. Con trỏ chỉ tiến lên tới ID đã gửi, không tự xóa tin đến đồng thời chưa nhìn thấy.

Kiểm tra an toàn, không dùng database thật:

```powershell
./scripts/test-backend.ps1
node --test CreaTShop-Client/tests/chat.test.mjs
node CreaTShop-Client/tests/chat.browser.mjs
```

Script backend chạy kiểm tra chat qua HTTP/SSE thật trên H2 riêng biệt. Bài trình duyệt cần frontend tại cổng 5173 và Playwright như hướng dẫn trên; API chat được giả lập. Nghiệm thu thực tế bằng hai trình duyệt/phiên đăng nhập khác nhau: khách gửi tin và admin trả lời mà không F5, tải lại vẫn có lịch sử; tắt/bật mạng, gửi lại sau lỗi và xác nhận không trùng; dùng khách thứ hai để kiểm tra không nhìn thấy tin của khách thứ nhất. Để admin ở màn sản phẩm và khách ở trang liên hệ rồi gửi tin hai chiều: kiểm tra huy hiệu, thông báo và mở đúng hội thoại. Xác nhận không phát thông báo khi tải lại; tab ẩn hoặc cuộn lên lịch sử không tự xóa số chưa đọc. Dùng hai admin để kiểm tra trạng thái đọc độc lập và hai tab cùng tài khoản để kiểm tra đồng bộ số đếm. Đây là bước nghiệm thu thủ công, chưa được thay thế bằng các bài giả lập.

## Tin tức và cẩm nang (15/11/2026)

- `/news` hiển thị một bài nổi bật và hai bài hướng dẫn; mỗi bài mở trang riêng tại `/news/:slug`, có mục lục và bài liên quan. Đường dẫn không tồn tại hiển thị thông báo và liên kết quay lại.
- Ba bài hướng dẫn đóng gói cùng frontend, dùng hình SVG nội bộ; chưa có CMS, ngày xuất bản hay tác giả giả lập. Chỉ bổ sung API bài viết khi có nhu cầu biên tập trong quản trị.
- Footer có liên kết thật đến cửa hàng, cẩm nang, giỏ hàng, đơn hàng, chat và liên hệ; bỏ đăng ký nhận tin chưa được triển khai.
- Kiểm tra tiếng Việt/Anh, đổi ngôn ngữ và tải lại, bàn phím, đọc bài và bố cục từ 320 đến 1920 px bằng `node CreaTShop-Client/tests/news.browser.mjs`. Cần frontend và Playwright như các bài trình duyệt khác; API được giả lập, không ghi dữ liệu vào database thật.
- Thay đổi chỉ ở frontend; không cần khởi động lại backend.

## Hỗ trợ và liên hệ (15/11/2026)

- `/contact` ưu tiên chat và tra cứu đơn, có ba câu hỏi thường gặp đóng/mở bằng bàn phím, liên kết hướng dẫn và thông tin cửa hàng gọn. Chưa thêm form yêu cầu hay cam kết phản hồi/đổi trả chưa được triển khai.
- Chỉ hành động chat dùng màu xanh. Nút chat chính nhận số chưa đọc từ kết nối dùng chung; ẩn nút chat nổi tại trang này để không che nội dung. Tài khoản quản trị đi đến hộp thư và quản lý đơn của admin, khách hàng đi đến chat và đơn của mình; khách chưa đăng nhập được chuyển qua đăng nhập.
- Chạy `node CreaTShop-Client/tests/contact.browser.mjs` với frontend và Playwright như các bài trình duyệt khác. Kiểm tra Việt/Anh, 320–1920 px, khách/khách hàng/admin, đăng nhập, FAQ, liên kết và số chưa đọc bằng API giả lập; không ghi database thật. Email, địa chỉ và giờ hỗ trợ giữ theo dữ liệu sẵn có, cần chủ cửa hàng xác nhận trước khi phát hành.

## Sau khi nghiệm thu đạt

Các đợt sửa trước đã vào `develop` qua PR #4 và #5. Đợt này tách `bugfix/footer-logo` và `bugfix/mysql-restore-isolation` từ `develop`; chỉ gộp PR khi `verify` và `mysql-regression` của cả push/PR đều thành công trên đúng commit. Chưa phát hành vào `main`.

### Chủ dự án cần nghiệm thu thủ công

- [ ] Cập nhật backend đang chạy: dừng đúng tiến trình backend cũ, kiểm tra schema/migration còn thiếu sau khi sao lưu, build và chạy bản mới với `ddl-auto=validate` theo `docs/SOCIAL_LOGIN.md`. Không chạy chồng thêm backend trên cổng 8080, không chạy lại migration đã áp dụng.
- [ ] Dùng tài khoản khách và admin riêng trên hai phiên trình duyệt, với sản phẩm thử nghiệm: đăng ký/đăng nhập, sửa hồ sơ/địa chỉ, tìm kiếm/lọc, chọn size/màu, sửa giỏ hàng, đặt COD, hủy đơn và xử lý giao hàng/thu COD. Đối chiếu tồn kho, tổng tiền và trạng thái hai phía; tải lại không được tạo trùng đơn hay trừ tồn kho lần hai.
- [ ] Giữ hai phiên khách/admin mở: gửi chat hai chiều không F5, kiểm tra huy hiệu chưa đọc, âm thanh sau tương tác cho phép phát âm thanh, mất/kết nối lại mạng, lịch sử sau tải lại và dữ liệu admin tự cập nhật sau đặt/hủy đơn. Dùng khách thứ hai để xác nhận không xem được đơn/chat của khách thứ nhất.
- [ ] Cấu hình khóa ứng dụng rồi đăng nhập Google/Facebook thật, thử từ chối quyền và tài khoản bị khóa theo `docs/SOCIAL_LOGIN.md`. Không đưa Client Secret vào frontend/Git hoặc gửi mật khẩu/token cho người hỗ trợ.
- [ ] Thực hiện các ca VNPay sandbox ở mục thanh toán: thành công, hủy, bỏ dở/hết hạn, tải lại kết quả, thông báo IPN thực và thanh toán đến sau khi hủy. Không dùng thẻ thật; đối chiếu cả trạng thái backend và tồn kho, không chỉ thông báo trình duyệt.
- [ ] Xác nhận thông tin cửa hàng/liên hệ, nội dung, ảnh sản phẩm và upload ảnh thật. Chuẩn bị tài khoản demo trong môi trường riêng; giữ mật khẩu ngoài repository và ghi mã đơn/ảnh kết quả cho kịch bản bảo vệ.
- [ ] Bật bảo vệ nhánh `main` và `develop` theo `docs/GIT_FLOW.md`; khi kiểm tra ngày 15/11/2026, API báo hai nhánh chưa có branch protection. Yêu cầu PR, hai job CI, chặn force-push và xóa nhánh; chỉ yêu cầu reviewer nếu có cộng tác viên.

Chỉ sau khi các mục nghiệm thu đạt mới tạo `release/<version>`, PR vào `main`, đồng bộ lại `develop` và gắn tag phát hành theo Git Flow. CI xanh không thay thế nghiệm thu tích hợp với dịch vụ thật.
