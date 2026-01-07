package com.example.creatshop.domain.dto.response;

import com.example.creatshop.domain.entity.CartItem;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CartResponse {
    Integer id;
    Double cartTotal;
    List<CartItemResponse> cartItemResponses;
}
