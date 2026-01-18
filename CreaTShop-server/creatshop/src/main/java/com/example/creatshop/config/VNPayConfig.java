package com.example.creatshop.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
@Getter
public class VNPayConfig {
    @Value("${vnp.url}")
    private String vnp_PayUrl;
    @Value("${vnp.return-url}")
    private String vnp_ReturnUrl;
    @Value("${vnp.tmn-code}")
    private String vnp_TmnCode;
    @Value("${vnp.hash-secret}")
    private String secretKey;
    @Value("${vnp.version:2.1.0}")
    private String vnp_Version;
    @Value("${vnp.command:pay}")
    private String vnp_Command;
    @Value("${vnp.api-url:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}")
    private String vnp_ApiUrl;

    public Map<String, String> getVNPayConfig() {
        Map<String, String> vnpParamsMap = new HashMap<>();
        vnpParamsMap.put("vnp_Version", this.vnp_Version);
        vnpParamsMap.put("vnp_Command", this.vnp_Command);
        vnpParamsMap.put("vnp_TmnCode", this.vnp_TmnCode);
        vnpParamsMap.put("vnp_CurrCode", "VND");
        vnpParamsMap.put("vnp_Locale", "vn");
        vnpParamsMap.put("vnp_OrderType", "other");
        return vnpParamsMap;
    }
}
