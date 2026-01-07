package com.example.creatshop.domain.entity;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.exception.NotFoundException;
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
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "products")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @Column(nullable = false)
    String name;

    @Column(nullable = false)
    Double price;

    @Column(nullable = false)
    String imageStaticUrl;

    @Column(nullable = false)
    String imageDynamicUrl;

    @ManyToOne
    @JoinColumn(name = "category_id")
    Category category;

    /**
     * 1 Product - N Variants
     * Luôn khởi tạo list để tránh NPE khi add.
     */
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<ProductVariant> productVariants = new ArrayList<>();

    @CreationTimestamp
    Timestamp createdAt;

    @UpdateTimestamp
    Timestamp updatedAt;

    public void addCategory(Category category) {
        if (Objects.isNull(category)) {
            throw new NotFoundException(ErrorMessage.Common.NOT_FOUND_CATEGORY);
        }
        // NOTE: giả sử Category.products đã được khởi tạo (không null)
        category.getProducts().add(this);
        this.setCategory(category);
    }

    public void addVariant(ProductVariant variant) {
        if (variant == null) return;
        this.productVariants.add(variant);
        variant.setProduct(this);
    }
}
