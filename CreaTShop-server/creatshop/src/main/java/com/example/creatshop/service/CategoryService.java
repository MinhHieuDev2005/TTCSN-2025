package com.example.creatshop.service;

import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.CategoryRequest;
import com.example.creatshop.domain.dto.response.CategoryResponse;
import com.example.creatshop.domain.dto.response.CategoryTypeResponse;

import java.util.List;

public interface CategoryService {
    GlobalResponse<Meta, CategoryResponse> createCategory(CategoryRequest request);

    GlobalResponse<Meta, CategoryResponse> updateCategory(Integer id, CategoryRequest request);

    GlobalResponse<Meta, String> deleteCategory(Integer cateId);

    GlobalResponse<Meta, List<CategoryTypeResponse>> getAllCategories();

    GlobalResponse<Meta, CategoryResponse> getCategory(Integer id);
}
