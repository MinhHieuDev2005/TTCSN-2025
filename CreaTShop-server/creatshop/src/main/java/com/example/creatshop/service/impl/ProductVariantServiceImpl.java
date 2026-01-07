package com.example.creatshop.service.impl;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.ProductVariantRequest;
import com.example.creatshop.domain.dto.response.ProductVariantResponse;
import com.example.creatshop.domain.entity.Product;
import com.example.creatshop.domain.entity.ProductVariant;
import com.example.creatshop.domain.mapper.ProductVariantMapper;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.exception.UploadFileException;
import com.example.creatshop.repository.ProductRepository;
import com.example.creatshop.repository.ProductVariantRepository;
import com.example.creatshop.service.ProductVariantService;
import com.example.creatshop.util.CloudinaryUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Log4j2
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductVariantServiceImpl implements ProductVariantService {
    ProductRepository        productRepository;
    ProductVariantRepository variantRepository;
    ProductVariantMapper     variantMapper;
    CloudinaryUtils          cloudinaryUtils;

    @Override
    public GlobalResponse<Meta, ProductVariantResponse> createVariant(Integer id, ProductVariantRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));

        ProductVariant variant = variantMapper.toProductVariant(request);
        variant.setName(product.getName());

        // ✅ gắn quan hệ theo hướng Product để tránh NPE
        product.addVariant(variant);

        try {
            variant.setImageUrl(cloudinaryUtils.getUrlFromFile(request.getImage()));
        } catch (Exception ex) {
            throw new UploadFileException(ErrorMessage.Product.ERR_FILE_UPLOAD);
        }

        variantRepository.save(variant);

        ProductVariantResponse response = variantMapper.toProductVariantResponse(variant);

        return GlobalResponse.<Meta, ProductVariantResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response).build();
    }

    @Override
    public GlobalResponse<Meta, List<ProductVariantResponse>> getVariantByProductId(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));
        List<ProductVariant> list = variantRepository.findAllByProduct(product);
        List<ProductVariantResponse> responses = new ArrayList<>();

        for (var item : list) {
            responses.add(variantMapper.toProductVariantResponse(item));
        }

        return GlobalResponse.<Meta, List<ProductVariantResponse>>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(responses)
                .build();
    }

    @Override
    public GlobalResponse<Meta, List<ProductVariantResponse>> getVariant() {
        List<ProductVariant> list = variantRepository.findAll();
        List<ProductVariantResponse> responses = new ArrayList<>();
        for (var item : list) {
            responses.add(variantMapper.toProductVariantResponse(item));
        }

        return GlobalResponse.<Meta, List<ProductVariantResponse>>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(responses)
                .build();
    }

    @Override
    public GlobalResponse<Meta, ProductVariantResponse> getVariant(Integer id) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.ProductVariant.NOT_FOUND_BY_ID));

        return GlobalResponse.<Meta, ProductVariantResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(variantMapper.toProductVariantResponse(variant))
                .build();
    }

    @Override
    public GlobalResponse<Meta, ProductVariantResponse> updateVariant(Integer id, ProductVariantRequest request) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.ProductVariant.NOT_FOUND_BY_ID));

        variantMapper.updateProductVariant(request, variant);

        if (!Objects.isNull(request.getImage())) {
            try {
                variant.setImageUrl(cloudinaryUtils.getUrlFromFile(request.getImage()));
            } catch (Exception ex) {
                throw new UploadFileException(ErrorMessage.Product.ERR_FILE_UPLOAD);
            }
        }

        variant = variantRepository.save(variant);

        return GlobalResponse.<Meta, ProductVariantResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(variantMapper.toProductVariantResponse(variant))
                .build();
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, String> deleteVariant(Integer id) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.ProductVariant.NOT_FOUND_BY_ID));

        Product product = variant.getProduct(); // cần mapping ManyToOne từ variant -> product

        // ✅ XÓA THẬT SỰ
        variantRepository.delete(variant);

        // Nếu repository của bạn extends JpaRepository thì có flush()
        // (để đảm bảo count chuẩn ngay trong transaction)
        variantRepository.flush();

        // ✅ Nếu đây là variant cuối cùng -> xóa luôn product
        if (product != null) {
            long remaining = variantRepository.countByProduct(product);
            if (remaining == 0) {
                productRepository.delete(product);
                return GlobalResponse.<Meta, String>builder()
                        .meta(Meta.builder().status(Status.SUCCESS).build())
                        .data("Delete last variant -> product deleted successfully!")
                        .build();
            }
        }

        return GlobalResponse.<Meta, String>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data("Delete product variant successfully!")
                .build();
    }

}
