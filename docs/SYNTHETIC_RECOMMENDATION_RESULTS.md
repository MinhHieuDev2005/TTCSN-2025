# Thực nghiệm gợi ý trên dữ liệu tổng hợp

## Thiết kế và nguồn gốc

Thực nghiệm ngày 20/11/2026 dùng 48 sản phẩm và 48 người dùng **hoàn toàn tổng
hợp**, seed 20261120, không lấy hồ sơ hoặc đơn hàng khách hàng thật. Bốn nhóm
sản phẩm mô phỏng: giày nam chạy bộ, giày nữ công sở, sandal nam và bốt nữ.
Mỗi nhóm 12 sản phẩm, một sản phẩm hết hàng: 44 ứng viên còn hàng chung cho
hai phương pháp. Có 40 hồ sơ có lịch sử và 8 hồ sơ cold-start.

Ngày chốt là 01/11/2026. VIEW ở ngày -2, DELIVERED ở ngày -20 và CART là
snapshot ngày 0. Hai mục tiêu mô phỏng/người dùng ở ngày +7, khác sản phẩm
lịch sử và còn hàng tại cutoff. Nhãn tương lai được tạo theo cùng nhóm sở
thích; đây là giả định của bộ sinh, không phải hành vi mua quan sát được.
Sản phẩm đã xem/mua vẫn nằm trong ứng viên, khớp hành vi hệ thống hiện tại.

Embedding được tính thật bằng multilingual-e5-small, revision
`614241f622f53c4eeff9890bdc4f31cfecc418b3`, 384 chiều, passage prefix và
normalization từ container model thử nghiệm. Không ghi database.
Phần xếp hạng là chương trình tham chiếu offline của công thức đang dùng:
VIEW mới nhất mỗi sản phẩm có trọng số exp(-days/30) trong 90 ngày;
cart cộng 3, sản phẩm trong đơn đã giao cộng 5 trong 180 ngày.
Profile là tổng vector có trọng số; xếp theo cosine, hòa điểm theo ID giảm dần.
Baseline popularity đếm đơn giao tổng hợp trong 90 ngày trước cutoff.
Không dùng nhãn held-out để tạo profile hoặc popularity, không chỉnh tham số
sau khi xem kết quả. **Không phải gọi live recommendation API để du hành thời
gian**; tính đúng chức năng backend được kiểm tra riêng bằng H2/HTTP/E2E.

## Kết quả

Macro-average trên 40 hồ sơ có lịch sử, relevant là hai mục tiêu tổng hợp:

| Phương pháp | P@5 | Recall@5 | NDCG@5 | P@10 | Recall@10 | NDCG@10 |
| --- | --- | --- | --- | --- | --- | --- |
| Cá nhân hóa | 0.1550 | 0.3875 | 0.2444 | 0.1775 | 0.8875 | 0.4403 |
| Popularity | 0.0350 | 0.0875 | 0.0652 | 0.0525 | 0.2625 | 0.1320 |

Với 8 hồ sơ cold-start, cá nhân hóa trở về popularity: hai phương pháp cùng
P@5/Recall@5/NDCG@5 bằng 0; P@10 = 0.0375, Recall@10 = 0.1875,
NDCG@10 = 0.0665. Không che kết quả kém của cold-start. Bộ sinh hiện đặt
cold-start ở nhóm cuối, phân bố khác cohort có lịch sử; không dùng khác biệt
hai cohort để kết luận tác động cold-start một cách có kiểm soát.

## Giới hạn diễn giải

Cá nhân hóa tốt hơn popularity **trong mô phỏng này**. Sở thích và target được
sinh theo nhóm sản phẩm, nên thiết kế thuận lợi cho content-based matching.
Không suy ra tăng doanh thu, tỷ lệ mua, mức hài lòng hoặc hiệu quả người thật.
Recall tính được vì toàn bộ universe 44 ứng viên được gán nhãn tổng hợp,
khác bộ search pooled không có full-catalog Recall. Không báo ý nghĩa thống
kê hay coi số lượng người dùng giả là cỡ mẫu người dùng thực.

Giá trị của thực nghiệm: xác nhận một giả thuyết mô phỏng có thể tái lập,
so sánh cùng ứng viên/baseline, chỉ ra giới hạn cold-start; không thay thế
đánh giá độc lập trên lịch sử thật có timestamp giao hàng đáng tin cậy.

## Tái lập

Artifacts an toàn để bàn giao nằm trong
`docs/experiments/recommendation-synthetic-20261120/`: dataset, vectors,
results từng người dùng và checksum. Không có PII hay thông tin đăng nhập.
Unit check tính lại kết quả từ vectors đã đóng băng, không cần Docker:

```powershell
py -3.11 -m unittest discover -s CreaTShop-ai -p 'test_*.py'
```

Muốn tạo một lượt embedding thật mới, cần container model
`creatshop-docker-test-embeddings-1` đang chạy với đúng project label:

```powershell
py -3.11 CreaTShop-ai/benchmark_recommendations.py backups/new-synthetic-run
```

Output phải chưa tồn tại. Float có thể khác rất nhỏ giữa runtime/phần cứng;
so sánh run mới phải lưu phiên bản môi trường, không hứa bit-identical.
