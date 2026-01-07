package com.example.creatshop.domain.mapper;


import com.example.creatshop.domain.dto.response.OrderItemResponse;
import com.example.creatshop.domain.entity.OrderItem;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface OrderItemMapper {
    OrderItemResponse toOrderItemResponse(OrderItem orderItem);
}
