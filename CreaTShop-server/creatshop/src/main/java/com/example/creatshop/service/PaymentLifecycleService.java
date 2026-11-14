package com.example.creatshop.service;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.OrderStatus;
import com.example.creatshop.constant.PaymentProvider;
import com.example.creatshop.constant.PaymentStatus;
import com.example.creatshop.domain.entity.OrderItem;
import com.example.creatshop.domain.entity.PaymentDetail;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.repository.PaymentDetailRepository;
import com.example.creatshop.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class PaymentLifecycleService {
    public static final Duration PAYMENT_TIMEOUT = Duration.ofMinutes(15);
    public static final Duration CALLBACK_GRACE = Duration.ofMinutes(5);

    private final PaymentDetailRepository paymentRepository;
    private final ProductVariantRepository variantRepository;

    @Transactional(propagation = Propagation.MANDATORY)
    public boolean cancelLockedPendingPayment(PaymentDetail payment, String reason, String actor) {
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return false;
        }

        if (payment.getOrderDetail() != null) {
            if (payment.getOrderDetail().getStatus() != OrderStatus.Processing) {
                return false;
            }
            for (OrderItem item : payment.getOrderDetail().getItems().stream()
                    .sorted(Comparator.comparing(orderItem -> orderItem.getVariant().getId())).toList()) {
                if (variantRepository.releaseStock(item.getVariant().getId(), item.getQuantity()) != 1) {
                    throw new NotFoundException(ErrorMessage.ProductVariant.NOT_FOUND_BY_ID);
                }
            }
        }

        if (payment.getOrderDetail() != null) {
            var order = payment.getOrderDetail();
            order.setStatus(OrderStatus.Canceled);
            order.setCancellationReason(reason);
            order.setCanceledBy(actor);
            order.setCanceledAt(java.sql.Timestamp.from(Instant.now()));
            order.initStatusContext();
        }
        payment.setStatus(PaymentStatus.CANCELED);
        return true;
    }

    @Transactional
    public void expirePayment(Integer id) {
        PaymentDetail payment = paymentRepository.findByIdForUpdate(id).orElse(null);
        if (payment != null && PaymentProvider.VNPAY.name().equals(payment.getProvider())
                && payment.getCreatedAt() != null
                && !payment.getCreatedAt().toInstant().plus(PAYMENT_TIMEOUT).plus(CALLBACK_GRACE)
                    .isAfter(Instant.now())) {
            cancelLockedPendingPayment(payment, "PAYMENT_EXPIRED", null);
        }
    }
}
