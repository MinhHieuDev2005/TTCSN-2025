package com.example.creatshop.domain.dto.response;

import com.example.creatshop.domain.entity.ProductVariant;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.sql.Timestamp;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderItemResponse {
    Integer                id;
    Integer                quantity;
    ProductResponse        product;
    ProductVariantResponse variant;
    Timestamp              createdAt;
    Timestamp              updatedAt;
}
