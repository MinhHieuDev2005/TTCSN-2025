package com.example.creatshop.service.impl;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.PaymentStatus;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import com.example.creatshop.domain.entity.PaymentDetail;
import com.example.creatshop.domain.mapper.PaymentMapper;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.repository.PaymentDetailRepository;
import com.example.creatshop.service.PaymentService;
import com.example.creatshop.util.EnumUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
@Log4j2
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentServiceImpl implements PaymentService {
    PaymentDetailRepository paymentRepository;
    PaymentMapper           paymentMapper;
    EnumUtils               enumUtils;

    @Override
    public GlobalResponse<Meta, PaymentResponse> createPayment(PaymentRequest request) {

        PaymentDetail paymentDetail = paymentMapper.toPayment(request);
        paymentDetail.setStatus(PaymentStatus.PENDING);

        paymentDetail = paymentRepository.save(paymentDetail);

        PaymentResponse response = paymentMapper.toPaymentResponse(paymentDetail);

        return GlobalResponse.<Meta, PaymentResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, PaymentResponse> updatePayment(Integer id, PaymentRequest request) {
        PaymentDetail paymentDetail = paymentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        if (enumUtils.isValidPaymentStatusValue(request.getStatus())) {
            PaymentStatus status = enumUtils.fromPaymentStatus(request.getStatus());
            paymentDetail.setStatus(status);

            paymentDetail = paymentRepository.save(paymentDetail);
            PaymentResponse response = paymentMapper.toPaymentResponse(paymentDetail);

            return GlobalResponse.<Meta, PaymentResponse>builder()
                                 .meta(Meta.builder().status(Status.SUCCESS).build())
                                 .data(response)
                                 .build();
        }
        return GlobalResponse.<Meta, PaymentResponse>builder()
                             .meta(Meta.builder().status(Status.ERROR).build())
                             .data(null).build();


    }
}
