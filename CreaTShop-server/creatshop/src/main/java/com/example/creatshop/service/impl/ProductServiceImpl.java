package com.example.creatshop.service.impl;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.ProductRequest;
import com.example.creatshop.domain.dto.request.ProductVariantRequest;
import com.example.creatshop.domain.dto.response.ProductResponse;
import com.example.creatshop.domain.dto.response.ProductVariantResponse;
import com.example.creatshop.domain.entity.Category;
import com.example.creatshop.domain.entity.Product;
import com.example.creatshop.domain.entity.ProductVariant;
import com.example.creatshop.domain.mapper.ProductMapper;
import com.example.creatshop.domain.mapper.ProductVariantMapper;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.repository.OrderItemRepository;
import com.example.creatshop.repository.CartItemRepository;
import org.springframework.dao.DataIntegrityViolationException;
import com.example.creatshop.exception.UploadFileException;
import com.example.creatshop.repository.CategoryRepository;
import com.example.creatshop.repository.ProductRepository;
import com.example.creatshop.repository.ProductVariantRepository;
import com.example.creatshop.service.ProductService;
import com.example.creatshop.util.CloudinaryUtils;
import com.example.creatshop.util.VndAmount;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Log4j2
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductServiceImpl implements ProductService {
    ProductRepository        productRepository;
    CategoryRepository       categoryRepository;
    ProductVariantRepository variantRepository;

    ProductMapper            productMapper;
    ProductVariantMapper     variantMapper;

    CloudinaryUtils          cloudinaryUtils;
    OrderItemRepository      orderItemRepository;
    CartItemRepository       cartItemRepository;

    @Override
    @Transactional
    public GlobalResponse<Meta, ProductResponse> createProduct(ProductRequest request) {
        VndAmount.requireValid(request.getPrice());
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Category.NOT_FOUND_BY_ID));

        Product product = productMapper.toProduct(request);
        product.addCategory(category);

        try {
            product.setImageStaticUrl(cloudinaryUtils.getUrlFromFile(request.getStaticImg()));
            product.setImageDynamicUrl(cloudinaryUtils.getUrlFromFile(request.getDynamicImg()));
        } catch (Exception ex) {
            throw new UploadFileException(ErrorMessage.Product.ERR_FILE_UPLOAD);
        }

        // ✅ Tạo & gắn variants ngay trên entity product
        if (!CollectionUtils.isEmpty(request.getVariants())) {
            for (ProductVariantRequest vReq : request.getVariants()) {
                ProductVariant variant = variantMapper.toProductVariant(vReq);
                variant.setName(product.getName());

                try {
                    variant.setImageUrl(cloudinaryUtils.getUrlFromFile(vReq.getImage()));
                } catch (Exception ex) {
                    throw new UploadFileException(ErrorMessage.Product.ERR_FILE_UPLOAD);
                }

                product.addVariant(variant);
            }
        }

        // ✅ Save 1 lần (cascade sẽ tự insert variants)
        try {
            product = productRepository.saveAndFlush(product);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("exception.product.duplicate-variant");
        }

        ProductResponse response = getProductResponse(product);

        return GlobalResponse.<Meta, ProductResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    @Override
    public GlobalResponse<Meta, List<ProductResponse>> getProducts() {
        List<ProductResponse> responses = new ArrayList<>();
        List<Product> list = productRepository.findAll();

        for (var item : list) {
            responses.add(getProductResponse(item));
        }

        return GlobalResponse
                .<Meta, List<ProductResponse>>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(responses)
                .build();
    }

    @Override
    public GlobalResponse<Meta, ProductResponse> getProduct(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));
        ProductResponse response = getProductResponse(product);

        return GlobalResponse.<Meta, ProductResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response).build();
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, ProductResponse> updateProduct(Integer id, ProductRequest request) {
        VndAmount.requireValid(request.getPrice());
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));
        if (!CollectionUtils.isEmpty(request.getVariants())) {
            throw new BadRequestException("exception.product.edit-variants-separately");
        }
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Category.NOT_FOUND_BY_ID));
        productMapper.updateProduct(request, product);
        product.setCategory(category);

        if (request.getStaticImg() != null && !request.getStaticImg().isEmpty()) {
            try {
                product.setImageStaticUrl(cloudinaryUtils.getUrlFromFile(request.getStaticImg()));
            } catch (Exception ex) {
                throw new UploadFileException(ErrorMessage.Product.ERR_FILE_UPLOAD);
            }
        }

        if (request.getDynamicImg() != null && !request.getDynamicImg().isEmpty()) {
            try {
                product.setImageDynamicUrl(cloudinaryUtils.getUrlFromFile(request.getDynamicImg()));
            } catch (Exception ex) {
                throw new UploadFileException(ErrorMessage.Product.ERR_FILE_UPLOAD);
            }
        }

        if (!Objects.isNull(request.getName())) {
            List<ProductVariant> list = variantRepository.findAllByProduct(product);
            for (var item : list) {
                item.setName(request.getName());
                variantRepository.save(item);
            }
        }

        product = productRepository.save(product);
        ProductResponse response = getProductResponse(product);

        return GlobalResponse.<Meta, ProductResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response).build();
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, String> deleteProduct(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));
        if (orderItemRepository.existsByProduct(product) || cartItemRepository.existsByProduct(product)) {
            throw new BadRequestException("exception.product.in-use");
        }
        try {
            productRepository.delete(product);
            productRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("exception.product.in-use");
        }
        return GlobalResponse.<Meta, String>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data("Delete product successfully!").build();
    }

    private ProductResponse getProductResponse(Product item) {
        ProductResponse response = productMapper.toProductResponse(item);
        List<ProductVariant> variants = variantRepository.findAllByProduct(item);
        List<ProductVariantResponse> variantResponses = variants.stream()
                .map(variantMapper::toProductVariantResponse)
                .collect(Collectors.toList());

        response.setVariants(variantResponses);
        return response;
    }
}
