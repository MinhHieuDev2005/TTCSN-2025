# Đánh giá AI trên danh mục hiện tại — 20/11/2026

## Nguồn gốc và phạm vi

Đã gọi API chỉ đọc qua bản 15173, chụp danh mục 149 sản phẩm và chạy lại
8 truy vấn phát triển bằng keyword, semantic và hybrid. Mỗi phương pháp
lấy tối đa 10 kết quả; hợp các kết quả thành 120 cặp truy vấn–sản phẩm.
Không sửa sản phẩm, mô tả, đơn hàng, hành vi hay cấu hình dịch vụ.

Toàn bộ 120 cặp và các trường dùng chấm (truy vấn, tên, danh mục, nhóm
khách hàng, giá, mô tả) trùng khớp bộ nhãn AI trước đó. Vì vậy tái sử dụng
nhãn có lý do đã lưu; đây không phải một lượt chấm độc lập mới.
Có 110 cặp được gán điểm và 10 cặp chưa đủ căn cứ.

**Người chấm thật: 0. Nhãn do AI mô phỏng đánh giá, không phải khảo sát
người dùng.** Trợ lý cũng tham gia triển khai hệ thống nên không độc lập.
Không xem ảnh, không thử sản phẩm; không xác nhận công dụng chỉ từ tên.
Không thay phiếu chấm người thật bằng nhãn AI.

## Thang điểm

- 0: sai điều kiện cốt lõi theo thông tin hiện có.
- 1: phù hợp một phần, thiếu bằng chứng cho công dụng/dịp sử dụng.
- 2: phần lớn phù hợp; bộ nhãn hiện tại không có điểm này.
- 3: đáp ứng các yêu cầu theo thông tin catalog, không bảo đảm chất lượng thực tế.
- null: thiếu căn cứ hoặc dữ liệu mâu thuẫn; không ép về 0.

## Kết quả

Macro-average trên 8 truy vấn. Mẫu số là K kể cả khi trả về ít hơn K.
Các khoảng là biên do nhãn null, không phải khoảng tin cậy thống kê.
Liên quan một phần tính điểm >= 1; đáp ứng đầy đủ chỉ tính điểm 3.

| Phương pháp | P@5 liên quan | P@10 liên quan | P@5 đầy đủ | P@10 đầy đủ |
| --- | --- | --- | --- | --- |
| Keyword | 0.8000–0.8750 | 0.6125–0.6875 | 0.4750–0.5500 | 0.3500–0.4250 |
| Semantic | 0.8250–0.8500 | 0.6750–0.7375 | 0.4750–0.5000 | 0.3500–0.4125 |
| Hybrid | 0.8250–0.8500 | 0.6875–0.7500 | 0.4750–0.5000 | 0.3500–0.4125 |

Pooled NDCG chỉ tính trên cùng 5 truy vấn có nhãn đầy đủ và gain dương;
IDCG tính trong pool, không phải toàn danh mục:

| Phương pháp | NDCG@5 | NDCG@10 |
| --- | --- | --- |
| Keyword | 0.9322 | 0.8838 |
| Semantic | 0.9106 | 0.8850 |
| Hybrid | 0.9106 | 0.8989 |

Hybrid có biên dưới P@10 liên quan cao nhất trong mẫu này, nhưng mức đáp
ứng đầy đủ chưa tốt hơn hai phương pháp còn lại. Không kết luận thắng có
ý nghĩa thống kê, không diễn giải P@10 liên quan là tỷ lệ khách hài lòng.
Không tính recall toàn catalog hoặc đánh giá chất lượng gợi ý cá nhân hóa
từ phép đo tìm kiếm này. Đây là truy vấn phát triển, không phải held-out.

## Bằng chứng cụ thể và việc cần cải thiện

- Giày nữ được tìm cho nhu cầu đi làm: nhiều sản phẩm đúng nhóm nhưng
  thiếu mô tả công dụng, nên chỉ điểm 1, không mặc định phù hợp đi làm.
- Dép đi biển: đúng loại và giá chưa đủ chứng minh dùng được ở biển.
- Sản phẩm 123 có tên giày thể thao nhưng danh mục Dép: giữ chưa xác định.
- Các thuộc tính độ êm, chạy bộ, dễ phối đồ cần thông tin đáng tin cậy;
  không tự thêm vào dữ liệu thật để làm điểm đánh giá đẹp hơn.
- Sau khi chủ cửa hàng xác nhận và bổ sung metadata, phải tạo snapshot mới
  và đánh giá lại; không dùng nguyên nhãn này cho dữ liệu đã thay đổi.

## Tái lập

Trong `docs/experiments/search-ai-current-20261120/` có catalog lấy từ API
sản phẩm công khai, danh sách kết quả, phiếu trống, nhãn AI kèm lý do,
metrics và SHA256. Không có dữ liệu tài khoản hay đơn hàng.

```powershell
py -3.11 -m unittest discover -s CreaTShop-ai -p test_frozen.py
py -3.11 CreaTShop-ai/evaluate_frozen.py docs/experiments/search-ai-current-20261120 docs/experiments/search-ai-current-20261120/ai-assessments.json backups/current-ai-recomputed.json
```

Lệnh thứ hai yêu cầu đường dẫn output chưa tồn tại, tránh ghi đè kết quả.
Nguồn máy đọc luôn giữ `humanReviewed: false`, `humanReviewCount: 0`.

Câu có thể dùng trong báo cáo: “Đồ án thực hiện đánh giá sơ bộ có hỗ trợ
bởi AI trên danh mục thực tế; kết quả chưa thay thế đánh giá độc lập của
người dùng. Chất lượng tìm kiếm còn bị giới hạn bởi metadata sản phẩm.”
