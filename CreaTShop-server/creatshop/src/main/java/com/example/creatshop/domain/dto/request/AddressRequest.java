package com.example.creatshop.domain.dto.request;


import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.valid.ValidPhoneNumber;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class AddressRequest {
    @NotBlank(message = ErrorMessage.Validate.ERR_FIRSTNAME_NOT_BLANK)
    @Size(max = 50, message = ErrorMessage.Validate.ERR_FIRSTNAME_SIZE)
    String firstName;

    @NotBlank(message = ErrorMessage.Validate.ERR_LASTNAME_NOT_BLANK)
    @Size(max = 50, message = ErrorMessage.Validate.ERR_LASTNAME_SIZE)
    String lastName;

    @NotBlank(message = ErrorMessage.Validate.ERR_COUNTRY_NOT_BLANK)
    String country;

    @NotBlank(message = ErrorMessage.Validate.ERR_CITY_NOT_BLANK)
    String city;

    @NotBlank(message = ErrorMessage.Validate.ERR_DISTRICT_NOT_BLANK)
    String district;

    @NotBlank(message = ErrorMessage.Validate.ERR_COMMUNE_NOT_BLANK)
    String commune;

    @NotBlank(message = ErrorMessage.Validate.ERR_ADDRESS_DETAIL_NOT_BLANK)
    @Size(max = 255, message = ErrorMessage.Validate.ERR_ADDRESS_DETAIL_SIZE)
    String addressDetail;

    @Size(max = 500, message = ErrorMessage.Validate.ERR_DESCRIPTION_SIZE)
    String description;

    @NotBlank(message = ErrorMessage.Validate.ERR_PHONE_NUMBER_NOT_BLANK)
    @ValidPhoneNumber
    String phoneNumber;
}
