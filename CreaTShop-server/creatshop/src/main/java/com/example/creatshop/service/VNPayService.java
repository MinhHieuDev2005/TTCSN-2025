package com.example.creatshop.service;

import com.example.creatshop.config.VNPayConfig;
import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.PaymentProvider;
import com.example.creatshop.constant.PaymentStatus;
import com.example.creatshop.domain.dto.response.VNPayResponseDTO;
import com.example.creatshop.domain.entity.PaymentDetail;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.repository.PaymentDetailRepository;
import com.example.creatshop.util.VNPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Log4j2
public class VNPayService {
    private final VNPayConfig vnPayConfig;
    private final PaymentDetailRepository paymentDetailRepository;
    private final PaymentLifecycleService lifecycleService;

    @Transactional
    public VNPayResponseDTO createVnPayPayment(String username, long amount, String bankCode, Integer paymentId, HttpServletRequest request) {
        if (!vnPayConfig.isConfigured()) {
            throw new BadRequestException(ErrorMessage.VNPay.ERR_CONFIG_INVALID);
        }

        if (paymentId == null) {
            throw new BadRequestException(ErrorMessage.Validate.ERR_PAYMENT_ID_NOT_NULL);
        }

        PaymentDetail paymentDetail = paymentDetailRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new BadRequestException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        if (paymentDetail.getUser() == null || !username.equals(paymentDetail.getUser().getUsername())) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_FORBIDDEN);
        }

        if (!PaymentProvider.VNPAY.name().equalsIgnoreCase(paymentDetail.getProvider())
                || !PaymentStatus.PENDING.equals(paymentDetail.getStatus())) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_VNPAY_PENDING_ONLY);
        }

        if (paymentDetail.getOrderDetail() == null) {
            throw new BadRequestException(ErrorMessage.OrderDetail.ERR_NOT_FOUND_BY_ID);
        }

        if (amount <= 0 || paymentDetail.getAmount() == null
                || paymentDetail.getAmount().compareTo(BigDecimal.valueOf(amount)) != 0
                || amount > Long.MAX_VALUE / 100L) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_AMOUNT_MISMATCH);
        }

        Instant now = Instant.now();
        Instant expiresAt = paymentDetail.getCreatedAt().toInstant().plus(PaymentLifecycleService.PAYMENT_TIMEOUT);
        if (!expiresAt.isAfter(now)) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_EXPIRED);
        }
        long finalAmount = Math.multiplyExact(amount, 100L);
        Map<String, String> vnpParamsMap = vnPayConfig.getVNPayConfig();
        vnpParamsMap.put("vnp_Amount", String.valueOf(finalAmount));
        if (bankCode != null && !bankCode.isEmpty()) {
            vnpParamsMap.put("vnp_BankCode", bankCode);
        }
        vnpParamsMap.put("vnp_IpAddr", VNPayUtil.getIpAddress(request));
        vnpParamsMap.put("vnp_ReturnUrl", vnPayConfig.getVnp_ReturnUrl());

        // Build Params
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
        String vnp_CreateDate = formatter.format(now);
        vnpParamsMap.put("vnp_CreateDate", vnp_CreateDate);

        String vnp_ExpireDate = formatter.format(expiresAt);
        vnpParamsMap.put("vnp_ExpireDate", vnp_ExpireDate);

        vnpParamsMap.put("vnp_TxnRef", String.valueOf(paymentId));
        vnpParamsMap.put("vnp_OrderInfo", "Thanh toan don hang " + VNPayUtil.getRandomNumber(8));

        // Build Query URL
        String hashData = buildHashData(vnpParamsMap);
        String queryUrl = buildQuery(vnpParamsMap);
        String vnp_SecureHash = VNPayUtil.hmacSHA512(vnPayConfig.getSecretKey(), hashData);
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        String paymentUrl = vnPayConfig.getVnp_PayUrl() + "?" + queryUrl;

        return VNPayResponseDTO.builder()
                .code("ok")
                .message("success")
                .paymentUrl(paymentUrl)
                .build();
    }

    @Transactional
    public Map<String, String> handleIpn(HttpServletRequest request) {
        Map<String, String> fields = extractVnpFields(request);

        if (!isValidChecksum(fields)) {
            return ipnResponse("97", "Invalid Checksum");
        }

        Integer paymentId;
        try {
            paymentId = Integer.valueOf(fields.get("vnp_TxnRef"));
        } catch (NumberFormatException exception) {
            return ipnResponse("01", "Order not found");
        }

        Optional<PaymentDetail> optionalPayment = paymentDetailRepository.findByIdForUpdate(paymentId);
        if (optionalPayment.isEmpty()) {
            return ipnResponse("01", "Order not found");
        }

        PaymentDetail paymentDetail = optionalPayment.get();
        if (!isValidPayment(paymentDetail)) {
            return ipnResponse("01", "Order not found");
        }
        if (!isValidAmount(paymentDetail, fields.get("vnp_Amount"))) {
            return ipnResponse("04", "Invalid amount");
        }

        boolean success = isSuccessfulResult(fields);
        if (paymentDetail.getStatus() == PaymentStatus.COMPLETED
                || paymentDetail.getStatus() == PaymentStatus.REFUND_REQUIRED
                || (paymentDetail.getStatus() != PaymentStatus.PENDING && !success)) {
            return ipnResponse("02", "Order already confirmed");
        }

        applyVnpayResult(paymentDetail, success);

        return ipnResponse("00", "Confirm Success");
    }

    @Transactional
    public PaymentStatus handleReturn(HttpServletRequest request) {
        Map<String, String> fields = extractVnpFields(request);

        if (!isValidChecksum(fields)) {
            throw new BadRequestException(ErrorMessage.VNPay.ERR_CHECKSUM_INVALID);
        }

        Integer paymentId;
        try {
            paymentId = Integer.valueOf(fields.get("vnp_TxnRef"));
        } catch (NumberFormatException exception) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID);
        }

        PaymentDetail paymentDetail = paymentDetailRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new BadRequestException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        if (!isValidPayment(paymentDetail)) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_VNPAY_PENDING_ONLY);
        }
        if (!isValidAmount(paymentDetail, fields.get("vnp_Amount"))) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_AMOUNT_MISMATCH);
        }

        if (PaymentStatus.COMPLETED.equals(paymentDetail.getStatus())) {
            return paymentDetail.getStatus();
        }

        applyVnpayResult(paymentDetail, isSuccessfulResult(fields));
        return paymentDetail.getStatus();
    }

    private void applyVnpayResult(PaymentDetail paymentDetail, boolean success) {
        if (success) {
            if (paymentDetail.getStatus() == PaymentStatus.PENDING) {
                paymentDetail.setStatus(PaymentStatus.COMPLETED);
            } else if (paymentDetail.getStatus() == PaymentStatus.CANCELED
                    || paymentDetail.getStatus() == PaymentStatus.FAILED) {
                paymentDetail.setStatus(PaymentStatus.REFUND_REQUIRED);
                log.error("Payment {} succeeded after stock was released; manual refund required", paymentDetail.getId());
            }
        } else {
            lifecycleService.cancelLockedPendingPayment(paymentDetail, "PAYMENT_FAILED", null);
        }
        paymentDetailRepository.save(paymentDetail);
    }

    private boolean isSuccessfulResult(Map<String, String> fields) {
        return "00".equals(fields.get("vnp_ResponseCode"))
                && "00".equals(fields.get("vnp_TransactionStatus"));
    }

    private boolean isValidPayment(PaymentDetail payment) {
        return PaymentProvider.VNPAY.name().equals(payment.getProvider()) && payment.getOrderDetail() != null;
    }

    private boolean isValidAmount(PaymentDetail payment, String amount) {
        return amount != null && amount.matches("[0-9]{1,19}") && payment.getAmount() != null
                && payment.getAmount().signum() > 0
                && payment.getAmount().movePointRight(2).compareTo(new BigDecimal(amount)) == 0;
    }

    private Map<String, String> ipnResponse(String responseCode, String message) {
        Map<String, String> response = new HashMap<>();
        response.put("RspCode", responseCode);
        response.put("Message", message);
        return response;
    }

    private Map<String, String> extractVnpFields(HttpServletRequest request) {
        Map<String, String> fields = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (key.startsWith("vnp_") && values != null && values.length > 0) {
                fields.put(key, values[0]);
            }
        });

        return fields;
    }

    private boolean isValidChecksum(Map<String, String> fields) {
        if (!vnPayConfig.isConfigured() || !vnPayConfig.getVnp_TmnCode().equals(fields.get("vnp_TmnCode"))) {
            return false;
        }
        if (!fields.getOrDefault("vnp_ResponseCode", "").matches("[0-9]{2}")
                || !fields.getOrDefault("vnp_TransactionStatus", "").matches("[0-9]{2}")) {
            return false;
        }
        Map<String, String> signedFields = new HashMap<>(fields);
        String vnpSecureHash = signedFields.remove("vnp_SecureHash");
        signedFields.remove("vnp_SecureHashType");

        String expectedHash = VNPayUtil.hmacSHA512(vnPayConfig.getSecretKey(), buildHashData(signedFields));
        return vnpSecureHash != null && expectedHash.equalsIgnoreCase(vnpSecureHash);
    }

    private String buildHashData(Map<String, String> params) {
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        for (String fieldName : fieldNames) {
            String fieldValue = params.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                if (hashData.length() > 0) {
                    hashData.append('&');
                }
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(urlEncode(fieldValue));
            }
        }

        return hashData.toString();
    }

    private String buildQuery(Map<String, String> params) {
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);

        StringBuilder query = new StringBuilder();
        for (String fieldName : fieldNames) {
            String fieldValue = params.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                if (query.length() > 0) {
                    query.append('&');
                }
                query.append(urlEncode(fieldName));
                query.append('=');
                query.append(urlEncode(fieldValue));
            }
        }

        return query.toString();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
