package com.example.creatshop.job;

import com.example.creatshop.repository.PaymentDetailRepository;
import com.example.creatshop.service.PaymentLifecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Log4j2
public class PaymentExpirationJob {
    private final PaymentDetailRepository paymentRepository;
    private final PaymentLifecycleService lifecycleService;

    @Scheduled(fixedDelayString = "${payments.expiration-check-ms:60000}")
    public void expirePayments() {
        Timestamp cutoff = Timestamp.from(Instant.now().minus(PaymentLifecycleService.PAYMENT_TIMEOUT)
                .minus(PaymentLifecycleService.CALLBACK_GRACE));
        for (Integer id : paymentRepository.findExpiredVnpayPaymentIds(cutoff, PageRequest.of(0, 100))) {
            try {
                lifecycleService.expirePayment(id);
            } catch (RuntimeException exception) {
                log.error("Could not expire payment {}", id, exception);
            }
        }
    }
}
