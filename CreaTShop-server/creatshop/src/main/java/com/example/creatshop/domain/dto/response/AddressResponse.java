package com.example.creatshop.domain.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class AddressResponse {
    Integer id;
    String  firstName;
    String  lastName;
    String  country;
    String  city;
    String  district;
    String  commune;
    String  addressDetail;
    String  description;
    String  phoneNumber;
}
