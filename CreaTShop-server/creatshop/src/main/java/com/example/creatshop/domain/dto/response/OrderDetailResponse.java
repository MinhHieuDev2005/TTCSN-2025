package com.example.creatshop.domain.dto.response;

import com.example.creatshop.domain.entity.PaymentDetail;
import com.example.creatshop.domain.entity.User;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.sql.Timestamp;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderDetailResponse {
    Integer                 id;
    UserResponse            user;
    PaymentResponse         payment;
    Double                  total;
    Timestamp               createdAt;
    Timestamp               updatedAt;
    String                  status;
    List<OrderItemResponse> orderItems;
}
