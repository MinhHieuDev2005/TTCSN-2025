# Kết quả đánh giá tìm kiếm với nhãn AI — 20/11/2026

## Phương pháp và nguồn gốc

Đã xử lý toàn bộ 120 cặp truy vấn–sản phẩm của bộ pooled-review-20261117,
gồm 8 truy vấn phát triển và hợp top 10 của keyword, semantic, hybrid.
Nhãn do trợ lý Codex đánh giá từ tên, danh mục, nhóm khách hàng, giá và mô tả
trong snapshot. Đây là đánh giá AI-assisted/silver, **không phải đánh giá người
dùng hoặc người chấm độc lập**. Cùng trợ lý đã tham gia xây dựng hệ thống;
không có hội đồng chấm, thẩm định ảnh hay mô hình giám khảo độc lập.

Không gọi API tìm kiếm hiện tại để tính điểm: dùng thứ hạng đóng băng ngày
17/11/2026, kiểm tra checksum catalog, worksheet, query và hợp sản phẩm.
Không sửa worksheet người chấm, metadata, vector hoặc cơ sở dữ liệu.
Các nhận xét được gán theo thông tin sản phẩm trước khi đọc thứ hạng đóng băng
trong phiên này; điều đó không tạo ra bảo đảm chấm mù độc lập.

Quy ước: 0 sai điều kiện cốt lõi; 1 khớp một phần có bằng chứng nhưng thiếu
bằng chứng công dụng; 2 phần lớn phù hợp; 3 đáp ứng yêu cầu theo catalog;
null thiếu thông tin/mâu thuẫn. Từ “dưới” được hiểu nhỏ hơn ngưỡng giá.
Không tự suy ra chống nước, độ êm, chạy bộ hay dễ phối đồ từ tên thương mại.

Phân bố: 39 điểm 0, 35 điểm 1, 0 điểm 2, 36 điểm 3, **10 mục chưa xác định**.
Không gán 0 cho mục chưa xác định và không gửi nhãn AI qua human-finalizer.

## So sánh thứ hạng đã lưu

Precision coi điểm > 0 là có liên quan, bao gồm cả khớp một phần. Khoảng dưới
và trên là biên khi các mục null trong top K lần lượt không/có liên quan;
**không phải khoảng tin cậy thống kê**. Mẫu số là K kể cả trả về ít hơn K.
Macro-average trên cùng 8 truy vấn:

| Phương pháp | P@5: biên dưới–trên | P@10: biên dưới–trên |
| --- | --- | --- |
| Keyword | 0.8000–0.8750 | 0.6125–0.6875 |
| Semantic | 0.8250–0.8500 | 0.6750–0.7375 |
| Hybrid | 0.8250–0.8500 | 0.6875–0.7500 |

Pooled NDCG dùng gain `2^grade - 1`, chỉ trên 5 truy vấn có pool được chấm đủ
và có gain dương: h01, h02, h03, h04, h07. Loại toàn bộ h05, h06, h08 khỏi
NDCG ở cả ba phương pháp để không thiên lệch do mẫu khác nhau. IDCG chỉ lấy
từ pool đã chấm, không phải toàn bộ 149 sản phẩm:

| Phương pháp | Pooled NDCG@5 | Pooled NDCG@10 | Số truy vấn |
| --- | --- | --- | --- |
| Keyword | 0.9322 | 0.8838 | 5 |
| Semantic | 0.9106 | 0.8850 | 5 |
| Hybrid | 0.9106 | 0.8989 | 5 |

## Diễn giải và hạn chế

Hybrid có biên dưới P@10 và pooled NDCG@10 cao nhất trong phép đo này,
nhưng không đứng đầu NDCG@5. Các biên Precision chồng lấn; không kết luận
hybrid thắng có ý nghĩa thống kê hoặc tổng quát tốt hơn từ 8 truy vấn.
Điểm cao không đồng nghĩa sản phẩm đáp ứng đủ nhu cầu: h01 và h02 chỉ có
điểm liên quan một phần, nhưng NDCG vẫn có thể cao khi mọi gain dương trong
pool bằng nhau. P@K với ngưỡng > 0 cũng khá dễ đạt; không gọi là tỷ lệ đáp ứng
đầy đủ yêu cầu. Không tinh chỉnh hệ thống theo nhãn này rồi gọi là held-out.

Các vấn đề dữ liệu được bộc lộ:
- Thiếu bằng chứng cho “đi làm”, “đi biển”, “đi chơi”, “dễ phối đồ”.
- Sản phẩm 123 có tên giày thể thao nhưng danh mục Dép, được để null.
- Một số giày tập đi có tên gợi thể thao nhưng chưa đủ bằng chứng phân loại;
  không mặc định mọi giày bé gái đều là giày thể thao.
- Nhãn danh mục Giày Tập Đi hỗ trợ đánh giá liên quan, không chứng minh đặc
  tính an toàn, độ tuổi/size phù hợp hoặc khuyến nghị y khoa cho trẻ.

Không báo full-catalog Recall, độ chính xác người dùng thật hay chất lượng
gợi ý cá nhân hóa. Lịch sử đơn giao trước đó chỉ từ một người dùng; tương tác
scripted chỉ kiểm tra luồng. Không bổ sung số liệu giả để lấp thiếu dữ liệu.

## Tái chạy và tài liệu chi tiết

```powershell
$pool = 'backups/ai-acceptance-20261116-111819/pooled-review-20261117'
$review = "$pool/ai-review-20261120"
py -3.11 CreaTShop-ai/evaluate_frozen.py $pool "$review/ai-assessments.json" "$review/metrics-rerun.json"
py -3.11 -m unittest discover -s CreaTShop-ai -p 'test_*.py'
```

Output phải là file mới, công cụ không ghi đè. Chạy không cần Docker, model
hay Internet. Nhãn AI là nhận xét đã lưu của phiên này, không phải công cụ tự
gọi một LLM để tạo lại nhãn khi chạy evaluator. JSON/CSV có lý do cho từng mục
và metrics.json có kết quả từng truy vấn, checksum đầu vào trong thư mục review.
Không công khai thư mục backups cha vì chứa dữ liệu khách hàng và bí mật.

Kiểm tra sau thay đổi: 20 Python tests đạt, bao gồm biên Precision, unknown,
pool thiếu/ID trùng, dữ liệu bị thay đổi và luồng đánh giá frozen end-to-end.
Ở phiên đánh giá offline đầu ngày 20/11/2026, Docker Engine chưa khả dụng nên
chưa chạy live. Phiên nghiệm thu tiếp theo cùng ngày đã khởi động Docker riêng
và chạy lại API/browser thành công; xem `docs/ACCEPTANCE_20261120.md`.
Kết quả chức năng mới đó vẫn tách khỏi điểm relevance trong tài liệu này.

Đoạn có thể dùng trong báo cáo: “Đề tài thực hiện đánh giá thăm dò tìm kiếm
trên 8 truy vấn phát triển với 120 cặp sản phẩm được trợ lý AI nhận xét theo
thông tin catalog. Kết quả được báo cáo riêng với nhãn AI-assisted, bảo lưu
10 cặp chưa đủ bằng chứng. So sánh phản ánh thứ hạng của snapshot thử nghiệm,
chưa thay thế đánh giá độc lập của con người hoặc kiểm thử trên người dùng thật.”
