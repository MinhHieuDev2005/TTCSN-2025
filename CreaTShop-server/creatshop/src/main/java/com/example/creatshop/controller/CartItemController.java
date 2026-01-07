package com.example.creatshop.controller;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.CartItemRequest;
import com.example.creatshop.domain.dto.response.CartItemResponse;
import com.example.creatshop.service.CartItemService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Log4j2
@Tag(name = "Cart API", description = "API cho các chức năng quản lý giỏ hàng")
public class CartItemController {
    CartItemService cartService;

    @Operation(summary = "Thêm sản phẩm vào giỏ hàng", description = "Thêm sản phẩm vào giỏ hàng của người dùng.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Sản phẩm được thêm vào giỏ hàng thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CartItemResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yêu cầu không hợp lệ",
                         content = @Content(mediaType = "application/json"))
    })
    @PostMapping(Endpoint.V1.Cart.ADD_CART_ITEM)
    public ResponseEntity<GlobalResponse<Meta, CartItemResponse>> addCartItem(@AuthenticationPrincipal UserDetails userDetails,
                                                                              @RequestBody @Valid CartItemRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(cartService.addCartItem(userDetails.getUsername(), request));
    }

    @Operation(summary = "Lấy danh sách sản phẩm trong giỏ hàng", description = "Lấy tất cả sản phẩm hiện có trong giỏ hàng của người dùng.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh sách sản phẩm trong giỏ hàng",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CartItemResponse.class)))
    })
    @GetMapping(Endpoint.V1.Cart.GET_CART_ITEM)
    public ResponseEntity<GlobalResponse<Meta, List<CartItemResponse>>> getCartItem(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(cartService.getCartItem(userDetails.getUsername()));
    }

    @Operation(summary = "Lấy sản phẩm trong giỏ hàng theo ID", description = "Lấy thông tin sản phẩm trong giỏ hàng của người dùng theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Thông tin sản phẩm trong giỏ hàng",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CartItemResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy sản phẩm với ID này",
                         content = @Content(mediaType = "application/json"))
    })
    @GetMapping(Endpoint.V1.Cart.GET_CART_ITEM_BY_ID)
    public ResponseEntity<GlobalResponse<Meta, CartItemResponse>> getCartItemById(@AuthenticationPrincipal UserDetails userDetails, @PathVariable(name = "cartItemId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(cartService.getCartItemById(userDetails.getUsername(), id));
    }

    @Operation(summary = "Cập nhật sản phẩm trong giỏ hàng", description = "Cập nhật thông tin sản phẩm trong giỏ hàng theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Sản phẩm trong giỏ hàng được cập nhật thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = CartItemResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy sản phẩm với ID này",
                         content = @Content(mediaType = "application/json"))
    })
    @PutMapping(Endpoint.V1.Cart.UPDATE_CART_ITEM)
    public ResponseEntity<GlobalResponse<Meta, CartItemResponse>> updateCartItem(@AuthenticationPrincipal UserDetails userDetails,
                                                                                 @PathVariable(name = "cartItemId") Integer id,
                                                                                 @RequestBody @Valid CartItemRequest request) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(cartService.updateCartItem(userDetails.getUsername(), id, request));
    }

    @DeleteMapping(Endpoint.V1.Cart.DELETE_CART_ITEM)
    public ResponseEntity<GlobalResponse<Meta, String>> deleteCartItem(@AuthenticationPrincipal UserDetails userDetails, @PathVariable(name = "cartItemId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(cartService.deleteCartItem(userDetails.getUsername(), id));
    }
}
