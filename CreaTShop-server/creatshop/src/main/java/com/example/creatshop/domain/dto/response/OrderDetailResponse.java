package com.example.creatshop.domain.dto.response;

import com.example.creatshop.domain.entity.PaymentDetail;
import com.example.creatshop.domain.entity.User;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
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
    AddressResponse         address;
    boolean                 addressSnapshotAvailable;
    PaymentResponse         payment;
    BigDecimal                  total;
    Timestamp               createdAt;
    Timestamp               updatedAt;
    String                  status;
    String                  cancellationReason;
    String                  canceledBy;
    Timestamp               canceledAt;
    List<OrderItemResponse> orderItems;
}
