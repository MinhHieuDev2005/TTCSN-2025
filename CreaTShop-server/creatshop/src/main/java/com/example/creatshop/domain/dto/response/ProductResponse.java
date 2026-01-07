package com.example.creatshop.domain.dto.response;


import lombok.*;
import lombok.experimental.FieldDefaults;

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
    Double                       price;
    String                       imageStaticUrl;
    String                       imageDynamicUrl;
    List<ProductVariantResponse> variants;
}
