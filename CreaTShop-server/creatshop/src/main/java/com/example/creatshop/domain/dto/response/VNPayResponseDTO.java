package com.example.creatshop.domain.dto.response;

import lombok.Builder;

@Builder
public class VNPayResponseDTO {
    public String code;
    public String message;
    public String paymentUrl;
}
