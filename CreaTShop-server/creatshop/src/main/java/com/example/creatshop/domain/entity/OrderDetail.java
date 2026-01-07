package com.example.creatshop.domain.entity;

import com.example.creatshop.constant.OrderStatus;
import com.example.creatshop.job.state.*;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "order_details")
public class OrderDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @ManyToOne
    User user;

    @OneToMany(mappedBy = "orderDetail")
    List<OrderItem> items;

    @OneToOne(mappedBy = "orderDetail")
    @JoinColumn(name = "payment_id")
    PaymentDetail paymentDetail;

    Double total;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    OrderStatus status;

    @Transient
    OrderContext orderContext;

    @CreationTimestamp
    Timestamp createdAt;

    @UpdateTimestamp
    Timestamp updatedAt;

    @PostLoad
    public void initStatusContext() {
        if (status == null) {
            status = OrderStatus.Processing; // Nếu không có trạng thái, gán giá trị mặc định
        }
        orderContext = new OrderContext();
        orderContext.setState(OrderState.from(status));  // Khởi tạo trạng thái từ OrderStatus
    }

    public void moveToNextStatus() {
        orderContext.next();
        this.status = orderContext.getState().getStatus();
    }

    public void moveToPreviousStatus() {
        orderContext.prev();
        this.status = orderContext.getState().getStatus();
    }

    public void addItem(OrderItem orderItem) {
        if (Objects.isNull(items)) {
            items = new ArrayList<>();
        }
        items.add(orderItem);
        orderItem.setOrderDetail(this);
    }
}
