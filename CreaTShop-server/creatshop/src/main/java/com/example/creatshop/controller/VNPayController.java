package com.example.creatshop.controller;

import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.response.VNPayResponseDTO;
import com.example.creatshop.service.VNPayService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping(Endpoint.V1.PREFIX + "/vnpay")
@RequiredArgsConstructor
@Tag(name = "Payment API", description = "VNPay API")
public class VNPayController {
        private final VNPayService vnPayService;

        @GetMapping("/create-payment")
        public ResponseEntity<GlobalResponse<Meta, VNPayResponseDTO>> createPayment(
                        @RequestParam("amount") long amount,
                        @RequestParam(value = "bankCode", required = false) String bankCode,
                        @RequestParam(value = "paymentId", required = false) Integer paymentId,
                        @AuthenticationPrincipal UserDetails userDetails,
                        HttpServletRequest request) {
                VNPayResponseDTO response = vnPayService.createVnPayPayment(userDetails.getUsername(), amount, bankCode, paymentId, request);
                return ResponseEntity.status(HttpStatus.OK)
                                .body(GlobalResponse.<Meta, VNPayResponseDTO>builder()
                                                .meta(Meta.builder()
                                                                .status(com.example.creatshop.constant.Status.SUCCESS)
                                                                .message("Successfully created payment URL")
                                                                .build())
                                                .data(response)
                                                .build());
        }

        @GetMapping("/return")
        public ResponseEntity<GlobalResponse<Meta, Object>> returnPayment(HttpServletRequest request) {
                var paymentStatus = vnPayService.handleReturn(request);
                boolean paymentSuccess = paymentStatus == com.example.creatshop.constant.PaymentStatus.COMPLETED;

                return ResponseEntity.status(HttpStatus.OK)
                                .body(GlobalResponse.<Meta, Object>builder()
                                                .meta(Meta.builder()
                                                                .status(paymentSuccess
                                                                                ? com.example.creatshop.constant.Status.SUCCESS
                                                                                : com.example.creatshop.constant.Status.ERROR)
                                                                .message(paymentSuccess ? "Payment Success"
                                                                                : paymentStatus == com.example.creatshop.constant.PaymentStatus.REFUND_REQUIRED
                                                                                        ? "Payment received; manual reconciliation required" : "Payment Failed")
                                                                .build())
                                                .data(Map.of("paymentStatus", paymentStatus.name()))
                                                .build());
        }

        @GetMapping("/ipn")
        public ResponseEntity<Map<String, String>> ipn(HttpServletRequest request) {
                return ResponseEntity.ok(vnPayService.handleIpn(request));
        }
}
