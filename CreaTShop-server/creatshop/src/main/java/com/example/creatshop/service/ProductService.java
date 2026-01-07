package com.example.creatshop.service;

import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.ProductRequest;
import com.example.creatshop.domain.dto.response.ProductResponse;

import java.util.List;

public interface ProductService {
    GlobalResponse<Meta, ProductResponse> createProduct(ProductRequest request);

    GlobalResponse<Meta, List<ProductResponse>> getProducts();

    GlobalResponse<Meta, ProductResponse> getProduct(Integer id);

    GlobalResponse<Meta, ProductResponse> updateProduct(Integer id, ProductRequest request);

    GlobalResponse<Meta, String> deleteProduct(Integer id);
}
