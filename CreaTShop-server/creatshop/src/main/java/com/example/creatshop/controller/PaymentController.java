package com.example.creatshop.controller;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import com.example.creatshop.service.PaymentService;
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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Log4j2
@Tag(name = "Payment API", description = "API cho các chức năng thanh toán")
public class PaymentController {
    PaymentService paymentService;

    @Operation(summary = "Tạo phương thức thanh toán", description = "Tạo mới một phương thức thanh toán dựa trên yêu cầu của người dùng.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Phương thức thanh toán được tạo thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yêu cầu không hợp lệ",
                         content = @Content(mediaType = "application/json"))
    })
    @PostMapping(Endpoint.V1.Payment.CREATE_PAYMENT_METHOD)
    public ResponseEntity<GlobalResponse<Meta, PaymentResponse>> createPayment(@RequestBody @Valid PaymentRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(paymentService.createPayment(request));
    }

    @Operation(summary = "Cập nhật trạng thái thanh toán", description = "Cập nhật trạng thái thanh toán của một phương thức thanh toán cụ thể theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Trạng thái thanh toán được cập nhật thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy phương thức thanh toán với ID cung cấp",
                         content = @Content(mediaType = "application/json"))
    })
    @PutMapping(Endpoint.V1.Payment.UPDATE_PAYMENT_STATUS)
    public ResponseEntity<GlobalResponse<Meta, PaymentResponse>> updatePayment(@RequestBody @Valid PaymentRequest request,
                                                                               @PathVariable(name = "paymentId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(paymentService.updatePayment(id, request));
    }
}
