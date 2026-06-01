package com.example.creatshop.controller;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import com.example.creatshop.service.PaymentService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Log4j2
@Tag(name = "Payment API", description = "API cho cac chuc nang thanh toan")
public class PaymentController {
    PaymentService paymentService;

    @Operation(summary = "Tao phuong thuc thanh toan", description = "Tao moi mot phuong thuc thanh toan dua tren yeu cau cua nguoi dung.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Phuong thuc thanh toan duoc tao thanh cong",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yeu cau khong hop le",
                         content = @Content(mediaType = "application/json"))
    })
    @PostMapping(Endpoint.V1.Payment.CREATE_PAYMENT_METHOD)
    public ResponseEntity<GlobalResponse<Meta, PaymentResponse>> createPayment(@AuthenticationPrincipal UserDetails userDetails,
                                                                               @RequestBody @Valid PaymentRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(paymentService.createPayment(userDetails.getUsername(), request));
    }

    @Operation(summary = "Cap nhat trang thai thanh toan", description = "Cap nhat trang thai thanh toan cua mot phuong thuc thanh toan cu the theo ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Trang thai thanh toan duoc cap nhat thanh cong",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "404", description = "Khong tim thay phuong thuc thanh toan voi ID cung cap",
                         content = @Content(mediaType = "application/json"))
    })
    @PutMapping(Endpoint.V1.Payment.UPDATE_PAYMENT_STATUS)
    public ResponseEntity<GlobalResponse<Meta, PaymentResponse>> updatePayment(@RequestBody @Valid PaymentRequest request,
                                                                               @AuthenticationPrincipal UserDetails userDetails,
                                                                               @PathVariable(name = "paymentId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(paymentService.updatePayment(userDetails.getUsername(), id, request));
    }

    @Operation(summary = "Xac nhan thanh toan COD", description = "Admin xac nhan da thu tien cho don hang thanh toan khi nhan hang.")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping(Endpoint.V1.Payment.CONFIRM_COD_PAYMENT)
    public ResponseEntity<GlobalResponse<Meta, PaymentResponse>> confirmCodPayment(@PathVariable(name = "paymentId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(paymentService.confirmCodPayment(id));
    }
}
