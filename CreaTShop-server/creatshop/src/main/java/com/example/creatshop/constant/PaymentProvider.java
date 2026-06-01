package com.example.creatshop.constant;

public enum PaymentProvider {
    COD,
    VNPAY;

    public static final String VALID_PROVIDERS_REGEX = "(?i)^(COD|VNPAY)$";
}
