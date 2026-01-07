package com.example.creatshop.domain.dto.request;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.PaymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentRequest {
    @NotNull(message = ErrorMessage.Validate.ERR_AMOUNT_NOT_NULL)
    @Positive(message = ErrorMessage.Validate.ERR_AMOUNT_POSITIVE)
    Double amount;

    @NotBlank(message = ErrorMessage.Validate.ERR_PROVIDER_NOT_BLANK)
    @NotNull(message = ErrorMessage.Validate.ERR_PROVIDER_NOT_NULL)
    String provider;

    @NotNull(message = ErrorMessage.Validate.ERR_STATUS_NOT_NULL)
    @Pattern(regexp = PaymentStatus.VALID_STATUSES_REGEX, message = ErrorMessage.Validate.ERR_STATUS_INVALID)
    String status;
}
