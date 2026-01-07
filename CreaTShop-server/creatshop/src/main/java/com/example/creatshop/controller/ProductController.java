package com.example.creatshop.controller;

import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.ProductRequest;
import com.example.creatshop.domain.dto.response.ProductResponse;
import com.example.creatshop.service.ProductService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Log4j2
@Tag(name = "Product API", description = "API cho các thao tác sản phẩm")
public class ProductController {
    ProductService productService;

    @Operation(summary = "Tạo sản phẩm mới", description = "Tạo một sản phẩm mới với thông tin yêu cầu, bao gồm hình ảnh tĩnh và động.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Sản phẩm được tạo thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yêu cầu không hợp lệ",
                    content = @Content(mediaType = "application/json"))
    })
    @PostMapping(value = Endpoint.V1.Product.CREATE_PRODUCT, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalResponse<Meta, ProductResponse>> createProduct(
            @ModelAttribute @Valid ProductRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(productService.createProduct(request));
    }

    @Operation(summary = "Lấy danh sách sản phẩm", description = "Truy xuất tất cả sản phẩm hiện có trong hệ thống.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh sách sản phẩm được truy xuất thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = ProductResponse.class)))
    })
    @GetMapping(Endpoint.V1.Product.GET_PRODUCT)
    public ResponseEntity<GlobalResponse<Meta, List<ProductResponse>>> getProducts() {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(productService.getProducts());
    }

    @Operation(summary = "Lấy sản phẩm theo ID", description = "Lấy chi tiết của một sản phẩm dựa trên ID của sản phẩm.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Sản phẩm được truy xuất thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy sản phẩm với ID cung cấp",
                         content = @Content(mediaType = "application/json"))
    })
    @GetMapping(Endpoint.V1.Product.GET_PRODUCT_BY_ID)
    public ResponseEntity<GlobalResponse<Meta, ProductResponse>> getProduct(@PathVariable(name = "productId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(productService.getProduct(id));
    }

    @Operation(summary = "Cập nhật sản phẩm", description = "Cập nhật thông tin của một sản phẩm dựa trên ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Sản phẩm được cập nhật thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ProductResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy sản phẩm với ID cung cấp",
                    content = @Content(mediaType = "application/json"))
    })
    @PutMapping(value = Endpoint.V1.Product.UPDATE_PRODUCT, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalResponse<Meta, ProductResponse>> updateProduct(
            @PathVariable(name = "productId") Integer id,
            @ModelAttribute @Valid ProductRequest request) {

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(productService.updateProduct(id, request));
    }

    @Operation(summary = "Xóa sản phẩm", description = "Xóa một sản phẩm dựa trên ID của nó.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Sản phẩm đã được xóa thành công",
                         content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy sản phẩm với ID cung cấp",
                         content = @Content(mediaType = "application/json"))
    })
    @DeleteMapping(Endpoint.V1.Product.DELETE_PRODUCT)
    public ResponseEntity<GlobalResponse<Meta, String>> deleteProduct(@PathVariable(name = "productId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(productService.deleteProduct(id));
    }
}
