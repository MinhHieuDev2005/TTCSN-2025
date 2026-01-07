package com.example.creatshop.service;


import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.OrderRequest;
import com.example.creatshop.domain.dto.response.OrderDetailResponse;
import com.example.creatshop.domain.dto.response.PaymentResponse;

import java.util.List;

public interface OrderDetailService {
    GlobalResponse<Meta, OrderDetailResponse> createOrder(String username, OrderRequest request);

    GlobalResponse<Meta, PaymentResponse> cancelOrder(String username, Integer id);

    GlobalResponse<Meta, List<OrderDetailResponse>> getOrders(String username);

    GlobalResponse<Meta, OrderDetailResponse> getOrder(Integer id);

    GlobalResponse<Meta, OrderDetailResponse> moveToNextStatus(Integer id);

    GlobalResponse<Meta, OrderDetailResponse> moveToPreviousStatus(Integer id);
}
