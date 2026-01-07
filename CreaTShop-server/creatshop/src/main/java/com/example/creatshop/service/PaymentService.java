package com.example.creatshop.service;

import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import org.springframework.http.ResponseEntity;

public interface PaymentService {
    GlobalResponse<Meta, PaymentResponse> createPayment(PaymentRequest request);

    GlobalResponse<Meta, PaymentResponse> updatePayment(Integer id, PaymentRequest request);
}
