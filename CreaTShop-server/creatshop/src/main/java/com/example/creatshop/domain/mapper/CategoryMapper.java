package com.example.creatshop.domain.mapper;


import com.example.creatshop.domain.dto.request.CategoryRequest;
import com.example.creatshop.domain.dto.response.CategoryResponse;
import com.example.creatshop.domain.entity.Category;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface CategoryMapper {
    @Mapping(target = "type", ignore = true)
    Category toCategory(CategoryRequest request);

    @Mapping(target = "products", ignore = true)
    CategoryResponse toCategoryResponse(Category category);

    @Mapping(target = "type", ignore = true)
    void updateCategory(CategoryRequest request, @MappingTarget Category category);
}
