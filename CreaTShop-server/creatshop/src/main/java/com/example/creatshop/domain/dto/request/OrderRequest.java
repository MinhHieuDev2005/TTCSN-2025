package com.example.creatshop.domain.dto.request;

import com.example.creatshop.constant.ErrorMessage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderRequest {
    @NotNull(message = ErrorMessage.Validate.ERR_PAYMENT_ID_NOT_NULL)
    @Min(value = 1, message = ErrorMessage.Validate.ERR_PAYMENT_ID_MIN)
    Integer paymentId;

    @Valid
    @NotNull(message = ErrorMessage.Validate.ERR_ORDER_ITEMS_NOT_NULL)
    List<@NotNull(message = ErrorMessage.Validate.ERR_ORDER_ITEM_NOT_NULL) OrderItemRequest> orderItems;
}
