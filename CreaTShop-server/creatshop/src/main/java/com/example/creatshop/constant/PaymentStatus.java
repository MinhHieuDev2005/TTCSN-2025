package com.example.creatshop.constant;


public enum PaymentStatus {
    PENDING,    // Đang chờ thanh toán
    COMPLETED,  // Thanh toán thành công
    FAILED,     // Thanh toán thất bại
    CANCELED    // Thanh toán bị hủy
    ;
    public static final String VALID_STATUSES_REGEX = "^(PENDING|COMPLETED|FAILED|CANCELED)$";
}
