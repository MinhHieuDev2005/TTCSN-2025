package com.example.creatshop.domain.mapper;

import com.example.creatshop.domain.dto.response.OrderDetailResponse;
import com.example.creatshop.domain.entity.OrderDetail;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface OrderDetailMapper {
    @Mapping(target = "user", ignore = true)
    OrderDetailResponse toOrderDetailResponse(OrderDetail orderDetail);
}
