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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
                        HttpServletRequest request) {
                VNPayResponseDTO response = vnPayService.createVnPayPayment(amount, bankCode, request);
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
                // Simple return handling for now
                int paymentStatus = 0;
                String paymentStatusStr = request.getParameter("vnp_ResponseCode");
                if ("00".equals(paymentStatusStr)) {
                        paymentStatus = 1;
                }

                return ResponseEntity.status(HttpStatus.OK)
                                .body(GlobalResponse.<Meta, Object>builder()
                                                .meta(Meta.builder()
                                                                .status(paymentStatus == 1
                                                                                ? com.example.creatshop.constant.Status.SUCCESS
                                                                                : com.example.creatshop.constant.Status.ERROR)
                                                                .message(paymentStatus == 1 ? "Payment Success"
                                                                                : "Payment Failed")
                                                                .build())
                                                .build());
        }
}
