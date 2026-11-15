package com.example.creatshop.domain.dto.response;


import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductResponse {
    Integer                      id;
    String                       name;
    BigDecimal                       price;
    Integer                      categoryId;
    String                       imageStaticUrl;
    String                       imageDynamicUrl;
    List<ProductVariantResponse> variants;
}
