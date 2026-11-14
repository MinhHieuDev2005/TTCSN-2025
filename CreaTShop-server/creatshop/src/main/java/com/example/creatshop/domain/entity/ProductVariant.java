package com.example.creatshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.DynamicUpdate;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Objects;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "product_info", uniqueConstraints = @UniqueConstraint(
        name = "uk_product_color_size", columnNames = {"product_id", "color", "size"}))
@DynamicUpdate
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @Column(nullable = false)
    String color;

    String name;

    @Column(nullable = false)
    String size;

    Integer quantity;

    String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    Product product;

    @CreationTimestamp
    Timestamp createdAt;

    @UpdateTimestamp
    Timestamp updatedAt;

    @PrePersist
    @PreUpdate
    public void normalizeAttributes() {
        if (color == null || color.isBlank() || size == null || size.isBlank()) {
            throw new IllegalArgumentException("Variant color and size are required");
        }
        color = color.trim().toLowerCase(java.util.Locale.ROOT);
        size = size.trim().toUpperCase(java.util.Locale.ROOT);
    }

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
