package com.example.creatshop.controller;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.OrderRequest;
import com.example.creatshop.domain.dto.response.OrderDetailResponse;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import com.example.creatshop.service.OrderDetailService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@RestController
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Log4j2
@Tag(name = "Order API", description = "API cho các chức năng quản lý đơn hàng")
public class OrderDetailController {
    OrderDetailService orderService;

    @Operation(summary = "Tạo đơn hàng", description = "Tạo mới một đơn hàng cho người dùng.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Đơn hàng được tạo thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = OrderDetailResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yêu cầu không hợp lệ",
                    content = @Content(mediaType = "application/json"))
    })
    @PostMapping(Endpoint.V1.Order.CREATE_ORDER_DETAIL)
    public ResponseEntity<GlobalResponse<Meta, OrderDetailResponse>> createOrderDetail(@AuthenticationPrincipal UserDetails userDetails,
                                                                                       @RequestBody @Valid OrderRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(orderService.createOrder(userDetails.getUsername(), request));
    }

    @Operation(summary = "Hủy đơn hàng", description = "Hủy một đơn hàng theo ID thanh toán.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Đơn hàng đã bị hủy",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy đơn hàng hoặc ID thanh toán",
                    content = @Content(mediaType = "application/json"))
    })
    @PutMapping(Endpoint.V1.Order.CANCEL_ORDER_DETAIL)
    public ResponseEntity<GlobalResponse<Meta, PaymentResponse>> cancelOrder(@AuthenticationPrincipal UserDetails userDetails,
                                                                             @PathVariable(name = "paymentId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(orderService.cancelOrder(userDetails.getUsername(), id));
    }

    @Operation(summary = "Lấy đơn hàng của người dùng", description = "Lấy danh sách tất cả đơn hàng của người dùng hiện tại.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh sách đơn hàng của người dùng",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = OrderDetailResponse.class)))
    })
    @GetMapping(Endpoint.V1.Order.GET_ORDER_BY_USER)
    public ResponseEntity<GlobalResponse<Meta, List<OrderDetailResponse>>> getOrders(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(orderService.getOrders(userDetails.getUsername()));
    }

    @GetMapping(Endpoint.V1.Order.GET_ORDER_STATUS)
    public ResponseEntity<GlobalResponse<Meta, OrderDetailResponse>> getOrder(@PathVariable(name = "orderId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(orderService.getOrder(id));
    }

    @PutMapping(Endpoint.V1.Order.MOVE_TO_NEXT_STATUS)
    public ResponseEntity<GlobalResponse<Meta, OrderDetailResponse>> moveToNextStatus(@PathVariable(name = "orderId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(orderService.moveToNextStatus(id));
    }

    @PutMapping(Endpoint.V1.Order.MOVE_TO_PREVIOUS_STATUS)
    public ResponseEntity<GlobalResponse<Meta, OrderDetailResponse>> moveToPreviousStatus(@PathVariable(name = "orderId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(orderService.moveToPreviousStatus(id));
    }
}
