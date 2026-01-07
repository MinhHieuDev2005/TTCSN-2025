package com.example.creatshop.domain.mapper;


import com.example.creatshop.domain.dto.request.ProductRequest;
import com.example.creatshop.domain.dto.response.ProductResponse;
import com.example.creatshop.domain.entity.Product;
import org.mapstruct.*;

@Mapper(componentModel = "spring",  nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProductMapper {
    ProductResponse toProductResponse(Product product);

    @Mapping(target = "productVariants", ignore = true)
    Product toProduct(ProductRequest request);

    void updateProduct(ProductRequest request, @MappingTarget Product product);
}
