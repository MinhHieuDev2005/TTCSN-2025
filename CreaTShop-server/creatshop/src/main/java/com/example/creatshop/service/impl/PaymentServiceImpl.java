package com.example.creatshop.service.impl;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.OrderStatus;
import com.example.creatshop.constant.PaymentProvider;
import com.example.creatshop.constant.PaymentStatus;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.PaymentRequest;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import com.example.creatshop.domain.entity.PaymentDetail;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.domain.mapper.PaymentMapper;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.repository.PaymentDetailRepository;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.service.PaymentService;
import com.example.creatshop.util.EnumUtils;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

@Service
@Log4j2
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentServiceImpl implements PaymentService {
    PaymentDetailRepository paymentRepository;
    UserRepository          userRepository;
    PaymentMapper           paymentMapper;
    EnumUtils               enumUtils;

    @Override
    public GlobalResponse<Meta, PaymentResponse> createPayment(String username, PaymentRequest request) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));
        PaymentProvider provider = enumUtils.fromPaymentProvider(request.getProvider());

        PaymentDetail paymentDetail = paymentMapper.toPayment(request);
        paymentDetail.setUser(user);
        paymentDetail.setProvider(provider.name());
        paymentDetail.setStatus(PaymentStatus.PENDING);

        paymentDetail = paymentRepository.save(paymentDetail);

        PaymentResponse response = paymentMapper.toPaymentResponse(paymentDetail);

        return GlobalResponse.<Meta, PaymentResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, PaymentResponse> updatePayment(String username, Integer id, PaymentRequest request) {
        PaymentDetail paymentDetail = paymentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        validateOwner(username, paymentDetail);

        if (!enumUtils.isValidPaymentStatusValue(request.getStatus())) {
            throw new BadRequestException(ErrorMessage.Validate.ERR_STATUS_INVALID);
        }

        PaymentStatus status = enumUtils.fromPaymentStatus(request.getStatus());
        if (PaymentStatus.COMPLETED.equals(status)) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_COMPLETED_BY_SYSTEM_ONLY);
        }

        paymentDetail.setStatus(status);

        paymentDetail = paymentRepository.save(paymentDetail);
        PaymentResponse response = paymentMapper.toPaymentResponse(paymentDetail);

        return GlobalResponse.<Meta, PaymentResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    private void validateOwner(String username, PaymentDetail paymentDetail) {
        if (paymentDetail.getUser() == null || !username.equals(paymentDetail.getUser().getUsername())) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_FORBIDDEN);
        }
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, PaymentResponse> confirmCodPayment(Integer id) {
        PaymentDetail paymentDetail = paymentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        if (!PaymentProvider.COD.name().equalsIgnoreCase(paymentDetail.getProvider())) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_CONFIRM_COD_ONLY);
        }

        if (!PaymentStatus.PENDING.equals(paymentDetail.getStatus())) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_CONFIRM_PENDING_ONLY);
        }

        if (paymentDetail.getOrderDetail() == null
                || !OrderStatus.Delivered.equals(paymentDetail.getOrderDetail().getStatus())) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_CONFIRM_DELIVERED_ONLY);
        }

        paymentDetail.setStatus(PaymentStatus.COMPLETED);
        paymentDetail = paymentRepository.save(paymentDetail);

        PaymentResponse response = paymentMapper.toPaymentResponse(paymentDetail);

        return GlobalResponse.<Meta, PaymentResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }
}
