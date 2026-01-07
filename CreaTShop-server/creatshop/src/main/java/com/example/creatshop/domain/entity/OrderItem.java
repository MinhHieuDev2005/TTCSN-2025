package com.example.creatshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Objects;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "order_item")
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @ManyToOne
    @JoinColumn(name = "order_id")
    OrderDetail orderDetail;

    @ManyToOne
    @JoinColumn(name = "product_id")
    Product product;

    @ManyToOne
    @JoinColumn(name = "product_variant")
    ProductVariant variant;

    Integer quantity;

    @CreationTimestamp
    Timestamp createdAt;

    @UpdateTimestamp
    Timestamp updatedAt;

    public void addOrderDetail(OrderDetail orderDetail) {
        if (Objects.isNull(this.orderDetail)) {
            setOrderDetail(orderDetail);
        }

        if (Objects.isNull(orderDetail.getItems())) {
            orderDetail.setItems(new ArrayList<>());
            orderDetail.getItems().add(this);
        }
        else {
            orderDetail.getItems().add(this);
        }
    }
}
