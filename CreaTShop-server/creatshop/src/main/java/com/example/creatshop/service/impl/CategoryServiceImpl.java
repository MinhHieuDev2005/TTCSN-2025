package com.example.creatshop.service.impl;


import com.example.creatshop.constant.CategoryType;
import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.CategoryRequest;
import com.example.creatshop.domain.dto.response.CategoryResponse;
import com.example.creatshop.domain.dto.response.CategoryTypeResponse;
import com.example.creatshop.domain.entity.Category;
import com.example.creatshop.domain.mapper.CategoryMapper;
import com.example.creatshop.domain.mapper.ProductMapper;
import com.example.creatshop.exception.AlreadyExistsException;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.exception.SQLUniqueException;
import com.example.creatshop.repository.CategoryRepository;
import com.example.creatshop.repository.ProductRepository;
import com.example.creatshop.service.CategoryService;
import com.example.creatshop.service.CategoryCache;
import com.example.creatshop.util.EnumUtils;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Log4j2
public class CategoryServiceImpl implements CategoryService {
    CategoryRepository categoryRepository;
    ProductRepository  productRepository;
    CategoryMapper     categoryMapper;
    ProductMapper      productMapper;
    EnumUtils          enumUtils;
    ObjectProvider<CategoryCache> categoryCache;
    ApplicationEventPublisher events;

    @Transactional
    @Override
    public GlobalResponse<Meta, CategoryResponse> createCategory(CategoryRequest request) {
        validateCategory(request, null);

        Category category = categoryMapper.toCategory(request);
        category.setType(enumUtils.fromString(request.getType()));

        Category savedCategory = null;

        try {
            savedCategory = categoryRepository.save(category);
        }catch (DataIntegrityViolationException ex) {
            throw new SQLUniqueException(ErrorMessage.Common.ALREADY_EXIST_NAME);
        }

        CategoryResponse response = categoryMapper.toCategoryResponse(savedCategory);
        events.publishEvent(new CategoryCache.Changed());

        return GlobalResponse.<Meta, CategoryResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Transactional
    @Override
    public GlobalResponse<Meta, CategoryResponse> updateCategory(Integer id, CategoryRequest request) {
        Category category = categoryRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Category.NOT_FOUND_BY_ID));
        validateCategory(request, id);

        categoryMapper.updateCategory(request, category);

        if (StringUtils.hasText(request.getType())) {
            category.setType(enumUtils.fromString(request.getType()));
        }

        category = categoryRepository.save(category);

        CategoryResponse response = categoryMapper.toCategoryResponse(category);
        response.setProductCount(productRepository.countByCategoryId(category.getId()));
        events.publishEvent(new CategoryCache.Changed());

        return GlobalResponse.<Meta, CategoryResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Transactional
    @Override
    public GlobalResponse<Meta, String> deleteCategory(Integer cateId) {
        Category category = categoryRepository.findByIdForUpdate(cateId)
                                              .orElseThrow(() -> new NotFoundException(ErrorMessage.Category.NOT_FOUND_BY_ID));

        if (productRepository.existsByCategoryId(cateId)) {
            throw new BadRequestException("exception.category.in-use");
        }
        categoryRepository.delete(category);
        events.publishEvent(new CategoryCache.Changed());

        return GlobalResponse.<Meta, String>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data("Delete Category Success")
                             .build();
    }

    @Override
    public GlobalResponse<Meta, List<CategoryTypeResponse>> getAllCategories() {
        CategoryCache cache = categoryCache.getIfAvailable();
        return GlobalResponse.<Meta, List<CategoryTypeResponse>>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(cache == null ? loadCategories() : cache.get(this::loadCategories))
                             .build();
    }

    private List<CategoryTypeResponse> loadCategories() {
        List<Category> categories = categoryRepository.findAll();

        Map<CategoryType, List<Category>> categoriesGroupedByType = categories.stream()
                                                                              .collect(Collectors.groupingBy(Category::getType));
        List<CategoryTypeResponse> responses = new ArrayList<>();

        categoriesGroupedByType.forEach((type, catList) -> {
            List<CategoryResponse> categoryResponses = catList.stream()
                                                              .map(category -> {
                                                                  CategoryResponse response = categoryMapper.toCategoryResponse(category);
                                                                  response.setProductCount(productRepository.countByCategoryId(category.getId()));
                                                                  return response;
                                                              })
                                                              .collect(Collectors.toList());

            responses.add(new CategoryTypeResponse(type.name(), categoryResponses));
        });

        return responses;
    }

    @Override
    public GlobalResponse<Meta, CategoryResponse> getCategory(Integer id) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new NotFoundException(ErrorMessage.Category.NOT_FOUND_BY_ID));

        CategoryResponse response = categoryMapper.toCategoryResponse(category);
        response.setProductCount(productRepository.countByCategoryId(category.getId()));
        response.setProducts(category.getProducts().stream().map(productMapper::toProductResponse).collect(Collectors.toList()));

        return GlobalResponse.<Meta, CategoryResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }
    private void validateCategory(CategoryRequest request, Integer currentId) {
        if (!StringUtils.hasText(request.getName()) || request.getName().trim().length() > 255) {
            throw new BadRequestException(ErrorMessage.Validate.ERR_CATEGORY_NAME_NOT_EMPTY);
        }
        request.setName(request.getName().trim());
        if (!StringUtils.hasText(request.getType()) || enumUtils.isValidCategoryValue(request.getType())) {
            throw new BadRequestException(ErrorMessage.Category.NOT_FOUND_TYPE);
        }
        request.setType(enumUtils.fromString(request.getType()).name());
        if (categoryRepository.findAll().stream().anyMatch(category -> !category.getId().equals(currentId)
                && category.getName().trim().equalsIgnoreCase(request.getName())
                && category.getType().name().equals(request.getType()))) {
            throw new AlreadyExistsException(ErrorMessage.Category.EXISTS_BY_NAME);
        }
    }

}
