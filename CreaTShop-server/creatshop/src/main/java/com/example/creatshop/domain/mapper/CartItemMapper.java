package com.example.creatshop.domain.mapper;

import com.example.creatshop.domain.dto.request.CartItemRequest;
import com.example.creatshop.domain.dto.response.CartItemResponse;
import com.example.creatshop.domain.entity.Cart;
import com.example.creatshop.domain.entity.CartItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface CartItemMapper {

    CartItemResponse toCartItemResponse(CartItem cartItem);

    CartItem toCartItem(CartItemRequest request);

    void updateCartItem(CartItemRequest request, @MappingTarget CartItem cartItem);
}
