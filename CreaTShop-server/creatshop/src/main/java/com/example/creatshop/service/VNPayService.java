package com.example.creatshop.service;

import com.example.creatshop.config.VNPayConfig;
import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.PaymentProvider;
import com.example.creatshop.constant.PaymentStatus;
import com.example.creatshop.domain.dto.response.VNPayResponseDTO;
import com.example.creatshop.domain.entity.OrderItem;
import com.example.creatshop.domain.entity.PaymentDetail;
import com.example.creatshop.domain.entity.ProductVariant;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.repository.PaymentDetailRepository;
import com.example.creatshop.repository.ProductVariantRepository;
import com.example.creatshop.util.VNPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VNPayService {
    private final VNPayConfig vnPayConfig;
    private final PaymentDetailRepository paymentDetailRepository;
    private final ProductVariantRepository productVariantRepository;

    public VNPayResponseDTO createVnPayPayment(String username, long amount, String bankCode, Integer paymentId, HttpServletRequest request) {
        if (!vnPayConfig.isConfigured()) {
            throw new BadRequestException(ErrorMessage.VNPay.ERR_CONFIG_INVALID);
        }

        if (paymentId == null) {
            throw new BadRequestException(ErrorMessage.Validate.ERR_PAYMENT_ID_NOT_NULL);
        }

        PaymentDetail paymentDetail = paymentDetailRepository.findById(paymentId)
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

        if (paymentDetail.getAmount() == null || Math.abs(paymentDetail.getAmount() - amount) > 0.001) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_AMOUNT_MISMATCH);
        }

        long finalAmount = amount * 100L;
        Map<String, String> vnpParamsMap = vnPayConfig.getVNPayConfig();
        vnpParamsMap.put("vnp_Amount", String.valueOf(finalAmount));
        if (bankCode != null && !bankCode.isEmpty()) {
            vnpParamsMap.put("vnp_BankCode", bankCode);
        }
        vnpParamsMap.put("vnp_IpAddr", VNPayUtil.getIpAddress(request));
        vnpParamsMap.put("vnp_ReturnUrl", vnPayConfig.getVnp_ReturnUrl());

        // Build Params
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnpParamsMap.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnpParamsMap.put("vnp_ExpireDate", vnp_ExpireDate);

        vnpParamsMap.put("vnp_TxnRef", paymentId != null ? String.valueOf(paymentId) : System.currentTimeMillis() + VNPayUtil.getRandomNumber(4));
        vnpParamsMap.put("vnp_OrderInfo", "Thanh toan don hang " + VNPayUtil.getRandomNumber(8));

        // Build Query URL
        String hashData = buildHashData(vnpParamsMap);
        String queryUrl = buildQuery(vnpParamsMap);
        String vnp_SecureHash = VNPayUtil.hmacSHA512(vnPayConfig.getSecretKey(), hashData);
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        String paymentUrl = vnPayConfig.getVnp_PayUrl() + "?" + queryUrl;

        System.out.println("================ VNPAY DEBUG ================");
        System.out.println("Generated URL: " + paymentUrl);
        System.out.println("vnp_TmnCode being sent: " + vnpParamsMap.get("vnp_TmnCode"));
        System.out.println("=============================================");

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

        Optional<PaymentDetail> optionalPayment = paymentDetailRepository.findById(paymentId);
        if (optionalPayment.isEmpty()) {
            return ipnResponse("01", "Order not found");
        }

        PaymentDetail paymentDetail = optionalPayment.get();
        Double vnpAmount = Double.valueOf(fields.getOrDefault("vnp_Amount", "0")) / 100;
        if (paymentDetail.getAmount() == null || Math.abs(paymentDetail.getAmount() - vnpAmount) > 0.001) {
            return ipnResponse("04", "Invalid amount");
        }

        if (!PaymentStatus.PENDING.equals(paymentDetail.getStatus())) {
            return ipnResponse("02", "Order already confirmed");
        }

        boolean success = "00".equals(fields.get("vnp_ResponseCode"))
                && "00".equals(fields.get("vnp_TransactionStatus"));
        applyVnpayResult(paymentDetail, success);

        return ipnResponse("00", "Confirm Success");
    }

    @Transactional
    public boolean handleReturn(HttpServletRequest request) {
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

        PaymentDetail paymentDetail = paymentDetailRepository.findById(paymentId)
                .orElseThrow(() -> new BadRequestException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        Double vnpAmount = Double.valueOf(fields.getOrDefault("vnp_Amount", "0")) / 100;
        if (paymentDetail.getAmount() == null || Math.abs(paymentDetail.getAmount() - vnpAmount) > 0.001) {
            throw new BadRequestException(ErrorMessage.Payment.ERR_AMOUNT_MISMATCH);
        }

        if (PaymentStatus.COMPLETED.equals(paymentDetail.getStatus())) {
            return true;
        }

        boolean success = "00".equals(fields.get("vnp_ResponseCode"))
                && "00".equals(fields.get("vnp_TransactionStatus"));

        if (PaymentStatus.PENDING.equals(paymentDetail.getStatus())) {
            applyVnpayResult(paymentDetail, success);
        }

        return success;
    }

    private void applyVnpayResult(PaymentDetail paymentDetail, boolean success) {
        if (success) {
            paymentDetail.setStatus(PaymentStatus.COMPLETED);
            paymentDetailRepository.save(paymentDetail);
            return;
        }

        restoreOrderStock(paymentDetail);
        paymentDetail.setStatus(PaymentStatus.CANCELED);
        paymentDetailRepository.save(paymentDetail);
    }

    private void restoreOrderStock(PaymentDetail paymentDetail) {
        if (paymentDetail.getOrderDetail() == null || paymentDetail.getOrderDetail().getItems() == null) {
            return;
        }

        for (OrderItem orderItem : paymentDetail.getOrderDetail().getItems()) {
            ProductVariant variant = orderItem.getVariant();
            if (variant == null) {
                continue;
            }

            int currentQuantity = variant.getQuantity() == null ? 0 : variant.getQuantity();
            variant.setQuantity(currentQuantity + orderItem.getQuantity());
            productVariantRepository.save(variant);
        }
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
