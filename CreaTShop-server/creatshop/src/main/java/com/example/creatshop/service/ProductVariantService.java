package com.example.creatshop.service;

import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.ProductVariantRequest;
import com.example.creatshop.domain.dto.response.ProductVariantResponse;

import java.util.List;

public interface ProductVariantService {
    GlobalResponse<Meta, ProductVariantResponse> createVariant(Integer id, ProductVariantRequest request);

    GlobalResponse<Meta, List<ProductVariantResponse>> getVariantByProductId(Integer id);

    GlobalResponse<Meta, List<ProductVariantResponse>> getVariant();

    GlobalResponse<Meta, ProductVariantResponse> getVariant(Integer id);

    GlobalResponse<Meta, ProductVariantResponse> updateVariant(Integer id, ProductVariantRequest request);

    GlobalResponse<Meta, String> deleteVariant(Integer id);
}
