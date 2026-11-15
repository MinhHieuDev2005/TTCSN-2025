package com.example.creatshop.util;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.exception.BadRequestException;

import java.math.BigDecimal;

public final class VndAmount {
    private static final BigDecimal MAX = new BigDecimal("999999999999999");

    private VndAmount() {}

    public static BigDecimal requireValid(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0 || amount.compareTo(MAX) > 0
                || amount.stripTrailingZeros().scale() > 0) {
            throw new BadRequestException(ErrorMessage.Validate.ERR_VND_AMOUNT);
        }
        return amount.setScale(0);
    }
}
