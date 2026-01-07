package com.example.creatshop.controller;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.CategoryRequest;
import com.example.creatshop.domain.dto.response.CategoryResponse;
import com.example.creatshop.domain.dto.response.CategoryTypeResponse;
import com.example.creatshop.service.CategoryService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Log4j2
@Tag(name = "Category API", description = "API cho các chức năng quản lý danh mục sản phẩm")
public class CategoryController {
    CategoryService categoryService;

    @Operation(summary = "Tạo danh mục mới", description = "Tạo mới một danh mục sản phẩm.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Danh mục được tạo thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CategoryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yêu cầu không hợp lệ",
                         content = @Content(mediaType = "application/json"))
    })
    @PostMapping(Endpoint.V1.Category.CREATE_CATEGORY)
    public ResponseEntity<GlobalResponse<Meta, CategoryResponse>> createCate(@RequestBody @Valid CategoryRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(categoryService.createCategory(request));
    }

    @Operation(summary = "Cập nhật danh mục", description = "Cập nhật thông tin của danh mục sản phẩm theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh mục được cập nhật thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CategoryResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy danh mục",
                         content = @Content(mediaType = "application/json"))
    })
    @PutMapping(Endpoint.V1.Category.UPDATE_CATEGORY)
    public ResponseEntity<GlobalResponse<Meta, CategoryResponse>> updateCate(@PathVariable(name = "id") Integer cateId, @RequestBody CategoryRequest request) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(categoryService.updateCategory(cateId, request));
    }

    @Operation(summary = "Xóa danh mục", description = "Xóa danh mục sản phẩm theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh mục đã bị xóa",
                         content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy danh mục",
                         content = @Content(mediaType = "application/json"))
    })
    @DeleteMapping(Endpoint.V1.Category.DELETE_CATEGORY)
    public ResponseEntity<GlobalResponse<Meta, String>> deleteCate(@PathVariable(name = "id") Integer cateId) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(categoryService.deleteCategory(cateId));
    }

    @Operation(summary = "Lấy tất cả danh mục", description = "Lấy danh sách tất cả các danh mục sản phẩm.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh sách danh mục",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CategoryTypeResponse.class)))
    })
    @GetMapping(Endpoint.V1.Category.GET_CATEGORY)
    public ResponseEntity<GlobalResponse<Meta, List<CategoryTypeResponse>>> getAllCate() {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(categoryService.getAllCategories());
    }

    @Operation(summary = "Lấy danh mục theo ID", description = "Lấy thông tin danh mục theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Thông tin danh mục",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CategoryResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy danh mục",
                         content = @Content(mediaType = "application/json"))
    })
    @GetMapping(Endpoint.V1.Category.GET_CATEGORY_BY_ID)
    public ResponseEntity<GlobalResponse<Meta, CategoryResponse>> getCategory(@PathVariable(name = "categoryId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(categoryService.getCategory(id));
    }
}
