package com.example.creatshop.domain.dto.response;


import lombok.*;
import lombok.experimental.FieldDefaults;

import java.sql.Timestamp;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentResponse {
    Integer   id;
    Double    amount;
    String    provider;
    String    status;
    Timestamp createdAt;
    Timestamp updatedAt;
}
