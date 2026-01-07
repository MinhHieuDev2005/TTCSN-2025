package com.example.creatshop.controller;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.ProductVariantRequest;
import com.example.creatshop.domain.dto.response.ProductVariantResponse;
import com.example.creatshop.service.ProductVariantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Log4j2
@RequiredArgsConstructor
@Tag(name = "Product Variant API", description = "API quản lý các biến thể của sản phẩm")
public class VariantController {
    ProductVariantService variantService;

    @Operation(summary = "Tạo biến thể sản phẩm", description = "Tạo biến thể mới cho sản phẩm theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Biến thể sản phẩm đã được tạo thành công",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ProductVariantResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yêu cầu không hợp lệ",
                    content = @Content(mediaType = "application/json"))
    })
    @PostMapping(value = Endpoint.V1.Variant.CREATE_VARIANT, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalResponse<Meta, ProductVariantResponse>> createVariant(
            @PathVariable(name = "productId") Integer id,
            @ModelAttribute @Valid ProductVariantRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(variantService.createVariant(id, request));
    }


    @Operation(summary = "Lấy các biến thể của sản phẩm", description = "Lấy danh sách biến thể của sản phẩm theo ID sản phẩm.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh sách biến thể đã được truy xuất thành công",
                         content = @Content(mediaType = "application/json", schema = @Schema(implementation = ProductVariantResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy sản phẩm",
                         content = @Content(mediaType = "application/json"))
    })
    @GetMapping(Endpoint.V1.Variant.GET_VARIANT_BY_PRODUCT)
    public ResponseEntity<GlobalResponse<Meta, List<ProductVariantResponse>>> getProductVariant(@PathVariable(name = "productId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(variantService.getVariantByProductId(id));
    }

    @Operation(summary = "Lấy tất cả biến thể sản phẩm", description = "Truy xuất danh sách tất cả các biến thể sản phẩm.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh sách biến thể sản phẩm đã được truy xuất thành công",
                         content = @Content(mediaType = "application/json", schema = @Schema(implementation = ProductVariantResponse.class)))
    })
    @GetMapping(Endpoint.V1.Variant.GET_VARIANT)
    public ResponseEntity<GlobalResponse<Meta, List<ProductVariantResponse>>> getProductVariant() {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(variantService.getVariant());
    }

    @Operation(summary = "Lấy biến thể sản phẩm theo ID", description = "Truy xuất biến thể sản phẩm dựa trên ID biến thể.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Biến thể sản phẩm đã được truy xuất thành công",
                         content = @Content(mediaType = "application/json", schema = @Schema(implementation = ProductVariantResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy biến thể",
                         content = @Content(mediaType = "application/json"))
    })
    @GetMapping(Endpoint.V1.Variant.GET_VARIANT_BY_ID)
    public ResponseEntity<GlobalResponse<Meta, ProductVariantResponse>> getProductVariantById(@PathVariable(name = "variantId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(variantService.getVariant(id));
    }

    @Operation(summary = "Cập nhật biến thể sản phẩm", description = "Cập nhật biến thể sản phẩm theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Biến thể sản phẩm đã được cập nhật thành công",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ProductVariantResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy biến thể",
                    content = @Content(mediaType = "application/json"))
    })
    @PutMapping(value = Endpoint.V1.Variant.UPDATE_VARIANT, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalResponse<Meta, ProductVariantResponse>> updateProductVariant(
            @PathVariable(name = "variantId") Integer id,
            @ModelAttribute @Valid ProductVariantRequest request) {

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(variantService.updateVariant(id, request));
    }

    @Operation(summary = "Xóa biến thể sản phẩm", description = "Xóa biến thể sản phẩm theo ID biến thể.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Biến thể sản phẩm đã được xóa thành công",
                         content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy biến thể",
                         content = @Content(mediaType = "application/json"))
    })
    @DeleteMapping(Endpoint.V1.Variant.DELETE_VARIANT)
    public ResponseEntity<GlobalResponse<Meta, String>> deleteProductVariant(@PathVariable(name = "variantId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(variantService.deleteVariant(id));
    }
}
