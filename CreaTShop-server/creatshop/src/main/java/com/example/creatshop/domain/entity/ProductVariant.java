package com.example.creatshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Objects;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "product_info")
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @Column(nullable = false)
    String color;

    String name;

    String size;

    Integer quantity;

    String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    Product product;

    @CreationTimestamp
    Timestamp createdAt;

    @UpdateTimestamp
    Timestamp updatedAt;

    /**
     * Giữ method cũ để tương thích, nhưng phải null-safe.
     * Khuyến nghị: dùng product.addVariant(variant) từ phía Product.
     */
    public void addProduct(Product product) {
        if (Objects.isNull(product)) return;

        this.setProduct(product);

        if (product.getProductVariants() == null) {
            product.setProductVariants(new ArrayList<>());
        }
        product.getProductVariants().add(this);
    }
}
