# Hướng dẫn chấm độ phù hợp tìm kiếm

## Bắt đầu

Mở bằng Chrome hoặc Edge file trên máy:

`backups/ai-acceptance-20261116-111819/pooled-review-20261117/review.html`

Không cần Docker hay Internet để chấm. Điền tên/mã người chấm, đọc truy vấn,
đọc thông tin sản phẩm rồi chọn điểm và ghi bằng chứng. Bộ này có 120 cặp,
8 truy vấn phát triển; không phải bộ kiểm thử độc lập. Thứ tự sản phẩm đã
xáo trộn, không hiển thị phương pháp tìm kiếm. Không mở `retrieval-runs.json`
hoặc xem nhãn AI trước khi chấm để tránh bị ảnh hưởng bởi thứ hạng/nhãn gợi ý.

## Quy tắc chấm chung

Chấm mức liên quan với nhu cầu, không chấm mức yêu thích cá nhân. Dùng tên,
danh mục, nhóm khách hàng, giá và mô tả trong snapshot làm bằng chứng.
Không suy ra chất liệu, độ êm, độ bền, chống nước hay khả năng chạy bộ chỉ từ
tên thương mại. Tên sản phẩm cũng có thể sai; nếu thông tin mâu thuẫn, ghi chú
và để trống chờ xác minh thay vì tự sửa dữ liệu.

| Điểm | Cách dùng |
| --- | --- |
| 0 | Có bằng chứng không phù hợp với yêu cầu cốt lõi, như sai nhóm khách hàng, sai loại sản phẩm hoặc vượt mức giá bắt buộc. |
| 1 | Có bằng chứng liên quan một phần, nhưng chưa đáp ứng nhu cầu chính; ghi rõ phần phù hợp và phần thiếu. |
| 2 | Phù hợp phần lớn yêu cầu, nhưng còn một điểm chưa khớp hoặc chưa có bằng chứng; ghi rõ điểm đó. |
| 3 | Có bằng chứng đáp ứng đầy đủ các yêu cầu được nêu trong truy vấn. |
| Để trống | Chưa chấm hoặc chưa đủ bằng chứng để đưa ra nhận xét có căn cứ; không đồng nghĩa với 0. |

Ví dụ minh họa quy tắc, không phải nhãn của sản phẩm trong bộ chấm:
- Với “giày tây nam dưới 700 nghìn”, giày tây nam giá 650.000 đồng có bằng
  chứng phù hợp đủ ba điều kiện có thể nhận 3; giá 750.000 vi phạm ngân sách
  bắt buộc nên nhận 0. “Dưới” được hiểu là nhỏ hơn, không bao gồm đúng ngưỡng.
- Với nhu cầu chạy bộ, chỉ có nhãn “giày thể thao” chưa chứng minh phù hợp
  chạy bộ. Chỉ chấm phần liên quan có bằng chứng, không tự cho 3.
- “Đi biển”, “đi làm”, “dễ phối đồ” cần lập luận trong ghi chú. Nếu không có
  đủ thông tin để quyết định mức liên quan thì để trống và yêu cầu xác minh.

Chấm thử 20–30 mục để phát hiện điểm mơ hồ, thống nhất quy tắc trước khi chấm
phần còn lại. Nếu đổi quy tắc, xem lại các mục đã chấm bị ảnh hưởng. Có thể chia
thành nhiều phiên. Nếu có người chấm thứ hai, họ nên chấm độc lập trên worksheet
trống, không dùng JSON của người thứ nhất; lưu riêng và phân xử bất đồng sau.
Một người chấm vẫn được báo cáo, nhưng phải ghi giới hạn chủ quan của đánh giá.

## Lưu và tiếp tục

1. Sau mỗi khoảng 10–20 mục, bấm **Tải tiến độ JSON** và giữ file vừa tải.
2. Trước khi đóng trang hoặc tải lại, tải JSON lần nữa. Không có tự động lưu
   vào ổ đĩa; việc chọn điểm trên trang không cập nhật CSV gốc.
3. Lần sau mở đúng `review.html`, chọn JSON đã lưu ở mục **Tiếp tục từ JSON
   đã tải**. Kiểm tra tên người chấm và số mục đã chấm trước khi tiếp tục.
4. Khi xong, tải cả **JSON** và **Xuất CSV**. CSV không chứa tên người chấm,
   vì vậy phải giữ JSON để lưu nguồn gốc. Không chỉnh ID, truy vấn hay các
   cột thông tin sản phẩm trong CSV.

Chỉ cần báo lại đường dẫn hai file đã tải trên máy này; không cần gửi thư mục
backups hoặc thông tin đăng nhập. Giữ các lần xuất trước để đối chiếu, không
ghi đè worksheet trống gốc.

## Sau khi nhận file chấm

Tôi sẽ kiểm tra checksum, đúng 120 cặp duy nhất, điểm 0–3, ghi chú và người
chấm; tạo workspace kết quả riêng để giữ nguyên bộ gốc. Nếu còn mục trống,
không ép thành 0. Nếu một truy vấn không có sản phẩm liên quan, công cụ hiện
tại sẽ từ chối hoàn tất; cần đánh giá no-answer riêng, không sửa điểm để chạy.

Sau khi hợp lệ mới tổng hợp Precision@5, Precision@10 và pooled NDCG@5/@10
cho keyword, semantic, hybrid. Công cụ hiện coi điểm lớn hơn 0 là relevant cho
Precision; phải nêu rõ quy ước này khi báo cáo. NDCG sử dụng độ phù hợp 0–3.
Không báo full-catalog Recall vì nhãn chỉ phủ hợp top 10 của ba phương pháp.
Ưu tiên đối chiếu các thứ hạng đã đóng băng cùng snapshot; không so với API
đang thay đổi mà không kiểm tra catalog, thứ hạng và phạm vi sản phẩm đã chấm.

Kết quả này chỉ mô tả 8 truy vấn phát triển và pool đã chọn, không chứng minh
khả năng tổng quát cho mọi truy vấn hay chất lượng gợi ý cá nhân hóa. Nhãn AI,
silver và dữ liệu tương tác demo phải báo cáo riêng, không thay thế nhãn người.
