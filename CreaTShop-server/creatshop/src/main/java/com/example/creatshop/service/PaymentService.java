package com.example.creatshop.service;

import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.response.PaymentResponse;

public interface PaymentService {
    GlobalResponse<Meta, PaymentResponse> createPayment(String username, PaymentRequest request);

    GlobalResponse<Meta, PaymentResponse> updatePayment(String username, Integer id, PaymentRequest request);

    GlobalResponse<Meta, PaymentResponse> confirmCodPayment(Integer id);
}
