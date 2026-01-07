package com.example.creatshop.domain.dto.response;


import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductVariantResponse {
    Integer id;
    String  name;
    String  color;
    String  size;
    Integer quantity;
    String  imageUrl;
}
