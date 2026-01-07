package com.example.creatshop.domain.mapper;

import com.example.creatshop.domain.dto.request.ProductVariantRequest;
import com.example.creatshop.domain.dto.response.ProductVariantResponse;
import com.example.creatshop.domain.entity.ProductVariant;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProductVariantMapper {
    ProductVariant toProductVariant(ProductVariantRequest request);
    ProductVariantResponse toProductVariantResponse(ProductVariant productVariant);
    void updateProductVariant(ProductVariantRequest request, @MappingTarget ProductVariant variant);
}
