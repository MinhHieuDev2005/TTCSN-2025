package com.example.creatshop.domain.mapper;


import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import com.example.creatshop.domain.entity.PaymentDetail;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface PaymentMapper {
    PaymentResponse toPaymentResponse(PaymentDetail paymentDetail);

    PaymentDetail toPayment(PaymentRequest request);
}
